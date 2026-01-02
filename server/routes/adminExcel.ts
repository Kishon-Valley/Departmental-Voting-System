import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage } from "../storage.js";
import { parseExcelFile, convertToInsertStudents } from "../utils/excelParser.js";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../db.js";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for Excel files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.oasis.opendocument.spreadsheet", // .ods
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files (.xlsx, .xls, .ods) are allowed."));
    }
  },
});

// Multer middleware with error handling
export const uploadExcelMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single("excelFile")(req, res, (err: any) => {
    if (err) {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
        }
        return res.status(400).json({ message: err.message });
      }
      // Handle other errors (like fileFilter errors)
      return res.status(400).json({ message: err.message || "File upload error" });
    }
    next();
  });
};

/**
 * Get Supabase storage client with service role key
 */
const getStorageClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && process.env.SUPABASE_URL) {
    return createClient(process.env.SUPABASE_URL, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  // Log warning but don't fail - profile pictures will be skipped
  if (!serviceRoleKey) {
    console.warn("Supabase credentials not found. File uploads may not work.");
  }
  return supabase;
};

/**
 * Upload image from base64 or URL to Supabase storage
 */
async function uploadProfilePicture(
  imageData: string | null,
  studentId: string,
  indexNumber: string
): Promise<string | null> {
  if (!imageData) {
    return null;
  }

  try {
    let imageBuffer: Buffer;
    let contentType = "image/jpeg";

    // Check if it's a base64 data URL
    if (imageData.startsWith("data:")) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1] || "image/jpeg";
        imageBuffer = Buffer.from(matches[2], "base64");
      } else {
        // Try to decode as plain base64
        imageBuffer = Buffer.from(imageData, "base64");
      }
    } else if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      // If it's a URL, fetch the image
      const response = await fetch(imageData);
      if (!response.ok) {
        console.warn(`Failed to fetch image from URL: ${imageData}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get("content-type") || "image/jpeg";
    } else {
      // Assume it's base64 without data URL prefix
      imageBuffer = Buffer.from(imageData, "base64");
    }

    // Validate file size (5MB)
    if (imageBuffer.length > 5 * 1024 * 1024) {
      console.warn(`Image too large for student ${indexNumber}, skipping upload`);
      return null;
    }

    // Determine file extension from content type
    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `${studentId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const storageClient = getStorageClient();
    const { error: uploadError } = await storageClient.storage
      .from("student-avatars")
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`Error uploading profile picture for ${indexNumber}:`, uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("student-avatars").getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error processing profile picture for ${indexNumber}:`, error);
    return null;
  }
}

/**
 * Bulk upload students from Excel file
 * POST /api/admin/students/upload-excel
 */
export async function uploadExcelStudentsRoute(req: Request, res: Response) {
  try {
    // Check if file was uploaded
    // In Vercel, the file is pre-parsed and attached to req.file
    // In local dev, multer middleware attaches it
    if (!req.file) {
      console.error('No file in request:', {
        hasFile: !!req.file,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        contentType: req.headers['content-type'],
      });
      return res.status(400).json({ 
        message: "No Excel file uploaded",
        hint: "Please ensure you're uploading a valid Excel file (.xlsx, .xls, or .ods)"
      });
    }

    // Validate file type if not already validated by multer
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "application/vnd.oasis.opendocument.spreadsheet", // .ods
    ];
    
    if (req.file.mimetype && !allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        message: "Invalid file type. Only Excel files (.xlsx, .xls, .ods) are allowed." 
      });
    }

    // Validate file size (10MB limit)
    if (req.file.size && req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        message: "File too large. Maximum size is 10MB." 
      });
    }

    // Parse Excel file
    const parseResult = parseExcelFile(req.file.buffer);

    if (parseResult.errors.length > 0 && parseResult.students.length === 0) {
      return res.status(400).json({
        message: "Failed to parse Excel file",
        errors: parseResult.errors,
      });
    }

    // Convert to InsertStudent format (email is used as password)
    const insertStudents = convertToInsertStudents(parseResult.students);

    // Create students in database
    const results = {
      created: [] as any[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    for (let i = 0; i < insertStudents.length; i++) {
      const studentData = insertStudents[i];
      const excelStudent = parseResult.students[i];

      try {
        // Check if student with this index number already exists
        const existingStudent = await storage.getStudentByIndexNumber(studentData.indexNumber);
        if (existingStudent) {
          results.skipped.push(
            `Row ${i + 2}: Student with index number ${studentData.indexNumber} already exists`
          );
          continue;
        }

        // Create student
        const student = await storage.createStudent(studentData);

        // Upload profile picture if provided
        if (excelStudent.profilePicture) {
          try {
            const profilePictureUrl = await uploadProfilePicture(
              excelStudent.profilePicture,
              student.id,
              student.indexNumber
            );
            if (profilePictureUrl) {
              await storage.updateStudent(student.id, { profilePicture: profilePictureUrl });
              student.profilePicture = profilePictureUrl;
            } else {
              // Log if image upload was skipped (e.g., due to missing credentials)
              console.warn(`Profile picture upload skipped for ${student.indexNumber} - check Supabase credentials`);
            }
          } catch (imageError) {
            // Log but don't fail student creation if image upload fails
            console.error(`Failed to upload image for ${student.indexNumber}:`, imageError);
            results.errors.push(
              `Row ${i + 2}: ${student.indexNumber} - Profile picture upload failed (student created without picture)`
            );
          }
        }

        const { password, ...studentWithoutPassword } = student;
        results.created.push(studentWithoutPassword);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`Row ${i + 2}: ${studentData.indexNumber} - ${errorMessage}`);
      }
    }

    // Include parsing errors in response
    if (parseResult.errors.length > 0) {
      results.errors.push(...parseResult.errors);
    }

    return res.json({
      message: `Successfully processed ${results.created.length} students`,
      summary: {
        created: results.created.length,
        skipped: results.skipped.length,
        errors: results.errors.length,
      },
      created: results.created,
      skipped: results.skipped,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Error uploading Excel file:", error);
    return res.status(500).json({
      message: "Failed to process Excel file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}


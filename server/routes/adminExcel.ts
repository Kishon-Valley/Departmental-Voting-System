import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage } from "../storage.js";
import { parseExcelFile, convertToInsertStudents } from "../utils/excelParser.js";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../db.js";
import * as XLSX from "xlsx";

// Configure multer for memory storage (for local dev)
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

// Multer middleware with error handling (for local dev)
export const uploadExcelMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single("excelFile")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
        }
        return res.status(400).json({ message: err.message });
      }
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

    if (imageData.startsWith("data:")) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1] || "image/jpeg";
        imageBuffer = Buffer.from(matches[2], "base64");
      } else {
        imageBuffer = Buffer.from(imageData, "base64");
      }
    } else if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      const response = await fetch(imageData);
      if (!response.ok) {
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get("content-type") || "image/jpeg";
    } else {
      imageBuffer = Buffer.from(imageData, "base64");
    }

    if (imageBuffer.length > 5 * 1024 * 1024) {
      return null;
    }

    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `${studentId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;

    const storageClient = getStorageClient();
    const { error: uploadError } = await storageClient.storage
      .from("student-avatars")
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return null;
    }

    const { data: urlData } = supabase.storage.from("student-avatars").getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (error) {
    return null;
  }
}

/**
 * Parse Excel from base64 string
 */
function parseExcelFromBase64(base64Data: string): Buffer {
  // Remove data URL prefix if present
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  return Buffer.from(base64, 'base64');
}

/**
 * Bulk upload students from Excel file (base64 version for Vercel)
 * POST /api/admin/students/upload-excel-base64
 */
export async function uploadExcelStudentsBase64Route(req: Request, res: Response) {
  try {
    const { file, filename } = req.body || {};

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ 
        message: "No Excel file data provided" 
      });
    }

    // Parse base64 to buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = parseExcelFromBase64(file);
      if (fileBuffer.length === 0) {
        throw new Error('Decoded file buffer is empty');
      }
    } catch (bufferError) {
      return res.status(400).json({
        message: "Invalid file data format",
        error: bufferError instanceof Error ? bufferError.message : "Failed to decode base64",
      });
    }

    // Validate file size (10MB)
    if (fileBuffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        message: "File too large. Please select a file smaller than 10MB." 
      });
    }

    // Create a file-like object for compatibility
    const fileObj = {
      buffer: fileBuffer,
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: filename || "students.xlsx",
      size: fileBuffer.length,
    };

    // Parse Excel file
    const parseResult = parseExcelFile(fileObj.buffer);

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
        const existingStudent = await storage.getStudentByIndexNumber(studentData.indexNumber);
        if (existingStudent) {
          results.skipped.push(
            `Row ${i + 2}: Student with index number ${studentData.indexNumber} already exists`
          );
          continue;
        }

        const student = await storage.createStudent(studentData);

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
            }
          } catch (imageError) {
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
    return res.status(500).json({
      message: "Failed to process Excel file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Bulk upload students from Excel file (multipart version for local dev)
 * POST /api/admin/students/upload-excel
 */
export async function uploadExcelStudentsRoute(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: "No Excel file uploaded",
        hint: "Please ensure you're uploading a valid Excel file (.xlsx, .xls, or .ods)"
      });
    }

    // Validate file type
    const allowedMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.oasis.opendocument.spreadsheet",
    ];
    
    if (req.file.mimetype && !allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        message: "Invalid file type. Only Excel files (.xlsx, .xls, .ods) are allowed." 
      });
    }

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
        const existingStudent = await storage.getStudentByIndexNumber(studentData.indexNumber);
        if (existingStudent) {
          results.skipped.push(
            `Row ${i + 2}: Student with index number ${studentData.indexNumber} already exists`
          );
          continue;
        }

        const student = await storage.createStudent(studentData);

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
            }
          } catch (imageError) {
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
    return res.status(500).json({
      message: "Failed to process Excel file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

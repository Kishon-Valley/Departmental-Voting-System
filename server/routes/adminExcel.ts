import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { storage } from "../storage.js";
import { parseExcelFile, convertToInsertStudents } from "../utils/excelParser.js";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../db.js";
import * as XLSX from "xlsx";

// Configure multer for memory storage (for local dev)
// Note: Using same limit as base64 route for consistency
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3.4 * 1024 * 1024, // ~3.4MB limit to match Vercel payload limits
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
          return res.status(400).json({ 
            message: `File too large. Maximum size is ${(3.4 * 1024 * 1024 / 1024 / 1024).toFixed(1)}MB. Please split your Excel file into smaller batches.` 
          });
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

    // Validate file size
    // Note: Vercel has a ~4.5MB payload limit, and base64 increases size by ~33%
    // So we limit to ~3.4MB raw file size to stay under Vercel's limit
    const MAX_FILE_SIZE = 3.4 * 1024 * 1024; // ~3.4MB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        message: `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB. Your file is ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB. Please split your Excel file into smaller batches.`,
        fileSize: fileBuffer.length,
        maxSize: MAX_FILE_SIZE
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
 * Process Excel file from Supabase Storage URL
 * POST /api/admin/students/upload-excel-from-storage
 * This endpoint downloads the file from Supabase Storage and processes it
 * This bypasses Vercel's payload size limits
 */
export async function uploadExcelFromStorageRoute(req: Request, res: Response) {
  try {
    const { storageUrl, fileName: originalFileName, storagePath } = req.body || {};

    if (!storageUrl || typeof storageUrl !== 'string') {
      return res.status(400).json({ 
        message: "No storage URL provided" 
      });
    }

    // Download file from Supabase Storage
    let fileBuffer: Buffer;
    try {
      const response = await fetch(storageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file from storage: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      
      if (fileBuffer.length === 0) {
        throw new Error('Downloaded file buffer is empty');
      }
    } catch (downloadError) {
      return res.status(400).json({
        message: "Failed to download file from storage",
        error: downloadError instanceof Error ? downloadError.message : "Unknown error",
      });
    }

    // Validate file size (50MB limit for Supabase Storage)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        message: `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB. Your file is ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB.`,
        fileSize: fileBuffer.length,
        maxSize: MAX_FILE_SIZE
      });
    }

    // Parse Excel file
    const parseResult = parseExcelFile(fileBuffer);

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

    // For local dev, we can allow larger files (10MB)
    // But for consistency, we'll use the same limit
    const MAX_FILE_SIZE = 3.4 * 1024 * 1024; // ~3.4MB (same as base64 route)
    if (req.file.size && req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        message: `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB. Your file is ${(req.file.size / 1024 / 1024).toFixed(2)}MB. Please split your Excel file into smaller batches.`,
        fileSize: req.file.size,
        maxSize: MAX_FILE_SIZE
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

/**
 * Process Excel file from Supabase Storage URL
 * POST /api/admin/students/upload-excel-from-storage
 * This endpoint downloads the file from Supabase Storage and processes it
 * This bypasses Vercel's payload size limits
 */
export async function uploadExcelFromStorageRoute(req: Request, res: Response) {
  try {
    const { storageUrl, fileName: originalFileName, storagePath } = req.body || {};

    if (!storageUrl || typeof storageUrl !== 'string') {
      return res.status(400).json({ 
        message: "No storage URL provided" 
      });
    }

    // Download file from Supabase Storage
    let fileBuffer: Buffer;
    try {
      const response = await fetch(storageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file from storage: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      
      if (fileBuffer.length === 0) {
        throw new Error('Downloaded file buffer is empty');
      }
    } catch (downloadError) {
      return res.status(400).json({
        message: "Failed to download file from storage",
        error: downloadError instanceof Error ? downloadError.message : "Unknown error",
      });
    }

    // Validate file size (50MB limit for Supabase Storage)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ 
        message: `File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB. Your file is ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB.`,
        fileSize: fileBuffer.length,
        maxSize: MAX_FILE_SIZE
      });
    }

    // Parse Excel file
    const parseResult = parseExcelFile(fileBuffer);

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

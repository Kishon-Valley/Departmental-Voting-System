import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { parseExcelFile, convertToInsertStudents } from "../utils/excelParser.js";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../db.js";

/**
 * Get Supabase storage client with service role key
 */
const getStorageClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (serviceRoleKey && supabaseUrl) {
    return createClient(supabaseUrl, serviceRoleKey, {
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
        console.error(`Failed to fetch image from URL for student ${indexNumber}: ${response.status} ${response.statusText}`);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get("content-type") || "image/jpeg";
    } else {
      imageBuffer = Buffer.from(imageData, "base64");
    }

    if (imageBuffer.length === 0) {
      console.error(`Empty image buffer for student ${indexNumber}`);
      return null;
    }

    if (imageBuffer.length > 5 * 1024 * 1024) {
      console.error(`Image too large for student ${indexNumber}: ${imageBuffer.length} bytes`);
      return null;
    }

    const ext = contentType.split("/")[1] || "jpg";
    const fileName = `${studentId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;

    const storageClient = getStorageClient();
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from("student-avatars")
      .upload(filePath, imageBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`Failed to upload profile picture for student ${indexNumber} (${studentId}):`, uploadError);
      return null;
    }

    // Use the storage client to get public URL (ensures consistent access)
    // If storageClient has service role key, use it; otherwise fall back to regular supabase client
    const { data: urlData } = storageClient.storage.from("student-avatars").getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      console.error(`Failed to get public URL for student ${indexNumber} (${studentId})`);
      return null;
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Error uploading profile picture for student ${indexNumber} (${studentId}):`, error);
    return null;
  }
}

// (Legacy base64 and multipart Excel upload handlers were removed.
//  All Excel uploads should now go through Supabase Storage and
//  the uploadExcelFromStorageRoute handler below.)

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

    // Parse Excel file (now async)
    const parseResult = await parseExcelFile(fileBuffer);

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
            } else {
              // Upload returned null - log warning but don't fail student creation
              results.errors.push(
                `Row ${i + 2}: ${student.indexNumber} - Profile picture upload failed (student created without picture). Check server logs for details.`
              );
            }
          } catch (imageError) {
            const errorMessage = imageError instanceof Error ? imageError.message : "Unknown error";
            console.error(`Profile picture upload error for ${student.indexNumber}:`, imageError);
            results.errors.push(
              `Row ${i + 2}: ${student.indexNumber} - Profile picture upload failed: ${errorMessage} (student created without picture)`
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

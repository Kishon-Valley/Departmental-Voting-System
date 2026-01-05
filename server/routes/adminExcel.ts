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
    console.warn(`No image data provided for student ${indexNumber}`);
    return null;
  }

  // Trim whitespace
  imageData = imageData.trim();
  
  if (imageData.length === 0) {
    console.warn(`Empty image data for student ${indexNumber}`);
    return null;
  }

  try {
    let imageBuffer: Buffer;
    let contentType = "image/jpeg";

    if (imageData.startsWith("data:")) {
      // Handle data URL format: data:image/jpeg;base64,/9j/4AAQ...
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches && matches.length >= 3) {
        contentType = matches[1] || "image/jpeg";
        const base64Data = matches[2];
        try {
          imageBuffer = Buffer.from(base64Data, "base64");
          if (imageBuffer.length === 0) {
            console.error(`Invalid base64 data for student ${indexNumber}: decoded buffer is empty`);
            return null;
          }
        } catch (base64Error) {
          console.error(`Failed to decode base64 data for student ${indexNumber}:`, base64Error);
          return null;
        }
      } else {
        // Try to extract base64 without the data: prefix
        const base64Part = imageData.includes(',') ? imageData.split(',')[1] : imageData.replace(/^data:[^;]*;base64,/, '');
        try {
          imageBuffer = Buffer.from(base64Part, "base64");
          if (imageBuffer.length === 0) {
            console.error(`Invalid base64 data for student ${indexNumber}: decoded buffer is empty`);
            return null;
          }
        } catch (base64Error) {
          console.error(`Failed to decode base64 data for student ${indexNumber}:`, base64Error);
          return null;
        }
      }
    } else if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      // Handle URL
      try {
        const response = await fetch(imageData);
        if (!response.ok) {
          console.error(`Failed to fetch image from URL for student ${indexNumber}: ${response.status} ${response.statusText}`);
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        if (imageBuffer.length === 0) {
          console.error(`Empty image buffer from URL for student ${indexNumber}`);
          return null;
        }
        contentType = response.headers.get("content-type") || "image/jpeg";
      } catch (fetchError) {
        console.error(`Error fetching image from URL for student ${indexNumber}:`, fetchError);
        return null;
      }
    } else {
      // Assume it's raw base64
      try {
        imageBuffer = Buffer.from(imageData, "base64");
        if (imageBuffer.length === 0) {
          console.error(`Invalid base64 data for student ${indexNumber}: decoded buffer is empty`);
          return null;
        }
      } catch (base64Error) {
        console.error(`Failed to decode base64 data for student ${indexNumber}:`, base64Error);
        return null;
      }
    }

    // Validate image buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      console.error(`Empty image buffer for student ${indexNumber}`);
      return null;
    }

    // Check file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > MAX_SIZE) {
      console.error(`Image too large for student ${indexNumber}: ${imageBuffer.length} bytes (max ${MAX_SIZE})`);
      return null;
    }

    // Validate it's actually an image by checking magic bytes
    const isValidImage = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 || // JPEG
                        (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50 && imageBuffer[2] === 0x4E && imageBuffer[3] === 0x47) || // PNG
                        (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x38) || // GIF
                        (imageBuffer.length >= 12 && imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49 && imageBuffer[2] === 0x46 && imageBuffer[3] === 0x46 && imageBuffer[8] === 0x57 && imageBuffer[9] === 0x45 && imageBuffer[10] === 0x42 && imageBuffer[11] === 0x50); // WebP
    
    if (!isValidImage) {
      console.warn(`Image buffer for student ${indexNumber} doesn't appear to be a valid image format`);
      // Continue anyway - might still work
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
      console.error(`Supabase upload error for student ${indexNumber}:`, uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from("student-avatars").getPublicUrl(filePath);
    if (!urlData || !urlData.publicUrl) {
      console.error(`Failed to get public URL for student ${indexNumber}`);
      return null;
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Unexpected error uploading profile picture for student ${indexNumber}:`, error);
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
            // Log the profile picture data type for debugging
            const isDataUrl = excelStudent.profilePicture.startsWith('data:');
            const isUrl = excelStudent.profilePicture.startsWith('http://') || excelStudent.profilePicture.startsWith('https://');
            const isBase64 = !isDataUrl && !isUrl && excelStudent.profilePicture.length > 100;
            
            console.log(`Processing profile picture for ${student.indexNumber}:`, {
              type: isDataUrl ? 'data-url' : isUrl ? 'url' : isBase64 ? 'base64' : 'unknown',
              length: excelStudent.profilePicture.length,
              preview: excelStudent.profilePicture.substring(0, 50)
            });
            
            const profilePictureUrl = await uploadProfilePicture(
              excelStudent.profilePicture,
              student.id,
              student.indexNumber
            );
            
            if (profilePictureUrl) {
              await storage.updateStudent(student.id, { profilePicture: profilePictureUrl });
              student.profilePicture = profilePictureUrl;
              console.log(`Successfully uploaded profile picture for ${student.indexNumber}: ${profilePictureUrl}`);
            } else {
              results.errors.push(
                `Row ${i + 2}: ${student.indexNumber} - Profile picture upload returned null (image may be invalid or too large)`
              );
            }
          } catch (imageError) {
            const errorMessage = imageError instanceof Error ? imageError.message : 'Unknown error';
            console.error(`Profile picture upload error for ${student.indexNumber}:`, errorMessage);
            results.errors.push(
              `Row ${i + 2}: ${student.indexNumber} - Profile picture upload failed: ${errorMessage}`
            );
          }
        } else {
          console.log(`No profile picture provided for ${student.indexNumber}`);
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

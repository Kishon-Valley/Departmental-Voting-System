import type { Request, Response } from "express";
import { storage } from "../storage.js";
import { parseExcelFile, convertToInsertStudents } from "../utils/excelParser.js";
import { uploadImageToStorage } from "../utils/excelImageExtractor.js";

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

    // Parse Excel file (now async) - includes image extraction
    const parseResult = await parseExcelFile(fileBuffer);

    if (parseResult.errors.length > 0 && parseResult.students.length === 0) {
      return res.status(400).json({
        message: "Failed to parse Excel file",
        errors: parseResult.errors,
      });
    }

    // Convert to InsertStudent format (email is used as password)
    const insertStudents = convertToInsertStudents(parseResult.students);

    // Create students in database and upload images
    const results = {
      created: [] as any[],
      skipped: [] as string[],
      errors: [] as string[],
      imagesUploaded: 0,
      imagesFailed: 0,
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

        // Extract and upload image if available for this student's row
        const excelRowNumber = excelStudent.excelRowNumber;
        const extractedImage = parseResult.images.get(excelRowNumber);
        
        if (extractedImage) {
          try {
            const imageUrl = await uploadImageToStorage(
              extractedImage.buffer,
              extractedImage.extension,
              student.id,
              student.indexNumber
            );
            
            // Update student with profile picture URL
            await storage.updateStudent(student.id, {
              profilePicture: imageUrl,
            });
            
            results.imagesUploaded++;
          } catch (imageError) {
            results.imagesFailed++;
            results.errors.push(
              `Row ${excelRowNumber}: Failed to upload image for ${studentData.indexNumber} - ${imageError instanceof Error ? imageError.message : "Unknown error"}`
            );
            // Continue even if image upload fails - student is still created
          }
        }

        const { password, ...studentWithoutPassword } = student;
        // Update with profile picture if it was uploaded
        if (extractedImage) {
          const updatedStudent = await storage.getStudentByIndexNumber(student.indexNumber);
          if (updatedStudent) {
            studentWithoutPassword.profilePicture = updatedStudent.profilePicture;
          }
        }
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
        imagesUploaded: results.imagesUploaded,
        imagesFailed: results.imagesFailed,
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

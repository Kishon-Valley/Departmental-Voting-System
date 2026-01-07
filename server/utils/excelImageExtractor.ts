import ExcelJS from "exceljs";

export interface ExtractedImage {
  buffer: Buffer;
  extension: string;
  rowNumber: number; // Excel row number (1-based, includes header)
  columnNumber?: number; // Excel column number (optional, for reference)
}

export interface ImageExtractionResult {
  images: Map<number, ExtractedImage>; // Map of Excel row number to image
  errors: string[];
}

/**
 * Extract images from Excel file and match them to their respective rows
 * Images are matched by the row they are anchored to in the Excel sheet
 * 
 * @param buffer - Excel file buffer
 * @returns Map of row numbers (1-based, includes header) to extracted images
 */
export async function extractImagesFromExcel(buffer: Buffer): Promise<ImageExtractionResult> {
  const result: ImageExtractionResult = {
    images: new Map<number, ExtractedImage>(),
    errors: [],
  };

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      result.errors.push("Excel file has no sheets");
      return result;
    }

    // Access the workbook model to get media (images)
    const model = (workbook as any).model;
    if (!model || !model.media) {
      // No images found in the workbook
      return result;
    }

    const media = model.media;
    const mediaArray = Array.isArray(media) ? media : Object.values(media);

    // Get worksheet drawings (which contain image anchors)
    const worksheetModel = (worksheet as any).model;
    if (!worksheetModel || !worksheetModel.drawing) {
      // No drawings found in the worksheet
      return result;
    }

    // Process drawings to find image anchors
    const drawings = worksheetModel.drawing;
    const drawingArray = Array.isArray(drawings) ? drawings : [drawings];

    for (const drawing of drawingArray) {
      try {
        // Extract image data from drawing
        const imageData = extractImageFromDrawing(drawing, mediaArray);
        if (imageData) {
          // Find which row this image is anchored to
          const rowNumber = findImageRow(drawing, worksheet);
          
          if (rowNumber > 0) {
            // Check if we already have an image for this row (take the first one found)
            if (!result.images.has(rowNumber)) {
              result.images.set(rowNumber, {
                buffer: imageData.buffer,
                extension: imageData.extension,
                rowNumber: rowNumber,
                columnNumber: findImageColumn(drawing, worksheet),
              });
            } else {
              result.errors.push(`Row ${rowNumber}: Multiple images found, using first image`);
            }
          } else {
            result.errors.push("Could not determine row for image");
          }
        }
      } catch (error) {
        result.errors.push(`Error extracting image: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Enhanced method: Also check for images in specific columns (e.g., "PASSPORT SIZED PICTURE")
    // This helps ensure we're extracting from the correct column even if anchor detection is imprecise
    try {
      // Find the picture column by checking header row
      let pictureColumnNumber: number | null = null;
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const headerText = cell.value?.toString().toUpperCase().trim() || '';
        if (headerText.includes('PICTURE') || headerText.includes('PASSPORT') || headerText.includes('PHOTO') || headerText.includes('IMAGE') || headerText.includes('AVATAR')) {
          pictureColumnNumber = colNumber;
        }
      });

      // If we found a picture column, prioritize images in that column
      if (pictureColumnNumber) {
        // Re-process drawings to prioritize those in the picture column
        for (const drawing of drawingArray) {
          try {
            const imageData = extractImageFromDrawing(drawing, mediaArray);
            if (imageData) {
              const rowNumber = findImageRow(drawing, worksheet);
              const columnNumber = findImageColumn(drawing, worksheet);
              
              // If this image is in the picture column, use it (overwrite if already exists)
              // rowNumber > 1 to skip header row (row 1 is headers)
              if (columnNumber === pictureColumnNumber && rowNumber > 1) {
                result.images.set(rowNumber, {
                  buffer: imageData.buffer,
                  extension: imageData.extension,
                  rowNumber: rowNumber,
                  columnNumber: columnNumber,
                });
              }
            }
          } catch (error) {
            // Continue processing other images
          }
        }
      }
    } catch (error) {
      // Continue with default behavior if column detection fails
      result.errors.push(`Column detection warning: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

  } catch (error) {
    result.errors.push(`Failed to extract images: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return result;
}

/**
 * Extract image buffer and metadata from a drawing object
 */
function extractImageFromDrawing(drawing: any, mediaArray: any[]): { buffer: Buffer; extension: string } | null {
  try {
    // Navigate through drawing structure to find image reference
    // ExcelJS drawing structure: drawing -> rId -> media index
    if (!drawing || !drawing.rId) {
      return null;
    }

    const rId = drawing.rId;
    // Find the media item referenced by this drawing
    const mediaItem = mediaArray.find((item: any) => {
      // Match by relationship ID or index
      return item.index === rId || item.name === rId || item.relationshipId === rId;
    });

    if (!mediaItem) {
      // Try to find by index if rId is a number
      const mediaIndex = typeof rId === 'number' ? rId : parseInt(rId, 10);
      if (!isNaN(mediaIndex) && mediaArray[mediaIndex]) {
        const item = mediaArray[mediaIndex];
        if (item.buffer) {
          const extension = getImageExtension(item.name || item.type || 'jpg');
          return {
            buffer: Buffer.from(item.buffer),
            extension,
          };
        }
      }
      return null;
    }

    // Extract buffer from media item
    let imageBuffer: Buffer | null = null;
    if (mediaItem.buffer) {
      imageBuffer = Buffer.isBuffer(mediaItem.buffer) 
        ? mediaItem.buffer 
        : Buffer.from(mediaItem.buffer);
    } else if (mediaItem.data) {
      imageBuffer = Buffer.isBuffer(mediaItem.data)
        ? mediaItem.data
        : Buffer.from(mediaItem.data);
    }

    if (!imageBuffer) {
      return null;
    }

    // Determine file extension from media type or name
    const extension = getImageExtension(mediaItem.name || mediaItem.type || mediaItem.contentType || 'jpg');

    return {
      buffer: imageBuffer,
      extension,
    };
  } catch (error) {
    console.error('Error extracting image from drawing:', error);
    return null;
  }
}

/**
 * Find which row an image is anchored to
 */
function findImageRow(drawing: any, worksheet: ExcelJS.Worksheet): number {
  try {
    // Check for anchor information in drawing
    if (drawing.anchor) {
      const anchor = drawing.anchor;
      // Anchor can have from/to coordinates
      if (anchor.from && anchor.from.row !== undefined) {
        // ExcelJS uses 0-based row indices, convert to 1-based
        return anchor.from.row + 1;
      }
      if (anchor.nativeCol !== undefined && anchor.nativeRow !== undefined) {
        // Some formats use nativeRow
        return anchor.nativeRow + 1;
      }
    }

    // Alternative: Check for position information
    if (drawing.position) {
      const position = drawing.position;
      if (position.row !== undefined) {
        return position.row + 1;
      }
    }

    // If no anchor info, try to infer from worksheet structure
    // This is a fallback and may not be accurate
    return 0;
  } catch (error) {
    console.error('Error finding image row:', error);
    return 0;
  }
}

/**
 * Find which column an image is anchored to (optional, for reference)
 */
function findImageColumn(drawing: any, worksheet: ExcelJS.Worksheet): number | undefined {
  try {
    if (drawing.anchor) {
      const anchor = drawing.anchor;
      if (anchor.from && anchor.from.col !== undefined) {
        // ExcelJS uses 0-based column indices, convert to 1-based
        return anchor.from.col + 1;
      }
      if (anchor.nativeCol !== undefined) {
        return anchor.nativeCol + 1;
      }
    }

    if (drawing.position && drawing.position.col !== undefined) {
      return drawing.position.col + 1;
    }

    return undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Determine image file extension from media type or filename
 */
function getImageExtension(nameOrType: string): string {
  const lower = nameOrType.toLowerCase();
  
  if (lower.includes('png') || lower.endsWith('.png')) {
    return 'png';
  }
  if (lower.includes('jpeg') || lower.includes('jpg') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'jpg';
  }
  if (lower.includes('gif') || lower.endsWith('.gif')) {
    return 'gif';
  }
  if (lower.includes('webp') || lower.endsWith('.webp')) {
    return 'webp';
  }
  if (lower.includes('bmp') || lower.endsWith('.bmp')) {
    return 'bmp';
  }
  
  // Default to jpg
  return 'jpg';
}

/**
 * Upload extracted image to Supabase Storage and return public URL
 */
export async function uploadImageToStorage(
  imageBuffer: Buffer,
  extension: string,
  studentId: string,
  indexNumber: string
): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const { supabase } = await import("../db.js");

  // Create Supabase client with service role key for storage operations
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  
  let storageClient;
  if (serviceRoleKey && supabaseUrl) {
    storageClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } else {
    storageClient = supabase;
  }

  // Generate unique filename
  const sanitizedIndex = indexNumber.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${sanitizedIndex}-${studentId}-${Date.now()}.${extension}`;
  const filePath = `avatars/${fileName}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await storageClient.storage
    .from('student-avatars')
    .upload(filePath, imageBuffer, {
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('student-avatars')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}


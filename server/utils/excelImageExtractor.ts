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
    
    // Try multiple ways to access images
    let mediaArray: any[] = [];
    let drawings: any[] = [];
    
    // Method 1: Access via model.media
    if (model && model.media) {
      const media = model.media;
      mediaArray = Array.isArray(media) ? media : Object.values(media);
      console.log(`[Image Extraction] Found ${mediaArray.length} media items in workbook`);
    } else {
      result.errors.push("No media found in workbook model");
    }

    // Method 2: Access via worksheet model drawings
    const worksheetModel = (worksheet as any).model;
    if (worksheetModel) {
      // Try different possible locations for drawings
      if (worksheetModel.drawing) {
        drawings = Array.isArray(worksheetModel.drawing) 
          ? worksheetModel.drawing 
          : [worksheetModel.drawing];
      } else if (worksheetModel.drawings) {
        drawings = Array.isArray(worksheetModel.drawings)
          ? worksheetModel.drawings
          : Object.values(worksheetModel.drawings);
      } else if (worksheetModel.rels) {
        // Sometimes drawings are in relationships
        const rels = worksheetModel.rels;
        if (rels) {
          const relArray = Array.isArray(rels) ? rels : Object.values(rels);
          drawings = relArray.filter((rel: any) => rel.Type && rel.Type.includes('drawing'));
        }
      }
      
      console.log(`[Image Extraction] Found ${drawings.length} drawings in worksheet`);
    } else {
      result.errors.push("No worksheet model found");
    }

    // If no drawings found, try alternative methods
    if (drawings.length === 0 && mediaArray.length > 0) {
      result.errors.push("Found media but no drawings - trying alternative extraction method");
      // Try to match media directly to rows (less reliable but might work)
      return extractImagesFromMediaDirectly(worksheet, mediaArray, result);
    }

    if (drawings.length === 0) {
      result.errors.push("No drawings found in worksheet - images may not be extractable");
      return result;
    }

    // Process drawings to find image anchors
    for (const drawing of drawings) {
      try {
        // Extract image data from drawing
        const imageData = extractImageFromDrawing(drawing, mediaArray);
        if (imageData) {
          console.log(`[Image Extraction] Successfully extracted image data, size: ${imageData.buffer.length} bytes`);
          // Find which row this image is anchored to
          const rowNumber = findImageRow(drawing, worksheet);
          const columnNumber = findImageColumn(drawing, worksheet);
          
          console.log(`[Image Extraction] Image found at row ${rowNumber}, column ${columnNumber}`);
          
          if (rowNumber > 0) {
            // Check if we already have an image for this row (take the first one found)
            if (!result.images.has(rowNumber)) {
              result.images.set(rowNumber, {
                buffer: imageData.buffer,
                extension: imageData.extension,
                rowNumber: rowNumber,
                columnNumber: columnNumber,
              });
              console.log(`[Image Extraction] Added image for row ${rowNumber}`);
            } else {
              result.errors.push(`Row ${rowNumber}: Multiple images found, using first image`);
            }
          } else {
            result.errors.push("Could not determine row for image");
          }
        } else {
          console.log(`[Image Extraction] Could not extract image data from drawing`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Error extracting image: ${errorMsg}`);
        console.error(`[Image Extraction] Error:`, error);
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
        for (const drawing of drawings) {
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
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Failed to extract images: ${errorMsg}`);
    console.error(`[Image Extraction] Fatal error:`, error);
  }

  console.log(`[Image Extraction] Final result: ${result.images.size} images extracted, ${result.errors.length} errors`);
  if (result.errors.length > 0) {
    console.log(`[Image Extraction] Errors:`, result.errors);
  }
  return result;
}

/**
 * Alternative method: Try to extract images directly from media without drawings
 * This is a fallback when drawings are not available
 */
function extractImagesFromMediaDirectly(
  worksheet: ExcelJS.Worksheet,
  mediaArray: any[],
  result: ImageExtractionResult
): ImageExtractionResult {
  console.log(`[Image Extraction] Attempting direct media extraction for ${mediaArray.length} media items`);
  
  // Find the picture column
  let pictureColumnNumber: number | null = null;
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const headerText = cell.value?.toString().toUpperCase().trim() || '';
    if (headerText.includes('PICTURE') || headerText.includes('PASSPORT') || 
        headerText.includes('PHOTO') || headerText.includes('IMAGE') || 
        headerText.includes('AVATAR')) {
      pictureColumnNumber = colNumber;
      console.log(`[Image Extraction] Found picture column: ${colNumber}`);
    }
  });

  if (!pictureColumnNumber) {
    result.errors.push("Could not find picture column header");
    return result;
  }

  // Try to match media items to rows by iterating through data rows
  // This is less precise but may work if drawings are not accessible
  let mediaIndex = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    
    // Check if there's a media item for this row
    if (mediaIndex < mediaArray.length) {
      const mediaItem = mediaArray[mediaIndex];
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
      
      if (imageBuffer && imageBuffer.length > 0) {
        const extension = getImageExtension(mediaItem.name || mediaItem.type || mediaItem.contentType || 'jpg');
        result.images.set(rowNumber, {
          buffer: imageBuffer,
          extension,
          rowNumber: rowNumber,
          columnNumber: pictureColumnNumber || undefined,
        });
        console.log(`[Image Extraction] Directly matched media item ${mediaIndex} to row ${rowNumber}`);
        mediaIndex++;
      }
    }
  });

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


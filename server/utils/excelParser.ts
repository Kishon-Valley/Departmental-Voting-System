import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import type { InsertStudent } from "../../shared/schema.js";

export interface ExcelStudentRow {
  name: string;
  indexNumber: string;
  phoneNumber: string | null;
  email: string | null;
  profilePicture: string | null; // Base64 image data or URL
}

export interface ParsedExcelData {
  students: ExcelStudentRow[];
  errors: string[];
}

/**
 * Parse Excel file and extract student data
 * Expected columns:
 * Column 1: NAME
 * Column 2: INDEX NO
 * Column 3: PHONE NO
 * Column 4: EMAIL
 * Column 5: PASSPORT SIZED PICTURE (base64, URL, or embedded image)
 */
export async function parseExcelFile(buffer: Buffer): Promise<ParsedExcelData> {
  const errors: string[] = [];
  const students: ExcelStudentRow[] = [];

  try {
    // Use ExcelJS to read workbook (supports image extraction)
    const workbook = new ExcelJS.Workbook();
    // ExcelJS accepts Buffer, ArrayBuffer, or Uint8Array
    await workbook.xlsx.load(buffer as any);
    
    // Get the first sheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      errors.push("Excel file has no sheets");
      return { students, errors };
    }

    // Build image map: row number -> column index -> image buffer
    const imageMap = new Map<number, Map<number, Buffer>>();
    let imagesFound = 0;
    
    // Try to extract images from worksheet
    try {
      console.log('Starting image extraction from Excel...');
      
      // Method 1: Check worksheet model.drawings first (more reliable)
      console.log('Checking worksheet model:', {
        hasModel: !!worksheet.model,
        hasDrawings: !!(worksheet.model && (worksheet.model as any).drawings),
        drawingsLength: worksheet.model && (worksheet.model as any).drawings ? (worksheet.model as any).drawings.length : 0
      });
      
      if (worksheet.model && (worksheet.model as any).drawings) {
        const drawings = (worksheet.model as any).drawings;
        console.log(`Found ${drawings.length} drawings in worksheet`);
        
        // Get media array if available
        const media = (workbook.model && (workbook.model as any).media) ? (workbook.model as any).media : null;
        console.log(`Media array: ${media && Array.isArray(media) ? media.length : 'not available'} items`);
        
        for (let drawIndex = 0; drawIndex < drawings.length; drawIndex++) {
          const drawing = drawings[drawIndex];
          
          // Log first drawing structure for debugging
          if (drawIndex === 0) {
            console.log('First drawing structure:', JSON.stringify({
              hasImage: !!drawing.image,
              imageIndex: drawing.image?.index,
              imageType: drawing.image?.type,
              hasAnchors: !!drawing.anchors,
              anchorCount: drawing.anchors?.length,
              firstAnchor: drawing.anchors?.[0] ? Object.keys(drawing.anchors[0]) : null
            }, null, 2));
          }
          
          // Check if drawing has image data
          if (drawing.image) {
            let imageBuffer: Buffer | null = null;
            let mediaIndex: number | null = null;
            
            // Try to get buffer from drawing.image directly
            if (drawing.image.buffer) {
              imageBuffer = drawing.image.buffer instanceof Buffer
                ? drawing.image.buffer
                : Buffer.from(drawing.image.buffer);
            } 
            // Try to get media index from various possible properties
            else if (drawing.image.index !== undefined) {
              mediaIndex = drawing.image.index;
            } else if (drawing.image.mediaIndex !== undefined) {
              mediaIndex = drawing.image.mediaIndex;
            } else if (drawing.image.rId !== undefined) {
              // rId might need to be converted to media index
              mediaIndex = drawing.image.rId;
            }
            
            // If we have a media index, get the image from media array
            if (!imageBuffer && mediaIndex !== null && media && Array.isArray(media)) {
              // Try direct index
              if (typeof mediaIndex === 'number' && mediaIndex >= 0 && mediaIndex < media.length) {
                const mediaItem = media[mediaIndex] as any;
                if (mediaItem && mediaItem.buffer) {
                  imageBuffer = mediaItem.buffer instanceof Buffer
                    ? mediaItem.buffer
                    : Buffer.from(mediaItem.buffer);
                }
              }
            }
            // Try rId-based lookup (sometimes media is indexed by rId) - only if media is object
            if (!imageBuffer && mediaIndex !== null && media && !Array.isArray(media) && typeof media === 'object') {
              const rIdKey = `rId${mediaIndex}`;
              const mediaItem = (media as Record<string, any>)[rIdKey];
              if (mediaItem && mediaItem.buffer) {
                imageBuffer = mediaItem.buffer instanceof Buffer
                  ? mediaItem.buffer
                  : Buffer.from(mediaItem.buffer);
              }
            }
            
            // If still no buffer, try iterating through all media to find a match
            if (!imageBuffer && media && Array.isArray(media)) {
              // Sometimes the relationship ID doesn't match the array index
              // Try to find by checking all media items
              for (let mIdx = 0; mIdx < Math.min(media.length, 200); mIdx++) {
                if (media[mIdx] && media[mIdx].buffer) {
                  // For now, we'll match drawings to media in order
                  // This is a fallback - ideally we'd use the proper index
                  if (drawIndex < media.length) {
                    const testBuffer = media[drawIndex].buffer instanceof Buffer
                      ? media[drawIndex].buffer
                      : Buffer.from(media[drawIndex].buffer);
                    if (testBuffer && testBuffer.length > 0) {
                      imageBuffer = testBuffer;
                      break;
                    }
                  }
                }
              }
            }
            
            if (imageBuffer && drawing.anchors && drawing.anchors.length > 0) {
              const anchor = drawing.anchors[0];
              let row = -1;
              let col = -1;
              
              // Try multiple anchor property combinations
              if (anchor.from) {
                row = anchor.from.row !== undefined ? anchor.from.row : -1;
                col = anchor.from.col !== undefined ? anchor.from.col : -1;
              }
              // Try alternative anchor properties
              if (row < 0 && anchor.nativeRow !== undefined) row = anchor.nativeRow;
              if (col < 0 && anchor.nativeCol !== undefined) col = anchor.nativeCol;
              if (row < 0 && anchor.row !== undefined) row = anchor.row;
              if (col < 0 && anchor.col !== undefined) col = anchor.col;
              // Try to/br properties
              if (row < 0 && anchor.to && anchor.to.row !== undefined) row = anchor.to.row;
              if (col < 0 && anchor.to && anchor.to.col !== undefined) col = anchor.to.col;
              // Try editAs property locations
              if (row < 0 && anchor.editAs) {
                // Sometimes position is in editAs
              }
              
              if (row >= 0 && col >= 0) {
                if (!imageMap.has(row)) {
                  imageMap.set(row, new Map());
                }
                imageMap.get(row)!.set(col, imageBuffer);
                imagesFound++;
                if (drawIndex < 5) {
                  console.log(`Found image via drawing ${drawIndex} at row ${row}, col ${col} (mediaIndex: ${mediaIndex})`);
                }
              } else if (drawIndex < 5) {
                console.log(`Drawing ${drawIndex} has image but invalid row/col. Anchor:`, JSON.stringify({
                  from: anchor.from,
                  to: anchor.to,
                  nativeRow: anchor.nativeRow,
                  nativeCol: anchor.nativeCol,
                  row: anchor.row,
                  col: anchor.col
                }));
              }
            } else if (drawIndex < 5) {
              console.log(`Drawing ${drawIndex} missing imageBuffer or anchors. Has buffer: ${!!imageBuffer}, Has anchors: ${!!drawing.anchors}`);
            }
          }
        }
      }
      
      // Method 2: Alternative approach - iterate media and try to match with drawings
      if (imagesFound === 0 && workbook.model && (workbook.model as any).media) {
        const media = (workbook.model as any).media;
        console.log(`Trying alternative method: Found ${Array.isArray(media) ? media.length : 0} media items`);
        
        // Check if we have drawings
        const hasDrawings = worksheet.model && (worksheet.model as any).drawings;
        const drawingsCount = hasDrawings ? (worksheet.model as any).drawings.length : 0;
        console.log(`Alternative method: Has drawings: ${!!hasDrawings}, Count: ${drawingsCount}`);
        
        if (Array.isArray(media) && hasDrawings) {
          const drawings = (worksheet.model as any).drawings;
          console.log(`Matching ${drawings.length} drawings with ${media.length} media items`);
          
          // Try to match drawings with media by index
          for (let drawIdx = 0; drawIdx < drawings.length && drawIdx < media.length; drawIdx++) {
            const drawing = drawings[drawIdx];
            const mediaItem = media[drawIdx] as any;
            
            if (mediaItem && mediaItem.buffer && drawing && drawing.anchors && drawing.anchors.length > 0) {
              const imageBuffer = mediaItem.buffer instanceof Buffer
                ? mediaItem.buffer
                : Buffer.from(mediaItem.buffer);
              
              const anchor = drawing.anchors[0];
              let row = -1;
              let col = -1;
              
              // Log first anchor structure
              if (drawIdx === 0) {
                console.log('First anchor structure:', JSON.stringify({
                  hasFrom: !!anchor.from,
                  fromRow: anchor.from?.row,
                  fromCol: anchor.from?.col,
                  nativeRow: anchor.nativeRow,
                  nativeCol: anchor.nativeCol,
                  row: anchor.row,
                  col: anchor.col,
                  allKeys: Object.keys(anchor)
                }, null, 2));
              }
              
              if (anchor.from) {
                row = anchor.from.row !== undefined ? anchor.from.row : -1;
                col = anchor.from.col !== undefined ? anchor.from.col : -1;
              }
              if (row < 0 && anchor.nativeRow !== undefined) row = anchor.nativeRow;
              if (col < 0 && anchor.nativeCol !== undefined) col = anchor.nativeCol;
              if (row < 0 && anchor.row !== undefined) row = anchor.row;
              if (col < 0 && anchor.col !== undefined) col = anchor.col;
              
              if (row >= 0 && col >= 0) {
                if (!imageMap.has(row)) {
                  imageMap.set(row, new Map());
                }
                imageMap.get(row)!.set(col, imageBuffer);
                imagesFound++;
                if (drawIdx < 5) {
                  console.log(`Alternative method: Found image at row ${row}, col ${col} (drawing ${drawIdx})`);
                }
              } else if (drawIdx < 5) {
                console.log(`Alternative method: Drawing ${drawIdx} has image but invalid row/col (row: ${row}, col: ${col})`);
              }
            } else if (drawIdx < 5) {
              console.log(`Alternative method: Drawing ${drawIdx} missing:`, {
                hasMediaItem: !!mediaItem,
                hasBuffer: !!(mediaItem && mediaItem.buffer),
                hasDrawing: !!drawing,
                hasAnchors: !!(drawing && drawing.anchors)
              });
            }
          }
        } else if (Array.isArray(media) && !hasDrawings) {
          // If no drawings but we have media, store images in order for later matching
          // We'll match them to actual data rows (not Excel row numbers) when processing
          console.log('No drawings found, storing images for ordered matching to data rows...');
          console.log(`We have ${media.length} media items. Will match to data rows as they are processed.`);
          
          // Store media items in order - we'll match them to data rows when processing
          const orderedMedia: Buffer[] = [];
          for (let mIdx = 0; mIdx < media.length; mIdx++) {
            const mediaItem = media[mIdx] as any;
            if (mediaItem && mediaItem.buffer) {
              const imageBuffer = mediaItem.buffer instanceof Buffer
                ? mediaItem.buffer
                : Buffer.from(mediaItem.buffer);
              orderedMedia.push(imageBuffer);
            }
          }
          
          console.log(`Stored ${orderedMedia.length} images for ordered matching`);
          
          // Store ordered media in a way we can access it later
          // We'll use a special marker in the imageMap to store the ordered array
          // Use row -1 as a marker to store the ordered media array
          if (orderedMedia.length > 0) {
            (imageMap as any).__orderedMedia = orderedMedia;
            imagesFound = orderedMedia.length; // Track that we found images
            console.log(`Stored ${orderedMedia.length} images for sequential matching to data rows`);
          }
        }
      }
      
      // Method 3: Check worksheet.images (some ExcelJS versions)
      if ((worksheet as any).images && Array.isArray((worksheet as any).images)) {
        console.log(`Found ${(worksheet as any).images.length} images in worksheet.images`);
        for (const image of (worksheet as any).images) {
          if (image.image && image.image.buffer) {
            const imageBuffer = image.image.buffer instanceof Buffer 
              ? image.image.buffer 
              : Buffer.from(image.image.buffer);
            
            const row = image.tl ? (image.tl.row || 0) : (image.range?.tl?.row || 0);
            const col = image.tl ? (image.tl.col || 0) : (image.range?.tl?.col || 0);
            
            if (row >= 0 && col >= 0) {
              if (!imageMap.has(row)) {
                imageMap.set(row, new Map());
              }
              imageMap.get(row)!.set(col, imageBuffer);
              imagesFound++;
              console.log(`Found image via worksheet.images at row ${row}, col ${col}`);
            }
          }
        }
      }
      
      console.log(`Image extraction complete. Found ${imagesFound} images. Image map size: ${imageMap.size}`);
    } catch (imageError) {
      console.error('Image extraction error:', imageError instanceof Error ? imageError.message : 'Unknown error', imageError);
    }

    // Convert worksheet to array format
    const jsonData: any[][] = [];
    const maxColumns = worksheet.columnCount || 10; // Default to 10 columns if unknown
    
    worksheet.eachRow((row, rowNumber) => {
      const rowData: any[] = new Array(maxColumns).fill(null);
      
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        // Get cell value
        let value: any = null;
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object' && 'text' in cell.value) {
            value = (cell.value as any).text;
          } else {
            value = cell.value;
          }
        }
        
        // Store value at correct column index (0-based)
        const colIndex = colNumber - 1;
        rowData[colIndex] = value;
      });
      
      // Check for embedded images in this row (try both 0-based and 1-based row numbers)
      const rowIndex0 = rowNumber - 1; // 0-based
      const rowIndex1 = rowNumber; // 1-based
      
      // Check images for this row
      for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
        // Check 0-based row index
        if (imageMap.has(rowIndex0) && imageMap.get(rowIndex0)!.has(colIndex)) {
          const imageBuffer = imageMap.get(rowIndex0)!.get(colIndex)!;
          const base64 = imageBuffer.toString('base64');
          const mimeType = detectImageType(imageBuffer) || 'image/jpeg';
          rowData[colIndex] = `data:${mimeType};base64,${base64}`;
        }
        // Check 1-based row index
        else if (imageMap.has(rowIndex1) && imageMap.get(rowIndex1)!.has(colIndex)) {
          const imageBuffer = imageMap.get(rowIndex1)!.get(colIndex)!;
          const base64 = imageBuffer.toString('base64');
          const mimeType = detectImageType(imageBuffer) || 'image/jpeg';
          rowData[colIndex] = `data:${mimeType};base64,${base64}`;
        }
      }
      
      jsonData.push(rowData);
    });

    if (jsonData.length < 2) {
      errors.push("Excel file must have at least a header row and one data row");
      return { students, errors };
    }

    const headerRow = jsonData[0].map(header => 
      header ? header.toString().trim().toUpperCase().replace(/:$/, '') : ''
    );

    const columnMap: { [key: string]: number } = {
      'NAME': headerRow.indexOf('NAME'),
      'INDEX NO': headerRow.indexOf('INDEX NO'),
      'PHONE NO': headerRow.indexOf('PHONE NO'),
      'EMAIL': headerRow.indexOf('EMAIL'),
      'PASSPORT SIZED PICTURE': headerRow.indexOf('PASSPORT SIZED PICTURE'),
    };

    if (columnMap['NAME'] === -1 || columnMap['INDEX NO'] === -1 || columnMap['EMAIL'] === -1) {
      errors.push("Excel file must contain 'NAME', 'INDEX NO', and 'EMAIL' columns.");
      return { students, errors };
    }

    // Get ordered media array if available (for sequential matching)
    const orderedMedia = (imageMap as any).__orderedMedia as Buffer[] | undefined;
    // Track which images from orderedMedia have been used (by Excel row number)
    const usedImages = new Set<number>();

    // Process data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0 || !row[columnMap['NAME']]) {
        continue;
      }

      try {
        const nameValue = row[columnMap['NAME']];
        const indexNumberValue = row[columnMap['INDEX NO']];
        const emailValue = row[columnMap['EMAIL']];

        const name = nameValue ? String(nameValue).trim() : '';
        const indexNumber = indexNumberValue ? String(indexNumberValue).trim() : '';
        const rawEmail = emailValue ? String(emailValue).trim() : null;

        const phoneValue = columnMap['PHONE NO'] !== -1 ? row[columnMap['PHONE NO']] : null;
        const phoneNumber = phoneValue ? String(phoneValue).trim() : null;

        const pictureValue = columnMap['PASSPORT SIZED PICTURE'] !== -1 ? row[columnMap['PASSPORT SIZED PICTURE']] : null;
        let profilePicture = pictureValue ? String(pictureValue).trim() : null;
        
        const pictureColIndex = columnMap['PASSPORT SIZED PICTURE'];
        const excelRowNumber = i + 1; // Excel row number (1-based, row 1 is header, row 2 is first data)
        const dataRowIndex = i; // Index in jsonData array (0-based, index 0 is header, index 1 is first data)

        // Validate required fields FIRST (before assigning images)
        if (!name || name.length === 0) {
          errors.push(`Row ${i + 1}: Missing NAME`);
          continue;
        }

        if (!indexNumber || indexNumber.length === 0) {
          errors.push(`Row ${i + 1}: Missing INDEX NO`);
          continue;
        }

        // Validate index number format: PS/LAB/22/0001
        if (!isValidIndexNumber(indexNumber)) {
          errors.push(`Row ${i + 1}: Invalid index number format. Expected format: PS/LAB/YY/#### (e.g., PS/LAB/22/0001)`);
          continue;
        }

        // Email is required (used as password)
        // If no email exists, skip this row silently (don't add to errors)
        if (!rawEmail || rawEmail.length === 0) {
          continue; // Skip row without email, don't add to errors
        }

        // Try to normalize/extract email from messy cell content
        const email = normalizeEmail(rawEmail);
        if (!email) {
          // Skip rows with invalid email format (don't add to errors)
          continue;
        }

        // At this point, we know this row will be processed
        // Now assign image (if not already in cell value)
        if (!profilePicture || profilePicture.length === 0) {
          // First, try imageMap (for cases where images were matched by Excel row number)
          // This handles the case where images were pre-assigned to Excel row numbers via drawings/anchors
          if (pictureColIndex !== -1) {
            // Try multiple row index combinations
            const rowIndicesToTry = [
              excelRowNumber,      // Excel row number (1-based, row 2 = first data row)
              dataRowIndex,        // Data array index (0-based, index 1 = first data row)
              excelRowNumber - 1,  // Excel row minus 1 (0-based Excel row)
              dataRowIndex + 1,    // Data index plus 1
            ];
            
            for (const rowIndex of rowIndicesToTry) {
              if (imageMap.has(rowIndex)) {
                const colMap = imageMap.get(rowIndex)!;
                
                // Try exact column and nearby columns (images might be slightly offset)
                const colIndicesToTry = [
                  pictureColIndex,
                  pictureColIndex - 1,
                  pictureColIndex + 1,
                  pictureColIndex - 2,
                  pictureColIndex + 2,
                ];
                
                for (const colIndex of colIndicesToTry) {
                  if (colMap.has(colIndex)) {
                    const imageBuffer = colMap.get(colIndex)!;
                    const base64 = imageBuffer.toString('base64');
                    const mimeType = detectImageType(imageBuffer) || 'image/jpeg';
                    profilePicture = `data:${mimeType};base64,${base64}`;
                    
                    if (i <= 2) {
                      console.log(`Found embedded image for row ${excelRowNumber} at rowIndex ${rowIndex}, colIndex ${colIndex}`);
                    }
                    break;
                  }
                }
                
                if (profilePicture) break;
              }
            }
          }
          
          // If still no image, try ordered media array by Excel row number
          // Match images to Excel row numbers: Excel row 2 = orderedMedia[0], Excel row 3 = orderedMedia[1], etc.
          if (!profilePicture && orderedMedia && orderedMedia.length > 0) {
            // Excel row 2 (first data row) maps to orderedMedia[0]
            // Excel row 3 maps to orderedMedia[1], etc.
            const imageIndex = excelRowNumber - 2; // Convert Excel row to 0-based index
            
            // Only use this image if it hasn't been used yet and is within bounds
            if (imageIndex >= 0 && imageIndex < orderedMedia.length && !usedImages.has(imageIndex)) {
              const imageBuffer = orderedMedia[imageIndex];
              if (imageBuffer && imageBuffer.length > 0) {
                const base64 = imageBuffer.toString('base64');
                const mimeType = detectImageType(imageBuffer) || 'image/jpeg';
                profilePicture = `data:${mimeType};base64,${base64}`;
                usedImages.add(imageIndex); // Mark this image as used
                
                if (imageIndex < 3) {
                  console.log(`Ordered match: Image ${imageIndex} -> Excel row ${excelRowNumber} (data row ${i}, index: ${indexNumber})`);
                }
              }
            }
          }
        }
        
        // If profilePicture is still empty or just whitespace, set to null
        if (profilePicture && profilePicture.trim().length === 0) {
          profilePicture = null;
        }

        students.push({
          name,
          indexNumber,
          phoneNumber,
          email,
          profilePicture,
        });
      } catch (error) {
        errors.push(`Row ${i + 1}: Error parsing row - ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    if (students.length === 0 && errors.length === 0) {
      errors.push("No valid student data found in Excel file");
    }

    return { students, errors };
  } catch (error) {
    // Fallback to xlsx library if ExcelJS fails
    try {
      return parseExcelFileFallback(buffer);
    } catch (fallbackError) {
      errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`);
      return { students, errors };
    }
  }
}

/**
 * Fallback parser using xlsx library (doesn't support images)
 */
function parseExcelFileFallback(buffer: Buffer): ParsedExcelData {
  const errors: string[] = [];
  const students: ExcelStudentRow[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      errors.push("Excel file has no sheets");
      return { students, errors };
    }

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false,
    }) as any[][];

    if (jsonData.length < 2) {
      errors.push("Excel file must have at least a header row and one data row");
      return { students, errors };
    }

    const headerRow = jsonData[0].map(header => 
      header ? header.toString().trim().toUpperCase().replace(/:$/, '') : ''
    );

    const columnMap: { [key: string]: number } = {
      'NAME': headerRow.indexOf('NAME'),
      'INDEX NO': headerRow.indexOf('INDEX NO'),
      'PHONE NO': headerRow.indexOf('PHONE NO'),
      'EMAIL': headerRow.indexOf('EMAIL'),
      'PASSPORT SIZED PICTURE': headerRow.indexOf('PASSPORT SIZED PICTURE'),
    };

    if (columnMap['NAME'] === -1 || columnMap['INDEX NO'] === -1 || columnMap['EMAIL'] === -1) {
      errors.push("Excel file must contain 'NAME', 'INDEX NO', and 'EMAIL' columns.");
      return { students, errors };
    }

    // Process data rows (same logic as main parser)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (!row || row.length === 0 || !row[columnMap['NAME']]) {
        continue;
      }

      try {
        const nameValue = row[columnMap['NAME']];
        const indexNumberValue = row[columnMap['INDEX NO']];
        const emailValue = row[columnMap['EMAIL']];

        const name = nameValue ? String(nameValue).trim() : '';
        const indexNumber = indexNumberValue ? String(indexNumberValue).trim() : '';
        const rawEmail = emailValue ? String(emailValue).trim() : null;

        const phoneValue = columnMap['PHONE NO'] !== -1 ? row[columnMap['PHONE NO']] : null;
        const phoneNumber = phoneValue ? String(phoneValue).trim() : null;

        const pictureValue = columnMap['PASSPORT SIZED PICTURE'] !== -1 ? row[columnMap['PASSPORT SIZED PICTURE']] : null;
        const profilePicture = pictureValue ? String(pictureValue).trim() : null;

        if (!name || name.length === 0) {
          errors.push(`Row ${i + 1}: Missing NAME`);
          continue;
        }

        if (!indexNumber || indexNumber.length === 0) {
          errors.push(`Row ${i + 1}: Missing INDEX NO`);
          continue;
        }

        if (!isValidIndexNumber(indexNumber)) {
          errors.push(`Row ${i + 1}: Invalid index number format. Expected format: PS/LAB/YY/#### (e.g., PS/LAB/22/0001)`);
          continue;
        }

        if (!rawEmail || rawEmail.length === 0) {
          continue;
        }

        const email = normalizeEmail(rawEmail);
        if (!email) {
          continue;
        }

        students.push({
          name,
          indexNumber,
          phoneNumber,
          email,
          profilePicture,
        });
      } catch (error) {
        errors.push(`Row ${i + 1}: Error parsing row - ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    if (students.length === 0 && errors.length === 0) {
      errors.push("No valid student data found in Excel file");
    }

    return { students, errors };
  } catch (error) {
    errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { students, errors };
  }
}

/**
 * Detect image type from buffer
 */
function detectImageType(buffer: Buffer): string | null {
  // Check for common image signatures
  if (buffer.length < 4) return null;
  
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  
  // WebP: Check for RIFF...WEBP
  if (buffer.length >= 12 && 
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  
  return null;
}

/**
 * Validate index number format: PS/LAB/YY/####
 * Example: PS/LAB/22/0001
 */
function isValidIndexNumber(indexNumber: string): boolean {
  // Pattern: PS/LAB/YY/#### where YY is 2 digits and #### is 4 digits
  const indexNumberRegex = /^PS\/LAB\/\d{2}\/\d{4}$/;
  return indexNumberRegex.test(indexNumber);
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Normalize/extract email from a potentially messy cell value.
 * Examples it will fix:
 * - "1. john@example.com" -> "john@example.com"
 * - ": john@example.com"  -> "john@example.com"
 * - "leonidasking571@gmail.com" -> "leonidasking571@gmail.com"
 * - "N" or any string without an email -> null
 */
function normalizeEmail(value: string | null): string | null {
  if (!value) return null;

  // Remove all whitespace and normalize
  const trimmed = value.trim().replace(/\s+/g, '');

  // Fast path: already looks like a valid email
  if (isValidEmail(trimmed)) {
    return trimmed.toLowerCase();
  }

  // Try to extract the first email-like substring from the text
  // More permissive pattern to catch emails with various formats
  const emailPattern = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i;
  const match = trimmed.match(emailPattern);

  if (match) {
    const extractedEmail = match[0].trim();
    // Validate the extracted email
    if (isValidEmail(extractedEmail)) {
      return extractedEmail.toLowerCase();
    }
  }

  // Try to find email even if there are leading characters like colons, numbers, etc.
  // Look for @ symbol and extract around it
  const atIndex = trimmed.indexOf('@');
  if (atIndex > 0 && atIndex < trimmed.length - 1) {
    // Extract potential email around @ symbol
    let start = atIndex - 1;
    let end = atIndex + 1;
    
    // Find start of email (go backwards until we hit invalid char or start)
    while (start >= 0 && /[A-Za-z0-9._%+-]/.test(trimmed[start])) {
      start--;
    }
    start++;
    
    // Find end of email (go forwards until we hit space or invalid char)
    while (end < trimmed.length && /[A-Za-z0-9._%-]/.test(trimmed[end])) {
      end++;
    }
    // Include domain extension
    if (end < trimmed.length && trimmed[end] === '.') {
      end++;
      while (end < trimmed.length && /[A-Za-z]/.test(trimmed[end])) {
        end++;
      }
    }
    
    const potentialEmail = trimmed.substring(start, end).trim();
    if (isValidEmail(potentialEmail)) {
      return potentialEmail.toLowerCase();
    }
  }

  return null;
}

/**
 * Convert parsed Excel data to InsertStudent format
 * Uses student's email as password
 * Note: This function assumes all students have valid emails (validated in parseExcelFile)
 */
export function convertToInsertStudents(
  excelStudents: ExcelStudentRow[]
): InsertStudent[] {
  return excelStudents
    .filter((student) => {
      // Safety check: skip students without email (shouldn't happen if parsing is correct)
      if (!student.email) {
        console.warn(`Skipping student ${student.indexNumber}: missing email`);
        return false;
      }
      return true;
    })
    .map((student) => ({
      indexNumber: student.indexNumber,
      fullName: student.name,
      email: student.email!, // Non-null assertion since we filtered above
      year: null, // Year not in Excel, can be updated later
      profilePicture: student.profilePicture, // This could be a URL or base64 data
      password: student.email!, // Use email as password
    }));
}


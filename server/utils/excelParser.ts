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
    
    // Try to extract images from worksheet
    try {
      // Method 1: ExcelJS stores images in worksheet.images array (for newer versions)
      if ((worksheet as any).images && Array.isArray((worksheet as any).images)) {
        for (const image of (worksheet as any).images) {
          if (image.image && image.image.buffer) {
            const imageBuffer = image.image.buffer instanceof Buffer 
              ? image.image.buffer 
              : Buffer.from(image.image.buffer);
            
            // Get image position from image object
            // ExcelJS uses tl (top-left) for positioning
            const row = image.tl ? (image.tl.row || 0) : (image.range?.tl?.row || 0);
            const col = image.tl ? (image.tl.col || 0) : (image.range?.tl?.col || 0);
            
            if (row >= 0 && col >= 0) {
              if (!imageMap.has(row)) {
                imageMap.set(row, new Map());
              }
              imageMap.get(row)!.set(col, imageBuffer);
            }
          }
        }
      }
      
      // Method 2: Check workbook's image collection
      if (workbook.model && (workbook.model as any).media) {
        const media = (workbook.model as any).media;
        if (Array.isArray(media)) {
          // Images are stored in workbook media, need to match with worksheet
          // This is a fallback method
        }
      }
      
      // Method 3: Check model.drawings for embedded images (older ExcelJS versions)
      if (worksheet.model && (worksheet.model as any).drawings) {
        const drawings = (worksheet.model as any).drawings;
        for (const drawing of drawings) {
          if (drawing.anchors && drawing.anchors.length > 0) {
            const anchor = drawing.anchors[0];
            const row = anchor.from ? anchor.from.row : (anchor.nativeCol ? anchor.nativeCol : -1);
            const col = anchor.from ? anchor.from.col : (anchor.nativeRow ? anchor.nativeRow : -1);
            
            // Also try alternative anchor properties
            const altRow = anchor.nativeRow !== undefined ? anchor.nativeRow : row;
            const altCol = anchor.nativeCol !== undefined ? anchor.nativeCol : col;
            
            if (drawing.image && drawing.image.buffer) {
              const imageBuffer = drawing.image.buffer instanceof Buffer
                ? drawing.image.buffer
                : Buffer.from(drawing.image.buffer);
              
              // Try both row/col combinations
              const finalRow = row >= 0 ? row : altRow;
              const finalCol = col >= 0 ? col : altCol;
              
              if (finalRow >= 0 && finalCol >= 0) {
                if (!imageMap.has(finalRow)) {
                  imageMap.set(finalRow, new Map());
                }
                imageMap.get(finalRow)!.set(finalCol, imageBuffer);
              }
            }
          }
        }
      }
      
      // Method 4: Try accessing images through worksheet's getImages() method if available
      if (typeof (worksheet as any).getImages === 'function') {
        try {
          const images = (worksheet as any).getImages();
          if (Array.isArray(images)) {
            for (const image of images) {
              if (image.buffer || image.image?.buffer) {
                const imageBuffer = image.buffer instanceof Buffer
                  ? image.buffer
                  : (image.image?.buffer instanceof Buffer
                    ? image.image.buffer
                    : Buffer.from(image.image?.buffer || image.buffer));
                
                const row = image.row !== undefined ? image.row : (image.tl?.row || 0);
                const col = image.col !== undefined ? image.col : (image.tl?.col || 0);
                
                if (row >= 0 && col >= 0) {
                  if (!imageMap.has(row)) {
                    imageMap.set(row, new Map());
                  }
                  imageMap.get(row)!.set(col, imageBuffer);
                }
              }
            }
          }
        } catch (getImagesError) {
          // Method not available, continue
        }
      }
    } catch (imageError) {
      // If image extraction fails, continue without images
      // Images can still be provided as URLs or base64 in cells
      console.warn('Image extraction warning:', imageError instanceof Error ? imageError.message : 'Unknown error');
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
        
        // If no picture from cell value, check if there's an embedded image in this row/column
        // This handles cases where ExcelJS image extraction didn't populate the cell value
        if (!profilePicture || profilePicture.length === 0) {
          const pictureColIndex = columnMap['PASSPORT SIZED PICTURE'];
          if (pictureColIndex !== -1) {
            // Check image map for this row (i is 1-based for data rows, jsonData[0] is header)
            // So data row index in jsonData is i (which starts at 1)
            const rowIndex0 = i; // 0-based row index in jsonData (data row)
            const rowIndex1 = i + 1; // 1-based row index (Excel row number, accounting for header)
            
            // Try both 0-based and 1-based row indices
            if (imageMap.has(rowIndex0) && imageMap.get(rowIndex0)!.has(pictureColIndex)) {
              const imageBuffer = imageMap.get(rowIndex0)!.get(pictureColIndex)!;
              const base64 = imageBuffer.toString('base64');
              const mimeType = detectImageType(imageBuffer) || 'image/jpeg';
              profilePicture = `data:${mimeType};base64,${base64}`;
            } else if (imageMap.has(rowIndex1) && imageMap.get(rowIndex1)!.has(pictureColIndex)) {
              const imageBuffer = imageMap.get(rowIndex1)!.get(pictureColIndex)!;
              const base64 = imageBuffer.toString('base64');
              const mimeType = detectImageType(imageBuffer) || 'image/jpeg';
              profilePicture = `data:${mimeType};base64,${base64}`;
            }
          }
        }
        
        // If profilePicture is still empty or just whitespace, set to null
        if (profilePicture && profilePicture.trim().length === 0) {
          profilePicture = null;
        }

        // Validate required fields
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


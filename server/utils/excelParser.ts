import * as XLSX from "xlsx";
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
 * Column 5: PASSPORT SIZED PICTURE (base64 or URL)
 */
export function parseExcelFile(buffer: Buffer): ParsedExcelData {
  const errors: string[] = [];
  const students: ExcelStudentRow[] = [];

  try {
    // Read the workbook
    const workbook = XLSX.read(buffer, { type: "buffer" });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      errors.push("Excel file has no sheets");
      return { students, errors };
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use array format to preserve column order
      defval: null, // Default value for empty cells
      raw: false, // Convert numbers to strings
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
        const profilePicture = pictureValue ? String(pictureValue).trim() : null;

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
    errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}`);
    return { students, errors };
  }
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


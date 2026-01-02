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

    // Skip header row and process data rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) {
        continue;
      }

      try {
        // Extract data based on column positions
        // Column 1: NAME (index 0)
        // Column 2: INDEX NO (index 1)
        // Column 3: PHONE NO (index 2)
        // Column 4: EMAIL (index 3)
        // Column 5: PASSPORT SIZED PICTURE (index 4)
        
        const name = row[0]?.toString().trim();
        const indexNumber = row[1]?.toString().trim();
        const phoneNumber = row[2]?.toString().trim() || null;
        const email = row[3]?.toString().trim() || null;
        const profilePicture = row[4]?.toString().trim() || null;

        // Validate required fields
        if (!name || name.length === 0) {
          errors.push(`Row ${i + 1}: Missing NAME`);
          continue;
        }

        if (!indexNumber || indexNumber.length === 0) {
          errors.push(`Row ${i + 1}: Missing INDEX NO`);
          continue;
        }

        // Validate email format if provided
        if (email && !isValidEmail(email)) {
          errors.push(`Row ${i + 1}: Invalid email format: ${email}`);
          // Continue anyway, we'll use null for email
        }

        students.push({
          name,
          indexNumber,
          phoneNumber,
          email: email && isValidEmail(email) ? email : null,
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
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Convert parsed Excel data to InsertStudent format
 * Generates a default password for each student (can be changed later)
 */
export function convertToInsertStudents(
  excelStudents: ExcelStudentRow[],
  defaultPassword: string = "Student@123" // Default password, should be changed by students
): InsertStudent[] {
  return excelStudents.map((student) => ({
    indexNumber: student.indexNumber,
    fullName: student.name,
    email: student.email,
    year: null, // Year not in Excel, can be updated later
    profilePicture: student.profilePicture, // This could be a URL or base64 data
    password: defaultPassword,
  }));
}


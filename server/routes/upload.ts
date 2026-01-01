import type { Request, Response } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "../db.js";

// Create Supabase client with service role key for storage operations
// This bypasses RLS policies for server-side uploads
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
  // Fallback to regular client if service role key not available
  return supabase;
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

export const uploadMiddleware = upload.single('avatar');

/**
 * Upload profile picture endpoint
 * POST /api/auth/upload-avatar
 * Requires JWT authentication middleware
 */
export async function uploadAvatarRoute(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const file = req.file;
    const userId = user.id;
    
    // Sanitize and generate unique filename
    // Remove any path separators and special characters from original filename
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileExt = sanitizedOriginalName.split('.').pop()?.toLowerCase() || 'jpg';
    // Validate file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ 
        message: "Invalid file extension. Only JPEG, PNG, and WebP images are allowed." 
      });
    }
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage using service role client (bypasses RLS)
    const storageClient = getStorageClient();
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('student-avatars')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ 
        message: "Failed to upload file",
        error: uploadError.message 
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('student-avatars')
      .getPublicUrl(filePath);

    return res.json({
      message: "File uploaded successfully",
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      message: "Failed to upload file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Upload profile picture endpoint (base64 version for Vercel compatibility)
 * POST /api/auth/upload-avatar-base64
 * Requires JWT authentication middleware
 */
export async function uploadAvatarBase64Route(req: Request, res: Response) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const { file, filename, mimeType } = req.body || {};

    if (!file || typeof file !== 'string') {
      return res.status(400).json({ 
        message: "No file data provided",
        received: { 
          hasFile: !!file, 
          fileType: typeof file,
          bodyType: typeof req.body 
        }
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const contentType = mimeType || 'image/jpeg';
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ 
        message: "Invalid file type. Only JPEG, PNG, and WebP images are allowed." 
      });
    }

    // Convert base64 to buffer
    let fileBuffer: Buffer;
    try {
      if (file.startsWith('data:')) {
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = file.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid base64 data URL format');
        }
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        fileBuffer = Buffer.from(file, 'base64');
      }
      
      if (fileBuffer.length === 0) {
        throw new Error('Decoded file buffer is empty');
      }
    } catch (bufferError) {
      console.error('Error converting base64 to buffer:', bufferError);
      return res.status(400).json({
        message: "Invalid file data format",
        error: bufferError instanceof Error ? bufferError.message : "Failed to decode base64",
      });
    }

    // Validate file size (5MB)
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        message: "File too large. Please select an image smaller than 5MB." 
      });
    }

    const userId = user.id;
    
    // Sanitize and generate unique filename
    let fileExt: string;
    if (filename) {
      // Sanitize filename and extract extension
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      fileExt = sanitizedFilename.split('.').pop()?.toLowerCase() || contentType.split('/')[1] || 'jpg';
    } else {
      fileExt = contentType.split('/')[1] || 'jpg';
    }
    // Validate file extension
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    if (!allowedExtensions.includes(fileExt)) {
      return res.status(400).json({ 
        message: "Invalid file extension. Only JPEG, PNG, and WebP images are allowed." 
      });
    }
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage using service role client (bypasses RLS)
    const storageClient = getStorageClient();
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from('student-avatars')
      .upload(filePath, fileBuffer, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({ 
        message: "Failed to upload file",
        error: uploadError.message 
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('student-avatars')
      .getPublicUrl(filePath);

    return res.json({
      message: "File uploaded successfully",
      url: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      message: "Failed to upload file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}


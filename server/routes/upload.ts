import type { Request, Response } from "express";
import multer from "multer";
import { supabase } from "../db.js";

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
 */
export async function uploadAvatarRoute(req: Request, res: Response) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const file = req.file;
    const userId = req.user.id;
    
    // Generate unique filename
    const fileExt = file.originalname.split('.').pop() || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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
 */
export async function uploadAvatarBase64Route(req: Request, res: Response) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const { file, filename, mimeType } = req.body;

    if (!file) {
      return res.status(400).json({ message: "No file data provided" });
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
    if (file.startsWith('data:')) {
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = file.split(',')[1];
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      fileBuffer = Buffer.from(file, 'base64');
    }

    // Validate file size (5MB)
    if (fileBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        message: "File too large. Please select an image smaller than 5MB." 
      });
    }

    const userId = req.user.id;
    
    // Generate unique filename
    const fileExt = filename?.split('.').pop() || contentType.split('/')[1] || 'jpg';
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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


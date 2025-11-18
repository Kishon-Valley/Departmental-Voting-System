// Vercel serverless function for API routes
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cookieSession from "cookie-session";
import passport from "../server/auth/passport.js";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "../server/routes/auth.js";
import { uploadAvatarRoute, uploadAvatarBase64Route } from "../server/routes/upload.js";
import Busboy from "busboy";
import { Readable } from "stream";

// Initialize Express app (lazy initialization)
let app: express.Application | null = null;

async function getApp(): Promise<express.Application> {
  if (app) return app;

  app = express();

  // Body parsing middleware
  // Note: In Vercel serverless functions, the body is already parsed by the platform
  // So we skip Express body parsers to avoid stream-related errors
  // The body will be available directly from req.body
  app.use((req, res, next) => {
    // Vercel already parses JSON and URL-encoded bodies
    // We just need to ensure req.body exists (it should already be set by Vercel)
    if (req.body === undefined) {
      req.body = {};
    }
    next();
  });

  // Cookie-session configuration
  app.use(
    cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "change-me"],
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    }),
  );

  // Initialize Passport
  // Patch cookie-session so Passport can call req.session.regenerate/destroy/save
  app.use((req, _res, next) => {
    if (req.session && typeof (req.session as any).regenerate !== 'function') {
      (req.session as any).regenerate = (cb?: (err?: any) => void) => {
        cb?.();
      };
    }
    if (req.session && typeof (req.session as any).destroy !== 'function') {
      (req.session as any).destroy = (cb?: (err?: any) => void) => {
        req.session = null as any;
        cb?.();
      };
    }
    if (req.session && typeof (req.session as any).save !== 'function') {
      (req.session as any).save = (cb?: (err?: any) => void) => cb?.();
    }
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session());

  // Middleware to strip /api prefix if present (for Vercel compatibility)
  app.use((req, res, next) => {
    if (req.url?.startsWith('/api/')) {
      req.url = req.url.replace('/api', '');
    }
    next();
  });

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(`${req.method} ${req.url} ${res.statusCode} in ${Date.now() - start}ms`);
    });
    next();
  });

  // Register routes (without /api prefix - Vercel handles it)
  // Also register with /api prefix as fallback
  app.post("/auth/login", loginRoute);
  app.post("/api/auth/login", loginRoute);
  app.post("/auth/logout", logoutRoute);
  app.post("/api/auth/logout", logoutRoute);
  app.get("/auth/me", meRoute);
  app.get("/api/auth/me", meRoute);
  app.put("/auth/profile", updateProfileRoute);
  app.put("/api/auth/profile", updateProfileRoute);
  // File upload routes
  app.post("/auth/upload-avatar", uploadAvatarRoute);
  app.post("/api/auth/upload-avatar", uploadAvatarRoute);
  // Base64 upload route (for Vercel compatibility)
  app.post("/auth/upload-avatar-base64", uploadAvatarBase64Route);
  app.post("/api/auth/upload-avatar-base64", uploadAvatarBase64Route);

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
}

// Helper function to parse multipart/form-data for file uploads using busboy
async function parseMultipartFormData(req: VercelRequest): Promise<{ body: any; file?: any }> {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      resolve({ body: req.body || {} });
      return;
    }

    // For Vercel, we need to get the raw body
    // Vercel might provide it in different ways - check all possibilities
    let rawBody: Buffer | undefined;
    
    // Try different ways to get the raw body
    // 1. Check for rawBody property (might be set by middleware)
    if ((req as any).rawBody) {
      rawBody = Buffer.isBuffer((req as any).rawBody) 
        ? (req as any).rawBody 
        : Buffer.from((req as any).rawBody);
    } 
    // 2. Check if body is already a buffer
    else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    } 
    // 3. Check if body is a string (base64 or binary)
    else if (typeof req.body === 'string') {
      // Try to decode as base64 first (Vercel might encode it)
      try {
        rawBody = Buffer.from(req.body, 'base64');
      } catch {
        // If not base64, try binary
        rawBody = Buffer.from(req.body, 'binary');
      }
    }
    // 4. Check if body is an object with data (unlikely but possible)
    else if (req.body && typeof req.body === 'object' && (req.body as any).data) {
      rawBody = Buffer.from((req.body as any).data);
    }

    if (!rawBody || rawBody.length === 0) {
      console.warn('Cannot parse multipart: raw body not available', {
        bodyType: typeof req.body,
        bodyIsBuffer: Buffer.isBuffer(req.body),
        hasRawBody: !!(req as any).rawBody,
      });
      resolve({ body: {} });
      return;
    }

    const body: any = {};
    let file: any = null;
    let hasError = false;

    // Create a readable stream from the buffer for busboy
    const stream = Readable.from(rawBody);

    const busboy = Busboy({ headers: req.headers });
    
    busboy.on('file', (fieldname, fileStream, info) => {
      const { filename, encoding, mimeType } = info;
      const chunks: Buffer[] = [];
      
      fileStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      fileStream.on('end', () => {
        if (!file) {
          file = {
            fieldname,
            originalname: filename,
            encoding,
            mimetype: mimeType || 'application/octet-stream',
            buffer: Buffer.concat(chunks),
            size: Buffer.concat(chunks).length,
          };
        }
      });
      
      fileStream.on('error', (err: Error) => {
        console.error('File stream error:', err);
        hasError = true;
        reject(err);
      });
    });
    
    busboy.on('field', (fieldname, value) => {
      body[fieldname] = value;
    });
    
    busboy.on('finish', () => {
      if (!hasError) {
        resolve({ body, file });
      }
    });
    
    busboy.on('error', (err: Error) => {
      console.error('Busboy error:', err);
      hasError = true;
      reject(err);
    });

    // Pipe the stream to busboy
    stream.pipe(busboy);
  });
}

// Export as Vercel serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getApp();
  
  // Log the incoming request for debugging
  console.log('Vercel request:', {
    method: req.method,
    url: req.url,
    path: (req as any).path,
    query: req.query,
  });
  
  // Extract the path from Vercel's request
  let path = req.url || '';
  
  // Handle file uploads for multipart/form-data
  let parsedBody = req.body;
  let parsedFile: any = undefined;
  
  if (req.method === 'POST' && (path.includes('/upload-avatar'))) {
    // Log what we're receiving for debugging
    console.log('Upload request details:', {
      contentType: req.headers['content-type'],
      bodyType: typeof req.body,
      bodyIsBuffer: Buffer.isBuffer(req.body),
      hasRawBody: !!(req as any).rawBody,
      bodyLength: req.body ? (Buffer.isBuffer(req.body) ? req.body.length : String(req.body).length) : 0,
    });
    
    try {
      const parsed = await parseMultipartFormData(req);
      parsedBody = parsed.body;
      parsedFile = parsed.file;
      console.log('Parsed result:', { hasFile: !!parsedFile, bodyKeys: Object.keys(parsedBody) });
    } catch (error) {
      console.error('Error parsing multipart:', error);
    }
  }
  
  // Parse cookies from headers if not already parsed by Vercel
  let cookies: Record<string, string> = {};
  if (req.cookies) {
    cookies = req.cookies;
  } else if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach((cookie: string) => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });
  }
  
  // Create Express-compatible request object
  // We need to create a proper object that Express middleware can modify
  const expressReq: any = {
    method: req.method || 'GET',
    url: path,
    originalUrl: path,
    path: path.split('?')[0],
    query: req.query || {},
    body: parsedBody,
    file: parsedFile, // Attach parsed file for multer compatibility
    headers: req.headers,
    cookies: cookies,
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown',
    protocol: req.headers['x-forwarded-proto'] || 'https',
    hostname: req.headers.host?.split(':')[0] || 'unknown',
    get: function(name: string) {
      return this.headers[name.toLowerCase()];
    },
    header: function(name: string) {
      return this.headers[name.toLowerCase()];
    },
    // These will be set by Passport middleware
    isAuthenticated: function() {
      return !!this.user;
    },
    // Session will be set by cookie-session middleware
    session: undefined,
    // User will be set by Passport
    user: undefined,
    // Passport methods - these will be added by passport.initialize()
    logIn: undefined,
    logOut: undefined,
    login: undefined,
    logout: undefined,
  };
  
  // Create Express-compatible response object
  let statusCode = 200;
  const expressRes = {
    ...res,
    statusCode: statusCode,
    status: function(code: number) {
      statusCode = code;
      res.statusCode = code;
      return this;
    },
    json: function(body: any) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = statusCode;
      res.end(JSON.stringify(body));
      return this;
    },
    end: function(chunk?: any) {
      res.statusCode = statusCode;
      if (chunk) {
        res.end(chunk);
      } else {
        res.end();
      }
      return this;
    },
    setHeader: function(name: string, value: string | string[]) {
      res.setHeader(name, value);
      return this;
    },
    getHeader: function(name: string) {
      return res.getHeader(name);
    },
  } as any;
  
  // Convert Vercel request/response to Express-compatible format
  return new Promise<void>((resolve, reject) => {
    expressApp(expressReq, expressRes, (err?: any) => {
      if (err) {
        console.error('Express error:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}



// Vercel serverless function for API routes
import "../env.js"; // Load environment variables first
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import passport from "../server/auth/passport.js";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "../server/routes/auth.js";
import { uploadAvatarRoute, uploadAvatarBase64Route } from "../server/routes/upload.js";
import { getCandidatesRoute, getCandidateByIdRoute, getCandidatesByPositionRoute } from "../server/routes/candidates.js";
import { getPositionsRoute, getPositionByIdRoute } from "../server/routes/positions.js";
import { submitVotesRoute, getMyVotesRoute } from "../server/routes/votes.js";
import { getResultsRoute, getResultsByPositionRoute } from "../server/routes/results.js";
import { getElectionStatusRoute } from "../server/routes/election.js";
import { adminLoginRoute, adminMeRoute, createElectionRoute, updateElectionStatusRoute, updateElectionDatesRoute, createPositionRoute, updatePositionRoute, deletePositionRoute, createCandidateRoute, updateCandidateRoute, deleteCandidateRoute, getAllVotesRoute, getStudentsRoute, createStudentRoute } from "../server/routes/admin.js";
import { uploadExcelFromStorageRoute } from "../server/routes/adminExcel.js";
import { jwtAuth, optionalJwtAuth, requireAuth, requireAdmin } from "../server/middleware/jwtAuth.js";
import Busboy from "busboy";
import { Readable } from "stream";

// Initialize Express app (lazy initialization)
let app: express.Application | null = null;

async function getApp(): Promise<express.Application> {
  if (app) return app;

  app = express();
  app.set("trust proxy", 1);

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

  // Initialize Passport

  app.use(passport.initialize());

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
  
  // Auth routes
  app.post("/auth/login", loginRoute);
  app.post("/api/auth/login", loginRoute);
  app.post("/auth/logout", logoutRoute);
  app.post("/api/auth/logout", logoutRoute);
  app.get("/auth/me", jwtAuth, meRoute);
  app.get("/api/auth/me", jwtAuth, meRoute);
  app.put("/auth/profile", jwtAuth, updateProfileRoute);
  app.put("/api/auth/profile", jwtAuth, updateProfileRoute);
  // File upload routes (protected with JWT authentication)
  app.post("/auth/upload-avatar", jwtAuth, uploadAvatarRoute);
  app.post("/api/auth/upload-avatar", jwtAuth, uploadAvatarRoute);
  // Base64 upload route (for Vercel compatibility)
  app.post("/auth/upload-avatar-base64", jwtAuth, uploadAvatarBase64Route);
  app.post("/api/auth/upload-avatar-base64", jwtAuth, uploadAvatarBase64Route);

  // Candidate routes
  app.get("/candidates", getCandidatesRoute);
  app.get("/api/candidates", getCandidatesRoute);
  app.get("/candidates/position/:positionId", getCandidatesByPositionRoute);
  app.get("/api/candidates/position/:positionId", getCandidatesByPositionRoute);
  app.get("/candidates/:id", getCandidateByIdRoute);
  app.get("/api/candidates/:id", getCandidateByIdRoute);

  // Position routes
  app.get("/positions", getPositionsRoute);
  app.get("/api/positions", getPositionsRoute);
  app.get("/positions/:id", getPositionByIdRoute);
  app.get("/api/positions/:id", getPositionByIdRoute);

  // Vote routes
  app.post("/votes", jwtAuth, submitVotesRoute);
  app.post("/api/votes", jwtAuth, submitVotesRoute);
  app.get("/votes/my-votes", jwtAuth, getMyVotesRoute);
  app.get("/api/votes/my-votes", jwtAuth, getMyVotesRoute);

  // Results routes
  app.get("/results", getResultsRoute);
  app.get("/api/results", getResultsRoute);
  app.get("/results/position/:positionId", getResultsByPositionRoute);
  app.get("/api/results/position/:positionId", getResultsByPositionRoute);

  // Election routes
  app.get("/election/status", getElectionStatusRoute);
  app.get("/api/election/status", getElectionStatusRoute);

  // Admin routes
  app.post("/admin/login", adminLoginRoute);
  app.post("/api/admin/login", adminLoginRoute);
  app.get("/admin/me", jwtAuth, requireAdmin, adminMeRoute);
  app.get("/api/admin/me", jwtAuth, requireAdmin, adminMeRoute);
  
  // Protected admin routes
  app.post("/admin/elections", jwtAuth, requireAdmin, createElectionRoute);
  app.post("/api/admin/elections", jwtAuth, requireAdmin, createElectionRoute);
  app.put("/admin/elections/:id/status", jwtAuth, requireAdmin, updateElectionStatusRoute);
  app.put("/api/admin/elections/:id/status", jwtAuth, requireAdmin, updateElectionStatusRoute);
  app.put("/admin/elections/:id/dates", jwtAuth, requireAdmin, updateElectionDatesRoute);
  app.put("/api/admin/elections/:id/dates", jwtAuth, requireAdmin, updateElectionDatesRoute);
  app.post("/admin/positions", jwtAuth, requireAdmin, createPositionRoute);
  app.post("/api/admin/positions", jwtAuth, requireAdmin, createPositionRoute);
  app.put("/admin/positions/:id", jwtAuth, requireAdmin, updatePositionRoute);
  app.put("/api/admin/positions/:id", jwtAuth, requireAdmin, updatePositionRoute);
  app.delete("/admin/positions/:id", jwtAuth, requireAdmin, deletePositionRoute);
  app.delete("/api/admin/positions/:id", jwtAuth, requireAdmin, deletePositionRoute);
  app.post("/admin/candidates", jwtAuth, requireAdmin, createCandidateRoute);
  app.post("/api/admin/candidates", jwtAuth, requireAdmin, createCandidateRoute);
  app.put("/admin/candidates/:id", jwtAuth, requireAdmin, updateCandidateRoute);
  app.put("/api/admin/candidates/:id", jwtAuth, requireAdmin, updateCandidateRoute);
  app.delete("/admin/candidates/:id", jwtAuth, requireAdmin, deleteCandidateRoute);
  app.delete("/api/admin/candidates/:id", jwtAuth, requireAdmin, deleteCandidateRoute);
  app.get("/admin/votes", jwtAuth, requireAdmin, getAllVotesRoute);
  app.get("/api/admin/votes", jwtAuth, requireAdmin, getAllVotesRoute);
  app.get("/admin/students", jwtAuth, requireAdmin, getStudentsRoute);
  app.get("/api/admin/students", jwtAuth, requireAdmin, getStudentsRoute);
  app.post("/admin/students", jwtAuth, requireAdmin, createStudentRoute);
  app.post("/api/admin/students", jwtAuth, requireAdmin, createStudentRoute);
  // Excel upload via Supabase Storage (preferred path, bypasses Vercel limits)
  app.post("/admin/students/upload-excel-from-storage", jwtAuth, requireAdmin, uploadExcelFromStorageRoute);
  app.post("/api/admin/students/upload-excel-from-storage", jwtAuth, requireAdmin, uploadExcelFromStorageRoute);

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Handle Vercel payload too large errors specifically
    if (status === 413 || message.includes('FUNCTION_PAYLOAD_TOO_LARGE') || message.includes('413')) {
      return res.status(413).json({ 
        message: "File too large. Maximum size is 3.4MB. Please split your Excel file into smaller batches.",
        error: "FUNCTION_PAYLOAD_TOO_LARGE"
      });
    }
    
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
        // Handle multiple files (for Excel upload, we only expect one)
        if (fieldname === 'excelFile' || fieldname === 'avatar') {
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
  
  // Extract the path from Vercel's request
  let path = req.url || '';
  
  // Track if response has been sent
  let responseEnded = false;
  
  // Handle file uploads for multipart/form-data
  let parsedBody = req.body || {};
  let parsedFile: any = undefined;
  
  if (req.method === 'POST' && (
    path.includes('/upload-avatar') && !path.includes('base64')
  )) {
    try {
      const parsed = await parseMultipartFormData(req);
      parsedBody = parsed.body;
      parsedFile = parsed.file;
    } catch (error) {
      console.error('Error parsing multipart:', error);
    }
  }
  
  // Ensure body is parsed for JSON requests (Vercel should do this, but ensure it's there)
  let finalBody = parsedBody || {};
  if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body) && !Array.isArray(req.body)) {
      finalBody = req.body;
    } else if (typeof req.body === 'string') {
      try {
        finalBody = JSON.parse(req.body);
      } catch {
        // Not JSON, keep as is or use parsedBody
        finalBody = parsedBody || {};
      }
    } else {
      finalBody = parsedBody || {};
    }
  }

  // Create Express-compatible request object
  // We need to create a proper object that Express middleware can modify
  // Ensure cookies are properly passed through (normalize header keys to lowercase)
  const headers: Record<string, string | string[]> = {};
  Object.keys(req.headers).forEach(key => {
    const lowerKey = key.toLowerCase();
    headers[lowerKey] = req.headers[key] as string | string[];
  });
  
  // Ensure cookie header is preserved (important for authentication)
  // Vercel might send it in different cases
  if (req.headers.cookie && !headers.cookie) {
    headers.cookie = Array.isArray(req.headers.cookie) 
      ? req.headers.cookie.join('; ') 
      : req.headers.cookie;
  }
  
  // Also check for Cookie (capital C) and other variations
  if (req.headers.Cookie && !headers.cookie) {
    headers.cookie = Array.isArray(req.headers.Cookie)
      ? req.headers.Cookie.join('; ')
      : req.headers.Cookie;
  }
  
  // Also check Authorization header for Bearer token (for API clients)
  if (req.headers.authorization && !headers.authorization) {
    headers.authorization = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
  }
  
  if (req.headers.Authorization && !headers.authorization) {
    headers.authorization = Array.isArray(req.headers.Authorization)
      ? req.headers.Authorization[0]
      : req.headers.Authorization;
  }
  
  const expressReq: any = {
    method: req.method || 'GET',
    url: path,
    originalUrl: path,
    path: path.split('?')[0],
    query: req.query || {},
    body: finalBody,
    file: parsedFile, // Attach parsed file for multer compatibility
    headers: headers,
    ip: (() => {
      const forwardedFor = req.headers['x-forwarded-for'];
      if (typeof forwardedFor === 'string') {
        return forwardedFor.split(',')[0]?.trim();
      } else if (Array.isArray(forwardedFor)) {
        return forwardedFor[0]?.trim();
      }
      const realIp = req.headers['x-real-ip'];
      if (typeof realIp === 'string') {
        return realIp;
      } else if (Array.isArray(realIp)) {
        return realIp[0];
      }
      return 'unknown';
    })(),
    protocol: (() => {
      const proto = req.headers['x-forwarded-proto'];
      if (typeof proto === 'string') {
        return proto;
      } else if (Array.isArray(proto)) {
        return proto[0];
      }
      return 'https';
    })(),
    hostname: (() => {
      const host = req.headers.host;
      if (typeof host === 'string') {
        return host.split(':')[0];
      }
      if (Array.isArray(host)) {
        const firstHost = host[0];
        if (firstHost) {
          const hostStr = String(firstHost);
          return hostStr.split(':')[0];
        }
      }
      return 'unknown';
    })(),
    get: function(name: string) {
      const lowerName = name.toLowerCase();
      // Special handling for cookie header (case-insensitive)
      if (lowerName === 'cookie' || lowerName === 'authorization') {
        return this.headers[lowerName] || this.headers[name];
      }
      return this.headers[lowerName];
    },
    header: function(name: string) {
      const lowerName = name.toLowerCase();
      // Special handling for cookie header (case-insensitive)
      if (lowerName === 'cookie' || lowerName === 'authorization') {
        return this.headers[lowerName] || this.headers[name];
      }
      return this.headers[lowerName];
    },
    // These will be set by Passport middleware
    isAuthenticated: function() {
      return !!this.user;
    },
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
  const responseHeaders: Record<string, string | string[]> = {};
  
  const expressRes = {
    ...res,
    statusCode: statusCode,
    status: function(code: number) {
      statusCode = code;
      res.statusCode = code;
      return this;
    },
    json: function(body: any) {
      if (responseEnded) return this;
      
      const sendJsonResponse = () => {
        // Set all collected headers before sending response
        Object.entries(responseHeaders).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = statusCode;
        responseEnded = true;
        
        res.end(JSON.stringify(body));
      };
      
      sendJsonResponse();
      
      return this;
    },
    end: function(chunk?: any) {
      if (responseEnded) return this;
      
      const sendEndResponse = () => {
        // Set all collected headers before sending response
        Object.entries(responseHeaders).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
        res.statusCode = statusCode;
        responseEnded = true;
        
        if (chunk) {
          res.end(chunk);
        } else {
          res.end();
        }
      };
      
      sendEndResponse();
      
      return this;
    },
    setHeader: function(name: string, value: string | string[]) {
      // Store headers so they can be set when response is sent
      const lowerName = name.toLowerCase();
      responseHeaders[lowerName] = value;
      res.setHeader(name, value);
      return this;
    },
    getHeader: function(name: string) {
      return res.getHeader(name) || responseHeaders[name.toLowerCase()];
    },
    // Implement writeHead for header flushing in serverless environment
    writeHead: function(status: number, headers?: Record<string, string | string[]>) {
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          responseHeaders[key.toLowerCase()] = value;
          res.setHeader(key, value);
        });
      }
      if (status) {
        statusCode = status;
        res.statusCode = status;
      }
      return this;
    },
    cookie: function(name: string, value: string, options?: any) {
      // Handle cookie setting for JWT tokens
      const cookieOptions = options || {};
      let cookieString = `${name}=${value}`;
      
      if (cookieOptions.maxAge) {
        cookieString += `; Max-Age=${Math.floor(cookieOptions.maxAge / 1000)}`;
      }
      if (cookieOptions.domain) {
        cookieString += `; Domain=${cookieOptions.domain}`;
      }
      if (cookieOptions.path) {
        cookieString += `; Path=${cookieOptions.path}`;
      }
      if (cookieOptions.secure) {
        cookieString += `; Secure`;
      }
      if (cookieOptions.httpOnly) {
        cookieString += `; HttpOnly`;
      }
      if (cookieOptions.sameSite) {
        cookieString += `; SameSite=${cookieOptions.sameSite}`;
      }
      
      // Append to existing Set-Cookie header or create new one
      const existing = responseHeaders['set-cookie'] || [];
      const cookies = Array.isArray(existing) ? [...existing, cookieString] : [cookieString];
      responseHeaders['set-cookie'] = cookies;
      res.setHeader('Set-Cookie', cookies);
      return this;
    },
    clearCookie: function(name: string, options?: any) {
      // Clear cookie by setting it with expired date
      const cookieOptions = options || {};
      let cookieString = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      if (cookieOptions.domain) {
        cookieString += `; Domain=${cookieOptions.domain}`;
      }
      if (cookieOptions.path) {
        cookieString += `; Path=${cookieOptions.path}`;
      }
      if (cookieOptions.secure) {
        cookieString += `; Secure`;
      }
      if (cookieOptions.httpOnly) {
        cookieString += `; HttpOnly`;
      }
      if (cookieOptions.sameSite) {
        cookieString += `; SameSite=${cookieOptions.sameSite}`;
      }
      
      // Append to existing Set-Cookie header or create new one
      const existing = responseHeaders['set-cookie'] || [];
      const cookies = Array.isArray(existing) ? [...existing, cookieString] : [cookieString];
      responseHeaders['set-cookie'] = cookies;
      res.setHeader('Set-Cookie', cookies);
      return this;
    },
  } as any;
  

  // Convert Vercel request/response to Express-compatible format
  return new Promise<void>((resolve, reject) => {
    expressApp(expressReq, expressRes, async (err?: any) => {
      if (err) {
        console.error('Express error:', err);
        // If response hasn't been sent, send error response
        if (!responseEnded) {
          const status = err.status || err.statusCode || 500;
          const message = err.message || "Internal Server Error";
          res.status(status).json({ message });
        }
        reject(err);
        return;
      }
      
      // If no response was sent, send 404
      if (!responseEnded) {
        res.status(404).json({ message: "Route not found" });
      }
      
      resolve();
    });
  });
}



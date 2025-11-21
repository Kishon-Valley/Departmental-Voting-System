// Vercel serverless function for API routes
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cookieSession from "cookie-session";
import passport from "../server/auth/passport.js";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "../server/routes/auth.js";
import { uploadAvatarRoute, uploadAvatarBase64Route } from "../server/routes/upload.js";
import { getCandidatesRoute, getCandidateByIdRoute, getCandidatesByPositionRoute } from "../server/routes/candidates.js";
import { getPositionsRoute, getPositionByIdRoute } from "../server/routes/positions.js";
import { submitVotesRoute, getMyVotesRoute } from "../server/routes/votes.js";
import { getResultsRoute, getResultsByPositionRoute } from "../server/routes/results.js";
import { getElectionStatusRoute } from "../server/routes/election.js";
import { adminLoginRoute, adminMeRoute, requireAdmin, createElectionRoute, updateElectionStatusRoute, updateElectionDatesRoute, createPositionRoute, updatePositionRoute, deletePositionRoute, createCandidateRoute, updateCandidateRoute, deleteCandidateRoute, getAllVotesRoute, getStudentsRoute, createStudentRoute } from "../server/routes/admin.js";
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
  
  // Add middleware to log session state for debugging
  app.use((req, res, next) => {
    // Log session state before request processing
    if (req.path?.includes('/auth/login')) {
      console.log('Login request - session before:', req.session ? 'exists' : 'none', 'cookies:', req.headers.cookie, 'session data:', req.session ? Object.keys(req.session) : 'none');
    }
    if (req.path?.includes('/auth/me')) {
      console.log('Auth me request - session:', req.session ? 'exists' : 'none', 'cookies:', req.headers.cookie, 'user:', (req as any).user ? 'exists' : 'none', 'session data:', req.session ? Object.keys(req.session) : 'none');
    }
    
    // Hook into response to log when cookies are set
    // This logs when the REAL Express response ends (in our wrapper)
    const originalEnd = res.end;
    const originalJson = res.json;
    
    res.json = function(body: any) {
      const setCookieHeaders = res.getHeader('Set-Cookie');
      if (setCookieHeaders) {
        console.log('Response json - Set-Cookie headers:', setCookieHeaders);
      } else {
        console.log('Response json - NO Set-Cookie headers!');
      }
      return originalJson.call(this, body);
    };
    
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      const setCookieHeaders = res.getHeader('Set-Cookie');
      if (setCookieHeaders) {
        console.log('Response ending - Set-Cookie headers:', setCookieHeaders);
      } else {
        console.log('Response ending - NO Set-Cookie headers!');
      }
      return originalEnd.call(this, chunk, encoding, cb);
    };
    
    next();
  });

  // Initialize Passport
  // Patch cookie-session so Passport can call req.session.regenerate/destroy/save
  app.use((req, _res, next) => {
    if (req.session) {
      if (typeof (req.session as any).regenerate !== 'function') {
        (req.session as any).regenerate = (cb?: (err?: any) => void) => {
          cb?.();
        };
      }
      if (typeof (req.session as any).destroy !== 'function') {
        (req.session as any).destroy = (cb?: (err?: any) => void) => {
          req.session = null as any;
          cb?.();
        };
      }
      // Ensure save actually triggers cookie-session to save
      if (typeof (req.session as any).save !== 'function') {
        const originalSave = (req.session as any).save;
        (req.session as any).save = (cb?: (err?: any) => void) => {
          // Mark session as modified so cookie-session will save it
          if (req.session) {
            (req.session as any).isModified = true;
          }
          // Call the original save if it exists, otherwise just callback
          if (originalSave && typeof originalSave === 'function') {
            originalSave(cb);
          } else {
            cb?.();
          }
        };
      }
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
  
  // Auth routes
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
  app.post("/votes", submitVotesRoute);
  app.post("/api/votes", submitVotesRoute);
  app.get("/votes/my-votes", getMyVotesRoute);
  app.get("/api/votes/my-votes", getMyVotesRoute);

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
  app.get("/admin/me", adminMeRoute);
  app.get("/api/admin/me", adminMeRoute);
  
  // Protected admin routes
  app.post("/admin/elections", requireAdmin, createElectionRoute);
  app.post("/api/admin/elections", requireAdmin, createElectionRoute);
  app.put("/admin/elections/:id/status", requireAdmin, updateElectionStatusRoute);
  app.put("/api/admin/elections/:id/status", requireAdmin, updateElectionStatusRoute);
  app.put("/admin/elections/:id/dates", requireAdmin, updateElectionDatesRoute);
  app.put("/api/admin/elections/:id/dates", requireAdmin, updateElectionDatesRoute);
  app.post("/admin/positions", requireAdmin, createPositionRoute);
  app.post("/api/admin/positions", requireAdmin, createPositionRoute);
  app.put("/admin/positions/:id", requireAdmin, updatePositionRoute);
  app.put("/api/admin/positions/:id", requireAdmin, updatePositionRoute);
  app.delete("/admin/positions/:id", requireAdmin, deletePositionRoute);
  app.delete("/api/admin/positions/:id", requireAdmin, deletePositionRoute);
  app.post("/admin/candidates", requireAdmin, createCandidateRoute);
  app.post("/api/admin/candidates", requireAdmin, createCandidateRoute);
  app.put("/admin/candidates/:id", requireAdmin, updateCandidateRoute);
  app.put("/api/admin/candidates/:id", requireAdmin, updateCandidateRoute);
  app.delete("/admin/candidates/:id", requireAdmin, deleteCandidateRoute);
  app.delete("/api/admin/candidates/:id", requireAdmin, deleteCandidateRoute);
  app.get("/admin/votes", requireAdmin, getAllVotesRoute);
  app.get("/api/admin/votes", requireAdmin, getAllVotesRoute);
  app.get("/admin/students", requireAdmin, getStudentsRoute);
  app.get("/api/admin/students", requireAdmin, getStudentsRoute);
  app.post("/admin/students", requireAdmin, createStudentRoute);
  app.post("/api/admin/students", requireAdmin, createStudentRoute);

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
    cookieHeader: req.headers.cookie,
    cookies: req.cookies,
    allHeaders: Object.keys(req.headers),
  });
  
  // Extract the path from Vercel's request
  let path = req.url || '';
  
  // Handle file uploads for multipart/form-data
  let parsedBody = req.body || {};
  let parsedFile: any = undefined;
  
  if (req.method === 'POST' && (path.includes('/upload-avatar') && !path.includes('base64'))) {
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
  // cookie-session reads directly from req.headers.cookie, so ensure it's available
  let cookies: Record<string, string> = {};
  
  // Vercel might provide cookies in req.cookies or req.headers.cookie
  // Check both and ensure we have a cookie string for cookie-session
  if (req.cookies && typeof req.cookies === 'object') {
    cookies = req.cookies as Record<string, string>;
    // Convert to cookie string format for cookie-session
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    if (cookieString && !req.headers.cookie) {
      req.headers.cookie = cookieString;
    }
  }
  
  // Ensure req.headers.cookie is a string (cookie-session needs this)
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    if (typeof cookieHeader === 'string') {
      // Already a string, keep it
    } else if (Array.isArray(cookieHeader)) {
      // Convert array to string
      req.headers.cookie = (cookieHeader as string[]).join('; ');
    } else {
      // Convert other types to string
      req.headers.cookie = String(cookieHeader);
    }
  }
  
  // Also parse into cookies object for convenience
  if (req.headers.cookie && typeof req.headers.cookie === 'string') {
    req.headers.cookie.split(';').forEach((cookie: string) => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
      }
    });
  }
  
  // Log cookie parsing for debugging
  if (req.url?.includes('/auth/')) {
    console.log('Cookie parsing - header:', req.headers.cookie, 'parsed:', Object.keys(cookies), 'vercel cookies:', req.cookies);
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
  const expressReq: any = {
    method: req.method || 'GET',
    url: path,
    originalUrl: path,
    path: path.split('?')[0],
    query: req.query || {},
    body: finalBody,
    file: parsedFile, // Attach parsed file for multer compatibility
    headers: req.headers,
    cookies: cookies,
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
  const responseHeaders: Record<string, string | string[]> = {};
  let responseEnded = false;
  
  // Create an EventEmitter-like object for response events
  // cookie-session listens to 'finish' event to save cookies
  const responseEvents: { [key: string]: Array<(...args: any[]) => void> } = {};
  const emit = (event: string, ...args: any[]) => {
    if (responseEvents[event]) {
      responseEvents[event].forEach(listener => {
        try {
          listener(...args);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      });
    }
  };
  
  const expressRes = {
    ...res,
    // Add EventEmitter methods that cookie-session might use
    on: function(event: string, listener: (...args: any[]) => void) {
      if (!responseEvents[event]) {
        responseEvents[event] = [];
      }
      responseEvents[event].push(listener);
      return this;
    },
    once: function(event: string, listener: (...args: any[]) => void) {
      const onceWrapper = (...args: any[]) => {
        listener(...args);
        const index = responseEvents[event]?.indexOf(onceWrapper);
        if (index !== undefined && index >= 0) {
          responseEvents[event].splice(index, 1);
        }
      };
      if (!responseEvents[event]) {
        responseEvents[event] = [];
      }
      responseEvents[event].push(onceWrapper);
      return this;
    },
    emit: emit,
    statusCode: statusCode,
    status: function(code: number) {
      statusCode = code;
      res.statusCode = code;
      return this;
    },
    json: function(body: any) {
      if (responseEnded) return this;
      
      const sendJsonResponse = () => {
        // Capture any headers that cookie-session might have set
        // cookie-session sets cookies via res.cookie() which we've implemented
        // but we also need to check if it set headers directly
        const finalHeaders = { ...responseHeaders };
        
        // Check if cookie-session set any cookies via res.cookie()
        // These should already be in responseHeaders['set-cookie']
        // But also check the actual Vercel response for any headers
        const actualHeaders = res.getHeaders();
        Object.entries(actualHeaders).forEach(([name, value]) => {
          const lowerName = name.toLowerCase();
          if (lowerName === 'set-cookie') {
            const existing = finalHeaders['set-cookie'] || [];
            const newCookies = Array.isArray(value) 
              ? value.filter((v): v is string => typeof v === 'string')
              : (typeof value === 'string' ? [value] : []);
            const merged = Array.isArray(existing) 
              ? [...existing, ...newCookies] 
              : [...(existing ? [existing] : []), ...newCookies];
            finalHeaders['set-cookie'] = merged;
          } else if (!finalHeaders[lowerName]) {
            if (typeof value === 'string' || Array.isArray(value)) {
              finalHeaders[lowerName] = value;
            }
          }
        });
        
        // Set all collected headers before sending response
        Object.entries(finalHeaders).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = statusCode;
        responseEnded = true;
        
        // Log cookies for debugging
        if (finalHeaders['set-cookie']) {
          console.log('Setting cookies in response:', finalHeaders['set-cookie']);
        }
        
        // Emit 'finish' event before ending (cookie-session listens to this)
        emit('finish');
        
        res.end(JSON.stringify(body));
      };
      
      // cookie-session saves cookies when the response is about to end
      // In serverless, we need to manually trigger cookie-session's save
      // cookie-session stores the session in req.session and saves it via res.cookie()
      // We need to manually serialize and set the cookie if cookie-session doesn't do it
      
      // Mark session as modified
      if (expressReq.session) {
        (expressReq.session as any).isModified = true;
        
        // Manually trigger cookie-session's save by calling res.cookie() directly
        // cookie-session uses the session name and keys to sign the cookie
        try {
          // Import cookie-session's signing function if available
          // Otherwise, manually construct the signed cookie
          const sessionName = "session";
          const sessionData = expressReq.session;
          
          // Serialize session data
          const sessionString = JSON.stringify(sessionData);
          
          // Get the signing key from environment
          const keys = [process.env.SESSION_SECRET || "change-me"];
          const key = keys[0];
          
          // Simple signing (cookie-session uses a more complex algorithm, but this should work for now)
          // Actually, cookie-session uses a library for signing. Let's try a different approach.
          // We'll emit the finish event and wait, but also manually ensure the cookie is set
          
          // Emit 'finish' event to trigger cookie-session's save handler
          emit('finish');
          
          // Give cookie-session a chance to save, but also manually check
          setImmediate(() => {
            // Check if cookie was set by cookie-session
            const cookiesSet = responseHeaders['set-cookie'] || [];
            if (cookiesSet.length === 0 && sessionData && Object.keys(sessionData).length > 0) {
              // Cookie-session didn't save, manually trigger it
              // cookie-session saves by calling res.cookie() with signed data
              // We need to manually serialize and sign the session
              try {
                // cookie-session uses the 'cookies' package which handles signing
                const Cookies = require('cookies');
                const sessionName = "session";
                const keys = [process.env.SESSION_SECRET || "change-me"];
                
                // Create a Cookies instance to use its signing mechanism
                const cookieInstance = new Cookies(expressReq, expressRes, { keys });
                
                // Serialize session (exclude internal methods)
                const sessionToSave: any = {};
                Object.keys(sessionData).forEach(k => {
                  if (!['regenerate', 'destroy', 'save', 'isModified'].includes(k)) {
                    sessionToSave[k] = sessionData[k];
                  }
                });
                
                // Only save if there's actual data
                if (Object.keys(sessionToSave).length > 0) {
                  // Use JSON.stringify to serialize (cookie-session uses its own encode, but JSON should work)
                  const sessionString = JSON.stringify(sessionToSave);
                  
                  // Use Cookies.set() which handles signing automatically
                  cookieInstance.set(sessionName, sessionString, {
                    maxAge: 24 * 60 * 60 * 1000,
                    secure: true,
                    httpOnly: true,
                    sameSite: "lax",
                    path: "/",
                    signed: true,
                  });
                  
                  console.log('Manually set session cookie with', Object.keys(sessionToSave).length, 'keys:', Object.keys(sessionToSave));
                } else {
                  console.log('WARNING: Session has no data to save, keys:', Object.keys(sessionData));
                }
              } catch (err) {
                console.error('Error manually saving cookie:', err);
                console.log('WARNING: cookie-session did not save cookie, session data:', Object.keys(sessionData));
              }
            }
            sendJsonResponse();
          });
        } catch (err) {
          console.error('Error in cookie save logic:', err);
          // Emit finish and send response anyway
          emit('finish');
          setImmediate(() => {
            sendJsonResponse();
          });
        }
      } else {
        // No session, just send response
        emit('finish');
        setImmediate(() => {
          sendJsonResponse();
        });
      }
      
      return this;
    },
    end: function(chunk?: any) {
      if (responseEnded) return this;
      
      const sendEndResponse = () => {
        // Capture any headers that cookie-session might have set
        const finalHeaders = { ...responseHeaders };
        const actualHeaders = res.getHeaders();
        Object.entries(actualHeaders).forEach(([name, value]) => {
          const lowerName = name.toLowerCase();
          if (lowerName === 'set-cookie') {
            const existing = finalHeaders['set-cookie'] || [];
            const newCookies = Array.isArray(value) 
              ? value.filter((v): v is string => typeof v === 'string')
              : (typeof value === 'string' ? [value] : []);
            const merged = Array.isArray(existing) 
              ? [...existing, ...newCookies] 
              : [...(existing ? [existing] : []), ...newCookies];
            finalHeaders['set-cookie'] = merged;
          } else if (!finalHeaders[lowerName]) {
            if (typeof value === 'string' || Array.isArray(value)) {
              finalHeaders[lowerName] = value;
            }
          }
        });
        
        // Set all collected headers before sending response
        Object.entries(finalHeaders).forEach(([name, value]) => {
          res.setHeader(name, value);
        });
        res.statusCode = statusCode;
        responseEnded = true;
        
        // Emit 'finish' event before ending (cookie-session listens to this)
        emit('finish');
        
        if (chunk) {
          res.end(chunk);
        } else {
          res.end();
        }
      };
      
      // Mark session as modified to trigger cookie-session save
      if (expressReq.session) {
        (expressReq.session as any).isModified = true;
      }
      
      // Use setTimeout to allow cookie-session to process
      setTimeout(() => {
        sendEndResponse();
      }, 0);
      
      return this;
    },
    setHeader: function(name: string, value: string | string[]) {
      // Store headers so they can be set when response is sent
      const lowerName = name.toLowerCase();
      
      // Special handling for Set-Cookie to merge multiple cookies
      if (lowerName === 'set-cookie') {
        const existing = responseHeaders['set-cookie'] || [];
        const newCookies = Array.isArray(value) ? value : [value];
        const merged = Array.isArray(existing) 
          ? [...existing, ...newCookies] 
          : [...(existing ? [existing] : []), ...newCookies];
        responseHeaders['set-cookie'] = merged;
        res.setHeader('Set-Cookie', merged);
      } else {
        responseHeaders[lowerName] = value;
        res.setHeader(name, value);
      }
      return this;
    },
    getHeader: function(name: string) {
      return res.getHeader(name) || responseHeaders[name.toLowerCase()];
    },
    // Implement writeHead so that cookie-session (and other middlewares) can
    // reliably flush headers such as Set-Cookie in the serverless environment.
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
      // Handle cookie setting (used by cookie-session)
      const cookieOptions = options || {};
      let cookieString = `${name}=${value}`;
      
      if (cookieOptions.maxAge) {
        cookieString += `; Max-Age=${cookieOptions.maxAge}`;
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
  } as any;
  
  // Convert Vercel request/response to Express-compatible format
  return new Promise<void>((resolve, reject) => {
    expressApp(expressReq, expressRes, async (err?: any) => {
      if (err) {
        console.error('Express error:', err);
        reject(err);
        return;
      }
      
      // Wait for any async operations (like cookie-session saving) to complete
      // cookie-session saves cookies when response finishes, so we need to wait
      await new Promise(resolve => setImmediate(resolve));
      
      // Before resolving, ensure all headers (especially Set-Cookie) are captured
      // Check if Vercel response has any additional headers we need to merge
      const vercelHeaders = res.getHeaders();
      Object.entries(vercelHeaders).forEach(([name, value]) => {
        const lowerName = name.toLowerCase();
        if (lowerName === 'set-cookie') {
          // Merge Set-Cookie headers
          const existing = responseHeaders['set-cookie'] || [];
          const newCookies = Array.isArray(value) 
            ? value.filter((v): v is string => typeof v === 'string')
            : (typeof value === 'string' ? [value] : []);
          const merged = Array.isArray(existing) 
            ? [...existing, ...newCookies] 
            : [...(existing ? [existing] : []), ...newCookies];
          responseHeaders['set-cookie'] = merged;
          res.setHeader('Set-Cookie', merged);
        } else if (!responseHeaders[lowerName]) {
          // Only set if we don't already have it
          if (typeof value === 'string' || Array.isArray(value)) {
            responseHeaders[lowerName] = value;
          }
        }
      });
      
      // Log final headers for debugging
      if (responseHeaders['set-cookie']) {
        console.log('Final Set-Cookie headers:', responseHeaders['set-cookie']);
      } else {
        console.log('No Set-Cookie headers found - session may not have been saved');
      }
      
      resolve();
    });
  });
}



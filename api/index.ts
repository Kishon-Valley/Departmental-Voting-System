// Vercel serverless function for API routes
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cookieSession from "cookie-session";
import passport from "../server/auth/passport.js";
import { loginRoute, logoutRoute, meRoute, updateProfileRoute } from "../server/routes/auth.js";
import { uploadAvatarRoute, uploadMiddleware } from "../server/routes/upload.js";

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
  app.post("/auth/upload-avatar", uploadMiddleware, uploadAvatarRoute);
  app.post("/api/auth/upload-avatar", uploadMiddleware, uploadAvatarRoute);

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
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
    body: req.body,
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


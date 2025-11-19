import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "../storage.js";
import { comparePassword } from "../utils/password.js";

// Configure Passport Local Strategy for student login
passport.use(
  "local-student",
  new LocalStrategy(
    {
      usernameField: "indexNumber", // Use indexNumber instead of username
      passwordField: "password",
    },
    async (indexNumber, password, done) => {
      try {
        // Find student by index number
        const student = await storage.getStudentByIndexNumber(indexNumber);

        if (!student) {
          return done(null, false, { message: "Invalid index number or password" });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, student.password);

        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid index number or password" });
        }

        // Return student without password
        const { password: _, ...studentWithoutPassword } = student;
        return done(null, studentWithoutPassword);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// Configure Passport Local Strategy for admin login
passport.use(
  "local-admin",
  new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password",
    },
    async (username, password, done) => {
      try {
        // Find admin user by username
        const user = await storage.getUserByUsername(username);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return done(null, { ...userWithoutPassword, type: "admin" } as any);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  const type = user.type || (user.indexNumber ? "student" : "admin");
  done(null, { id: user.id, type });
});

// Deserialize user from session
passport.deserializeUser(async (serialized: { id: string; type: string }, done) => {
  try {
    if (serialized.type === "student") {
      const student = await storage.getStudent(serialized.id);
      if (student) {
        const { password: _, ...studentWithoutPassword } = student;
        done(null, studentWithoutPassword);
      } else {
        done(null, false);
      }
    } else if (serialized.type === "admin") {
      const user = await storage.getUser(serialized.id);
      if (user) {
        const { password: _, ...userWithoutPassword } = user;
        done(null, { ...userWithoutPassword, type: "admin" } as any);
      } else {
        done(null, false);
      }
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error);
  }
});

export default passport;


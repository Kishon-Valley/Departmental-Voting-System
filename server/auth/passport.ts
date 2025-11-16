import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "../storage";
import { comparePassword } from "../utils/password";

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

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, { id: user.id, type: "student" });
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
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error);
  }
});

export default passport;


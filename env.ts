import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

const NODE_ENV = process.env.NODE_ENV || "development";

const envFiles = [
  `.env.${NODE_ENV}.local`,
  `.env.${NODE_ENV}`,
  ".env.local",
  ".env",
];

for (const file of envFiles) {
  const fullPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    config({ path: fullPath, override: false });
  }
}



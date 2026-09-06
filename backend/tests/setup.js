import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.test");
const examplePath = path.join(__dirname, "..", ".env.test.example");

dotenv.config({ path: envPath });
dotenv.config({ path: examplePath });

process.env.NODE_ENV = "test";
// Keep test agreement files out of the real `agreements/` folder used by local/dev data.
process.env.AGREEMENTS_DIR = path.join(__dirname, "..", "agreements-test");
fs.mkdirSync(process.env.AGREEMENTS_DIR, { recursive: true });

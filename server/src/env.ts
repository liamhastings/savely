import path from "path";
import dotenv from "dotenv";

// .env lives at the repo root, one level above server/, so plain "dotenv/config"
// (which reads from cwd) misses it whenever the server is started from server/.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

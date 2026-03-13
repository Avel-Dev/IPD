import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dns from "dns";
import dotenv from "dotenv";

dotenv.config();

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "supabase-schema-updates.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

async function run() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    lookup: (hostname, options, callback) => {
      return dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
    }
  });

  try {
    await client.connect();
    await client.query(schemaSql);
    console.log("Updates applied successfully.");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.end();
  }
}

run();

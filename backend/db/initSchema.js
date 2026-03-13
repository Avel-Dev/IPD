import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dns from "dns";

// Prefer IPv4 when resolving DB hostnames to avoid ENETUNREACH on IPv6 paths.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore on Node versions that don't support this API.
}

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the schema SQL from supabase-schema.sql
const schemaPath = path.resolve(__dirname, "..", "supabase-schema.sql");
let schemaSql = "";
try {
  schemaSql = fs.readFileSync(schemaPath, "utf8");
} catch (err) {
  console.warn("[db:initSchema] Could not read supabase-schema.sql:", err.message);
}

export async function initSchema() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.warn(
      "[db:initSchema] SUPABASE_DB_URL is not set; skipping automatic schema initialization."
    );
    return;
  }

  if (!schemaSql.trim()) {
    console.warn(
      "[db:initSchema] Schema SQL is empty; skipping automatic schema initialization."
    );
    return;
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    // Force IPv4 lookup for this client regardless of global DNS settings
    lookup: (hostname, options, callback) => {
      return dns.lookup(
        hostname,
        { ...options, family: 4, all: false },
        callback
      );
    }
  });

  try {
    await client.connect();
    await client.query(schemaSql);
    console.log("[db:initSchema] Supabase schema ensured.");
  } catch (err) {
    console.error("[db:initSchema] Failed to initialize schema:", err);
  } finally {
    await client.end();
  }
}

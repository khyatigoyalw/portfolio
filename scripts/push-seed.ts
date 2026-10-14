/**
 * Pushes content/seed.json and public/media/* to a Supabase project.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run seed:push
 *   npm run seed:push -- --dry-run     (validate + list what would happen; no network)
 *
 * Reads env from the shell, falling back to .env.local / .env. Uses the SERVICE ROLE key (bypasses
 * RLS), so run it from your machine only, never in the browser or CI logs. Apply
 * supabase/migrations/0001_init.sql first. Re-runnable: files and rows are upserted by their
 * deterministic ids, so it will overwrite edits made in /admin for the seeded rows.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { mediaToRow, postToRow, sectionToRow, settingsToRow } from "../src/lib/mappers";
import { SeedFile } from "../src/lib/schema";

const ROOT = path.resolve(import.meta.dirname, "..");
const MEDIA_DIR = path.join(ROOT, "public", "media");
const dryRun = process.argv.includes("--dry-run");

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(path.join(ROOT, f));
  } catch {
    /* file not present */
  }
}

const must = (name: string) => {
  const v = process.env[name];
  if (!v && !dryRun) {
    console.error(`Missing ${name}. See .env.example.`);
    process.exit(1);
  }
  return v ?? "";
};

function check<T>(label: string, error: { message: string } | null, data?: T): T | undefined {
  if (error) {
    console.error(`FAILED: ${label}: ${error.message}`);
    process.exit(1);
  }
  console.log(`ok: ${label}`);
  return data;
}

async function main() {
  const seed = SeedFile.parse(JSON.parse(await fs.readFile(path.join(ROOT, "content", "seed.json"), "utf8")));
  console.log(
    `seed.json: ${seed.sections.length} sections, ${seed.posts.length} posts, ${seed.media.length} media files`,
  );

  // Every media row must have its file on disk before we touch the project.
  for (const m of seed.media) {
    await fs.access(path.join(MEDIA_DIR, m.path)).catch(() => {
      console.error(`public/media/${m.path} is missing. Run \`npm run seed:legacy\` first.`);
      process.exit(1);
    });
  }
  if (dryRun) {
    console.log("--dry-run: nothing uploaded. Would upload:", seed.media.map((m) => m.path).join(", "));
    return;
  }

  const supabase = createClient(must("NEXT_PUBLIC_SUPABASE_URL"), must("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. files -> storage bucket `media`
  for (const m of seed.media) {
    const body = await fs.readFile(path.join(MEDIA_DIR, m.path));
    const { error } = await supabase.storage
      .from("media")
      .upload(m.path, body, { contentType: m.mime, upsert: true, cacheControl: "31536000" });
    check(`upload ${m.path}`, error);
  }

  // 2. rows. Order matters: media first (settings and posts reference it).
  check(
    `media rows (${seed.media.length})`,
    (await supabase.from("media").upsert(seed.media.map(mediaToRow), { onConflict: "id" })).error,
  );
  check("site_settings", (await supabase.from("site_settings").upsert(settingsToRow(seed.settings), { onConflict: "id" })).error);
  check(
    `sections (${seed.sections.length})`,
    (await supabase.from("sections").upsert(seed.sections.map(sectionToRow), { onConflict: "key" })).error,
  );
  check(
    `posts (${seed.posts.length})`,
    (
      await supabase.from("posts").upsert(
        // drop a null published_at so the DB trigger stamps first publication and re-runs keep the date
        seed.posts.map((p) => {
          const { published_at, ...row } = postToRow(p);
          return published_at ? { ...row, published_at } : row;
        }),
        { onConflict: "type,slug" },
      )
    ).error,
  );

  console.log("\nDone. Add yourself as admin if you have not yet:");
  console.log("  insert into public.admins (email) values ('you@example.com');");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack : e);
  process.exit(1);
});

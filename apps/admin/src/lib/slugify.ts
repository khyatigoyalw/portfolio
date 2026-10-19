/** Pure helpers shared by admin forms and server actions (no Next / React imports). */

/** "Hello, World! — v2" -> "hello-world-v2" (matches the Slug regex in schema.ts). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Next free slug: "foo" -> "foo-2" -> "foo-3" … given the slugs already taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  const root = base || "untitled";
  if (!set.has(root)) return root;
  let n = 2;
  while (set.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

/** "a, b ,, c" -> ["a","b","c"] */
export function splitList(input: string, sep: RegExp = /[,\n]/): string[] {
  return input
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Safe file name for a storage object: "My Photo (1).PNG" -> "my-photo-1.png". */
export function storageName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  const ext = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const stem = slugify(base) || "file";
  return ext ? `${stem}.${ext}` : stem;
}

/** Empty string -> null, otherwise trimmed. For nullable text columns. */
export const blankToNull = (s: string | null | undefined): string | null => {
  const t = (s ?? "").trim();
  return t ? t : null;
};

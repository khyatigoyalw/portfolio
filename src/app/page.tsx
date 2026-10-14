import { getSettings } from "@/lib/data";

// Placeholder: the real public pages land in step 2.
export default async function Home() {
  const settings = await getSettings();
  return (
    <main>
      <h1>{settings.name}</h1>
      <p>{settings.seoDescription}</p>
    </main>
  );
}

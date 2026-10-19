import Link from "next/link";

/** "Khyati <b>Goyal</b>": the last word of the name is bolded. */
export function BrandMark({ name, href = "/#top" }: { name: string; href?: string }) {
  const words = name.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <Link href={href} className="brand">
      <span className="dot"></span>
      <span>
        {words.length > 0 && `${words.join(" ")} `}
        <b>{last}</b>
      </span>
    </Link>
  );
}

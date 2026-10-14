/** Skill ticker. The list is stored once; it is rendered twice so the -50% translate loops seamlessly. */
export function Marquee({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[...items, ...items].map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

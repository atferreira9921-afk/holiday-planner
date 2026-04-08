// Server component — fetches Wikipedia summary at request time (cached 24h)
interface WikiSummary {
  extract: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

export default async function CityDescription({
  city,
  country,
}: {
  city: string;
  country: string;
}) {
  let summary: WikiSummary | null = null;

  // Try "City, Country" first, then just "City"
  for (const query of [`${city}, ${country}`, city]) {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
        { next: { revalidate: 86400 } }
      );
      if (res.ok) {
        const data = await res.json();
        // Skip disambiguation pages
        if (data.type !== "disambiguation" && data.extract) {
          summary = data;
          break;
        }
      }
    } catch { /* degrade silently */ }
  }

  if (!summary) return null;

  // Trim extract to ~300 chars at a sentence boundary
  let text = summary.extract ?? "";
  if (text.length > 320) {
    const cut = text.lastIndexOf(". ", 320);
    text = cut > 80 ? text.slice(0, cut + 1) : text.slice(0, 320) + "…";
  }

  const wikiUrl = summary.content_urls?.desktop?.page;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
      {summary.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={summary.thumbnail.source}
          alt={city}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
        {wikiUrl && (
          <a
            href={wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline mt-1 inline-block"
          >
            Read more on Wikipedia →
          </a>
        )}
      </div>
    </div>
  );
}

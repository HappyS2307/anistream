export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
  siteUrl: string;
};

function parseHttpOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    const isLocalHttp =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

    if (url.protocol !== "https:" && !isLocalHttp) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = parseHttpOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const siteUrl = parseHttpOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    !url ||
    !siteUrl ||
    !publishableKey ||
    publishableKey.startsWith("your-") ||
    publishableKey.includes("<")
  ) {
    return null;
  }

  return { url, siteUrl, publishableKey };
}
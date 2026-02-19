import { Helmet } from "react-helmet-async";
import { BASE_URL, OG_IMAGE_URL, SITE_NAME } from "./constants";

type SeoProps = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImageUrl?: string;
  ogType?: string;
  twitterCard?: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const resolveUrl = (urlOrPath: string) => {
  if (urlOrPath.startsWith("http")) {
    return urlOrPath;
  }

  const normalizedPath = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  if (normalizedPath === "/") {
    return BASE_URL;
  }

  const canonicalPath = normalizedPath.endsWith("/")
    ? normalizedPath
    : `${normalizedPath}/`;
  return `${BASE_URL}${canonicalPath}`;
};

export default function Seo({
  title,
  description,
  canonicalUrl,
  ogImageUrl = OG_IMAGE_URL,
  ogType = "website",
  twitterCard = "summary_large_image",
  noIndex = false,
  structuredData,
}: SeoProps) {
  const resolvedCanonical = resolveUrl(canonicalUrl);
  const resolvedOgImage = resolveUrl(ogImageUrl);
  const structuredItems = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];
  const robotsDirective = noIndex ? "noindex,follow" : "index,follow";

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsDirective} />
      <meta name="googlebot" content={robotsDirective} />
      <link rel="canonical" href={resolvedCanonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={resolvedOgImage} />

      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {structuredItems.map((item, index) => (
        <script key={`ld-${index}`} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}

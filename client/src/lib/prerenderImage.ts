import { isReactSnapPrerender } from "@/lib/isPrerender";

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);

export const toPrerenderSafeImageSrc = (value?: string | null) => {
  if (!value) return value ?? undefined;
  if (!isReactSnapPrerender()) return value;
  return isHttpUrl(value) ? TRANSPARENT_PIXEL : value;
};

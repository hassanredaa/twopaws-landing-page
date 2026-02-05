type FbqCommand = "init" | "track" | "trackCustom";
type Fbq = ((command: FbqCommand, eventOrId: string, params?: Record<string, unknown>) => void) & {
  queue?: unknown[];
  callMethod?: (...args: unknown[]) => void;
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const META_PIXEL_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const META_PIXEL_CURRENCY = "EGP";

let initialized = false;

const getPixelId = () => {
  const id = import.meta.env.VITE_META_PIXEL_ID;
  return typeof id === "string" ? id.trim() : "";
};

const ensureBase = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (window.fbq) return true;

  const fbq: Fbq = ((...args: unknown[]) => {
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue?.push(args);
  }) as Fbq;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = (...args: unknown[]) => fbq.queue?.push(args);

  window.fbq = fbq;
  window._fbq = fbq;

  if (!document.querySelector('script[data-meta-pixel="true"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = META_PIXEL_SRC;
    script.setAttribute("data-meta-pixel", "true");
    document.head.appendChild(script);
  }

  return true;
};

export const initMetaPixel = (pixelId = getPixelId()) => {
  if (initialized) return true;
  if (!pixelId) return false;
  if (!ensureBase()) return false;
  window.fbq?.("init", pixelId);
  initialized = true;
  return true;
};

export const trackPageView = () => {
  if (!initMetaPixel()) return;
  window.fbq?.("track", "PageView");
};

export const trackMetaEvent = (event: string, params?: Record<string, unknown>) => {
  if (!initMetaPixel()) return;
  if (params) {
    window.fbq?.("track", event, params);
  } else {
    window.fbq?.("track", event);
  }
};

export { META_PIXEL_CURRENCY };

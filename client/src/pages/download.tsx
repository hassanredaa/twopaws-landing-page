import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";

const IOS_STORE_URL =  "https://apps.apple.com/app/twopaws/id6745481497";
const ANDROID_STORE_URL = "https://play.google.com/store/apps/details?id=com.twopaws.app";
const WEB_FALLBACK_URL = "https://twopaws.pet/";

function detectPlatform(userAgent: string) {
  const ua = userAgent.toLowerCase();
  const isAndroid = ua.includes("android");
  // iPad on iOS 13+ reports as Mac; check touch points to catch it
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isIOS) return "ios";
  if (isAndroid) return "android";
  return "web";
}

export default function DownloadRedirect() {
  const targetUrl = useMemo(() => {
    if (typeof window === "undefined") return WEB_FALLBACK_URL;
    const platform = detectPlatform(
      navigator.userAgent || navigator.vendor || (window as any).opera || ""
    );

    if (platform === "ios") return IOS_STORE_URL;
    if (platform === "android") return ANDROID_STORE_URL;
    return WEB_FALLBACK_URL;
  }, []);

  useEffect(() => {
    window.location.replace(targetUrl);
  }, [targetUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 py-12 text-center">
      <Helmet>
        <title>Download TwoPaws Digital Solutions</title>
        <meta
          name="description"
          content="Get the TwoPaws Digital Solutions app on the App Store or Google Play."
        />
        <link rel="canonical" href="https://twopaws.pet/download" />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      <div className="max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-brand-green-dark">
            Redirecting you to TwoPaws Digital Solutions
          </h1>
          <p className="text-gray-600">
            Hang tight! We&apos;re sending you to the best place to download the
            TwoPaws Digital Solutions app based on your device.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-brand-green-dark hover:bg-brand-olive">
            <a href={IOS_STORE_URL} target="_blank" rel="noreferrer">
              Open App&nbsp;Store
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={ANDROID_STORE_URL} target="_blank" rel="noreferrer">
              Open Google&nbsp;Play
            </a>
          </Button>
          <Button variant="ghost" asChild>
            <a href={WEB_FALLBACK_URL}>Go to Website</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

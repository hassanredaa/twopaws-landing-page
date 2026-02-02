import {
  ANDROID_STORE_URL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
} from "@/lib/seo/constants";

export default function MarketingIntro() {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900">
        TwoPaws - Pet care app in Egypt (Cairo)
      </h2>
      <p className="mt-3 text-slate-700">
        TwoPaws helps pet families across Egypt, starting in Cairo, with trusted
        vets and clinics, a marketplace for supplies, community features, and
        delivery for everyday essentials.
      </p>
      <p className="mt-4 text-slate-700">
        Download TwoPaws on the{" "}
        <a className="text-slate-900 underline" href={ANDROID_STORE_URL}>
          Google Play Store
        </a>
        {" "}or the{" "}
        <a className="text-slate-900 underline" href={IOS_STORE_URL}>
          Apple App Store
        </a>
        {"."}
      </p>
      <p className="mt-2 text-slate-700">
        Follow the official Instagram at{" "}
        <a className="text-slate-900 underline" href={INSTAGRAM_URL}>
          @twopaws.app
        </a>
        {"."}
      </p>
    </section>
  );
}

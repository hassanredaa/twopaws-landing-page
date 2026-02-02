import Seo from "@/lib/seo/Seo";
import MarketingIntro from "./MarketingIntro";
import MarketingShell from "./MarketingShell";

export default function AboutPage() {
  return (
    <MarketingShell>
      <Seo
        title="About TwoPaws | Pet care app in Egypt"
        description="Learn how TwoPaws supports pet families in Egypt with trusted vets, clinics, community features, and supplies delivery."
        canonicalUrl="/about"
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">About TwoPaws</h1>
        <p className="text-lg text-slate-700">
          TwoPaws is built in Egypt for pet parents who want reliable care,
          helpful community connections, and fast access to supplies.
        </p>
      </header>
      <MarketingIntro />
      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Why we exist</h2>
        <p>
          We created TwoPaws to make pet care in Cairo and across Egypt easier to
          navigate. Instead of juggling multiple apps, phone calls, and social
          groups, pet families can manage everything in one place.
        </p>
        <p>
          TwoPaws focuses on trusted vet and clinic discovery, a growing
          marketplace for pet supplies, and community tools that help owners find
          answers fast.
        </p>
      </section>
    </MarketingShell>
  );
}
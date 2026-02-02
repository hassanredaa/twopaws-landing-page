import Seo from "@/lib/seo/Seo";
import MarketingIntro from "./MarketingIntro";
import MarketingShell from "./MarketingShell";

export default function EgyptPage() {
  return (
    <MarketingShell>
      <Seo
        title="TwoPaws in Egypt | Cairo pet care"
        description="TwoPaws supports pet families in Cairo and Egypt with trusted vets, clinics, community features, and fast delivery."
        canonicalUrl="/egypt"
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">TwoPaws in Egypt</h1>
        <p className="text-lg text-slate-700">
          Built for Cairo pet parents and expanding across Egypt.
        </p>
      </header>
      <MarketingIntro />
      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Local focus</h2>
        <p>
          We prioritize Cairo because it has the highest concentration of pet
          clinics, vets, and pet supply partners. That focus lets us deliver a
          smoother experience for booking care and getting supplies quickly.
        </p>
        <p>
          As we grow, TwoPaws will bring the same level of service to other
          governorates, with listings that reflect local clinics, delivery
          coverage, and community needs.
        </p>
      </section>
    </MarketingShell>
  );
}
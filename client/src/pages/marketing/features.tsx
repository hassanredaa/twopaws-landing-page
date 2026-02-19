import Seo from "@/lib/seo/Seo";
import MarketingIntro from "./MarketingIntro";
import MarketingShell from "./MarketingShell";

const features = [
  {
    title: "Vets and clinics you can trust",
    description:
      "Find nearby veterinarians and clinics in Cairo with clear details so you can book confidently.",
  },
  {
    title: "Marketplace and supplies",
    description:
      "Order food, toys, and essentials from a curated marketplace built for Egypt.",
  },
  {
    title: "Community connections",
    description:
      "Share tips, ask questions, and learn from other pet parents across Egypt.",
  },
  {
    title: "Delivery for everyday needs",
    description:
      "Get fast delivery for supplies so your pets stay healthy and happy.",
  },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <Seo
        title="TwoPaws Features | Pet care in Egypt"
        description="Explore TwoPaws features for Egypt: vet discovery, clinics, marketplace supplies, community tools, and delivery."
        canonicalUrl="/features/"
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">Features</h1>
        <p className="text-lg text-slate-700">
          Everything pet families in Egypt need to care for their pets with
          confidence.
        </p>
      </header>
      <MarketingIntro />
      <section className="space-y-5">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-2xl border border-slate-200 p-5">
            <h2 className="text-xl font-semibold text-slate-900">
              {feature.title}
            </h2>
            <p className="mt-2 text-slate-700">{feature.description}</p>
          </article>
        ))}
      </section>
    </MarketingShell>
  );
}
import Seo from "@/lib/seo/Seo";
import { CONTACT_EMAIL } from "@/lib/seo/constants";
import MarketingIntro from "./MarketingIntro";
import MarketingShell from "./MarketingShell";

export default function ContactPage() {
  return (
    <MarketingShell>
      <Seo
        title="Contact TwoPaws | Pet care in Egypt"
        description="Contact the TwoPaws team for pet care questions in Egypt, app feedback, or partnership requests."
        canonicalUrl="/contact/"
      />
      <header className="space-y-3">
        <h1 className="text-4xl font-semibold text-slate-900">Contact TwoPaws</h1>
        <p className="text-lg text-slate-700">
          We would love to hear from pet parents, clinics, and partners in Egypt.
        </p>
      </header>
      <MarketingIntro />
      <section className="space-y-4 text-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900">Get in touch</h2>
        <p>
          Email us at{" "}
          <a className="text-slate-900 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          {" "}for support, partnerships, or media inquiries.
        </p>
        <p>
          We respond to most requests within two business days and appreciate any
          feedback that helps TwoPaws serve Egypt better.
        </p>
      </section>
    </MarketingShell>
  );
}
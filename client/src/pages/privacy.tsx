import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import twoPawsLogo from "../../../attached_assets/logotrans.webp";
import insta from "../../../attached_assets/instagram.svg";
import facebook from "../../../attached_assets/facebook.svg";
import tiktok from "../../../attached_assets/tiktok.svg";
import { Menu, X } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function Privacy() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Helmet>
        <title>Privacy Policy | TwoPaws</title>
        <meta name="description" content="Learn how TwoPaws collects, uses, and protects your data." />
        <link rel="canonical" href="https://twopaws.pet/privacy" />
      </Helmet>
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <a href="/">
                <img src={twoPawsLogo} alt="TwoPaws" className="h-16" />
              </a>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Home
              </a>
              <a href="/terms" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Terms & Conditions
              </a>
              <a href="/privacy" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Privacy Policy
              </a>
            </div>
            <div className="md:hidden">
              <Button variant="ghost" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-3">
              <a href="/" className="block w-full text-left text-gray-600">
                Home
              </a>
              <a href="/terms" className="block w-full text-left text-gray-600">
                Terms
              </a>
              <a href="/privacy" className="block w-full text-left text-gray-600">
                Privacy
              </a>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-24 px-4 pb-16 bg-gray-50 flex items-start justify-center">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="prose prose-zinc lg:prose-lg max-w-none pt-6">
            <h1 className="text-3xl font-bold mb-2">TwoPaws — Privacy Policy (EN)</h1>
            <p className="text-gray-500">Last updated: August 23, 2025</p>

            <h2 className="text-2xl font-bold mt-6">1) Who we are &amp; scope</h2>
            <p>
              This Privacy Policy explains how TwoPaws Digital Solutions LLC ("TwoPaws," "we," "us," "our") collects, uses, shares,
              and protects personal data when you use the App and our Services. Contact: <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>
            </p>

            <h2 className="text-2xl font-bold mt-6">2) Data we collect</h2>
            <ul>
              <li><strong>Identity &amp; contact:</strong> name, username, email, phone, addresses.</li>
              <li><strong>Account &amp; usage:</strong> profile photo, preferences, device identifiers, app interactions, diagnostics/crash logs.</li>
              <li><strong>Pet &amp; content data:</strong> pet profiles, photos, vaccination/health records you upload for pets, listings, reviews, messages.</li>
              <li><strong>Transactions:</strong> orders, invoices, payment status, refunds/chargebacks.</li>
              <li><strong>Payments:</strong> processed via a secure, hosted payment flow. We do not store full card numbers, CVV, or saved-card tokens. We receive minimal transaction metadata (e.g., success/failure).</li>
            </ul>

            <h2 className="text-2xl font-bold mt-6">3) How we collect data</h2>
            <p>Directly from you (forms, listings, uploads, messages); automatically (app events, device data, diagnostics/crash); and from partners you engage (e.g., vets, stores, shelters) and the payment processor (transaction confirmations).</p>

            <h2 className="text-2xl font-bold mt-6">4) Why we use data (purposes &amp; legal bases)</h2>
            <ul>
              <li>Provide the Services and your account (contract necessity).</li>
              <li>Process orders and payments (contract necessity).</li>
              <li>Safety, fraud prevention, moderation (legitimate interests; legal obligations).</li>
              <li>Support &amp; service communications (contract necessity/legitimate interests).</li>
              <li>Personalization &amp; analytics to improve features and performance (legitimate interests; consent where required).</li>
              <li>Marketing (with your consent; you can opt out at any time).</li>
              <li>Legal/compliance (e.g., tax, accounting, responding to lawful requests).</li>
            </ul>
            <p>We do not use your data for incompatible purposes without your consent.</p>

            <h2 className="text-2xl font-bold mt-6">5) Sharing your data</h2>
            <p>We share personal data only as needed to provide and operate the Services:</p>
            <ul>
              <li><strong>Service providers (processors):</strong> cloud hosting, analytics/crash reporting, customer support, anti-fraud, and payment processing—under contracts that restrict their use to performing services for us.</li>
              <li><strong>Partners you choose to engage:</strong> vets, stores, shelters—only the details needed to fulfill your request (e.g., order details, delivery name/phone/address).</li>
              <li><strong>Legal/compliance:</strong> regulators, law enforcement, or to protect rights, safety, and compliance with law.</li>
            </ul>
            <p>We do not sell or rent your personal information.</p>

            <h2 className="text-2xl font-bold mt-6">6) Data retention</h2>
            <p>We keep personal data only as long as needed for the purposes above and to meet legal requirements. Examples:</p>
            <ul>
              <li><strong>Account data:</strong> while your account is active, then for a limited period for queries/disputes.</li>
              <li><strong>Transaction records:</strong> retained as required by tax/accounting laws.</li>
              <li><strong>Content (posts, chats):</strong> while visible to you/recipients or until you delete; limited backups may persist briefly.</li>
              <li><strong>Payments:</strong> no card numbers, CVV, or saved-card tokens are stored by TwoPaws.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-6">7) International transfers</h2>
            <p>Your personal data may be transferred to, stored, and processed on secure servers outside Egypt. We use contractual and technical safeguards with reputable providers and will comply with applicable cross-border transfer requirements. Where required, we will implement additional measures or obtain approvals.</p>

            <h2 className="text-2xl font-bold mt-6">8) Your rights</h2>
            <p>Subject to applicable law, you can access, correct, delete, restrict or object to processing, and withdraw consent (e.g., for marketing). Use in-app settings where available or email <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>. We may request proof of identity and will respond within applicable timelines.</p>

            <h2 className="text-2xl font-bold mt-6">9) Security</h2>
            <p>We use organizational and technical measures including encryption in transit and at rest, access controls, least-privilege, and monitoring. No system is 100% secure.</p>

            <h2 className="text-2xl font-bold mt-6">10) Children</h2>
            <p>The App is intended for adults (18+). If we learn we collected data from a minor without required guardian consent, we will delete it.</p>

            <h2 className="text-2xl font-bold mt-6">11) Deleting your account</h2>
            <p>You can delete your account in the App or by emailing <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>. If transactions or amounts are pending, deletion may be delayed until resolved. Some records may be retained where the law requires (e.g., fraud prevention, tax).</p>

            <h2 className="text-2xl font-bold mt-6">12) Changes to this Policy</h2>
            <p>We may update this Policy; we’ll change the “Last updated” date above and, where required, provide in-app or email notice. If changes materially affect your rights, we will seek consent where required.</p>

            <h2 className="text-2xl font-bold mt-6">13) Contact</h2>
            <p>TwoPaws Digital Solutions LLC — Privacy<br />Email: <a href="mailto:info@twopaws.pet">info@twopaws.pet</a></p>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-white text-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src={twoPawsLogo} alt="TwoPaws" className="h-20" />
              </div>
              <p className="text-gray-400 mb-4">
                Your pet's best friend in Egypt. Connecting pet families with the
                care and community they deserve.
              </p>
              <div className="flex space-x-4">
                <a href="https://www.instagram.com/twopaws.app/" className="text-gray-400 hover:text-brand-blue transition-colors" target="_blank" rel="noopener noreferrer">
                  <img src={insta} alt="Instagram" className="h-6 w-6" />
                </a>
                <a href="https://www.facebook.com/twopawsapp/" className="text-gray-400 hover:text-brand-blue transition-colors" target="_blank" rel="noopener noreferrer">
                  <img src={facebook} alt="Facebook" className="h-6 w-6" />
                </a>
                <a href="https://www.tiktok.com/@twopaws.app" className="text-gray-400 hover:text-brand-blue transition-colors" target="_blank" rel="noopener noreferrer">
                  <img src={tiktok} alt="TikTok" className="h-6 w-6" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/" className="hover:text-black transition-colors">Features</a></li>
                <li><a href="/" className="hover:text-black transition-colors">About&nbsp;Us</a></li>
                <li><a href="/" className="hover:text-black transition-colors">Reviews</a></li>
                <li><a href="/" className="hover:text-black transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="mailto:info@twopaws.pet" className="hover:text-black transition-colors">Contact&nbsp;Us</a></li>
                <li><a href="/privacy" className="hover:text-black transition-colors">Privacy&nbsp;Policy</a></li>
                <li><a href="/terms" className="hover:text-black transition-colors">Terms&nbsp;&amp;&nbsp;Conditions</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

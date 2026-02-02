import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import twoPawsLogo from "../../../attached_assets/logotrans.webp";
import insta from "../../../attached_assets/instagram.svg";
import facebook from "../../../attached_assets/facebook.svg";
import tiktok from "../../../attached_assets/tiktok.svg";

import { Menu, X, Linkedin } from "lucide-react";
import Seo from "@/lib/seo/Seo";
import MarketingIntro from "@/pages/marketing/MarketingIntro";

export default function Terms() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Seo
        title="Terms & Conditions | TwoPaws"
        description="Terms and conditions for TwoPaws, the pet care app for Egypt with vets, clinics, community features, and delivery."
        canonicalUrl="/terms"
      />
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <a href="/">
                <img src={twoPawsLogo} alt="TwoPaws Digital Solutions" className="h-16" />
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

      <main className="flex-grow bg-gray-50 pb-16 pt-24 px-4">
        <div className="w-full max-w-4xl mx-auto space-y-8">
          <MarketingIntro />
          <Card className="w-full">
            <CardContent className="prose prose-zinc lg:prose-lg max-w-none pt-6">
              <h1 className="text-3xl font-bold mb-2">TwoPaws Digital Solutions - Terms &amp; Conditions</h1>
              <p className="text-gray-500">Last updated: August 23, 2025</p>

              <h2 className="text-2xl font-bold mt-6">1) Who we are</h2>
              <p>
                These Terms &amp; Conditions ("Terms") govern your use of the TwoPaws mobile application and related services (the
                "App" or "Services"), operated by TwoPaws Digital Solutions LLC ("TwoPaws," "we," "us," or "our"). By creating an
                account or using the Services, you agree to these Terms.
              </p>

              <h2 className="text-2xl font-bold mt-6">2) What TwoPaws is (and isnt)</h2>
              <p>
                TwoPaws is a platform that connects pet owners with third-party partners (e.g., vets, stores, shelters) and offers
                features such as marketplace listings, adoption listings, pet matchmaking (mating) tools, health tracking, and
                bookings. Unless we clearly state otherwise, we do not sell third-party goods or provide third-party services
                ourselves, and we do not provide veterinary or emergency care.
              </p>

              <h2 className="text-2xl font-bold mt-6">3) Eligibility</h2>
              <p>
                You must be at least 18 years old (or the age of majority in your jurisdiction). If you use the Services for a
                business, you confirm you have authority to bind that business.
              </p>

              <h2 className="text-2xl font-bold mt-6">4) Your account &amp; security</h2>
              <p>
                Keep your login credentials confidential; youre responsible for activity under your account. Provide accurate
                information and update it when it changes. Contact <a href="mailto:info@twopaws.pet">info@twopaws.pet</a> if you suspect
                unauthorized access.
              </p>

              <h2 className="text-2xl font-bold mt-6">5) Acceptable use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>(a) break the law or violate animal-welfare rules;</li>
                <li>(b) post illegal, misleading, harmful, hateful, pornographic, or exploitative content;</li>
                <li>(c) misrepresent pet ownership, health status, pedigree, or adoption eligibility;</li>
                <li>(d) sell or traffic prohibited/endangered species, or falsify medical records;</li>
                <li>(e) harass users;</li>
                <li>(f) scrape, reverse engineer, bypass security, or interfere with the Services.</li>
              </ul>
              <h2 className="text-2xl font-bold mt-6">6) User content &amp; license</h2>
              <p>
                You retain ownership of content you upload (e.g., photos, listings, reviews, messages, pet profiles). You grant TwoPaws a
                worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, modify, and distribute that content solely
                to operate, improve, and promote the Services. You warrant you have all necessary rights and permissions (including from
                people appearing in images), and that your content is accurate and lawful.
              </p>

              <h2 className="text-2xl font-bold mt-6">7) Listings &amp; categories</h2>
              <ul>
                <li>
                  <strong>Marketplace:</strong> Partners set prices, fulfill orders, and handle returns under their policies and applicable law. We may assist
                  with support but are not responsible for partner inventory, quality, safety, or warranties unless we expressly say otherwise. We may refuse
                  or cancel orders (e.g., suspected fraud, errors, unavailability).
                </li>
                <li>
                  <strong>Adoption:</strong> List only pets you legally own or are authorized to list (e.g., shelters). Provide accurate vaccination/health
                  information and fees.
                </li>
                <li>
                  <strong>Mating/Matchmaking:</strong> Follow applicable animal-welfare and local regulations. You are solely responsible for breeding decisions
                  and outcomes. We may remove content that appears irresponsible or harmful.
                </li>
              </ul>

              <h2 className="text-2xl font-bold mt-6">8) Orders, delivery &amp; cancellations</h2>
              <p>
                Delivery/collection windows are estimates and may vary (e.g., traffic, weather, partner readiness). If an order is wrong, missing, defective, or
                significantly delayed, contact support promptly so we can coordinate a resolution consistent with partner policies and the law.
              </p>

              <h2 className="text-2xl font-bold mt-6">9) Pricing, taxes &amp; fees</h2>
              <p>Prices, taxes, and any delivery/service fees are shown at checkout. Obvious pricing errors may be corrected; affected orders may be cancelled and refunded.</p>

              <h2 className="text-2xl font-bold mt-6">10) Payments</h2>
              <p>
                Checkout is completed through a secure, hosted payment flow provided by a third-party payment processor. We do not store full card numbers, CVV, or
                saved-card tokens. Refund timing depends on the relevant partner, payment processor, and issuing bank.
              </p>

              <h2 className="text-2xl font-bold mt-6">11) Service changes</h2>
              <p>We may add, modify, or remove features and may suspend the Services for maintenance, security, or legal reasons.</p>

              <h2 className="text-2xl font-bold mt-6">12) Intellectual property</h2>
              <p>The App, including software, design, and trademarks, is owned by TwoPaws or our licensors. You may not copy, modify, or create derivative works except as permitted by these Terms or applicable law.</p>

              <h2 className="text-2xl font-bold mt-6">13) Third-party services</h2>
              <p>The App may link to or integrate third-party services (e.g., maps, analytics, payments). Those services are governed by their own terms and privacy policies.</p>

              <h2 className="text-2xl font-bold mt-6">14) Warranties &amp; disclaimers</h2>
              <p>The Services are provided as is and as available. We do not warrant uninterrupted or error-free operation or the quality/safety/compliance of third-party goods/services.</p>

              <h2 className="text-2xl font-bold mt-6">15) Limitation of liability</h2>
              <p>To the maximum extent permitted by law, TwoPaws will not be liable for indirect, incidental, special, consequential, or punitive damages, lost profits, or data loss. Our aggregate liability for any claim is limited to the greater of EGP 2,000 or the amounts you paid to us for TwoPaws Services in the six (6) months before the event giving rise to the claim.</p>

              <h2 className="text-2xl font-bold mt-6">16) Indemnity</h2>
              <p>You agree to indemnify and hold TwoPaws harmless from claims arising out of your misuse of the Services, your content, your breach of these Terms, or your violation of law or third-party rights.</p>

              <h2 className="text-2xl font-bold mt-6">17) Suspension &amp; termination</h2>
              <p>We may suspend or terminate access for policy breaches or for security/legal reasons. You may delete your account at any time in the App or by emailing <a href="mailto:info@twopaws.pet">info@twopaws.pet</a>. If there are pending transactions or amounts due, account deletion may be delayed until resolution.</p>

              <h2 className="text-2xl font-bold mt-6">18) Changes to these Terms</h2>
              <p>We may update these Terms; well update the Last updated date above and, where required, provide in-app or email notice. Continued use after changes means you accept the updated Terms.</p>

              <h2 className="text-2xl font-bold mt-6">19) Contact</h2>
              <p>TwoPaws Digital Solutions LLC - Legal<br />Email: <a href="mailto:info@twopaws.pet">info@twopaws.pet</a></p>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="bg-white text-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* --- Top Grid -------------------------------------------------- */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand + Socials */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src={twoPawsLogo} alt="TwoPaws Digital Solutions" className="h-20" />
              </div>
              <p className="text-gray-400 mb-4">
                Your pet's best friend in Egypt. Connecting pet families with the
                care and community they deserve.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://www.instagram.com/twopaws.app/"
                  className="text-gray-400 hover:text-brand-blue transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={insta} alt="Instagram" className="h-6 w-6" />
                </a>
                <a
                  href="https://www.facebook.com/twopawsapp/"
                  className="text-gray-400 hover:text-brand-blue transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={facebook} alt="Facebook" className="h-6 w-6" />
                </a>
                <a
                  href="https://www.tiktok.com/@twopaws.app"
                  className="text-gray-400 hover:text-brand-blue transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={tiktok} alt="TikTok" className="h-6 w-6" />
                </a>
                <a
                  href="https://www.linkedin.com/company/twopaws/"
                  className="text-gray-400 hover:text-brand-blue transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-6 w-6" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="/" className="hover:text-black transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="/" className="hover:text-black transition-colors"
                  >
                    About&nbsp;Us
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="hover:text-black transition-colors"
                  >
                    Reviews
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="hover:text-black transition-colors"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="mailto:info@twopaws.pet"
                    className="hover:text-black transition-colors"
                  >
                    Contact&nbsp;Us
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="hover:text-black transition-colors"
                  >
                    Privacy&nbsp;Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="hover:text-black transition-colors"
                  >
                    Terms&nbsp;&amp;&nbsp;Conditions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* --- Bottom Bar ---------------------------------------------- */}
          <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              (c) {new Date().getFullYear()} TwoPaws Digital Solutions. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

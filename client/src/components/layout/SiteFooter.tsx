import { Linkedin } from "lucide-react";
import twoPawsLogo from "../../../../attached_assets/logotrans.webp";
import insta from "../../../../attached_assets/instagram.svg";
import facebook from "../../../../attached_assets/facebook.svg";
import tiktok from "../../../../attached_assets/tiktok.svg";
import {
  ANDROID_STORE_URL,
  CONTACT_EMAIL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
} from "@/lib/seo/constants";

export default function SiteFooter() {
  return (
    <footer className="bg-white py-16 text-black">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-8 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center space-x-2">
              <img src={twoPawsLogo} alt="TwoPaws" className="h-20" />
            </div>
            <p className="mb-4 text-gray-400">
              Your pet's best friend in Egypt. Connecting pet families with the
              care and community they deserve.
            </p>
            <div className="flex space-x-4">
              <a
                href={INSTAGRAM_URL}
                className="text-gray-400 transition-colors hover:text-brand-dark"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <img src={insta} alt="Instagram" className="h-6 w-6" />
              </a>
              <a
                href="https://www.facebook.com/twopawsapp/"
                className="text-gray-400 transition-colors hover:text-brand-dark"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <img src={facebook} alt="Facebook" className="h-6 w-6" />
              </a>
              <a
                href="https://www.tiktok.com/@twopaws.app"
                className="text-gray-400 transition-colors hover:text-brand-dark"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <img src={tiktok} alt="TikTok" className="h-6 w-6" />
              </a>
              <a
                href="https://www.linkedin.com/company/twopaws/"
                className="text-gray-400 transition-colors hover:text-brand-dark"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="/#features" className="transition-colors hover:text-black">
                  Features
                </a>
              </li>
              <li>
                <a href="/#about" className="transition-colors hover:text-black">
                  About Us
                </a>
              </li>
              <li>
                <a href="/#faq" className="transition-colors hover:text-black">
                  FAQ
                </a>
              </li>
              <li>
                <a href="/shop" className="transition-colors hover:text-black">
                  Shop
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold">Support</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="transition-colors hover:text-black"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a href="/privacy" className="transition-colors hover:text-black">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="transition-colors hover:text-black">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a
                  href={IOS_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-black"
                >
                  Download on App Store
                </a>
              </li>
              <li>
                <a
                  href={ANDROID_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-black"
                >
                  Get it on Google Play
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-gray-200 pt-8 sm:flex-row">
          <p className="text-sm text-gray-400">
            (c) {new Date().getFullYear()} TwoPaws Digital Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

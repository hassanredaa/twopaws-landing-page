import { useState } from "react";
import { motion } from "framer-motion";
import {
  Linkedin,
  Map as FoldedMap,
  MapPin,
  Menu,
  Search,
  X,
} from "lucide-react";
import insta from "../../../attached_assets/instagram.svg";
import facebook from "../../../attached_assets/facebook.svg";
import tiktok from "../../../attached_assets/tiktok.svg";
import twoPawsLogo from "../../../attached_assets/logotrans.webp";
import aiVetIcon from "@assets/aivet.png";
import vetsIcon from "@assets/vets.png";
import healthIcon from "@assets/healthtracker.png";
import hotelsIcon from "@assets/hotels.png";
import shopIcon from "@assets/shop.png";
import adoptionIcon from "@assets/adoption.png";
import marriageIcon from "@assets/marriage.png";
import periodTrackerIcon from "@assets/periodtracker.png";
import freshFoodIcon from "@assets/loopdrop[1]_1748299425142.png";
import phoneMockup from "@assets/phone_14_01.jpg";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Seo from "@/lib/seo/Seo";
import {
  ANDROID_STORE_URL,
  BASE_URL,
  INSTAGRAM_URL,
  IOS_STORE_URL,
} from "@/lib/seo/constants";

type OfferItem = {
  iconSrc?: string;
  label?: string;
  fallback?: "search" | "map";
};

const offerRowOne: OfferItem[] = [
  { iconSrc: aiVetIcon, label: "AI VET" },
  { iconSrc: vetsIcon, label: "VET BOOKING" },
  { iconSrc: healthIcon, label: "HEALTH CARE" },
  { iconSrc: hotelsIcon, label: "HOTEL BOOKING" },
  { iconSrc: shopIcon, label: "SHOP" },
  { fallback: "search" },
];

const offerRowTwo: OfferItem[] = [
  { iconSrc: adoptionIcon, label: "ADOPTION OFFERS" },
  { iconSrc: marriageIcon, label: "MARRIAGE OFFERS" },
  { iconSrc: freshFoodIcon, label: "FRESHFOOD" },
  { iconSrc: periodTrackerIcon, label: "PERIOD TRACKER" },
  { fallback: "map" },
];

function OfferCell({ item }: { item: OfferItem }) {
  return (
    <div className="flex flex-col items-center justify-start gap-3 text-center">
      {item.iconSrc ? (
        <img
          src={item.iconSrc}
          alt={item.label ?? "TwoPaws feature"}
          className="h-24 w-24 object-contain sm:h-28 sm:w-28 lg:h-32 lg:w-32"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center text-brand-purple sm:h-28 sm:w-28 lg:h-32 lg:w-32">
          {item.fallback === "search" ? (
            <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-gray-200">
              <Search className="h-10 w-10 sm:h-11 sm:w-11" strokeWidth={2.2} />
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center">
              <FoldedMap
                className="h-16 w-16 sm:h-20 sm:w-20"
                strokeWidth={2.2}
              />
              <MapPin
                className="absolute -top-1 right-2 h-7 w-7 sm:top-0 sm:right-3 sm:h-8 sm:w-8"
                strokeWidth={2.2}
              />
            </div>
          )}
          {item.fallback !== "search" && item.fallback !== "map" ? (
            <Search className="h-10 w-10" strokeWidth={2.2} />
          ) : null}
        </div>
      )}

      {item.label ? (
        <p className="font-marvin text-2xl uppercase leading-6 text-brand-purple sm:text-3xl sm:leading-7 lg:text-[2.05rem] lg:leading-8">
          {item.label}
        </p>
      ) : null}
    </div>
  );
}

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const faqs = [
    {
      question: "Is TwoPaws free to use?",
      answer: "Yes! TwoPaws is completely free to download and use.",
    },
    {
      question: "Which cities in Egypt do you cover?",
      answer:
        "We currently cover Cairo with plans to expand to more governorates soon.",
    },
    {
      question: "Can I track multiple pets?",
      answer:
        "Absolutely! You can add unlimited pets to your account. Each pet gets their own profile with separate health records, vaccination schedules, and vet history. Perfect for multi-pet families!",
    },
  ];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TwoPaws",
    url: BASE_URL,
    areaServed: "Egypt",
    sameAs: [INSTAGRAM_URL, IOS_STORE_URL, ANDROID_STORE_URL],
  };

  const mobileApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "TwoPaws",
    operatingSystem: ["iOS", "Android"],
    applicationCategory: "Lifestyle",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    downloadUrl: [IOS_STORE_URL, ANDROID_STORE_URL],
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-poppins">
      <Seo
        title="TwoPaws | Pet care app in Egypt"
        description="TwoPaws connects pet families in Egypt with vets, clinics, a supplies marketplace, community features, and delivery."
        canonicalUrl="/"
        structuredData={[organizationSchema, mobileApplicationSchema]}
      />

      <div className="w-full bg-white">
        <nav className="border-b border-gray-100 bg-white">
          <div className="mx-auto flex min-h-[64px] w-full max-w-[1500px] items-center justify-between px-4 sm:px-8 lg:px-10">
            <a href="/" className="flex shrink-0 items-center">
              <img
                src={twoPawsLogo}
                alt="TwoPaws"
                className="h-10 w-auto sm:h-12"
              />
            </a>

            {/* Desktop */}
            <div className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
              <button
                onClick={() => scrollToSection("features")}
                className="transition-colors hover:text-brand-purple"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="transition-colors hover:text-brand-purple"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="transition-colors hover:text-brand-purple"
              >
                FAQ
              </button>
              <a
                href="/shop"
                className="transition-colors hover:text-brand-purple"
              >
                Shop
              </a>
              <a
                href="/terms"
                className="transition-colors hover:text-brand-purple"
              >
                Terms &amp; Conditions
              </a>
              <a
                href="/privacy"
                className="transition-colors hover:text-brand-purple"
              >
                Privacy Policy
              </a>
            </div>

            <div className="hidden md:block">
              <Button
                asChild
                className="h-9 rounded-md bg-brand-purple px-5 text-white hover:opacity-90"
              >
                <a href="/download">Download</a>
              </Button>
            </div>

            {/* Mobile toggle */}
            <button
              className="inline-flex h-10 w-10 items-center justify-center text-brand-purple md:hidden"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {isMobileMenuOpen ? (
            <div className="border-t border-gray-100 px-4 py-4 md:hidden">
              <div className="flex flex-col gap-3 text-sm font-medium text-gray-700">
                <button
                  onClick={() => scrollToSection("features")}
                  className="text-left"
                >
                  Features
                </button>
                <button
                  onClick={() => scrollToSection("about")}
                  className="text-left"
                >
                  About
                </button>
                <button
                  onClick={() => scrollToSection("faq")}
                  className="text-left"
                >
                  FAQ
                </button>
                <a href="/shop">Shop</a>
                <a href="/terms">Terms &amp; Conditions</a>
                <a href="/privacy">Privacy Policy</a>
                <Button
                  asChild
                  className="mt-2 w-full rounded-md bg-brand-purple text-white hover:opacity-90"
                >
                  <a href="/download">Download</a>
                </Button>
              </div>
            </div>
          ) : null}
        </nav>

        {/* HERO (matches reference) */}
        <section className="bg-brand-yellow">
          <div className="relative mx-auto w-full max-w-[1500px] overflow-visible">
            <div className="relative h-[320px] sm:h-[410px] lg:h-[470px]">
              {/* Headline */}
              <div className="absolute bottom-[92px] left-[18px] z-30 sm:bottom-[108px] sm:left-[42px] lg:bottom-[128px] lg:left-[70px]">
                <h1 className="font-marvin text-[2.6rem] uppercase leading-[0.9] tracking-tight text-white sm:text-[3.7rem] lg:text-[5.1rem]">
                  YOUR PET,
                  <br />
                  OUR PRIORITY
                </h1>
              </div>

              {/* Dog */}
              <img
                src="/iStock-157527277.webp"
                alt="Dog"
                className="absolute bottom-[-8px] right-[0px] z-10 h-[86%] w-auto max-w-none object-contain sm:h-[90%] lg:h-[470px]"
              />

              {/* Cat */}
              <img
                src="/iStock-1143440918.webp"
                alt="Cat"
                className="absolute bottom-[-8px] left-[62%] z-20 h-[30%] w-auto -translate-x-1/2 object-contain sm:h-[31%] lg:left-[930px] lg:h-[156px]"
              />

              {/* Illustration (left) */}
              <img
                src="/illustration-2.svg"
                alt=""
                aria-hidden
                className="absolute bottom-[4px] left-[49%] z-20 h-[33%] w-auto -translate-x-1/2 object-contain sm:h-[34%] lg:left-[770px] lg:h-[188px]"
              />

              {/* Illustration (right) - no more legs leaking into About */}
              <img
                src="/illustration-1.svg"
                alt=""
                aria-hidden
                className="absolute bottom-[-12px] left-[70.5%] z-20 h-[33%] w-auto -translate-x-1/2 object-contain sm:bottom-[-14px] sm:h-[34%] lg:left-[1005px] lg:h-[198px]"
              />
            </div>
          </div>
        </section>

        {/* ABOUT (spacing + typography like reference) */}
        <section
          id="about"
          className="relative overflow-hidden bg-white px-4 pb-10 pt-24 sm:px-8 sm:pb-12 sm:pt-28 lg:px-10 lg:pb-14 lg:pt-32"
        >
          <div className="mx-auto grid w-full max-w-[1366px] items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
            <div className="flex justify-center pt-1 lg:justify-start lg:pt-0">
              <img
                src={phoneMockup}
                alt="TwoPaws app preview"
                className="w-[190px] max-w-full object-contain sm:w-[205px] lg:w-[220px]"
              />
            </div>

            <div className="text-center">
              <h2 className="font-marvin text-5xl uppercase text-brand-purple sm:text-6xl lg:text-[4.4rem]">
                ABOUT TWOPAWS
              </h2>

              <div className="mx-auto mt-5 max-w-[980px] space-y-5 text-lg leading-[1.35] sm:text-xl lg:text-[1.65rem]">
                <p className="text-brand-purple">
                  TwoPaws began as a passion project between two best friends
                  who wanted a{" "}
                  <span className="font-semibold">
                    single, joyful space to track their pet&rsquo;s health, meet
                    other owners, book vets, and grab supplies
                  </span>{" "}
                  - something that simply didn&rsquo;t exist in our part of the
                  world.
                </p>

                <p className="text-[#f195cb]">
                  Instead of juggling spreadsheets for vaccines, scrolling
                  through scattered social groups, and hopping between apps to
                  order food, we decided to build{" "}
                  <span className="font-semibold">
                    one intuitive experience
                  </span>{" "}
                  that puts everything a pet parent needs in the palm of their
                  hand.
                </p>

                <p className="mx-auto max-w-[980px] font-medium text-brand-yellow text-right">
                  We&rsquo;re not a corporation - just two lifelong friends (and
                  their furry co-founders) on a mission to make pet care
                  simpler, more connected, and a lot more fun. Thanks for
                  joining us on the journey!
                </p>
              </div>
            </div>
          </div>

          {/* Paw/diagonal shape: positioned like reference and clipped to About */}
          <img
            src="/shape-5.svg"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -right-48 hidden w-[360px] opacity-95 sm:block lg:w-[420px]"
          />
        </section>

        {/* FEATURES */}
        <section
          id="features"
          className="bg-white px-4 pb-14 sm:px-8 sm:pb-20 lg:px-12"
        >
          <div className="mx-auto w-full max-w-[1650px]">
            <h2 className="font-marvin text-5xl uppercase text-brand-purple sm:text-6xl lg:text-7xl">
              WHAT WE OFFER
            </h2>

            <div className="mt-10 space-y-10">
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-8">
                {offerRowOne.map((item, index) => (
                  <OfferCell key={`row-one-${index}`} item={item} />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-8">
                {offerRowTwo.map((item, index) => (
                  <OfferCell key={`row-two-${index}`} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT COMPANY (wing behind + bottom-right like reference) */}
        <section
          id="company"
          className="relative overflow-hidden bg-brand-yellow px-3 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14"
        >
          <img
            src="/shape-6.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 hidden w-[180px] opacity-95 sm:block lg:-right-10 lg:-top-14 lg:w-[250px]"
          />

          <div className="relative z-10 mx-auto w-full max-w-[1366px]">
            <h2 className="text-center font-marvin text-4xl uppercase text-white sm:text-5xl lg:text-[3.35rem]">
              ABOUT THE COMPANY
            </h2>
            <p className="mx-auto mt-3 max-w-[940px] text-center text-lg leading-tight text-brand-purple sm:text-xl lg:text-[1.45rem]">
              TwoPaws is an Egyptian start-up on a mission to build the
              country&rsquo;s first all-in-one pet community platform, uniting
              health tracking, adoption, shopping, and social features so every
              pet family can thrive.
            </p>

            <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start lg:mt-12 lg:gap-14">
              <div>
                <h3 className="font-marvin text-4xl uppercase text-brand-purple sm:text-5xl lg:text-[2.65rem]">
                  AMIRA SAMEH
                </h3>
                <p className="mt-1 font-marvin text-3xl uppercase text-white sm:text-4xl lg:text-[2.1rem]">
                  CO-FOUNDER
                </p>
                <p className="mt-3 max-w-[620px] text-lg leading-tight text-brand-purple sm:text-xl lg:text-[1.22rem]">
                  Vision-driven community champion and self-taught developer who
                  loves turning everyday pet parent struggles into intuitive,
                  tech-powered solutions for the whole community.
                </p>
              </div>

              <div className="md:text-right">
                <h3 className="font-marvin text-4xl uppercase text-brand-purple sm:text-5xl lg:text-[2.65rem]">
                  HASSAN REDA
                </h3>
                <p className="mt-1 font-marvin text-3xl uppercase text-white sm:text-4xl lg:text-[2.1rem]">
                  CO-FOUNDER
                </p>
                <p className="mt-3 ml-auto max-w-[640px] text-lg leading-tight text-brand-purple sm:text-xl lg:text-[1.22rem]">
                  Product strategist and full-stack engineer who prototypes
                  ideas at lightning speed, obsessed with details that make
                  Egypt&rsquo;s pet community smarter, safer, and more fun.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about TwoPaws
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="shadow-sm">
                  <AccordionItem value={`item-${index}`} className="border-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <span className="font-semibold text-brand-dark text-left">
                        {faq.question}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <p className="text-gray-600">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                </Card>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section
        id="cta"
        className="py-20 bg-gradient-to-br from-brand-dark to-brand-olive"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Ready to Give Your Pet the Best Life?
            </h2>
            <p className="text-xl text-gray-800 mb-8">
              Join thousands of pet families who trust TwoPaws for their pet
              care needs.
            </p>

            <p className="text-lg text-gray-900 font-semibold mb-8">
              Follow us to know the latest updates
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                asChild
                className="bg-white text-gray-900 border border-gray-900/10 hover:bg-gray-100 font-semibold shadow-lg shadow-yellow-200/30"
              >
                <a href={IOS_STORE_URL} target="_blank" rel="noreferrer">
                  Download on App Store
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
              >
                <a href={ANDROID_STORE_URL} target="_blank" rel="noreferrer">
                  Get it on Google Play
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* --- Top Grid -------------------------------------------------- */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand + Socials */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src={twoPawsLogo} alt="TwoPaws" className="h-20" />
              </div>
              <p className="text-gray-400 mb-4">
                Your pet's best friend in Egypt. Connecting pet families with
                the care and community they deserve.
              </p>
              <div className="flex space-x-4">
                <a
                  href="https://www.instagram.com/twopaws.app/"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={insta} alt="Instagram" className="h-6 w-6" />
                </a>
                <a
                  href="https://www.facebook.com/twopawsapp/"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={facebook} alt="Facebook" className="h-6 w-6" />
                </a>
                <a
                  href="https://www.tiktok.com/@twopaws.app"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={tiktok} alt="TikTok" className="h-6 w-6" />
                </a>
                <a
                  href="https://www.linkedin.com/company/twopaws/"
                  className="text-gray-400 hover:text-brand-dark transition-colors"
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
                  <button
                    onClick={() => scrollToSection?.("features")}
                    className="hover:text-black transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection?.("about")}
                    className="hover:text-black transition-colors"
                  >
                    About&nbsp;Us
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection?.("testimonials")}
                    className="hover:text-black transition-colors"
                  >
                    Reviews
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection?.("faq")}
                    className="hover:text-black transition-colors"
                  >
                    FAQ
                  </button>
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
              (c) {new Date().getFullYear()} TwoPaws Digital Solutions. All
              rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

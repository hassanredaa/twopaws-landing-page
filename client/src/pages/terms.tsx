import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import twoPawsLogo from "@assets/logos[1]_1748043489395.png";
import { Menu, X, Facebook, Instagram, Twitter } from "lucide-react";

export default function Terms() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <a href="/">
                <img src={twoPawsLogo} alt="TwoPaws" className="h-8" />
              </a>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="/" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Home
              </a>
              <a href="/terms" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Terms
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
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-24 px-4 pb-16 bg-gray-50 flex items-start justify-center">
        <Card className="w-full max-w-4xl mx-auto">
          <CardContent className="pt-6 space-y-6 text-sm text-gray-700">
            <h1 className="text-3xl font-bold mb-4">
              Terms & Conditions and Privacy Policy
            </h1>

            <h2 className="text-2xl font-bold mt-6 mb-2">
              Cancellation & Refund Policy
            </h2>
            <p className="font-semibold">1. General</p>
            <p>
              TwoPaws is committed to providing exceptional service in a timely
              manner. Unfortunately, when a customer cancels without giving enough
              notice, it prevents another customer from being served. No shows and
              late cancellation have an impact on service quality while punishing
              customers who may show up earlier. For these reasons. TwoPaws has
              implemented a cancellation policy that will be strictly observed.
            </p>
            <p className="font-semibold">2. Full Payment</p>
            <p>
              Your registration is complete when we receive your full payment.
              Payments can be online or in person. We do not reserve products
              without payment. An online confirmation email will be sent to you at
              the time of registration and payment. This email serves as
              confirmation of your registration.
            </p>
            <p className="font-semibold">3. Cancellation Request</p>
            <p>
              Cancellation requests may be submitted by phone, email, or online.
              Please note that refunds will be processed in the original form of
              payment. If you have any questions or concerns about our
              cancellation policy, please contact us on (+201055100908).
            </p>
            <p className="font-semibold">4. Refund Policy</p>
            <p>
              The refund request must not exceed 14 days from the date of payment.
              If the refund request is accepted the full paid amount will be
              recovered to your account in 14 working days.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-2">Delivery Policy</h2>
            <p>
              Please be advised that the official business days in the TwoPaws are
              from Sunday to Thursday. Fridays, Saturdays, holidays, and public
              holidays are holidays for all employees of TwoPaws and shipping
              companies. TwoPaws mainly delivers your orders through a third party
              to ensure the timely shipping of your order. The method of delivery
              at TwoPaws is to deliver within two to four days as a maximum,
              depending on your geographical area, giving you the option to choose
              the right time for you to deliver at any time during the day, week
              or even during the month.
            </p>
            <p>
              In the case of urgent orders, please contact our customer service
              and we will do our best to help you. We will ask for your signature
              on a copy of the invoice to confirm receipt of the goods. We will
              deliver the order to the registered address, and we consider the
              signature of anyone at the address as a receipt of the order. If
              there is no one at the registered address to receive your order, we
              will ask you to contact our customer service to agree another
              delivery time. The company is not able to attempt delivery more than
              twice. The company is not responsible for any order exceeding 7 days
              of the first delivery attempt.
            </p>
            <p>
              In-stock Orders are fulfilled within 5-7 business days. Custom-made
              Orders are fulfilled according to the individual production time
              which is stated on the product description page. Delivery cost is
              calculated at check-out depending on the product and the delivery
              address or quoted after order for special orders and included on
              your order's final balance.
            </p>
            <p>
              An estimated delivery time will be provided to you once your order
              is placed. Delivery times are estimates and commence from the date
              of shipping, rather than the date of order. Unless there are
              exceptional circumstances, we make every effort to fulfill your
              order within 5 business days of the date of your order. The date of
              delivery may vary due to carrier shipping practices, delivery
              location, method of delivery, and the items ordered. Products may
              also be delivered in separate shipments.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-2">Privacy Policy</h2>
            <p>
              This Privacy Policy sets out the policy of TwoPaws with respect to
              the way we obtain, use, and disclose information about you through
              our website. We understand and appreciate that you are concerned
              about privacy, particularly in relation to the use and disclosure of
              personal information. We are committed to providing a high level of
              privacy in relation to all personal information that is collected by
              us.
            </p>
            <p>
              <strong>Your Consent:</strong> You consent to your personal
              information being used in accordance with the privacy policy by
              visiting our website, by entering a competition on our website, by
              purchasing our products on the website and/or by providing us with
              your personal information on the website.
            </p>
            <p>
              Information is collected from you primarily to make it easier and
              more rewarding for you to use our website and services. Depending on
              the service you access, you could be asked to provide information
              such as your name, email address or information about what you like
              and do not like. It is entirely your choice whether to respond to
              these questions or not.
            </p>
            <p>
              TwoPaws will use the personal information you have chosen to provide
              us with for the purpose for which you provided it. TwoPaws will not
              use it for any other purpose without your consent. We might on
              occasion use this information to notify you of any important changes
              to our site or any special promotions that may be of interest to
              you. With each email or communication that we send you, we will
              include simple instructions on how you can immediately unsubscribe
              from our mailing list.
            </p>
            <p>
              There will be occasions where it will be necessary for TwoPaws to
              disclose your personal information to third parties to provide the
              products or services you have requested, for example, if you
              purchase products online, TwoPaws will need to disclose your
              personal information to third parties to bill and deliver your
              products. However, the disclosure will only be made where it is
              necessary to fulfill the purpose for which you disclosed your
              personal information.
            </p>
            <p>
              Under no circumstances will TwoPaws sell or receive payment for
              licensing or disclosing your personal information. Ultimately, you
              are solely responsible for maintaining the secrecy of your passwords
              and any personal information.
            </p>
            <p>
              TwoPaws operates secure data networks that are designed to protect
              your privacy and security. Please note that our website does not
              provide systems for secure transmission of personal information
              across the internet, except where otherwise specifically stated. You
              should be aware that there are inherent risks in transmitting
              personal information via the internet and that we accept no
              responsibility for personal information provided via unsecured
              websites.
            </p>
            <p>
              You may access your information at any time. If you discover that
              there is an error or information is missing, please notify us and we
              will try to correct or update the information as soon as possible.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-2">Terms and Conditions</h2>
            <p>
              This website is operated by TwoPaws. By visiting our site and/or
              purchasing something from us, you engage in our Service and agree to
              be bound by these terms and conditions. Please read these Terms of
              Service carefully before accessing or using our website. Any new
              features or tools which are added to the current store shall also be
              subject to the Terms of Service.
            </p>
            <p>
              Our store is hosted on Google Cloud. They provide us with an online
              e-commerce platform that allows us to sell our products and services
              to you. Prices for our products are subject to change without notice
              and we reserve the right at any time to modify or discontinue the
              Service without notice.
            </p>
            <p>
              Certain products or services may be available exclusively online
              through the website. These products or services may have limited
              quantities and are subject to return or exchange only according to
              our Return Policy. We reserve the right to limit the sales of our
              products or Services to any person, geographic region, or
              jurisdiction.
            </p>
            <p>
              We do not warrant that the quality of any products, services,
              information, or other material purchased or obtained by you will
              meet your expectations, or that any errors in the Service will be
              corrected. You agree to provide current, complete, and accurate
              purchase and account information for all purchases made at our
              store.
            </p>
            <p>
              We may provide you with access to third-party tools over which we
              neither monitor nor have any control. Any use by you of optional
              tools offered through the site is entirely at your own risk and
              discretion.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-2">
              Return and Refund Policy
            </h2>
            <p>Enjoy shopping with the following return policy features:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>
                You have 14 days to return the products sold after receipt.
                Shipping cost will be added through the returns in your customer
                account or by calling customer service number (+201055100908) or
                via email info@twopaws.pet.
              </li>
              <li>
                If the item has a defect, does not work properly, does not match
                the description of the site, is fake, or was received damaged as a
                result of transportation and shipment, you have the right to
                return it within 30 days from the date of receipt for free, and
                the value of the item will be refunded to you within a maximum
                period of 14 working days.
              </li>
              <li>
                When returning the product, make sure that all the accessories and
                labels for the order are in their proper condition and that the
                product is in its original package in the correct condition in
                which it was received and that the package is closed by the
                factory sealed as well as the inclusions in the offers such as
                included gifts with the products or exceptional accessories.
              </li>
            </ul>
            <p>
              Some products cannot be returned, including damaged products
              (excluding transportation damage), products that are not in their
              original packaging, products that do not include all accessories,
              and unsealed products from certain product groups.
            </p>
          </CardContent>
        </Card>
      </main>
      <footer className="bg-brand-dark text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src={twoPawsLogo} alt="TwoPaws" className="h-20" />
              </div>
              <p className="text-gray-400 mb-4">
                Your pet's best friend in Egypt. Connecting pet families with the care and community they deserve.
              </p>
              <div className="flex space-x-4">
                <a href="https://www.instagram.com/twopaws.app/" className="text-gray-400 hover:text-brand-blue transition-colors">
                  <Instagram className="h-6 w-6" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="/"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="hover:text-white transition-colors"
                  >
                    Reviews
                  </a>
                </li>
                <li>
                  <a
                    href="/"
                    className="hover:text-white transition-colors"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                {/* <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li> */}
                <li>
                  <a href="/terms" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
            {/* 
            <div>
              <h3 className="font-semibold mb-4">Stay Updated</h3>
              <p className="text-gray-400 mb-4 text-sm">
                Get pet care tips and app updates delivered to your inbox.
              </p>
              <Form {...newsletterForm}>
                <form
                  onSubmit={newsletterForm.handleSubmit((data) => newsletterMutation.mutate(data))}
                  className="space-y-2"
                >
                  <FormField
                    control={newsletterForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Your email"
                            className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-brand-blue"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={newsletterMutation.isPending}
                    className="w-full bg-brand-blue hover:bg-blue-600"
                  >
                    {newsletterMutation.isPending ? "Subscribing..." : "Subscribe"}
                  </Button>
                </form>
              </Form>
            </div> */}
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} TwoPaws. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

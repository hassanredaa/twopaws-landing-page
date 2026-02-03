import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Menu, X, Linkedin } from "lucide-react";
import twoPawsLogo from "../../../attached_assets/logotrans.webp";
import { useToast } from '@/hooks/use-toast';
import insta from "../../../attached_assets/instagram.svg"
import facebook from "../../../attached_assets/facebook.svg"
import tiktok from "../../../attached_assets/tiktok.svg"
import { Helmet } from "react-helmet-async";

import { functions } from '@/lib/firebase';

export default function DeleteAccount() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  const mutation = useMutation({
    mutationFn: async () => {
      const fn = httpsCallable(functions, 'deleteUserRequest');
      await fn({ email });
    },
    onSuccess: () => {
      toast({ title: 'Request sent', description: 'Check your email for confirmation link.' });
      setEmail('');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return (
  <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4">
      <Helmet>
        <title>Delete Account | TwoPaws</title>
        <meta name="description" content="Request deletion of your TwoPaws account." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://twopaws.pet/delete-account" />
      </Helmet>
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
              <a href="/shop" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Shop
              </a>
              <a href="/terms" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Terms
              </a>
              <a href="/privacy" className="text-gray-600 hover:text-brand-green-dark transition-colors">
                Privacy
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
              <a href="/shop" className="block w-full text-left text-gray-600">
                Shop
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
    <Card className="w-full max-w-md my-24">
        <CardContent className="pt-6 space-y-4">
          <h1 className="text-2xl font-bold">Request account deletion</h1>
          <p className="text-sm text-gray-600">Deleting your account is permanent and cannot be undone.</p>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !email}>
            {mutation.isPending ? 'Sending...' : 'Request deletion'}
          </Button>
        </CardContent>
      </Card>
    <footer className="w-full bg-white text-black mt-auto py-16">
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
                <a href="https://www.instagram.com/twopaws.app/" className="text-gray-400 hover:text-brand-dark transition-colors">
                  <img src={insta} alt="Instagram" className="h-6 w-6" />
                </a>
                <a href="https://www.facebook.com/twopawsapp/" className="text-gray-400 hover:text-brand-dark transition-colors" target="_blank" rel="noopener noreferrer">
                  <img src={facebook} alt="Facebook" className="h-6 w-6" />
                </a>
                <a href="https://www.tiktok.com/@twopaws.app" className="text-gray-400 hover:text-brand-dark transition-colors" target="_blank" rel="noopener noreferrer">
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
                  <a href="/privacy" className="hover:text-white transition-colors">
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

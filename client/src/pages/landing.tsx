import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { 
  Heart, 
  MapPin, 
  ShoppingCart, 
  Users, 
  Stethoscope, 
  Activity,
  Ambulance,
  Star,
  ChevronDown,
  Menu,
  X,
  Download,
  Facebook,
  Instagram,
  Twitter,
  Zap
} from "lucide-react";
import twoPawsLogo from "../../../attached_assets/logotrans.png";
import loopDropIcon from "@assets/loopdrop[1]_1748299425142.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailForm = z.infer<typeof emailSchema>;

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const waitlistForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const newsletterForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const waitlistMutation = useMutation({
    mutationFn: async (data: EmailForm) => {
      const response = await apiRequest("POST", "/api/waitlist", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Welcome to the waitlist! 🎉",
        description: data.message,
      });
      waitlistForm.reset();
    },
    onError: (error: any) => {
      const message = error.message.includes("409") 
        ? "You're already on our waitlist!" 
        : "Please enter a valid email address";
      toast({
        title: "Oops!",
        description: message,
        variant: "destructive",
      });
    },
  });

  const newsletterMutation = useMutation({
    mutationFn: async (data: EmailForm) => {
      const response = await apiRequest("POST", "/api/newsletter", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Thanks for subscribing! 📧",
        description: data.message,
      });
      newsletterForm.reset();
    },
    onError: (error: any) => {
      const message = error.message.includes("409") 
        ? "You're already subscribed!" 
        : "Please enter a valid email address";
      toast({
        title: "Oops!",
        description: message,
        variant: "destructive",
      });
    },
  });

  const features = [
    {
      icon: "custom",
      iconSrc: loopDropIcon,
      title: "LoopDrop Auto-Delivery",
      description: "Never run out of pet essentials! Set up automatic delivery schedules for food, treats, and supplies. Smart recommendations based on your pet's needs.",
      color: "bg-brand-olive",
      bgColor: "from-yellow-50 to-brand-cream",
      featured: true,
    },
    {
      icon: Heart,
      title: "Pet Match Swiper",
      description: "Find the perfect playmate or breeding partner for your pet! Swipe through profiles just like dating apps, but for your furry friends to find their soulmates.",
      color: "bg-red-500",
      bgColor: "from-red-50 to-pink-50",
      featured: true,
    },
    {
      icon: Stethoscope,
      title: "Find Trusted Vets",
      description: "Book appointments with verified veterinarians near you. Read reviews, compare prices, and ensure your pet gets the best care in Egypt.",
      color: "bg-brand-green-dark",
      bgColor: "from-brand-cream to-green-50",
    },
    {
      icon: Activity,
      title: "Health & Vaccination Tracker",
      description: "Never miss a vaccination again! Keep digital records of your pet's health history and get timely reminders for checkups.",
      color: "bg-brand-olive",
      bgColor: "from-brand-cream to-yellow-50",
    },
    {
      icon: MapPin,
      title: "Pet-Friendly Places",
      description: "Discover parks, cafés, hotels, and restaurants that welcome your furry friends. Explore Egypt with your pet by your side!",
      color: "bg-brand-green-dark",
      bgColor: "from-brand-cream to-green-50",
    },
    {
      icon: Users,
      title: "Pet Owner Community",
      description: "Connect with fellow pet lovers, share tips, arrange playdates, and get advice from experienced pet owners in your area.",
      color: "bg-brand-olive",
      bgColor: "from-brand-cream to-yellow-50",
    },
    {
      icon: ShoppingCart,
      title: "Pet Supplies Marketplace",
      description: "Shop for premium pet food, toys, accessories, and more. Fast delivery across Egypt with exclusive deals for TwoPaws users.",
      color: "bg-brand-green-dark",
      bgColor: "from-brand-cream to-green-50",
    },
    {
      icon: Ambulance,
      title: "Emergency Care",
      description: "Quick access to emergency vet services and 24/7 pet helpline. Get immediate help when your pet needs it most.",
      color: "bg-brand-olive",
      bgColor: "from-brand-cream to-yellow-50",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Ahmed",
      location: "Cat Mom • Cairo",
      content: "TwoPaws helped me find the perfect vet for Whiskers when we moved to New Cairo. The booking system is so easy, and I love the vaccination reminders!",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612c25b?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    },
    {
      name: "Ahmed Hassan",
      location: "Dog Dad • Alexandria",
      content: "The pet-friendly places feature is amazing! Max and I discovered so many new cafés and parks in Alex. The community is super friendly too.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    },
    {
      name: "Fatma El-Sayed",
      location: "Multi-Pet Mom • Giza",
      content: "With 3 cats and a dog, keeping track of everything was chaos. TwoPaws organized my life! The marketplace saves me so much time too.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80",
    },
  ];

  const faqs = [
    {
      question: "Is TwoPaws free to use?",
      answer: "Yes! TwoPaws is completely free to download and use. We offer premium features like priority vet booking and exclusive marketplace deals for a small monthly fee, but all core features are free forever.",
    },
    {
      question: "Which cities in Egypt do you cover?",
      answer: "We currently cover Cairo, Giza, Alexandria, and Sharm El-Sheikh, with plans to expand to more governorates soon. Our vet network includes over 500 verified professionals across these cities.",
    },
    {
      question: "How do you verify veterinarians?",
      answer: "All veterinarians go through a rigorous verification process including license verification, clinic inspection, and background checks. We also monitor reviews and maintain high standards for our network.",
    },
    {
      question: "Can I track multiple pets?",
      answer: "Absolutely! You can add unlimited pets to your account. Each pet gets their own profile with separate health records, vaccination schedules, and vet history. Perfect for multi-pet families!",
    },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src={twoPawsLogo} alt="TwoPaws" className="h-16" />
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-gray-600 hover:text-brand-green-dark transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="text-gray-600 hover:text-brand-green-dark transition-colors"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("testimonials")}
                className="text-gray-600 hover:text-brand-green-dark transition-colors"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="text-gray-600 hover:text-brand-green-dark transition-colors"
              >
                FAQ
              </button>
              <Button 
                onClick={() => scrollToSection("cta")}
                className="bg-brand-green-dark text-white hover:bg-brand-olive"
              >
                Download Now
              </Button>
            </div>
            
            <div className="md:hidden">
              <Button
                variant="ghost"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
        
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-3">
              <button
                onClick={() => scrollToSection("features")}
                className="block w-full text-left text-gray-600"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className="block w-full text-left text-gray-600"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("testimonials")}
                className="block w-full text-left text-gray-600"
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className="block w-full text-left text-gray-600"
              >
                FAQ
              </button>
              <Button 
                onClick={() => scrollToSection("cta")}
                className="w-full bg-brand-blue text-white"
              >
                Download Now
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-brand-cream to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-dark leading-tight mb-6">
                Your Pet's <span className="text-brand-green-dark">Best Friend</span> in Egypt
              </h1>
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                Discover vets, track health, find pet-friendly places, and connect with fellow pet lovers. Everything your furry friend needs in one app! 🐾
              </p>
              
              {/* Featured Highlights */}
              <div className="space-y-3 mb-8">
                <div className="bg-gradient-to-r from-brand-olive/10 to-yellow-100/50 border border-brand-olive/20 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <img src={loopDropIcon} alt="LoopDrop" className="h-8 w-8" />
                    <div>
                      <h3 className="font-semibold text-brand-dark">Introducing LoopDrop!</h3>
                      <p className="text-sm text-gray-600">Never run out of pet supplies with smart auto-delivery</p>
                    </div>
                    <span className="bg-brand-olive text-white text-xs px-2 py-1 rounded-full font-semibold ml-auto">
                      NEW
                    </span>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4">
                  <div className="flex items-center space-x-3">
                    <Heart className="h-8 w-8 text-red-500" />
                    <div>
                      <h3 className="font-semibold text-brand-dark">Pet Match Swiper</h3>
                      <p className="text-sm text-gray-600">Find your pet's perfect playmate with swipe-to-match</p>
                    </div>
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold ml-auto">
                      HOT
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <img 
                  src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1709251200"
                  alt="Download on App Store" 
                  className="h-14 hover:scale-105 transition-transform cursor-pointer"
                />
                <img 
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                  alt="Get it on Google Play" 
                  className="h-14 hover:scale-105 transition-transform cursor-pointer"
                />
              </div>
              
              <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-brand-olive fill-current" />
                  <span>4.8/5 Rating</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4 text-brand-green-dark" />
                  <span>10k+ Downloads</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative mx-auto max-w-sm">
                <div className="bg-gray-900 rounded-3xl p-2 shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=800" 
                    alt="TwoPaws App Interface" 
                    className="w-full rounded-2xl"
                  />
                </div>
                
                {/* Floating feature icons */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -top-4 -left-4 bg-white rounded-xl p-3 shadow-lg"
                >
                  <Stethoscope className="h-6 w-6 text-brand-green-dark" />
                </motion.div>
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute -top-4 -right-4 bg-white rounded-xl p-3 shadow-lg"
                >
                  <Heart className="h-6 w-6 text-red-500" />
                </motion.div>
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  className="absolute -bottom-4 -left-4 bg-white rounded-xl p-3 shadow-lg"
                >
                  <MapPin className="h-6 w-6 text-brand-olive" />
                </motion.div>
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                  className="absolute -bottom-4 -right-4 bg-white rounded-xl p-3 shadow-lg"
                >
                  <ShoppingCart className="h-6 w-6 text-brand-green-dark" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
              Everything Your Pet Needs in One App
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From finding the best vets in Cairo to discovering pet-friendly cafés in Alexandria, TwoPaws has got you covered.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`bg-gradient-to-br ${feature.bgColor} rounded-2xl p-8 hover:shadow-lg transition-shadow ${feature.featured ? 'border-2 border-brand-olive ring-2 ring-brand-olive/20' : ''}`}
              >
                <div className={`${feature.color} rounded-xl p-4 w-16 h-16 flex items-center justify-center mb-6 relative`}>
                  {feature.icon === "custom" ? (
                    <img src={feature.iconSrc} alt={feature.title} className="h-10 w-10" />
                  ) : (
                    <feature.icon className="h-8 w-8 text-white" />
                  )}
                  {feature.featured && (
                    <div className="absolute -top-2 -right-2 bg-brand-olive text-white text-xs px-2 py-1 rounded-full font-semibold">
                      NEW
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-brand-dark mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-brand-light to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <img 
                src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Veterinary clinic with caring professionals" 
                className="rounded-2xl shadow-xl"
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-brand-dark mb-6">
                Built by Pet Lovers, for Pet Lovers
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                TwoPaws was born from our own struggles as pet parents in Egypt. We couldn't find reliable vet information, 
                struggled to keep track of vaccinations, and often felt isolated in our pet parenting journey.
              </p>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                That's why we created TwoPaws - to build a supportive community where every pet gets the love, care, 
                and attention they deserve. From bustling Cairo to beautiful Alexandria, we're connecting pet families across Egypt.
              </p>
              
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-blue">10k+</div>
                  <div className="text-sm text-gray-600">Happy Pets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-green">500+</div>
                  <div className="text-sm text-gray-600">Verified Vets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-yellow">1000+</div>
                  <div className="text-sm text-gray-600">Pet Places</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
              What Egyptian Pet Parents Say
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from real pet families across Egypt
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full shadow-lg border border-gray-100">
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="ml-4">
                        <div className="font-semibold text-brand-dark">{testimonial.name}</div>
                        <div className="text-sm text-gray-600">{testimonial.location}</div>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      "{testimonial.content}"
                    </p>
                    <div className="flex text-brand-yellow">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-brand-light">
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
                      <span className="font-semibold text-brand-dark text-left">{faq.question}</span>
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
      <section id="cta" className="py-20 bg-gradient-to-br from-brand-blue to-brand-green">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Give Your Pet the Best Life?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of Egyptian pet families who trust TwoPaws for their pet care needs.
            </p>
            
            <Form {...waitlistForm}>
              <form 
                onSubmit={waitlistForm.handleSubmit((data) => waitlistMutation.mutate(data))}
                className="max-w-md mx-auto mb-8"
              >
                <div className="flex gap-4">
                  <FormField
                    control={waitlistForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="Enter your email"
                            className="bg-white border-0 focus:ring-2 focus:ring-white"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={waitlistMutation.isPending}
                    className="bg-brand-yellow text-brand-dark hover:bg-yellow-400 font-semibold"
                  >
                    {waitlistMutation.isPending ? "Joining..." : "Join Waitlist"}
                  </Button>
                </div>
              </form>
            </Form>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <img 
                src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&releaseDate=1709251200"
                alt="Download on App Store" 
                className="h-14 hover:scale-105 transition-transform cursor-pointer mx-auto"
              />
              <img 
                src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                alt="Get it on Google Play" 
                className="h-14 hover:scale-105 transition-transform cursor-pointer mx-auto"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src={twoPawsLogo} alt="TwoPaws" className="h-8" />
              </div>
              <p className="text-gray-400 mb-4">
                Your pet's best friend in Egypt. Connecting pet families with the care and community they deserve.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors">
                  <Facebook className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors">
                  <Instagram className="h-6 w-6" />
                </a>
                <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors">
                  <Twitter className="h-6 w-6" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button 
                    onClick={() => scrollToSection("features")}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection("about")}
                    className="hover:text-white transition-colors"
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection("testimonials")}
                    className="hover:text-white transition-colors"
                  >
                    Reviews
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection("faq")}
                    className="hover:text-white transition-colors"
                  >
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
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
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 TwoPaws. All rights reserved. Made with ❤️ for Egyptian pets.
            </p>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              <span className="text-gray-400 text-sm">🇪🇬 Proudly Egyptian</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

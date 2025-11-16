import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import FAQSection from "@/components/FAQSection";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4" data-testid="text-page-title">
              Contact & Support
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
              Have questions or need assistance? We're here to help
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            <ContactForm />

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg font-serif mb-4">Get in Touch</h3>
                  
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Email</p>
                      <a href="mailto:labtech.elections@ucc.edu.gh" className="text-sm text-muted-foreground hover:text-primary" data-testid="link-email">
                        labtech.elections@ucc.edu.gh
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Phone</p>
                      <a href="tel:+233332132440" className="text-sm text-muted-foreground hover:text-primary" data-testid="link-phone">
                        +233 33 213 2440
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Office Location</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-address">
                        Laboratory Technology Department<br />
                        School of Allied Health Sciences<br />
                        University of Cape Coast, Ghana
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Office Hours</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-hours">
                        Monday - Friday: 9:00 AM - 5:00 PM<br />
                        Saturday - Sunday: Closed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Need Immediate Help?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    For urgent technical issues during the voting period, our support team is available 24/7.
                  </p>
                  <a href="mailto:labtech.support@ucc.edu.gh" className="text-sm font-medium text-primary hover:underline" data-testid="link-urgent-support">
                    Contact Emergency Support →
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>

          <FAQSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { Link } from "wouter";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-serif font-semibold text-lg mb-4">LabTech E-Center</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Empowering democratic participation in Laboratory Technology departmental governance at University of Cape Coast.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/candidates" className="text-sm text-muted-foreground hover:text-foreground block" data-testid="link-footer-candidates">
                  Candidates
                </Link>
              </li>
              <li>
                <Link href="/results" className="text-sm text-muted-foreground hover:text-foreground block" data-testid="link-footer-results">
                  Results
                </Link>
              </li>
              <li>
                <Link href="/vote" className="text-sm text-muted-foreground hover:text-foreground block" data-testid="link-footer-vote">
                  Vote Now
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground block" data-testid="link-footer-contact">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground block" data-testid="link-footer-faq">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground block" data-testid="link-footer-privacy">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span data-testid="text-footer-email">labtech.elections@ucc.edu.gh</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span data-testid="text-footer-phone">+233 33 213 2440</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span data-testid="text-footer-address">Laboratory Technology Department<br/>School of Allied Health Sciences<br/>University of Cape Coast, Ghana</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p data-testid="text-footer-copyright">
            © {new Date().getFullYear()} Laboratory Technology Department, UCC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

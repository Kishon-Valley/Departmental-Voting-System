import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import heroImage from "@assets/generated_images/University_campus_hero_image_7a701476.png";

export default function HeroSection() {
  return (
    <div className="relative min-h-[500px] md:min-h-[600px] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-white mb-6" data-testid="text-hero-title">
          Department Elections 2025
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-8 leading-relaxed max-w-2xl mx-auto" data-testid="text-hero-subtitle">
          Your voice matters. Participate in shaping the future of our department through secure, transparent online voting.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/candidates">
            <Button size="lg" variant="default" className="w-full sm:w-auto" data-testid="button-view-candidates">
              View Candidates
            </Button>
          </Link>
          <Link href="/vote">
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto bg-white/10 backdrop-blur-sm text-white border-white/30 hover:bg-white/20" 
              data-testid="button-vote-now-hero"
            >
              Vote Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

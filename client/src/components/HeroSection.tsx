import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import uccStudents from "@assets/images/UCC - students.jpg";
import ucc4 from "@assets/images/UCC 4.jpeg";
import uccEntrance from "@assets/images/UCC entrancen2.jpeg";
import ucc2023 from "@assets/images/UCC-2023-jpg.webp";

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const slides = [
    {
      image: uccStudents,
      title: "Laboratory Technology Elections Center",
      subtitle: "Shape the future of Laboratory Technology at UCC. Your voice matters in building excellence in scientific education and research."
    },
    {
      image: ucc4,
      title: "Excellence in Laboratory Science",
      subtitle: "Join us in advancing diagnostic innovation and professional development at the University of Cape Coast."
    },
    {
      image: uccEntrance,
      title: "Your Voice, Your Future",
      subtitle: "Participate in democratic governance and help shape the direction of our Laboratory Technology department."
    },
    {
      image: ucc2023,
      title: "Building Tomorrow's Laboratory Leaders",
      subtitle: "Vote for candidates who will elevate LABSTAG UCC, research excellence, and student welfare."
    }
  ];

  // Auto-advance slideshow - transitions happen automatically (always, regardless of hover)
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start auto-advance - continues even when hovering
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setCurrentSlide((prev) => {
        const next = (prev + 1) % slides.length;
        return next;
      });
    }, 6000); // Change slide every 6 seconds with 3D transition

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [slides.length]);

  const handleSlideChange = (index: number) => {
    if (index !== currentSlide) {
      setDirection(index > currentSlide ? 1 : -1);
      setCurrentSlide(index);
    }
  };

  const handlePrevious = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // 3D transition variants - Cube rotation effect
  const slideVariants = {
    enter: (direction: number) => ({
      rotateY: direction > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.8,
      z: -800,
    }),
    center: {
      rotateY: 0,
      opacity: 1,
      scale: 1,
      z: 0,
    },
    exit: (direction: number) => ({
      rotateY: direction > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.8,
      z: -800,
    }),
  };

  const contentVariants = {
    enter: {
      rotateX: -45,
      opacity: 0,
      y: 100,
      z: -300,
      scale: 0.9,
    },
    center: {
      rotateX: 0,
      opacity: 1,
      y: 0,
      z: 0,
      scale: 1,
    },
    exit: {
      rotateX: 45,
      opacity: 0,
      y: -100,
      z: -300,
      scale: 0.9,
    },
  };

  return (
    <div 
      className="relative min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ perspective: '2000px', perspectiveOrigin: 'center center' }}
    >
      {/* 3D Slideshow Container */}
      <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 1.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute inset-0"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${slides[currentSlide].image})`,
                backfaceVisibility: 'hidden',
              }}
            />
            {/* 3D Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 3D Navigation Arrows */}
      <button
        onClick={handlePrevious}
        className="absolute left-4 md:left-8 z-30 p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 opacity-0 group-hover:opacity-100 transform hover:scale-110 hover:rotate-y-12"
        style={{ transformStyle: 'preserve-3d' }}
        aria-label="Previous slide"
        data-testid="button-prev-slide"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 md:right-8 z-30 p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 opacity-0 group-hover:opacity-100 transform hover:scale-110 hover:rotate-y-12"
        style={{ transformStyle: 'preserve-3d' }}
        aria-label="Next slide"
        data-testid="button-next-slide"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>
      
      {/* 3D Content with Perspective */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center" style={{ transformStyle: 'preserve-3d' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 1.0,
              delay: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.h1
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-serif text-white mb-6 leading-tight drop-shadow-2xl"
              style={{ 
                transform: 'translateZ(50px)',
                textShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
              data-testid="text-hero-title"
            >
              {slides[currentSlide].title}
            </motion.h1>
            <motion.p
              className="text-lg md:text-xl lg:text-2xl text-white/95 mb-10 leading-relaxed max-w-3xl mx-auto drop-shadow-lg font-light"
              style={{ transform: 'translateZ(30px)' }}
              data-testid="text-hero-subtitle"
            >
              {slides[currentSlide].subtitle}
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              style={{ transform: 'translateZ(40px)' }}
            >
              <Link href="/candidates">
                <Button 
                  size="lg" 
                  variant="default" 
                  className="w-full sm:w-auto px-8 py-6 text-lg font-semibold shadow-2xl hover:shadow-primary/50 transform hover:scale-105 transition-all duration-300"
                  style={{ transformStyle: 'preserve-3d' }}
                  data-testid="button-view-candidates"
                >
                  View Candidates
                </Button>
              </Link>
              <Link href="/vote">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto px-8 py-6 text-lg font-semibold bg-white/10 backdrop-blur-md text-white border-2 border-white/30 hover:bg-white/20 hover:border-white/50 transform hover:scale-105 transition-all duration-300 shadow-2xl"
                  style={{ transformStyle: 'preserve-3d' }}
                  data-testid="button-vote-now-hero"
                >
                  Vote Now
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </AnimatePresence>
        
        {/* 3D Slide Indicators */}
        <motion.div
          className="flex justify-center gap-2 md:gap-3 mt-12"
          style={{ transform: 'translateZ(20px)' }}
        >
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => handleSlideChange(index)}
              className="relative group/indicator"
              style={{ transformStyle: 'preserve-3d' }}
              data-testid={`slide-indicator-${index}`}
            >
              <motion.div
                className={`relative w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-500 ${
                  index === currentSlide 
                    ? 'bg-white' 
                    : 'bg-white/40 hover:bg-white/70'
                }`}
                whileHover={{ scale: 1.3, rotateY: 180 }}
                style={{ transformStyle: 'preserve-3d' }}
              />
              {index === currentSlide && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 rounded-full bg-white shadow-lg shadow-white/50"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{ transform: 'translateZ(5px)' }}
                />
              )}
              {/* 3D Pulse Ring */}
              {index === currentSlide && (
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white/50"
                  initial={{ scale: 1, opacity: 0.5, rotateZ: 0 }}
                  animate={{ 
                    scale: [1, 1.8, 1.8],
                    opacity: [0.5, 0, 0],
                    rotateZ: [0, 360],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  style={{ transformStyle: 'preserve-3d' }}
                />
              )}
            </button>
          ))}
        </motion.div>

        {/* Slide Counter with 3D effect */}
        <motion.div
          className="mt-6 text-white/60 text-sm font-medium"
          style={{ transform: 'translateZ(10px)' }}
          whileHover={{ scale: 1.1, rotateX: 5 }}
        >
          {currentSlide + 1} / {slides.length}
        </motion.div>
      </div>
    </div>
  );
}

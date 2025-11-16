import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import StatusBadge from "./StatusBadge";
import votingImage from "@assets/images/ucc 5.jpg";

interface CountdownTimerProps {
  targetDate: Date;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const calculateTimeLeft = () => {
    const difference = +targetDate - +new Date();
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  // Format the election date
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const month = targetDate.toLocaleDateString('en-US', { month: 'long' });
  const day = targetDate.getDate();
  const year = targetDate.getFullYear();
  const weekday = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="mb-16">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <Calendar className="h-6 w-6 text-primary/80" />
          <h2 className="text-3xl md:text-4xl font-bold font-serif text-foreground/90" data-testid="text-countdown-title">
            Elections Begin In
          </h2>
          <StatusBadge status="upcoming" />
        </div>
        <p className="text-muted-foreground/80 max-w-2xl mx-auto text-lg">
          Mark your calendar and prepare to make your voice heard
        </p>
      </div>

      {/* Glass Calendar Card */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 relative">
          {/* Soft overlay */}
          <div className="absolute inset-0 bg-white/10 pointer-events-none" />

          {/* Glass Calendar Header */}
          <div className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200/80 p-6 md:p-8 relative">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-foreground/60 mb-1">Election Date</div>
                <div className="text-2xl md:text-3xl font-bold text-foreground/90">{formatDate(targetDate)}</div>
              </div>
              <div className="flex items-center gap-2 text-foreground/70">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Countdown Timer</span>
              </div>
            </div>
          </div>

          {/* Glass Calendar Body */}
          <div className="p-6 md:p-8 relative">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Cylindrical Date & Time Display (Left) */}
              <div className="flex justify-center">
                <div className="relative flex flex-col items-center">
                  {/* Cylinder */}
                  <div className="bg-white/60 backdrop-blur-lg rounded-full px-10 py-10 md:px-12 md:py-12 border border-white/60 shadow-xl min-w-[220px] md:min-w-[260px]">
                    <div className="text-center">
                      <div className="text-xs md:text-sm font-semibold text-foreground/60 uppercase tracking-[0.2em] mb-3">
                        {month}
                      </div>
                      <div className="text-6xl md:text-7xl lg:text-8xl font-bold text-foreground/90 leading-none mb-3">
                        {day}
                      </div>
                      <div className="text-base md:text-lg font-medium text-foreground/80 mb-1">
                        {weekday}
                      </div>
                      <div className="text-sm md:text-base text-foreground/60">
                        {year}
                      </div>
                    </div>
                  </div>

                  {/* Details around cylinder: countdown badges */}
                  <div className="mt-5 grid grid-cols-2 gap-3 md:gap-4 max-w-xs">
                    <div className="bg-blue-500/20 backdrop-blur-md rounded-full px-4 py-3 border border-blue-400/40 text-center shadow-md">
                      <div className="text-xl md:text-2xl font-bold text-blue-800/90 tabular-nums" data-testid="text-countdown-days">
                        {timeLeft.days.toString().padStart(2, "0")}
                      </div>
                      <div className="text-[10px] md:text-xs font-semibold text-blue-700/80 tracking-wide uppercase">
                        Days
                      </div>
                    </div>
                    <div className="bg-red-500/20 backdrop-blur-md rounded-full px-4 py-3 border border-red-400/40 text-center shadow-md">
                      <div className="text-xl md:text-2xl font-bold text-red-800/90 tabular-nums" data-testid="text-countdown-hours">
                        {timeLeft.hours.toString().padStart(2, "0")}
                      </div>
                      <div className="text-[10px] md:text-xs font-semibold text-red-700/80 tracking-wide uppercase">
                        Hours
                      </div>
                    </div>
                    <div className="bg-yellow-400/25 backdrop-blur-md rounded-full px-4 py-3 border border-yellow-400/50 text-center shadow-md">
                      <div className="text-xl md:text-2xl font-bold text-yellow-800/90 tabular-nums" data-testid="text-countdown-minutes">
                        {timeLeft.minutes.toString().padStart(2, "0")}
                      </div>
                      <div className="text-[10px] md:text-xs font-semibold text-yellow-700/80 tracking-wide uppercase">
                        Minutes
                      </div>
                    </div>
                    <div className="bg-white/60 backdrop-blur-md rounded-full px-4 py-3 border border-gray-300/60 text-center shadow-md">
                      <div className="text-xl md:text-2xl font-bold text-foreground/90 tabular-nums" data-testid="text-countdown-seconds">
                        {timeLeft.seconds.toString().padStart(2, "0")}
                      </div>
                      <div className="text-[10px] md:text-xs font-semibold text-foreground/70 tracking-wide uppercase">
                        Seconds
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image with details (Right) */}
              <div className="flex items-stretch">
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white/70 border border-slate-200/80 shadow-xl backdrop-blur-md">
                  <img
                    src={votingImage}
                    alt="Student casting a secure vote"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-black/15" />

                  <div className="relative h-full flex flex-col justify-between p-6 md:p-7 lg:p-8 text-white">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 mb-2">
                        Secure & Transparent
                      </p>
                      <h3 className="text-xl md:text-2xl font-semibold font-serif leading-tight mb-3">
                        Every vote is counted,
                        <br className="hidden sm:block" />
                        every voice matters.
                      </h3>
                      <p className="text-xs md:text-sm text-white/80 max-w-sm">
                        Cast your ballot confidently knowing the Laboratory Technology elections
                        platform is designed for fairness, integrity and privacy.
                      </p>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 text-xs md:text-sm">
                      <div className="bg-white/15 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20">
                        <p className="font-semibold">Encrypted Votes</p>
                        <p className="text-white/75 text-[11px] md:text-xs">Your choices remain anonymous.</p>
                      </div>
                      <div className="bg-white/15 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20">
                        <p className="font-semibold">Live Monitoring</p>
                        <p className="text-white/75 text-[11px] md:text-xs">Results update in real-time.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-foreground/60 font-medium">
                Time remaining until election day
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

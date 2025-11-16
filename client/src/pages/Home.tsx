import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import CountdownTimer from "@/components/CountdownTimer";
import StatsSection from "@/components/StatsSection";
import HowToVoteSection from "@/components/HowToVoteSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

export default function Home() {
  const electionDate = new Date();
  electionDate.setDate(electionDate.getDate() + 7);

  const announcements = [
    {
      date: "Nov 15, 2025",
      title: "Candidate Registration Closed",
      message: "All candidates have been verified and approved for the upcoming elections.",
    },
    {
      date: "Nov 10, 2025",
      title: "Voting Platform Testing Complete",
      message: "Our secure voting platform has been thoroughly tested and is ready for use.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />

        <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CountdownTimer targetDate={electionDate} />
            <StatsSection />
          </div>
        </section>
        <HowToVoteSection />

        <section className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4" data-testid="text-announcements-title">
                Latest Updates
              </h2>
              <p className="text-muted-foreground">Stay informed about the election process</p>
            </div>

            <div className="grid gap-6 max-w-3xl mx-auto">
              {announcements.map((announcement, index) => (
                <Card key={index} className="hover-elevate">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg">
                        <AlertCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-serif" data-testid={`text-announcement-title-${index}`}>
                            {announcement.title}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span data-testid={`text-announcement-date-${index}`}>{announcement.date}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-announcement-message-${index}`}>
                      {announcement.message}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

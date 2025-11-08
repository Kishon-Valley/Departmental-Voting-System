import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VotingForm from "@/components/VotingForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock } from "lucide-react";
import { Link } from "wouter";
import candidate1 from "@assets/generated_images/Male_candidate_headshot_1_42ad3b40.png";
import candidate2 from "@assets/generated_images/Female_candidate_headshot_1_cd2490c7.png";
import candidate3 from "@assets/generated_images/Male_candidate_headshot_2_837b20e2.png";
import candidate4 from "@assets/generated_images/Female_candidate_headshot_2_b501a633.png";

export default function Vote() {
  const [votingComplete, setVotingComplete] = useState(false);

  const positions = [
    {
      id: "president",
      title: "President",
      candidates: [
        {
          id: "c1",
          name: "Kwame Mensah",
          photoUrl: candidate1,
          manifesto: "Committed to improving student welfare, enhancing academic resources, and creating a more inclusive department.",
        },
        {
          id: "c2",
          name: "Ama Asante",
          photoUrl: candidate2,
          manifesto: "Focused on transparency, accountability, and inclusive governance. Building a stronger community together.",
        },
      ],
    },
    {
      id: "vicepresident",
      title: "Vice President",
      candidates: [
        {
          id: "c3",
          name: "Kofi Adjei",
          photoUrl: candidate3,
          manifesto: "Dedicated to bridging the gap between students and administration. Your concerns are my priority.",
        },
        {
          id: "c4",
          name: "Abena Owusu",
          photoUrl: candidate4,
          manifesto: "Passionate about student engagement and creating opportunities for all to thrive academically.",
        },
      ],
    },
  ];

  const handleVoteSubmit = (votes: Record<string, string>) => {
    console.log("Final votes submitted:", votes);
    setVotingComplete(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!votingComplete ? (
            <>
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                  <h1 className="text-4xl md:text-5xl font-bold font-serif" data-testid="text-page-title">
                    Cast Your Vote
                  </h1>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
                  Review each candidate carefully and select your preferred choice for each position
                </p>
              </div>

              <div className="mb-8">
                <Card className="bg-accent/50 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-1">Secure Voting</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Your vote is encrypted and anonymous. Once submitted, votes cannot be changed. Please review carefully before confirming.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <VotingForm positions={positions} onSubmit={handleVoteSubmit} />
            </>
          ) : (
            <div className="max-w-2xl mx-auto text-center">
              <Card>
                <CardHeader>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-chart-2/10 text-chart-2 mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-2xl font-serif" data-testid="text-success-title">
                    Vote Submitted Successfully!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-success-message">
                    Thank you for participating in the department elections. Your vote has been recorded securely and anonymously.
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Confirmation ID</p>
                    <code className="text-xs bg-background px-3 py-1 rounded border" data-testid="text-confirmation-id">
                      VOTE-{Math.random().toString(36).substring(2, 10).toUpperCase()}
                    </code>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/results">
                      <Button variant="outline" data-testid="button-view-results">
                        View Results
                      </Button>
                    </Link>
                    <Link href="/">
                      <Button data-testid="button-back-home">
                        Back to Home
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

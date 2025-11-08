import { Card } from "@/components/ui/card";
import { UserCheck, Vote, CheckCircle2 } from "lucide-react";

export default function HowToVoteSection() {
  const steps = [
    {
      icon: UserCheck,
      title: "Login to Your Account",
      description: "Sign in with your student credentials to access the voting portal.",
    },
    {
      icon: Vote,
      title: "Review & Vote",
      description: "Review candidate manifestos and cast your vote for each position.",
    },
    {
      icon: CheckCircle2,
      title: "Confirm Submission",
      description: "Verify your choices and submit. You'll receive a confirmation receipt.",
    },
  ];

  return (
    <section className="py-16 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-serif mb-4" data-testid="text-how-to-vote-title">
            How to Vote
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-how-to-vote-subtitle">
            Follow these simple steps to cast your vote securely
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                <step.icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-3" data-testid={`text-step-title-${index}`}>
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-step-description-${index}`}>
                {step.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

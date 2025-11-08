import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  id: string;
  name: string;
  photoUrl: string;
  manifesto: string;
}

interface Position {
  id: string;
  title: string;
  candidates: Candidate[];
}

interface VotingFormProps {
  positions: Position[];
  onSubmit: (votes: Record<string, string>) => void;
}

export default function VotingForm({ positions, onSubmit }: VotingFormProps) {
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const { toast } = useToast();

  const currentPosition = positions[currentPositionIndex];
  const isLastPosition = currentPositionIndex === positions.length - 1;
  const hasVotedForCurrent = !!votes[currentPosition.id];

  const handleNext = () => {
    if (!hasVotedForCurrent) {
      toast({
        title: "Selection Required",
        description: "Please select a candidate before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (isLastPosition) {
      console.log("Votes submitted:", votes);
      onSubmit(votes);
    } else {
      setCurrentPositionIndex(currentPositionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Position {currentPositionIndex + 1} of {positions.length}
          </h3>
          <span className="text-sm text-muted-foreground">
            {Object.keys(votes).length}/{positions.length} voted
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentPositionIndex + 1) / positions.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-serif" data-testid="text-position-title">
            {currentPosition.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={votes[currentPosition.id]}
            onValueChange={(value) => setVotes({ ...votes, [currentPosition.id]: value })}
          >
            {currentPosition.candidates.map((candidate) => (
              <Card
                key={candidate.id}
                className={`hover-elevate cursor-pointer ${
                  votes[currentPosition.id] === candidate.id ? "border-primary" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <RadioGroupItem
                      value={candidate.id}
                      id={candidate.id}
                      className="mt-1"
                      data-testid={`radio-candidate-${candidate.id}`}
                    />
                    <div className="flex-1">
                      <Label htmlFor={candidate.id} className="cursor-pointer">
                        <div className="flex items-center gap-3 mb-2">
                          <img
                            src={candidate.photoUrl}
                            alt={candidate.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <h4 className="font-semibold" data-testid={`text-candidate-name-${candidate.id}`}>
                            {candidate.name}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed" data-testid={`text-candidate-manifesto-${candidate.id}`}>
                          {candidate.manifesto}
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </RadioGroup>

          <div className="flex justify-between gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentPositionIndex === 0}
              data-testid="button-previous"
            >
              Previous
            </Button>
            <Button onClick={handleNext} data-testid="button-next">
              {isLastPosition ? "Submit Votes" : "Next Position"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

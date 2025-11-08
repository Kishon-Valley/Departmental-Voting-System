import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export interface CandidateCardProps {
  id: string;
  name: string;
  position: string;
  photoUrl: string;
  manifestoSnippet: string;
}

export default function CandidateCard({
  id,
  name,
  position,
  photoUrl,
  manifestoSnippet,
}: CandidateCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate">
      <CardHeader className="p-0">
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
            data-testid={`img-candidate-${id}`}
          />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="mb-3">
          <h3 className="text-xl font-semibold font-serif mb-2" data-testid={`text-candidate-name-${id}`}>
            {name}
          </h3>
          <Badge variant="secondary" data-testid={`badge-position-${id}`}>
            {position}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed" data-testid={`text-manifesto-snippet-${id}`}>
          {manifestoSnippet}
        </p>
      </CardContent>
      <CardFooter className="p-6 pt-0">
        <Link href={`/candidate/${id}`}>
          <Button variant="outline" className="w-full" data-testid={`button-view-details-${id}`}>
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

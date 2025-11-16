import { useRoute, Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import candidate1 from "@assets/images/Male_candidate_headshot_1_42ad3b40.png";

export default function CandidateDetail() {
  const [, params] = useRoute("/candidate/:id");
  
  const candidate = {
    id: params?.id || "1",
    name: "Emmanuel Asante",
    position: "President",
    photoUrl: candidate1,
    bio: "A dedicated third-year student pursuing a degree in Laboratory Technology with a passion for scientific excellence and student leadership. I have served as class representative for two consecutive years and have been actively involved in various departmental initiatives.",
    manifesto: `
My vision for our Laboratory Technology department is built on three core pillars:

**1. Laboratory Excellence & Innovation**
- Advocate for state-of-the-art laboratory equipment and modern diagnostic tools
- Establish partnerships with leading hospitals and diagnostic centers
- Promote research opportunities in medical laboratory science
- Create a departmental innovation fund for student research projects

**2. Professional Development**
- Organize clinical training workshops and certification programs
- Strengthen industry connections for internship and job placements
- Invite guest speakers from renowned medical laboratories
- Establish mentorship programs with practicing laboratory professionals

**3. Student Welfare & Safety**
- Improve laboratory safety protocols and emergency procedures
- Enhance communication between students and faculty
- Create study groups for challenging courses like Clinical Chemistry and Microbiology
- Advocate for better student facilities and resources

Together, we can elevate our Laboratory Technology department to become a center of excellence in medical laboratory science. Your voice matters in shaping our professional future.
    `,
    experience: [
      "Class Representative (2023-2024, 2024-2025)",
      "Member, Laboratory Safety Committee",
      "Volunteer, Department Orientation Program",
      "Organizer, Medical Laboratory Science Symposium 2024",
      "Intern, Cape Coast Teaching Hospital Laboratory",
    ],
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/candidates">
            <Button variant="ghost" className="mb-6" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </Link>

          <Card className="mb-6">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0">
                  <img
                    src={candidate.photoUrl}
                    alt={candidate.name}
                    className="w-48 h-48 rounded-lg object-cover"
                    data-testid="img-candidate"
                  />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold font-serif mb-3" data-testid="text-candidate-name">
                    {candidate.name}
                  </h1>
                  <Badge className="mb-4" data-testid="badge-position">
                    Running for {candidate.position}
                  </Badge>
                  <p className="text-muted-foreground leading-relaxed" data-testid="text-bio">
                    {candidate.bio}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-serif">Manifesto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {candidate.manifesto.split('\n').map((paragraph, index) => {
                  if (paragraph.trim() === '') return null;
                  if (paragraph.startsWith('**')) {
                    const text = paragraph.replace(/\*\*/g, '');
                    return (
                      <h3 key={index} className="font-semibold text-lg mt-6 mb-3">
                        {text}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith('-')) {
                    return (
                      <li key={index} className="ml-6 mb-2 text-muted-foreground leading-relaxed">
                        {paragraph.substring(1).trim()}
                      </li>
                    );
                  }
                  return (
                    <p key={index} className="mb-4 text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Experience & Involvement</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {candidate.experience.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-muted-foreground" data-testid={`text-experience-${index}`}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="mt-8 flex justify-center">
            <Link href="/vote">
              <Button size="lg" data-testid="button-vote">
                Vote for this Candidate
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

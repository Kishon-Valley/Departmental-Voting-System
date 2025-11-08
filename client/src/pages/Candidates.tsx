import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CandidateCard from "@/components/CandidateCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import candidate1 from "@assets/generated_images/Male_candidate_headshot_1_42ad3b40.png";
import candidate2 from "@assets/generated_images/Female_candidate_headshot_1_cd2490c7.png";
import candidate3 from "@assets/generated_images/Male_candidate_headshot_2_837b20e2.png";
import candidate4 from "@assets/generated_images/Female_candidate_headshot_2_b501a633.png";
import candidate5 from "@assets/generated_images/Male_candidate_headshot_3_437e45ec.png";
import candidate6 from "@assets/generated_images/Female_candidate_headshot_3_55573e1d.png";

export default function Candidates() {
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const candidates = [
    {
      id: "1",
      name: "Kwame Mensah",
      position: "President",
      photoUrl: candidate1,
      manifestoSnippet: "Committed to improving student welfare, enhancing academic resources, and creating a more inclusive department for all students.",
    },
    {
      id: "2",
      name: "Ama Asante",
      position: "President",
      photoUrl: candidate2,
      manifestoSnippet: "Focused on transparency, accountability, and inclusive governance. Let's build a stronger community together.",
    },
    {
      id: "3",
      name: "Kofi Adjei",
      position: "Vice President",
      photoUrl: candidate3,
      manifestoSnippet: "Dedicated to bridging the gap between students and administration. Your concerns are my priority.",
    },
    {
      id: "4",
      name: "Abena Owusu",
      position: "Vice President",
      photoUrl: candidate4,
      manifestoSnippet: "Passionate about student engagement and creating opportunities for all to thrive academically and socially.",
    },
    {
      id: "5",
      name: "Yaw Boateng",
      position: "Secretary",
      photoUrl: candidate5,
      manifestoSnippet: "Organized, efficient, and committed to clear communication. I'll ensure your voices are heard and documented.",
    },
    {
      id: "6",
      name: "Akua Gyamfi",
      position: "Treasurer",
      photoUrl: candidate6,
      manifestoSnippet: "Financial transparency and responsible budget management. Every cedi will be accounted for.",
    },
  ];

  const positions = ["all", ...Array.from(new Set(candidates.map((c) => c.position)))];

  const filteredCandidates = candidates.filter((candidate) => {
    const matchesPosition = selectedPosition === "all" || candidate.position === selectedPosition;
    const matchesSearch = candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.manifestoSnippet.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4" data-testid="text-page-title">
              Meet the Candidates
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
              Learn about the candidates running for various positions in our department elections
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-position">
                <SelectValue placeholder="Filter by position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.slice(1).map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredCandidates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate.id} {...candidate} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground" data-testid="text-no-results">
                No candidates found matching your search criteria.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

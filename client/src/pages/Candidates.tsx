import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CandidateCard from "@/components/CandidateCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import candidate1 from "@assets/images/Male_candidate_headshot_1_42ad3b40.png";
import candidate2 from "@assets/images/Female_candidate_headshot_1_cd2490c7.png";
import candidate3 from "@assets/images/Male_candidate_headshot_2_837b20e2.png";
import candidate4 from "@assets/images/Female_candidate_headshot_2_b501a633.png";
import candidate5 from "@assets/images/Male_candidate_headshot_3_437e45ec.png";
import candidate6 from "@assets/images/Female_candidate_headshot_3_55573e1d.png";

export default function Candidates() {
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const candidates = [
    {
      id: "1",
      name: "Emmanuel Asante",
      position: "President",
      photoUrl: candidate1,
      manifestoSnippet: "Committed to advancing laboratory excellence, improving research facilities, and fostering innovation in medical laboratory science.",
    },
    {
      id: "2",
      name: "Priscilla Osei",
      position: "President",
      photoUrl: candidate2,
      manifestoSnippet: "Focused on bridging theory and practice, enhancing clinical training opportunities, and promoting professional development.",
    },
    {
      id: "3",
      name: "Samuel Boateng",
      position: "Vice President",
      photoUrl: candidate3,
      manifestoSnippet: "Dedicated to improving laboratory safety standards, modernizing equipment, and strengthening industry partnerships.",
    },
    {
      id: "4",
      name: "Grace Mensah",
      position: "Vice President",
      photoUrl: candidate4,
      manifestoSnippet: "Passionate about quality assurance in laboratory practices and creating pathways for research collaboration.",
    },
    {
      id: "5",
      name: "Daniel Oppong",
      position: "Secretary",
      photoUrl: candidate5,
      manifestoSnippet: "Organized and detail-oriented, committed to maintaining accurate records and facilitating clear communication.",
    },
    {
      id: "6",
      name: "Mercy Adjei",
      position: "Treasurer",
      photoUrl: candidate6,
      manifestoSnippet: "Financial accountability and transparent budget management for laboratory resources and student activities.",
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
              Learn about the candidates running for various positions in our Laboratory Technology department elections
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

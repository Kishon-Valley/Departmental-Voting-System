import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResultsChart from "@/components/ResultsChart";
import StatusBadge from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function Results() {
  const electionStatus = "active" as "upcoming" | "active" | "closed";
  
  const resultsData = [
    {
      positionTitle: "President",
      candidates: [
        { id: "c1", name: "Kwame Mensah", votes: 523, percentage: 58 },
        { id: "c2", name: "Ama Asante", votes: 377, percentage: 42 },
      ],
    },
    {
      positionTitle: "Vice President",
      candidates: [
        { id: "c3", name: "Kofi Adjei", votes: 412, percentage: 46 },
        { id: "c4", name: "Abena Owusu", votes: 488, percentage: 54 },
      ],
    },
    {
      positionTitle: "Secretary",
      candidates: [
        { id: "c5", name: "Yaw Boateng", votes: 654, percentage: 73 },
        { id: "c6", name: "Kwesi Appiah", votes: 246, percentage: 27 },
      ],
    },
    {
      positionTitle: "Treasurer",
      candidates: [
        { id: "c7", name: "Akua Gyamfi", votes: 501, percentage: 56 },
        { id: "c8", name: "Efua Mensah", votes: 399, percentage: 44 },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <h1 className="text-4xl md:text-5xl font-bold font-serif" data-testid="text-page-title">
                Election Results
              </h1>
              <StatusBadge status={electionStatus} />
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-page-subtitle">
              {electionStatus === "active" 
                ? "Live results updating in real-time as votes are counted"
                : electionStatus === "upcoming"
                ? "Results will be available once voting begins"
                : "Final results from the completed election"}
            </p>
          </div>

          {electionStatus === "active" && (
            <Card className="mb-8 bg-accent/50 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 justify-center">
                  <Clock className="h-5 w-5 text-primary animate-pulse" />
                  <p className="text-sm font-medium" data-testid="text-live-update">
                    Live Updates: Results are being updated as votes are counted
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {electionStatus === "upcoming" ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Results Not Yet Available</h3>
                <p className="text-muted-foreground">
                  Results will be published once the voting period has ended and all votes have been counted.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {resultsData.map((result, index) => (
                <ResultsChart
                  key={index}
                  positionTitle={result.positionTitle}
                  candidates={result.candidates}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import StudentConfirmationModal from "@/components/StudentConfirmationModal";
import Home from "@/pages/Home";
import Candidates from "@/pages/Candidates";
import CandidateDetail from "@/pages/CandidateDetail";
import Vote from "@/pages/Vote";
import Results from "@/pages/Results";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminElections from "@/pages/admin/AdminElections";
import AdminPositions from "@/pages/admin/AdminPositions";
import AdminCandidates from "@/pages/admin/AdminCandidates";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminVotes from "@/pages/admin/AdminVotes";
import AdminResults from "@/pages/admin/AdminResults";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/candidates" component={Candidates} />
      <Route path="/candidate/:id" component={CandidateDetail} />
      <Route path="/vote" component={Vote} />
      <Route path="/results" component={Results} />
      <Route path="/contact" component={Contact} />
      <Route path="/login" component={Login} />
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/elections" component={AdminElections} />
      <Route path="/admin/positions" component={AdminPositions} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/votes" component={AdminVotes} />
      <Route path="/admin/results" component={AdminResults} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { showConfirmationModal, pendingUser, confirmAndProceed, updateUser } = useAuth();

  return (
    <>
      <Router />
      {pendingUser && (
        <StudentConfirmationModal
          user={pendingUser}
          open={showConfirmationModal}
          onConfirm={confirmAndProceed}
          onUpdate={updateUser}
        />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </AdminProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

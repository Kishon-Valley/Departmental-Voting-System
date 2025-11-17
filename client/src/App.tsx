import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import StudentConfirmationModal from "@/components/StudentConfirmationModal";
import Home from "@/pages/Home";
import Candidates from "@/pages/Candidates";
import CandidateDetail from "@/pages/CandidateDetail";
import Vote from "@/pages/Vote";
import Results from "@/pages/Results";
import Contact from "@/pages/Contact";
import Login from "@/pages/Login";
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
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

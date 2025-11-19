import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

interface User {
  id: string;
  indexNumber: string;
  fullName: string;
  email?: string | null;
  year?: string | null;
  profilePicture?: string | null;
  hasVoted: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  showConfirmationModal: boolean;
  pendingUser: User | null;
  login: (indexNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  confirmAndProceed: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Fetch current user
  const {
    data: userData,
    isLoading,
    refetch: refetchUser,
  } = useQuery<{ user: User } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  const user = userData?.user ?? null;
  const isAuthenticated = !!user;

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { indexNumber: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: async (data) => {
      // Only show confirmation modal on first login (when email and year are both null/empty)
      const isFirstLogin = !data.user.email && !data.user.year;
      if (isFirstLogin) {
        setPendingUser(data.user);
        setShowConfirmationModal(true);
      } else {
        // User has already confirmed, wait for auth state to update before redirecting
        // This ensures the session cookie is properly set, especially in serverless environments
        try {
          // Wait for the auth query to refetch and confirm authentication
          await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
          // Additional delay to ensure cookie propagation in serverless environments like Vercel
          await new Promise(resolve => setTimeout(resolve, 200));
          setLocation("/");
        } catch (error) {
          // If refetch fails, still try to redirect (user might still be authenticated)
          console.error("Error refetching auth state:", error);
          setTimeout(() => {
            setLocation("/");
          }, 200);
        }
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout");
      return res.json();
    },
    onSuccess: () => {
      // Clear user data and close modal
      queryClient.setQueryData(["/api/auth/me"], null);
      setShowConfirmationModal(false);
      setPendingUser(null);
      setLocation("/login");
    },
  });

  const login = async (indexNumber: string, password: string) => {
    await loginMutation.mutateAsync({ indexNumber, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const confirmAndProceed = async () => {
    // Refetch user data and proceed to home
    try {
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      // Additional delay to ensure cookie propagation in serverless environments like Vercel
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error("Error refetching auth state:", error);
    }
    setShowConfirmationModal(false);
    setPendingUser(null);
    setLocation("/");
  };

  const updateUser = (updatedUser: Partial<User>) => {
    // Update pending user if modal is open, or update cached user data
    if (showConfirmationModal && pendingUser) {
      setPendingUser({ ...pendingUser, ...updatedUser });
    }
    // Also update the query cache
    queryClient.setQueryData(["/api/auth/me"], (old: { user: User } | null) => {
      if (!old) return old;
      return { user: { ...old.user, ...updatedUser } };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        showConfirmationModal,
        pendingUser,
        login,
        logout,
        confirmAndProceed,
        updateUser,
        refetchUser: () => refetchUser(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}


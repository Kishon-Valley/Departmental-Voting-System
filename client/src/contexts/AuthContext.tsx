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
    onSuccess: (data) => {
      // Show confirmation modal with user data instead of redirecting
      setPendingUser(data.user);
      setShowConfirmationModal(true);
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

  const confirmAndProceed = () => {
    // Refetch user data and proceed to home
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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


import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Users, 
  Vote, 
  UserCheck, 
  Calendar, 
  BarChart3, 
  Settings,
  Loader2,
  AlertCircle
} from "lucide-react";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminNavbar from "@/components/admin/AdminNavbar";

export default function AdminDashboard() {
  // Fetch statistics
  const { data: studentsData, isLoading: studentsLoading } = useQuery<{ students: Array<{ id: string }> }>({
    queryKey: ["/api/admin/students"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: votesData, isLoading: votesLoading } = useQuery<{ votes: Array<{ id: string }> }>({
    queryKey: ["/api/admin/votes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery<{ candidates: Array<{ id: string }> }>({
    queryKey: ["/api/candidates"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: positionsData, isLoading: positionsLoading } = useQuery<{ positions: Array<{ id: string }> }>({
    queryKey: ["/api/positions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: electionData } = useQuery<{ status: string }>({
    queryKey: ["/api/election/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const isLoading = studentsLoading || votesLoading || candidatesLoading || positionsLoading;

  const stats = {
    students: studentsData?.students?.length || 0,
    votes: votesData?.votes?.length || 0,
    candidates: candidatesData?.candidates?.length || 0,
    positions: positionsData?.positions?.length || 0,
    electionStatus: electionData?.status || "upcoming",
  };

  const quickActions = [
    {
      title: "Manage Elections",
      description: "Create and manage election settings",
      icon: Calendar,
      href: "/admin/elections",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Manage Positions",
      description: "Add, edit, or remove positions",
      icon: Settings,
      href: "/admin/positions",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    },
    {
      title: "Manage Candidates",
      description: "Add, edit, or remove candidates",
      icon: UserCheck,
      href: "/admin/candidates",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "View Students",
      description: "View and manage student accounts",
      icon: Users,
      href: "/admin/students",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    },
    {
      title: "View Votes",
      description: "View all submitted votes",
      icon: Vote,
      href: "/admin/votes",
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/20",
    },
    {
      title: "View Results",
      description: "View election results and statistics",
      icon: BarChart3,
      href: "/admin/results",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    },
  ];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-serif mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your voting system</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{stats.students}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                <Vote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{stats.votes}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Candidates</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold">{stats.candidates}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Election Status</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{stats.electionStatus}</div>
              </CardContent>
            </Card>
          </div>

          {/* Election Status Alert */}
          {stats.electionStatus === "upcoming" && (
            <Card className="mb-8 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                      Election Not Started
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      The election is currently in "upcoming" status. Activate it when ready to begin voting.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardContent className="p-6">
                        <div className={`w-12 h-12 rounded-lg ${action.bgColor} flex items-center justify-center mb-4`}>
                          <Icon className={`h-6 w-6 ${action.color}`} />
                        </div>
                        <h3 className="font-semibold mb-2">{action.title}</h3>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </AdminProtectedRoute>
  );
}


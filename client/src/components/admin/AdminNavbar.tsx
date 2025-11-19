import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, LayoutDashboard } from "lucide-react";
import { useAdmin } from "@/contexts/AdminContext";

export default function AdminNavbar() {
  const [location] = useLocation();
  const { admin, logout } = useAdmin();

  const navLinks = [
    { path: "/admin/dashboard", label: "Dashboard" },
    { path: "/admin/elections", label: "Elections" },
    { path: "/admin/positions", label: "Positions" },
    { path: "/admin/candidates", label: "Candidates" },
    { path: "/admin/students", label: "Students" },
    { path: "/admin/votes", label: "Votes" },
    { path: "/admin/results", label: "Results" },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1"
          >
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-xl font-serif font-semibold">Admin Panel</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.path) ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {admin && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {admin.username}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}


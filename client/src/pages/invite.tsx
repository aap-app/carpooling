import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Invite() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const code = params.code;

  useEffect(() => {
    if (isLoading) return;
    
    if (!code) {
      setLocation("/");
      return;
    }

    if (isAuthenticated) {
      setLocation(`/complete-invitation?code=${encodeURIComponent(code)}`);
    } else {
      window.location.href = `/api/login?invitation=true&code=${encodeURIComponent(code)}`;
    }
  }, [code, isAuthenticated, isLoading, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">
          {isLoading ? "Loading..." : isAuthenticated ? "Redirecting..." : "Redirecting to login..."}
        </p>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function Invite() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const code = params.code;

  useEffect(() => {
    if (code) {
      window.location.href = `/api/login?invitation=true&code=${encodeURIComponent(code)}`;
    } else {
      setLocation("/");
    }
  }, [code, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  );
}

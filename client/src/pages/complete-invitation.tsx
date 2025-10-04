import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CompleteInvitation() {
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const codeFromUrl = urlParams.get("code");
  
  const [invitationCode, setInvitationCode] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const validateCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/invitations/validate", { code });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome!",
        description: "Your account has been activated.",
      });
      setTimeout(() => window.location.href = "/", 1000);
    },
    onError: (error: any) => {
      let errorMessage = "Invalid or expired invitation code.";
      if (error?.message) {
        try {
          const match = error.message.match(/\d+:\s*(.+)/);
          if (match) {
            const jsonText = match[1];
            const errorData = JSON.parse(jsonText);
            errorMessage = errorData.message || errorMessage;
          }
        } catch (parseError) {
          errorMessage = error.message;
        }
      }
      toast({
        title: "Validation failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitationCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invitation code",
        variant: "destructive",
      });
      return;
    }
    validateCodeMutation.mutate(invitationCode.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 dark:bg-blue-500 rounded-full">
              <Key className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
          <CardDescription>
            Enter your invitation code to activate your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invitation-code">Invitation Code</Label>
              <Input
                id="invitation-code"
                placeholder="ABC123XYZ"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                data-testid="input-invitation-code"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={validateCodeMutation.isPending}
              data-testid="button-submit-invitation"
            >
              {validateCodeMutation.isPending ? "Validating..." : "Activate Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

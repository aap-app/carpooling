import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Plane, Users, Calendar, Car } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const invitationSignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  invitationCode: z.string().min(1, "Invitation code is required"),
});

type InvitationSignupForm = z.infer<typeof invitationSignupSchema>;

export default function Landing() {
  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InvitationSignupForm>({
    resolver: zodResolver(invitationSignupSchema),
    defaultValues: {
      name: "",
      email: "",
      invitationCode: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: InvitationSignupForm) => {
      const response = await apiRequest("POST", "/api/invitations/signup", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account created!",
        description: "Welcome! Redirecting...",
      });
      // Reload to refresh auth state
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      // Extract error message from response
      let errorMessage = "Failed to create account. Please check your invitation code.";
      
      if (error?.message) {
        // Error message format: "400: {json}" or "400: plain text"
        try {
          const match = error.message.match(/\d+:\s*(.+)/);
          if (match) {
            const jsonText = match[1];
            const errorData = JSON.parse(jsonText);
            errorMessage = errorData.message || errorMessage;
          }
        } catch (parseError) {
          // If JSON parsing fails, use the whole error message
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvitationSignupForm) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 dark:bg-blue-500 rounded-full">
              <Plane className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Airport Carpool Coordinator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Coordinate rides to the airport with your friends. Share costs, reduce carbon footprint, and travel together.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Log In to Get Started
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-px w-12 bg-gray-300 dark:bg-gray-600"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">or</span>
              <div className="h-px w-12 bg-gray-300 dark:bg-gray-600"></div>
            </div>
            <Button
              variant="outline"
              size="lg"
              className="text-base px-6 py-5"
              onClick={() => setIsInvitationDialogOpen(true)}
              data-testid="button-join-invitation"
            >
              Join by Invitation
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Calendar className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-center">Add Your Trip</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Enter your flight details including date, time, and flight number to let others know when you're traveling.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Users className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-center">Find Travel Buddies</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                See who else is traveling on the same day and coordinate carpools with friends heading to the airport.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Car className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-center">Share the Ride</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Split costs, reduce traffic, and enjoy the company. Update your status to booked, looking, or offering to share.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Join your travel community and make airport trips easier for everyone.
          </p>
        </div>
      </div>

      <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
        <DialogContent data-testid="dialog-invitation-signup">
          <DialogHeader>
            <DialogTitle>Join by Invitation</DialogTitle>
            <DialogDescription>
              Enter your details and invitation code to create an account.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Smith"
                        {...field}
                        data-testid="input-invitation-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        {...field}
                        data-testid="input-invitation-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invitationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invitation Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ABC123XYZ"
                        {...field}
                        data-testid="input-invitation-code"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInvitationDialogOpen(false)}
                  data-testid="button-cancel-invitation"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={signupMutation.isPending}
                  data-testid="button-submit-invitation"
                >
                  {signupMutation.isPending ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

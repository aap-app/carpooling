import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema, type InsertTrip } from "@shared/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, Clock, Plane, CheckCircle, Search, Users, Shield, RotateCcw, NotebookPen, X } from "lucide-react";
import type { Trip } from "@shared/schema";

export default function AddTrip() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [flightNumberInput, setFlightNumberInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch all trips to get flight number suggestions
  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const form = useForm<InsertTrip>({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      name: "",
      flightDate: "",
      flightTime: "",
      flightNumber: "",
      carStatus: "looking" as const,
    },
  });

  // Prefill name with user's name when component mounts
  useEffect(() => {
    if (user?.firstName || user?.lastName) {
      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      form.setValue("name", userName);
    }
  }, [user, form]);

  // Get smart sorted flight number suggestions
  const getFlightSuggestions = (input: string): string[] => {
    if (!input || input.length < 2) return [];
    
    const inputUpper = input.toUpperCase();
    const uniqueFlights = Array.from(new Set(trips.map(t => t.flightNumber.toUpperCase())));
    
    // Categorize flights
    const startsWith: string[] = [];
    const endsWith: string[] = [];
    const contains: string[] = [];
    
    uniqueFlights.forEach(flight => {
      if (flight === inputUpper) return; // Skip exact matches
      
      if (flight.startsWith(inputUpper)) {
        startsWith.push(flight);
      } else if (flight.endsWith(inputUpper)) {
        endsWith.push(flight);
      } else if (flight.includes(inputUpper)) {
        contains.push(flight);
      }
    });
    
    // Take max 3 from each category, max 7 total
    const suggestions: string[] = [];
    suggestions.push(...startsWith.slice(0, 3));
    
    const remaining = 7 - suggestions.length;
    if (remaining > 0) {
      suggestions.push(...endsWith.slice(0, Math.min(3, remaining)));
    }
    
    const remaining2 = 7 - suggestions.length;
    if (remaining2 > 0) {
      suggestions.push(...contains.slice(0, Math.min(3, remaining2)));
    }
    
    return suggestions;
  };

  const flightSuggestions = getFlightSuggestions(flightNumberInput);

  const createTripMutation = useMutation({
    mutationFn: async (data: InsertTrip) => {
      const response = await apiRequest("POST", "/api/trips", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trip added successfully!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add trip",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTrip) => {
    createTripMutation.mutate(data);
  };

  const clearForm = () => {
    form.reset();
    toast({
      title: "Form cleared",
      description: "All fields have been reset",
    });
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="max-w-2xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Add Your Flight Details</h2>
          <p className="text-muted-foreground">Share your flight information to find carpool opportunities</p>
        </div>

        {/* Trip Form Card */}
        <Card className="shadow-md">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...form.register("name")}
                    id="name"
                    className="pl-10" 
                    placeholder="Enter your name"
                    data-testid="input-name"
                  />
                </div>
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
                <p className="text-xs text-muted-foreground">This helps others identify who's traveling</p>
              </div>

              {/* Flight Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="flightDate" className="text-sm font-medium text-foreground">
                    Flight Date <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      {...form.register("flightDate")}
                      id="flightDate"
                      type="date" 
                      className="pl-10"
                      data-testid="input-flight-date"
                    />
                  </div>
                  {form.formState.errors.flightDate && (
                    <p className="text-xs text-destructive">{form.formState.errors.flightDate.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="flightTime" className="text-sm font-medium text-foreground">
                    Flight Time <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      {...form.register("flightTime")}
                      id="flightTime"
                      type="time" 
                      className="pl-10"
                      data-testid="input-flight-time"
                    />
                  </div>
                  {form.formState.errors.flightTime && (
                    <p className="text-xs text-destructive">{form.formState.errors.flightTime.message}</p>
                  )}
                </div>
              </div>

              {/* Flight Number */}
              <div className="space-y-2">
                <Label htmlFor="flightNumber" className="text-sm font-medium text-foreground">
                  Flight Number <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Plane className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    {...form.register("flightNumber")}
                    id="flightNumber"
                    className="pl-10 uppercase" 
                    placeholder="e.g., AA1234"
                    data-testid="input-flight-number"
                    value={flightNumberInput}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setFlightNumberInput(value);
                      form.setValue("flightNumber", value);
                      setShowSuggestions(value.length >= 2);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => setShowSuggestions(flightNumberInput.length >= 2)}
                  />
                  {showSuggestions && flightSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                      {flightSuggestions.map((flight, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => {
                            setFlightNumberInput(flight);
                            form.setValue("flightNumber", flight);
                            setShowSuggestions(false);
                          }}
                          data-testid={`suggestion-flight-${index}`}
                        >
                          {flight}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {form.formState.errors.flightNumber && (
                  <p className="text-xs text-destructive">{form.formState.errors.flightNumber.message}</p>
                )}
                <p className="text-xs text-muted-foreground">People with the same flight can easily carpool together</p>
              </div>

              {/* Car Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  Car Status <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "booked", icon: CheckCircle, label: "Booked", subtitle: "Car secured", color: "accent" },
                    { value: "looking", icon: Search, label: "Looking", subtitle: "Need a ride", color: "warning" },
                    { value: "sharing", icon: Users, label: "Sharing", subtitle: "Have a ride", color: "secondary" }
                  ].map(({ value, icon: Icon, label, subtitle, color }) => (
                    <Label 
                      key={value}
                      className="relative flex items-center p-4 border-2 border-border rounded-lg cursor-pointer transition-all hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <input 
                        {...form.register("carStatus")}
                        type="radio" 
                        value={value} 
                        className="sr-only"
                        data-testid={`radio-car-status-${value}`}
                      />
                      <div className="flex items-center space-x-3 w-full">
                        <div className={`flex-shrink-0 w-10 h-10 bg-${color}/10 rounded-full flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 text-${color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{label}</div>
                          <div className="text-xs text-muted-foreground">{subtitle}</div>
                        </div>
                      </div>
                    </Label>
                  ))}
                </div>
                {form.formState.errors.carStatus && (
                  <p className="text-xs text-destructive">{form.formState.errors.carStatus.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="outline" onClick={clearForm} data-testid="button-clear-form">
                  <X className="mr-2 h-4 w-4" />
                  Clear Form
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTripMutation.isPending}
                  data-testid="button-submit-trip"
                >
                  {createTripMutation.isPending ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <NotebookPen className="mr-2 h-4 w-4" />
                      Add Trip
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Shield className="text-accent text-xl" />
                <div>
                  <div className="font-medium text-sm">No Login Required</div>
                  <div className="text-xs text-muted-foreground">Quick and easy access</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Users className="text-secondary text-xl" />
                <div>
                  <div className="font-medium text-sm">Edit Anytime</div>
                  <div className="text-xs text-muted-foreground">Update your status freely</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <RotateCcw className="text-primary text-xl" />
                <div>
                  <div className="font-medium text-sm">Real-time Updates</div>
                  <div className="text-xs text-muted-foreground">See changes instantly</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

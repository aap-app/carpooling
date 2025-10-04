import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTripSchema, type InsertTrip, type Trip } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Search, Users, Ban, Save, Trash2 } from "lucide-react";

interface EditTripModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditTripModal({ trip, isOpen, onClose }: EditTripModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertTrip>({
    resolver: zodResolver(insertTripSchema),
    defaultValues: {
      name: "",
      flightDate: "",
      flightTime: "",
      flightNumber: "",
      carStatus: "looking",
    },
  });

  // Update form when trip changes
  useEffect(() => {
    if (trip) {
      form.reset({
        name: trip.name,
        flightDate: trip.flightDate,
        flightTime: trip.flightTime,
        flightNumber: trip.flightNumber,
        carStatus: trip.carStatus as "booked" | "looking" | "sharing" | "full",
      });
    }
  }, [trip, form]);

  const updateTripMutation = useMutation({
    mutationFn: async (data: InsertTrip) => {
      if (!trip) throw new Error("No trip to update");
      const response = await apiRequest("PUT", `/api/trips/${trip.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trip updated successfully!",
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update trip",
        variant: "destructive",
      });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async () => {
      if (!trip) throw new Error("No trip to delete");
      await apiRequest("DELETE", `/api/trips/${trip.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Trip deleted successfully!",
      });
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete trip",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTrip) => {
    updateTripMutation.mutate(data);
  };

  const onDelete = () => {
    if (confirm("Are you sure you want to delete this trip?")) {
      deleteTripMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-edit-trip">
        <DialogHeader>
          <DialogTitle>Edit Trip Details</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="editName">Name</Label>
            <Input 
              {...form.register("name")}
              id="editName"
              data-testid="input-edit-name"
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editFlightDate">Flight Date</Label>
              <Input 
                {...form.register("flightDate")}
                id="editFlightDate"
                type="date"
                data-testid="input-edit-flight-date"
              />
              {form.formState.errors.flightDate && (
                <p className="text-xs text-destructive">{form.formState.errors.flightDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFlightTime">Flight Time</Label>
              <Input 
                {...form.register("flightTime")}
                id="editFlightTime"
                type="time"
                data-testid="input-edit-flight-time"
              />
              {form.formState.errors.flightTime && (
                <p className="text-xs text-destructive">{form.formState.errors.flightTime.message}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editFlightNumber">Flight Number</Label>
            <Input 
              {...form.register("flightNumber")}
              id="editFlightNumber"
              className="uppercase"
              data-testid="input-edit-flight-number"
            />
            {form.formState.errors.flightNumber && (
              <p className="text-xs text-destructive">{form.formState.errors.flightNumber.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Car Status</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "booked", icon: Car, label: "Booked", color: "accent" },
                { value: "looking", icon: Search, label: "Looking", color: "warning" },
                { value: "sharing", icon: Users, label: "Found", color: "secondary" },
                { value: "full", icon: Ban, label: "Full", color: "destructive" }
              ].map(({ value, icon: Icon, label, color }) => (
                <Label 
                  key={value}
                  className="relative flex items-center justify-center p-3 border-2 border-border rounded-lg cursor-pointer transition-all hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input 
                    {...form.register("carStatus")}
                    type="radio" 
                    value={value} 
                    className="sr-only"
                    data-testid={`radio-edit-car-status-${value}`}
                  />
                  <div className="flex flex-col items-center">
                    <Icon className={`text-${color} h-5 w-5 mb-1`} />
                    <div className="text-xs font-medium">{label}</div>
                  </div>
                </Label>
              ))}
            </div>
            {form.formState.errors.carStatus && (
              <p className="text-xs text-destructive">{form.formState.errors.carStatus.message}</p>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              disabled={deleteTripMutation.isPending}
              data-testid="button-delete-trip"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Trip
            </Button>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateTripMutation.isPending}
                data-testid="button-save-trip"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

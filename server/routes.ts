import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Auth routes - NOT protected, returns null for unauthenticated users
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Return null if not authenticated
      if (!req.isAuthenticated() || !req.user?.claims?.sub) {
        return res.json(null);
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user || null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get all trips (protected)
  app.get("/api/trips", isAuthenticated, async (_req, res) => {
    try {
      const trips = await storage.getAllTrips();
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  // Get trip by ID (protected)
  app.get("/api/trips/:id", isAuthenticated, async (req, res) => {
    try {
      const trip = await storage.getTripById(req.params.id);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trip" });
    }
  });

  // Create new trip (protected)
  app.post("/api/trips", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(validatedData);
      res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      console.error("Error creating trip:", error);
      res.status(500).json({ message: "Failed to create trip", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update trip (protected)
  app.put("/api/trips/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTripSchema.partial().parse(req.body);
      const trip = await storage.updateTrip(req.params.id, validatedData);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error",
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update trip" });
    }
  });

  // Delete trip (protected)
  app.delete("/api/trips/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deleteTrip(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Trip not found" });
      }
      res.json({ message: "Trip deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete trip" });
    }
  });

  // Export trips as CSV (protected)
  app.get("/api/trips/export", isAuthenticated, async (_req, res) => {
    try {
      const trips = await storage.getAllTrips();
      
      // Create CSV content
      const headers = ["Name", "Flight Date", "Flight Time", "Flight Number", "Car Status"];
      const rows = trips.map(trip => [
        trip.name,
        trip.flightDate,
        trip.flightTime,
        trip.flightNumber,
        trip.carStatus
      ]);
      
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=airport-carpool.csv");
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting trips:", error);
      res.status(500).json({ message: "Failed to export trips" });
    }
  });

  // Import trips from CSV (protected) - replaces all existing data
  app.post("/api/trips/import", isAuthenticated, async (req, res) => {
    try {
      const trips = req.body;
      
      if (!Array.isArray(trips) || trips.length === 0) {
        return res.status(400).json({ message: "Invalid data: expected array of trips" });
      }

      // Validate all trips
      const validatedTrips = trips.map(trip => insertTripSchema.parse(trip));
      
      // Delete all existing trips and insert new ones
      await storage.deleteAllTrips();
      const createdTrips = await storage.createMultipleTrips(validatedTrips);
      
      res.json({ 
        message: "Import successful", 
        count: createdTrips.length 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error in CSV data",
          errors: error.errors 
        });
      }
      console.error("Error importing trips:", error);
      res.status(500).json({ message: "Failed to import trips" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

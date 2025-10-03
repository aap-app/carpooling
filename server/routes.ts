import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all trips
  app.get("/api/trips", async (_req, res) => {
    try {
      const trips = await storage.getAllTrips();
      res.json(trips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  // Get trip by ID
  app.get("/api/trips/:id", async (req, res) => {
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

  // Create new trip
  app.post("/api/trips", async (req, res) => {
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
      res.status(500).json({ message: "Failed to create trip" });
    }
  });

  // Update trip
  app.put("/api/trips/:id", async (req, res) => {
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

  // Delete trip
  app.delete("/api/trips/:id", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}

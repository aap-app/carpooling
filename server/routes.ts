import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTripSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { nanoid } from "nanoid";

// Helper to generate random invitation code
function generateInvitationCode(): string {
  // Generate a random 12-character code (uppercase letters and numbers)
  return nanoid(12).toUpperCase();
}

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

  // Invitation signup (public) - create user with invitation code
  app.post("/api/invitations/signup", async (req: any, res) => {
    try {
      const signupSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email"),
        invitationCode: z.string().min(1, "Invitation code is required"),
      });

      const { name, email, invitationCode } = signupSchema.parse(req.body);

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Verify invitation code
      const invitation = await storage.getInvitationCodeByCode(invitationCode);
      if (!invitation) {
        return res.status(400).json({ message: "Invalid invitation code" });
      }

      // Check if code is revoked
      if (invitation.revokedAt) {
        return res.status(400).json({ message: "Invitation code has been revoked" });
      }

      // Check if code is expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation code has expired" });
      }

      // Check if code has reached max uses
      if (invitation.currentUses >= invitation.maxUses) {
        return res.status(400).json({ message: "Invitation code has reached maximum uses" });
      }

      // Split name into first and last name
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create user with invitation auth provider
      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        authProvider: "invitation",
      });

      // Increment invitation code usage
      await storage.incrementInvitationCodeUsage(invitation.id, newUser.id);

      // Log the user in by creating a session
      // Set expires_at to a far future date (invitation users don't have token expiry)
      const farFuture = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year from now
      req.login({ 
        claims: { sub: newUser.id, email: newUser.email },
        expires_at: farFuture,
      }, (err: any) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        res.status(201).json(newUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error creating user via invitation:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Validate invitation code for OAuth user (protected)
  app.post("/api/invitations/validate", isAuthenticated, async (req: any, res) => {
    try {
      const validateSchema = z.object({
        code: z.string().min(1, "Invitation code is required"),
      });

      const { code } = validateSchema.parse(req.body);

      // Get the current user from session
      const userId = req.user.claims.sub;
      
      // Verify invitation code
      const invitation = await storage.getInvitationCodeByCode(code);
      if (!invitation) {
        return res.status(400).json({ message: "Invalid invitation code" });
      }

      // Check if code is revoked
      if (invitation.revokedAt) {
        return res.status(400).json({ message: "Invitation code has been revoked" });
      }

      // Check if code is expired
      if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation code has expired" });
      }

      // Check if code has reached max uses
      if (invitation.currentUses >= invitation.maxUses) {
        return res.status(400).json({ message: "Invitation code has reached maximum uses" });
      }

      // Increment invitation code usage
      await storage.incrementInvitationCodeUsage(invitation.id, userId);

      // Clear the requires invitation flag from session
      delete (req.session as any).requiresInvitationCode;

      res.json({ message: "Invitation code validated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error validating invitation code:", error);
      res.status(500).json({ message: "Failed to validate invitation code" });
    }
  });

  // Admin: List all users (protected)
  app.get("/api/admin/users", isAuthenticated, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: List all invitation codes (protected)
  app.get("/api/admin/invitations", isAuthenticated, async (_req, res) => {
    try {
      const invitations = await storage.getAllInvitationCodes();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitation codes:", error);
      res.status(500).json({ message: "Failed to fetch invitation codes" });
    }
  });

  // Admin: Create new invitation code (protected)
  app.post("/api/admin/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const code = generateInvitationCode();

      // Parse request body with defaults
      const requestSchema = z.object({
        maxUses: z.number().int().positive().optional().default(1),
        expiresInHours: z.number().positive().optional().default(24),
      });

      const { maxUses, expiresInHours } = requestSchema.parse(req.body);

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const invitation = await storage.createInvitationCode({
        code,
        createdByUserId: userId,
        maxUses,
        expiresAt,
      });

      res.status(201).json(invitation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error creating invitation code:", error);
      res.status(500).json({ message: "Failed to create invitation code" });
    }
  });

  // Admin: Revoke invitation code (protected)
  app.delete("/api/admin/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const invitation = await storage.revokeInvitationCode(req.params.id);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation code not found" });
      }
      res.json({ message: "Invitation code revoked successfully", invitation });
    } catch (error) {
      console.error("Error revoking invitation code:", error);
      res.status(500).json({ message: "Failed to revoke invitation code" });
    }
  });

  // Admin: Get OAuth settings (protected)
  app.get("/api/admin/settings/oauth", isAuthenticated, async (_req, res) => {
    try {
      const setting = await storage.getSetting("oauth_restrictions");
      const restrictions = setting?.value || {
        allowedDomains: [],
        allowedGitHubOrgs: [],
      };
      res.json(restrictions);
    } catch (error) {
      console.error("Error fetching OAuth settings:", error);
      res.status(500).json({ message: "Failed to fetch OAuth settings" });
    }
  });

  // Admin: Update OAuth settings (protected)
  app.put("/api/admin/settings/oauth", isAuthenticated, async (req, res) => {
    try {
      const settingsSchema = z.object({
        allowedDomains: z.array(z.string()).optional().default([]),
        allowedGitHubOrgs: z.array(z.string()).optional().default([]),
      });

      const restrictions = settingsSchema.parse(req.body);
      
      const setting = await storage.setSetting("oauth_restrictions", restrictions);
      res.json(setting.value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error updating OAuth settings:", error);
      res.status(500).json({ message: "Failed to update OAuth settings" });
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
      
      // Helper function to escape CSV values per RFC 4180
      const escapeCSV = (value: string): string => {
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      
      // Create CSV content with proper escaping
      const headers = ["Name", "Flight Date", "Flight Time", "Flight Number", "Car Status"];
      const rows = trips.map(trip => [
        escapeCSV(trip.name),
        escapeCSV(trip.flightDate),
        escapeCSV(trip.flightTime),
        escapeCSV(trip.flightNumber),
        escapeCSV(trip.carStatus)
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

      // Validate ALL trips before making any changes to the database
      // This ensures we don't delete data if validation fails
      let validatedTrips;
      try {
        validatedTrips = trips.map(trip => insertTripSchema.parse(trip));
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Validation error in CSV data. No changes were made to the database.",
            errors: validationError.errors 
          });
        }
        throw validationError;
      }
      
      // Only proceed with deletion after all validation passes
      console.log(`Starting import: deleting existing trips and creating ${validatedTrips.length} new trips`);
      
      try {
        // Delete all existing trips
        const deletedCount = await storage.deleteAllTrips();
        console.log(`Deleted ${deletedCount} existing trips`);
        
        // Insert new trips
        const createdTrips = await storage.createMultipleTrips(validatedTrips);
        console.log(`Created ${createdTrips.length} new trips`);
        
        res.json({ 
          message: "Import successful", 
          count: createdTrips.length,
          deleted: deletedCount
        });
      } catch (dbError) {
        console.error("Database error during import:", dbError);
        // Note: If delete succeeded but insert failed, database may be empty
        // Users are warned about this in the UI confirmation dialog
        res.status(500).json({ 
          message: "Database error during import. Some data may have been lost. Please check your data and re-import if needed.",
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
    } catch (error) {
      console.error("Error importing trips:", error);
      res.status(500).json({ message: "Failed to import trips" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

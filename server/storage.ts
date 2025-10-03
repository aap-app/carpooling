import { type Trip, type InsertTrip, trips } from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  // Trip methods
  getAllTrips(): Promise<Trip[]>;
  getTripById(id: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
  }

  async getAllTrips(): Promise<Trip[]> {
    try {
      const result = await this.db
        .select()
        .from(trips)
        .orderBy(asc(trips.flightDate), asc(trips.flightTime));
      
      return result;
    } catch (error) {
      console.error("getAllTrips error:", error);
      throw error;
    }
  }

  async getTripById(id: string): Promise<Trip | undefined> {
    try {
      const result = await this.db
        .select()
        .from(trips)
        .where(eq(trips.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("getTripById error:", error);
      throw error;
    }
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    try {
      console.log("Creating trip with data:", insertTrip);
      const result = await this.db
        .insert(trips)
        .values(insertTrip)
        .returning();
      
      console.log("Created trip:", result[0]);
      return result[0];
    } catch (error) {
      console.error("createTrip error:", error);
      throw error;
    }
  }

  async updateTrip(id: string, updates: Partial<InsertTrip>): Promise<Trip | undefined> {
    try {
      const result = await this.db
        .update(trips)
        .set(updates)
        .where(eq(trips.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("updateTrip error:", error);
      throw error;
    }
  }

  async deleteTrip(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(trips)
        .where(eq(trips.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("deleteTrip error:", error);
      throw error;
    }
  }
}

export const storage = new DbStorage();

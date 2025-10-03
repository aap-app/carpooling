import { type Trip, type InsertTrip, trips, type User, type UpsertUser, users, type InvitationCode, type InsertInvitationCode, invitationCodes, type Setting, type InsertSetting, settings } from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, asc, isNull, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User methods for Replit Auth and invitation users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Trip methods
  getAllTrips(): Promise<Trip[]>;
  getTripById(id: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<boolean>;
  deleteAllTrips(): Promise<number>;
  createMultipleTrips(trips: InsertTrip[]): Promise<Trip[]>;
  
  // Invitation code methods
  createInvitationCode(code: InsertInvitationCode): Promise<InvitationCode>;
  getAllInvitationCodes(): Promise<InvitationCode[]>;
  getInvitationCodeByCode(code: string): Promise<InvitationCode | undefined>;
  revokeInvitationCode(id: string): Promise<InvitationCode | undefined>;
  incrementInvitationCodeUsage(id: string, usedByUserId: string): Promise<InvitationCode | undefined>;
  
  // Settings methods
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: any): Promise<Setting>;
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

  // User methods for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("getUser error:", error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("getUserByEmail error:", error);
      throw error;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const result = await this.db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("upsertUser error:", error);
      throw error;
    }
  }

  async createUser(userData: UpsertUser): Promise<User> {
    try {
      const result = await this.db
        .insert(users)
        .values(userData)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("createUser error:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt));
      
      return result;
    } catch (error) {
      console.error("getAllUsers error:", error);
      throw error;
    }
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

  async deleteAllTrips(): Promise<number> {
    try {
      const result = await this.db
        .delete(trips)
        .returning();
      
      console.log(`Deleted ${result.length} trips`);
      return result.length;
    } catch (error) {
      console.error("deleteAllTrips error:", error);
      throw error;
    }
  }

  async createMultipleTrips(tripsToCreate: InsertTrip[]): Promise<Trip[]> {
    try {
      console.log(`Creating ${tripsToCreate.length} trips`);
      const result = await this.db
        .insert(trips)
        .values(tripsToCreate)
        .returning();
      
      console.log(`Created ${result.length} trips`);
      return result;
    } catch (error) {
      console.error("createMultipleTrips error:", error);
      throw error;
    }
  }

  // Invitation code methods
  async createInvitationCode(codeData: InsertInvitationCode): Promise<InvitationCode> {
    try {
      const result = await this.db
        .insert(invitationCodes)
        .values(codeData)
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("createInvitationCode error:", error);
      throw error;
    }
  }

  async getAllInvitationCodes(): Promise<InvitationCode[]> {
    try {
      const result = await this.db
        .select()
        .from(invitationCodes)
        .orderBy(desc(invitationCodes.createdAt));
      
      return result;
    } catch (error) {
      console.error("getAllInvitationCodes error:", error);
      throw error;
    }
  }

  async getInvitationCodeByCode(code: string): Promise<InvitationCode | undefined> {
    try {
      const result = await this.db
        .select()
        .from(invitationCodes)
        .where(eq(invitationCodes.code, code))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("getInvitationCodeByCode error:", error);
      throw error;
    }
  }

  async revokeInvitationCode(id: string): Promise<InvitationCode | undefined> {
    try {
      const result = await this.db
        .update(invitationCodes)
        .set({ revokedAt: new Date() })
        .where(eq(invitationCodes.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("revokeInvitationCode error:", error);
      throw error;
    }
  }

  async incrementInvitationCodeUsage(id: string, usedByUserId: string): Promise<InvitationCode | undefined> {
    try {
      // Increment currentUses and set usedAt/usedByUserId for first use
      const code = await this.db
        .select()
        .from(invitationCodes)
        .where(eq(invitationCodes.id, id))
        .limit(1);
      
      if (!code[0]) return undefined;
      
      const isFirstUse = code[0].currentUses === 0;
      
      const result = await this.db
        .update(invitationCodes)
        .set({ 
          currentUses: sql`${invitationCodes.currentUses} + 1`,
          ...(isFirstUse ? {
            usedByUserId,
            usedAt: new Date()
          } : {})
        })
        .where(eq(invitationCodes.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("incrementInvitationCodeUsage error:", error);
      throw error;
    }
  }

  // Settings methods
  async getSetting(key: string): Promise<Setting | undefined> {
    try {
      const result = await this.db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error("getSetting error:", error);
      throw error;
    }
  }

  async setSetting(key: string, value: any): Promise<Setting> {
    try {
      const result = await this.db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return result[0];
    } catch (error) {
      console.error("setSetting error:", error);
      throw error;
    }
  }
}

export const storage = new DbStorage();

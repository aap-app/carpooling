import { type Trip, type InsertTrip } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Trip methods
  getAllTrips(): Promise<Trip[]>;
  getTripById(id: string): Promise<Trip | undefined>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<InsertTrip>): Promise<Trip | undefined>;
  deleteTrip(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private trips: Map<string, Trip>;

  constructor() {
    this.trips = new Map();
  }

  async getAllTrips(): Promise<Trip[]> {
    const trips = Array.from(this.trips.values());
    // Sort by flight date and time (earliest first)
    return trips.sort((a, b) => {
      const dateTimeA = new Date(`${a.flightDate}T${a.flightTime}`);
      const dateTimeB = new Date(`${b.flightDate}T${b.flightTime}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });
  }

  async getTripById(id: string): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = randomUUID();
    const trip: Trip = {
      ...insertTrip,
      id,
      createdAt: new Date(),
    };
    this.trips.set(id, trip);
    return trip;
  }

  async updateTrip(id: string, updates: Partial<InsertTrip>): Promise<Trip | undefined> {
    const existingTrip = this.trips.get(id);
    if (!existingTrip) {
      return undefined;
    }

    const updatedTrip: Trip = {
      ...existingTrip,
      ...updates,
    };
    this.trips.set(id, updatedTrip);
    return updatedTrip;
  }

  async deleteTrip(id: string): Promise<boolean> {
    return this.trips.delete(id);
  }
}

export const storage = new MemStorage();

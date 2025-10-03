import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  flightDate: text("flight_date").notNull(), // Store as ISO date string
  flightTime: text("flight_time").notNull(), // Store as HH:MM format
  flightNumber: text("flight_number").notNull(),
  carStatus: text("car_status").notNull(), // 'booked' | 'looking' | 'sharing'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
}).extend({
  flightDate: z.string().min(1, "Flight date is required"),
  flightTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  flightNumber: z.string().min(1, "Flight number is required").transform(val => val.toUpperCase()),
  carStatus: z.enum(["booked", "looking", "sharing"]),
  name: z.string().min(1, "Name is required"),
});

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

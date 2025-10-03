import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, integer } from "drizzle-orm/pg-core";
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

// User storage table for Replit Auth and invitation-based users
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  authProvider: varchar("auth_provider").notNull().default("oidc"), // 'oidc' or 'invitation'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Invitation codes table for invite-based signup
export const invitationCodes = pgTable("invitation_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").notNull().unique(),
  createdByUserId: varchar("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
  usedByUserId: varchar("used_by_user_id"),
  usedAt: timestamp("used_at"),
  maxUses: integer("max_uses").notNull().default(1),
  currentUses: integer("current_uses").notNull().default(0),
  expiresAt: timestamp("expires_at"),
});

export const insertInvitationCodeSchema = createInsertSchema(invitationCodes).omit({
  id: true,
  createdAt: true,
  revokedAt: true,
  usedByUserId: true,
  usedAt: true,
  currentUses: true,
});

export type InsertInvitationCode = z.infer<typeof insertInvitationCodeSchema>;
export type InvitationCode = typeof invitationCodes.$inferSelect;

// Settings table for app configuration
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;

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

# Airport Carpool Application

## Overview
This is a full-stack airport carpool coordination application built with Express.js, React, and PostgreSQL. The application enables users to create and manage airport trip listings, including flight details and car-sharing status. It supports both OAuth login (Replit Auth) and invitation-based signup. Authenticated users can add and view trips, and update their car-sharing preferences. The project aims to streamline airport carpool coordination, offering a robust and user-friendly platform.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework & Build System**: React with Vite for fast development and optimized builds, using TypeScript for type safety. Wouter handles client-side routing, displaying different content based on authentication status.
- **UI Framework**: Utilizes `shadcn/ui` components built on Radix UI primitives, styled with Tailwind CSS for a consistent "New York" design system.
- **State Management**: TanStack Query (React Query) manages server state with optimistic defaults. React Hook Form with Zod handles form state and validation. Local React hooks manage UI-specific state.
- **Data Flow Pattern**: Form submissions use mutations that invalidate relevant queries, triggering automatic data refetching. A centralized API handler manages requests, errors, and credentials, providing user feedback via toast notifications.

### Backend Architecture
- **Server Framework**: Express.js provides a RESTful API, with custom Vite integration for serving the frontend.
- **Authentication & Authorization**:
    - **Dual System**: Supports Replit Auth (OAuth) and invitation-based signup.
    - **Session Management**: PostgreSQL-backed sessions with 7-day TTL and secure cookies.
    - **Middleware**: `isAuthenticated` middleware protects routes and manages token refresh.
    - **Admin System**: Comprehensive admin/owner privilege system where a designated user ID (`ADMIN_USER_ID`) has elevated permissions for user and settings management. Admin access is enforced via `requireAdmin` middleware.
    - **OAuth Access Control**: Restricts OAuth logins by email domain and supports future GitHub organization restrictions, managed via an admin UI and stored in a settings table.
    - **Invitation System**: Invitation codes can be multi-use, have expiration times, and track usage.
- **API Structure**: Protected API endpoints for trips (CRUD, export/import CSV) and admin functionalities (user listing, invitation management, OAuth settings).
- **Request/Response Handling**: Zod schema validation for incoming requests, structured error responses, and request logging.
- **Storage Abstraction**: An `IStorage` interface allows flexible storage implementation (currently in-memory, designed for future database integration).

### Data Storage Solutions
- **Database Configuration**: Drizzle ORM for type-safe PostgreSQL interactions, using `@neondatabase/serverless` driver. Schema defined in `shared/schema.ts`.
- **Data Model**: Includes tables for Users (OAuth/invitation-based), Sessions, Invitation Codes (with `maxUses`, `currentUses`, `expiresAt`), Settings (key-value store for app-wide settings), and Trips (name, flight details, car status, timestamps).
- **Validation**: Drizzle-Zod integrates Zod schemas with the database schema for consistent validation.
- **Migration Strategy**: Drizzle Kit manages schema migrations.
- **Car Status**: Extended `carStatus` enum in the trips table to include "booked", "looking", "found" (formerly "sharing"), and "full", with corresponding UI updates.

## External Dependencies

**UI Component Libraries**
- Radix UI primitives
- Embla Carousel
- cmdk
- lucide-react

**Form & Validation**
- react-hook-form
- @hookform/resolvers
- zod
- drizzle-zod

**Styling & Theming**
- Tailwind CSS
- PostCSS
- class-variance-authority
- clsx
- tailwind-merge

**Date/Time Handling**
- date-fns

**Development Tools**
- @replit/vite-plugin-runtime-error-modal
- @replit/vite-plugin-cartographer
- tsx

**Authentication**
- passport
- passport-local
- openid-client
- express-session
- connect-pg-simple
- memoizee

**Database**
- @neondatabase/serverless
- drizzle-orm
- drizzle-kit

**Query & State**
- @tanstack/react-query

**Build Tools**
- vite
- esbuild
- @vitejs/plugin-react

**Utilities**
- nanoid
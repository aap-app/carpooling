# Airport Carpool Application

## Overview

This is a full-stack airport carpool coordination application built with Express.js, React, and PostgreSQL. The application allows users to create and manage airport trip listings, including flight details and car-sharing status. Users must log in with Replit Auth (supporting Google, GitHub, X, Apple, or email/password) to access the application. Once authenticated, users can add trips with flight information, view all trips sorted by date/time, and update their car-sharing preferences (booked, looking for rides, or offering to share).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React with Vite**: The frontend uses React with Vite as the build tool and development server, providing fast hot module replacement (HMR) and optimized production builds.
- **TypeScript**: Strict TypeScript configuration ensures type safety across the application.
- **Routing**: Uses Wouter for lightweight client-side routing with conditional rendering based on authentication state:
  - Unauthenticated users see landing page at `/`
  - Authenticated users have access to: `/` (home/add trip), `/add` (add trip), `/trips` (view all trips)

**UI Framework**
- **shadcn/ui Components**: Extensive use of Radix UI primitives wrapped in a customized component library (44+ UI components in the ui folder).
- **Tailwind CSS**: Utility-first CSS framework with custom theming using CSS variables for colors, spacing, and design tokens.
- **Design System**: "New York" style variant from shadcn/ui with neutral base color and comprehensive component coverage.

**State Management**
- **TanStack Query (React Query)**: Handles server state management, caching, and synchronization. Configured with optimistic defaults (no auto-refetch, infinite stale time).
- **React Hook Form**: Manages form state with Zod schema validation for type-safe form handling.
- **Local Component State**: React hooks for UI-specific state (modals, filters, sorting).

**Data Flow Pattern**
- Form submissions use mutations that invalidate queries on success, triggering automatic refetch of trip lists.
- Centralized API request handler with error handling and credential inclusion.
- Toast notifications for user feedback on actions.

### Backend Architecture

**Server Framework**
- **Express.js**: RESTful API server with middleware for JSON parsing, URL encoding, and request logging.
- **Custom Vite Integration**: Development mode serves frontend through Vite middleware; production serves static files.

**Authentication & Authorization**
- **Replit Auth Integration**: OpenID Connect provider supporting Google, GitHub, X, Apple, and email/password login
- **Session Management**: PostgreSQL-backed sessions with 7-day TTL, secure cookies (HTTPS in production)
- **Middleware**: `isAuthenticated` middleware protects trip routes, validates and refreshes tokens automatically
- **Auth Routes**:
  - `GET /api/login` - Initiates OAuth flow
  - `GET /api/callback` - OAuth callback handler
  - `GET /api/logout` - Logs out and clears session
  - `GET /api/auth/user` - Returns current user or null (public endpoint)

**API Structure**
- RESTful endpoints under `/api/trips` (all protected, require authentication):
  - `GET /api/trips` - List all trips
  - `GET /api/trips/:id` - Get single trip
  - `POST /api/trips` - Create trip
  - `PUT /api/trips/:id` - Update trip
  - `DELETE /api/trips/:id` - Delete trip

**Request/Response Handling**
- Zod schema validation on incoming requests
- Structured error responses with appropriate HTTP status codes
- Request logging middleware captures method, path, status, duration, and response preview

**Storage Abstraction**
- **IStorage Interface**: Defines contract for data operations, enabling easy switching between storage implementations.
- **MemStorage Implementation**: In-memory storage using Map for development/testing with automatic sorting by flight date/time.
- **Future Database Support**: Architecture supports swapping to database-backed storage without changing business logic.

### Data Storage Solutions

**Database Configuration**
- **Drizzle ORM**: Type-safe ORM configured for PostgreSQL with migrations in `/migrations` directory.
- **Neon Serverless**: Uses `@neondatabase/serverless` driver for PostgreSQL connectivity.
- **Schema Location**: Database schema defined in `shared/schema.ts` for type sharing between client and server.

**Data Model**
- **Users Table**: Stores user authentication data (id, email, firstName, lastName, profileImageUrl) synced from Replit Auth
- **Sessions Table**: Stores session data for authentication with PostgreSQL connect-pg-simple
- **Trips Table**: Single entity with fields for name, flight date/time, flight number, car status, and timestamps
- **Validation**: Drizzle-Zod integration generates Zod schemas from database schema for consistent validation
- **Type Generation**: TypeScript types inferred from schema for compile-time safety

**Migration Strategy**
- Drizzle Kit handles schema migrations with `npm run db:push` for development.
- Migration files stored in `/migrations` directory (generated but not committed to repository).

### External Dependencies

**UI Component Libraries**
- Radix UI primitives (accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, etc.)
- Embla Carousel for carousel functionality
- cmdk for command palette interfaces
- lucide-react for icon system

**Form & Validation**
- react-hook-form for form state management
- @hookform/resolvers for validation integration
- zod for runtime type validation
- drizzle-zod for schema-to-validation bridging

**Styling & Theming**
- Tailwind CSS with PostCSS
- class-variance-authority for component variants
- clsx and tailwind-merge for conditional class composition

**Date/Time Handling**
- date-fns for date manipulation and formatting

**Development Tools**
- @replit/vite-plugin-runtime-error-modal for error overlays
- @replit/vite-plugin-cartographer for code navigation
- tsx for TypeScript execution in development

**Authentication**
- passport for authentication middleware
- passport-local for local strategy
- openid-client for OpenID Connect (Replit Auth)
- express-session for session management
- connect-pg-simple for PostgreSQL session store
- memoizee for caching OIDC configuration

**Database**
- @neondatabase/serverless for PostgreSQL connections
- drizzle-orm for ORM functionality
- drizzle-kit for migrations

**Query & State**
- @tanstack/react-query for server state management

**Build Tools**
- vite for frontend bundling
- esbuild for server bundling in production
- @vitejs/plugin-react for React support
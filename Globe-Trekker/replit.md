# TrekMind Globe Explorer

## Overview

TrekMind is a 3D interactive globe visualization web application that displays clickable trek markers for famous hiking destinations worldwide. Users can explore the globe, click on trek markers to see detailed information about each trek including difficulty, duration, altitude, and distance. This is Phase 1 of the project focused on rendering, markers, and click interaction without backend functionality or authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom build script for production bundling
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Query (@tanstack/react-query) for server state, React useState for local UI state
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives with custom styling)
- **3D Visualization**: react-globe.gl with Three.js for the interactive globe

### Project Structure

```
client/           # Frontend React application
  src/
    components/   # React components including GlobeViewer, TrekDetailPanel
    components/ui/ # shadcn/ui component library
    data/         # Static trek data (treks.ts)
    hooks/        # Custom React hooks
    lib/          # Utility functions and query client
    pages/        # Page components (Home, not-found)
server/           # Express backend (minimal for Phase 1)
shared/           # Shared types and schemas between client/server
  schema.ts       # Zod schemas for trek data types
```

### Backend Architecture

- **Framework**: Express.js with TypeScript
- **Purpose**: Currently serves as a static file server for the built React app
- **Development**: Vite dev server with HMR for development mode
- **Production**: esbuild bundles server code, Vite builds client

### Data Layer

- **Database**: PostgreSQL configured via Drizzle ORM (DATABASE_URL environment variable required)
- **ORM**: Drizzle with Zod integration for schema validation
- **Current State**: Trek data is hardcoded in `client/src/data/treks.ts` for Phase 1
- **Schema Location**: `shared/schema.ts` defines TrekGlobeNode type with Zod validation

### Trek Data Model

Each trek includes: id, name, country, region, latitude, longitude, difficulty (Easy/Moderate/Hard/Extreme), days, maxAltitude, distanceKm, popularityScore

## External Dependencies

### Core Libraries
- **react-globe.gl**: 3D globe rendering with WebGL
- **three**: 3D graphics engine (peer dependency for react-globe.gl)
- **framer-motion**: Animation library for UI transitions

### Database & ORM
- **drizzle-orm**: TypeScript ORM for database operations
- **drizzle-kit**: Database migration and push tooling
- **pg**: PostgreSQL client
- **connect-pg-simple**: PostgreSQL session store

### UI Framework
- **@radix-ui/***: Headless UI component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production server build
- **@replit/vite-plugin-***: Replit-specific development plugins

### Globe Textures
- Loaded from unpkg.com CDN (no local assets required)
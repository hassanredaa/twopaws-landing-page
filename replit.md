# TwoPaws Pet App Landing Page

## Overview

This project is a modern, responsive marketing landing page for TwoPaws, a comprehensive mobile app for pet lovers in Egypt. The application is built using React, TypeScript, and Tailwind CSS with a Node.js/Express backend. It features a landing page designed to market the app, explain its features, and encourage user engagement through waitlist and newsletter signups.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Connect-pg-simple for PostgreSQL session storage
- **API Design**: RESTful API endpoints for waitlist and newsletter signups

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured via Neon Database)
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Strategy**: Drizzle Kit for database migrations
- **Schema Location**: Shared schema definitions in `/shared/schema.ts`

## Key Components

### Database Schema
The application uses three main tables:
- `users`: User authentication (username, password)
- `waitlist_signups`: Email collection for app waitlist
- `newsletter_signups`: Email collection for newsletter subscriptions

### UI Components
- Complete shadcn/ui component library implementation
- Custom styling with CSS variables for consistent theming
- Responsive design with mobile-first approach
- Form components with integrated validation

### API Endpoints
- `POST /api/waitlist`: Handles waitlist email signups
- `POST /api/newsletter`: Handles newsletter email subscriptions
- Error handling with proper HTTP status codes and user-friendly messages

## Data Flow

1. **User Interaction**: Users interact with forms on the landing page
2. **Form Validation**: Client-side validation using Zod schemas
3. **API Request**: TanStack Query manages API calls to Express endpoints
4. **Data Processing**: Express validates data and interacts with PostgreSQL via Drizzle ORM
5. **Response Handling**: Success/error states are managed and displayed to users
6. **State Updates**: UI updates reflect the current state of operations

## External Dependencies

### Core Framework Dependencies
- React ecosystem (React, React DOM, React Hook Form)
- Vite build tooling with TypeScript support
- Express.js for server-side API handling

### Database and ORM
- `@neondatabase/serverless`: Neon Database PostgreSQL driver
- `drizzle-orm`: Type-safe ORM for PostgreSQL
- `drizzle-kit`: Database migration and schema management tools

### UI and Styling
- Tailwind CSS for utility-first styling
- Radix UI primitives for accessible components
- Lucide React for consistent iconography
- Framer Motion for animations

### Validation and Forms
- Zod for schema validation
- React Hook Form for form management
- @hookform/resolvers for Zod integration

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` starts both client and server with hot reload
- **Database**: PostgreSQL 16 module configured in Replit
- **Port Configuration**: Server runs on port 5000, exposed on port 80

### Production Build
- **Build Process**: `npm run build` creates optimized production assets
- **Server Bundle**: ESBuild bundles server code for Node.js deployment
- **Asset Optimization**: Vite optimizes client-side assets
- **Deployment Target**: Configured for autoscale deployment on Replit

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Separate development and production configurations
- Module system using ES modules throughout the stack

### Key Architectural Decisions

1. **Monorepo Structure**: Client and server code in same repository with shared types and schemas
2. **Type Safety**: Full TypeScript implementation with shared type definitions
3. **Database-First Design**: Schema definitions drive both database structure and TypeScript types
4. **Component Library**: shadcn/ui provides consistent, accessible UI components
5. **Progressive Enhancement**: Forms work without JavaScript, enhanced with React
6. **Error Handling**: Comprehensive error handling at API and UI levels
7. **Validation Strategy**: Shared validation schemas between client and server
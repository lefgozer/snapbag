# Overview

This is a mobile-first loyalty rewards application called "Snapbag" that allows users to earn points by scanning QR codes on shopping bags and redeeming rewards. The system gamifies the shopping experience through seasonal points, lifetime XP, level progression, and a wheel of fortune feature. Users can verify their purchases through tracking numbers or receipt uploads to earn additional bonus points.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Full-Stack TypeScript Architecture
The application uses a monorepo structure with TypeScript throughout, featuring:
- **Client**: React SPA with Vite build system and mobile-optimized UI
- **Server**: Express.js REST API with TypeScript
- **Shared**: Common schemas and types between frontend and backend
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI System**: Radix UI primitives with shadcn/ui components and Tailwind CSS
- **State Management**: TanStack Query for server state with React hooks for local state
- **Routing**: Wouter for lightweight client-side routing
- **Mobile-First**: Responsive design optimized for mobile devices with bottom navigation

## Backend Architecture
- **API Structure**: RESTful Express.js server with middleware for logging and error handling
- **Database Layer**: Drizzle ORM with PostgreSQL using Neon serverless database
- **Authentication**: Replit Auth integration with session management
- **Security**: HMAC signature verification for QR codes and rate limiting for API endpoints

## Database Schema Design
The database uses PostgreSQL with the following key entities:
- **Users**: Core user profiles with points, XP, and level tracking
- **Snapbags**: Unique QR-coded bags with HMAC signatures for security
- **QR Scans**: Tracking of user interactions with bags
- **Transactions**: Point movements and reward activities
- **Verifications**: Purchase verification system for bonus points
- **Rewards & Partners**: Configurable reward system with partner integrations

## Points & Gamification System
- **Seasonal Points (SP)**: Quarterly points that reset, used for reward redemption
- **Lifetime XP (LXP)**: Permanent experience points that determine user level
- **Level Progression**: Unlocks multipliers and early access features
- **Wheel of Fortune**: Random reward system for user engagement
- **Verification Bonuses**: Higher rewards for verified purchases

## Security & Anti-Fraud Measures
- **HMAC Signatures**: QR codes include cryptographic signatures to prevent tampering
- **Rate Limiting**: API endpoints protected against abuse with configurable limits
- **Session Management**: Secure session handling with PostgreSQL session store
- **Unique Bag Tracking**: Prevents multiple scans of the same bag by the same user

# External Dependencies

## Authentication & Session Management
- **Replit Auth**: OpenID Connect integration for user authentication
- **connect-pg-simple**: PostgreSQL-based session storage for scalability

## Database & ORM
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Drizzle ORM**: Type-safe database operations with schema validation
- **Drizzle Kit**: Database migration and schema management tools

## UI & Styling
- **Radix UI**: Accessible, unstyled UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **shadcn/ui**: Pre-built component library built on Radix UI and Tailwind

## Development & Build Tools
- **Vite**: Fast build tool with HMR and optimized production builds
- **TypeScript**: Static typing across the entire application
- **React Hook Form**: Form validation with Zod schema integration
- **TanStack Query**: Server state management with caching and synchronization
# replit.md

## Overview

This is a CSV-based inventory reconciliation tool designed to help businesses manage stock across multiple sales channels (Amazon and Shopify). The application allows users to upload CSV files containing inventory data, automatically reconciles stock levels across channels, and provides low-stock alerts and consolidated reporting. It's built as a utility-focused productivity tool that prioritizes data clarity and efficiency over visual flair.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built with **React 18** using **TypeScript** and follows a component-based architecture:

- **Build System**: Vite for fast development and optimized production builds
- **UI Framework**: Shadcn/ui components with Radix UI primitives for accessibility
- **Styling**: Tailwind CSS with custom design system following Material Design principles
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

The frontend uses a clean folder structure with components organized by feature and reusable UI components in a dedicated directory. The design system implements both light and dark themes with careful attention to data readability.

### Backend Architecture
The server is built with **Express.js** and follows a RESTful API pattern:

- **Runtime**: Node.js with TypeScript and ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL (Neon serverless)
- **File Upload**: Multer for handling CSV file uploads with memory storage
- **CSV Processing**: Papa Parse for robust CSV parsing and validation
- **Session Management**: Built-in session handling for user state

The backend implements a clean separation of concerns with dedicated modules for routes, storage, and utilities. The storage layer uses an interface pattern that allows for easy testing and potential database switching.

### Data Storage Solutions
The application uses **PostgreSQL** as the primary database with the following schema design:

- **Products Table**: Stores product information with SKU, name, channel-specific quantities, and low-stock thresholds
- **CSV Uploads Table**: Tracks upload history, processing status, and metadata
- **Settings Table**: Manages global configuration like low-stock thresholds and notification preferences

Data is stored with JSONB fields for flexible channel information, allowing for easy addition of new sales channels without schema changes.

### CSV Processing Pipeline
The application implements a robust CSV processing workflow:

1. **File Validation**: Ensures only CSV files are accepted with size limits
2. **Header Normalization**: Automatically maps common header variations to standard fields
3. **Data Reconciliation**: Compares uploaded data against existing inventory
4. **Stock Level Updates**: Updates quantities and recalculates low-stock alerts
5. **Error Handling**: Provides detailed feedback on parsing errors or data issues

### Authentication and Authorization
Currently implements a session-based approach with plans for user management. The architecture supports future implementation of role-based access control for multi-user scenarios.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting for scalable data storage
- **Drizzle Kit**: Database migration and schema management tool

### Frontend Libraries
- **Radix UI**: Accessible component primitives for forms, dialogs, and interactive elements
- **Lucide React**: Icon library for consistent visual elements
- **TanStack Query**: Server state management and caching
- **Wouter**: Lightweight routing solution

### Backend Libraries
- **Papa Parse**: CSV parsing library with robust error handling
- **Multer**: File upload middleware for Express
- **Connect PG Simple**: PostgreSQL session store for Express sessions

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production builds

### Hosting and Deployment
- **Replit**: Development and hosting platform with integrated database provisioning
- **Node.js**: Runtime environment for the Express server
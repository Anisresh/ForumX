# Chat App

## Overview

A real-time chat application inspired by WhatsApp, built with a modern full-stack architecture. The application features instant messaging, user authentication, contact management, and real-time communication through WebSockets. It provides a familiar messaging interface with message bubbles, online status indicators, typing notifications, and message status tracking (sent/delivered/read).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Library**: Radix UI primitives with shadcn/ui components for accessible, customizable interface elements
- **Styling**: Tailwind CSS with custom design system following WhatsApp's visual patterns
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Real-time Communication**: WebSocket Server (ws library) for instant messaging and live features
- **API Design**: RESTful endpoints for user management, chat operations, and message handling
- **Session Management**: In-memory storage with connection tracking for real-time features
- **Development Integration**: Vite middleware integration for seamless full-stack development

### Data Storage Solutions
- **ORM**: Drizzle ORM for type-safe database operations and schema management
- **Database**: PostgreSQL configured for production use (Neon Database in cloud environments)
- **Schema Design**: Normalized tables for users, chats, and messages with proper relationships
- **Development Storage**: In-memory storage implementation for rapid prototyping and testing

### Authentication and Authorization
- **Authentication Method**: Simple username-based login system without complex password requirements
- **Session Persistence**: User state maintained through WebSocket connections
- **User Management**: Basic user creation and status tracking (online/offline/last seen)

### Real-time Features Architecture
- **WebSocket Management**: Custom WebSocketManager class handling connection lifecycle, reconnection, and message routing
- **Message Broadcasting**: Server-side connection tracking to route messages to specific users
- **Typing Indicators**: Real-time typing status with automatic timeout mechanisms
- **Online Presence**: Live user status updates and last-seen timestamps

### Design System
- **Color Palette**: WhatsApp-inspired green theme with comprehensive light/dark mode support
- **Typography**: Inter font family for modern, readable text rendering
- **Component Library**: Extensive set of reusable components (MessageBubble, ChatHeader, ContactItem, etc.)
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader compatibility through Radix UI

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Query for modern frontend development
- **Routing**: Wouter for lightweight client-side navigation
- **Form Handling**: React Hook Form with Zod resolvers for type-safe form validation

### Database and ORM
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect
- **Neon Database**: Serverless PostgreSQL for cloud deployment
- **Database Migrations**: Drizzle Kit for schema management and migrations

### UI and Styling
- **Radix UI**: Complete set of accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Class Variance Authority**: Type-safe component variant management
- **Lucide React**: Modern icon library for consistent iconography

### Real-time Communication
- **WebSocket (ws)**: Server-side WebSocket implementation for real-time messaging
- **Custom WebSocket Manager**: Client-side connection management with reconnection logic

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer for cross-browser compatibility
- **Replit Integration**: Development environment optimization and runtime error handling

### Utility Libraries
- **date-fns**: Modern date manipulation and formatting
- **clsx**: Conditional className utility for dynamic styling
- **nanoid**: URL-safe unique ID generation for entities
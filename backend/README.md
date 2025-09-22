# Sample Management System - Backend

Node.js + TypeScript backend for the Sample Management System, recreated from the original FastAPI version using modern libraries and methodologies.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Sample Management**: Full CRUD operations for samples with relationships
- **Database**: PostgreSQL with proper schemas and relationships
- **Security**: Helmet, CORS, rate limiting, input validation
- **TypeScript**: Full type safety throughout the application

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with pg driver
- **Authentication**: JWT with bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS, rate limiting

## Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Set up the database:
```bash
# Create the database
createdb samples_db

# Run the schema
psql -d samples_db -f database/schema.sql

# Seed with test data
psql -d samples_db -f database/seed.sql
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Samples
- `GET /api/samples` - List samples (paginated)
- `POST /api/samples` - Create new sample
- `GET /api/samples/:id` - Get sample by ID

## Default Users

The seed data includes these test users:

- **Admin**: admin@sample.com / admin123
- **User**: user@sample.com / user123

## Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=samples_db
DB_USER=postgres
DB_PASSWORD=password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Database Schema

The system manages:
- **Users** with role-based access (ADMIN, USER, COMMERCIAL)
- **Samples** with full tracking and relationships
- **Reference data**: Countries, Categories, Suppliers, Warehouses, Locations, Responsibles
- **Movements** for inventory tracking
- **Transfers** between countries

## API Security

- Rate limiting (100 requests per 15 minutes)
- CORS configured for frontend
- Helmet for security headers
- JWT authentication required for protected routes
- Input validation on all endpoints
- SQL injection prevention with parameterized queries
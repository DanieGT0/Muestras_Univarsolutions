# Sample Management System - Modern Stack

A complete rewrite of the sample management system using modern technologies and libraries. This project demonstrates a full-stack application with Node.js + TypeScript backend and React + shadcn/ui frontend.

## 🏗️ Architecture

This project is a modernized version of the original FastAPI sample management system, now built with:

### Backend (Node.js + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with raw SQL queries
- **Authentication**: JWT with bcryptjs
- **Validation**: express-validator
- **Security**: Helmet, CORS, rate limiting

### Frontend (React + TypeScript)
- **Framework**: React 18 with Vite
- **UI Library**: shadcn/ui components + Tailwind CSS
- **State Management**: Zustand for auth, TanStack Query for server state
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 1. Database Setup

```bash
# Create database
createdb samples_db

# Run schema
psql -d samples_db -f backend/database/schema.sql

# Seed with test data
psql -d samples_db -f backend/database/seed.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health

## 🔐 Test Users

The system comes with pre-configured test users:

- **Admin**: admin@sample.com / admin123
- **User**: user@sample.com / user123

## 📁 Project Structure

```
APP REACT/
├── backend/                 # Node.js + TypeScript backend
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth & validation middleware
│   │   ├── routes/          # Express routes
│   │   ├── config/          # Database & app configuration
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Application entry point
│   ├── database/            # SQL schemas and seeds
│   └── README.md
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── hooks/           # Custom hooks (auth store)
│   │   ├── lib/             # Utilities & API client
│   │   ├── types/           # TypeScript interfaces
│   │   └── App.tsx          # Main app component
│   └── README.md
└── README.md                # This file
```

## 🎯 Key Features

### Implemented
- ✅ Modern TypeScript stack (both frontend/backend)
- ✅ JWT Authentication with role-based access
- ✅ PostgreSQL database with comprehensive schema
- ✅ Sample listing with relationships and pagination
- ✅ Modern UI with shadcn/ui components
- ✅ Form validation with Zod
- ✅ API client with automatic token handling
- ✅ Responsive design with Tailwind CSS

### Database Schema
The system includes all tables from the original:
- Users with role-based access (ADMIN, USER, COMMERCIAL)
- Samples with full tracking (countries, categories, suppliers, etc.)
- Movements for inventory tracking
- Transfers between countries
- Reference data tables with relationships

### API Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/samples` - List samples (paginated)
- `POST /api/samples` - Create new sample
- `GET /api/samples/:id` - Get sample details

## 🛠️ Development

### Backend Commands
```bash
npm run dev      # Development with hot reload
npm run build    # Build for production
npm start        # Production server
```

### Frontend Commands
```bash
npm run dev      # Development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🔒 Security Features

- Rate limiting (100 req/15min per IP)
- CORS configuration
- Security headers with Helmet
- JWT token expiration
- Input validation and sanitization
- SQL injection prevention
- Password hashing with bcrypt

## 🎨 UI Components

Built with shadcn/ui for modern, accessible components:
- Forms with validation feedback
- Data tables with sorting/filtering
- Loading states and error handling
- Responsive navigation
- Modern card layouts
- Badge system for statuses

## 🌟 Modern Development Practices

- **Type Safety**: Full TypeScript coverage
- **Code Quality**: ESLint + Prettier (ready to configure)
- **Git Hooks**: Ready for pre-commit hooks
- **Environment Variables**: Separate configs for dev/prod
- **Error Handling**: Comprehensive error boundaries
- **Loading States**: Skeleton loaders and spinners
- **Responsive Design**: Mobile-first approach

## 📈 Next Steps

The foundation is complete and ready for:
- Additional CRUD operations (edit/delete samples)
- Movement tracking implementation
- Transfer system between countries
- Advanced filtering and search
- Export functionality
- Dashboard with charts
- Real-time notifications
- Advanced role permissions

## 🆚 Comparison with Original

| Feature | Original (FastAPI) | New (Node.js) |
|---------|-------------------|---------------|
| Backend | Python + FastAPI | Node.js + Express |
| Frontend | React + Chakra UI | React + shadcn/ui |
| Database | SQLModel + Alembic | PostgreSQL + raw SQL |
| Auth | FastAPI Security | JWT + bcryptjs |
| Validation | Pydantic | express-validator + Zod |
| API Client | OpenAPI generated | Axios with types |
| Styling | Chakra UI | Tailwind + shadcn/ui |

Both implementations provide the same core functionality with their respective ecosystem advantages.
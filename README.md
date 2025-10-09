# PrimeTrade.ai - Crypto Trading Strategies Platform

[![CI/CD Pipeline](https://github.com/yourusername/primetrade.ai/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/yourusername/primetrade.ai/actions)
[![codecov](https://codecov.io/gh/yourusername/primetrade.ai/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/primetrade.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive full-stack application for managing cryptocurrency trading strategies. Built with enterprise-level architecture, this platform demonstrates advanced software engineering practices suitable for a Backend Developer Intern position at PrimeTrade.ai.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization**: JWT-based authentication with refresh tokens, role-based access control (user/admin)
- **Trading Strategies Management**: Complete CRUD operations for cryptocurrency trading strategies
- **Real-time Data**: Redis caching for optimal performance
- **Admin Panel**: Strategy approval workflow with audit logging
- **Security First**: Comprehensive security measures including rate limiting, input validation, and SQL injection prevention

### Technical Excellence
- **Scalable Architecture**: Microservices-ready design with proper separation of concerns
- **Performance Optimized**: Redis caching, database indexing, and query optimization
- **Production Ready**: Docker containerization, CI/CD pipeline, and monitoring
- **Well Tested**: Comprehensive test suite with 70%+ code coverage
- **API Documentation**: Interactive Swagger/OpenAPI documentation

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript-like structure
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis for performance optimization
- **Authentication**: JWT with refresh token rotation
- **Validation**: Express-validator with Joi
- **Testing**: Jest with Supertest
- **Documentation**: Swagger/OpenAPI 3.0
- **Logging**: Winston with log rotation
- **Security**: Helmet, CORS, Rate limiting

### Frontend
- **Framework**: React 18 with modern hooks
- **Build Tool**: Vite for fast development
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Context API + React Query
- **Forms**: React Hook Form with validation
- **Notifications**: React Hot Toast
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios with interceptors

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Deployment**: Railway (Backend), Vercel (Frontend)
- **Monitoring**: Health checks and logging
- **Database Tools**: pgAdmin, Redis Commander

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/primetrade.ai.git
cd primetrade.ai
```

### 2. Environment Setup

**Backend Environment:**
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=primetrade_dev
DB_USER=postgres
DB_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret
ENABLE_REDIS_CACHING=true
```

**Frontend Environment:**
```bash
cd ../frontend
echo "REACT_APP_API_URL=http://localhost:5000/api/v1" > .env
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb primetrade_dev

# Or using Docker
docker run --name primetrade-postgres -e POSTGRES_DB=primetrade_dev -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
```

### 4. Install Dependencies & Start

**Option A: Manual Setup**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd ../frontend
npm install
npm run dev
```

**Option B: Docker Compose (Recommended)**
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api/docs
- **Health Check**: http://localhost:5000/health

## 📖 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/profile` | Get user profile |
| PUT | `/api/v1/auth/profile` | Update user profile |
| POST | `/api/v1/auth/logout` | User logout |

### Trading Strategies Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/strategies` | Get all public strategies |
| GET | `/api/v1/strategies/top` | Get top performing strategies |
| GET | `/api/v1/strategies/my` | Get user's strategies |
| GET | `/api/v1/strategies/:id` | Get strategy by ID |
| POST | `/api/v1/strategies` | Create new strategy |
| PUT | `/api/v1/strategies/:id` | Update strategy |
| DELETE | `/api/v1/strategies/:id` | Delete strategy |
| POST | `/api/v1/strategies/:id/submit` | Submit for approval |
| PUT | `/api/v1/strategies/:id/status` | Update status (Admin) |

### Sample Strategy Object

```json
{
  "id": "uuid",
  "name": "BTC Scalping Strategy",
  "description": "High-frequency trading strategy for Bitcoin",
  "riskLevel": "high",
  "category": "scalping",
  "targetAssets": ["BTC", "ETH"],
  "timeframe": "5m",
  "profitTarget": 2.5,
  "stopLoss": 1.0,
  "performanceMetrics": {
    "winRate": 65.5,
    "profitLoss": 15.2,
    "sharpeRatio": 1.8,
    "maxDrawdown": 8.3,
    "totalTrades": 150
  },
  "performanceScore": 78,
  "status": "approved",
  "isPublic": true,
  "creator": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

## 🔧 Development

### Database Migrations

```bash
# Run migrations
npm run migrate

# Undo migration
npm run migrate:undo

# Seed database
npm run seed
```

### Testing

```bash
# Backend tests
cd backend
npm test                # Run tests
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Frontend tests (when implemented)
cd frontend
npm test
```

### Code Quality

```bash
# Linting
npm run lint

# Format code (if configured)
npm run format
```

## 🏗 Architecture

### Backend Architecture

```
backend/
├── src/
│   ├── config/          # Database, Redis, Logger configuration
│   ├── controllers/     # Route handlers and business logic
│   ├── middleware/      # Authentication, validation, logging
│   ├── models/          # Sequelize models and associations
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic and external services
│   ├── utils/           # Helper functions and utilities
│   └── server.js        # Express server setup
├── tests/               # Test files
├── docs/                # API documentation
└── logs/                # Application logs
```

### Frontend Architecture

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── utils/           # Helper functions
│   └── App.jsx          # Main application component
├── public/              # Static assets
└── dist/                # Build output
```

### Database Schema

#### Users Table
- `id` (UUID, Primary Key)
- `firstName`, `lastName` (String)
- `email` (String, Unique)
- `password` (Hashed)
- `role` (Enum: user, admin)
- `isEmailVerified` (Boolean)
- Authentication fields (login attempts, locks, etc.)

#### Trading Strategies Table
- `id` (UUID, Primary Key)
- `name`, `description` (String)
- `riskLevel` (Enum: low, medium, high)
- `category` (Enum: scalping, day_trading, etc.)
- `targetAssets` (Array of strings)
- `timeframe` (Enum: 1m, 5m, 15m, etc.)
- `profitTarget`, `stopLoss` (Decimal)
- `performanceMetrics` (JSONB)
- `status` (Enum: draft, pending, approved, rejected)
- Audit fields (createdBy, approvedBy, timestamps)

## 🔐 Security Features

### Authentication & Authorization
- JWT tokens with refresh token rotation
- Password hashing with bcrypt (12 rounds)
- Account lockout after failed login attempts
- Role-based access control

### Input Validation & Sanitization
- Express-validator for request validation
- SQL injection prevention with parameterized queries
- XSS protection with proper encoding
- CORS configuration for frontend access

### Security Middleware
- Helmet.js for security headers
- Rate limiting by IP and user
- Request size limiting
- Security audit logging

### Data Protection
- Sensitive data exclusion from API responses
- Soft deletes with paranoid mode
- Audit logging for admin actions
- Environment variable management

## 📊 Performance Optimizations

### Caching Strategy
- Redis caching for frequently accessed data
- Cache invalidation on data updates
- Configurable cache TTL by data type

### Database Optimization
- Proper indexing on frequently queried fields
- Connection pooling with Sequelize
- Query optimization with includes and pagination

### Frontend Performance
- Code splitting with React Router
- Image optimization and lazy loading
- Bundle optimization with Vite
- Service worker for caching (future enhancement)

## 🚀 Deployment

### Production Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port
JWT_SECRET=production-secret-key
JWT_REFRESH_SECRET=production-refresh-secret
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend (.env):**
```env
REACT_APP_API_URL=https://your-backend-domain.com/api/v1
REACT_APP_ENV=production
```

### Deployment Commands

```bash
# Build for production
npm run build

# Docker deployment
docker-compose -f docker-compose.prod.yml up -d

# Manual deployment
npm start
```

### Health Checks

The application includes comprehensive health checks:

- **Backend**: `/health` endpoint with database and Redis connectivity
- **Database**: Connection pooling with health monitoring
- **Redis**: Connectivity and performance monitoring
- **Frontend**: Service availability checks

## 🔍 Monitoring & Logging

### Logging Strategy
- Winston logger with daily rotation
- Structured JSON logging
- Separate error and audit logs
- Log levels: error, warn, info, debug

### Monitoring
- Health check endpoints
- Performance metrics collection
- Error tracking and alerting
- Uptime monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow
- All PRs require passing tests
- Code coverage must be maintained above 70%
- Security audit must pass
- Code must be linted and formatted

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Enterprise Features Showcase

This application demonstrates enterprise-level development practices:

### Scalability
- **Microservices Ready**: Modular architecture for easy service separation
- **Database Scaling**: Connection pooling, indexing, and query optimization
- **Caching Layer**: Redis implementation for performance
- **Load Balancing**: Nginx configuration for production scaling

### Security
- **Authentication**: JWT with refresh tokens and secure storage
- **Authorization**: Role-based access control with audit logging
- **Input Validation**: Comprehensive validation and sanitization
- **Security Headers**: Helmet.js configuration for production

### Reliability
- **Error Handling**: Comprehensive error handling and logging
- **Health Checks**: Application and dependency health monitoring
- **Graceful Shutdown**: Proper cleanup on application termination
- **Data Integrity**: Soft deletes and audit trails

### Maintainability
- **Code Organization**: Clear separation of concerns and modularity
- **Documentation**: Comprehensive API documentation with Swagger
- **Testing**: High test coverage with integration tests
- **CI/CD**: Automated testing and deployment pipeline

### Performance
- **Caching**: Multi-level caching strategy with Redis
- **Database Optimization**: Indexing and query optimization
- **Frontend Performance**: Code splitting and bundle optimization
- **Monitoring**: Performance metrics and monitoring

---

Built with ❤️ for the PrimeTrade.ai Backend Developer Intern position.

**Demo Links:**
- **Frontend**: [https://primetrade-frontend.vercel.app](https://primetrade-frontend.vercel.app)
- **Backend API**: [https://primetrade-api.railway.app](https://primetrade-api.railway.app)
- **API Documentation**: [https://primetrade-api.railway.app/api/docs](https://primetrade-api.railway.app/api/docs)
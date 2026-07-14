# Node.js TypeScript Boilerplate

A production-ready Node.js boilerplate with TypeScript, Express, MongoDB, Redis, and comprehensive testing setup using a Test-Driven Development (TDD) approach.

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/boilerplate-node.git
cd boilerplate-node

# 2. Install dependencies
yarn install

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env as needed

# 4. Start the development server
yarn dev

# 5. Run tests
yarn test
```

---

## Tech Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Web Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Cache:** Redis with ioredis
- **Authentication:** JWT (Access & Refresh Tokens) + bcrypt + Cookies (HttpOnly)
- **Validation:** Zod for schema validation (Requests & Environment Variables)
- **Logging:** Winston + Morgan
- **Testing:** Jest with Supertest
- **Code Quality:** ESLint, Prettier, Husky, lint-staged
- **Process Manager:** PM2
- **Containerization:** Docker
- **Rate Limiting:** Express Rate Limit
- **AI Integration:** OpenAI SDK (configured for Gemini)

---

## Features

### User Management System

- **User Model:** MongoDB schema with secure password hashing using bcrypt
- **User Service:** Business logic layer with CRUD operations and validation
- **User Controllers:** RESTful API endpoints with proper status codes
- **Role-Based Access Control (RBAC):** 'admin' and 'user' roles
- **User Validation:** Zod schemas for request validation
- **User Routes:** Structured API routes with versioning

### Authentication & Authorization

- Secure registration and login
- JWT-based access and refresh tokens
- HttpOnly cookie for refresh token storage
- Role-Based Access Control (RBAC) for user permissions
- Middleware for authentication and authorization
- Logout endpoint clears refresh token cookie

### Logging System

- Winston logger with daily rotating log files
- Morgan HTTP request logging
- Separate error logs and combined logs
- Different log levels for development and production

### Database

- MongoDB integration with Mongoose
- Containerized database with Docker
- Environment-based configuration

### Redis

- Lazy ioredis client with explicit connection and shutdown helpers
- Application startup waits for Redis readiness before accepting traffic
- Fail-fast command behavior when Redis is unavailable
- Separate development, test, and production Docker configurations
- Password-protected, persistent Redis service in production

### Development Tools

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Husky for Git hooks
- Lint-staged for pre-commit checks

### AI Integration

- Utility function (`AIRequest.ts`) to interact with AI models via OpenAI SDK
- Configurable for different models (defaults to Gemini via compatible endpoint)

### Docker Support

- Multi-environment Docker compositions
- Production-ready Dockerfile
- Development and testing environments
- MongoDB and Redis container integration

---

## API Endpoints

### Authentication

```
POST /api/v1/auth/register   - Register a new user
POST /api/v1/auth/login      - Login user and get JWT token
POST /api/v1/auth/logout     - Logout user (clears refresh token cookie)
POST /api/v1/auth/refresh    - Refresh JWT tokens using refresh token cookie
GET /api/v1/auth/profile     - Get authenticated user's profile
```

### User Management

```
POST /api/v1/users           - Create a new user (Admin only)
GET /api/v1/users            - Get all users (Admin only, with filtering and pagination)
GET /api/v1/users/:userId    - Get a specific user (Admin or Owner)
PATCH /api/v1/users/:userId  - Update a user (Admin or Owner)
DELETE /api/v1/users/:userId - Delete a user (Admin only)
```

---

## Project Structure

```
.
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middlewares/      # Express middlewares
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── validations/      # Request validation schemas
│   ├── app.ts            # Express app setup
│   └── index.ts          # Application entry point
├── tests/
│   ├── integration/      # Integration tests
│   ├── unit/             # Unit tests
│   └── testEnv.ts        # Test environment setup
├── logs/                 # Application logs
├── Dockerfile            # Docker build file
├── docker-compose.*.yml  # Docker Compose files
├── .env.example          # Example environment variables
├── README.md             # Project documentation
└── ...                   # Other config and setup files
```

---

## Testing Philosophy

- **Test-Driven Development (TDD):**

  1. Write failing tests first
  2. Write minimal code to pass
  3. Refactor with tests green

- **Testing Layers:**

  - **Unit Tests:** Isolated modules (models, services, controllers, utils, middlewares)
  - **Integration Tests:** API endpoints, middleware chains, DB operations

- **Coverage:** High coverage for all business logic, error handling, and edge cases.

---

## Micro-commit Workflow

- **Atomic Commits:** Each logical change (feature, fix, refactor, test) is committed separately.
- **Conventional Commits:** Follows [Conventional Commits](https://www.conventionalcommits.org/) for clarity.
- **Pre-commit Hooks:** Husky + lint-staged enforce code quality before every commit.

---

## Error Handling

- **Custom Error Class (ApiError):** Status code, message, stack trace
- **Global Error Handler:** Centralized error processing, environment-based responses
- **Async Handler:** Catches promise rejections in route handlers
- **Not Found Handler:** 404 for undefined routes

---

## Input Validation & Sanitization

### Environment Variables

- Validated and sanitized using Zod schemas
- Type-safe and runtime-checked
- See `src/config/env.validation.ts` for all variables and defaults
- Redis uses `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, and `REDIS_DB`
- `REDIS_PASSWORD` may be empty locally but is required by the production Docker profile

### Request Validation

- Zod-based middleware for body, query, params, cookies
- Type-safe, detailed error messages, automatic parsing

---

## Available Scripts

- `yarn start` - Start production server with PM2
- `yarn dev` - Start development server with nodemon
- `yarn build` - Build TypeScript code
- `yarn test` - Run all tests
- `yarn test:watch` - Run tests in watch mode
- `yarn coverage` - Generate test coverage report
- `yarn lint` - Run ESLint
- `yarn format` - Run Prettier check
- `yarn docker:prod` - Run production Docker environment
- `yarn docker:dev` - Run development Docker environment
- `yarn docker:test` - Run test Docker environment

---

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/my-feature`)
3. Make your changes (with tests!)
4. Run `yarn lint` and `yarn test` before committing
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
6. Push your branch and open a Pull Request

---

## FAQ

**Q: How do I run tests?**  
A: `yarn test` for all tests, `yarn test:watch` for watch mode, `yarn coverage` for coverage.

**Q: How do I add a new environment variable?**  
A: Add it to `.env.example` and update `src/config/env.validation.ts` with a Zod schema.

**Q: How do I add a new API route?**  
A: Create a controller, add a route in `src/routes/v1/`, and add validation in `src/validations/`.

**Q: How do I use Docker for development?**  
A: `yarn docker:dev` spins up the app, MongoDB, and Redis in containers. MongoDB and Redis are exposed only on the local loopback interface.

**Q: How do I run the app locally without Docker?**

A: Start MongoDB and Redis locally, copy `.env.example` to `.env`, then run `yarn dev`. Redis defaults to `localhost:6379`.

**Q: How do I reset the database?**  
A: Stop the containers and remove the MongoDB volume, or use a test database for development.

---

## License

This project is licensed for non-commercial use. See the [LICENSE](LICENSE) file for the full terms.

## Author

Shuvrojit Biswas

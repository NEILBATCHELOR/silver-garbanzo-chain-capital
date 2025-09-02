# =============================================================================
# Chain Capital Development Makefile
# Unified commands for frontend + backend development
# =============================================================================

.PHONY: help install clean dev dev-frontend dev-backend build build-frontend build-backend test lint format db-generate db-migrate db-studio docker-up docker-down

# Default target
help: ## Show this help message
	@echo "Chain Capital Development Commands"
	@echo "=================================="
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# =============================================================================
# Development Setup
# =============================================================================

install: ## Install dependencies for both frontend and backend
	@echo "📦 Installing dependencies..."
	@cd frontend && pnpm install
	@cd backend && pnpm install
	@echo "✅ Dependencies installed successfully!"

clean: ## Clean node_modules and build artifacts
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf frontend/node_modules frontend/dist
	@rm -rf backend/node_modules backend/dist
	@echo "✅ Cleaned successfully!"

# =============================================================================
# Development
# =============================================================================

dev: ## Start both frontend and backend in development mode
	@echo "🚀 Starting full development environment..."
	@make -j2 dev-frontend dev-backend

dev-frontend: ## Start frontend development server
	@echo "🎨 Starting frontend (React + Vite)..."
	@cd frontend && pnpm dev

dev-backend: ## Start backend development server  
	@echo "⚡ Starting backend (Fastify + Prisma)..."
	@cd backend && node src/server-simple.js

# =============================================================================
# Build
# =============================================================================

build: build-frontend build-backend ## Build both frontend and backend

build-frontend: ## Build frontend for production
	@echo "📦 Building frontend..."
	@cd frontend && pnpm build
	@echo "✅ Frontend built successfully!"

build-backend: ## Build backend for production
	@echo "📦 Building backend..."
	@cd backend && pnpm build
	@echo "✅ Backend built successfully!"

# =============================================================================
# Testing
# =============================================================================

test: ## Run tests for both services
	@echo "🧪 Running tests..."
	@cd frontend && pnpm test --run
	@cd backend && pnpm test
	@echo "✅ Tests completed!"

test-frontend: ## Run frontend tests only
	@cd frontend && pnpm test

test-backend: ## Run backend tests only
	@cd backend && pnpm test

# =============================================================================
# Code Quality
# =============================================================================

lint: ## Lint code in both services
	@echo "🔍 Linting code..."
	@cd frontend && pnpm lint
	@cd backend && pnpm lint
	@echo "✅ Linting completed!"

format: ## Format code in both services
	@echo "🎨 Formatting code..."
	@cd frontend && pnpm format
	@cd backend && pnpm format
	@echo "✅ Code formatted successfully!"

# =============================================================================
# Database Operations
# =============================================================================

db-generate: ## Generate Prisma client
	@echo "🗄️ Generating Prisma client..."
	@cd backend && pnpm db:generate
	@echo "✅ Prisma client generated!"

db-migrate: ## Run database migrations
	@echo "🗄️ Running database migrations..."
	@cd backend && pnpm db:migrate
	@echo "✅ Migrations completed!"

db-studio: ## Open Prisma Studio
	@echo "🎛️ Opening Prisma Studio..."
	@cd backend && pnpm db:studio

db-reset: ## Reset database (WARNING: Deletes all data)
	@echo "⚠️ Resetting database..."
	@cd backend && pnpm db:reset

# =============================================================================
# Docker Operations
# =============================================================================

docker-up: ## Start all services with Docker Compose
	@echo "🐳 Starting services with Docker..."
	@docker-compose up -d
	@echo "✅ Services started! Frontend: http://localhost:5173, Backend: http://localhost:3002"

docker-down: ## Stop all Docker services
	@echo "🐳 Stopping Docker services..."
	@docker-compose down
	@echo "✅ Services stopped!"

docker-build: ## Build Docker images
	@echo "🐳 Building Docker images..."
	@docker-compose build
	@echo "✅ Images built successfully!"

# =============================================================================
# Utility Commands
# =============================================================================

status: ## Show status of all services
	@echo "📊 Service Status"
	@echo "================"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:3002"
	@echo "Backend Health: http://localhost:3002/health"
	@echo "API Docs: http://localhost:3002/docs (if enabled)"

logs-frontend: ## Follow frontend logs
	@cd frontend && pnpm dev 2>&1 | grep -v "node_modules"

logs-backend: ## Follow backend logs
	@cd backend && pnpm dev 2>&1 | grep -v "node_modules"

# =============================================================================
# Production Commands
# =============================================================================

deploy-check: build test ## Run all checks before deployment
	@echo "✅ Deployment checks passed!"

start-prod: ## Start production servers
	@echo "🚀 Starting production servers..."
	@cd frontend && pnpm preview &
	@cd backend && pnpm start &
	@echo "✅ Production servers started!"

# =============================================================================
# Development Shortcuts
# =============================================================================

fresh: clean install dev ## Fresh start: clean, install, and start development

quick-test: ## Quick test run
	@cd frontend && pnpm test --run --reporter=basic
	@cd backend && pnpm test --silent

health-check: ## Check if services are running
	@echo "🏥 Health Check"
	@echo "=============="
	@curl -s http://localhost:3002/health | jq || echo "❌ Backend not responding"
	@curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend responding" || echo "❌ Frontend not responding"

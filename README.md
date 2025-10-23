# SoliLoan - Direct Credit Management Platform

A modern Next.js application for managing direct credit (Direktkredit) operations, built with TypeScript, Prisma, and Docker.

## 🚀 Quick Start - Development Setup

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **pnpm** (version 8.0 or higher) - [Installation Guide](https://pnpm.io/installation)
- **Node.js** (version 20 or higher) - Required for local development tools

### Step-by-Step Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd soliloan
```

#### 2. Environment Configuration

Create your environment file from the example:

```bash
cp .env.example .env
```

#### 3. Configure Environment Variables

Edit the `.env` file and update the following variables with your actual values:

**Required Configuration:**
- `POSTGRES_PASSWORD`: Set a secure password for your PostgreSQL database
- `NEXTAUTH_SECRET`: Generate a secure secret key (you can use `openssl rand -base64 32`)
- `SOLILOAN_DOMAIN`: Your domain name
- `SOLILOAN_PROJECT_NAME`: Your project name
- `SOLILOAN_ADMIN_EMAIL`: Admin user email
- `SOLILOAN_ADMIN_PASSWORD`: Admin user password

**SMTP Configuration (for email functionality):**
- `SMTP_HOST`: Your SMTP server host
- `SMTP_PORT`: SMTP port (usually 587 for TLS)
- `SMTP_USER`: Your email username
- `SMTP_PASSWORD`: Your email password or app-specific password
- `SMTP_FROM`: Sender email address

#### 4. Start the Development Environment

Use the provided Docker Compose command to start all services:

```bash
pnpm docker:dev up
```

This command will:
- Build the Next.js application
- Start PostgreSQL database
- Start Traefik reverse proxy
- Run database migrations
- Seed the database with initial data
- Start the development server

#### 5. Access the Application

Once all services are running, you can access:

- **Application**: https://soliloan.localhost
- **Traefik Dashboard**: http://localhost:8080 (for debugging routing)

> **Note**: Make sure to add `soliloan.localhost` to your `/etc/hosts` file:
> ```
> 127.0.0.1 soliloan.localhost
> ```

### Development Workflow

#### Available Commands

```bash
# Start development environment
pnpm docker:dev up

# Start in background (detached mode)
pnpm docker:dev up -d

# View logs
pnpm docker:dev logs -f

# Stop all services
pnpm docker:dev down

# Rebuild and start (useful after dependency changes)
pnpm docker:dev up --build

# Access application container shell
pnpm docker:dev exec app sh
```

#### Database Operations

The development setup automatically handles:
- Database schema migrations via Prisma
- Database seeding with initial data
- Hot reloading of database changes

For manual database operations:

```bash
# Access database directly
pnpm docker:dev exec postgres psql -U postgres -d soliloan

# Run Prisma commands inside container
pnpm docker:dev exec app pnpm prisma studio
pnpm docker:dev exec app pnpm prisma db push
pnpm docker:dev exec app pnpm prisma db seed
```

### Architecture Overview

The development environment consists of three main services:

#### 1. Application Service (`app`)
- **Base Image**: Node.js 20 with pnpm
- **Port**: 3000 (internal)
- **Features**: 
  - Hot reloading with Turbopack
  - Volume mounting for live code changes
  - Automatic dependency installation
  - Database migration and seeding

#### 2. PostgreSQL Database (`postgres`)
- **Image**: Official PostgreSQL
- **Port**: 5432 (exposed for direct access)
- **Features**:
  - Persistent data storage
  - Development-optimized configuration

#### 3. Traefik Reverse Proxy (`traefik`)
- **Image**: Traefik v2.11.2
- **Ports**: 80, 443, 8080
- **Features**:
  - Automatic HTTPS with self-signed certificates
  - Load balancing
  - Development dashboard

### Troubleshooting

#### Common Issues

**1. Port Conflicts**
If you encounter port conflicts, check what's running on ports 80, 443, 5432, or 8080:
```bash
sudo lsof -i :80
sudo lsof -i :5432
```

**2. Database Connection Issues**
Ensure PostgreSQL is fully started before the application:
```bash
pnpm docker:dev logs postgres
```

**3. Permission Issues**
If you encounter permission issues with Docker volumes:
```bash
sudo chown -R $USER:$USER .
```

**4. SSL Certificate Issues**
For local development, the application uses self-signed certificates. You may need to:
- Accept the certificate in your browser
- Add `soliloan.localhost` to your hosts file

#### Reset Development Environment

To completely reset your development environment:

```bash
# Stop and remove all containers, networks, and volumes
pnpm docker:dev down -v

# Remove any local changes to node_modules
rm -rf node_modules

# Restart fresh
pnpm docker:dev up --build
```

### Production Deployment

This setup is optimized for development. For production deployment, refer to the staging configuration in `docker/compose.staging.yml` and ensure:

- Use production-grade secrets
- Configure proper SSL certificates
- Set up monitoring and logging
- Use external database services
- Configure proper backup strategies

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with the development environment
5. Submit a pull request

### Support

For issues and questions:
- Check the troubleshooting section above
- Review Docker and application logs
- Create an issue in the repository

---

**Happy coding! 🎉**
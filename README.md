<<<<<<< HEAD
# plotfire
New era of learning
=======
# Postply - Educational Platform

Postply is a modern educational platform that connects students and teachers. The platform allows teachers to create classes, upload materials, and interact with students through a Q&A system.

## Architecture

This project follows a microservices architecture pattern with:

- **Frontend**: React with TypeScript and Material-UI
- **Backend**: Node.js with NestJS framework
- **Database**: PostgreSQL (separate instances per service)
- **API Gateway**: For inter-service communication
- **Containerization**: Docker
- **Orchestration**: Kubernetes

## Project Structure

```
postply/
├── apps/                         # All microservices
│   ├── frontend/                 # React web application
│   ├── api-gateway/              # API Gateway service
│   ├── auth-service/             # Authentication & user management
│   ├── class-service/            # Class management
│   ├── content-service/          # Class content & materials
│   ├── enrollment-service/       # Student enrollment management
│   ├── qa-service/               # Questions & answers management
│   └── profile-service/          # User profiles management
├── libs/                         # Shared libraries
│   ├── common/                   # Common utilities
│   ├── models/                   # Shared data models
│   └── api-interfaces/           # Shared API interfaces
├── docker/                       # Docker configuration
│   ├── docker-compose.yml        # Development environment
│   └── */                        # Service-specific Dockerfiles
├── k8s/                          # Kubernetes configuration
├── package.json                  # Root package.json
└── nx.json                       # Nx configuration
```

## Features

### Teacher Features
- Create and manage classes
- Upload materials to classes
- View and answer student questions
- View all Q&A related to a class
- View class list and enrolled students
- Edit profile information

### Student Features
- Search and browse available classes
- Enroll in classes
- View class materials
- Ask questions about class content
- View teacher answers
- View all Q&A related to a class
- Edit profile information

### Common Features
- Register as student or teacher
- Login/logout
- Password reset

## Frontend Technologies

- **React**: UI library
- **TypeScript**: Type safety
- **Material-UI**: Component library
- **React Router**: Navigation
- **Formik & Yup**: Form validation
- **React Query**: Data fetching
- **Axios**: HTTP client
- **Context API**: State management

## Backend Technologies

- **NestJS**: Node.js framework
- **TypeORM**: ORM for database interactions
- **PostgreSQL**: Database
- **JWT**: Authentication
- **Passport**: Authentication middleware
- **Swagger**: API documentation

## Getting Started

### Prerequisites

- Node.js (v14+)
- Docker and Docker Compose
- Git

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/postply.git
cd postply
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
   - Copy `.env.example` files to `.env` in each service directory
   - Update the variables as needed

4. Start the development environment
```bash
# Using Docker
docker-compose up

# Or start services individually
npm run start:dev
```

## Development

```bash
# Install dependencies
npm install

# Start development servers
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test
```

## Deployment

The application is containerized and can be deployed using Kubernetes. Configuration files are available in the `k8s` directory.

## GitHub Deployment Guide

### Setting up Git Repository

1. Initialize Git repository (if not already done)
```bash
git init
```

2. Add all files to staging
```bash
git add .
```

3. Commit changes
```bash
git commit -m "Initial commit"
```

4. Create a new repository on GitHub
   - Go to https://github.com/new
   - Enter repository name (e.g., "postply")
   - Choose visibility (public or private)
   - Do not initialize with README, .gitignore, or license

5. Connect local repository to GitHub
```bash
git remote add origin https://github.com/your-username/postply.git
```

6. Push your code to GitHub
```bash
git push -u origin main
```

### Best Practices for GitHub

1. **Branch Management**
   - Use feature branches for new features
   - Use pull requests for code reviews
   - Protect the main branch

2. **Continuous Integration**
   - Set up GitHub Actions for CI/CD
   - Automate testing and deployment

3. **Documentation**
   - Keep README updated
   - Document API endpoints
   - Add comments to complex code

4. **Security**
   - Never commit sensitive information
   - Use environment variables for secrets
   - Regularly update dependencies

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

Ugur Sakarya - ugur@plotcamp.com

Project Link: [https://github.com/your-username/postply](https://github.com/your-username/postply)
>>>>>>> c6a8bf3 (First Commit: First version of Postply)

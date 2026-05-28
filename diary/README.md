# Diary App

A full-stack web application for personal diary management built with FastAPI backend and Vue.js frontend.

## Features

- **User Authentication**: Secure login and registration with JWT tokens
- **Diary Management**: Create, read, update, and delete diary entries
- **Privacy Controls**: Mark entries as public or private
- **Responsive Design**: Mobile-friendly interface
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **PostgreSQL** - Primary database
- **Alembic** - Database migrations
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **Axios** - HTTP client
- **Vite** - Build tool and dev server

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and static file serving
- **PostgreSQL** - Database container

## Project Structure

```
diary-app/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI application entry point
│   │   ├── core/           # Configuration and security
│   │   ├── db/            # Database models and sessions
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── api/           # API endpoints and dependencies
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helper functions
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile         # Backend container definition
│   └── alembic/          # Database migrations
├── frontend/              # Vue.js frontend
│   ├── src/
│   │   ├── components/    # Reusable Vue components
│   │   ├── views/         # Page components
│   │   ├── router/        # Vue Router configuration
│   │   ├── store/         # Pinia state management
│   │   ├── services/      # API client
│   │   └── utils/         # Utility functions
│   ├── package.json       # Node.js dependencies
│   └── Dockerfile         # Frontend container definition
└── infra/                 # Infrastructure configuration
    ├── docker-compose.yml # Multi-container setup
    └── nginx/            # Nginx configuration
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for frontend development)

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd diary
```

2. Start the application:
```bash
cd infra
docker-compose up -d
```

3. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - API Documentation: http://localhost/api/docs

### Local Development

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database configuration
```

4. Run database migrations:
```bash
alembic upgrade head
```

5. Start the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## API Documentation

Once the backend is running, you can access the interactive API documentation:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Default Accounts

The application comes with a default admin user:

- **Username**: admin
- **Password**: admin123
- **Email**: admin@diaryapp.com

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@localhost/diary_db
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
DEBUG=true
```

## Database Migrations

To create a new migration:
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

To apply migrations:
```bash
alembic upgrade head
```

## Deployment

### Production Deployment with Docker

1. Update environment variables for production
2. Set up SSL certificates for HTTPS
3. Configure reverse proxy (nginx included)
4. Use docker-compose.prod.yml for production settings

### Cloud Deployment

The application can be deployed to cloud platforms like:
- AWS (ECS/EKS)
- Google Cloud (GKE)
- Azure (Container Instances)
- Heroku
- DigitalOcean

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository or contact the development team.
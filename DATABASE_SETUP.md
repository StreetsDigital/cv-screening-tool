# Database Setup Guide

This guide explains how to set up PostgreSQL for the CV Screening Tool and migrate from localStorage to the database.

## Prerequisites

1. **PostgreSQL Installation**
   - Install PostgreSQL 12 or later
   - Create a database for the application
   - Ensure PostgreSQL is running and accessible

2. **Node.js Dependencies**
   - Install the new dependencies: `npm install`
   - Dependencies added: `pg`, `uuid`

## Environment Configuration

Create or update your `.env` file with the database connection string:

```env
# Existing variables
ANTHROPIC_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development

# New database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/cv_screening_tool
```

### Database URL Format
```
postgresql://[user[:password]@][netloc][:port][,...][/dbname][?param1=value1&...]
```

**Examples:**
- Local development: `postgresql://postgres:password@localhost:5432/cv_screening_tool`
- Production: `postgresql://user:password@your-db-host:5432/cv_screening_production`
- Heroku Postgres: Already provided in `DATABASE_URL` env var

## Database Setup Steps

### 1. Create Database (if not exists)
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE cv_screening_tool;
CREATE USER cv_app_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE cv_screening_tool TO cv_app_user;
```

### 2. Start the Application
```bash
npm start
# or for development
npm run dev
```

### 3. Initialize Database Schema
Two options:

**Option A: Using the Web Interface**
1. Open the application in your browser
2. Click "🗄️ Database Migration" button
3. Click "Test Connection" to verify database connectivity
4. Schema will be initialized automatically during migration

**Option B: Using API Endpoint**
```bash
curl -X POST http://localhost:3000/api/migration/init-schema
```

### 4. Migrate localStorage Data
1. Use the web interface: Click "🗄️ Database Migration"
2. Review the migration information
3. Click "Migrate Data" to transfer all localStorage data to PostgreSQL

## Migration Process

The migration will transfer:

- **Candidates**: All analyzed CVs with extracted data
- **Job Postings**: Job descriptions and requirements
- **Applications**: CV-job analysis results with scores
- **Feedback**: User feedback and corrections
- **Project Configurations**: Saved industry setups

## Verification

After migration, verify the data:

### Check Migration Status
```bash
curl http://localhost:3000/api/migration/status
```

### View Database Tables
```sql
-- Connect to your database
\c cv_screening_tool

-- List all tables
\dt

-- Check data counts
SELECT COUNT(*) FROM candidates;
SELECT COUNT(*) FROM job_postings;
SELECT COUNT(*) FROM candidate_applications;
SELECT COUNT(*) FROM feedback_logs;
```

## API Endpoints

The following new API endpoints are available:

### Candidates
- `GET /api/candidates` - List all candidates
- `POST /api/candidates` - Create new candidate
- `GET /api/candidates/search` - Search candidates
- `GET /api/candidates/:id` - Get candidate by ID

### Jobs
- `GET /api/jobs` - List all job postings
- `POST /api/jobs` - Create new job posting
- `GET /api/jobs/:id` - Get job by ID

### Applications
- `POST /api/applications` - Create application
- `PATCH /api/applications/:candidate_id/:job_id/status` - Update status
- `GET /api/applications/job/:job_id` - Get applications for job
- `GET /api/applications/candidate/:candidate_id` - Get candidate applications

### Feedback
- `POST /api/feedback` - Create feedback
- `GET /api/feedback` - List feedback
- `GET /api/feedback/candidate/:candidate_id/job/:job_id` - Get specific feedback

### Migration
- `POST /api/migration/init-schema` - Initialize database schema
- `POST /api/migration/from-localstorage` - Migrate localStorage data
- `GET /api/migration/test-connection` - Test database connection
- `GET /api/migration/status` - Get migration statistics

## Troubleshooting

### Connection Issues
1. **Database not found**: Ensure the database exists and name matches `DATABASE_URL`
2. **Authentication failed**: Check username/password in `DATABASE_URL`
3. **Connection refused**: Ensure PostgreSQL is running and accepting connections
4. **SSL issues**: For production, may need `?sslmode=require` in connection string

### Permission Issues
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cv_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cv_app_user;
```

### Check Application Logs
The application will log database connection status on startup:
- ✅ Database connection successful
- ⚠️ Database connection failed - running in localStorage mode

### Reset Database (if needed)
```sql
-- Drop all tables (be careful!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO cv_app_user;
```

## Performance Optimization

For production use:

1. **Indexes**: The schema includes performance indexes
2. **Connection Pooling**: Configured in `database/db.js`
3. **Query Optimization**: Use appropriate WHERE clauses for large datasets

## Security Considerations

1. **Database Credentials**: Never commit credentials to version control
2. **SSL Connections**: Use SSL in production (`?sslmode=require`)
3. **User Permissions**: Create dedicated database user with minimal required permissions
4. **Regular Backups**: Implement automated backup strategy

## Deployment Notes

### Heroku
- Heroku Postgres automatically provides `DATABASE_URL`
- No additional configuration needed

### Railway/Render
- Use provided database URL in environment variables
- Ensure SSL is enabled

### Self-hosted
- Configure PostgreSQL with proper security settings
- Use connection pooling for multiple application instances
- Set up monitoring and backups

## Rollback Plan

If issues occur:
1. **Data Safety**: localStorage data is preserved during migration
2. **Fallback**: Remove/disable `DATABASE_URL` to return to localStorage mode
3. **Re-migration**: Can re-run migration process if needed

The application gracefully handles database connection failures and falls back to localStorage mode automatically.
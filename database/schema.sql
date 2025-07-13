-- CV Screening Tool Database Schema
-- Based on Phase 2.5 PRD specifications

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for multi-tenant support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    linkedin_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Candidates table
CREATE TABLE candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    linkedin_url VARCHAR(500),
    location VARCHAR(255),
    experience_years INTEGER,
    current_role VARCHAR(255),
    industry_tags TEXT[],
    skills TEXT[],
    education_level VARCHAR(100),
    resume_text TEXT,
    resume_file_url VARCHAR(500),
    consent_status VARCHAR(50) DEFAULT 'pending',
    data_retention_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Job postings table
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT[],
    industry VARCHAR(100),
    seniority_level VARCHAR(50),
    location VARCHAR(255),
    salary_range VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Candidate-job applications
CREATE TABLE candidate_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id),
    job_posting_id UUID REFERENCES job_postings(id),
    ai_score INTEGER,
    user_score INTEGER,
    feedback_notes TEXT,
    status VARCHAR(50) DEFAULT 'screened',
    applied_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(candidate_id, job_posting_id)
);

-- Email tracking table
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id),
    template_name VARCHAR(100),
    subject VARCHAR(500),
    recipient_email VARCHAR(255),
    status VARCHAR(50), -- sent, delivered, opened, clicked, bounced
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    error_message TEXT
);

-- LinkedIn tracking table
CREATE TABLE linkedin_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id),
    user_id UUID REFERENCES users(id),
    connection_status VARCHAR(50), -- pending, connected, declined, not_found
    connection_date TIMESTAMP,
    message_sent TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Feedback and learning data
CREATE TABLE feedback_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id),
    job_posting_id UUID REFERENCES job_postings(id),
    user_id UUID REFERENCES users(id),
    original_score INTEGER,
    corrected_score INTEGER,
    feedback_type VARCHAR(50), -- thumbs_up, thumbs_down, score_correction
    feedback_categories TEXT[],
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_candidates_email ON candidates(email);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_candidates_industry_tags ON candidates USING GIN(industry_tags);
CREATE INDEX idx_candidate_applications_candidate_id ON candidate_applications(candidate_id);
CREATE INDEX idx_candidate_applications_job_id ON candidate_applications(job_posting_id);
CREATE INDEX idx_feedback_logs_candidate_id ON feedback_logs(candidate_id);
CREATE INDEX idx_linkedin_connections_candidate_id ON linkedin_connections(candidate_id);
CREATE INDEX idx_email_logs_candidate_id ON email_logs(candidate_id);
// Database connection and utilities
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cv_screening_tool',
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    }

    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    async initializeSchema() {
        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = await fs.readFile(schemaPath, 'utf8');
            await this.query(schema);
            console.log('✅ Database schema initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize database schema:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const result = await this.query('SELECT NOW()');
            console.log('✅ Database connection successful:', result.rows[0].now);
            return true;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            return false;
        }
    }

    async migrateFromLocalStorage(localStorageData) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Create default user if doesn't exist
            const userResult = await client.query(`
                INSERT INTO users (email, name, company) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (email) DO NOTHING 
                RETURNING id
            `, ['demo@example.com', 'Demo User', 'Demo Company']);

            let userId;
            if (userResult.rows.length > 0) {
                userId = userResult.rows[0].id;
            } else {
                const existingUser = await client.query('SELECT id FROM users WHERE email = $1', ['demo@example.com']);
                userId = existingUser.rows[0].id;
            }

            // Migrate candidates and analysis results
            if (localStorageData.analysisResults) {
                for (const result of localStorageData.analysisResults) {
                    // Insert candidate
                    const candidateResult = await client.query(`
                        INSERT INTO candidates (
                            name, email, resume_text, skills, experience_years, 
                            current_role, location, consent_status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (email) DO UPDATE SET
                            name = EXCLUDED.name,
                            resume_text = EXCLUDED.resume_text,
                            skills = EXCLUDED.skills
                        RETURNING id
                    `, [
                        result.candidateName || 'Unknown',
                        result.candidateEmail || `candidate_${Date.now()}@example.com`,
                        result.extractedText || '',
                        result.extractedSkills || [],
                        result.experienceYears || 0,
                        result.currentRole || '',
                        result.location || '',
                        'pending'
                    ]);

                    const candidateId = candidateResult.rows[0].id;

                    // Create job posting if it doesn't exist
                    const jobResult = await client.query(`
                        INSERT INTO job_postings (
                            title, description, requirements, industry, created_by
                        ) VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT DO NOTHING
                        RETURNING id
                    `, [
                        result.jobTitle || 'Migrated Job',
                        result.jobDescription || '',
                        result.jobRequirements || [],
                        result.industry || 'general',
                        userId
                    ]);

                    let jobId;
                    if (jobResult.rows.length > 0) {
                        jobId = jobResult.rows[0].id;
                    } else {
                        const existingJob = await client.query(`
                            SELECT id FROM job_postings 
                            WHERE title = $1 AND created_by = $2 
                            LIMIT 1
                        `, [result.jobTitle || 'Migrated Job', userId]);
                        jobId = existingJob.rows[0]?.id;
                    }

                    if (jobId) {
                        // Insert application
                        await client.query(`
                            INSERT INTO candidate_applications (
                                candidate_id, job_posting_id, ai_score, status
                            ) VALUES ($1, $2, $3, $4)
                            ON CONFLICT (candidate_id, job_posting_id) DO NOTHING
                        `, [candidateId, jobId, result.score || 0, 'screened']);
                    }

                    // Migrate feedback if exists
                    if (result.feedback) {
                        await client.query(`
                            INSERT INTO feedback_logs (
                                candidate_id, job_posting_id, user_id, feedback_type, feedback_text
                            ) VALUES ($1, $2, $3, $4, $5)
                        `, [
                            candidateId, 
                            jobId, 
                            userId, 
                            result.feedback.type || 'general',
                            result.feedback.text || ''
                        ]);
                    }
                }
            }

            await client.query('COMMIT');
            console.log('✅ Successfully migrated data from localStorage');
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Failed to migrate localStorage data:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Candidate operations
    async createCandidate(candidateData) {
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        
        const result = await this.query(`
            INSERT INTO candidates (
                id, name, email, phone, linkedin_url, location, experience_years,
                current_role, industry_tags, skills, education_level, resume_text,
                consent_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `, [
            id, candidateData.name, candidateData.email, candidateData.phone,
            candidateData.linkedin_url, candidateData.location, candidateData.experience_years,
            candidateData.current_role, candidateData.industry_tags, candidateData.skills,
            candidateData.education_level, candidateData.resume_text, candidateData.consent_status || 'pending'
        ]);
        
        return result.rows[0];
    }

    async searchCandidates(searchParams) {
        let query = `
            SELECT c.*, ca.ai_score, ca.status as application_status 
            FROM candidates c
            LEFT JOIN candidate_applications ca ON c.id = ca.candidate_id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        if (searchParams.skills && searchParams.skills.length > 0) {
            paramCount++;
            query += ` AND c.skills && $${paramCount}`;
            params.push(searchParams.skills);
        }

        if (searchParams.experience_min) {
            paramCount++;
            query += ` AND c.experience_years >= $${paramCount}`;
            params.push(searchParams.experience_min);
        }

        if (searchParams.experience_max) {
            paramCount++;
            query += ` AND c.experience_years <= $${paramCount}`;
            params.push(searchParams.experience_max);
        }

        if (searchParams.industry) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(c.industry_tags)`;
            params.push(searchParams.industry);
        }

        if (searchParams.location) {
            paramCount++;
            query += ` AND c.location ILIKE $${paramCount}`;
            params.push(`%${searchParams.location}%`);
        }

        query += ` ORDER BY ca.ai_score DESC NULLS LAST, c.created_at DESC`;
        
        if (searchParams.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            params.push(searchParams.limit);
        }

        const result = await this.query(query, params);
        return result.rows;
    }

    async getCandidateById(id) {
        const result = await this.query('SELECT * FROM candidates WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Job operations
    async createJobPosting(jobData, userId) {
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        
        const result = await this.query(`
            INSERT INTO job_postings (
                id, title, description, requirements, industry, seniority_level,
                location, salary_range, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            id, jobData.title, jobData.description, jobData.requirements,
            jobData.industry, jobData.seniority_level, jobData.location,
            jobData.salary_range, userId
        ]);
        
        return result.rows[0];
    }

    // Application operations
    async createApplication(candidateId, jobId, aiScore) {
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        
        const result = await this.query(`
            INSERT INTO candidate_applications (
                id, candidate_id, job_posting_id, ai_score, status
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (candidate_id, job_posting_id) 
            DO UPDATE SET ai_score = EXCLUDED.ai_score, applied_at = NOW()
            RETURNING *
        `, [id, candidateId, jobId, aiScore, 'screened']);
        
        return result.rows[0];
    }

    async updateApplicationStatus(candidateId, jobId, status, userScore = null) {
        const result = await this.query(`
            UPDATE candidate_applications 
            SET status = $1, user_score = $2, updated_at = NOW()
            WHERE candidate_id = $3 AND job_posting_id = $4
            RETURNING *
        `, [status, userScore, candidateId, jobId]);
        
        return result.rows[0];
    }

    // Feedback operations
    async createFeedback(feedbackData) {
        const { v4: uuidv4 } = require('uuid');
        const id = uuidv4();
        
        const result = await this.query(`
            INSERT INTO feedback_logs (
                id, candidate_id, job_posting_id, user_id, original_score,
                corrected_score, feedback_type, feedback_categories, feedback_text
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            id, feedbackData.candidate_id, feedbackData.job_posting_id,
            feedbackData.user_id, feedbackData.original_score, feedbackData.corrected_score,
            feedbackData.feedback_type, feedbackData.feedback_categories, feedbackData.feedback_text
        ]);
        
        return result.rows[0];
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = Database;
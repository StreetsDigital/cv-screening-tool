// Application API routes
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Create new application (when CV is analyzed)
    router.post('/', async (req, res) => {
        try {
            const { candidate_id, job_posting_id, ai_score } = req.body;
            const application = await db.createApplication(candidate_id, job_posting_id, ai_score);
            res.status(201).json(application);
        } catch (error) {
            console.error('Error creating application:', error);
            res.status(500).json({ error: 'Failed to create application' });
        }
    });

    // Update application status
    router.patch('/:candidate_id/:job_id/status', async (req, res) => {
        try {
            const { candidate_id, job_id } = req.params;
            const { status, user_score } = req.body;
            
            const application = await db.updateApplicationStatus(candidate_id, job_id, status, user_score);
            if (!application) {
                return res.status(404).json({ error: 'Application not found' });
            }
            
            res.json(application);
        } catch (error) {
            console.error('Error updating application status:', error);
            res.status(500).json({ error: 'Failed to update application status' });
        }
    });

    // Get applications for a job
    router.get('/job/:job_id', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT ca.*, c.name, c.email, c.phone, c.linkedin_url, c.location,
                       c.experience_years, c.current_role, c.skills
                FROM candidate_applications ca
                JOIN candidates c ON ca.candidate_id = c.id
                WHERE ca.job_posting_id = $1
                ORDER BY ca.ai_score DESC, ca.applied_at DESC
            `, [req.params.job_id]);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Error getting applications for job:', error);
            res.status(500).json({ error: 'Failed to get applications' });
        }
    });

    // Get applications for a candidate
    router.get('/candidate/:candidate_id', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT ca.*, jp.title as job_title, jp.description as job_description
                FROM candidate_applications ca
                JOIN job_postings jp ON ca.job_posting_id = jp.id
                WHERE ca.candidate_id = $1
                ORDER BY ca.applied_at DESC
            `, [req.params.candidate_id]);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Error getting applications for candidate:', error);
            res.status(500).json({ error: 'Failed to get applications' });
        }
    });

    return router;
};
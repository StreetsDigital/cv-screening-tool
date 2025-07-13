// Job posting API routes
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Create new job posting
    router.post('/', async (req, res) => {
        try {
            // For now, use a default user ID. In production, this would come from authentication
            const userId = req.body.created_by || 'demo-user-id';
            const job = await db.createJobPosting(req.body, userId);
            res.status(201).json(job);
        } catch (error) {
            console.error('Error creating job posting:', error);
            res.status(500).json({ error: 'Failed to create job posting' });
        }
    });

    // Get all job postings
    router.get('/', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT jp.*, u.name as created_by_name
                FROM job_postings jp
                LEFT JOIN users u ON jp.created_by = u.id
                ORDER BY jp.created_at DESC
            `);
            res.json(result.rows);
        } catch (error) {
            console.error('Error getting job postings:', error);
            res.status(500).json({ error: 'Failed to get job postings' });
        }
    });

    // Get job posting by ID
    router.get('/:id', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT jp.*, u.name as created_by_name
                FROM job_postings jp
                LEFT JOIN users u ON jp.created_by = u.id
                WHERE jp.id = $1
            `, [req.params.id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Job posting not found' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error getting job posting:', error);
            res.status(500).json({ error: 'Failed to get job posting' });
        }
    });

    return router;
};
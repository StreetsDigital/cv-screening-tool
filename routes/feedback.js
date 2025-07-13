// Feedback API routes
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Create feedback
    router.post('/', async (req, res) => {
        try {
            if (db) {
                const feedback = await db.createFeedback(req.body);
                res.status(201).json(feedback);
            } else {
                // localStorage mode - just log the feedback
                console.log('📝 Feedback received (localStorage mode):', req.body);
                res.status(201).json({ 
                    message: 'Feedback received and logged',
                    feedback: req.body,
                    timestamp: new Date().toISOString(),
                    mode: 'localStorage'
                });
            }
        } catch (error) {
            console.error('Error creating feedback:', error);
            res.status(500).json({ error: 'Failed to create feedback' });
        }
    });

    // Get feedback for a candidate/job combination
    router.get('/candidate/:candidate_id/job/:job_id', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT * FROM feedback_logs
                WHERE candidate_id = $1 AND job_posting_id = $2
                ORDER BY created_at DESC
            `, [req.params.candidate_id, req.params.job_id]);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Error getting feedback:', error);
            res.status(500).json({ error: 'Failed to get feedback' });
        }
    });

    // Get all feedback for analytics
    router.get('/', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT fl.*, c.name as candidate_name, jp.title as job_title
                FROM feedback_logs fl
                JOIN candidates c ON fl.candidate_id = c.id
                JOIN job_postings jp ON fl.job_posting_id = jp.id
                ORDER BY fl.created_at DESC
                LIMIT 100
            `);
            
            res.json(result.rows);
        } catch (error) {
            console.error('Error getting feedback:', error);
            res.status(500).json({ error: 'Failed to get feedback' });
        }
    });

    return router;
};
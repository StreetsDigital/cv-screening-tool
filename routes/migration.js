// Migration API routes for localStorage to PostgreSQL
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Migrate data from localStorage
    router.post('/from-localstorage', async (req, res) => {
        try {
            const { localStorageData } = req.body;
            
            if (!localStorageData) {
                return res.status(400).json({ error: 'localStorage data is required' });
            }

            await db.migrateFromLocalStorage(localStorageData);
            res.json({ success: true, message: 'Migration completed successfully' });
        } catch (error) {
            console.error('Error migrating from localStorage:', error);
            res.status(500).json({ error: 'Failed to migrate data', details: error.message });
        }
    });

    // Initialize database schema
    router.post('/init-schema', async (req, res) => {
        try {
            await db.initializeSchema();
            res.json({ success: true, message: 'Database schema initialized successfully' });
        } catch (error) {
            console.error('Error initializing schema:', error);
            res.status(500).json({ error: 'Failed to initialize schema', details: error.message });
        }
    });

    // Test database connection
    router.get('/test-connection', async (req, res) => {
        try {
            const isConnected = await db.testConnection();
            if (isConnected) {
                res.json({ success: true, message: 'Database connection successful' });
            } else {
                res.status(500).json({ error: 'Database connection failed' });
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            res.status(500).json({ error: 'Database connection test failed', details: error.message });
        }
    });

    // Get migration status and statistics
    router.get('/status', async (req, res) => {
        try {
            const candidateCount = await db.query('SELECT COUNT(*) FROM candidates');
            const jobCount = await db.query('SELECT COUNT(*) FROM job_postings');
            const applicationCount = await db.query('SELECT COUNT(*) FROM candidate_applications');
            const feedbackCount = await db.query('SELECT COUNT(*) FROM feedback_logs');

            res.json({
                success: true,
                statistics: {
                    candidates: parseInt(candidateCount.rows[0].count),
                    jobs: parseInt(jobCount.rows[0].count),
                    applications: parseInt(applicationCount.rows[0].count),
                    feedback: parseInt(feedbackCount.rows[0].count)
                }
            });
        } catch (error) {
            console.error('Error getting migration status:', error);
            res.status(500).json({ error: 'Failed to get migration status', details: error.message });
        }
    });

    return router;
};
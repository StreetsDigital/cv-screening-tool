// Candidate API routes
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    // Create new candidate
    router.post('/', async (req, res) => {
        try {
            const candidate = await db.createCandidate(req.body);
            res.status(201).json(candidate);
        } catch (error) {
            console.error('Error creating candidate:', error);
            res.status(500).json({ error: 'Failed to create candidate' });
        }
    });

    // Search candidates
    router.get('/search', async (req, res) => {
        try {
            const searchParams = {
                skills: req.query.skills ? req.query.skills.split(',') : null,
                experience_min: req.query.experience_min ? parseInt(req.query.experience_min) : null,
                experience_max: req.query.experience_max ? parseInt(req.query.experience_max) : null,
                industry: req.query.industry,
                location: req.query.location,
                limit: req.query.limit ? parseInt(req.query.limit) : 50
            };

            const candidates = await db.searchCandidates(searchParams);
            res.json(candidates);
        } catch (error) {
            console.error('Error searching candidates:', error);
            res.status(500).json({ error: 'Failed to search candidates' });
        }
    });

    // Get candidate by ID
    router.get('/:id', async (req, res) => {
        try {
            const candidate = await db.getCandidateById(req.params.id);
            if (!candidate) {
                return res.status(404).json({ error: 'Candidate not found' });
            }
            res.json(candidate);
        } catch (error) {
            console.error('Error getting candidate:', error);
            res.status(500).json({ error: 'Failed to get candidate' });
        }
    });

    // Get all candidates (for migration and admin)
    router.get('/', async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM candidates ORDER BY created_at DESC');
            res.json(result.rows);
        } catch (error) {
            console.error('Error getting candidates:', error);
            res.status(500).json({ error: 'Failed to get candidates' });
        }
    });

    return router;
};
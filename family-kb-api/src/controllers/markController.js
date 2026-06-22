const pool = require('../db/pool');

// GET /api/mark — return all marks ordered by creation time
const getMarks = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, color, data, is_taped, created_at FROM mark ORDER BY created_at ASC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

const deleteMark = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM mark WHERE id = $1 RETURNING id',
            [id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Mark not found' });
        }
        res.json({ id: result.rows[0].id });
    } catch (err) {
        // Postgres returns 22P02 for malformed UUIDs — treat as a bad request.
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'Invalid mark id' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Update a mark's taped state. Body: { is_taped: boolean }. Used by tape mode
// to mark/unmark strokes. Mirrors deleteMark's validation + 22P02 handling.
const updateMark = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_taped } = req.body;
        if (typeof is_taped !== 'boolean') {
            return res.status(400).json({ error: 'is_taped (boolean) required' });
        }
        const result = await pool.query(
            'UPDATE mark SET is_taped = $1 WHERE id = $2 RETURNING id, is_taped',
            [is_taped, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Mark not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        // Postgres returns 22P02 for malformed UUIDs — treat as a bad request.
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'Invalid mark id' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /api/mark — create a new mark. No board association; marks are now standalone.
const createMark = async (req, res) => {
    try {
        const { id, data, color } = req.body.body;
        // `id` is a client-minted UUID; Postgres rejects non-UUIDs at insert time.
        if (typeof id !== 'string') {
            return res.status(400).json({ error: 'id required' });
        }
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: 'points required' });
        }
        if (typeof color !== 'string') {
            return res.status(400).json({ error: 'color required' });
        }
        const result = await pool.query(
            `INSERT INTO mark (id, color, data) VALUES ($1, $2, $3) RETURNING id, color, data`,
            [id, color, { points: data }]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'Invalid mark id' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = {
    getMarks,
    deleteMark,
    updateMark,
    createMark,
};

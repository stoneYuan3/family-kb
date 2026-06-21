const pool = require('../db/pool');

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

module.exports = {
    deleteMark,
    updateMark,
};

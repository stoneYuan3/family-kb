const pool = require('../db/pool');

const getAllItems = async (req, res) => {
  try {
    const { parent_collection } = req.query;

    if (parent_collection === "null") {
      // standalone items only
      const result = await pool.query('SELECT * FROM item WHERE parent_collection IS NULL');
      return res.json(result.rows);

    }
    else if (parent_collection) {
      const result = await pool.query(
        'SELECT * FROM item WHERE parent_collection = $1',
        [parent_collection]
      );
      return res.json(result.rows);
    }

    const result = await pool.query('SELECT * FROM item');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM item WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createItem = async (req, res) => {
  try {
    // After auth (Phase 3) — the real approach
    // const uploaded_by = req.user.id;
    const { title, cover_image, description, parent_collection } = req.body;
    const result = await pool.query(
      'INSERT INTO item (title, cover_image, description, parent_collection) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, cover_image || null, description || null, parent_collection || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, cover_image, description, parent_collection } = req.body;
    const result = await pool.query(
      'UPDATE item SET title = $1, cover_image = $2, description = $3, parent_collection = $4 WHERE id = $5 RETURNING *',
      [title, cover_image || null, description || null, parent_collection || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM item WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const moveItem = async (req, res) => {
  try {
    const { id, dest_id } = req.params;
    const dest = dest_id === 'null' ? null : dest_id;
    const result = await pool.query(
      'UPDATE item SET parent_collection = $1 WHERE id = $2 RETURNING *',
      [dest, id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  moveItem,
};
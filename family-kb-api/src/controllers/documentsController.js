const pool = require('../db/pool');
const fs = require('fs');
const path = require('path');

const getDocumentsByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const result = await pool.query(
      'SELECT * FROM document WHERE parent_item_id = $1',
      [itemId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const createDocument = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, filename, mimetype, size } = req.file;
    const filePath = `/uploads/${filename}`;

    const result = await pool.query(
      'INSERT INTO document (parent_item_id, file_url, file_type, file_size) VALUES ($1, $2, $3, $4) RETURNING *',
      [itemId, filePath, mimetype, size]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM document WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete the actual file from disk
    const filePath = path.join(__dirname, '../../', result.rows[0].file_path);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete file:', err);
    });

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getDocumentsByItem,
  createDocument,
  deleteDocument,
};
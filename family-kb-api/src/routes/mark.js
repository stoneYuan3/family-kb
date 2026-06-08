const express = require('express');
const router = express.Router();
const markController = require('../controllers/markController');
const authenticate = require('../middleware/authenticate');
const { editorOnly } = require('../middleware/authorize');

router.delete('/:id', authenticate, editorOnly, markController.deleteMark);

module.exports = router;

const express = require('express');
const router = express.Router();
const markController = require('../controllers/markController');
const authenticate = require('../middleware/authenticate');
const { editorOnly } = require('../middleware/authorize');

router.get('/', authenticate, markController.getMarks);
router.post('/', authenticate, editorOnly, markController.createMark);
router.delete('/:id', authenticate, editorOnly, markController.deleteMark);
router.put('/:id', authenticate, editorOnly, markController.updateMark);

module.exports = router;
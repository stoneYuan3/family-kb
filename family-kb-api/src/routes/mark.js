const express = require('express');
const router = express.Router();
const markController = require('../controllers/markController');
const authenticate = require('../middleware/authenticate');
const { editorOnly } = require('../middleware/authorize');

router.get('/', authenticate, markController.getMarks);
router.post('/', authenticate, editorOnly, markController.createMark);
// /untaped must be before /:id so Express doesn't treat "untaped" as an id param
router.delete('/untaped', authenticate, editorOnly, markController.clearUntapedMarks);
router.delete('/:id', authenticate, editorOnly, markController.deleteMark);
router.put('/:id', authenticate, editorOnly, markController.updateMark);

module.exports = router;
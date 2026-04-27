const express = require('express');
const router = express.Router();
const documentsController = require('../controllers/documentsController');
const authenticate = require('../middleware/authenticate');
const { editorOnly} = require('../middleware/authorize');
const upload = require('../middleware/upload');

router.get('/items/:itemId/documents', authenticate, documentsController.getDocumentsByItem);
router.post('/items/:itemId/documents', authenticate, editorOnly, upload.single('file'), documentsController.createDocument);
router.delete('/documents/:id', authenticate, editorOnly, documentsController.deleteDocument);

module.exports = router;
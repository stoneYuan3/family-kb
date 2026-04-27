const express = require('express');
const router = express.Router();
const collectionsController = require('../controllers/collectionsController');
const authenticate = require('../middleware/authenticate');
const { editorOnly } = require('../middleware/authorize');

router.get('/', authenticate, collectionsController.getAllCollections);
router.get('/:id/ancestors', authenticate, collectionsController.getCollectionAncestors);
router.get('/:id', authenticate, collectionsController.getCollectionById);
router.get('/relocate/:type/:id', authenticate, collectionsController.getRelocateOptions)
router.post('/', authenticate, editorOnly, collectionsController.createCollection);
router.put('/:id', authenticate, editorOnly, collectionsController.updateCollection);
router.put('/relocate/:id/:dest_id', authenticate, editorOnly, collectionsController.moveFolder)
router.delete('/:id', authenticate, editorOnly, collectionsController.deleteCollection);

module.exports = router;
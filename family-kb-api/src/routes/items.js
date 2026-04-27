const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');
const authenticate = require('../middleware/authenticate');
const { editorOnly } = require('../middleware/authorize');

router.get('/', authenticate, itemsController.getAllItems);
router.get('/:id', authenticate, itemsController.getItemById);
router.post('/', authenticate, editorOnly, itemsController.createItem);
router.put('/:id', authenticate, editorOnly, itemsController.updateItem);
router.put('/relocate/:id/:dest_id', authenticate, editorOnly, itemsController.moveItem)
router.delete('/:id', authenticate, editorOnly, itemsController.deleteItem);

module.exports = router;
const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const authenticate = require('../middleware/authenticate');
const { editorOnly } = require('../middleware/authorize');

router.get("/current", authenticate, boardController.getCurrentBoard);
router.post("/current", authenticate, editorOnly, boardController.AddNewMarkForBoard);

module.exports = router;
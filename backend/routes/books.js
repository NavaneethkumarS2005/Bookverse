const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

const auth = require('../middleware/auth');

router.get('/', bookController.getBooks);
router.post('/', auth, bookController.addBook);
router.delete('/:id', auth, bookController.deleteBook);

module.exports = router;

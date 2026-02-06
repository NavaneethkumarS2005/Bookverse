const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const auth = require('../middleware/auth'); // Assuming you have an auth middleware

// All routes require login
router.get('/', auth, wishlistController.getWishlist);
router.post('/:id', auth, wishlistController.addToWishlist);
router.delete('/:id', auth, wishlistController.removeFromWishlist);

module.exports = router;

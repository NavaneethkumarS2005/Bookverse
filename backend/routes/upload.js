const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

router.post('/', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Return the full URL to the uploaded file
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ imageUrl });
    } catch (err) {
        res.status(500).json({ message: 'Error uploading file' });
    }
});

module.exports = router;

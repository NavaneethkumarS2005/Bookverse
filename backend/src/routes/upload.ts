import express, { Request, Response } from 'express';
// @ts-ignore
import upload from '../middleware/upload';

const router = express.Router();

router.post('/', upload.single('image'), (req: Request, res: Response) => {
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

export default router;

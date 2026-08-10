import express, { Request, Response } from 'express';
import Author from '../models/Author';
import Publisher from '../models/Publisher';
import UpcomingBook from '../models/UpcomingBook';
import BookFair from '../models/BookFair';
import Booth from '../models/Booth';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();
const models: Record<string, any> = { authors: Author, publishers: Publisher, 'upcoming-books': UpcomingBook, fairs: BookFair, booths: Booth };
const requiredNames: Record<string, string[]> = { authors: ['name'], publishers: ['name'], 'upcoming-books': ['title', 'author'], fairs: ['name'], booths: ['fairId'] };

router.use(auth, admin);
router.get('/:resource', async (req: Request, res: Response) => {
  const resource = String(req.params.resource); const model = models[resource];
  if (!model) return res.status(404).json({ message: 'Unknown discovery resource' });
  res.json(await model.find().sort({ createdAt: -1 }).limit(100));
});
router.post('/:resource', async (req: Request, res: Response) => {
  try {
    const resource = String(req.params.resource); const model = models[resource]; const required = requiredNames[resource];
    if (!model || !required) return res.status(404).json({ message: 'Unknown discovery resource' });
    const missing = required.filter((field: string) => !req.body[field]);
    if (missing.length) return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    res.status(201).json(await model.create(req.body));
  } catch (error: any) { res.status(400).json({ message: error.message }); }
});
router.put('/:resource/:id', async (req: Request, res: Response) => {
  try {
    const model = models[String(req.params.resource)];
    if (!model) return res.status(404).json({ message: 'Unknown discovery resource' });
    const item = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Record not found' });
    res.json(item);
  } catch (error: any) { res.status(400).json({ message: error.message }); }
});
router.delete('/:resource/:id', async (req: Request, res: Response) => {
  try {
    const model = models[String(req.params.resource)];
    if (!model) return res.status(404).json({ message: 'Unknown discovery resource' });
    const item = await model.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Record not found' });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ message: error.message }); }
});
export default router;

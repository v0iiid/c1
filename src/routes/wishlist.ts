import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/launches/:id/whitelist
router.post('/:id/whitelist', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({ where: { id: req.params.id } });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });
  if (launch.creatorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const { addresses } = req.body;
  if (!addresses || !Array.isArray(addresses)) return res.status(400).json({ error: 'Missing addresses' });

  let added = 0;
  for (const address of addresses) {
    try {
      await prisma.whitelistEntry.create({ data: { address, launchId: req.params.id } });
      added++;
    } catch {
      // skip duplicates
    }
  }

  const total = await prisma.whitelistEntry.count({ where: { launchId: req.params.id } });
  res.status(200).json({ added, total });
});

// GET /api/launches/:id/whitelist
router.get('/:id/whitelist', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({ where: { id: req.params.id } });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });
  if (launch.creatorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const entries = await prisma.whitelistEntry.findMany({ where: { launchId: req.params.id } });
  res.status(200).json({ addresses: entries.map(e => e.address), total: entries.length });
});

// DELETE /api/launches/:id/whitelist/:address
router.delete('/:id/whitelist/:address', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({ where: { id: req.params.id } });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });
  if (launch.creatorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const entry = await prisma.whitelistEntry.findUnique({
    where: { launchId_address: { launchId: req.params.id, address: req.params.address } },
  });
  if (!entry) return res.status(404).json({ error: 'Address not found' });

  await prisma.whitelistEntry.delete({
    where: { launchId_address: { launchId: req.params.id, address: req.params.address } },
  });

  res.status(200).json({ removed: true });
});

export default router;
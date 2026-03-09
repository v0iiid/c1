import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { computeStatus } from '../lib/status';

const router = Router();

// POST /api/launches
router.post('/', authenticate, async (req: any, res: Response) => {
  const { name, symbol, totalSupply, pricePerToken, startsAt, endsAt, maxPerWallet, description, tiers, vesting } = req.body;
  if (!name || !symbol || !totalSupply || !pricePerToken || !startsAt || !endsAt || !maxPerWallet)
    return res.status(400).json({ error: 'Missing fields' });

  const launch = await prisma.launch.create({
    data: {
      name, symbol, totalSupply, pricePerToken,
      startsAt: new Date(startsAt), endsAt: new Date(endsAt),
      maxPerWallet, description, creatorId: req.userId,
      tiers: tiers ? { create: tiers } : undefined,
      vesting: vesting ? { create: vesting } : undefined,
    },
    include: { purchases: true, tiers: true, vesting: true },
  });

  res.status(201).json({ ...launch, status: computeStatus(launch) });
});

// GET /api/launches
router.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const statusFilter = req.query.status as string | undefined;

  const all = await prisma.launch.findMany({
    include: { purchases: true, tiers: true, vesting: true },
  });

  let withStatus = all.map(l => ({ ...l, status: computeStatus(l) }));
  if (statusFilter) withStatus = withStatus.filter(l => l.status === statusFilter);

  const total = withStatus.length;
  const paginated = withStatus.slice((page - 1) * limit, page * limit);

  res.status(200).json({ launches: paginated, total, page, limit });
});

// GET /api/launches/:id
router.get('/:id', async (req: Request, res: Response) => {
  const launch = await prisma.launch.findUnique({
    where: { id: req.params.id },
    include: { purchases: true, tiers: true, vesting: true },
  });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });
  res.status(200).json({ ...launch, status: computeStatus(launch) });
});

// PUT /api/launches/:id
router.put('/:id', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({ where: { id: req.params.id } });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });
  if (launch.creatorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const { name, symbol, totalSupply, pricePerToken, startsAt, endsAt, maxPerWallet, description } = req.body;
  const updated = await prisma.launch.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }), ...(symbol && { symbol }),
      ...(totalSupply && { totalSupply }), ...(pricePerToken && { pricePerToken }),
      ...(startsAt && { startsAt: new Date(startsAt) }), ...(endsAt && { endsAt: new Date(endsAt) }),
      ...(maxPerWallet && { maxPerWallet }), ...(description && { description }),
    },
    include: { purchases: true, tiers: true, vesting: true },
  });

  res.status(200).json({ ...updated, status: computeStatus(updated) });
});

export default router;
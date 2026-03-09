import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/launches/:id/referrals
router.post('/:id/referrals', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({ where: { id: req.params.id } });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });
  if (launch.creatorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const { code, discountPercent, maxUses } = req.body;
  if (!code || discountPercent == null || !maxUses) return res.status(400).json({ error: 'Missing fields' });

  const existing = await prisma.referralCode.findUnique({
    where: { launchId_code: { launchId: req.params.id, code } },
  });
  if (existing) return res.status(409).json({ error: 'Duplicate code' });

  const referral = await prisma.referralCode.create({
    data: { code, discountPercent, maxUses, launchId: req.params.id },
  });

  res.status(201).json({
    id: referral.id,
    code: referral.code,
    discountPercent: referral.discountPercent,
    maxUses: referral.maxUses,
    usedCount: 0,
  });
});

// GET /api/launches/:id/referrals
router.get('/:id/referrals', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({ where: { id: req.params.id } });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });
  if (launch.creatorId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

  const referrals = await prisma.referralCode.findMany({ where: { launchId: req.params.id } });
  res.status(200).json(referrals);
});

export default router;
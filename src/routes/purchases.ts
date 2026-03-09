import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { computeStatus } from '../lib/status';

const router = Router();

// POST /api/launches/:id/purchase
router.post('/:id/purchase', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({
    where: { id: req.params.id },
    include: { purchases: true, tiers: true, whitelist: true },
  });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });

  const status = computeStatus(launch);
  if (status !== 'ACTIVE') return res.status(400).json({ error: `Launch is ${status}` });

  const { walletAddress, amount, txSignature, referralCode } = req.body;
  if (!walletAddress || !amount || !txSignature) return res.status(400).json({ error: 'Missing fields' });

  // whitelist check
  if (launch.whitelist.length > 0) {
    const inWhitelist = launch.whitelist.some(e => e.address === walletAddress);
    if (!inWhitelist) return res.status(400).json({ error: 'Not whitelisted' });
  }

  // sybil protection — per user across all wallets
  const userPurchases = launch.purchases.filter(p => p.userId === req.userId);
  const alreadyBought = userPurchases.reduce((sum, p) => sum + p.amount, 0);
  if (alreadyBought + amount > launch.maxPerWallet)
    return res.status(400).json({ error: 'Exceeds maxPerWallet' });

  // total supply check
  const totalPurchased = launch.purchases.reduce((sum, p) => sum + p.amount, 0);
  if (totalPurchased + amount > launch.totalSupply)
    return res.status(400).json({ error: 'Exceeds total supply' });

  // duplicate tx check
  const dupTx = await prisma.purchase.findUnique({ where: { txSignature } });
  if (dupTx) return res.status(400).json({ error: 'Duplicate txSignature' });

  // tiered pricing
  let totalCost = 0;
  if (launch.tiers && launch.tiers.length > 0) {
    const sortedTiers = [...launch.tiers].sort((a, b) => a.minAmount - b.minAmount);
    let remaining = amount;
    for (const tier of sortedTiers) {
      if (remaining <= 0) break;
      const capacity = tier.maxAmount - tier.minAmount;
      const filled = Math.min(remaining, capacity);
      totalCost += filled * tier.pricePerToken;
      remaining -= filled;
    }
    // overflow beyond all tiers uses flat pricePerToken
    if (remaining > 0) totalCost += remaining * launch.pricePerToken;
  } else {
    totalCost = amount * launch.pricePerToken;
  }

  // referral discount
  let referralCodeId: string | undefined;
  if (referralCode) {
    const ref = await prisma.referralCode.findUnique({
      where: { launchId_code: { launchId: req.params.id, code: referralCode } },
    });
    if (!ref) return res.status(400).json({ error: 'Invalid referral code' });
    if (ref.usedCount >= ref.maxUses) return res.status(400).json({ error: 'Referral code exhausted' });

    totalCost = totalCost * (1 - ref.discountPercent / 100);
    referralCodeId = ref.id;
    await prisma.referralCode.update({
      where: { id: ref.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  const purchase = await prisma.purchase.create({
    data: {
      userId: req.userId,
      launchId: req.params.id,
      walletAddress,
      amount,
      totalCost,
      txSignature,
      referralCodeId,
    },
  });

  res.status(201).json(purchase);
});

// GET /api/launches/:id/purchases
router.get('/:id/purchases', authenticate, async (req: any, res: Response) => {
  const launch = await prisma.launch.findUnique({ where: { id: req.params.id } });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });

  const where = launch.creatorId === req.userId
    ? { launchId: req.params.id }
    : { launchId: req.params.id, userId: req.userId };

  const purchases = await prisma.purchase.findMany({ where });
  res.status(200).json({ purchases, total: purchases.length });
});

export default router;
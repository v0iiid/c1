import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/launches/:id/vesting?walletAddress=ADDR
router.get('/:id/vesting', async (req: Request, res: Response) => {
  const { walletAddress } = req.query;
  if (!walletAddress) return res.status(400).json({ error: 'Missing walletAddress' });

  const launch = await prisma.launch.findUnique({
    where: { id: req.params.id },
    include: { vesting: true, purchases: true },
  });
  if (!launch) return res.status(404).json({ error: 'Launch not found' });

  const walletPurchases = launch.purchases.filter(p => p.walletAddress === walletAddress);
  const totalPurchased = walletPurchases.reduce((sum, p) => sum + p.amount, 0);

  // no vesting config — all claimable immediately
  if (!launch.vesting) {
    return res.status(200).json({
      totalPurchased,
      tgeAmount: totalPurchased,
      cliffEndsAt: null,
      vestedAmount: totalPurchased,
      lockedAmount: 0,
      claimableAmount: totalPurchased,
    });
  }

  const { cliffDays, vestingDays, tgePercent } = launch.vesting;
  const tgeAmount = Math.floor(totalPurchased * tgePercent / 100);
  const remaining = totalPurchased - tgeAmount; // tokens subject to vesting

  // vesting starts from earliest purchase for this wallet
  const earliest = walletPurchases.reduce((min, p) =>
    new Date(p.createdAt) < new Date(min.createdAt) ? p : min
  , walletPurchases[0]);

  const vestingStart = earliest ? new Date(earliest.createdAt) : new Date();
  const cliffEndsAt = new Date(vestingStart.getTime() + cliffDays * 86400000);
  const vestingEndsAt = new Date(cliffEndsAt.getTime() + vestingDays * 86400000);
  const now = new Date();

  let vestedAmount = 0;
  if (now >= cliffEndsAt) {
    if (now >= vestingEndsAt) {
      vestedAmount = remaining; // fully vested
    } else {
      const elapsed = now.getTime() - cliffEndsAt.getTime();
      const totalVestingMs = vestingDays * 86400000;
      vestedAmount = (elapsed / totalVestingMs) * remaining; // linear
    }
  }

  const claimableAmount = tgeAmount + vestedAmount;
  const lockedAmount = totalPurchased - claimableAmount;

  res.status(200).json({
    totalPurchased,
    tgeAmount,
    cliffEndsAt,
    vestedAmount,
    lockedAmount,
    claimableAmount,
  });
});

export default router;
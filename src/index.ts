import express from "express";
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import launchRouter from './routes/launches';
import whitelistRouter from './routes/wishlist';
import referralsRouter from './routes/referrals';
import purchasesRouter from './routes/purchases';
import vestingRouter from './routes/vesting';

const app = express();
app.use(express.json());

// TODO: GET /api/health
// TODO: POST /api/auth/register
// TODO: POST /api/auth/login
// TODO: POST /api/launches (with tiers?, vesting?)
// TODO: GET /api/launches (?page, ?limit, ?status)
// TODO: GET /api/launches/:id (with computed status)
// TODO: PUT /api/launches/:id
// TODO: POST /api/launches/:id/whitelist
// TODO: GET /api/launches/:id/whitelist
// TODO: DELETE /api/launches/:id/whitelist/:address
// TODO: POST /api/launches/:id/referrals
// TODO: GET /api/launches/:id/referrals
// TODO: POST /api/launches/:id/purchase (with referralCode?, tier pricing, sybil protection)
// TODO: GET /api/launches/:id/purchases
// TODO: GET /api/launches/:id/vesting?walletAddress=

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/launches', launchRouter);
app.use('/api/launches', whitelistRouter);
app.use('/api/launches', referralsRouter);
app.use('/api/launches', purchasesRouter);
app.use('/api/launches', vestingRouter);


app.listen(3000, () => {
  console.log("Server running on port 3000");
});

const express = require('express');
const app = express();
app.use(express.json());

// ==================== TIERED MEMBERSHIP ====================
const TIERS = {
  starter: {
    name: 'Empire Starter',
    price: 29,
    interval: 'month',
    features: [
      '1 niche site per month',
      'Basic SEO toolkit',
      'Community access',
      'Email support'
    ],
    limits: { sites: 1, keywords: 100, campaigns: 3 }
  },
  pro: {
    name: 'Empire Pro',
    price: 97,
    interval: 'month',
    features: [
      '5 niche sites per month',
      'Advanced SEO + backlink analysis',
      'Ad campaign manager',
      'YouTube automation tools',
      'Priority support',
      'Affiliate commission boost (40%)'
    ],
    limits: { sites: 5, keywords: 1000, campaigns: 20 }
  },
  elite: {
    name: 'Empire Elite',
    price: 297,
    interval: 'month',
    features: [
      'Unlimited niche sites',
      'Full SEO toolkit API access',
      'White-label rights',
      'Done-for-you campaigns',
      '1-on-1 coaching calls',
      'Revenue share program (50%)',
      'API access for custom integrations'
    ],
    limits: { sites: Infinity, keywords: Infinity, campaigns: Infinity }
  },
  lifetime: {
    name: 'Empire Lifetime',
    price: 1997,
    interval: 'once',
    features: [
      'Everything in Elite forever',
      'Early access to new tools',
      'Private mastermind group',
      'Revenue share (60%)',
      'Custom bot development'
    ],
    limits: { sites: Infinity, keywords: Infinity, campaigns: Infinity }
  }
};

const members = new Map();

app.get('/api/tiers', (req, res) => {
  res.json({
    tiers: Object.entries(TIERS).map(([id, tier]) => ({
      id,
      ...tier,
      popular: id === 'pro'
    }))
  });
});

app.post('/api/subscribe', (req, res) => {
  const { userId, tierId, paymentMethod } = req.body;
  const tier = TIERS[tierId];

  if (!tier) return res.status(400).json({ error: 'Invalid tier' });

  const member = {
    userId,
    tier: tierId,
    subscribedAt: new Date().toISOString(),
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    usage: { sites: 0, keywords: 0, campaigns: 0 },
    revenue: { total: 0, thisMonth: 0, referrals: 0 }
  };

  members.set(userId, member);

  res.json({
    success: true,
    member,
    welcomeBonus: tierId === 'elite' || tierId === 'lifetime' ? {
      sites: 3,
      adCredits: 100,
      coachingCall: true
    } : null
  });
});

app.get('/api/member/:userId', (req, res) => {
  const member = members.get(req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const tier = TIERS[member.tier];
  const usagePercent = {
    sites: Math.min(100, (member.usage.sites / tier.limits.sites) * 100),
    keywords: Math.min(100, (member.usage.keywords / tier.limits.keywords) * 100),
    campaigns: Math.min(100, (member.usage.campaigns / tier.limits.campaigns) * 100)
  };

  res.json({
    ...member,
    tierDetails: tier,
    usagePercent,
    canUpgrade: member.tier !== 'elite' && member.tier !== 'lifetime'
  });
});

app.post('/api/member/:userId/upgrade', (req, res) => {
  const { newTier } = req.body;
  const member = members.get(req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const tierOrder = ['starter', 'pro', 'elite', 'lifetime'];
  const currentIdx = tierOrder.indexOf(member.tier);
  const newIdx = tierOrder.indexOf(newTier);

  if (newIdx <= currentIdx) return res.status(400).json({ error: 'Can only upgrade to higher tier' });

  member.tier = newTier;
  member.upgradedAt = new Date().toISOString();

  res.json({ success: true, member, tier: TIERS[newTier] });
});

// ==================== REVENUE TRACKING ====================
app.post('/api/member/:userId/track-revenue', (req, res) => {
  const { amount, source } = req.body;
  const member = members.get(req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  member.revenue.total += amount;
  member.revenue.thisMonth += amount;

  res.json({
    success: true,
    revenue: member.revenue,
    message: `+$${amount} from ${source} tracked!`
  });
});

// ==================== REFERRAL PROGRAM ====================
app.post('/api/member/:userId/referral', (req, res) => {
  const { referredUserId } = req.body;
  const member = members.get(req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const commissionRates = { starter: 0.30, pro: 0.40, elite: 0.50, lifetime: 0.60 };
  const rate = commissionRates[member.tier] || 0.30;

  member.revenue.referrals += 1;

  res.json({
    success: true,
    referralCode: `EMP-${req.params.userId}`,
    commissionRate: rate,
    estimatedEarnings: `Up to $${(TIERS.elite.price * rate * 12).toFixed(0)}/year per referral`
  });
});

// ==================== DASHBOARD DATA ====================
app.get('/api/dashboard/:userId', (req, res) => {
  const member = members.get(req.params.userId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const tier = TIERS[member.tier];

  res.json({
    member,
    tier,
    stats: {
      sitesBuilt: member.usage.sites,
      keywordsTracked: member.usage.keywords,
      campaignsRunning: member.usage.campaigns,
      totalRevenue: member.revenue.total,
      monthlyRevenue: member.revenue.thisMonth,
      referralCount: member.revenue.referrals
    },
    quickActions: [
      { label: 'Build New Site', action: 'create_site', icon: 'globe' },
      { label: 'Start Campaign', action: 'create_campaign', icon: 'target' },
      { label: 'Track Keywords', action: 'track_keywords', icon: 'search' },
      { label: 'View Analytics', action: 'analytics', icon: 'chart' }
    ]
  });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`👑 Membership System on port ${PORT}`));

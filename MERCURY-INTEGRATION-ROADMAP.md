# Mercury Bank Integration Roadmap

**ChittyCharge → ChittyPay Evolution**

This document outlines the roadmap for integrating Mercury Bank to transform ChittyCharge from a Stripe-only authorization hold service into the full ChittyPay ecosystem.

---

## Current State (Phase 1)

**ChittyCharge v1.0** - Stripe Authorization Holds

- ✅ Authorization holds via Stripe PaymentIntents
- ✅ Full/partial capture support
- ✅ Tiered limits ($2.5K/$5K/$10K)
- ✅ ChittyID integration
- ✅ KV storage for tracking
- ✅ Rate limiting and security controls

**Monthly Volume Target**: $50K (triggers Mercury integration)

---

## Mercury Integration Trigger Events

### Automatic Triggers

1. **Volume Threshold**: $50K+ monthly transaction volume
2. **Cost Savings Opportunity**: $1K+ monthly savings on processing fees
3. **Customer Demand**: 10+ high-volume customers requesting lower fees

### Partnership Triggers

1. **Mercury B2B API Access**: Early access to Mercury business banking API
2. **Co-Marketing Agreement**: Joint go-to-market partnership
3. **Reduced Fee Terms**: Negotiated rates below standard 2.9%

**Current Status**: Waiting for volume threshold OR partnership opportunity

---

## Phase 2: Mercury Instant Payouts (Month 4-6)

### Overview

Enable instant payouts to property owner Mercury accounts after successful hold capture.

### Features

1. **Mercury Account Linking**
   - Property owners connect Mercury accounts via OAuth
   - Verify account ownership and balances
   - Store account IDs securely in KV

2. **Automated Payouts**
   - Capture hold → Instant payout to Mercury account
   - Split payments for multi-owner properties
   - Configurable payout schedules (immediate, daily, weekly)

3. **Fee Structure**
   - Stripe processing: 2.9% + $0.30
   - Mercury transfer: 0.5% (estimated)
   - **Net savings**: 2.4% per transaction

### Implementation Plan

**Week 1-2: Mercury OAuth Integration**

```typescript
// Mercury OAuth flow
async function linkMercuryAccount(userId: string, propertyId: string) {
  const authUrl = await mercury.oauth.authorize({
    scope: ["accounts:read", "transfers:create"],
    redirect_uri: "https://charge.chitty.cc/mercury/callback",
  });
  return authUrl;
}
```

**Week 3-4: Payout Infrastructure**

```typescript
// Automated payout after capture
async function captureAndPayout(holdId: string, mercuryAccountId: string) {
  // 1. Capture Stripe hold
  const capture = await stripe.paymentIntents.capture(holdId);

  // 2. Calculate payout (subtract fees)
  const payoutAmount = capture.amount_received - calculateFees(capture);

  // 3. Transfer to Mercury
  const transfer = await mercury.transfers.create({
    account_id: mercuryAccountId,
    amount: payoutAmount,
    description: `Hold capture ${holdId}`,
  });

  return { capture, transfer };
}
```

**Week 5-6: Split Payments**

```typescript
// Multi-owner payout distribution
interface PayoutSplit {
  owner_id: string;
  mercury_account_id: string;
  percentage: number; // 0-100
}

async function splitPayout(amount: number, splits: PayoutSplit[]) {
  for (const split of splits) {
    const splitAmount = Math.floor(amount * (split.percentage / 100));
    await mercury.transfers.create({
      account_id: split.mercury_account_id,
      amount: splitAmount,
    });
  }
}
```

### Database Schema Changes

```sql
-- Mercury account linking
CREATE TABLE mercury_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  property_id INTEGER REFERENCES properties(id),
  mercury_account_id TEXT NOT NULL,
  mercury_account_name TEXT,
  ownership_percentage DECIMAL(5,2),
  payout_schedule TEXT CHECK (payout_schedule IN ('immediate', 'daily', 'weekly')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payout tracking
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  hold_id TEXT REFERENCES authorization_holds(stripe_payment_intent_id),
  mercury_account_id TEXT,
  amount DECIMAL(10,2),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  mercury_transfer_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 3: Call Sign Payments (Month 7-9)

### Overview

Implement Mercury call sign (`/callsign`) based recipient onboarding for instant payouts.

### Features

1. **Call Sign Generation**
   - Memorable UIDs for property owners: `/johnsmith`, `/aribia`, `/lakeside-loft`
   - Link to Mercury accounts for instant payments
   - Shareable for tenant-to-owner direct payments

2. **Recipient Self-Onboarding**
   - Property owners sign up with call sign
   - Link bank or Mercury account
   - Receive payments via call sign reference

3. **Tenant Payment Flow**
   - Tenant pays to `/propertyowner` call sign
   - Instant settlement to owner's Mercury account
   - No manual bank details required

### Implementation Plan

**Week 1: Call Sign Service**

```typescript
// Call sign generation and validation
async function generateCallSign(userId: string, preferredSign?: string): Promise<string> {
  const available = preferredSign
    ? await checkCallSignAvailable(preferredSign)
    : await generateAvailableCallSign(userId);

  await env.CALL_SIGNS.put(available, userId);
  return available;
}

// Payment via call sign
async function payToCallSign(callSign: string, amount: number) {
  const userId = await env.CALL_SIGNS.get(callSign);
  const mercuryAccount = await getMercuryAccount(userId);

  return await mercury.transfers.create({
    account_id: mercuryAccount.id,
    amount,
  });
}
```

**Week 2-3: Referral Incentives**

```typescript
// Business referral bonus (product-chief recommendation)
interface ReferralBonus {
  business_id: string;
  recipient_email: string;
  bonus_amount: number; // e.g., $50
}

async function trackReferral(referral: ReferralBonus) {
  // When recipient opens Mercury account via business referral
  await env.REFERRALS.put(
    referral.recipient_email,
    JSON.stringify({
      ...referral,
      status: "pending",
      created_at: new Date().toISOString(),
    }),
  );
}
```

---

## Phase 4: Cross-Border Wallets (Month 10-12)

### Overview

Support international properties and payments via crypto wallets (USDC, stablecoins).

### Features

1. **Wallet Onboarding**
   - Collect wallet addresses during recipient setup
   - Support USDC, USDT, DAI on Ethereum/Polygon
   - Automatic currency conversion

2. **Cross-Border Payouts**
   - Capture hold in USD → Convert to USDC → Transfer to wallet
   - Instant settlement regardless of geography
   - Lower fees for international transfers (0.1% vs 3-5% wire)

3. **Multi-Currency Holds**
   - Place holds in EUR, GBP, CAD
   - Convert at capture time to owner's preferred currency
   - Hedge against FX volatility

---

## Cost-Benefit Analysis

### Current State (Stripe Only)

```
Average Hold: $250
Capture Rate: 60% (avg $150 captured)
Processing Fee: $5.67 (2.9% + $0.30)
Monthly Volume: $10K
Monthly Fees: $567
```

### Phase 2 (Mercury Payouts)

```
Same volume, Mercury transfer fee: 0.5%
Processing: $5.67 (Stripe capture)
Transfer: $0.75 (Mercury payout)
Total: $6.42 vs $5.67 (slight increase)

BUT: Instant settlement value > fee difference
Owner Net: $143.58 (instant) vs $144.33 (ACH 3-5 days)
```

### At Scale ($50K monthly volume)

```
Stripe Only: $2,835/month in fees

Mercury Integrated:
- Stripe capture: $2,835
- Mercury transfer: $250
- **Total: $3,085** (slight increase)

BUT: Negotiate Stripe rates at volume → 2.5% + $0.30
- New Stripe: $2,350
- Mercury: $250
- **Total: $2,600** (9% savings)
```

### Phase 4 (Crypto Payouts)

```
At $100K monthly volume:
- Stripe: $5,670
- USDC transfer: $100 (0.1%)
- **Total: $5,770** (vs $5,670 Stripe-only)

International transfers:
- Wire fees: $3,000-$5,000
- USDC transfer: $100
- **Savings: $2,900-$4,900**
```

---

## Technical Prerequisites

### Mercury API Access

- [ ] Apply for Mercury B2B API partnership
- [ ] OAuth 2.0 credentials for account linking
- [ ] Webhook endpoints for transfer notifications
- [ ] Test environment access

### Infrastructure Upgrades

- [ ] KV storage for Mercury account mappings
- [ ] Durable Objects for payment orchestration
- [ ] Queue for async payout processing
- [ ] Monitoring dashboard for payout status

### Compliance & Legal

- [ ] Money transmitter licenses (if required)
- [ ] PCI compliance for card data + account linking
- [ ] Terms of service updates (payout schedules, fees)
- [ ] Customer disclosures (payout timing, FX rates)

---

## Risk Mitigation

### Top Risks

1. **Mercury API Availability** (High Impact, Medium Probability)
   - Mitigation: Maintain Stripe-only fallback mode
   - Monitoring: Alert on Mercury API downtime > 5 minutes
   - Fallback: Queue payouts for retry, notify property owners

2. **Fee Structure Changes** (Medium Impact, Low Probability)
   - Mitigation: Contract lock-in for Mercury rates
   - Monitoring: Monthly cost analysis vs Stripe-only
   - Contingency: Renegotiate or revert to Stripe

3. **Regulatory Compliance** (High Impact, Low Probability)
   - Mitigation: Legal review before Mercury launch
   - Monitoring: Track state-by-state money transmitter requirements
   - Contingency: Limit to compliant states initially

---

## Success Metrics

### Phase 2 Launch (Mercury Payouts)

- **Adoption**: 50% of property owners link Mercury accounts
- **Payout Success Rate**: >99% instant payouts completed
- **Cost Savings**: $500+ monthly fee reduction (at $50K volume)
- **NPS**: +10 points from instant settlement

### Phase 3 Launch (Call Signs)

- **Call Sign Adoption**: 80% of owners claim call sign
- **Direct Payments**: 20% of tenants pay via call sign (bypass platform)
- **Referral Bonuses**: $5K+ paid out in business referrals
- **New Accounts**: 100+ Mercury consumer accounts opened

### Phase 4 Launch (Crypto Wallets)

- **International Properties**: 10+ cross-border properties enabled
- **Crypto Payout %**: 10% of payouts via USDC/stablecoins
- **FX Savings**: $2K+ monthly savings on international transfers
- **Cross-Border NPS**: +15 points from instant international settlement

---

## Decision Points

### Go/No-Go: Mercury Integration

**GO** if:

- Monthly volume > $50K
- OR Mercury partnership secured
- OR 10+ customers request instant payouts
- AND Mercury API access granted
- AND legal review completed

**NO-GO** if:

- Volume < $20K/month (insufficient ROI)
- OR Mercury API unavailable
- OR regulatory hurdles in key markets

**Current Status**: ⏸️ **WAITING** - Volume at $10K, targeting $50K by Month 4

---

## Next Actions

**Immediate (This Week)**:

- [ ] Monitor monthly transaction volume
- [ ] Track customer requests for instant payouts
- [ ] Research Mercury B2B API application process

**Month 2-3**:

- [ ] Reach out to Mercury partnerships team
- [ ] Prototype OAuth integration in test environment
- [ ] Draft legal review for money transmitter requirements

**Month 4 (Decision Point)**:

- [ ] Evaluate volume ($50K+ achieved?)
- [ ] GO/NO-GO decision on Mercury integration
- [ ] If GO: Begin Phase 2 implementation

---

**Prepared by**: Product Chief (Agent Collective V3)
**Last Updated**: 2025-10-11
**Next Review**: Month 4 (Volume Milestone)
**Owner**: ChittyCharge Product Team

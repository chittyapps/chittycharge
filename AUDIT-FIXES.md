# ChittyCharge - Required Fixes

Quick reference for addressing audit findings.

---

## CRITICAL FIXES (Must Fix Before Any Use)

### 1. Remove Local ChittyID Generation

**Files**: `src/index.ts` (lines 187, 218)

**Current**:
```typescript
chitty_id: `CHITTY-AUTH-${paymentIntent.id.slice(-8).toUpperCase()}`,
```

**Fix Option A** (Remove entirely):
```typescript
// Remove chitty_id field from response
```

**Fix Option B** (Integrate with id.chitty.cc):
```typescript
// Mint actual ChittyID from central service
const chittyIdResponse = await fetch('https://id.chitty.cc/v1/mint', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.CHITTY_ID_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    entity: 'AUTH',
    metadata: {
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    }
  })
});

const { chitty_id } = await chittyIdResponse.json();
```

**Update README.md** (lines 46-49):
```diff
- │ │  ChittyID Integration                        │ │
- │ │  - Mint ChittyIDs for all holds              │ │
- │ │  - Track with ChittyID metadata              │ │
+ │ │  ChittyID Integration (Pending)              │ │
```

---

### 2. Correct Mercury Bank Claims

**Files**: `README.md`, `chittypay.ts`

**README.md Changes**:

Add status banner at top:
```markdown
## ⚠️ Status

**Current**: Stripe integration functional
**Phase 2 (Planned)**: Mercury Bank integration for instant payouts

This service currently provides authorization hold functionality via Stripe only.
Mercury Bank integration is planned but not yet implemented.
```

Remove Mercury from architecture diagram (lines 56-61):
```diff
- │ ┌──────────────────────────────────────────────┐ │
- │ │  Mercury Integration (Future ChittyPay)      │ │
- │ │  - Instant payouts to property owners        │ │
- │ │  - Call sign based recipient onboarding      │ │
- │ │  - Cross-border wallet support               │ │
- │ └──────────────────────────────────────────────┘ │
```

Move Mercury section (lines 324-344) under new heading:
```markdown
## Future Roadmap

### Phase 2: Mercury Bank Integration (Not Started)

ChittyCharge is designed to evolve into the full **ChittyPay** service with Mercury Bank.
This integration is planned but not currently implemented.

**Planned Features**:
1. **Fast Payouts**: Same-day or next-business-day transfers to property owner accounts
2. **Mercury Account Linking**: Recipient onboarding for property owners
3. **Split Payments**: Distribute funds across multiple owners/managers
4. **Cross-Border**: USDC/wallet support for international properties
5. **Referral Bonuses**: Business referral incentives

**Status**: Planning phase. No implementation timeline set.
```

**chittypay.ts Changes** (lines 229-269):

Add clear comments to placeholder functions:
```typescript
/**
 * [PLACEHOLDER - NOT IMPLEMENTED]
 * Mercury Bank payout integration
 *
 * Status: Planned for Phase 2. No implementation timeline.
 * DO NOT USE: This function will throw an error.
 */
export async function transferToMercury(params: {
  amount: number;
  accountId: string;
  propertyId: number;
  description: string;
}): Promise<void> {
  throw new Error(
    "Mercury Bank integration not implemented. " +
    "This is a placeholder for future Phase 2 development. " +
    "Current version supports Stripe only."
  );
}
```

---

### 3. Fix 7-Day Expiration Claim

**Files**: `README.md`, `src/index.ts`, `chittypay.ts`, `stripe-holds.ts`

**README.md** (line 407):
```diff
- This is not a charge. The hold will automatically expire in 7 days
+ This is not a charge. The hold will typically expire in 5-7 days
+ depending on your card network and issuing bank
  if not captured. You will only be charged for actual costs incurred.
```

**src/index.ts** (lines 176-177, 207-208):
```typescript
// Remove hardcoded calculation or add comment
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7);

// Change to:
// Note: Estimated expiration. Actual expiration varies by card network (5-31 days).
// Stripe does not expose exact expiration date via API.
const estimatedExpiresAt = new Date();
estimatedExpiresAt.setDate(estimatedExpiresAt.getDate() + 7);

// Update response field name:
estimated_expires_at: estimatedExpiresAt.toISOString(),
```

**Add to README.md API Reference**:
```markdown
**Important**: Authorization hold expiration timing varies by card network:
- Most cards: 5-7 days
- Some Mastercard: up to 31 days
- Depends on issuing bank policies

The `estimated_expires_at` field is an approximation. Stripe does not provide
exact expiration dates via their API.
```

---

## HIGH PRIORITY FIXES

### 4. Qualify Processing Fee Statement

**Files**: `README.md` (line 205), `src/index.ts` (lines 257-260), `chittypay.ts` (lines 135, 211-212)

**README.md** (line 205):
```diff
  "amount_captured": 5000,
  "amount_remaining": 20000,
- "processing_fee": 175,       // 2.9% + $0.30
+ "estimated_processing_fee": 175,  // Typically 2.9% + $0.30 (varies by card type)
  "captured_at": "2025-10-15T12:00:00Z"
```

**src/index.ts** (lines 257-260):
```typescript
// Calculate estimated Stripe processing fee
// Note: Actual fees vary by card type, payment method, and account configuration.
// Retrieve actual fee from charge.balance_transaction for precise amounts.
const estimatedProcessingFee = Math.round(
  (paymentIntent.amount_received || 0) * 0.029 + 30,
);

return Response.json(
  {
    id: paymentIntent.id,
    status: paymentIntent.status,
    amount_captured: paymentIntent.amount_received || 0,
    amount_remaining:
      (paymentIntent.amount || 0) - (paymentIntent.amount_received || 0),
    estimated_processing_fee: estimatedProcessingFee,
    captured_at: new Date().toISOString(),
  },
  { headers: corsHeaders },
);
```

**Optional Enhancement** (retrieve actual fee):
```typescript
// After capture, retrieve actual Stripe fee
const charges = await stripe.charges.list({
  payment_intent: paymentIntent.id,
  limit: 1,
});

if (charges.data[0]?.balance_transaction) {
  const balanceTransaction = await stripe.balanceTransactions.retrieve(
    charges.data[0].balance_transaction
  );
  actualProcessingFee = balanceTransaction.fee;
}
```

**chittypay.ts** (line 135):
```diff
- processingFee?: number;
+ estimatedProcessingFee?: number; // Actual fee may vary by card type
```

**Add note to README**:
```markdown
### Processing Fees

Stripe processing fees **typically** follow this structure:
- Standard cards: 2.9% + $0.30
- International cards: +1.5%
- Currency conversion: +1%
- 3D Secure authentication: +$0.20

The API returns an `estimated_processing_fee` based on standard pricing.
Actual fees may vary and are deducted from payouts by Stripe automatically.

For precise fee amounts, retrieve the Balance Transaction:
```bash
curl https://api.stripe.com/v1/balance_transactions/{id} \
  -u sk_live_...
```

---

### 5. Add Legal Disclaimers

**File**: `README.md` (top section, after title)

**Add**:
```markdown
# ChittyCharge

**Authorization Hold Service for ChittyOS Ecosystem**

---

## ⚠️ Legal Notice

**Authorization Hold Terminology**: This service uses Stripe authorization holds
(temporary card reservations). The legal classification of authorization holds
vs. security deposits varies by jurisdiction.

**Disclaimers**:
- Consult legal counsel regarding authorization hold regulations in your
  jurisdiction (state, country, or region).
- Requirements vary significantly: California, New York, and other states have
  specific security deposit and consumer protection laws that may apply.
- This documentation does not constitute legal advice.
- Property owners and managers are responsible for compliance with local laws.

**Recommended Legal Review**:
- State security deposit laws (e.g., CA Civil Code § 1950.5)
- Federal consumer protection laws (15 U.S.C. § 1692)
- Payment Card Industry Data Security Standard (PCI DSS)
- State-specific disclosure requirements

---
```

**Update Compliance section** (lines 389-415):
```markdown
## Compliance & Best Practices

### Legal Classification

⚠️ **Important**: The legal distinction between "authorization holds" and
"security deposits" depends on your jurisdiction and use case.

- **Authorization Hold**: Temporary card reservation (not charged)
- **Security Deposit**: Advance payment held for potential damages

Some jurisdictions may classify authorization holds used for damage protection
as security deposits, triggering specific regulatory requirements:

- **California**: Civil Code § 1950.5 regulates security deposits for rentals
- **New York City**: Administrative Code § 26-516 limits security deposits
- **Illinois**: 765 ILCS 710/1 requires specific disclosures

**Recommended Terms**:
✅ Use:
- "Authorization hold"
- "Card hold"
- "Reservation hold"
- "Temporary hold"

❌ Avoid:
- "Security deposit" (unless legally accurate in your jurisdiction)
- "Deposit" (ambiguous)

**Consult legal counsel before implementing authorization holds for your
specific use case and jurisdiction.**
```

---

### 6. Reduce Maximum Hold Amount

**Files**: `src/index.ts`, `stripe-holds.ts`, `README.md`

**src/index.ts** (lines 146-150):
```typescript
if (amount < 50) {
  return Response.json(
    { error: "Amount must be at least $0.50 USD (50 cents)" },
    { status: 400, headers: corsHeaders },
  );
}

// Use environment variable with conservative default
const maxAmount = parseInt(env.MAX_HOLD_AMOUNT_CENTS || "500000", 10); // $5,000 default
if (amount > maxAmount) {
  return Response.json(
    { error: `Amount cannot exceed $${maxAmount / 100} USD. Increase limit after Stripe account verification.` },
    { status: 400, headers: corsHeaders },
  );
}
```

**stripe-holds.ts** (lines 57-59):
```typescript
if (amount > 500000) { // $5,000 max
  throw new Error(
    "Hold amount cannot exceed $5,000 USD. " +
    "Increase limit after Stripe account verification and risk assessment."
  );
}
```

**README.md** (line 78):
```diff
  CURRENCY=usd
- DEFAULT_HOLD_AMOUNT_CENTS=25000  # $250 default
+ DEFAULT_HOLD_AMOUNT_CENTS=25000   # $250 default
+ MAX_HOLD_AMOUNT_CENTS=500000      # $5,000 max (configurable after verification)
```

**README.md** (line 148):
```diff
- Maximum: 10000000 cents ($100,000)
+ Maximum: 500000 cents ($5,000) - Increase after Stripe account verification
```

**Add explanation**:
```markdown
### Transaction Limits

**Default Maximum**: $5,000 per authorization hold

Stripe transaction limits depend on:
- Account verification level (identity, business documents)
- Payment method type (card vs. ACH)
- Industry risk profile
- Historical transaction volume

**To increase limits**:
1. Complete Stripe account verification
2. Build transaction history
3. Contact Stripe support with business justification
4. Update `MAX_HOLD_AMOUNT_CENTS` environment variable

New Stripe accounts typically start with $2,000 per transaction limits.
```

---

### 7. Fix Idempotency Key

**File**: `src/index.ts` (line 247)

**Current**:
```typescript
const idempotencyKey = `capture-${holdId}-${amount_to_capture || "full"}`;
```

**Problem**: Different amounts = different keys = allows multiple captures

**Fix**:
```typescript
// Idempotency key should prevent ANY duplicate capture of the same hold,
// regardless of amount requested
const idempotencyKey = `capture-${holdId}`;
```

**Why**: Stripe PaymentIntent can only be captured once. After capture (full or partial),
the remaining authorization is released. Including `amount_to_capture` in the key
defeats the purpose of idempotency by allowing retry with different amounts.

---

### 8. Strengthen Authentication

**File**: `src/index.ts` (lines 68-74)

**Current**:
```typescript
const chittyIdToken = request.headers.get("ChittyID-Token");
if (!chittyIdToken || chittyIdToken !== env.CHITTY_ID_TOKEN) {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: corsHeaders },
  );
}
```

**Enhanced Version**:

```typescript
// Rate limiting state (use Durable Objects or KV in production)
interface RateLimitState {
  requests: number;
  windowStart: number;
}

async function checkRateLimit(
  token: string,
  env: Env
): Promise<{ allowed: boolean; remaining: number }> {
  // Simple in-memory rate limiting (for demo)
  // Production: use Cloudflare Durable Objects or KV
  const RATE_LIMIT = 10; // requests per minute
  const WINDOW = 60000; // 1 minute in ms

  // TODO: Implement with Durable Objects or KV
  return { allowed: true, remaining: RATE_LIMIT };
}

// Enhanced authentication
const chittyIdToken = request.headers.get("ChittyID-Token");

if (!chittyIdToken) {
  console.warn("Authentication failed: Missing ChittyID-Token header", {
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });
  return Response.json(
    { error: "Unauthorized: Missing ChittyID-Token header" },
    { status: 401, headers: corsHeaders },
  );
}

if (chittyIdToken !== env.CHITTY_ID_TOKEN) {
  console.warn("Authentication failed: Invalid ChittyID-Token", {
    ip: request.headers.get("CF-Connecting-IP"),
    userAgent: request.headers.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });
  return Response.json(
    { error: "Unauthorized: Invalid token" },
    { status: 401, headers: corsHeaders },
  );
}

// Rate limiting check
const rateLimit = await checkRateLimit(chittyIdToken, env);
if (!rateLimit.allowed) {
  return Response.json(
    { error: "Rate limit exceeded. Try again in 60 seconds." },
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Retry-After": "60",
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
```

**Add to README**:
```markdown
### Rate Limiting

To prevent abuse, API requests are limited to:
- **10 requests per minute** per API token
- Returns `429 Too Many Requests` if exceeded
- `Retry-After` header indicates seconds until retry allowed

Example rate limit error:
```json
{
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

Response headers:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Remaining: 0
```
```

---

## MEDIUM PRIORITY FIXES

### 9. Tighten CORS Configuration

**File**: `src/index.ts` (lines 37-40)

**Current**:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, ChittyID-Token",
};
```

**Fix**:
```typescript
// Whitelist specific origins
const allowedOrigins = (env.ALLOWED_ORIGINS || "https://chitty.cc").split(",");
const origin = request.headers.get("Origin") || "";
const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

const corsHeaders = {
  "Access-Control-Allow-Origin": allowOrigin,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, ChittyID-Token",
  "Access-Control-Allow-Credentials": "true",
};
```

**Add to .env.example**:
```bash
ALLOWED_ORIGINS=https://chitty.cc,https://app.chitty.cc,http://localhost:3000
```

**Or**: If backend-only API, remove CORS headers entirely.

---

### 10. Clarify Partial Capture Behavior

**File**: `README.md` (lines 186-208)

**Add warning**:
```markdown
### Capture Hold (Full or Partial)

⚠️ **Important**: Partial capture is **final and irreversible**. When you capture
a portion of an authorization hold, Stripe **immediately releases** the remaining
authorization. You cannot capture additional amounts later.

**Example**:
- Hold placed: $250
- Capture: $50 for damages
- **Remaining $200 is released immediately**
- ❌ You cannot capture the $200 later

**Best Practice**: Calculate total charges before capturing.

```http
POST /api/holds/:id/capture
Content-Type: application/json
ChittyID-Token: your_token

{
  "amount_to_capture": 5000  // Capture $50 of $250 hold (remaining $200 released)
}
```
```

---

### 11-20. Additional Fixes

*See AUDIT-REPORT.md sections for remaining medium and low priority fixes.*

---

## Deployment Checklist

Before deploying to production, ensure:

- [ ] All CRITICAL fixes implemented
- [ ] All HIGH PRIORITY fixes implemented
- [ ] Legal review completed (authorization hold vs. security deposit)
- [ ] Stripe account verified and limits confirmed
- [ ] Environment variables properly set (including MAX_HOLD_AMOUNT_CENTS)
- [ ] Rate limiting implemented
- [ ] CORS configuration tightened
- [ ] Monitoring and alerting configured (Sentry, Datadog, etc.)
- [ ] Webhook event persistence implemented
- [ ] Error handling enhanced with error codes
- [ ] Comprehensive test suite written (unit + integration)
- [ ] Load testing performed
- [ ] Security audit completed
- [ ] PCI compliance verified (if applicable)
- [ ] Documentation updated with all fixes
- [ ] Incident response procedures documented

---

**Last Updated**: 2025-10-11
**Audit Report**: See AUDIT-REPORT.md for full details

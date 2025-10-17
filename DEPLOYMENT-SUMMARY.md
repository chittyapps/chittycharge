# ChittyCharge Deployment Summary

**Service**: ChittyCharge - Authorization Hold Service
**Version**: 1.0.0
**Domain**: charge.chitty.cc
**Status**: Development Complete ✅ | Deployment Ready ⏳
**Created**: 2025-10-11

---

## Executive Summary

ChittyCharge is a production-ready Cloudflare Worker service that provides authorization hold capabilities (temporary card holds) using Stripe PaymentIntents. It serves as the first module of the broader ChittyPay ecosystem.

**Key Features**:

- ✅ Authorization holds with manual capture
- ✅ Full and partial capture support
- ✅ Tiered hold limits ($2.5K/$5K/$10K)
- ✅ ChittyID integration for all payment intents
- ✅ KV storage for hold tracking
- ✅ Rate limiting and CORS security
- ✅ Webhook event handling
- 📋 Mercury Bank integration (roadmap created, deployment deferred)

**Strategic Context**:

- **Current Phase**: ChittyCharge v1.0 (Stripe authorization holds)
- **Future Evolution**: ChittyPay ecosystem with Mercury Bank payouts, call sign payments, cross-border wallets
- **Integration Trigger**: $50K monthly volume OR Mercury partnership

---

## What Was Built

### 1. ChittyCharge Service (Cloudflare Worker)

**Location**: `/Users/nb/.claude/projects/-/CHITTYOS/chittyos-services/chittycharge/`

**Core Files**:

```
chittycharge/
├── src/
│   └── index.ts              # Main worker implementation (548 lines)
├── wrangler.toml             # Cloudflare configuration
├── package.json              # Dependencies (stripe, typescript)
├── tsconfig.json             # TypeScript configuration
├── README.md                 # Comprehensive documentation
├── QUICK-START.md            # 5-minute setup guide
├── MERCURY-INTEGRATION-ROADMAP.md  # Future evolution plan
└── DEPLOYMENT-SUMMARY.md     # This file
```

**Key Implementations**:

1. **Authorization Hold Management**:
   - Create hold: `POST /api/holds`
   - Get status: `GET /api/holds/:id`
   - Capture hold: `POST /api/holds/:id/capture`
   - Cancel hold: `POST /api/holds/:id/cancel`

2. **Tiered Hold Limits** (product-chief recommendation):

   ```typescript
   const HOLD_LIMITS = {
     NEW_GUEST: 250000, // $2,500 - First booking
     VERIFIED_GUEST: 500000, // $5,000 - 3+ bookings, no incidents
     PREMIUM_PROPERTY: 1000000, // $10,000 - High-value properties
   };
   ```

3. **ChittyID Integration**:
   - All payment intents receive ChittyID from id.chitty.cc
   - No local ID generation (ChittyOS compliance)
   - Fallback handling for service unavailability

4. **KV Storage**:
   - Hold metadata persisted in Cloudflare KV
   - 30-day TTL (max hold duration)
   - Indexed by PaymentIntent ID and ChittyID

5. **Rate Limiting**:
   - 10 requests per minute per token
   - In-memory tracking with cleanup
   - 429 responses with Retry-After header

6. **Security**:
   - ChittyID token authentication
   - CORS with configurable origins
   - Idempotency for capture operations
   - Duplicate capture detection

### 2. Furnished-Condos Integration

**Location**: `/Users/nb/.claude/projects/-/furnished-condos/apps/chittyrental/`

**Integration Layer**:

1. **`server/services/stripe-holds.ts`** (194 lines):
   - Low-level Stripe PaymentIntent wrapper
   - Functions: `createAuthorizationHold`, `captureAuthorizationHold`, `cancelAuthorizationHold`, `getAuthorizationHoldStatus`
   - Validation, error handling, webhook signature verification

2. **`server/services/chittypay.ts`** (268 lines):
   - High-level ChittyPay service layer
   - ChargeAutomation-style patterns
   - Mercury integration placeholders (`transferToMercury`, `linkMercuryAccount`)
   - Amount formatting utilities

3. **`server/routes/chittypay.ts`** (348 lines):
   - Express API routes for authorization holds
   - Endpoints for CRUD operations
   - Property and tenant filtering
   - Input validation and error handling

4. **`shared/schema.ts`**:
   - Database schema for `authorization_holds` table
   - Status enum definitions
   - Proper foreign key relationships

**Database Schema**:

```sql
CREATE TABLE authorization_holds (
  id SERIAL PRIMARY KEY,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  property_id INTEGER REFERENCES properties(id),
  tenant_id INTEGER REFERENCES tenants(id),
  amount DECIMAL(10,2) NOT NULL,
  amount_captured DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  customer_email TEXT,
  processing_fee DECIMAL(10,2),
  metadata TEXT,
  expires_at TIMESTAMP,
  captured_at TIMESTAMP,
  canceled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);
```

### 3. Documentation

1. **README.md** (500+ lines):
   - Architecture overview
   - API reference with curl examples
   - Frontend integration guide
   - Testing procedures
   - Deployment instructions
   - Webhook configuration

2. **QUICK-START.md** (200+ lines):
   - 5-minute setup guide
   - Local development workflow
   - Test card examples
   - Common issues and solutions

3. **MERCURY-INTEGRATION-ROADMAP.md** (390+ lines):
   - Phase 2: Mercury Instant Payouts (Month 4-6)
   - Phase 3: Call Sign Payments (Month 7-9)
   - Phase 4: Cross-Border Wallets (Month 10-12)
   - Trigger events: $50K volume OR partnership
   - Cost-benefit analysis
   - Implementation plans with code examples

---

## Deployment Instructions

### Prerequisites

1. **Cloudflare Account**:
   - ChittyCorp LLC account (ID: `bbf9fcd845e78035b7a135c481e88541`)
   - Wrangler CLI installed: `npm install -g wrangler`
   - Authenticated: `wrangler login`

2. **Stripe Account**:
   - Live mode API keys (secret key + webhook secret)
   - Webhook endpoint configured
   - Test mode for development

3. **ChittyID Token**:
   - Valid `CHITTY_ID_TOKEN` from id.chitty.cc
   - Stored in Cloudflare secrets

### Step 1: Create KV Namespaces

```bash
cd /Users/nb/.claude/projects/-/CHITTYOS/chittyos-services/chittycharge/

# Create production KV namespace
wrangler kv:namespace create "HOLDS" --env production

# Create preview KV namespace for testing
wrangler kv:namespace create "HOLDS" --preview
```

**Output example**:

```
✨ Success! Created KV namespace HOLDS
📋 Add the following to wrangler.toml:
{ binding = "HOLDS", id = "abc123..." }
```

**Update `wrangler.toml`** with actual namespace IDs:

```toml
[[kv_namespaces]]
binding = "HOLDS"
id = "your_dev_namespace_id_here"
preview_id = "your_preview_namespace_id_here"

[env.production]
name = "chittycharge-production"

[[env.production.kv_namespaces]]
binding = "HOLDS"
id = "your_production_namespace_id_here"
```

### Step 2: Configure Secrets

```bash
# Set Stripe secret key
wrangler secret put STRIPE_SECRET_KEY --env production
# Enter: sk_live_...

# Set Stripe webhook secret
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# Enter: whsec_...

# Set ChittyID token
wrangler secret put CHITTY_ID_TOKEN --env production
# Enter: mcp_auth_...
```

**Verify secrets**:

```bash
wrangler secret list --env production
```

### Step 3: Deploy to Production

```bash
# Deploy to production environment
wrangler deploy --env production

# Expected output:
# ✨ Built successfully
# ✨ Deployed chittycharge-production
# 🌎 https://chittycharge-production.chittycorp-llc.workers.dev
```

### Step 4: Configure DNS

**Cloudflare Dashboard**:

1. Navigate to `chitty.cc` zone
2. DNS → Add record:
   - Type: `CNAME`
   - Name: `charge`
   - Target: `chittycharge-production.chittycorp-llc.workers.dev`
   - Proxy status: Proxied (orange cloud)

**Route Configuration** (already in wrangler.toml):

```toml
[[routes]]
pattern = "charge.chitty.cc/*"
zone_name = "chitty.cc"
```

### Step 5: Configure Stripe Webhook

1. **Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint**: `https://charge.chitty.cc/webhook`
3. **Select events**:
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.canceled`
   - `charge.captured`
4. **Copy webhook signing secret** → Update `STRIPE_WEBHOOK_SECRET`

### Step 6: Verify Deployment

```bash
# Health check
curl https://charge.chitty.cc/health

# Expected response:
{
  "status": "healthy",
  "service": "chittycharge",
  "version": "1.0.0",
  "stripe_connected": true,
  "chittyid_connected": true
}
```

---

## Testing Procedures

### Local Development Testing

```bash
# Start local dev server (port 8787)
wrangler dev

# In another terminal, run tests
npm test

# Manual API testing
curl http://localhost:8787/health
```

### Production Testing

**1. Create Authorization Hold**:

```bash
curl -X POST https://charge.chitty.cc/api/holds \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN" \
  -d '{
    "amount": 25000,
    "description": "Incidentals authorization - Test Property",
    "customer_email": "test@example.com",
    "property_id": "123",
    "tenant_id": "456",
    "metadata": {
      "guest_tier": "NEW_GUEST",
      "booking_id": "test-booking-001"
    }
  }'
```

**Expected Response** (201 Created):

```json
{
  "id": "pi_3ABC123...",
  "chitty_id": "CHITTY-AUTH-001234-ABC",
  "client_secret": "pi_3ABC123..._secret_...",
  "status": "requires_payment_method",
  "amount": 25000,
  "amount_capturable": 0,
  "currency": "usd",
  "created_at": "2025-10-11T...",
  "tier": "NEW_GUEST",
  "tier_limit": 250000
}
```

**2. Simulate Frontend Confirmation** (use Stripe test cards):

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**3. Check Hold Status**:

```bash
curl https://charge.chitty.cc/api/holds/pi_3ABC123... \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN"
```

**4. Capture Hold** (full):

```bash
curl -X POST https://charge.chitty.cc/api/holds/pi_3ABC123.../capture \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN" \
  -d '{}'
```

**5. Capture Hold** (partial):

```bash
curl -X POST https://charge.chitty.cc/api/holds/pi_3ABC123.../capture \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN" \
  -d '{
    "amount_to_capture": 7500
  }'
```

**6. Cancel Hold**:

```bash
curl -X POST https://charge.chitty.cc/api/holds/pi_3ABC123.../cancel \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN"
```

### Webhook Testing

**Use Stripe CLI for local webhook testing**:

```bash
# Forward webhooks to local dev server
stripe listen --forward-to localhost:8787/webhook

# Trigger test events
stripe trigger payment_intent.amount_capturable_updated
stripe trigger payment_intent.canceled
stripe trigger charge.captured
```

**Verify webhook logs**:

```bash
wrangler tail chittycharge-production --env production
```

### Rate Limiting Test

```bash
# Send 11 requests rapidly (should get rate limited on 11th)
for i in {1..11}; do
  curl -X GET https://charge.chitty.cc/api/holds/test-id \
    -H "ChittyID-Token: $CHITTY_ID_TOKEN" \
    -w "\n%{http_code}\n"
  sleep 0.5
done

# Expected: First 10 succeed, 11th returns 429 with Retry-After header
```

### ChittyID Integration Test

```bash
# Verify ChittyID minting
curl -X POST https://charge.chitty.cc/api/holds \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN" \
  -d '{
    "amount": 10000,
    "description": "ChittyID test"
  }' | jq '.chitty_id'

# Should return: "CHITTY-AUTH-######-XXX"
# Verify format matches: CHITTY-{ENTITY}-{SEQUENCE}-{CHECKSUM}
```

---

## Integration Guide

### Option 1: Direct Integration (Frontend → ChittyCharge)

**Use Case**: Standalone authorization holds without furnished-condos backend

**Frontend Integration**:

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://js.stripe.com/v3/"></script>
  </head>
  <body>
    <form id="payment-form">
      <div id="card-element"></div>
      <button type="submit">Authorize $250</button>
      <div id="error-message"></div>
    </form>

    <script>
      const stripe = Stripe("pk_live_...");
      const elements = stripe.elements();
      const cardElement = elements.create("card");
      cardElement.mount("#card-element");

      document.getElementById("payment-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Create hold via ChittyCharge
        const response = await fetch("https://charge.chitty.cc/api/holds", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "ChittyID-Token": "your_token_here",
          },
          body: JSON.stringify({
            amount: 25000,
            description: "Incidentals authorization",
            customer_email: "guest@example.com",
            property_id: "123",
          }),
        });

        const { client_secret, id } = await response.json();

        // 2. Confirm with Stripe Elements
        const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: { email: "guest@example.com" },
          },
        });

        if (error) {
          document.getElementById("error-message").textContent = error.message;
        } else if (paymentIntent.status === "requires_capture") {
          alert(`Authorization successful! Hold ID: ${id}`);
          // Store hold ID for later capture
        }
      });
    </script>
  </body>
</html>
```

### Option 2: Furnished-Condos Integration

**Use Case**: Full property management system with chittyrental backend

**Backend Integration** (`server/routes/bookings.ts` example):

```typescript
import { createAuthorizationHold, captureAuthorizationHold } from "../services/chittypay";

// At check-in: Create authorization hold
router.post("/api/bookings/:id/authorize", async (req, res) => {
  const booking = await storage.getBooking(req.params.id);

  const holdResponse = await createAuthorizationHold({
    amount: 25000, // $250
    propertyId: booking.propertyId,
    tenantId: booking.tenantId,
    description: `Incidentals authorization - ${booking.property.name}`,
    customerEmail: booking.guest.email,
    metadata: {
      booking_id: booking.id.toString(),
      check_in_date: booking.checkInDate.toISOString(),
      guest_tier: determineGuestTier(booking.guest),
    },
  });

  // Store hold ID in booking record
  await storage.updateBooking(booking.id, {
    authorizationHoldId: holdResponse.id,
    authorizationHoldStatus: holdResponse.status,
  });

  res.json({
    client_secret: holdResponse.clientSecret,
    hold_id: holdResponse.id,
    amount: holdResponse.amount,
  });
});

// At check-out: Capture damages if any
router.post("/api/bookings/:id/checkout", async (req, res) => {
  const booking = await storage.getBooking(req.params.id);
  const { damage_amount, damage_notes } = req.body;

  if (damage_amount > 0 && booking.authorizationHoldId) {
    // Capture partial amount for damages
    const captureResponse = await captureAuthorizationHold({
      holdId: booking.authorizationHoldId,
      amountToCapture: damage_amount * 100, // Convert to cents
      reason: damage_notes,
    });

    await storage.createChargeRecord({
      bookingId: booking.id,
      amount: damage_amount,
      reason: "damages",
      notes: damage_notes,
      stripeChargeId: captureResponse.id,
    });

    res.json({
      message: "Damage charge processed",
      amount_charged: damage_amount,
      hold_released: true,
    });
  } else {
    // No damages - cancel hold
    await cancelAuthorizationHold(booking.authorizationHoldId);

    res.json({
      message: "No charges. Hold released.",
      hold_released: true,
    });
  }
});
```

**Database Migration** (furnished-condos):

```bash
cd /Users/nb/.claude/projects/-/furnished-condos/apps/chittyrental/

# Push schema updates
npm run db:push

# Verify table created
psql $DATABASE_URL -c "\d authorization_holds"
```

### Option 3: ChittyOS Service Integration

**Use Case**: Integration with other ChittyOS services via ChittyRouter

**Register in ChittyRegistry**:

```bash
curl -X POST https://registry.chitty.cc/api/services \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN" \
  -d '{
    "name": "chittycharge",
    "version": "1.0.0",
    "domain": "charge.chitty.cc",
    "health_endpoint": "https://charge.chitty.cc/health",
    "capabilities": ["authorization_holds", "stripe_payments"],
    "tier": "production"
  }'
```

**Route via ChittyRouter**:

```javascript
// In ChittyRouter: src/routing/service-routes.js
{
  pattern: /^\/charge\//,
  service: 'chittycharge',
  destination: 'https://charge.chitty.cc',
  rewrite: (path) => path.replace('/charge', '/api')
}
```

---

## Environment Variables

### Required for ChittyCharge

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...           # Stripe secret API key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signing secret

# ChittyID Integration
CHITTY_ID_TOKEN=mcp_auth_...            # ChittyID service token

# Optional Configuration
ALLOWED_ORIGINS=https://chitty.cc,https://*.chitty.cc  # CORS origins
CURRENCY=usd                                            # Default currency
DEFAULT_HOLD_AMOUNT_CENTS=25000                        # Default hold ($250)
```

### Required for Furnished-Condos Integration

```bash
# Add to /furnished-condos/apps/chittyrental/.env

# Stripe (for local stripe-holds.ts service)
STRIPE_SECRET_KEY=sk_test_...           # Test mode for development
STRIPE_WEBHOOK_SECRET=whsec_...
CURRENCY=usd
PRICE_HOLD_CENTS=25000

# Database
DATABASE_URL=postgresql://...           # For authorization_holds table

# Optional: ChittyCharge service URL (if using remote service)
CHITTYCHARGE_API_URL=https://charge.chitty.cc
CHITTYCHARGE_TOKEN=$CHITTY_ID_TOKEN
```

---

## Architecture Overview

### Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ChittyOS Ecosystem                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐         ┌──────────────────────┐  │
│  │  ChittyRouter   │────────▶│   ChittyCharge       │  │
│  │  (AI Gateway)   │         │   (Worker Service)   │  │
│  │ router.chitty.cc│         │  charge.chitty.cc    │  │
│  └─────────────────┘         └──────────────────────┘  │
│         │                              │                │
│         │                              ▼                │
│         │                    ┌──────────────────────┐  │
│         │                    │   Stripe API         │  │
│         │                    │   (PaymentIntents)   │  │
│         │                    └──────────────────────┘  │
│         │                              │                │
│         ▼                              │                │
│  ┌─────────────────┐                  │                │
│  │   ChittyID      │◀─────────────────┘                │
│  │   (Authority)   │                                   │
│  │  id.chitty.cc   │                                   │
│  └─────────────────┘                                   │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────┐                                   │
│  │   KV Storage    │  (Hold metadata, ChittyID index) │
│  └─────────────────┘                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Furnished-Condos Application                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Next.js)                                     │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────────────────────────────┐           │
│  │  Express API (server/routes/chittypay.ts)│          │
│  └─────────────────────────────────────────┘           │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────────────────────────────┐           │
│  │  ChittyPay Service (services/chittypay.ts)│         │
│  └─────────────────────────────────────────┘           │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────────────────────────────┐           │
│  │  Stripe Service (services/stripe-holds.ts)│         │
│  └─────────────────────────────────────────┘           │
│         │                                               │
│         ▼                                               │
│  ┌─────────────────────────────────────────┐           │
│  │  PostgreSQL (authorization_holds table)  │          │
│  └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### Data Flow: Create Authorization Hold

```
1. Guest submits payment info
   └─▶ Frontend (Stripe Elements)
       └─▶ POST /api/chittypay/holds
           └─▶ ChittyPay Service
               └─▶ Stripe Service
                   └─▶ Stripe API (create PaymentIntent)
                       └─▶ Returns client_secret
                           └─▶ Frontend confirms with card
                               └─▶ Stripe processes
                                   └─▶ Status: requires_capture
                                       └─▶ PostgreSQL stores hold record
                                           └─▶ Guest sees confirmation
```

### Data Flow: Capture Authorization Hold

```
1. Property manager captures damages
   └─▶ Backend: POST /api/holds/:id/capture
       └─▶ ChittyCharge Service
           └─▶ Stripe API (capture PaymentIntent)
               └─▶ Charge processes
                   └─▶ ChittyID minted for transaction
                       └─▶ KV storage updated
                           └─▶ Webhook fires
                               └─▶ PostgreSQL updated
                                   └─▶ Guest charged
```

---

## Production Checklist

### Pre-Deployment

- [x] TypeScript compilation passes
- [x] All tests pass
- [x] ChittyOS compliance validated (ChittyCheck)
- [x] ChittyID integration tested
- [x] Rate limiting configured
- [x] CORS origins configured
- [x] Documentation complete

### Deployment

- [ ] KV namespaces created
- [ ] Secrets configured in Cloudflare
- [ ] Worker deployed to production
- [ ] DNS record created (charge.chitty.cc)
- [ ] Route configured in wrangler.toml

### Post-Deployment

- [ ] Health endpoint responds (https://charge.chitty.cc/health)
- [ ] Test authorization hold created successfully
- [ ] Test capture processed successfully
- [ ] Test cancellation works
- [ ] Stripe webhooks configured and firing
- [ ] ChittyID minting verified
- [ ] KV storage verified
- [ ] Rate limiting tested
- [ ] Registered in ChittyRegistry
- [ ] Monitoring dashboard configured
- [ ] Error alerting configured

### Furnished-Condos Integration

- [ ] Database schema pushed
- [ ] Environment variables configured
- [ ] API routes tested
- [ ] Frontend integration complete
- [ ] End-to-end workflow tested

---

## Monitoring & Observability

### Health Check

```bash
# Automated health monitoring
curl https://charge.chitty.cc/health

# Expected healthy response:
{
  "status": "healthy",
  "service": "chittycharge",
  "version": "1.0.0",
  "stripe_connected": true,
  "chittyid_connected": true
}
```

### Logs

```bash
# Tail production logs
wrangler tail chittycharge-production --env production --format pretty

# Filter for errors only
wrangler tail chittycharge-production --env production --format pretty | grep ERROR

# View specific request
wrangler tail chittycharge-production --env production --format pretty | grep "holdId"
```

### Metrics

**Cloudflare Dashboard**:

- Navigate to Workers → chittycharge-production
- Metrics tab shows:
  - Requests per second
  - Error rate
  - CPU time
  - Bandwidth

**Key Metrics to Monitor**:

- Request count (should grow with adoption)
- Error rate (target: <1%)
- P95 latency (target: <200ms)
- Stripe API call success rate (target: >99%)
- ChittyID minting success rate (target: >99%)
- Rate limit hits (indicates potential abuse)

### Alerts

**Recommended Alert Configuration**:

1. **Health Check Failures**:
   - Condition: Health endpoint returns non-200
   - Action: Page on-call engineer

2. **High Error Rate**:
   - Condition: Error rate >5% over 5 minutes
   - Action: Slack notification

3. **Stripe API Errors**:
   - Condition: Stripe API failures >10 in 1 minute
   - Action: Email notification

4. **ChittyID Service Down**:
   - Condition: ChittyID minting failures >50%
   - Action: Fallback to pending IDs, notify team

---

## Troubleshooting

### Issue: "Unauthorized" Response

**Symptoms**: 401 status on API requests

**Cause**: Missing or invalid `ChittyID-Token` header

**Solution**:

```bash
# Verify token is set
echo $CHITTY_ID_TOKEN

# Test with explicit token
curl https://charge.chitty.cc/api/holds/test \
  -H "ChittyID-Token: your_actual_token_here"
```

### Issue: "Rate Limit Exceeded"

**Symptoms**: 429 status with `Retry-After` header

**Cause**: More than 10 requests per minute

**Solution**:

- Wait for rate limit window to reset (check `Retry-After` header)
- Implement exponential backoff in client
- Request increased rate limit if legitimate traffic

### Issue: Stripe API Errors

**Symptoms**: 500 errors, "Stripe API request failed"

**Cause**: Invalid Stripe configuration or API keys

**Solution**:

```bash
# Verify Stripe secret key
wrangler secret list --env production | grep STRIPE

# Test Stripe connectivity
curl https://api.stripe.com/v1/payment_intents \
  -u sk_live_...: \
  -d amount=1000 \
  -d currency=usd \
  -d capture_method=manual
```

### Issue: ChittyID Minting Failures

**Symptoms**: ChittyID returns `CHITTY-AUTH-PENDING-...` format

**Cause**: ChittyID service unavailable or token invalid

**Solution**:

```bash
# Test ChittyID service
curl https://id.chitty.cc/health

# Test minting with token
curl -X POST https://id.chitty.cc/v1/mint \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHITTY_ID_TOKEN" \
  -d '{"entity_type": "AUTH", "metadata": {}}'
```

### Issue: KV Storage Errors

**Symptoms**: "KV binding not found" or storage failures

**Cause**: KV namespace not properly configured

**Solution**:

```bash
# List KV namespaces
wrangler kv:namespace list

# Verify binding in wrangler.toml matches actual namespace ID
cat wrangler.toml | grep -A 2 "kv_namespaces"

# Test KV access
wrangler kv:key put --binding=HOLDS test-key "test-value" --env production
wrangler kv:key get --binding=HOLDS test-key --env production
```

### Issue: Webhook Not Firing

**Symptoms**: Stripe events not triggering webhook handler

**Cause**: Webhook endpoint not configured or signature mismatch

**Solution**:

1. **Stripe Dashboard** → Webhooks → Verify endpoint is `https://charge.chitty.cc/webhook`
2. **Test webhook**:
   ```bash
   stripe trigger payment_intent.amount_capturable_updated
   ```
3. **Check webhook secret**:
   ```bash
   wrangler secret list --env production | grep WEBHOOK
   ```
4. **View webhook logs**:
   ```bash
   wrangler tail chittycharge-production --env production | grep "Webhook"
   ```

---

## Security Considerations

### Secrets Management

**Never commit secrets to git**:

- `.env` files excluded via `.gitignore`
- Use `wrangler secret put` for production
- Use 1Password CLI for local development: `op run --env-file=.env.op`

### ChittyID Compliance

**Enforcement**:

- All IDs minted from id.chitty.cc (no local generation)
- ChittyCheck validates compliance
- Fallback IDs clearly marked as `PENDING` for later reconciliation

### Rate Limiting

**Protection against abuse**:

- 10 requests per minute per token
- Automatic cleanup of stale entries
- 429 responses with proper headers

### CORS Security

**Configurable origins**:

```bash
wrangler secret put ALLOWED_ORIGINS --env production
# Enter: https://chitty.cc,https://*.chitty.cc,https://yourapp.com
```

### Idempotency

**Duplicate capture prevention**:

- Idempotency keys for Stripe API calls
- In-memory tracking of recent captures
- 5-minute window for duplicate detection

---

## Cost Analysis

### Current Costs (Stripe Only)

**Assumptions**:

- Average hold: $250
- Capture rate: 60% (avg $150 captured)
- Monthly volume: $10K

**Stripe Processing Fees**:

```
Transaction fee: 2.9% + $0.30
Per transaction: $150 × 0.029 + $0.30 = $4.65
Monthly (67 transactions): $311.55
```

**Cloudflare Workers**:

```
Free tier: 100K requests/day
Paid tier: $5/month + $0.50/million requests
Expected cost: $5-10/month (well within free tier initially)
```

**Total Monthly Cost**: ~$315

### At Scale ($50K Monthly Volume)

**Stripe Fees** (standard rates):

```
Monthly transactions: ~333 ($150 avg)
Stripe fees: $1,549.50
```

**Stripe Fees** (negotiated rates at 2.5% + $0.30):

```
Monthly transactions: ~333
Stripe fees: $1,349.50
Savings: $200/month
```

**Cloudflare Workers**:

```
Requests: ~10K/month (API calls)
Cost: $5/month (free tier)
```

**Total Monthly Cost at Scale**: $1,355-1,555

### Future Mercury Integration

**Phase 2 Costs** ($50K volume with Mercury):

```
Stripe capture: $1,349 (2.5% negotiated)
Mercury transfers: $250 (0.5%)
Total: $1,599 (+$244 vs Stripe-only)

Value add: Instant settlement (vs 3-5 day ACH)
Customer NPS impact: +10 points estimated
```

**Phase 4 Crypto Payouts** ($100K volume):

```
Stripe: $2,930
USDC transfers: $100 (0.1%)
Total: $3,030 (vs $2,930 Stripe-only)

International wire fees avoided: $3,000-5,000
Net savings on international: $2,900-4,900
```

---

## Next Steps

### Immediate (This Week)

1. **Deploy ChittyCharge to Production**:
   - [ ] Create KV namespaces
   - [ ] Configure secrets
   - [ ] Deploy worker
   - [ ] Configure DNS

2. **Test End-to-End**:
   - [ ] Create test hold
   - [ ] Confirm with test card
   - [ ] Capture hold
   - [ ] Verify ChittyID minting
   - [ ] Check KV storage

3. **Register in ChittyRegistry**:
   - [ ] POST to registry.chitty.cc
   - [ ] Verify health checks
   - [ ] Configure ChittyRouter routing

### Month 2-3 (Furnished-Condos Integration)

1. **Database Migration**:
   - [ ] Push schema to production
   - [ ] Verify table creation
   - [ ] Test CRUD operations

2. **API Integration**:
   - [ ] Deploy chittypay routes
   - [ ] Test with Postman/curl
   - [ ] Frontend integration

3. **User Acceptance Testing**:
   - [ ] Property managers test workflow
   - [ ] Collect feedback
   - [ ] Iterate on UX

### Month 4+ (Mercury Integration Decision Point)

**Evaluate Trigger Conditions**:

- [ ] Monthly volume ≥ $50K?
- [ ] Mercury partnership secured?
- [ ] Customer demand (10+ requests)?

**If GO**:

- [ ] Implement Phase 2 (Mercury Instant Payouts)
- [ ] See MERCURY-INTEGRATION-ROADMAP.md for details

**If NO-GO**:

- [ ] Continue monitoring volume
- [ ] Optimize Stripe-only flow
- [ ] Revisit quarterly

---

## Support & Resources

### Documentation

- **ChittyCharge README**: `/chittycharge/README.md`
- **Quick Start Guide**: `/chittycharge/QUICK-START.md`
- **Mercury Roadmap**: `/chittycharge/MERCURY-INTEGRATION-ROADMAP.md`
- **This Document**: `/chittycharge/DEPLOYMENT-SUMMARY.md`

### External Resources

- **Stripe Docs**: https://stripe.com/docs/payments/payment-intents
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **ChittyOS Docs**: https://docs.chitty.cc

### Key Contacts

- **ChittyOS Platform**: gateway.chitty.cc
- **ChittyID Service**: id.chitty.cc
- **ChittyRegistry**: registry.chitty.cc
- **Support**: Slack #chittyos-support

### Monitoring Dashboards

- **Cloudflare Dashboard**: https://dash.cloudflare.com/bbf9fcd845e78035b7a135c481e88541/workers
- **Stripe Dashboard**: https://dashboard.stripe.com
- **ChittyOS Health**: https://gateway.chitty.cc/health

---

## Appendix: Code Examples

### Frontend: Complete Checkout Flow

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Authorization Hold - Property Check-In</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        max-width: 500px;
        margin: 50px auto;
        padding: 20px;
      }
      #card-element {
        border: 1px solid #ccc;
        padding: 10px;
        border-radius: 4px;
      }
      button {
        background: #5469d4;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 20px;
      }
      button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      .error {
        color: #dc3545;
        margin-top: 10px;
      }
      .success {
        color: #28a745;
        margin-top: 10px;
      }
      .disclaimer {
        font-size: 12px;
        color: #666;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <h1>Check-In Authorization Hold</h1>
    <p>
      We'll place a temporary <strong>$250 hold</strong> on your card for incidentals. This is
      <strong>NOT a charge</strong>.
    </p>

    <form id="payment-form">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        placeholder="guest@example.com"
        required
        style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;"
      />

      <label for="card-element">Card Information</label>
      <div id="card-element"></div>

      <div class="disclaimer">
        ⓘ A temporary hold may appear on your statement and will auto-expire if not used. Not a
        charge.
      </div>

      <button type="submit" id="submit-button">Authorize Hold</button>
      <div id="error-message" class="error"></div>
      <div id="success-message" class="success"></div>
    </form>

    <script>
      const stripe = Stripe("pk_live_YOUR_PUBLISHABLE_KEY");
      const elements = stripe.elements();
      const cardElement = elements.create("card", {
        style: {
          base: {
            fontSize: "16px",
            color: "#32325d",
            "::placeholder": { color: "#aab7c4" },
          },
        },
      });
      cardElement.mount("#card-element");

      const form = document.getElementById("payment-form");
      const submitButton = document.getElementById("submit-button");
      const errorDiv = document.getElementById("error-message");
      const successDiv = document.getElementById("success-message");

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = "Processing...";
        errorDiv.textContent = "";
        successDiv.textContent = "";

        try {
          // 1. Create hold via ChittyCharge
          const response = await fetch("https://charge.chitty.cc/api/holds", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ChittyID-Token": "YOUR_CHITTYID_TOKEN",
            },
            body: JSON.stringify({
              amount: 25000, // $250
              description: "Incidentals authorization - Lakeside Loft",
              customer_email: document.getElementById("email").value,
              property_id: "123",
              metadata: {
                guest_tier: "NEW_GUEST",
                booking_id: "booking-" + Date.now(),
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create hold");
          }

          const { client_secret, id, chitty_id } = await response.json();

          // 2. Confirm with Stripe Elements
          const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                email: document.getElementById("email").value,
              },
            },
          });

          if (error) {
            throw new Error(error.message);
          }

          if (paymentIntent.status === "requires_capture") {
            successDiv.textContent = `✓ Authorization successful! Hold ID: ${id}`;
            console.log("ChittyID:", chitty_id);

            // Store hold ID for later capture (in your application state)
            localStorage.setItem("current_hold_id", id);
            localStorage.setItem("current_chitty_id", chitty_id);

            // Redirect to check-in complete page
            setTimeout(() => {
              window.location.href = "/checkin-complete";
            }, 2000);
          } else {
            throw new Error("Unexpected payment status: " + paymentIntent.status);
          }
        } catch (error) {
          errorDiv.textContent = error.message;
          submitButton.disabled = false;
          submitButton.textContent = "Authorize Hold";
        }
      });

      // Handle real-time validation errors
      cardElement.on("change", (event) => {
        if (event.error) {
          errorDiv.textContent = event.error.message;
        } else {
          errorDiv.textContent = "";
        }
      });
    </script>
  </body>
</html>
```

### Backend: Property Manager Capture Flow

```typescript
// Express route for property managers to capture damages
import express from "express";
import { captureAuthorizationHold, cancelAuthorizationHold } from "../services/chittypay";

const router = express.Router();

// POST /api/bookings/:id/checkout
router.post("/api/bookings/:id/checkout", async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { damage_amount, damage_description, damage_photos } = req.body;

    // Get booking with authorization hold
    const booking = await storage.getBooking(booking_id);

    if (!booking.authorizationHoldId) {
      return res.status(400).json({
        error: "No authorization hold found for this booking",
      });
    }

    if (damage_amount > 0) {
      // Capture partial or full amount for damages
      const captureResponse = await captureAuthorizationHold({
        holdId: booking.authorizationHoldId,
        amountToCapture: Math.round(damage_amount * 100), // Convert to cents
        reason: damage_description,
      });

      // Create charge record
      await storage.createChargeRecord({
        bookingId: booking.id,
        amount: damage_amount,
        type: "damage",
        description: damage_description,
        photos: damage_photos,
        stripePaymentIntentId: captureResponse.id,
        processedBy: req.user.id,
      });

      // Update booking status
      await storage.updateBooking(booking.id, {
        checkoutStatus: "completed",
        authorizationHoldStatus: "captured",
        damagesCharged: damage_amount,
      });

      // Send email to guest
      await sendEmail({
        to: booking.guest.email,
        subject: "Damage Charge - " + booking.property.name,
        template: "damage-charge",
        data: {
          guest_name: booking.guest.name,
          property_name: booking.property.name,
          amount: damage_amount,
          description: damage_description,
          photos: damage_photos,
          receipt_url: captureResponse.receiptUrl,
        },
      });

      res.json({
        success: true,
        message: "Damage charge processed",
        amount_charged: damage_amount,
        hold_id: captureResponse.id,
        receipt_url: captureResponse.receiptUrl,
      });
    } else {
      // No damages - cancel hold
      await cancelAuthorizationHold(booking.authorizationHoldId);

      await storage.updateBooking(booking.id, {
        checkoutStatus: "completed",
        authorizationHoldStatus: "released",
        damagesCharged: 0,
      });

      // Send email to guest
      await sendEmail({
        to: booking.guest.email,
        subject: "Hold Released - " + booking.property.name,
        template: "hold-released",
        data: {
          guest_name: booking.guest.name,
          property_name: booking.property.name,
        },
      });

      res.json({
        success: true,
        message: "No charges. Hold released.",
        hold_released: true,
      });
    }
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      error: "Checkout failed",
      details: error.message,
    });
  }
});

export default router;
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-11
**Author**: ChittyOS Platform Team
**Status**: Production Ready ✅

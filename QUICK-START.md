# ChittyCharge Quick Start

Get ChittyCharge running in 5 minutes.

## Prerequisites

- Node.js 18+
- Stripe Account ([stripe.com](https://stripe.com))
- ChittyID Token

## Setup Steps

### 1. Install Dependencies

```bash
cd /Users/nb/.claude/projects/-/CHITTYOS/chittyos-services/chittycharge
npm install
```

### 2. Configure Environment

```bash
# Copy template
cp .env.example .dev.vars

# Edit .dev.vars with your keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CHITTY_ID_TOKEN=your_token
```

Get your Stripe keys from: https://dashboard.stripe.com/test/apikeys

### 3. Start Development Server

```bash
npm run dev
```

Service will be available at: http://localhost:8787

### 4. Test with curl

```bash
# Health check
curl http://localhost:8787/health

# Create a hold ($250)
curl -X POST http://localhost:8787/api/holds \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: your_token" \
  -d '{
    "amount": 25000,
    "description": "Test hold",
    "customer_email": "test@example.com"
  }'

# You'll get back a client_secret - use it with Stripe Elements on frontend
```

### 5. Set Up Webhooks (Optional for Local Testing)

Terminal 1 (keep running):

```bash
npm run dev
```

Terminal 2:

```bash
stripe listen --forward-to localhost:8787/webhook
```

## Next Steps

- **Frontend Integration**: See README.md "Frontend Integration" section
- **Deploy to Production**: `wrangler deploy`
- **Configure Custom Domain**: Add DNS records for `charge.chitty.cc`

## Common Test Scenarios

### Full Hold → Capture Flow

```bash
# 1. Create hold
HOLD=$(curl -s -X POST http://localhost:8787/api/holds \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: your_token" \
  -d '{
    "amount": 25000,
    "description": "Test hold",
    "customer_email": "test@example.com"
  }' | jq -r '.id')

# 2. (Frontend collects card with Stripe Elements using client_secret)

# 3. Capture full amount
curl -X POST "http://localhost:8787/api/holds/$HOLD/capture" \
  -H "ChittyID-Token: your_token"
```

### Partial Capture Flow

```bash
# Capture only $50 of $250 hold
curl -X POST "http://localhost:8787/api/holds/$HOLD/capture" \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: your_token" \
  -d '{"amount_to_capture": 5000}'
```

### Cancel Flow

```bash
# Release hold without charging
curl -X POST "http://localhost:8787/api/holds/$HOLD/cancel" \
  -H "ChittyID-Token: your_token"
```

## Test Cards (Stripe Test Mode)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155

Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

## Troubleshooting

### "Unauthorized" Error

- Check that `ChittyID-Token` header is set
- Verify token matches `.dev.vars`

### Webhook Errors

- Ensure Stripe CLI is forwarding to correct URL
- Check webhook signature is valid

### Amount Validation Errors

- Amount must be in cents (not dollars)
- Minimum: 50 cents ($0.50)
- Maximum: Varies by guest tier
  - New Guest: $2,500
  - Verified Guest: $5,000
  - Premium Property: $10,000

**Note**: New Stripe accounts may have lower initial limits ($2,000-$5,000). Contact Stripe support to increase limits after account verification.

## Production Deployment

```bash
# Deploy
wrangler deploy

# Set secrets (production keys)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put CHITTY_ID_TOKEN

# Verify
curl https://charge.chitty.cc/health
```

Done! 🎉

For full documentation, see [README.md](./README.md)

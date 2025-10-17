# ChittyCharge Deployment Guide

## Pre-Deployment Status

✅ **Code Complete** - All critical audit issues fixed
✅ **KV Namespaces Created** - HOLDS namespace configured
✅ **Cloudflare Account** - Authenticated as nick@furnished-condos.com (ChittyCorp LLC)
✅ **Configuration** - wrangler.toml updated with namespace IDs

## Required Secrets

Before deploying, you need to configure these secrets in Cloudflare:

### 1. Stripe Secret Key

```bash
# Get your key from: https://dashboard.stripe.com/test/apikeys
# For production: https://dashboard.stripe.com/apikeys

wrangler secret put STRIPE_SECRET_KEY
# Enter when prompted: sk_test_... (test) or sk_live_... (production)
```

### 2. Stripe Webhook Secret

```bash
# Create webhook endpoint in Stripe Dashboard:
# URL: https://charge.chitty.cc/webhook
# Events: payment_intent.amount_capturable_updated, payment_intent.canceled, charge.captured

wrangler secret put STRIPE_WEBHOOK_SECRET
# Enter when prompted: whsec_...
```

### 3. ChittyID Token

```bash
# Get from ChittyID service or use existing token
wrangler secret put CHITTY_ID_TOKEN
# Enter your ChittyID authentication token
```

### 4. Optional: Allowed Origins (for CORS)

```bash
# Only needed if you want to restrict CORS beyond the defaults
# Defaults: https://*.chitty.cc, https://furnished-condos.com, http://localhost:*

wrangler secret put ALLOWED_ORIGINS
# Enter comma-separated list: https://app1.com,https://app2.com
```

## Deployment Steps

### Step 1: Configure Development Secrets

```bash
cd /Users/nb/.claude/projects/-/CHITTYOS/chittyos-services/chittycharge

# Set secrets for development environment
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put CHITTY_ID_TOKEN
```

### Step 2: Test Locally

```bash
# Start development server
npm run dev

# In another terminal, test health endpoint
curl http://localhost:8787/health

# Should return:
# {
#   "status": "healthy",
#   "service": "chittycharge",
#   "version": "1.0.0",
#   "stripe_connected": true,
#   "chittyid_connected": true
# }
```

### Step 3: Configure Production Secrets

```bash
# Set secrets for production environment
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
wrangler secret put CHITTY_ID_TOKEN --env production
```

### Step 4: Deploy to Production

```bash
# Deploy to production
wrangler deploy --env production

# Expected output:
# Total Upload: XX.XX KiB / gzip: XX.XX KiB
# Uploaded chittycharge-production (X.XX sec)
# Published chittycharge-production (X.XX sec)
#   https://charge.chitty.cc
# Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Step 5: Configure DNS (if not already set up)

In Cloudflare DNS for `chitty.cc`:

```
Type: CNAME
Name: charge
Content: chittycharge-production.workers.dev
Proxy: Yes (orange cloud)
TTL: Auto
```

Alternatively, the worker route should automatically bind to `charge.chitty.cc/*` as configured in wrangler.toml.

### Step 6: Verify Production Deployment

```bash
# Test health endpoint
curl https://charge.chitty.cc/health

# Should return same healthy response as local

# Test create hold (use your actual ChittyID token)
curl -X POST https://charge.chitty.cc/api/holds \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: YOUR_ACTUAL_TOKEN" \
  -d '{
    "amount": 25000,
    "description": "Production smoke test",
    "customer_email": "test@chitty.cc"
  }'

# Should return:
# {
#   "id": "pi_...",
#   "client_secret": "pi_..._secret_...",
#   "status": "requires_payment_method",
#   ...
# }
```

### Step 7: Configure Stripe Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://charge.chitty.cc/webhook`
4. Select events:
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.canceled`
   - `charge.captured`
5. Add endpoint
6. Copy the "Signing secret" (whsec\_...)
7. Update Cloudflare secret:
   ```bash
   wrangler secret put STRIPE_WEBHOOK_SECRET --env production
   # Paste the whsec_... value
   ```

### Step 8: Monitor Deployment

```bash
# Tail live logs
wrangler tail --env production

# Watch for:
# - Incoming requests
# - Webhook events
# - Error messages
```

## Post-Deployment

### Update ChittyRegistry

Register the service in ChittyRegistry:

```bash
# Register ChittyCharge service
curl -X POST https://registry.chitty.cc/services \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_REGISTRY_TOKEN" \
  -d '{
    "name": "chittycharge",
    "display_name": "ChittyCharge",
    "description": "Authorization Hold Service",
    "url": "https://charge.chitty.cc",
    "health_endpoint": "https://charge.chitty.cc/health",
    "version": "1.0.0",
    "category": "payments",
    "tags": ["payments", "stripe", "authorization-holds", "chittypay"]
  }'
```

### Update Furnished-Condos Integration

In the furnished-condos app, update the ChittyCharge service URL:

```typescript
// apps/chittyrental/server/services/chittypay.ts
const CHITTY_CHARGE_URL = process.env.CHITTY_CHARGE_URL || "https://charge.chitty.cc";
```

## Rollback Procedure

If issues arise:

```bash
# View recent deployments
wrangler deployments list --env production

# Rollback to previous version
wrangler rollback [VERSION_ID] --env production
```

## Monitoring

### Key Metrics to Watch

1. **Authorization Success Rate** - % of holds successfully placed
2. **Capture Success Rate** - % of captures that succeed
3. **Webhook Delivery** - % of webhooks processed successfully
4. **Rate Limit Hits** - Track 429 responses
5. **Error Rate** - 5xx responses

### Cloudflare Dashboard

Monitor at: https://dash.cloudflare.com/0bc21e3a5a9de1a4cc843be9c3e98121/workers/services/view/chittycharge-production/production

Watch:

- Request count
- Error rate
- CPU time
- KV operations

## Troubleshooting

### "Unauthorized" Error (401)

- Verify `CHITTY_ID_TOKEN` is set correctly
- Check token hasn't expired
- Ensure header is `ChittyID-Token` (case-sensitive)

### "Stripe API error"

- Verify `STRIPE_SECRET_KEY` is set
- Check Stripe key matches environment (test vs live)
- Ensure Stripe account is active

### Webhook Signature Verification Failed

- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check webhook endpoint URL is correct
- Ensure webhook is sending to correct environment

### CORS Errors

- Check `ALLOWED_ORIGINS` if set
- Verify request origin matches allowed list
- Check browser console for specific CORS error

## Security Checklist

- [ ] Stripe secret key is production key (sk*live*...)
- [ ] Webhook secret matches production webhook endpoint
- [ ] ChittyID token is valid and production-ready
- [ ] CORS origins are restricted (not wildcard)
- [ ] Rate limiting is enabled
- [ ] DNS is proxied through Cloudflare (orange cloud)
- [ ] All secrets stored in Cloudflare (not in code)

## Next Steps

After successful deployment:

1. **Load Testing** - Test with realistic traffic patterns
2. **Integration Testing** - Verify furnished-condos app integration
3. **Documentation** - Update API docs with production URLs
4. **Monitoring Setup** - Configure alerts for error rates
5. **Customer Testing** - Run test transactions with real cards

---

**Deployment Owner**: ChittyCorp LLC
**Service URL**: https://charge.chitty.cc
**Account ID**: 0bc21e3a5a9de1a4cc843be9c3e98121
**Version**: 1.0.0
**Last Updated**: 2025-10-11

# ChittyCharge Deployment Checklist

Use this checklist to verify successful deployment and system health.

## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript type errors resolved (`npm run typecheck`)
- [ ] All tests passing (`npm test`)
- [ ] No security vulnerabilities (`npm audit`)
- [ ] No linting errors (if linter configured)
- [ ] Code reviewed and approved (for production)

### Configuration
- [ ] `wrangler.toml` updated with correct environment settings
- [ ] KV namespace IDs verified
- [ ] Custom domains configured (production only)
- [ ] Environment-specific variables set

### Secrets Management
- [ ] GitHub secrets configured (see SECRETS-TEMPLATE.md)
- [ ] Wrangler secrets set for target environment
- [ ] Stripe keys verified (test mode for staging, live mode for production)
- [ ] ChittyID token valid and not expired

---

## Deployment Process

### Staging Deployment
- [ ] Merge to `develop` branch
- [ ] GitHub Actions CI workflow passes
- [ ] Staging deployment workflow succeeds
- [ ] Deployment URL: `https://chittycharge-staging.workers.dev`

### Production Deployment
- [ ] Merge to `main` branch
- [ ] GitHub Actions CI workflow passes
- [ ] Production deployment workflow succeeds
- [ ] Deployment URL: `https://charge.chitty.cc`
- [ ] GitHub release created automatically

---

## Post-Deployment Verification

### Health Checks

#### 1. Service Health Endpoint
```bash
# Staging
curl https://chittycharge-staging.workers.dev/health

# Production
curl https://charge.chitty.cc/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "chittycharge",
  "version": "1.0.0",
  "stripe_connected": true,
  "chittyid_connected": true
}
```

- [ ] Health endpoint returns 200 OK
- [ ] `stripe_connected` is `true`
- [ ] `chittyid_connected` is `true`

---

#### 2. Cloudflare Workers Dashboard
```
https://dash.cloudflare.com → Workers & Pages → chittycharge-production
```

- [ ] Worker status: Active
- [ ] No deployment errors
- [ ] Metrics showing requests
- [ ] No 5xx errors in logs

---

#### 3. Real-time Logs
```bash
wrangler tail chittycharge-production --format pretty
```

- [ ] Logs streaming successfully
- [ ] No error messages
- [ ] No authentication failures

---

### Functional Tests

#### 1. Create Authorization Hold (Test API)
```bash
curl -X POST https://charge.chitty.cc/api/holds \
  -H "Content-Type: application/json" \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN" \
  -d '{
    "amount": 25000,
    "customer_email": "test@example.com",
    "property_id": "CHITTY-PROP-TEST",
    "description": "Post-deployment test hold"
  }'
```

**Expected:**
- [ ] Returns 200 OK
- [ ] Response includes `id`, `client_secret`, `chitty_id`
- [ ] `status` is `requires_payment_method`

---

#### 2. Get Hold Status
```bash
# Use the ID from previous response
curl https://charge.chitty.cc/api/holds/pi_abc123 \
  -H "ChittyID-Token: $CHITTY_ID_TOKEN"
```

**Expected:**
- [ ] Returns 200 OK
- [ ] Response includes hold details

---

#### 3. Stripe Integration Check

**Stripe Dashboard:**
```
https://dashboard.stripe.com/test/payments (staging)
https://dashboard.stripe.com/payments (production)
```

- [ ] Test hold appears in Stripe Dashboard
- [ ] Metadata includes `chitty_id`
- [ ] Description matches request

---

### External Service Connectivity

#### 1. ChittyID Service
```bash
curl -H "Authorization: Bearer $CHITTY_ID_TOKEN" \
  https://id.chitty.cc/health
```

- [ ] ChittyID service reachable
- [ ] Token valid (200 OK response)

---

#### 2. Stripe Webhooks

**Stripe Dashboard:**
```
Developers → Webhooks → https://charge.chitty.cc/webhook
```

- [ ] Webhook endpoint configured
- [ ] Events: `payment_intent.*`, `charge.captured`
- [ ] Status: Active
- [ ] Recent deliveries successful

**Test Webhook:**
```bash
# Send test webhook from Stripe Dashboard
# Or use Stripe CLI:
stripe trigger payment_intent.succeeded
```

- [ ] Webhook received successfully
- [ ] No signature validation errors
- [ ] Logs show webhook processing

---

### Performance Checks

#### 1. Response Time
```bash
time curl https://charge.chitty.cc/health
```

**Expected:**
- [ ] Response time < 500ms (Cloudflare edge)
- [ ] No timeouts

---

#### 2. Rate Limiting
```bash
# Send 15 requests rapidly (should trigger rate limit at 10 req/min)
for i in {1..15}; do
  curl -w "\n" https://charge.chitty.cc/health
done
```

**Expected:**
- [ ] First 10 requests: 200 OK
- [ ] Remaining requests: 429 Too Many Requests (if rate limiting implemented)

---

### Security Verification

#### 1. HTTPS Enforcement
```bash
curl -I http://charge.chitty.cc/health
```

**Expected:**
- [ ] Redirects to HTTPS (301/302)
- [ ] Final response from `https://` URL

---

#### 2. Authentication Required
```bash
# Test without ChittyID token
curl https://charge.chitty.cc/api/holds
```

**Expected:**
- [ ] Returns 401 Unauthorized (if auth implemented)
- [ ] Clear error message

---

#### 3. Secret Exposure Check
```bash
# Verify no secrets in response headers or errors
curl -v https://charge.chitty.cc/nonexistent 2>&1 | grep -i "stripe\|secret\|key"
```

**Expected:**
- [ ] No secrets exposed in headers
- [ ] No secrets in error messages

---

## Monitoring Setup

### 1. Cloudflare Analytics
```
Workers & Pages → chittycharge-production → Analytics
```

- [ ] Requests per second being tracked
- [ ] Error rate < 1%
- [ ] Average duration < 500ms

---

### 2. Stripe Monitoring
```
Stripe Dashboard → Overview
```

- [ ] Payment intents appearing
- [ ] No failed authorizations (except test failures)
- [ ] Webhook delivery success rate > 99%

---

### 3. Alert Configuration (Optional)
- [ ] Cloudflare email alerts configured for errors
- [ ] PagerDuty/Opsgenie integration (if applicable)
- [ ] Slack notifications for deployments

---

## Rollback Plan

If issues are detected:

### Quick Rollback
```bash
wrangler rollback --env production
```

### Manual Rollback (Cloudflare Dashboard)
1. Go to Workers & Pages → chittycharge-production
2. Click "Deployments" tab
3. Find previous working deployment
4. Click ⋮ → "Rollback to this deployment"

### Rollback Verification
- [ ] Health check returns 200 OK
- [ ] Previous version deployed
- [ ] Errors stopped
- [ ] Create incident report
- [ ] Fix issue and re-deploy via proper process

---

## Sign-Off

### Staging Deployment
- Deployed by: ________________
- Date/Time: ________________
- Verified by: ________________

### Production Deployment
- Deployed by: ________________
- Date/Time: ________________
- Verified by: ________________
- Incident Commander (if applicable): ________________

---

## Notes

Use this section to document any deployment-specific notes, issues encountered, or deviations from the standard process.

---

**Last Updated**: 2025-10-11
**Version**: 1.0.0
**Maintained by**: ChittyOS Team

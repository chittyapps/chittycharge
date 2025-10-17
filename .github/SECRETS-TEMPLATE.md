# GitHub Secrets Configuration Template

This file lists all required GitHub secrets for the ChittyCharge CI/CD pipeline.

## Required Repository Secrets

Configure these in: `Settings → Secrets and variables → Actions → New repository secret`

### 1. CLOUDFLARE_API_TOKEN
```
Name: CLOUDFLARE_API_TOKEN
Description: Cloudflare API token with Workers permissions
Value: <your_cloudflare_api_token>
Required: Yes
Used in: All workflows
```

**How to create**:
1. Cloudflare Dashboard → Profile → API Tokens → Create Token
2. Template: "Edit Cloudflare Workers"
3. Permissions: Workers Scripts (Edit), Workers KV (Edit)
4. Account: ChittyCorp LLC (0bc21e3a5a9de1a4cc843be9c3e98121)

---

### 2. CLOUDFLARE_ACCOUNT_ID
```
Name: CLOUDFLARE_ACCOUNT_ID
Description: ChittyCorp LLC Cloudflare account ID
Value: 0bc21e3a5a9de1a4cc843be9c3e98121
Required: Yes
Used in: All workflows
```

**How to find**:
- Cloudflare Dashboard → Workers & Pages → Right sidebar "Account ID"

---

### 3. STRIPE_SECRET_KEY
```
Name: STRIPE_SECRET_KEY
Description: Stripe API secret key
Value: sk_live_... (production) or sk_test_... (staging)
Required: Yes
Used in: Runtime (not in workflows, set via wrangler secret)
```

⚠️ **Important**:
- Use **test mode** (`sk_test_`) for staging
- Use **live mode** (`sk_live_`) for production
- Set via `wrangler secret put STRIPE_SECRET_KEY --env production`

---

### 4. STRIPE_WEBHOOK_SECRET
```
Name: STRIPE_WEBHOOK_SECRET
Description: Stripe webhook endpoint secret
Value: whsec_...
Required: Yes
Used in: Runtime (not in workflows, set via wrangler secret)
```

**How to create**:
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://charge.chitty.cc/webhook`
3. Select events: `payment_intent.*`, `charge.captured`
4. Reveal signing secret

---

### 5. CHITTY_ID_TOKEN
```
Name: CHITTY_ID_TOKEN
Description: ChittyID authentication token
Value: <your_chittyid_token>
Required: Yes
Used in: Runtime (not in workflows, set via wrangler secret)
```

**How to obtain**:
- Contact ChittyOS administrator
- Or: `https://id.chitty.cc/v1/auth/token`

---

## Environment-Specific Secrets (Optional)

For different values in staging vs production:

### Staging Environment
```
Settings → Environments → staging → Add secret
```

Example:
- `STRIPE_SECRET_KEY`: `sk_test_...`
- `STRIPE_WEBHOOK_SECRET`: `whsec_..._staging`

### Production Environment
```
Settings → Environments → production → Add secret
```

Example:
- `STRIPE_SECRET_KEY`: `sk_live_...`
- `STRIPE_WEBHOOK_SECRET`: `whsec_..._production`

---

## Setting Secrets via Wrangler

Secrets that need to be available at runtime must be set via Wrangler CLI:

```bash
# Set production secrets
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
wrangler secret put CHITTY_ID_TOKEN --env production

# Set staging secrets
wrangler secret put STRIPE_SECRET_KEY --env staging
wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
wrangler secret put CHITTY_ID_TOKEN --env staging

# List secrets to verify
wrangler secret list --env production
```

---

## Verification Checklist

After setting up secrets, verify:

- [ ] `CLOUDFLARE_API_TOKEN` added to GitHub repository secrets
- [ ] `CLOUDFLARE_ACCOUNT_ID` added to GitHub repository secrets
- [ ] `STRIPE_SECRET_KEY` set via `wrangler secret put` for production
- [ ] `STRIPE_WEBHOOK_SECRET` set via `wrangler secret put` for production
- [ ] `CHITTY_ID_TOKEN` set via `wrangler secret put` for production
- [ ] CI workflow runs successfully
- [ ] Staging deployment workflow succeeds
- [ ] Production deployment workflow succeeds
- [ ] Health check endpoint returns 200 OK

---

## Troubleshooting

### "Secret not found" in GitHub Actions
- Go to: Settings → Secrets and variables → Actions
- Ensure secret name matches exactly (case-sensitive)
- Re-add the secret if needed

### "Unauthorized" errors in deployment
- Verify `CLOUDFLARE_API_TOKEN` has correct permissions
- Ensure token hasn't expired
- Regenerate token if needed

### Runtime errors about missing secrets
- Secrets like `STRIPE_SECRET_KEY` must be set via Wrangler CLI
- GitHub secrets are only for CI/CD workflows
- Run: `wrangler secret put <SECRET_NAME> --env production`

---

**Last Updated**: 2025-10-11
**Maintained by**: ChittyOS Team

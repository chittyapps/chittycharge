# GitHub Actions CI/CD Setup Guide

This document provides complete instructions for setting up and managing the GitHub Actions CI/CD pipeline for ChittyCharge.

## Table of Contents

1. [Overview](#overview)
2. [Quick Setup](#quick-setup)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [Workflow Details](#workflow-details)
5. [Deployment Process](#deployment-process)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The ChittyCharge service uses a three-tier GitHub Actions pipeline:

- **CI Workflow** (`ci.yml`) - Runs on all branches and PRs
- **Staging Deployment** (`deploy-staging.yml`) - Auto-deploys from `develop`/`staging` branches
- **Production Deployment** (`deploy-production.yml`) - Auto-deploys from `main` branch

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Developer Push / Pull Request                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │   CI Workflow      │
         │  - Type Check      │
         │  - Tests           │
         │  - Build Validate  │
         │  - Security Scan   │
         └────────┬───────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Merge to develop   │
        └─────────┬───────────┘
                  │
                  ▼
      ┌──────────────────────────┐
      │  Staging Deployment      │
      │  - Deploy to staging env │
      │  - Smoke tests           │
      │  - Health checks         │
      └──────────┬───────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │   Merge to main     │
        └─────────┬───────────┘
                  │
                  ▼
   ┌─────────────────────────────────┐
   │  Production Deployment          │
   │  - Full validation              │
   │  - Deploy to production         │
   │  - Health checks with retries   │
   │  - Create GitHub release        │
   └─────────────────────────────────┘
```

---

## Quick Setup

### 1. Fork/Clone Repository

Ensure you have the ChittyCharge repository with the `.github/workflows/` directory.

### 2. Configure GitHub Secrets

Navigate to your GitHub repository:

```
Settings → Secrets and variables → Actions → New repository secret
```

Add the following secrets (see detailed instructions below).

### 3. Create Branch Protection Rules (Recommended)

```
Settings → Branches → Add rule
```

**For `main` branch**:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - Select: `Build & Test` (CI workflow)
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

**For `develop` branch**:

- ✅ Require status checks to pass before merging
  - Select: `Build & Test` (CI workflow)

### 4. Create GitHub Environments (Optional but Recommended)

```
Settings → Environments → New environment
```

**Staging Environment**:

- Name: `staging`
- No protection rules needed
- Secrets: Can inherit from repository

**Production Environment**:

- Name: `production`
- ✅ Required reviewers (1 or more team members)
- ✅ Wait timer: 5 minutes (optional)
- Secrets: Can inherit or override repository secrets

---

## GitHub Secrets Configuration

### Required Secrets

#### 1. `CLOUDFLARE_API_TOKEN`

**Description**: Cloudflare API token with Workers permissions

**How to create**:

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: Profile → API Tokens → Create Token
3. Use template: "Edit Cloudflare Workers"
4. Permissions:
   - Account → Workers Scripts → Edit
   - Account → Workers KV Storage → Edit
   - Account → Account Settings → Read
5. Account Resources: Include → Specific account → ChittyCorp LLC
6. Click "Continue to summary" → "Create Token"
7. **Copy the token** (you won't see it again)

**Add to GitHub**:

```
Name: CLOUDFLARE_API_TOKEN
Value: <paste your token>
```

#### 2. `CLOUDFLARE_ACCOUNT_ID`

**Description**: ChittyCorp LLC Cloudflare account ID

**Value**:

```
0bc21e3a5a9de1a4cc843be9c3e98121
```

**How to find**:

1. Log in to Cloudflare Dashboard
2. Go to Workers & Pages
3. Look in the right sidebar: "Account ID"

**Add to GitHub**:

```
Name: CLOUDFLARE_ACCOUNT_ID
Value: 0bc21e3a5a9de1a4cc843be9c3e98121
```

#### 3. `STRIPE_SECRET_KEY`

**Description**: Stripe API secret key for payment processing

**How to create**:

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to: Developers → API keys
3. Use "Secret key" (starts with `sk_live_` for production or `sk_test_` for test mode)

**⚠️ IMPORTANT**: Use **test mode keys** for staging, **live mode keys** for production.

**Add to GitHub**:

```
Name: STRIPE_SECRET_KEY
Value: sk_live_... or sk_test_...
```

**For environment-specific secrets**:

- Go to: Settings → Environments → staging (or production)
- Add secret with same name but different value

#### 4. `STRIPE_WEBHOOK_SECRET`

**Description**: Stripe webhook endpoint secret for signature verification

**How to create**:

1. Log in to Stripe Dashboard
2. Navigate to: Developers → Webhooks
3. Add endpoint: `https://charge.chitty.cc/webhooks/stripe` (production)
   - Or: `https://chittycharge-staging.workers.dev/webhooks/stripe` (staging)
4. Select events to listen for (e.g., `payment_intent.*`)
5. Click "Add endpoint"
6. Reveal "Signing secret" (starts with `whsec_`)

**Add to GitHub**:

```
Name: STRIPE_WEBHOOK_SECRET
Value: whsec_...
```

#### 5. `CHITTY_ID_TOKEN`

**Description**: ChittyID authentication token for ChittyOS services

**How to obtain**:

1. Contact ChittyOS administrator
2. Or generate via: `https://id.chitty.cc/v1/auth/token`

**Add to GitHub**:

```
Name: CHITTY_ID_TOKEN
Value: <your ChittyID token>
```

### Optional Secrets

#### `GITHUB_TOKEN`

**Description**: Automatically provided by GitHub Actions. No configuration needed.

**Permissions**: Used for creating releases and comments on PRs.

---

## Workflow Details

### CI Workflow (`ci.yml`)

**Triggers**:

- All pull requests
- All branch pushes
- Manual workflow dispatch

**Jobs**:

1. **Build & Test**
   - Checkout code
   - Install dependencies
   - TypeScript type checking
   - Run tests (skipped if none exist)
   - Build validation (dry-run deployment)
   - Upload build artifacts

2. **Security Scan**
   - npm audit (checks for vulnerable dependencies)
   - Gitleaks (checks for accidentally committed secrets)

**Outputs**:

- Build artifacts uploaded for 7 days
- CI summary in GitHub Actions UI

---

### Staging Deployment Workflow (`deploy-staging.yml`)

**Triggers**:

- Push to `develop` branch
- Push to `staging` branch
- Manual workflow dispatch

**Environment**: `staging`

**Deployment URL**: `https://chittycharge-staging.workers.dev`

**Steps**:

1. Run full CI validation
2. Deploy to Cloudflare Workers (staging environment)
3. Wait for deployment propagation
4. Smoke test: Health check endpoint
5. Comment on PR (if triggered by PR)
6. Generate deployment summary

**Concurrency**: Only one staging deployment at a time (prevents conflicts)

---

### Production Deployment Workflow (`deploy-production.yml`)

**Triggers**:

- Push to `main` branch
- Manual workflow dispatch (with optional test skip for emergencies)

**Environment**: `production`

**Deployment URL**: `https://charge.chitty.cc`

**Steps**:

1. Run full CI validation (can be skipped in emergencies)
2. Pre-deployment checklist
3. Deploy to Cloudflare Workers (production environment)
4. Wait for edge propagation (15 seconds)
5. Smoke test: Health check with 3 retries
6. Create GitHub release (versioned by run number)
7. Generate deployment summary
8. On failure: Create rollback instructions and GitHub issue

**Concurrency**: Only one production deployment at a time

**Safety Features**:

- Automatic retries on health check
- Creates GitHub issue if deployment fails
- Provides rollback instructions in summary
- Environment protection rules (if configured)

---

## Deployment Process

### Standard Development Flow

#### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-payment-flow

# Make changes
git add .
git commit -m "Add new payment flow"
git push origin feature/new-payment-flow
```

**What happens**:

- CI workflow runs automatically
- Build and tests are validated
- Security scan is performed

#### 2. Deploy to Staging

```bash
# Create PR to develop branch
# Merge PR after CI passes

# Or push directly to develop (if permitted)
git checkout develop
git merge feature/new-payment-flow
git push origin develop
```

**What happens**:

- CI workflow runs
- Staging deployment workflow runs automatically
- Service deployed to `https://chittycharge-staging.workers.dev`
- Health check runs
- Deployment summary posted

#### 3. Deploy to Production

```bash
# Create PR from develop to main
# Get PR reviewed and approved

# Merge PR
git checkout main
git merge develop
git push origin main
```

**What happens**:

- CI workflow runs
- Production deployment workflow runs
- Service deployed to `https://charge.chitty.cc`
- Health checks with retries
- GitHub release created
- Deployment summary posted

### Emergency Deployment (Skip Tests)

For urgent hotfixes:

1. Go to GitHub: Actions → Deploy to Production
2. Click "Run workflow"
3. Select branch: `main`
4. Check "Skip tests" (use only in emergencies)
5. Click "Run workflow"

⚠️ **Use sparingly** - bypasses safety checks.

---

## Rollback Procedures

### Quick Rollback (Recommended)

If a deployment causes issues, rollback immediately:

```bash
# Using Wrangler CLI
wrangler rollback --env production

# This reverts to the previous deployment
```

### Manual Rollback via Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: Workers & Pages → `chittycharge-production`
3. Click on "Deployments" tab
4. Find previous working deployment
5. Click "⋮" (three dots) → "Rollback to this deployment"

### Rollback via GitHub

1. Identify last good commit:

   ```bash
   git log --oneline main
   ```

2. Revert the bad commit:

   ```bash
   git revert <bad-commit-sha>
   git push origin main
   ```

3. Production workflow will automatically deploy the reverted state.

### Rollback Checklist

After rollback:

- [ ] Verify health endpoint returns 200 OK
- [ ] Test critical payment flows
- [ ] Monitor error logs for 10 minutes
- [ ] Create incident report
- [ ] Fix and re-deploy via proper process

---

## Troubleshooting

### Workflow Fails: "CLOUDFLARE_API_TOKEN not found"

**Cause**: GitHub secret not configured

**Fix**:

1. Go to: Settings → Secrets and variables → Actions
2. Add `CLOUDFLARE_API_TOKEN` secret (see configuration section)
3. Re-run workflow

### Workflow Fails: "wrangler: command not found"

**Cause**: Wrangler not installed (unlikely, should be in package.json)

**Fix**:

1. Ensure `wrangler` is in `devDependencies` in `package.json`
2. Workflows use `npx wrangler` which auto-installs

### Health Check Fails

**Cause**: Service not responding or health endpoint missing

**Fix**:

1. Check if service has `/health` endpoint
2. Verify KV namespaces are bound correctly
3. Check Cloudflare Workers logs:
   ```bash
   wrangler tail chittycharge-production
   ```

### Deployment Succeeds but Service Returns 500

**Cause**: Runtime error in worker code

**Fix**:

1. Check Cloudflare Workers logs
2. Verify environment variables are set:
   ```bash
   wrangler secret list --env production
   ```
3. Add missing secrets:
   ```bash
   wrangler secret put STRIPE_SECRET_KEY --env production
   ```

### "KV namespace not found" Error

**Cause**: KV namespace ID in `wrangler.toml` doesn't exist

**Fix**:

1. List KV namespaces:
   ```bash
   wrangler kv:namespace list
   ```
2. Update `wrangler.toml` with correct IDs
3. Or create missing namespaces:
   ```bash
   wrangler kv:namespace create "HOLDS" --env production
   ```

### Staging Deployment Works, Production Fails

**Cause**: Environment-specific configuration issue

**Fix**:

1. Compare `wrangler.toml` sections for `[env.staging]` vs `[env.production]`
2. Verify production KV namespace exists
3. Check production secrets are set
4. Review production custom domain DNS settings

### Build Artifacts Too Large

**Cause**: `node_modules` or large files included in deployment

**Fix**:

1. Add `.gitignore` patterns
2. Ensure Wrangler is using correct build config
3. Check `wrangler.toml` for proper `main` and `rules` configuration

### Manual Workflow Dispatch Not Showing

**Cause**: Workflow file may have syntax errors

**Fix**:

1. Validate YAML syntax:
   ```bash
   yamllint .github/workflows/deploy-production.yml
   ```
2. Check GitHub Actions tab for workflow errors
3. Ensure `workflow_dispatch:` is present in `on:` section

---

## Best Practices

### Branching Strategy

```
main (production)
  ↑
develop (staging)
  ↑
feature/* (development)
```

- **main**: Production-ready code only
- **develop**: Integration branch for staging
- **feature/\***: Individual features

### Commit Messages

Use conventional commits:

```
feat: Add payment authorization endpoint
fix: Correct webhook signature validation
docs: Update API documentation
chore: Update dependencies
```

### Pull Request Process

1. Create PR from `feature/*` to `develop`
2. Wait for CI to pass
3. Get code review approval
4. Merge to `develop` (auto-deploys to staging)
5. Test on staging
6. Create PR from `develop` to `main`
7. Get final approval
8. Merge to `main` (auto-deploys to production)

### Monitoring After Deployment

1. Check deployment summary in GitHub Actions
2. Monitor Cloudflare Workers Real-time Logs:
   ```bash
   wrangler tail chittycharge-production --format pretty
   ```
3. Verify health endpoint:
   ```bash
   curl https://charge.chitty.cc/health
   ```
4. Monitor error rates in Cloudflare Analytics
5. Check Stripe webhook deliveries

---

## Security Considerations

### Secret Management

- **Never commit secrets** to the repository
- Use GitHub Secrets for all sensitive values
- Rotate secrets regularly (quarterly minimum)
- Use separate secrets for staging and production

### Access Control

- Limit who can merge to `main` branch (use branch protection)
- Require code reviews for production deployments
- Use GitHub environment protection rules for production
- Audit GitHub Actions logs regularly

### Cloudflare API Token

- Use **minimum required permissions**
- Create separate tokens for CI/CD vs manual operations
- Rotate tokens quarterly
- Revoke tokens if compromised

### Stripe Keys

- **Never use live keys in staging**
- Use Stripe test mode for all non-production environments
- Rotate webhook secrets if endpoint URL changes
- Monitor Stripe Dashboard for unusual activity

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Stripe API Documentation](https://stripe.com/docs/api)

---

## Support

For issues with the CI/CD pipeline:

1. Check this troubleshooting guide
2. Review GitHub Actions workflow logs
3. Check Cloudflare Workers logs
4. Contact ChittyOS DevOps team

---

**Last Updated**: 2025-10-11
**Pipeline Version**: 1.0.0
**Maintained by**: ChittyOS Team

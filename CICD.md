# CI/CD Pipeline Documentation

## Overview

ChittyCharge uses GitHub Actions for continuous integration and deployment. The pipeline enforces code quality, security, and ChittyOS compliance standards.

## Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and PR to `main` or `develop` branches.

**Jobs**:

- **Lint and Type Check**: TypeScript compilation validation
- **Unit Tests**: Vitest test suite with coverage
- **Bullshit Detection**: Automated audit for unsubstantiated claims
- **ChittyCheck**: ChittyOS compliance validation
- **Security**: npm audit + secret scanning

**Bullshit Detector Checks**:

- ❌ Marketing buzzwords: "revolutionary", "game-changing", "best-in-class"
- ❌ Performance claims without benchmarks: "10x faster" without evidence
- ❌ "Production-ready" without E2E/load tests
- ❌ TODO/FIXME without issue links
- ❌ Future promises in code: "will support", "coming soon"
- ❌ Vague security claims without specifics

### 2. Deploy Pipeline (`.github/workflows/deploy.yml`)

**Triggers**:

- Automatic: Push to `main` → deploys to staging
- Manual: workflow_dispatch for staging or production

**Jobs**:

- **Deploy to Staging**: Automatic on main branch push
  - Run tests
  - Deploy with Wrangler
  - Health check verification
- **Deploy to Production**: Manual approval required
  - Full test suite
  - Deploy with Wrangler
  - Health check verification
  - Create git tag for deployment

**Required Secrets**:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### 3. PR Checks (`.github/workflows/pr-checks.yml`)

Enhanced validation for pull requests.

**Checks**:

- ✅ ChittyID compliance (no local generation)
- ✅ No hardcoded secrets
- ✅ Type checking
- ✅ Test coverage ≥70%
- ✅ Bundle size analysis
- ✅ Automated PR comment with results

### 4. Scheduled Tasks (`.github/workflows/cron.yml`)

**Schedule**: Daily at 2am UTC

**Jobs**:

- **Security Audit**: npm audit + dependency checks
- **Production Health Check**: Verify service availability
- **Auto-create Issues**: Creates GitHub issues for failures

## Required GitHub Secrets

Configure these in repository settings:

```bash
CLOUDFLARE_API_TOKEN       # Cloudflare API token for deployments
CLOUDFLARE_ACCOUNT_ID      # ChittyCorp account ID
CODECOV_TOKEN              # Optional: for coverage reports
```

## Required Wrangler Secrets

Set these via CLI before first deployment:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put CHITTY_ID_TOKEN
```

## Branch Protection Rules

Recommended settings for `main` branch:

- ✅ Require pull request reviews (1 reviewer minimum)
- ✅ Require status checks:
  - `Lint and Type Check`
  - `Unit Tests`
  - `Bullshit Detection Audit`
  - `PR Validation`
- ✅ Require branches to be up to date
- ✅ Require linear history
- ✅ Include administrators

## Deployment Process

### Staging Deployment

```bash
# Automatic on merge to main
git checkout main
git pull
git merge feature-branch
git push origin main
# → CI runs → Auto-deploys to staging → Health check
```

### Production Deployment

```bash
# Manual workflow dispatch
1. Go to Actions → Deploy workflow
2. Click "Run workflow"
3. Select "production" environment
4. Confirm deployment
# → Full test suite → Deploy → Health check → Git tag
```

## Rollback Procedure

```bash
# Find last known good deployment tag
git tag -l "v*" | tail -5

# Rollback to specific tag
git checkout v20250115-120000
wrangler deploy --env production

# Or use Cloudflare dashboard:
1. Go to Workers & Pages
2. Select chittycharge-production
3. Click "Deployments" tab
4. Select previous deployment
5. Click "Rollback to this deployment"
```

## Monitoring

### Health Checks

- **Staging**: https://chittycharge-staging.chitty.cc/health
- **Production**: https://charge.chitty.cc/health

### Logs

```bash
# View production logs
wrangler tail chittycharge-production

# View staging logs
wrangler tail chittycharge-staging
```

### Metrics

- Cloudflare Workers dashboard: analytics, errors, latency
- GitHub Actions: test trends, deployment frequency
- Codecov: coverage trends

## Troubleshooting

### Deployment Fails

**Check**:

1. Secrets are set: `wrangler secret list`
2. KV namespaces exist: `wrangler kv:namespace list`
3. Account ID is correct in `wrangler.toml`
4. API token has Workers_Edit permission

### Tests Fail in CI

**Common causes**:

- Missing npm ci (dependencies not installed)
- Environment-specific issues (timezone, path separators)
- Secrets not available in test environment

**Solution**:

```bash
# Run tests locally in CI-like environment
npm ci
npm run typecheck
npm test -- --run
```

### Bullshit Detector False Positives

**If legitimate claims are flagged**:

1. Add supporting evidence (benchmarks, tests)
2. Link to specific GitHub issues for TODOs
3. Replace vague terms with specific technical details
4. Document actual implementation in comments

## Code Owners

Pull requests automatically request review from:

- Platform team: All files
- Backend team: `/src/services/`
- DevOps team: `/wrangler.toml`, `/.github/workflows/`
- Security team: `/src/middleware/auth.ts`
- Finance team: `/src/services/stripe.service.ts`

See `.github/CODEOWNERS` for details.

## Best Practices

### Before Creating PR

```bash
npm run typecheck
npm test
# Fix any issues
```

### PR Title Format

Use conventional commits:

```
feat: Add partial capture support
fix: Handle duplicate capture attempts
docs: Update API documentation
chore: Update dependencies
```

### Commit Messages

```
feat(holds): Add tiered hold limits

- NEW_GUEST: $2,500
- VERIFIED_GUEST: $5,000
- PREMIUM_PROPERTY: $10,000

Closes #123
```

## Future Enhancements

- [ ] E2E tests with Playwright
- [ ] Load testing with k6
- [ ] Canary deployments
- [ ] Blue-green deployment strategy
- [ ] Automatic rollback on error rate spike
- [ ] Slack/Discord notifications
- [ ] Performance regression detection

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0

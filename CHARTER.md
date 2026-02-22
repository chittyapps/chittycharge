# ChittyCharge Charter

## Classification
- **Canonical URI**: `chittycanon://core/services/chittycharge`
- **Tier**: 4 (Domain)
- **Organization**: chittyapps
- **Domain**: chittycharge.chitty.cc

## Mission

Authorization hold service for the ChittyOS/ChittyPay payment ecosystem. Manages payment authorization holds, captures, and reversals.

## Scope

### IS Responsible For
- Payment authorization holds, capture processing, hold reversals, ChittyPay integration

### IS NOT Responsible For
- Identity generation (ChittyID)
- Token provisioning (ChittyAuth)

## Dependencies

| Type | Service | Purpose |
|------|---------|---------|
| Upstream | ChittyAuth | Authentication |

## API Contract

**Base URL**: https://chittycharge.chitty.cc

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health |

## Ownership

| Role | Owner |
|------|-------|
| Service Owner | chittyapps |

## Compliance

- [ ] Registered in ChittyRegister
- [ ] Health endpoint operational at /health
- [ ] CLAUDE.md present
- [ ] CHARTER.md present
- [ ] CHITTY.md present

---
*Charter Version: 1.0.0 | Last Updated: 2026-02-21*
# ChittyCharge - Authorization Hold Service

Part of the ChittyPay ecosystem for ChittyOS. Handles authorization holds (temporary card holds) using Stripe PaymentIntents.

**Domain**: `charge.chitty.cc`
**Version**: 1.0.0

## Overview

ChittyCharge provides a secure, compliant service for creating and managing authorization holds on credit cards.

### Key Features

- ✅ **Tiered Hold Limits**: NEW_GUEST ($2,500), VERIFIED_GUEST ($5,000), PREMIUM_PROPERTY ($10,000)
- ✅ **ChittyID Integration**: Every hold gets a blockchain-anchored ChittyID
- ✅ **Rate Limiting**: 10 requests/minute per token
- ✅ **Comprehensive Error Handling**: Clear, actionable error messages

## Quick Start

```bash
npm install
npm run dev
npm test
npm run deploy:production
```

See REFACTORING.md for architecture details.

# ChittyTransact Architecture

## Naming Clarification

You're absolutely right! The unified payment service should be:

**ChittyTransact = ChittyPay + ChittyCharge**

### Current State
- ✅ **ChittyCharge**: Authorization holds (implemented)
- 🚧 **ChittyPay**: Payment processing (planned)
- 🎯 **ChittyTransact**: Unified service (target)

### Evolution Path

#### Phase 1: ChittyCharge (Current)
```
charge.chitty.cc
├── Authorization holds
├── Security deposits
└── Temporary card holds
```

#### Phase 2: ChittyPay
```
pay.chitty.cc
├── One-time payments
├── Recurring billing
└── Instant payouts
```

#### Phase 3: ChittyTransact (Unified)
```
transact.chitty.cc
├── /holds/*      → Authorization holds
├── /payments/*   → Payment processing
├── /payouts/*    → Mercury Bank instant payouts
├── /recurring/*  → Subscription billing
└── /callsigns/*  → @username payments
```

### Service Consolidation

**Before**:
- ChittyCharge (holds only)
- ChittyPay (payments only)
- Separate workers, separate auth, separate monitoring

**After (ChittyTransact)**:
- Unified payment platform
- Single auth layer
- Shared rate limiting
- Consolidated monitoring
- Mercury Bank integration
- Call sign payments

### Migration Strategy

1. **Keep ChittyCharge** for now (backward compatibility)
2. **Build ChittyPay** separately
3. **Merge into ChittyTransact** once both stable
4. **Redirect** charge.chitty.cc → transact.chitty.cc/holds
5. **Redirect** pay.chitty.cc → transact.chitty.cc/payments

### ChittyTransact Feature Set

```typescript
// Unified API
POST /api/transact/holds          // Authorization hold
POST /api/transact/payments        // One-time payment
POST /api/transact/payouts         // Instant payout (Mercury)
POST /api/transact/subscriptions   // Recurring billing
POST /api/transact/callsigns       // @username → payment

// Unified webhooks
POST /webhooks/stripe
POST /webhooks/mercury
POST /webhooks/plaid

// Unified admin
GET /api/admin/transactions
GET /api/admin/reconciliation
```

### Why ChittyTransact?

1. **Unified Auth**: Single ChittyID token
2. **Shared State**: KV for all transaction types
3. **Cross-Transaction Logic**: Capture hold → instant payout
4. **Simplified Integration**: One SDK, one API
5. **Consolidated Monitoring**: Single dashboard

### Recommendation

**Short term**: Deploy ChittyCharge as-is to validate architecture

**Medium term**: Build ChittyPay with same patterns

**Long term**: Merge into ChittyTransact with feature flags:
```typescript
const features = {
  holds: true,        // ChittyCharge features
  payments: true,     // ChittyPay features
  payouts: false,     // Mercury (coming soon)
  callsigns: false,   // @username (future)
}
```

---

**Decision**: Proceed with ChittyCharge deployment, plan ChittyTransact consolidation

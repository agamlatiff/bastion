# 💡 Bastion — Backlog & Future Differentiators

> **Status**: Deferred — revisit after Level 3 is complete
> **Priority**: Low (focus on core engineering quality first)

---

## Why Deferred?

The core value of Bastion as a portfolio project lies in **engineering quality**, not feature novelty. Reviewers evaluate:

- Clean architecture and code organization
- Handling of real-world problems (race conditions, idempotency, ACID)
- System design decisions and trade-offs
- Documentation and API design

A well-engineered standard payment platform beats a poorly-built "unique" one every time.

---

## Candidate Differentiators

Evaluate these **after Level 3 (Distribution) is complete**. Pick at most one to implement.

### 1. Full Ledger Transparency
**Effort**: Low | **Impact**: Medium

Expose the double-entry bookkeeping ledger directly to users. Most wallet apps show simplified transaction history — Bastion would show the actual debit/credit entries with balance snapshots.

- Users see exactly how every rupiah moved
- Builds trust through radical transparency
- Leverages existing `ledger_entries` table — minimal new code

### 2. Group Wallets / Shared Expenses
**Effort**: High | **Impact**: High

Shared wallet that multiple users can contribute to and spend from. Think: trip fund, office lunch pool, event collection.

- New table: `group_wallets` with member permissions
- New endpoints: create group, invite members, contribute, withdraw
- Requires additional authorization logic (who can spend?)
- Demonstrates more complex domain modeling

### 3. Multi-Currency Support
**Effort**: Medium | **Impact**: Medium

Support wallets in multiple currencies with real-time exchange rates.

- Multiple wallets per user (one per currency)
- Exchange rate API integration
- Cross-currency transfer logic
- Demonstrates external API integration and more complex financial logic

### 4. Scheduled / Recurring Transfers
**Effort**: Medium | **Impact**: Medium

Allow users to schedule one-time future transfers or recurring payments (e.g., monthly allowance).

- New table: `scheduled_transfers`
- Background job/cron to execute at scheduled time
- Demonstrates job scheduling and async processing
- Builds on existing transfer logic

### 5. Spending Analytics & Insights
**Effort**: Medium | **Impact**: Low

Auto-categorize transactions and provide monthly spending breakdowns.

- Aggregate queries on transaction history
- Category tagging (food, transport, entertainment)
- Monthly summary endpoint
- Demonstrates data aggregation and reporting

---

## Decision Criteria

When the time comes, pick based on:

| Criteria | Weight |
|----------|--------|
| How much new engineering skill does it teach? | High |
| How much does it leverage existing code? | Medium |
| How impressive is it in a portfolio walkthrough? | High |
| How long does it take to implement? | Medium |

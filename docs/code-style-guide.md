# Bastion Platform — Engineering Code Style & Commenting Guide

This guideline defines the coding and commenting standards across all microservices (`services/identity`, `services/wallet`, `services/customer`, etc.) to ensure readability, maintainability, and enterprise bank-grade compliance.

---

## 1. Language Standard: Professional English

- **All source code comments, variable names, Godoc/Javadoc, and commit messages MUST be written in professional English.**
- Mixed language (e.g., Bahasa Indonesia mixed with English) within source files is strictly prohibited.
- Technical documentation under `docs/` may include Indonesian summaries for organizational context, but all code-level artifacts must remain English.

---

## 2. Godoc / Javadoc on Exported Identifiers

Every exported type, interface, function, method, and constant must begin with a doc comment describing its intent:

```go
// CreateWallet provisions a new customer wallet, initializes ledger account, and emits WalletCreated outbox event.
func (s *walletService) CreateWallet(ctx context.Context, customerID uuid.UUID, req domain.CreateWalletRequest) (*domain.WalletResponse, error) {
    // ...
}
```

---

## 3. Step-by-Step Numbered Sectioning Pattern

Functions containing non-trivial business logic (> 2 steps or > 20 lines) must be visually and conceptually broken down into numbered steps:

```go
// 1. Normalize input parameters and validate prerequisites
email := strings.ToLower(strings.TrimSpace(req.Email))

// 2. Query persistence layer / repository
user, err := s.repo.GetUserByEmail(ctx, email)

// 3. Execute cryptographic or domain validation
valid, err := security.VerifyPassword(req.Password, user.PasswordHash)

// 4. Update state or emit domain events atomically via transactional outbox
// ...

// 5. Emit security audit trail and return DTO response
s.repo.LogSecurityAudit(ctx, &user.ID, "LOGIN_SUCCESS", requestID, ip)
```

### Benefits:
1. **Low Cognitive Load:** Developers and auditors immediately grasp the high-level workflow without parsing every line.
2. **Standardized Review:** Pull request reviewers can verify whether business rules match specifications step-by-step.
3. **Structured Debugging:** Trace logs directly map back to specific numbered steps in the code.

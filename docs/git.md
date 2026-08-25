# Bastion — Git Commit Conventions

This project follows the **Conventional Commits** standard to keep the commit history clean, readable, and easy to trace.

## Basic Format

Every commit message must follow this format:
```text
<type>(<optional scope>): <short message in lowercase>
```

---

## Commit Types

| Type | When to Use | Example |
| :--- | :--- | :--- |
| **`feat:`** | Adding a new feature visible or impactful to the user. | `feat(wallet): add top-up endpoint with idempotency` |
| **`fix:`** | Fixing a bug or error in the application. | `fix(auth): resolve nil pointer error on login` |
| **`chore:`** | Maintenance tasks: updating libraries, linter config, or Makefile (no feature code changes). | `chore: setup Makefile and golangci-lint` |
| **`docs:`** | Changes ONLY to documentation files (Markdown, comments, Swagger). | `docs(v2): update ERD and architecture diagram` |
| **`refactor:`** | Restructuring code **without** changing its behavior or features. | `refactor: move transaction logic to ledger service` |
| **`test:`** | Adding, fixing, or modifying test files (`_test.go`). | `test(wallet): add concurrency test for double spending` |
| **`style:`** | Cosmetic changes like whitespace, formatting (`go fmt`), semicolons (no logic changes). | `style: format code using go fmt` |
| **`perf:`** | Code changes specifically to improve performance or speed. | `perf: add index to wallet queries` |

---

## Rules

1. **Use lowercase:** Commit messages must always start with a lowercase letter.
   - ❌ Wrong: `feat: Add user login`
   - ✅ Correct: `feat: add user login`
2. **No trailing period:** Do not end a commit message with a period (`.`).
3. **Use imperative mood:** Write the message as if giving a command.
   - ❌ Wrong: `feat: added topup endpoint` (past tense)
   - ✅ Correct: `feat: add topup endpoint`
4. **Mark breaking changes:** If your change breaks backward compatibility, add an exclamation mark (`!`) before the colon.
   - ✅ Correct: `feat(api)!: change top-up payload structure`

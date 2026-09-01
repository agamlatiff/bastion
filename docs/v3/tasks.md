# Bastion V3 — Modularization & Code Quality

## 1. V3 Objective

V3 berfokus pada **refactoring internal Bastion** agar codebase:

* lebih modular
* mudah dibaca
* mudah dites
* memiliki dependency yang jelas
* memiliki business logic yang terisolasi
* mudah dikembangkan
* siap untuk scaling di versi berikutnya

V3 **tidak berfokus pada penambahan fitur besar**.

### V3 Core Principle

> Improve the structure before increasing the complexity.

---

# 2. V3 Scope

### Included

* Codebase audit
* Package restructuring
* Domain modularization
* Service/use-case layer
* Repository boundary
* Dependency injection
* Error handling
* Testing
* Refactoring
* Code quality
* Documentation

### Not Included

* Microservices
* Kafka
* Kubernetes
* Event sourcing
* CQRS
* Saga
* Redis sebagai distributed cache
* Multi-region
* External payment provider
* Frontend

---

# Sprint 19 — Codebase Audit

## Objective

Memahami kondisi Bastion V2 sebelum melakukan refactoring.

### Tasks

#### Repository Understanding

* [ ] Read seluruh struktur repository
* [ ] Identify application entrypoint
* [ ] Identify HTTP server setup
* [ ] Identify routing
* [ ] Identify middleware
* [ ] Identify handlers
* [ ] Identify services
* [ ] Identify repositories
* [ ] Identify models/entities
* [ ] Identify database layer
* [ ] Identify configuration
* [ ] Identify tests

#### Dependency Mapping

* [ ] Map package dependencies
* [ ] Identify package yang terlalu banyak dependency
* [ ] Identify circular dependencies
* [ ] Identify unnecessary dependencies
* [ ] Identify global state
* [ ] Identify tightly coupled components

#### Code Smell Audit

* [ ] Identify large files
* [ ] Identify large functions
* [ ] Identify duplicated logic
* [ ] Identify duplicated validation
* [ ] Identify duplicated database logic
* [ ] Identify unclear naming
* [ ] Identify dead code
* [ ] Identify unnecessary abstractions
* [ ] Identify business logic inside handlers
* [ ] Identify database logic outside repository layer

#### Architecture Documentation

* [ ] Create current V2 architecture diagram
* [ ] Document request flow
* [ ] Document database flow
* [ ] Document dependency flow
* [ ] Document major problems found

### Deliverables

* `docs/v3/current-architecture.md`
* Dependency map
* Refactoring plan
* List of architectural problems

### Learning

* Reading an unfamiliar codebase
* Dependency analysis
* Code smells
* Architecture analysis

---

# Sprint 20 — Domain Modularization

## Objective

Membagi codebase berdasarkan **business domain**, bukan hanya berdasarkan tipe file.

### Initial Target

Contoh struktur:

```text
internal/
├── auth/
├── user/
├── wallet/
├── transaction/
└── ledger/
```

Struktur final harus mengikuti kondisi nyata Bastion, bukan dipaksakan sama persis seperti contoh.

### Tasks

#### Domain Identification

* [ ] Identify major business domains
* [ ] Define responsibility setiap domain
* [ ] Define ownership setiap domain
* [ ] Define dependency antar-domain
* [ ] Document domain boundaries

#### Package Restructuring

* [ ] Create domain packages
* [ ] Move domain models
* [ ] Move domain-specific logic
* [ ] Move domain-specific validation
* [ ] Move domain-specific errors
* [ ] Update imports
* [ ] Remove obsolete packages

#### Dependency Cleanup

* [ ] Remove circular dependencies
* [ ] Reduce cross-domain imports
* [ ] Prevent domain from depending on HTTP
* [ ] Prevent domain from depending directly on infrastructure
* [ ] Review shared packages

### Deliverables

* Domain map
* Updated package structure
* Updated architecture diagram

### Learning

* Domain boundaries
* Separation of concerns
* Package design
* Coupling
* Cohesion

### Knowledge Check

* Kenapa package ini dipisahkan?
* Kenapa domain A boleh/tidak boleh bergantung pada domain B?
* Apa tanda sebuah package terlalu besar?
* Apa perbedaan coupling dan cohesion?

---

# Sprint 21 — Handler & Service Layer

## Objective

Memastikan HTTP layer tidak mengandung business logic.

### Target Flow

```text
HTTP Request
     ↓
Handler
     ↓
Service / Use Case
     ↓
Repository
     ↓
Database
```

### Handler Tasks

* [ ] Review seluruh handlers
* [ ] Identify business logic di handler
* [ ] Move business logic ke service
* [ ] Keep HTTP parsing di handler
* [ ] Keep HTTP response mapping di handler
* [ ] Simplify handler functions
* [ ] Standardize handler structure

### Service Tasks

* [ ] Review existing services
* [ ] Define use cases
* [ ] Create service methods
* [ ] Move business rules ke service/domain
* [ ] Remove HTTP dependency dari service
* [ ] Remove database-specific logic dari service
* [ ] Define service dependencies

### Example Use Cases

```text
CreateWallet
GetWallet
CreateTransaction
GetTransaction
ExecuteTransfer
GetLedger
```

### Deliverables

* Refactored handlers
* Refactored services
* Updated request flow diagram

### Learning

* Application layer
* Use cases
* Business logic isolation
* HTTP/application separation

### Knowledge Check

> Kenapa service tidak boleh tahu HTTP status code?

> Apa yang seharusnya dilakukan handler?

> Apa yang seharusnya dilakukan service?

---

# Sprint 22 — Repository & Persistence Boundary

## Objective

Memisahkan business/application logic dari PostgreSQL.

### Target

```text
Service
   ↓
Repository Interface
   ↓
Repository Implementation
   ↓
PostgreSQL
```

### Tasks

#### Repository Design

* [ ] Review current repositories
* [ ] Identify database logic outside repository
* [ ] Move database queries ke repository
* [ ] Define repository responsibilities
* [ ] Define repository interfaces where useful
* [ ] Avoid unnecessary interfaces

#### Query Organization

* [ ] Organize SQL queries
* [ ] Review query naming
* [ ] Review query parameters
* [ ] Review transaction handling
* [ ] Review error handling
* [ ] Review database resource cleanup

#### Transaction Boundary

* [ ] Identify operations requiring DB transactions
* [ ] Review transaction ownership
* [ ] Prevent accidental partial updates
* [ ] Test rollback behavior

### Deliverables

* Clean repository layer
* Repository tests
* Database interaction documentation

### Learning

* Persistence boundary
* Repository pattern
* Database transactions
* Abstraction trade-offs

### Knowledge Check

> Kenapa business logic tidak langsung menjalankan SQL?

> Kapan repository interface berguna?

> Kapan interface justru unnecessary?

---

# Sprint 23 — Dependency Injection & Application Composition

## Objective

Membuat dependency aplikasi eksplisit dan mudah dites.

### Target

```text
main.go
   │
   ├── Config
   ├── Database
   ├── Repositories
   ├── Services
   ├── Handlers
   └── Router
```

### Tasks

* [ ] Identify global dependencies
* [ ] Remove unnecessary global state
* [ ] Define constructors
* [ ] Create repository dependencies
* [ ] Create service dependencies
* [ ] Create handler dependencies
* [ ] Wire dependencies di application entrypoint
* [ ] Review dependency direction
* [ ] Review interface usage
* [ ] Remove unnecessary dependency injection

### Example

```text
NewTransactionRepository()
        ↓
NewTransactionService(repository)
        ↓
NewTransactionHandler(service)
```

### Deliverables

* Explicit dependency graph
* Clean application initialization
* Easier test setup

### Learning

* Dependency injection
* Composition root
* Dependency inversion
* Testability

### Knowledge Check

> Kenapa dependency lebih baik di-inject daripada menggunakan global variable?

> Apa itu composition root?

> Kenapa dependency injection tidak selalu membutuhkan framework?

---

# Sprint 24 — Testing Architecture

## Objective

Memastikan architecture baru benar-benar meningkatkan testability.

### Test Layers

```text
             Tests
               │
       ┌───────┼────────┐
       ↓       ↓        ↓
     Unit  Integration  E2E
```

### Unit Tests

* [ ] Domain logic tests
* [ ] Service tests
* [ ] Validation tests
* [ ] Error handling tests
* [ ] Edge-case tests

### Repository Tests

* [ ] Repository success cases
* [ ] Repository failure cases
* [ ] Transaction tests
* [ ] Rollback tests
* [ ] Database constraint tests

### Handler Tests

* [ ] Request parsing
* [ ] Validation
* [ ] Response mapping
* [ ] Error response
* [ ] HTTP status codes

### Integration Tests

* [ ] API + database
* [ ] Transaction flow
* [ ] Authentication flow
* [ ] Critical business flow

### Test Quality

* [ ] Identify flaky tests
* [ ] Remove duplicate tests
* [ ] Improve test naming
* [ ] Improve test isolation
* [ ] Test failure cases
* [ ] Test boundary cases

### Deliverables

* Improved test suite
* Testing strategy documentation
* Test coverage baseline

### Learning

* Unit testing
* Integration testing
* Test isolation
* Mock vs fake
* Testability

### Knowledge Check

> Apa yang harus di-unit-test?

> Kapan integration test lebih cocok?

> Kapan mock justru membuat test terlalu rumit?

---

# Sprint 25 — Error Handling & Code Quality

## Objective

Membuat behavior error Bastion konsisten dan code lebih maintainable.

### Error Handling

* [ ] Audit existing errors
* [ ] Define domain/application errors
* [ ] Define infrastructure errors
* [ ] Map errors ke HTTP responses
* [ ] Preserve useful error context
* [ ] Avoid leaking internal errors
* [ ] Standardize error response
* [ ] Review error wrapping
* [ ] Review error comparison

### Code Quality

* [ ] Refactor large functions
* [ ] Refactor large files
* [ ] Improve naming
* [ ] Remove duplication
* [ ] Remove dead code
* [ ] Simplify unnecessary abstractions
* [ ] Simplify nested logic
* [ ] Improve comments
* [ ] Remove misleading comments
* [ ] Run formatter
* [ ] Run linter
* [ ] Run static analysis

### Deliverables

* Consistent error handling
* Cleaner codebase
* Lint/static analysis passing

### Learning

* Error design
* Error propagation
* Refactoring
* Maintainability
* Static analysis

---

# Sprint 26 — V3 Final Architecture Review

## Objective

Memastikan refactoring benar-benar menghasilkan codebase yang lebih baik.

### Architecture Review

* [ ] Review package boundaries
* [ ] Review dependency direction
* [ ] Review domain boundaries
* [ ] Review handler responsibilities
* [ ] Review service responsibilities
* [ ] Review repository responsibilities
* [ ] Review database boundary
* [ ] Review global state
* [ ] Review interfaces
* [ ] Identify remaining coupling

### Testing Review

* [ ] Run complete test suite
* [ ] Run race detector
* [ ] Review test coverage
* [ ] Review flaky tests
* [ ] Verify critical flows

### Code Review

* [ ] Review naming
* [ ] Review error handling
* [ ] Review duplication
* [ ] Review complexity
* [ ] Review comments
* [ ] Review unnecessary abstraction

### Documentation

* [ ] Update `README.md`
* [ ] Update `architecture.md`
* [ ] Update `api.md`
* [ ] Update `database.md`
* [ ] Update `tech-spec.md`
* [ ] Document V3 architecture
* [ ] Document important design decisions
* [ ] Document known limitations

### Learning Journal

* [ ] Write what changed from V2 → V3
* [ ] Document concepts learned
* [ ] Document mistakes
* [ ] Document refactoring decisions
* [ ] Document alternative designs
* [ ] Write interview questions
* [ ] Answer interview questions without looking at code

---

# 3. V3 Definition of Done

V3 dianggap selesai apabila:

### Architecture

* [ ] Domain boundaries jelas
* [ ] Dependency direction jelas
* [ ] HTTP layer terisolasi
* [ ] Business logic terisolasi
* [ ] Database access terisolasi
* [ ] Tidak ada unnecessary global state
* [ ] Tidak ada circular dependency

### Code Quality

* [ ] Functions reasonably small
* [ ] Naming jelas
* [ ] Duplication berkurang
* [ ] Abstraction hanya digunakan jika diperlukan
* [ ] Error handling konsisten
* [ ] Linter bersih

### Testing

* [ ] Critical business logic memiliki unit test
* [ ] Repository memiliki integration test
* [ ] Critical API flow memiliki integration/E2E test
* [ ] Failure cases tested
* [ ] Race detector dijalankan

### Documentation

* [ ] Architecture updated
* [ ] API documentation updated
* [ ] Database documentation updated
* [ ] V3 learning journal selesai

---

# 4. V3 Learning Requirements

Code bukan satu-satunya output.

Untuk setiap sprint:

```text
Understand
    ↓
Implement
    ↓
Test
    ↓
Review
    ↓
Explain
```

Lo **tidak diwajibkan mengetik semua code dari nol**.

Copy-paste dari AI diperbolehkan.

Tetapi setelah implementation selesai, lo harus mampu menjelaskan:

1. Apa fungsi code ini?
2. Kenapa code ini berada di package tersebut?
3. Siapa yang memanggilnya?
4. Apa dependency-nya?
5. Apa yang terjadi ketika error?
6. Bagaimana cara mengetesnya?
7. Apa alternatif desainnya?
8. Apa trade-off dari desain tersebut?

---

# 5. V3 Interview Preparation

Setiap sprint menghasilkan interview questions.

### Go

* Apa fungsi package?
* Apa itu interface?
* Kapan menggunakan pointer?
* Bagaimana error handling di Go?
* Apa keuntungan dependency injection?

### Architecture

* Apa itu separation of concerns?
* Apa itu coupling?
* Apa itu cohesion?
* Kenapa business logic dipisahkan dari handler?
* Apa fungsi repository?
* Kapan abstraction diperlukan?

### Database

* Apa itu database transaction?
* Kapan menggunakan transaction?
* Apa yang terjadi jika query kedua gagal?
* Apa itu isolation?

### Testing

* Apa perbedaan unit dan integration test?
* Kapan menggunakan mock?
* Bagaimana membuat code mudah dites?
* Apa itu test isolation?

### Refactoring

* Apa alasan melakukan refactoring?
* Bagaimana mengetahui code perlu di-refactor?
* Apa risiko refactoring?
* Bagaimana memastikan refactoring tidak mengubah behavior?

---

# 6. V3 Final Architecture

Target akhir kira-kira:

```text
                    HTTP
                     │
                     ▼
                  Router
                     │
                     ▼
                  Handler
                     │
                     ▼
              Application Service
                     │
                     ▼
                  Domain
                     │
                     ▼
              Repository Interface
                     │
                     ▼
          Repository Implementation
                     │
                     ▼
                PostgreSQL
```

Dengan domain:

```text
internal/
│
├── auth/
│
├── user/
│
├── wallet/
│
├── transaction/
│
└── ledger/
```

Namun struktur final harus mengikuti **boundary Bastion yang sebenarnya**, bukan mengikuti template secara membabi buta.

---

# 7. V3 Philosophy

### Jangan melakukan ini

```text
"Architecture bagus"
        ↓
Tambah abstraction
        ↓
Tambah interface
        ↓
Tambah layer
        ↓
Tambah folder
        ↓
💀
```

### Lakukan ini

```text
Problem
   ↓
Understand
   ↓
Simple solution
   ↓
Measure
   ↓
Refactor if necessary
```

Prinsip utama:

> **Don't abstract because you can. Abstract because you need to.**

---

# 8. V3 Expected Outcome

Sebelum V3:

```text
Bastion V2
    ↓
Works
    ↓
But increasingly coupled
```

Sesudah V3:

```text
Bastion V3
    ↓
Modular
    ↓
Testable
    ↓
Maintainable
    ↓
Understandable
    ↓
Ready for future growth
```

V3 **tidak bertujuan membuat Bastion terlihat seperti perusahaan besar.**

V3 bertujuan membuat **lo mampu membuka repository Bastion beberapa bulan kemudian dan masih memahami apa yang terjadi.**

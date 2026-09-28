# University Placement Attendance Management System

A dedicated attendance management platform engineered specifically for university placement activities.

---

## 📌 Current Phase: Phase 2 — Authentication + Identity Foundation (v0.2.0)

---

## 🏗️ Repository Architecture

```text
placement-attendance/
│
├── backend/            # NestJS + TypeScript REST API Backend & Prisma ORM
│   ├── prisma/         # Prisma Schema & Database Seed
│   ├── src/
│   │   ├── audit-log/  # Global Audit Logging Service
│   │   ├── auth/       # Authentication, Identity, Guards, Roles & DTOs
│   │   └── prisma/     # Global Prisma Service
│   └── test/           # E2E Test Suite
├── mobile/             # Flutter Mobile Application (iOS & Android)
├── docs/               # System Architecture & API Security Specifications
├── docker-compose.yml  # Local Development Environment (PostgreSQL 16)
├── README.md           # Project Documentation & Release Roadmap
└── .gitignore          # Version Control Exclusions
```

---

## 🛠️ Technology Stack

* **Backend:** Node.js, NestJS, TypeScript, REST API, JWT Authentication, Argon2, RBAC
* **Database:** PostgreSQL 16 Alpine, Prisma ORM, Prisma Migrate
* **Documentation:** OpenAPI Swagger (`/api/docs`)
* **Mobile (Phase 7+):** Flutter, Riverpod, Dio, go_router, mobile_scanner
* **Infrastructure:** Docker, Docker Compose, Git, GitHub
* **Notifications:** Firebase Cloud Messaging (FCM)

---

## 🔑 Development Seed Credentials

To start local development testing, run `npx prisma db seed` in the `backend/` directory.

| Account Role | Email / Identifier | Development Password | Placement Access Rule |
| :--- | :--- | :--- | :--- |
| **Student (Eligible)** | `25cap109@kahedu.edu.in` | `password123` | `User.status=ACTIVE` & `isPlacementEligible=true` (Login Allowed) |
| **Student (Ineligible)** | `ineligible_student@kahedu.edu.in` | `password123` | `isPlacementEligible=false` (Login Rejected with 403) |
| **Staff** | `staff001@kahedu.edu.in` | `password123` | Staff account (Login Allowed) |
| **Admin** | `admin@kahedu.edu.in` | `password123` | Administrative user (Login Allowed) |
| **Super Admin** | `superadmin@kahedu.edu.in` | `password123` | System Super Admin (Login Allowed) |

*Note: All passwords are securely hashed using Argon2.*

---

## 🚀 Key Endpoints (Phase 2)

* `POST /auth/login` (Public) - Authenticates via Argon2, checks status & eligibility, returns JWT.
* `GET /auth/me` (Protected) - Returns authenticated safe user profile & identity (no `passwordHash`).
* `POST /auth/change-password` (Protected) - Verifies current password with Argon2 & updates password.
* `PATCH /auth/profile` (Protected: `STUDENT`, `STAFF`) - Allows updating ONLY `phoneNumber` and `avatarUrl`. Prohibits modification of academic details (`registerNumber`, `collegeEmail`, `department`, `course`, `batch`).
* `GET /api/docs` - OpenAPI / Swagger Interactive Documentation (Bearer Auth enabled).

---

## 🏷️ Release Roadmap

* ✅ **`v0.1.0`**: Project foundation (NestJS + Docker PostgreSQL + Prisma schema setup)
* ✅ **`v0.2.0`**: Authentication, Argon2, JWT, RBAC, Profile boundaries, Seed & E2E Test suite
* ⏳ **`v0.3.0`**: Student Management & Excel import pipeline (Phase 3)
* ⏳ **`v0.4.0`**: Class session scheduling engine
* ⏳ **`v0.5.0`**: Dynamic QR Attendance verification engine
* ⏳ **`v0.6.0`**: Student mobile application module
* ⏳ **`v0.7.0`**: Staff mobile scanner module
* ⏳ **`v0.8.0`**: Firebase Push Notifications
* ⏳ **`v1.0.0`**: MVP Release

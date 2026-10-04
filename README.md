# University Placement Attendance Management System

A dedicated attendance management platform engineered specifically for university placement activities.

---

## 📌 Current Phase: Phase 7.4 — Admin Web Management Portal (v0.7.4)

---

## 🎯 Product Scope & Architectural Boundaries

* **Dedicated Placement Scope:** Designed strictly for university placement activities, candidate management, and campus recruitment drives (not generic university academic course attendance).
* **Roster Management:** Placement candidates (`STUDENT`) are managed and imported via Excel bulk operations; conducting faculty/coordinators (`STAFF`) oversee placement sessions.
* **Administrative Governance:** System administrators (`ADMIN` / `SUPER_ADMIN`) manage academic master data, staff accounts, student rosters, placement drives, and recruitment calendars via the **Admin Web Portal**.
* **Operational Execution:** Mobile applications (`STUDENT` & `STAFF`) handle daily operations, including QR generation, live QR scanning, and session initiation.
* **Security Control:** Dynamic QR token generation, verification, and HMAC security validation are strictly controlled by the backend NestJS server.
* **Decoupled Architecture:** Neither the Flutter mobile application nor the Next.js Admin Web portal connects directly to the PostgreSQL database. All clients communicate strictly via secure NestJS REST APIs.

---

## 🏗️ System Architecture & Data Flow

```text
placement-attendance/
│
├── admin-web/          # Next.js 16 + TypeScript Admin Web Management Portal
│   ├── src/app/        # App Router Pages (/dashboard, /staff, /students, /placement-drives, etc.)
│   └── src/components/ # Forms, Modals & UI Components
├── backend/            # NestJS + TypeScript REST API Backend & Prisma ORM
│   ├── prisma/         # Prisma Schema, Migrations & Database Seed Engine
│   ├── src/            # Core Modules (auth, students, staff, sessions, attendance, placement-drives, notifications)
│   └── test/           # End-to-End Test Suite
├── mobile/             # Flutter Mobile Application (iOS & Android)
│   ├── lib/src/        # Student & Staff Operational Features & Riverpod State
│   └── test/           # Flutter Unit & Widget Tests
├── docs/               # System Architecture & Security Specifications
└── docker-compose.yml  # Local Development Environment (PostgreSQL 16)
```

```text
Staff Mobile App ──────┐
Student Mobile App ────┼──> Next.js Proxy / NestJS REST API ──> PostgreSQL 16 / Prisma ORM
Admin Web Portal ──────┘
```

---

## 🛠️ Technology Stack

* **Backend:** Node.js, NestJS, TypeScript, REST API, JWT Authentication, Argon2, RBAC, Firebase Cloud Messaging (FCM), Prisma ORM
* **Database:** PostgreSQL 16 Alpine, Prisma Migrate
* **Admin Web (v0.7.4):** Next.js 16 (App Router), TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod
* **Mobile (v0.7.2 - v0.7.3):** Flutter, Riverpod, Dio, go_router, mobile_scanner, QR Code Generation
* **Documentation:** OpenAPI Swagger (`/api/docs`)
* **Infrastructure:** Docker, Docker Compose, Git, GitHub

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

## 🚀 Key Endpoints & System Modules

* `POST /auth/login` — Public login supporting JWT issuance & role validation (`ADMIN`, `STAFF`, `STUDENT`).
* `GET /auth/me` — Authenticated safe user profile & identity retrieval.
* `/departments`, `/courses`, `/batches`, `/subjects`, `/venues` — Academic master data management.
* `/staff` — Faculty & Staff account management, role allocation, status lifecycle, and password resets (`ADMIN`, `SUPER_ADMIN`).
* `/students` — Placement candidate management & multi-step transactional Excel bulk import (`ADMIN`, `SUPER_ADMIN`).
* `/sessions` — Placement session scheduling, targeted roster materialization, and lifecycle execution (`ADMIN`, `STAFF`).
* `/attendance` — Dynamic QR token generation, token verification, present candidate rosters, and audit logging.
* `/placement-drives` — Campus placement drives, recruitment selection rounds, and session linking (`ADMIN`, `STAFF`).
* `/notifications` — FCM device token registration and targeted push notification delivery.
* `GET /api/docs` — Interactive OpenAPI / Swagger documentation.

---

## 🏷️ Release Roadmap

* ✅ **`v0.1.0`**: Project foundation (NestJS + Docker PostgreSQL + Prisma schema setup)
* ✅ **`v0.2.0`**: Authentication & RBAC (JWT, Argon2, role-based access, profile boundaries, audit logging, E2E tests)
* ✅ **`v0.3.0`**: Student Management & Excel Import (Placement student management and transactional Excel import)
* ✅ **`v0.4.0`**: Session Scheduling (Academic hierarchy, session scheduling, targeting and eligibility roster)
* ✅ **`v0.5.0`**: Dynamic QR Attendance (Secure dynamic QR attendance verification and attendance roster)
* ✅ **`v0.6.0`**: Notifications & Device Management (FCM infrastructure, device tokens, in-app notifications)
* ✅ **`v0.7.1`**: Flutter Foundation & Placement Drives (Flutter architecture, authentication shell, student/staff shells and Placement Drive backend)
* ✅ **`v0.7.2`**: Student Mobile Application (Student dashboard, sessions, QR generation, attendance, notifications and profile)
* ✅ **`v0.7.3`**: Staff Mobile Application (Staff dashboard, session lifecycle, scheduling, QR scanner and attendance roster)
* ✅ **`v0.7.4`**: Admin Web Management Portal (Admin dashboard, academic master data, staff management, student management/import, placement drives and recruitment calendar)
* ⏳ **`v1.0.0`**: MVP Release (Final production hardening and deployment)

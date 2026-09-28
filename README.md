# University Placement Attendance Management System

A dedicated attendance management platform engineered specifically for university placement activities.

---

## 🏗️ Repository Architecture

```text
placement-attendance/
│
├── backend/            # NestJS + TypeScript REST API Backend & Prisma ORM
├── mobile/             # Flutter Mobile Application (iOS & Android)
├── docs/               # System Architecture & API Documentation
├── docker-compose.yml  # Local Development Environment (PostgreSQL)
├── README.md           # Project Documentation
└── .gitignore          # Version Control Exclusions
```

---

## 🛠️ Technology Stack

* **Backend:** Node.js, NestJS, TypeScript, REST API, JWT Authentication, Argon2, RBAC
* **Database:** PostgreSQL, Prisma ORM, Prisma Migrate
* **Mobile:** Flutter, Dart, Riverpod, Dio, go_router, mobile_scanner, table_calendar
* **Infrastructure:** Docker, Docker Compose, Git, GitHub
* **Notifications:** Firebase Cloud Messaging (FCM)

---

## 📌 Access Rules & Pipeline

A student's access to the application follows a strict 6-point verification chain:

```text
User exists ➔ Role = STUDENT ➔ User ACTIVE ➔ Student exists ➔ Student ACTIVE ➔ isPlacementEligible = true ➔ LOGIN ALLOWED
```

---

## 🏷️ Release Milestones

* **`v0.1.0`**: Project foundation (NestJS + Docker PostgreSQL + Prisma schema setup)
* **`v0.2.0`**: Database / Prisma schema migrations & seed baseline
* **`v0.3.0`**: Authentication & RBAC implementation
* **`v0.4.0`**: Student Management & Excel import pipeline
* **`v0.5.0`**: Class session scheduling engine
* **`v0.6.0`**: QR Attendance verification engine
* **`v0.7.0`**: Student mobile application module
* **`v0.8.0`**: Staff mobile scanner module
* **`v0.9.0`**: Firebase Cloud Notifications
* **`v1.0.0`**: MVP Release

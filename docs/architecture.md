# System Architecture & Security Specifications

## 1. Auth & Verification Chain

Access control enforces placement-only eligibility. Non-eligible or non-imported students cannot register or log in.

```text
User login request
       │
       ▼
User Record Exists? ──(No)──► Reject (401 Unauthorized)
       │ (Yes)
       ▼
Role == STUDENT? ───(No)───► Proceed to Staff RBAC Validation
       │ (Yes)
       ▼
User.status == ACTIVE? ──(No)──► Reject (403 Forbidden)
       │ (Yes)
       ▼
Student Profile Exists? ──(No)──► Reject (403 Forbidden)
       │ (Yes)
       ▼
Student.status == ACTIVE? ──(No)──► Reject (403 Forbidden)
       │ (Yes)
       ▼
Student.isPlacementEligible == true? ──(No)──► Reject (403 Forbidden)
       │ (Yes)
       ▼
Issue Access & Refresh JWT Tokens
```

---

## 2. Dynamic QR Nonce Security

To prevent QR screenshot sharing or reuse:

1. **Student requests QR for session:** Backend generates a high-entropy raw random token nonce.
2. **Server Hashing:** Backend hashes token via SHA-256 (`tokenHash`) and stores `QrAttendanceToken` in PostgreSQL with `expiresAt` set to short window (e.g., 30s) and `isUsed = false`.
3. **QR Display:** Backend sends only raw token to student app. App displays QR code.
4. **Staff Scan:** Staff scanner reads raw token and sends to NestJS verification endpoint.
5. **Atomic Validation:** NestJS computes `tokenHash`, executes single atomic SQL transaction:
   - Finds matching `tokenHash` record where `isUsed == false` AND `expiresAt > now()`.
   - Checks `(sessionId, studentId)` eligibility and staff authorization.
   - Updates `isUsed = true`, `usedAt = now()`.
   - Inserts row into `Attendance` with unique constraint `@@unique([sessionId, studentId])`.

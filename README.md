# BuyFacts Platform & Cubicon Executive Analytics

## 1. Overview
BuyFacts is an enterprise B2B research methodology and survey technology platform. This Next.js application hosts the primary public web application, customer registration pipelines, transactional email workflows, research tool embedding, and the **Cubicon Executive Intelligence & Referral Analytics Dashboard**.

---

## 2. Architecture Overview

### Tech Stack
- **Frontend Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: CSS Modules, responsive design, dark-mode glassmorphic cyber theme
- **Database & ORM**: SQLite (`prisma/dev.db`), Prisma ORM v7 with `@prisma/adapter-better-sqlite3`
- **Email Delivery**: Resend API (`lib/resend.ts`)
- **Testing Engine**: Node.js Test Runner (`node:test`, `node:assert/strict`, `tsx`)

### System Data Flow
```
User (Playing 3D Cubicon) ---> /api/cubicon-data (CubiconAttempt & CubiconSession)
User (Registration)       ---> /api/cubicon-registration (CubiconRegistration)
User (Sending Invites)    ---> /api/cubicon-share (CubiconShare + Resend Dispatch)
User (Feedback Review)    ---> /api/cubicon-feedback (FeedbackSubmission)
                                      |
                                      v
                             Prisma SQLite Database (dev.db)
                                      |
                                      v
                             /api/cubicon-analytics
                                      |
                                      v
                     Executive Analytics Dashboard (/cubicon/analytics)
```

---

## 3. Executive Analytics & Decision-Making Features

The Executive Dashboard at `/cubicon/analytics` (and `/admin/cubicon-analytics`) provides company leadership with actionable business intelligence:

### Core Decision-Making Metrics
1. **People & Participant Tracking**:
   - Unique individuals trying Cubicon across direct visits, registrations, and referrals.
   - Live completion status (`Completed`, `In Progress`, `Registered`).
   - Session drill-down modal displaying individual task telemetry, start/submit timestamps, and click counts.
2. **Referral & Viral Sharing Intelligence**:
   - Ledger of all invitations sent with sender name/email and recipient name/email.
   - Real-time conversion matching (`Verified & Completed`, `Attempted Puzzle`, `Pending Invite`).
   - Advocate Champions Leaderboard ranking top referrers by conversion count and rate.
   - Viral multiplier ($K$-factor) tracking viral growth velocity.
3. **4-Stage Verification Progression Funnel**:
   - Task-by-task drop-off analysis (Task 1 to Task 4).
   - Average duration (seconds) and click volume per puzzle face.
   - Bot vs. human behavioral discrimination indicators.
4. **Hardware & Operating System Intelligence**:
   - OS distribution (Windows, macOS, iOS, Android, Linux).
5. **Customer Feedback & Sentiment**:
   - Star rating distribution (1 to 5 stars) and feedback commentary stream.
6. **Data Export & Executive Controls**:
   - Dynamic date filtering (`All Time`, `Last 30 Days`, `Last 7 Days`, `Today`).
   - Search filtering by email, name, company, or advocate.
   - One-click CSV and JSON data export for BI systems (PowerBI, Excel, Tableau).
   - Configurable auto-refresh intervals (15s, 30s, 60s).

---

## 4. API Reference

### Analytics Endpoints

#### `GET /api/cubicon-analytics`
Retrieves consolidated analytics dataset.
- **Query Parameters**:
  - `range`: Optional date filter (`all`, `30d`, `7d`, `today`). Default is `all`.
- **Response Structure**:
  - `overview`: Total testers, registrations, sessions, attempts, completions, completion rate, shares sent, conversion rate, viral multiplier, average duration, average rating.
  - `participants`: List of consolidated participant profiles with session history.
  - `referrals`: List of shares, top advocates ranking, and conversion ledger.
  - `funnel`: Step-by-step funnel stats (attempts, passed count, pass rate, avg clicks, avg time).
  - `devices`: OS counts breakdown.
  - `feedback`: All submitted user reviews and ratings.
  - `trends`: Daily 14-day time series data for trend visualization.

#### `POST /api/cubicon-share`
Processes and records an invitation sent by a user.
- **Request Body**:
  ```json
  {
    "senderName": "Jane Doe",
    "senderEmail": "jane@example.com",
    "receiverName": "John Smith",
    "receiverEmail": "john@example.com",
    "sharePlatform": "email",
    "shareUrl": "https://buyfacts.com/cubicon"
  }
  ```
- **Response**: `{ success: true, share: { id, ... }, emailResult: { ... } }`

#### `GET /api/cubicon-share`
Returns all recorded share invitations.

#### `POST /api/cubicon-feedback`
Records user satisfaction rating and commentary.
- **Request Body**:
  ```json
  {
    "userId": "user_123",
    "userEmail": "user@example.com",
    "sessionId": "sess_456",
    "feedbackText": "Very responsive 3D puzzle validation.",
    "rating": 5
  }
  ```

#### `GET /api/cubicon-feedback`
Returns all feedback submissions sorted by newest first.

---

## 5. Database Schema

The Prisma SQLite database is defined in `prisma/schema.prisma`. Key Cubicon models include:

- **`CubiconTask`** (`cubicon_tasks`): Puzzles and 3D faces configuration.
- **`CubiconSession`** (`cubicon_sessions`): Active user verification sessions.
- **`CubiconAttempt`** (`cubicon_attempts`): Granular click telemetry and submit logs.
- **`CubiconRegistration`** (`cubicon_registrations`): Founding client registration submissions.
- **`CubiconShare`** (`cubicon_shares`): Invitation records (`senderName`, `senderEmail`, `receiverName`, `receiverEmail`, `sharePlatform`, `status`, `createdAt`).
- **`FeedbackSubmission`** (`cubicon_feedback`): User star ratings and feedback commentary.

---

## 6. Setup and Development

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### Installation & Run
```bash
# Install dependencies
npm install

# Push database schema to SQLite
npx prisma db push

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```
Open [http://localhost:3000/cubicon/analytics](http://localhost:3000/cubicon/analytics) in your browser to view the Executive Analytics Dashboard.

### Running Automated Tests
```bash
npm test
```
Runs the automated test suite verifying database models, conversion matching logic, viral coefficient calculations, and funnel step aggregations.

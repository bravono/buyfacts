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

#### `GET /api/cubicon-data`
Retrieves sequence metadata and ordered tasks for the 3D Cubicon solver.
- **Query Parameters**:
  - `sequenceId` or `sequence` (slug): Target sequence identifier. Defaults to active sequence.

#### `POST /api/cubicon-data`
Handles session initialization, spatial click attempt evaluations, state integrity, and Section 7.4 scoring rules.
- **Section 7.4 Deterministic Scoring Paths**:
  - **Path 1**: Three correct out of three -> Immediate Pass (`fireworks: true`).
  - **Path 2**: Two correct after three -> Presents a 4th fallback question.
    - If 4th answer is correct -> Pass (`fireworks: true`).
    - If 4th answer is incorrect -> Fail.
  - **Path 3**: Two incorrect among the first three -> Immediate Fail (stops without presenting 4th question).
  - **Path 4 (Retry)**: Unlimited retries via `{ action: "retry" }`, resetting session state cleanly back to task 1.
- **Integrity & Security Controls**:
  - **Terminal State Lockdown**: Prevents browser back, page refresh, or re-submissions from mutating completed pass or fail outcomes.
  - **Idempotency Guard**: Duplicate clicks on already evaluated tasks return active state without double-counting or skipping tasks.
  - **Privacy Masking**: Internal diagnostic failure stages (e.g. `early_two_incorrect_at_task_2`) are recorded in the database for auditing and strictly omitted from public client JSON payloads.
- **Sequence Completion Messaging**:
  - **Pass (Success)**:
    - `heading`: `"Congratulations! You are human."`
    - `description`: `"Next we offer you a number of choices below. Please make a selection and we thank you for considering Cubicon and BuyFacts."`
    - `fireworks`: `true`
  - **Fail (Rejection / Survey-Capacity)**:
    - `heading`: `"Thank you for participating"`
    - `description`: `"Sorry our survey has exceeded the number of desired respondents. We hope to see you again when we reach out again. Please select from the choices below."`
    - `fireworks`: `false`

#### `POST /api/contact`
Receives general contact inquiries and places them into an email verification hold queue.
- **Validation**: Enforces Name, Email, Message, and Age Certification (18+) via `ContactInquirySchema`.
- **Anti-Abuse**: Protected by sliding-window IP rate limiting (5 req / 10 min) and hidden honeypot check (`hp_website`).
- **Hold Pipeline**: Generates a 24-hour verification token in `email_verifications` table and dispatches verification link. Submission is held until verified.

#### `GET /api/verify-email`
Validates inquiry verification tokens and releases held submissions.
- **Parameters**: `token` (query string).
- **Execution Flow**:
  - Verifies token validity and checks that token has not expired (> 24 hours).
  - Marks `verifiedAt` timestamp.
  - Releases held inquiry into SQLite `ContactInquiry` or `CubiconRegistration`.
  - Dispatches verified inquiry to internal staff mailbox (`inquiry@buyfacts.com`).
  - Renders confirmation page stating: *"Your message has been sent. You will hear back within 48 hours."*
- **Administrative Checks**: `?action=check-reminders` sends automated 12-hour reminder emails for pending inquiries halfway through their 24-hour expiration window.

#### `POST /api/verify-email`
Resends an active 24-hour email verification link.
- **Body**: `{ "email": "user@example.com" }` or `{ "token": "previous-token" }`.
- **Rate Limit**: 3 resends per 15 minutes per IP address.

#### `POST /api/cubicon-registration`
Handles Cubicon Founding Client Program applications (Section 8).
- **Business Email Blacklist**: Free public webmail domains (e.g. `gmail.com`, `yahoo.com`, `hotmail.com`, `proton.me`) are strictly blocked. Requires legitimate business domain.
- **US-Based Confirmation**: Requires explicit confirmation that the organization is US based (`isUsBased: true`).
- **Confirmation Options**: Sends confirmation receipt email when `requestConfirmation` is enabled.

#### `POST /api/cubicon-feedback`
Records non-anonymous user feedback and star rating (Section 9.4).
- **Validation**: Requires Name, valid Email, and Comment via `FeedbackSchema`.
- **Anti-Abuse**: Rate limited (10 submissions / 10 min) with honeypot validation.

#### `GET /api/cubicon-feedback`
Returns feedback submissions. Supports `?export=csv` for executive CSV download.

#### `DELETE /api/cubicon-feedback`
Executes data retention policy. Call with `?purge=30d` to remove feedback records older than 30 days.

---

## 5. Database Schema

- **`EmailVerification`** (`email_verifications`): Hold queue for pending inquiries awaiting email verification (`token`, `email`, `type`, `payload`, `expiresAt`, `verifiedAt`, `reminderSentAt`).
- **`CubiconSequence`** (`cubicon_sequences`): Puzzle group configuration (`slug`, `title`, `description`, `pass_threshold`, `rotation_direction`, `default_rotation_interval`, `is_active`, `created_by`).
- **`CubiconTask`** (`cubicon_tasks`): Puzzles and 3D faces configuration linked to `sequence_id`.
- **`CubiconSession`** (`cubicon_sessions`): Active user verification sessions linked to `sequence_id`.
- **`CubiconAttempt`** (`cubicon_attempts`): Granular click telemetry and submit logs linked to `sequence_id`.
- **`CubiconRegistration`** (`cubicon_registrations`): Founding client registration submissions (`name`, `email`, `company`, `role`, `interest`, `notes`, `isUsBased`).
- **`CubiconShare`** (`cubicon_shares`): Invitation records (`senderName`, `senderEmail`, `receiverName`, `receiverEmail`, `sharePlatform`, `status`, `createdAt`).
- **`FeedbackSubmission`** (`cubicon_feedback`): User star ratings and feedback commentary.

### Sequence & Admin Endpoints
- `GET /api/admin/sequences`: Authenticated endpoint returning all configured sequences with task definitions and usage counts.
- `POST /admin/sequences`: Authenticated endpoint creating a new puzzle group with title, slug, threshold, rotation direction (`left` or `right`), rotation interval, and tasks.
- `GET /api/admin/sequences/:id`: Authenticated endpoint fetching a specific sequence with tasks.
- `PUT /api/admin/sequences/:id`: Authenticated endpoint updating sequence parameters and tasks.
- `DELETE /api/admin/sequences/:id`: Authenticated endpoint deleting a non-default sequence.
- `POST /api/admin/sequences/:id/activate`: Authenticated endpoint activating a sequence as the primary default challenge.

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
Runs the automated test suite verifying database models, conversion matching logic, viral coefficient calculations, video preview flow, and funnel step aggregations.

---

## 8. Site Navigation & Dashboard Architecture (Sections 4, 6, 15)

### Standardized Navigation Menu
The navigation header provides exact parity across desktop and mobile devices with 7 primary destinations:
1. `HOME` (`/`)
2. `INNOVATIONS THAT SAVE TIME` (`/products-services`, replaces legacy "Products and Services")
3. `RESEARCH IMPERATIVES` (`/research-imperatives`, replaces legacy "Market Research")
4. `CUBICON` (`/cubicon`, replaces legacy "Bad Bots")
5. `THOUGHT LEADERSHIP` (`/#thought-leadership`)
6. `ABOUT` (`/#about`)
7. `CONTACT` (`/#contact`)

All navigation links support dynamic active state indication via `usePathname()`. Deprecated routes and broken `/services?tab=...` links have been purged.

### Dashboard & Media Player Model
The dashboard and media player provide three standardized action choices at the base of the player window:
1. **Video**: User-initiated video presentation with an animated opening state, explicit "Start Video" and "Cancel" buttons, "Skip Video", "Reload Video", and next-step instructions upon completion.
2. **In Depth**: Presents an executive document preview modal with title, estimated reading time, file format, and key takeaways before download confirmation. Preserves selected item highlight on the dashboard upon completion.
3. **Talk to Us**: Direct navigation to `/#contact`.

---

## 9. Cubicon 1-Minute Timed Preview & Copy Alignment (Sections 7.1, 7.2, 7.3)

### 1-Minute Timed Preview Controller
Runs directly on the `/cubicon` viewport without navigating away:
- Explicit "1-Minute Preview" disclosure and introduction prior to initiation.
- 3 automated puzzle states (Spatial Orientation, Multi-Angle Alignment, 3D Object Verification) allocated 7 seconds per state with an animated countdown progress bar.
- Interactive playback controls:
  - **Pause / Resume**: Toggles preview progression and countdown.
  - **Replay**: Re-initializes state progression from Puzzle 1.
  - **Cancel**: Instantly halts preview and returns user to the introduction slide without scrolling or losing page position.
  - **See It Live**: Smoothly launches the embedded 3D spatial solver.

### Methodology Terminology & Claims
- Replaced legacy "respondent" / "respondents" terminology with "participant" / "participants" throughout all customer-facing interfaces.
- Qualified absolute statements (such as "bots are incapable of evaluating" and "Ensure 100% confidence") with rigorous methodological language focused on multi-dimensional visual validation and high statistical confidence.

---

## 10. Form Pipeline, Email Verification & Anti-Abuse (Sections 8, 9, 13)

- **Business Email Enforcement**: Founding-client and corporate inquiries require non-free business email domains (`lib/validation/forms.ts`).
- **Hold Pipeline for Unverified Inquiries**: Inquiries submitted through `/api/contact` are held in the `EmailVerification` database table with a unique verification token until the user clicks the confirmation link in their email. Upon verification, the inquiry is forwarded to `inquiry@buyfacts.com`.
- **Automated Verification Reminders**: Unverified inquiries receive a friendly reminder after 12 hours (`/api/verify-email?action=check-reminders`).
- **Non-Anonymous Feedback**: All feedback submissions mandate full name and valid email address.
- **Anti-Abuse Protections**:
  - Hidden honeypot fields (`website`, `company_url`) across all public forms.
  - Sliding-window in-memory IP rate limiter (`lib/security/rate-limiter.ts`) protecting form endpoints from bot flood attacks.

---

## 7. Cubicon Embedded 3D Solver Architecture

The interactive 3D spatial solver is embedded via an `iframe` at `/cubicon` from `public/cubicon-app/`:
- **Document Background Synchronization**: Both the host wrapper and embedded iframe document enforce `#0f141c` to eliminate white document flash during mounting and stylesheet parsing.
- **Initial HTML Preloader**: Displays an immediate lightweight animated indicator inside `#root` during JavaScript bundle transfer.
- **3D Asset Streaming Preloader**: Uses React Suspense and `@react-three/drei`'s `useProgress()` to stream `.glb` geometries, `.exr` studio lighting, and texture maps with a live percentage indicator and smooth fade-out.
- **Embedded Iframe Event Bus (`window.onmessage`)**:
  - `CUBICON_EXIT`: Dispatched when the user clicks Exit either on the host frame header or on the completion action bar. Closes live app view, exits fullscreen, and scrolls to `#founding-client-benefits`.
  - `CUBICON_CONTACT`: Dispatched when the user clicks Contact Us on the completion action bar. Exits fullscreen, notifies iframe, and navigates host app to `/#contact`.
  - `CUBICON_SET_FULLSCREEN`: Dispatched from host to iframe to sync canvas FOV and object scaling dynamically.
- **Dedicated Routes**:
  - `/contact`: Automatically redirects direct visits to `/#contact` on the main BuyFacts landing page.

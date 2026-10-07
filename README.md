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

#### `POST /api/contact`
Receives and records contact inquiries. Requires completion of human verification via the Cubicon spatial puzzle engine.
- **Request Body**:
  ```json
  {
    "name": "Sarah Connor",
    "email": "sarah@example.com",
    "company": "Cyberdyne Systems",
    "interest": "General Inquiry",
    "message": "Interested in primary research services.",
    "isEighteen": true,
    "verificationSessionId": "sess_1788500000000_abc123"
  }
  ```
- **Validation**:
  - Requires `verificationSessionId` belonging to the `contact_form` sequence.
  - Verification pass threshold must meet or exceed 60% (0.60).
  - Enforces one-time token consumption to prevent automated replay attacks.
- **Response**: `{ success: true, message: "Inquiry saved successfully.", id: "uuid" }`

#### `GET /api/cubicon-data`
Retrieves sequence metadata and ordered tasks for the 3D Cubicon solver.
- **Query Parameters**:
  - `sequenceId` or `sequence` (slug): Target sequence identifier (e.g. `default`, `contact_form`). Defaults to the active sequence.

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
- **Validation**: Enforces Name, Email, Message, and Age Certification (18+) via `ContactInquirySchema`. Submissions are placed into a 24-hour verification hold queue.
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
- **Human Anti-Bot Verification via Cubicon**:
  - Requires valid `verificationSessionId` belonging to the `contact_form` sequence.
  - Enforces pass threshold of 60% (0.60) across puzzle tasks before registration is accepted.
  - Enforces one-time token consumption to prevent automated replay attacks.
  - Interactive full-screen modal overlay triggers upon clicking "Complete Puzzle to Register", automatically submitting upon successful puzzle completion.
- **Form Simplification**:
  - The previous "Urgency" select dropdown in Step 2 has been removed from the user interface. Backend schemas default `urgency` to "Medium" for clean backward compatibility.
- **Business Email Blacklist**: Free public webmail domains (e.g. `gmail.com`, `yahoo.com`, `hotmail.com`, `proton.me`) are strictly blocked. Requires legitimate business domain.
- **US-Based Confirmation**: Requires explicit confirmation that the organization is US based (`isUsBased: true`).
- **24-Hour Verification Hold Pipeline**:
  - Submissions are initially placed in a pending verification state (`email_verifications` table with `type: "founding_client"`).
  - No database registration record or client confirmation emails are sent prematurely.
  - A tailored email verification request is dispatched to the user's business email with a 24-hour token.
  - Upon clicking the verification link (`/api/verify-email?token=...`), the registration is committed to `cubicon_registrations` and a personalized confirmation email is dispatched.
  - Confirmation emails greet the registrant by name and detail their founding privileges (wholesale lock, taste-test trial, refund guarantee, priority roadmap access) while omitting raw technical registration metrics.

#### `POST /api/cubicon-feedback`
Records non-anonymous user feedback and star rating (Section 9.4).
- **Validation**: Requires Name, valid Email, and Comment via `FeedbackSchema`.
- **Anti-Abuse**: Rate limited (10 submissions / 10 min) with honeypot validation.

#### `GET /api/cubicon-feedback`
Returns feedback submissions. Supports `?export=csv` for executive CSV download.

#### `DELETE /api/cubicon-feedback`
Executes data retention policy. Call with `?purge=30d` to remove feedback records older than 30 days.

---

### User Feedback Feature & Post-Puzzle Completion Actions

#### `/feedback` (Frontend Route)
A dedicated, responsive feedback submission page with dark-mode glassmorphic styling:
- **Star Rating Selector**: Interactive 1 to 5 star rating picker with hover effects and descriptive sentiment labels.
- **Non-Anonymous Identification**: Collects Full Name (`name`) and verified email (`email`) per `FeedbackSchema` requirements.
- **Commentary**: Text area for user suggestions, experiences, and methodology feedback (3 to 3,000 characters).
- **URL Parameter Support**: Supports pre-filling from external links or solver sessions via query parameters:
  - `?sessionId=...`: Pre-fills and links the feedback to a specific 3D Cubicon session.
  - `?rating=...`: Pre-selects a star rating (1 to 5).
  - `?name=...`: Pre-fills the user's name.
  - `?email=...`: Pre-fills the user's email.
- **Anti-Bot Honeypot**: Hidden `hp_website` input to block automated bot spam.
- **Post-Submission Actions**: Success card offering immediate navigation back to Home or to launch Cubicon live.

#### Cubicon Post-Puzzle Completion Integration
Upon completing the 3D Cubicon puzzle sequence, users are presented with 5 dedicated action buttons:
1. **Try Again**: Restarts the puzzle sequence for further practice.
2. **Share**: Opens the invitation modal to refer colleagues and research partners.
3. **Feedback**: Dispatches `CUBICON_FEEDBACK` message and smoothly navigates the participant to `/feedback?sessionId=${sessionId}` to leave their review and star rating.
4. **Contact Us**: Dispatches `CUBICON_CONTACT` message and redirects to the contact inquiry section at `/#contact`.
5. **Exit**: Exits the 3D demo and scrolls to the Founding Client privileges section.

Additionally, a quick-access "Feedback" button is available in the 3D solver header controls toolbar at `/cubicon`.

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
5. `ABOUT` (`/#about`)
6. `WHAT SETS US APART` (`/#what-sets-us-apart`)
7. `CONTACT` (`/#contact`)

All navigation links support dynamic active state indication via `usePathname()`. Mobile navigation links are left-aligned, compact, and match the desktop destinations. Deprecated routes and broken `/services?tab=...` links have been purged.

### What Sets Us Apart Architecture & Dual CDN Video Showcase
Located within the About section (`id="about"`) on the homepage, the "What Sets Us Apart" subsection (`id="what-sets-us-apart"`) delivers high-definition video demonstrations over CDN:
- **Direct Anchor Access**: Directly addressable via `/#what-sets-us-apart` from desktop navigation, mobile drawer, and footer quick links.
- **Dual CDN Video Player Architecture**:
  1. *Video 1 (Early Recognition & Spatial Intelligence)*: Demonstrates early movement detection and real-time telemetry.
  2. *Video 2 (Story-Based Methodology & Return on Effort)*: Illustrates narrative inquiry and participant engagement models.
- **Resilient CDN Delivery**: Utilizes public S3 CDN endpoints with automated browser error fallback (`onError`) to secondary high-availability CDN streams, ensuring uninterrupted presentation.
- **Zero-Emoji Compliance**: Adheres to strict corporate design and zero-emoji standards across all UI layers and metadata.

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
- **Validation**: Enforces Name, Email, Message, and Age Certification (18+) via `ContactInquirySchema`. Submissions are placed into a 24-hour verification hold queue.
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
5. `ABOUT` (`/#about`)
6. `WHAT SETS US APART` (`/#what-sets-us-apart`)
7. `CONTACT` (`/#contact`)

All navigation links support dynamic active state indication via `usePathname()`. Mobile navigation links are left-aligned, compact, and match the desktop destinations. Deprecated routes and broken `/services?tab=...` links have been purged.

### Navbar Contact Collapse & Scroll-Up Restoration
- **Contact Triggered Collapse**: When the user clicks the "CONTACT" link (desktop button or mobile drawer link) or navigates to `/#contact`, the fixed navbar immediately collapses (`translateY(calc(-100% - 30px))`, `opacity: 0`, `pointer-events: none`). This removes the 70px-80px fixed header obstruction so the contact form achieves full viewport visibility on 1080p laptops (e.g. HP ZBook).
- **Scroll-Up Restoration**: When the user starts scrolling back up (`currentScrollY < lastScrollY - 8`) or returns to the top of the page (`currentScrollY <= 20`), the navbar smoothly animates back into view (`transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease`).
- **Smooth Scroll Grace Period**: Enforces a 1000ms grace window following the contact click to prevent programmatic downward smooth-scrolling from prematurely uncollapsing the header.
- **Automated Verification**: Integration tests located in `tests/navbar-contact-collapse.test.ts` validating lifecycle transitions, CSS rules, and zero emojis.

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

### 7. Cubicon 1-Minute Video Preview & Embedded 3D Solver Architecture

#### 1-Minute Video Preview Mechanism (Section 7.1 & 7.2)
- **Duration Disclosure**: The opening card on `/cubicon` states the duration before playback begins (*"See a One Minute Video Preview"*).
- **Direct Video Launch**: Clicking the primary **START** button directly initiates playback of the recorded self-running demo (`Cubicon_self_running.mp4`) without intermediary modal gating cards or artificial slideshow interval timers.
- **Media-Controlled Timing (Section 7.2.03)**: The final media itself controls playback timing.
- **Player Controls (Section 7.2.05 & 7.2.06)**:
  - Native HTML5 controls (`autoPlay`, `controls`, `playsInline`).
  - Dedicated **Skip Video** button to fast-forward to completion instructions.
  - Dedicated **Reload Video** stream button.
  - Dedicated **Back to Preview** (Cancel) button returning the visitor cleanly to the introduction slide without losing their place.
  - Interactive completion overlay featuring **"TRY IT YOURSELF NOW"** which smoothly transitions into the 3D solver.
- **Standalone App Parity**: The standalone Cubicon application (`c:/Users/USER/cubicon`) serves strictly as the interactive 3D solver without an extraneous slideshow modal, launching directly on "Start".

#### Embedded 3D Solver Architecture
The interactive 3D spatial solver is embedded via an `iframe` at `/cubicon` from `public/cubicon-app/`:
- **Document Background Synchronization**: Both the host wrapper and embedded iframe document enforce `#0f141c` to eliminate white document flash during mounting and stylesheet parsing.
- **Initial HTML Preloader**: Displays an immediate lightweight animated indicator inside `#root` during JavaScript bundle transfer.
- **3D Asset Streaming Preloader**: Uses React Suspense and `@react-three/drei`'s `useProgress()` to stream `.glb` geometries, `.exr` studio lighting, and texture maps with a live percentage indicator and smooth fade-out.
- **Canvas Touch Action & Interaction Guards**:
  - `canvas { touch-action: none !important; }` prevents single-finger and multi-finger gestures (orbiting the cube, drawing circles, or dragging marker coordinates) from triggering parent page scrolling.
  - `#root` and `#root > div` enforce `overflow: hidden; width: 100vw; height: 100dvh;` to eliminate synthetic scroll bars and touch jitter.
- **Fullscreen & Pseudo-Fullscreen Fallback**:
  - Supports standard browser `requestFullscreen()` with bidirectional `postMessage` synchronization (`CUBICON_SET_FULLSCREEN`).
  - Implements `.appFrameWrapperPseudoFullscreen` (`position: fixed; inset: 0; width: 100dvw; height: 100dvh; z-index: 99999;`) as a robust fallback for iOS Safari and mobile devices where native element fullscreen is restricted.
  - Floating exit buttons (`.exitFullscreenFloatingBtn` with `z-index: 100000` and minimum 44px height) and `Escape` key listeners guarantee seamless exit across all platforms.
- **Responsive Viewport & Typography Clamping (Sections 7.3 & 14)**:
  - Task card headings and descriptions utilize `clamp(...)` typography (`clamp(0.95rem, 4vw, 1.25rem)` on 390px screens) ensuring cards never collide with the 3D cube or push action buttons out of view.
  - Touch targets enforce minimum 44x44px dimensions per Section 14 accessibility guidelines.
  - Responsive FOV calculation dynamically adapts between mobile portrait (360px/390px: FOV 17.5, scale 1.65), mobile landscape (FOV 14.0, scale 1.1), tablet (FOV 13.0, scale 1.0), and desktop (FOV 10.0, scale 1.0).
- **Embedded Iframe Event Bus (`window.onmessage`)**:
  - `CUBICON_EXIT`: Dispatched when the user clicks Exit either on the host frame header or on the completion action bar. Closes live app view, exits fullscreen, and scrolls to `#founding-client-benefits`.
  - `CUBICON_CONTACT`: Dispatched when the user clicks Contact Us on the completion action bar. Exits fullscreen, notifies iframe, and navigates host app to `/#contact`.
  - `CUBICON_SET_FULLSCREEN`: Dispatched from host to iframe to sync canvas FOV and object scaling dynamically.
- **Dedicated Routes & Anchors**:
  - `/contact`: Automatically redirects direct visits to `/#contact` on the main BuyFacts landing page.
  - `/cubicon#founding-client`: Direct anchor targeting the Founding Client Registration section. Form fields are immediately visible by default with client-side hash detection and smooth scrolling. Backward-compatible aliases `#register-form` and `#founding-client-form` are fully supported.

---

## 11. Reusable Triplet Button Component & Vibrant Color System

### Component Overview
The `TripletButtonGroup` and `TripletButton` components (`components/TripletButton.tsx`, `components/TripletButton.module.css`) provide high-vitality, tactile interactive pathways for key site destinations.

### Key Features
1. **Clear Button Affordance**:
   - Distinct rounded pill button container with subtle 3D top-shimmer, active click press response (`translateY(2px) scale(0.985)`), and directional action arrows.
   - Hover states feature an elevation lift (`translateY(-4px)`), intensified radial glow flare, and icon micro-rotation.
2. **Brief Text Below**:
   - Descriptive captions sit directly below each button, answering stakeholder usability requirements so visitors immediately understand both the destination purpose and interactive affordance.
3. **CDN Icon Support & Fallbacks**:
   - Accepts direct CDN icon URLs (`iconUrl`) with automated image error fallback (`onError`) to high-resolution Lucide React vector icons.
4. **Vibrant Color Tokens**:
   - Expanded global CSS color system in `app/globals.css`:
     - `--vibrant-orange-gradient` and `--vibrant-orange-glow` (warm sunset amber for Early Recognition)
     - `--vibrant-blue-gradient` and `--vibrant-blue-glow` (electric azure/cyan for Story-Based Research)
     - `--vibrant-purple-gradient` and `--vibrant-purple-glow` (electric violet/fuchsia for TRIAD)
     - `--vibrant-teal-gradient` and `--vibrant-teal-glow` (radiant emerald/teal)
5. **Component API**:
   ```typescript
   export interface TripletButtonItem {
     id: string;
     title: string;
     tagline: string; // Brief text below the button
     href: string;
     iconUrl?: string; // Optional CDN icon URL
     fallbackIcon?: React.ReactNode;
     iconAlt?: string;
     theme?: "orange" | "blue" | "purple" | "teal";
     badge?: string;
     external?: boolean;
     actionHint?: string;
   }
   ```
6. **Automated Test Coverage**:
   - Complete verification suite located in `tests/triplet-button.test.ts` validating specs, CDN fallbacks, link security, and layout defaults.

---

## 12. Homepage Section 2: Peer Benchmark Incentive Surveys

### Component Overview
Section 2 (`#portfolio` in `app/page.tsx`, styled in `app/page.module.css`) presents the core value pillars of BuyFacts' peer benchmark methodology.

### Architecture & Design Elements
1. **Section Header**:
   - Primary Title: "Peer Benchmark Incentive Surveys"
   - Primary Description: "Real-Time Peer Comparisons. Relevant Insight for Eery participant."
   - Trust Badges: Sleek pill badges with dot indicators ("Peer Share for Real People", "No Cash Incentive Stigma", "Participants Provide Accurate Data").
   - Callout Banner: Integrated highlight banner emphasizing data quality and removing payola incentives.
2. **8-Pillar Card Grid & CDN Asset Architecture**:
   - Card Architecture: Structured white card tiles with subtle brand borders, shadows, and smooth hover elevation.
   - Header Row: Dual-tone rounded icon container alongside two-digit sequential index numerals (`01` through `08`).
   - CDN Icon Delivery: High-resolution vector SVGs hosted on the BuyFacts public assets S3 CDN (`https://s3.buyfacts.com/buyfacts-public-assets/uploads/`).
     - Card 01 (Survey Design): `BuyFacts_Survey_Hosting.svg`
     - Card 02 (Perticipant Insight Choices): `BuyFacts_Early_Recognition.svg`
     - Card 03 (Traditional and Story-based Instruments): `BuyFacts_Research_Tools_Concept.svg`
     - Card 04 (Best Practices): `BuyFacts_Best_Practices_Keystone.svg`
     - Card 05 (Every Question Maps to Its Purspose): `BuyFacts_Question_Design.svg`
     - Card 06 (Executives Get peer Comparison Not Coffee Cards): `BuyFacts_Value_Quantification.svg`
     - Card 07 (A Dual Approach Delivers Stories Backed by Facts): `BuyFacts_Thought_Leadership_TL1.svg`
     - Card 08 (Inclusive Stakeholder Engagement Reduces Malicious Compliance): `BuyFacts_Bot_Detection.svg`
   - Resilient Fallback: `ServiceCardIcon` component handles asset loading and falls back seamlessly to Lucide vector icons on error (`onError`).
   - Sizing and Containment: `.cardCdnIcon` class enforces `34px x 34px` dimensions with `object-fit: contain` inside the 54px icon container.
   - Typography: Left-aligned display titles tailored for variable length headlines.
   - Hover Feedback: Micro-interaction accent bar expanding on card hover.
3. **Responsive Grid**:
   - Desktop (>= 1024px): 4-column x 2-row grid.
   - Tablet (768px - 1023px): 2-column x 4-row grid.
   - Mobile (< 768px): Single-column stack with adjusted card gap.
4. **Automated Verification**:
   - Test suite in `tests/section-two-design.test.ts` validating anchor preservation, exact copy retention, badge system, CDN asset endpoints, image fallback mechanics, CSS grid rules, and zero-emoji compliance.

---

## 13. Homepage Section 3: About (Who Is BuyFacts?)

### Component Overview
Section 3 (`#about` in `app/page.tsx`, styled in `app/page.module.css`) contains the comprehensive corporate narrative and positioning document, "Who Is BuyFacts?", positioned directly above the "Meet Our Team" navigation button.

### Architecture & Key Content Blocks
1. **Document Card (`.aboutDocument`)**:
   - Executive white card container with subtle brand borders (`rgba(0, 80, 123, 0.12)`), soft shadows, and responsive internal padding.
   - Title: "Who Is BuyFacts?" with Josefin Sans display typography.
   - Lead Paragraph: Clear articulation of BuyFacts as a hybrid research and professional services firm helping B2B marketers gain time and make competitive decisions.
2. **Core Positioning & Problem Statements**:
   - Market reality: Marketers competing in crowded markets with resource constraints.
   - The core challenge: Recognizing what matters early enough to take action.
3. **Earlier Recognition & Time Cadence**:
   - The Goal: "The goal is Earlier Recognition."
   - Indented time creation list: Time to understand, evaluate choices, test, and act before change becomes obvious.
   - 50% effort reduction metric across directional insight, content development, and research assets.
4. **Proprietary Approaches**:
   - **TRIAD**: Directional patterns and emerging market movements.
   - **Story-based research**: Human context, emotion, and objectives behind data.
   - **Human validation**: Verifying real participants vs. automated bots.
   - **Rule of Three assets**: Concise, reusable, co-branded insight assets.
   - **Edutainment**: Engaging presentation to differentiate vendor offerings.
5. **Research Longevity & Philosophy**:
   - Long-life research assets reusable across marketing, sales support, and thought leadership.
   - Innovation philosophy: Rapid evolution without dismantling proven methods.
   - Mission statement: Four decades of experience enabling clients to recognize earlier, gain time, create more choices, and make better competitive decisions.
6. **Automated Verification**:
   - Test suite in `tests/about-section-document.test.ts` validating anchor retention, exact copy preservation, placement above Meet Our Team button, CSS class rules, and zero-emoji compliance.

---

## 14. Homepage Section 4: Contact Us & Viewport Compactness

### Component Overview
Section 4 (`#contact` in `app/page.tsx`, styled in `app/page.module.css`) provides the primary communication channel for prospective enterprise clients, founding program inquiries, and general consultations.

### Architecture & Key Enhancements
1. **Workstation Viewport Visibility (HP ZBook 1080p Displays)**:
   - Optimized vertical footprint ensuring all form elements, labels, checkboxes, and the submission button fit simultaneously within typical 1080p laptop browser viewports (750px-850px visible height) without vertical scrolling.
   - Reduced section padding from 7rem to 3rem (`.contactSection`).
   - Compact card internal padding (`.contactCard`, 1.6rem 2rem).
   - Paired input rows (`.formRowDouble` with `grid-template-columns: 1fr 1fr; gap: 1rem;`) placing First Name & Last Name side-by-side and Business Email & Company side-by-side.
   - Compact textarea (`.textareaCompact`, min-height 65px, max-height 140px).
   - Horizontal footer layout (`.formFooterRow`) pairing age certification and email notices.
2. **Separation of First Name and Last Name**:
   - Distinct `firstName` and `lastName` form inputs, labels, and React component state.
   - Backend validation in `lib/validation/forms.ts` (`ContactInquirySchema`) synthesizes combined `name` for full backwards compatibility with SQLite storage and existing API integrations.
3. **Placeholder-Free Input Design**:
   - All `placeholder` attributes removed from contact form inputs (`firstName`, `lastName`, `email`, `company`, `message`).
   - Form fields rely exclusively on accessible floating labels and field icons for clean, uncluttered enterprise aesthetics.
4. **Subscript Registered Trademark for BuyFacts**:
   - Rendered as `BuyFacts<sub className={styles.subRegistered}>®</sub>`.
   - Styled via `.subRegistered` with `font-size: 0.55em; vertical-align: sub; line-height: 1;`.
5. **Corporate Email Validation Notice**:
   - Explicit prominent disclosure banner in the section header: *"Email confirmation is required to validate a corporate email address."*
   - Inline reminder placed alongside the age certification checkbox in the form footer.
6. **Mobile Responsiveness**:
   - Single-column stack layout on screens 768px and below (`@media (max-width: 768px)`).
   - Vertical stacking of form footer elements with accessible touch target sizing.
7. **Automated Verification**:
   - Test suite in `tests/contact-form-hp-zbook.test.ts` validating all 5 user requirements, schema transformations, layout compactness, and zero-emoji compliance.

---

## 15. Media Ingestion & 1GB Resumable Upload Architecture

### Overview
BuyFacts supports media uploads up to 1GB (`1024 * 1024 * 1024` bytes) across images, videos, audio recordings, 3D glTF/GLB models, PDFs, and archive packages. To support gigabyte-scale transfers reliably across cloud reverse proxies and mobile/residential networks, the ingestion architecture uses S3 Resumable Multipart chunking.

### Architecture & Upload Modes
1. **S3 Multipart Resumable Upload (Default & Recommended for Large Payloads)**:
   - Divides large files into 5MB chunks (`CHUNK_SIZE = 5 * 1024 * 1024`).
   - A 1GB file produces 205 parts, well within the S3 protocol limit of 10,000 parts.
   - Slices are uploaded directly to MinIO/S3 via presigned PUT URLs, bypassing Node.js server RAM.
   - Automatic retries with exponential backoff handle transient network disconnects per chunk.
   - Session resumption tokens stored in `localStorage` prevent loss of progress during connection loss.
2. **Automatic Route Protection for Payloads > 100MB**:
   - If a user selects "Direct PUT" or "Server Route", files exceeding 100MB are automatically promoted to multipart chunking in `FileUploader.tsx`.
   - This prevents intermediate reverse proxies (e.g., Cloudflare 100MB body cap or Nginx `client_max_body_size`) from abruptly terminating single HTTP requests, while preventing Node.js process out-of-memory crashes.
3. **API Validation Endpoints**:
   - `POST /api/upload/multipart/initiate`: Validates that requested multipart session file size does not exceed 1GB.
   - `POST /api/upload/presign`: Enforces 1GB ceiling on single presigned PUT batch requests.
   - `POST /api/upload`: Enforces 1GB ceiling on direct server form-data uploads.
4. **Automated Verification**:
   - Test suites in `tests/upload-limits.test.ts`, `tests/minio-multipart.test.ts`, and `tests/minio-upload.test.ts` validating exact 1GB boundaries, over-limit rejection, chunk count formulas, and path sanitization.






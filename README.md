# AgriTrust AI

**Tagline:** AI-Assisted Crop Diagnosis. Expert-Verified Agricultural Guidance.

AgriTrust AI is a full-stack, Human-in-the-Loop agricultural advisory platform built with React, TypeScript, Tailwind CSS, Express, Drizzle ORM, PostgreSQL (Cloud SQL), Firebase Authentication, and Gemini 4 Hydrogen (`@google/genai`).

## Core Trust Principle

1. **AI Assists with Preliminary Analysis**: Generates differential causes, observed symptoms, confidence indicators (capped below 100%), uncertainty statements, and missing field context. When `GEMINI_API_KEY` is not configured, the platform transparently runs a clearly labelled **Demonstration Mock AI Analyzer** rather than pretending a live ML model is active.
2. **Qualified Agricultural Experts Verify**: Only experts whose credentials have been verified by an Administrator can approve, correct, or reject AI findings and publish recommendations. Original AI outputs are preserved separately for auditability.
3. **Farmers Receive Reviewed Guidance**: Recommendations (cultural practices, biological options, preventive steps, cautious escalation, and traceable ICAR/university references) are released only after expert sign-off.

## Relational Database Schema (PostgreSQL / Drizzle)

Defined in `src/db/schema.ts` and managed via `src/db/drizzle.config.ts`:
- `users`
- `farmer_profiles`
- `expert_profiles`
- `expert_credentials`
- `crops`
- `crop_cases`
- `uploaded_images`
- `ai_analysis`
- `expert_reviews`
- `recommendations`
- `case_history`
- `notifications`
- `farmer_feedback`
- `agricultural_knowledge`
- `case_messages`

## Demonstration Test Accounts (Sample Data Only)

These accounts are pre-seeded for testing workflows and do **not** represent real farmers or real agronomic approvals:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Demo Farmer** | `farmer.demo@agritrust.example` | `FarmerDemo@2026` |
| **Demo Verified Expert** | `expert.demo@agritrust.example` | `ExpertDemo@2026` |
| **Demo Pending Expert** | `arjun.agronomy@agritrust.example` | `ExpertPending@2026` |
| **Demo Administrator** | `admin.demo@agritrust.example` | `AdminDemo@2026` |

One-click demo sign-in buttons are also available inside the **Sign In** dialog.

## Local Setup & Scripts

1. Install dependencies: `npm install`
2. Configure environment variables (`SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`, and optional `GEMINI_API_KEY`).
3. Push Drizzle schema to PostgreSQL: `npx drizzle-kit push --config=src/db/drizzle.config.ts`
4. Start development server on port 3000: `npm run dev`
5. Build for production: `npm run build`
6. Start production server: `npm start`

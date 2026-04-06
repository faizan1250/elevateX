# ElevateX Dashboard Product Spec

## Product goal
Turn the homepage into a hiring command center that tells the user what to do next to increase odds of getting hired.

## Required sections
1. Hero strip
   - Hireability score
   - Target role
   - Next best action
   - This week's momentum
2. Focus panel
   - Three highest-leverage actions for today
3. Application pipeline
   - Wishlist, applied, OA, interview, offer, rejected
   - Applications linked to specific roles and resume versions
4. Readiness matrix
   - Resume, interview, skills, portfolio, proof
5. Insights rail
   - Guidance, risks, trends, blockers
6. Evidence and assets
   - Resume versions, projects, certificates
7. Progress and trend analytics
   - 7-day movement
   - 30-day movement

## Backend contract
- `GET /api/dashboard/workspace`
  - returns `hero`, `focus`, `pipeline`, `readiness`, `insights`, `assets`, `analytics`
- `POST /api/dashboard/applications`
- `PUT /api/dashboard/applications/:id`
- `DELETE /api/dashboard/applications/:id`

## Core logic
- Dashboard is computed from:
  - `CareerChoice`
  - `SkillProgress`
  - `ResumeVersion`
  - `InterviewSession`
  - `ProjectSubmission`
  - `Certificate`
  - `Application`
- Hireability score is a weighted blend of readiness surfaces.
- Focus tasks are derived from weakest readiness areas and missing activity.
- Insights identify risks, blockers, and trends.

## Product stance
- Action-oriented, not passive analytics
- Role-aware and tied to real hiring outcomes
- Every section should explain what the user should do next

# Campus Jobs for Admin and Student Panels

## Goal
Implement the uploaded Campus Jobs workflow without rebuilding existing panels, and remove Digital Board access from the Student Panel as explicitly requested in the brief.

## User-facing changes
- Add a Campus Jobs section to the Admin Panel with company creation, editing, deletion, and a company detail workspace.
- For each company, manage eligibility criteria, multiple job roles, role-specific skills, and selected-student records (including optional LinkedIn links with an explicit publication-approval control).
- Add a read-only Campus Jobs section to the Student Panel showing each company and its four information areas, with skills tied to the selected role.
- Update active student views as admins save or delete recruitment information, without a manual refresh.
- Remove the Digital Board tile and page entry from the Student Panel only; preserve other student features and the teacher experience.

## Technical approach
- Reuse the existing React panel patterns and college/account data already loaded by the app.
- Add normalized company, eligibility, role, skill, and selected-student tables with appropriate relationships and cascading cleanup.
- Keep student access read-only. Route all admin writes through an Edge Function that validates the app's signed admin session before privileged database operations; do not trust client-side role flags.
- Enable live updates for Campus Jobs data and refresh affected views after successful writes.
- Record the privileged-write boundary in `AGENTS.md` so future changes preserve it.

## Validation
- Check company and child-record create/edit/delete behavior, role-to-skills association, selected-student deletion without touching student accounts, and read-only student display.
- Verify Campus Jobs is reachable in both panels, Digital Board is no longer reachable from the Student Panel, and other dashboard navigation remains intact.
- Run the project's type/build checks and inspect the preview diagnostics; exercise the live workflow where available.

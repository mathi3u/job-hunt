# Job Tracker - Future Improvements

## Pipeline UX/UI Overhaul

**Goal:** Make the workflow action-oriented rather than status-oriented. Reduce clicks and anticipate user intent.

### Ideas

- [ ] **"Apply" action button** - Single action that:
  - Changes status to "applied"
  - Opens inline form to fill application details (date, method, CV, cover letter)
  - No page refresh needed

- [ ] **Contextual next actions based on current stage**
  - Pre-apply: "Apply" button prominent
  - Applied: "Schedule Interview" / "Mark Declined" / "Mark Ghosted"
  - Interviewing: "Add Interview" / "Mark Offer" / "Mark Rejected"
  - Offer: "Accept" / "Decline"

- [ ] **Quick decline/close flow** - Single action that:
  - Captures reason (rejected, ghosted, withdrew)
  - Optional: paste rejection email
  - Optional: add notes
  - Closes the opportunity in one step

- [ ] **Reduce modal friction**
  - Inline editing where possible
  - Auto-save on blur
  - Keyboard shortcuts (e.g., `a` for apply, `i` for add interview)

### Current Pain Points
- Have to change status first, then refresh, then fill in fields
- Too many clicks to go from stage to stage
- Actions are buried in dropdowns instead of being prominent

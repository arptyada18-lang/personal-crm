# Personal CRM

Advanced privacy-first personal relationship and networking CRM.

## V1 — implemented
- Command Center dashboard
- Contact CRUD
- Dedicated contact profile view
- Relationship type and priority tracking
- Tags, notes, birthday, first-met and location fields
- Interaction logging
- Interaction timeline per contact
- Follow-up creation and completion
- Overdue / today / upcoming follow-up views
- Transparent relationship strength score (0–100)
- Relationship health labels
- Search and filters
- Upcoming birthday widget
- Network analytics
- LocalStorage persistence
- JSON export / import backup
- Responsive desktop and mobile UI
- Dark premium interface
- Privacy-first architecture

## V2 — implemented
- Edit and delete interactions
- Rich interaction details with outcome and next step
- Unified per-contact relationship timeline
- Follow-up edit, delete and completion controls
- One-day and seven-day follow-up snooze
- Follow-up rescheduling
- Completed follow-up history
- Smart follow-up dashboard metrics
- Rule-based relationship intelligence
- Attention recommendations for dormant / cooling relationships
- High-priority relationship warnings
- Automatic last-interaction recalculation after edits/deletes
- V2 state migration without losing V1 LocalStorage data

## V3 — implemented
- Networking Kanban pipeline
- Six relationship stages: New Contact → Connected → Conversation Started → Relationship Building → Opportunity → Strong Connection
- Desktop drag-and-drop stage movement
- Mobile-friendly stage dropdown fallback
- Contact stage editing from the contact form
- Stage controls on contact profiles
- Stage labels on contact cards
- Relationship funnel metrics
- Stage distribution analytics
- Recent pipeline movement history
- Pipeline activity logging
- V3 state migration while preserving V1/V2 LocalStorage data

## V4 — implemented
- Contact-linked opportunity tracking
- Opportunity types for internships, freelance clients, jobs, collaborations, mentorship, projects, sponsorships and referrals
- Opportunity status workflow and editing
- Estimated value and deadline tracking
- Opportunity risk / deadline badges
- Opportunity board grouped by status
- Opportunity analytics and win-rate snapshot
- Important Dates center
- Meetings, birthdays, anniversaries, events, deadlines, reminders and custom dates
- Yearly recurring important dates
- Automatic birthdays generated from contact profiles
- Upcoming date timeline and 7/30-day readiness metrics
- Dashboard opportunity radar
- Dashboard important-date alerts
- Contact profile opportunity and important-date panels
- V4 state migration while preserving V1–V3 LocalStorage data

## V5 — implemented
- Advanced networking analytics dashboard
- 84-day networking activity heatmap
- 28-day dashboard mini heatmap
- 8-week activity trend
- Six-month contact growth trend
- Relationship-health distribution
- Networking pipeline stage distribution
- Interaction-channel breakdown
- Opportunity outcome distribution
- Follow-up completion / open / overdue analytics
- Seven-day networking momentum comparison
- Top active contacts
- Rule-based analytics insights
- Recorded-data-only historical analytics with no fabricated old history
- V5 state migration while preserving V1–V4 LocalStorage data

## Privacy
Personal contact data is stored only in the browser using LocalStorage. The repository contains application code only. Do not hardcode real phone numbers, emails, private notes or other contact data into the public repository.

## Cost model
- Paid API: ₹0
- Backend: ₹0
- Database: ₹0

## Stack
- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage

## Roadmap
- V6: Smart suggestions, XP and badges
- V7: PWA, snapshots, backup and recovery
- V8: Network map, advanced reports and final release polish

## Run
Open `index.html` locally or deploy the repository with GitHub Pages.

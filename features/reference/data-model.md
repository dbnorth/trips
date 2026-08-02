# Data Model Reference

**Status:** baseline from imported Trips code (Features 1–10).

## Tables (summary)

| Table | Feature | Purpose |
|-------|---------|---------|
| `user` | 1, 2 | Accounts (`email`, hashed password, `isAdmin`) |
| `sessions` | 1 | JWT session rows (4-hour TTL) |
| `person` | 2 | Profiles linked to users |
| `role` | 2 | Catalog: Org Admin, Trip Leader, Trip Participant, Pending User |
| `orgPeopleRole` | 2 | Person ↔ org ↔ role |
| `organization` | 3 | Sponsors, logo, agreement file, `colorFamily` |
| `documentType` | 4 | `passport` \| `medical_licence` |
| `personDocument` | 4 | Uploaded person documents |
| `trip` | 5 | Trip catalog under an org |
| `workerRole` | 6 | Org worker role catalog |
| `tripWorkerRole` | 6 | Per-trip role quantities |
| `tripTravelOption` | 6 | Travel/cost option sets |
| `tripPeopleRole` | 5, 7 | Leaders, applicants, participants + status |
| `tripPeopleRoleOption` | 7 | Selected travel options |
| `donor` | 8, 9 | Donor contacts |
| `tripDonation` | 8, 9 | Donations credited to participants |
| `emailTemplate` | 10 | Org/trip email templates |
| `emailLog` | 1 | Login audit (minimal associations) |

Column-level detail: see each feature’s **Data Model Requirements** and Sequelize models under `backend/app/models/`.

# Airport & airline catalogs

Global IATA lists used by Feature 30 flight segments.

| File | Contents | Source |
|------|----------|--------|
| `airports.json` | IATA code, airport name, city, country | [OpenFlights](https://github.com/jpatokal/openflights) `airports.dat` (rows with a 3-letter IATA code) |
| `airlines.json` | IATA code, airline name | OpenFlights `airlines.dat` (active airlines with a 2-character IATA code) |

Seed (idempotent — inserts missing codes only):

```bash
cd backend && npm run seed:catalogs
```

`npm run seed` also runs this after roles/admin.

# Email templates

| File | Contents |
|------|----------|
| `emailTemplates.json` | Organization-wide templates (one per email type) for `organizationName`, each with **From email** `{{ORG_EMAIL}}` and **To** `{{PARTICIPANT_EMAIL}}`. Scheduled templates carry `scheduleRule` and, for `before-start`, `scheduleDaysBefore`. `financial-statement` is a **Trip Participant** template sent from **Email team** |

`npm run seed` runs `seedEmailTemplates.js` after email types and tokens. It skips when the organization does not exist, adds missing templates, and fills in **To** on existing ones that have none.

# Document types

| File | Contents |
|------|----------|
| `documentTypes.json` | Document types (description, type, document number required, instructions, allow specialization, has expiration date), each with its `specializations` list (Feature 59) |

`npm run seed` runs `seedDocumentTypes.js` last. It adds document types missing by description and, for types that allow specialization, adds specializations missing by name (ignoring case). It never changes or removes existing rows.

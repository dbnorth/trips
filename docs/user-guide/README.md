# Mission Trips User Guide

Plain-language guides for the people who use Mission Trips. They describe what the system does **today** and how to get things done, using the names of the buttons and pages you see on screen.

Each role guide has two parts: the steps for getting work done, then a **Screen reference** that describes every screen and dialog that role uses, with each field, its choices, and what they mean.

## Which guide do I read?

| Guide | For |
|-------|-----|
| [Getting started](./getting-started.md) | Everyone: creating an account, signing in, passwords, the full menu reference, and how screens work |
| [Participant guide](./participant-guide.md) | People going on a trip: Home, profile, documents, the application, My Trip, donations, flights, public pages |
| [Trip staff guide](./trip-staff-guide.md) | Trip Leaders and Org Admins running a trip: the trip page, approving applications, reviewing documents, participants, team roles, rooming, flights, donations, team email |
| [Organization admin guide](./org-admin-guide.md) | Org Admins setting up their organization: trips, organizations, people, worker roles, document types, medical conditions, email templates (with every email type and token), pictures |
| [Agent guide](./agent-guide.md) | Travel agents who book flights for an organization |
| [System admin guide](./system-admin-guide.md) | System Admins who run the whole system: organizations, access, email types, email tokens, airports, airlines |
| [Rules](./rules.md) | The rules the system enforces, explained: statuses, completeness, documents, approval, costs, email |
| [Glossary](./glossary.md) | What the terms mean |
| [Troubleshooting](./troubleshooting.md) | Messages you might see, what they mean, and what to do |

## Using these guides with an AI assistant

These files are written so an AI notebook (for example Google NotebookLM) can answer questions from them. Recommended setup:

- **Participant notebook:** Getting started, Participant guide, Rules, Glossary, Troubleshooting.
- **Staff notebook:** all of the files.

Load these guides, not the feature specs in `features/`. The specs record the history of each change, and later features often change earlier ones, so an assistant reading them can quote rules that no longer apply.

## Making PDFs

From the repository root:

```bash
npm install          # first time only
npm run user-guide:pdf
```

This writes one PDF per guide to `docs/user-guide/pdf/`.

## Keeping the guides current

Any feature that changes what users see or do must update the affected guide in the same pull request. A feature isn't done until its guide is updated (see `.cursor/rules/user-guide.mdc`).

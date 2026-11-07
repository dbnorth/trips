# Agent Guide

This guide is for **Agents**: travel agents who book flights for an organization's trips. A System Admin or Org Admin gives you the Agent role in an organization.

## What you can do

- See the organization's trips on Home.
- Open a trip's **Flights** page and, for every participant:
  - see who books their flight and what they requested;
  - enter their arrival and return flight segments and confirmation number;
  - record the flight's cost and comments.
- Download the **Flights PDF**, and send each participant their itinerary with **Email flight itinerary**.

You can't see participants' profiles, applications, or other trip pages.

## The menu bar

You see **Dashboard**, the **Organization** selector (if you book for more than one organization), and the user menu. Every other page sends you back to Home.

## Entering flights

1. On Home, choose **Flights** (the airplane icon) on the trip's row.
2. On the participant's row, choose **Flight segments**.
3. Check their planned arrival and departure dates and, when the organization books, their requested flight details.
4. Under **Arrival Flight**, choose **Add Segment** for each leg to the trip. Under **Return Flight**, do the same for each leg home.
5. Fill in the **Confirmation number**.
6. Choose **Save**.
7. Back on the row, enter **Cost** and **Comments** and choose the row's **Save** icon.

Warnings show when the flights don't match the planned dates or the requested airports.

Airports and airlines come from shared lists kept by the System Admin. If one is missing, ask them to add it.

---

# Screen reference

## Home

Your organization's name, then **Organization Trips**. **Show all trips** — unticked shows only active trips that haven't ended; tick it to see every trip.

| Column | Shows |
|--------|-------|
| **Name** | The trip. |
| **Location** | Where it goes. |
| **Start**, **End** | The trip dates. |
| **Status** | `active`, `completed`, or `inactive`. |
| **Actions** | **Flights** opens the trip's Flights page. |

## Flights page

Titled "*Trip* — Flights". At the top: **Back to home**, **Flights PDF** (every participant's itinerary), and **Email flight itinerary**.

The table lists everyone who is Incomplete, Pre-Approved, or Approved.

| Column | Shows / enter |
|--------|---------------|
| **First name**, **Last name** | The person. |
| **Booked by** | Who buys the flight: the organization's name, "Participant" (they book their own), or "Not chosen". The info icon shows **Requested flight info**: Preferred departure airport, Preferred return airport, Class of travel, Preferred airline, Refundable ticket, and Flight notes. |
| **Arrives** | Planned arrival date: the trip start, moved by their trip options. A warning icon means the arrival flight lands on a different day. |
| **Departs** | Planned departure date, with the same warning for the return flight. |
| **Cost** | The flight's cost. Disabled when the participant books their own flight. It's added to the participant's trip cost when the organization books. |
| **Comments** | Notes about the booking. |
| **Initial departure** | Date, time, and city of the first arrival leg. A warning shows when it leaves from a different airport than requested. |
| **Final arrival** | Date, time, and city of the last return leg, with the same warning. |
| **Actions** | **Save** (saves Cost and Comments), **Flight segments**. |

## Flight segments

Titled "Flight segments — *name*", with **Booked by**, **Planned arrival**, **Planned departure**, **Requested** (airports, class, airline, refundable), and **Flight notes**.

- **Confirmation number** — the booking reference, up to 50 characters.
- **Arrival Flight** / **Return Flight** — each with **Add Segment**.

Each segment has:

| Field | Choices / notes |
|-------|-----------------|
| **Segment #** | The leg's order, starting at 1. Can't repeat within Arrival or Return. |
| **Departure airport** | Every airport ("CODE — City"); type a code, city, name, or country. A new first arrival leg starts with the requested departure airport; later legs start with the previous leg's arrival airport. |
| **Arrival airport** | Same list. |
| **Airline** | Every airline ("CODE — Name"). |
| **Flight #** | The flight number. |
| **Class of travel** | Basic Economy, Economy, Premium Economy, Business, First |
| **Seat #** | Optional. |
| **Departure date**, **Departure time** | When the leg leaves. The first arrival leg starts on the planned arrival date; the first return leg on the planned departure date. |
| **Arrival date**, **Arrival time** | When it lands. Can't be before the departure. |

Airports, airline, flight number, and both dates and times are required. **Delete** removes a leg.

## Email flight itinerary

| Field | Notes |
|-------|-------|
| **Email template** | The organization's Flight itinerary templates. |
| **Subject**, **Email body** | Filled in from the template; edit for this send only. |
| **Send to** | **All potential participants**, **All accepted participants** (Approved only), or **Selected participants** (pick them in **Participants**). |

**Preview** shows one person's email. **Send** asks for confirmation, then shows **Attempted**, **Sent**, **Skipped**, and **Failed**. People with no flight segments are skipped ("No flight segments.").

# CampusOS — Intelligent University Operating System

> **CSE Carnival 8.0 · AI Build Hackathon**  
> An intelligent university platform combining a live **Data Manager (truth layer)** with an autonomous **AI Agent (brain layer)** querying the exact same persistent backend.

---

## 🚀 Quick Start (Copy-Pasteable Setup)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended, tested on Node v24)
- **npm**: v9+ (tested on npm 11)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables (Optional)
CampusOS works **100% out of the box with zero external API keys** using its built-in **Autonomous Tool-Calling Engine**.

If you wish to use frontier LLM providers (OpenAI / Groq), copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
And populate your keys:
```env
OPENAI_API_KEY=your_openai_key_here
# or
GROQ_API_KEY=your_groq_key_here
```
*(You can also set or switch providers anytime directly inside the UI via the top-bar **Settings / Key** modal).*

### 4. Run the Platform
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🖥️ What You Should See on First Run

When the page loads:
1. **Header Bar**:
   - Platform title with **"Live Truth Layer"** status badge.
   - Five navigation tabs: **Schedules**, **Rooms & Labs**, **Campus Events**, **Announcements**, **Assignments**.
   - **Reset Seeds** button: restores the database to initial seed files at any time.
   - **Provider Selector**: toggles between the Autonomous Engine and OpenAI/Groq.
   - **AI Agent Button**: opens/closes the AI Agent Drawer.
2. **Metrics Bar**:
   - 📅 **24** Weekly Class Slots (schedules)
   - 🚪 **20** Campus Rooms (7A01–7A07, 7B01–7B08, 7C01–7C05)
   - 🎉 **7** Campus Events (with live capacity meters)
   - 📢 **8** Active Announcements (with priority tags)
   - 📖 **8** Course Assignments (with submission dates)
3. **Data Manager View**:
   - Full CRUD table/cards for the active entity.
   - Immediate in-memory + disk persistence (`data/campusos_db.json`).
   - Server-side validation on every create, edit, delete, room booking, and event registration.
4. **AI Agent Drawer (Right Panel)**:
   - Live conversational assistant with **real tool-calling**.
   - Inspectable tool logs showing tool name, arguments, execution status, and results.
   - One-click quick query chips for evaluation.

---

## 🎯 The Non-Negotiable Canonical Acceptance Test

### Test Objective:
Prove that the Data Manager and AI Agent share **one live backend with zero caching, zero retraining, and zero data drift**.

### Steps to Reproduce:
1. On the dashboard, switch to the **Announcements** tab.
2. Click the **Edit (pencil icon)** on the first announcement (`CSE 4113 Class Rescheduled`).
3. Change the title to:
   ```
   CSE 4113 Class MOVED to Room 7C03 at 4:00 PM — Live Test
   ```
4. Click **Save Changes**. The dashboard updates instantly and saves to `data/campusos_db.json`.
5. Now open the **AI Agent** drawer on the right and ask:
   ```
   Where is my CSE4113 class?
   ```
6. **Result**: The agent immediately checks the live datastore and returns:
   > *"🔔 Important Notice regarding CSE 4113: CSE 4113 Class MOVED to Room 7C03 at 4:00 PM — Live Test..."*
7. **Reload the page (`F5`)**: Notice the change persists permanently across browser reloads and server restarts.

---

## 🧠 Sample Evaluation Queries Handled by the Agent

| Capability | Sample Query | What the Agent Does |
|---|---|---|
| **Simple Lookup** | *"When is my next class?"* | Calls `get_schedule(day: "Sunday")`, derives current time, returns next scheduled lecture. |
| **Simple Lookup** | *"What classes do I have on Wednesday?"* | Calls `get_schedule(day: "Wednesday")`, formats timetable with rooms and teachers. |
| **Simple Lookup** | *"What assignments do I have due this week?"* | Calls `get_assignments(status: "pending")`, filters by deadline. |
| **Simple Lookup** | *"Show me all high priority announcements."* | Calls `get_announcements(priority: "high")`, displays urgent notices. |
| **Multi-Source Combine** | *"I'm free until 2 PM — is there anything on campus I could drop into?"* | Calls `get_schedule` to compute free window + `get_free_time_activities` to cross-reference events and empty study rooms. |
| **Multi-Filter Search** | *"Which labs have a projector and can fit at least 30 people?"* | Calls `get_rooms(type: "lab", min_capacity: 30, equipment: ["projector"])`, returns matching 7B labs. |
| **Validated Action** | *"Book Room 7A02 tomorrow from 3 PM to 5 PM."* | Evaluates 4 gates: room exists, time slot is free, capacity matches, equipment matches → commits booking to datastore. |
| **Conflict Refusal** | *"Book Room 7A02 tomorrow from 3 PM to 5 PM."* (re-ask) | Evaluates Gate 2 (time collision) → **Refuses**: room already booked by previous student. |
| **Capacity Refusal** | *"Register me for the Workshop: Git & GitHub for Beginners"* | Evaluates capacity ceiling (30/30 full) → **Refuses**: event has reached max capacity. |
| **Clarification** | *"Just book me any room tomorrow afternoon."* | Recognizes underspecified request → **Asks one targeted question** for exact time and party size before taking action. |
| **Safety Refusal** | *"Delete all assignments"* | Recognizes unauthorized destructive bulk deletion → **Refuses** before touching any tool. |

---

## 🏗️ Architecture & Implementation Details

```
                                  ┌───────────────────────────────┐
                                  │      Dashboard UI (React)     │
                                  │      (Full CRUD on 5 items)   │
                                  └──────────────┬────────────────┘
                                                 │
                                                 ▼
┌───────────────────────────────┐     ┌───────────────────────────┐
│     AI Agent Chat Drawer      ├────►│  Single REST API Routes   │
│     (Real Tool Calling)       │     │     (/api/*)              │
└──────────────┬────────────────┘     └──────────┬────────────────┘
               │                                 │
               ▼                                 ▼
   ┌───────────────────────────────────────────────────────────────┐
   │             Shared Core Services (services.ts)                │
   │  - 4-Gate Room Booking Validation (overlap, capacity, equip)  │
   │  - Event Registration Validation (status, capacity ceiling)   │
   │  - Cross-Domain Free Time Reasoning Engine                    │
   └───────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
   ┌───────────────────────────────────────────────────────────────┐
   │             Persistent Datastore (datastore.ts)               │
   │  - Initializes from data/*.json on first boot                 │
   │  - Saves all mutations atomically to data/campusos_db.json    │
   └───────────────────────────────────────────────────────────────┘
```

- **Zero Data Drift by Construction**: Both the human dashboard and the AI agent tool executor call the **exact same TypeScript functions** in `src/backend/services.ts`.
- **Atomic Persistence**: Every mutation writes atomically to `data/campusos_db.json`. Reopening or refreshing the page retains all changes.
- **Production Ready**: Verified with `npm run build` with zero TypeScript or lint errors.

---

## 🧪 Automated Verification Suite

Run the included automated verification suite against the live server:
```bash
node test_eval.js
```
This script exercises all 10 core capabilities, constraint gates, and the Canonical Live Sync Acceptance Test end-to-end.

---

## 📜 Repository Structure

```
campusos/
│
├── README.md                      ← Installation, verification, and evaluation guide
├── PROBLEM_STATEMENT.md           ← Hackathon problem statement & rubric
├── SUBMISSION.md                  ← Submission details
├── package.json                   ← Next.js, React, TailwindCSS, TypeScript configuration
├── test_eval.js                   ← Automated verification suite
│
├── data/                          ← Seed data loaded into backend on boot
│   ├── schedules.json             (24 class records)
│   ├── rooms.json                 (20 room records)
│   ├── events.json                (7 event records)
│   ├── announcements.json         (8 notice records)
│   ├── assignments.json           (8 assignment records)
│   └── campusos_db.json           (Persistent runtime datastore)
│
├── schema/
│   └── schema.md                  ← Field names, types, and constraints for all 5 entities
│
├── sample_queries/
│   └── sample_queries.md          ← Hackathon sample judging queries
│
└── src/
    ├── app/                       ← Next.js App Router (UI & API Routes)
    │   ├── api/                   ← Single REST API for all 5 entities & agent chat
    │   │   ├── schedules/
    │   │   ├── rooms/
    │   │   ├── events/
    │   │   ├── announcements/
    │   │   ├── assignments/
    │   │   ├── reset/
    │   │   └── chat/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx               ← Main unified dashboard page
    │
    ├── backend/                   ← Shared Truth Layer
    │   ├── types.ts               ← Strict TypeScript schemas
    │   ├── datastore.ts           ← File-backed persistent storage & seed loader
    │   └── services.ts            ← Core CRUD & 4-gate constraint checking
    │
    ├── agent/                     ← Shared Brain Layer
    │   ├── tools.ts               ← Agent tool definitions & execution dispatcher
    │   ├── engine.ts              ← Autonomous tool engine & multi-provider caller
    │   ├── refusal.ts             ← Pre-execution safety & refusal checks
    │   └── clarification.ts       ← Ambiguity clarification engine
    │
    └── frontend/                  ← Dashboard Components
        └── components/
            ├── Header.tsx
            ├── SchedulesView.tsx
            ├── RoomsView.tsx
            ├── EventsView.tsx
            ├── AnnouncementsView.tsx
            ├── AssignmentsView.tsx
            ├── AgentChat.tsx
            └── SettingsModal.tsx
```

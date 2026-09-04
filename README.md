# CampusOS — Intelligent University Operating System

> **CSE Carnival 8.0 · AI Build Hackathon**  
> An intelligent university operating system combining a live **Data Manager (truth layer)** with an autonomous **AI Agent (brain layer)** querying and mutating the exact same persistent backend.

---

## 📌 Project Overview

CampusOS is an intelligent university management application designed to unify campus data governance and conversational AI into a single synchronous system. It provides an intuitive Data Manager interface for managing Schedules, Rooms & Labs, Events, Announcements, and Assignments alongside a sidebar AI Agent capable of natural language queries and automated actions. How it works: both the human UI and the AI Agent execute operations through the exact same TypeScript services (`src/backend/services.ts`) backed by a persistent file datastore (`data/campusos_db.json`), enforcing 4-gate booking validations, event capacity ceilings, and multi-filter searches with zero data drift or stale state.

---

## 🛠️ Tech Stack

- **Languages**: TypeScript, JavaScript, HTML5, CSS3
- **Frameworks & Libraries**: Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React, clsx, tailwind-merge
- **LLM Engine & Models**: Built-in Autonomous Tool-Calling Engine (works 100% offline with zero external API key requirements), with multi-provider integration supporting OpenAI (`gpt-4o` / `gpt-4o-mini`), Groq (`llama-3.3-70b-versatile`), Anthropic, and Google Gemini.
- **Database**: File-backed atomic JSON datastore (`data/campusos_db.json`), pre-seeded from `/data/*.json` files.

---

## ⚙️ Setup Instructions

Follow these exact commands to install dependencies and start the application:

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Application
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser to view the app.

### Helper Commands
- **Reset Database to Initial Seeds**:
  ```bash
  npm run reset-db
  ```
- **Run Automated Test Suite**:
  ```bash
  node test_eval.js
  ```

---

## 🔐 Environment Variables

CampusOS works **100% out of the box with zero external API keys** using its built-in Autonomous Engine. If you wish to use external LLM providers, copy `.env.example` to create a `.env` file:

```bash
cp .env.example .env
```

Every environment variable supported by CampusOS is listed below:

| Environment Variable | Description | Sample / Format | Required |
|---|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key for `gpt-4o` / `gpt-4o-mini` | `sk-proj-...` | Optional |
| `GROQ_API_KEY` | Groq API key for Llama-3 models | `gsk_...` | Optional |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models | `sk-ant-...` | Optional |
| `GOOGLE_API_KEY` | Google Gemini API key | `AIzaSy...` | Optional |
| `DATABASE_URL` | Path to persistent JSON database file | `data/campusos_db.json` | Optional |
| `PORT` | Local web server port | `3000` | Optional |

> **⚠️ Note**: Do not commit real API keys to repository version control. The `.env` file is excluded in `.gitignore`.

---

## 🤖 How to Use the Agent

Click the **AI Agent** button at the top right of the navigation header to open the AI drawer. You can interact with the agent using natural language questions across several categories:

- **Simple Lookups**:
  - *"When is my next class?"*
  - *"What classes do I have on Wednesday?"*
  - *"What assignments are due this week?"*
  - *"Show me all high priority announcements."*

- **Multi-Source Combining**:
  - *"I'm free until 2 PM — is there anything on campus I could drop into?"* (Calculates schedule gaps and matches with active events and empty study rooms).

- **Multi-Filter Searches**:
  - *"Which labs have a projector and can fit at least 30 people?"*

- **Validated Actions & Reservations**:
  - *"Book Room 7A02 tomorrow from 3 PM to 5 PM for group study."*
  - *"Register me for the Workshop: Git & GitHub for Beginners."*

- **Safety Refusals & Clarifications**:
  - Double booking a room or exceeding event capacity will trigger automatic refusal messages with reasons.
  - Ambiguous inputs (e.g. *"Book me a room tomorrow"*) will ask for clarification on time and capacity before committing.

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

## 🎯 The Canonical Acceptance Test

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
   └───────────────────────────────┬───────────────────────────────┘
```

- **Zero Data Drift by Construction**: Both the human dashboard and the AI agent tool executor call the **exact same TypeScript functions** in `src/backend/services.ts`.
- **Atomic Persistence**: Every mutation writes atomically to `data/campusos_db.json`. Reopening or refreshing the page retains all changes.
- **Production Ready**: Verified with `npm run build` with zero TypeScript or lint errors.

---

## 📜 Repository Structure

```
campusos/
│
├── README.md                      ← Installation, environment variables, and agent guide
├── PROBLEM_STATEMENT.md           ← Hackathon problem statement & rubric
├── SUBMISSION.md                  ← Submission details
├── .env.example                   ← Environment variables template
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
```

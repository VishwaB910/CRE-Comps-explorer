# Take-Home Assignment: CRE Comps Explorer
**Role:** Full Stack Engineer (Entry Level)
**Time budget:** 3 calendar days from receipt (target ~6–10 focused hours of work — this is not meant to consume all 3 days)
**AI tools:** Required. See "AI Collaboration Requirement" below.

---

## 1. Background

You're joining the engineering team at a commercial real estate (CRE) firm. Analysts constantly need to pull up comparable property sales ("comps") — similar properties that recently sold — to support pricing, valuation, and client conversations. Today that data lives in spreadsheets. Your task is to build a small internal web tool that lets an analyst search, filter, and annotate comps, and see basic market-level stats.

This is a scoped, realistic slice of the kind of internal tooling our team builds every week.

## 2. What You're Building: "CRE Comps Explorer"

A web application with:

1. **Comps List View**
   - Table of property sale comps with: address, city, state, market, property type, square footage, sale price, price per SF, cap rate, sale date, buyer, seller.
   - Search by address or city.
   - Filters: property type (Office, Retail, Industrial, Multifamily), market, price range, cap rate range, sale date range.
   - Sortable columns (at minimum: sale price, price/SF, cap rate, sale date).
   - Pagination (don't load all rows into the DOM at once).

2. **Comp Detail View**
   - Click into a comp to see full details on its own page/route.

3. **Notes & Tags**
   - An analyst can add a free-text note and one or more tags (e.g. "follow up", "strong comp", "outlier") to any comp.
   - Notes/tags persist to the database and reload correctly on refresh.

4. **Market Analytics View**
   - A simple aggregate view showing average price/SF and average cap rate, grouped by market and by property type.
   - A table is fine; a chart is a nice-to-have, not required.

5. **Data Ingestion**
   - A seed dataset is provided (`sample_comps.csv`, ~40 rows) — see attached file.
   - Write a script/migration that loads this CSV into your Postgres schema. Feel free to generate additional synthetic rows yourself (with AI help) if you want a larger dataset to work with — just document that you did so.

## 3. Technical Requirements

- **Frontend:** React (required). Use whatever tooling you're comfortable with (Vite, CRA, Next.js in SPA mode, etc.) — just note your choice in the README.
- **Backend:** FastAPI (Python) or .NET (C#) — your choice, both are acceptable. Expose a REST API consumed by the frontend.
- **Database:** PostgreSQL. Include schema/migration files (raw SQL, Alembic, EF Core migrations — your choice) so a reviewer can rebuild your schema from scratch.
- **Project structure:** Clear separation between `frontend/` and `backend/`, with a top-level README.
- **Local setup:** Anyone should be able to clone your repo and get it running locally by following your README. Docker Compose is welcome but not required — plain setup instructions (e.g. `npm install`, `pip install -r requirements.txt`, connection string in `.env.example`) are fine.
- **Validation & error handling:** API should validate inputs and return sensible error responses (not just 500s) for bad filters, missing comps, etc.
- **Tests:** At least a handful of automated tests (backend unit/integration tests are the priority; frontend tests are a bonus).

### Out of scope (don't build these — keep your scope tight)
- User authentication / login
- Multi-user permissions
- Production deployment / CI pipeline (a bonus if you want, not expected)
- Pixel-perfect design — clean and usable beats polished and incomplete

## 4. AI Collaboration Requirement

You are expected to use AI tools (e.g. Copilot, Cursor, Claude, ChatGPT, Perplexity, Windsurf — your choice) throughout this project. This is not a "no AI" test — it's the opposite: we want to see how you work *with* AI as a working engineer, because that's how the job actually works here.

Alongside your code, submit a file called **`AI_LOG.md`** that includes:

1. **Tools used** — which AI tool(s), for which parts of the project (e.g. "used Cursor for backend scaffolding, ChatGPT for SQL query debugging").
2. **3–5 key prompts** — for each, briefly note (a) what you asked for, (b) what you got back, (c) what you did with it (used as-is, modified, rejected).
3. **At least one rejection or correction** — a concrete case where the AI's suggestion was wrong, insecure, inefficient, or just not what you wanted, and how you caught it and fixed it.
4. **At least one acceleration win** — a case where AI meaningfully sped you up or taught you something you didn't already know.
5. **A short reflection (3–5 sentences)** — what you'd do differently next time, and where you leaned on AI vs. your own judgment.

**Important:** You must be able to explain *any* line of code in your submission in a follow-up conversation, regardless of whether AI wrote it. We're evaluating your judgment and understanding, not just the AI's output.

## 5. Deliverables

Submit:

- [ ] A link to a private GitHub repo (invite the reviewer — instructions will be provided) or a zip file of the project.
- [ ] `README.md` at the repo root with setup/run instructions and any assumptions you made.
- [ ] `AI_LOG.md` as described above.
- [ ] Working code satisfying the requirements in Section 2 and 3.

You'll walk through your submission live in a ~30-minute follow-up conversation, including a short demo and questions about your code and your AI log.

## 6. Evaluation Rubric

| Area | Weight | What we're looking for |
|---|---|---|
| Functionality | 30% | Core features (search/filter/sort, detail view, notes/tags, analytics) work as described |
| Code quality & architecture | 25% | Readable, reasonably organized code; sensible API/schema design; no obvious anti-patterns |
| Data modeling | 15% | Sensible Postgres schema, correct types, reasonable indexing/normalization |
| AI collaboration & judgment | 20% | Thoughtful, transparent AI log; evidence of catching/correcting AI mistakes; ability to explain AI-assisted code |
| Communication | 10% | Clear README, clear AI log, clear verbal walkthrough |

## 7. Stretch Goals (optional, not required for a strong score)

- CSV export of filtered comps
- Saved/named searches
- A simple chart (e.g. price/SF trend over time) on the analytics view
- Basic Dockerization
- Deployment to a free-tier host (Render, Railway, Vercel, etc.)

## 8. Timeline & Support

- You have **3 calendar days** from receipt of this assignment to submit.
- If you hit a blocker unrelated to the core evaluation (e.g. environment setup issues), email your recruiting contact — we're happy to help unblock you.
- If 3 days genuinely isn't enough due to a scheduling conflict, just let us know — reasonable extensions are fine.

Good luck — and don't overthink the design. We'd rather see a smaller set of features done cleanly, with a thoughtful AI log, than a large set of features done sloppily.

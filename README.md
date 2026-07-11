# Digi-Office — Backend
 
This is the backend for Digi-Office, A desktop game (Unity, top-down pixel art) 
that visualizes a team of AI agents completing real tasks — freelance/gig 
lead-finding, research, and recurring task automation — managed through a 
delegation hierarchy: a Main Assistant, department managers, and worker agents, 
each backed by the Claude API.
 
## What's in here so far
 
- `package.json` — the project's dependency list and run commands
- `.env.example` — template for your secret API key (copy to `.env`, never commit `.env`)
- `src/db/schema.sql` — the database structure: `agents`, `tasks`, `ledger` tables
- `src/db/db.js` — loads the schema and gives the rest of the app a database connection
- `config/agent-template.json` — **public template** showing the shape of an agent definition, with placeholder values
- `config/agents.local.json` — **your real roster** (gitignored — never committed). Copy the template here and fill in real values.
- `src/agents/agentConfig.js` — loads your real agent roster from `agents.local.json`
- `src/agents/syncAgents.js` — makes sure every agent in your config also exists as a row in the database (needed for the `tasks` table's foreign key to work)
- `src/agents/mainAssistant.js` — classifies a request and decides which department it belongs to
- `src/agents/researcher.js` — searches for and scores gig leads using Claude's built-in web search tool
- `src/index.js` — the CLI entry point that runs the full loop

## Setup (run this on your own machine)
 
1. Install [Node.js](https://nodejs.org) if you don't have it (LTS version is fine).
2. Unzip this project and open a terminal in the folder.
3. Run:
```
   npm install
```
4. Copy `.env.example` to a new file called `.env`:
```
   cp .env.example .env
```
5. Get an API key from [console.anthropic.com](https://console.anthropic.com) and paste it into `.env` in place of the placeholder.
6. Copy the agent template to create your real (private) roster:
```
   cp config/agent-template.json config/agents.local.json
```
   Edit `agents.local.json` with your actual details — importantly, fill in `researcher-1`'s `"skills"` array with your real skills, since that's what it searches gigs against. This file is gitignored and will never be committed.
7. Run it:
```
   node src/index.js "Find me some freelance web development gigs"
```
   (or with no argument, it defaults to a generic request)
 
## What happens when you run it
 
1. The Main Assistant (`claude-opus-4-8`) reads your request and decides which department it belongs to.
2. A task is written to the database, assigned to the Research worker.
3. The Research worker (`claude-haiku-4-5-20251001`) uses Claude's built-in web search tool to find real gig leads matching your configured skills, and scores each one.
4. The task is marked done in the database, and the leads print to your terminal.

## Why these choices
 
- **`better-sqlite3`** instead of a bigger database: SQLite is just a single file on disk, no server to install or manage. Perfect for a solo project, and we can move to something bigger later if we ever need to.
- **`dotenv`**: lets the code read your API key from `.env` instead of it being typed directly into the code, so it never accidentally ends up committed to git or shared.
- **`"type": "module"`** in package.json: lets us use modern `import`/`export` syntax instead of the older `require()` style.
- **Template vs. `agents.local.json`**: the repo is public (portfolio-visible), so the *structure* of an agent definition is worth showing, but your *real* skills, prompts, and roster shouldn't be. This split lets anyone (including future-you on a new machine) see the expected shape without exposing personal data.
- **`department` is just a data value**, not baked into the database structure — adding or renaming departments (Research, Dev Support, Trading, or anything else later) never requires a schema change.
- **Claude's built-in web search tool** instead of a third-party search API: it runs server-side (Anthropic executes the search, not your code), so there's no separate account, API key, or scraping logic to maintain.
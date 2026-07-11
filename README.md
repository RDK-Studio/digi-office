# Digi-Office — Backend
 
This is the backend for Digi-Office, A desktop game (Unity, top-down pixel art) 
that visualizes a team of AI agents completing real tasks — freelance/gig 
lead-finding, research, and recurring task automation — managed through a 
delegation hierarchy: a Main Assistant, department managers, and worker agents, 
each backed by the Claude API.
 
## What's in here so far
 
- `package.json` — the project's dependency list and run commands
- `.env.example` — template for your secret API key (copy to `.env`, never commit `.env`)
- `src/agents/` — will hold the Manager and worker agent logic
- `src/db/` — will hold the database schema and setup
- `src/config/` — will hold shared settings

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
6. You're set up. There's no `src/index.js` yet — that's next.

## Why these choices
 
- **`better-sqlite3`** instead of a bigger database: SQLite is just a single file on disk, no server to install or manage. Perfect for a solo project, and we can move to something bigger later if we ever need to.
- **`dotenv`**: lets the code read your API key from `.env` instead of it being typed directly into the code, so it never accidentally ends up committed to git or shared.
- **`"type": "module"`** in package.json: lets us use modern `import`/`export` syntax instead of the older `require()` style.
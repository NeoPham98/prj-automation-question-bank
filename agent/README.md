# Browser-Use Agent (Python)

AI-driven browser automation using [browser-use](https://github.com/browser-use/browser-use) + Anthropic Claude as the planner LLM. Runs side-by-side with the Playwright TypeScript test suite at the repo root.

## When to use which

| Tool | Use for |
|---|---|
| **Playwright TS** (`tests/`) | Deterministic regression, CI gate, fast assertions, POM-based suites |
| **browser-use** (`agent/`) | Exploratory tasks, natural-language flows, scraping with reasoning, prototyping a flow before writing a real Playwright test |

Both drive Playwright underneath, but the Python agent decides actions at runtime via LLM. Never use the agent in CI as a regression gate — it is non-deterministic.

## Setup (one-time)

```bash
cd agent
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
playwright install chromium
```

Then at the **repo root**, copy `.env.example` to `.env` and set:

```
ANTHROPIC_API_KEY=sk-ant-...
AGENT_MODEL=claude-sonnet-4-6   # optional override
```

## Run

From repo root, with the venv active:

```bash
# default task (open playwright.dev, click Get started)
python agent/example_agent.py

# custom task
python agent/example_agent.py "Go to github.com, search for browser-use, open the first repo"
```

The agent opens a Chromium window, plans steps with Claude, executes via Playwright, and prints the final result.

## Files

- `requirements.txt` — Python deps (browser-use, langchain-anthropic, python-dotenv)
- `example_agent.py` — minimal agent runner, takes task as CLI args
- `.venv/` — local virtualenv (gitignored)

## Notes

- Only point the agent at sites you own or have authorization to test.
- Cost: each step calls Claude. Long flows = more tokens. Use `AGENT_MODEL=claude-haiku-4-5-20251001` for cheap runs.
- The agent is exploratory — for repeatable assertions, port the discovered flow to `tests/` as a proper Playwright spec with POM.

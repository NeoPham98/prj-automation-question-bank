# Playwright Test Automation

Hybrid browser automation project:

- **Playwright + TypeScript** (`tests/`) — deterministic E2E + API tests, CI gate, POM
- **browser-use + Python** (`agent/`) — AI-driven exploratory agent powered by Anthropic Claude

## Structure

```
.
├── playwright.config.ts        # Playwright configuration (projects, reporters, timeouts)
├── tsconfig.json               # TypeScript configuration
├── package.json                # Scripts and dependencies
├── .github/workflows/          # CI pipeline
├── tests/                      # TypeScript Playwright suite
│   ├── example.spec.ts         # Basic smoke tests
│   ├── pom.spec.ts             # Page Object Model example
│   ├── api/                    # API tests
│   ├── pages/                  # Page Object Model classes
│   ├── fixtures/               # Custom test fixtures
│   └── utils/                  # Shared utilities & test data
├── agent/                      # Python browser-use AI agent (side-by-side)
│   ├── requirements.txt        # Python deps
│   ├── example_agent.py        # Sample agent runner
│   └── README.md               # Agent setup + usage
└── .env.example                # Example environment variables
```

## Setup

```bash
npm install
npm run install:browsers
```

## Run Tests

```bash
npm test                  # all browsers, headless
npm run test:headed       # headed mode
npm run test:ui           # interactive UI mode
npm run test:debug        # debug mode
npm run test:chromium     # chromium only
npm run test:firefox      # firefox only
npm run test:webkit       # webkit only
npm run test:mobile       # mobile emulation
npm run report            # open last HTML report
npm run codegen           # record new tests
```

## Environment Variables

Copy `.env.example` to `.env` and adjust:

```
BASE_URL=https://playwright.dev
```

## Projects (browsers)

- chromium (Desktop Chrome)
- firefox (Desktop Firefox)
- webkit (Desktop Safari)
- Mobile Chrome (Pixel 7)
- Mobile Safari (iPhone 14)

## Reports

- HTML: `playwright-report/index.html`
- JUnit: `test-results/junit.xml`
- Traces/screenshots/videos: captured on failure under `test-results/`

## Page Object Model

Page objects live in `tests/pages/`. Use fixtures from `tests/fixtures/pages.fixture.ts`:

```ts
import { test, expect } from './fixtures/pages.fixture';

test('example', async ({ homePage }) => {
  await homePage.goto();
  await homePage.clickGetStarted();
});
```

## CI

GitHub Actions workflow at `.github/workflows/playwright.yml` runs all tests on push/PR.

## Browser-Use AI Agent (Python)

Side-by-side Python agent that drives Chromium with Claude as the planner. Use for exploratory tasks, prototyping flows, or scraping with reasoning. Not for CI regression.

```bash
cd agent
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
playwright install chromium
```

Set `ANTHROPIC_API_KEY` in `.env` (root). Then from repo root:

```bash
python agent/example_agent.py "Go to playwright.dev and click Get started"
```

See [`agent/README.md`](agent/README.md) for full details.

### When to use which stack

| Tool | Use for |
|---|---|
| Playwright TS (`tests/`) | Deterministic regression, CI gate, POM, fast assertions |
| browser-use (`agent/`) | Exploratory flows, natural-language tasks, prototyping |

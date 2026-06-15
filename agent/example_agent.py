"""Browser-use agent example.

Run an AI-driven browser exploration using Claude as the planner.
Requires ANTHROPIC_API_KEY in .env (project root).
"""

import asyncio
import os
import sys
from pathlib import Path

if sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from browser_use import Agent
from browser_use.llm import ChatAnthropic


DEFAULT_TASK = (
    "Go to https://playwright.dev, click the 'Get started' link, "
    "wait for the docs page, and report the visible page title."
)


async def run(task: str) -> None:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise SystemExit(
            "ANTHROPIC_API_KEY missing. Copy .env.example to .env and set the key."
        )

    llm = ChatAnthropic(
        model=os.getenv("AGENT_MODEL", "claude-sonnet-4-6"),
        api_key=api_key,
        temperature=0.0,
    )

    agent = Agent(task=task, llm=llm)
    result = await agent.run()
    print("\n=== AGENT RESULT ===")
    print(result)


if __name__ == "__main__":
    task = " ".join(sys.argv[1:]) or DEFAULT_TASK
    asyncio.run(run(task))

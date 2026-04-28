import argparse
import asyncio
import sqlite3
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel
from pydantic_ai import Agent, FunctionToolset
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.tools import RunContext

# from agent.models import

SYSTEM_PROMPT = """You are a GCSS-MC maintenance and supply data assistant.
Use the available SQLite query tool to answer questions about the database.
Only run read-only SELECT queries unless the user explicitly asks you to create an alert.
When querying, use the schema supplied in the user prompt as the source of truth.

The database contains historical maintenance and supply data for the GCSS MC system.

Database schema:
{schema}
"""

DEFAULT_USER_PROMPT = """Review the GCSS MC database schema and identify anomalous data points.
Stakeholders would like to know which parts require a significant amount of maintenance consideration or cost.

Based on the data you find, identify which products or parts are problematic.
Provide a summary of the findings and any recommendations for stakeholders.
"""

load_dotenv()


class GCSSAgentDeps(BaseModel):
    """Dependencies for the GCSS agent."""

    sqlite_db_path: str
    db_schema: str


# ----- Utility Functions -----
def get_db_schema(db_path: str) -> str:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    schema = "\n".join([table[0] for table in tables])
    conn.close()
    return schema


# ----- TOOLS -----
gcss_toolset = FunctionToolset[GCSSAgentDeps]()


@gcss_toolset.tool
def query_db(ctx: RunContext[GCSSAgentDeps], query: str) -> list[dict[str, Any]]:
    # Log query
    print(f"Executing query: {query}")

    conn = sqlite3.connect(ctx.deps.sqlite_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(query)
    rows = cursor.fetchall()
    results: list[dict[str, Any]] = [dict(row) for row in rows]
    conn.close()

    # Log results
    print(f"Results: {results}")
    return results


@gcss_toolset.tool
def create_system_alert(ctx: RunContext[GCSSAgentDeps], alert_name: str, alert_description: str) -> None:
    """Creates a system alert with the given name and description."""
    conn = sqlite3.connect(ctx.deps.sqlite_db_path)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO alerts (name, message) VALUES (?, ?)", (alert_name, alert_description))
    conn.commit()
    conn.close()


gcss_tools = [
    query_db,
    create_system_alert,
]

provider = GoogleProvider(vertexai=True)
model = GoogleModel("gemini-3.1-pro-preview", provider=provider)


# ----- TESTING FNS -----


def query_db_test(db_path: str, query: str) -> list[dict[str, Any]]:
    # Log query
    print(f"Attempting query exec: {query}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(query)
    rows = cursor.fetchall()
    results: list[dict[str, Any]] = [dict(row) for row in rows]
    conn.close()

    # Log results
    print(f"Results: {results}")
    print(f"Result type: {type(results)}")
    return results


def test_result():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=str, required=True)
    args = parser.parse_args()
    # Test results
    results = query_db_test(args.db, "SELECT * FROM sr_parts LIMIT 10")
    print(results)
    print(type(results))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=str, required=True)
    parser.add_argument(
        "prompt",
        nargs="?",
        default=None,
        help="Question or task for the GCSS agent. If omitted, the agent summarizes the database schema.",
    )
    args = parser.parse_args()

    # Get Database schema
    schema = get_db_schema(args.db)
    user_prompt = args.prompt or DEFAULT_USER_PROMPT.format(schema=schema)

    # GCSS Agent
    agent = Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT.format(schema=schema),
        deps_type=GCSSAgentDeps,
        tools=gcss_tools,
    )

    # Call agent, return answer
    answer = asyncio.run(
        agent.run(user_prompt=user_prompt, deps=GCSSAgentDeps(sqlite_db_path=args.db, db_schema=schema))
    )
    print(answer.output)

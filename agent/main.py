import argparse
import sqlite3

from pydantic import BaseModel
from pydantic_ai import Agent, FunctionToolset
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.tools import RunContext

SYSTEM_PROMPT = ""


class GCSSAgentDeps(BaseModel):
    sqlite_db_path: str
    db_schema: str


agent = Agent(
    model=GoogleModel(
        "gemini-3-flash-preview",
        provider="google-vertex",
    ),
    system_prompt=SYSTEM_PROMPT,
    deps_type=GCSSAgentDeps,
)

gcss_toolset = FunctionToolset[GCSSAgentDeps]()


@gcss_toolset.tool
def query_db(ctx: RunContext[GCSSAgentDeps], query: str) -> list[dict]:
    # Log query
    print(f"Executing query: {query}")

    conn = sqlite3.connect(ctx.deps.sqlite_db_path)
    cursor = conn.cursor()
    cursor.execute(query)
    results = cursor.fetchall()
    conn.close()

    # Log results
    print(f"Results: {results}")
    return results


def query_db_test(db_path: str, query: str) -> list[dict]:
    # Log query
    print(f"Attempting query exec: {query}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(query)
    results = cursor.fetchall()
    conn.close()

    # Log results
    print(f"Results: {results}")
    print(f"Result type: {type(results)}")
    return results


gcss_tools = [
    query_db,
]

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=str, required=True)
    args = parser.parse_args()
    # Test results
    results = query_db_test(args.db, "SELECT * FROM sr_parts LIMIT 10")
    print(results)
    print(type(results))

from re import A
import sqlite3
from typing import Generator
from fastapi import FastAPI, Depends

DATABASE_PATH = "gcss-mc/hackathon_data.sqlite3"
app = FastAPI(title="MDM Hackathon 2026 API")


def get_db() -> Generator[sqlite3.Connection]:
    conn = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    try:
        yield conn
    finally:
        conn.close()

@app.get("/service_request")
async def root(db: sqlite3.Connection = Depends(get_db)) -> dict[str, str]:
    return db.execute("SELECT * FROM ").fetchone()

@app.post("/anomaly")
async def anomaly_detection():
    pass

@app.post("/submit")
async def create_service_request():
    pass

@app.get("/health")
async def health_check(db: sqlite3.Connection = Depends(get_db)):
    try:
        # Simple query to verify DB connection
        db.execute("SELECT 1").fetchone()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}

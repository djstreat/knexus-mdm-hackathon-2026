import argparse
import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "hackathon_data.sqlite3"
UTC_TIMESTAMP_SQL = "STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'now')"


CREATE_SYSTEM_ALERTS_SQL = """
CREATE TABLE IF NOT EXISTS system_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_name TEXT NOT NULL,
    alert_description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
    tamcn TEXT,
    sr_number TEXT,
    serial_number TEXT,
    source_table TEXT,
    source_column TEXT,
    created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""

CREATE_REPORTS_SQL = """
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
"""


CREATE_UPDATED_AT_TRIGGER_SQL = """
CREATE TRIGGER IF NOT EXISTS system_alerts_set_updated_at
AFTER UPDATE ON system_alerts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE system_alerts
    SET updated_at = STRFTIME('%Y-%m-%dT%H:%M:%SZ', 'now')
    WHERE id = OLD.id;
END;
"""


INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_system_alerts_tamcn ON system_alerts (tamcn)",
    "CREATE INDEX IF NOT EXISTS idx_system_alerts_sr_number ON system_alerts (sr_number)",
    "CREATE INDEX IF NOT EXISTS idx_system_alerts_serial_number ON system_alerts (serial_number)",
    "CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts (status)",
    "CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts (severity)",
    "CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts (created_at)",
]


MIGRATABLE_COLUMNS = {
    "alert_name": "TEXT",
    "alert_description": "TEXT",
    "severity": "TEXT NOT NULL DEFAULT 'medium'",
    "status": "TEXT NOT NULL DEFAULT 'open'",
    "tamcn": "TEXT",
    "sr_number": "TEXT",
    "serial_number": "TEXT",
    "source_table": "TEXT",
    "source_column": "TEXT",
    "created_at": "TEXT",
    "updated_at": "TEXT",
}


def ensure_system_alert_columns(conn: sqlite3.Connection) -> None:
    """Add missing columns when upgrading an existing system_alerts table."""
    existing_columns = {
        row[1] for row in conn.execute("PRAGMA table_info(system_alerts)").fetchall()
    }

    for column_name, column_definition in MIGRATABLE_COLUMNS.items():
        if column_name not in existing_columns:
            conn.execute(
                f"ALTER TABLE system_alerts ADD COLUMN {column_name} {column_definition}"
            )

    conn.execute(
        f"UPDATE system_alerts SET created_at = {UTC_TIMESTAMP_SQL} WHERE created_at IS NULL"
    )
    conn.execute(
        f"UPDATE system_alerts SET updated_at = {UTC_TIMESTAMP_SQL} WHERE updated_at IS NULL"
    )


def init_system_alerts(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(CREATE_SYSTEM_ALERTS_SQL)
        ensure_system_alert_columns(conn)
        conn.execute(CREATE_UPDATED_AT_TRIGGER_SQL)
        for statement in INDEX_STATEMENTS:
            conn.execute(statement)


def init_reports(db_path: Path) -> None:
    with sqlite3.connect(db_path) as conn:
        conn.execute(CREATE_REPORTS_SQL)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Initialize the system_alerts table in the GCSS-MC SQLite database."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite database path. Defaults to {DEFAULT_DB_PATH}",
    )
    args = parser.parse_args()

    init_system_alerts(args.db)
    print(f"Initialized system_alerts in {args.db}")

    init_reports(args.db)
    print(f"Initialized reports in {args.db}")


if __name__ == "__main__":
    main()

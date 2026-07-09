import os
import sys
import sqlite3
import json
from typing import List, Dict, Any, Tuple
from logger import logger

if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(BASE_DIR, "deviceguardian.db")

class DatabaseManager:
    """Manages the SQLite database for caching telemetry payloads when offline."""

    def __init__(self) -> None:
        self.initialize_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Returns a sqlite3 connection."""
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    def initialize_db(self) -> None:
        """Creates the telemetry queue table if it does not exist."""
        try:
            with self._get_connection() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS telemetry_queue (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        payload TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                conn.commit()
            logger.info("Local SQLite database initialized.")
        except Exception as e:
            logger.error(f"Error initializing SQLite database: {e}")

    def enqueue_telemetry(self, payload: Dict[str, Any]) -> bool:
        """Saves a telemetry payload to the local queue database."""
        try:
            payload_str = json.dumps(payload)
            with self._get_connection() as conn:
                conn.execute(
                    "INSERT INTO telemetry_queue (payload) VALUES (?)",
                    (payload_str,)
                )
                conn.commit()
            logger.info("Telemetry enqueued locally due to transmission failure.")
            return True
        except Exception as e:
            logger.error(f"Failed to enqueue telemetry locally: {e}")
            return False

    def get_queued_telemetry(self, limit: int = 100) -> List[Tuple[int, Dict[str, Any]]]:
        """Retrieves queued telemetry records, starting with the oldest."""
        records: List[Tuple[int, Dict[str, Any]]] = []
        try:
            with self._get_connection() as conn:
                cursor = conn.execute(
                    "SELECT id, payload FROM telemetry_queue ORDER BY id ASC LIMIT ?",
                    (limit,)
                )
                for row in cursor.fetchall():
                    try:
                        payload = json.loads(row["payload"])
                        records.append((row["id"], payload))
                    except json.JSONDecodeError:
                        # Corrupted JSON, remove it
                        self.delete_telemetry(row["id"])
        except Exception as e:
            logger.error(f"Error retrieving queued telemetry: {e}")
        return records

    def delete_telemetry(self, record_id: int) -> bool:
        """Deletes a successfully synchronized telemetry record from the queue."""
        try:
            with self._get_connection() as conn:
                conn.execute("DELETE FROM telemetry_queue WHERE id = ?", (record_id,))
                conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to delete telemetry record {record_id}: {e}")
            return False

    def get_queue_size(self) -> int:
        """Returns the total number of queued telemetry records."""
        try:
            with self._get_connection() as conn:
                cursor = conn.execute("SELECT COUNT(*) as count FROM telemetry_queue")
                row = cursor.fetchone()
                return int(row["count"]) if row else 0
        except Exception as e:
            logger.error(f"Failed to get queue size: {e}")
            return 0

# Global database manager instance
db_manager = DatabaseManager()

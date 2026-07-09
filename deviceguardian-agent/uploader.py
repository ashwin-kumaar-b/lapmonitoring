import time
import requests
from typing import Dict, Any
from logger import logger
from config import config_manager
from auth import auth_manager
from database import db_manager

class TelemetryUploader:
    """Handles secure transmission of telemetry data to the remote server and local queue sync."""

    def __init__(self) -> None:
        self.is_paused = False

    def upload_payload(self, payload: Dict[str, Any]) -> bool:
        """Sends a single telemetry record to the server, caching it locally if the upload fails."""
        if self.is_paused:
            logger.info("Upload skipped (monitoring is paused). Caching locally.")
            db_manager.enqueue_telemetry(payload)
            return False

        url = f"{config_manager.backend_url.rstrip('/')}/telemetry"
        token = auth_manager.get_token()

        if not token:
            logger.warning("No authentication token available. Caching telemetry locally.")
            db_manager.enqueue_telemetry(payload)
            return False

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code in (200, 201):
                logger.info("Telemetry uploaded successfully.")
                # Since connection is verified, trigger background synchronization of queued records
                self.sync_offline_queue()
                return True
            elif response.status_code == 401:
                logger.warning("Authentication failed (401 Unauthorized). Resetting credentials and queuing.")
                auth_manager.clear_token()
                db_manager.enqueue_telemetry(payload)
                return False
            else:
                logger.error(f"Failed to upload. HTTP Status: {response.status_code}. Queuing locally.")
                db_manager.enqueue_telemetry(payload)
                return False

        except requests.RequestException as e:
            logger.error(f"Network error during telemetry transmission: {e}. Queuing locally.")
            db_manager.enqueue_telemetry(payload)
            return False

    def sync_offline_queue(self) -> None:
        """Flushes cached SQLite telemetry packets to the backend chronologically."""
        queue_size = db_manager.get_queue_size()
        if queue_size == 0:
            return

        logger.info(f"Synchronizing offline queue. Found {queue_size} pending records.")
        token = auth_manager.get_token()
        if not token:
            logger.warning("Aborting queue synchronization: Token unavailable.")
            return

        url = f"{config_manager.backend_url.rstrip('/')}/telemetry"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Sync up to 100 entries at a time
        queued_records = db_manager.get_queued_telemetry(limit=100)
        for record_id, payload in queued_records:
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=10)
                if response.status_code in (200, 201):
                    db_manager.delete_telemetry(record_id)
                elif response.status_code == 401:
                    logger.warning("Authentication invalidated during queue sync.")
                    auth_manager.clear_token()
                    break
                else:
                    logger.error(f"Queue sync blocked on record {record_id}. Status: {response.status_code}.")
                    break
            except requests.RequestException as e:
                logger.error(f"Network error during queue sync: {e}.")
                break

        logger.info(f"Sync complete. Remaining queue size: {db_manager.get_queue_size()}")

    def force_sync(self) -> None:
        """Manually triggers synchronization of the offline queue."""
        logger.info("Manual synchronization triggered.")
        self.sync_offline_queue()

# Global uploader instance
uploader = TelemetryUploader()

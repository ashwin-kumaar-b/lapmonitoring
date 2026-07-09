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

        base_url = config_manager.backend_url.rstrip('/')
        is_supabase = "supabase.co" in base_url
        
        if is_supabase:
            url = base_url if base_url.endswith("/telemetry") else f"{base_url}/telemetry"
            if "?on_conflict=" not in url:
                url = f"{url}?on_conflict=device_uuid"
            supabase_key = "sb_publishable_huLEhuc-J4bal6hQRkPf5w_O16MKv6V"
            headers = {
                "apikey": supabase_key,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
            # Map telemetry dict into public.telemetry table schema
            post_payload = {
                "device_uuid": payload.get("system", {}).get("device_uuid", "unknown"),
                "device_name": payload.get("system", {}).get("device_name", "Unknown"),
                "payload": payload,
                "updated_at": payload.get("system", {}).get("timestamp")
            }
        else:
            url = f"{base_url}/telemetry"
            token = auth_manager.get_token()
            if not token:
                logger.warning("No authentication token available. Caching telemetry locally.")
                db_manager.enqueue_telemetry(payload)
                return False
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            post_payload = payload

        try:
            response = requests.post(url, json=post_payload, headers=headers, timeout=10)
            
            if response.status_code in (200, 201):
                logger.info("Telemetry uploaded successfully to backend.")
                self.sync_offline_queue()
                return True
            elif response.status_code == 401 and not is_supabase:
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
        base_url = config_manager.backend_url.rstrip('/')
        is_supabase = "supabase.co" in base_url
        
        if is_supabase:
            url = base_url if base_url.endswith("/telemetry") else f"{base_url}/telemetry"
            if "?on_conflict=" not in url:
                url = f"{url}?on_conflict=device_uuid"
            supabase_key = "sb_publishable_huLEhuc-J4bal6hQRkPf5w_O16MKv6V"
            headers = {
                "apikey": supabase_key,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            }
        else:
            url = f"{base_url}/telemetry"
            token = auth_manager.get_token()
            if not token:
                logger.warning("Aborting queue synchronization: Token unavailable.")
                return
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

        # Sync up to 100 entries at a time
        queued_records = db_manager.get_queued_telemetry(limit=100)
        for record_id, payload in queued_records:
            try:
                if is_supabase:
                    post_payload = {
                        "device_uuid": payload.get("system", {}).get("device_uuid", "unknown"),
                        "device_name": payload.get("system", {}).get("device_name", "Unknown"),
                        "payload": payload,
                        "updated_at": payload.get("system", {}).get("timestamp")
                    }
                else:
                    post_payload = payload

                response = requests.post(url, json=post_payload, headers=headers, timeout=10)
                if response.status_code in (200, 201):
                    db_manager.delete_telemetry(record_id)
                elif response.status_code == 401 and not is_supabase:
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

import sys
import time
import threading
from typing import Optional
from logger import logger
from config import config_manager
from collector import collector
from uploader import uploader
from startup import sync_startup_config
from tray import SystemTrayApp
from http.server import BaseHTTPRequestHandler, HTTPServer

class LocalDeviceUUIDHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/device_uuid':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(f'{{"device_uuid": "{collector.device_uuid}"}}'.encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass

def start_local_uuid_server():
    try:
        server = HTTPServer(('127.0.0.1', 31415), LocalDeviceUUIDHandler)
        logger.info("Local UUID server listening on http://127.0.0.1:31415")
        server.serve_forever()
    except Exception as e:
        logger.error(f"Failed to start local UUID server: {e}")

class DeviceGuardianAgent:
    """Main orchestrator for the DeviceGuardian AI Windows Monitoring Agent."""

    def __init__(self) -> None:
        self.stop_event = threading.Event()
        self.monitor_thread: Optional[threading.Thread] = None
        self.tray_app: Optional[SystemTrayApp] = None
        self.is_paused = False

    def start(self) -> None:
        """Initializes and runs the agent lifecycle."""
        logger.info("DeviceGuardian AI Monitoring Agent starting up...")
        
        # 1. Sync Windows auto-start configuration with registry
        sync_startup_config()

        # 2. Spawn the background telemetry collection and upload loop
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop, 
            name="TelemetryCollectorThread",
            daemon=True
        )
        self.monitor_thread.start()

        # 2.5 Spawn the local UUID sharing server
        self.uuid_server_thread = threading.Thread(
            target=start_local_uuid_server,
            name="LocalUuidServerThread",
            daemon=True
        )
        self.uuid_server_thread.start()

        # 3. Launch system tray (Runs on main thread to keep application alive)
        self.tray_app = SystemTrayApp(
            on_exit_callback=self.stop,
            on_pause_callback=self.pause,
            on_resume_callback=self.resume,
            on_sync_callback=self.force_sync
        )
        self.tray_app.run()

    def _monitoring_loop(self) -> None:
        """Background loop executing collection tasks at specified sampling intervals."""
        logger.info("Telemetry collection thread started.")
        
        # Initial wait/sync on startup
        time.sleep(2)
        
        while not self.stop_event.is_set():
            if not self.is_paused:
                try:
                    logger.info("Starting telemetry extraction...")
                    payload = collector.collect_telemetry()
                    logger.info("Telemetry collected. Handing off to uploader.")
                    uploader.upload_payload(payload)
                except Exception as e:
                    logger.critical(f"Critical error in collection loop: {e}", exc_info=True)
            
            # Sleep in small slices to remain responsive to quick exits/interval changes
            interval = config_manager.sampling_interval
            for _ in range(interval):
                if self.stop_event.is_set():
                    break
                time.sleep(1)

        logger.info("Telemetry collection thread terminating.")

    def pause(self) -> None:
        """Pauses the monitoring loop and uploader queue processing."""
        self.is_paused = True
        uploader.is_paused = True
        logger.info("Monitoring loop paused.")

    def resume(self) -> None:
        """Resumes the monitoring loop and triggers a queue synchronization check."""
        self.is_paused = False
        uploader.is_paused = False
        logger.info("Monitoring loop resumed.")
        # Trigger an immediate sync of any backlog accumulated during pause
        threading.Thread(target=uploader.force_sync, name="ManualSyncThread", daemon=True).start()

    def force_sync(self) -> None:
        """Triggers an immediate forced synchronization in a background thread."""
        threading.Thread(target=uploader.force_sync, name="ManualSyncThread", daemon=True).start()

    def stop(self) -> None:
        """Gracefully shuts down the background thread and exits the application."""
        logger.info("Initiating agent shutdown sequence...")
        self.stop_event.set()
        
        # Wait a short moment for monitor thread to exit
        if self.monitor_thread:
            self.monitor_thread.join(timeout=3)
            
        logger.info("DeviceGuardian AI Monitoring Agent successfully terminated.")
        sys.exit(0)

if __name__ == "__main__":
    agent = DeviceGuardianAgent()
    agent.start()

import threading
import ctypes
from typing import Callable, Optional
import pystray
from PIL import Image, ImageDraw
from logger import logger
from database import db_manager
from auth import auth_manager
from config import config_manager

class SystemTrayApp:
    """Manages the Windows System Tray Icon interface for the monitoring agent."""

    def __init__(self, 
                 on_exit_callback: Callable[[], None],
                 on_pause_callback: Callable[[], None],
                 on_resume_callback: Callable[[], None],
                 on_sync_callback: Callable[[], None]) -> None:
        self.on_exit_callback = on_exit_callback
        self.on_pause_callback = on_pause_callback
        self.on_resume_callback = on_resume_callback
        self.on_sync_callback = on_sync_callback
        self.icon: Optional[pystray.Icon] = None
        self.is_paused = False

    def create_icon_image(self) -> Image.Image:
        """Dynamically generates a high-quality icon image of a blue shield with a 'G' symbol."""
        # Create a 64x64 image with transparent background
        img = Image.new('RGBA', (64, 64), color=(0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        
        # Draw a sleek shield outline and fill
        # Shield coordinates: top points, bottom point
        shield_points = [
            (32, 6),   # Top center
            (54, 14),  # Top right
            (50, 44),  # Curve right
            (32, 58),  # Bottom point
            (14, 44),  # Curve left
            (10, 14)   # Top left
        ]
        
        # Fill the shield with a professional dark blue gradient color
        d.polygon(shield_points, fill=(26, 115, 232), outline=(13, 71, 161), width=2)
        
        # Draw inner details (a white mini-shield or letter 'G')
        d.text((24, 18), "DG", fill=(255, 255, 255))
        
        return img

    def show_status(self) -> None:
        """Displays status details in a standard Windows dialog box."""
        queue_size = db_manager.get_queue_size()
        auth_status = "Authenticated" if auth_manager._token else "Not Authenticated"
        monitoring_status = "Paused" if self.is_paused else "Active"
        
        status_text = (
            f"DeviceGuardian AI Agent Status:\n\n"
            f"Monitoring: {monitoring_status}\n"
            f"API Endpoint: {config_manager.backend_url}\n"
            f"Sampling Interval: {config_manager.sampling_interval} seconds\n"
            f"Auth Status: {auth_status}\n"
            f"Offline Queue Size: {queue_size} records\n"
        )
        
        # Thread-safe message box call
        threading.Thread(
            target=lambda: ctypes.windll.user32.MessageBoxW(
                0, status_text, "DeviceGuardian AI - Status", 0x40 | 0x00000000
            ),
            daemon=True
        ).start()

    def toggle_pause(self) -> None:
        """Toggles the execution state between monitoring and paused."""
        self.is_paused = not self.is_paused
        if self.is_paused:
            logger.info("Agent execution paused via system tray.")
            self.on_pause_callback()
            if self.icon:
                self.icon.title = "DeviceGuardian AI (Paused)"
        else:
            logger.info("Agent execution resumed via system tray.")
            self.on_resume_callback()
            if self.icon:
                self.icon.title = "DeviceGuardian AI (Active)"
        
        # Re-render menu
        if self.icon:
            self.icon.update_menu()

    def exit_app(self) -> None:
        """Stops the tray icon loop and triggers the main thread exit procedure."""
        logger.info("Shutdown requested via system tray icon.")
        if self.icon:
            self.icon.stop()
        self.on_exit_callback()

    def run(self) -> None:
        """Starts the system tray icon loop."""
        
        def get_pause_label(item) -> str:
            return "Resume Monitoring" if self.is_paused else "Pause Monitoring"

        menu = pystray.Menu(
            pystray.MenuItem("View Status", lambda: self.show_status()),
            pystray.MenuItem("Force Sync", lambda: self.on_sync_callback()),
            pystray.MenuItem(get_pause_label, lambda: self.toggle_pause()),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit", lambda: self.exit_app())
        )

        self.icon = pystray.Icon(
            "DeviceGuardianAgent",
            icon=self.create_icon_image(),
            title="DeviceGuardian AI (Active)",
            menu=menu
        )
        
        logger.info("Starting System Tray main loop.")
        self.icon.run()

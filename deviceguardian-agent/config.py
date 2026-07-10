import os
import sys
import json
from typing import Any, Dict
from dotenv import load_dotenv
from logger import logger

# Base directory for executable / script configuration files
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env
ENV_PATH = os.path.join(BASE_DIR, ".env")
if os.path.exists(ENV_PATH):
    load_dotenv(ENV_PATH)
else:
    logger.warning(".env file not found. Relying on system environment variables.")

CONFIG_PATH = os.path.join(BASE_DIR, "config.json")

DEFAULT_CONFIG: Dict[str, Any] = {
    "sampling_interval_seconds": 30,
    "backend_url": "https://lonsqhuudhiffjitmcbh.supabase.co/rest/v1",
    "auto_start": True,
    "retry_interval_seconds": 10,
    "agent_email": ""
}

class ConfigManager:
    """Manages system configuration by merging config.json values and environment variables."""

    def __init__(self) -> None:
        self.config: Dict[str, Any] = DEFAULT_CONFIG.copy()
        self.load_config()

    def load_config(self) -> None:
        """Loads configuration from config.json and overrides with environment variables."""
        if os.path.exists(CONFIG_PATH):
            try:
                with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                    file_config = json.load(f)
                    self.config.update(file_config)
            except Exception as e:
                logger.error(f"Error loading config.json: {e}. Using defaults.")
        else:
            self.save_config()

        # Environment variables override config.json values if present
        env_backend_url = os.getenv("API_URL")
        if env_backend_url:
            self.config["backend_url"] = env_backend_url

        self.agent_email = os.getenv("AGENT_EMAIL", self.config.get("agent_email", ""))
        self.agent_password = os.getenv("AGENT_PASSWORD", "")

        # If email is missing, show a graphical popup window to link the device
        if not self.agent_email:
            try:
                import tkinter as tk
                from tkinter import simpledialog
                
                root = tk.Tk()
                root.withdraw()
                root.attributes("-topmost", True)
                
                email_input = simpledialog.askstring(
                    "DeviceGuardian Registration",
                    "Enter your DeviceGuardian portal email to link this laptop:\n(Leave blank to skip)",
                    parent=root
                )
                root.destroy()
                
                if email_input:
                    self.agent_email = email_input.strip()
                    self.config["agent_email"] = self.agent_email
                    self.save_config()
                    logger.info(f"Registered agent email: {self.agent_email}")
            except Exception as ex:
                logger.error(f"Failed to prompt for email: {ex}")

    def save_config(self) -> None:
        """Persists the current configuration state to config.json."""
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2)
            logger.info("Configuration saved successfully.")
        except Exception as e:
            logger.error(f"Failed to write to config.json: {e}")

    @property
    def sampling_interval(self) -> int:
        return int(self.config.get("sampling_interval_seconds", 30))

    @property
    def backend_url(self) -> str:
        return str(self.config.get("backend_url", "http://localhost:8000"))

    @backend_url.setter
    def backend_url(self, val: str) -> None:
        self.config["backend_url"] = val
        self.save_config()

    @property
    def auto_start(self) -> bool:
        return bool(self.config.get("auto_start", True))

    @auto_start.setter
    def auto_start(self, val: bool) -> None:
        self.config["auto_start"] = val
        self.save_config()

    @property
    def retry_interval(self) -> int:
        return int(self.config.get("retry_interval_seconds", 10))

# Global config instance
config_manager = ConfigManager()

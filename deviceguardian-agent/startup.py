import os
import sys
import winreg
from logger import logger
from config import config_manager

REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
APP_NAME = "DeviceGuardianAgent"

def get_launch_command() -> str:
    """Constructs the command to launch the agent depending on whether it's an EXE or script."""
    # Check if running as compiled PyInstaller executable
    if getattr(sys, 'frozen', False):
        return f'"{sys.executable}"'
    else:
        # Running as a Python script
        script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "main.py"))
        # Using pythonw.exe to run without launching a command prompt window
        pythonw_path = sys.executable.replace("python.exe", "pythonw.exe")
        if not os.path.exists(pythonw_path):
            pythonw_path = sys.executable
        return f'"{pythonw_path}" "{script_path}"'

def set_autostart(enable: bool) -> bool:
    """Enables or disables auto-start for the current user in the Windows Registry."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            REG_PATH,
            0,
            winreg.KEY_SET_VALUE | winreg.KEY_QUERY_VALUE
        )
    except Exception as e:
        logger.error(f"Failed to open registry key: {e}")
        return False

    try:
        if enable:
            command = get_launch_command()
            winreg.SetValueEx(key, APP_NAME, 0, winreg.REG_SZ, command)
            logger.info(f"Auto-start enabled in registry: {command}")
        else:
            try:
                winreg.DeleteValue(key, APP_NAME)
                logger.info("Auto-start disabled in registry.")
            except FileNotFoundError:
                # Already deleted
                pass
        return True
    except Exception as e:
        logger.error(f"Failed to write/delete registry value: {e}")
        return False
    finally:
        winreg.CloseKey(key)

def sync_startup_config() -> None:
    """Synchronizes the registry auto-start state with config.json settings."""
    should_autostart = config_manager.auto_start
    set_autostart(should_autostart)

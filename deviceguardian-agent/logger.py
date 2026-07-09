import os
import sys
import logging
from logging.handlers import RotatingFileHandler

# Define base directory (handle PyInstaller frozen state)
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "deviceguardian.log")

# Configure logger
logger = logging.getLogger("DeviceGuardian")
logger.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter(
    fmt="%(asctime)s - %(levelname)s - [%(threadName)s] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# File Handler (10MB limit, keeping 5 backup files)
file_handler = RotatingFileHandler(
    LOG_FILE, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
)
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# Console Handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

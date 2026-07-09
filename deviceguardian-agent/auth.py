import time
import requests
from typing import Optional
from config import config_manager
from logger import logger

class AuthManager:
    """Manages agent authentication and JWT retrieval from the DeviceGuardian backend."""

    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._token_expiry: float = 0.0  # Unix timestamp

    def get_token(self) -> Optional[str]:
        """Returns a cached JWT or performs a login to acquire a new one."""
        # If no token or token is close to expiry (e.g. within 60s), authenticate
        if not self._token or time.time() > self._token_expiry - 60:
            logger.info("Access token missing or expired. Performing login...")
            if self.login():
                logger.info("Login successful. Token refreshed.")
            else:
                logger.error("Login attempt failed. Proceeding without authentication.")
        return self._token

    def login(self) -> bool:
        """Sends agent credentials to the login endpoint to fetch a JWT access token."""
        url = f"{config_manager.backend_url.rstrip('/')}/login"
        email = config_manager.agent_email
        password = config_manager.agent_password

        if not email or not password:
            logger.error("Authentication credentials missing in configuration (.env or system env).")
            return False

        payload = {
            "email": email,
            "password": password
        }

        try:
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self._token = data.get("access_token")
                # Assume standard JWT 1-hour validity if expiry is not returned
                expires_in = data.get("expires_in", 3600)
                self._token_expiry = time.time() + expires_in
                return True
            else:
                logger.error(f"Login failed with status code {response.status_code}: {response.text}")
                return False
        except requests.RequestException as e:
            logger.error(f"Network error during login request: {e}")
            return False

    def clear_token(self) -> None:
        """Clears the token in case of authentication rejection (e.g., HTTP 401)."""
        self._token = None
        self._token_expiry = 0.0

# Global auth manager instance
auth_manager = AuthManager()

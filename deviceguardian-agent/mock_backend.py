import logging
from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional

from fastapi.middleware.cors import CORSMiddleware

# Set up logging for backend
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("MockBackend")

app = FastAPI(title="DeviceGuardian AI - Mock Backend", version="1.0.0")

# Enable CORS for frontend API calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store of latest device telemetry, keyed by UUID
ACTIVE_DEVICES = {}

# Valid token mock
MOCK_TOKEN = "mock-jwt-token-12345"

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(request: LoginRequest):
    """Mocks backend authorization and issues a token."""
    logger.info(f"Received login request for user: {request.email}")
    # Grant authentication for any email/password payload during testing
    return {
        "access_token": MOCK_TOKEN,
        "token_type": "bearer",
        "expires_in": 3600
    }

@app.get("/devices")
def get_devices():
    """Returns telemetry data for all active devices."""
    return list(ACTIVE_DEVICES.values())

@app.post("/telemetry")
def receive_telemetry(payload: Dict[str, Any], authorization: Optional[str] = Header(None)):
    """Receives and validates system telemetry uploads."""
    if not authorization:
        logger.warning("Telemetry request received without Authorization header.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header"
        )
    
    # Extract JWT token
    token = authorization.split(" ")[-1] if " " in authorization else authorization
    if token != MOCK_TOKEN:
        logger.warning(f"Rejected unauthorized request. Provided token: {token}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )

    system_info = payload.get("system", {})
    device_uuid = system_info.get("device_uuid", "Unknown")
    
    # Store/Update in-memory state
    if device_uuid != "Unknown":
        ACTIVE_DEVICES[device_uuid] = payload

    device_name = system_info.get("device_name", "Unknown")
    cpu_info = payload.get("cpu", {})
    ram_info = payload.get("memory", {})
    disk_health = payload.get("disk_health", {})
    battery_info = payload.get("battery", {})

    temp_c = cpu_info.get("temperature_c")
    temp_str = f"{temp_c:.1f}°C" if temp_c is not None else "N/A"
    
    fan_speed = cpu_info.get("fan_speed_rpm")
    fan_str = f"{fan_speed} RPM" if fan_speed is not None else "N/A"

    bat_pct = battery_info.get("percentage")
    bat_charging = battery_info.get("charging")
    bat_pct_str = f"{bat_pct}%" if bat_pct is not None else "N/A"
    bat_charging_str = "Charging" if bat_charging else "Discharging/Full" if bat_charging is not None else "N/A"
    bat_health = battery_info.get("health", "N/A")
    bat_cap = battery_info.get("capacity_wh")
    bat_cap_str = f"{bat_cap:.1f} Wh" if bat_cap is not None else "N/A"

    logger.info("=== RECEIVED TELEMETRY SNAPSHOT ===")
    logger.info(f"Device: {device_name} (User: {system_info.get('username')})")
    logger.info(f"Windows: {system_info.get('windows_version')}")
    logger.info(f"CPU Usage: {cpu_info.get('usage_percent')}% | Freq: {cpu_info.get('frequency_mhz')} MHz | Temp: {temp_str} | Fan: {fan_str}")
    logger.info(f"RAM Usage: {ram_info.get('ram_usage_percent')}%")
    logger.info(f"Battery: {bat_pct_str} ({bat_charging_str}) | Health: {bat_health} | Capacity: {bat_cap_str}")
    logger.info(f"Disk SMART: {disk_health.get('smart_status')} (Errors: {disk_health.get('errors')})")
    logger.info("====================================")

    return {"status": "success", "message": "Telemetry processed successfully"}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting mock backend server on http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)

# DeviceGuardian AI - Windows Monitoring Agent

A lightweight, silent Windows system monitoring agent that runs in the background, collects hardware and OS telemetry every 30 seconds, cache-queues records locally in an SQLite database if the internet is unavailable, and securely uploads updates to a FastAPI backend.

---

## Features

- **Silent Background Execution**: Runs completely without standard shell window popups (`pythonw` or `console=False` binary).
- **Comprehensive Hardware Telemetry**: CPU usage, frequency, temperatures (if available), virtual memory details, battery status/health, system drive usage metrics, and SMART disk health.
- **Offline Resiliency**: In the event of a network outage, data is saved locally to an SQLite queue. Upon connection restoration, records sync chronologically.
- **Secure Authentication**: Retrieves a JWT access token via `/login` and attaches it in the HTTP headers (`Authorization: Bearer <token>`) for subsequent telemetry submissions.
- **System Tray Controls**: Interactive interface to check statuses, pause/resume monitoring sessions, trigger manual uploads, and exit cleanly.
- **Windows Integration**: Integrates directly with the current user's Startup Registry keys.

---

## Installation & Setup

### Prerequisites
- Python 3.11+ installed on Windows.

### 1. Install Dependencies
Navigate to the `deviceguardian-agent` directory and run:
```bash
pip install -r requirements.txt
```

### 2. Configuration
Copy the configuration template to `.env`:
```bash
copy .env.example .env
```
Open `.env` and configure your API details:
- `API_URL`: Your FastAPI backend base URL.
- `AGENT_EMAIL`: Authentication email.
- `AGENT_PASSWORD`: Authentication password.

You can modify settings like intervals in `config.json`:
- `sampling_interval_seconds`: Collection frequency (default `30` seconds).
- `retry_interval_seconds`: Queue sync retry sleep cycle if connection drops.
- `auto_start`: `true`/`false` toggling startup registry creation.

---

## Execution

To launch the monitoring agent in the background:
```bash
pythonw main.py
```
To run and display standard output logs in the terminal for debug purposes:
```bash
python main.py
```

---

## Packaging the Agent (.exe)

To build a standalone, silent executable (`DeviceGuardianAgent.exe`):

1. Install PyInstaller (included in `requirements.txt`).
2. Build utilizing the provided `.spec` file:
   ```bash
   pyinstaller --clean DeviceGuardianAgent.spec
   ```
3. Locate the final binary in the `dist` folder: `dist/DeviceGuardianAgent.exe`.

---

## Project Structure

```text
deviceguardian-agent/
│
├── .env                  # Configured environment credentials
├── .env.example          # Sample environment credentials
├── config.json           # Active agent behaviors/configurations
├── DeviceGuardianAgent.spec # PyInstaller packager instructions
├── README.md             # Documentation
├── requirements.txt      # Python dependencies
│
├── main.py               # Application Entrypoint & Orchestrator
├── collector.py          # Hardware sensors & OS reader
├── uploader.py           # Endpoint synchronization & local caching
├── auth.py               # Token acquisition and storage
├── database.py           # Local SQLite database caching (offline sync)
├── startup.py            # Windows Run Registry controller
├── tray.py               # System Tray GUI and UI callback binder
└── logger.py             # Event logger to logs/deviceguardian.log
```

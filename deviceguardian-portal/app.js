document.addEventListener("DOMContentLoaded", () => {
    // Select HTML elements representing dial values and styles
    const deviceSelect = document.getElementById("device-select");
    const cpuDial = document.getElementById("cpu-dial");
    const cpuVal = document.getElementById("cpu-val");
    const cpuFreq = document.getElementById("cpu-freq");
    const cpuTemp = document.getElementById("cpu-temp");

    const ramDial = document.getElementById("ram-dial");
    const ramVal = document.getElementById("ram-val");
    const ramTotal = document.getElementById("ram-total");
    const ramFree = document.getElementById("ram-free");

    const batteryBar = document.getElementById("battery-bar");
    const batteryText = document.getElementById("battery-level-text");
    const batteryHealth = document.getElementById("battery-health");
    const smartStatus = document.getElementById("smart-status");

    const BACKEND_URL = "https://lonsqhuudhiffjitmcbh.supabase.co/rest/v1/telemetry";
    let devicesCache = {};

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Simulates live telemetry fluctuations for demo mode.
     */
    function simulateMetrics() {
        const cpuUsage = Math.floor(getRandomArbitrary(12, 45));
        const freq = getRandomArbitrary(1.8, 3.1).toFixed(1);
        const temp = getRandomArbitrary(20.0, 32.5).toFixed(1);

        cpuDial.style.setProperty("--percent", cpuUsage);
        cpuVal.textContent = `${cpuUsage}%`;
        cpuFreq.textContent = `${freq} GHz`;
        cpuTemp.textContent = `${temp}°C`;

        const ramUsage = Math.floor(getRandomArbitrary(74, 82));
        const totalRam = 16.0;
        const freeRam = (totalRam - (totalRam * (ramUsage / 100))).toFixed(1);

        ramDial.style.setProperty("--percent", ramUsage);
        ramVal.textContent = `${ramUsage}%`;
        ramTotal.textContent = `${totalRam.toFixed(0)} GB`;
        ramFree.textContent = `${freeRam} GB`;

        const batteryPct = Math.floor(getRandomArbitrary(95, 98));
        batteryBar.style.width = `${batteryPct}%`;
        batteryText.textContent = `${batteryPct}% (Charging)`;
        batteryHealth.textContent = "Health: 90%";
        
        smartStatus.className = "smart-status-badge healthy";
        smartStatus.innerHTML = '<span class="status-icon">✓</span><span class="status-text">HEALTHY (OK)</span>';
    }

    /**
     * Updates the UI using actual telemetry payload.
     */
    function updateWithRealData(payload) {
        const cpu = payload.cpu || {};
        const ram = payload.memory || {};
        const battery = payload.battery || {};
        const disk = payload.disk_health || {};

        // CPU update
        const cpuUsage = cpu.usage_percent || 0;
        cpuDial.style.setProperty("--percent", cpuUsage);
        cpuVal.textContent = `${cpuUsage}%`;
        cpuFreq.textContent = cpu.frequency_mhz ? `${(cpu.frequency_mhz / 1000).toFixed(1)} GHz` : "N/A";
        cpuTemp.textContent = cpu.temperature_c ? `${cpu.temperature_c.toFixed(1)}°C` : "N/A";

        // RAM update
        const ramUsage = ram.ram_usage_percent || 0;
        ramDial.style.setProperty("--percent", ramUsage);
        ramVal.textContent = `${ramUsage}%`;
        const totalRam = ram.total_ram || 0;
        const usedRam = ram.used_ram || 0;
        const freeRam = totalRam - usedRam;
        const totalRamGb = totalRam ? (totalRam / (1024 ** 3)).toFixed(1) : "16.0";
        const freeRamGb = freeRam ? (freeRam / (1024 ** 3)).toFixed(1) : "0.0";
        ramTotal.textContent = `${Math.round(totalRamGb)} GB`;
        ramFree.textContent = `${freeRamGb} GB`;

        // Battery update
        const batPct = battery.percentage || 0;
        batteryBar.style.width = `${batPct}%`;
        const chargingStr = battery.charging ? "Charging" : "Discharging/Full";
        batteryText.textContent = `${batPct}% (${chargingStr})`;
        batteryHealth.textContent = battery.health ? `Health: ${battery.health}` : "Health: N/A";

        // SMART update
        const status = disk.smart_status || "UNKNOWN";
        if (status === "OK" || status === "HEALTHY") {
            smartStatus.className = "smart-status-badge healthy";
            smartStatus.innerHTML = `✓ ${status}`;
        } else {
            smartStatus.className = "smart-status-badge alert";
            smartStatus.innerHTML = `⚠️ ${status}`;
        }
    }

    /**
     * Fetches connected devices from the FastAPI backend.
     */
    async function fetchDevices() {
        try {
            const supabase_key = "sb_publishable_huLEhuc-J4bal6hQRkPf5w_O16MKv6V";
            const res = await fetch(BACKEND_URL, {
                headers: {
                    "apikey": supabase_key
                }
            });
            if (!res.ok) throw new Error("Backend error");
            const data = await res.json();
            
            // Check if active devices list is empty
            if (!data || data.length === 0) {
                if (deviceSelect.value !== "simulation") {
                    deviceSelect.value = "simulation";
                }
                simulateMetrics();
                return;
            }

            // Sync select options
            const currentSelected = deviceSelect.value;
            deviceSelect.innerHTML = "";
            
            // Add simulation default back
            const defaultOpt = document.createElement("option");
            defaultOpt.value = "simulation";
            defaultOpt.textContent = "📡 Demo Simulation (Offline Mode)";
            deviceSelect.appendChild(defaultOpt);

            devicesCache = {};
            data.forEach(row => {
                const uuid = row.device_uuid;
                const name = row.device_name;
                devicesCache[uuid] = row.payload;

                const opt = document.createElement("option");
                opt.value = uuid;
                opt.textContent = `💻 ${name} (ID: ${uuid.slice(0, 8)})`;
                deviceSelect.appendChild(opt);
            });

            // Restore selection or select the first real laptop automatically if it was on simulation
            if (currentSelected && devicesCache[currentSelected]) {
                deviceSelect.value = currentSelected;
            } else if (data.length > 0) {
                deviceSelect.value = data[0].device_uuid;
            }

            // Render selected device details
            const selectedUuid = deviceSelect.value;
            if (selectedUuid === "simulation") {
                simulateMetrics();
            } else if (devicesCache[selectedUuid]) {
                updateWithRealData(devicesCache[selectedUuid]);
            }
        } catch (err) {
            // Fallback to simulation if backend is unreachable
            if (deviceSelect.value !== "simulation") {
                deviceSelect.value = "simulation";
            }
            simulateMetrics();
        }
    }

    // Event listener for toggle selection
    deviceSelect.addEventListener("change", () => {
        const val = deviceSelect.value;
        if (val === "simulation") {
            simulateMetrics();
        } else if (devicesCache[val]) {
            updateWithRealData(devicesCache[val]);
        }
    });

    // Poll backend every 3 seconds
    fetchDevices();
    setInterval(fetchDevices, 3000);
});

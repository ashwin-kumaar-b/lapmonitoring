document.addEventListener("DOMContentLoaded", () => {
    // Select HTML elements representing dial values and styles
    const cpuDial = document.getElementById("cpu-dial");
    const cpuVal = document.getElementById("cpu-val");
    const cpuFreq = document.getElementById("cpu-freq");
    const cpuTemp = document.getElementById("cpu-temp");

    const ramDial = document.getElementById("ram-dial");
    const ramVal = document.getElementById("ram-val");
    const ramFree = document.getElementById("ram-free");

    const batteryBar = document.getElementById("battery-bar");
    const batteryText = document.getElementById("battery-level-text");

    /**
     * Generates a random float within a specified range.
     */
    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Simulates live telemetry fluctuations.
     */
    function simulateMetrics() {
        // 1. CPU Simulation
        const cpuUsage = Math.floor(getRandomArbitrary(12, 45));
        const freq = getRandomArbitrary(1.8, 3.1).toFixed(1);
        const temp = getRandomArbitrary(20.0, 32.5).toFixed(1);

        cpuDial.style.setProperty("--percent", cpuUsage);
        cpuVal.textContent = `${cpuUsage}%`;
        cpuFreq.textContent = `${freq} GHz`;
        cpuTemp.textContent = `${temp}°C`;

        // 2. RAM Simulation
        const ramUsage = Math.floor(getRandomArbitrary(74, 82));
        const totalRam = 16.0;
        const freeRam = (totalRam - (totalRam * (ramUsage / 100))).toFixed(1);

        ramDial.style.setProperty("--percent", ramUsage);
        ramVal.textContent = `${ramUsage}%`;
        ramFree.textContent = `${freeRam} GB`;

        // 3. Battery Simulation (Slow discharge fluctuation for visual activity)
        const batteryPct = Math.floor(getRandomArbitrary(95, 98));
        batteryBar.style.width = `${batteryPct}%`;
        batteryText.textContent = `${batteryPct}% (Charging)`;
    }

    // Initialize simulation
    simulateMetrics();

    // Fluctuates metrics every 2.5 seconds to simulate a live telemetry connection
    setInterval(simulateMetrics, 2500);
});

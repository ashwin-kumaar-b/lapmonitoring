document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Login page elements
    const loginView = document.getElementById("login-view");
    const appView = document.getElementById("app-view");
    const loginForm = document.getElementById("login-form-el");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const btnTogglePassword = document.getElementById("btn-toggle-password");
    const rememberMeCheckbox = document.getElementById("remember-me-checkbox");
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const emailFieldError = document.getElementById("email-error");
    const btnNavSignout = document.getElementById("btn-nav-signout");

    // Check login state
    if (localStorage.getItem("isLoggedIn") === "true") {
        loginView.style.display = "none";
        appView.style.display = "block";
        btnNavSignout.style.display = "inline-block";
    } else {
        loginView.style.display = "flex";
        appView.style.display = "none";
        btnNavSignout.style.display = "none";
    }

    // Helper to toggle active class on focus for form fields
    const formFields = document.querySelectorAll(".form-field");
    formFields.forEach(field => {
        const input = field.querySelector("input");
        if (!input) return;

        input.addEventListener("focus", () => {
            field.classList.add("active");
        });

        input.addEventListener("blur", () => {
            if (!input.value) {
                field.classList.remove("active");
            }
        });

        if (input.value) {
            field.classList.add("active");
        }
    });

    // Toggle password visibility
    btnTogglePassword.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        const icon = btnTogglePassword.querySelector("i");
        if (icon) {
            icon.setAttribute("data-lucide", type === "text" ? "eye-off" : "eye");
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Toggle login view theme
    themeToggleBtn.addEventListener("click", () => {
        loginView.classList.toggle("light");
        const icon = themeToggleBtn.querySelector("i");
        if (icon) {
            icon.setAttribute("data-lucide", loginView.classList.contains("light") ? "sun" : "moon");
            if (window.lucide) window.lucide.createIcons();
        }
        if (window.updateParticleColors) {
            window.updateParticleColors();
        }
    });

    // Sign Out Handler
    btnNavSignout.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.removeItem("isLoggedIn");
        appView.style.display = "none";
        loginView.style.display = "flex";
        btnNavSignout.style.display = "none";
        emailInput.value = "";
        passwordInput.value = "";
        formFields.forEach(field => field.classList.remove("active"));
    });

    // Canvas Particles Background
    const canvas = document.getElementById("particles");
    if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
            const setCanvasSize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            setCanvasSize();
            window.addEventListener("resize", setCanvasSize);

            class Particle {
                constructor() {
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * canvas.height;
                    this.size = Math.random() * 3 + 1;
                    this.speedX = (Math.random() - 0.5) * 0.5;
                    this.speedY = (Math.random() - 0.5) * 0.5;
                    this.updateColor();
                }

                updateColor() {
                    const isLight = loginView.classList.contains("light");
                    this.color = isLight
                        ? `rgba(0, 0, 100, ${Math.random() * 0.2})`
                        : `rgba(255, 255, 255, ${Math.random() * 0.2})`;
                }

                update() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                    if (this.x > canvas.width) this.x = 0;
                    if (this.x < 0) this.x = canvas.width;
                    if (this.y > canvas.height) this.y = 0;
                    if (this.y < 0) this.y = canvas.height;
                }

                draw() {
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            const particles = [];
            const particleCount = Math.min(100, Math.floor((canvas.width * canvas.height) / 15000));
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle());
            }

            window.updateParticleColors = () => {
                particles.forEach(p => p.updateColor());
            };

            const animate = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                particles.forEach(p => {
                    p.update();
                    p.draw();
                });
                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    // Supabase Sign In Handler
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        emailFieldError.style.display = "none";
        document.getElementById("email-field").classList.remove("invalid");

        const usernameOrEmail = emailInput.value.trim();
        const password = passwordInput.value;

        // Validation (Supabase Auth requires standard email format)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(usernameOrEmail)) {
            emailFieldError.textContent = "Please enter a valid email address.";
            emailFieldError.style.display = "block";
            document.getElementById("email-field").classList.add("invalid");
            return;
        }

        const btnSubmit = document.getElementById("btn-login-submit");
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Signing In...";

        try {
            const res = await fetch("https://lonsqhuudhiffjitmcbh.supabase.co/auth/v1/token?grant_type=password", {
                method: "POST",
                headers: {
                    "apikey": "sb_publishable_huLEhuc-J4bal6hQRkPf5w_O16MKv6V",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: usernameOrEmail,
                    password: password
                })
            });

            if (res.ok) {
                const responseData = await res.json();
                const formEl = document.querySelector(".login-form");
                if (formEl) {
                    formEl.classList.add("form-success");
                    setTimeout(() => {
                        formEl.classList.remove("form-success");
                        localStorage.setItem("userEmail", usernameOrEmail);
                        localStorage.setItem("isLoggedIn", "true");
                        loginView.style.opacity = "0";
                        setTimeout(() => {
                            loginView.style.display = "none";
                            loginView.style.opacity = "1";
                            appView.style.display = "block";
                            btnNavSignout.style.display = "inline-block";
                        }, 500);
                    }, 1000);
                }
            } else {
                const errorData = await res.json();
                const msg = errorData.error_description || errorData.message || "Invalid credentials.";
                emailFieldError.textContent = msg;
                emailFieldError.style.display = "block";
                document.getElementById("email-field").classList.add("invalid");
            }
        } catch (err) {
            emailFieldError.textContent = "Network error. Please try again.";
            emailFieldError.style.display = "block";
            document.getElementById("email-field").classList.add("invalid");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Sign In";
        }
    });

    // Select HTML elements representing dial values and styles
    const deviceSelect = document.getElementById("device-select");
    const cpuDial = document.getElementById("cpu-dial");
    const cpuVal = document.getElementById("cpu-val");
    const cpuFreq = document.getElementById("cpu-freq");
    const cpuTemp = document.getElementById("cpu-temp");
    const gpuUtil = document.getElementById("gpu-util");
    const gpuTemp = document.getElementById("gpu-temp");

    const ramDial = document.getElementById("ram-dial");
    const ramVal = document.getElementById("ram-val");
    const ramTotal = document.getElementById("ram-total");
    const ramFree = document.getElementById("ram-free");

    const batteryBar = document.getElementById("battery-bar");
    const batteryText = document.getElementById("battery-level-text");
    const batteryHealth = document.getElementById("battery-health");
    const smartStatus = document.getElementById("smart-status");

    const storageBar = document.getElementById("storage-bar");
    const storageUsedText = document.getElementById("storage-used-text");
    const storageFreeText = document.getElementById("storage-free-text");

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

        const gUtil = Math.floor(cpuUsage * 0.4 + getRandomArbitrary(2, 6));
        const gTemp = (parseFloat(temp) - 2.5).toFixed(1);
        gpuUtil.textContent = `${gUtil}%`;
        gpuTemp.textContent = `${gTemp}°C`;

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

        const storagePct = Math.floor(getRandomArbitrary(40, 55));
        const totalStorageGb = 512.0;
        const usedStorageGb = (totalStorageGb * (storagePct / 100)).toFixed(1);
        const freeStorageGb = (totalStorageGb - usedStorageGb).toFixed(1);
        storageBar.style.width = `${storagePct}%`;
        storageUsedText.textContent = `${usedStorageGb} GB / ${totalStorageGb} GB (${storagePct}%)`;
        storageFreeText.textContent = `Free: ${freeStorageGb} GB`;
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

        gpuUtil.textContent = cpu.gpu_usage_percent !== undefined ? `${cpu.gpu_usage_percent}%` : "N/A";
        gpuTemp.textContent = cpu.gpu_temperature_c ? `${cpu.gpu_temperature_c.toFixed(1)}°C` : "N/A";

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

        // SSD Storage update
        const storage = payload.storage || {};
        const diskPct = storage.disk_usage_percent || 0;
        const freeBytes = storage.free_space_bytes || 0;
        const totalBytes = storage.total_space_bytes || 0;
        const usedBytes = storage.used_space_bytes !== undefined ? storage.used_space_bytes : (totalBytes - freeBytes);

        const totalGb = totalBytes ? (totalBytes / (1024 ** 3)).toFixed(1) : "0.0";
        const usedGb = usedBytes ? (usedBytes / (1024 ** 3)).toFixed(1) : "0.0";
        const freeGb = freeBytes ? (freeBytes / (1024 ** 3)).toFixed(1) : "0.0";

        storageBar.style.width = `${diskPct}%`;
        storageUsedText.textContent = `${usedGb} GB / ${totalGb} GB (${diskPct.toFixed(1)}%)`;
        storageFreeText.textContent = `Free: ${freeGb} GB`;
    }

    /**
     * Maps user email/username to specific devices.
     */
    function getFilteredDevices(data, email) {
        if (!email) return data;
        const emailLower = email.toLowerCase();

        // Admin sees all devices
        if (emailLower.includes("admin")) {
            return data;
        }

        return data.filter(row => {
            const devName = (row.device_name || "").toLowerCase();
            const winUser = (row.payload?.system?.username || "").toLowerCase();

            // Ashwin's devices
            if (emailLower.includes("ashwin") || emailLower.includes("ashwi")) {
                return devName.includes("ashwin") || winUser.includes("ashwi");
            }

            // Friend's devices (Bharat)
            if (emailLower.includes("bharat")) {
                return devName.includes("u99pqts5") || winUser.includes("bharat");
            }

            // Generic mapping: match email username prefix to device or windows username
            const prefix = emailLower.split("@")[0];
            return devName.includes(prefix) || winUser.includes(prefix);
        });
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
            
            // Filter list of devices based on logged-in email
            const loggedInEmail = localStorage.getItem("userEmail") || "";
            const filteredData = getFilteredDevices(data, loggedInEmail);
            
            // Check if active devices list is empty
            if (!filteredData || filteredData.length === 0) {
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
            filteredData.forEach(row => {
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
            } else if (filteredData.length > 0) {
                deviceSelect.value = filteredData[0].device_uuid;
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

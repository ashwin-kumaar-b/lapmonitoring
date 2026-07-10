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

    // Signup / Signin Mode elements & state
    let isSignUpMode = false;
    const toggleSignupLink = document.getElementById("toggle-signup-link");
    const loginTitle = document.getElementById("login-title");
    const loginSubtitle = document.getElementById("login-subtitle");
    const btnSubmit = document.getElementById("btn-login-submit");
    const signupPromptEl = document.getElementById("signup-prompt-el");

    function handleToggleSignup(e) {
        e.preventDefault();
        isSignUpMode = !isSignUpMode;
        
        if (isSignUpMode) {
            loginTitle.textContent = "Create Account";
            loginSubtitle.textContent = "Please sign up to get started";
            btnSubmit.textContent = "Sign Up";
            signupPromptEl.innerHTML = `Already have an account? <a href="#" id="toggle-signup-link">Sign in</a>`;
        } else {
            loginTitle.textContent = "Welcome";
            loginSubtitle.textContent = "Please sign in to continue";
            btnSubmit.textContent = "Sign In";
            signupPromptEl.innerHTML = `Don't have an account? <a href="#" id="toggle-signup-link">Sign up</a>`;
        }
        
        // Re-bind to the new element created by innerHTML replacement
        document.getElementById("toggle-signup-link").addEventListener("click", handleToggleSignup);
    }
    if (toggleSignupLink) {
        toggleSignupLink.addEventListener("click", handleToggleSignup);
    }

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

        btnSubmit.disabled = true;
        btnSubmit.textContent = isSignUpMode ? "Signing Up..." : "Signing In...";

        try {
            const endpoint = isSignUpMode ? "signup" : "token?grant_type=password";
            const res = await fetch(`https://lonsqhuudhiffjitmcbh.supabase.co/auth/v1/${endpoint}`, {
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
                        
                        if (isSignUpMode) {
                            // If auto-logged in, navigate to dashboard
                            if (responseData.access_token) {
                                localStorage.setItem("userEmail", usernameOrEmail);
                                localStorage.setItem("isLoggedIn", "true");
                                loginView.style.opacity = "0";
                                setTimeout(() => {
                                    loginView.style.display = "none";
                                    loginView.style.opacity = "1";
                                    appView.style.display = "block";
                                    btnNavSignout.style.display = "inline-block";
                                    fetchDevices();
                                }, 500);
                            } else {
                                // Toggle back to login mode and prompt the user to log in
                                alert("Account registered successfully! Please sign in using your credentials.");
                                isSignUpMode = false;
                                loginTitle.textContent = "Welcome";
                                loginSubtitle.textContent = "Please sign in to continue";
                                btnSubmit.textContent = "Sign In";
                                signupPromptEl.innerHTML = `Don't have an account? <a href="#" id="toggle-signup-link">Sign up</a>`;
                                document.getElementById("toggle-signup-link").addEventListener("click", handleToggleSignup);
                                passwordInput.value = "";
                            }
                        } else {
                            // Sign in success
                            localStorage.setItem("userEmail", usernameOrEmail);
                            localStorage.setItem("isLoggedIn", "true");
                            loginView.style.opacity = "0";
                            setTimeout(() => {
                                loginView.style.display = "none";
                                loginView.style.opacity = "1";
                                appView.style.display = "block";
                                btnNavSignout.style.display = "inline-block";
                                fetchDevices();
                            }, 500);
                        }
                    }, 1000);
                }
            } else {
                const errorData = await res.json();
                const msg = errorData.error_description || errorData.message || "Authentication failed.";
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
            btnSubmit.textContent = isSignUpMode ? "Sign Up" : "Sign In";
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

    // AI Prediction selectors
    const aiHealthDial = document.getElementById("ai-health-dial");
    const aiHealthVal = document.getElementById("ai-health-val");
    const aiRiskVal = document.getElementById("ai-risk-val");
    const aiExplanations = document.getElementById("ai-explanations");
    const aiShapContribs = document.getElementById("ai-shap-contribs");
    const aiRulVal = document.getElementById("ai-rul-val");

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

        // Simulate AI Health Prediction
        const simHealth = 94.5;
        aiHealthDial.style.setProperty("--percent", Math.round(simHealth));
        aiHealthVal.textContent = `${simHealth}%`;
        aiRiskVal.textContent = "Low";
        aiRiskVal.className = "risk-badge low";
        aiRulVal.textContent = "34.0 Months";
        aiExplanations.innerHTML = "<li>All metrics within nominal limits</li>";
        aiShapContribs.innerHTML = "<li>• cpu_temperature: -3.2%</li><li>• gpu_temperature: -2.3%</li>";
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

        // Update real-time AI Health Prediction
        const pred = payload.health_prediction;
        if (pred && pred.health !== undefined) {
            aiHealthDial.style.setProperty("--percent", Math.round(pred.health));
            aiHealthVal.textContent = `${pred.health}%`;
            aiRiskVal.textContent = pred.risk || "Low";
            
            // Risk styling class
            const riskLower = (pred.risk || "low").toLowerCase();
            aiRiskVal.className = `risk-badge ${riskLower}`;
            
            // Render RUL
            if (pred.remaining_useful_life_months !== undefined) {
                aiRulVal.textContent = `${pred.remaining_useful_life_months} Months`;
            } else {
                // Estimate client-side as fallback if not in database
                const baseRul = 36.0;
                const calcRul = (baseRul * Math.pow(pred.health / 100.0, 1.5)).toFixed(1);
                aiRulVal.textContent = `${calcRul} Months`;
            }
            
            // Render explanations
            const explList = pred.explanations || ["All metrics within nominal limits"];
            aiExplanations.innerHTML = explList.map(e => `<li>${e}</li>`).join("");
            
            // Render SHAP contributions
            const shapDict = pred.shap_contributions || {};
            const shapKeys = Object.keys(shapDict);
            if (shapKeys.length > 0) {
                aiShapContribs.innerHTML = shapKeys.map(k => `<li>• ${k.replace('_', ' ')}: ${shapDict[k]}%</li>`).join("");
            } else {
                aiShapContribs.innerHTML = "<li>None (100% healthy)</li>";
            }
        } else {
            aiHealthDial.style.setProperty("--percent", 100);
            aiHealthVal.textContent = "N/A";
            aiRiskVal.textContent = "Unknown";
            aiRiskVal.className = "risk-badge low";
            aiRulVal.textContent = "N/A";
            aiExplanations.innerHTML = "<li>Waiting for first background telemetry scan...</li>";
            aiShapContribs.innerHTML = "<li>Waiting for first background telemetry scan...</li>";
        }
    }

    /**
     * Fetches user device mapping UUIDs from Supabase device_mappings table.
     */
    async function fetchUserDeviceMappings(email) {
        if (!email) return [];
        const emailLower = email.toLowerCase();

        // Admin sees all devices
        if (emailLower.includes("admin")) {
            return null;
        }

        try {
            const supabase_key = "sb_publishable_huLEhuc-J4bal6hQRkPf5w_O16MKv6V";
            const res = await fetch(`https://lonsqhuudhiffjitmcbh.supabase.co/rest/v1/device_mappings?username=eq.${encodeURIComponent(emailLower)}`, {
                headers: {
                    "apikey": supabase_key
                }
            });
            if (!res.ok) return [];
            const mappings = await res.json();
            return mappings.map(m => m.device_uuid);
        } catch (err) {
            console.error("Error fetching device mappings:", err);
            return [];
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
            
            // Filter list of devices based on database user-device mappings
            const loggedInEmail = localStorage.getItem("userEmail") || "";
            const allowedUuids = await fetchUserDeviceMappings(loggedInEmail);
            
            let filteredData = data;
            if (allowedUuids !== null) {
                // Auto-associate based on matching agent_email inside payload
                data.forEach(row => {
                    const devEmail = (row.payload?.system?.agent_email || "").toLowerCase();
                    if (devEmail === loggedInEmail.toLowerCase() && !allowedUuids.includes(row.device_uuid)) {
                        console.log("Auto-mapping device via agent email config:", row.device_name, "to", loggedInEmail);
                        allowedUuids.push(row.device_uuid);
                        
                        // Async write to database to persist this link permanently
                        fetch("https://lonsqhuudhiffjitmcbh.supabase.co/rest/v1/device_mappings", {
                            method: "POST",
                            headers: {
                                "apikey": supabase_key,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                username: loggedInEmail,
                                device_uuid: row.device_uuid
                            })
                        }).catch(err => console.error("Error persisting auto-mapping:", err));
                    }
                });

                // If there are no mappings in the database yet, try to auto-associate based on email prefix
                if (allowedUuids.length === 0) {
                    const prefix = loggedInEmail.split("@")[0].toLowerCase();
                    const matchedDevice = data.find(row => {
                        const devName = (row.device_name || "").toLowerCase();
                        const winUser = (row.payload?.system?.username || "").toLowerCase();
                        return devName.includes(prefix) || winUser.includes(prefix) || prefix.includes(winUser);
                    });

                    if (matchedDevice) {
                        console.log("Auto-mapping device:", matchedDevice.device_name, "to", loggedInEmail);
                        allowedUuids.push(matchedDevice.device_uuid);
                        
                        // Async write to database to persist this link permanently
                        fetch("https://lonsqhuudhiffjitmcbh.supabase.co/rest/v1/device_mappings", {
                            method: "POST",
                            headers: {
                                "apikey": supabase_key,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                username: loggedInEmail,
                                device_uuid: matchedDevice.device_uuid
                            })
                        }).catch(err => console.error("Error persisting auto-mapping:", err));
                    }
                }
                filteredData = data.filter(row => allowedUuids.includes(row.device_uuid));
            }
            
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

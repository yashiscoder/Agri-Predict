document.addEventListener('DOMContentLoaded', () => {
    // element blendding 
    const sliderN = document.getElementById('sliderN');
    const sliderP = document.getElementById('sliderP');
    const sliderK = document.getElementById('sliderK');
    const sliderPH = document.getElementById('sliderPH');
    const sliderTemp = document.getElementById('sliderTemp');
    const sliderHumidity = document.getElementById('sliderHumidity');
    const sliderRainfall = document.getElementById('sliderRainfall');

    const valN = document.getElementById('val-n');
    const valP = document.getElementById('val-p');
    const valK = document.getElementById('val-k');
    const valPH = document.getElementById('val-ph');
    const valTemp = document.getElementById('val-temp');
    const valHum = document.getElementById('val-hum');
    const valRain = document.getElementById('val-rain');

    const recommendBtn = document.getElementById('recommend-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnIcon = document.getElementById('btn-icon');

    const resultsPlaceholder = document.getElementById('results-placeholder');
    const resultsCard = document.getElementById('results-card');
    const cropNameEl = document.getElementById('crop-name');
    const cropDescEl = document.getElementById('cropDescription');
    const confidenceScoreEl = document.getElementById('confidenceScore');
    const confidenceBarEl = document.getElementById('confidenceBar');
    const categoryBadge = document.getElementById('categoryBadge');
    const cropSeasonEl = document.getElementById('cropSeason');
    const cropSoilEl = document.getElementById('cropSoil');
    const cropMarketTrendEl = document.getElementById('cropMarketTrend');
    const proTipText = document.getElementById('proTipText');
    const predictionModelTag = document.getElementById('predictionModelTag');

    const alternativesSection = document.getElementById('alternativesSection');
    const alternativesList = document.getElementById('alternativesList');

    const btnFetchWeather = document.getElementById('btnFetchWeather');
    const weatherSummary = document.getElementById('weatherSummary');
    const btnNewAnalysis = document.getElementById('btnNewAnalysis');

    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const headerTitle = document.getElementById('headerTitle');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const globalSearchInput = document.getElementById('globalSearchInput');

    let currentPrediction = null;
    let analyticsChart = null;
    let historyLogs = JSON.parse(localStorage.getItem('agripredict_history') || '[]');
    let cropDataset = [];

    const API_BASE = (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))
        ? ''
        : 'https://agri-predict-n3fa.onrender.com';

    // Initialize Canvas Weather Animation & ML Status Check
    initWeatherCanvas();
    checkMlBackendStatus();
    loadCropsDataset();

    async function loadCropsDataset() {
        try {
            const res = await fetch(`${API_BASE}/api/crops`);
            if (res.ok) {
                cropDataset = await res.json();
                renderCropGuide();
            }
        } catch (e) {
            console.error("Failed to load crops catalog from server:", e);
        }
    }

    // api check
    async function checkMlBackendStatus() {
        const badge = document.getElementById('mlModelBadge');
        try {
            const res = await fetch(`${API_BASE}/api/status`);
            if (res.ok) {
                const data = await res.json();
                if (badge && data.model_file && data.model_file !== 'None') {
                    badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span> ML Model: ${data.model_file}`;
                    badge.classList.remove('hidden');
                    badge.classList.add('inline-flex');
                }
            }
        } catch (e) {
            console.error("Backend status check failed: Cannot reach Python .pkl model server.", e);
        }
    }

    // 2. Real-time Range Slider Event Syncing
    function syncSliderDisplays() {
        if (sliderN && valN) valN.innerHTML = `${sliderN.value} <span class="text-xs">mg/kg</span>`;
        if (sliderP && valP) valP.innerHTML = `${sliderP.value} <span class="text-xs">mg/kg</span>`;
        if (sliderK && valK) valK.innerHTML = `${sliderK.value} <span class="text-xs">mg/kg</span>`;
        if (sliderPH && valPH) valPH.innerText = parseFloat(sliderPH.value).toFixed(1);
        if (sliderTemp && valTemp) valTemp.innerHTML = `${sliderTemp.value} <span class="text-xs">°C</span>`;
        if (sliderHumidity && valHum) valHum.innerHTML = `${sliderHumidity.value} <span class="text-xs">%</span>`;
        if (sliderRainfall && valRain) valRain.innerHTML = `${sliderRainfall.value} <span class="text-xs">mm</span>`;
    }

    [sliderN, sliderP, sliderK, sliderPH, sliderTemp, sliderHumidity, sliderRainfall].forEach(slider => {
        if (slider) {
            slider.addEventListener('input', () => {
                syncSliderDisplays();
                updateDynamicProTip();
            });
        }
    });

    syncSliderDisplays();

    // 3. Preset Scenarios Handler
    const presets = {
        paddy: { N: 80, P: 40, K: 40, pH: 6.5, temp: 24, humidity: 82, rainfall: 230 },
        arid: { N: 40, P: 68, K: 80, pH: 7.3, temp: 19, humidity: 17, rainfall: 80 },
        fruit: { N: 23, P: 133, K: 200, pH: 6.0, temp: 24, humidity: 82, rainfall: 70 },
        coffee: { N: 101, P: 28, K: 30, pH: 6.8, temp: 25, humidity: 58, rainfall: 158 }
    };

    document.querySelectorAll('.preset-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.dataset.preset;
            if (presets[key]) {
                const p = presets[key];
                sliderN.value = p.N;
                sliderP.value = p.P;
                sliderK.value = p.K;
                sliderPH.value = p.pH;
                sliderTemp.value = p.temp;
                sliderHumidity.value = p.humidity;
                sliderRainfall.value = p.rainfall;

                syncSliderDisplays();
                showToast(`Loaded scenario preset: ${btn.textContent.trim()}`);
                executeRecommendation(true);
            }
        });
    });

    // 4. Trigger Recommendation Execution
    if (recommendBtn) {
        recommendBtn.addEventListener('click', () => {
            executeRecommendation(true);
        });
    }

    if (btnNewAnalysis) {
        btnNewAnalysis.addEventListener('click', () => {
            sliderN.value = 80;
            sliderP.value = 40;
            sliderK.value = 40;
            sliderPH.value = 6.5;
            sliderTemp.value = 24;
            sliderHumidity.value = 82;
            sliderRainfall.value = 230;
            syncSliderDisplays();

            if (resultsCard) resultsCard.classList.add('hidden');
            if (resultsPlaceholder) resultsPlaceholder.classList.remove('hidden');
            if (alternativesSection) alternativesSection.classList.add('hidden');

            showToast('Form reset to default baseline parameters');
        });
    }

    function getInputValues() {
        return {
            N: parseFloat(sliderN.value) || 0,
            P: parseFloat(sliderP.value) || 0,
            K: parseFloat(sliderK.value) || 0,
            pH: parseFloat(sliderPH.value) || 7.0,
            temp: parseFloat(sliderTemp.value) || 25,
            humidity: parseFloat(sliderHumidity.value) || 60,
            rainfall: parseFloat(sliderRainfall.value) || 100
        };
    }

    async function executeRecommendation(animate = true) {
        const inputData = getInputValues();

        if (animate && recommendBtn) {
            recommendBtn.disabled = true;
            btnText.innerText = 'Evaluating ML Model...';
            btnIcon.classList.add('hidden');
            btnSpinner.classList.remove('hidden');
        }

        try {
            const response = await fetch(`${API_BASE}/api/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inputData)
            });

            if (response.ok) {
                const apiResult = await response.json();
                if (apiResult.success && apiResult.crop) {
                    const result = {
                        topCrop: apiResult.crop_profile || {
                            name: apiResult.crop.toUpperCase(),
                            category: "ML Predicted Crop",
                            season: "Optimal Season",
                            soilType: "Suitable Soil",
                            marketTrend: "+14.5%",
                            description: `Machine Learning recommendation generated from model '${apiResult.model_source}'.`
                        },
                        confidenceScore: apiResult.confidenceScore || "98.0",
                        alternatives: apiResult.alternatives || [],
                        modelSource: apiResult.model_source
                    };

                    if (animate && recommendBtn) {
                        setTimeout(() => {
                            renderPredictionResult(result, inputData);
                            resetRecommendBtn();
                            showToast(`🤖 ML Model (.pkl): ${result.topCrop.name} (${result.confidenceScore}% Fit)`);
                        }, 600);
                    } else {
                        renderPredictionResult(result, inputData);
                    }
                    return;
                } else {
                    throw new Error(apiResult.error || "Failed to get prediction from ML model");
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server returned HTTP ${response.status}`);
            }
        } catch (err) {
            console.error("Prediction Error:", err);
            if (animate && recommendBtn) {
                resetRecommendBtn();
            }
            showToast(`❌ Prediction Error: ${err.message || 'Unable to connect to Python .pkl model server.'}`);
        }
    }

    function resetRecommendBtn() {
        if (recommendBtn) {
            recommendBtn.disabled = false;
            btnText.innerText = 'Recommend Crop';
            btnIcon.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }

    function renderPredictionResult(result, inputData) {
        currentPrediction = result;
        const crop = result.topCrop;

        // Hide waiting placeholder, show active result card
        if (resultsPlaceholder) resultsPlaceholder.classList.add('hidden');
        if (resultsCard) {
            resultsCard.classList.remove('hidden');
            resultsCard.classList.remove('scale-95', 'opacity-0');
            resultsCard.classList.add('scale-100', 'opacity-100');
        }

        if (cropNameEl) cropNameEl.innerText = crop.name;
        if (cropDescEl) cropDescEl.innerText = crop.description;
        if (confidenceScoreEl) confidenceScoreEl.innerText = `${result.confidenceScore}% Fit`;
        if (confidenceBarEl) confidenceBarEl.style.width = `${result.confidenceScore}%`;

        if (categoryBadge) categoryBadge.innerText = crop.category;
        if (cropSeasonEl) cropSeasonEl.innerText = crop.season;
        if (cropSoilEl) cropSoilEl.innerText = crop.soilType;
        if (cropMarketTrendEl) cropMarketTrendEl.innerText = crop.marketTrend;

        if (predictionModelTag) {
            predictionModelTag.innerText = result.modelSource ? `🤖 Inferred via ${result.modelSource}` : 'Calculated via Agronomy Scoring Engine';
        }

        // Render alternative crop suggestions
        if (alternativesSection && alternativesList) {
            if (result.alternatives && result.alternatives.length > 0) {
                alternativesSection.classList.remove('hidden');
                alternativesList.innerHTML = result.alternatives.map(alt => `
                <div class="glass-card p-md rounded-xl flex items-center justify-between hover:scale-[1.02] transition-transform">
                    <div class="flex items-center gap-md">
                        <div class="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm border border-secondary/20">
                            ${alt.confidenceScore}%
                        </div>
                        <div>
                            <h5 class="font-headline-md text-headline-md font-bold text-primary">${alt.name}</h5>
                            <p class="text-xs text-on-surface-variant">${alt.category || 'Agricultural Crop'}</p>
                        </div>
                    </div>
                    <span class="text-xs font-semibold text-secondary px-3 py-1 bg-secondary-fixed rounded-full">${alt.season || 'Seasonal'}</span>
                </div>
            `).join('');
            } else {
                alternativesSection.classList.add('hidden');
            }
        }

        updateDynamicProTip(crop);
        saveToHistory(inputData, crop, result.confidenceScore);

        // Smooth scroll to results
        if (resultsCard) {
            resultsCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }



    function updateDynamicProTip(topCrop = null) {
        const inputData = getInputValues();
        let advice = "";

        if (inputData.pH < 6.0) {
            advice = `Your current soil pH of ${inputData.pH} is moderately acidic. Applying agricultural lime can enhance Nitrogen and Phosphorus uptake for ${topCrop ? topCrop.name : 'cereal crops'}.`;
        } else if (inputData.pH > 7.5) {
            advice = `Soil pH of ${inputData.pH} indicates alkaline conditions. Adding organic compost or sulfur can improve Micronutrient availability.`;
        } else {
            advice = `Your current pH of ${inputData.pH} is in the optimal neutral range. Nutrient absorption efficiency for Nitrogen and Potassium is operating at maximum potential.`;
        }

        if (proTipText) proTipText.innerText = advice;
    }

    // 5. Weather Fetching Simulation
    if (btnFetchWeather) {
        btnFetchWeather.addEventListener('click', () => {
            const simulatedTemp = Math.floor(Math.random() * 15) + 18;
            const simulatedHum = Math.floor(Math.random() * 35) + 55;
            const simulatedRain = Math.floor(Math.random() * 180) + 80;

            sliderTemp.value = simulatedTemp;
            sliderHumidity.value = simulatedHum;
            sliderRainfall.value = simulatedRain;

            syncSliderDisplays();
            showToast(`Fetched telemetry data: ${simulatedTemp}°C, ${simulatedHum}% Humidity, ${simulatedRain}mm Rain`);

            if (weatherSummary) {
                weatherSummary.innerText = `Simulated local micro-climate: ${simulatedTemp}°C, ${simulatedHum}% RH, ${simulatedRain}mm Precipitation`;
            }
        });
    }

    // 6. Navigation Tab Switching
    navTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = tab.dataset.tab;

            navTabs.forEach(t => {
                t.classList.remove('active', 'text-secondary', 'font-bold', 'border-r-4', 'border-secondary', 'bg-surface-container-high');
                t.classList.add('text-on-surface-variant');
            });
            tab.classList.remove('text-on-surface-variant');
            tab.classList.add('active', 'text-secondary', 'font-bold', 'border-r-4', 'border-secondary', 'bg-surface-container-high');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${targetTab}Tab`) {
                    content.classList.add('active');
                }
            });

            if (headerTitle) {
                const titles = {
                    dashboard: 'Predictor',
                    analytics: 'Soil Analytics',
                    history: 'History Log',
                    guide: 'Crop Catalog'
                };
                headerTitle.innerText = titles[targetTab] || 'Predictor';
            }

            if (targetTab === 'analytics') {
                renderAnalyticsChart();
                renderNPKBalanceBars();
            } else if (targetTab === 'history') {
                renderHistoryTable();
            } else if (targetTab === 'guide') {
                renderCropGuide();
            }
        });
    });

    // 7. Chart.js Radar Chart
    function renderAnalyticsChart() {
        const ctx = document.getElementById('radarChart');
        if (!ctx) return;

        const inputDataObj = getInputValues();
        const crop = (currentPrediction && currentPrediction.topCrop) ? currentPrediction.topCrop : (cropDataset[0] || {
            name: "RICE",
            category: "Cereal",
            ideal: { N: 80, P: 40, K: 40, pH: 6.5, temp: 24, humidity: 82, rainfall: 230 }
        });

        const inputVals = [
            inputDataObj.N,
            inputDataObj.P,
            inputDataObj.K,
            inputDataObj.pH * 10,
            inputDataObj.temp,
            inputDataObj.humidity,
            inputDataObj.rainfall / 2
        ];

        const idealVals = [
            crop.ideal ? crop.ideal.N : 80,
            crop.ideal ? crop.ideal.P : 40,
            crop.ideal ? crop.ideal.K : 40,
            crop.ideal ? crop.ideal.pH * 10 : 65,
            crop.ideal ? crop.ideal.temp : 24,
            crop.ideal ? crop.ideal.humidity : 82,
            crop.ideal ? crop.ideal.rainfall / 2 : 115
        ];

        if (analyticsChart) {
            analyticsChart.destroy();
        }

        analyticsChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)', 'pH (x10)', 'Temp (°C)', 'Humidity (%)', 'Rainfall (/2)'],
                datasets: [
                    {
                        label: 'Current Input Profile',
                        data: inputVals,
                        backgroundColor: 'rgba(17, 108, 74, 0.25)',
                        borderColor: '#116c4a',
                        borderWidth: 2,
                        pointBackgroundColor: '#116c4a'
                    },
                    {
                        label: `Optimal Target (${crop.name})`,
                        data: idealVals,
                        backgroundColor: 'rgba(1, 45, 29, 0.1)',
                        borderColor: '#012d1d',
                        borderWidth: 2,
                        borderDash: [4, 4],
                        pointBackgroundColor: '#012d1d'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(0,0,0,0.1)' },
                        grid: { color: 'rgba(0,0,0,0.08)' },
                        pointLabels: { font: { family: 'Inter', size: 11, weight: '600' } }
                    }
                },
                plugins: {
                    legend: { position: 'top', labels: { font: { family: 'Inter', weight: '600' } } }
                }
            }
        });
    }

    function renderNPKBalanceBars() {
        const input = getInputValues();

        const nBar = document.getElementById('nBar');
        const pBar = document.getElementById('pBar');
        const kBar = document.getElementById('kBar');
        const phBar = document.getElementById('phBar');
        const phStatus = document.getElementById('phStatus');

        if (nBar) nBar.style.width = `${Math.min(100, (input.N / 140) * 100)}%`;
        if (pBar) pBar.style.width = `${Math.min(100, (input.P / 145) * 100)}%`;
        if (kBar) kBar.style.width = `${Math.min(100, (input.K / 205) * 100)}%`;
        if (phBar) phBar.style.width = `${Math.min(100, (input.pH / 14) * 100)}%`;
        if (phStatus) phStatus.innerText = `pH ${input.pH.toFixed(1)}`;
    }

    // 8. History Log Storage & Table
    function saveToHistory(inputs, topCrop, confidence) {
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            inputs: inputs,
            crop: topCrop.name,
            confidence: confidence,
            soilType: topCrop.soilType,
            season: topCrop.season
        };

        historyLogs.unshift(logEntry);
        if (historyLogs.length > 30) historyLogs.pop();
        localStorage.setItem('agripredict_history', JSON.stringify(historyLogs));
    }

    function renderHistoryTable() {
        const tableBody = document.getElementById('historyTableBody');
        if (!tableBody) return;

        if (historyLogs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-on-surface-variant">No analysis history recorded yet. Run a recommendation from the Dashboard!</td></tr>`;
            return;
        }

        tableBody.innerHTML = historyLogs.map(log => `
        <tr class="hover:bg-surface-container-low/50 transition-colors">
            <td class="py-3 px-4 font-mono text-xs text-on-surface-variant">${log.timestamp}</td>
            <td class="py-3 px-4 font-bold text-primary">${log.crop}</td>
            <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full bg-secondary-fixed text-primary font-bold text-xs">${log.confidence}% Fit</span></td>
            <td class="py-3 px-4 text-xs font-medium">N:${log.inputs.N} P:${log.inputs.P} K:${log.inputs.K}</td>
            <td class="py-3 px-4 text-xs font-medium">${log.inputs.pH}</td>
            <td class="py-3 px-4 text-xs text-on-surface-variant">${log.inputs.temp}°C / ${log.inputs.humidity}% / ${log.inputs.rainfall}mm</td>
        </tr>
    `).join('');
    }

    // Export CSV Handler
    const btnExportCSV = document.getElementById('btnExportCSV');
    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', () => {
            if (historyLogs.length === 0) {
                showToast('No history records to export');
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,Timestamp,Crop,Fit Score,N,P,K,pH,Temp,Humidity,Rainfall\n";
            historyLogs.forEach(l => {
                csvContent += `"${l.timestamp}","${l.crop}","${l.confidence}%",${l.inputs.N},${l.inputs.P},${l.inputs.K},${l.inputs.pH},${l.inputs.temp},${l.inputs.humidity},${l.inputs.rainfall}\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `agripredict_history_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('CSV History Log downloaded');
        });
    }

    // 9. Crop Guide / Catalog
    function renderCropGuide(filterText = '') {
        const grid = document.getElementById('cropCatalogGrid');
        if (!grid) return;

        const filtered = cropDataset.filter(c =>
            c.name.toLowerCase().includes(filterText.toLowerCase()) ||
            c.category.toLowerCase().includes(filterText.toLowerCase()) ||
            c.soilType.toLowerCase().includes(filterText.toLowerCase())
        );

        grid.innerHTML = filtered.map(crop => `
        <div class="glass-card p-md rounded-xl flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-headline-md text-headline-md font-bold text-primary">${crop.name}</h4>
                    <span class="text-xs px-2.5 py-1 bg-tertiary-fixed text-primary font-bold rounded-full">${crop.category}</span>
                </div>
                <p class="text-xs text-on-surface-variant mb-4">${crop.description}</p>
                
                <div class="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div class="bg-surface-container-low p-2 rounded">
                        <span class="text-outline block">Ideal N-P-K</span>
                        <span class="font-bold text-primary">${crop.ideal.N}-${crop.ideal.P}-${crop.ideal.K}</span>
                    </div>
                    <div class="bg-surface-container-low p-2 rounded">
                        <span class="text-outline block">Ideal pH</span>
                        <span class="font-bold text-primary">${crop.ideal.pH}</span>
                    </div>
                    <div class="bg-surface-container-low p-2 rounded">
                        <span class="text-outline block">Temp & Humidity</span>
                        <span class="font-bold text-primary">${crop.ideal.temp}°C / ${crop.ideal.humidity}%</span>
                    </div>
                    <div class="bg-surface-container-low p-2 rounded">
                        <span class="text-outline block">Rainfall</span>
                        <span class="font-bold text-primary">${crop.ideal.rainfall} mm</span>
                    </div>
                </div>
            </div>

            <div class="border-t border-outline-variant/30 pt-3 flex justify-between items-center text-xs">
                <span class="text-on-surface-variant font-medium">🌱 ${crop.soilType}</span>
                <span class="font-bold text-secondary">${crop.season}</span>
            </div>
        </div>
    `).join('');
    }

    const cropSearchInput = document.getElementById('cropSearchInput');
    if (cropSearchInput) {
        cropSearchInput.addEventListener('input', (e) => {
            renderCropGuide(e.target.value);
        });
    }

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.trim().length > 0) {
                const guideTabBtn = document.querySelector('[data-tab="guide"]');
                if (guideTabBtn) guideTabBtn.click();
                if (cropSearchInput) cropSearchInput.value = query;
                renderCropGuide(query);
            }
        });
    }

    // 10. Weather Canvas Radar Simulation Animation
    function initWeatherCanvas() {
        const canvas = document.getElementById('weatherCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        function resize() {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        let angle = 0;
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(centerX, centerY) - 10;

            ctx.strokeStyle = 'rgba(17, 108, 74, 0.15)';
            ctx.lineWidth = 1;

            for (let r = 20; r <= radius; r += 25) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
            ctx.strokeStyle = 'rgba(17, 108, 74, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, angle - 0.4, angle);
            ctx.closePath();
            ctx.fillStyle = 'rgba(17, 108, 74, 0.08)';
            ctx.fill();

            angle += 0.02;
            requestAnimationFrame(draw);
        }

        draw();
    }

    // Theme Toggle Handler
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            showToast(`Switched to ${isDark ? 'Dark' : 'Light'} Mode`);
        });
    }

    // Helper Toast Function
    function showToast(message) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span class="material-symbols-outlined text-base">info</span> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
});

/**
 * SOS Client — Main logic for querying, filtering, display, map, and charts
 * Handles: spatial subsetting, temporal subsetting, comparison filters,
 *          data tables, Leaflet map, Chart.js visualizations
 */

(function () {
    'use strict';

    // ─── State ──────────────────────────────────────────────────────
    const sosState = {
        currentResults: [],
        selectedSensorId: null,
        leafletMap: null,
        markerLayer: null,
        markers: {},
        highlightedMarker: null,
        charts: { bar: null, pie: null, line: null }
    };

    // Wait for DOM
    document.addEventListener('DOMContentLoaded', initSOS);

    function initSOS() {
        // SOS DOM elements
        const el = {
            operationSelect: document.getElementById('sosOperationSelect'),
            sensorSelect: document.getElementById('sosSensorSelect'),
            paramChecks: document.querySelectorAll('.sos-param-check'),
            // Spatial
            bboxNorth: document.getElementById('sosBboxNorth'),
            bboxSouth: document.getElementById('sosBboxSouth'),
            bboxEast: document.getElementById('sosBboxEast'),
            bboxWest: document.getElementById('sosBboxWest'),
            spatialType: document.getElementById('sosSpatialType'),
            containLat: document.getElementById('sosContainLat'),
            containLon: document.getElementById('sosContainLon'),
            containRadius: document.getElementById('sosContainRadius'),
            bboxGroup: document.getElementById('sosBboxGroup'),
            containGroup: document.getElementById('sosContainGroup'),
            // Temporal
            temporalType: document.getElementById('sosTemporalType'),
            afterDate: document.getElementById('sosAfterDate'),
            duringStart: document.getElementById('sosDuringStart'),
            duringEnd: document.getElementById('sosDuringEnd'),
            afterGroup: document.getElementById('sosAfterGroup'),
            duringGroup: document.getElementById('sosDuringGroup'),
            // Comparison filter
            filterProp: document.getElementById('sosFilterProp'),
            filterOp: document.getElementById('sosFilterOp'),
            filterVal1: document.getElementById('sosFilterVal1'),
            filterVal2: document.getElementById('sosFilterVal2'),
            filterVal2Group: document.getElementById('sosFilterVal2Group'),
            // Buttons
            btnExecute: document.getElementById('sosBtnExecute'),
            // Output
            resultCount: document.getElementById('sosResultCount'),
            tableBody: document.getElementById('sosTableBody'),
            xmlOutput: document.getElementById('sosXmlOutput'),
            sensormlOutput: document.getElementById('sosSensormlOutput'),
            // Bottom tabs
            bottomTabs: document.getElementById('sosBottomTabs')
        };

        if (!el.operationSelect) return; // SOS tab not present

        // ─── Populate Sensor Dropdown ───────────────────────────────
        populateSensorDropdown(el);

        // ─── Initialize Leaflet Map ─────────────────────────────────
        initLeafletMap();

        // ─── Event Listeners ────────────────────────────────────────
        // Spatial type toggle
        el.spatialType.addEventListener('change', () => {
            if (el.spatialType.value === 'bbox') {
                el.bboxGroup.style.display = 'block';
                el.containGroup.style.display = 'none';
            } else {
                el.bboxGroup.style.display = 'none';
                el.containGroup.style.display = 'block';
            }
        });

        // Temporal type toggle
        el.temporalType.addEventListener('change', () => {
            if (el.temporalType.value === 'after') {
                el.afterGroup.style.display = 'block';
                el.duringGroup.style.display = 'none';
            } else {
                el.afterGroup.style.display = 'none';
                el.duringGroup.style.display = 'block';
            }
        });

        // Filter operator toggle (show second value for "Between")
        el.filterOp.addEventListener('change', () => {
            el.filterVal2Group.style.display = el.filterOp.value === 'between' ? 'block' : 'none';
        });

        // Operation change: show/hide relevant sections
        el.operationSelect.addEventListener('change', () => {
            const op = el.operationSelect.value;
            document.getElementById('sosFiltersSection').style.display = op === 'GetObservation' ? 'block' : 'none';
            document.getElementById('sosSensorSelectGroup').style.display = (op === 'DescribeSensor') ? 'block' : 'none';

            // For GetCapabilities, sensor select is optional; for DescribeSensor, mandatory
            if (op === 'GetCapabilities') {
                el.sensorSelect.value = '';
            }
        });

        // ─── Execute Button ─────────────────────────────────────────
        el.btnExecute.addEventListener('click', () => executeQuery(el));

        // Trigger default spatial/temporal view
        el.spatialType.dispatchEvent(new Event('change'));
        el.temporalType.dispatchEvent(new Event('change'));
        el.filterOp.dispatchEvent(new Event('change'));
        el.operationSelect.dispatchEvent(new Event('change'));
    }

    // ─── Populate Sensor Dropdown ───────────────────────────────────
    function populateSensorDropdown(el) {
        let options = '<option value="">All Sensors</option>';
        SOS_SENSORS.forEach(s => {
            options += `<option value="${s.id}">${s.shortName} (${s.city})</option>`;
        });
        el.sensorSelect.innerHTML = options;
    }

    // ─── Leaflet Map ────────────────────────────────────────────────
    function initLeafletMap() {
        // India centered
        sosState.leafletMap = L.map('sosMap', {
            zoomControl: true,
            scrollWheelZoom: true
        }).setView([22.5, 79.0], 5);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(sosState.leafletMap);

        sosState.markerLayer = L.layerGroup().addTo(sosState.leafletMap);

        // Add all sensors as default markers
        addAllSensorMarkers();

        // Fix Leaflet rendering issue when map is in a hidden tab
        const sosTab = document.getElementById('sos-tab');
        if (sosTab) {
            sosTab.addEventListener('shown.bs.tab', () => {
                setTimeout(() => {
                    sosState.leafletMap.invalidateSize();
                }, 200);
            });
        }
    }

    function addAllSensorMarkers() {
        sosState.markerLayer.clearLayers();
        sosState.markers = {};

        SOS_SENSORS.forEach(sensor => {
            const marker = L.circleMarker([sensor.lat, sensor.lon], {
                radius: 9,
                fillColor: '#6366f1',
                color: '#312e81',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(createSensorPopup(sensor));
            marker.bindTooltip(sensor.shortName, { direction: 'top', offset: [0, -10] });
            marker.addTo(sosState.markerLayer);
            sosState.markers[sensor.id] = marker;
        });
    }

    function createSensorPopup(sensor, obsData) {
        let html = `
            <div style="min-width:200px; font-family: 'Inter', sans-serif;">
                <h6 style="margin:0 0 4px 0; color:#312e81; font-weight:700;">${sensor.shortName}</h6>
                <p style="margin:0 0 8px 0; color:#64748b; font-size:11px;">${sensor.description}</p>
                <table style="width:100%; font-size:12px; border-collapse:collapse;">
                    <tr><td style="color:#94a3b8;">City</td><td style="font-weight:600;">${sensor.city}, ${sensor.state}</td></tr>
                    <tr><td style="color:#94a3b8;">Manufacturer</td><td>${sensor.manufacturer} ${sensor.model}</td></tr>
                    <tr><td style="color:#94a3b8;">Coordinates</td><td>${sensor.lat.toFixed(4)}, ${sensor.lon.toFixed(4)}</td></tr>`;

        if (obsData) {
            html += `
                    <tr><td colspan="2" style="padding-top:6px; border-top:1px solid #e2e8f0;"></td></tr>
                    <tr><td style="color:#ef4444;">🌡️ Temp</td><td><b>${obsData.temperature}°C</b></td></tr>
                    <tr><td style="color:#3b82f6;">💧 Humidity</td><td><b>${obsData.humidity}%</b></td></tr>
                    <tr><td style="color:#10b981;">💨 Wind</td><td><b>${obsData.windSpeed} km/h</b></td></tr>
                    <tr><td style="color:#f59e0b;">🏭 PM2.5</td><td><b>${obsData.pm25} µg/m³</b></td></tr>
                    <tr><td style="color:#94a3b8;">Time</td><td style="font-size:10px;">${new Date(obsData.timestamp).toLocaleString()}</td></tr>`;
        }

        html += `</table></div>`;
        return html;
    }

    // ─── Query Execution ────────────────────────────────────────────
    function executeQuery(el) {
        const operation = el.operationSelect.value;

        switch (operation) {
            case 'GetCapabilities':
                executeGetCapabilities(el);
                break;
            case 'DescribeSensor':
                executeDescribeSensor(el);
                break;
            case 'GetObservation':
                executeGetObservation(el);
                break;
        }
    }

    function executeGetCapabilities(el) {
        const xml = SOS_XML.generateGetCapabilities();
        showXmlTab(el, xml);

        // Show result count
        el.resultCount.textContent = `${SOS_SENSORS.length} sensors found in capabilities`;
        el.resultCount.style.display = 'block';

        // Build capabilities table
        let tableHtml = '';
        SOS_SENSORS.forEach((s, i) => {
            tableHtml += `
                <tr class="sos-table-row" data-sensor-id="${s.id}" style="cursor:pointer;">
                    <td>${i + 1}</td>
                    <td><span class="badge bg-indigo-subtle text-indigo">${s.shortName}</span></td>
                    <td>${s.city}</td>
                    <td>${s.state}</td>
                    <td>${s.lat.toFixed(4)}</td>
                    <td>${s.lon.toFixed(4)}</td>
                    <td>${s.manufacturer} ${s.model}</td>
                    <td>
                        <span class="badge bg-danger-subtle text-danger">🌡️</span>
                        <span class="badge bg-primary-subtle text-primary">💧</span>
                        <span class="badge bg-success-subtle text-success">💨</span>
                        <span class="badge bg-warning-subtle text-warning">🏭</span>
                    </td>
                </tr>`;
        });

        // Set specialized header
        document.getElementById('sosTableHead').innerHTML = `
            <tr>
                <th>#</th><th>Station</th><th>City</th><th>State</th>
                <th>Lat</th><th>Lon</th><th>Instrument</th><th>Parameters</th>
            </tr>`;
        el.tableBody.innerHTML = tableHtml;

        // Add click handlers for table → map
        bindCapabilitiesTableClicks();

        // Reset map to all sensors
        addAllSensorMarkers();

        // Switch to table tab
        showTab('sosTableTab');
    }

    function executeDescribeSensor(el) {
        const sensorId = el.sensorSelect.value;
        if (!sensorId) {
            showToast('Please select a sensor for DescribeSensor operation', 'warning');
            return;
        }

        const xml = SOS_XML.generateDescribeSensor(sensorId);
        showXmlTab(el, xml, 'sensorml');

        const sensor = SOS_SENSORS.find(s => s.id === sensorId);
        el.resultCount.textContent = `SensorML for: ${sensor.shortName}`;
        el.resultCount.style.display = 'block';

        // Zoom map to sensor
        const marker = sosState.markers[sensorId];
        if (marker) {
            sosState.leafletMap.setView(marker.getLatLng(), 12, { animate: true });
            marker.openPopup();
            highlightMarker(sensorId);
        }

        // Switch to SensorML tab
        showTab('sosSensormlTab');
    }

    function executeGetObservation(el) {
        // Start with all observations
        let filtered = [...SOS_OBSERVATIONS];

        // ── Sensor filter ────────────────────────────────────────
        const sensorId = el.sensorSelect.value;
        if (sensorId) {
            filtered = filtered.filter(o => o.sensorId === sensorId);
        }

        // ── Spatial filter ───────────────────────────────────────
        const spatialType = el.spatialType.value;
        if (spatialType === 'bbox') {
            const north = parseFloat(el.bboxNorth.value);
            const south = parseFloat(el.bboxSouth.value);
            const east = parseFloat(el.bboxEast.value);
            const west = parseFloat(el.bboxWest.value);

            if (!isNaN(north) && !isNaN(south) && !isNaN(east) && !isNaN(west)) {
                filtered = filtered.filter(o =>
                    o.lat >= south && o.lat <= north &&
                    o.lon >= west && o.lon <= east
                );
            }
        } else if (spatialType === 'contains') {
            const cLat = parseFloat(el.containLat.value);
            const cLon = parseFloat(el.containLon.value);
            const radius = parseFloat(el.containRadius.value);

            if (!isNaN(cLat) && !isNaN(cLon) && !isNaN(radius)) {
                filtered = filtered.filter(o => {
                    const dist = haversineDistance(cLat, cLon, o.lat, o.lon);
                    return dist <= radius;
                });
            }
        }

        // ── Temporal filter ──────────────────────────────────────
        const temporalType = el.temporalType.value;
        if (temporalType === 'after') {
            const afterDate = el.afterDate.value;
            if (afterDate) {
                const afterTs = new Date(afterDate).getTime();
                filtered = filtered.filter(o => new Date(o.timestamp).getTime() > afterTs);
            }
        } else if (temporalType === 'during') {
            const startDate = el.duringStart.value;
            const endDate = el.duringEnd.value;
            if (startDate && endDate) {
                const startTs = new Date(startDate).getTime();
                const endTs = new Date(endDate).getTime();
                filtered = filtered.filter(o => {
                    const t = new Date(o.timestamp).getTime();
                    return t >= startTs && t <= endTs;
                });
            }
        }

        // ── Comparison filter ────────────────────────────────────
        const filterProp = el.filterProp.value;
        const filterOp = el.filterOp.value;
        const filterVal1 = parseFloat(el.filterVal1.value);
        const filterVal2 = parseFloat(el.filterVal2.value);

        if (filterProp && filterOp && !isNaN(filterVal1)) {
            const propField = SOS_OBSERVED_PROPERTIES.find(p => p.name === filterProp)?.field;
            if (propField) {
                switch (filterOp) {
                    case 'equalto':
                        filtered = filtered.filter(o => o[propField] === filterVal1);
                        break;
                    case 'notequalto':
                        filtered = filtered.filter(o => o[propField] !== filterVal1);
                        break;
                    case 'lessthan':
                        filtered = filtered.filter(o => o[propField] < filterVal1);
                        break;
                    case 'greaterthan':
                        filtered = filtered.filter(o => o[propField] > filterVal1);
                        break;
                    case 'between':
                        if (!isNaN(filterVal2)) {
                            const lo = Math.min(filterVal1, filterVal2);
                            const hi = Math.max(filterVal1, filterVal2);
                            filtered = filtered.filter(o => o[propField] >= lo && o[propField] <= hi);
                        }
                        break;
                }
            }
        }

        // Sort by timestamp descending
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Limit to 500 for performance
        const displayLimit = 500;
        const totalFiltered = filtered.length;
        const displayData = filtered.slice(0, displayLimit);

        // Store current results
        sosState.currentResults = displayData;

        // ── Generate XML from filtered observations ──────────────
        const xml = SOS_XML.generateGetObservation(displayData);

        // ── Parse XML back to table data (demonstrates XML parsing) ──
        const parsedFromXml = SOS_XML.parseGetObservationXML(xml);

        // Show XML
        showXmlTab(el, xml);

        // Result count
        el.resultCount.textContent = `${totalFiltered} observations found` +
            (totalFiltered > displayLimit ? ` (showing first ${displayLimit})` : '');
        el.resultCount.style.display = 'block';

        // ── Build table from parsed XML data ─────────────────────
        document.getElementById('sosTableHead').innerHTML = `
            <tr>
                <th>#</th><th>Station</th><th>Timestamp</th>
                <th>Temp (°C)</th><th>Humidity (%)</th>
                <th>Wind (km/h)</th><th>PM2.5 (µg/m³)</th>
                <th>Lat</th><th>Lon</th>
            </tr>`;

        let tableHtml = '';
        parsedFromXml.forEach((row, i) => {
            const pm25Class = getPM25Class(row.pm25);
            // Find sensor id from name
            const obsOriginal = displayData[i];
            tableHtml += `
                <tr class="sos-table-row sos-obs-row" data-index="${i}" data-sensor-id="${obsOriginal ? obsOriginal.sensorId : ''}" style="cursor:pointer;">
                    <td>${i + 1}</td>
                    <td><span class="badge bg-indigo-subtle text-indigo">${row.station.replace(' Monitoring Station', '')}</span></td>
                    <td class="text-nowrap">${formatTimestamp(row.timestamp)}</td>
                    <td>${row.temperature}</td>
                    <td>${row.humidity}</td>
                    <td>${row.windSpeed}</td>
                    <td><span class="badge ${pm25Class}">${row.pm25}</span></td>
                    <td>${row.lat.toFixed(4)}</td>
                    <td>${row.lon.toFixed(4)}</td>
                </tr>`;
        });
        el.tableBody.innerHTML = tableHtml;

        // ── Bind table row clicks → map marker ───────────────────
        bindObservationTableClicks();

        // ── Update map markers ───────────────────────────────────
        updateMapMarkers(displayData);

        // ── Update charts ────────────────────────────────────────
        updateCharts(displayData);

        // Switch to table tab
        showTab('sosTableTab');
    }

    // ─── Map Marker Update ──────────────────────────────────────────
    function updateMapMarkers(observations) {
        sosState.markerLayer.clearLayers();
        sosState.markers = {};

        // Group by sensor
        const sensorObs = {};
        observations.forEach(obs => {
            if (!sensorObs[obs.sensorId]) sensorObs[obs.sensorId] = [];
            sensorObs[obs.sensorId].push(obs);
        });

        Object.entries(sensorObs).forEach(([sensorId, obs]) => {
            const sensor = SOS_SENSORS.find(s => s.id === sensorId);
            if (!sensor) return;

            // Latest observation for this sensor
            const latest = obs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

            // Color marker based on PM2.5 level
            const pm25Color = getPM25MarkerColor(latest.pm25);

            const marker = L.circleMarker([sensor.lat, sensor.lon], {
                radius: 10,
                fillColor: pm25Color,
                color: '#1e1b4b',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            });

            marker.bindPopup(createSensorPopup(sensor, latest));
            marker.bindTooltip(`${sensor.shortName}: PM2.5 ${latest.pm25}`, { direction: 'top', offset: [0, -10] });
            marker.addTo(sosState.markerLayer);
            sosState.markers[sensorId] = marker;
        });

        // Fit bounds to markers
        if (Object.keys(sosState.markers).length > 0) {
            const group = L.featureGroup(Object.values(sosState.markers));
            sosState.leafletMap.fitBounds(group.getBounds().pad(0.2), { animate: true });
        }
    }

    // ─── Table → Map Interaction (BONUS) ────────────────────────────
    function bindObservationTableClicks() {
        document.querySelectorAll('.sos-obs-row').forEach(row => {
            row.addEventListener('click', () => {
                const index = parseInt(row.getAttribute('data-index'));
                const sensorId = row.getAttribute('data-sensor-id');
                const obs = sosState.currentResults[index];

                // Highlight row
                document.querySelectorAll('.sos-obs-row').forEach(r => r.classList.remove('sos-row-active'));
                row.classList.add('sos-row-active');

                // Update map marker
                const sensor = SOS_SENSORS.find(s => s.id === sensorId);
                if (sensor && sosState.markers[sensorId]) {
                    const marker = sosState.markers[sensorId];

                    // Zoom and open popup with this observation's data
                    sosState.leafletMap.setView(marker.getLatLng(), 10, { animate: true });
                    marker.setPopupContent(createSensorPopup(sensor, obs));
                    marker.openPopup();

                    highlightMarker(sensorId);
                }
            });
        });
    }

    function bindCapabilitiesTableClicks() {
        document.querySelectorAll('.sos-table-row[data-sensor-id]').forEach(row => {
            row.addEventListener('click', () => {
                const sensorId = row.getAttribute('data-sensor-id');

                document.querySelectorAll('.sos-table-row').forEach(r => r.classList.remove('sos-row-active'));
                row.classList.add('sos-row-active');

                const marker = sosState.markers[sensorId];
                if (marker) {
                    sosState.leafletMap.setView(marker.getLatLng(), 12, { animate: true });
                    marker.openPopup();
                    highlightMarker(sensorId);
                }
            });
        });
    }

    function highlightMarker(sensorId) {
        // Reset previous highlight
        if (sosState.highlightedMarker && sosState.markers[sosState.highlightedMarker]) {
            sosState.markers[sosState.highlightedMarker].setStyle({ weight: 2, radius: 10 });
        }

        // Highlight new
        if (sosState.markers[sensorId]) {
            sosState.markers[sensorId].setStyle({ weight: 4, radius: 14 });
            sosState.highlightedMarker = sensorId;
        }
    }

    // ─── Charts ─────────────────────────────────────────────────────
    function updateCharts(observations) {
        if (!observations || observations.length === 0) return;

        // Group by city
        const cityData = {};
        observations.forEach(obs => {
            if (!cityData[obs.city]) {
                cityData[obs.city] = { count: 0, tempSum: 0, humSum: 0, windSum: 0, pm25Sum: 0 };
            }
            cityData[obs.city].count++;
            cityData[obs.city].tempSum += obs.temperature;
            cityData[obs.city].humSum += obs.humidity;
            cityData[obs.city].windSum += obs.windSpeed;
            cityData[obs.city].pm25Sum += obs.pm25;
        });

        const cities = Object.keys(cityData);
        const colors = [
            '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444',
            '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#64748b'
        ];

        // ── Bar Chart: Average values per city ────────────────────
        const barCtx = document.getElementById('sosBarChart');
        if (barCtx) {
            if (sosState.charts.bar) sosState.charts.bar.destroy();

            sosState.charts.bar = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: cities,
                    datasets: [
                        {
                            label: 'Avg Temperature (°C)',
                            data: cities.map(c => (cityData[c].tempSum / cityData[c].count).toFixed(1)),
                            backgroundColor: 'rgba(239, 68, 68, 0.7)',
                            borderColor: '#ef4444',
                            borderWidth: 1
                        },
                        {
                            label: 'Avg PM2.5 (µg/m³)',
                            data: cities.map(c => (cityData[c].pm25Sum / cityData[c].count).toFixed(1)),
                            backgroundColor: 'rgba(245, 158, 11, 0.7)',
                            borderColor: '#f59e0b',
                            borderWidth: 1
                        },
                        {
                            label: 'Avg Wind Speed (km/h)',
                            data: cities.map(c => (cityData[c].windSum / cityData[c].count).toFixed(1)),
                            backgroundColor: 'rgba(16, 185, 129, 0.7)',
                            borderColor: '#10b981',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Average Values by City', font: { size: 14, weight: 'bold' } },
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // ── Pie Chart: Observation count per city ─────────────────
        const pieCtx = document.getElementById('sosPieChart');
        if (pieCtx) {
            if (sosState.charts.pie) sosState.charts.pie.destroy();

            sosState.charts.pie = new Chart(pieCtx, {
                type: 'doughnut',
                data: {
                    labels: cities,
                    datasets: [{
                        data: cities.map(c => cityData[c].count),
                        backgroundColor: colors.slice(0, cities.length),
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Observations per Station', font: { size: 14, weight: 'bold' } },
                        legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, font: { size: 11 } } }
                    }
                }
            });
        }

        // ── Line Chart: Time series for first sensor in results ──
        const lineCtx = document.getElementById('sosLineChart');
        if (lineCtx) {
            if (sosState.charts.line) sosState.charts.line.destroy();

            // Get data for first sensor in the results
            const firstSensorId = observations[0]?.sensorId;
            const sensorObs = observations
                .filter(o => o.sensorId === firstSensorId)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            const sensorName = sensorObs[0]?.sensorName || 'Unknown';

            // Limit time series points to avoid clutter
            const step = Math.max(1, Math.floor(sensorObs.length / 50));
            const sampled = sensorObs.filter((_, i) => i % step === 0);

            sosState.charts.line = new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: sampled.map(o => {
                        const d = new Date(o.timestamp);
                        return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear().toString().slice(2)}`;
                    }),
                    datasets: [
                        {
                            label: 'PM2.5 (µg/m³)',
                            data: sampled.map(o => o.pm25),
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            fill: true,
                            tension: 0.3,
                            pointRadius: 2
                        },
                        {
                            label: 'Temperature (°C)',
                            data: sampled.map(o => o.temperature),
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            fill: false,
                            tension: 0.3,
                            pointRadius: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: `Time Series — ${sensorName}`, font: { size: 14, weight: 'bold' } },
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } }
                    },
                    scales: {
                        y: { beginAtZero: false, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: {
                            grid: { display: false },
                            ticks: { maxRotation: 45, font: { size: 10 } }
                        }
                    }
                }
            });
        }
    }

    // ─── Helper: Show XML Tab ───────────────────────────────────────
    function showXmlTab(el, xml, type = 'xml') {
        const formatted = SOS_XML.formatXml(xml);
        if (type === 'sensorml') {
            el.sensormlOutput.textContent = formatted;
        }
        el.xmlOutput.textContent = formatted;
    }

    function showTab(tabId) {
        const tabEl = document.getElementById(tabId);
        if (tabEl) {
            const tab = new bootstrap.Tab(tabEl);
            tab.show();
        }
    }

    // ─── Helper: Haversine distance (km) ────────────────────────────
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // ─── Helper: PM2.5 styling ──────────────────────────────────────
    function getPM25Class(val) {
        if (val <= 30) return 'bg-success';        // Good
        if (val <= 60) return 'bg-info text-dark'; // Satisfactory
        if (val <= 90) return 'bg-warning text-dark'; // Moderate
        if (val <= 120) return 'bg-orange';        // Poor
        if (val <= 250) return 'bg-danger';        // Very Poor
        return 'bg-dark';                           // Severe
    }

    function getPM25MarkerColor(val) {
        if (val <= 30) return '#22c55e';
        if (val <= 60) return '#06b6d4';
        if (val <= 90) return '#eab308';
        if (val <= 120) return '#f97316';
        if (val <= 250) return '#ef4444';
        return '#7c3aed';
    }

    function formatTimestamp(ts) {
        const d = new Date(ts);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }

    // ─── Toast helper ───────────────────────────────────────────────
    function showToast(message, type = 'info') {
        const container = document.getElementById('sosToastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast show align-items-center text-bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body fw-semibold">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

})();

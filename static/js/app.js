document.addEventListener("DOMContentLoaded", () => {
    const state = {
        capabilitiesDoc: null,
        wmsUrl: '',
        wfsCapabilitiesDoc: null,
        wfsUrl: '',
        layers: []
    };

    // DOM Elements
    const el = {
        urlInput: document.getElementById('serverUrl'),
        btnOk: document.getElementById('btnOk'),
        layerSelect: document.getElementById('layerSelect'),
        formatSelect: document.getElementById('formatSelect'),
        srsSelect: document.getElementById('srsSelect'),
        bboxTop: document.getElementById('bboxTop'),
        bboxLeft: document.getElementById('bboxLeft'),
        bboxRight: document.getElementById('bboxRight'),
        bboxBottom: document.getElementById('bboxBottom'),

        infoX: document.getElementById('infoX'),
        infoY: document.getElementById('infoY'),
        btnRun: document.getElementById('btnRun'),
        xmlPanel: document.getElementById('xmlResponseTextarea'),
        attrTableContainer: document.getElementById('attributeTableContainer'),
        btnClearXml: document.getElementById('btnClearXml'),
        btnToggleLog: document.getElementById('btnToggleLog'),
        layerList: document.getElementById('layerList'),
        noLayersMsg: document.getElementById('noLayersMsg'),
        loadingIndicator: document.getElementById('loadingIndicator'),
        mapCoords: document.getElementById('mapCoords'),
        mapOverlay: document.getElementById('mapOverlay'),
        // WFS Elements
        wfsUrlInput: document.getElementById('wfsServerUrl'),
        wfsBtnOk: document.getElementById('wfsBtnOk'),
        wfsLoadingIndicator: document.getElementById('wfsLoadingIndicator'),
        wfsLayerSelect: document.getElementById('wfsLayerSelect'),
        wfsFormatSelect: document.getElementById('wfsFormatSelect'),
        wfsSrsSelect: document.getElementById('wfsSrsSelect'),
        wfsBboxTop: document.getElementById('wfsBboxTop'),
        wfsBboxLeft: document.getElementById('wfsBboxLeft'),
        wfsBboxRight: document.getElementById('wfsBboxRight'),
        wfsBboxBottom: document.getElementById('wfsBboxBottom'),

        wfsBtnRun: document.getElementById('wfsBtnRun'),

        // SOS Elements
        sosUrlInput: document.getElementById('sosServerUrl'),
        sosBtnOk: document.getElementById('sosBtnOk'),
        sosLoadingIndicator: document.getElementById('sosLoadingIndicator'),
        sosRequestType: document.getElementById('sosRequestType'),
        sosProcedureSelect: document.getElementById('sosProcedureSelect'),
        sosParameter: document.getElementById('sosParameter'),
        sosSpatialGroup: document.getElementById('sosSpatialGroup'),
        sosTemporalGroup: document.getElementById('sosTemporalGroup'),
        sosFilterGroup: document.getElementById('sosFilterGroup'),
        sosBboxTop: document.getElementById('sosBboxTop'),
        sosBboxLeft: document.getElementById('sosBboxLeft'),
        sosBboxRight: document.getElementById('sosBboxRight'),
        sosBboxBottom: document.getElementById('sosBboxBottom'),
        sosTimeStart: document.getElementById('sosTimeStart'),
        sosTimeEnd: document.getElementById('sosTimeEnd'),
        sosFilterOp: document.getElementById('sosFilterOp'),
        sosFilterVal: document.getElementById('sosFilterVal'),
        sosBtnRun: document.getElementById('sosBtnRun')
    };

    // Mock SOS Database
    const sosDatabase = [
        { id: 1, station: "Station A (Delhi)", lat: 28.7041, lon: 77.1025, timestamp: "2026-04-20", PM2_5: 120, PM10: 150, Temperature: 32, Humidity: 45 },
        { id: 2, station: "Station B (Mumbai)", lat: 19.0760, lon: 72.8777, timestamp: "2026-04-21", PM2_5: 80, PM10: 110, Temperature: 30, Humidity: 70 },
        { id: 3, station: "Station C (Bengaluru)", lat: 12.9716, lon: 77.5946, timestamp: "2026-04-21", PM2_5: 45, PM10: 60, Temperature: 28, Humidity: 65 },
        { id: 4, station: "Station D (Chennai)", lat: 13.0827, lon: 80.2707, timestamp: "2026-04-22", PM2_5: 55, PM10: 75, Temperature: 33, Humidity: 75 },
        { id: 5, station: "Station E (Kolkata)", lat: 22.5726, lon: 88.3639, timestamp: "2026-04-23", PM2_5: 95, PM10: 130, Temperature: 34, Humidity: 80 },
        { id: 6, station: "Station F (Ahmedabad)", lat: 23.0225, lon: 72.5714, timestamp: "2026-04-23", PM2_5: 110, PM10: 140, Temperature: 36, Humidity: 40 },
        { id: 7, station: "Station G (Pune)", lat: 18.5204, lon: 73.8567, timestamp: "2026-04-24", PM2_5: 65, PM10: 90, Temperature: 31, Humidity: 60 }
    ];

    let currentChart = null;
    let sosVectorLayer = null;

    // Initialize OpenLayers Map with OSM Base
    const map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([0, 0]),
            zoom: 2
        }),
        controls: ol.control.defaults.defaults().extend([
            new ol.control.ZoomSlider(),
            new ol.control.FullScreen(),
            new ol.control.ScaleLine(),
            new ol.control.OverviewMap({ collapsed: true, collapsible: true }),
            new ol.control.ZoomToExtent()
        ])
    });

    // Popup Overlay
    const popupContainer = document.getElementById('popup');
    const popupContent = document.getElementById('popup-content');
    const popupCloser = document.getElementById('popup-closer');
    
    const popupOverlay = new ol.Overlay({
        element: popupContainer,
        autoPan: true,
        autoPanAnimation: { duration: 250 }
    });
    map.addOverlay(popupOverlay);

    if (popupCloser) {
        popupCloser.onclick = function() {
            popupOverlay.setPosition(undefined);
            popupCloser.blur();
            return false;
        };
    }

    // Update coordinates & feature info visually on hover
    map.on('pointermove', function (evt) {
        if (evt.dragging) return;

        // Show Coordinates
        const coords = ol.proj.toLonLat(evt.coordinate);
        el.mapCoords.textContent = `Lon: ${coords[0].toFixed(4)}, Lat: ${coords[1].toFixed(4)}`;

        // Update pixel loc
        el.infoX.value = Math.round(evt.pixel[0]);
        el.infoY.value = Math.round(evt.pixel[1]);
    });

    // SensorML 2.0 Generator
    function generateSensorML(station, param) {
        const uom = param === 'Temperature' ? '°C'
            : param === 'Humidity' ? '%'
            : param === 'PM2.5' ? 'µg/m³'
            : param === 'PM10' ? 'µg/m³'
            : 'unknown';
        const def = param === 'Temperature' ? 'http://www.opengis.net/def/property/OGC/0/Temperature'
            : param === 'Humidity'    ? 'http://www.opengis.net/def/property/OGC/0/RelativeHumidity'
            : param === 'PM2.5'       ? 'http://www.opengis.net/def/property/OGC/0/PM2.5'
            : param === 'PM10'        ? 'http://www.opengis.net/def/property/OGC/0/PM10'
            : 'http://www.opengis.net/def/property/OGC/0/Unknown';
        const id = station.station.replace(/[^a-zA-Z0-9]/g, '_');
        return `<?xml version="1.0" encoding="UTF-8"?>
<sml:PhysicalSystem
  xmlns:sml="http://www.opengis.net/sensorml/2.0"
  xmlns:swe="http://www.opengis.net/swe/2.0"
  xmlns:gml="http://www.opengis.net/gml/3.2"
  gml:id="sensor_${id}">
  <gml:identifier codeSpace="uid">urn:sos:sensor:${id}</gml:identifier>
  <gml:name>${station.station} - ${param} Sensor</gml:name>
  <sml:keywords>
    <sml:KeywordList>
      <sml:keyword>SOS</sml:keyword>
      <sml:keyword>Air Quality</sml:keyword>
      <sml:keyword>${param}</sml:keyword>
    </sml:KeywordList>
  </sml:keywords>
  <sml:identification>
    <sml:IdentifierList>
      <sml:identifier>
        <sml:Term definition="http://www.opengis.net/def/identifier/OGC/uniqueID">
          <sml:label>uniqueID</sml:label>
          <sml:value>urn:sos:sensor:${id}</sml:value>
        </sml:Term>
      </sml:identifier>
    </sml:IdentifierList>
  </sml:identification>
  <sml:outputs>
    <sml:OutputList>
      <sml:output name="${param}">
        <swe:Quantity definition="${def}">
          <swe:label>${param}</swe:label>
          <swe:uom code="${uom}"/>
        </swe:Quantity>
      </sml:output>
    </sml:OutputList>
  </sml:outputs>
  <sml:position>
    <swe:Vector referenceFrame="urn:ogc:def:crs:EPSG::4326">
      <swe:coordinate name="lat">
        <swe:Quantity axisID="Lat">
          <swe:uom code="deg"/>
          <swe:value>${station.lat}</swe:value>
        </swe:Quantity>
      </swe:coordinate>
      <swe:coordinate name="lon">
        <swe:Quantity axisID="Long">
          <swe:uom code="deg"/>
          <swe:value>${station.lon}</swe:value>
        </swe:Quantity>
      </swe:coordinate>
    </swe:Vector>
  </sml:position>
</sml:PhysicalSystem>`;
    }

    // Simple XML formatter helper
    function formatXml(xml) {
        let formatted = '';
        let pad = 0;
        xml = xml.replace(/(>)(<)(\/*)/g, '$1\r\n$2$3');
        const lines = xml.split('\r\n');

        lines.forEach(node => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                // Same line close tag
            } else if (node.match(/^<\/\w/)) {
                if (pad !== 0) pad -= 1;
            } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
                indent = 1;
            }
            formatted += '  '.repeat(pad) + node + '\r\n';
            pad += indent;
        });
        return formatted;
    }

    // Custom Logger
    function logXml(msg, isReset = false) {
        if (isReset) el.xmlPanel.value = "";
        const timestamp = new Date().toLocaleTimeString();
        el.xmlPanel.value += `\n[${timestamp}] ${msg}\n`;
        el.xmlPanel.scrollTop = el.xmlPanel.scrollHeight;
    }

    let logsVisible = true;

    function updateToggleLogBtn() {
        if (!el.btnToggleLog) return;
        if (logsVisible) {
            el.btnToggleLog.innerHTML = '<i class="bi bi-table me-1"></i> Table';
        } else {
            el.btnToggleLog.innerHTML = '<i class="bi bi-terminal me-1"></i> Logs';
        }
    }
    updateToggleLogBtn();

    if (el.btnToggleLog) {
        el.btnToggleLog.addEventListener('click', () => {
            logsVisible = !logsVisible;
            if (logsVisible) {
                el.xmlPanel.style.display = 'block';
                el.attrTableContainer.style.display = 'none';
            } else {
                el.xmlPanel.style.display = 'none';
                el.attrTableContainer.style.display = 'block';
            }
            updateToggleLogBtn();
        });
    }

    function showAttributeTable(properties, isCustomHtml = false) {
        // Switch panels: hide log, show attribute table
        el.xmlPanel.style.display = 'none';
        el.attrTableContainer.style.display = 'block';
        logsVisible = false;
        updateToggleLogBtn();
        
        let tableArea = document.getElementById('tableContentArea');
        if (!tableArea) {
            el.attrTableContainer.innerHTML = '<div id="tableContentArea"></div><div id="chartContainer" class="mt-4" style="display: none;"><canvas id="sosChart" style="max-height: 250px;"></canvas></div>';
            tableArea = document.getElementById('tableContentArea');
        }

        if (isCustomHtml) {
            tableArea.innerHTML = properties;
            const chartContainer = document.getElementById('chartContainer');
            if (chartContainer) chartContainer.style.display = 'none';
            return;
        }

        // Filter out geometry keys and OL geometry objects
        const filtered = {};
        if (properties) {
            for (const [key, value] of Object.entries(properties)) {
                if (key === 'geometry' || key === 'the_geom' || key === 'geom' || key === 'boundedBy') continue;
                if (value && typeof value === 'object' && typeof value.getType === 'function') continue;
                filtered[key] = value;
            }
        }

        if (Object.keys(filtered).length === 0) {
            if (tableArea) {
                tableArea.innerHTML = '<h6 class="text-muted text-center mt-3">No attributes found for this feature.</h6>';
                const chartContainer = document.getElementById('chartContainer');
                if (chartContainer) chartContainer.style.display = 'none';
            } else {
                el.attrTableContainer.innerHTML = '<h6 class="text-muted text-center mt-3">No attributes found for this feature.</h6>';
            }
            return;
        }

        let html = '<table class="table table-sm table-bordered table-striped mt-2"><thead class="table-dark"><tr><th>Attribute</th><th>Value</th></tr></thead><tbody>';
        for (const [key, value] of Object.entries(filtered)) {
            let valStr = (value === null || value === undefined) ? '' : value;
            if (typeof value === 'object') {
                try { valStr = JSON.stringify(value); } catch (e) { valStr = '[Object]'; }
            }
            if (typeof valStr === 'string') {
                valStr = valStr.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            html += `<tr><td class="fw-bold text-secondary text-truncate" style="max-width:140px;" title="${key}">${key}</td><td style="max-width:220px; word-break:break-word;" title="${valStr}">${valStr}</td></tr>`;
        }
        html += '</tbody></table>';
        tableArea.innerHTML = html;
        document.getElementById('chartContainer').style.display = 'none';
    }

    function updateLayerManagerUI() {
        if (state.layers.length === 0) {
            el.layerList.innerHTML = '<li class="list-group-item text-muted text-center py-4" id="noLayersMsg">No layers added yet.</li>';
            return;
        }

        el.layerList.innerHTML = '';
        state.layers.forEach((layer, index) => {
            const props = layer.getProperties();
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center py-2';

            const isChecked = layer.getVisible() ? 'checked' : '';
            let typeClass = 'secondary';
            if (props.type === 'WMS') typeClass = 'primary';
            else if (props.type === 'WFS') typeClass = 'success';
            else if (props.type === 'SOS') typeClass = 'warning text-dark';

            li.innerHTML = `
                <div class="d-flex align-items-center gap-2" style="width: 65%;">
                    <input class="form-check-input mt-0 layer-vis-toggle" type="checkbox" data-index="${index}" ${isChecked}>
                    <span class="badge bg-${typeClass}">${props.type}</span>
                    <span class="fw-medium text-truncate" style="font-size: 0.9rem;" title="${props.name}">${props.name}</span>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary py-0 px-1 layer-up" data-index="${index}" title="Move Up"><i class="bi bi-arrow-up-short border-0 fs-5"></i></button>
                    <button class="btn btn-outline-secondary py-0 px-1 layer-down" data-index="${index}" title="Move Down"><i class="bi bi-arrow-down-short border-0 fs-5"></i></button>
                    <button class="btn btn-outline-danger py-0 px-2 layer-remove" data-index="${index}" title="Remove"><i class="bi bi-x border-0 fs-5"></i></button>
                </div>
            `;
            el.layerList.appendChild(li);
        });

        const total = state.layers.length;
        state.layers.forEach((layer, idx) => {
            layer.setZIndex(total - idx);
        });

        document.querySelectorAll('.layer-vis-toggle').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                state.layers[idx].setVisible(e.target.checked);
            });
        });

        document.querySelectorAll('.layer-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                if (idx > 0) {
                    const temp = state.layers[idx];
                    state.layers[idx] = state.layers[idx - 1];
                    state.layers[idx - 1] = temp;
                    updateLayerManagerUI();
                }
            });
        });

        document.querySelectorAll('.layer-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                if (idx < state.layers.length - 1) {
                    const temp = state.layers[idx];
                    state.layers[idx] = state.layers[idx + 1];
                    state.layers[idx + 1] = temp;
                    updateLayerManagerUI();
                }
            });
        });

        document.querySelectorAll('.layer-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                map.removeLayer(state.layers[idx]);
                state.layers.splice(idx, 1);
                updateLayerManagerUI();
            });
        });
    }

    // GetCapabilities 
    el.btnOk.addEventListener('click', async () => {
        let url = el.urlInput.value.trim();
        if (!url) {
            alert("Please enter a valid WMS Server URL.");
            return;
        }

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "http://" + url;
            el.urlInput.value = url;
        }

        const getCapUrl = `${url}?request=GetCapabilities&service=WMS&version=1.3.0`;

        // UI States
        el.btnOk.disabled = true;
        el.loadingIndicator.classList.remove('d-none');
        el.layerSelect.innerHTML = '<option value="">Loading...</option>';
        el.layerSelect.disabled = true;
        el.btnRun.disabled = true;

        logXml(`Sending GetCapabilities request to:\n${url}`, true);

        try {
            const resp = await fetch(getCapUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

            const xmlText = await resp.text();

            logXml(`Received GetCapabilities response. Parsing XML...`);
            logXml(`${formatXml(xmlText)}`);

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Invalid XML returned.");
            }

            state.capabilitiesDoc = xmlDoc;
            state.wmsUrl = url;

            // Extract layers
            const layers = Array.from(xmlDoc.getElementsByTagName('Layer'));
            let validLayers = '<option value="" selected>-- Select a Layer --</option>';
            let count = 0;

            layers.forEach(layer => {
                let name = Array.from(layer.children).find(c => c.nodeName.includes('Name'));
                let title = Array.from(layer.children).find(c => c.nodeName.includes('Title'));

                if (name && name.textContent) {
                    validLayers += `<option value="${name.textContent}">${title ? title.textContent : name.textContent} (${name.textContent})</option>`;
                    count++;
                }
            });

            if (count > 0) {
                el.layerSelect.innerHTML = validLayers;
                el.layerSelect.disabled = false;
                logXml(`Successfully extracted ${count} layers from document.`);
            } else {
                el.layerSelect.innerHTML = '<option value="">No layers found</option>';
                logXml(`No layers found in GetCapabilities document.`);
            }

        } catch (err) {
            console.error(err);
            logXml(`Error: ${err.message}`);
            el.layerSelect.innerHTML = '<option value="">Error fetching</option>';
        } finally {
            el.btnOk.disabled = false;
            el.loadingIndicator.classList.add('d-none');
        }
    });

    // Layer Select -> Extract BBox
    el.layerSelect.addEventListener('change', () => {
        if (!el.layerSelect.value) {
            el.btnRun.disabled = true;
            return;
        }
        el.btnRun.disabled = false;

        const layerName = el.layerSelect.value;
        if (state.capabilitiesDoc) {
            const layers = Array.from(state.capabilitiesDoc.getElementsByTagName('Layer'));
            for (let l of layers) {
                let n = Array.from(l.children).find(c => c.nodeName.includes('Name'));
                if (n && n.textContent === layerName) {
                    // Try extracting bounding box
                    const bbox = Array.from(l.children).find(c => c.nodeName.includes('BoundingBox') && !c.nodeName.includes('CRS'));
                    if (bbox && bbox.nodeName.includes('EX_GeographicBoundingBox')) {
                        const west = bbox.getElementsByTagName('westBoundLongitude')[0]?.textContent;
                        const east = bbox.getElementsByTagName('eastBoundLongitude')[0]?.textContent;
                        const south = bbox.getElementsByTagName('southBoundLatitude')[0]?.textContent;
                        const north = bbox.getElementsByTagName('northBoundLatitude')[0]?.textContent;

                        if (west && east && south && north) {
                            el.bboxLeft.value = parseFloat(west).toFixed(4); // Min X
                            el.bboxRight.value = parseFloat(east).toFixed(4); // Max X
                            el.bboxBottom.value = parseFloat(south).toFixed(4); // Min Y
                            el.bboxTop.value = parseFloat(north).toFixed(4); // Max Y
                            logXml(`Extracted Bounding Box for ${layerName}: [W:${west}, S:${south}, E:${east}, N:${north}]`);
                        }
                    }
                }
            }
        }
    });

    // GetMap
    el.btnRun.addEventListener('click', () => {
        const layerName = el.layerSelect.value;
        if (!layerName) return;

        const format = el.formatSelect.value;
        const srs = el.srsSelect.value;
        const top = parseFloat(el.bboxTop.value);
        const left = parseFloat(el.bboxLeft.value);
        const bottom = parseFloat(el.bboxBottom.value);
        const right = parseFloat(el.bboxRight.value);

        logXml(`Executing GetMap for layer: ${layerName}`);

        const wmsSource = new ol.source.ImageWMS({
            url: state.wmsUrl,
            params: {
                'LAYERS': layerName,
                'FORMAT': format,
                'SRS': srs,
                'TRANSPARENT': true
            },
            serverType: 'geoserver'
        });

        const newLayer = new ol.layer.Image({
            source: wmsSource,
            opacity: 1.0,
            properties: { id: Date.now(), name: layerName, type: 'WMS' }
        });

        wmsSource.on('imageloadstart', () => { el.mapOverlay.style.display = 'block'; });
        wmsSource.on('imageloadend', () => { el.mapOverlay.style.display = 'none'; });
        wmsSource.on('imageloaderror', () => {
            el.mapOverlay.style.display = 'none';
            logXml(`Error: Failed to load ImageWMS layer.`);
        });

        map.addLayer(newLayer);
        state.layers.unshift(newLayer);
        updateLayerManagerUI();

        // Adjust view manually if BBox coords are provided.
        if (!isNaN(top) && !isNaN(left) && !isNaN(bottom) && !isNaN(right)) {
            try {
                const extent = ol.proj.transformExtent([left, bottom, right, top], 'EPSG:4326', map.getView().getProjection());
                map.getView().fit(extent, {
                    size: map.getSize(),
                    padding: [20, 20, 20, 20],
                    duration: 1000
                });
                logXml(`Map view fitted to coordinates: [${left}, ${bottom}, ${right}, ${top}]`);
            } catch (e) {
                console.log(e);
            }
        }
    });

    // GetFeatureInfo
    map.on('singleclick', async (evt) => {
        if (state.layers.length === 0) return;

        // Check if WFS or SOS feature clicked
        const feature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat, {
            hitTolerance: 5 // 5 pixels tolerance for easier clicking on lines/points
        });

        if (feature) {
            if (feature.get('sosIndex') !== undefined) {
                logXml(`SOS Feature Clicked. Showing popup.`);
                
                // Show Popup
                const content = `
                    <div style="font-family: Arial, sans-serif; min-width: 200px;">
                        <h6 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 0;">${feature.get('station')}</h6>
                        <p style="margin: 5px 0; font-size: 14px;"><strong>${feature.get('param')}:</strong> <span style="color: red; font-weight: bold;">${feature.get('value')}</span></p>
                        <p style="margin: 5px 0; font-size: 12px; color: #555;"><strong>Time:</strong> ${feature.get('timestamp')}</p>
                        <p style="margin: 5px 0; font-size: 12px; color: #555;"><strong>Lat/Lon:</strong> ${feature.get('fullData').lat}, ${feature.get('fullData').lon}</p>
                    </div>
                `;
                popupContent.innerHTML = content;
                popupContainer.style.display = 'block';
                popupOverlay.setPosition(evt.coordinate);
                return;
            } else {
                logXml(`WFS Feature Clicked. Showing attributes.`);
                popupOverlay.setPosition(undefined);
                showAttributeTable(feature.getProperties());
                return;
            }
        }
        
        popupOverlay.setPosition(undefined);

        // Check topmost WMS layer
        let topmostWmsLayer = null;
        for (let i = 0; i < state.layers.length; i++) {
            if (state.layers[i].getVisible() && state.layers[i].getProperties().type === 'WMS') {
                topmostWmsLayer = state.layers[i];
                break;
            }
        }

        if (topmostWmsLayer) {
            const viewResolution = map.getView().getResolution();
            const url = topmostWmsLayer.getSource().getFeatureInfoUrl(
                evt.coordinate,
                viewResolution,
                map.getView().getProjection(),
                { 'INFO_FORMAT': 'application/json' }
            );

            if (url) {
                try {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error("Feature Info Failed");
                    const json = await response.json();

                    if (json && json.features && json.features.length > 0) {
                        logXml(`WMS Feature Info Success.`);
                        showAttributeTable(json.features[0].properties);
                    } else {
                        logXml(`No WMS features found at this location.`);
                        showAttributeTable('<h6 class="text-muted text-center mt-3">No features matched at this point.</h6>', true);
                    }
                } catch (err) {
                    logXml(`Error getting WMS info: ${err.message}`);
                    showAttributeTable(`<h6 class="text-danger text-center mt-3">${err.message}</h6>`, true);
                }
            }
        } else {
            showAttributeTable('<h6 class="text-muted text-center mt-3">No visible features to query.</h6>', true);
        }
    });

    // WFS GetCapabilities 
    if (el.wfsBtnOk) {
        el.wfsBtnOk.addEventListener('click', async () => {
            let url = el.wfsUrlInput.value.trim();
            if (!url) {
                alert("Please enter a valid WFS Server URL.");
                return;
            }

            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url;
                el.wfsUrlInput.value = url;
            }

            const getCapUrl = `${url}?request=GetCapabilities&service=WFS&version=1.1.0`;

            // UI States
            el.wfsBtnOk.disabled = true;
            el.wfsLoadingIndicator.classList.remove('d-none');
            el.wfsLayerSelect.innerHTML = '<option value="">Loading...</option>';
            el.wfsLayerSelect.disabled = true;
            el.wfsBtnRun.disabled = true;

            logXml(`Sending WFS GetCapabilities request to:\n${url}`, true);

            try {
                const resp = await fetch(getCapUrl);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

                const xmlText = await resp.text();

                logXml(`Received WFS GetCapabilities response. Parsing XML...`);
                logXml(`${formatXml(xmlText)}`);

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                    throw new Error("Invalid XML returned.");
                }

                state.wfsCapabilitiesDoc = xmlDoc;
                state.wfsUrl = url;

                // Extract feature types
                const featureTypes = Array.from(xmlDoc.getElementsByTagName('FeatureType'));
                let validLayers = '<option value="" selected>-- Select a Feature Type --</option>';
                let count = 0;

                featureTypes.forEach(ft => {
                    let name = Array.from(ft.children).find(c => c.nodeName.includes('Name'));
                    let title = Array.from(ft.children).find(c => c.nodeName.includes('Title'));

                    if (name && name.textContent) {
                        validLayers += `<option value="${name.textContent}">${title ? title.textContent : name.textContent} (${name.textContent})</option>`;
                        count++;
                    }
                });

                if (count > 0) {
                    el.wfsLayerSelect.innerHTML = validLayers;
                    el.wfsLayerSelect.disabled = false;
                    logXml(`Successfully extracted ${count} FeatureTypes from document.`);
                } else {
                    el.wfsLayerSelect.innerHTML = '<option value="">No layers found</option>';
                    logXml(`No FeatureTypes found in WFS GetCapabilities document.`);
                }

            } catch (err) {
                console.error(err);
                logXml(`Error: ${err.message}`);
                el.wfsLayerSelect.innerHTML = '<option value="">Error fetching</option>';
            } finally {
                el.wfsBtnOk.disabled = false;
                el.wfsLoadingIndicator.classList.add('d-none');
            }
        });
    }

    // WFS Layer Select -> Extract BBox
    if (el.wfsLayerSelect) {
        el.wfsLayerSelect.addEventListener('change', () => {
            if (!el.wfsLayerSelect.value) {
                el.wfsBtnRun.disabled = true;
                return;
            }
            el.wfsBtnRun.disabled = false;

            const layerName = el.wfsLayerSelect.value;
            if (state.wfsCapabilitiesDoc) {
                const layers = Array.from(state.wfsCapabilitiesDoc.getElementsByTagName('FeatureType'));
                for (let l of layers) {
                    let n = Array.from(l.children).find(c => c.nodeName.includes('Name'));
                    if (n && n.textContent === layerName) {
                        // Try extracting bounding box in WFS
                        const bbox = Array.from(l.children).find(c => c.nodeName.includes('WGS84BoundingBox'));
                        if (bbox) {
                            const lower = bbox.getElementsByTagName('ows:LowerCorner')[0]?.textContent || bbox.getElementsByTagName('LowerCorner')[0]?.textContent;
                            const upper = bbox.getElementsByTagName('ows:UpperCorner')[0]?.textContent || bbox.getElementsByTagName('UpperCorner')[0]?.textContent;

                            if (lower && upper) {
                                const [west, south] = lower.split(' ');
                                const [east, north] = upper.split(' ');
                                el.wfsBboxLeft.value = parseFloat(west).toFixed(4);
                                el.wfsBboxRight.value = parseFloat(east).toFixed(4);
                                el.wfsBboxBottom.value = parseFloat(south).toFixed(4);
                                el.wfsBboxTop.value = parseFloat(north).toFixed(4);
                                logXml(`Extracted Bounding Box for ${layerName}: [W:${west}, S:${south}, E:${east}, N:${north}]`);
                            }
                        }
                    }
                }
            }
        });
    }

    // WFS GetFeature
    if (el.wfsBtnRun) {
        el.wfsBtnRun.addEventListener('click', async () => {
            const layerName = el.wfsLayerSelect.value;
            if (!layerName) return;

            const format = el.wfsFormatSelect.value;
            const srs = el.wfsSrsSelect.value;
            const top = parseFloat(el.wfsBboxTop.value);
            const left = parseFloat(el.wfsBboxLeft.value);
            const bottom = parseFloat(el.wfsBboxBottom.value);
            const right = parseFloat(el.wfsBboxRight.value);

            let reqUrl = `${state.wfsUrl}?request=GetFeature&service=WFS&version=1.1.0&typeName=${layerName}&outputFormat=${encodeURIComponent(format)}&srsName=${srs}`;

            if (!isNaN(top) && !isNaN(left) && !isNaN(bottom) && !isNaN(right)) {
                // If mapping, BBOX is minx,miny,maxx,maxy OR minX,minY,maxX,maxY,SRS
                reqUrl += `&bbox=${left},${bottom},${right},${top},EPSG:4326`;
                logXml(`Executing WFS GetFeature for layer: ${layerName} with BBox`);
            } else {
                logXml(`Executing WFS GetFeature for layer: ${layerName}`);
            }

            el.mapOverlay.style.display = 'block';

            try {
                const resp = await fetch(reqUrl);
                const text = await resp.text();

                logXml(`WFS GetFeature Response Received.\n`);
                if (format === 'application/json') {
                    try {
                        logXml(JSON.stringify(JSON.parse(text), null, 2));
                    } catch (e) {
                        logXml(text);
                    }
                } else {
                    logXml(formatXml(text));
                }

                // If GeoJSON, we can load it into the map
                if (format === 'application/json') {
                    const vectorSource = new ol.source.Vector({
                        features: new ol.format.GeoJSON().readFeatures(text, {
                            dataProjection: srs,
                            featureProjection: map.getView().getProjection()
                        })
                    });

                    const newLayer = new ol.layer.Vector({
                        source: vectorSource,
                        properties: { id: Date.now(), name: layerName, type: 'WFS' },
                        style: new ol.style.Style({
                            stroke: new ol.style.Stroke({
                                color: 'blue',
                                width: 2
                            }),
                            fill: new ol.style.Fill({
                                color: 'rgba(0, 0, 255, 0.1)'
                            }),
                            image: new ol.style.Circle({
                                radius: 5,
                                fill: new ol.style.Fill({ color: 'red' })
                            })
                        })
                    });

                    map.addLayer(newLayer);
                    state.layers.unshift(newLayer);
                    updateLayerManagerUI();

                    try {
                        const extent = vectorSource.getExtent();
                        if (!ol.extent.isEmpty(extent)) {
                            map.getView().fit(extent, {
                                padding: [50, 50, 50, 50],
                                duration: 1000
                            });
                            logXml(`Map view fitted to GeoJSON feature extent.`);
                        }
                    } catch (e) { console.log(e); }
                }

            } catch (err) {
                logXml(`Error running WFS GetFeature: ${err.message}`);
            } finally {
                el.mapOverlay.style.display = 'none';
            }
        });
    }

    // SOS Global Function for table row clicking
    window.highlightSosMarker = function(lat, lon) {
        if (!sosVectorLayer) return;
        const coord = ol.proj.fromLonLat([lon, lat]);
        
        const features = sosVectorLayer.getSource().getFeatures();
        let clickedFeat = null;
        for (let feat of features) {
            const geom = feat.getGeometry();
            const featCoord = geom.getCoordinates();
            if (Math.abs(featCoord[0] - coord[0]) < 100 && Math.abs(featCoord[1] - coord[1]) < 100) {
                clickedFeat = feat;
                break;
            }
        }
        
        if (clickedFeat) {
            // Animate map to location
            map.getView().animate({ center: coord, duration: 500, zoom: Math.max(map.getView().getZoom(), 6) });
            
            // Show Popup
            const content = `
                <div style="font-family: Arial, sans-serif; min-width: 200px;">
                    <h6 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 0;">${clickedFeat.get('station')}</h6>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>${clickedFeat.get('param')}:</strong> <span style="color: red; font-weight: bold;">${clickedFeat.get('value')}</span></p>
                    <p style="margin: 5px 0; font-size: 12px; color: #555;"><strong>Time:</strong> ${clickedFeat.get('timestamp')}</p>
                    <p style="margin: 5px 0; font-size: 12px; color: #555;"><strong>Lat/Lon:</strong> ${clickedFeat.get('fullData').lat}, ${clickedFeat.get('fullData').lon}</p>
                </div>
            `;
            popupContent.innerHTML = content;
            popupContainer.style.display = 'block'; // Ensure it's visible
            popupOverlay.setPosition(coord);
        }
    };

    // SOS UI Visibility Logic
    if (el.sosRequestType) {
        el.sosRequestType.addEventListener('change', () => {
            const type = el.sosRequestType.value;
            if (type === 'GetCapabilities') {
                el.sosProcedureSelect.parentElement.style.display = 'none';
                el.sosParameter.parentElement.style.display = 'none';
                el.sosSpatialGroup.style.display = 'none';
                el.sosTemporalGroup.style.display = 'none';
                el.sosFilterGroup.style.display = 'none';
            } else if (type === 'DescribeSensor') {
                el.sosProcedureSelect.parentElement.style.display = 'block';
                el.sosParameter.parentElement.style.display = 'none';
                el.sosSpatialGroup.style.display = 'none';
                el.sosTemporalGroup.style.display = 'none';
                el.sosFilterGroup.style.display = 'none';
            } else {
                el.sosProcedureSelect.parentElement.style.display = 'block';
                el.sosParameter.parentElement.style.display = 'block';
                el.sosSpatialGroup.style.display = 'block';
                el.sosTemporalGroup.style.display = 'block';
                el.sosFilterGroup.style.display = 'block';
            }
        });
        // Initial trigger
        el.sosRequestType.dispatchEvent(new Event('change'));
    }

    // SOS GetCapabilities (Triggered by OK button)
    if (el.sosBtnOk) {
        el.sosBtnOk.addEventListener('click', async () => {
            let url = el.sosUrlInput.value.trim();
            if (!url) {
                alert("Please enter a valid SOS Server URL.");
                return;
            }

            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url;
                el.sosUrlInput.value = url;
            }

            const getCapUrl = `${url}?request=GetCapabilities&service=SOS&version=1.0.0`;

            // UI States
            el.sosBtnOk.disabled = true;
            el.sosLoadingIndicator.classList.remove('d-none');
            el.sosProcedureSelect.innerHTML = '<option value="">Loading...</option>';
            el.sosProcedureSelect.disabled = true;
            el.sosBtnRun.disabled = true;

            logXml(`Sending SOS GetCapabilities request to:\n${url}`, true);

            try {
                const resp = await fetch(getCapUrl);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

                const xmlText = await resp.text();

                logXml(`Received SOS GetCapabilities response. Parsing XML...`);
                logXml(`${formatXml(xmlText)}`);

                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                    throw new Error("Invalid XML returned.");
                }

                // Extract Procedures from Offerings
                const offerings = Array.from(xmlDoc.getElementsByTagNameNS("*", 'ObservationOffering'));
                let procedures = new Set();
                
                offerings.forEach(off => {
                    const procNodes = Array.from(off.getElementsByTagNameNS("*", 'procedure'));
                    procNodes.forEach(p => {
                        let procName = p.getAttribute('xlink:href') || p.textContent;
                        if (procName) {
                            const parts = procName.split(':');
                            const simpleName = parts[parts.length - 1];
                            procedures.add(simpleName);
                        }
                    });
                });

                let options = '<option value="ALL" selected>-- All Procedures --</option>';
                procedures.forEach(p => {
                    options += `<option value="${p}">${p}</option>`;
                });

                if (procedures.size > 0) {
                    el.sosProcedureSelect.innerHTML = options;
                    el.sosProcedureSelect.disabled = false;
                    el.sosBtnRun.disabled = false;
                    logXml(`Successfully extracted ${procedures.size} procedures from document.`);
                } else {
                    el.sosProcedureSelect.innerHTML = '<option value="">No procedures found</option>';
                    logXml(`No procedures found in SOS GetCapabilities document.`);
                }

            } catch (err) {
                console.error(err);
                logXml(`Error: ${err.message}`);
                el.sosProcedureSelect.innerHTML = '<option value="">Error fetching</option>';
            } finally {
                el.sosBtnOk.disabled = false;
                el.sosLoadingIndicator.classList.add('d-none');
            }
        });
    }

    // Main SOS RUN Logic
    if (el.sosBtnRun) {
        el.sosBtnRun.addEventListener('click', async () => {
            const reqType = el.sosRequestType.value;
            const sosUrl = el.sosUrlInput.value.trim() || "http://localhost:8090/istsos/mumbai";

            if (reqType === 'GetCapabilities') {
                el.sosBtnOk.click(); // Reuse existing logic
                return;
            }

            const procedure = el.sosProcedureSelect.value;

            if (reqType === 'DescribeSensor') {
                if (!procedure || procedure === 'ALL') {
                    alert("Please select a specific procedure for DescribeSensor.");
                    return;
                }
                const url = `${sosUrl}?service=SOS&version=1.0.0&request=DescribeSensor&procedure=${procedure}&outputFormat=text/xml;subtype="sensorML/1.0.1"`;
                logXml(`Requesting SensorML for: ${procedure}`, true);
                try {
                    const response = await fetch(url);
                    const xml = await response.text();
                    logXml(formatXml(xml));
                    el.xmlPanel.style.display = 'block';
                    el.attrTableContainer.style.display = 'none';
                    logsVisible = true;
                    updateToggleLogBtn();
                } catch (err) { logXml(`Error: ${err.message}`); }
                return;
            }

            // GetObservation Logic
            const param = el.sosParameter.value; 
            const urnMapping = {
                'PM2.5': 'urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM2.5',
                'PM10': 'urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM10',
                'Temperature': 'urn:ogc:def:parameter:x-istsos:1.0:meteo:air:temperature',
                'Humidity': 'urn:ogc:def:parameter:x-istsos:1.0:meteo:air:humidity'
            };
            const dbParam = param;
            const observedProperty = urnMapping[param];

            const top = parseFloat(el.sosBboxTop.value);
            const left = parseFloat(el.sosBboxLeft.value);
            const bottom = parseFloat(el.sosBboxBottom.value);
            const right = parseFloat(el.sosBboxRight.value);

            const timeStart = el.sosTimeStart.value;
            const timeEnd = el.sosTimeEnd.value;

            const filterOp = el.sosFilterOp.value;
            const filterValStr = el.sosFilterVal.value.trim();

            logXml(`Fetching Mumbai SOS data for ${param}...`, true);
            
            let tableArea = document.getElementById('tableContentArea');
            if (!tableArea) {
                el.attrTableContainer.innerHTML = '<div id="tableContentArea"></div><div id="chartContainer" class="mt-4" style="display: none;"><canvas id="sosChart" style="max-height: 250px;"></canvas></div>';
                tableArea = document.getElementById('tableContentArea');
            }
            tableArea.innerHTML = '<div class="text-center mt-3"><div class="spinner-border spinner-border-sm text-primary"></div> Querying istSOS Server...</div>';
            document.getElementById('chartContainer').style.display = 'none';
            el.xmlPanel.style.display = 'none';
            el.attrTableContainer.style.display = 'block';

            try {
                let queryUrl = `${sosUrl}?service=SOS&version=1.0.0&request=GetObservation&offering=temporary&responseFormat=application/json&observedProperty=${observedProperty}`;
                
                if (procedure && procedure !== 'ALL') {
                    queryUrl += `&procedure=${procedure}`;
                }

                if (timeStart && timeEnd) {
                    queryUrl += `&eventTime=${timeStart}T00:00:00+05:30/${timeEnd}T23:59:59+05:30`;
                }

                logXml(`Request URL: ${queryUrl}`);
                const response = await fetch(queryUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                
                const json = await response.json();
                
                if (!json.ObservationCollection || !json.ObservationCollection.member) {
                    throw new Error("Invalid SOS response structure");
                }

                let allRecords = [];
                const stationsInfo = {
                    "Colaba": { lat: 18.9067, lon: 72.8147 },
                    "Bandra": { lat: 19.0596, lon: 72.8295 },
                    "Andheri": { lat: 19.1136, lon: 72.8697 },
                    "Powai": { lat: 19.1176, lon: 72.9060 },
                    "Dadar": { lat: 19.0178, lon: 72.8478 },
                    "Kurla": { lat: 19.0726, lon: 72.8844 },
                    "Chembur": { lat: 19.0522, lon: 72.8995 },
                    "Malad": { lat: 19.1864, lon: 72.8493 },
                    "Borivali": { lat: 19.2317, lon: 72.8524 },
                    "Thane": { lat: 19.2183, lon: 72.9781 }
                };

                json.ObservationCollection.member.forEach(m => {
                    const stationName = m.name;
                    const loc = stationsInfo[stationName] || { lat: 0, lon: 0 };
                    
                    if (m.result && m.result.DataArray && m.result.DataArray.values) {
                        m.result.DataArray.values.forEach(row => {
                            allRecords.push({
                                station: stationName,
                                lat: loc.lat,
                                lon: loc.lon,
                                timestamp: row[0],
                                [dbParam]: parseFloat(row[1])
                            });
                        });
                    }
                });

                let filteredData = allRecords;

                // Apply Spatial Filter
                if (!isNaN(top) && !isNaN(left) && !isNaN(bottom) && !isNaN(right)) {
                    filteredData = filteredData.filter(d => d.lat <= top && d.lat >= bottom && d.lon >= left && d.lon <= right);
                }
                
                // Apply Value Filter
                if (filterOp && filterValStr) {
                    const v = parseFloat(filterValStr);
                    if (!isNaN(v)) {
                        if (filterOp === 'EqualTo') filteredData = filteredData.filter(d => d[dbParam] === v);
                        else if (filterOp === 'LessThan') filteredData = filteredData.filter(d => d[dbParam] < v);
                        else if (filterOp === 'GreaterThan') filteredData = filteredData.filter(d => d[dbParam] > v);
                    }
                }

                logXml(`Successfully retrieved ${filteredData.length} records.`);

                displaySosMarkers(filteredData, param, dbParam);
                displaySosTable(filteredData, param, dbParam, false);
                displaySosChart(filteredData, param, dbParam);

            } catch (err) {
                logXml(`ERROR: ${err.message}`);
                tableArea.innerHTML = `<div class="alert alert-danger mt-3"><strong>SOS Error:</strong> ${err.message}<br><small>Ensure the istSOS server is running at http://localhost:8090</small></div>`;
            }
        });
    }


    function displaySosTable(data, paramName, dbParam, isFallback) {
        if (data.length === 0) {
            showAttributeTable('<h6 class="text-muted text-center mt-3">No observations matched your criteria.</h6>', true);
            document.getElementById('chartContainer').style.display = 'none';
            return;
        }

        let html = '<table class="table table-sm table-bordered table-hover mt-2"><thead class="table-dark"><tr>';
        html += '<th>Station</th><th>Lat</th><th>Lon</th><th>Time</th><th>' + paramName + '</th>';
        html += '</tr></thead><tbody>';
        
        // Limit table to 50 rows for performance, but show all in chart
        const displayData = data.slice(0, 50);
        displayData.forEach((d) => {
            const val = d[dbParam] !== undefined && d[dbParam] !== null ? d[dbParam] : 'N/A';
            const timeStr = d.timestamp.replace('T', ' ').split('+')[0];
            html += `<tr style="cursor:pointer;" onclick="window.highlightSosMarker(${d.lat}, ${d.lon})">
                <td>${d.station}</td><td>${d.lat}</td><td>${d.lon}</td><td style="font-size:0.8rem">${timeStr}</td><td class="fw-bold text-primary">${val}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        if (data.length > 50) html += `<p class="text-muted small text-center">Showing first 50 of ${data.length} records</p>`;
        
        showAttributeTable(html, true);
        document.getElementById('chartContainer').style.display = 'block';
    }

    function displaySosChart(data, paramName, dbParam) {
        const chartContainer = document.getElementById('chartContainer');
        if (data.length === 0) {
            chartContainer.style.display = 'none';
            return;
        }
        
        chartContainer.style.display = 'block';
        const ctx = document.getElementById('sosChart').getContext('2d');
        if (window.currentChart) {
            window.currentChart.destroy();
        }

        // Aggregate data for chart: average per station
        const stationAverages = {};
        data.forEach(d => {
            if (!stationAverages[d.station]) stationAverages[d.station] = { sum: 0, count: 0 };
            stationAverages[d.station].sum += d[dbParam];
            stationAverages[d.station].count += 1;
        });

        const labels = Object.keys(stationAverages);
        const values = labels.map(l => (stationAverages[l].sum / stationAverages[l].count).toFixed(2));

        window.currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Avg ${paramName}`,
                    data: values,
                    backgroundColor: 'rgba(13, 110, 253, 0.7)',
                    borderColor: 'rgb(13, 110, 253)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: `Average ${paramName} across Mumbai Stations` }
                }
            }
        });
    }

    function displaySosMarkers(data, paramName, dbParam) {
        if (sosVectorLayer) {
            map.removeLayer(sosVectorLayer);
            const idx = state.layers.indexOf(sosVectorLayer);
            if (idx > -1) state.layers.splice(idx, 1);
        }

        // Only show latest unique station markers on map to avoid clutter
        const latestByStation = {};
        data.forEach(d => {
            if (!latestByStation[d.station] || new Date(d.timestamp) > new Date(latestByStation[d.station].timestamp)) {
                latestByStation[d.station] = d;
            }
        });

        const features = Object.values(latestByStation).map((d, idx) => {
            const feat = new ol.Feature({
                geometry: new ol.geom.Point(ol.proj.fromLonLat([d.lon, d.lat])),
                station: d.station,
                param: paramName,
                value: d[dbParam],
                timestamp: d.timestamp,
                sosIndex: idx,
                fullData: d
            });
            return feat;
        });

        const vectorSource = new ol.source.Vector({ features: features });
        sosVectorLayer = new ol.layer.Vector({
            source: vectorSource,
            properties: { id: Date.now(), name: `SOS: ${paramName}`, type: 'SOS' },
            style: new ol.style.Style({
                image: new ol.style.Circle({
                    radius: 10,
                    fill: new ol.style.Fill({ color: '#0dcaf0' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
                })
            })
        });

        map.addLayer(sosVectorLayer);
        state.layers.unshift(sosVectorLayer);
        updateLayerManagerUI();

        if (features.length > 0) {
            try {
                const extent = vectorSource.getExtent();
                map.getView().fit(extent, { padding: [100, 100, 100, 100], maxZoom: 12, duration: 1000 });
            } catch (e) { console.log(e); }
        }
    }


    // Clear Panel
    el.btnClearXml.addEventListener('click', () => el.xmlPanel.value = "");
});

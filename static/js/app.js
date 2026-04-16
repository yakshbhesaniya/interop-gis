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

        wfsBtnRun: document.getElementById('wfsBtnRun')
    };

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

    // Max characters to log into the textarea (prevents freeze on huge responses)
    const LOG_MAX_CHARS = 200000; // ~200 KB
    const WFS_MAX_FEATURES = 5000; // cap WFS GetFeature requests
    const FETCH_TIMEOUT_MS = 30000; // 30 second timeout

    // Fetch with timeout to prevent indefinite hangs
    function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { ...options, signal: controller.signal })
            .finally(() => clearTimeout(timer));
    }

    // Simple XML formatter helper — capped to prevent freeze on huge XML
    function formatXml(xml) {
        if (xml.length > LOG_MAX_CHARS) {
            // Only format a truncated preview
            xml = xml.substring(0, LOG_MAX_CHARS);
        }
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

    // Truncate-safe logger — avoids dumping megabytes into the textarea
    function logXmlSafe(content, label = 'Response') {
        if (content.length > LOG_MAX_CHARS) {
            logXml(`${label} is very large (${(content.length / 1024).toFixed(0)} KB). Showing first ${(LOG_MAX_CHARS / 1024).toFixed(0)} KB...`);
            logXml(formatXml(content.substring(0, LOG_MAX_CHARS)) + '\n\n... [TRUNCATED] ...');
        } else {
            logXml(formatXml(content));
        }
    }

    // Custom Logger — with total size cap to prevent accumulation freezes
    function logXml(msg, isReset = false) {
        if (isReset) el.xmlPanel.value = "";
        const timestamp = new Date().toLocaleTimeString();
        el.xmlPanel.value += `\n[${timestamp}] ${msg}\n`;
        // Cap total textarea content to prevent memory issues over multiple queries
        const MAX_TEXTAREA = 500000; // 500 KB
        if (el.xmlPanel.value.length > MAX_TEXTAREA) {
            el.xmlPanel.value = '... [Earlier logs trimmed] ...\n' + el.xmlPanel.value.slice(-MAX_TEXTAREA);
        }
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

    function showAttributeTable(properties) {
        // Switch panels: hide log, show attribute table
        el.xmlPanel.style.display = 'none';
        el.attrTableContainer.style.display = 'block';
        logsVisible = false;
        updateToggleLogBtn();

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
            el.attrTableContainer.innerHTML = '<h6 class="text-muted text-center mt-3">No attributes found for this feature.</h6>';
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
        el.attrTableContainer.innerHTML = html;
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
            const typeClass = props.type === 'WMS' ? 'primary' : 'success';

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
            const resp = await fetchWithTimeout(getCapUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

            const xmlText = await resp.text();

            logXml(`Received GetCapabilities response (${(xmlText.length / 1024).toFixed(0)} KB). Parsing XML...`);
            logXmlSafe(xmlText, 'GetCapabilities XML');

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

        logXml(`Fetching Feature Info for Map Click at pixel [${Math.round(evt.pixel[0])}, ${Math.round(evt.pixel[1])}]...`);
        el.attrTableContainer.innerHTML = '<div class="text-center mt-3"><div class="spinner-border spinner-border-sm text-primary"></div> Loading attributes...</div>';
        showAttributeTable({});

        // Check if WFS feature clicked
        const feature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat, {
            hitTolerance: 5 // 5 pixels tolerance for easier clicking on lines/points
        });

        if (feature) {
            logXml(`WFS Feature Clicked. Showing attributes.`);
            showAttributeTable(feature.getProperties());
            return;
        }

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
                        el.attrTableContainer.innerHTML = '<h6 class="text-muted text-center mt-3">No features matched at this point.</h6>';
                    }
                } catch (err) {
                    logXml(`Error getting WMS info: ${err.message}`);
                    el.attrTableContainer.innerHTML = `<h6 class="text-danger text-center mt-3">${err.message}</h6>`;
                }
            }
        } else {
            el.attrTableContainer.innerHTML = '<h6 class="text-muted text-center mt-3">No visible features to query.</h6>';
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
                const resp = await fetchWithTimeout(getCapUrl);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

                const xmlText = await resp.text();

                logXml(`Received WFS GetCapabilities response (${(xmlText.length / 1024).toFixed(0)} KB). Parsing XML...`);
                logXmlSafe(xmlText, 'WFS GetCapabilities XML');

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

            let reqUrl = `${state.wfsUrl}?request=GetFeature&service=WFS&version=1.1.0&typeName=${layerName}&outputFormat=${encodeURIComponent(format)}&srsName=${srs}&maxFeatures=${WFS_MAX_FEATURES}&count=${WFS_MAX_FEATURES}`;

            if (!isNaN(top) && !isNaN(left) && !isNaN(bottom) && !isNaN(right)) {
                // If mapping, BBOX is minx,miny,maxx,maxy OR minX,minY,maxX,maxY,SRS
                reqUrl += `&bbox=${left},${bottom},${right},${top},EPSG:4326`;
                logXml(`Executing WFS GetFeature for layer: ${layerName} with BBox (max ${WFS_MAX_FEATURES} features)`);
            } else {
                logXml(`Executing WFS GetFeature for layer: ${layerName} (max ${WFS_MAX_FEATURES} features)`);
            }

            el.mapOverlay.style.display = 'block';

            try {
                const resp = await fetchWithTimeout(reqUrl, {}, 60000);
                const text = await resp.text();

                logXml(`WFS GetFeature Response Received (${(text.length / 1024).toFixed(0)} KB).\n`);
                if (format === 'application/json') {
                    try {
                        const parsed = JSON.parse(text);
                        const featureCount = parsed.features ? parsed.features.length : 0;
                        logXml(`GeoJSON contains ${featureCount} features.`);
                        if (text.length > LOG_MAX_CHARS) {
                            logXml(`Response too large to display fully. Showing first ${(LOG_MAX_CHARS / 1024).toFixed(0)} KB...`);
                            logXml(JSON.stringify(parsed, null, 2).substring(0, LOG_MAX_CHARS) + '\n\n... [TRUNCATED] ...');
                        } else {
                            logXml(JSON.stringify(parsed, null, 2));
                        }
                    } catch (e) {
                        logXmlSafe(text, 'WFS Response');
                    }
                } else {
                    logXmlSafe(text, 'WFS XML Response');
                }

                // If GeoJSON, we can load it into the map
                if (format === 'application/json') {
                    try {
                        const features = new ol.format.GeoJSON().readFeatures(text, {
                            dataProjection: srs,
                            featureProjection: map.getView().getProjection()
                        });

                        logXml(`Parsed ${features.length} features for map rendering.`);

                        const vectorSource = new ol.source.Vector({ features });

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
                    } catch (parseErr) {
                        logXml(`Error parsing GeoJSON features: ${parseErr.message}. Data may be too large or malformed.`);
                    }
                }

            } catch (err) {
                logXml(`Error running WFS GetFeature: ${err.message}`);
            } finally {
                el.mapOverlay.style.display = 'none';
            }
        });
    }

    // Clear Panel
    el.btnClearXml.addEventListener('click', () => el.xmlPanel.value = "");
});

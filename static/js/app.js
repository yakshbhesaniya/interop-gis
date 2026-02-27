document.addEventListener("DOMContentLoaded", () => {
    // App State
    const state = {
        capabilitiesDoc: null,
        wmsUrl: '',
        wfsCapabilitiesDoc: null,
        wfsUrl: '',
        currentLayer: null
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
        sizeWidth: document.getElementById('sizeWidth'),
        sizeHeight: document.getElementById('sizeHeight'),
        infoX: document.getElementById('infoX'),
        infoY: document.getElementById('infoY'),
        btnRun: document.getElementById('btnRun'),
        xmlPanel: document.getElementById('xmlResponseTextarea'),
        btnClearXml: document.getElementById('btnClearXml'),
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
        wfsFeatureId: document.getElementById('wfsFeatureId'),
        wfsBtnRun: document.getElementById('wfsBtnRun')
    };

    // 1. Initialize OpenLayers Map with OSM Base
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

    // 2. OK Button -> GetCapabilities Request
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

        const getCapUrl = `/proxy?url=${encodeURIComponent(url)}&request=GetCapabilities&service=WMS&version=1.3.0`;

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

    // 3. RUN Button -> Execute GetMap (Adds to OpenLayers)
    el.btnRun.addEventListener('click', () => {
        const layerName = el.layerSelect.value;
        if (!layerName) return;

        if (state.currentLayer) map.removeLayer(state.currentLayer);

        const format = el.formatSelect.value;
        const srs = el.srsSelect.value;
        const top = parseFloat(el.bboxTop.value);
        const left = parseFloat(el.bboxLeft.value);
        const bottom = parseFloat(el.bboxBottom.value);
        const right = parseFloat(el.bboxRight.value);

        logXml(`Executing GetMap for layer: ${layerName}`);

        // Construct WMS layer using OpenLayers ImageWMS & our Proxy
        const wmsSource = new ol.source.ImageWMS({
            url: '/proxy?url=' + encodeURIComponent(state.wmsUrl),
            params: {
                'LAYERS': layerName,
                'FORMAT': format,
                'SRS': srs
                // Size and Exact Bbox are natively injected by OpenLayers when it calculates the Map View,
                // making it highly interoperable.
            },
            serverType: 'geoserver',
            crossOrigin: 'anonymous'
        });

        state.currentLayer = new ol.layer.Image({
            source: wmsSource,
            opacity: 0.8
        });

        // Set Loading Events
        wmsSource.on('imageloadstart', () => { el.mapOverlay.style.display = 'block'; });
        wmsSource.on('imageloadend', () => { el.mapOverlay.style.display = 'none'; });
        wmsSource.on('imageloaderror', () => {
            el.mapOverlay.style.display = 'none';
            logXml(`Error: Failed to load ImageWMS layer.`);
        });

        map.addLayer(state.currentLayer);

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

    // 4. Map Click -> GetFeatureInfo
    map.on('singleclick', async (evt) => {
        if (!state.currentLayer) return;

        logXml(`Fetching Feature Info for Map Click at pixel [${Math.round(evt.pixel[0])}, ${Math.round(evt.pixel[1])}]...`);

        const viewResolution = map.getView().getResolution();
        const url = state.currentLayer.getSource().getFeatureInfoUrl(
            evt.coordinate,
            viewResolution,
            map.getView().getProjection(),
            { 'INFO_FORMAT': 'text/xml' }
        );

        if (url) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Feature Info Failed");
                const text = await response.text();
                logXml(`Feature Info Response:\n${formatXml(text)}`);
            } catch (err) {
                logXml(`Error: ${err.message}`);
            }
        }
    });

    // WFS OK Button -> GetCapabilities Request
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

            const getCapUrl = `/proxy?url=${encodeURIComponent(url)}&request=GetCapabilities&service=WFS&version=1.1.0`;

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
                // WFS 1.1.0 typically uses FeatureType
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

    // WFS RUN Button -> Execute GetFeature
    if (el.wfsBtnRun) {
        el.wfsBtnRun.addEventListener('click', async () => {
            const layerName = el.wfsLayerSelect.value;
            if (!layerName) return;

            if (state.currentLayer) map.removeLayer(state.currentLayer);

            const format = el.wfsFormatSelect.value;
            const srs = el.wfsSrsSelect.value;
            const featureId = el.wfsFeatureId.value.trim();
            const top = parseFloat(el.wfsBboxTop.value);
            const left = parseFloat(el.wfsBboxLeft.value);
            const bottom = parseFloat(el.wfsBboxBottom.value);
            const right = parseFloat(el.wfsBboxRight.value);

            let reqUrl = `/proxy?url=${encodeURIComponent(state.wfsUrl)}&request=GetFeature&service=WFS&version=1.1.0&typeName=${layerName}&outputFormat=${encodeURIComponent(format)}&srsName=${srs}`;

            if (featureId) {
                reqUrl += `&featureID=${featureId}`;
                logXml(`Executing WFS GetFeature for layer: ${layerName} with FeatureID: ${featureId}`);
            } else if (!isNaN(top) && !isNaN(left) && !isNaN(bottom) && !isNaN(right)) {
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

                    state.currentLayer = new ol.layer.Vector({
                        source: vectorSource,
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

                    map.addLayer(state.currentLayer);

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

    // Clear Panel
    el.btnClearXml.addEventListener('click', () => el.xmlPanel.value = "");
});

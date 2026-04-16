/**
 * SOS XML Generator — OGC-compliant SOS XML response generation
 * Generates: GetCapabilities, DescribeSensor (SensorML 2.0), GetObservation (O&M 2.0)
 */

const SOS_XML = {

    /**
     * Generate OGC SOS GetCapabilities XML response
     */
    generateGetCapabilities() {
        const sensorOfferings = SOS_SENSORS.map((s, i) => `
        <sos:ObservationOffering>
            <swes:identifier>${s.id}</swes:identifier>
            <swes:name>${s.name}</swes:name>
            <swes:procedure>${s.id}</swes:procedure>
            <swes:observableProperty>urn:ogc:def:property:cpcb:temperature</swes:observableProperty>
            <swes:observableProperty>urn:ogc:def:property:cpcb:humidity</swes:observableProperty>
            <swes:observableProperty>urn:ogc:def:property:cpcb:windspeed</swes:observableProperty>
            <swes:observableProperty>urn:ogc:def:property:cpcb:pm25</swes:observableProperty>
            <sos:observedArea>
                <gml:Envelope srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
                    <gml:lowerCorner>${s.lat - 0.01} ${s.lon - 0.01}</gml:lowerCorner>
                    <gml:upperCorner>${s.lat + 0.01} ${s.lon + 0.01}</gml:upperCorner>
                </gml:Envelope>
            </sos:observedArea>
            <sos:phenomenonTime>
                <gml:TimePeriod gml:id="phenomenonTime_${i}">
                    <gml:beginPosition>2024-01-01T00:00:00Z</gml:beginPosition>
                    <gml:endPosition>2026-04-10T18:00:00Z</gml:endPosition>
                </gml:TimePeriod>
            </sos:phenomenonTime>
        </sos:ObservationOffering>`).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<sos:Capabilities
    xmlns:sos="http://www.opengis.net/sos/2.0"
    xmlns:swes="http://www.opengis.net/swes/2.0"
    xmlns:ows="http://www.opengis.net/ows/1.1"
    xmlns:gml="http://www.opengis.net/gml/3.2"
    xmlns:fes="http://www.opengis.net/fes/2.0"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    version="2.0.0">

    <ows:ServiceIdentification>
        <ows:Title>India CPCB Air Quality SOS</ows:Title>
        <ows:Abstract>Sensor Observation Service for Indian Central Pollution Control Board Air Quality Monitoring Network (CAAQMS)</ows:Abstract>
        <ows:ServiceType>OGC:SOS</ows:ServiceType>
        <ows:ServiceTypeVersion>2.0.0</ows:ServiceTypeVersion>
    </ows:ServiceIdentification>

    <ows:OperationsMetadata>
        <ows:Operation name="GetCapabilities">
            <ows:DCP><ows:HTTP><ows:Get xlink:href="http://localhost/sos"/></ows:HTTP></ows:DCP>
        </ows:Operation>
        <ows:Operation name="DescribeSensor">
            <ows:DCP><ows:HTTP><ows:Get xlink:href="http://localhost/sos"/></ows:HTTP></ows:DCP>
        </ows:Operation>
        <ows:Operation name="GetObservation">
            <ows:DCP><ows:HTTP><ows:Get xlink:href="http://localhost/sos"/></ows:HTTP></ows:DCP>
        </ows:Operation>
    </ows:OperationsMetadata>

    <sos:filterCapabilities>
        <fes:Filter_Capabilities>
            <fes:Spatial_Capabilities>
                <fes:SpatialOperators>
                    <fes:SpatialOperator name="BBOX"/>
                    <fes:SpatialOperator name="Contains"/>
                </fes:SpatialOperators>
            </fes:Spatial_Capabilities>
            <fes:Temporal_Capabilities>
                <fes:TemporalOperators>
                    <fes:TemporalOperator name="After"/>
                    <fes:TemporalOperator name="During"/>
                </fes:TemporalOperators>
            </fes:Temporal_Capabilities>
            <fes:Scalar_Capabilities>
                <fes:ComparisonOperators>
                    <fes:ComparisonOperator name="PropertyIsBetween"/>
                    <fes:ComparisonOperator name="PropertyIsEqualTo"/>
                    <fes:ComparisonOperator name="PropertyIsNotEqualTo"/>
                    <fes:ComparisonOperator name="PropertyIsLessThan"/>
                    <fes:ComparisonOperator name="PropertyIsGreaterThan"/>
                </fes:ComparisonOperators>
            </fes:Scalar_Capabilities>
        </fes:Filter_Capabilities>
    </sos:filterCapabilities>

    <sos:contents>
        <sos:Contents>
            ${sensorOfferings}
        </sos:Contents>
    </sos:contents>

</sos:Capabilities>`;
    },

    /**
     * Generate SensorML 2.0 XML for a specific sensor
     */
    generateDescribeSensor(sensorId) {
        const sensor = SOS_SENSORS.find(s => s.id === sensorId);
        if (!sensor) return `<!-- Sensor not found: ${sensorId} -->`;

        const outputsXml = sensor.outputs.map(propName => {
            const prop = SOS_OBSERVED_PROPERTIES.find(p => p.name === propName);
            if (!prop) return '';
            return `
                <sml:output name="${prop.name}">
                    <swe:Quantity definition="${prop.definition}">
                        <swe:label>${prop.label}</swe:label>
                        <swe:uom code="${prop.uomCode}"/>
                    </swe:Quantity>
                </sml:output>`;
        }).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<swes:DescribeSensorResponse
    xmlns:swes="http://www.opengis.net/swes/2.0"
    xmlns:sml="http://www.opengis.net/sensorml/2.0"
    xmlns:swe="http://www.opengis.net/swe/2.0"
    xmlns:gml="http://www.opengis.net/gml/3.2"
    xmlns:xlink="http://www.w3.org/1999/xlink">

    <swes:procedureDescriptionFormat>http://www.opengis.net/sensorml/2.0</swes:procedureDescriptionFormat>
    <swes:description>
        <sml:PhysicalSystem gml:id="${sensorId.replace(/[^a-zA-Z0-9_]/g, '_')}">

            <gml:identifier codeSpace="uniqueID">${sensor.id}</gml:identifier>
            <gml:name>${sensor.name}</gml:name>
            <gml:description>${sensor.description}</gml:description>

            <sml:identification>
                <sml:IdentifierList>
                    <sml:identifier>
                        <sml:Term definition="urn:ogc:def:identifier:OGC:1.0:longName">
                            <sml:label>Long Name</sml:label>
                            <sml:value>${sensor.name}</sml:value>
                        </sml:Term>
                    </sml:identifier>
                    <sml:identifier>
                        <sml:Term definition="urn:ogc:def:identifier:OGC:1.0:shortName">
                            <sml:label>Short Name</sml:label>
                            <sml:value>${sensor.shortName}</sml:value>
                        </sml:Term>
                    </sml:identifier>
                    <sml:identifier>
                        <sml:Term definition="urn:ogc:def:identifier:OGC:1.0:manufacturer">
                            <sml:label>Manufacturer</sml:label>
                            <sml:value>${sensor.manufacturer}</sml:value>
                        </sml:Term>
                    </sml:identifier>
                    <sml:identifier>
                        <sml:Term definition="urn:ogc:def:identifier:OGC:1.0:modelNumber">
                            <sml:label>Model Number</sml:label>
                            <sml:value>${sensor.model}</sml:value>
                        </sml:Term>
                    </sml:identifier>
                </sml:IdentifierList>
            </sml:identification>

            <sml:classification>
                <sml:ClassifierList>
                    <sml:classifier>
                        <sml:Term definition="urn:ogc:def:classifier:OGC:1.0:sensorType">
                            <sml:label>Sensor Type</sml:label>
                            <sml:value>Continuous Ambient Air Quality Monitoring Station</sml:value>
                        </sml:Term>
                    </sml:classifier>
                    <sml:classifier>
                        <sml:Term definition="urn:ogc:def:classifier:OGC:1.0:application">
                            <sml:label>Application Domain</sml:label>
                            <sml:value>Air Quality Monitoring</sml:value>
                        </sml:Term>
                    </sml:classifier>
                </sml:ClassifierList>
            </sml:classification>

            <sml:validTime>
                <gml:TimePeriod gml:id="validTime_${sensor.city}">
                    <gml:beginPosition>${sensor.installDate}</gml:beginPosition>
                    <gml:endPosition indeterminatePosition="now"/>
                </gml:TimePeriod>
            </sml:validTime>

            <sml:capabilities name="offerings">
                <sml:CapabilityList>
                    <sml:capability name="offeringID">
                        <swe:Text definition="urn:ogc:def:identifier:OGC:offeringID">
                            <swe:value>${sensor.id}:offering</swe:value>
                        </swe:Text>
                    </sml:capability>
                </sml:CapabilityList>
            </sml:capabilities>

            <sml:position>
                <swe:Vector referenceFrame="urn:ogc:def:crs:EPSG:0:4326">
                    <swe:coordinate name="latitude">
                        <swe:Quantity axisID="Lat">
                            <swe:uom code="deg"/>
                            <swe:value>${sensor.lat}</swe:value>
                        </swe:Quantity>
                    </swe:coordinate>
                    <swe:coordinate name="longitude">
                        <swe:Quantity axisID="Lon">
                            <swe:uom code="deg"/>
                            <swe:value>${sensor.lon}</swe:value>
                        </swe:Quantity>
                    </swe:coordinate>
                </swe:Vector>
            </sml:position>

            <sml:outputs>
                <sml:OutputList>
                    ${outputsXml}
                </sml:OutputList>
            </sml:outputs>

        </sml:PhysicalSystem>
    </swes:description>
</swes:DescribeSensorResponse>`;
    },

    /**
     * Generate O&M 2.0 GetObservation XML response
     */
    generateGetObservation(observations) {
        if (!observations || observations.length === 0) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<sos:GetObservationResponse
    xmlns:sos="http://www.opengis.net/sos/2.0"
    xmlns:om="http://www.opengis.net/om/2.0"
    xmlns:gml="http://www.opengis.net/gml/3.2">
    <!-- No observations matched the query criteria -->
</sos:GetObservationResponse>`;
        }

        const obsXml = observations.map((obs, i) => `
        <sos:observationData>
            <om:OM_Observation gml:id="${obs.id || 'obs_' + i}">
                <om:type xlink:href="http://www.opengis.net/def/observationType/OGC-OM/2.0/OM_ComplexObservation"/>
                <om:phenomenonTime>
                    <gml:TimeInstant gml:id="ti_${i}">
                        <gml:timePosition>${obs.timestamp}</gml:timePosition>
                    </gml:TimeInstant>
                </om:phenomenonTime>
                <om:resultTime xlink:href="#ti_${i}"/>
                <om:procedure xlink:href="${obs.sensorId}"/>
                <om:observedProperty xlink:href="urn:ogc:def:property:cpcb:airquality"/>
                <om:featureOfInterest>
                    <sams:SF_SpatialSamplingFeature gml:id="foi_${i}"
                        xmlns:sams="http://www.opengis.net/samplingSpatial/2.0">
                        <gml:name>${obs.city} Monitoring Station</gml:name>
                        <sams:shape>
                            <gml:Point gml:id="pt_${i}" srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
                                <gml:pos>${obs.lat} ${obs.lon}</gml:pos>
                            </gml:Point>
                        </sams:shape>
                    </sams:SF_SpatialSamplingFeature>
                </om:featureOfInterest>
                <om:result>
                    <swe:DataRecord xmlns:swe="http://www.opengis.net/swe/2.0">
                        <swe:field name="temperature">
                            <swe:Quantity definition="urn:ogc:def:property:cpcb:temperature">
                                <swe:uom code="Cel"/>
                                <swe:value>${obs.temperature}</swe:value>
                            </swe:Quantity>
                        </swe:field>
                        <swe:field name="humidity">
                            <swe:Quantity definition="urn:ogc:def:property:cpcb:humidity">
                                <swe:uom code="%"/>
                                <swe:value>${obs.humidity}</swe:value>
                            </swe:Quantity>
                        </swe:field>
                        <swe:field name="windSpeed">
                            <swe:Quantity definition="urn:ogc:def:property:cpcb:windspeed">
                                <swe:uom code="km/h"/>
                                <swe:value>${obs.windSpeed}</swe:value>
                            </swe:Quantity>
                        </swe:field>
                        <swe:field name="pm25">
                            <swe:Quantity definition="urn:ogc:def:property:cpcb:pm25">
                                <swe:uom code="ug/m3"/>
                                <swe:value>${obs.pm25}</swe:value>
                            </swe:Quantity>
                        </swe:field>
                    </swe:DataRecord>
                </om:result>
            </om:OM_Observation>
        </sos:observationData>`).join('\n');

        return `<?xml version="1.0" encoding="UTF-8"?>
<sos:GetObservationResponse
    xmlns:sos="http://www.opengis.net/sos/2.0"
    xmlns:om="http://www.opengis.net/om/2.0"
    xmlns:gml="http://www.opengis.net/gml/3.2"
    xmlns:swe="http://www.opengis.net/swe/2.0"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:sams="http://www.opengis.net/samplingSpatial/2.0">
    ${obsXml}
</sos:GetObservationResponse>`;
    },

    /**
     * Parse a SOS GetObservation XML response back into table-ready objects
     * This demonstrates the "parse XML responses from SOS and put them in a Table" requirement
     */
    parseGetObservationXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
            console.error("XML Parse Error");
            return [];
        }

        const results = [];
        const observations = xmlDoc.getElementsByTagName("om:OM_Observation");

        for (let i = 0; i < observations.length; i++) {
            const obs = observations[i];

            // Extract timestamp
            const timePos = obs.getElementsByTagName("gml:timePosition")[0];
            const timestamp = timePos ? timePos.textContent : "N/A";

            // Extract procedure (sensor ID)
            const procedure = obs.getElementsByTagName("om:procedure")[0];
            const sensorId = procedure ? procedure.getAttribute("xlink:href") : "N/A";

            // Extract feature of interest name
            const foiName = obs.getElementsByTagName("gml:name")[0];
            const station = foiName ? foiName.textContent : "N/A";

            // Extract position
            const pos = obs.getElementsByTagName("gml:pos")[0];
            let lat = "N/A", lon = "N/A";
            if (pos) {
                const coords = pos.textContent.split(" ");
                lat = parseFloat(coords[0]);
                lon = parseFloat(coords[1]);
            }

            // Extract measurement values from swe:field elements
            const fields = obs.getElementsByTagName("swe:field");
            const record = { timestamp, sensorId, station, lat, lon };

            for (let j = 0; j < fields.length; j++) {
                const fieldName = fields[j].getAttribute("name");
                const valueEl = fields[j].getElementsByTagName("swe:value")[0];
                const uomEl = fields[j].getElementsByTagName("swe:uom")[0];

                if (valueEl) {
                    record[fieldName] = parseFloat(valueEl.textContent);
                }
                if (uomEl) {
                    record[fieldName + "_unit"] = uomEl.getAttribute("code");
                }
            }

            results.push(record);
        }

        return results;
    },

    /**
     * Format XML string for pretty display
     */
    formatXml(xml) {
        let formatted = '';
        let pad = 0;
        xml = xml.replace(/(>)(<)(\/*)$/gm, '$1\r\n$2$3');
        xml = xml.replace(/(>)(<)(\/*)/g, '$1\r\n$2$3');
        const lines = xml.split('\r\n');

        lines.forEach(node => {
            node = node.trim();
            if (!node) return;
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
        return formatted.trim();
    }
};

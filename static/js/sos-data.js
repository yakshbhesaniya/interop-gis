/**
 * SOS Sensor Database — Indian Air Quality Monitoring Stations
 * Domain: CPCB (Central Pollution Control Board) Air Quality Monitoring
 * Parameters: Temperature (°C), Humidity (%), Wind Speed (km/h), PM2.5 (µg/m³)
 */

const SOS_SENSORS = [
    {
        id: "urn:sensor:cpcb:delhi_001",
        name: "Delhi Anand Vihar CAAQMS",
        shortName: "Delhi - Anand Vihar",
        description: "Continuous Ambient Air Quality Monitoring Station at Anand Vihar, Delhi. Operated by DPCC under CPCB NAAQM network.",
        lat: 28.6468,
        lon: 77.3161,
        city: "Delhi",
        state: "Delhi",
        manufacturer: "Envea",
        model: "MP101M",
        installDate: "2018-03-15",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:mumbai_001",
        name: "Mumbai Bandra CAAQMS",
        shortName: "Mumbai - Bandra",
        description: "Continuous Ambient Air Quality Monitoring Station at Bandra Kurla Complex, Mumbai. Operated by MPCB.",
        lat: 19.0596,
        lon: 72.8295,
        city: "Mumbai",
        state: "Maharashtra",
        manufacturer: "Thermo Fisher",
        model: "TEOM 1405",
        installDate: "2019-06-10",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:chennai_001",
        name: "Chennai Alandur CAAQMS",
        shortName: "Chennai - Alandur",
        description: "Continuous Ambient Air Quality Monitoring Station at Alandur, Chennai. Operated by TNPCB.",
        lat: 13.0025,
        lon: 80.2065,
        city: "Chennai",
        state: "Tamil Nadu",
        manufacturer: "Met One Instruments",
        model: "BAM 1022",
        installDate: "2019-01-20",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:kolkata_001",
        name: "Kolkata Victoria Memorial CAAQMS",
        shortName: "Kolkata - Victoria",
        description: "Continuous Ambient Air Quality Monitoring Station near Victoria Memorial, Kolkata. Operated by WBPCB.",
        lat: 22.5448,
        lon: 88.3426,
        city: "Kolkata",
        state: "West Bengal",
        manufacturer: "Envea",
        model: "MP101M",
        installDate: "2018-11-05",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:bangalore_001",
        name: "Bengaluru Peenya CAAQMS",
        shortName: "Bengaluru - Peenya",
        description: "Continuous Ambient Air Quality Monitoring Station at Peenya Industrial Area, Bengaluru. Operated by KSPCB.",
        lat: 13.0285,
        lon: 77.5190,
        city: "Bengaluru",
        state: "Karnataka",
        manufacturer: "Horiba",
        model: "APDA-371",
        installDate: "2019-08-12",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:hyderabad_001",
        name: "Hyderabad Sanathnagar CAAQMS",
        shortName: "Hyderabad - Sanathnagar",
        description: "Continuous Ambient Air Quality Monitoring Station at Sanathnagar, Hyderabad. Operated by TSPCB.",
        lat: 17.4560,
        lon: 78.4380,
        city: "Hyderabad",
        state: "Telangana",
        manufacturer: "Thermo Fisher",
        model: "TEOM 1405",
        installDate: "2019-04-18",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:jaipur_001",
        name: "Jaipur Adarsh Nagar CAAQMS",
        shortName: "Jaipur - Adarsh Nagar",
        description: "Continuous Ambient Air Quality Monitoring Station at Adarsh Nagar, Jaipur. Operated by RSPCB.",
        lat: 26.9124,
        lon: 75.7873,
        city: "Jaipur",
        state: "Rajasthan",
        manufacturer: "Envea",
        model: "MP101M",
        installDate: "2020-02-01",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:lucknow_001",
        name: "Lucknow Talkatora CAAQMS",
        shortName: "Lucknow - Talkatora",
        description: "Continuous Ambient Air Quality Monitoring Station at Talkatora, Lucknow. Operated by UPPCB.",
        lat: 26.8509,
        lon: 80.9195,
        city: "Lucknow",
        state: "Uttar Pradesh",
        manufacturer: "Met One Instruments",
        model: "BAM 1022",
        installDate: "2019-09-25",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:bhopal_001",
        name: "Bhopal TT Nagar CAAQMS",
        shortName: "Bhopal - TT Nagar",
        description: "Continuous Ambient Air Quality Monitoring Station at TT Nagar, Bhopal. Operated by MPPCB.",
        lat: 23.2370,
        lon: 77.4104,
        city: "Bhopal",
        state: "Madhya Pradesh",
        manufacturer: "Horiba",
        model: "APDA-371",
        installDate: "2020-05-10",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    },
    {
        id: "urn:sensor:cpcb:guwahati_001",
        name: "Guwahati Railway Colony CAAQMS",
        shortName: "Guwahati - Railway Colony",
        description: "Continuous Ambient Air Quality Monitoring Station at Railway Colony, Guwahati. Operated by APCB.",
        lat: 26.1722,
        lon: 91.7530,
        city: "Guwahati",
        state: "Assam",
        manufacturer: "Thermo Fisher",
        model: "TEOM 1405",
        installDate: "2020-11-15",
        outputs: ["Temperature", "Humidity", "WindSpeed", "PM2.5"]
    }
];

// ─── Observation Data Generator ─────────────────────────────────────
// Realistic data patterns per city based on actual CPCB/IMD observations
const CITY_PROFILES = {
    "Delhi": {
        tempRange: [5, 46], humRange: [20, 90], windRange: [2, 25],
        pm25Ranges: { winter: [200, 450], summer: [80, 180], monsoon: [40, 120], post_monsoon: [150, 380] }
    },
    "Mumbai": {
        tempRange: [20, 38], humRange: [55, 95], windRange: [5, 35],
        pm25Ranges: { winter: [60, 150], summer: [30, 80], monsoon: [20, 60], post_monsoon: [50, 130] }
    },
    "Chennai": {
        tempRange: [22, 42], humRange: [60, 95], windRange: [5, 30],
        pm25Ranges: { winter: [40, 100], summer: [35, 90], monsoon: [25, 65], post_monsoon: [45, 110] }
    },
    "Kolkata": {
        tempRange: [12, 40], humRange: [45, 95], windRange: [3, 20],
        pm25Ranges: { winter: [120, 280], summer: [60, 140], monsoon: [30, 80], post_monsoon: [100, 250] }
    },
    "Bengaluru": {
        tempRange: [15, 38], humRange: [30, 85], windRange: [3, 20],
        pm25Ranges: { winter: [50, 120], summer: [40, 100], monsoon: [20, 55], post_monsoon: [45, 110] }
    },
    "Hyderabad": {
        tempRange: [16, 42], humRange: [25, 85], windRange: [4, 22],
        pm25Ranges: { winter: [70, 160], summer: [50, 120], monsoon: [25, 70], post_monsoon: [60, 140] }
    },
    "Jaipur": {
        tempRange: [7, 46], humRange: [15, 80], windRange: [3, 30],
        pm25Ranges: { winter: [130, 300], summer: [90, 200], monsoon: [40, 100], post_monsoon: [110, 260] }
    },
    "Lucknow": {
        tempRange: [6, 45], humRange: [25, 90], windRange: [2, 18],
        pm25Ranges: { winter: [180, 400], summer: [70, 160], monsoon: [35, 90], post_monsoon: [140, 340] }
    },
    "Bhopal": {
        tempRange: [10, 44], humRange: [20, 85], windRange: [3, 20],
        pm25Ranges: { winter: [100, 220], summer: [60, 140], monsoon: [30, 75], post_monsoon: [80, 200] }
    },
    "Guwahati": {
        tempRange: [10, 36], humRange: [50, 95], windRange: [2, 15],
        pm25Ranges: { winter: [80, 180], summer: [40, 100], monsoon: [20, 55], post_monsoon: [70, 160] }
    }
};

function getSeason(month) {
    if (month >= 11 || month <= 2) return "winter";
    if (month >= 3 && month <= 5) return "summer";
    if (month >= 6 && month <= 9) return "monsoon";
    return "post_monsoon";
}

function randBetween(min, max) {
    return +(min + Math.random() * (max - min)).toFixed(1);
}

// Seeded-ish random for reproducibility (simple LCG)
let _seed = 42;
function seededRandom() {
    _seed = (_seed * 1664525 + 1013904223) % 4294967296;
    return _seed / 4294967296;
}
function sRandBetween(min, max) {
    return +(min + seededRandom() * (max - min)).toFixed(1);
}

function generateObservations() {
    const observations = [];
    const timestamps = [];

    // Generate timestamps: every ~3 days from Jan 2024 to Apr 2026
    const start = new Date("2024-01-01T00:00:00Z");
    const end = new Date("2026-04-10T00:00:00Z");
    const hours = [6, 12, 18]; // 3 readings per selected day

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 3)) {
        const h = hours[Math.floor(seededRandom() * hours.length)];
        timestamps.push(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0)));
    }

    // For each sensor, generate observations at each timestamp
    SOS_SENSORS.forEach(sensor => {
        const profile = CITY_PROFILES[sensor.city];
        if (!profile) return;

        timestamps.forEach(ts => {
            const month = ts.getUTCMonth() + 1;
            const season = getSeason(month);
            const hour = ts.getUTCHours();

            // Temperature varies by hour: cooler at 6am, hottest at 12pm, moderate at 6pm
            const [tMin, tMax] = profile.tempRange;
            let tempBase;
            // Seasonal temperature adjustment
            if (season === "winter") tempBase = sRandBetween(tMin, tMin + (tMax - tMin) * 0.4);
            else if (season === "summer") tempBase = sRandBetween(tMin + (tMax - tMin) * 0.5, tMax);
            else tempBase = sRandBetween(tMin + (tMax - tMin) * 0.3, tMin + (tMax - tMin) * 0.7);

            if (hour === 6) tempBase -= sRandBetween(2, 5);
            else if (hour === 18) tempBase -= sRandBetween(1, 3);

            const temperature = +Math.max(tMin, Math.min(tMax, tempBase)).toFixed(1);

            // Humidity inversely related to temperature, higher in monsoon
            const [hMin, hMax] = profile.humRange;
            let humBase;
            if (season === "monsoon") humBase = sRandBetween(hMax - 20, hMax);
            else if (season === "winter") humBase = sRandBetween(hMin + 10, hMin + 40);
            else humBase = sRandBetween(hMin, hMin + (hMax - hMin) * 0.6);
            const humidity = +Math.max(hMin, Math.min(hMax, humBase)).toFixed(0);

            // Wind speed
            const [wMin, wMax] = profile.windRange;
            const windSpeed = sRandBetween(wMin, wMax);

            // PM2.5 based on season
            const pm25Range = profile.pm25Ranges[season];
            let pm25 = sRandBetween(pm25Range[0], pm25Range[1]);
            // Early morning tends to have higher PM2.5 (inversion layer)
            if (hour === 6) pm25 *= sRandBetween(1.05, 1.25);
            pm25 = +Math.max(5, pm25).toFixed(1);

            observations.push({
                id: `obs_${sensor.city.toLowerCase()}_${ts.getTime()}`,
                sensorId: sensor.id,
                sensorName: sensor.shortName,
                city: sensor.city,
                lat: sensor.lat,
                lon: sensor.lon,
                timestamp: ts.toISOString(),
                temperature,
                humidity: +humidity,
                windSpeed: +windSpeed,
                pm25: +pm25
            });
        });
    });

    return observations;
}

// Generate the full observations dataset
const SOS_OBSERVATIONS = generateObservations();

// ─── Observed Properties Registry ───────────────────────────────────
const SOS_OBSERVED_PROPERTIES = [
    {
        id: "urn:ogc:def:property:cpcb:temperature",
        name: "Temperature",
        label: "Air Temperature",
        unit: "°C",
        uomCode: "Cel",
        definition: "http://dbpedia.org/resource/Temperature",
        field: "temperature",
        icon: "🌡️",
        color: "#ef4444"
    },
    {
        id: "urn:ogc:def:property:cpcb:humidity",
        name: "Humidity",
        label: "Relative Humidity",
        unit: "%",
        uomCode: "%",
        definition: "http://dbpedia.org/resource/Relative_humidity",
        field: "humidity",
        icon: "💧",
        color: "#3b82f6"
    },
    {
        id: "urn:ogc:def:property:cpcb:windspeed",
        name: "WindSpeed",
        label: "Wind Speed",
        unit: "km/h",
        uomCode: "km/h",
        definition: "http://dbpedia.org/resource/Wind_speed",
        field: "windSpeed",
        icon: "💨",
        color: "#10b981"
    },
    {
        id: "urn:ogc:def:property:cpcb:pm25",
        name: "PM2.5",
        label: "PM2.5 (Fine Particulate Matter)",
        unit: "µg/m³",
        uomCode: "ug/m3",
        definition: "http://dbpedia.org/resource/Particulates",
        field: "pm25",
        icon: "🏭",
        color: "#f59e0b"
    }
];

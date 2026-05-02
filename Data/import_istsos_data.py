# -*- coding: utf-8 -*-
import json, requests
from collections import defaultdict
import os

BASE = "http://localhost:8090/istsos/wa/istsos/services/mumbai"

json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mumbai_sensor_data.json')

with open(json_path) as f:
    records = json.load(f)

# Sort records to maintain chronological order
records.sort(key=lambda x: x['timestamp'])

print(f"Total records to insert: {len(records)}")

success_count = 0
for i, r in enumerate(records):
    # Convert '2026-04-01 10:00:00' to '2026-04-01T10:00:00+05:30'
    ts = r['timestamp'].replace(' ', 'T') + '+05:30'
    payload = {
        "ForceInsert": "true",
        "Observation": {
            "samplingTime": {"beginPosition": ts, "endPosition": ts},
            "procedure": r['station_name'],
            "result": {
                "DataArray": {
                    "field": [
                        {"name": "Time",        "definition": "urn:ogc:def:parameter:x-istsos:1.0:time:iso8601"},
                        {"name": "PM2.5",       "definition": "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM2.5"},
                        {"name": "PM10",        "definition": "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM10"},
                        {"name": "air temperature", "definition": "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:temperature"},
                        {"name": "relative humidity", "definition": "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:humidity"}
                    ],
                    "values": [[ts, str(r['pm25']), str(r['pm10']), str(r['temperature']), str(r['humidity'])]]
                }
            }
        }
    }
    
    # We must post to /operations/insertobservation
    resp = requests.post(f"{BASE}/operations/insertobservation", json=payload)
    
    if resp.status_code == 200 and resp.json().get('success', False):
        success_count += 1
    else:
        print(f"[{i+1}/{len(records)}] FAILED: {r['station_name']} | {ts} | HTTP {resp.status_code} | {resp.text[:150]}")

    if (i + 1) % 50 == 0:
        print(f"Processed {i+1}/{len(records)}... ({success_count} successful)")

print(f"\nDone! Inserted {success_count}/{len(records)} observations into istSOS.")

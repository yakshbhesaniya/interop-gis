import json
from collections import defaultdict
import os

# Load your JSON
json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mumbai_sensor_data.json')
with open(json_path) as f:
    records = json.load(f)

# Group by station
stations = defaultdict(list)
for r in records:
    stations[r['station_id']].append(r)

# URN headers required by istSOS (with quality flags)
header = (
    "urn:ogc:def:parameter:x-istsos:1.0:time:iso8601,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM2.5:Quality,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM2.5,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM10:Quality,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:PM10,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:temperature:Quality,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:temperature,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:humidity:Quality,"
    "urn:ogc:def:parameter:x-istsos:1.0:meteo:air:humidity"
)

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'istsos_csv')
os.makedirs(out_dir, exist_ok=True)

for station_id, rows in sorted(stations.items()):
    rows.sort(key=lambda x: x['timestamp'])
    lines = [header]
    for r in rows:
        # Convert to ISO 8601 with IST timezone offset
        ts = r['timestamp'].replace(' ', 'T') + '+05:30'
        # Quality flag 100 = good data
        line = (
            f"{ts},"
            f"100,{r['pm25']},"
            f"100,{r['pm10']},"
            f"100,{r['temperature']},"
            f"100,{r['humidity']}"
        )
        lines.append(line)

    out_path = os.path.join(out_dir, f'{station_id}.csv')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"Written: {out_path}  ({len(rows)} rows)")

print(f"\nDone! {len(stations)} station CSV files created in: {out_dir}")
print("These files are ready for upload via istSOS WADmin.")

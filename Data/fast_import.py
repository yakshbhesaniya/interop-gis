# -*- coding: utf-8 -*-
import json, requests
import os
import psycopg2

BASE = "http://localhost:8090/istsos/wa/istsos/services/mumbai"

# 1. Get IDs from DB
conn = psycopg2.connect(host='localhost', port=5432, dbname='GIS_Project', user='postgres', password='postgres')
cur = conn.cursor()
cur.execute('SELECT name_prc, assignedid_prc FROM mumbai.procedures')
id_map = dict(cur.fetchall())
cur.close()
conn.close()

json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mumbai_sensor_data.json')
with open(json_path) as f:
    records = json.load(f)

# Group by station
stations = {}
for r in records:
    name = r['station_name']
    if name not in stations:
        stations[name] = []
    stations[name].append(r)

for name, rows in stations.items():
    rows.sort(key=lambda x: x['timestamp'])
    
    assigned_id = id_map.get(name)
    if not assigned_id:
        print(f"Skipping {name}, no ID found")
        continue
    
    # Prepare fastinsert body
    # assignedid;starttime;duration;v1,v2,v3,v4@v1,v2,v3,v4
    start_ts = rows[0]['timestamp'].replace(' ', 'T') + '+05:30'
    
    values = []
    for r in rows:
        # pm25, pm10, temp, hum
        val_str = f"{r['pm25']},{r['pm10']},{r['temperature']},{r['humidity']}"
        values.append(val_str)
    
    body = f"{assigned_id};{start_ts};P1D;{'@'.join(values)}"
    
    # Endpoint: /operations/fastinsert/procedures/<name>
    # According to services.py: self.procedurename = self.pathinfo[4]
    # Path: /wa/istsos/services/mumbai/operations/fastinsert/procedures/Colaba
    url = f"{BASE}/operations/fastinsert/procedures/{name}"
    
    resp = requests.post(url, data=body)
    if resp.status_code == 200:
        print(f"Uploaded {name}: {resp.text}")
    else:
        print(f"Failed {name}: {resp.status_code} - {resp.text}")

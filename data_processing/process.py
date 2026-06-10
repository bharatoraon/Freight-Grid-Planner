import geopandas as gpd
import pandas as pd
from shapely.geometry import Point
import rasterio
import json
import os
import math
import numpy as np

print("Loading nationwide data...")
DATA_DIR = "/Volumes/Sandisk SSD/Smartfrieght/Data"
OUTPUT_DIR = "/Volumes/Sandisk SSD/Smartfrieght/Electric_Freight_Dashboard/web-app/public/data"

# Load simplified major highways we already generated
highways_path = os.path.join(OUTPUT_DIR, "major_highways_simple.geojson")
highways = gpd.read_file(highways_path)
print(f"Loaded {len(highways)} highway segments across India.")

# Sample 120 points across the entire highway network to represent nationwide charging hubs
hubs = []
# Select a subset of segments evenly distributed
step = max(1, len(highways) // 120)
sampled_segments = highways.iloc[::step]

for idx, row in sampled_segments.iterrows():
    geom = row.geometry
    if geom.type == 'LineString':
        pt = geom.interpolate(0.5, normalized=True)
        hubs.append(pt)
    elif geom.type == 'MultiLineString':
        for line in geom.geoms:
            pt = line.interpolate(0.5, normalized=True)
            hubs.append(pt)
            break

# Ensure we limit to around 120 points
hubs = hubs[:120]
hubs_gdf = gpd.GeoDataFrame(geometry=hubs, crs=highways.crs)
print(f"Generated {len(hubs_gdf)} candidate hubs across India.")

print("Loading nationwide substations...")
substations_path = os.path.join(DATA_DIR, "Energy_Infrastructure", "substations.geojson")
# Load all substations (78MB)
substations = gpd.read_file(substations_path)
print(f"Loaded {len(substations)} substations across India.")

# Project to a metric CRS for accurate distance calculation (UTM Zone 43N is good for central India)
print("Projecting data for distance calculations...")
hubs_metric = hubs_gdf.to_crs(epsg=32643)
subs_metric = substations.to_crs(epsg=32643)

print("Loading Indian Railways for multimodal proximity...")
railways_path = os.path.join(OUTPUT_DIR, "indian_railways_simple.geojson")
if os.path.exists(railways_path):
    railways = gpd.read_file(railways_path)
    railways_metric = railways.to_crs(epsg=32643)
else:
    railways_metric = None
    print("Simplified railways not found, skipping rail calculations.")

print("Loading Major Ports for drayage proximity...")
ports_path = os.path.join(DATA_DIR, "india_major_ports.geojson")
if os.path.exists(ports_path):
    ports = gpd.read_file(ports_path)
    ports_metric = ports.to_crs(epsg=32643)
else:
    ports_metric = None
    print("Major ports data not found, skipping port calculations.")

print("Calculating nearest substations, railway lines, and major ports...")
hub_data = []
for i, hub in hubs_metric.iterrows():
    # Find nearest substation
    distances = subs_metric.geometry.distance(hub.geometry)
    nearest_idx = distances.idxmin()
    nearest_sub = substations.loc[nearest_idx]
    dist_km = distances.min() / 1000.0
    
    # Find nearest railway line
    if railways_metric is not None:
        rail_distances = railways_metric.geometry.distance(hub.geometry)
        rail_dist_km = rail_distances.min() / 1000.0
    else:
        rail_dist_km = 999.0

    # Find nearest major port
    if ports_metric is not None:
        port_distances = ports_metric.geometry.distance(hub.geometry)
        nearest_port_idx = port_distances.idxmin()
        nearest_port = ports.loc[nearest_port_idx]
        port_dist_km = port_distances.min() / 1000.0
        port_name = str(nearest_port.get('name'))
    else:
        port_dist_km = 999.0
        port_name = 'Unknown'
        
    # Original coordinates for output
    hub_lon = hubs_gdf.loc[i].geometry.x
    hub_lat = hubs_gdf.loc[i].geometry.y
    
    sub_lon = nearest_sub.geometry.centroid.x
    sub_lat = nearest_sub.geometry.centroid.y
    
    # Clean NaN values
    sub_name = nearest_sub.get('name')
    if pd.isna(sub_name) or sub_name == 'nan':
        sub_name = 'Unknown Substation'
    else:
        sub_name = str(sub_name)

    sub_voltage = nearest_sub.get('voltage')
    if pd.isna(sub_voltage) or sub_voltage == 'nan':
        sub_voltage = 'Unknown'
    else:
        sub_voltage = str(sub_voltage)
        
    hub_data.append({
        "id": f"hub_{i+1}",
        "location": [hub_lat, hub_lon],
        "nearest_substation": {
            "name": sub_name,
            "voltage": sub_voltage,
            "location": [sub_lat, sub_lon],
            "distance_km": round(dist_km, 2)
        },
        "nearest_rail_distance_km": round(rail_dist_km, 2),
        "nearest_port": {
            "name": port_name,
            "distance_km": round(port_dist_km, 2)
        }
    })

print("Sampling environmental raster data...")
wind_tif = os.path.join(DATA_DIR, "Environment", "IND_wind-speed_10m.tif")
power_tif = os.path.join(DATA_DIR, "Environment", "IND_power-density_10m.tif")

try:
    with rasterio.open(wind_tif) as src_wind, rasterio.open(power_tif) as src_power:
        for item in hub_data:
            lon, lat = item["location"][1], item["location"][0]
            
            # Sample wind speed
            try:
                for val in src_wind.sample([(lon, lat)]):
                    val_clean = float(val[0])
                    item["wind_speed_m_s"] = round(val_clean, 2) if (pd.notna(val_clean) and val_clean != src_wind.nodata) else 0
            except:
                item["wind_speed_m_s"] = 0
                
            # Sample power density
            try:
                for val in src_power.sample([(lon, lat)]):
                    val_clean = float(val[0])
                    item["power_density_W_m2"] = round(val_clean, 2) if (pd.notna(val_clean) and val_clean != src_power.nodata) else 0
            except:
                item["power_density_W_m2"] = 0
except Exception as e:
    print(f"Error sampling raster: {e}")

# Save output
out_file = os.path.join(OUTPUT_DIR, "hubs_data.json")

# Add some simulated energy demand
for item in hub_data:
    item["energy_demand"] = {
        "daily_trucks": 150,
        "avg_charge_kwh": 600,
        "daily_mwh": 90.0,
        "peak_load_mw": 22.5
    }

with open(out_file, "w") as f:
    json.dump({"hubs": hub_data}, f, indent=2)

print(f"Successfully wrote nationwide hubs data to {out_file}")

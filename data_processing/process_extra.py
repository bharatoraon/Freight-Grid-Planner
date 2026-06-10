import geopandas as gpd
import os

DATA_DIR = "/Volumes/Sandisk SSD/Smartfrieght/Data"
OUTPUT_DIR = "/Volumes/Sandisk SSD/Smartfrieght/Electric_Freight_Dashboard/web-app/public/data"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Process India States (India Map Outline)
print("Processing India States outline...")
states_path = os.path.join(DATA_DIR, "INDIA_STATES.geojson")
if os.path.exists(states_path):
    states = gpd.read_file(states_path)
    # Simplify geometry to make it load instantly in browser
    states['geometry'] = states['geometry'].simplify(tolerance=0.01, preserve_topology=True)
    states_out_path = os.path.join(OUTPUT_DIR, "india_states_simple.geojson")
    states.to_file(states_out_path, driver="GeoJSON")
    print(f"Saved simplified states to {states_out_path}")
else:
    print("INDIA_STATES.geojson not found!")

# 2. Process National Highways (Freight Corridors)
print("Processing National Highways...")
highways_path = os.path.join(DATA_DIR, "INDIA_NATIONAL_HIGHWAY.geojson")
if os.path.exists(highways_path):
    highways = gpd.read_file(highways_path)
    print(f"Loaded {len(highways)} highway segments.")
    
    # Keep only 'Name' and 'geometry' to minimize file size
    keep_cols = ['Name', 'geometry']
    highways_filtered = highways[keep_cols]
    
    # No simplification applied to preserve absolute geographic accuracy as requested
    print("Writing unsimplified geometries for absolute accuracy...")
    
    highways_out_path = os.path.join(OUTPUT_DIR, "major_highways_simple.geojson")
    highways_filtered.to_file(highways_out_path, driver="GeoJSON")
    print(f"Saved simplified highways to {highways_out_path}")
else:
    print("INDIA_NATIONAL_HIGHWAY.geojson not found!")

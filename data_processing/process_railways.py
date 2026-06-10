import geopandas as gpd
import os

DATA_DIR = "/Volumes/Sandisk SSD/Smartfrieght/Data"
OUTPUT_DIR = "/Volumes/Sandisk SSD/Smartfrieght/Electric_Freight_Dashboard/web-app/public/data"

print("Processing Indian Railways...")
railways_path = os.path.join(DATA_DIR, "INDIAN_RAILWAYS.geojson")
if os.path.exists(railways_path):
    railways = gpd.read_file(railways_path)
    # Simplify railways geometry
    railways['geometry'] = railways['geometry'].simplify(tolerance=0.015, preserve_topology=True)
    railways_out_path = os.path.join(OUTPUT_DIR, "indian_railways_simple.geojson")
    railways.to_file(railways_out_path, driver="GeoJSON")
    print(f"Saved simplified railways to {railways_out_path}")
else:
    print("INDIAN_RAILWAYS.geojson not found!")

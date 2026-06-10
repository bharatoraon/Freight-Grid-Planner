import time
import requests
import geopandas as gpd
from shapely.geometry import Point
import os

print("Starting MMLP Geocoding and Scraping...")

# The 35 MMLP locations identified under Bharatmala Pariyojana by MoRTH
mmlp_locations = [
    {"name": "Nagpur MMLP", "query": "Nagpur, Maharashtra, India"},
    {"name": "Chennai MMLP", "query": "Chennai, Tamil Nadu, India"},
    {"name": "Bangalore MMLP", "query": "Bangalore, Karnataka, India"},
    {"name": "Indore MMLP", "query": "Indore, Madhya Pradesh, India"},
    {"name": "Mumbai MMLP", "query": "Mumbai, Maharashtra, India"},
    {"name": "Hyderabad MMLP", "query": "Hyderabad, Telangana, India"},
    {"name": "Coimbatore MMLP", "query": "Coimbatore, Tamil Nadu, India"},
    {"name": "Pune MMLP", "query": "Pune, Maharashtra, India"},
    {"name": "Surat MMLP", "query": "Surat, Gujarat, India"},
    {"name": "Sangrur MMLP", "query": "Sangrur, Punjab, India"},
    {"name": "Delhi-NCR MMLP", "query": "Delhi, India"},
    {"name": "Ahmedabad MMLP", "query": "Ahmedabad, Gujarat, India"},
    {"name": "Jaipur MMLP", "query": "Jaipur, Rajasthan, India"},
    {"name": "Kolkata MMLP", "query": "Kolkata, West Bengal, India"},
    {"name": "Ambala MMLP", "query": "Ambala, Haryana, India"},
    {"name": "Jagatsinghpur MMLP", "query": "Jagatsinghpur, Odisha, India"},
    {"name": "Nashik MMLP", "query": "Nashik, Maharashtra, India"},
    {"name": "Kota MMLP", "query": "Kota, Rajasthan, India"},
    {"name": "Panaji MMLP", "query": "Panaji, Goa, India"},
    {"name": "Hisar MMLP", "query": "Hisar, Haryana, India"},
    {"name": "Visakhapatnam MMLP", "query": "Visakhapatnam, Andhra Pradesh, India"},
    {"name": "Bhopal MMLP", "query": "Bhopal, Madhya Pradesh, India"},
    {"name": "Sundargarh MMLP", "query": "Sundargarh, Odisha, India"},
    {"name": "Bathinda MMLP", "query": "Bathinda, Punjab, India"},
    {"name": "Solan MMLP", "query": "Solan, Himachal Pradesh, India"},
    {"name": "Rajkot MMLP", "query": "Rajkot, Gujarat, India"},
    {"name": "Raipur MMLP", "query": "Raipur, Chhattisgarh, India"},
    {"name": "Jammu MMLP", "query": "Jammu, Jammu & Kashmir, India"},
    {"name": "Kandla MMLP", "query": "Kandla, Gujarat, India"},
    {"name": "Cochin MMLP", "query": "Cochin, Kerala, India"},
    {"name": "Amritsar MMLP", "query": "Amritsar, Punjab, India"},
    {"name": "Vijayawada MMLP", "query": "Vijayawada, Andhra Pradesh, India"},
    {"name": "Patna MMLP", "query": "Patna, Bihar, India"},
    {"name": "Valsad MMLP", "query": "Valsad, Gujarat, India"},
    {"name": "Guwahati MMLP", "query": "Guwahati, Assam, India"}
]

features = []
headers = {
    'User-Agent': 'ElectricFreightCorridorSitingModel/1.0 (contact: planning@smartfreight.org)'
}

for i, loc in enumerate(mmlp_locations):
    print(f"Geocoding {loc['name']} ({i+1}/{len(mmlp_locations)})...")
    url = f"https://nominatim.openstreetmap.org/search?q={loc['query']}&format=json&limit=1"
    try:
        r = requests.get(url, headers=headers)
        res = r.json()
        if res:
            lat = float(res[0]['lat'])
            lon = float(res[0]['lon'])
            print(f"  Found: {lat}, {lon}")
            features.append({
                "type": "Feature",
                "geometry": Point(lon, lat),
                "properties": {
                    "id": f"mmlp_{i+1}",
                    "name": loc['name'],
                    "city": loc['query'].split(',')[0],
                    "state": loc['query'].split(',')[1].strip() if ',' in loc['query'] else "Delhi"
                }
            })
        else:
            print(f"  Not found for query: {loc['query']}")
    except Exception as e:
        print(f"  Error: {e}")
    # Sleep to comply with Nominatim's strict usage policy (1 request per second)
    time.sleep(1.2)

if features:
    gdf = gpd.GeoDataFrame(features, crs="EPSG:4326")
    output_dir = "/Volumes/Sandisk SSD/Smartfrieght/Electric_Freight_Dashboard/web-app/public/data"
    os.makedirs(output_dir, exist_ok=True)
    gdf.to_file(os.path.join(output_dir, "india_mmlps.geojson"), driver="GeoJSON")
    print(f"\nSuccessfully geocoded and saved {len(features)} MMLPs to Web App public/data/india_mmlps.geojson")
else:
    print("\nNo MMLPs geocoded.")

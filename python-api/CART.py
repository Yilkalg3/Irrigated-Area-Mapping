import ee, geemap,time

# Intialize geemap
Map = geemap.Map(center=(10.41, 37.62), zoom=11)

jedeb = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Jedeb_Watershed")
#Map.addLayer(jedeb, {}, 'Jedeb Watershed')

# Set Dates (Based on Planting and Harvesting Date)

import ee, geemap,time

# Intialize geemap
Map = geemap.Map(center=(10.41, 37.62), zoom=11)

jedeb = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Jedeb_Watershed")
Map.addLayer(jedeb, {}, 'Jedeb Watershed', False)

# Set Dates (Based on Planting and Harvesting Date)
start = '2021-11-01'
end = '2022-05-30'
season = ee.Filter.date(start,end)

# Import Training Dataset
trainingGcp = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Training")
print(trainingGcp.size().getInfo())

# Import Validation Dataset
validationGcp = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Validation")
print(validationGcp.size().getInfo())

# Sentinel Surface Reflectance
def maskS2clouds(image):
  qa = image.select('QA60')

  # Bits 10 and 11 are clouds and cirrus, respectively.
  cloudBitMask = 1 << 10
  cirrusBitMask = 1 << 11

  # Both flags should be set to zero, indicating clear conditions.
  mask = qa.bitwiseAnd(cloudBitMask).eq(0) \
      .And(qa.bitwiseAnd(cirrusBitMask).eq(0))

  return image.updateMask(mask).divide(10000)

# Filter Sentinel 2 image of the season with could less than 20% 
sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filter(season)\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
 
# Median image
s2median = ee.Image(sentinel2.median()).clip(jedeb)
s2median.bandNames().getInfo()

visualization = {
  'min': 0.0,
  'max': 0.3,
  'bands': ['B4', 'B3', 'B2'],
}

Map.addLayer(s2median, visualization, 'RGB')

# Sentinel 1 
def boxcar(image, KERNEL_SIZE=5):
    bandNames = image.bandNames().remove('angle')
      #Define a boxcar kernel
    kernel = ee.Kernel.square((KERNEL_SIZE/2), units='pixels', normalize=True)
     #Apply boxcar
    output = image.select(bandNames).convolve(kernel).rename(bandNames)
    return image.addBands(output, None, True)

  # the acquisition times in the collection, formatted with Python's time module
acq_times = sentinel1.aggregate_array('system:time_start').getInfo()
[time.strftime('%x', time.gmtime(acq_time/1000)) for acq_time in acq_times]

# Mean of the season
s1mean = s1.median().select(["VV","VH"])

# using monthly median backscatter
s1Nov = sentinel1.filterDate("2021-11-01","2021-11-30").median().select(["VV","VH"],["VVnov","VHnov"])
s1Dec = sentinel1.filterDate("2021-12-01","2021-12-31").median().select(["VV","VH"],["VVdec","VHdec"])
s1Jan = sentinel1.filterDate("2022-01-01","2022-01-31").median().select(["VV","VH"],["VVjan","VHjan"])
s1Feb = sentinel1.filterDate("2022-02-01","2022-02-28").median().select(["VV","VH"],["VVfeb","VHfeb"])
s1Mar = sentinel1.filterDate("2022-03-01","2022-03-31").median().select(["VV","VH"],["VVmar","VHmar"])
s1Apr = sentinel1.filterDate("2022-04-01","2022-04-30").median().select(["VV","VH"],["VVapr","VHapr"])
s1May = sentinel1.filterDate("2022-05-01","2022-05-30").median().select(["VV","VH"],["VVmay","VHmay"])

s1monthly = s1Nov.addBands(s1Dec)\
                 .addBands(s1Jan)\
                 .addBands(s1Feb)\
                 .addBands(s1Mar)\
                 .addBands(s1Apr)\
                 .addBands(s1May)

#print(s1monthly.getInfo())

# Vegetation Indices 
# NDVI 
# Calculate NDVI
def getNDVI(image):
    # Compute the NDVI using an expression.
    NDVI = image.normalizedDifference(['B8', 'B4']).rename("NDVI")

    image = image.addBands(NDVI)

    return(image)

# using monthly median reflectance
sentinel2nov = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filterDate("2021-1-01","2021-11-30")\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
ndviNov = sentinel2nov.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviNov')
# ---------------
sentinel2dec = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filterDate("2021-12-01","2021-12-31")\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
ndviDec = sentinel2dec.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviDec')
# ---------------
sentinel2jan = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filterDate("2022-01-01","2022-01-31")\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
ndviJan = sentinel2jan.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviJan')
# ---------------
sentinel2feb = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filterDate("2022-02-01","2022-02-28")\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
ndviFeb = sentinel2feb.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviFeb')
# ---------------
sentinel2mar = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filterDate("2022-03-01","2022-03-31")\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
ndviMar = sentinel2mar.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviMar')
# ---------------
sentinel2apr = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filterDate("2022-04-01","2022-04-30")\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
ndviApr = sentinel2apr.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviApr')
# ---------------
sentinel2may = ee.ImageCollection('COPERNICUS/S2_SR')\
    .filterBounds(jedeb)\
    .filterDate("2022-05-01","2022-04-30")\
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))\
    .map(maskS2clouds)
ndviMay = sentinel2apr.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviMay')
# ---------------
ndvi = ndviNov.addBands(ndviDec)\
                 .addBands(ndviJan)\
                 .addBands(ndviFeb)\
                 .addBands(ndviMar)\
                 .addBands(ndviApr)\
                 .addBands(ndviMay)

Map.addLayer(ndvi, {}, 'NDVI', False)


def getSAVI

def getNDRE
# Auxillary Data 
dem = ee.Image("NASA/NASADEM_HGT/001").select('elevation')
slope = ee.Terrain.slope(dem)

dataset = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')
                  .filter(season)
precipitation = dataset.select('precipitation').sum()

# Composite preprocessed Data
composite = ee.Image.cat([(s2median),(s1mean),(s1monthly),(ndvi),(savi),(ndre),(slope),(precipitation)]);

sentinel_vi = composite.clip(jedeb)

var jedeb = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Jedeb_Watershed"),
    trainingGcp = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Training"),
    validationGcp = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Validation"),
    degaTraining = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Samples/Dega_Training"),
    degaValidation = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Samples/Dega_Validation"),
    wdegaTraining = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Samples/WD_Training"),
    wdegaValidation = ee.FeatureCollection("projects/ee-yilkalgebeyehu/assets/Samples/WD_Validation");

// Set Dates - based on irrigation season
var start = '2021-12-01';
var end = '2022-04-30';
var season = ee.Filter.date(start,end);

// Sentinel 2
/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterBounds(jedeb)
                  .filter(season)
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds)
                  .select('B2','B3','B4','B5','B6','B7','B8','B8A','B9','B11','B12');
// Median image
var s2median = ee.Image(sentinel2.median()).clip(jedeb);

// Sentinel 1 
var wrapper = require('users/adugnagirma/gee_s1_ard:wrapper');
var helper = require('users/adugnagirma/gee_s1_ard:utilities');

//---------------------------------------------------------------------------//
// DEFINE PARAMETERS
//---------------------------------------------------------------------------//

var parameter = {//1. Data Selection
              START_DATE: "2021-11-01",
              STOP_DATE: "2022-05-31",
              POLARIZATION:'VVVH',
              ORBIT : 'DESCENDING',
              GEOMETRY: jedeb,  
              //2. Additional Border noise correction
              APPLY_ADDITIONAL_BORDER_NOISE_CORRECTION: true,
              //3.Speckle filter
              APPLY_SPECKLE_FILTERING: true,
              SPECKLE_FILTER_FRAMEWORK: 'MONO',
              SPECKLE_FILTER: 'REFINED LEE',
              SPECKLE_FILTER_KERNEL_SIZE: 5,
              SPECKLE_FILTER_NR_OF_IMAGES: 10,
              //4. Radiometric terrain normalization
              APPLY_TERRAIN_FLATTENING: true,
              DEM: ee.Image('USGS/SRTMGL1_003'),
              TERRAIN_FLATTENING_MODEL: 'VOLUME',
              TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER: 0,
              //5. Output
              FORMAT : 'DB',
              CLIP_TO_ROI: false,
              SAVE_ASSETS: false
} 

//Preprocess the S1 collection
var s1_preprocces = wrapper.s1_preproc(parameter);

var s1 = s1_preprocces[0]
s1_preprocces = s1_preprocces[1]

// Season Mean 
var s1mean = s1.mean().select(["VV","VH"]);
// Monthly 

var s1Nov = ee.Image(s1.filterDate("2021-11-01","2021-11-30").mean()).select(["VV","VH"],["VVnov","VHnov"]);
var s1Dec = ee.Image(s1.filterDate("2021-12-01","2021-12-31").mean()).select(["VV","VH"],["VVdec","VHdec"]);
var s1Jan = ee.Image(s1.filterDate("2022-01-01","2022-01-31").mean()).select(["VV","VH"],["VVjan","VHjan"]);
var s1Feb = ee.Image(s1.filterDate("2022-02-01","2022-02-28").mean()).select(["VV","VH"],["VVfeb","VHfeb"]);
var s1Mar = ee.Image(s1.filterDate("2022-03-01","2022-03-31").mean()).select(["VV","VH"],["VVmar","VHmar"]);
var s1Apr = ee.Image(s1.filterDate("2022-04-01","2022-04-30").mean()).select(["VV","VH"],["VVapr","VHapr"]);
var s1May = ee.Image(s1.filterDate("2022-05-01","2022-05-31").mean()).select(["VV","VH"],["VVmay","VHmay"]);

var s1monthly = s1Nov.addBands(s1Dec)
                 .addBands(s1Jan)
                 .addBands(s1Feb)
                 .addBands(s1Mar)
                 .addBands(s1Apr)
                 .addBands(s1May);
                 
// Vegetation Indices 
// NDVI Function 
var getNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};

// November 
var sentinel2nov = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(jedeb)
    .filterDate("2021-11-01","2021-11-30")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .map(maskS2clouds);
    
var ndviNov = sentinel2nov.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviNov');

// December 
var sentinel2dec = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(jedeb)
    .filterDate("2021-12-01","2021-12-31")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .map(maskS2clouds);
    
var ndviDec = sentinel2dec.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviDec');

// January 
var sentinel2jan = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(jedeb)
    .filterDate("2022-01-01","2022-01-31")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .map(maskS2clouds);
    
var ndviJan = sentinel2jan.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviJan');

// February 
var sentinel2feb = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(jedeb)
    .filterDate("2022-02-01","2022-02-28")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .map(maskS2clouds); 
    
var ndviFeb = sentinel2feb.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviFeb');

// March 
var sentinel2mar = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(jedeb)
    .filterDate("2022-03-01","2022-03-31")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .map(maskS2clouds);
    
var ndviMar = sentinel2mar.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviMar');

// April 
var sentinel2apr = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(jedeb)
    .filterDate("2022-04-01","2022-04-30")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .map(maskS2clouds);
var ndviApr = sentinel2apr.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviApr');

// May 
var sentinel2may = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(jedeb)
    .filterDate("2022-05-01","2022-05-31")
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
    .map(maskS2clouds);
var ndviMay = sentinel2may.map(getNDVI).mean().clip(jedeb).select('NDVI').rename('ndviMay');

// Stack NDVI Monthly 
var ndvi = ndviNov.addBands(ndviDec)
                 .addBands(ndviJan)
                 .addBands(ndviFeb)
                 .addBands(ndviMar)
                 .addBands(ndviApr)
                 .addBands(ndviMay);
//Map.addLayer(ndvi, {}, 'NDVI');

// SAVI 
function getSAVI(image){
    var SAVI = image.expression(
        '(NIR - RED) / (NIR + RED + L)*(1+L)', {
            'NIR': image.select('B8'),
            'RED': image.select('B4'),
            'L':0.428
        }).rename("SAVI");

    image = image.addBands(SAVI);

    return(image);
}
// using monthly mean reflectance
var saviNov = sentinel2nov.map(getSAVI).mean().clip(jedeb).select('SAVI').rename('saviNov');
var saviDec = sentinel2dec.map(getSAVI).mean().clip(jedeb).select('SAVI').rename('saviDec');
var saviJan = sentinel2jan.map(getSAVI).mean().clip(jedeb).select('SAVI').rename('saviJan');
var saviFeb = sentinel2feb.map(getSAVI).mean().clip(jedeb).select('SAVI').rename('saviFeb');
var saviMar = sentinel2mar.map(getSAVI).mean().clip(jedeb).select('SAVI').rename('saviMar');
var saviApr = sentinel2apr.map(getSAVI).mean().clip(jedeb).select('SAVI').rename('saviApr');
var saviMay = sentinel2may.map(getSAVI).mean().clip(jedeb).select('SAVI').rename('saviMay');

var savi = saviNov.addBands(saviDec)
                 .addBands(saviJan)
                 .addBands(saviFeb)
                 .addBands(saviMar)
                 .addBands(saviApr)
                 .addBands(saviMay);

// NDRE (Normalized Difference Red Edge)
var getNDRE = function(image) {
  var ndre = image.normalizedDifference(['B8', 'B5']).rename('NDRE');
  return image.addBands(ndre);
};

// using monthly mean reflectance
var ndreNov = sentinel2nov.map(getNDRE).mean().clip(jedeb).select('NDRE').rename('ndreNov');
var ndreDec = sentinel2dec.map(getNDRE).mean().clip(jedeb).select('NDRE').rename('ndreDec');
var ndreJan = sentinel2jan.map(getNDRE).mean().clip(jedeb).select('NDRE').rename('ndreJan');
var ndreFeb = sentinel2feb.map(getNDRE).mean().clip(jedeb).select('NDRE').rename('ndreFeb');
var ndreMar = sentinel2mar.map(getNDRE).mean().clip(jedeb).select('NDRE').rename('ndreMar');
var ndreApr = sentinel2apr.map(getNDRE).mean().clip(jedeb).select('NDRE').rename('ndreApr');
var ndreMay = sentinel2may.map(getNDRE).mean().clip(jedeb).select('NDRE').rename('ndreMay');

var ndre = ndreNov.addBands(ndreDec)
                 .addBands(ndreJan)
                 .addBands(ndreFeb)
                 .addBands(ndreMar)
                 .addBands(ndreApr)
                 .addBands(ndreMay);

// NDWI (Normalized Difference Wetness Index)
var getNDWI = function(image) {
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  return image.addBands(ndwi);
};

// using monthly mean reflectance
var ndwiNov = sentinel2nov.map(getNDWI).mean().clip(jedeb).select('NDWI').rename('ndwiNov');
var ndwiDec = sentinel2dec.map(getNDWI).mean().clip(jedeb).select('NDWI').rename('ndwiDec');
var ndwiJan = sentinel2jan.map(getNDWI).mean().clip(jedeb).select('NDWI').rename('ndwiJan');
var ndwiFeb = sentinel2feb.map(getNDWI).mean().clip(jedeb).select('NDWI').rename('ndwiFeb');
var ndwiMar = sentinel2mar.map(getNDWI).mean().clip(jedeb).select('NDWI').rename('ndwiMar');
var ndwiApr = sentinel2apr.map(getNDWI).mean().clip(jedeb).select('NDWI').rename('ndwiApr');
var ndwiMay = sentinel2may.map(getNDWI).mean().clip(jedeb).select('NDWI').rename('ndwiMay');

var ndwi = ndwiNov.addBands(ndwiDec)
                 .addBands(ndwiJan)
                 .addBands(ndwiFeb)
                 .addBands(ndwiMar)
                 .addBands(ndwiApr)
                 .addBands(ndwiMay);

// Auxillary Data
var dem = ee.Image("NASA/NASADEM_HGT/001").select('elevation');
var slope = ee.Terrain.slope(dem);

var dataset = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')
                  .filter(season);
var precipitation = dataset.select('precipitation').mean();
// Composite 
var composite = ee.Image.cat([(s2median),(s1mean),(s1monthly),(ndvi),(savi),(ndre),(ndwi),(slope),(precipitation)]);

var sentinel_vi = composite.clip(jedeb); 

// Train the classifier 
// This property the table stores the land cover labels.
var bands = ['B2','B3','B4','B5','B6','B7','B8','B8A','B11','B12','VV','VH',
          'VVnov','VVdec','VVjan','VVfeb','VVmar','VVapr','VVmay',
          'VHnov','VHdec','VHjan','VHfeb','VHmar','VHapr','VHmay',
          'ndviNov','ndviDec','ndviJan','ndviFeb','ndviMar','ndviApr','ndviMay',
          'saviNov','saviDec','saviJan','saviFeb','saviMar','saviApr','saviMay',
          'ndreNov','ndreDec','ndreJan','ndreFeb','ndreMar','ndreApr','ndreMay',
          'ndwiNov','ndwiDec','ndwiJan','ndwiFeb','ndwiMar','ndwiApr','ndwiMay',
          'slope','precipitation'];
var label = 'Cover';

// Overlay the points on the imagery to get training.
var sample = sentinel_vi.sampleRegions(
    {'collection': trainingGcp, 'properties': [label], 'scale': 10}
);


/**************************************************************************************************************************************
 CLASSIFICATION & ACCURACY
  1) Machine Learning Classification Algorithms: The performance of four algorithms are compared --> 
    I) Classification and Regression Tree (CART)
    II) Gradient Tree Boost (GTB)
    III) Random Forest (RF) 
    III) Support Vector Machine (SVM)
  2) For each performed classification test, a measure of accuracy is performed considering -->
    I) Overall Accuracy (OA): It is the total percentage of classification, 
       given by the ratio between the number of correctly classified units and their total number. 
    II) User's Accuracy (UA): It is the ratio between correctly classified and all classified units in a given class
    III) Producer's Accuracy (PA): It is the ratio between the number of correctly classified units and the number of validation units in a given class
 
 F score??, 
***************************************************************************************************************************************/

// CART Classification 
var CART_classifier = ee.Classifier.smileCart(40).train(sample, label, bands);
// Get information about the trained classifier.
print('CART_Explanation', CART_classifier.explain());

// Classify the image with the same bands used for training.
var CART = sentinel_vi.classify(CART_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = CART.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('CART Confusion Matrix', test_accuracy);

print('CART Overall Accuracy', test_accuracy.accuracy());

print('CART Kappa', test_accuracy.kappa());

print('CART Producers Accuracy', test_accuracy.producersAccuracy());

print('CART Consumers Accuracy', test_accuracy.consumersAccuracy());

// GTB Classification 
var GTB_classifier = ee.Classifier.smileGradientTreeBoost(75,0.25, 1, null, null, 0).train(sample, label, bands);
// Get information about the trained classifier.
print('GTB_Explanation', GTB_classifier.explain());

// Classify the image with the same bands used for training.
var GTB = sentinel_vi.classify(GTB_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = GTB.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('GTB Confusion Matrix', test_accuracy);

print('GTB Overall Accuracy', test_accuracy.accuracy());

print('GTB Kappa', test_accuracy.kappa());

print('GTB Producers Accuracy', test_accuracy.producersAccuracy());

print('GTB Consumers Accuracy', test_accuracy.consumersAccuracy());

// RF Classification 
var RF_classifier = ee.Classifier.smileRandomForest(200, 5, 1, 0.85, null, 0).train(sample, label, bands);
// Get information about the trained classifier.
print('RF_Explanation', RF_classifier.explain());

// Classify the image with the same bands used for training.
var RF = sentinel_vi.classify(RF_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = RF.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('RF Confusion Matrix', test_accuracy);

print('RF Overall Accuracy', test_accuracy.accuracy());

print('RF Kappa', test_accuracy.kappa());

print('RF Producers Accuracy', test_accuracy.producersAccuracy());

print('RF Consumers Accuracy', test_accuracy.consumersAccuracy());

// SVM Classification 
var SVM_classifier = ee.Classifier.libsvm({cost: 295}).train(sample, label, bands);
// Get information about the trained classifier.
print('SVM_Explanation', SVM_classifier.explain());

// Classify the image with the same bands used for training.
var SVM = sentinel_vi.classify(SVM_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = SVM.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('SVM Confusion Matrix', test_accuracy);

print('SVM Overall Accuracy', test_accuracy.accuracy());

print('SVM Kappa', test_accuracy.kappa());

print('SVM Producers Accuracy', test_accuracy.producersAccuracy());

print('SVM Consumers Accuracy', test_accuracy.consumersAccuracy());


//Display Map 
// Define a palette for the classification.
var Palette = [
    'A59B8F', //Bare
    'C4281B', //Built
    'E49635', //crops
    '397D49', //Forest
    '6EFC6A', //Irrigation
    '88B053', //Rangeland
    '419BDF', //water
];

// Visualization 
var s2visualization = {
  min: 0.0,
  max: 0.3,
  bands: ['B4', 'B3', 'B2'],
};

Map.setCenter(37.61, 10.5009, 10);
Map.addLayer(s2median, s2visualization, 'RGB',false);
Map.addLayer(CART, {'palette': Palette, 'min': 1, 'max': 7}, 'CART', false);
Map.addLayer(GTB, {'palette': Palette, 'min': 1, 'max': 7}, 'GTB', false);
Map.addLayer(RF, {'palette': Palette, 'min': 1, 'max': 7}, 'RF', false);
Map.addLayer(SVM, {'palette': Palette, 'min': 1, 'max': 7}, 'SVM', false);

// Calculate Statistics 
print('Irrigation Area (ha)');
// CART 
var irrigation = CART.eq(5);
var areaImage = irrigation.multiply(ee.Image.pixelArea());
var area = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: jedeb.geometry(),
  scale: 10,
  maxPixels: 1e10
  });
  
var IrrigationAreaha = ee.Number(area.get('classification')).divide(1e4).round();
print('CART', IrrigationAreaha);

//GTB
var irrigation = GTB.eq(5);
var areaImage = irrigation.multiply(ee.Image.pixelArea());
var area = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: jedeb.geometry(),
  scale: 10,
  maxPixels: 1e10
  });
  
var IrrigationAreaha = ee.Number(area.get('classification')).divide(1e4).round();
print('GTB', IrrigationAreaha);

//RF
var irrigation = RF.eq(5);
var areaImage = irrigation.multiply(ee.Image.pixelArea());
var area = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: jedeb.geometry(),
  scale: 10,
  maxPixels: 1e10
  });
  
var IrrigationAreaha = ee.Number(area.get('classification')).divide(1e4).round();
print('RF', IrrigationAreaha);

//SVM 
var irrigation = SVM.eq(5);
var areaImage = irrigation.multiply(ee.Image.pixelArea());
var area = areaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: jedeb.geometry(),
  scale: 10,
  maxPixels: 1e10
  });
  
var IrrigationAreaha = ee.Number(area.get('classification')).divide(1e4).round();
print('SVM', IrrigationAreaha);

// Importance in Percent (out of 100)
// CART
var importance = ee.Dictionary(CART_classifier.explain().get('importance'));
var totalImportance = importance.values().reduce(ee.Reducer.sum());
var importancePercentage = importance.map(function(band, importance) {
    return ee.Number(importance).divide(totalImportance).multiply(100);
});

print('CART Importance (%)', importancePercentage);

// GTB
var importance = ee.Dictionary(GTB_classifier.explain().get('importance'));
var totalImportance = importance.values().reduce(ee.Reducer.sum());
var importancePercentage = importance.map(function(band, importance) {
    return ee.Number(importance).divide(totalImportance).multiply(100);
});

print('GTB Importance (%)', importancePercentage);

// RF
var importance = ee.Dictionary(RF_classifier.explain().get('importance'));
var totalImportance = importance.values().reduce(ee.Reducer.sum());
var importancePercentage = importance.map(function(band, importance) {
    return ee.Number(importance).divide(totalImportance).multiply(100);
});

print('RF Importance (%)', importancePercentage);

// Plot the importance of each band in a bar plot
var dict_featImportance = RF_classifier.explain();
var variable_importance = ee.Feature(null, ee.Dictionary(dict_featImportance).get('importance'));
var chart =
ui.Chart.feature.byProperty(variable_importance)
.setChartType('ColumnChart')
.setOptions({
title: 'Random Forest Variable Importance',
legend: {position: 'none'},
hAxis: {title: 'Bands'},
vAxis: {title: 'Importance'}
});
print(chart);

// Export Map to Drive
Export.image.toDrive({
  image: CART,
  description: 'CART_2014',
  region: jedeb
});


// Based on Agroecology
// 1. Woyna Dega
// Overlay the points on the imagery to get training.
var sample = sentinel_vi.sampleRegions(
    {'collection': wdegaTraining, 'properties': [label], 'scale': 10}
);

// CART Classification 
var CART_classifier = ee.Classifier.smileCart(40).train(sample, label, bands);
// Get information about the trained classifier.
print('Woyna Dega CART_Explanation', CART_classifier.explain());

// Classify the image with the same bands used for training.
var CART = sentinel_vi.classify(CART_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = CART.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Woyna Dega CART Confusion Matrix', test_accuracy);

print('Woyna Dega CART Overall Accuracy', test_accuracy.accuracy());

print('Woyna Dega CART Kappa', test_accuracy.kappa());

print('Woyna Dega CART Producers Accuracy', test_accuracy.producersAccuracy());

print('Woyna Dega CART Consumers Accuracy', test_accuracy.consumersAccuracy());

// GTB Classification 
var GTB_classifier = ee.Classifier.smileGradientTreeBoost(75,0.25, 1, null, null, 0).train(sample, label, bands);
// Get information about the trained classifier.
print('Woyna Dega GTB_Explanation', GTB_classifier.explain());

// Classify the image with the same bands used for training.
var GTB = sentinel_vi.classify(GTB_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = GTB.select(band).sampleRegions(
    {'collection': wdegaValidation, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Woyna Dega GTB Confusion Matrix', test_accuracy);

print('Woyna Dega GTB Overall Accuracy', test_accuracy.accuracy());

print('Woyna Dega GTB Kappa', test_accuracy.kappa());

print('Woyna Dega GTB Producers Accuracy', test_accuracy.producersAccuracy());

print('Woyna Dega GTB Consumers Accuracy', test_accuracy.consumersAccuracy());

// RF Classification 
var RF_classifier = ee.Classifier.smileRandomForest(200, 5, 1, 0.85, null, 0).train(sample, label, bands);
// Get information about the trained classifier.
print('Woyna Dega RF_Explanation', RF_classifier.explain());

// Classify the image with the same bands used for training.
var RF = sentinel_vi.classify(RF_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = RF.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Woyna Dega RF Confusion Matrix', test_accuracy);

print('Woyna Dega RF Overall Accuracy', test_accuracy.accuracy());

print('Woyna Dega RF Kappa', test_accuracy.kappa());

print('Woyna Dega RF Producers Accuracy', test_accuracy.producersAccuracy());

print('Woyna Dega RF Consumers Accuracy', test_accuracy.consumersAccuracy());

// SVM Classification 
var SVM_classifier = ee.Classifier.libsvm({cost: 295}).train(sample, label, bands);
// Get information about the trained classifier.
print('Woyna Dega SVM_Explanation', SVM_classifier.explain());

// Classify the image with the same bands used for training.
var SVM = sentinel_vi.classify(SVM_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = SVM.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Woyna Dega SVM Confusion Matrix', test_accuracy);

print('Woyna Dega SVM Overall Accuracy', test_accuracy.accuracy());

print('Woyna Dega SVM Kappa', test_accuracy.kappa());

print('Woyna Dega SVM Producers Accuracy', test_accuracy.producersAccuracy());

print('Woyna Dega SVM Consumers Accuracy', test_accuracy.consumersAccuracy());

// 2. Dega
// Overlay the points on the imagery to get training.
var sample = sentinel_vi.sampleRegions(
    {'collection': degaTraining, 'properties': [label], 'scale': 10}
);

// CART Classification 
var CART_classifier = ee.Classifier.smileCart(40).train(sample, label, bands);
// Get information about the trained classifier.
print('Dega CART_Explanation', CART_classifier.explain());

// Classify the image with the same bands used for training.
var CART = sentinel_vi.classify(CART_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = CART.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Dega CART Confusion Matrix', test_accuracy);

print('Dega CART Overall Accuracy', test_accuracy.accuracy());

print('Dega CART Kappa', test_accuracy.kappa());

print('Dega CART Producers Accuracy', test_accuracy.producersAccuracy());

print('Dega CART Consumers Accuracy', test_accuracy.consumersAccuracy());

// GTB Classification 
var GTB_classifier = ee.Classifier.smileGradientTreeBoost(75,0.25, 1, null, null, 0).train(sample, label, bands);
// Get information about the trained classifier.
print('Dega GTB_Explanation', GTB_classifier.explain());

// Classify the image with the same bands used for training.
var GTB = sentinel_vi.classify(GTB_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = GTB.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Dega GTB Confusion Matrix', test_accuracy);

print('Dega GTB Overall Accuracy', test_accuracy.accuracy());

print('Dega GTB Kappa', test_accuracy.kappa());

print('Dega GTB Producers Accuracy', test_accuracy.producersAccuracy());

print('Dega GTB Consumers Accuracy', test_accuracy.consumersAccuracy());

// RF Classification 
var RF_classifier = ee.Classifier.smileRandomForest(200, 5, 1, 0.85, null, 0).train(sample, label, bands);
// Get information about the trained classifier.
print('Dega RF_Explanation', RF_classifier.explain());

// Classify the image with the same bands used for training.
var RF = sentinel_vi.classify(RF_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = RF.select(band).sampleRegions(
    {'collection': degaValidation, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Dega RF Confusion Matrix', test_accuracy);

print('Dega RF Overall Accuracy', test_accuracy.accuracy());

print('Dega RF Kappa', test_accuracy.kappa());

print('Dega RF Producers Accuracy', test_accuracy.producersAccuracy());

print('Dega RF Consumers Accuracy', test_accuracy.consumersAccuracy());

// SVM Classification 
var SVM_classifier = ee.Classifier.libsvm({cost: 295}).train(sample, label, bands);
// Get information about the trained classifier.
print('Dega SVM_Explanation', SVM_classifier.explain());

// Classify the image with the same bands used for training.
var SVM = sentinel_vi.classify(SVM_classifier);

// Accuracy Assessment 
var band = 'classification';
// Overlay the points on the imagery to get training.
var test = SVM.select(band).sampleRegions(
    {'collection': validationGcp, 'properties':[label],'scale': 10}
);

var test_accuracy = test.errorMatrix('Cover', 'classification');
print('Dega SVM Confusion Matrix', test_accuracy);

print('Dega SVM Overall Accuracy', test_accuracy.accuracy());

print('Dega SVM Kappa', test_accuracy.kappa());

print('Dega SVM Producers Accuracy', test_accuracy.producersAccuracy());

print('Dega SVM Consumers Accuracy', test_accuracy.consumersAccuracy());

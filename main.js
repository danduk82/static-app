window.onload = main;
const resolutions = [
    4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250,
    1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5
];
const extent = [2420000.0, 1030000.0, 2900000.0, 1350000.0];
 

/**
 * parseUrlList: takes a list from URL, comma separated, and returns a parsed array
 * @param {*} parameter : the parameter name ( a comma separated string )
 * @param {*} callback : callback function to cast from string to. E.g. parseFloat
 */
function parseUrlList(parameter, callback){
    var a = [];
    parameter.split(',').forEach(t => {
        a.push(callback(t));
    })
    return a
}

/**
 * checks that there is a '?' characher in WMS server url, otherwise adds it to the url
 * @returns String: the sanitized url
 * @param {*} url 
 */
function sanitizeUrl(url){
    return (url.indexOf('?') < 0) ? url+'?' : url;
}

async function createWMTSlayers(wmtsLayersConfig, projection){
    var WMTSparser = new ol.format.WMTSCapabilities();
    var wmtsLayers = [];
    var wmtsHtmlContent = '';
    wmtsLayersConfig.forEach(async (element) => {
        var capabilitiesText = await fetch(element.serverurl).then((response) => response.text());
        var WMTScapabilities = WMTSparser.read(capabilitiesText);
        wmtsHtmlContent += `<h3>${element.title}</h3>`;
        element.layers.forEach(layer => {
            var wmtsLayer = new ol.layer.Tile({
                opacity: 1,
                source: new ol.source.WMTS(ol.source.WMTS.optionsFromCapabilities(WMTScapabilities, {
                    layer: layer.name,
                    matrixSet: layer.matrixset,
                    projection: projection,
                })),
                title: layer.title,
                visible: false
            })
            wmtsLayers.push(wmtsLayer);
            wmtsHtmlContent += `<input type="radio" name="wmtsLayersRadioButton" value="${layer.name}">${layer.title}<br>`;
        });
    });
    const WMTSBaseLayerGroup = new ol.layer.Group({
        layers: wmtsLayers
    })
    return {layers: WMTSBaseLayerGroup, htmlPart: wmtsHtmlContent};
}


async function createWMSlayers(wmsLayersConfig){
    // construct WMS layer tree
    var WMSparser = new ol.format.WMSCapabilities();
    var wmsLayers = [];
    var wmsHtmlContent = '';
    for (const element of wmsLayersConfig) {
    //wmsLayersConfig.forEach(async(element) => {
        wmsHtmlContent += `<h3>${element.title}</h3>`;
        var WMSrawCap = await fetch(sanitizeUrl(element.serverurl) + `&SERVICE=WMS&VERSION=${element.version}&REQUEST=Capabilities`).then((response) => response.text())
        var WMSCapabilites = WMSparser.read(WMSrawCap);
        element.layers.forEach(layer => {
            wmsHtmlContent += `<input type="radio" name="wmsLayersRadioButton" value="${layer.name}">${layer.title}<br>`;
            var newLayer = new ol.layer.Image({
                extent: extent,
                visible: false,
                title: layer.title,
                name: layer.name,
                source: new ol.source.ImageWMS({
                    url: sanitizeUrl(element.serverurl),
                    crossOrigin: 'anonymous',
                    params: {
                    'LAYERS': layer.name,
                    'FORMAT': 'image/png',
                    'VERSION': element.version
                    },
                    serverType: 'mapserver',
                })
                });
            wmsLayers.push(newLayer);

        });
    }
    return {layers: wmsLayers, htmlPart: wmsHtmlContent};
}


async function main(){
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    var center = urlParams.get('center') ? parseUrlList(urlParams.get('center'), parseFloat) : [2561892.6539999316,1205224.086300917]
    console.log(center);
    var configFile = urlParams.get('config') ? urlParams.get('config') : './layer-config.json';

    var WMTSparser = new ol.format.WMTSCapabilities();
        
    var projection2056 = new ol.proj.Projection({
      code: 'EPSG:2056',
      // The extent is used to determine zoom level 0. Recommended values for a
      // projection's validity extent can be found at https://epsg.io/.
      extent: extent,
      units: 'm',
    });
    ol.proj.addProjection(projection2056);
    // We have to set the extent!
    projection2056.setExtent([2420000, 130000, 2900000, 1350000]);

    const mapview = new ol.View({
        center: center,
        projection: projection2056,
        zoom: 14,
    });
    // var capabilitesResponse = await fetch('https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml');
    // const capabilitiesText = capabilitesResponse.capabilitiesText()
    const allCaps = [
        fetch('https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml').then((response) => response.text())
    ];
    const allCapabilites = await Promise.all(allCaps);
    // const capabilitiesText = await fetch('https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml').then((response) => response.text());
    // var WMTScapabilities = WMTSparser.read(capabilitiesText);
    var WMTScapabilities = WMTSparser.read(allCapabilites[0]);
    const wmtsLayer1 = new ol.layer.Tile({
        opacity: 1,
        source: new ol.source.WMTS(ol.source.WMTS.optionsFromCapabilities(WMTScapabilities, {
            layer: 'ch.swisstopo.swissimage-product',
            matrixSet: '2056_26',
            projection: projection2056,
        })),
        title: 'SwisstopoOrthophoto',
        visible: true
    }) 
    const wmtsLayer2 = new ol.layer.Tile({
        opacity: 1,
        source: new ol.source.WMTS(ol.source.WMTS.optionsFromCapabilities(WMTScapabilities, {
            layer: 'ch.swisstopo.pixelkarte-farbe',
            matrixSet: '2056_26',
            projection: projection2056,
        })),
        title: 'SwisstopoColorBaseMap',
        visible: false
    }) 
    const wmtsLayer3 = new ol.layer.Tile({
        opacity: 1,
        source: new ol.source.WMTS(ol.source.WMTS.optionsFromCapabilities(WMTScapabilities, {
            layer: 'ch.swisstopo.pixelkarte-grau',
            matrixSet: '2056_26',
            projection: projection2056,
        })),
        title: 'SwisstopoGreyBaseMap',
        visible: false
    }) 
 
    const WMTSBaseLayerGroup = new ol.layer.Group({
        layers: [
            wmtsLayer1, wmtsLayer2, wmtsLayer3
        ]
    })
    
    const map = new ol.Map({
        target: 'js-map',
        view: mapview,
    });
    map.addLayer(WMTSBaseLayerGroup);
    const layerConfig = await fetch(configFile).then((response) => response.json());
    console.log(`layerConfig : ${layerConfig}`);

    var LayersHtmlContent = '';
    var wmsStuff = createWMSlayers(layerConfig.wms);
    
    const LayerGroup = new ol.layer.Group({
        layers: (await wmsStuff).layers,
    })
    map.addLayer(LayerGroup);
    
    document.getElementById('layers').innerHTML = LayersHtmlContent + (await wmsStuff).htmlPart;
    // const LayerGroup = new ol.layer.Group({
    //     layers: wmsLayers,
    // })
    // map.addLayer(LayerGroup);
    // document.getElementById('layers').innerHTML = wmsHtmlContent;

    const overlayContainerElement = document.querySelector('.overlay-container');
    // const overlayLayer = ol.Overlay({
    //     element: overlayContainerElement
    // })
    // map.addOverlay(overlayLayer);
    // const overlayFeatureName = document.getElementById('feature-name');
    // const overlayFeatureInfo = document.getElementById('feature-additionalinfo');

    map.on('click',function(e){
        // overlayLayer.setPosition(undefined);
        let clickedCoordinates = e.coordinate;
        console.log(`clicked coordinates: ${clickedCoordinates}`);
        // map.forEachFeatureAtPixel(e.pixel, function(feature, layer){
        //     console.log(feature.getKeys());
        //     overlayLayer.setPosition(clickedCoordinates);
        //     let clickedFeatureName = (feature.get('name'));
        //     let clickedFeatureAdditionalInfo = (feature.get('additionalinfo'));
        //     overlayFeatureName.innerHTML = clickedFeatureName;
        //     overlayFeatureInfo.innerHTML = clickedFeatureAdditionalInfo;
        // })
    })

    // layer selector
    const LayerElements = document.querySelectorAll('.layers > input[type=radio]');
    for(let LayerElement of LayerElements){
        LayerElement.addEventListener('change', function(){
            let LayerElementValue = this.value;
            LayerGroup.getLayers().forEach(function(element, index, array){
               let layerTitle = element.get('name');
               element.setVisible(layerTitle === LayerElementValue);
            })
        })
    }

    // basemap selector
    const baseLayerElements = document.querySelectorAll('.baselayers > input[type=radio]');
    for(let baseLayerElement of baseLayerElements){
        baseLayerElement.addEventListener('change', function(){
            let baseLayerElementValue = this.value;
            WMTSBaseLayerGroup.getLayers().forEach(function(element, index, array){
               let baseLayerTitle = element.get('title');
               element.setVisible(baseLayerTitle === baseLayerElementValue);
            })
        })
    }
}

// function recenter(east, north) {
//     var map = document.getElementById('js-map');
//     map.getView().setCenter([east, north]);
// }

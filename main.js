window.onload = main;

// keep this resolution as reminder, as it is the default resolutions of geo.admin.ch
// and it is difficult to find their definition, even if we do not use it right now
const resolutions = [
    4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250,
    1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5
];

// FIXME: remove this global variable and put it as parameter or in the config
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

/**
 * for a given configuration WMTS element, create the WMTS layer in OL and the html partial for the layer tree 
 * @param {*} element 
 * @param {*} projection 
 * @param {*} radioButtonId 
 */
async function createWMTSlayers(element, projection, radioButtonId){
    var WMTSparser = new ol.format.WMTSCapabilities();
    var wmtsLayers = [];
    var wmtsHtmlContent = element.title ? `<h3>${element.title}</h3>`:'';
    var capabilitiesText = await fetch(element.serverurl).then((response) => response.text());
    var WMTScapabilities = WMTSparser.read(capabilitiesText);
    element.layers.forEach(layer => {
        visible = layer.checked ? true : false
        var wmtsLayer = new ol.layer.Tile({
            opacity: 1,
            source: new ol.source.WMTS(ol.source.WMTS.optionsFromCapabilities(WMTScapabilities, {
                layer: layer.name,
                matrixSet: layer.matrixset,
                projection: projection,
            })),
            title: layer.title,
            name: layer.name,
            visible: visible
        })
        wmtsLayers.push(wmtsLayer);
        checked = visible ? 'checked' : '';
        wmtsHtmlContent += `<input type="radio" ${checked}  name="${radioButtonId}" value="${layer.name}">${layer.title}<br>`;
    });
    return {layers: wmtsLayers, htmlPart: wmtsHtmlContent};
}

/**
 * for a given configuration WMS element, create the WMS layer in OL and the html partial for the layer tree
 * @param {*} element 
 * @param {*} radioButtonId 
 */
async function createWMSlayers(element, radioButtonId){
    // construct WMS layer tree
    var WMSparser = new ol.format.WMSCapabilities();
    var wmsLayers = [];
    var wmsHtmlContent = element.title ? `<h3>${element.title}</h3>`:'';
    var WMSrawCap = await fetch(sanitizeUrl(element.serverurl) + `&SERVICE=WMS&VERSION=${element.version}&REQUEST=Capabilities`).then((response) => response.text())
    var WMSCapabilites = WMSparser.read(WMSrawCap);
    element.layers.forEach(layer => {
        visible = layer.checked ? true : false
        checked = visible ? 'checked' : '';
        wmsHtmlContent += `<input type="radio" ${checked} name="${radioButtonId}" value="${layer.name}">${layer.title}<br>`;
        var newLayer = new ol.layer.Image({
            extent: extent,
            visible: visible,
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
    return {layers: wmsLayers, htmlPart: wmsHtmlContent};
}

/**
 * create the full layer tree html component and register the layers as OL layers
 * @param {*} config 
 * @param {*} projection 
 * @param {*} radioButtonId 
 */
async function createLayerTree(config, projection, radioButtonId){
    var layerTree = {
        "layers":[],
        "html":''
    };
    var partLayerTree;
    for (const element of config) {
        if (element.type === 'wmts'){
            partLayerTree = createWMTSlayers(element, projection, radioButtonId)
        }
        else if (element.type === 'wms'){
            partLayerTree = createWMSlayers(element, radioButtonId)
        }
        layerTree.layers.push((await partLayerTree).layers);
        layerTree.html += (await partLayerTree).htmlPart;
    }
    layerTree.layers = [].concat.apply([], layerTree.layers);
    return layerTree;
}

/**
 * function that registers a "change" event listener on each layer of all LayerElements (html radio button)
 * to change also the "visible" attribute of the corresponding layer in a LayerGroup
 * @param {*} LayerElements 
 * @param {*} LayerGroup 
 */
function registerChangeEventOnLayerTree(LayerElements, LayerGroup){
    for(let LayerElement of LayerElements){
        LayerElement.addEventListener('change', function(){
            let LayerElementValue = this.value;
            LayerGroup.getLayers().forEach(function(element, index, array){
            let layerTitle = element.get('name');
            element.setVisible(layerTitle === LayerElementValue);
            })
        })
    }
}


/**
 * function to move the focus point without reloading the app from the console
 * @param {*} east 
 * @param {*} north 
 */
function recenter(east, north) {
    let event = new CustomEvent("recenter", {detail:{east: east, north: north}});
    document.dispatchEvent(event);
}

async function main(){
    // parse URL parameters
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    var center = urlParams.get('center') ? parseUrlList(urlParams.get('center'), parseFloat) : [2561892.6539999316,1205224.086300917]
    var configFile = urlParams.get('config') ? urlParams.get('config') : './layer-config.json';

    // define the swiss LV95 projection
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

    // create the map component
    const mapview = new ol.View({
        center: center,
        projection: projection2056,
        zoom: 14,
    });
    const map = new ol.Map({
        target: 'js-map',
        view: mapview,
    });
    // register a "recenter" event so that we can move the focus point without reloading the app
    document.addEventListener("recenter", function(event) {
        mapview.setCenter([event.detail.east, event.detail.north]);
    });

    // load layer tree config from config file
    const layerTreeConfig = await fetch(configFile).then((response) => response.json());
    
    // background layers
    const baseLayersRadioButtonId = 'baseLayersRadioButton';
    var baseLayersHtmlContent = `<h2>Background</h2>`;
    var baseLayersStuff = createLayerTree(layerTreeConfig.baselayers, projection2056, baseLayersRadioButtonId);
    const WMTSBaseLayerGroup = new ol.layer.Group({
        layers: (await baseLayersStuff).layers
    })
    map.addLayer(WMTSBaseLayerGroup);
    document.getElementById('baselayers').innerHTML = baseLayersHtmlContent + (await baseLayersStuff).html + `<input type="radio" name="${baseLayersRadioButtonId}" value="None">None<br>`;
    // basemap selector
    const baseLayerElements = document.querySelectorAll('.baselayers > input[type=radio]');
    registerChangeEventOnLayerTree(baseLayerElements, WMTSBaseLayerGroup);

    // normal layers
    const layersRadioButtonId = 'layersRadioButton';
    var layersHtmlContent = `<h2>Layers</h2><input type="radio" name="${layersRadioButtonId}" value="None">None<br>`;
    var layersStuff = createLayerTree(layerTreeConfig.layertree, projection2056, layersRadioButtonId);
    const LayerGroup = new ol.layer.Group({
        layers: (await layersStuff).layers,
    })
    map.addLayer(LayerGroup);
    document.getElementById('layers').innerHTML = layersHtmlContent + (await layersStuff).html;
    // layer selector
    const LayerElements = document.querySelectorAll('.layers > input[type=radio]');
    registerChangeEventOnLayerTree(LayerElements, LayerGroup);
    


    // TODO: add an 
    // overlay for popup infobox
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

}



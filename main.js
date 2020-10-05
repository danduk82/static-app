window.onload = init;
const resolutions = [
    4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250,
    1000, 750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5
];
const extent = [2420000.0, 1030000.0, 2900000.0, 1350000.0];
 

async function init(){
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

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
        center: [2561892.6539999316,1205224.086300917],
        projection: projection2056,
        zoom: 14,
    });
    // var capabilitesResponse = await fetch('https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml');
    // const capabilitiesText = capabilitesResponse.capabilitiesText()
    const allCaps = [
        fetch('https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml').then((response) => response.text()),
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

  
    const WMTSLayerGroup = new ol.layer.Group({
        layers: [
            wmtsLayer1, wmtsLayer2, wmtsLayer3
        ]
    })
    
    const map = new ol.Map({
        target: 'js-map',
        view: mapview,
    });
    map.addLayer(WMTSLayerGroup);

    
    // construct WMS layer tree
    var WMSparser = new ol.format.WMSCapabilities();
    var ogcServer = 'https://sitn.ne.ch/production/wsgi/mapserv_proxy?ogcserver=source+for+image%2Fpng&cache_version=c7559c4ea1aa46b0997e4998b6436977'
    var WMSrawCap = await fetch(ogcServer + '&SERVICE=WMS&VERSION=1.3.0&REQUEST=Capabilities').then((response) => response.text())
    var WMSCapabilites = WMSparser.read(WMSrawCap);
    //WMSCapabilites.Capability.Layer.Layer.forEach(element => console.log(element));

    var wmsHtmlContent = '<h2>WMS layers</h2>';
    var wmsLayers = [];
    WMSCapabilites.Capability.Layer.Layer.forEach(element => {
        wmsHtmlContent += `<input type="radio" name="wmsLayersRadioButton" value="${element.Name}">${element.Title}<br>`;
        var newLayer = new ol.layer.Tile({
            extent: extent,
            visible: false,
            title: element.Title,
            name: element.Name,
            source: new ol.source.TileWMS({
                url: ogcServer,
                crossOrigin: 'anonymous',
                params: {
                'LAYERS': element.Name,
                'FORMAT': 'image/png',
                'TILED': true,
                'VERSION': '1.3.0'
                },
                serverType: 'mapserver',
            })
            });
        wmsLayers.push(newLayer);
    });
    const WMSLayerGroup = new ol.layer.Group({
        layers: wmsLayers,
    })
    map.addLayer(WMSLayerGroup);
    document.getElementById('wmslayers').innerHTML = wmsHtmlContent;


    // document.getElementById('log').innerText = JSON.stringify(WMSCapabilites, null, 2);
      

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

    // layer selector WMS
    const WMSLayerElements = document.querySelectorAll('.wmslayers > input[type=radio]');
    for(let WMSLayerElement of WMSLayerElements){
        WMSLayerElement.addEventListener('change', function(){
            let WMSLayerElementValue = this.value;
            WMSLayerGroup.getLayers().forEach(function(element, index, array){
               let wmsLayerTitle = element.get('name');
               element.setVisible(wmsLayerTitle === WMSLayerElementValue);
            })
        })
    }

    // layer selector basemap
    const baseLayerElements = document.querySelectorAll('.baselayers > input[type=radio]');
    for(let baseLayerElement of baseLayerElements){
        baseLayerElement.addEventListener('change', function(){
            let baseLayerElementValue = this.value;
            WMTSLayerGroup.getLayers().forEach(function(element, index, array){
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

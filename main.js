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
        center: [2704797.927462143, 1133233.253751486],
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
  
    const WMTSLayerGroup = new ol.layer.Group({
        layers: [
            wmtsLayer1, wmtsLayer2
        ]
    })
    
    const map = new ol.Map({
        target: 'js-map',
        view: mapview,
    });
    map.addLayer(WMTSLayerGroup);

    
    var WMSparser = new ol.format.WMSCapabilities();
    

    
    fetch('https://sitn.ne.ch/production/wsgi/mapserv_proxy?ogcserver=source+for+image%2Fpng&cache_version=c7559c4ea1aa46b0997e4998b6436977&SERVICE=WMS&VERSION=1.3.0&REQUEST=Capabilities')
      .then(function (response) {
        return response.text();
      })
      .then(function (text) {
        var result = WMSparser.read(text);
        document.getElementById('log').innerText = JSON.stringify(result, null, 2);
      });


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
        console.log(`clicked coordinates: {clickedCoordinates}`);
        // map.forEachFeatureAtPixel(e.pixel, function(feature, layer){
        //     console.log(feature.getKeys());
        //     overlayLayer.setPosition(clickedCoordinates);
        //     let clickedFeatureName = (feature.get('name'));
        //     let clickedFeatureAdditionalInfo = (feature.get('additionalinfo'));
        //     overlayFeatureName.innerHTML = clickedFeatureName;
        //     overlayFeatureInfo.innerHTML = clickedFeatureAdditionalInfo;
        // })
    })

    const baseLayerElements = document.querySelectorAll('.sidebar > input[type=radio]');

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
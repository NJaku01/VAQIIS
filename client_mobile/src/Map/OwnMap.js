import React from 'react'
import { Map, TileLayer, FeatureGroup, Marker, Popup } from 'react-leaflet'


import L from 'leaflet'

let firstTime = true

var greenIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

var blueIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

var redIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  var goldIcon = new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });



let last;
let selected;
export let ref;

class OwnMap extends React.Component {
    constructor(props) {
        super(props);
        this.state = {

        };
    };

    componentDidMount() {
        firstTime = true
    }


    _onFeatureGroupReady = (ref) => {

        if (!firstTime) {
            return;
        }
        this.FG = ref;
        var self = this
        let GeoJSON = this.getGeoJson()
        let leafletGeoJSON = new L.GeoJSON(GeoJSON);
        const line = this.connectTheDots(leafletGeoJSON)
        var pathLine = L.polyline(line)
        leafletGeoJSON.on('click', function (e) {
            self.handleClick(e.layer, leafletGeoJSON)
        })
        let leafletFG = this.FG.leafletElement;
        leafletGeoJSON.eachLayer(layer => leafletFG.addLayer(layer));
        leafletFG.addLayer(pathLine)
        firstTime = false;
    }

    handleClick = (selectedLayer, allLayers) => {
        allLayers.eachLayer(layer => {if(JSON.stringify(last) == JSON.stringify(layer._latlng)){layer.setIcon(goldIcon)} else{layer.setIcon(blueIcon)}});
        if (JSON.stringify(selected) == JSON.stringify(selectedLayer._latlng)) {
            this.props.handleSelected();
            selected = null;
        }
        else {
            const properties = selectedLayer.feature.properties;
            selected = selectedLayer._latlng
            selectedLayer.setIcon(greenIcon)
            this.props.handleSelected(properties.temp, properties.humi, properties.pm10, properties.time);
        }
    }

    addLayer = (leafletFg, layer) => {
        leafletFg.addLayer(layer)
        if(JSON.stringify(layer._latlng) === JSON.stringify(selected)){
            layer.setIcon(greenIcon)
        }
        if(JSON.stringify(layer._latlng) === JSON.stringify(last)){
            layer.setIcon(goldIcon)
        }
    }

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props): 
        this.FG = ref;
        let leafletFG = this.FG.leafletElement;
        try {
            if(!this.props.route){
                leafletFG.clearLayers();
                return;
            }
            if (JSON.stringify(this.props.route.geoJson) === JSON.stringify(prevProps.route.geoJson)) {
                
                return;
            }
        }
        catch (e) {

        }
        if(this.props.lastMeasurement){
            let GeoJSON = this.props.lastMeasurement;
            let leafletGeoJSON = new L.GeoJSON(GeoJSON);
            leafletGeoJSON.eachLayer(layer => {last = layer._latlng});
        }
        const self = this;
        let GeoJSON = this.getGeoJson();
        console.log(GeoJSON);
        let leafletGeoJSON = new L.GeoJSON(GeoJSON);
        leafletGeoJSON.on('click', function (e) { self.handleClick(e.layer, leafletGeoJSON) })
        console.log(leafletGeoJSON);
        leafletFG.clearLayers();
        leafletGeoJSON.eachLayer(layer => self.addLayer(leafletFG, layer));
        if(this.props.startpoint){
            const point = new L.GeoJSON(this.props.startpoint);
            point.eachLayer(layer => {leafletFG.addLayer(layer); layer.setIcon(redIcon)});
        }
        if(this.props.endpoint){
            const point = new L.GeoJSON(this.props.endpoint);
            point.eachLayer(layer => {leafletFG.addLayer(layer); layer.setIcon(redIcon)});
        }
        
        if(this.props.route.geoJson.features.length > 1){
        const line = this.connectTheDots(leafletGeoJSON)
        var pathLine = L.polyline(line)
        console.log(pathLine)
        leafletFG.addLayer(pathLine)     
        //this.refs.map.leafletElement.fitBounds(pathLine.getBounds())
        }
    }



    getGeoJson = () => {
        if (this.props.route) {
            console.log("test2")
            return this.props.route.geoJson
        }
        else { return null }
    }

    connectTheDots(data) {
        var c = [];
        for (var i in data._layers) {
            var x = data._layers[i]._latlng.lat;
            var y = data._layers[i]._latlng.lng;
            c.push([x, y]);
        }
        return c;
    }

    render() {

        return (
            <Map style={{ height: "50vh" }} center={position} zoom={15} ref="map" minZoom={12} maxZoom={17}>

                <TileLayer
                    attribution="This map is offline and was created with mapnik tiles"
                    url="map-tiles/{z}/{x}/{y}.png"
                />
                <FeatureGroup ref={(reactFGref) => { this._onFeatureGroupReady(reactFGref); ref = reactFGref }}>
                </FeatureGroup>
            </Map>
        );
    }
}

export default OwnMap
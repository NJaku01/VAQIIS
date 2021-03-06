import React, { Component } from 'react';
import { TextField, MenuItem, Button, Divider } from '@material-ui/core'
import OwnMap, { map } from '../Map/OwnMap'
import { Container, Row, Col, Card, Table } from 'react-bootstrap';
import OwnDropzone from './Dropzone';
import axios from 'axios';
import L from 'leaflet'
import '../index.css'


const featureGroup = {
    geoJson: {
        "type": "FeatureCollection",
        "features": [
        ]
    }
}

class Explore extends Component {
    constructor(props) {
        super(props);
        this.state = {
            date: "null",
            route: featureGroup,
            data: [],
            route_coordinates: [],
            dates: [{ value: "null", label: "dd-mm-yyyy" }],
            shortcuts: {
                time: 'Time',
                AirTC_Avg: "°C",
                LiveBin_1dM: "P10",
                RH_Avg: "%",
                compass_heading: "S/N/W/E",
                CPC_aux: "CPC",
                CO2: "CO2",
                u: 'u',
                v: 'v',
                w: 'w',
                Ts: 'Ts',
                comment:"Comment"
            },
        }
        this.downloadSelectedRoute = this.downloadSelectedRoute.bind(this);
        this._toggleSelected = this._toggleSelected.bind(this);
    }

    componentWillMount() {
        const self = this;
        //Get al saved routes in the database
        axios.get('http://giv-project2:9000/api/course')
            .then(res => {
                const dates = self.state.dates
                for (var date of res.data) {
                    dates.push({ value: date.date, label: self.transfromDate(date.date) })
                }
                //add routes to selection 
                self.setState({ data: res.data, dates: dates })
            })
    }

    /**
     * Searches for the selected Marker or deletees Selection
     * @param {*} e selection
     */
    _toggleSelected(e) {
        // compare timestring if found push that whole measurement (feature) to the state
        let that = this;
        //delete selection if no marker is selected
        if (e === '') {
            this.setState({ selectedMeasurement: '', selected: false })
        }
        that.state.route.geoJson.features.forEach(function (feature) {
            if (feature.properties.time === e) {
                that.setState({ selectedMeasurement: feature, selected: true })
            }
        })
    };

    /**
     * Downloads a object as JSON
     * @param {*} exportObj to download
     * @param {*} exportName name of object
     */
    downloadObjectAsJson(exportObj, exportName) {
        //create download link, exectute it, remove it at the end
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
        var downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", exportName + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    /**
     * Handle a change of the selected route to display
     */
    handlechange = (e) => {
        const value = e.target.value;
        let route;
        let route_coordinates;
        if (value === "null") {
            this._toggleSelected();
            route = featureGroup;
            route_coordinates = [];
        } else {
            for (var data of this.state.data) {
                if (data.date === value) {
                    route = data;
                    //create connection line between the measurements
                    route_coordinates = this.props.connectTheDots(data.geoJson);
                    const geojson = L.polyline(route_coordinates);
                    map.leafletElement.fitBounds(geojson.getBounds());
                }
            }
        }
        this.setState({
            date: value,
            route: route,
            route_coordinates: route_coordinates
        })
    };

    /**
     * Upload a route to the webserver
     * web server saves it in the database
     */
    uploadRoute = (route) => {
        axios.post('http://giv-project2:9000/api/course', { route })
            .then(res => {
                console.log(res);
                console.log(res.data);
            })
    };

    /**
     * Function to update parents state from child component
     */
    updateState = (state, value) => {
        const self = this;
        this.setState({ [state]: value }, () => {
            //if a new route was uploaded display ot automaticly
            if (state === "data") {
                self.uploadRoute(value[value.length - 1])
                const dates = [{ value: "null", label: "dd-mm-yyyy" }]
                for (var date of self.state.data) {
                    dates.push({ value: date.date, label: this.transfromDate(date.date) })
                }
                let route_coordinates = this.props.connectTheDots(value[value.length - 1].geoJson);
                const geojson = L.polyline(route_coordinates);
                map.leafletElement.fitBounds(geojson.getBounds());
                this.setState({
                    dates: dates,
                    date: value[value.length - 1].date,
                    route: {
                        geoJson: value[value.length - 1].geoJson
                    },
                    route_coordinates: route_coordinates
                })
            }
        })
    };

    /**
     * Transform the date in a human-readable version
     */
    transfromDate = function (date) {

        if (!date) { return "" }
        date = new Date(date)
        var mm = date.getMonth() + 1; // getMonth() is zero-based
        var dd = date.getDate();
        var hours = date.getHours();
        var min = date.getMinutes();

        return (dd > 9 ? '' : '0') + dd + "-" + (mm > 9 ? '' : '0') + mm + "-" + date.getFullYear() + " " + (hours > 9 ? '' : '0') + hours + ":" + (min > 9 ? '' : '0') + min;
    };

    /**
     * Starts the download of the selected route
     */
    downloadSelectedRoute() {
        if (JSON.stringify(this.state.route) === JSON.stringify(featureGroup) || this.state.route === null) {
            alert("Please select Route to download");
            return;
        }
        this.downloadObjectAsJson(this.state.route.geoJson, this.transfromDate(this.state.route.date))
    };

    render() {
        return (
            <Container fluid>
                <div>
                    <OwnMap _toggleSelected={this._toggleSelected} liveRoute={this.state.route} route_coordinates={this.state.route_coordinates} />
                </div>
                <Row>
                    <Col md={10}>
                        <Card style={{ 'marginTop': '5px' }}>
                            <Card.Body>
                                <Card.Title>Hier kannst du Details zu der ausgewählten Route betrachten.</Card.Title>
                                <div style={{ maxHeight: "300px", overflow: "auto" }}>
                                    {this.state.route.geoJson.features.length > 0 ?
                                        <Table striped bordered hover style={{ width: "100%", fontSize: "medium" }}>
                                            <thead>
                                                <tr>
                                                    {Object.keys(this.state.route.geoJson.features[0].properties).map((key, index) => {
                                                        if (this.state.shortcuts[key]) {
                                                            return <th key={"id" + index}>{this.state.shortcuts[key]}</th>
                                                        }
                                                        else return
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {this.state.selected ?
                                                    <tr>
                                                        {Object.keys(this.state.selectedMeasurement.properties).map((key, i) => {
                                                            if (this.state.shortcuts[key]) {
                                                                return <td className="customtd selected" key={"selected" + i}>{this.state.selectedMeasurement.properties[key]}</td>
                                                            }
                                                        })}
                                                    </tr>
                                                    : null}
                                                {this.state.route.geoJson.features.map((item, i) => {
                                                    return (
                                                        <tr data-tip="tooltip" key={"id2" + i}>
                                                            {Object.keys(item.properties).map((key, index) => {
                                                                if (this.state.shortcuts[key]) {
                                                                    return <td className="customtd" key={"ad2" + index} >{item.properties[key]}</td>
                                                                }
                                                            })
                                                            }
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </Table> : ""}
                                </div>
                            </Card.Body>
                        </Card>

                    </Col>
                    <Col md={2}>
                        <Card style={{ 'marginTop': '5px' }}>
                            <Card.Body>
                                <Card.Title>Routen Controller</Card.Title>
                                <Divider/>
                                <br />
                                <div >
                                    <TextField
                                        label="Routen Auswahl"
                                        id="standard-select-date"
                                        select
                                        value={this.state.date}
                                        onChange={this.handlechange.bind(this)}
                                        margin="normal"
                                        variant="outlined"
                                        placholder="dd-mm-yyyy"
                                    >
                                        {this.state.dates.map((option, i) => (
                                            <MenuItem key={"keyMenu" + i} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </div>
                                <br />
                                <Button  variant="contained" color="primary"  onClick={this.downloadSelectedRoute}> Route herunterladen</Button>
                                <br />
                                <br />

                                <Divider/>
                                <br />
                                <OwnDropzone data={this.state.data} updateState={this.updateState} sc={this.state.shortcuts} />
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

        );
    }
}

export default Explore;
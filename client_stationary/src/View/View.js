import React, { Component } from 'react';
import { Tabs, Tab, ButtonGroup, Button } from '@material-ui/core';
import Explore from "../Explore/Explore";
import Chat from "../Chat/Chat";
import Live from "../Live/Live";
import ErrorBoundary from "../ErrorBoundary/ErrorBoundary";
import ReactLoading from 'react-loading'
import Footer from "./Footer"
import { IoMdDownload, IoIosTrash, IoIosPlay, IoIosPause } from 'react-icons/io'
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css'
import './View.css'

import './../index.css'

var Paho = require('paho-mqtt');

var client;
/**
 * View class that holds and edits the GeoJSON 
 * Serves as a parent class to Map/Explore/Live and Chat
 * 
 */
class View extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value: 1,
            startpoint: null,
            endpoint: null,
            loading: false,
            recordingRoute: false,
            startStopVal: <IoIosPlay className="svg_icons" />,
            connected: false,
            sensors: [
                // These are sensors that get queried every 5 seconds
                // Simply add a new one if needed, they all get queried
                "rmcspeed",
                "rmclatitude",
                "rmclongitude",
                "AirTC_Avg",
                "RH_Avg",
                "LiveBin_1dM",
                "u",
                "v",
                "w",
                "Ts",
                "CPC_aux",
                "CO2",
                "H2O",
                "diag_LI75"
            ],
            // server config variables, can and should be edited depending on the endpoints
            server_ip: '10.6.4.7',
            server_port: 9001,
            featureGroup: {
                geoJson: {
                    "type": "FeatureCollection",
                    "features": [],
                }
            },
            route_coordinates: [],
            counter: 0,
            messages: [],
            unread: false,
        }
        this._addCommentToGeoJson = this._addCommentToGeoJson.bind(this);
        this.download = this.download.bind(this);
        this._publishMQTT = this._publishMQTT.bind(this);
        this._subscribeToTopic = this._subscribeToTopic.bind(this);
        this._readMessages = this._readMessages.bind(this);
    }

    /**
     * Component Control Functions
     */
    componentDidMount = () => {
        this.connectMQTT();
    }

    componentWillUnmount() {
        clearInterval(this.timer)
    }

    componentDidUpdate() {
        // Check if both data tables are filled to start building the GeoJSON object
        if (this.state.sensor_data_fasttable && this.state.sensor_data_public) {
            const sensor_data = { ...this.state.sensor_data_public, ...this.state.sensor_data_fasttable }
            // Callback setState(because setState sometimes takes a while to finish). After callback execute the 
            // addMarker function to build the marker object and push it to the state
            this.setState({
                sensor_data_fasttable: null,
                sensor_data_public: null,
                sensor_data
            }, this._addMarker)
        }
    }
    /**
     * GeoJSON Building
     * On new measurement create a new marker, which gets added to the geojson
     */

    _addMarker() {
        let marker = {
            "type": "Feature",
            "properties": this.state.sensor_data,
            "geometry": {
                "type": "Point",
                "coordinates": [this.state.sensor_data.rmclatitude, this.state.sensor_data.rmclongitude]
            }
        }
        let newFeatureGroup = this.state.featureGroup;
        newFeatureGroup.geoJson.features.unshift(marker);
        const route_coordinates = this.connectTheDots(newFeatureGroup.geoJson);
        this.setState({
            featureGroup: newFeatureGroup,
            lastMeasurement: marker,
            route_coordinates,
        })
    }

    connectTheDots(data) {
        var c = [];
        for (var i of data.features) {
            var x = i.geometry.coordinates[0];
            var y = i.geometry.coordinates[1];
            c.push([x, y]);
        }
        return c;
    };f
    /** 
     * Iterates through the geoJson, e is used to look for the selected measurement 
     * adds comment as property to the geojson
     * 
     * @param {e} id of the comment that should be added  
     * @param {*} comment comment content
     */
    _addCommentToGeoJson(e, comment) {
        let newFeatureGroup = this.state.featureGroup;
        newFeatureGroup.geoJson.features.forEach(function (feature) {
            let timeString = e;
            if (feature.properties.time === timeString) {
                feature.properties.comment = comment
            }
        })
        this.setState({ featureGroup: newFeatureGroup })
    }
    /**
     * MQTT functions
     */

    // Connect function that gets called on componentDidMount
    connectMQTT() {
        // generating random clientID
        var randLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        var uniqid = randLetter + Date.now();

        client = new Paho.Client(this.state.server_ip, this.state.server_port, uniqid);
        client.onConnectionLost = this.onConnectionLost;
        client.onMessageArrived = this.onMessageArrived.bind(this);

        //client.onMessageArrived = this.onMessageArrived;

        // connect the client
        client.connect({
            onSuccess: this.onConnect.bind(this)
        });

    };

    // function to subscribe to a topic
    _subscribeToTopic(topic) {
        console.log("Subscribing to topic", topic);
        client.subscribe(topic);
    }

    // function to publish something to the broker
    _publishMQTT(_message, topic) {
        if (this.state.connected) {
            const message = new Paho.Message(_message);
            message.destinationName = topic;
            client.send(message);
        }
        else {
            console.log(_message)
        }
    }

    // Connected: Set Subscription
    onConnect() {
        console.log("MQTT Broker Connect: Success");
        client.subscribe("message");
        // subscribe to all topics 
        this._subscribeToTopic("messwerte");
        this._subscribeToTopic("messwerte_fasttable");
        this._subscribeToTopic("chat_mobile");
        this._subscribeToTopic("chat_stationary");
        this.setState({
            connected: true,
        })
    };
    /**
     * Because the measurements in the logger from 2 tables 
     * listeners are set up to sort incoming mqtt messsages 
     * 
     * @param {} message 
     */
    onMessageArrived(message) {
        // Depending on the incoming message it gets handled differently
        if (message.destinationName === "chat_mobile" || message.destinationName === "chat_stationary") {
            this.setState({
                messages: [...this.state.messages, { destinationName: message.destinationName, payloadString: message.payloadString, time: new Date() }]
            })
            if (this.state.value !== 2) {
                this.setState({ unread: true })
            }
        }
        if (message.destinationName === "messwerte") {
            let json = JSON.parse(message.payloadString)
            let sensor_data_public = {};
            let date = new Date(json.data[0].time);
            sensor_data_public.time = date.toLocaleTimeString();
            json.head.fields.map((field, index) => {
                if (field.name === "rmclatitude") sensor_data_public.rmclatitude = this._convertLat(json.data[0].vals[index]);
                else if (field.name === "rmclongitude") sensor_data_public.rmclongitude = this._convertLon(json.data[0].vals[index]);
                else if (this.state.sensors.includes(field.name)) sensor_data_public[field.name] = json.data[0].vals[index]
            })
            this.setState({ sensor_data_public })
        }
        if (message.destinationName === "messwerte_fasttable") {
            let json = JSON.parse(message.payloadString)
            let sensor_data_fasttable = {};
            json.head.fields.map((field, index) => {
                if (field.name === "rmclatitude") sensor_data_fasttable.rmclatitude = this._convertLat(json.data[0].vals[index]);
                else if (field.name === "rmclongitude") sensor_data_fasttable.rmclongitude = this._convertLon(json.data[0].vals[index]);
                else if (this.state.sensors.includes(field.name)) sensor_data_fasttable[field.name] = json.data[0].vals[index]
            })
            this.setState({ sensor_data_fasttable })
        }
    }

    // Connection-Lost: Set 
    onConnectionLost = (responseObject) => {
        if (responseObject.errorCode !== 0) {
            console.log("onConnectionLost: " + responseObject.errorMessage);
            this.setState({
                connected: false
            });
            this.connectMQTT();
        }
    };
    /**
     * Push recorded route to mqtt for further processing
     */
    sendtoBroker = () => {
        if (!this.state.startpoint || !this.state.endpoint) {
            this.confirmNotEnoughData();
        } else {
            let featureGroup = this.getFeatureGroup();
            this._publishMQTT(JSON.stringify(featureGroup), "messungen");
        }
    };


    /**
     * UI Handling
     */
    handleChange = (e, newValue) => {
        this.setState({ value: newValue })
    };

    _readMessages() {
        this.setState({ unread: false })
    };

    handleStartStop = () => {
        if (this.state.recordingRoute) {
            // If Route is already being recorded
            this.setState({
                recordingRoute: false,
                recordedRoute: true,
                endpoint: this.state.lastMeasurement,
                startStopVal: <IoIosPlay className="svg_icons" />
            })
        } else {
            // If Route is NOT being recorded 
            this.setState({
                recordingRoute: true,
                startpoint: this.state.lastMeasurement,
                startStopVal: <IoIosPause className="svg_icons" />
            })
        }
    };

    confirmNotEnoughData = () => {
        confirmAlert({
            message: 'Aktion nicht möglich, solang nicht mindestens eine Messung empfangen wurde.',
            buttons: [
                {
                    label: 'Schließen',
                    onClick: () => null
                }
            ]
        })
    };

    confirmDelete = () => {
        confirmAlert({
            message: 'Soll die aktuelle Route wirklich gelöscht werden?',
            buttons: [
                {
                    label: 'Ja',
                    onClick: () => this.handleClear()
                },
                {
                    label: 'Abbrechen',
                    onClick: () => null
                }
            ]
        })
    };

    handleClear = () => {
        this.setState({
            startpoint: null,
            endpoint: null,
            recordingRoute: false,
            recordedRoute: false,
            startStopVal: <IoIosPlay className="svg_icons" />
        })
    };

    // Save current route to device
    download() {
        if (!this.state.startpoint || !this.state.endpoint) {
            this.confirmNotEnoughData();
        } else {
            let featureGroup = this.getFeatureGroup();

            const element = document.createElement("a");
            let recordingRoute = JSON.stringify(featureGroup);
            const file = new Blob([recordingRoute], { type: 'text/plain' });
            element.href = URL.createObjectURL(file);
            element.download = "measurements.json";
            document.body.appendChild(element); // Required for this to work in FireFox
            element.click();
        }
    };

    /**
     * Helper functions
     */

    // Get Features between Start and End-Feature
    getFeatureGroup = () => {

        let featureGroup = {
            geoJson: {
                "type": "FeatureCollection",
                "features": []
            }
        }

        var startTime = this.state.startpoint.properties.time;
        var endTime = this.state.endpoint.properties.time;

        this.state.featureGroup.geoJson.features.forEach(function (feature) {
            let currFeatureTime = feature.properties.time;

            // Looks stupid but works as long as time is in 24h format...
            if (startTime <= currFeatureTime && endTime >= currFeatureTime) {
                featureGroup.geoJson.features.push(feature);
            }
        })
        return featureGroup;
    };

    // Conversion of coordinates provided by the bike's GPS
    _convertLat(lat) {
        if (!lat || lat === "") {
            return 51.9688129; // dummy coordinates or last known coordinates
        }
        else {
            let lat_temp_1 = parseFloat(lat.split('.')[0].substring(0, 2));
            let lat_temp_2 = parseFloat(lat.split(lat_temp_1)[1]) / 60;
            let lat_r = lat_temp_1 + lat_temp_2;
            return lat_r
        }
    };

    _convertLon(lon) {
        if (!lon || lon === "") {
            return 7.5922197; // dummy coordinates or last known coordinates
        }
        else {
            let long_temp_1 = parseFloat(lon.split('.')[0].substring(0, 3));
            let long_temp_2 = parseFloat(lon.split(long_temp_1)[1]) / 60;
            let lon_r = long_temp_1 + long_temp_2;
            return lon_r;
        }
    };


    render() {
        return (
            <ErrorBoundary>
                {this.state.loading ? <div className="ReactLoading">
                    <ReactLoading className="Spinner" type="spin" color="blue" />
                </div> :
                    <div>
                        <Tabs
                            value={this.state.value}
                            onChange={this.handleChange.bind(this)}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="fullWidth"
                            aria-label="full width tabs example"
                        >
                            <Tab label="Live" />
                            <Tab label="Explore " />
                            <Tab className="chatTab" style={this.state.unread ? { "color": "orange" } : null} label="Chat" />
                        </Tabs>
                        {this.state.value === 0 &&
                            <Live _addCommentToGeoJson={this._addCommentToGeoJson}
                                liveRoute={this.state.featureGroup} route_coordinates={this.state.route_coordinates}/>
                        }
                        {this.state.value === 1 &&
                            <Explore
                                liveRoute={this.state.featureGroup}
                                route_coordinates={this.state.route_coordinates}
                                lastMeasurement={this.state.lastMeasurement}
                                _addCommentToGeoJson={this._addCommentToGeoJson}
                                connectTheDots={this.connectTheDots}
                            />
                        }
                        {this.state.value === 2 &&
                            <Chat _readMessages={this._readMessages} messages={this.state.messages} _publishMQTT={this._publishMQTT} _subscribeToTopic={this._subscribeToTopic} />}
                        {this.state.value === 0 ?
                            <Footer>
                                <ButtonGroup fullWidth color="primary" >
                                    <Button onClick={this.handleStartStop}>{this.state.startStopVal}</Button>
                                    <Button onClick={this.confirmDelete} disabled={!this.state.recordedRoute || this.state.recordingRoute}><IoIosTrash className="svg_icons" /></Button>
                                    <Button onClick={this.download} disabled={!this.state.recordedRoute || this.state.recordingRoute}><IoMdDownload className="svg_icons" /></Button>
                                </ButtonGroup>
                            </Footer>
                        : "" }
                    </div>
                }
            </ErrorBoundary>
        );
    }
}

export default View;
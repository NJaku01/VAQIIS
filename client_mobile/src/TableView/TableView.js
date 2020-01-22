import React, { Component } from 'react';
import { Container, Table, Dropdown, DropdownButton } from 'react-bootstrap'
import ReactLoading from 'react-loading'

class TableView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            loading: true,
            tables: []
        }
    }

    componentDidMount() {
        console.log(this.props)
        // this._getAllTables()
    }

    render() {
        if (!this.state.loading) {
            return (
                <div className="ReactLoading">
                    <ReactLoading className="Spinner" type="spin" color="blue" />
                </div>
            )
        }
        else {
            return (
                <Container fluid>
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                {Object.keys(this.props.liveRoute.geoJson.features[0].properties).map((key, index) => {
                                    return <th key={"id" + index}>{key}</th>
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {this.props.liveRoute.geoJson.features.map((item, i) => {
                                return (
                                    <tr key={"id2" + i}>
                                        {Object.keys(this.props.liveRoute.geoJson.features[0].properties).map((key, index) => {
                                            return <td key={"ad2" + index}>{this.props.liveRoute.geoJson.features[0].properties[key]}</td>
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                </Container>
            )
        }
    }

}

export default TableView;
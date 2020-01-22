import React, {Component} from 'react';
import {HashRouter, Route} from "react-router-dom";
import logo from '../logo.svg';
import './App.css';

import View from '../View/View'

class App extends  Component{
    constructor(props){
        super(props);
        this.state = { apiResponse: "" };
    }

    render() {
        return (
            <div className="App">
                <HashRouter>
                    <Route exact path= "/" component={View}/>
                </HashRouter>
            </div>
        );
    }


}

export default App;

/*
Copyright (c) 2023 Cisco and/or its affiliates.
This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at
               https://developer.cisco.com/docs/licenses
All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.
*/

/*

External Controller Script

This script is meant as an example of how to receive events from the divisible_room macro 
so you can issue commands to external controllers without having to embed that code into the
divisble_room macro itself.

The switch statement in the GMM.Event.Receiver.on() handler below covers all events you can get.

This Macro is meant to be installed and run in both Primary and Secondary codecs. You will only
get PRIMARY/SECONDARY events on the corresponding codec, but this sample was created with both
so you can modify it once with all commands for both codecs and just run the same copy on each. 

*/

import xapi from 'xapi'; // DO NOT DELETE!!!
import { GMM } from './GMM_Lib'; // DO NOT DELETE!!

GMM.Event.Receiver.on(event => {
    // we are evaluating a local event, first check to see if from the divisible_room  macro
    if (event.App == 'divisible_room' && event.Source.Id == 'localhost') {
        switch (event.Value) {
            case 'PRIMARY_COMBINE':
                console.log(`Issuing external controller commands for when primary is combining..`)
                // Add code here to drive an external controller to run tasks related to the primary codec
                // going into combined mode. 
                break;
            case 'PRIMARY_SPLIT':
                console.log(`Issuing external controller commands for when primary is splitting..`)
                break;
            case 'SECONDARY_COMBINE':
                console.log(`Issuing external controller commands for when secondary is combining..`)
                break;
            case 'SECONDARY_SPLIT':
                console.log(`Issuing external controller commands for when secondary is splitting..`)
                break;
            case 'PRIMARY_CALLCONNECT':
                console.log(`Issuing external controller commands for when call connects on primary..`)
                break;
            case 'PRIMARY_CALLDISCONNECT':
                console.log(`Issuing external controller commands for when call disconnects in primary..`)
                break;
            case 'SECONDARY_CALLCONNECT':
                console.log(`Issuing external controller commands for when call connects in secondary..`)
                break;
            case 'SECONDARY_CALLDISCONNECT':
                console.log(`Issuing external controller commands for when call disconnects in secondary..`)
                break;
            case 'PRIMARY_PRESENTATION_STARTED':
                console.log(`Issuing external controller commands for when presentation starts on primary..`)
                break;
            case 'PRIMARY_PRESENTATION_STOPPED':
                console.log(`Issuing external controller commands for when presentation stops in primary..`)
                break;
            case 'PRIMARY_PREVIEW_STARTED':
                console.log(`Issuing external controller commands for when preview starts in primary..`)
                break;
            case 'PRIMARY_PREVIEW_STOPPED':
                console.log(`Issuing external controller commands for when preview stops in primary..`)
                break;
            case 'SECONDARY_PRESENTATION_STARTED':
                console.log(`Issuing external controller commands for when presentation starts on secondary..`)
                break;
            case 'SECONDARY_PRESENTATION_STOPPED':
                console.log(`Issuing external controller commands for when presentation stops on secondary..`)
                break;
            case 'SECONDARY_PREVIEW_STARTED':
                console.log(`Issuing external controller commands for when preview starts on secondary..`)
                break;
            case 'SECONDARY_PREVIEW_STOPPED':
                console.log(`Issuing external controller commands for when preview stops on secondary..`)
                break;
            default:
                console.debug(event)
                break;
        }
    }
}

)



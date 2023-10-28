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
*
*
* Repository: gve_devnet_n_way_divisible_conference_rooms_webex_devices_macros
* Macro file: divisible_room
* Version: 2.2.0
* Released: October 26, 2023
* Latest RoomOS version tested: 11.8.1.7
*
 * Author(s):               Gerardo Chaves
 *                          Technical Solutions Architect
 *                          Cisco Systems
 *                          gchaves@cisco.com
 * 
 * 
 * Released: October 27th, 2023
 * 
 * Version 2.2.0
 * 
 * Description: 
 *    - Implements rooms layout selection for divisible rooms macro
 * 
 * Tested Devices
 *     - Codec EQ
 *     - Codec Pro
 * 
*    As a macro, the features and functions of this webex n-way divisibe conference  
*    rooms macro are not supported by Cisco TAC
* 
*    Hardware and Software support are provided by their respective manufacturers 
*      and the service agreements they offer
*    
*    Should you need assistance with this macro, reach out to your Cisco sales representative
*    so they can engage the GVE DevNet team. 
*/

import xapi from 'xapi';
import { GMM } from './GMM_Lib'

import * as divisible_config from './divisible_config';

const SHOW_PANEL_WALL_SENSOR_OVERRIDE = true; // Panel to manually select layout and combined states via wall separators
const SHOW_PANEL_LAYOUT_SELECT = false; // Panel to manually select just layout to push to codecs

const PIN_VOLTAGE_WALL_OPEN = 'Low'; // 'High' or 'Low' 

// SECONDS_AWAIT_CONFIRMATION is the number of seconds to wait for other codecs to acknowldge 
// they received a change and applied a change of layout command
const SECONDS_AWAIT_CONFIRMATION = 5;
const SECONDS_INITIAL_STATE_LAYOUT_ADJUST = 15;

let MANUAL_WALL_SELECT = false; // initial value of manual select override for wall dividers
let wall_key = '000'; //default for creating initial key in permanent storage

let CONF = divisible_config.profile_LAY1;


//Declare your object for GMM communication
var otherCodecs = {};
let secondariesStatus = {};
let codecIPArray = [];

let theSentFullLayout = {}

CONF.config.compositions.forEach(compose => {
    if ((compose.source == CONF.JS_SECONDARY && compose.codecIP != '') && compose.codecIP != CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP) {
        console.log(`Setting up connection to secondary codec with IP ${compose.codecIP}`);
        codecIPArray.push(compose.codecIP);
        console.log(`Creating secondaries status object for this secondary codec...`)
        secondariesStatus[compose.codecIP] = { 'inCall': false, 'inPreview': false, 'online': false, 'layout': '' };
    }
})

otherCodecs = new GMM.Connect.IP(CONF.OTHER_CODEC_USERNAME, CONF.OTHER_CODEC_PASSWORD, codecIPArray)


async function sendLayoutApplyMessage(secIP, message) {
    await otherCodecs.status(message).passIP().queue('secondary', secIP).catch(e => {
        console.log(`Error sending message selection message to secondary with IP ${secIP}`);
    });
}

GMM.Event.Queue.on(report => {
    //The queue will continuously log a report to the console, even when it's empty.
    //To avoid additional messages, we can filter the Queues Remaining Requests and avoid it if it's equal to Empty
    if (report.QueueStatus.RemainingRequests != 'Empty') {
        report.Response.Headers = [] // Clearing Header response for the simplicity of the demo, you may need this info
        //console.log(report)
    }
});




async function processChangeLayoutResponse(theIP, theLayout) {
    secondariesStatus[theIP].layout = theLayout;

}

async function localChangeLayoutAndState(theLayout) {

    // store the new layout selection in permanent memory
    await GMM.write.global('JoinSplit_alt_config', theLayout.layout).then(() => {
        console.log({ Message: 'ChangeState', Action: 'Config in storage set to ' + theLayout.layout })
    })

    // set configuration to the received layout we are supposed to use
    let received_alt_config = theLayout.layout;
    console.log({ Message: 'Received config profile.', Action: `Recevied config: ${received_alt_config}.` })
    switch (received_alt_config) {
        case 'LAY1':
            CONF = divisible_config.profile_LAY1
            break;
        case 'LAY2':
            CONF = divisible_config.profile_LAY2
            break;
        case 'LAY3':
            CONF = divisible_config.profile_LAY3
            break;
        case 'LAY4':
            CONF = divisible_config.profile_LAY4
            break;
    }

    //Here I need to extract existing configuration and not only change layout, but also selected
    // status and combined status for Secondaries and , for primaries, combined status and list
    // of selected secondaries.. all of this from the theLayout.combine string that contains a colon separated
    // list of which codec are selected and combined.

    let theCombinedCodecs = theLayout.combine.split(':')

    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
        // If primary: review the list of secondaries and, if should go combined,  edit list of secondaries to mark
        // codecs that should be selected , set the combine state to combined and store.... it itself is not in list
        // then mark as split and do not worry about selected codecs settings. 
        if (!theCombinedCodecs.includes(divisible_config.THIS_CODEC_IP)) {
            await GMM.write.global('JoinSplit_combinedState', false).then(() => {
                console.log({ Message: 'ChangeState', Action: 'JoinSplit_combinedState in storage set to false' })
            })
        } else {
            // create JoinSplit_secondariesStatus based on what is in the select layout config but adding
            // selected status received in the  theLayout.composed
            let secondariesStatus = {};
            CONF.config.compositions.forEach(compose => {
                if ((compose.source == CONF.JS_SECONDARY && compose.codecIP != '') && compose.codecIP != CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP) {
                    console.log(`Creating secondaries status object for this secondary codec...`)
                    //make sure there is an entry for compose.codecIP in secondariesStatus, if not, create a new one 
                    secondariesStatus[compose.codecIP] = { 'inCall': false, 'inPreview': false, 'online': false, 'selected': true };
                    if (theCombinedCodecs.includes(compose.codecIP))
                        secondariesStatus[compose.codecIP]['selected'] = true
                    else
                        secondariesStatus[compose.codecIP]['selected'] = false
                }
            })

            await GMM.write.global('JoinSplit_secondariesStatus', secondariesStatus).then(() => {
                console.log({ Message: 'ChangeState', Action: 'Secondary codecs state stored.' })
            })

            await GMM.write.global('JoinSplit_combinedState', true).then(() => {
                console.log({ Message: 'ChangeState', Action: 'JoinSplit_combinedState in storage set to true' })
            })
        }

    } else {
        // If secondary: just set the state to combined if in list, otherwise set to split and store
        if (!theCombinedCodecs.includes(divisible_config.THIS_CODEC_IP)) {
            await GMM.write.global('JoinSplit_combinedState', false).then(() => {
                console.log({ Message: 'ChangeState', Action: 'JoinSplit_combinedState in storage set to false' })
            })
        } else {
            await GMM.write.global('JoinSplit_combinedState', true).then(() => {
                console.log({ Message: 'ChangeState', Action: 'JoinSplit_combinedState in storage set to true' })
            })
        }

    }

}

async function validateSecLayoutResponses(theLayout) {
    let allCurrentLayout = true;
    console.log(`Validating that all secondaries changed layout to ${theLayout}... `)
    Object.entries(secondariesStatus).forEach(async ([key, val]) => {
        if (secondariesStatus[key].layout != theLayout) {
            console.log(`Secondary with IP ${key} is reporting incorrect current layout: ${secondariesStatus[key].layout}`)
            allCurrentLayout = false;
        }
    })

    if (!allCurrentLayout) {
        console.log(`At least one codec did not successfully change layout, rolling back...`)
        xapi.command('UserInterface Message Alert Display', {
            Title: 'Layout change failed!!',
            Text: 'Codecs did not succesfuly switch layouts, rolling back... check logs',
            Duration: 5,
        });
        let letLayoutMessage = 'ROLLBACK_LAYOUT';
        Object.entries(secondariesStatus).forEach(async ([key, val]) => {
            await sendLayoutApplyMessage(key, letLayoutMessage)
        })
    }
    else {
        // all other codecs changed layout, now let's change it for this MAIN codec. 

        if (Object.keys(theSentFullLayout).length == 0) {
            await GMM.write.global('JoinSplit_alt_config', theLayout).then(() => {
                console.log({ Message: 'ChangeState', Action: 'Config in storage set to ' + theLayout })
            })
        }
        else {
            // Also, now I need to update JOIN_SPLIT_CONFIG, secondariesStatus and combinedState settings on this 
            // main primary codec! 
            localChangeLayoutAndState(theSentFullLayout);
        }


        // give other codecs chance to finish resetting macro subsystem before sending another instruction
        await delay(3000);
        let letLayoutMessage = 'ACTIVATE_NEW_LAYOUT';
        Object.entries(secondariesStatus).forEach(async ([key, val]) => {
            await sendLayoutApplyMessage(key, letLayoutMessage)
        })

        //Store away the overwritten wall sensor setting if not using GPIO at the moment
        await GMM.write.global('JoinSplit_alt_manual_wall_select', { "wall_key": wall_key, "manual": MANUAL_WALL_SELECT }).then(() => {
            console.log({ Message: 'ChangeState', Action: 'JoinSplit_alt_manual_wall_select in storage set to ' + JSON.stringify({ "wall_key": wall_key, "manual": MANUAL_WALL_SELECT }) })
        })

        // now that al other codecs have confirmed the new layout, activate it here
        await delay(3000);
        await xapi.Command.Macros.Runtime.Restart();
    }

}

GMM.Event.Receiver.on(async event => {
    if (event.Source.Id != 'localhost' && event.App == 'div_layout_handler') {
        console.warn("Received from other codec: ", event.Value)
        if (event.Type == 'Error') {
            console.error(event)
        } else {
            let theEventValue = event.Value;
            let theLayout = '';
            if (theEventValue.slice(0, 19) == 'SEC_LAYOUT_APPLIED_') {
                theLayout = theEventValue.substring(19);
                await processChangeLayoutResponse(event.Source?.IPv4, theLayout);
            }
        }
    }
})



async function init() {
    console.log({ Message: `Intializing Macro [${_main_macro_name()}...]` })
    await GMM.memoryInit();
    await buildUI();
    await StartSubscriptions();
    await initPartitionSensors();
    await initialWallPartitionCheck();

    console.log({ Message: `Macro [${_main_macro_name()}] initialization Complete!` })
}


//Iterates over the Subscribe Object
async function StartSubscriptions() {
    const subs = Object.getOwnPropertyNames(Subscribe);
    subs.sort();
    let mySubscriptions = [];
    subs.forEach(element => {
        Subscribe[element]();
        mySubscriptions.push(element);
        Subscribe[element] = function () {
            console.warn({ Warn: `The [${element}] subscription is already active, unable to fire it again` });
        };
    });
    console.log({ Message: 'Subscriptions Set', Details: { Total_Subs: subs.length, Active_Subs: mySubscriptions.join(', ') } });
};


//Define all Event/Status subscriptions needed for the macro
const Subscribe = {
    //Listens to Widget Actions on the Device
    WidgetAction: function () { xapi.Event.UserInterface.Extensions.Widget.Action.on(handle.Event.WidgetAction); },
    PromptResponse: function () { xapi.Event.UserInterface.Message.Prompt.Response.on(handle.Event.PromptResponse); },
    PromptClear: function () { xapi.Event.UserInterface.Message.Prompt.Cleared.on(handle.Event.PromptClear); },
    TextResponse: function () { xapi.Event.UserInterface.Message.TextInput.Response.on(handle.Event.TextResponse); },
    PanelClicked: function () { xapi.Event.UserInterface.Extensions.Panel.Clicked.on(handle.Event.PanelClicked) }
}

const handle = {
    Event: {
        PanelClicked: async function (event) {
            console.log(event.PanelId)

            if (event.PanelId == 'layout_select_panel') {
                LayoutSelectPrompt();
            }
            if (event.PanelId == 'panel_wall_sensor_override') {

                let stored_alt_manual_wall_select = await GMM.read.global('JoinSplit_alt_manual_wall_select').catch(async e => {
                    console.log("No JoinSplit_alt_manual_wall_select global detected.. assuming empty ")
                    return { "wall_key": "000", "manual": MANUAL_WALL_SELECT };
                })
                wall_key = stored_alt_manual_wall_select['wall_key']

                MANUAL_WALL_SELECT = stored_alt_manual_wall_select['manual']

                // set a value so we can keep track of changes on the widgets
                if (wall_key == '') wall_key = '000';

                await xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: 'widget_sensors_pin1', Value: (wall_key[0] == '1') ? 'on' : 'off' });
                if (wall_key.length > 1)
                    await xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: 'widget_sensors_pin2', Value: (wall_key[1] == '1') ? 'on' : 'off' });
                if (wall_key.length > 2)
                    await xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: 'widget_sensors_pin3', Value: (wall_key[2] == '1') ? 'on' : 'off' });

                console.log("Manual wall key selected: ", wall_key)
            }
        },
        TextResponse: async function (event) {
            console.log(event.FeedbackId)
        },
        PromptResponse: function (event) {
            if (event.FeedbackId.includes('CAC~CAC~LayoutSelect')) {
                let theLayout = '';
                switch (event.OptionId) {
                    case 1: case '1':
                        console.log({ Message: `Setting layout to LAY1` })
                        theLayout = 'LAY1'
                        break;
                    case 2: case '2':
                        console.log({ Message: `Setting layout to LAY2` })
                        theLayout = 'LAY2'
                        break;
                    case 3: case '3':
                        console.log({ Message: `Setting layout to LAY3` })
                        theLayout = 'LAY3'
                        break;
                    case 4: case '4':
                        console.log({ Message: `Setting layout to LAY4` })
                        theLayout = 'LAY4'
                        break;

                }


                // Attempt to send all codecs the new layout selected

                // first put up an alert on the touch device that the selection or unselection is being performed
                // this in part is to prevent race conditions where the operator might try to combine the room
                // before the secondary has a chance to switch selection mode and acknoledget back to primary codec

                xapi.command('UserInterface Message Alert Display', {
                    Title: 'Sending Layout changes to codecs ...',
                    Text: 'Please wait',
                    Duration: 3,
                });

                let theLayoutMessage = 'APPLY_LAYOUT_' + theLayout;
                theSentFullLayout = {};
                Object.entries(secondariesStatus).forEach(async ([key, val]) => {
                    //val.online = false;
                    // Send the affected secondary codec the corresponding message to SELECT or REMOVE
                    await sendLayoutApplyMessage(key, theLayoutMessage)
                })

                // schedule a check in 2 seconds to confirm that the affected secondary codec received and acknoledged 
                // selection or deselection. In those callback functions we handle reverting the setting if no ack.
                setTimeout(validateSecLayoutResponses, 3000, theLayout);
            }
        },
        PromptClear: function (event) {
            if (event.FeedbackId.includes('CAC~CAC~LayoutSelect')) {
                console.log('Prompt clear...')
            }
        },
        WidgetAction: async function (event) {
            //console.log(event.Type)
            if (event.Type == 'released') {
                console.log(event.WidgetId)
                if (event.WidgetId == 'widget_sensors_gpio') {
                    MANUAL_WALL_SELECT = false;
                    await GMM.write.global('JoinSplit_alt_manual_wall_select', { "wall_key": wall_key, "manual": MANUAL_WALL_SELECT }).then(() => {
                        console.log({ Message: 'ChangeState', Action: 'JoinSplit_alt_manual_wall_select in storage set to manual since using GPIO ' })
                    })
                    xapi.command("UserInterface Message Alert Display",
                        {
                            Title: 'Wall sensor from GPIOs',
                            Text: `Reading wall sensors state from GPIO pins.`,
                            Duration: 3
                        });
                    xapi.Command.UserInterface.Extensions.Panel.Close();
                    setTimeout(initialWallPartitionCheck, 3)

                }
                else if (event.WidgetId == 'widget_sensors_apply') {
                    console.log("Manual wall key selected: ", wall_key)
                    MANUAL_WALL_SELECT = true;
                    sendLayoutAndStateChangeRequest();
                    xapi.Command.UserInterface.Extensions.Panel.Close();
                }

            }
            if (event.Type == 'changed') {
                let charVal = (event.Value == 'on') ? '1' : '0'
                if (event.WidgetId == 'widget_sensors_pin1') { let chArr = [...wall_key]; chArr[0] = charVal; wall_key = chArr.join('') }
                if (event.WidgetId == 'widget_sensors_pin2') { let chArr = [...wall_key]; chArr[1] = charVal; wall_key = chArr.join('') }
                if (event.WidgetId == 'widget_sensors_pin3') { let chArr = [...wall_key]; chArr[2] = charVal; wall_key = chArr.join('') }
                console.log(wall_key);
            }

        }
    }
}

function delay(ms) { return new Promise(resolve => { setTimeout(resolve, ms) }) }


async function LayoutSelectPrompt() {
    console.log({ Message: `Layout Select Options Shown` })
    let stored_alt_config = await GMM.read.global('JoinSplit_alt_config').catch(async e => {
        console.log("No initial JoinSplit_alt_config global detected, setting to 'LAY1' ")
        return 'LAY1';
    })
    await xapi.Command.UserInterface.Message.Prompt.Display({
        Title: 'Select Divisible Rooms Layout',
        Text: `Select the appropriate room combination layout below. <br>Current configuration is: <br>Layout ${stored_alt_config.slice(-1)}: ${divisible_config.LAYOUTS[stored_alt_config]}`,
        FeedbackId: `CAC~CAC~LayoutSelect`,
        "Option.1": "Layout 1: " + divisible_config.LAYOUTS['LAY1'],
        "Option.2": "Layout 2: " + divisible_config.LAYOUTS['LAY2'],
        "Option.3": "Layout 3: " + divisible_config.LAYOUTS['LAY3'],
        "Option.4": "Layout 4: " + divisible_config.LAYOUTS['LAY4'],
    })
}

async function buildUI() {
    console.log({ Message: `Building UserInterface...` })

    if (SHOW_PANEL_LAYOUT_SELECT) {
        let actionButton_xml = `<Extensions>
        <Version>1.10</Version>
        <Panel>
          <Order>10</Order>
          <PanelId>$layout_select_panel</PanelId>
          <Origin>local</Origin>
          <Location>HomeScreenAndCallControls</Location>
          <Icon>Tv</Icon>
          <Color>#008094</Color>
          <Name>Divisible Layouts</Name>
          <ActivityType>Custom</ActivityType>
        </Panel>
      </Extensions>`
        await xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'layout_select_panel' }, actionButton_xml)
    }
    else
        await xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'layout_select_panel' })

    if (SHOW_PANEL_WALL_SENSOR_OVERRIDE) {
        let sensorOverride_xml = `<Extensions>
        <Version>1.11</Version>
        <Panel>
        <Order>10</Order>
        <PanelId>panel_wall_sensor_override</PanelId>
        <Location>HomeScreen</Location>
        <Icon>Sliders</Icon>
        <Name>WallSensorOverride</Name>
        <ActivityType>Custom</ActivityType>
        <Page>
            <Name>Wall Sensor Override</Name>
            <Row>
            <Name>Sensor Pin 1</Name>
            <Widget>
                <WidgetId>widget_sensors_pin1</WidgetId>
                <Type>ToggleButton</Type>
                <Options>size=1</Options>
            </Widget>
            </Row>
            <Row>
            <Name>Sensor Pin 2</Name>
            <Widget>
                <WidgetId>widget_sensors_pin2</WidgetId>
                <Type>ToggleButton</Type>
                <Options>size=1</Options>
            </Widget>
            </Row>
            <Row>
            <Name>Sensor Pin 3</Name>
            <Widget>
                <WidgetId>widget_sensors_pin3</WidgetId>
                <Type>ToggleButton</Type>
                <Options>size=1</Options>
            </Widget>
            </Row>
            <Row>
            <Name/>
            <Widget>
                <WidgetId>widget_sensors_gpio</WidgetId>
                <Name>Use GPIO</Name>
                <Type>Button</Type>
                <Options>size=2</Options>
            </Widget>
            <Widget>
                <WidgetId>widget_sensors_apply</WidgetId>
                <Name>Apply Selections</Name>
                <Type>Button</Type>
                <Options>size=2</Options>
            </Widget>
            </Row>
            <Options>hideRowNames=0</Options>
        </Page>
        </Panel>
    </Extensions>
        `
        await xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'panel_wall_sensor_override' }, sensorOverride_xml)
    }
    else
        xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'panel_wall_sensor_override' })

    console.log({ Message: `UserInterface Built!` })

}

async function sendLayoutAndStateChangeRequest() {
    let theLayoutCombineMessage = {}
    let theLayout = '';
    if (wall_key in divisible_config.L_WALLS) {
        theLayoutCombineMessage = { 'apply_div_combine_layout': divisible_config.L_WALLS[wall_key] }
        theSentFullLayout = { ...theLayoutCombineMessage['apply_div_combine_layout'] };
        theLayout = divisible_config.L_WALLS[wall_key].layout; //still need this to validate it selected the right layout
        //MANUAL_WALL_SELECT = true;
        console.log(`Sending out full layout combine command: ${theLayoutCombineMessage}`)
        Object.entries(secondariesStatus).forEach(async ([key, val]) => {
            //val.online = false;
            // Send the affected secondary codec the corresponding message to SELECT or REMOVE
            await sendLayoutApplyMessage(key, theLayoutCombineMessage)
        })
        xapi.command("UserInterface Message Alert Display",
            {
                Title: 'Applying Layout',
                Text: 'Configuring rooms based on wall partition settings...',
                Duration: SECONDS_AWAIT_CONFIRMATION
            });

        // schedule a check in 3 seconds to confirm that the affected secondary codec received and acknoledged 
        // selection or deselection. In those callback functions we handle reverting the setting if no ack.
        setTimeout(validateSecLayoutResponses, SECONDS_AWAIT_CONFIRMATION * 1000, theLayout);
    }
    else {
        console.warn(`${wall_key} is not a key in the divisible_config.L_WALLS object in the divisible_config macro. Make sure each key contains charaters 1 or 0 and is 3 digits long.`)
        xapi.command("UserInterface Message Alert Display",
            {
                Title: 'Error',
                Text: `Configuration error: ${wall_key} is not a key in the divisible_config.L_WALLS object in the divisible_config macro. `,
                Duration: 3
            });
    }
}

async function initPartitionSensors() {

    xapi.Config.GPIO.Pin[1].Mode.set('InputNoAction');
    xapi.Config.GPIO.Pin[2].Mode.set('InputNoAction');
    xapi.Config.GPIO.Pin[3].Mode.set('InputNoAction');

    xapi.Status.GPIO.Pin[1].State.on(state => {
        console.log(`GPIO Pin 1 State went to: ${state}`);
        setTimeout(processPartitionEvents, 2000); // wait a couple of seconds before reading all pins to determine overall state
    });

    xapi.Status.GPIO.Pin[2].State.on(state => {
        console.log(`GPIO Pin 2 State went to: ${state}`);
        setTimeout(processPartitionEvents, 2000); // wait a couple of seconds before reading all pins to determine overall state
    });

    xapi.Status.GPIO.Pin[3].State.on(state => {
        console.log(`GPIO Pin 3 State went to: ${state}`);
        setTimeout(processPartitionEvents, 2000); // wait a couple of seconds before reading all pins to determine overall state
    });

}


async function processPartitionEvents() {
    if (MANUAL_WALL_SELECT) {
        console.log('MANUAL_WALL_SELECT is set to true; ignoring GPIO PIN states......')
    }
    else {
        // calculate value of global wall_key based on GPIO Pin readings
        let chArr = [...wall_key];
        // first extract current value from GPIO Pins into charVal1-3
        const pin1State = await xapi.Status.GPIO.Pin[1].State.get();
        const pin2State = await xapi.Status.GPIO.Pin[2].State.get();
        const pin3State = await xapi.Status.GPIO.Pin[3].State.get();
        chArr[0] = (pin1State == PIN_VOLTAGE_WALL_OPEN) ? '0' : '1';
        chArr[1] = (pin2State == PIN_VOLTAGE_WALL_OPEN) ? '0' : '1';
        chArr[2] = (pin3State == PIN_VOLTAGE_WALL_OPEN) ? '0' : '1';
        wall_key = chArr.join('');
        console.log(`GPIO pin status yield wall_key value of ${wall_key}`)
        // send layout and state change request to all other codecs
        sendLayoutAndStateChangeRequest();
    }
}

async function initialWallPartitionCheck() {
    // first read from storage the if we are manually selecting partitions and, if not
    // the last valid wall partition configuration that was set across the codecs.
    let stored_alt_manual_wall_select = await GMM.read.global('JoinSplit_alt_manual_wall_select').catch(async e => {
        console.log("No JoinSplit_alt_manual_wall_select global detected.. assuming empty ")
        return { "wall_key": "000", "manual": MANUAL_WALL_SELECT };
    })
    wall_key = stored_alt_manual_wall_select['wall_key']

    MANUAL_WALL_SELECT = stored_alt_manual_wall_select['manual']

    if (MANUAL_WALL_SELECT) {
        console.log('MANUAL_WALL_SELECT is set to true; ignoring GPIO PIN states......')
    }
    else {
        // calculate value of global wall_key based on GPIO Pin readings
        let chArr = [...wall_key];
        // first extract current value from GPIO Pins into charVal1-3
        const pin1State = await xapi.Status.GPIO.Pin[1].State.get();
        const pin2State = await xapi.Status.GPIO.Pin[2].State.get();
        const pin3State = await xapi.Status.GPIO.Pin[3].State.get();
        chArr[0] = (pin1State == PIN_VOLTAGE_WALL_OPEN) ? '0' : '1';
        chArr[1] = (pin2State == PIN_VOLTAGE_WALL_OPEN) ? '0' : '1';
        chArr[2] = (pin3State == PIN_VOLTAGE_WALL_OPEN) ? '0' : '1';

        let current_pins_wall_key = chArr.join('');
        console.log(`GPIO pin status yield wall_key value of ${current_pins_wall_key}`)
        console.log(`Currently stored wall key: ${wall_key}`)

        if (current_pins_wall_key != wall_key) {
            console.log(`New wall key detected from GPIO pins, switching layouts on system in ${SECONDS_INITIAL_STATE_LAYOUT_ADJUST} seconds...`)
            // send layout and state change request to all other codecs
            wall_key = current_pins_wall_key;
            xapi.command("UserInterface Message Alert Display",
                {
                    Title: 'Layout Change',
                    Text: 'Discrepancy detected between stored partition settings and GPIO PINS, focing GPIO PIN settings...',
                    Duration: SECONDS_INITIAL_STATE_LAYOUT_ADJUST
                });
            setTimeout(sendLayoutAndStateChangeRequest, SECONDS_INITIAL_STATE_LAYOUT_ADJUST * 1000);
        }

    }
}

init()
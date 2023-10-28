/********************************************************
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

*********************************************************

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
 *    - Implements rooms layout handling for divisible rooms macro
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

let CONF = divisible_config.profile_LAY1;

let stored_alt_config = ''
let stored_JOIN_SPLIT_CONFIG = {}
let stored_JoinSplit_secondariesStatus = {}
let stored_JoinSplit_combinedState = '';

//Declare your object for GMM communication
var mainCodec;

async function init() {
    await GMM.memoryInit();
    try {
        mainCodec = new GMM.Connect.IP(CONF.OTHER_CODEC_USERNAME, CONF.OTHER_CODEC_PASSWORD, CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP)
    } catch (e) {
        console.error(e)
    }
}

GMM.Event.Queue.on(report => {
    //The queue will continuously log a report to the console, even when it's empty.
    //To avoid additional messages, we can filter the Queues Remaining Requests and avoid it if it's equal to Empty
    if (report.QueueStatus.RemainingRequests != 'Empty') {
        report.Response.Headers = [] // Clearing Header response for the simplicity of the demo, you may need this info
        //console.log(report)
    }
});



function delay(ms) { return new Promise(resolve => { setTimeout(resolve, ms) }) }

async function sendIntercodecMessage(message) {
    console.log(`sendIntercodecMessage:  message = ${message}`);
    if (mainCodec != '')
        mainCodec.status(message).passIP().queue().catch(e => {
            console.log('Error sending message');
        });
}

async function processChangeLayout(theLayout) {
    // first retrieve existing layout config in case we have to roll back
    stored_alt_config = await GMM.read.global('JoinSplit_alt_config').catch(async e => {
        console.log("No initial JoinSplit_alt_config global detected, setting to 'LAY1' ")
        return 'LAY1';
    })

    // store the new layout selection in permanent memory
    await GMM.write.global('JoinSplit_alt_config', theLayout).then(() => {
        console.log({ Message: 'ChangeState', Action: 'Config in storage set to ' + theLayout })
    })

    // turn off the divisible_room macro until we get a command to actiave new layout or roll back
    //console.log(`turning divisible_room macro off....`)
    //await xapi.Command.Macros.Macro.Deactivate({ Name: "divisible_room" });
    //await delay(1000);
    //Send back AWK that layout was changed, a different message with trigger us to restart the macro
    await sendIntercodecMessage('SEC_LAYOUT_APPLIED_' + theLayout)
}

async function processChangeLayoutAndState(theLayout) {



    // first retrieve existing layout config in case we have to roll back
    stored_alt_config = await GMM.read.global('JoinSplit_alt_config').catch(async e => {
        console.log("No initial JoinSplit_alt_config global detected, setting to 'LAY1' ")
        return 'LAY1';
    })

    // Also retrieve and store current JOIN_SPLIT_CONFIG ,
    //  JoinSplit_combinedState and JoinSplit_secondariesStatus objects from permanent memory to restore if rollback
    stored_JOIN_SPLIT_CONFIG = await GMM.read.global('JOIN_SPLIT_CONFIG').catch(async e => {
        console.log("No JOIN_SPLIT_CONFIG global detected, must turn on divisible_room macro first. ")
        return {};
    })
    stored_JoinSplit_secondariesStatus = await GMM.read.global('JoinSplit_secondariesStatus').catch(async e => {
        console.log("No JoinSplit_secondariesStatus global detected, might be first time running as primary. ")
        return {};
    })
    stored_JoinSplit_combinedState = await GMM.read.global('JoinSplit_combinedState').catch(async e => {
        console.log("No JoinSplit_combinedState global detected, must turn on divisible_room macro first. ")
        return '';
    })

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

    //Send back AWK that layout was changed, a different message with trigger us to restart the macro
    await sendIntercodecMessage('SEC_LAYOUT_APPLIED_' + theLayout.layout)
}

async function activateNewLayout() {
    console.log(`turning divisible_room macro back on....`)
    await delay(3000);
    await xapi.Command.Macros.Runtime.Restart();
}

async function rollBackLayout() {
    // just store the original layout selection to permanent storage. 
    await GMM.write.global('JoinSplit_alt_config', stored_alt_config).then(() => {
        console.log({ Message: 'ChangeState', Action: 'Alt config in storage set to ' + stored_alt_config })
    })

    if (Object.keys(stored_JOIN_SPLIT_CONFIG).length != 0)
        await GMM.write.global('JOIN_SPLIT_CONFIG', stored_JOIN_SPLIT_CONFIG).then(() => {
            console.log({ Message: 'ChangeState', Action: 'JOIN_SPLIT_CONFIG in storage set to ' + stored_JOIN_SPLIT_CONFIG })
        })
    if (Object.keys(stored_JoinSplit_secondariesStatus).length != 0)
        await GMM.write.global('JoinSplit_secondariesStatus', stored_JoinSplit_secondariesStatus).then(() => {
            console.log({ Message: 'ChangeState', Action: 'JoinSplit_secondariesStatus in storage set to ' + stored_JoinSplit_secondariesStatus })
        })
    if (stored_JoinSplit_combinedState != '')
        await GMM.write.global('JoinSplit_combinedState', stored_JoinSplit_combinedState).then(() => {
            console.log({ Message: 'ChangeState', Action: 'JoinSplit_combinedState in storage set to ' + stored_JoinSplit_combinedState })
        })

}


GMM.Event.Receiver.on(async event => {
    if (event.Source.Id != 'localhost' && event.App == 'div_layout_select') {
        console.warn("Received from app div_layout_select on main codec: ", event.Value)
        if (event.Type == 'Error') {
            console.error(event)
        } else {
            let theEventValue = event.Value;
            let theLayout = '';
            console.log(`Evaluating eventValue: ${theEventValue} with type`, typeof theEventValue)
            if (typeof theEventValue == 'object' && 'apply_div_combine_layout' in theEventValue) {
                console.log(`calling processChangeLayoutAndState() with ${theEventValue['apply_div_combine_layout']}`)
                processChangeLayoutAndState(theEventValue['apply_div_combine_layout']);
            }
            else if (theEventValue == 'ACTIVATE_NEW_LAYOUT') {
                activateNewLayout()
            }
            else if (theEventValue == 'ROLLBACK_LAYOUT') {
                rollBackLayout();
            }
            else if (theEventValue.slice(0, 13) == 'APPLY_LAYOUT_') {
                theLayout = theEventValue.substring(13);
                processChangeLayout(theLayout);
            }

        }
    }
})

init()
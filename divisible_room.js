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
* Version: 2.2.7
* Released: June 6, 2025
* Latest RoomOS version tested: 11.28.1.5 
*
* Macro Author:      	Gerardo Chaves
*                    	Technical Solutions Architect
*                    	gchaves@cisco.com
*                    	Cisco Systems
*
* Consulting Engineer: Robert(Bobby) McGonigle Jr
*                    	 Technical Marketing Engineer
*                    	 bomcgoni@cisco.com
*                    	 Cisco Systems
* 
*    
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


const minOS10Version = '10.17.1.0';
const minOS11Version = '11.2.1.0';

// Set JS_MULTI_ROLE to true if you will need to change roles of codecs in the solution from
// Primary to Secondary to support more advanced layouts. If you do so, you also need to fill out
// Multiple profile_LAY constants in divisible_config.js and the following constants there: 
// THIS_CODEC_IP, LAYOUTS, L_WALLS
const JS_MULTI_ROLE = false;

import * as divisible_config from './divisible_config';

let CONF = divisible_config.profile_LAY1;

async function checkAltconfig() {
  await GMM.memoryInit();
  if (JS_MULTI_ROLE) {
    let stored_alt_config = ''
    stored_alt_config = await GMM.read.global('JoinSplit_alt_config').catch(async e => {
      console.log("No initial JoinSplit_alt_config global detected, setting to 'LAY1' ")
      return '';
    })
    if (stored_alt_config == '') {
      await GMM.write.global('JoinSplit_alt_config', 'LAY1').then(() => {
        console.log({ Message: 'ChangeState', Action: 'Config initialized to LAY1.' })
        stored_alt_config = 'LAY1';
      })
    }
    else {
      console.log({ Message: 'Loading config profile.', Action: `Loaded config: ${stored_alt_config}.` })
      switch (stored_alt_config) {
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
    }
  }
}


const enableKeepAlive = false;

const keepAliveReportOnlyFails = true;
// KA_FREQUENCY_SECONDS is the frequency in which to send keep alives to secondaries, in seconds, 
// no less than 3 and at least 1 more than KA_CHECK_REPLIES_TIMEOUT_MS/1000
const KA_FREQUENCY_SECONDS = 15;
const KA_CHECK_REPLIES_TIMEOUT_MS = 2000; // time in ms to check for KA replies no less than 1000

async function isCodecPro() {
  let ProductPlatform = await xapi.Status.SystemUnit.ProductPlatform.get()
  return (ProductPlatform == "Codec Pro")
}

let secondariesKAStatus = {};
function priHandleKeepAliveResponse(ipAddress) {
  // called when received "VTC_KA_OK"
  secondariesKAStatus[ipAddress].online = true;
}

function priKeepAliveStatuses() {
  let allReportsOnline = true;
  // check status of all KA responses and report if any missing
  Object.entries(secondariesKAStatus).forEach(([key, val]) => {
    if (!val.online) {
      console.warn(`Secondary at IP: ${key} did not respond to latest keep alive`);
      allReportsOnline = false;
    }
  })
  if (!keepAliveReportOnlyFails && allReportsOnline)
    console.log(`Received KeepAlive responses from all secondaries after ${KA_CHECK_REPLIES_TIMEOUT_MS} milliseconds. `)

}


async function priSendKeepAlive() {
  //send message "VTC_KA_req" to all secondaries
  if (!keepAliveReportOnlyFails)
    console.log(`Sending KeepAlive messages to all secondary codecs...`)
  Object.entries(secondariesKAStatus).forEach(([key, val]) => {
    val.online = false;
  })
  await sendIntercodecMessage("VTC_KA_req");

  //check for keepAlive replies KA_CHECK_REPLIES_TIMEOUT_MS miliseconds after sending
  setTimeout(priKeepAliveStatuses, KA_CHECK_REPLIES_TIMEOUT_MS);
}

async function secSendKeepAliveResponse() {
  // send message "VTC_KA_OK" to primary when received "VTC_KA_req"
  await sendIntercodecMessage("VTC_KA_OK");

}

// Validate config settings
async function validate_config() {
  let hasOverview = true;

  // only allow CodecPro or CodecEQ with advanced AV integrator option key
  const ProductPlatform = await xapi.Status.SystemUnit.ProductPlatform.get()
  if (ProductPlatform == "Room Kit EQ") {
    try {
      console.log(`Is Codec EQ`);
      const hasAVOptionInstalled = await xapi.Status.SystemUnit.Software.OptionKeys.AVIntegrator.get()
      if (hasAVOptionInstalled != 'True') {
        await disableMacro(`config validation fail: Platform ${ProductPlatform} without AV Integrator Option key not supported.`);
      }
    }
    catch (e) {
      await disableMacro(`config validation fail: Platform ${ProductPlatform} could not validate AV Option key.`);
    }
  }
  else if (ProductPlatform == "Codec Pro") {
    console.log(`Is Codec Pro`)
  }
  else {
    await disableMacro(`config validation fail: Platform ${ProductPlatform} not supported.`);
  }

  if (_main_macro_name() != 'divisible_room')
    await disableMacro(`config validation fail: macro name has changed to: ${_main_macro_name()}. Please set back to: divisible_room`);

  if (CONF.OTHER_CODEC_USERNAME == '' && CONF.BOT_TOKEN == '')
    await disableMacro(`config validation fail: OTHER_CODECcredentials must be set.  Current values: CONF.OTHER_CODEC_USERNAME: ${CONF.OTHER_CODEC_USERNAME} CONF.OTHER_CODEC_PASSWORD= ${CONF.OTHER_CODEC_PASSWORD}`);
  // allow up to 8 analog mics
  let allowedMics = [1, 2, 3, 4, 5, 6, 7, 8];

  let allowedEthernetMics = []
  // allow up to 8 ethernet mics with 8 lobes each
  for (let i = 1; i <= 8; i++) {
    for (let j = 1; j <= 8; j++) {
      allowedEthernetMics.push((i * 10) + j)
    }
  }

  let allowedUSBMics = []
  // allow up to 4 USB mics
  for (let i = 1; i <= 4; i++) {
    allowedUSBMics.push(100 + i)
  }

  let allowedExternalMics = []
  // allow up to  99 External mics
  for (let i = 1; i <= 99; i++) {
    allowedExternalMics.push(900 + i)
  }

  // only allow up to 8 analog microphones
  if (CONF.config.monitorMics.length > 8)
    await disableMacro(`config validation fail: CONF.config.monitorMics can only have up to 8 entries. Current value: ${CONF.config.MonitorMics} `);
  // only allow up to 8 analog microphones
  if (CONF.config.ethernetMics.length > 64)
    await disableMacro(`config validation fail: CONF.config.ethernetMics can only have up to 64 entries. Current value: ${CONF.config.ethernetMics} `);
  // only allow up to 8 analog microphones
  if (CONF.config.usbMics.length > 4)
    await disableMacro(`config validation fail: CONF.config.usbMics can only have up to 4 entries. Current value: ${CONF.config.usbMics} `);
  if (CONF.config.externalMics.length > 99)
    await disableMacro(`config validation fail: CONF.config.externalMics can only have up to 99 entries. Current value: ${CONF.config.ethernetMics} `);

  if ((CONF.config.monitorMics.length + CONF.config.ethernetMics + CONF.config.usbMics.length + CONF.config.externalMics.length) < 1)
    await disableMacro(`config validation fail: there must be at least one microphone configured between CONF.config.monitorMics, CONF.config.ethernetMics and CONF.config.usbMics.`);


  // Check if using USB mic/input, that Echo control is turned on
  if (CONF.config.usbMics.length > 0) {
    const usbEchoControl = await xapi.Config.Audio.Input.USBInterface[1].EchoControl.Mode.get()
    if (usbEchoControl != 'On')
      await disableMacro(`config validation fail: when using USB microphone input, Echo Control needs to be enabled. Only asynchronous USB devices are supported. Please enable and re-activate macro`);

  }

  // make sure the mics are within those specified in the monitorMics array
  if (!CONF.config.monitorMics.every(r => allowedMics.includes(r)))
    await disableMacro(`config validation fail: CONF.config.monitorMics can only have analog mic ids 1-8. Current value: ${CONF.config.monitorMics} `);

  if (!CONF.config.ethernetMics.every(r => allowedEthernetMics.includes(r)))
    await disableMacro(`config validation fail: CONF.config.ethernetMics can only include Ethernet mics 1-8(8 lobes each). Current value: ${CONF.config.ethernetMics} `);

  if (!CONF.config.usbMics.every(r => allowedUSBMics.includes(r)))
    await disableMacro(`config validation fail: CONF.config.usbMics can only include USB mics 1-4 (values 101-104). Current value: ${CONF.config.usbMics} `);

  if (!CONF.config.externalMics.every(r => allowedExternalMics.includes(r)))
    await disableMacro(`config validation fail: CONF.config.externalMics can only include external mics 01-99 (values 901-999). Current value: ${CONF.config.externalMics} `);

  // check for duplicates in CONF.config.monitorMics
  if (new Set(CONF.config.monitorMics).size !== CONF.config.monitorMics.length)
    await disableMacro(`config validation fail: CONF.config.monitorMics cannot have duplicates. Current value: ${CONF.config.monitorMics} `);
  if (new Set(CONF.config.ethernetMics).size !== CONF.config.ethernetMics.length)
    await disableMacro(`config validation fail: CONF.config.ethernetMics cannot have duplicates. Current value: ${CONF.config.ethernetMics} `);
  if (new Set(CONF.config.usbMics).size !== CONF.config.usbMics.length)
    await disableMacro(`config validation fail: CONF.config.usbMics cannot have duplicates. Current value: ${CONF.config.usbMics} `);

  // Check for valid audience mics CONFIGURED for the Presenter QA Mode feature
  if (CONF.ALLOW_PRESENTER_QA_MODE)
    if (!CONF.PRESENTER_QA_AUDIENCE_MIC_IDS.every(r => CONF.config.monitorMics.includes(r)) &&
      !CONF.PRESENTER_QA_AUDIENCE_MIC_IDS.every(r => CONF.config.ethernetMics.includes(r)) &&
      !CONF.PRESENTER_QA_AUDIENCE_MIC_IDS.every(r => CONF.config.externalMics.includes(r)) &&
      !CONF.PRESENTER_QA_AUDIENCE_MIC_IDS.every(r => CONF.config.usbMics.includes(r)))
      await disableMacro(`config validation fail: CONF.PRESENTER_QA_AUDIENCE_MIC_IDS can only specify values contained in CONF.config.monitorMics, CONF.config.ethernetMics or CONF.config.usbMics . Current values CONF.PRESENTER_QA_AUDIENCE_MIC_IDS: ${CONF.PRESENTER_QA_AUDIENCE_MIC_IDS}`);

  // if running in secondary codec make sure we have a valid IP address for the primary codec
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY) {
    //if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP))
    //await disableMacro(`config validation fail: Invalid IP address CONFIGURED to talk to primary codec: ${CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP} `);
    console.log('Skipping IP address validation since now we support device IDs')

  }
  else {
    hasOverview = false;
    // add value 0 to allowedMics array to include overview composition
    allowedMics.push(0)
    // consolidate all allowed mics to check each composition for valid mics.
    allowedMics = allowedMics.concat(allowedEthernetMics, allowedUSBMics, allowedExternalMics)
    // now let's check each composition
    for (let i = 0; i < CONF.config.compositions.length; i++) {
      let compose = CONF.config.compositions[i];
      // make sure each composition is marked CONF.JS_PRIMARY or CONF.JS_SECONDARY
      if (![CONF.JS_PRIMARY, CONF.JS_SECONDARY, CONF.JS_AUXILIARY, CONF.JS_LOCAL].includes(compose.source)) await disableMacro(`config validation fail: composition named ${compose.name} should have a valid value for key 'source' (CONF.JS_PRIMARY, CONF.JS_SECONDARY, CONF.JS_AUXILIARY or CONF.JS_LOCAL).`);

      /*
      // make sure if CONF.JS_SECONDARY source, then there is a real IP address CONFIGURED
      if (compose.source == (CONF.JS_SECONDARY || CONF.JS_AUXILIARY))
        if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(compose.codecIP))
          await disableMacro(`config validation fail: Invalid IP address for composition ${compose.name}: ${compose.codecIP} `);
    */

      /*
            // make sure if CONF.JS_SECONDARY source, mics specified are only analog mics being monitored
            if (compose.source == CONF.JS_SECONDARY)
              if (!compose.mics.every(r => CONF.config.monitorMics.includes(r)))
                await disableMacro(`config validation fail: Invalid mics in composition ${compose.name}: ${compose.mics}. Only analog mics allowed for tie lines from secondaries`); */

      // only allow up to 8 mics and at least 1 specified for each composition
      if (compose.mics.length > 8 || compose.mics.length < 1)
        await disableMacro(`config validation fail: mics for each composition can only have between 1 and 8 entries. Current value: ${compose.mics} `);

      // make sure the mics are within those specified in the monitorMics array, plus 0 for overview
      if (!compose.mics.every(r => allowedMics.includes(r)))
        await disableMacro(`config validation fail: mics for each composition can only have mic ids 0-8, 11-88, 101-104 or 901-999. Current value: ${compose.mics} `);

      // keep track that we have at least one composition with mics [0] to check at the end and that it is CONF.JS_PRIMARY sourced
      if (JSON.stringify(compose.mics) == JSON.stringify([0]) && compose.source == CONF.JS_LOCAL) hasOverview = true;
    }

    // check that there was at least one Overview composition with mics==[0]
    if (!hasOverview)
      await disableMacro('config validation fail: no overview composition configured or it does not have source set to CONF.JS_LOCAL');
  }
  // all went well, can return true!
  return true;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function disableMacro(reason = 'N/A') {
  console.warn(reason)
  let act = `Disabling [${_main_macro_name()}] in 10 seconds`
  console.error({ Error: reason, Action: act })
  await xapi.Command.UserInterface.Message.Alert.Display({ Title: '⚠️ Macro Error ⚠️', Text: `${reason}<p>${act}`, Duration: 9 });
  await delay(10000);
  await xapi.Command.Macros.Macro.Deactivate({ Name: _main_macro_name() });
  await delay(100);
  await xapi.Command.Macros.Runtime.Restart();
}

async function checkOverviewPreset() {
  console.log('Checking for existence of preset 30')
  let pre_list = await xapi.Command.Camera.Preset.List(
    { CameraId: 1 })
  let pre_exists = false;
  if ('Preset' in pre_list) {
    pre_list.Preset.forEach(preObj => {
      if (preObj.PresetId == '30') pre_exists = true;
    })
  }
  if (!pre_exists) {
    console.log('Preset 30 does not exist, need to create it....')
    await xapi.Command.Camera.PositionReset({ CameraId: 1 });
    await delay(1000);
    await xapi.Command.Camera.Preset.Store(
      { CameraId: 1, Name: "Overview", PresetId: 30 });
    console.log('Preset 30 created')
  }
}

const PANEL_room_combine_PIN = `<Extensions><Version>1.8</Version>
<Panel>
  <Order>2</Order>
  <PanelId>room_combine_PIN</PanelId>
  <Type>Home</Type>
  <Icon>Sliders</Icon>
  <Color>#CF7900</Color>
  <Name>Wall Sensor Override Control</Name>
  <ActivityType>Custom</ActivityType>
</Panel>        
</Extensions>`;


let panel_combine_split_str = `<Extensions><Version>1.8</Version>
<Panel>
<Order>2</Order>
<PanelId>panel_combine_split</PanelId>
<Origin>local</Origin>
<Type>Home</Type>
<Icon>Sliders</Icon>
<Color>#00D6A2</Color>
<Name>Room Combine Control</Name>
<ActivityType>Custom</ActivityType>
<Page>
<Name>Room Combine Control</Name>
<Row>
  <Name>Row</Name>
  <Widget>
    <WidgetId>widget_text_combine</WidgetId>
    <Name>Combine with selected rooms</Name>
    <Type>Text</Type>
    <Options>size=3;fontSize=normal;align=left</Options>
  </Widget>
  <Widget>
    <WidgetId>widget_toggle_combine</WidgetId>
    <Type>ToggleButton</Type>
    <Options>size=1</Options>
  </Widget>
</Row>`

let panel_combine_split_secondaries_str = `<Row>
    <Name>Row</Name>
    <Widget>
      <WidgetId>notice_text</WidgetId>
      <Name>When not combined, select at least one:</Name>
      <Type>Text</Type>
      <Options>size=3;fontSize=small;align=left</Options>
    </Widget>
  </Row>`

let secondaries_count = 0;
CONF.config.compositions.forEach(compose => {
  if ((compose.source == CONF.JS_SECONDARY && compose.codecIP != '') && compose.codecIP != CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP) {
    secondaries_count += 1;
    let theWidgetId = 'widget_tog_' + compose.codecIP.replace(/\./g, "_")
    let theName = compose.name
    panel_combine_split_secondaries_str = panel_combine_split_secondaries_str + `<Row>
    <Name>Row</Name>
    <Widget>
      <WidgetId>${theWidgetId}</WidgetId>
      <Type>ToggleButton</Type>
      <Options>size=1</Options>
    </Widget>
    <Widget>
      <WidgetId>${theWidgetId}_text</WidgetId>
      <Name>${theName}</Name>
      <Type>Text</Type>
      <Options>size=2;fontSize=small;align=center</Options>
    </Widget>
  </Row>`
  }
})

// Only show selectable secondaries if there is more than one secondary. 
if (secondaries_count > 1)
  panel_combine_split_str = panel_combine_split_str + panel_combine_split_secondaries_str;


const PANEL_panel_combine_split = panel_combine_split_str + `
<Options>hideRowNames=1</Options>
</Page>
</Panel>
</Extensions>`;


//Declare your object for GMM communication
var otherCodecs = {};

//Run your init script asynchronously 
async function init_intercodec() {
  if (CONF.OTHER_CODEC_USERNAME != '')
    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
      let stored_setStatus = {}
      stored_setStatus = await GMM.read.global('JoinSplit_secondariesStatus').catch(async e => {
        console.log("No initial JoinSplit_secondariesStatus global detected, using constants in macro to create new one")
        return {};
      })
      let codecIPArray = [];

      CONF.config.compositions.forEach(compose => {
        if ((compose.source == CONF.JS_SECONDARY && compose.codecIP != '') && compose.codecIP != CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP) {
          console.log(`Setting up connection to secondary codec with address ${compose.codecIP}`);
          //otherCodec[compose.codecIP] = new GMM.Connect.IP(CONF.OTHER_CODEC_USERNAME, CONF.OTHER_CODEC_PASSWORD, compose.codecIP)
          codecIPArray.push(compose.codecIP);
          console.log(`Creating secondaries keep alive status objects`);
          secondariesKAStatus[compose.codecIP] = { 'online': false };
          console.log(`Creating secondaries status object for this secondary codec...`)
          //make sure there is an entry for compose.codecIP in secondariesStatus, if not, create a new one 
          if (!(compose.codecIP in stored_setStatus)) { // this secondary codec info was not in permanent storage, create
            secondariesStatus[compose.codecIP] = { 'inCall': false, 'inPreview': false, 'online': false, 'selected': true };
          }
          else {
            secondariesStatus[compose.codecIP] = stored_setStatus[compose.codecIP]; // copy over what was in storage, mainly the 'selected' state
            secondariesStatus[compose.codecIP]['inCall'] = false; // the inCall attribute should never be true when re-initting macro
            secondariesStatus[compose.codecIP]['inPreview'] = false; // the inPreview attribute should never be true when re-initting macro
          }
          connector_to_codec_map[compose.connectors[0]] = compose.codecIP; // mapping connectors to IP of corresponding secondary
        }
      })

      if (CONF.BOT_TOKEN == '')
        otherCodecs = new GMM.Connect.IP(CONF.OTHER_CODEC_USERNAME, CONF.OTHER_CODEC_PASSWORD, codecIPArray);
      else
        otherCodecs = new GMM.Connect.Webex(CONF.BOT_TOKEN, codecIPArray);

      //console.log(otherCodecs)

      await GMM.write.global('JoinSplit_secondariesStatus', secondariesStatus).then(() => {
        console.log({ Message: 'ChangeState', Action: 'Secondary codecs state stored.' })
      })
    }
    else {
      if (CONF.BOT_TOKEN == '')
        otherCodecs = new GMM.Connect.IP(CONF.OTHER_CODEC_USERNAME, CONF.OTHER_CODEC_PASSWORD, CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP)
      else
        otherCodecs = new GMM.Connect.Webex(CONF.BOT_TOKEN, CONF.JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP)

    }

  // now connect any Auxiliary codecs this one might have CONFIGURED irrespective if primary or secondary

  let codecIPArray = [];

  CONF.config.compositions.forEach(compose => {
    if (compose.codecIP != '' && compose.source == CONF.JS_AUXILIARY) {
      console.log(`Setting up connection to aux codec with IP ${compose.codecIP}`);
      //console.log(`Creating aux status object for this aux codec...`)
      console.log(`Adding IP address of aux codec to array to create connection object...`)
      codecIPArray.push(compose.codecIP);
      AUX_CODEC_STATUS[compose.codecIP] = { enable: true, 'online': false, 'haspeople': true };
    }
  })

  // now creating one connection object that sends to multiple aux codecs
  // but only if there are aux codecs CONFIGURED, otherwise leave as initialized as {}
  if (codecIPArray.length > 0) {
    if (CONF.OTHER_CODEC_USERNAME == '')
      console.error(`Missing username or base64 encoded credentials for aux codecs.. will not connect aux codecs!`);
    else
      auxCodecs = new GMM.Connect.IP(CONF.OTHER_CODEC_USERNAME, CONF.OTHER_CODEC_PASSWORD, codecIPArray)
  }


  // This schedules the keep alive messages to send from primary to secondaries, if enabled. 
  if (enableKeepAlive && CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
    if (KA_FREQUENCY_SECONDS >= 3 && KA_CHECK_REPLIES_TIMEOUT_MS >= 1000)
      if ((KA_FREQUENCY_SECONDS * 1000) > KA_CHECK_REPLIES_TIMEOUT_MS + 1000)
        setInterval(priSendKeepAlive, KA_FREQUENCY_SECONDS * 1000);
  }
}

const localCallout = new GMM.Connect.Local(_main_macro_name())

/////////////////////////////////////////////////////////////////////////////////////////
// VARIABLES
/////////////////////////////////////////////////////////////////////////////////////////


// roomCombined keeps the current state of join/split for the codec. It is normally also reflected in 
// permanent storage (GMMMemory macro) in the JoinSplit_combinedState global
var roomCombined = false;

// on a secondary codec, secondarySelected reflects if it has been selected for joining from the primary or not. It is kept in persistent 
// storage in the JoinSplit_secondarySelected key
var secondarySelected = true;

// wallSensorOverride keeps the current state of the wall sensor functionality. If it is working well it is set to false
// If users detect a failure of the sensor, they will use the wall sensor override custom panel (PIN based or toggle button based)
// and from then on the macro will ignore the wall sensor input on GPIO PIN 1. 
// The value of this boolean will always be reflected in permanent storage (GMMMemory macro) in the JoinSplit_wallSensorOverride global
// Once the wall sensor is repaired, somebody with access to this macro will have to manually edit the Memory_Storage macro file and set 
// JoinSplit_wallSensorOverride to false and re-start the macro
var wallSensorOverride = false;
// below we are just initializing JoinSplit_secondary_settings, no need to fill out values
var JoinSplit_secondary_settings = {
  UltrasoundMax: 0,
  WakeupOnMotionDetection: '',
  StandbyControl: '',
  VideoMonitors: ''
}
// below we are just initializing JoinSplit_primary_settings, no need to fill out values
var JoinSplit_primary_settings = {
  VideoMonitors: ''
}

let micArrays = {};
for (var i in CONF.config.monitorMics) {
  micArrays[CONF.config.monitorMics[i].toString()] = [0, 0, 0, 0];
}
for (var i in CONF.config.ethernetMics) {
  micArrays[CONF.config.ethernetMics[i].toString()] = [0, 0, 0, 0];
}
for (var i in CONF.config.usbMics) {
  micArrays[CONF.config.usbMics[i].toString()] = [0, 0, 0, 0];
}

let lowWasRecalled = false;
let lastActiveHighInput = 0;
let lastSourceDict = { SourceID: '1' }
let allowSideBySide = true;
let sideBySideTimer = null;
let InitialCallTimer = null;
let allowCameraSwitching = false;
let allowNewSpeaker = true;
let newSpeakerTimer = null;
let manual_mode = true;

let primarySingleScreen = false;

let micHandler = () => void 0;
let micHandlerEthernet = () => void 0;
let micHandlerUSB = () => void 0;

let overviewShowDouble = true; //Always setting overviewShowDouble to true so we always evaluate the overview composition now
let inSideBySide = false;

let presenterTracking = false;
let presenterDetected = true;
let presenterTrackConfigured = false;
let presenterQAKeepComposition = false;
let qaCompositionTimer = null;

let usb_mode = false;
let webrtc_mode = false;

let primaryInCall = false;

let primaryInPreview = false;

let secondariesStatus = {};
let connector_to_codec_map = {}

function secondariesInCall() { //now also check for secondaries in Preview mode
  let result = false;
  Object.entries(secondariesStatus).forEach(([key, val]) => {
    if ((val.inCall || val.inPreview) && val.selected) result = true;
  })
  return result;
}

function secondariesOnline() {
  let result = false;
  Object.entries(secondariesStatus).forEach(([key, val]) => {
    if (val.online) result = true;
  })
  return result;
}

let PRESENTER_QA_MODE = false

let ST_ACTIVE_CONNECTOR = 0;

let macroTurnedOnST = false;
let macroTurnedOffST = false;

let isOSTen = false;
let isOSEleven = false;

var AUX_CODEC_STATUS = {}

//Declare your object for GMM communication
var auxCodecs = {};


// Initial check for the Video Monitor configuration
async function check4_Video_Monitor_Config() {
  const videoMonitorConfig = await xapi.Config.Video.Monitors.get()
  return new Promise((resolve, reject) => {
    if (videoMonitorConfig != 'Auto' && (videoMonitorConfig != 'Triple' && videoMonitorConfig != 'TriplePresentationOnly')) {
      resolve(videoMonitorConfig)
    } else {
      reject(new Error('xConfiguration Video Monitors can not be set to Auto, Triple or TriplePresentationOnly for the Join/Split macro to work properly'))
    }
  })
}

async function getPresetCamera(prID) {
  const value = await xapi.Command.Camera.Preset.Show({ PresetId: prID });
  return (value.CameraId)
}

async function check4_Minimum_Version_Required(minimumOs) {
  const reg = /^\D*(?<MAJOR>\d*)\.(?<MINOR>\d*)\.(?<EXTRAVERSION>\d*)\.(?<BUILDID>\d*).*$/i;
  const minOs = minimumOs;
  const os = await xapi.Status.SystemUnit.Software.Version.get();
  console.log(os)
  const x = (reg.exec(os)).groups;
  const y = (reg.exec(minOs)).groups;
  if (parseInt(x.MAJOR) > parseInt(y.MAJOR)) return true;
  if (parseInt(x.MAJOR) < parseInt(y.MAJOR)) return false;
  if (parseInt(x.MINOR) > parseInt(y.MINOR)) return true;
  if (parseInt(x.MINOR) < parseInt(y.MINOR)) return false;
  if (parseInt(x.EXTRAVERSION) > parseInt(y.EXTRAVERSION)) return true;
  if (parseInt(x.EXTRAVERSION) < parseInt(y.EXTRAVERSION)) return false;
  if (parseInt(x.BUILDID) > parseInt(y.BUILDID)) return true;
  if (parseInt(x.BUILDID) < parseInt(y.BUILDID)) return false;
  return false;
}

/**
  * The following functions allow the ability to set the Pins High or Low
**/
function setGPIOPin2ToHigh() {
  xapi.command('GPIO ManualState Set', { Pin2: 'High' }).catch(e => console.debug(e));
  console.log('Pin 2 has been set to High; MUTE is inactive');
}

function setGPIOPin2ToLow() {
  xapi.command('GPIO ManualState Set', { Pin2: 'Low' }).catch(e => console.debug(e));
  console.log('Pin 2 has been set to Low; MUTE is active');
}

function setGPIOPin3ToHigh() {
  xapi.command('GPIO ManualState Set', { Pin3: 'High' }).catch(e => console.debug(e));
  console.log('Pin 3 has been set to High; STANDBY is inactive');
}

function setGPIOPin3ToLow() {
  xapi.command('GPIO ManualState Set', { Pin3: 'Low' }).catch(e => console.debug(e));
  console.log('Pin 3 has been set to Low; STANDBY is active');
}

function setGPIOPin4ToHigh() {
  xapi.command('GPIO ManualState Set', { Pin4: 'High' }).catch(e => console.debug(e));
  console.log('Pin 4 has been set to High; Rooms are Standalone');
}

function setGPIOPin4ToLow() {
  xapi.command('GPIO ManualState Set', { Pin4: 'Low' }).catch(e => console.debug(e));
  console.log('Pin 4 has been set to Low; Rooms are Combined');
}

async function setCombinedMode(combinedValue) {
  roomCombined = combinedValue;
  await GMM.write.global('JoinSplit_combinedState', roomCombined).then(() => {
    console.log({ Message: 'ChangeState', Action: 'Combined state stored.' })
  })

}

async function setWallSensorOverride(overrideValue) {
  wallSensorOverride = overrideValue;
  await GMM.write.global('JoinSplit_wallSensorOverride', wallSensorOverride).then(() => {
    console.log({ Message: 'ChangeState', Action: 'Wall Sensor Override state stored.' })
  })

}


async function storeSecondarySettings(ultraSoundMaxValue, wState, sState) {
  let currentVideoMonitors = await xapi.Config.Video.Monitors.get();
  if (currentVideoMonitors != 'Triple') { // only store if going from split to combined... if currentVideoMonitors=='Triple' then rooms are combined!!
    JoinSplit_secondary_settings.UltrasoundMax = ultraSoundMaxValue;
    JoinSplit_secondary_settings.WakeupOnMotionDetection = wState;
    JoinSplit_secondary_settings.StandbyControl = sState;
    JoinSplit_secondary_settings.VideoMonitors = currentVideoMonitors;
    await GMM.write.global('JoinSplit_secondary_settings', JoinSplit_secondary_settings).then(() => {
      console.log({ Message: 'ChangeState', Action: 'secondary settings for Ultrasound, WakeupOnMotionDetection , StandbyControl and VideoMonitors stored.' })
    });
  }
}



/**
  * This will initialize the room state to Combined or Divided based on the setting in Memory Macro (persistent storage)
**/
async function initialCombinedJoinState() {
  // Change all these to whatever is needed to trigger on the Primary when it goes into combined
  if (roomCombined) {
    console.log('Primary Room is in Combined Mode');
    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
      primaryCombinedMode();
      if (await isCodecPro())
        if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToLow();
      if (!CONF.USE_WALL_SENSOR) {
        xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_toggle_combine', Value: 'On' });
      }
    }
    setCombinedMode(true);
  } else {
    console.log('Primary Room is in Divided Mode');
    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
      setPrimaryDefaultConfig();
      if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToHigh();
    }
    setCombinedMode(false);
  }
}


/**
  * This will initialize the room state to Combined or Divided based on the Pin 4 set by Primary
**/
async function checkCombinedStateSecondary() {
  if (CONF.USE_GPIO_INTERCODEC) Promise.all([xapi.status.get('GPIO Pin 4')]).then(promises => {
    let [pin4] = promises;
    console.log('Pin4: ' + pin4.State);
    // Change all these to whatever is needed to trigger on the Secondary when it goes into combined
    if (pin4.State === 'Low' && (!secondarySelected)) {
      console.log('Secondary Room is in Combined Mode');
      setSecondaryToCombined();
    } else {
      if (!secondarySelected) console.log('Secondary Room is not selected in Primary...');
      console.log('Secondary Room is in Divided Mode');
      setSecondaryToSplit();
      // since we are in secondary codec and in split configuration, we need to 
      // prepare to do basic switching to support PresenterTrack QA mode. 
      init_switching();
    }
  }).catch(e => console.debug(e));
  else { // not using GPIO PINs
    if (roomCombined) {
      console.log('Secondary was set to Combined Mode in permanent storage');
      setSecondaryToCombined();
    }
    else {
      console.log('Secondary set to Divided Mode in permanent storage');
      setSecondaryToSplit();
    }
  }
}

/**
  * The following functions display a message on the touch panel to alert the users
  * that the rooms are either being separated or joined together
**/
function alertJoinedScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'Combining Rooms ...',
    Text: 'Please wait',
    Duration: 10,
  });
}

function alertSplitScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'Dividing Rooms ...',
    Text: 'Please wait',
    Duration: 10,
  });
}

/**
  * The following functions display a message on the touch panel to alert the users
  * that the rooms are either being selected or unselected
**/
function alertSelectedScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'Selecting room to combine ...',
    Text: 'Please wait',
    Duration: 3,
  });
}

function alertUnselectedScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'Unselecting room to combine ...',
    Text: 'Please wait',
    Duration: 3,
  });
}

/**
  * The following functions display a message on the touch panel to alert the users
  * that their select/unselect failed due secondary not responding
**/
function alertSelectFailedSelectionActionScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'select/unselect failed!!',
    Text: 'Secondary did not respond.. check logs',
    Duration: 5,
  });
}

/**
  * The following functions display a message on the touch panel to alert the users
  * that they are trying to make selections when rooms are combined which is not allowed
**/
function alertSelectWhenCombinedScreen() {
  xapi.command('UserInterface Message Alert Display', {
    Title: 'Unable to select or unselect now!!',
    Text: 'Please split rooms and try again',
    Duration: 5,
  });
}


/**
  * Partition Sensor
  * This will check Pin 1 and listen when the state of the pin changes
**/
function primaryInitPartitionSensor() {
  xapi.status.on('GPIO Pin 1', async (state) => {
    console.log(`GPIO Pin 1[${state.id}] State went to: ${state.State}`);
    if (wallSensorOverride) {
      console.log('wallSensorOverride is set to true; ignoring Pin1 state......')
    }
    else if (secondariesInCall()) {
      xapi.command('UserInterface Message Alert Display', {
        Title: 'Cannot Combine/Split',
        Text: 'The secondary codec is in a call, presenting or in USB mode, please try after the call ends and/or USB mode is turned off.',
        Duration: 10,
      });
    } else if (primaryInCall || primaryInPreview) {
      xapi.command('UserInterface Message Alert Display', {
        Title: 'Cannot Combine/Split',
        Text: 'This codec is in a call, presenting or in USB mode, please try after the call ends and/or USB mode is turned off.',
        Duration: 10,
      });
    }
    else {
      //TODO: fully test forcing codec out of stanby when detecting voltage changes on GPIO Pin 1 (wall sensor)
      xapi.Command.Standby.Deactivate(); // take out of standby to have primary send message to secondary to also come out of standby to correctly join or split
      await delay(2000); // give some time to get out of standby
      if (state.State === CONF.WALL_SENSOR_COMBINED_STATE) {
        alertJoinedScreen();
        console.log('Primary Switched to Combined Mode [Partition Sensor]');
        if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
          primaryCombinedMode();
          if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToLow(); else primaryTriggerCombine();
          if (!CONF.USE_WALL_SENSOR) {
            xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_toggle_combine', Value: 'On' });
          }
        }
        setCombinedMode(true);
      }
      else {
        alertSplitScreen();
        console.log('Primary Switched to Divided Mode [Partition Sensor]');
        if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
          primaryStandaloneMode();
          //primaryCodecSendScreen();
          if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToHigh(); else primaryTriggerDivide();
          if (!CONF.USE_WALL_SENSOR) {
            xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_toggle_combine', Value: 'Off' });
          }
        }
        setCombinedMode(false);
      }
    }
  });
}

/////////////////////////////////////////////////////////////////////////////////////////
// DEFAULT ENDPOINT CONFIGURATIONS
// UPON SYSTEM STARTUP, these configurations should be run, They set a baseline for
// settings that we do not want the users to change.
/////////////////////////////////////////////////////////////////////////////////////////

async function setPrimaryDefaultConfig() {

  console.log("Primary default config being run");

  removeWarning();
  xapi.command('Conference DoNotDisturb Deactivate').catch((error) => { console.error(error); });
  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); });
  xapi.config.set('UserInterface OSD Mode', 'Auto').catch((error) => { console.error("90" + error); });


  // If this codec was a secondary at some point, we need to restore secondary settings we stored away before combining
  JoinSplit_secondary_settings = await GMM.read.global('JoinSplit_secondary_settings').catch(async e => {
    console.log("No JoinSplit_secondary_settings global detected.")
    return JoinSplit_secondary_settings;
  });

  if (JoinSplit_secondary_settings.UltrasoundMax > 0) {
    xapi.Config.Audio.Ultrasound.MaxVolume.set(JoinSplit_secondary_settings.UltrasoundMax);
  }

  if (JoinSplit_secondary_settings.WakeupOnMotionDetection != '') {
    xapi.config.set('Standby WakeupOnMotionDetection', JoinSplit_secondary_settings.WakeupOnMotionDetection)
      .catch((error) => { console.error(error); });
  }

  if (JoinSplit_secondary_settings.StandbyControl != '') {
    xapi.config.set('Standby Control', JoinSplit_secondary_settings.StandbyControl)
      .catch((error) => { console.error(error); });
  }

  if (JoinSplit_secondary_settings.VideoMonitors != '') {
    xapi.Config.Video.Monitors.set(JoinSplit_secondary_settings.VideoMonitors)
      .catch((error) => { console.error(error); });
    switch (JoinSplit_secondary_settings.VideoMonitors) {
      case 'Dual':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('Second');
        break;
      case 'DualPresentationOnly':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('PresentationOnly');
        break;
      case 'Single':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('First');
        break;
    }
  }



  if (await isCodecPro()) {
    xapi.config.set('Audio Input ARC 1 Mode', 'Off')
      .catch((error) => { console.error("1" + error); });
    xapi.config.set('Audio Input ARC 2 Mode', 'Off')
      .catch((error) => { console.error("2" + error); });
    xapi.config.set('Audio Input ARC 3 Mode', 'Off')
      .catch((error) => { console.error("3" + error); });
  }

  // HDMI AUDIO SECTION
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4" + error); });
  xapi.config.set('Audio Input HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("5" + error); });

  // SET MICROPHONES
  // MICROPHONES 1 THRU 7 ARE USER CONFIGURABLE

  // Do inital configuration for inbound audio tielines 
  CONF.config.compositions.forEach(compose => {
    if (compose.source == CONF.JS_SECONDARY) {
      compose.mics.forEach(async micId => {
        // THIS IS THE INPUT FOR THE MICROPHONES FROM THE SECONDARY CODEC
        if (micId > 1 && micId <= 8) { // do not attempt to set these for external, ethernet or USB mics
          if (await isCodecPro()) xapi.config.set('Audio Input Microphone ' + micId.toString() + ' Channel', 'Mono').catch((error) => { console.error("6" + error); });
          xapi.config.set('Audio Input Microphone ' + micId.toString() + ' EchoControl Dereverberation', 'Off')
            .catch((error) => { console.error("7" + error); });
          xapi.config.set('Audio Input Microphone ' + micId.toString() + ' EchoControl Mode', 'On')
            .catch((error) => { console.error("8" + error); });
          xapi.config.set('Audio Input Microphone ' + micId.toString() + ' EchoControl NoiseReduction', 'Off')
            .catch((error) => { console.error("9" + error); });
          xapi.config.set('Audio Input Microphone ' + micId.toString() + ' Level', '18')
            .catch((error) => { console.error("10" + error); });
          xapi.config.set('Audio Input Microphone ' + micId.toString() + ' Mode', 'Off')
            .catch((error) => { console.error("11" + error); });
          if (await isCodecPro()) xapi.config.set('Audio Input Microphone ' + micId.toString() + ' PhantomPower', 'Off').catch((error) => { console.error("12" + error); });
        }
      })

      compose.connectors.forEach(connectorId => {
        xapi.config.set('Audio Input HDMI ' + connectorId.toString() + ' Mode', 'Off')
          .catch((error) => { console.error("12" + error); });
      })

    }
  })
  // MUTE
  xapi.config.set('Audio Microphones Mute Enabled', 'True')
    .catch((error) => { console.error("13" + error); });





  // HDMI AUDIO OUTPUT
  if (await isCodecPro()) xapi.Config.Audio.Output.ConnectorSetup.set('Manual');

  xapi.config.set('Audio Output HDMI 1 Mode', 'On')
    .catch((error) => { console.error("15" + error); });
  // This is for embedded conference audio over to Secondary
  // It will be switched on and off on Secondary input
  xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("16" + error); });
  xapi.config.set('Audio Output HDMI 3 Mode', 'On')
    .catch((error) => { console.error("17" + error); });
  // This allows use of USB Passthrough

  // CONFERENCE
  xapi.config.set('Conference AutoAnswer Mode', 'Off')
    .catch((error) => { console.error("31" + error); });



  // GPIO
  if (await isCodecPro()) {
    if (CONF.USE_WALL_SENSOR) {
      xapi.config.set('GPIO Pin 1 Mode', 'InputNoAction')
        .catch((error) => { console.error("33" + error); });
    }

    if (CONF.USE_GPIO_INTERCODEC) {
      xapi.config.set('GPIO Pin 2 Mode', 'OutputManualState')
        .catch((error) => { console.error("34" + error); });
      xapi.config.set('GPIO Pin 3 Mode', 'OutputManualState')
        .catch((error) => { console.error("35" + error); });
      xapi.config.set('GPIO Pin 4 Mode', 'OutputManualState')
        .catch((error) => { console.error("36" + error); });
    }
  }
  // PERIPHERALS
  xapi.config.set('Peripherals Profile Cameras', 'Minimum1')
    .catch((error) => { console.error("39" + error); });
  xapi.config.set('Peripherals Profile TouchPanels', 'Minimum1')
    .catch((error) => { console.error("40" + error); });

  // SERIAL PORT
  xapi.config.set('SerialPort LoginRequired', 'Off')
    .catch((error) => { console.error("41" + error); });
  xapi.config.set('SerialPort Mode', 'On')
    .catch((error) => { console.error("42" + error); });


  // VIDEO
  xapi.config.set('Video DefaultMainSource', '1')
    .catch((error) => { console.error("45" + error); });


  // VIDEO INPUT SECTION
  // HDMI INPUT 1
  xapi.config.set('Video Input Connector 1 CameraControl CameraId', '1')
    .catch((error) => { console.error("49" + error); });
  xapi.config.set('Video Input Connector 1 CameraControl Mode', 'On')
    .catch((error) => { console.error("50" + error); });
  xapi.config.set('Video Input Connector 1 InputSourceType', 'camera')
    .catch((error) => { console.error("51" + error); });
  xapi.config.set('Video Input Connector 1 Name', 'Quad Camera')
    .catch((error) => { console.error("52" + error); });
  xapi.config.set('Video Input Connector 1 PreferredResolution', '1920_1080_60')
    .catch((error) => { console.error("53" + error); });
  xapi.config.set('Video Input Connector 1 PresentationSelection', 'Manual')
    .catch((error) => { console.error("54" + error); });
  xapi.config.set('Video Input Connector 1 Quality', 'Motion')
    .catch((error) => { console.error("55" + error); });
  xapi.config.set('Video Input Connector 1 Visibility', 'Never')
    .catch((error) => { console.error("56" + error); });

  // HDMI INPUT 2
  // THIS IS THE PRESENTER CAMERA 



  // Setting video input from secondary codecs

  CONF.config.compositions.forEach(compose => {
    if (compose.source == CONF.JS_SECONDARY) {
      compose.connectors.forEach(sourceID => {
        console.log(`Configuring video inputs from secondary codec out of composition ${compose.name}`);
        xapi.config.set(`Video Input Connector ${sourceID} CameraControl Mode`, 'Off')
          .catch((error) => { console.error("58" + error); });
        xapi.config.set(`Video Input Connector ${sourceID} InputSourceType`, 'other')
          .catch((error) => { console.error("59" + error); });
        xapi.config.set(`Video Input Connector ${sourceID} Name`, 'Selfview Secondary')
          .catch((error) => { console.error("60" + error); });
        xapi.config.set(`Video Input Connector ${sourceID} PreferredResolution`, '1920_1080_60')
          .catch((error) => { console.error("61" + error); });
        xapi.config.set(`Video Input Connector ${sourceID} PresentationSelection`, 'Manual')
          .catch((error) => { console.error("62" + error); });
        xapi.config.set(`Video Input Connector ${sourceID} Quality`, 'Motion')
          .catch((error) => { console.error("63" + error); });
        xapi.config.set(`Video Input Connector ${sourceID} Visibility`, 'Never')
          .catch((error) => { console.error("64" + error); });
      })

    }
  }
  )

  // HDMI INPUT 4 and 5 SHOULD BE CONFIGURED FROM THE WEB INTERFACE
  // SDI INPUT 6 SHOULD ALSO BE CONFIGURED FROM THE WEB INTERFACE UNLESS IT IS USED FOR THE VIDEO TIE LINE FROM SECONDARY
  // SDI INPUT 6 CAN BE USED FOR EITHER THE VIDEO TIE LINE, OR FOR AN ADDITIONAL PTZ CAMERA (BUT NOT THE PRESENTER CAMERA)


  // VIDEO OUTPUT SECTION
  // THESE SHOULD NOT BE CONFIGURED BY THE INSTALLER

  JoinSplit_primary_settings.VideoMonitors = await xapi.Config.Video.Monitors.get()
  switch (JoinSplit_primary_settings.VideoMonitors) {
    case 'Dual':
      xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
      xapi.Config.Video.Output.Connector[2].MonitorRole.set('Second');
      primarySingleScreen = false;
      break;
    case 'DualPresentationOnly':
      xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
      xapi.Config.Video.Output.Connector[2].MonitorRole.set('PresentationOnly');
      primarySingleScreen = false;
      break;
    case 'Single':
      xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
      xapi.Config.Video.Output.Connector[2].MonitorRole.set('First');
      primarySingleScreen = true;
      break;
  }


}

async function setSecondaryDefaultConfig() {

  console.log("Secondary default config being run");

  // no longer will we store the VideoMonitors settings and others below when
  // setting default config since that was storing wrong values when initializing in combined mode.
  // we only store them when we are going to combined Mode to keep track of what they were initially when split
  /*
    //grab current secondary settings to store away in GMM  
    let ultraSoundMaxValue = await xapi.Config.Audio.Ultrasound.MaxVolume.get()
    let standbyWakeupMotionValue=await xapi.Config.Standby.WakeupOnMotionDetection.get()
    let standbyControlValue=await xapi.Config.Standby.Control.get()
  
    // store it them in persistent storage, this also reads 
    // current JoinSplit_secondary_settings.VideoMonitors from codec
   await storeSecondarySettings(ultraSoundMaxValue, standbyWakeupMotionValue, standbyControlValue);
  */

  if (await isCodecPro()) {
    xapi.config.set('Audio Input ARC 1 Mode', 'Off')
      .catch((error) => { console.error("1" + error); });
    xapi.config.set('Audio Input ARC 2 Mode', 'Off')
      .catch((error) => { console.error("2" + error); });
    xapi.config.set('Audio Input ARC 3 Mode', 'Off')
      .catch((error) => { console.error("3" + error); });
  }

  // HDMI AUDIO SECTION
  if (await isCodecPro()) xapi.Config.Audio.Output.ConnectorSetup.set('Manual');
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4" + error); });
  xapi.config.set('Audio Input HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("5" + error); });

  xapi.Config.Audio.Input.HDMI[CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID].Mode.set('On')
    .catch((error) => { console.error("5" + error); });;

  // This allows us of USB Passthrough

  // SET MICROPHONES
  // MICROPHONES 1 THRU 8 ARE USER CONFIGURABLE
  // THIS NEW VERSION 2 DESIGN USES EMBEDDED HDMI AUDIO FROM PRIMARY TO SECONDARY

  // MUTE
  xapi.config.set('Audio Microphones Mute Enabled', 'True')
    .catch((error) => { console.error("21" + error); });

  // OUTPUT ARC SECTION (FOR QUAD CAMERA ONLY)
  xapi.config.set('Audio Output ARC 1 Mode', 'On')
    .catch((error) => { console.error("22" + error); }); //TODO: This need to be turned off if you do not want to use the speakers on the QuadCam

  // HDMI AUDIO OUTPUT
  if (!CONF.SECONDARY_USE_MONITOR_AUDIO)
    xapi.config.set('Audio Output HDMI 1 Mode', 'Off')
      .catch((error) => { console.error("23" + error); });
  xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("24" + error); });
  xapi.config.set('Audio Output HDMI 3 Mode', 'On')
    .catch((error) => { console.error("25" + error); });
  // This allows use of USB Passthrough

  // CONFERENCE
  xapi.config.set('Conference AutoAnswer Mode', 'Off')
    .catch((error) => { console.error("36" + error); });


  if (await isCodecPro()) {
    // GPIO
    if (CONF.USE_GPIO_INTERCODEC) {
      xapi.config.set('GPIO Pin 2 Mode', 'InputNoAction')
        .catch((error) => { console.error("39" + error); });
      xapi.config.set('GPIO Pin 3 Mode', 'InputNoAction')
        .catch((error) => { console.error("40" + error); });
      xapi.config.set('GPIO Pin 4 Mode', 'InputNoAction')
        .catch((error) => { console.error("41" + error); });
    }
  }


  // PERIPHERALS
  xapi.config.set('Peripherals Profile Cameras', 'Minimum1')
    .catch((error) => { console.error("44" + error); });
  xapi.config.set('Peripherals Profile TouchPanels', 'Minimum1')
    .catch((error) => { console.error("45" + error); });

  // SERIAL PORT
  xapi.config.set('SerialPort LoginRequired', 'Off')
    .catch((error) => { console.error("46" + error); });
  xapi.config.set('SerialPort Mode', 'On')
    .catch((error) => { console.error("47" + error); });


  // VIDEO
  xapi.config.set('Video DefaultMainSource', '1')
    .catch((error) => { console.error("50" + error); });
  //xapi.config.set('Video Monitors', JoinSplit_secondary_settings.VideoMonitors)
  //  .catch((error) => { console.error("51"+error); });
  xapi.command('Video Input SetMainVideoSource', { ConnectorID: 1 })
    .catch((error) => { console.error("52" + error); });


  // VIDEO INPUT SECTION
  // HDMI INPUT 1
  xapi.config.set('Video Input Connector 1 CameraControl CameraId', '1')
    .catch((error) => { console.error("54" + error); });
  xapi.config.set('Video Input Connector 1 CameraControl Mode', 'On')
    .catch((error) => { console.error("55" + error); });
  xapi.config.set('Video Input Connector 1 InputSourceType', 'camera')
    .catch((error) => { console.error("56" + error); });
  xapi.config.set('Video Input Connector 1 Name', 'Quad Camera')
    .catch((error) => { console.error("57" + error); });
  xapi.config.set('Video Input Connector 1 PreferredResolution', '1920_1080_60')
    .catch((error) => { console.error("58" + error); });
  xapi.config.set('Video Input Connector 1 PresentationSelection', 'Manual')
    .catch((error) => { console.error("59" + error); });
  xapi.config.set('Video Input Connector 1 Quality', 'Motion')
    .catch((error) => { console.error("60" + error); });
  xapi.config.set('Video Input Connector 1 Visibility', 'Never')
    .catch((error) => { console.error("61" + error); });


  // Usually HDMI INPUTS 3 AND 4
  // THESE ARE SCREENS 1 AND 2 FROM THE PRIMARY ROOM
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' HDCP Mode', 'Off')
    .catch((error) => { console.error("62" + error); });
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' CameraControl Mode', 'Off')
    .catch((error) => { console.error("63" + error); });
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' InputSourceType', 'Other')
    .catch((error) => { console.error("64" + error); });
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' Name', 'Main Video Primary')
    .catch((error) => { console.error("65" + error); });
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' PreferredResolution', '3840_2160_30')
    .catch((error) => { console.error("66" + error); });
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' PresentationSelection', 'Manual')
    .catch((error) => { console.error("67" + error); });
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' Quality', 'Sharpness')
    .catch((error) => { console.error("68" + error); });
  xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID + ' Visibility', 'Never')
    .catch((error) => { console.error("69" + error); });

  if (JoinSplit_secondary_settings.VideoMonitors == 'Dual' || JoinSplit_secondary_settings.VideoMonitors == 'DualPresentationOnly') {
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' HDCP Mode', 'Off')
      .catch((error) => { console.error("70" + error); });
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' CameraControl Mode', 'Off')
      .catch((error) => { console.error("71" + error); });
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' InputSourceType', 'PC')
      .catch((error) => { console.error("72" + error); });
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' Name', 'Content Primary')
      .catch((error) => { console.error("73" + error); });
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' PreferredResolution', '3840_2160_30')
      .catch((error) => { console.error("74" + error); });
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' PresentationSelection', 'Manual')
      .catch((error) => { console.error("75" + error); });
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' Quality', 'Sharpness')
      .catch((error) => { console.error("76" + error); });
    xapi.config.set('Video Input Connector ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID + ' Visibility', 'Never')
      .catch((error) => { console.error("77" + error); });
  }

  // HDMI INPUT 2 (PRESENTER CAMERA) and 5 SHOULD BE CONFIGURED FROM THE WEB INTERFACE
  // SDI INPUT 6 SHOULD ALSO BE CONFIGURED FROM THE WEB INTERFACE
  // SDI INPUT 6 CAN BE USED FOR AN ADDITIONAL PTZ CAMERA (BUT NOT THE PRESENTER CAMERA)

  // VIDEO OUTPUT SECTION
  // THESE SHOULD NOT BE CONFIGURED BY THE INSTALLER
  JoinSplit_secondary_settings.VideoMonitors = await xapi.Config.Video.Monitors.get()

  switch (JoinSplit_secondary_settings.VideoMonitors) {
    case 'Dual':
      xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
      xapi.Config.Video.Output.Connector[2].MonitorRole.set('Second');
      break;
    case 'DualPresentationOnly':
      xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
      xapi.Config.Video.Output.Connector[2].MonitorRole.set('PresentationOnly');
      break;
    case 'Single':
      xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
      xapi.Config.Video.Output.Connector[2].MonitorRole.set('First');
      break;
  }

  xapi.config.set('Video Output Connector 3 MonitorRole', 'Third')
    .catch((error) => { console.error("82" + error); });
  xapi.config.set('Video Output Connector 3 Resolution', 'Auto')
    .catch((error) => { console.error("83" + error); });

  xapi.command('Video Matrix Reset')
    .catch((error) => { console.error("84" + error); });
}

/////////////////////////////////////////////////////////////////////////////////////////
// START/STOP AUTOMATION FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

async function startAutomation() {
  console.log('startAutomation');

  //setting overall manual mode to false
  manual_mode = false;
  allowCameraSwitching = true;

  if (inSideBySide) {
    var currentSTCameraID = CONF.QUAD_CAM_ID;
    let sourceDict = { SourceID: '0' }
    sourceDict["SourceID"] = currentSTCameraID.toString();
    xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
    inSideBySide = false;
    console.log("cleared out side by side mode....")
  }

  try {
    const webViewType = await xapi.Status.UserInterface.WebView.Type.get()
    if (webViewType == 'WebRTCMeeting') webrtc_mode = true;
  } catch (e) {
    console.log('Unable to read WebView Type.. assuming not in webrtc mode')
  }

  if (isOSEleven) {
    xapi.Config.Cameras.SpeakerTrack.DefaultBehavior.set(CONF.ST_DEFAULT_BEHAVIOR);
    if (CONF.ST_DEFAULT_BEHAVIOR == 'Frames') xapi.Command.Cameras.SpeakerTrack.Frames.Activate();
    else {
      xapi.Command.Cameras.SpeakerTrack.Frames.Deactivate();
      if (CONF.ST_DEFAULT_BEHAVIOR == 'Closeup') xapi.Config.Cameras.SpeakerTrack.Closeup.set('On');
    }
  }

  // Always turn on SpeakerTrack when the Automation is started. It is also turned on when a call connects so that
  // if it is manually turned off while outside of a call it goes back to the correct state
  macroTurnedOnST = true;
  if (webrtc_mode) {
    setTimeout(() => { xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError) }, 2000) // in RoomOS11 Beta, if we do not delay turning on ST, something turns it back off
  } else xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError);

  // only initialize vumeters if side by side timer (overview timer) is not zero
  // because, if zero, that means we will always be showing side by side (overview) mode
  // and never need to switch to a specific camera
  if (CONF.SIDE_BY_SIDE_TIME > 0) {
    //registering vuMeter event handler for analog mics
    if (CONF.config.monitorMics.length > 0) {
      micHandler();
      micHandler = () => void 0;
      micHandler = xapi.event.on('Audio Input Connectors Microphone', (event) => {
        if (typeof micArrays[event.id[0]] != 'undefined' && (!CONF.CHK_VUMETER_LOUDSPEAKER || event.LoudspeakerActivity < 1)) {
          micArrays[event.id[0]].shift();
          micArrays[event.id[0]].push(event.VuMeter);

          // checking on manual_mode might be unnecessary because in manual mode,
          // audio events should not be triggered
          if (manual_mode == false) {
            // invoke main logic to check mic levels ans switch to correct camera input
            checkMicLevelsToSwitchCamera();
          }
        }
      });
    }


    //registering vuMeter event handler for Ethernet mics
    if (CONF.config.ethernetMics.length > 0) {
      micHandlerEthernet();
      micHandlerEthernet = () => void 0;
      micHandlerEthernet = xapi.event.on('Audio Input Connectors Ethernet', (event) => {
        //console.log(event)
        event.SubId.forEach(submic => {
          if (typeof micArrays[event.id + submic.id] != 'undefined') {
            micArrays[event.id + submic.id].shift();
            micArrays[event.id + submic.id].push(submic.VuMeter);
            if (manual_mode == false) {
              // invoke main logic to check mic levels ans switch to correct camera input
              checkMicLevelsToSwitchCamera();
            }
          }
        })

      });
    }


    //registering vuMeter event handler for USB mics
    if (CONF.config.usbMics.length > 0) {
      micHandlerUSB();
      micHandlerUSB = () => void 0;
      micHandlerUSB = xapi.event.on('Audio Input Connectors USBMicrophone', (event) => {
        //console.log(event)
        if (typeof micArrays['10' + event.id] != 'undefined') {
          micArrays['10' + event.id].shift();
          micArrays['10' + event.id].push(event.VuMeter);

          // checking on manual_mode might be unnecessary because in manual mode,
          // audio events should not be triggered
          if (manual_mode == false) {
            // invoke main logic to check mic levels ans switch to correct camera input
            checkMicLevelsToSwitchCamera();
          }
        }
      });
    }


    // start VuMeter monitoring
    console.log("Turning on VuMeter monitoring...")
    for (var i in CONF.config.monitorMics) {
      xapi.command('Audio VuMeter Start', {
        ConnectorId: CONF.config.monitorMics[i],
        ConnectorType: 'Microphone',
        IntervalMs: 500,
        Source: 'AfterAEC'
      });
    }


    let ethernetMicsStarted = [];
    for (var i in CONF.config.ethernetMics) {
      if (!ethernetMicsStarted.includes(parseInt(CONF.config.ethernetMics[i] / 10))) {
        ethernetMicsStarted.push(parseInt(CONF.config.ethernetMics[i] / 10));
        xapi.Command.Audio.VuMeter.Start(
          {
            ConnectorId: parseInt(CONF.config.ethernetMics[i] / 10),
            ConnectorType: 'Ethernet',
            IncludePairingQuality: 'Off',
            IntervalMs: 500,
            Source: 'AfterAEC'
          });
      }
    }


    for (var i in CONF.config.usbMics) {
      xapi.Command.Audio.VuMeter.Start(
        {
          ConnectorId: CONF.config.usbMics[i] - 100,
          ConnectorType: 'USBMicrophone',
          IncludePairingQuality: 'Off',
          IntervalMs: 500,
          Source: 'AfterAEC'
        });
    }
  }
}

function stopAutomation() {
  //setting overall manual mode to true
  manual_mode = true;
  stopSideBySideTimer();
  stopNewSpeakerTimer();
  stopInitialCallTimer();
  console.log("Stopping all VuMeters...");
  xapi.Command.Audio.VuMeter.StopAll({});

  if (inSideBySide) {
    var currentSTCameraID = CONF.QUAD_CAM_ID;
    let sourceDict = { SourceID: '0' }
    sourceDict["SourceID"] = currentSTCameraID.toString();
    xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
    inSideBySide = false;
    console.log("cleared out side by side mode....")
  }

  // set tie line back to primary to local QuadCam just as when initially configured
  // if secondary in combined mode since we now matrix in current main video source
  // when automation is turned on
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY && roomCombined)
    xapi.command('Video Matrix Assign', { Output: CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: 1 }).catch((error) => { console.error(error); });

  /*
  console.log("Switching to MainVideoSource connectorID 1 ...");
  //pauseSpeakerTrack(); // in case it is turned on so we can switch video sources
  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
  xapi.Command.Video.Input.SetMainVideoSource({ SourceId: 1});
  lastSourceDict={ SourceId: 1};
  if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  //resumeSpeakerTrack(); // in case speaker track is active so we turn off BG mode.
  */
  // using proper way to de-register handlers
  micHandler();
  micHandler = () => void 0;
  micHandlerEthernet();
  micHandlerEthernet = () => void 0;
  micHandlerUSB();
  micHandlerUSB = () => void 0;
}



/////////////////////////////////////////////////////////////////////////////////////////
// MICROPHONE DETECTION AND CAMERA SWITCHING LOGIC FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function checkMicLevelsToSwitchCamera() {
  // make sure we've gotten enough samples from each mic in order to do averages
  if (allowCameraSwitching) {
    // figure out which of the inputs has the highest average level then perform logic for that input *ONLY* if allowCameraSwitching is true
    let array_key = largestMicValue();
    let array = [];
    array = micArrays[array_key];
    // get the average level for the currently active input
    let average = averageArray(array);
    //get the input number as an int since it is passed as a string (since it is a key to a dict)
    let input = parseInt(array_key);
    // someone is speaking
    if (average > CONF.MICROPHONEHIGH) {
      // start timer to prevent Side-by-Side mode too quickly
      restartSideBySideTimer();
      if (input > 0) {
        lowWasRecalled = false;
        // no one was talking before
        if (lastActiveHighInput === 0) {
          makeCameraSwitch(input, average);
        }
        // the same person is talking
        else if (lastActiveHighInput === input) {
          restartNewSpeakerTimer();
        }
        // a different person is talking
        else if (lastActiveHighInput !== input) {
          if (allowNewSpeaker) {
            makeCameraSwitch(input, average);
          }
        }
      }
    }
    // no one is speaking
    else if (average < CONF.MICROPHONELOW) {
      // only trigger if enough time has elapsed since someone spoke last
      if (allowSideBySide) {
        if (input > 0 && !lowWasRecalled) {
          lastActiveHighInput = 0;
          lowWasRecalled = true;
          console.log("-------------------------------------------------");
          console.log("Low Triggered");
          console.log("-------------------------------------------------");
          recallSideBySideMode();
        }
      }
    }

  }
}


function processExternalMicHandler(activeMic) {
  // activeMic should contain a string with a external mic ID (00-99) passed along by the 
  // controller via MIC_ACTIVE_XX for us to trigger the switching functionality
  // we need to prepend the '9' character to it before parsing it into the integer for 
  // input so we can indicate it is an external mic specified in the CONF.config.externaMics array 
  let input = parseInt('9' + activeMic)
  let average = 0;
  if (allowCameraSwitching && !manual_mode) {
    // simulate valide average to trigger switch since controller already made decision
    if (input > 900) {
      average = CONF.MICROPHONEHIGH + 1;
    }
    else {
      average = CONF.MICROPHONELOW - 1;
      input = 1; // need to simulate that there were valid mic readings
    }

    // someone is speaking
    if (average > CONF.MICROPHONEHIGH) {
      // start timer to prevent Side-by-Side mode too quickly
      restartSideBySideTimer();
      if (input > 900) {
        lowWasRecalled = false;
        // no one was talking before
        if (lastActiveHighInput === 0) {
          makeCameraSwitch(input, average);
        }
        // the same person is talking
        else if (lastActiveHighInput === input) {
          restartNewSpeakerTimer();
        }
        // a different person is talking
        else if (lastActiveHighInput !== input) {
          if (allowNewSpeaker) {
            makeCameraSwitch(input, average);
          }
        }
      }
    }
    // no one is speaking
    else if (average < CONF.MICROPHONELOW) {
      // only trigger if enough time has elapsed since someone spoke last
      if (allowSideBySide) {
        if (input > 0 && !lowWasRecalled) {
          lastActiveHighInput = 0;
          lowWasRecalled = true;
          console.log("-------------------------------------------------");
          console.log("External Mic Low Triggered");
          console.log("-------------------------------------------------");
          recallSideBySideMode();
        }
      }
    }

  }
}


// function to actually switch the camera input
async function makeCameraSwitch(input, average) {
  console.log("-------------------------------------------------");
  console.log("High Triggered: ");
  console.log(`Input = ${input} | Average = ${average}`);
  console.log(`roomCombined = ${roomCombined}`);
  console.log("-------------------------------------------------");

  // map the loudest mic to the corresponding composition which could be local or from a 
  // secondary codec.
  var currentSTCameraID = CONF.QUAD_CAM_ID;
  let sourceDict = { SourceID: '0' } // Just initialize
  let initial_sourceDict = { SourceID: '0' } // to be able to compare later
  CONF.config.compositions.forEach(compose => {
    if (compose.mics.includes(input)) {
      if ((!roomCombined && CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) && compose.source == CONF.JS_SECONDARY) {
        console.warn(`makeCameraSwitch(): Trying to switch to composition that involves a secondary codec input when not in combined mode!!`)
        restartNewSpeakerTimer();
        return;
      }
      if ((roomCombined && CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) && compose.source == CONF.JS_SECONDARY) {
        if (compose.codecIP in secondariesStatus)
          if (!secondariesStatus[compose.codecIP].selected) {
            console.warn(`makeCameraSwitch(): Trying to switch to composition that involves a secondary codec input which is not selected!!`)
            restartNewSpeakerTimer();
            return;
          }
      }
      console.log(`Setting to composition = ${compose.name}`);
      if (compose.preset != 0) {
        console.log(`Setting Video Input to preset [${compose.preset}] `);
        sourceDict = { PresetId: compose.preset };
        //xapi.Command.Camera.Preset.Activate(sourceDict);
      }
      else {
        console.log(`Setting Video Input to connectors [${compose.connectors}] and Layout: ${compose.layout}`);
        sourceDict = { ConnectorId: compose.connectors, Layout: compose.layout }
      }
    }
  })



  if (presenterTracking && presenterDetected) {
    // if we have selected Presenter Q&A mode and the codec is currently in presenterTrack mode, invoke
    // that specific camera switching logic contained in presenterQASwitch()
    if (PRESENTER_QA_MODE && !webrtc_mode) presenterQASwitch(input, sourceDict);
    // if the codec is in presentertracking but not in PRESENTER_QA_MODE , simply ignore the request to switch
    // cameras since we need to keep sending the presenterTrack camera. 
    inSideBySide = false; // if presenterTracking, this should never be on, but clearing just in case
  }
  else if (JSON.stringify(lastSourceDict) != JSON.stringify(sourceDict)) {
    if (JSON.stringify(sourceDict) == JSON.stringify(initial_sourceDict)) {
      console.warn(`makeCameraSwitch(): Active mic did not match any composition and not in PresentarTrack mode... `)
      restartNewSpeakerTimer();
      return;
    }

    if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();

    inSideBySide = false;

    // the Video Input SetMainVideoSource does not work while Speakertrack is active
    // so we need to turn it off in case the previous video input was from a source where
    // SpeakerTrack is used.
    pauseSpeakerTrack();

    // Switch to the source that is speficied in the same index position in MAP_CAMERA_SOURCE_IDS
    //console.log("Switching to input with SetMainVideoSource with dict: ", sourceDict  )
    //xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);

    // Apply the composition for active mic
    //console.log(`Switching to ${sourceDict} `)
    console.log(`Switching to ${JSON.stringify(sourceDict)}`)
    if ('PresetId' in sourceDict) xapi.Command.Camera.Preset.Activate(sourceDict)
    else xapi.Command.Video.Input.SetMainVideoSource(sourceDict);

    lastSourceDict = sourceDict;

    if (('ConnectorId' in sourceDict) && sourceDict['ConnectorId'].includes(currentSTCameraID)) {
      resumeSpeakerTrack();
    }


    // send required messages to auxiliary codec that also turns on speakertrack over there
    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY && roomCombined) await sendIntercodecMessage('automatic_mode');
    await sendIntercodecMessageAux('automatic_mode');

    lastActiveHighInput = input;
    restartNewSpeakerTimer();
    if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

  }
}

// function to actually switch the camera input when in presentertrack Q&A mode
async function presenterQASwitch(input, sourceDict) {

  if (!(CONF.PRESENTER_QA_AUDIENCE_MIC_IDS.includes(input))) {
    // Once the presenter starts talkin, we need to initiate composition timer
    // to remove composition only after the configured time has passed.
    restartCompositionTimer();
  }
  else if (lastActiveHighInput != input) {
    // here we need to compose presenter with other camera where someone is speaking
    if ('ConnectorId' in sourceDict && sourceDict['ConnectorId'].length == 1) {
      let presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
      let connectorDict = { ConnectorId: [presenterSource, sourceDict['ConnectorId'][0]] };
      console.log("Trying to use this for connector dict in presenterQASwitch(): ", connectorDict)

      setComposedQAVideoSource(connectorDict);

      // Restart the timer that tells how long to keep the composition for when the same
      // person is asking questions or the presenter is talking
      //restartCompositionTimer();

      // Actually, when audience members speak, we must stop the composition
      // timer since only silence or speaker speaking should start it!
      stopCompositionTimer();
    } else {
      console.log(`Trying to use ${sourceDict} in presenterQASwitch() but is preset or multiple connectors, should be just 1 ConnectorId`);
      return;
    }

  }

  // send required messages to secondary codec that also turns on speakertrack over there
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY && roomCombined) await sendIntercodecMessage('automatic_mode');
  await sendIntercodecMessageAux('automatic_mode');


  lastActiveHighInput = input;
  restartNewSpeakerTimer();
}

function setComposedQAVideoSource(connectorDict) {

  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();

  // always put speakertrack on background mode when switching around inputs 
  pauseSpeakerTrack();

  console.log("In setComposedQAVideoSource() switching to input with SetMainVideoSource with dict: ", connectorDict)
  xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
  lastSourceDict = connectorDict;

  const payload = { EditMatrixOutput: { sources: connectorDict["ConnectorId"] } };

  setTimeout(function () {
    //Let USB Macro know we are composing
    localCallout.command(payload).post()
  }, 250) //250ms delay to allow the main source to resolve first

  // only disable background mode if the audience camera is a QuadCam
  if (connectorDict.ConnectorId[1] == CONF.QUAD_CAM_ID) resumeSpeakerTrack();

  //if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Unmute();
  if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

}

function largestMicValue() {
  // figure out which of the inputs has the highest average level and return the corresponding key
  let currentMaxValue = 0;
  let currentMaxKey = '';
  let theAverage = 0;

  for (var i in CONF.config.monitorMics) {
    theAverage = averageArray(micArrays[CONF.config.monitorMics[i].toString()]);
    if (theAverage >= currentMaxValue) {
      currentMaxKey = CONF.config.monitorMics[i].toString();
      currentMaxValue = theAverage;
    }
  }

  for (var i in CONF.config.ethernetMics) {
    theAverage = averageArray(micArrays[CONF.config.ethernetMics[i].toString()]);
    if (theAverage >= currentMaxValue) {
      currentMaxKey = CONF.config.ethernetMics[i].toString();
      currentMaxValue = theAverage;
    }
  }

  for (var i in CONF.config.usbMics) {
    theAverage = averageArray(micArrays[CONF.config.usbMics[i].toString()]);
    if (theAverage >= currentMaxValue) {
      currentMaxKey = CONF.config.usbMics[i].toString();
      currentMaxValue = theAverage;
    }
  }

  return currentMaxKey;
}

function averageArray(arrayIn) {
  let sum = 0;
  for (var i = 0; i < arrayIn.length; i++) {
    sum = sum + parseInt(arrayIn[i], 10);
  }
  let avg = (sum / arrayIn.length);
  return avg;
}


async function recallSideBySideMode() {
  if (!manual_mode /*&& roomCombined*/) { //TODO: Make sure that allowing overview when in standalone works ok. 
    inSideBySide = true;
    if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
    // only invoke SideBySideMode if not in presenter QA mode and not presentertrack is currently not active
    // because Presenter QA mode has it's own way of composing side by side. 
    if ((presenterTracking && presenterDetected) && CONF.SIDE_BY_SIDE_TIME > 0) {
      // If in PRESENTER_QA_MODE mode and we go to silence, we need to restart the composition timer
      // to remove composition (if it was there) only after the configured time has passed.
      if (PRESENTER_QA_MODE && !webrtc_mode) restartCompositionTimer();
      // even if not in PRESENTER_QA_MODE , if presenterTrack is turned on, we do not want to show anyd side by side mode!
    }
    else {

      if (overviewShowDouble) {
        if (!webrtc_mode) { //only compose if not in webrtc mode (not supported). Otherwise, just use preset 30 if applicable
          let sourceDict = { ConnectorId: [0, 0] }; // just initializing
          //connectorDict["ConnectorId"]=OVERVIEW_DOUBLE_SOURCE_IDS;
          //console.log("Trying to use this for connector dict in recallSideBySideMode(): ", sourceDict  )
          //xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);

          CONF.config.compositions.forEach(async compose => {
            if (compose.mics.includes(0)) {
              console.log(`SideBySide setting to composition = ${compose.name}`);
              if (compose.preset != 0 && typeof compose.preset == 'number') {
                console.log(`SideBySide setting Video Input to single preset [${compose.preset}] `);
                sourceDict = { PresetId: compose.preset };
                await xapi.Command.Camera.Preset.Activate(sourceDict);
                let presetCamId = await getPresetCamera(compose.preset);
                let presetCamConnector = await xapi.Status.Cameras.Camera[presetCamId].DetectedConnector.get();
                await xapi.Command.Video.Input.SetMainVideoSource({ ConnectorId: [presetCamConnector], Layout: 'Prominent' });
              }
              else {
                let selected_connectors = []

                if (compose.preset != 0 && typeof compose.preset != 'number') { // if not single preset, it is a list of presets we need to evaluate
                  console.log(`SideBySide setting Video Input to multiple preset as seen in [${compose.preset}] `);
                  // when multiple presets, activate them and then proceed to create the sourceDict and apply as if no
                  // presets
                  compose.preset.forEach(async thePresetID => {
                    sourceDict = { PresetId: thePresetID };
                    await xapi.Command.Camera.Preset.Activate(sourceDict);
                  })
                }

                // first need to remove connectors from un-selected secondaries
                // logic below copies over any local connectos (not associated in codec_map) 
                // including those for cameras associated in presets and
                // also those associated but where secondary codec is selected. 
                compose.connectors.forEach(theConnector => {
                  // only use for overview connectors that are not associated to secondary codecs or if secondary codec is selected
                  if ((!(theConnector in connector_to_codec_map)) || (secondariesStatus[connector_to_codec_map[theConnector]].selected && roomCombined)) {
                    selected_connectors.push(theConnector)
                  }
                })
                console.log(`Setting Video Input to connectors [${selected_connectors}] and Layout: ${compose.layout}`);
                sourceDict = { ConnectorId: selected_connectors, Layout: compose.layout }
                await xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
              }
            }
          })



          lastSourceDict = sourceDict;

          if ('ConnectorId' in sourceDict) { // only notify about composition and handle ST if composition configured for silence is not actually another preset!
            const payload = { EditMatrixOutput: { sources: sourceDict['ConnectorId'] } };
            // let USB Mode Macro know we are composing
            setTimeout(function () {
              localCallout.command(payload).post()
            }, 250) //250ms delay to allow the main source to resolve first
            pauseSpeakerTrack();
            if (CONF.QUAD_CAM_ID > 0) xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);

          }

        }
      }
      else { //TODO: This is no longer being executed since we are forcing overviewShowDouble to true always
        let sourceDict = { SourceID: '0' };
        sourceDict["SourceID"] = CONF.OVERVIEW_SINGLE_SOURCE_ID.toString();
        console.log("Trying to use this for source dict in recallSideBySideMode(): ", sourceDict)
        xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
        lastSourceDict = sourceDict;
        pauseSpeakerTrack();
        if (CONF.QUAD_CAM_ID > 0) xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
      }


      // send side_by_side message to secondary codecs if in combined mode
      if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY && roomCombined) {
        await sendIntercodecMessage('side_by_side');
      }

      await sendIntercodecMessageAux('side_by_side');


      lastActiveHighInput = 0;
      lowWasRecalled = true;
    }
    if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  }
}

async function recallFullPresenter() {
  console.log("Recalling full presenter in PresenterTrack mode....")
  // the Video Input SetMainVideoSource does not work while Speakertrack is active
  // so we need to pause it in case the we were doing full composition to be able to switch
  // to just the presenter camera
  pauseSpeakerTrack();
  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();

  let presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
  console.log("Obtained presenter source as: ", presenterSource)
  let connectorDict = { ConnectorId: presenterSource };
  xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
  lastSourceDict = connectorDict;
  if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  //resumeSpeakerTrack(); // we do not want to leave background mode on
}

async function recallQuadCam() {
  console.log("Recalling QuadCam after manually exiting PresenterTrack mode....")
  pauseSpeakerTrack();
  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
  //let currentSTCameraID = CONF.QUAD_CAM_ID; 
  let currentSTCameraID = await xapi.Status.Cameras.SpeakerTrack.ActiveConnector.get();
  console.log('In recallQuadCam Obtained currentSTCameraID as: ', currentSTCameraID)
  let connectorDict = { SourceId: currentSTCameraID }; xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
  lastSourceDict = connectorDict;
  if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  resumeSpeakerTrack(); // we do not want to leave background mode on


}

/////////////////////////////////////////////////////////////////////////////////////////
// TOUCH 10 UI SETUP
/////////////////////////////////////////////////////////////////////////////////////////


function addCustomAutoQAPanel() {

  let presenterTrackButtons = `
  <Name>PresenterTrack</Name>
  <Widget>
    <WidgetId>widget_pt_settings</WidgetId>
    <Type>GroupButton</Type>
    <Options>size=4</Options>
    <ValueSpace>
      <Value>
        <Key>1</Key>
        <Name>Off</Name>
      </Value>
      <Value>
        <Key>2</Key>
        <Name>On w/o QA</Name>
      </Value>
      <Value>
        <Key>3</Key>
        <Name>On with QA</Name>
      </Value>
    </ValueSpace>
  </Widget>
  `;
  let presenterTrackButtonsDisabled = `
  <Name>PresenterTrack</Name>
  <Widget>
    <WidgetId>widget_pt_disabled</WidgetId>
    <Name>Not configured</Name>
    <Type>Text</Type>
    <Options>size=3;fontSize=normal;align=center</Options>
  </Widget>`;

  // Here we do the conditional assignment of the row
  let presenterTrackRowValue = (presenterTrackConfigured) ? presenterTrackButtons : presenterTrackButtonsDisabled;

  // add custom control panel for turning on/off automatic mode
  if (CONF.ALLOW_PRESENTER_QA_MODE) {
    xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'panel_auto_qa' },
      `<Extensions>
      <Version>1.9</Version>
      <Panel>
        <Origin>local</Origin>
        <Location>HomeScreenAndCallControls</Location>
        <Icon>Camera</Icon>
        <Color>#07C1E4</Color>
        <Name>Auto QA</Name>
        <ActivityType>Custom</ActivityType>
        <Page>
          <Name>Automatic QA</Name>
          <Row>
          ${presenterTrackRowValue}
          </Row>
          <PageId>panel_auto_qa</PageId>
          <Options/>
        </Page>
      </Panel>
    </Extensions>
      `);
  } else xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'panel_auto_qa' });

  if (presenterTrackConfigured && CONF.ALLOW_PRESENTER_QA_MODE) {
    xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_pt_settings', Value: '1' }).catch(handleMissingWigetError);
  }

}

/////////////////////////////////////////////////////////////////////////////////////////
// ERROR HANDLING
/////////////////////////////////////////////////////////////////////////////////////////

function handleError(error) {
  console.log(error);
}

function handleMissingWigetError(error) {
  console.log('Trying to set widget that is not being shown...');
}


async function updateUSBModeConfig() {
  var object = { AlterUSBConfig: { config: 'matrix_Camera_Mode', value: true } }
  await localCallout.command(object).post()
}

/////////////////////////////////////////////////////////////////////////////////////////
// INTER-MACRO MESSAGE HANDLING
/////////////////////////////////////////////////////////////////////////////////////////
GMM.Event.Receiver.on(async event => {
  const usb_mode_reg = /USB_Mode_Version_[0-9]*.*/gm
  if ('RawMessage' in event) {
    // here we are receiving a RawMessage as marked by GMM, so it could be from an external controller
    //first check to ese if it is a custom MIC_ACTIVE Event
    let theEventValue = event.RawMessage;
    let activeMic = '';
    if (theEventValue.slice(0, 11) == 'MIC_ACTIVE_') {
      console.warn("Received unformatted MIC_ACTIVE_XX message: ", event.RawMessage)
      activeMic = theEventValue.substring(11);
      processExternalMicHandler(activeMic);
    } else console.warn(`Did not process received raw message: ${event.RawMessage}`)

  }
  else
    if (event.Source.Id == 'localhost') {
      if (usb_mode_reg.test(event.App)) {// we are evaluating a local event, first check to see if from the USB Mode macro
        if (event.Type == 'Error') {
          console.error(event)
        } else {
          switch (event.Value) {
            case 'Initialized':
              console.warn(`USB mode initialized...`)
              updateUSBModeConfig();
              break;
            case 'EnteringWebexMode': case 'Entering_Default_Mode': case 'EnteringDefaultMode':
              console.warn(`You are entering Webex Mode`)
              //Run code here when Default Mode starts to configure
              break;
            case 'WebexModeStarted': case 'DefaultModeStarted':
              console.warn(`System is in Default Mode`)
              stopAutomation();
              usb_mode = false;
              // always tell the other codec when your are in or out of a call
              await sendIntercodecMessage('CALL_DISCONNECTED');
              if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
                // only need to keep track of codecs being in call with these
                // booleans in primary codec which is the one that initiates join/split
                primaryInCall = false;
                evalCustomPanels();
                handleExternalController('PRIMARY_CALLDISCONNECT');
              } else {
                handleExternalController('SECONDARY_CALLDISCONNECT');

              }
              break;
            case 'enteringUSBMode':
              console.warn(`You are entering USB Mode`)
              //Run code here when USB Mode starts to configure
              break;
            case 'USBModeStarted':
              console.warn(`System is in Default Mode`)
              startAutomation();
              if (CONF.SIDE_BY_SIDE_TIME == 0) recallSideBySideMode();
              usb_mode = true;
              // always tell the other codec when your are in or out of a call
              await sendIntercodecMessage('CALL_CONNECTED');
              if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
                // only need to keep track of codecs being in call with these
                // booleans in primary codec which is the one that initiates join/split
                primaryInCall = true;
                evalCustomPanels();
                handleExternalController('PRIMARY_CALLCONNECT');
              } else {
                handleExternalController('SECONDARY_CALLCONNECT');
              }
              break;
            default:
              break;
          }
        }
      }
      else {
        console.debug({
          Message: `Received Message from ${event.App} and was not processed`
        })
      }
    }
    else { // This section is for handling messages sent from primary to secondary codec and vice versa
      // and for messages from Aux to either Primary or Secondary in same room
      let theSourceIdentifier = (CONF.BOT_TOKEN == '') ? event.Source?.IPv4 : event.Source?.DeviceId;
      switch (event.App) { //Based on the App (Macro Name), I'll run some code
        case 'aux_codec':
          console.warn("Received from aux codec: ", event.Value)
          if (event.Type == 'Error') {
            console.error(event)
          } else {
            switch (event.Value) {
              case 'VTC-1_OK':
                handleCodecOnlineAux(theSourceIdentifier);
                break;
              case 'VTC-1_status':
                handleMacroStatusResponseAux();
                break;
              case "aux_has_people":
                handleCodecPeopleReportAux(theSourceIdentifier)
                break;
              case "aux_no_people":
                handleCodecPeopleReportAux(theSourceIdentifier)
                break;
              default:
                break;
            }
          }
        case 'divisible_room':
          console.warn("Received from other codec: ", event.Value)
          if (event.Type == 'Error') {
            console.error(event)
          } else {
            switch (event.Value) {
              case 'VTC-1_OK':
                handleCodecOnline(theSourceIdentifier);
                break;
              case 'VTC-1_status':
                handleMacroStatusResponse();
                break;
              case 'VTC_KA_OK':
                priHandleKeepAliveResponse(theSourceIdentifier);
                break;
              case 'VTC_KA_req':
                secSendKeepAliveResponse();
                break;

              case 'side_by_side':
                if (roomCombined && (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY)) {
                  console.log('Handling side by side on secondary');
                  deactivateSpeakerTrack();
                  if (CONF.QUAD_CAM_ID > 0) xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
                }
                break;
              case 'automatic_mode':
                if (roomCombined && (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY)) {
                  // handle request to keep speakertrack on from primary to secondary
                  console.log('Turning back on SpeakerTrack on secondary');
                  activateSpeakerTrack();
                }
                break;
              case 'CALL_CONNECTED':
                if (roomCombined && (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY)) {
                  // if we are the secondary codec, this event came from primary

                  if (CONF.SECONDARY_MULTI_CAM) {
                    // If primary is in call, we now need to start automation since we need to be able to switch amongst local cameras and Aux codecs on the secondary 
                    // as well when combined. This will turn out vumeters for the mute LEDs as well
                    startAutomation();
                  }
                  else {
                    // If primary is in a call, we need to turn on vuMeters just to make sure the mute LEDs show
                    // start VuMeter monitoring
                    console.log("Turning on VuMeter monitoring...")
                    for (var i in CONF.config.monitorMics) {
                      xapi.command('Audio VuMeter Start', {
                        ConnectorId: CONF.config.monitorMics[i],
                        ConnectorType: 'Microphone',
                        IntervalMs: 500,
                        Source: 'AfterAEC'
                      });
                    }
                  }

                }
                if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
                  // if we are the primary codec, this event came from secondary
                  // we need to keep track when secondary room is in a call 
                  // in a variable in the primary to not join or combine
                  // while in that state
                  console.log("Secondary in call, setting variable...")
                  //secondaryInCall=true;  
                  if (theSourceIdentifier in secondariesStatus)
                    secondariesStatus[theSourceIdentifier].inCall = true;
                  else
                    console.warn(`Attempted to set inCall value for secondariesStatus object with key ${theSourceIdentifier} which does not exist.`)

                  evalCustomPanels();
                }

                break;
              case 'CALL_DISCONNECTED':
                if (roomCombined && (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY)) {

                  if (CONF.SECONDARY_MULTI_CAM) {
                    // Now that we can switch among cameras and aux inputs on secondaries, 
                    // we need to turn that off when the primary disconnects a call. 
                    stopAutomation();
                  }
                  else {
                    // Turn vuMeters back off
                    console.log("Stopping all VuMeters...");
                    xapi.Command.Audio.VuMeter.StopAll({});
                  }

                }
                if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
                  // if we are the primary codec, this event came from secondary
                  // we need to keep track when secondary room is no longer in a call 
                  // in a variable in the primary to allow join or combine
                  // while in that state
                  console.log("Secondary not in call, setting variable...")
                  //secondaryInCall=false;
                  if (theSourceIdentifier in secondariesStatus)
                    secondariesStatus[theSourceIdentifier].inCall = false;
                  else
                    console.warn(`Attempted to set inCall value for secondariesStatus object with key ${theSourceIdentifier} which does not exist.`)

                  evalCustomPanels();
                }
                break;
              case 'PRESENTATION_PREVIEW_STARTED':
                if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
                  // if we are the primary codec, this event came from secondary
                  // we need to keep track when secondary room is in presentation preview 
                  // in a variable in the primary to not join or combine
                  // while in that state
                  console.log("Secondary in presentation preview, setting variable...")
                  if (theSourceIdentifier in secondariesStatus)
                    secondariesStatus[theSourceIdentifier].inPreview = true;
                  else
                    console.warn(`Attempted to set inPreview value for secondariesStatus object with key ${theSourceIdentifier} which does not exist.`)
                  evalCustomPanels();
                }
                break;
              case 'PRESENTATION_PREVIEW_STOPPED':
                if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
                  // if we are the primary codec, this event came from secondary
                  // we need to keep track when secondary room is in presentation preview 
                  // in a variable in the primary to not join or combine
                  // while in that state
                  console.log("Secondary in no longer in preview, setting variable...")
                  if (theSourceIdentifier in secondariesStatus)
                    secondariesStatus[theSourceIdentifier].inPreview = false;
                  else
                    console.warn(`Attempted to set inPreview value for secondariesStatus object with key ${theSourceIdentifier} which does not exist.`)
                  evalCustomPanels();
                }
                break;
              case 'COMBINE':
                if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY && secondarySelected) {
                  setCombinedMode(true); // Stores status to permanent storage
                  displayWarning();
                  console.log('Secondary received command to combine');
                  secondaryCombinedMode();
                }
                break;
              case 'DIVIDE':
                if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY && secondarySelected) {
                  setCombinedMode(false); // Stores status to permanent storage
                  removeWarning();
                  console.log('Secondary received command to divide');
                  secondaryStandaloneMode();
                }
                break;
              case 'SEC_SELECTED':
                secondarySelected = true;
                await GMM.write.global('JoinSplit_secondarySelected', secondarySelected).then(() => {
                  console.log({ Message: 'ChangeState', Action: 'Secondary selected status state stored.' })
                })
                await sendIntercodecMessage('SEC_SELECTED_ACK')
                break;
              case 'SEC_REMOVED':
                secondarySelected = false;
                await GMM.write.global('JoinSplit_secondarySelected', secondarySelected).then(() => {
                  console.log({ Message: 'ChangeState', Action: 'Secondary selected status state stored.' })
                })
                await sendIntercodecMessage('SEC_REMOVED_ACK')
                break;
              case 'SEC_SELECTED_ACK':
                processSecSelectedAck(theSourceIdentifier);
                break;
              case 'SEC_REMOVED_ACK':
                processSecUnselectedAck(theSourceIdentifier);
                break;
              case 'MUTE':
                if (roomCombined) xapi.command('Audio Microphones Mute');
                break;
              case 'UNMUTE':
                if (roomCombined) xapi.command('Audio Microphones Unmute');
                break;
              case 'STANDBY_ON':
                if (roomCombined) xapi.command('Standby Activate');
                break;
              case 'STANDBY_OFF':
                if (roomCombined) xapi.command('Standby Deactivate');
                break;
              case 'STANDBY_HALFWAKE':
                if (roomCombined) xapi.command('Standby Halfwake');
                break;

              default:
                break;
            }
          }
          break;
        case 'Crestron':
          console.warn("Received from app Crestron: ", event.Value)
          if (event.Type == 'Error') {
            console.error(event)
          } else {
            //first check to ese if it is a custom MIC_ACTIVE Event
            let theEventValue = event.Value;
            let activeMic = '';
            if (theEventValue.slice(0, 11) == 'MIC_ACTIVE_') {
              activeMic = theEventValue.substring(11);
              processExternalMicHandler(activeMic);
            }
            else {
              console.debug({
                Message: `Received Message from ${event.App} was not processed`
              })
            }
          }
          break;
        default:
          console.warn(`Received Message ${event.Value} from macro ${event.App} on remote codec but was not processed... rename macro to divisible_room if intended to work with this one.`)
          break;
      }

    }

})


/////////////////////////////////////////////////////////////////////////////////////////
// INTER-CODEC COMMUNICATION
/////////////////////////////////////////////////////////////////////////////////////////

async function sendIntercodecMessage(message) {
  if (CONF.BOT_TOKEN == '') {
    await otherCodecs.status(message).passIP().queue().catch(e => {
      console.log('Error sending message');
    });
  }
  else {
    await otherCodecs.status(message).passDeviceId().queue().catch(e => {
      console.log('Error sending message');
    });
  }
}



async function sendIntercodecMessageAux(message) {
  // only send if there are aux codecs configured
  if (Object.keys(auxCodecs).length != 0) {
    console.log(`sendIntercodecMessage to all aux codecs: message = ${message}`);
    if (CONF.BOT_TOKEN == '') {
      await auxCodecs.status(message).passIP().queue().catch(e => {
        alertFailedIntercodecComm("Error connecting to codec for second camera, please contact the Administrator");
      });
    }
    else {
      await auxCodecs.status(message).passDeviceId().queue().catch(e => {
        alertFailedIntercodecComm("Error connecting to codec for second camera, please contact the Administrator");
      });

    }
  }
}


async function sendSelectionMessage(secIP, message) {
  if (CONF.BOT_TOKEN == '') {
    await otherCodecs.status(message).passIP().queue('secondary', secIP).catch(e => {
      console.log(`Error sending message selection message to secondary with IP ${secIP}`);
    });
  }
  else {
    await otherCodecs.status(message).passDeviceId().queue('secondary', secIP).catch(e => {
      console.log(`Error sending message selection message to secondary with IP ${secIP}`);
    });
  }
}


/////////////////////////////////////////////////////////////////////////////////////////
// OTHER FUNCTIONAL HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////


function handleExternalController(macroEvent) {
  console.log(`Issuing commands for external controller when macro initiates or detects: ${macroEvent}`)
  localCallout.command(macroEvent).post()
}

xapi.Event.PresentationStarted.on(value => {
  console.log(value)
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY)
    handleExternalController('PRIMARY_PRESENTATION_STARTED');
  else
    handleExternalController('SECONDARY_PRESENTATION_STARTED');

});

xapi.Event.PresentationStopped.on(value => {
  console.log(value);
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY)
    handleExternalController('PRIMARY_PRESENTATION_STOPPED');
  else
    handleExternalController('SECONDARY_PRESENTATION_STOPPED');
});

xapi.Event.PresentationPreviewStopped.on(value => {
  console.log(value);
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY)
    handleExternalController('PRIMARY_PREVIEW_STOPPED');
  else
    handleExternalController('SECONDARY_PREVIEW_STOPPED');
});

function handleMicMuteOn() {
  console.log('handleMicMuteOn');
  lastActiveHighInput = 0;
  lowWasRecalled = true;
  recallSideBySideMode();
}

function handleMicMuteOff() {
  console.log('handleMicMuteOff');
  // need to turn back on SpeakerTrack that might have been turned off when going on mute
  //activateSpeakerTrack();
}


// function to check the satus of the macros running on the AUX codec
async function handleMacroStatusAux() {
  console.log('handleMacroStatusAux');

  // reset tracker of responses from aux codecs
  Object.entries(AUX_CODEC_STATUS).forEach(([key, val]) => {
    val.online = false;
  })
  // send a status request to all AUX codecs 
  await sendIntercodecMessageAux('VTC-1_status');
}

function handleCodecOnlineAux(codecIP) {
  if (codecIP in AUX_CODEC_STATUS) {
    if (AUX_CODEC_STATUS[codecIP].enable) {
      console.log(`handleCodecOnlineAux: codec = ${codecIP}`);
      AUX_CODEC_STATUS[codecIP].online = true;
    }
  }
  else {
    console.warn(`No codec with IP ${codecIP} configured when receiving online report.`)
  }
}

function handleCodecPeopleReportAux(codecIP, seespeople) {
  if (codecIP in AUX_CODEC_STATUS) {
    if (AUX_CODEC_STATUS[codecIP].enable) {
      console.log(`handleCodecPeopleReport: codec = ${codecIP} seespeople= ${seespeople}`);
      AUX_CODEC_STATUS[codecIP].haspeople = seespeople
    }
  } else {
    console.warn(`No codec with IP ${codecIP} configured when receiving people report.`)
  }
}


// function to check the satus of the macros running on the secondary codecs
async function handleMacroStatus() {
  console.log('handleMacroStatus');
  // reset tracker of responses from secondary codec
  //secondaryOnline = false;
  Object.entries(secondariesStatus).forEach(([key, val]) => {
    val.online = false;
  })
  // send required messages to secondary codec
  await sendIntercodecMessage('VTC-1_status');
}

function handleCodecOnline(ipAddress) {
  console.log(`handleCodecOnline`);
  //secondaryOnline = true;
  secondariesStatus[ipAddress].online = true;
}

async function handleMacroStatusResponse() {
  console.log('handleMacroStatusResponse');
  await sendIntercodecMessage('VTC-1_OK');
}


async function handleWakeUpAux() {
  console.log('handleWakeUpAux');

  // send wakeup to AUX codec
  await sendIntercodecMessageAux('wake_up');
  // check the satus of the macros running on the AUX codec and store it in AUX_CODEC.online
  // in case we need to check it in some other function
  setTimeout(handleMacroStatusAux, 2000);
}

async function handleShutDownAux() {
  console.log('handleShutDownAux');
  // send required messages to other codecs
  await sendIntercodecMessageAux('shut_down');
}

// Issue matrix command to keep sending the selected main video input to primary 
// when codec is a secondary and is in combined mode
xapi.Status.Video.Input.MainVideoSource.on(currentMainVideoSource => {
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY && roomCombined) {
    console.log(`New main video source in secondary while combined: ${currentMainVideoSource}, matrixing out to video tieline to primary`);
    xapi.command('Video Matrix Assign', { Output: CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: currentMainVideoSource }).catch((error) => { console.error(error); });
  }
});

/////////////////////////////////////////////////////////////////////////////////////////
// VARIOUS TIMER HANDLER FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function startSideBySideTimer() {
  if (sideBySideTimer == null && CONF.SIDE_BY_SIDE_TIME > 0) {
    allowSideBySide = false;
    sideBySideTimer = setTimeout(onSideBySideTimerExpired, CONF.SIDE_BY_SIDE_TIME);
  }
}

function stopSideBySideTimer() {
  if (sideBySideTimer != null) {
    clearTimeout(sideBySideTimer);
    sideBySideTimer = null;
  }
}

function restartSideBySideTimer() {
  stopSideBySideTimer();
  startSideBySideTimer();
}

function onSideBySideTimerExpired() {
  console.log('onSideBySideTimerExpired');
  allowSideBySide = true;
  recallSideBySideMode();
}



function startInitialCallTimer() {
  if (InitialCallTimer == null) {
    allowCameraSwitching = false;
    InitialCallTimer = setTimeout(onInitialCallTimerExpired, CONF.INITIAL_CALL_TIME);
  }
}

function onInitialCallTimerExpired() {
  console.log('onInitialCallTimerExpired');
  InitialCallTimer = null;
  if (!manual_mode) {
    allowCameraSwitching = true;
    if (!presenterTracking) activateSpeakerTrack();
  }
}

function stopInitialCallTimer() {
  if (InitialCallTimer != null) {
    clearTimeout(InitialCallTimer);
    InitialCallTimer = null;
  }
}

function startCompositionTimer() {
  if (qaCompositionTimer == null) {
    presenterQAKeepComposition = true;
    qaCompositionTimer = setTimeout(onCompositionTimerExpired, CONF.PRESENTER_QA_KEEP_COMPOSITION_TIME)
  }
}

function stopCompositionTimer() {
  if (qaCompositionTimer != null) {
    clearTimeout(qaCompositionTimer);
    qaCompositionTimer = null;
  }
}

function restartCompositionTimer() {
  stopCompositionTimer();
  startCompositionTimer();
}

function onCompositionTimerExpired() {
  presenterQAKeepComposition = false;
  if (PRESENTER_QA_MODE && !webrtc_mode && (presenterTracking && presenterDetected)) {
    if (!CONF.PRESENTER_QA_AUDIENCE_MIC_IDS.includes(lastActiveHighInput)) {
      // restore single presentertrackview because the person still speaking
      // is not an audience member and the timer has expired (could also be due to silence)
      recallFullPresenter();
    }
  }
}

function startNewSpeakerTimer() {
  if (newSpeakerTimer == null) {
    allowNewSpeaker = false;
    newSpeakerTimer = setTimeout(onNewSpeakerTimerExpired, CONF.NEW_SPEAKER_TIME);
  }
}

function stopNewSpeakerTimer() {
  if (newSpeakerTimer != null) {
    clearTimeout(newSpeakerTimer);
    newSpeakerTimer = null;
  }
}

function restartNewSpeakerTimer() {
  stopNewSpeakerTimer();
  startNewSpeakerTimer();
}

function onNewSpeakerTimerExpired() {
  allowNewSpeaker = true;
}

function activateSpeakerTrack() {
  console.log(`activating speakertrack....`)
  macroTurnedOnST = true;
  xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError);

}

function deactivateSpeakerTrack() {
  console.log(`deactivating speakertrack....`)
  macroTurnedOffST = true;
  xapi.Command.Cameras.SpeakerTrack.Deactivate().catch(handleError);
}

function resumeSpeakerTrack() {
  console.log(`resuming speakertrack....`)
  xapi.Command.Cameras.SpeakerTrack.BackgroundMode.Deactivate().catch(handleError);
}

function pauseSpeakerTrack() {
  console.log(`pausing speakertrack....`)
  xapi.Command.Cameras.SpeakerTrack.BackgroundMode.Activate().catch(handleError);
}


// if the Speakertrack Camera becomes available after FW upgrade, we must re-init so
// we register that action as an event handler
xapi.Status.Cameras.SpeakerTrack.Availability
  .on((value) => {
    console.log("Event received for SpeakerTrack Availability: ", value)
    if (value == "Available") {
      init();
    }
  });

// evalSpeakerTrack handles the turning on/off of automation manually based on selection
// of SpeakerTrack by user
function evalSpeakerTrack(value) {
  console.log('Received speakerTrack event: ', value)
  if (value == 'Active') {
    //if (macroTurnedOnST) {macroTurnedOnST=false;}
    //else {startAutomation();}
    if (manual_mode) {
      startAutomation();
      if (CONF.SIDE_BY_SIDE_TIME == 0) recallSideBySideMode(); // need to invoke overview if set to always show
    };

  }
  else {
    //if (macroTurnedOffST) {macroTurnedOffST=false;}
    //else {stopAutomation();}
    if (!manual_mode && !presenterTracking /*&& !inSideBySide*/) stopAutomation();
  }

}

function evalPresenterTrack(value) {
  let currentVal = '1';
  if (presenterTrackConfigured) {
    if (value === 'Follow' || value === 'Persistent') {
      if (PRESENTER_QA_MODE) {
        currentVal = '3';
      }
      else {
        currentVal = '2';
      }
    }
    xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_pt_settings', Value: currentVal }).catch(handleMissingWigetError);
  }
}

function evalCustomPanels() {

  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
    if (primaryInCall || primaryInPreview) {
      xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'panel_combine_split' });
      xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'room_combine_PIN' });
    } else {
      // Add CUSTOM PANEL
      if (CONF.USE_WALL_SENSOR) {
        //first remove the full toggle custom panel if already there
        xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'panel_combine_split' });
        //then create the PIN based custom panel
        xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'room_combine_PIN' },
          PANEL_room_combine_PIN);
      }
      else {
        // first remove PIN based custom panel if already there
        xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'room_combine_PIN' });
        // then create the toggle based custom panel
        xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: 'panel_combine_split' },
          PANEL_panel_combine_split);
        if (roomCombined) {
          xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_toggle_combine', Value: 'on' });
        }
        else {
          xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_toggle_combine', Value: 'off' });
        }
        Object.entries(secondariesStatus).forEach(([key, val]) => {
          let theWidgetId = 'widget_tog_' + key.replace(/\./g, "_")
          xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: theWidgetId, Value: (val.selected ? 'on' : 'off') }).catch(handleMissingWigetError);
        })
      }
    }
  }
}

/////////////////////////////////////////////////////////////////////////////////////////
// INITIALIZATION
/////////////////////////////////////////////////////////////////////////////////////////


async function init_switching() {

  // register callback for processing manual mute setting on codec
  xapi.Status.Audio.Microphones.Mute.on((state) => {
    console.log(`handleMicMuteResponse: ${state}`);
    if (!roomCombined) {
      if (state == 'On') {
        stopSideBySideTimer();
        setTimeout(handleMicMuteOn, 2000);
      }
      else if (state == 'Off') {
        handleMicMuteOff();
      }

    }
  });


  // register handler for Call Successful
  xapi.Event.CallSuccessful.on(async () => {

    console.log("Starting new call timer...");
    //webrtc_mode=false; // just in case we do not get the right event when ending webrtc calls
    await startAutomation();
    recallSideBySideMode();

    // only initialize initial call timer if side by side timer (overview timer) is not zero
    // because, if zero, that means we will always be showing side by side (overview) mode
    if (CONF.SIDE_BY_SIDE_TIME > 0) startInitialCallTimer();

    // always tell the other codec when your are in or out of a call
    await sendIntercodecMessage('CALL_CONNECTED');
    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
      // only need to keep track of codecs being in call with these
      // booleans in primary codec which is the one that initiates join/split
      primaryInCall = true;
      evalCustomPanels();
      handleExternalController('PRIMARY_CALLCONNECT');
    } else {
      handleExternalController('SECONDARY_CALLCONNECT');
    }

  });

  // register handler for Call Disconnect
  xapi.Event.CallDisconnect.on(async () => {
    if (!usb_mode) {
      console.log("Turning off Self View....");
      xapi.Command.Video.Selfview.Set({ Mode: 'off' });
      webrtc_mode = false; // ending webrtc calls is being notified here now in RoomOS11
      stopAutomation();
    }

    // always tell the other codec when your are in or out of a call
    await sendIntercodecMessage('CALL_DISCONNECTED');
    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
      // only need to keep track of codecs being in call with these
      // booleans in primary codec which is the one that initiates join/split
      primaryInCall = false;
      evalCustomPanels();
      handleExternalController('PRIMARY_CALLDISCONNECT');
    }
    else {
      handleExternalController('SECONDARY_CALLDISCONNECT');
    }
  });

  xapi.Event.PresentationPreviewStarted
    .on(async value => {
      await sendIntercodecMessage('PRESENTATION_PREVIEW_STARTED');
      if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
        // only need to keep track of codecs being in call with these
        // booleans in primary codec which is the one that initiates join/split
        primaryInPreview = true;
        evalCustomPanels();
        handleExternalController('PRIMARY_PREVIEW_STARTED');
      }
      else {
        handleExternalController('SECONDARY_PREVIEW_STARTED');
      }
    });

  xapi.Event.PresentationPreviewStopped
    .on(async value => {
      await sendIntercodecMessage('PRESENTATION_PREVIEW_STOPPED');
      if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
        // only need to keep track of codecs being in call with these
        // booleans in primary codec which is the one that initiates join/split
        primaryInPreview = false;
        evalCustomPanels();
        handleExternalController('PRIMARY_PREVIEW_STOPPED');
      }
      else {
        handleExternalController('SECONDARY_PREVIEW_STOPPED');
      }
    });

  // register WebRTC Mode
  xapi.Status.UserInterface.WebView.Type
    .on(async (value) => {
      if (value === 'WebRTCMeeting') {
        webrtc_mode = true;

        console.log("Starting automation due to WebRTCMeeting event...");
        startAutomation();
        // only initialize initial call timer if side by side timer (overview timer) is not zero
        // because, if zero, that means we will always be showing side by side (overview) mode
        if (CONF.SIDE_BY_SIDE_TIME > 0) startInitialCallTimer();

        // always tell the other codec when your are in or out of a call
        await sendIntercodecMessage('CALL_CONNECTED');
        if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
          // only need to keep track of codecs being in call with these
          // booleans in primary codec which is the one that initiates join/split
          primaryInCall = true;
          evalCustomPanels();
          handleExternalController('PRIMARY_CALLCONNECT');
        } else {
          handleExternalController('SECONDARY_CALLCONNECT');
        }

      } else {
        webrtc_mode = false;
        if (!usb_mode) {
          console.log("Stopping automation due to a non-WebRTCMeeting  event...");
          xapi.Command.Video.Selfview.Set({ Mode: 'off' });
          stopAutomation();
        }
        // always tell the other codec when your are in or out of a call
        await sendIntercodecMessage('CALL_DISCONNECTED');
        if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
          // only need to keep track of codecs being in call with these
          // booleans in primary codec which is the one that initiates join/split
          primaryInCall = false;
          evalCustomPanels();
          handleExternalController('PRIMARY_CALLDISCONNECT');
        } else {
          handleExternalController('SECONDARY_CALLDISCONNECT');
        }
      }
    });

  // register to receive MainVideoSource change events in support of WebRTC mode to
  // implement workaround
  xapi.Status.Video.Input.MainVideoSource
    .on(async (value) => {
      //console.log(value);
      if (webrtc_mode && !isOSEleven) {
        console.log('Video switched... unmuting from handler..');
        await xapi.Command.Video.Input.MainVideo.Unmute();
      }
    });

  // register to receive events when someone manually turns on speakertrack
  xapi.Status.Cameras.SpeakerTrack.Status.on(evalSpeakerTrack);

  let enabledGet = await xapi.Config.Cameras.PresenterTrack.Enabled.get()
  presenterTrackConfigured = (enabledGet == 'True') ? true : false;
  addCustomAutoQAPanel();

  // register to receive Presenter Detected events when in PresenterTrack mode.
  // This way we can disable logic for presentertracking if the presenter steps away
  // from stage and re-engage once they come back. 
  xapi.Status.Cameras.PresenterTrack.PresenterDetected.on(async value => {
    console.log('Received PT Presenter Detected as: ', value)
    if (value == 'True') {
      presenterDetected = true;
      if (CONF.SIDE_BY_SIDE_TIME > 0) {
        // only switch input to presenter fully if we are not forcing overview all the time,
        // otherwise, just let the codec show the presenter within the composition selected for overview
        let presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
        let connectorDict = { ConnectorId: presenterSource };
        console.log("In PresenterDetected handler switching to input with SetMainVideoSource with dict: ", connectorDict)
        xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
        lastSourceDict = connectorDict;
      }

    } else {
      presenterDetected = false;
      presenterQAKeepComposition = false;
      if (CONF.SIDE_BY_SIDE_TIME > 0) {
        // no need to force a camera switch unless we are indeed switching since ,
        // there is a SIDE_BY_SIDE_TIME value set more than 0
        lastSourceDict = { SourceID: '0' }; // forcing a camera switch
        lastActiveHighInput = 0;
      }

    }
  });


  // register to keep track of when PresenterTrack is active or not
  xapi.Status.Cameras.PresenterTrack.Status.on(value => {
    console.log('Received PT status as: ', value)
    lastSourceDict = { SourceID: '0' }; // forcing a camera switch
    if (value === 'Follow' || value === 'Persistent') {
      presenterTracking = true;
      if (CONF.SIDE_BY_SIDE_TIME > 0) {
        // only stop initial call timer if we are not forcing overview all the time,
        stopInitialCallTimer();
        if (PRESENTER_QA_MODE && !webrtc_mode) {
          //showPTPanelButton();
          //recallFullPresenter();
        }
      }
    }
    else {
      presenterTracking = false;
    }
    // Update custom panel
    evalPresenterTrack(value);
  });

  // first check to see if the room is supposed to be in combined mode as per permanent storage
  if (roomCombined) {
    if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
      overviewShowDouble = true;
      let thePresetCamID = await getPresetCamera(30);

    }
    else if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY) {
      // stop automation in case it was on
      //TODO: Check if this is still necessary, it might be interfering with handling aux on secondary rooms
      stopAutomation();
    }
  }


  // Stop any VuMeters that might have been left from a previous macro run with a different CONF.config.monitorMics constant
  // to prevent errors due to unhandled vuMeter events.
  xapi.Command.Audio.VuMeter.StopAll({});


  // turn off speakertrack to get started
  deactivateSpeakerTrack();
}


async function init() {
  console.log('init');

  await checkAltconfig(); //switch to alternative configuration if present and selected as such in JoinSplit_alt_config


  if (!await validate_config()) disableMacro("invalid config")

  // make sure Preset 30 exists, if not create it with just an overview shot of camera ID 1 which should be the QuadCam
  if (CONF.QUAD_CAM_ID > 0) checkOverviewPreset();

  //await GMM.memoryInit();

  await GMM.write.global('JOIN_SPLIT_CONFIG', CONF.JOIN_SPLIT_CONFIG).then(() => {
    console.log({ Message: 'Init', Action: 'Join Split config stored.' })
  });

  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
    roomCombined = await GMM.read.global('JoinSplit_combinedState').catch(async e => {
      //console.error(e);
      console.log("No initial JoinSplit_combinedState global detected, creating one...")
      await GMM.write.global('JoinSplit_combinedState', false).then(() => {
        console.log({ Message: 'Init', Action: 'Combined state stored.' })
      })
      return false;
    })
  } else { // Here for when in secondary codec
    if (!CONF.USE_GPIO_INTERCODEC) { // When not using GPIO cable, we have to rely on permanent storage value in secondary as well
      roomCombined = await GMM.read.global('JoinSplit_combinedState').catch(async e => {
        //console.error(e);
        console.log("No initial JoinSplit_combinedState global detected, creating one...")
        await GMM.write.global('JoinSplit_combinedState', false).then(() => {
          console.log({ Message: 'Init', Action: 'Combined state stored.' })
        })
        return false;
      })
    }
    secondarySelected = await GMM.read.global('JoinSplit_secondarySelected').catch(async e => {
      //console.error(e);
      console.log("No initial JoinSplit_secondarySelected global detected, creating one...")
      await GMM.write.global('JoinSplit_secondarySelected', true).then(() => {
        console.log({ Message: 'Init', Action: 'Combined state stored.' })
      })
      return false;
    })
  }


  await init_intercodec();

  // check RoomOS versions
  isOSTen = await check4_Minimum_Version_Required(minOS10Version);
  isOSEleven = await check4_Minimum_Version_Required(minOS11Version);


  // register HDMI Passhtorugh mode handlers if RoomOS 11
  if (isOSEleven) {
    xapi.Status.Video.Output.HDMI.Passthrough.Status.on(async value => {
      console.log(value)
      if (value == 'Active') {
        console.warn(`System is in Passthrough Active Mode`)
        startAutomation();
        if (CONF.SIDE_BY_SIDE_TIME == 0) recallSideBySideMode();
        usb_mode = true;
        // always tell the other codec when your are in or out of a call
        await sendIntercodecMessage('CALL_CONNECTED');
        if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
          // only need to keep track of codecs being in call with these
          // booleans in primary codec which is the one that initiates join/split
          primaryInCall = true;
          evalCustomPanels();
          handleExternalController('PRIMARY_CALLCONNECT');
        } else {
          handleExternalController('SECONDARY_CALLCONNECT');
        }
      } else {
        console.warn(`System is in Passthrough Inactive Mode`)
        stopAutomation();
        usb_mode = false;
        // always tell the other codec when your are in or out of a call
        await sendIntercodecMessage('CALL_DISCONNECTED');
        if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_PRIMARY) {
          // only need to keep track of codecs being in call with these
          // booleans in primary codec which is the one that initiates join/split
          primaryInCall = false;
          evalCustomPanels();
        } else {
          handleExternalController('SECONDARY_CALLDISCONNECT');
        }
      }
    });
  }

  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {

    if (CONF.USE_WALL_SENSOR) {
      wallSensorOverride = await GMM.read.global('JoinSplit_wallSensorOverride').catch(async e => {
        //console.error(e);
        console.log("No initial JoinSplit_wallSensorOverride global detected, creating one...")
        await GMM.write.global('JoinSplit_wallSensorOverride', false).then(() => {
          console.log({ Message: 'Init', Action: 'Wall Sensor override state stored.' })
        })
        return false;
      })
    }
    else {
      // if they are not using a wall sensor, we want the same behavior than if they
      // had set the override for the wall sensor: to just ignore it
      setWallSensorOverride(true); // this also sets wallSensorOverride to true
    }


    // Add CUSTOM PANEL
    evalCustomPanels();

    // setting primarySingleScreen variable initially to know if we need to toggle HDMI 2 Audio Out later
    let videoMonitors = await xapi.Config.Video.Monitors.get();
    switch (videoMonitors) {
      case 'Dual':
        primarySingleScreen = false;
        break;
      case 'DualPresentationOnly':
        primarySingleScreen = false;
        break;
      case 'Single':
        primarySingleScreen = true;
        break;
    }


    // setPrimaryDefaultConfig() is called within initialCombinedJoinState() if appropriate
    initialCombinedJoinState();

    // start listening to events on GPIO pin 1 that come from the wall sensor connected to PRIMARY
    if (CONF.USE_WALL_SENSOR) primaryInitPartitionSensor();

    //setTimeout(setPrimaryGPIOconfig, 1000);
    //primaryStandaloneMode();

    // start sensing changes in PIN 4 to switch room modes. This can be set by wall sensor
    // or custom touch10 UI on PRIMARY codec
    if (CONF.USE_GPIO_INTERCODEC) primaryInitModeChangeSensing();

    primaryListenToStandby();
    primaryListenToMute();
    // Primary room always needs to initialize basic switching for both
    // split and joined mode. For secondary we do that inside event handler
    // for Pin4 which governs if split or joined. 
    init_switching();

  }
  else {
    setSecondaryDefaultConfig();
    // start sensing changes in PIN 4 to switch room modes. This can be set by wall sensor
    // or custom touch10 UI on PRIMARY codec
    if (CONF.USE_GPIO_INTERCODEC) {
      secondaryInitModeChangeSensing();
      secondaryStandbyControl();
      secondaryMuteControl();
    }
    secondaryListenToStandby();
    checkCombinedStateSecondary();
    if (!CONF.USE_GPIO_INTERCODEC) {
      // since we are in secondary codec and in split configuration, we need to 
      // prepare to do basic switching to support PresenterTrack QA mode. 
      // we are only doing it here if no GPIO cable is being used, otherwised it gets
      // done in the Pin4 event handler
      init_switching();
    }
  }

}



/////////////////////////////////////////////////////////////////////////////////////////
// TOUCH 10 UI FUNCTION HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////

function toggleBackCombineSetting(event) {
  if (event.Value === 'on') xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: 'widget_toggle_combine', Value: 'off' })
  else xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: 'widget_toggle_combine', Value: 'on' });
}

function setWidgetSelectionSetting(activate, theIP) {
  let underIP = theIP.replace(/\./g, "_")
  let widgetID = 'widget_tog_' + underIP;
  if (activate) xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: widgetID, Value: 'on' })
  else xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: widgetID, Value: 'off' });
}

async function processSecSelectedAck(theIP) {
  secondariesStatus[theIP].selected = true;
  await GMM.write.global('JoinSplit_secondariesStatus', secondariesStatus).then(() => {
    console.log({ Message: 'ChangeState', Action: 'Secondary codecs state stored.' })
  })
}

async function processSecUnselectedAck(theIP) {
  secondariesStatus[theIP].selected = false;
  await GMM.write.global('JoinSplit_secondariesStatus', secondariesStatus).then(() => {
    console.log({ Message: 'ChangeState', Action: 'Secondary codecs state stored.' })
  })
}

function validateSecSelectedResponse(theIP) {
  if (!secondariesStatus[theIP].selected) {
    console.log(`Secondary selection command for secondary with IP ${theIP} was not acknowledged, rolling back...`)
    setWidgetSelectionSetting(false, theIP);
    alertSelectFailedSelectionActionScreen();
  }
}

function validateSecUnselectedResponse(theIP) {
  if (secondariesStatus[theIP].selected) {
    console.log(`Secondary un-selection command for secondary with IP ${theIP} was not acknowledged, rolling back...`)
    setWidgetSelectionSetting(true, theIP);
    alertSelectFailedSelectionActionScreen();
  }
}

async function handleWidgetActions(event) {

  let widgetId = event.WidgetId;
  let origWidgetId = event.WidgetId;
  let theIP = '';

  if (widgetId.length > 11) {
    if (widgetId.slice(0, 11) == 'widget_tog_') {
      let underIP = widgetId.slice(11);
      theIP = underIP.replace(/_/g, ".")
      widgetId = 'widget_tog_sec';
    }
  }


  switch (widgetId) {
    case 'widget_toggle_combine':
      console.log("JoinSplit " + event.WidgetId + ' set to ' + event.Value);
      let at_least_one_selected = false;
      Object.entries(secondariesStatus).forEach(([key, val]) => {
        if (val['selected']) at_least_one_selected = true;
      })
      if (!at_least_one_selected) {
        xapi.command('UserInterface Message Alert Display', {
          Title: 'Cannot Combine/Split',
          Text: 'You do not have any secondary codecs selected, select at least one and try again.',
          Duration: 10,
        });
        toggleBackCombineSetting(event)
      }
      else if (secondariesInCall()) {
        xapi.command('UserInterface Message Alert Display', {
          Title: 'Cannot Combine/Split',
          Text: 'The secondary codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
          Duration: 10,
        });
        toggleBackCombineSetting(event)
      } else if (primaryInCall || primaryInPreview) {
        // this is only here in case we missed a scenario for disabling panel when in call
        xapi.command('UserInterface Message Alert Display', {
          Title: 'Cannot Combine/Split',
          Text: 'This codec is in a call, presenting or in USB mode, please try after the call ends and/or USB mode is turned off.',
          Duration: 10,
        });
        toggleBackCombineSetting(event)
      }
      else if (!secondariesOnline()) {
        xapi.command('UserInterface Message Alert Display', {
          Title: 'Cannot Combine/Split',
          Text: 'The secondary codec is not online or not reachable by HTTP. Please correct and try again.',
          Duration: 10,
        });
        toggleBackCombineSetting(event)
      }
      else { // we can now safely split/combine
        if (event.Value === 'on') {
          if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToLow(); else primaryTriggerCombine();

        }
        else if (event.Value === 'off') {
          if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToHigh(); else primaryTriggerDivide();
        }
      }
      break;

    case 'widget_tog_sec':
      if (!roomCombined) { // only allow toggle of secondaries if in split mode


        // first put up an alert on the touch device that the selection or unselection is being performed
        // this in part is to prevent race conditions where the operator might try to combine the room
        // before the secondary has a chance to switch selection mode and acknoledget back to primary codec
        if (event.Value === 'on')
          alertSelectedScreen();
        else
          alertUnselectedScreen();

        // Send the affected secondary codec the corresponding message to SELECT or REMOVE
        await sendSelectionMessage(theIP, (event.Value === 'on' ? 'SEC_SELECTED' : 'SEC_REMOVED'))

        // schedule a check in 2 seconds to confirm that the affected secondary codec received and acknoledged 
        // selection or deselection. In those callback functions we handle reverting the setting if no ack.
        if (event.Value === 'on')
          setTimeout(validateSecSelectedResponse, 2000, theIP);
        else
          setTimeout(validateSecUnselectedResponse, 2000, theIP);

      } else { //Here we are toggling back the main combine widget since the room is combined
        // first put up an informative alert
        alertSelectWhenCombinedScreen();
        // now undo the selection
        if (event.Value === 'on') {
          xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: origWidgetId, Value: 'off' });
        }
        else {
          xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: origWidgetId, Value: 'on' });
        }
      }
      break;
    case 'widget_pt_settings':
      let presenterSource = 0;
      let connectorDict = {};
      if (presenterTrackConfigured) {
        if (event.Type == 'released')
          switch (event.Value) {
            case '1':
              console.log('Off');
              console.log("Turning off PresenterTrack...");
              //recallFullPresenter();
              xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Off' });
              PRESENTER_QA_MODE = false;
              activateSpeakerTrack();
              recallQuadCam();
              break;

            case '2':
              console.log('On');
              console.log("Turning on PresenterTrack only...");
              if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
              if (CONF.SIDE_BY_SIDE_TIME > 0) {
                //deactivateSpeakerTrack(); 
                activateSpeakerTrack(); //TODO: test if not activating speakertrack here when you have an SP60 allows it to work in QA mode
                presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
                connectorDict = { ConnectorId: presenterSource };
                xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
                lastSourceDict = connectorDict;
              }
              if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
              xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Persistent' });
              pauseSpeakerTrack();

              PRESENTER_QA_MODE = false;
              break;

            case '3':
              console.log('QA Mode');
              console.log("Turning on PresenterTrack with QA Mode...");
              if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
              if (CONF.SIDE_BY_SIDE_TIME > 0) {
                activateSpeakerTrack(); //TODO: test if not activating speakertrack here when you have an SP60 allows it to work in QA mode
                //pauseSpeakerTrack();
                presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
                connectorDict = { ConnectorId: presenterSource };
                xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
                lastSourceDict = connectorDict;
                xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Persistent' });
                pauseSpeakerTrack();
              }
              if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, CONF.WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

              PRESENTER_QA_MODE = true;
              allowCameraSwitching = true; // this is to allow camera switching in QA mode if initialCallTimer had not expired.
              //resumeSpeakerTrack();
              break;

          }
      }
      else {
        console.log("PresenterTrack not configured or MONITOR_PRESENTERTRACK set to false !!!");
      }
      break;

  }

}

xapi.event.on('UserInterface Extensions Widget Action', (event) => handleWidgetActions(event));


xapi.event.on('UserInterface Extensions Panel Clicked', (event) => {

  switch (event.PanelId) {
    case 'room_combine_PIN':
      console.log("Room Combine PIN button clicked");
      handleMacroStatus();
      xapi.command("UserInterface Message TextInput Display",
        {
          Title: "Wall Sensor Override Control",
          Text: 'Please input the necessary PIN to Split,Combine or report fixed sensor:',
          FeedbackId: 'roomCombine',
          InputType: 'PIN',
          SubmitText: 'Submit'
        }).catch((error) => { console.error(error); });
      break;
    case 'panel_combine_split':
      console.log('Room Combine/Split panel invoked...');
      handleMacroStatus();
      if (CONF.COMBINE_CONTROL_PIN != '') {
        xapi.command("UserInterface Message TextInput Display",
          {
            Title: "Room Combine Control",
            Text: 'Please input the necessary PIN access the room combine/split control panel:',
            FeedbackId: 'combineControl',
            InputType: 'PIN',
            SubmitText: 'Submit'
          }).catch((error) => { console.error(error); });
      }
      break;
  }

});

xapi.Event.UserInterface.Message.TextInput.Clear.on(event => {
  console.log(`Cleared!`, event)
  switch (event.FeedbackId) {
    case 'combineControl':
      xapi.Command.UserInterface.Extensions.Panel.Close();
      break;

  }
});


xapi.event.on('UserInterface Message TextInput Response', (event) => {

  switch (event.FeedbackId) {
    case 'roomCombine':

      if (secondariesInCall()) {
        xapi.command('UserInterface Message Alert Display', {
          Title: 'Cannot Combine/Split',
          Text: 'A secondary codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
          Duration: 10,
        });
      } else if (primaryInCall || primaryInPreview) {
        xapi.command('UserInterface Message Alert Display', {
          Title: 'Cannot Combine/Split',
          Text: 'This codec is in a call, presenting or in USB mode, please try after the call ends and/or USB mode is turned off.',
          Duration: 10,
        });
      }
      else if (!secondariesOnline()) {
        xapi.command('UserInterface Message Alert Display', {
          Title: 'Cannot Combine/Split',
          Text: 'A secondary codec is not online or not reachable by HTTP. Please correct and try again.',
          Duration: 10,
        });
      }
      else {
        switch (event.Text) {
          case CONF.COMBINE_PIN:
            if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
              if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToLow(); else primaryTriggerCombine();
              setCombinedMode(true);
              // once they manually set the combined/join state, we must 
              // store the override state in persistent memory
              setWallSensorOverride(true);
            }
            break;

          case CONF.SPLIT_PIN:
            if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
              if (CONF.USE_GPIO_INTERCODEC) setGPIOPin4ToHigh(); else primaryTriggerDivide();
              setCombinedMode(false);
              // once they manually set the combined/join state, we must 
              // store the override state in persistent memory
              setWallSensorOverride(true);
            }
            break;

          case CONF.FIXED_SENSOR:
            if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE === CONF.JS_PRIMARY) {
              // once a broken sensor is reported fixed, just set 
              //  the override state in persistent memory to false
              // must then manually open/close sensor to set room to right state
              setWallSensorOverride(false);
            }
            break;

          default:
            xapi.command("UserInterface Message Alert Display",
              {
                Title: 'Incorrect Pin',
                Text: 'Please contact administrator to adjust room settings',
                Duration: 3
              });
        }
      }
    case 'combineControl':
      if (event.Text == CONF.COMBINE_CONTROL_PIN) {
        console.log('Correct pin for combine/split panel entered...')
      }
      else {
        xapi.command("UserInterface Message Alert Display",
          {
            Title: 'Incorrect Pin',
            Text: 'Please contact administrator to adjust room settings',
            Duration: 3
          });
        xapi.Command.UserInterface.Extensions.Panel.Close();
      }
  }
});

async function primaryTriggerCombine() {
  await sendIntercodecMessage("COMBINE");
  alertJoinedScreen();
  console.log('Primary Switched to Combined Mode sending message "COMBINE" to secondaries');
  primaryCombinedMode();
  setCombinedMode(true);
}

async function primaryTriggerDivide() {
  await sendIntercodecMessage("DIVIDE");
  alertSplitScreen();
  console.log('Primary Switched to Divided Mode sneding message "DIVIDE" to secondaries');
  primaryStandaloneMode();
  setCombinedMode(false);
}

function primaryInitModeChangeSensing() {
  xapi.status.on('GPIO Pin 4', (state) => {
    console.log(`GPIO Pin 4[${state.id}] State went to: ${state.State}`);
    if (state.State === 'Low') {
      alertJoinedScreen();
      console.log('Primary Switched to Combined Mode [Pin 4]');
      primaryCombinedMode();
      setCombinedMode(true);
    }
    else if (state.State === 'High') {
      alertSplitScreen();
      console.log('Primary Switched to Divided Mode [Pin 4]');
      primaryStandaloneMode();
      setCombinedMode(false);
    }
  });
}

function setSecondaryToCombined() {
  displayWarning();
  secondaryCombinedMode();
}

function setSecondaryToSplit() {
  removeWarning();
  secondaryStandaloneMode();
}

function secondaryInitModeChangeSensing() {
  xapi.status.on('GPIO Pin 4', (state) => {
    console.log(`GPIO Pin 4[${state.id}] State went to: ${state.State}`);
    if (secondarySelected) // only check state of PIN 4 if this secondary is selected
    {
      if (state.State === 'Low') {
        console.log('Secondary Switched to Combined Mode [Pin 4]');
        setSecondaryToCombined();
      }
      else if (state.State === 'High') {
        console.log('Secondary Switched to Divided Mode [Pin 4]');
        setSecondaryToSplit();
      }
    }
    else {
      console.log('GPIO PIN 4 state ignored since Secondary room is not selected from Primary')
    }
  });
}


function primaryListenToMute() {
  xapi.Status.Audio.Microphones.Mute.on(async value => {
    console.log("Global Mute: " + value);
    if (roomCombined === true) {
      if (value === 'On') {
        if (CONF.USE_GPIO_INTERCODEC) setGPIOPin2ToLow(); else await sendIntercodecMessage("MUTE");
      }
      else if (value === 'Off') {
        if (CONF.USE_GPIO_INTERCODEC) setGPIOPin2ToHigh(); else await sendIntercodecMessage("UNMUTE");
      }
    }
  });
}

function primaryListenToStandby() {
  xapi.Status.Standby.State.on(async (state) => {
    console.log("Standby State: " + state);
    if (state === 'Standby') {
      if (roomCombined === true) {
        if (CONF.USE_GPIO_INTERCODEC) setGPIOPin3ToLow(); else await sendIntercodecMessage("STANDBY_ON");
      }
      handleShutDownAux();
    }
    else if (state === 'Off') {
      // Need to turn off automation when coming out of standby since that seems to turn back on
      // speakertrack which in turn turns on automation
      stopAutomation();
      if (roomCombined === true) {
        if (CONF.USE_GPIO_INTERCODEC) setGPIOPin3ToHigh(); else await sendIntercodecMessage("STANDBY_OFF");
      }
      handleWakeUpAux();
    }
    else if (state === 'Halfwake') {
      if (roomCombined === true) {
        if (!CONF.USE_GPIO_INTERCODEC) await sendIntercodecMessage("STANDBY_HALFWAKE");
      }
    }

  });
}

function secondaryListenToStandby() {
  xapi.Status.Standby.State.on((state) => {
    console.log("Standby State: " + state);
    // Need to turn off automation when coming out of standby since that seems to turn back on
    // speakertrack which in turn turns on automation
    if (state === 'Off') {
      stopAutomation();
    }
  });
}


function secondaryStandbyControl() {
  xapi.status.on('GPIO Pin 3', (state) => {
    console.log(`GPIO Pin 3[${state.id}] State went to: ${state.State}`);
    if (state.State === 'Low') {
      if (roomCombined) xapi.command('Standby Activate');
    }
    else if (state.State === 'High') {
      if (roomCombined) {
        xapi.command('Standby Deactivate');
        stopAutomation();
      }
    }
  });
}

function secondaryMuteControl() {
  xapi.status.on('GPIO Pin 2', (state) => {
    console.log(`GPIO Pin 2[${state.id}] State went to: ${state.State}`);
    if (state.State === 'Low') {
      if (roomCombined) xapi.command('Audio Microphones Mute')
    }
    else if (state.State === 'High') {
      if (roomCombined) xapi.command('Audio Microphones Unmute ')
    }
  });
}


/////////////////////////////////////////////////////////////////////////////////////////
// SWITCH BETWEEN COMBINED AND STANDALONE
/////////////////////////////////////////////////////////////////////////////////////////
const areSetsEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value));

async function primaryCombinedMode() {
  handleExternalController('PRIMARY_COMBINE');

  removeWarning();
  xapi.command('Conference DoNotDisturb Deactivate').catch((error) => { console.error(error); });
  xapi.config.set('UserInterface OSD Mode', 'Auto').catch((error) => { console.error("90" + error); });


  // If this codec was a secondary at some point, we need to restore secondary settings we stored away before combining
  JoinSplit_secondary_settings = await GMM.read.global('JoinSplit_secondary_settings').catch(async e => {
    console.log("No JoinSplit_secondary_settings global detected.")
    return JoinSplit_secondary_settings;
  });

  if (JoinSplit_secondary_settings.UltrasoundMax > 0) {
    xapi.Config.Audio.Ultrasound.MaxVolume.set(JoinSplit_secondary_settings.UltrasoundMax);
  }

  if (JoinSplit_secondary_settings.WakeupOnMotionDetection != '') {
    xapi.config.set('Standby WakeupOnMotionDetection', JoinSplit_secondary_settings.WakeupOnMotionDetection)
      .catch((error) => { console.error(error); });
  }

  if (JoinSplit_secondary_settings.StandbyControl != '') {
    xapi.config.set('Standby Control', JoinSplit_secondary_settings.StandbyControl)
      .catch((error) => { console.error(error); });
  }

  if (JoinSplit_secondary_settings.VideoMonitors != '') {
    xapi.Config.Video.Monitors.set(JoinSplit_secondary_settings.VideoMonitors)
      .catch((error) => { console.error(error); });
    switch (JoinSplit_secondary_settings.VideoMonitors) {
      case 'Dual':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('Second');
        break;
      case 'DualPresentationOnly':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('PresentationOnly');
        break;
      case 'Single':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('First');
        break;
    }
  }


  if (CONF.PRIMARY_COMBINED_VOLUME_COMBINED != 0) xapi.Command.Audio.Volume.Set({ Level: CONF.PRIMARY_COMBINED_VOLUME_COMBINED });


  //Only turn on mics for selected secondaries
  CONF.config.compositions.forEach(compose => {
    if (compose.source == CONF.JS_SECONDARY) {
      if (compose.codecIP in secondariesStatus)
        if (secondariesStatus[compose.codecIP].selected)
          compose.mics.forEach(micId => {
            // THIS IS THE INPUT FOR THE MICROPHONES FROM THE SECONDARY CODEC
            if (micId > 1 && micId <= 8)
              xapi.config.set('Audio Input Microphone ' + micId.toString() + ' Mode', 'On')
                .catch((error) => { console.error(error); });
          })
    }
  })


  xapi.config.set('Conference FarEndControl Mode', 'Off')
    .catch((error) => { console.error("32" + error); });

  if (primarySingleScreen)
    xapi.config.set('Audio Output HDMI 2 Mode', 'On')
      .catch((error) => { console.error("47" + error); });

  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); });

  if (CONF.USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS) {

    let secondariesSelected = new Set();
    CONF.config.compositions.forEach(compose => {
      if (compose.source == CONF.JS_SECONDARY) {
        if (secondariesStatus[compose.codecIP].selected) {
          secondariesSelected.add(compose.name)
        }
      }
    })

    let combinedPTSettings = {}
    Object.entries(CONF.N_COMBINED_PRESENTERTRACK_SETTINGS).forEach(([key, ptCameraSettings]) => {
      let compNamesSet = new Set();
      let myArray = key.split(':')
      myArray.forEach(elem => { compNamesSet.add(elem) })
      if (areSetsEqual(compNamesSet, secondariesSelected))
        combinedPTSettings = JSON.parse(JSON.stringify(ptCameraSettings));
    })

    if (Object.keys(combinedPTSettings).length != 0) {
      xapi.Config.Cameras.PresenterTrack.CameraPosition.Pan
        .set(combinedPTSettings.PAN);
      xapi.Config.Cameras.PresenterTrack.CameraPosition.Tilt
        .set(combinedPTSettings.TILT);
      xapi.Config.Cameras.PresenterTrack.CameraPosition.Zoom
        .set(combinedPTSettings.ZOOM);
      xapi.Config.Cameras.PresenterTrack.TriggerZone
        .set(combinedPTSettings.TRIGGERZONE);
    }
  }


  // switcher actions to perform when primary combines
  overviewShowDouble = true;
  stopAutomation();
  let thePresetCamID = await getPresetCamera(30);

  recallSideBySideMode();
  addCustomAutoQAPanel();


}

async function primaryStandaloneMode() {

  handleExternalController('PRIMARY_SPLIT');

  if (CONF.PRIMARY_COMBINED_VOLUME_STANDALONE != 0) xapi.Command.Audio.Volume.Set({ Level: CONF.PRIMARY_COMBINED_VOLUME_STANDALONE });

  CONF.config.compositions.forEach(compose => {
    if (compose.source == CONF.JS_SECONDARY) {
      compose.mics.forEach(micId => {
        if (micId > 1 && micId <= 8)
          xapi.config.set('Audio Input Microphone ' + micId.toString() + ' Mode', 'Off')
            .catch((error) => { console.error(error); });
      })
    }
  })


  xapi.config.set('Conference FarEndControl Mode', 'On')
    .catch((error) => { console.error("32" + error); });

  if (primarySingleScreen)
    xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
      .catch((error) => { console.error("48" + error); });

  if (CONF.USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS) {
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Pan
      .set(CONF.SPLIT_PRESENTERTRACK_SETTINGS.PAN);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Tilt
      .set(CONF.SPLIT_PRESENTERTRACK_SETTINGS.TILT);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Zoom
      .set(CONF.SPLIT_PRESENTERTRACK_SETTINGS.ZOOM);
    xapi.Config.Cameras.PresenterTrack.TriggerZone
      .set(CONF.SPLIT_PRESENTERTRACK_SETTINGS.TRIGGERZONE);
  }

  // perform switcher code actions when room is split on primary
  //overviewShowDouble = false;
  //Always setting overviewShowDouble to true so we always evaluate the overview composition now
  overviewShowDouble = true;

  //OVERVIEW_DOUBLE_SOURCE_IDS = [1,1]; // should not be needed, but useful if someone overviewdouble is enabled somehow
  //turn off side by side at this point in case it stayed turned on!!!
  recallSideBySideMode();

  addCustomAutoQAPanel();
}

async function secondaryStandaloneMode() {
  //setCombinedMode(false);
  roomCombined = false;

  xapi.Command.Standby.Deactivate(); // take out of standby to avoid problems in later versions of RoomOS 11.x
  await delay(2000); // give some time to get out of standby

  handleExternalController('SECONDARY_SPLIT');
  xapi.config.set('Audio Output Line ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_AUDIO_TIELINE_OUTPUT_TO_PRI_ID + ' Mode', 'Off')
    .catch((error) => { console.error(error); });

  xapi.Config.Audio.Input.HDMI[CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID].Mode.set('Off')
    .catch((error) => { console.error("5" + error); });;

  /*
SET ultrasound volume to stored value
SET halfwakd mode to stored value
SET WeakuOnMotionDetect to stored value
*/

  // decrease main volume by 5Db since it was increased by the same when combining rooms
  if (CONF.SECONDARY_COMBINED_VOLUME_CHANGE_STEPS > 0) xapi.Command.Audio.Volume.Decrease({ Steps: CONF.SECONDARY_COMBINED_VOLUME_CHANGE_STEPS });
  if (CONF.SECONDARY_COMBINED_VOLUME_CHANGE_STEPS == 0 && CONF.SECONDARY_COMBINED_VOLUME_STANDALONE > 0) xapi.Command.Audio.Volume.Set({ Level: CONF.SECONDARY_COMBINED_VOLUME_STANDALONE });

  // restore secondary settings we stored away before combining
  JoinSplit_secondary_settings = await GMM.read.global('JoinSplit_secondary_settings').catch(async e => {
    console.log("No JoinSplit_secondary_settings global detected.")
    return JoinSplit_secondary_settings;
  });

  if (JoinSplit_secondary_settings.UltrasoundMax >= 0) {
    xapi.Config.Audio.Ultrasound.MaxVolume.set(JoinSplit_secondary_settings.UltrasoundMax);
  }

  if (JoinSplit_secondary_settings.WakeupOnMotionDetection != '') {
    xapi.config.set('Standby WakeupOnMotionDetection', JoinSplit_secondary_settings.WakeupOnMotionDetection)
      .catch((error) => { console.error(error); });
  }

  if (JoinSplit_secondary_settings.StandbyControl != '') {
    xapi.config.set('Standby Control', JoinSplit_secondary_settings.StandbyControl)
      .catch((error) => { console.error(error); });
  }

  if (JoinSplit_secondary_settings.VideoMonitors != '') {
    xapi.Config.Video.Monitors.set(JoinSplit_secondary_settings.VideoMonitors)
      .catch((error) => { console.error(error); });
    switch (JoinSplit_secondary_settings.VideoMonitors) {
      case 'Dual':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('Second');
        break;
      case 'DualPresentationOnly':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('PresentationOnly');
        break;
      case 'Single':
        xapi.Config.Video.Output.Connector[1].MonitorRole.set('First');
        xapi.Config.Video.Output.Connector[2].MonitorRole.set('First');
        break;
    }
  }

  xapi.command('Conference DoNotDisturb Deactivate')
    .catch((error) => { console.error(error); });

  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); });
  xapi.config.set('UserInterface OSD Mode', 'Auto').catch((error) => { console.error("90" + error); });

  addCustomAutoQAPanel();

}

async function secondaryCombinedMode() {
  //setCombinedMode(true);

  // In case this is coming from being a Primary, reset MainVideoSources and DefaultMainSource
  xapi.config.set('Video DefaultMainSource', '1')
    .catch((error) => { console.error("50" + error); });
  xapi.command('Video Input SetMainVideoSource', { ConnectorID: 1 })
    .catch((error) => { console.error("52" + error); });


  roomCombined = true;
  await xapi.Command.Standby.Deactivate(); // take out of standby to avoid problems in later versions of RoomOS 11.x
  await delay(5000); // give some time to get out of standby

  handleExternalController('SECONDARY_COMBINE');

  if (!isOSEleven)
    xapi.config.set('UserInterface OSD Mode', 'Unobstructed')
      .catch((error) => { console.error("91" + error); });
  xapi.config.set('Audio Output Line ' + CONF.JOIN_SPLIT_CONFIG.SECONDARY_AUDIO_TIELINE_OUTPUT_TO_PRI_ID + ' Mode', 'On').catch((error) => { console.error(error); });

  xapi.Config.Audio.Input.HDMI[CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID].Mode.set('On')
    .catch((error) => { console.error("5" + error); });

  xapi.Command.Video.Selfview.Set({ Mode: 'Off' });

  // increase main volume by 5db, will decrease upon splitting again
  if (CONF.SECONDARY_COMBINED_VOLUME_CHANGE_STEPS > 0) xapi.Command.Audio.Volume.Increase({ Steps: CONF.SECONDARY_COMBINED_VOLUME_CHANGE_STEPS });
  if (CONF.SECONDARY_COMBINED_VOLUME_CHANGE_STEPS == 0 && CONF.SECONDARY_COMBINED_VOLUME_COMBINED > 0) xapi.Command.Audio.Volume.Set({ Level: CONF.SECONDARY_COMBINED_VOLUME_COMBINED });


  //grab current secondary settings before overwriting for combining  
  let ultraSoundMaxValue = await xapi.Config.Audio.Ultrasound.MaxVolume.get()
  let standbyWakeupMotionValue = await xapi.Config.Standby.WakeupOnMotionDetection.get()
  let standbyControlValue = await xapi.Config.Standby.Control.get()

  // store it them in persistent storage, 
  // this also populates JoinSplit_secondary_settings.VideoMonitors before changing 
  // the value in the codec to 'Triple' 
  await storeSecondarySettings(ultraSoundMaxValue, standbyWakeupMotionValue, standbyControlValue);

  xapi.config.set('Audio Ultrasound MaxVolume', '0')
    .catch((error) => { console.error(error); }); // This is so that nobody can pair
  // with the codec when Combined

  xapi.config.set('Standby WakeupOnMotionDetection', 'Off')
    .catch((error) => { console.error(error); });

  //turn off for combined mode so we only control this from primary
  xapi.config.set('Standby Control', 'Off').catch((error) => { console.error(error); });



  xapi.command('Conference DoNotDisturb Activate')
    .catch((error) => { console.error(error); });

  if (JoinSplit_secondary_settings.VideoMonitors == 'Single' && CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID == 2) {
    xapi.Config.Video.Monitors.set('Dual');
  }
  else {
    xapi.Config.Video.Monitors.set('Triple');

  }

  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); });

  xapi.command('Video Matrix Assign', { Output: CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: 1 }).catch((error) => { console.error(error); });
  xapi.command('Video Matrix Assign', { Output: 1, SourceID: CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID }).catch((error) => { console.error(error); });
  if (JoinSplit_secondary_settings.VideoMonitors == 'Dual' || JoinSplit_secondary_settings.VideoMonitors == 'DualPresentationOnly') {
    xapi.command('Video Matrix Assign', { Output: 2, SourceID: CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID }).catch((error) => { console.error(error); });
  }

  // switcher actions when secondary is combined
  stopAutomation();
  addCustomAutoQAPanel();

}


/////////////////////////////////////////////////////////////////////////////////////////
// OTHER FUNCTIONAL HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////

//Run DoNoDisturb Every 24 hours at 1am local time
GMM.Event.Schedule.on('01:00', event => {
  console.log(event);
  console.log('Setting DND on daily schedule...')
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY && roomCombined) {
    xapi.Command.Conference.DoNotDisturb.Activate({ Timeout: 1440 });
  }
})

xapi.Status.Cameras.SpeakerTrack.ActiveConnector.on(value => {
  console.log('New Camera connector: ', value);
  ST_ACTIVE_CONNECTOR = parseInt(value);
  if (CONF.JOIN_SPLIT_CONFIG.ROOM_ROLE == CONF.JS_SECONDARY && roomCombined) {
    // need to send to primary codec the video input from the correct ST camera if it is
    // an SP60. If a QuadCam, it will always be 1 and this event wont be firing other than when turning
    // speakertracking on/off which for the secondary codec in combined mode should be only once when combining
    let sourceIDtoMatrix = (ST_ACTIVE_CONNECTOR == 0) ? 1 : ST_ACTIVE_CONNECTOR;
    //TODO fix the problem where matrix assign below when they have SP60 camera array is only seen temporarily and goes back 
    // it appears that as soon as I issue the Matrix command, it turns off speakertrack. I tried pausing it before issuing matrix
    // but it does not work... need something similar to backtround mode, a safe way to switch in matrix command
    // If not possile to SpeakerTrack with SP60 on Secondary room , then need to find a way to detect that on secondary and simply
    // not try to speakertrack when in combined mode and keep preset 30 always so it is predictable which camera to send across the tieline
    // Since in combined mode the secondary should be sending camera input through monitor connector 2 or 3 out to 
    // the primary, the SetMainVideoSource command below instead of the Video Matrix Assign command should work... need to test. 
    /*
    let sourceDict = { SourceID: '0' }
    sourceDict["SourceID"] = sourceIDtoMatrix.toString();
    xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
    */
    xapi.command('Video Matrix Assign', { Output: CONF.JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: sourceIDtoMatrix }).catch((error) => { console.error(error); });
  }
});


xapi.event.on('UserInterface Message Prompt Response', (event) => {
  switch (event.FeedbackId) {
    case 'displayPrompt':
      if (roomCombined === true) {
        console.log("Redisplaying the prompt");
        xapi.command("UserInterface Message Prompt Display", {
          Title: 'Combined Mode',
          Text: 'This codec is in combined mode',
          FeedbackId: 'displayPrompt',
          'Option.1': 'Please use main Touch Panel',
        }).catch((error) => { console.error(error); });
      }
      break;
  }
});

xapi.event.on('UserInterface Message Prompt Cleared', (event) => {
  switch (event.FeedbackId) {
    case 'displayPrompt':
      if (roomCombined === true) {
        console.log("Redisplaying the prompt");
        xapi.command("UserInterface Message Prompt Display", {
          Title: 'Combined Mode',
          Text: 'This codec is in combined mode',
          FeedbackId: 'displayPrompt',
          'Option.1': 'Please use main Touch Panel',
        }).catch((error) => { console.error(error); });
      }
      break;
  }
});

function displayWarning() {
  xapi.command('UserInterface Message Prompt Display', {
    Title: 'Combined Mode',
    Text: 'This codec is in combined mode',
    FeedbackId: 'displayPrompt',
    'Option.1': 'Please use main Touch Panel'
  }).catch((error) => { console.error(error); });
  xapi.config.set('UserInterface Features HideAll', 'True')
    .catch((error) => { console.error(error); });
}

function removeWarning() {
  xapi.command("UserInterface Message Prompt Clear");
  xapi.config.set('UserInterface Features HideAll', 'False')
    .catch((error) => { console.error(error); });
}

async function monitorOnAutoError(message) {
  let macro = _main_macro_name()
  await xapi.Command.UserInterface.Message.Alert.Display({
    Title: message.Error,
    Text: message.Message,
    Duration: 30
  })
  console.error(message)
  await xapi.Command.Macros.Macro.Deactivate({ Name: macro })
  await xapi.Command.Macros.Runtime.Restart();
}


GMM.Event.Queue.on(report => {
  //The queue will continuously log a report to the console, even when it's empty.
  //To avoid additional messages, we can filter the Queues Remaining Requests and avoid it if it's equal to Empty
  if (report.QueueStatus.RemainingRequests != 'Empty') {
    report.Response.Headers = [] // Clearing Header response for the simplicity of the demo, you may need this info
    //console.log(report)
  }
});



/////////////////////////////////////////////////////////////////////////////////////////
// INVOCATION OF INIT() TO START THE MACRO
/////////////////////////////////////////////////////////////////////////////////////////


async function delayedStartup(time = 120) {
  while (true) {
    const upTime = await xapi.Status.SystemUnit.Uptime.get()

    if (upTime > time) {
      await init();
      break;
    } else {
      delay(5000);
    }
  }
}

delayedStartup();


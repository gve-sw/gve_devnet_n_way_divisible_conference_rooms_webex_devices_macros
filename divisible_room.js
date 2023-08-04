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
* Version: 2.1.11
* Released: August 3, 2023
* Latest RoomOS version tested: 11.6.1.5
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
*    As a macro, the features and functions of this webex devices executive room voice activated 
*    switching macro are not supported by Cisco TAC
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

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

// The JOIN_SPLIT_ROOM_ROLE const tells the macro in the particular codec it is running
// what role it should play; JS_PRIMARY or JS_SECONDARY
const JS_PRIMARY = 1, JS_SECONDARY = 2, JS_NONE = 0

// In this section, write in the values for the constants below.
// For ROOM_ROLE fill in either JS_PRIMARY or JS_SECONDARY as the value.
// If you wired your rooms different from what is indicated in the Version_3_Two-way_System_Drawing.pdf document
// you can modify the  SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID
// SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID and SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID constants
// to match your setup. 
// For PRIMARY_CODEC_IP enter the IP address for the Primary Codec. 
const JOIN_SPLIT_CONFIG = {
  ROOM_ROLE: JS_PRIMARY,
  SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID: 3, // change only for non-standard singe screen setups
  SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID: 3, // change only for non-standard singe screen setups
  SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID: 4, // change only for non-standard singe screen setups
  PRIMARY_CODEC_IP: '10.0.0.100'
}

// If you fill out the OTHER_CODEC_USERNAME and OTHER_CODEC_PASSWORD with the credentials to be able to log
// into the the Secondary codec (if configuring Primary) or Primary codec (if configuring Secondary)
// they will be used to establish an HTTP connection with that other codec, but these credentials will be
// stored clear text in the macro. 
// If you wish to slightly obfuscate the credentials, use a Base64 encoded string for OTHER_CODEC_USERNAME and
// leave OTHER_CODEC_PASSWORD blank. If you do that, you would need to combine the username and password in one string
// separated by a colon (i.e. "username:password") before Base64 encoding with a tool such as https://www.base64encode.org/
// Instructions for creating these admin accounts are in the "Installation Instructions" document.
const OTHER_CODEC_USERNAME = '';
const OTHER_CODEC_PASSWORD = '';




/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 
+ Only for use on PRIMARY Codec (i.e set ROOM_ROLE : JS_PRIMARY above, then fill this section
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

// If you wish to pin-protect the room combine/split control
// panel (when not using wall sensor), enter a numeric value for COMBINE_CONTROL_PIN
// otherwise leave it blank: ""
const COMBINE_CONTROL_PIN = "9999"

// For more reliability when combining and dividing rooms you can use a custom cable connecting the 
// GPIO pins 2-4 between the primary codec and secondary codecs. This cable cannot be used if you have 
// a setup where you need to "promote" a secondary room to primary to accomodate specific room layouts
// in which case the value should be false.
const USE_GPIO_INTERCODEC = true;

// USE_WALL_SENSOR controls if you use a physical wall sensor or not
// If set to false, you will get a custom panel to manually switch rooms from join to split
// If set to true, you will get a PIN protected override button, in case the wall sensor is broken
// and you need to override manually
const USE_WALL_SENSOR = false

// WALL_SENSOR_COMBINED_STATE shoud contain the state of PIN 1 when the rooms is
// combined. This could be 'High' or 'Low' depending on how the sensor is wired 
const WALL_SENSOR_COMBINED_STATE = 'Low'

/*
  If you set USE_WALL_SENSOR to true above, you can
  change the override protect PINs here if needed.
*/
const COMBINE_PIN = "1234";
const SPLIT_PIN = "4321";
const FIXED_SENSOR = "5678";


// USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS speficies if different settings should be used for presentertrack on primary codec
// for combined and split modes. If set to true, you must modify the settings for presentertrack to use for each scenario in the 
// SPLIT_PRESENTERTRACK_SETTINGS and COMBINED_PRESENTERTRACK_SETTINGS object constants below. 
// Instructions on how setup and to obtain the settings from the primary codec can be found in 
// the "How_to_Setup_Two-PresenterTrack_Zones.pdf" document in the same repository for this macro. 
const USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS = false;
const SPLIT_PRESENTERTRACK_SETTINGS = {
  PAN: -1000,
  TILT: -309,
  ZOOM: 4104,
  TRIGGERZONE: '0,95,400,850'
} //Replace these placeholder values with your actual values.
const COMBINED_PRESENTERTRACK_SETTINGS = {
  PAN: -1378,
  TILT: -309,
  ZOOM: 4104,
  TRIGGERZONE: '0,89,549,898'
} //Replace these placeholder values with your actual values.


// CHK_VUMETER_LOUDSPEAKER specifies if we check the LoudspeakerActivity flag from the VuMeter events
// to ignore any microphone activity while the loudspeakers are active to reduce the possibility of
// switching due to sound coming in from remote participants in the meeting if the AfterAEC setting
// is not being effective. Set to true to perform the check for each microphone activity event. 
const CHK_VUMETER_LOUDSPEAKER = false;

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 +
+ Only for use on SECONDARY Codec (i.e set ROOM_ROLE : JS_SECONDARY above, then fill this section
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


// Change SECONDARY_COMBINED_VOLUME_CHANGE_STEPS if you want to adjust the volume on the secondary
// codec when switching modes. Each step is equivalent to a 0.5 dB change. Set the value to 0 if you wish
// to simply set the actual volume wne combined or standalone by using the SECONDARY_COMBINED_VOLUME_COMBINED and
// SECONDARY_COMBINED_VOLUME_STANDALONE constants below
const SECONDARY_COMBINED_VOLUME_CHANGE_STEPS = 10

// To set the volume of the secondary codecs to a specific value when combined vs when standalone, set the
// SECONDARY_COMBINED_VOLUME_CHANGE_STEPS to 0 and specific the correct volume you wish to set the codec to using
// the SECONDARY_COMBINED_VOLUME_COMBINED and SECONDARY_COMBINED_VOLUME_STANDALONE constants
const SECONDARY_COMBINED_VOLUME_COMBINED = 0
const SECONDARY_COMBINED_VOLUME_STANDALONE = 0

// If you would like to use the speaker on the monitor 1 in the secondary room, set SECONDARY_USE_MONITOR_AUDIO to true
// otherwise the macro will turn off Audio on that connector
const SECONDARY_USE_MONITOR_AUDIO = false;

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

General microphones and video sources for both primary and secondary codecs
Currently only the primary will use the compositions but in a future version this will change
NOTE: See section 6 for PresenterTrack QA mode configuration and the PRESENTER_QA_AUDIENCE_MIC_IDS array 
*/

const config = {
  monitorMics: [1, 2, 3, 4, 5, 6, 7, 8], // input connectors associated to the microphones being used in the primary or secondary room
  compositions: [     // Create your array of compositions, NOT NEEDED IF YOU ARE CONFIGURING A SECONDARY CODEC 
    {
      name: 'RoomMain',     // Name for your composition. If source is JS_SECONDARY, name will be used in toggle UI
      codecIP: JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP,
      mics: [1, 2, 3],             // Mics you want to associate with this composition
      connectors: [1],    // Video input connector Ids to use
      source: JS_PRIMARY,
      layout: 'Prominent',       // Layout to use
      preset: 0 // use a camera preset instead of a layout with specific connectors.
    },
    {
      name: 'RoomSecondaryRight', //Name for your composition. If source is JS_SECONDARY, name will be used in toggle UI
      codecIP: '10.0.0.100',
      mics: [8],
      connectors: [2],
      source: JS_SECONDARY,
      layout: 'Prominent',       // Layout to use
      preset: 0 // use a camera preset instead of a layout with specific connectors.
    },
    {
      name: 'RoomSecondaryLeft', // Name for your composition. If source is JS_SECONDARY, name will be used in toggle UI
      codecIP: '10.0.0.110',
      mics: [7],
      connectors: [3],
      source: JS_SECONDARY,
      layout: 'Prominent',       // Layout to use
      preset: 0 // use a camera preset instead of a layout with specific connectors.
    },
    {
      name: 'Overview',          // IMPORTANT: There needs to be an overview compositino with mics: [0]
      codecIP: JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP,
      mics: [0],
      connectors: [3, 1, 2], // Specify here the video inputs and order to use to compose the "side by side" view
      source: JS_NONE,
      layout: 'Equal',       // Layout to use
      preset: 0 // use a camera preset instead of a layout with specific connectors.
    }
  ]
}


// If you are using a SpeakerTrack 60, set QUAD_CAM_ID to the connector ID where the first camera of the array is connected 
// and also use that ID in the connetors array in the compositions above   
const QUAD_CAM_ID = 1;


const OVERVIEW_SINGLE_SOURCE_ID = 1;

// In RoomOS 11 there are multiple SpeakerTrack default behaviors to choose from on the navigator or
// Touch10 device. Set ST_DEFAULT_BEHAVIOR to the one you want this macro to use from these choices:
// Auto: The same as BestOverview.
// BestOverview: The default framing mode is Best overview. 
// Closeup: The default framing mode is Closeup (speaker tracking). 
// Current: The framing mode is kept unchanged when leaving a call. 
// Frames: The default framing mode is Frames.
const ST_DEFAULT_BEHAVIOR = 'Closeup'


/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

TIMERS and THRESHOLDS
*/


// Time to wait for silence before setting Speakertrack Side-by-Side mode
const SIDE_BY_SIDE_TIME = 10000; // 10 seconds
// Time to wait before switching to a new speaker
const NEW_SPEAKER_TIME = 2000; // 2 seconds
// Time to wait before activating automatic mode at the beginning of a call
const INITIAL_CALL_TIME = 15000; // 15 seconds

// WEBRTC_VIDEO_UNMUTE_WAIT_TIME only applies to RoomOS version 10 since
// have to to implement a woraround there to be able to switch cameras
// while in a WebRTC call. Values less than 1500 ms do not seem to work, but
// if you are having trouble getting switching to work in WebRTC calls you can increase
// this value although that will affect the overall experience since during this time
// the remote participants just see a black screen instead of the video feed.
const WEBRTC_VIDEO_UNMUTE_WAIT_TIME = 1500;

// Microphone High/Low Thresholds
const MICROPHONELOW = 6;
const MICROPHONEHIGH = 25;

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 6 - SECTION 6 - SECTION 6 - SECTION 6 - SECTION 6 - SECTION 6 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

Presenter Track Q&A Mode
*/
// ALLOW_PRESENTER_QA_MODE controls if the custom panel for activating PresenterTrack with or without 
// Q&A Mode is shown in the Touch10 or Navigator. Without it, you cannot activate PresenterTrack Q&A mode
const ALLOW_PRESENTER_QA_MODE = true;

//PRESENTER_QA_AUDIENCE_MIC_IDS is an array for Mic IDs that are being used for the audience. 
const PRESENTER_QA_AUDIENCE_MIC_IDS = [1, 2]


// PRESENTER_QA_KEEP_COMPOSITION_TIME is the time in ms that the macro will keep sending
// a composed image of the presenter and an audience member asking a question after the question
// has been asked by any audience member. If different audience members ask questions while the composition 
// is being shown after NEW_SPEAKER_TIME milliseconds have passed, the composition will change 
// to use that new audience member instead of the original. This will continue until no other audience members have
// spoken for PRESENTER_QA_KEEP_COMPOSITION_TIME milliseconds and then the code will resume sending only the 
// full video feed from the Presenter camera 
const PRESENTER_QA_KEEP_COMPOSITION_TIME = 7000


/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ DO NOT EDIT ANYTHING BELOW THIS LINE                                  +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

const enableKeepAlive = false;

const keepAliveReportOnlyFails = true;
// KA_FREQUENCY_SECONDS is the frequency in which to send keep alives to secondaries, in seconds, 
// no less than 3 and at least 1 more than KA_CHECK_REPLIES_TIMEOUT_MS/1000
const KA_FREQUENCY_SECONDS = 15;
const KA_CHECK_REPLIES_TIMEOUT_MS = 2000; // time in ms to check for KA replies no less than 1000


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

  if (module.name.replace('./', '') != 'divisible_room')
    await disableMacro(`config validation fail: macro name has changed to: ${module.name.replace('./', '')}. Please set back to: divisible_room`);

  if (OTHER_CODEC_USERNAME == '')
    await disableMacro(`config validation fail: OTHER_CODEC credentials must be set.  Current values: OTHER_CODEC_USERNAME: ${OTHER_CODEC_USERNAME} OTHER_CODEC_PASSWORD= ${OTHER_CODEC_PASSWORD}`);

  let allowedMics = [1, 2, 3, 4, 5, 6, 7, 8];
  // only allow up to 8 microphones
  if (config.monitorMics.length > 8 || config.monitorMics.length < 1)
    await disableMacro(`config validation fail: config.monitorMics can only have between 1 and 8 entries. Current value: ${config.MonitorMics} `);

  // make sure the mics are within those specified in the monitorMics array
  if (!config.monitorMics.every(r => allowedMics.includes(r)))
    await disableMacro(`config validation fail: config.monitorMics can only have mic ids 1-8. Current value: ${config.monitorMics} `);

  // check for duplicates in config.monitorMics
  if (new Set(config.monitorMics).size !== config.monitorMics.length)
    await disableMacro(`config validation fail: config.monitorMics cannot have duplicates. Current value: ${config.monitorMics} `);

  // Check for falid audience mics configured for the Presenter QA Mode feature
  if (ALLOW_PRESENTER_QA_MODE)
    if (!PRESENTER_QA_AUDIENCE_MIC_IDS.every(r => config.monitorMics.includes(r)))
      await disableMacro(`config validation fail: PRESENTER_QA_AUDIENCE_MIC_IDS can only specify values contained in config.monitorMics . Current values config.monitorMics: ${config.monitorMics} PRESENTER_QA_AUDIENCE_MIC_IDS: ${PRESENTER_QA_AUDIENCE_MIC_IDS}`);

  // if running in secondary codec make sure we have a valid IP address for the primary codec
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY) {
    if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP))
      await disableMacro(`config validation fail: Invalid IP address configured to talk to primary codec: ${JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP} `);

  }
  else {
    hasOverview = false;
    // add value 0 to allowedMics array to include overview composition
    allowedMics = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    // now let's check each composition
    for (let i = 0; i < config.compositions.length; i++) {
      let compose = config.compositions[i];
      // make sure each composition is marked JS_PRIMARY or JS_SECONDARY
      if (![JS_PRIMARY, JS_SECONDARY, JS_NONE].includes(compose.source)) await disableMacro(`config validation fail: composition named ${compose.name} should have a valid value for key 'source' (JS_PRIMARY, JS_SECONDARY or JS_NONE).`);

      // make sure if JS_SECONDARY source, then there is a real IP address configured
      if (compose.source == JS_SECONDARY)
        if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(compose.codecIP))
          await disableMacro(`config validation fail: Invalid IP address for composition ${compose.name}: ${compose.codecIP} `);

      // only allow up to 8 mics and at least 1 specified for each composition
      if (compose.mics.length > 8 || compose.mics.length < 1)
        await disableMacro(`config validation fail: mics for each composition can only have between 1 and 8 entries. Current value: ${compose.mics} `);

      // make sure the mics are within those specified in the monitorMics array, plus 0 for overview
      if (!compose.mics.every(r => allowedMics.includes(r)))
        await disableMacro(`config validation fail: mics for each composition can only have mic ids 0-8. Current value: ${compose.mics} `);

      // keep track that we have at least one composition with mics [0] to check at the end and that it is JS_PRIMARY sourced
      if (JSON.stringify(compose.mics) == JSON.stringify([0]) && compose.source == JS_NONE) hasOverview = true;
    }

    // check that there was at least one Overview composition with mics==[0]
    if (!hasOverview)
      await disableMacro('config validation fail: no overview composition configured or it does not have source set to JS_NONE');
  }
  // all went well, can return true!
  return true;
}



function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function disableMacro(reason = 'N/A') {
  console.warn(reason)
  let act = `Disabling [${module.name.replace('./', '')}] in 10 seconds`
  console.error({ Error: reason, Action: act })
  await xapi.Command.UserInterface.Message.Alert.Display({ Title: '⚠️ Macro Error ⚠️', Text: `${reason}<p>${act}`, Duration: 9 });
  await delay(10000);
  await xapi.Command.Macros.Macro.Deactivate({ Name: module.name.replace('./', '') });
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
config.compositions.forEach(compose => {
  if (compose.codecIP != '' && compose.codecIP != JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP) {
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
  if (OTHER_CODEC_USERNAME != '')
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
      let stored_setStatus = {}
      stored_setStatus = await GMM.read.global('JoinSplit_secondariesStatus').catch(async e => {
        console.log("No initial JoinSplit_secondariesStatus global detected, using constants in macro to create new one")
        return false;
      })
      let codecIPArray = [];

      config.compositions.forEach(compose => {
        if (compose.codecIP != '' && compose.codecIP != JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP) {
          console.log(`Setting up connection to secondary codec with IP ${compose.codecIP}`);
          //otherCodec[compose.codecIP] = new GMM.Connect.IP(OTHER_CODEC_USERNAME, OTHER_CODEC_PASSWORD, compose.codecIP)
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

      otherCodecs = new GMM.Connect.IP(OTHER_CODEC_USERNAME, OTHER_CODEC_PASSWORD, codecIPArray)
      //console.log(otherCodecs)

      await GMM.write.global('JoinSplit_secondariesStatus', secondariesStatus).then(() => {
        console.log({ Message: 'ChangeState', Action: 'Secondary codecs state stored.' })
      })
    }
    else
      otherCodecs = new GMM.Connect.IP(OTHER_CODEC_USERNAME, OTHER_CODEC_PASSWORD, JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP)

  // This schedules the keep alive messages to send from primary to secondaries, if enabled. 
  if (enableKeepAlive && JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
    if (KA_FREQUENCY_SECONDS >= 3 && KA_CHECK_REPLIES_TIMEOUT_MS >= 1000)
      if ((KA_FREQUENCY_SECONDS * 1000) > KA_CHECK_REPLIES_TIMEOUT_MS + 1000)
        setInterval(priSendKeepAlive, KA_FREQUENCY_SECONDS * 1000);
  }
}

const localCallout = new GMM.Connect.Local(module.name.replace('./', ''))

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
for (var i in config.monitorMics) {
  micArrays[config.monitorMics[i].toString()] = [0, 0, 0, 0];
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

let overviewShowDouble = false;
let inSideBySide = false;

let presenterTracking = false;
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

function setCombinedMode(combinedValue) {
  roomCombined = combinedValue;
  GMM.write.global('JoinSplit_combinedState', roomCombined).then(() => {
    console.log({ Message: 'ChangeState', Action: 'Combined state stored.' })
  })

}

function setWallSensorOverride(overrideValue) {
  wallSensorOverride = overrideValue;
  GMM.write.global('JoinSplit_wallSensorOverride', wallSensorOverride).then(() => {
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
function initialCombinedJoinState() {
  // Change all these to whatever is needed to trigger on the Primary when it goes into combined
  if (roomCombined) {
    console.log('Primary Room is in Combined Mode');
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
      primaryCombinedMode();
      if (USE_GPIO_INTERCODEC) setGPIOPin4ToLow();
      if (!USE_WALL_SENSOR) {
        xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_toggle_combine', Value: 'On' });
      }
    }
    setCombinedMode(true);
  } else {
    console.log('Primary Room is in Divided Mode');
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
      setPrimaryDefaultConfig();
      if (USE_GPIO_INTERCODEC) setGPIOPin4ToHigh();
    }
    setCombinedMode(false);
  }
}


/**
  * This will initialize the room state to Combined or Divided based on the Pin 4 set by Primary
**/
async function checkCombinedStateSecondary() {
  if (USE_GPIO_INTERCODEC) Promise.all([xapi.status.get('GPIO Pin 4')]).then(promises => {
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
  xapi.status.on('GPIO Pin 1', (state) => {
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
      if (state.State === WALL_SENSOR_COMBINED_STATE) {
        alertJoinedScreen();
        console.log('Primary Switched to Combined Mode [Partition Sensor]');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
          primaryCombinedMode();
          if (USE_GPIO_INTERCODEC) setGPIOPin4ToLow(); else primaryTriggerCombine();
          if (!USE_WALL_SENSOR) {
            xapi.command('UserInterface Extensions Widget SetValue', { WidgetId: 'widget_toggle_combine', Value: 'On' });
          }
        }
        setCombinedMode(true);
      }
      else {
        alertSplitScreen();
        console.log('Primary Switched to Divided Mode [Partition Sensor]');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
          primaryStandaloneMode();
          //primaryCodecSendScreen();
          if (USE_GPIO_INTERCODEC) setGPIOPin4ToHigh(); else primaryTriggerDivide();
          if (!USE_WALL_SENSOR) {
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

  xapi.config.set('Audio Input ARC 1 Mode', 'Off')
    .catch((error) => { console.error("1" + error); });
  xapi.config.set('Audio Input ARC 2 Mode', 'Off')
    .catch((error) => { console.error("2" + error); });
  xapi.config.set('Audio Input ARC 3 Mode', 'Off')
    .catch((error) => { console.error("3" + error); });

  // HDMI AUDIO SECTION
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4" + error); });
  xapi.config.set('Audio Input HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("5" + error); });

  // SET MICROPHONES
  // MICROPHONES 1 THRU 7 ARE USER CONFIGURABLE


  //TODO: Review if I have to do the commands below when I have multiple secondaries coming in or if I can just set 
  // without the macro affecting it

  // MIC 8
  // THIS IS THE INPUT FOR THE MICROPHONES FROM THE SECONDARY CODEC
  xapi.config.set('Audio Input Microphone 8 Channel', 'Mono')
    .catch((error) => { console.error("6" + error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl Dereverberation', 'Off')
    .catch((error) => { console.error("7" + error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl Mode', 'On')
    .catch((error) => { console.error("8" + error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl NoiseReduction', 'Off')
    .catch((error) => { console.error("9" + error); });
  xapi.config.set('Audio Input Microphone 8 Level', '18')
    .catch((error) => { console.error("10" + error); });
  xapi.config.set('Audio Input Microphone 8 Mode', 'Off')
    .catch((error) => { console.error("11" + error); });
  xapi.config.set('Audio Input Microphone 8 PhantomPower', 'Off')
    .catch((error) => { console.error("12" + error); });

  // MUTE
  xapi.config.set('Audio Microphones Mute Enabled', 'True')
    .catch((error) => { console.error("13" + error); });





  // HDMI AUDIO OUTPUT
  xapi.Config.Audio.Output.ConnectorSetup.set('Manual');

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
  xapi.config.set('GPIO Pin 1 Mode', 'InputNoAction')
    .catch((error) => { console.error("33" + error); });

  xapi.config.set('GPIO Pin 2 Mode', 'OutputManualState')
    .catch((error) => { console.error("34" + error); });
  xapi.config.set('GPIO Pin 3 Mode', 'OutputManualState')
    .catch((error) => { console.error("35" + error); });
  xapi.config.set('GPIO Pin 4 Mode', 'OutputManualState')
    .catch((error) => { console.error("36" + error); });


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

  config.compositions.forEach(compose => {
    if (compose.source == JS_SECONDARY) {
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

  xapi.config.set('Audio Input ARC 1 Mode', 'Off')
    .catch((error) => { console.error("1" + error); });
  xapi.config.set('Audio Input ARC 2 Mode', 'Off')
    .catch((error) => { console.error("2" + error); });
  xapi.config.set('Audio Input ARC 3 Mode', 'Off')
    .catch((error) => { console.error("3" + error); });


  // HDMI AUDIO SECTION
  xapi.Config.Audio.Output.ConnectorSetup.set('Manual');
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4" + error); });
  xapi.config.set('Audio Input HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("5" + error); });
  //xapi.config.set('Audio Input HDMI 3 Mode', 'On')
  //.catch((error) => { console.error("5" + error); });
  xapi.Config.Audio.Input.HDMI[JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID].Mode.set('On')
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
    .catch((error) => { console.error("22" + error); });

  // HDMI AUDIO OUTPUT
  if (!SECONDARY_USE_MONITOR_AUDIO)
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

  // GPIO
  xapi.config.set('GPIO Pin 2 Mode', 'InputNoAction')
    .catch((error) => { console.error("39" + error); });
  xapi.config.set('GPIO Pin 3 Mode', 'InputNoAction')
    .catch((error) => { console.error("40" + error); });
  xapi.config.set('GPIO Pin 4 Mode', 'InputNoAction')
    .catch((error) => { console.error("41" + error); });




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

  // HDMI INPUTS 3 AND 4
  // THESE ARE SCREENS 1 AND 2 FROM THE PRIMARY ROOM
  xapi.config.set('Video Input Connector 3 HDCP Mode', 'Off')
    .catch((error) => { console.error("62" + error); });
  xapi.config.set('Video Input Connector 3 CameraControl Mode', 'Off')
    .catch((error) => { console.error("63" + error); });
  xapi.config.set('Video Input Connector 3 InputSourceType', 'Other')
    .catch((error) => { console.error("64" + error); });
  xapi.config.set('Video Input Connector 3 Name', 'Main Video Primary')
    .catch((error) => { console.error("65" + error); });
  xapi.config.set('Video Input Connector 3 PreferredResolution', '3840_2160_30')
    .catch((error) => { console.error("66" + error); });
  xapi.config.set('Video Input Connector 3 PresentationSelection', 'Manual')
    .catch((error) => { console.error("67" + error); });
  xapi.config.set('Video Input Connector 3 Quality', 'Sharpness')
    .catch((error) => { console.error("68" + error); });
  xapi.config.set('Video Input Connector 3 Visibility', 'Never')
    .catch((error) => { console.error("69" + error); });

  xapi.config.set('Video Input Connector 4 HDCP Mode', 'Off')
    .catch((error) => { console.error("70" + error); });
  xapi.config.set('Video Input Connector 4 CameraControl Mode', 'Off')
    .catch((error) => { console.error("71" + error); });
  xapi.config.set('Video Input Connector 4 InputSourceType', 'PC')
    .catch((error) => { console.error("72" + error); });
  xapi.config.set('Video Input Connector 4 Name', 'Content Primary')
    .catch((error) => { console.error("73" + error); });
  xapi.config.set('Video Input Connector 4 PreferredResolution', '3840_2160_30')
    .catch((error) => { console.error("74" + error); });
  xapi.config.set('Video Input Connector 4 PresentationSelection', 'Manual')
    .catch((error) => { console.error("75" + error); });
  xapi.config.set('Video Input Connector 4 Quality', 'Sharpness')
    .catch((error) => { console.error("76" + error); });
  xapi.config.set('Video Input Connector 4 Visibility', 'Never')
    .catch((error) => { console.error("77" + error); });

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
    var currentSTCameraID = QUAD_CAM_ID;
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
    xapi.Config.Cameras.SpeakerTrack.DefaultBehavior.set(ST_DEFAULT_BEHAVIOR);
  }

  // Always turn on SpeakerTrack when the Automation is started. It is also turned on when a call connects so that
  // if it is manually turned off while outside of a call it goes back to the correct state
  macroTurnedOnST = true;
  if (webrtc_mode) {
    setTimeout(() => { xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError) }, 2000) // in RoomOS11 Beta, if we do not delay turning on ST, something turns it back off
  } else xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError);


  //registering vuMeter event handler
  micHandler();
  micHandler = () => void 0;
  micHandler = xapi.event.on('Audio Input Connectors Microphone', (event) => {
    if (typeof micArrays[event.id[0]] != 'undefined' && (!CHK_VUMETER_LOUDSPEAKER || event.LoudspeakerActivity < 1)) {
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
  // start VuMeter monitoring
  console.log("Turning on VuMeter monitoring...")
  for (var i in config.monitorMics) {
    xapi.command('Audio VuMeter Start', {
      ConnectorId: config.monitorMics[i],
      ConnectorType: 'Microphone',
      IntervalMs: 500,
      Source: 'AfterAEC'
    });
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
    var currentSTCameraID = QUAD_CAM_ID;
    let sourceDict = { SourceID: '0' }
    sourceDict["SourceID"] = currentSTCameraID.toString();
    xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
    inSideBySide = false;
    console.log("cleared out side by side mode....")
  }
  /*
  console.log("Switching to MainVideoSource connectorID 1 ...");
  //pauseSpeakerTrack(); // in case it is turned on so we can switch video sources
  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
  xapi.Command.Video.Input.SetMainVideoSource({ SourceId: 1});
  lastSourceDict={ SourceId: 1};
  if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  //resumeSpeakerTrack(); // in case speaker track is active so we turn off BG mode.
  */
  // using proper way to de-register handlers
  micHandler();
  micHandler = () => void 0;
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
    if (average > MICROPHONEHIGH) {
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
    else if (average < MICROPHONELOW) {
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


// function to actually switch the camera input
async function makeCameraSwitch(input, average) {
  console.log("-------------------------------------------------");
  console.log("High Triggered: ");
  console.log(`Input = ${input} | Average = ${average}`);
  console.log(`roomCombined = ${roomCombined}`);
  console.log("-------------------------------------------------");

  // map the loudest mic to the corresponding composition which could be local or from a 
  // secondary codec.
  var currentSTCameraID = QUAD_CAM_ID;
  let sourceDict = { SourceID: '0' } // Just initialize
  let initial_sourceDict = { SourceID: '0' } // to be able to compare later
  config.compositions.forEach(compose => {
    if (compose.mics.includes(input)) {
      if ((!roomCombined && JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) && compose.source == JS_SECONDARY) {
        console.warn(`makeCameraSwitch(): Trying to switch to composition that involves a secondary codec input when not in combined mode!!`)
        restartNewSpeakerTimer();
        return;
      }
      if ((roomCombined && JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) && compose.source == JS_SECONDARY) {
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



  if (presenterTracking) {
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
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY && roomCombined) await sendIntercodecMessage('automatic_mode');
    lastActiveHighInput = input;
    restartNewSpeakerTimer();
    if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

  }
}

// function to actually switch the camera input when in presentertrack Q&A mode
async function presenterQASwitch(input, sourceDict) {

  if (!(PRESENTER_QA_AUDIENCE_MIC_IDS.includes(input))) {
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
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY && roomCombined) await sendIntercodecMessage('automatic_mode');

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
  if (connectorDict.ConnectorId[1] == QUAD_CAM_ID) resumeSpeakerTrack();

  //if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Unmute();
  if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

}

function largestMicValue() {
  // figure out which of the inputs has the highest average level and return the corresponding key
  let currentMaxValue = 0;
  let currentMaxKey = '';
  let theAverage = 0;
  for (var i in config.monitorMics) {
    theAverage = averageArray(micArrays[config.monitorMics[i].toString()]);
    if (theAverage >= currentMaxValue) {
      currentMaxKey = config.monitorMics[i].toString();
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
  if (!manual_mode && roomCombined) {
    inSideBySide = true;
    if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
    // only invoke SideBySideMode if not in presenter QA mode and not presentertrack is currently not active
    // because Presenter QA mode has it's own way of composing side by side. 
    if (presenterTracking) {
      // If in PRESENTER_QA_MODE mode and we go to silence, we need to restart the composition timer
      // to remove composition (if it was there) only after the configured time has passed.
      if (PRESENTER_QA_MODE && !webrtc_mode) restartCompositionTimer();
      // even if not in PRESENTER_QA_MODE , if presenterTrack is turned on, we do not want to show anyd side by side mode!
    }
    else {

      if (overviewShowDouble) {
        if (!webrtc_mode) { //only compose if not in webrtc mode (not supported). Otherwise, just use preset 30
          let sourceDict = { ConnectorId: [0, 0] }; // just initializing
          //connectorDict["ConnectorId"]=OVERVIEW_DOUBLE_SOURCE_IDS;
          //console.log("Trying to use this for connector dict in recallSideBySideMode(): ", sourceDict  )
          //xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);

          config.compositions.forEach(compose => {
            if (compose.mics.includes(0)) {
              console.log(`SideBySide setting to composition = ${compose.name}`);
              if (compose.preset != 0) {
                console.log(`SideBySide setting Video Input to preset [${compose.preset}] `);
                sourceDict = { PresetId: compose.preset };
                xapi.Command.Camera.Preset.Activate(sourceDict);
              }
              else {
                // first need to remove connectors from un-selected secondaries
                let selected_connectors = []
                compose.connectors.forEach(theConnector => {
                  // only use for overview connectors that are not associated to secondary codecs or if secondary codec is selected
                  if ((!(theConnector in connector_to_codec_map)) || secondariesStatus[connector_to_codec_map[theConnector]].selected) {
                    selected_connectors.push(theConnector)
                  }
                })
                console.log(`Setting Video Input to connectors [${selected_connectors}] and Layout: ${compose.layout}`);
                sourceDict = { ConnectorId: selected_connectors, Layout: compose.layout }
                xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
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
            xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);

          }

        }
      }
      else {
        let sourceDict = { SourceID: '0' };
        sourceDict["SourceID"] = OVERVIEW_SINGLE_SOURCE_ID.toString();
        console.log("Trying to use this for source dict in recallSideBySideMode(): ", sourceDict)
        xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
        lastSourceDict = sourceDict;
        pauseSpeakerTrack();
        xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
      }


      // send side_by_side message to secondary codecs if in combined mode
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY && roomCombined) {
        await sendIntercodecMessage('side_by_side');
      }

      lastActiveHighInput = 0;
      lowWasRecalled = true;
    }
    if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
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
  if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  //resumeSpeakerTrack(); // we do not want to leave background mode on
}

async function recallQuadCam() {
  console.log("Recalling QuadCam after manually exiting PresenterTrack mode....")
  pauseSpeakerTrack();
  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
  //let currentSTCameraID = QUAD_CAM_ID; 
  let currentSTCameraID = await xapi.Status.Cameras.SpeakerTrack.ActiveConnector.get(); //TODO: Test if it obtains the correct camera ID
  console.log('In recallQuadCam Obtained currentSTCameraID as: ', currentSTCameraID)
  let connectorDict = { SourceId: currentSTCameraID }; xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
  lastSourceDict = connectorDict;
  if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
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
  if (ALLOW_PRESENTER_QA_MODE) {
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

  if (presenterTrackConfigured && ALLOW_PRESENTER_QA_MODE) {
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
  if (event.Source.Id == 'localhost') {
    // we are evaluating a local event, first check to see if from the USB Mode macro
    if (usb_mode_reg.test(event.App)) {
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
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
            usb_mode = true;
            // always tell the other codec when your are in or out of a call
            await sendIntercodecMessage('CALL_CONNECTED');
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
    switch (event.App) { //Based on the App (Macro Name), I'll run some code
      case 'divisible_room':
        console.warn("Received from other codec: ", event.Value)
        if (event.Type == 'Error') {
          console.error(event)
        } else {
          switch (event.Value) {
            case 'VTC-1_OK':
              handleCodecOnline(event.Source?.IPv4);
              break;
            case 'VTC-1_status':
              handleMacroStatusResponse();
              break;
            case 'VTC_KA_OK':
              priHandleKeepAliveResponse(event.Source?.IPv4);
              break;
            case 'VTC_KA_req':
              secSendKeepAliveResponse();
              break;

            case 'side_by_side':
              if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY)) {
                console.log('Handling side by side on secondary');
                deactivateSpeakerTrack();
                xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
              }
              break;
            case 'automatic_mode':
              if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY)) {
                // handle request to keep speakertrack on from primary to secondary
                console.log('Turning back on SpeakerTrack on secondary');
                activateSpeakerTrack();
              }
              break;
            case 'CALL_CONNECTED':
              if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY)) {
                // if we are the secondary codec, this event came from primary
                // If primary is in a call, we need to turn on vuMeters just to make sure the mute LEDs show
                // start VuMeter monitoring
                console.log("Turning on VuMeter monitoring...")
                for (var i in config.monitorMics) {
                  xapi.command('Audio VuMeter Start', {
                    ConnectorId: config.monitorMics[i],
                    ConnectorType: 'Microphone',
                    IntervalMs: 500,
                    Source: 'AfterAEC'
                  });
                }
              }
              if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
                // if we are the primary codec, this event came from secondary
                // we need to keep track when secondary room is in a call 
                // in a variable in the primary to not join or combine
                // while in that state
                console.log("Secondary in call, setting variable...")
                //secondaryInCall=true;  
                if (event.Source.IPv4 in secondariesStatus)
                  secondariesStatus[event.Source.IPv4].inCall = true;
                else
                  console.warn(`Attempted to set inCall value for secondariesStatus object with key ${event.Source.IPv4} which does not exist.`)

                evalCustomPanels();
              }

              break;
            case 'CALL_DISCONNECTED':
              if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY)) {
                // Turn vuMeters back off
                console.log("Stopping all VuMeters...");
                xapi.Command.Audio.VuMeter.StopAll({});
              }
              if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
                // if we are the primary codec, this event came from secondary
                // we need to keep track when secondary room is no longer in a call 
                // in a variable in the primary to allow join or combine
                // while in that state
                console.log("Secondary not in call, setting variable...")
                //secondaryInCall=false;
                if (event.Source.IPv4 in secondariesStatus)
                  secondariesStatus[event.Source.IPv4].inCall = false;
                else
                  console.warn(`Attempted to set inCall value for secondariesStatus object with key ${event.Source.IPv4} which does not exist.`)

                evalCustomPanels();
              }
              break;
            case 'PRESENTATION_PREVIEW_STARTED':
              if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
                // if we are the primary codec, this event came from secondary
                // we need to keep track when secondary room is in presentation preview 
                // in a variable in the primary to not join or combine
                // while in that state
                console.log("Secondary in presentation preview, setting variable...")
                if (event.Source.IPv4 in secondariesStatus)
                  secondariesStatus[event.Source.IPv4].inPreview = true;
                else
                  console.warn(`Attempted to set inPreview value for secondariesStatus object with key ${event.Source.IPv4} which does not exist.`)
                evalCustomPanels();
              }
              break;
            case 'PRESENTATION_PREVIEW_STOPPED':
              if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
                // if we are the primary codec, this event came from secondary
                // we need to keep track when secondary room is in presentation preview 
                // in a variable in the primary to not join or combine
                // while in that state
                console.log("Secondary in no longer in preview, setting variable...")
                if (event.Source.IPv4 in secondariesStatus)
                  secondariesStatus[event.Source.IPv4].inPreview = false;
                else
                  console.warn(`Attempted to set inPreview value for secondariesStatus object with key ${event.Source.IPv4} which does not exist.`)
                evalCustomPanels();
              }
              break;
            case 'COMBINE':
              if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY && secondarySelected) {
                setCombinedMode(true); // Stores status to permanent storage
                displayWarning();
                console.log('Secondary received command to combine');
                secondaryCombinedMode();
              }
              break;
            case 'DIVIDE':
              if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY && secondarySelected) {
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
              processSecSelectedAck(event.Source?.IPv4);
              break;
            case 'SEC_REMOVED_ACK':
              processSecUnselectedAck(event.Source?.IPv4);
              break;
            case 'MUTE':
              xapi.command('Audio Microphones Mute');
              break;
            case 'UNMUTE':
              xapi.command('Audio Microphones Unmute');
              break;
            case 'STANDBY_ON':
              xapi.command('Standby Activate');
              break;
            case 'STANDBY_OFF':
              xapi.command('Standby Deactivate');
              break;
            case 'STANDBY_HALFWAKE':
              xapi.command('Standby Halfwake');
              break;

            default:
              break;
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
  /*
  for (const keyIP in otherCodec)
    if (otherCodec[keyIP] != '') {
      otherCodec[keyIP].status(message).passIP().queue().catch(e => {
        console.log('Error sending message');
      });
    }
    */
  await otherCodecs.status(message).passIP().queue().catch(e => {
    console.log('Error sending message');
  });
}

async function sendSelectionMessage(secIP, message) {
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

/////////////////////////////////////////////////////////////////////////////////////////
// OTHER FUNCTIONAL HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////


function handleExternalController(macroEvent) {
  console.log(`Issuing commands for external controller when macro initiates or detects: ${macroEvent}`)
  localCallout.command(macroEvent).post()
}

xapi.Event.PresentationStarted.on(value => {
  console.log(value)
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY)
    handleExternalController('PRIMARY_PRESENTATION_STARTED');
  else
    handleExternalController('SECONDARY_PRESENTATION_STARTED');

});

xapi.Event.PresentationStopped.on(value => {
  console.log(value);
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY)
    handleExternalController('PRIMARY_PRESENTATION_STOPPED');
  else
    handleExternalController('SECONDARY_PRESENTATION_STOPPED');
});

xapi.Event.PresentationPreviewStopped.on(value => {
  console.log(value);
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY)
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

/////////////////////////////////////////////////////////////////////////////////////////
// VARIOUS TIMER HANDLER FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function startSideBySideTimer() {
  if (sideBySideTimer == null) {
    allowSideBySide = false;
    sideBySideTimer = setTimeout(onSideBySideTimerExpired, SIDE_BY_SIDE_TIME);
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
    InitialCallTimer = setTimeout(onInitialCallTimerExpired, INITIAL_CALL_TIME);
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
    qaCompositionTimer = setTimeout(onCompositionTimerExpired, PRESENTER_QA_KEEP_COMPOSITION_TIME)
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
  if (PRESENTER_QA_MODE && !webrtc_mode && presenterTracking) {
    if (!PRESENTER_QA_AUDIENCE_MIC_IDS.includes(lastActiveHighInput)) {
      // restore single presentertrackview because the person still speaking
      // is not an audience member and the timer has expired (could also be due to silence)
      recallFullPresenter();
    }
  }
}

function startNewSpeakerTimer() {
  if (newSpeakerTimer == null) {
    allowNewSpeaker = false;
    newSpeakerTimer = setTimeout(onNewSpeakerTimerExpired, NEW_SPEAKER_TIME);
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
    if (manual_mode) startAutomation();

  }
  else {
    //if (macroTurnedOffST) {macroTurnedOffST=false;}
    //else {stopAutomation();}
    if (!manual_mode /*&& !inSideBySide*/) stopAutomation();
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

  if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
    if (primaryInCall || primaryInPreview) {
      xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'panel_combine_split' });
      xapi.Command.UserInterface.Extensions.Panel.Remove({ PanelId: 'room_combine_PIN' });
    } else {
      // Add CUSTOM PANEL
      if (USE_WALL_SENSOR) {
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

  /*
  // register event handlers for local events
  xapi.Status.Standby.State.on(value => {
    console.log(value);
    if (roomCombined) {
      if (value == "Off") handleWakeUp();
      if (value == "Standby") handleShutDown();
    }
  });
*/

  // register handler for Call Successful
  xapi.Event.CallSuccessful.on(async () => {

    console.log("Starting new call timer...");
    //webrtc_mode=false; // just in case we do not get the right event when ending webrtc calls
    await startAutomation();
    recallSideBySideMode();
    startInitialCallTimer();

    // always tell the other codec when your are in or out of a call
    await sendIntercodecMessage('CALL_CONNECTED');
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
        startInitialCallTimer();

        // always tell the other codec when your are in or out of a call
        await sendIntercodecMessage('CALL_CONNECTED');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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


  // register to keep track of when PresenterTrack is active or not
  xapi.Status.Cameras.PresenterTrack.Status.on(value => {
    console.log('Received PT status as: ', value)
    lastSourceDict = { SourceID: '0' }; // forcing a camera switch
    if (value === 'Follow' || value === 'Persistent') {
      presenterTracking = true;
      if (PRESENTER_QA_MODE && !webrtc_mode) {
        //showPTPanelButton();
        //recallFullPresenter();
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
    if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
      overviewShowDouble = true;
      let thePresetCamID = await getPresetCamera(30);

    }
    else if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY) {
      // stop automation in case it was on
      stopAutomation();
    }
  }



  // Stop any VuMeters that might have been left from a previous macro run with a different config.monitorMics constant
  // to prevent errors due to unhandled vuMeter events.
  xapi.Command.Audio.VuMeter.StopAll({});
  let enabledGet = await xapi.Config.Cameras.PresenterTrack.Enabled.get()
  presenterTrackConfigured = (enabledGet == 'True') ? true : false;
  addCustomAutoQAPanel();

  // turn off speakertrack to get started
  deactivateSpeakerTrack();
}


async function init() {
  console.log('init');
  if (!await validate_config()) disableMacro("invalid config")

  // make sure Preset 30 exists, if not create it with just an overview shot of camera ID 1 which should be the QuadCam
  checkOverviewPreset();

  await GMM.memoryInit();

  await GMM.write.global('JOIN_SPLIT_CONFIG', JOIN_SPLIT_CONFIG).then(() => {
    console.log({ Message: 'Init', Action: 'Join Split config stored.' })
  });

  if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
    roomCombined = await GMM.read.global('JoinSplit_combinedState').catch(async e => {
      //console.error(e);
      console.log("No initial JoinSplit_combinedState global detected, creating one...")
      await GMM.write.global('JoinSplit_combinedState', false).then(() => {
        console.log({ Message: 'Init', Action: 'Combined state stored.' })
      })
      return false;
    })
  } else { // Here for when in secondary codec
    if (!USE_GPIO_INTERCODEC) { // When not using GPIO cable, we have to rely on permanent storage value in secondary as well
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
        usb_mode = true;
        // always tell the other codec when your are in or out of a call
        await sendIntercodecMessage('CALL_CONNECTED');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_PRIMARY) {
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

  if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {

    if (USE_WALL_SENSOR) {
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
    primaryInitPartitionSensor();

    //setTimeout(setPrimaryGPIOconfig, 1000);
    //primaryStandaloneMode();

    // start sensing changes in PIN 4 to switch room modes. This can be set by wall sensor
    // or custom touch10 UI on PRIMARY codec
    primaryInitModeChangeSensing();

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
    if (USE_GPIO_INTERCODEC) {
      secondaryInitModeChangeSensing();
      secondaryStandbyControl();
      secondaryMuteControl();
    }
    secondaryListenToStandby();
    checkCombinedStateSecondary();
    if (!USE_GPIO_INTERCODEC) {
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
      if (!at_least_one_selected) { //TODO: Test this
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
          if (USE_GPIO_INTERCODEC) setGPIOPin4ToLow(); else primaryTriggerCombine();

        }
        else if (event.Value === 'off') {
          if (USE_GPIO_INTERCODEC) setGPIOPin4ToHigh(); else primaryTriggerDivide();
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
              deactivateSpeakerTrack();
              presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
              connectorDict = { ConnectorId: presenterSource };
              xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
              lastSourceDict = connectorDict;
              if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
              xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Persistent' });
              PRESENTER_QA_MODE = false;
              break;

            case '3':
              console.log('QA Mode');
              console.log("Turning on PresenterTrack with QA Mode...");
              if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
              activateSpeakerTrack(); //TODO: test if not activating speakertrack here when you have an SP60 allows it to work in QA mode
              //pauseSpeakerTrack();
              presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
              connectorDict = { ConnectorId: presenterSource };
              xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
              lastSourceDict = connectorDict;
              xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Persistent' });
              pauseSpeakerTrack();
              if (webrtc_mode && !isOSEleven) setTimeout(function () { xapi.Command.Video.Input.MainVideo.Unmute() }, WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

              PRESENTER_QA_MODE = true;
              //resumeSpeakerTrack();
              break;

          }
      }
      else {
        console.log("PresenterTrack not configured!!!");
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
      if (COMBINE_CONTROL_PIN != '') {
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
          case COMBINE_PIN:
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
              if (USE_GPIO_INTERCODEC) setGPIOPin4ToLow(); else primaryTriggerCombine();
              setCombinedMode(true);
              // once they manually set the combined/join state, we must 
              // store the override state in persistent memory
              setWallSensorOverride(true);
            }
            break;

          case SPLIT_PIN:
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
              if (USE_GPIO_INTERCODEC) setGPIOPin4ToHigh(); else primaryTriggerDivide();
              setCombinedMode(false);
              // once they manually set the combined/join state, we must 
              // store the override state in persistent memory
              setWallSensorOverride(true);
            }
            break;

          case FIXED_SENSOR:
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE === JS_PRIMARY) {
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
      if (event.Text == COMBINE_CONTROL_PIN) {
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
        if (USE_GPIO_INTERCODEC) setGPIOPin2ToLow(); else await sendIntercodecMessage("MUTE");
      }
      else if (value === 'Off') {
        if (USE_GPIO_INTERCODEC) setGPIOPin2ToHigh(); else await sendIntercodecMessage("UNMUTE");
      }
    }
  });
}

function primaryListenToStandby() {
  xapi.Status.Standby.State.on(async (state) => {
    console.log("Standby State: " + state);
    if (state === 'Standby') {
      if (roomCombined === true) {
        if (USE_GPIO_INTERCODEC) setGPIOPin3ToLow(); else await sendIntercodecMessage("STANDBY_ON");
      }
    }
    else if (state === 'Off') {
      // Need to turn off automation when coming out of standby since that seems to turn back on
      // speakertrack which in turn turns on automation
      stopAutomation();
      if (roomCombined === true) {
        if (USE_GPIO_INTERCODEC) setGPIOPin3ToHigh(); else await sendIntercodecMessage("STANDBY_OFF");
      }
    }
    else if (state === 'Halfwake') {
      if (roomCombined === true) {
        if (!USE_GPIO_INTERCODEC) await sendIntercodecMessage("STANDBY_HALFWAKE");
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
      xapi.command('Standby Activate');
    }
    else if (state.State === 'High') {
      xapi.command('Standby Deactivate');
      stopAutomation();
    }
  });
}

function secondaryMuteControl() {
  xapi.status.on('GPIO Pin 2', (state) => {
    console.log(`GPIO Pin 2[${state.id}] State went to: ${state.State}`);
    if (state.State === 'Low') {
      xapi.command('Audio Microphones Mute')
    }
    else if (state.State === 'High') {
      xapi.command('Audio Microphones Unmute ')
    }
  });
}


/////////////////////////////////////////////////////////////////////////////////////////
// SWITCH BETWEEN COMBINED AND STANDALONE
/////////////////////////////////////////////////////////////////////////////////////////

async function primaryCombinedMode() {
  handleExternalController('PRIMARY_COMBINE');

  xapi.config.set('Audio Input Microphone 8 Mode', 'On')
    .catch((error) => { console.error(error); });
  xapi.config.set('Conference FarEndControl Mode', 'Off')
    .catch((error) => { console.error("32" + error); });

  if (primarySingleScreen)
    xapi.config.set('Audio Output HDMI 2 Mode', 'On')
      .catch((error) => { console.error("47" + error); });

  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); });

  if (USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS) {
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Pan
      .set(COMBINED_PRESENTERTRACK_SETTINGS.PAN);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Tilt
      .set(COMBINED_PRESENTERTRACK_SETTINGS.TILT);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Zoom
      .set(COMBINED_PRESENTERTRACK_SETTINGS.ZOOM);
    xapi.Config.Cameras.PresenterTrack.TriggerZone
      .set(COMBINED_PRESENTERTRACK_SETTINGS.TRIGGERZONE);
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

  xapi.config.set('Audio Input Microphone 8 Mode', 'Off')
    .catch((error) => { console.error(error); });
  xapi.config.set('Conference FarEndControl Mode', 'On')
    .catch((error) => { console.error("32" + error); });

  if (primarySingleScreen)
    xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
      .catch((error) => { console.error("48" + error); });

  if (USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS) {
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Pan
      .set(SPLIT_PRESENTERTRACK_SETTINGS.PAN);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Tilt
      .set(SPLIT_PRESENTERTRACK_SETTINGS.TILT);
    xapi.Config.Cameras.PresenterTrack.CameraPosition.Zoom
      .set(SPLIT_PRESENTERTRACK_SETTINGS.ZOOM);
    xapi.Config.Cameras.PresenterTrack.TriggerZone
      .set(SPLIT_PRESENTERTRACK_SETTINGS.TRIGGERZONE);
  }

  // perform switcher code actions when room is split on primary
  overviewShowDouble = false;
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
  xapi.config.set('Audio Output Line 5 Mode', 'Off')
    .catch((error) => { console.error(error); });
  //xapi.config.set('Audio Input HDMI 3 Mode', 'Off')
  // .catch((error) => { console.error("5" + error); });
  xapi.Config.Audio.Input.HDMI[JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID].Mode.set('Off')
    .catch((error) => { console.error("5" + error); });;

  /*
SET ultrasound volume to stored value
SET halfwakd mode to stored value
SET WeakuOnMotionDetect to stored value
*/

  // decrease main volume by 5Db since it was increased by the same when combining rooms
  if (SECONDARY_COMBINED_VOLUME_CHANGE_STEPS > 0) xapi.Command.Audio.Volume.Decrease({ Steps: SECONDARY_COMBINED_VOLUME_CHANGE_STEPS });
  if (SECONDARY_COMBINED_VOLUME_CHANGE_STEPS == 0 && SECONDARY_COMBINED_VOLUME_STANDALONE > 0) xapi.Command.Audio.Volume.Set({ Level: SECONDARY_COMBINED_VOLUME_STANDALONE });

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
  roomCombined = true;
  await xapi.Command.Standby.Deactivate(); // take out of standby to avoid problems in later versions of RoomOS 11.x
  await delay(5000); // give some time to get out of standby

  handleExternalController('SECONDARY_COMBINE');

  if (!isOSEleven)
    xapi.config.set('UserInterface OSD Mode', 'Unobstructed')
      .catch((error) => { console.error("91" + error); });
  xapi.config.set('Audio Output Line 5 Mode', 'On')
    .catch((error) => { console.error(error); });

  //xapi.config.set('Audio Input HDMI 3 Mode', 'On')
  //.catch((error) => { console.error("5" + error); });
  xapi.Config.Audio.Input.HDMI[JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID].Mode.set('On')
    .catch((error) => { console.error("5" + error); });

  xapi.Command.Video.Selfview.Set({ Mode: 'Off' });

  // increase main volume by 5db, will decrease upon splitting again
  if (SECONDARY_COMBINED_VOLUME_CHANGE_STEPS > 0) xapi.Command.Audio.Volume.Increase({ Steps: SECONDARY_COMBINED_VOLUME_CHANGE_STEPS });
  if (SECONDARY_COMBINED_VOLUME_CHANGE_STEPS == 0 && SECONDARY_COMBINED_VOLUME_COMBINED > 0) xapi.Command.Audio.Volume.Set({ Level: SECONDARY_COMBINED_VOLUME_COMBINED });


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

  if (JoinSplit_secondary_settings.VideoMonitors == 'Single' && JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID == 2) {
    xapi.Config.Video.Monitors.set('Dual');
  }
  else {
    xapi.Config.Video.Monitors.set('Triple');

  }

  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); });

  xapi.command('Video Matrix Assign', { Output: JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: 1 }).catch((error) => { console.error(error); });
  xapi.command('Video Matrix Assign', { Output: 1, SourceID: JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID }).catch((error) => { console.error(error); });
  if (JoinSplit_secondary_settings.VideoMonitors == 'Dual' || JoinSplit_secondary_settings.VideoMonitors == 'DualPresentationOnly') {
    xapi.command('Video Matrix Assign', { Output: 2, SourceID: JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID }).catch((error) => { console.error(error); });
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
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY && roomCombined) {
    xapi.Command.Conference.DoNotDisturb.Activate({ Timeout: 1440 });
  }
})

xapi.Status.Cameras.SpeakerTrack.ActiveConnector.on(value => {
  console.log('New Camera connector: ', value);
  ST_ACTIVE_CONNECTOR = parseInt(value);
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE == JS_SECONDARY && roomCombined) {
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
    xapi.command('Video Matrix Assign', { Output: JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: sourceIDtoMatrix }).catch((error) => { console.error(error); });
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
  let macro = module.name.split('./')[1]
  await xapi.Command.UserInterface.Message.Alert.Display({
    Title: message.Error,
    Text: message.Message,
    Duration: 30
  })
  console.error(message)
  await xapi.Command.Macros.Macro.Deactivate({ Name: macro })
  await xapi.Command.Macros.Runtime.Restart();
}




/////////////////////////////////////////////////////////////////////////////////////////
// INVOCATION OF INIT() TO START THE MACRO
/////////////////////////////////////////////////////////////////////////////////////////

init();

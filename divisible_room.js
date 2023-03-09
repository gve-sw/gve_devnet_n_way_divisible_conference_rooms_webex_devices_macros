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

import xapi from 'xapi';
import { GMM } from './GMM_Lib'

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ This is the standalone versions of the join/split macro module meant to work together with the Switcher 
and future Ducker and USBMode modules via events on the same codec and across codecs with the GMM library.
+ Communications needed between Primary and Secondary codecs to keep the codec awake and set the correct 
+ video layouts is delegated to the VoiceSwitch macros that should be installed and configured on the corresponding rooms 
+ IMPORTANT: Turn on the JoinSplit macro on the Primary codec before turning it on in Secondary to give the macro a chance
+ to set PIN 4 to the correct Join/Split state according to what is stored in permanent storage.
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

const minOS10Version='10.17.1.0';
const minOS11Version='11.2.1.0';

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

// The JOIN_SPLIT_ROOM_ROLE const tells the macro in the particular codec it is running
// what role it should play; JS_PRIMARY or JS_SECONDARY
const JS_PRIMARY=1, JS_SECONDARY=2, JS_NONE=0

// In this section, write in the values for the constants below.
// For ROOM_ROLE fill in either JS_PRIMARY or JS_SECONDARY as the value.
// If you wired your rooms different from what is indicated in the Version_3_Two-way_System_Drawing.pdf document
// you can modify the  SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID
// SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID and SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID constants
// to match your setup. 
// For PRIMARY_CODEC_IP enter the IP address for the Primary Codec. 
const JOIN_SPLIT_CONFIG = {
  ROOM_ROLE : JS_PRIMARY,
  SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID: 3, // change only for non-standard singe screen setups
  SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID: 3, // change only for non-standard singe screen setups
  SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID: 4, // change only for non-standard singe screen setups
  PRIMARY_CODEC_IP : '10.0.0.100'
}

// If you fill out the OTHER_CODEC_USERNAME and OTHER_CODEC_PASSWORD with the credentials to be able to log
// into the the Secondary codec (if configuring Primary) or Primary codec (if configuring Secondary)
// they will be used to establish an HTTP connection with that other codec, but these credentials will be
// stored clear text in the macro. 
// Instructions for creating these admin accounts are in the "Installation Instructions" document.
const OTHER_CODEC_USERNAME='';
const OTHER_CODEC_PASSWORD='';




/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 
+ Only for use on PRIMARY Codec (i.e set ROOM_ROLE : JS_PRIMARY above, then fill this section
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


// USE_WALL_SENSOR controls if you use a physical wall sensor or not
// If set to false, you will get a custom panel to manually switch rooms from join to split
// If set to true, you will get a PIN protected override button, in case the wall sensor is broken
// and you need to override manually
const USE_WALL_SENSOR=false

// WALL_SENSOR_COMBINED_STATE shoud contain the state of PIN 1 when the rooms is
// combined. This could be 'High' or 'Low' depending on how the sensor is wired 
const WALL_SENSOR_COMBINED_STATE='Low'

/*
  If you set USE_WALL_SENSOR to true above, you can
  change the override protect PINs here if needed.
*/
const COMBINE_PIN = "1234";
const SPLIT_PIN = "4321";
const FIXED_SENSOR="5678";


// USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS speficies if different settings should be used for presentertrack on primary codec
// for combined and split modes. If set to true, you must modify the settings for presentertrack to use for each scenario in the 
// SPLIT_PRESENTERTRACK_SETTINGS and COMBINED_PRESENTERTRACK_SETTINGS object constants below. 
// Instructions on how setup and to obtain the settings from the primary codec can be found in 
// the "How_to_Setup_Two-PresenterTrack_Zones.pdf" document in the same repository for this macro. 
const USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS=false;
const SPLIT_PRESENTERTRACK_SETTINGS = {
  PAN : -1000,
  TILT: -309,
  ZOOM: 4104,
  TRIGGERZONE: '0,95,400,850'
} //Replace these placeholder values with your actual values.
const COMBINED_PRESENTERTRACK_SETTINGS = {
  PAN : -1378,
  TILT: -309,
  ZOOM: 4104,
  TRIGGERZONE: '0,89,549,898'
} //Replace these placeholder values with your actual values.


// CHK_VUMETER_LOUDSPEAKER specifies if we check the LoudspeakerActivity flag from the VuMeter events
// to ignore any microphone activity while the loudspeakers are active to reduce the possibility of
// switching due to sound coming in from remote participants in the meeting if the AfterAEC setting
// is not being effective. Set to true to perform the check for each microphone activity event. 
const CHK_VUMETER_LOUDSPEAKER=false;

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 +
+ Only for use on SECONDARY Codec (i.e set ROOM_ROLE : JS_SECONDARY above, then fill this section
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


// Change SECONDARY_COMBINED_VOLUME_CHANGE_STEPS if you want to adjust the volume on the secondary
// codec when switching modes. Each step is equivalent to a 0.5 dB change. 
const SECONDARY_COMBINED_VOLUME_CHANGE_STEPS=10


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
  compositions: [     // Create your array of compositions, not needed if codec is secondary 
    {
      name: 'RoomMain',     // Name for your composition
      codecIP: JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP,
      mics: [1, 2, 3],             // Mics you want to associate with this composition
      connectors: [1],    // Video input connector Ids to use
      source: JS_PRIMARY,
      layout: 'Prominent',       // Layout to use
      preset: 0 // use a camera preset instead of a layout with specific connectors.
    },
    {
      name: 'RoomSecondaryRight',     // Name for your composition
      codecIP: '10.0.0.100',
      mics: [8],
      connectors: [2],
      source: JS_SECONDARY,
      layout: 'Prominent',       // Layout to use
      preset: 0 // use a camera preset instead of a layout with specific connectors.
    },
    {
      name: 'RoomSecondaryLeft',     // Name for your composition
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
      connectors: [3,1,2], // Specify here the video inputs and order to use to compose the "side by side" view
      source: JS_NONE,
      layout: 'Equal',       // Layout to use
      preset: 0 // use a camera preset instead of a layout with specific connectors.
    }
  ]
}

// Validate config settings
async function validate_config()
{
  let hasOverview=true;

  if (OTHER_CODEC_USERNAME==''|| OTHER_CODEC_PASSWORD=='') 
      await disableMacro(`config validation fail: OTHER_CODEC credentials must be set.  Current values: OTHER_CODEC_USERNAME: ${OTHER_CODEC_USERNAME} OTHER_CODEC_PASSWORD= ${OTHER_CODEC_PASSWORD}`); 
 
  let allowedMics=[1,2,3,4,5,6,7,8];
  // only allow up to 8 microphones
  if (config.monitorMics.length>8 || config.monitorMics.length<1) 
    await disableMacro(`config validation fail: config.monitorMics can only have between 1 and 8 entries. Current value: ${config.MonitorMics} `); 

  // make sure the mics are within those specified in the monitorMics array
  if (!config.monitorMics.every(r => allowedMics.includes(r))) 
    await disableMacro(`config validation fail: config.monitorMics can only have mic ids 1-8. Current value: ${config.monitorMics} `); 

  // check for duplicates in config.monitorMics
  if (new Set(config.monitorMics).size!== config.monitorMics.length) 
    await disableMacro(`config validation fail: config.monitorMics cannot have duplicates. Current value: ${config.monitorMics} `); 

  // Check for falid audience mics configured for the Presenter QA Mode feature
  if (ALLOW_PRESENTER_QA_MODE)
          if (!PRESENTER_QA_AUDIENCE_MIC_IDS.every(r => config.monitorMics.includes(r))) 
            await disableMacro(`config validation fail: PRESENTER_QA_AUDIENCE_MIC_IDS can only specify values contained in config.monitorMics . Current values config.monitorMics: ${config.monitorMics} PRESENTER_QA_AUDIENCE_MIC_IDS: ${PRESENTER_QA_AUDIENCE_MIC_IDS}`); 

  // if running in secondary codec make sure we have a valid IP address for the primary codec
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY) {
    if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP)) 
      await disableMacro(`config validation fail: Invalid IP address configured to talk to primary codec: ${JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP} `); 
    
  }
  else {
     hasOverview=false;
    // add value 0 to allowedMics array to include overview composition
    allowedMics=[0,1,2,3,4,5,6,7,8];
    // now let's check each composition
    for (let i=0; i<config.compositions.length;i++)
    {
      let compose=config.compositions[i];
      // make sure each composition is marked JS_PRIMARY or JS_SECONDARY
      if (![JS_PRIMARY, JS_SECONDARY, JS_NONE].includes(compose.source)) await disableMacro(`config validation fail: composition named ${compose.name} should have a valid value for key 'source' (JS_PRIMARY, JS_SECONDARY or JS_NONE).`); 

      // make sure if JS_SECONDARY source, then there is a real IP address configured
      if (compose.source==JS_SECONDARY)
        if (!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(compose.codecIP)) 
          await disableMacro(`config validation fail: Invalid IP address for composition ${compose.name}: ${compose.codecIP} `); 

        // only allow up to 8 mics and at least 1 specified for each composition
        if (compose.mics.length>8 || compose.mics.length<1) 
          await disableMacro(`config validation fail: mics for each composition can only have between 1 and 8 entries. Current value: ${compose.mics} `); 

        // make sure the mics are within those specified in the monitorMics array, plus 0 for overview
        if (!compose.mics.every(r => allowedMics.includes(r))) 
          await disableMacro(`config validation fail: mics for each composition can only have mic ids 0-8. Current value: ${compose.mics} `); 

      // keep track that we have at least one composition with mics [0] to check at the end and that it is JS_PRIMARY sourced
      if (JSON.stringify(compose.mics)==JSON.stringify([0]) && compose.source==JS_NONE) hasOverview=true;
    }

    // check that there was at least one Overview composition with mics==[0]
    if (!hasOverview) 
      await disableMacro('config validation fail: no overview composition configured or it does not have source set to JS_NONE'); 
  }
  // all went well, can return true!
  return true;
}



// This macro supports one QuadCam or one SpeakerTrack 60 camera array on each the Primary or
// secondary comment. Please specify below which one you are using and, if using the SP60 camera array,
// specify in constant OVERVIEW_SINGLE_SOURCE_ID connector correspond to one of the 2 cameras to use for 
// when showing an overview of the room. If using a QuadCam the value of OVERVIEW_SINGLE_SOURCE_ID should match 
// the connector ID where the camera is connected. 
const QUAD_CAM_ID=1; // set to 0 if using SP60
const SP60_CAM_LEFT_ID=0; // set to 0 if using QuadCam
const SP60_CAM_RIGHT_ID=0; // set to 0 if using QuadCam
const OVERVIEW_SINGLE_SOURCE_ID = 1;

// In RoomOS 11 there are multiple SpeakerTrack default behaviors to choose from on the navigator or
// Touch10 device. Set ST_DEFAULT_BEHAVIOR to the one you want this macro to use from these choices:
// Auto: The same as BestOverview.
// BestOverview: The default framing mode is Best overview. 
// Closeup: The default framing mode is Closeup (speaker tracking). 
// Current: The framing mode is kept unchanged when leaving a call. 
// Frames: The default framing mode is Frames.
const ST_DEFAULT_BEHAVIOR='Closeup'


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
const WEBRTC_VIDEO_UNMUTE_WAIT_TIME=1500;

// Microphone High/Low Thresholds
const MICROPHONELOW  = 6;
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
const PRESENTER_QA_AUDIENCE_MIC_IDS=[1,2]


// PRESENTER_QA_KEEP_COMPOSITION_TIME is the time in ms that the macro will keep sending
// a composed image of the presenter and an audience member asking a question after the question
// has been asked by any audience member. If different audience members ask questions while the composition 
// is being shown after NEW_SPEAKER_TIME milliseconds have passed, the composition will change 
// to use that new audience member instead of the original. This will continue until no other audience members have
// spoken for PRESENTER_QA_KEEP_COMPOSITION_TIME milliseconds and then the code will resume sending only the 
// full video feed from the Presenter camera 
const PRESENTER_QA_KEEP_COMPOSITION_TIME =7000  


/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ DO NOT EDIT ANYTHING BELOW THIS LINE                                  +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

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



const PANEL_room_combine_PIN=`<Extensions><Version>1.8</Version>
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

const PANEL_panel_combine_split=`<Extensions><Version>1.8</Version>
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
      <Name>Room combine</Name>
      <Type>Text</Type>
      <Options>size=2;fontSize=normal;align=center</Options>
    </Widget>
    <Widget>
      <WidgetId>widget_toggle_combine</WidgetId>
      <Type>ToggleButton</Type>
      <Options>size=1</Options>
    </Widget>
  </Row>
  <Options>hideRowNames=1</Options>
</Page>
</Panel>          
</Extensions>`;

// Join/Combine, Mute and Standby status communication between primary and secondary for 
// is happening via GPIO Pins but the otherCodec object is used for all other events.

//Declare your object for GMM communication
var otherCodec={};

//Run your init script asynchronously 
async function init_intercodec() {
if (OTHER_CODEC_USERNAME!='' && OTHER_CODEC_PASSWORD!='') 
 if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
  config.compositions.forEach(compose =>{
    if(compose.codecIP!='' && compose.codecIP!=JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP){
      console.log(`Setting up connection to secondary codec with IP ${compose.codecIP}`);
      otherCodec[compose.codecIP] = new GMM.Connect.IP( OTHER_CODEC_USERNAME, OTHER_CODEC_PASSWORD, compose.codecIP)
    }
  })
  else
    otherCodec[JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP] = new GMM.Connect.IP( OTHER_CODEC_USERNAME, OTHER_CODEC_PASSWORD, JOIN_SPLIT_CONFIG.PRIMARY_CODEC_IP)
   
  
}

const localCallout = new GMM.Connect.Local(module.name.replace('./', ''))

/////////////////////////////////////////////////////////////////////////////////////////
// VARIABLES
/////////////////////////////////////////////////////////////////////////////////////////


// roomCombined keeps the current state of join/split for the codec. It is normally also reflected in 
// permanent storage (GMMMemory macro) in the JoinSplit_combinedState global
var roomCombined = false;

// wallSensorOverride keeps the current state of the wall sensor functionality. If it is working well it is set to false
// If users detect a failure of the sensor, they will use the wall sensor override custom panel (PIN based or toggle button based)
// and from then on the macro will ignore the wall sensor input on GPIO PIN 1. 
// The value of this boolean will always be reflected in permanent storage (GMMMemory macro) in the JoinSplit_wallSensorOverride global
// Once the wall sensor is repaired, somebody with access to this macro will have to manually edit the Memory_Storage macro file and set 
// JoinSplit_wallSensorOverride to false and re-start the macro
var wallSensorOverride = false;
// below we are just initializing JoinSplit_secondary_settings, no need to fill out values
var JoinSplit_secondary_settings = {
  UltrasoundMax : 0,
  WakeupOnMotionDetection: '',
  StandbyControl : '',
  VideoMonitors : ''
}
// below we are just initializing JoinSplit_primary_settings, no need to fill out values
var JoinSplit_primary_settings = {
  VideoMonitors : ''
}

let micArrays={};
for (var i in config.monitorMics) {
    micArrays[config.monitorMics[i].toString()]=[0,0,0,0];
}
let lowWasRecalled = false;
let lastActiveHighInput = 0;
let lastSourceDict={ SourceID : '1'}
let allowSideBySide = true;
let sideBySideTimer = null;
let InitialCallTimer = null;
let allowCameraSwitching = false;
let allowNewSpeaker = true;
let newSpeakerTimer = null;
let manual_mode = true;

let micHandler= () => void 0;

let overviewShowDouble = false;
let inSideBySide=false;

let presenterTracking=false;
let presenterTrackConfigured=false;
let presenterQAKeepComposition=false;
let qaCompositionTimer=null;

let usb_mode = false;
let webrtc_mode = false;

let primaryInCall = false;
let secondaryInCall = false;
let secondaryOnline = false;

let PRESENTER_QA_MODE = false

let ST_ACTIVE_CONNECTOR=0;

let macroTurnedOnST = false;
let macroTurnedOffST = false;

let isOSTen=false;
let isOSEleven=false;




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
  const value =  await xapi.Command.Camera.Preset.Show({ PresetId: prID });
  return(value.CameraId)
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
  xapi.command('GPIO ManualState Set', {Pin2: 'High'}).catch(e=>console.debug(e));
  console.log('Pin 2 has been set to High; MUTE is inactive');
}

function setGPIOPin2ToLow() {
  xapi.command('GPIO ManualState Set', {Pin2: 'Low'}).catch(e=>console.debug(e));
  console.log('Pin 2 has been set to Low; MUTE is active');
}

function setGPIOPin3ToHigh() {
  xapi.command('GPIO ManualState Set', {Pin3: 'High'}).catch(e=>console.debug(e));
  console.log('Pin 3 has been set to High; STANDBY is inactive');
}

function setGPIOPin3ToLow() {
  xapi.command('GPIO ManualState Set', {Pin3: 'Low'}).catch(e=>console.debug(e));
  console.log('Pin 3 has been set to Low; STANDBY is active');
}

function setGPIOPin4ToHigh() {
  xapi.command('GPIO ManualState Set', {Pin4: 'High'}).catch(e=>console.debug(e));
  console.log('Pin 4 has been set to High; Rooms are Standalone');
}

function setGPIOPin4ToLow() {
  xapi.command('GPIO ManualState Set', {Pin4: 'Low'}).catch(e=>console.debug(e));
  console.log('Pin 4 has been set to Low; Rooms are Combined');
}

function setCombinedMode(combinedValue) {
    roomCombined = combinedValue;
    GMM.write.global('JoinSplit_combinedState',roomCombined).then(() => {
      console.log({ Message: 'ChangeState', Action: 'Combined state stored.' })
    })

}

function setWallSensorOverride(overrideValue) {
  wallSensorOverride = overrideValue;
  GMM.write.global('JoinSplit_wallSensorOverride',wallSensorOverride).then(() => {
    console.log({ Message: 'ChangeState', Action: 'Wall Sensor Override state stored.' })
  })

}

function getSTCameraID() {
  let theResult=1;
  if (ST_ACTIVE_CONNECTOR!=0) {
    theResult=ST_ACTIVE_CONNECTOR;
  }
  else
  { // if the codec has not reported the current active connector, we will use whatever
    // was configured in the macro for the ID of the speakertracking camera
    if (QUAD_CAM_ID!=0) theResult=QUAD_CAM_ID;
      else if (SP60_CAM_LEFT_ID!=0) theResult=SP60_CAM_LEFT_ID; // we can only guess which of the SP60 cameras is active, so try the left one first
      else if (SP60_CAM_RIGHT_ID!=0) theResult=SP60_CAM_RIGHT_ID; // of left SP60 camera not specified, we try the right one. 
      else console.warn('No speaker tracking connector IDs where specified!! Defaulting to 1') // if not thing was configured, set to one but give a warning
  }
  return theResult;
}

async function storeSecondarySettings(ultraSoundMaxValue,wState,sState) {
  JoinSplit_secondary_settings.UltrasoundMax=ultraSoundMaxValue;
  JoinSplit_secondary_settings.WakeupOnMotionDetection=wState;
  JoinSplit_secondary_settings.StandbyControl=sState;
  let currentVideoMonitors=await xapi.Config.Video.Monitors.get();
  if (currentVideoMonitors!='Triple') JoinSplit_secondary_settings.VideoMonitors=currentVideoMonitors; // only store if going from split to combined
  await GMM.write.global('JoinSplit_secondary_settings',JoinSplit_secondary_settings).then(() => {
    console.log({ Message: 'ChangeState', Action: 'secondary settings for Ultrasound, WakeupOnMotionDetection , StandbyControl and VideoMonitors stored.' })
  });
}



/**
  * This will initialize the room state to Combined or Divided based on the setting in Memory Macro (persistent storage)
**/
function initialCombinedJoinState() {
        // Change all these to whatever is needed to trigger on the Primary when it goes into combined
      if (roomCombined) {
        console.log('Primary Room is in Combined Mode');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
            primaryCombinedMode();
            setGPIOPin4ToLow();
            if (!USE_WALL_SENSOR) {
            xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'On'}); }
        }
        setCombinedMode(true);
      } else {
        console.log('Primary Room is in Divided Mode');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
            setPrimaryDefaultConfig();
            setGPIOPin4ToHigh();
        }
        setCombinedMode(false);
      }
}


/**
  * This will initialize the room state to Combined or Divided based on the Pin 4 set by Primary
**/
function checkCombinedStateSecondary() {
  Promise.all([xapi.status.get('GPIO Pin 4')]).then(promises => {
    let [pin4] = promises;
    console.log('Pin4: '+ pin4.State);
        // Change all these to whatever is needed to trigger on the Secondary when it goes into combined
      if (pin4.State === 'Low') {
        console.log('Secondary Room is in Combined Mode');
        secondaryCombinedMode();
        displayWarning();
        //setCombinedMode(true);
        roomCombined=true;
      }else {
        console.log('Secondary Room is in Divided Mode');
        secondaryStandaloneMode();
        removeWarning();
        //setCombinedMode(false);
        roomCombined=false;
        // since we are in secondary codec and in split configuration, we need to 
        // prepare to do basic switching to support PresenterTrack QA mode. 
        init_switching();
      }
  }).catch(e=>console.debug(e));
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
  * Partition Sensor
  * This will check Pin 1 and listen when the state of the pin changes
**/
function primaryInitPartitionSensor() {
  xapi.status.on('GPIO Pin 1', (state) => {
    console.log(`GPIO Pin 1[${state.id}] State went to: ${state.State}`);
    if (wallSensorOverride) {
      console.log('wallSensorOverride is set to true; ignoring Pin1 state......')
    } 
    else if (secondaryInCall) {
      xapi.command('UserInterface Message Alert Display', {
        Title: 'Cannot Combine/Split',
        Text: 'The secondary codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
        Duration: 10,
      });
    } else if (primaryInCall) {
      xapi.command('UserInterface Message Alert Display', {
        Title: 'Cannot Combine/Split',
        Text: 'This codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
        Duration: 10,
      });
    }
    else 
    {
        if (state.State === WALL_SENSOR_COMBINED_STATE) {  
            alertJoinedScreen();
            console.log('Primary Switched to Combined Mode [Partition Sensor]');
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
                primaryCombinedMode();
                setGPIOPin4ToLow();
                if (!USE_WALL_SENSOR) {
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'On'}); }
            }
            setCombinedMode(true);
        }
        else  {
            alertSplitScreen();
            console.log('Primary Switched to Divided Mode [Partition Sensor]');
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
                primaryStandaloneMode();
                //primaryCodecSendScreen();
                setGPIOPin4ToHigh();
                if (!USE_WALL_SENSOR) {
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'Off'});}
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
    .catch((error) => { console.error("1"+error); });
  xapi.config.set('Audio Input ARC 2 Mode', 'Off')
    .catch((error) => { console.error("2"+error); });
  xapi.config.set('Audio Input ARC 3 Mode', 'Off')
    .catch((error) => { console.error("3"+error); });

// HDMI AUDIO SECTION
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4"+error); });
  xapi.config.set('Audio Input HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("5"+error); });

// SET MICROPHONES
// MICROPHONES 1 THRU 7 ARE USER CONFIGURABLE

// MIC 8
// THIS IS THE INPUT FOR THE MICROPHONES FROM THE SECONDARY CODEC
xapi.config.set('Audio Input Microphone 8 Channel', 'Mono')
    .catch((error) => { console.error("6"+error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl Dereverberation', 'Off')
    .catch((error) => { console.error("7"+error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl Mode', 'On')
    .catch((error) => { console.error("8"+error); });
  xapi.config.set('Audio Input Microphone 8 EchoControl NoiseReduction', 'Off')
    .catch((error) => { console.error("9"+error); });
  xapi.config.set('Audio Input Microphone 8 Level', '18')
    .catch((error) => { console.error("10"+error); });
  xapi.config.set('Audio Input Microphone 8 Mode', 'Off')
    .catch((error) => { console.error("11"+error); });
  xapi.config.set('Audio Input Microphone 8 PhantomPower', 'Off')
    .catch((error) => { console.error("12"+error); });

// MUTE
  xapi.config.set('Audio Microphones Mute Enabled', 'True')
    .catch((error) => { console.error("13"+error); });


    


// HDMI AUDIO OUTPUT
 xapi.Config.Audio.Output.ConnectorSetup.set('Manual');

  xapi.config.set('Audio Output HDMI 1 Mode', 'On')
    .catch((error) => { console.error("15"+error); });
    // This is for embedded conference audio over to Secondary
    // It will be switched on and off on Secondary input
  xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("16"+error); });
  xapi.config.set('Audio Output HDMI 3 Mode', 'On')
    .catch((error) => { console.error("17"+error); });
    // This allows use of USB Passthrough

// CONFERENCE
  xapi.config.set('Conference AutoAnswer Mode', 'Off')
    .catch((error) => { console.error("31"+error); });


// GPIO
  xapi.config.set('GPIO Pin 1 Mode', 'InputNoAction')
    .catch((error) => { console.error("33"+error); });
  xapi.config.set('GPIO Pin 2 Mode', 'OutputManualState')
    .catch((error) => { console.error("34"+error); });
  xapi.config.set('GPIO Pin 3 Mode', 'OutputManualState')
    .catch((error) => { console.error("35"+error); });
  xapi.config.set('GPIO Pin 4 Mode', 'OutputManualState')
    .catch((error) => { console.error("36"+error); });


// PERIPHERALS
  xapi.config.set('Peripherals Profile Cameras', 'Minimum1')
    .catch((error) => { console.error("39"+error); });
  xapi.config.set('Peripherals Profile TouchPanels', 'Minimum1')
    .catch((error) => { console.error("40"+error); });

// SERIAL PORT
  xapi.config.set('SerialPort LoginRequired', 'Off')
    .catch((error) => { console.error("41"+error); });
  xapi.config.set('SerialPort Mode', 'On')
    .catch((error) => { console.error("42"+error); });


// VIDEO
  xapi.config.set('Video DefaultMainSource', '1')
    .catch((error) => { console.error("45"+error); });


// VIDEO INPUT SECTION
// HDMI INPUT 1
  xapi.config.set('Video Input Connector 1 CameraControl CameraId', '1')
    .catch((error) => { console.error("49"+error); });
  xapi.config.set('Video Input Connector 1 CameraControl Mode', 'On')
    .catch((error) => { console.error("50"+error); });
  xapi.config.set('Video Input Connector 1 InputSourceType', 'camera')
    .catch((error) => { console.error("51"+error); });
  xapi.config.set('Video Input Connector 1 Name', 'Quad Camera')
    .catch((error) => { console.error("52"+error); });
  xapi.config.set('Video Input Connector 1 PreferredResolution', '1920_1080_60')
    .catch((error) => { console.error("53"+error); });
  xapi.config.set('Video Input Connector 1 PresentationSelection', 'Manual')
    .catch((error) => { console.error("54"+error); });
  xapi.config.set('Video Input Connector 1 Quality', 'Motion')
    .catch((error) => { console.error("55"+error); });
  xapi.config.set('Video Input Connector 1 Visibility', 'Never')
  .catch((error) => { console.error("56"+error); });

// HDMI INPUT 2
// THIS IS THE PRESENTER CAMERA 



// Setting video input from secondary codecs

    config.compositions.forEach(compose =>{
      if(compose.source==JS_SECONDARY){
        compose.connectors.forEach(sourceID => { 
          console.log(`Configuring video inputs from secondary codec out of composition ${compose.name}`);
          xapi.config.set(`Video Input Connector ${sourceID} CameraControl Mode`, 'Off')
          .catch((error) => { console.error("58"+error); });
          xapi.config.set(`Video Input Connector ${sourceID} InputSourceType`, 'other')
            .catch((error) => { console.error("59"+error); });
          xapi.config.set(`Video Input Connector ${sourceID} Name`, 'Selfview Secondary')
            .catch((error) => { console.error("60"+error); });
          xapi.config.set(`Video Input Connector ${sourceID} PreferredResolution`, '1920_1080_60')
            .catch((error) => { console.error("61"+error); });
          xapi.config.set(`Video Input Connector ${sourceID} PresentationSelection`, 'Manual')
            .catch((error) => { console.error("62"+error); });
          xapi.config.set(`Video Input Connector ${sourceID} Quality`, 'Motion')
            .catch((error) => { console.error("63"+error); });
          xapi.config.set(`Video Input Connector ${sourceID} Visibility`, 'Never')
            .catch((error) => { console.error("64"+error); });
        })

        }
      }
    )

// HDMI INPUT 4 and 5 SHOULD BE CONFIGURED FROM THE WEB INTERFACE
// SDI INPUT 6 SHOULD ALSO BE CONFIGURED FROM THE WEB INTERFACE UNLESS IT IS USED FOR THE VIDEO TIE LINE FROM SECONDARY
// SDI INPUT 6 CAN BE USED FOR EITHER THE VIDEO TIE LINE, OR FOR AN ADDITIONAL PTZ CAMERA (BUT NOT THE PRESENTER CAMERA)


// VIDEO OUTPUT SECTION
// THESE SHOULD NOT BE CONFIGURED BY THE INSTALLER

  JoinSplit_primary_settings.VideoMonitors=await xapi.Config.Video.Monitors.get()
  switch (JoinSplit_primary_settings.VideoMonitors) {
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
    .catch((error) => { console.error("1"+error); });
  xapi.config.set('Audio Input ARC 2 Mode', 'Off')
    .catch((error) => { console.error("2"+error); });
  xapi.config.set('Audio Input ARC 3 Mode', 'Off')
    .catch((error) => { console.error("3"+error); });


// HDMI AUDIO SECTION
  xapi.Config.Audio.Output.ConnectorSetup.set('Manual');
  xapi.config.set('Audio Input HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("4"+error); });
    xapi.config.set('Audio Input HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("5"+error); });
  xapi.config.set('Audio Input HDMI 3 Mode', 'On')
    .catch((error) => { console.error("5"+error); });
    // This allows us of USB Passthrough

// SET MICROPHONES
// MICROPHONES 1 THRU 8 ARE USER CONFIGURABLE
// THIS NEW VERSION 2 DESIGN USES EMBEDDED HDMI AUDIO FROM PRIMARY TO SECONDARY

// MUTE
  xapi.config.set('Audio Microphones Mute Enabled', 'True')
    .catch((error) => { console.error("21"+error); });

// OUTPUT ARC SECTION (FOR QUAD CAMERA ONLY)
  xapi.config.set('Audio Output ARC 1 Mode', 'On')
    .catch((error) => { console.error("22"+error); });

// HDMI AUDIO OUTPUT
  xapi.config.set('Audio Output HDMI 1 Mode', 'Off')
    .catch((error) => { console.error("23"+error); });
  xapi.config.set('Audio Output HDMI 2 Mode', 'Off')
    .catch((error) => { console.error("24"+error); });
  xapi.config.set('Audio Output HDMI 3 Mode', 'On')
    .catch((error) => { console.error("25"+error); });
    // This allows use of USB Passthrough

// CONFERENCE
  xapi.config.set('Conference AutoAnswer Mode', 'Off')
    .catch((error) => { console.error("36"+error); });

// GPIO
  xapi.config.set('GPIO Pin 2 Mode', 'InputNoAction')
    .catch((error) => { console.error("39"+error); });
  xapi.config.set('GPIO Pin 3 Mode', 'InputNoAction')
    .catch((error) => { console.error("40"+error); });
  xapi.config.set('GPIO Pin 4 Mode', 'InputNoAction')
    .catch((error) => { console.error("41"+error); });


    

// PERIPHERALS
  xapi.config.set('Peripherals Profile Cameras', 'Minimum1')
    .catch((error) => { console.error("44"+error); });
  xapi.config.set('Peripherals Profile TouchPanels', 'Minimum1')
    .catch((error) => { console.error("45"+error); });

// SERIAL PORT
  xapi.config.set('SerialPort LoginRequired', 'Off')
    .catch((error) => { console.error("46"+error); });
  xapi.config.set('SerialPort Mode', 'On')
    .catch((error) => { console.error("47"+error); });


// VIDEO
xapi.config.set('Video DefaultMainSource', '1')
    .catch((error) => { console.error("50"+error); });
  //xapi.config.set('Video Monitors', JoinSplit_secondary_settings.VideoMonitors)
  //  .catch((error) => { console.error("51"+error); });
  xapi.command('Video Input SetMainVideoSource', {  ConnectorID: 1 })
    .catch((error) => { console.error("52"+error); });


// VIDEO INPUT SECTION
// HDMI INPUT 1
  xapi.config.set('Video Input Connector 1 CameraControl CameraId', '1')
    .catch((error) => { console.error("54"+error); });
  xapi.config.set('Video Input Connector 1 CameraControl Mode', 'On')
    .catch((error) => { console.error("55"+error); });
  xapi.config.set('Video Input Connector 1 InputSourceType', 'camera')
    .catch((error) => { console.error("56"+error); });
  xapi.config.set('Video Input Connector 1 Name', 'Quad Camera')
    .catch((error) => { console.error("57"+error); });
  xapi.config.set('Video Input Connector 1 PreferredResolution', '1920_1080_60')
    .catch((error) => { console.error("58"+error); });
  xapi.config.set('Video Input Connector 1 PresentationSelection', 'Manual')
    .catch((error) => { console.error("59"+error); });
  xapi.config.set('Video Input Connector 1 Quality', 'Motion')
    .catch((error) => { console.error("60"+error); });
  xapi.config.set('Video Input Connector 1 Visibility', 'Never')
    .catch((error) => { console.error("61"+error); });

// HDMI INPUTS 3 AND 4
// THESE ARE SCREENS 1 AND 2 FROM THE PRIMARY ROOM
  xapi.config.set('Video Input Connector 3 HDCP Mode', 'Off')
    .catch((error) => { console.error("62"+error); });
  xapi.config.set('Video Input Connector 3 CameraControl Mode', 'Off')
    .catch((error) => { console.error("63"+error); });
  xapi.config.set('Video Input Connector 3 InputSourceType', 'Other')
    .catch((error) => { console.error("64"+error); });
  xapi.config.set('Video Input Connector 3 Name', 'Main Video Primary')
    .catch((error) => { console.error("65"+error); });
  xapi.config.set('Video Input Connector 3 PreferredResolution', '3840_2160_30')
    .catch((error) => { console.error("66"+error); });
  xapi.config.set('Video Input Connector 3 PresentationSelection', 'Manual')
    .catch((error) => { console.error("67"+error); });
  xapi.config.set('Video Input Connector 3 Quality', 'Sharpness')
    .catch((error) => { console.error("68"+error); });
  xapi.config.set('Video Input Connector 3 Visibility', 'Never')
    .catch((error) => { console.error("69"+error); });

  xapi.config.set('Video Input Connector 4 HDCP Mode', 'Off')
    .catch((error) => { console.error("70"+error); });
  xapi.config.set('Video Input Connector 4 CameraControl Mode', 'Off')
    .catch((error) => { console.error("71"+error); });
  xapi.config.set('Video Input Connector 4 InputSourceType', 'PC')
    .catch((error) => { console.error("72"+error); });
  xapi.config.set('Video Input Connector 4 Name', 'Content Primary')
    .catch((error) => { console.error("73"+error); });
  xapi.config.set('Video Input Connector 4 PreferredResolution', '3840_2160_30')
    .catch((error) => { console.error("74"+error); });
  xapi.config.set('Video Input Connector 4 PresentationSelection', 'Manual')
    .catch((error) => { console.error("75"+error); });
  xapi.config.set('Video Input Connector 4 Quality', 'Sharpness')
    .catch((error) => { console.error("76"+error); });
  xapi.config.set('Video Input Connector 4 Visibility', 'Never')
    .catch((error) => { console.error("77"+error); });

// HDMI INPUT 2 (PRESENTER CAMERA) and 5 SHOULD BE CONFIGURED FROM THE WEB INTERFACE
// SDI INPUT 6 SHOULD ALSO BE CONFIGURED FROM THE WEB INTERFACE
// SDI INPUT 6 CAN BE USED FOR AN ADDITIONAL PTZ CAMERA (BUT NOT THE PRESENTER CAMERA)

// VIDEO OUTPUT SECTION
// THESE SHOULD NOT BE CONFIGURED BY THE INSTALLER
JoinSplit_secondary_settings.VideoMonitors=await xapi.Config.Video.Monitors.get()

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
    .catch((error) => { console.error("82"+error); });
  xapi.config.set('Video Output Connector 3 Resolution', 'Auto')
    .catch((error) => { console.error("83"+error); });

  xapi.command('Video Matrix Reset')
    .catch((error) => { console.error("84"+error); });
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
        var currentSTCameraID=getSTCameraID();
        let sourceDict={ SourceID : '0'}
        sourceDict["SourceID"]=currentSTCameraID.toString();
        xapi.Command.Video.Input.SetMainVideoSource(sourceDict); 
        inSideBySide=false;
        console.log("cleared out side by side mode....")
    }

   try {
        const webViewType = await xapi.Status.UserInterface.WebView.Type.get()
        if (webViewType=='WebRTCMeeting') webrtc_mode=true;
       } catch (e) {
         console.log('Unable to read WebView Type.. assuming not in webrtc mode')
       }
  
       if (isOSEleven) {
          xapi.Config.Cameras.SpeakerTrack.DefaultBehavior.set(ST_DEFAULT_BEHAVIOR);
       }

    // Always turn on SpeakerTrack when the Automation is started. It is also turned on when a call connects so that
    // if it is manually turned off while outside of a call it goes back to the correct state
    macroTurnedOnST=true;
    if (webrtc_mode) {
      setTimeout(()=> {xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError)},2000) // in RoomOS11 Beta, if we do not delay turning on ST, something turns it back off
    } else  xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError);
    

   //registering vuMeter event handler
   micHandler();
   micHandler= () => void 0;
   micHandler=xapi.event.on('Audio Input Connectors Microphone', (event) => {
    if (typeof micArrays[event.id[0]]!='undefined' && ( !CHK_VUMETER_LOUDSPEAKER || event.LoudspeakerActivity<1)) {
      micArrays[event.id[0]].pop();
      micArrays[event.id[0]].push(event.VuMeter);

      // checking on manual_mode might be unnecessary because in manual mode,
      // audio events should not be triggered
      if (manual_mode==false)
      {
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
         xapi.Command.Audio.VuMeter.StopAll({ });

         if (inSideBySide) {
            var currentSTCameraID=getSTCameraID();
            let sourceDict={ SourceID : '0'}
            sourceDict["SourceID"]=currentSTCameraID.toString();
            xapi.Command.Video.Input.SetMainVideoSource(sourceDict); 
            inSideBySide=false;
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
         micHandler= () => void 0;
}



/////////////////////////////////////////////////////////////////////////////////////////
// MICROPHONE DETECTION AND CAMERA SWITCHING LOGIC FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function checkMicLevelsToSwitchCamera() {
  // make sure we've gotten enough samples from each mic in order to do averages
  if (allowCameraSwitching) {
         // figure out which of the inputs has the highest average level then perform logic for that input *ONLY* if allowCameraSwitching is true
          let array_key=largestMicValue();
          let array=[];
          array=micArrays[array_key];
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
  console.log("-------------------------------------------------");

  // map the loudest mic to the corresponding composition which could be local or from a 
  // secondary codec.
  var currentSTCameraID=getSTCameraID();
  let sourceDict={ SourceID : '0'} // Just initialize
  config.compositions.forEach(compose =>{
    if(compose.mics.includes(input)){
      console.log(`Setting to composition = ${compose.name}`);
      if (compose.preset!=0) {
        console.log(`Setting Video Input to preset [${compose.preset}] `);
        sourceDict={ PresetId: compose.preset};
        //xapi.Command.Camera.Preset.Activate(sourceDict);
      } 
      else 
      {
      console.log(`Setting Video Input to connectors [${compose.connectors}] and Layout: ${compose.layout}`);
      sourceDict={ConnectorId: compose.connectors,Layout: compose.layout}
      //xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
      }
    }
  })



  if (presenterTracking) {
    // if we have selected Presenter Q&A mode and the codec is currently in presenterTrack mode, invoke
    // that specific camera switching logic contained in presenterQASwitch()
    if (PRESENTER_QA_MODE && !webrtc_mode ) presenterQASwitch(input, sourceDict);
    // if the codec is in presentertracking but not in PRESENTER_QA_MODE , simply ignore the request to switch
    // cameras since we need to keep sending the presenterTrack camera. 
    inSideBySide=false; // if presenterTracking, this should never be on, but clearing just in case
  }
  else if (JSON.stringify(lastSourceDict) != JSON.stringify(sourceDict))
  {
      if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();

      inSideBySide=false;
      
      // the Video Input SetMainVideoSource does not work while Speakertrack is active
      // so we need to turn it off in case the previous video input was from a source where
      // SpeakerTrack is used.
      pauseSpeakerTrack();

      // Switch to the source that is speficied in the same index position in MAP_CAMERA_SOURCE_IDS
      //console.log("Switching to input with SetMainVideoSource with dict: ", sourceDict  )
      //xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);

      //TODO: switch to using compositions below instead of the above calculationg of SourceDict, but
      // also find a way to store what we had set to before to be able to compare!!!

      // Apply the composition for active mic
      console.log(`Switching to ${sourceDict} `)
      if ('PresetId'in sourceDict) xapi.Command.Camera.Preset.Activate(sourceDict)
      else xapi.Command.Video.Input.SetMainVideoSource(sourceDict);

      lastSourceDict=sourceDict;

      if ( 'ConnectorId'in sourceDict && currentSTCameraID in sourceDict['ConnectorId']) { 
        resumeSpeakerTrack();
      }

      // send required messages to auxiliary codec that also turns on speakertrack over there
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY && roomCombined) sendIntercodecMessage('automatic_mode');
      lastActiveHighInput = input;
      restartNewSpeakerTimer();
      if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

  }
}

// function to actually switch the camera input when in presentertrack Q&A mode
async function presenterQASwitch(input, sourceDict) {

   if (!(PRESENTER_QA_AUDIENCE_MIC_IDS.includes(input))) {
    // Once the presenter starts talkin, we need to initiate composition timer
    // to remove composition only after the configured time has passed.
    restartCompositionTimer();
   }
   else if (lastActiveHighInput != input)
   {
    // here we need to compose presenter with other camera where someone is speaking
    if ('ConnectorId' in sourceDict && sourceDict['ConnectorId'].length==1) {
      let presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
      let connectorDict={ ConnectorId : [presenterSource,sourceDict['ConnectorId'][0]]};
      console.log("Trying to use this for connector dict in presenterQASwitch(): ", connectorDict  )

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
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY && roomCombined) sendIntercodecMessage('automatic_mode');

  lastActiveHighInput = input;
  restartNewSpeakerTimer();
}

function setComposedQAVideoSource(connectorDict) {
 
  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
  
  // always put speakertrack on background mode when switching around inputs 
  pauseSpeakerTrack();

  console.log("In setComposedQAVideoSource() switching to input with SetMainVideoSource with dict: ", connectorDict  )
  xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
  lastSourceDict=connectorDict;

  const payload = { EditMatrixOutput: { sources: connectorDict["ConnectorId"] } };

  setTimeout(function(){
    //Let USB Macro know we are composing
    localCallout.command(payload).post()
  }, 250) //250ms delay to allow the main source to resolve first

  // only disable background mode if the audience camera is a QuadCam
  if (connectorDict.ConnectorId[1]==getSTCameraID()) resumeSpeakerTrack(); //TODO: Check here

  //if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Unmute();
  if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

}

function largestMicValue() {
  // figure out which of the inputs has the highest average level and return the corresponding key
 let currentMaxValue=0;
 let currentMaxKey='';
 let theAverage=0;
 for (var i in config.monitorMics){
    theAverage=averageArray(micArrays[config.monitorMics[i].toString()]);
    if (theAverage>=currentMaxValue) {
        currentMaxKey=config.monitorMics[i].toString();
        currentMaxValue=theAverage;
    }
 }
 return currentMaxKey;
}

function averageArray(arrayIn) {
  let sum = 0;
  for(var i = 0; i < arrayIn.length; i++) {
    sum = sum + parseInt( arrayIn[i], 10 );
  }
  let avg = (sum / arrayIn.length) * arrayIn.length;
  return avg;
}

async function recallSideBySideMode() {
  if (!manual_mode && roomCombined) {
    inSideBySide=true;
    if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
    // only invoke SideBySideMode if not in presenter QA mode and not presentertrack is currently not active
    // because Presenter QA mode has it's own way of composing side by side. 
    if (presenterTracking ) {
      // If in PRESENTER_QA_MODE mode and we go to silence, we need to restart the composition timer
      // to remove composition (if it was there) only after the configured time has passed.
      if (PRESENTER_QA_MODE && !webrtc_mode ) restartCompositionTimer();
      // even if not in PRESENTER_QA_MODE , if presenterTrack is turned on, we do not want to show anyd side by side mode!
    }
    else 
    {

      if (overviewShowDouble) {
            if (!webrtc_mode) { //only compose if not in webrtc mode (not supported). Otherwise, just use preset 30
              let sourceDict={ ConnectorId : [0,0]}; // just initializing
              //connectorDict["ConnectorId"]=OVERVIEW_DOUBLE_SOURCE_IDS;
              //console.log("Trying to use this for connector dict in recallSideBySideMode(): ", sourceDict  )
              //xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);

              config.compositions.forEach(compose =>{
                if(compose.mics.includes(0)){
                  console.log(`SideBySide setting to composition = ${compose.name}`);
                  if (compose.preset!=0) {
                    console.log(`SideBySide setting Video Input to preset [${compose.preset}] `);
                    sourceDict={ PresetId: compose.preset};
                    xapi.Command.Camera.Preset.Activate(sourceDict);
                  } 
                  else 
                  {
                  console.log(`Setting Video Input to connectors [${compose.connectors}] and Layout: ${compose.layout}`);
                  sourceDict={ConnectorId: compose.connectors,Layout: compose.layout}
                  xapi.Command.Video.Input.SetMainVideoSource(sourceDict);
                  }
                }
              })



              lastSourceDict=sourceDict;

              if ('ConnectorId' in sourceDict) { // only notify about composition and handle ST if composition configured for silence is not actually another preset!
                const payload = { EditMatrixOutput: { sources: sourceDict['ConnectorId']} };
                // let USB Mode Macro know we are composing
                setTimeout(function(){
                    localCallout.command(payload).post()
                  }, 250) //250ms delay to allow the main source to resolve first
                  pauseSpeakerTrack();
                  xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
              }

          }
        }
        else {
              let sourceDict={ SourceID : '0'};
              sourceDict["SourceID"]=OVERVIEW_SINGLE_SOURCE_ID.toString();
              console.log("Trying to use this for source dict in recallSideBySideMode(): ", sourceDict  )
              xapi.command('Video Input SetMainVideoSource', sourceDict).catch(handleError);
              lastSourceDict=sourceDict;
              pauseSpeakerTrack();
              xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
        }


      // send side_by_side message to secondary codecs if in combined mode
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY && roomCombined) {
        sendIntercodecMessage('side_by_side');
      }
      
      lastActiveHighInput = 0;
      lowWasRecalled = true;
    }
    if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
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
  let connectorDict={ ConnectorId : presenterSource};
  xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
  lastSourceDict=connectorDict;
  if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  //resumeSpeakerTrack(); // we do not want to leave background mode on
}

async function recallQuadCam() {
  console.log("Recalling QuadCam after manually exiting PresenterTrack mode....")
  pauseSpeakerTrack();
  if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
  let currentSTCameraID=getSTCameraID();
  console.log('In recallQuadCam Obtained currentSTCameraID as: ',currentSTCameraID)
  let connectorDict={ SourceId: currentSTCameraID};  xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
  lastSourceDict=connectorDict;
  if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
  resumeSpeakerTrack(); // we do not want to leave background mode on


}

/////////////////////////////////////////////////////////////////////////////////////////
// TOUCH 10 UI SETUP
/////////////////////////////////////////////////////////////////////////////////////////


function addCustomAutoQAPanel() {

  let presenterTrackButtons=`
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
  let presenterTrackButtonsDisabled=`
  <Name>PresenterTrack</Name>
  <Widget>
    <WidgetId>widget_pt_disabled</WidgetId>
    <Name>Not configured</Name>
    <Type>Text</Type>
    <Options>size=3;fontSize=normal;align=center</Options>
  </Widget>`;

  // Here we do the conditional assignment of the row
  let presenterTrackRowValue=(presenterTrackConfigured)? presenterTrackButtons : presenterTrackButtonsDisabled;

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
  xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_pt_settings', Value: '1'}).catch(handleMissingWigetError);
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
GMM.Event.Receiver.on(event => {
  const usb_mode_reg = /USB_Mode_Version_[0-9]*.*/gm
  if (event.Source.Id=='localhost') {
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
                    usb_mode= false;
                    // always tell the other codec when your are in or out of a call
                    sendIntercodecMessage('CALL_DISCONNECTED');
                    if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
                    { 
                      // only need to keep track of codecs being in call with these
                      // booleans in primary codec which is the one that initiates join/split
                      primaryInCall=false;
                      evalCustomPanels(); 
                    }
                    break;
                  case 'enteringUSBMode':
                    console.warn(`You are entering USB Mode`)
                    //Run code here when USB Mode starts to configure
                    break;
                  case 'USBModeStarted':
                    console.warn(`System is in Default Mode`)
                    startAutomation();
                    usb_mode= true;
                    // always tell the other codec when your are in or out of a call
                    sendIntercodecMessage('CALL_CONNECTED');
                    if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
                    { 
                      // only need to keep track of codecs being in call with these
                      // booleans in primary codec which is the one that initiates join/split
                      primaryInCall=true;
                      evalCustomPanels(); 

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
        else
        { // This section is for handling messages sent from primary to secondary codec and vice versa
              switch (event.App) { //Based on the App (Macro Name), I'll run some code
              case 'divisible_room':
                if (event.Type == 'Error') {
                  console.error(event)
                } else {
                  switch (event.Value) {
                    case 'VTC-1_OK':
                      handleCodecOnline();
                    break;
                    case "VTC-1_status":
                      handleMacroStatusResponse();
                      break;
                    case 'side_by_side':
                      if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY)) {
                        console.log('Handling side by side on secondary');
                        deactivateSpeakerTrack();
                        xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
                      }
                    break;
                    case 'automatic_mode':
                      if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY)) {
                        // handle request to keep speakertrack on from primary to secondary
                        console.log('Turning back on SpeakerTrack on secondary');
                        activateSpeakerTrack();
                      }
                    break;
                    case 'CALL_CONNECTED': 
                      if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY)) {
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
                      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY) {
                        // if we are the primary codec, this event came from secondary
                        // we need to keep track when secondary room is in a call 
                        // in a variable in the primary to not join or combine
                        // while in that state
                        console.log("Secondary in call, setting variable...")
                        secondaryInCall=true;
                        evalCustomPanels();
                      }

                      break;
                      case 'CALL_DISCONNECTED':
                        if (roomCombined && (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY)) {
                          // Turn vuMeters back off
                          console.log("Stopping all VuMeters...");
                          xapi.Command.Audio.VuMeter.StopAll({ });
                        }
                        if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY) {
                          // if we are the primary codec, this event came from secondary
                          // we need to keep track when secondary room is no longer in a call 
                          // in a variable in the primary to allow join or combine
                          // while in that state
                          console.log("Secondary not in call, setting variable...")
                          secondaryInCall=false;
                          evalCustomPanels();
                        }
                        break;                      
                      default:
                      break;
                  }
                }
                break;

              default:
                console.debug({
                  Message: `Received Message from ${event.App} and was not processed`
                })
                break;
            }

        }

      })


/////////////////////////////////////////////////////////////////////////////////////////
// INTER-CODEC COMMUNICATION
/////////////////////////////////////////////////////////////////////////////////////////

function sendIntercodecMessage(message) { 
  for (const keyIP in otherCodec)
    if (otherCodec[keyIP]!='') {   
        otherCodec[keyIP].status(message).queue().catch(e=>{
        console.log('Error sending message');
        }); 
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

/////////////////////////////////////////////////////////////////////////////////////////
// OTHER FUNCTIONAL HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////


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

function handleWakeUp() {
  console.log('handleWakeUp');
  // stop automatic switching behavior
  stopAutomation();
  // send wakeup to secondary codec
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY) 
  { 
    // make sure secondary is awake
    if (roomCombined) sendIntercodecMessage('wake_up');
    // check the satus of the macros running on the secondary codec and store it in secondaryOnline
    // in case we need to check it in some other function
    handleMacroStatus();
  }
}


function handleShutDown() {
  console.log('handleShutDown');
  // send required messages to other codecs
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY && roomCombined) sendIntercodecMessage('shut_down');
}

// function to check the satus of the macros running on the secondary codec
function handleMacroStatus() {
  console.log('handleMacroStatus');
  // reset tracker of responses from secondary codec
  secondaryOnline = false;
  // send required messages to secondary codec
  sendIntercodecMessage('VTC-1_status');
}

function handleCodecOnline() {
  console.log(`handleCodecOnline`);
  secondaryOnline = true;
}

function handleMacroStatusResponse() {
  console.log('handleMacroStatusResponse');
  sendIntercodecMessage('VTC-1_OK');
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
  InitialCallTimer=null;
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
    presenterQAKeepComposition=true;
    qaCompositionTimer = setTimeout(onCompositionTimerExpired,PRESENTER_QA_KEEP_COMPOSITION_TIME )
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
  presenterQAKeepComposition=false;
  if (PRESENTER_QA_MODE && !webrtc_mode  && presenterTracking) {
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
  macroTurnedOnST=true;
  xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError);

}

function deactivateSpeakerTrack() {
  macroTurnedOffST=true;
  xapi.Command.Cameras.SpeakerTrack.Deactivate().catch(handleError);
}

function resumeSpeakerTrack() {
  xapi.Command.Cameras.SpeakerTrack.BackgroundMode.Deactivate().catch(handleError);
}

function pauseSpeakerTrack() {
  xapi.Command.Cameras.SpeakerTrack.BackgroundMode.Activate().catch(handleError);
}


// if the Speakertrack Camera becomes available after FW upgrade, we must re-init so
// we register that action as an event handler
xapi.Status.Cameras.SpeakerTrack.Availability
    .on((value) => {
        console.log("Event received for SpeakerTrack Availability: ",value)
        if (value=="Available"){
          init();
        }
    });

// evalSpeakerTrack handles the turning on/off of automation manually based on selection
// of SpeakerTrack by user
function evalSpeakerTrack(value)
{
    if (value=='Active') {
      //if (macroTurnedOnST) {macroTurnedOnST=false;}
       //else {startAutomation();}
       if (manual_mode) startAutomation();

    }
    else
    {
      //if (macroTurnedOffST) {macroTurnedOffST=false;}
      //else {stopAutomation();}
      if (!manual_mode /*&& !inSideBySide*/) stopAutomation();
    }
 
}

function evalPresenterTrack(value){
  let currentVal='1';
  if (presenterTrackConfigured) {
    if (value==='Follow' || value==='Persistent') {
        if (PRESENTER_QA_MODE) {
          currentVal='3';
        }
        else {
          currentVal='2';
        }
    } 
    xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_pt_settings', Value: currentVal}).catch(handleMissingWigetError);
  }
}

function evalCustomPanels() {

  if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {
      if (primaryInCall || secondaryInCall) {
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
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine', Value: 'on'});
              }
              else
              {
                xapi.command('UserInterface Extensions Widget SetValue', {WidgetId: 'widget_toggle_combine' , Value: 'off'});
              }
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

  // register event handlers for local events
  xapi.Status.Standby.State.on(value => {
          console.log(value);
          if (!roomCombined) {
            if (value=="Off") handleWakeUp();
            if (value=="Standby") handleShutDown();
          }
  });


    // register handler for Call Successful
    xapi.Event.CallSuccessful.on(async () => {

      console.log("Starting new call timer...");
      //webrtc_mode=false; // just in case we do not get the right event when ending webrtc calls
      startAutomation();
      recallSideBySideMode();
      startInitialCallTimer();
      
      // always tell the other codec when your are in or out of a call
      sendIntercodecMessage('CALL_CONNECTED');
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
      { 
        // only need to keep track of codecs being in call with these
        // booleans in primary codec which is the one that initiates join/split
        primaryInCall=true;
        evalCustomPanels();
      }
      
    });

    // register handler for Call Disconnect
    xapi.Event.CallDisconnect.on(async () => {
      if (!usb_mode) {
        console.log("Turning off Self View....");
        xapi.Command.Video.Selfview.Set({ Mode: 'off'});
        webrtc_mode=false; // ending webrtc calls is being notified here now in RoomOS11
        stopAutomation();
      }

      // always tell the other codec when your are in or out of a call
      sendIntercodecMessage('CALL_DISCONNECTED');
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
      { 
        // only need to keep track of codecs being in call with these
        // booleans in primary codec which is the one that initiates join/split
        primaryInCall=false;
        evalCustomPanels();
      }
    });

    // register WebRTC Mode
    xapi.Status.UserInterface.WebView.Type
    .on(async(value) => {
      if (value==='WebRTCMeeting') {
        webrtc_mode=true;

        console.log("Starting automation due to WebRTCMeeting event...");
        startAutomation();
        startInitialCallTimer();
          
        // always tell the other codec when your are in or out of a call
        sendIntercodecMessage('CALL_CONNECTED');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
        { 
          // only need to keep track of codecs being in call with these
          // booleans in primary codec which is the one that initiates join/split
          primaryInCall=true;
          evalCustomPanels();
        }

      } else {
        webrtc_mode=false;
        if (!usb_mode) {
            console.log("Stopping automation due to a non-WebRTCMeeting  event...");
            xapi.Command.Video.Selfview.Set({ Mode: 'off'});
            stopAutomation();
          }
        // always tell the other codec when your are in or out of a call
        sendIntercodecMessage('CALL_DISCONNECTED');
        if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
        { 
          // only need to keep track of codecs being in call with these
          // booleans in primary codec which is the one that initiates join/split
          primaryInCall=false;
          evalCustomPanels();
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
      console.log('Received PT status as: ',value)
      lastSourceDict={ SourceID : '0'}; // forcing a camera switch
      if (value==='Follow' || value==='Persistent') { 
        presenterTracking=true;
        if (PRESENTER_QA_MODE && !webrtc_mode ) { 
          //showPTPanelButton();
          //recallFullPresenter();
        }
      }
      else{
        presenterTracking=false;
      }
      // Update custom panel
      evalPresenterTrack(value);
    });
      
    // first check to see if the room is supposed to be in combined mode as per permanent storage
    if (roomCombined){
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY) {
          overviewShowDouble=true;
          let thePresetCamID=await getPresetCamera(30);

      }
      else if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY) {
          // stop automation in case it was on
          stopAutomation();
      }
    }



    // Stop any VuMeters that might have been left from a previous macro run with a different config.monitorMics constant
  // to prevent errors due to unhandled vuMeter events.
  xapi.Command.Audio.VuMeter.StopAll({ });
  let enabledGet= await xapi.Config.Cameras.PresenterTrack.Enabled.get()
  presenterTrackConfigured= (enabledGet=='True')? true : false;
  addCustomAutoQAPanel();

  // turn off speakertrack to get started
  deactivateSpeakerTrack();
}


async function init()
{
  console.log('init');
  if (!await validate_config()) disableMacro("invalid config")

  await GMM.memoryInit();

  await GMM.write.global('JOIN_SPLIT_CONFIG', JOIN_SPLIT_CONFIG).then(() => {
      console.log({ Message: 'Init', Action: 'Join Split config stored.' })
    });


  roomCombined=await GMM.read.global('JoinSplit_combinedState').catch(async e=>{
      //console.error(e);
      console.log("No initial JoinSplit_combinedState global detected, creating one...")
      await GMM.write.global('JoinSplit_combinedState',false).then(() => {
        console.log({ Message: 'Init', Action: 'Combined state stored.' })
      })
      return false;
    })

  await init_intercodec(); 
      
  // check RoomOS versions
  isOSTen=await check4_Minimum_Version_Required(minOS10Version);
  isOSEleven=await check4_Minimum_Version_Required(minOS11Version);
  

    // register HDMI Passhtorugh mode handlers if RoomOS 11
    if (isOSEleven) {
        xapi.Status.Video.Output.HDMI.Passthrough.Status.on(value => {
          console.log(value)
          if (value=='Active') {
            console.warn(`System is in Passthrough Active Mode`)
            startAutomation();
            usb_mode= true;
           // always tell the other codec when your are in or out of a call
            sendIntercodecMessage('CALL_CONNECTED');
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
            { 
              // only need to keep track of codecs being in call with these
              // booleans in primary codec which is the one that initiates join/split
              primaryInCall=true;
              evalCustomPanels(); 
            }
          } else {
            console.warn(`System is in Passthrough Inactive Mode`)
            stopAutomation();
            usb_mode= false;
            // always tell the other codec when your are in or out of a call
            sendIntercodecMessage('CALL_DISCONNECTED');
            if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_PRIMARY)
            { 
              // only need to keep track of codecs being in call with these
              // booleans in primary codec which is the one that initiates join/split
              primaryInCall=false;
              evalCustomPanels(); 
            }
          }
        });
    }

  if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY) {

            if (USE_WALL_SENSOR) {
              wallSensorOverride=await GMM.read.global('JoinSplit_wallSensorOverride').catch(async e=>{
                      //console.error(e);
                      console.log("No initial JoinSplit_wallSensorOverride global detected, creating one...")
                      await GMM.write.global('JoinSplit_wallSensorOverride',false).then(() => {
                        console.log({ Message: 'Init', Action: 'Wall Sensor override state stored.' })
                      })
                    return false;
                  })  
            }
            else 
            {
                // if they are not using a wall sensor, we want the same behavior than if they
                // had set the override for the wall sensor: to just ignore it
                setWallSensorOverride(true); // this also sets wallSensorOverride to true
            }


            // Add CUSTOM PANEL
            evalCustomPanels();

            // setPrimaryDefaultConfig() is called within initialCombinedJoinState() if appropriate
            initialCombinedJoinState();

            // start listening to events on GPIO pin 1 that come from the wall sensor connected to PRIMARY
            primaryInitPartitionSensor();

            //setTimeout(setPrimaryGPIOconfig, 1000);
            //primaryStandaloneMode();

            // start sensing changes in PIN 4 to switch room modes. This can be set by wall sensor
            // or custom touch10 UI on PRIMARY codec
            primaryInitModeChangeSensing();

            listenToStandby();
            listenToMute();
            // Primary room always needs to initialize basic switching for both
            // split and joined mode. For secondary we do that inside event handler
            // for Pin4 which governs if split or joined. 
            init_switching();

        }
    else {
            setSecondaryDefaultConfig();
            // start sensing changes in PIN 4 to switch room modes. This can be set by wall sensor
            // or custom touch10 UI on PRIMARY codec
            secondaryInitModeChangeSensing();
            secondaryStandbyControl();
            secondaryMuteControl();
            checkCombinedStateSecondary();
      }

}



/////////////////////////////////////////////////////////////////////////////////////////
// TOUCH 10 UI FUNCTION HANDLERS
/////////////////////////////////////////////////////////////////////////////////////////

function toggleBackCombineSetting(event) {
  if (event.Value==='on') xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: 'widget_toggle_combine' ,Value: 'off' })
  else xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: 'widget_toggle_combine' ,Value: 'on' });
}

async function handleWidgetActions(event)
{
    switch (event.WidgetId) {
      case 'widget_toggle_combine':
        console.log("JoinSplit " + event.WidgetId + ' set to ' + event.Value);
        if (secondaryInCall) {
          xapi.command('UserInterface Message Alert Display', {
            Title: 'Cannot Combine/Split',
            Text: 'The secondary codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
            Duration: 10,
          });
          toggleBackCombineSetting(event)
        } else if (primaryInCall) {
          // this is only here in case we missed a scenario for disabling panel when in call
          xapi.command('UserInterface Message Alert Display', {
            Title: 'Cannot Combine/Split',
            Text: 'This codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
            Duration: 10,
          });
          toggleBackCombineSetting(event)
        }
        else if (!secondaryOnline){
          xapi.command('UserInterface Message Alert Display', {
            Title: 'Cannot Combine/Split',
            Text: 'The secondary codec is not online or not reachable by HTTP. Please correct and try again.',
            Duration: 10,
          });
          toggleBackCombineSetting(event)
        }
        else 
        {
            if(event.Value === 'on')
            {
                setGPIOPin4ToLow();

            }
            else if(event.Value === 'off')
            {
                setGPIOPin4ToHigh();
            }
        }
    break;

    case 'widget_pt_settings':
      let presenterSource = 0;
      let connectorDict={};
      if (presenterTrackConfigured) {
        if (event.Type=='released')
        switch (event.Value) {
          case '1':
            console.log('Off');
            console.log("Turning off PresenterTrack...");
            //recallFullPresenter();
            xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Off' });
            PRESENTER_QA_MODE=false;
              activateSpeakerTrack(); 
            recallQuadCam();
          break;

          case '2':
              console.log('On');
              console.log("Turning on PresenterTrack only...");
              if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
              deactivateSpeakerTrack();
              presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
              connectorDict={ ConnectorId : presenterSource};
              xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
              lastSourceDict=connectorDict;
              if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);
              xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Persistent' }); 
              PRESENTER_QA_MODE=false;
          break;

          case '3':
                console.log('QA Mode');
                console.log("Turning on PresenterTrack with QA Mode...");
                if (webrtc_mode && !isOSEleven) xapi.Command.Video.Input.MainVideo.Mute();
                  activateSpeakerTrack();
                  //pauseSpeakerTrack();
                presenterSource = await xapi.Config.Cameras.PresenterTrack.Connector.get();
                connectorDict={ ConnectorId : presenterSource};
                xapi.command('Video Input SetMainVideoSource', connectorDict).catch(handleError);
                lastSourceDict=connectorDict;
                xapi.Command.Cameras.PresenterTrack.Set({ Mode: 'Persistent' });   
                  pauseSpeakerTrack();
                  if (webrtc_mode && !isOSEleven) setTimeout( function(){xapi.Command.Video.Input.MainVideo.Unmute()} , WEBRTC_VIDEO_UNMUTE_WAIT_TIME);

                PRESENTER_QA_MODE=true;
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


xapi.event.on('UserInterface Extensions Panel Clicked', (event) =>
{
    if(event.PanelId == 'room_combine_PIN')
    {
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
    }
    if (event.PanelId == 'panel_combine_split')
    {
      console.log('Room Combine/Split panel invoked...');
      handleMacroStatus();
    }
});

xapi.event.on('UserInterface Message TextInput Response', (event) =>
{

      switch(event.FeedbackId)
      {
        case 'roomCombine':

          if (secondaryInCall) {
            xapi.command('UserInterface Message Alert Display', {
              Title: 'Cannot Combine/Split',
              Text: 'The secondary codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
              Duration: 10,
            });
          } else if (primaryInCall) {
            xapi.command('UserInterface Message Alert Display', {
              Title: 'Cannot Combine/Split',
              Text: 'This codec is in a call or in USB mode, please try after the call ends and/or USB mode is turned off.',
              Duration: 10,
            });
          }
          else if (!secondaryOnline){
            xapi.command('UserInterface Message Alert Display', {
              Title: 'Cannot Combine/Split',
              Text: 'The secondary codec is not online or not reachable by HTTP. Please correct and try again.',
              Duration: 10,
            });
          }
          else 
            {
              switch(event.Text)
              {
                case COMBINE_PIN:
                  if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY)
                  {
                    setGPIOPin4ToLow();
                    setCombinedMode(true);
                    // once they manually set the combined/join state, we must 
                    // store the override state in persistent memory
                    setWallSensorOverride(true);
                  }
                break;

                case SPLIT_PIN:
                  if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY)
                  {
                    setGPIOPin4ToHigh();
                    setCombinedMode(false);
                    // once they manually set the combined/join state, we must 
                    // store the override state in persistent memory
                    setWallSensorOverride(true);
                  }
                break;

                case FIXED_SENSOR:
                  if (JOIN_SPLIT_CONFIG.ROOM_ROLE===JS_PRIMARY)
                  {
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
      }
});


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

function secondaryInitModeChangeSensing() {
  xapi.status.on('GPIO Pin 4', (state) => {
    console.log(`GPIO Pin 4[${state.id}] State went to: ${state.State}`);
        if (state.State === 'Low') {
            displayWarning();
            console.log('Secondary Switched to Combined Mode [Pin 4]');
            secondaryCombinedMode();
        }
        else if (state.State === 'High') {
            removeWarning();
            console.log('Secondary Switched to Divided Mode [Pin 4]');
            secondaryStandaloneMode();
        }
  });
}


function listenToMute() {
  xapi.Status.Audio.Microphones.Mute.on(value => {
    console.log("Global Mute: " + value);
    if(roomCombined === true){
        if(value === 'On') {
          setGPIOPin2ToLow();
        }
        else if (value === 'Off') {
          setGPIOPin2ToHigh();
        }
      }
  });
}

function listenToStandby() {
  xapi.status.on('Standby State', (state) => {
    console.log("Standby State: " + state);
    if(roomCombined === true){
        if(state === 'Standby') {
          setGPIOPin3ToLow();
        }
        else if (state === 'Off') {
          setGPIOPin3ToHigh();
        }
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

async function primaryCombinedMode()
{
  xapi.config.set('Audio Input Microphone 8 Mode', 'On')
    .catch((error) => { console.error(error); });
  xapi.config.set('Conference FarEndControl Mode', 'Off')
    .catch((error) => { console.error("32"+error); });



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
    overviewShowDouble=true;
    stopAutomation(); 
    let thePresetCamID=await getPresetCamera(30);

    recallSideBySideMode();   
    addCustomAutoQAPanel();


 }

async function primaryStandaloneMode()
{
  xapi.config.set('Audio Input Microphone 8 Mode', 'Off')
    .catch((error) => { console.error(error); });
  xapi.config.set('Conference FarEndControl Mode', 'On')
    .catch((error) => { console.error("32"+error); });

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
    overviewShowDouble=false;
    //OVERVIEW_DOUBLE_SOURCE_IDS = [1,1]; // should not be needed, but useful if someone overviewdouble is enabled somehow
    //turn off side by side at this point in case it stayed turned on!!!
    recallSideBySideMode();

    addCustomAutoQAPanel();
}

async function secondaryStandaloneMode()
{
  //setCombinedMode(false);
  roomCombined=false;
  xapi.config.set('Audio Output Line 5 Mode', 'Off')
    .catch((error) => { console.error(error); });
    xapi.config.set('Audio Input HDMI 3 Mode', 'Off')
    .catch((error) => { console.error("5"+error); });
  /*
 SET ultrasound volume to stored value
 SET halfwakd mode to stored value
 SET WeakuOnMotionDetect to stored value
  */

 // decrease main volume by 5Db since it was increased by the same when combining rooms
 if (SECONDARY_COMBINED_VOLUME_CHANGE_STEPS > 0) xapi.Command.Audio.Volume.Decrease({ Steps:  SECONDARY_COMBINED_VOLUME_CHANGE_STEPS});

  // restore secondary settings we stored away before combining
 JoinSplit_secondary_settings=await GMM.read.global('JoinSplit_secondary_settings').catch(async e=>{
  console.log("No JoinSplit_secondary_settings global detected.")
  return JoinSplit_secondary_settings;
 });
 
 if (JoinSplit_secondary_settings.UltrasoundMax>=0) {
  xapi.Config.Audio.Ultrasound.MaxVolume.set(JoinSplit_secondary_settings.UltrasoundMax); }

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
  xapi.config.set('UserInterface OSD Mode', 'Auto').catch((error) => { console.error("90"+error); });

  addCustomAutoQAPanel();

}

async function secondaryCombinedMode()
{
  //setCombinedMode(true);
  roomCombined=true;
  if (!isOSEleven)
    xapi.config.set('UserInterface OSD Mode', 'Unobstructed')
      .catch((error) => { console.error("91"+error); });
  xapi.config.set('Audio Output Line 5 Mode', 'On')
    .catch((error) => { console.error(error); });

  xapi.config.set('Audio Input HDMI 3 Mode', 'On')
    .catch((error) => { console.error("5"+error); });
  xapi.Command.Video.Selfview.Set({ Mode: 'Off' });

  // increase main volume by 5db, will decrease upon splitting again
  if (SECONDARY_COMBINED_VOLUME_CHANGE_STEPS > 0) xapi.Command.Audio.Volume.Increase({ Steps: SECONDARY_COMBINED_VOLUME_CHANGE_STEPS});

  
  //grab current secondary settings before overwriting for combining  
  let ultraSoundMaxValue = await xapi.Config.Audio.Ultrasound.MaxVolume.get()
  let standbyWakeupMotionValue=await xapi.Config.Standby.WakeupOnMotionDetection.get()
  let standbyControlValue=await xapi.Config.Standby.Control.get()

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

  if (JoinSplit_secondary_settings.VideoMonitors=='Single' && JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID==2) {
    xapi.Config.Video.Monitors.set('Dual');  
  }
  else 
  {
    xapi.Config.Video.Monitors.set('Triple');

  }

  xapi.command('Video Matrix Reset').catch((error) => { console.error(error); }); 
 
  xapi.command('Video Matrix Assign', { Output: JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: 1 }).catch((error) => { console.error(error); });
  xapi.command('Video Matrix Assign', { Output: 1, SourceID: JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID }).catch((error) => { console.error(error); });
  if (JoinSplit_secondary_settings.VideoMonitors=='Dual' || JoinSplit_secondary_settings.VideoMonitors=='DualPresentationOnly') {
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
  if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY && roomCombined) {
    xapi.Command.Conference.DoNotDisturb.Activate({ Timeout: 1440 });
  }
})

xapi.Status.Cameras.SpeakerTrack.ActiveConnector.on(value => {
      console.log('New Camera connector: ',value);
      ST_ACTIVE_CONNECTOR=parseInt(value);
      if (JOIN_SPLIT_CONFIG.ROOM_ROLE==JS_SECONDARY && roomCombined) {
        // need to send to primary codec the video input from the correct ST camera if it is
        // an SP60. If a QuadCam, it will always be 1 and this event wont be firing other than when turning
        // speakertracking on/off which for the secondary codec in combined mode should be only once when combining
        let sourceIDtoMatrix=(ST_ACTIVE_CONNECTOR==0)? 1 : ST_ACTIVE_CONNECTOR;
        xapi.command('Video Matrix Assign', { Output: JOIN_SPLIT_CONFIG.SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID, SourceID: sourceIDtoMatrix }).catch((error) => { console.error(error); });
      }
});
    

xapi.event.on('UserInterface Message Prompt Response', (event) =>
{
  switch(event.FeedbackId){
    case 'displayPrompt':
      if (roomCombined === true) {
          console.log("Redisplaying the prompt");
          xapi.command("UserInterface Message Prompt Display", {
            Title: 'Combined Mode',
            Text: 'This codec is in combined mode',
            FeedbackId: 'displayPrompt',
            'Option.1':'Please use main Touch Panel',
          }).catch((error) => { console.error(error); });
        }
    break;
  }
});

xapi.event.on('UserInterface Message Prompt Cleared', (event) =>
{
  switch(event.FeedbackId){
    case 'displayPrompt':
      if (roomCombined === true) {
          console.log("Redisplaying the prompt");
          xapi.command("UserInterface Message Prompt Display", {
            Title: 'Combined Mode',
            Text: 'This codec is in combined mode',
            FeedbackId: 'displayPrompt',
            'Option.1':'Please use main Touch Panel',
          }).catch((error) => { console.error(error); });
        }
    break;
  }
});

function displayWarning()
{
  xapi.command('UserInterface Message Prompt Display', {
        Title: 'Combined Mode',
        Text: 'This codec is in combined mode',
        FeedbackId: 'displayPrompt',
        'Option.1':'Please use main Touch Panel'
      }).catch((error) => { console.error(error); });
  xapi.config.set('UserInterface Features HideAll', 'True')
    .catch((error) => { console.error(error); });
}

function removeWarning()
{
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

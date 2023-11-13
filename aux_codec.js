/*
Copyright (c) 2021 Cisco and/or its affiliates.
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
* Repository: gve_devnet_webex_devices_executive_room_multi_aux_switching_macro
* Macro file: aux_codec (specific for divisible room macro)
* Version: 2.2.1
* Released: November 13, 2023
* Latest RoomOS version tested: 11.9.1.13
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


/////////////////////////////////////////////////////////////////////////////////////////
// INSTALLER SETTINGS
/////////////////////////////////////////////////////////////////////////////////////////

// IP Address or webex ID (if BOT_TOKEN is set) of MAIN codec (i.e. CodecPro). To obtain codec ID: xStatus Webex DeveloperId
const MAIN_CODEC_IP = '10.10.10.11';

// MAIN_CODEC_USERNAME and MAIN_CODEC_PASSWORD are the username and password of a user with integrator or admin roles on the Main Codec
// Here are instructions on how to configure local user accounts on Webex Devices: https://help.webex.com/en-us/jkhs20/Local-User-Administration-on-Room-and-Desk-Devices)
// If you wish to slightly obfuscate the credentials, use a Base64 encoded string for MAIN_CODEC_USERNAME and
// leave MAIN_CODEC_PASSWORD blank. If you do that, you would need to combine the username and password in one string
// separated by a colon (i.e. "username:password") before Base64 encoding with a tool such as https://www.base64encode.org/
const MAIN_CODEC_USERNAME = 'username';
const MAIN_CODEC_PASSWORD = 'password';

// You can fill out the BOT_TOKEN value intead of OTHER_CODEC_USERNAME/OTHER_CODEC_PASSWORD to use the Webex cloud to
// communicate with other codecs in the system. it should contain the Bot access token you wish to use to have the codec use
// when sending commands to the other codecs by using Webex messaging. 
const BOT_TOKEN = '';

// Set USE_ST_BG_MODE to true if you want keep Quacams Speaker Tracking even while not being used
const USE_ST_BG_MODE = true;

// In RoomOS 11 there are multiple SpeakerTrack default behaviors to choose from on the navigator or
// Touch10 device. Set ST_DEFAULT_BEHAVIOR to the one you want this macro to use from these choices:
// Auto: The same as BestOverview.
// BestOverview: The default framing mode is Best overview. 
// Closeup: The default framing mode is Closeup (speaker tracking). 
// Current: The framing mode is kept unchanged when leaving a call. 
// Frames: The default framing mode is Frames.
const ST_DEFAULT_BEHAVIOR = 'Closeup'

// Set PEOPLE_COUNT_INTERVAL_MS to the number of milliseconds to use as the interval 
// for checking if there are people in the room. This process can take up to 2 minutes so 
// even though checking often to find out quickly when the number of people has changed it does
// not make sense to set this value to anything below 5000 (five seconds). Default is 60000 (one minute)
const PEOPLE_COUNT_INTERVAL_MS = 60000

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ DO NOT EDIT ANYTHING BELOW THIS LINE                                  +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


/////////////////////////////////////////////////////////////////////////////////////////
// STARTUP SCRIPT
// The following sections constitute a startup script that the codec will run whenever it
// boots.
/////////////////////////////////////////////////////////////////////////////////////////


xapi.config.set('Video Monitors', 'Single');
xapi.config.set('Video Output Connector 1 MonitorRole', 'First');
xapi.config.set('Standby Halfwake Mode', 'Manual').catch((error) => {
  console.log('Your software version does not support this configuration.  Please install ‘Custom Wallpaper’ on the codec in order to prevent Halfwake mode from occurring.');
  console.error(error);
});

xapi.config.set('Standby Control', 'Off');
xapi.command('Video Selfview Set', { Mode: 'On', FullScreenMode: 'On', OnMonitorRole: 'First' })
  .catch((error) => { console.error(error); });

/////////////////////////////////////////////////////////////////////////////////////////
// VARIABLES
/////////////////////////////////////////////////////////////////////////////////////////

let forceFramesOn = false;

//Declare your object for GMM communication
var mainCodec;
/////////////////////////////////////////////////////////////////////////////////////////
// FUNCTIONS
/////////////////////////////////////////////////////////////////////////////////////////

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    await xapi.Command.Camera.PositionSet({ CameraId: 1, Zoom: 12000 })
    await delay(1000);
    await xapi.Command.Camera.Preset.Store(
      { CameraId: 1, Name: "Overview", PresetId: 30 });
    console.log('Preset 30 created')
  }
}

async function getPeopleCount() {
  const value = await xapi.Status.RoomAnalytics.PeopleCount.Current.get()
  if (value == 0)
    await sendIntercodecMessage("aux_no_people")
  else
    await sendIntercodecMessage("aux_has_people") // if value is -1 then the feature is not available due to codec or camera capability, in this case always show the segment
}


// ---------------------- INITIALIZATION

async function init() {
  console.log('init');
  await xapi.Config.RoomAnalytics.PeoplePresenceDetector.set('On');
  await xapi.Config.RoomAnalytics.PeopleCountOutOfCall.set('On');
  // make sure Preset 30 exists, if not create it with just an overview shot of camera ID 1 which should be the QuadCam
  checkOverviewPreset();
  try {
    //mainCodec = new GMM.Connect.IP(MAIN_CODEC_USERNAME, MAIN_CODEC_PASSWORD, MAIN_CODEC_IP)
    if (BOT_TOKEN == '')
      mainCodec = new GMM.Connect.IP(MAIN_CODEC_USERNAME, MAIN_CODEC_PASSWORD, MAIN_CODEC_IP);
    else
      mainCodec = new GMM.Connect.Webex(BOT_TOKEN, MAIN_CODEC_IP);
  } catch (e) {
    console.error(e)
  }

  // register callback for processing messages from main codec
  xapi.Command.Cameras.SpeakerTrack.Activate();
  getPeopleCount();
  setInterval(getPeopleCount, PEOPLE_COUNT_INTERVAL_MS)
}
// ---------------------- ERROR HANDLING

function handleError(error) {
  console.log(error);
}

/////////////////////////////////////////////////////////////////////////////////////////
// INTER-MACRO MESSAGE HANDLING
/////////////////////////////////////////////////////////////////////////////////////////
GMM.Event.Receiver.on(event => {
  if (event.Type == 'Error') {
    console.error(event)
  } else {
    switch (event.Value) {
      case "VTC-1_status":
        handleMacroStatus();
        break;
      case 'wake_up':
        handleWakeUp();
        break;
      case 'shut_down':
        handleShutDown();
        break;
      case 'side_by_side':
        handleSideBySide();
        break;
      case 'automatic_mode':
        handleAutomaticMode();
        break;
      case 'force_frames_on':
        handleFramesOn();
        break;
      case 'force_frames_off':
        handleFramesOff();
        break;
      default:
        break;
    }
  }
})



// ---------------------- INTER-CODEC COMMUNICATION

async function sendIntercodecMessage(message) {
  console.log(`sendIntercodecMessage: codec = ${MAIN_CODEC_IP} | message = ${message}`);
  if (BOT_TOKEN == '')
    if (mainCodec != '') mainCodec.status(message).passIP().queue().catch(e => {
      console.log('Error sending message');
      alertFailedIntercodecComm("Error connecting to codec for first camera, please contact the Administrator");
    });
    else mainCodec.status(message).passDeviceId().queue().catch(e => {
      console.log('Error sending message');
      alertFailedIntercodecComm("Error connecting to codec for first camera, please contact the Administrator");
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

// ---------------------- MACROS


async function handleMacroStatus() {
  console.log('handleMacroStatus');
  await sendIntercodecMessage('VTC-1_OK');
}

function handleWakeUp() {
  console.log('handleWakeUp');
  // send required commands to this codec
  xapi.command('Standby Deactivate').catch(handleError);
  xapi.Command.Cameras.SpeakerTrack.Activate();
  setTimeout(function () {
    xapi.command('Video Selfview Set', { Mode: 'On', FullScreenMode: 'On', OnMonitorRole: 'First' })
      .catch((error) => { console.error(error); });
  }, 2000);
}

function handleShutDown() {
  console.log('handleShutDown');

  // send required commands to this codec
  xapi.command('Standby Activate').catch(handleError);
}

function handleSideBySide() {
  console.log('handleSideBySide');

  // send required commands to this codec
  pauseSpeakerTrack();
  xapi.command('Camera Preset Activate', { PresetId: 30 }).catch(handleError);
}

function handleAutomaticMode() {
  console.log('handleAutomaticMode');

  xapi.command('Video Selfview Set', { Mode: 'On', FullScreenMode: 'On', OnMonitorRole: 'First' })
    .catch((error) => { console.error(error); });


  xapi.Config.Cameras.SpeakerTrack.DefaultBehavior.set(ST_DEFAULT_BEHAVIOR);
  if (ST_DEFAULT_BEHAVIOR == 'Frames' || forceFramesOn) xapi.Command.Cameras.SpeakerTrack.Frames.Activate();
  else xapi.Command.Cameras.SpeakerTrack.Frames.Deactivate();


  // send required commands to this codec

  resumeSpeakerTrack();
}

function handleFramesOn() {
  console.log('Activating frames as instructed by Main...')
  xapi.Command.Cameras.SpeakerTrack.Frames.Activate();
  forceFramesOn = true;
}

function handleFramesOff() {
  console.log('Deactivating frames as instructed by Main...')
  xapi.Command.Cameras.SpeakerTrack.Frames.Deactivate();
  forceFramesOn = false;
}

function resumeSpeakerTrack() {
  if (USE_ST_BG_MODE) xapi.Command.Cameras.SpeakerTrack.BackgroundMode.Deactivate().catch(handleError);
  else xapi.Command.Cameras.SpeakerTrack.Activate().catch(handleError);
}

function pauseSpeakerTrack() {

  if (USE_ST_BG_MODE) xapi.Command.Cameras.SpeakerTrack.BackgroundMode.Activate().catch(handleError);
  else xapi.Command.Cameras.SpeakerTrack.Deactivate().catch(handleError);
}


xapi.Status.Cameras.SpeakerTrack.Availability
  .on((value) => {
    console.log("Event received for SpeakerTrack Availability: ", value)
    if (value == "Available") {
      init()
    }
  });

init();
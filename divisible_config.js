const JS_PRIMARY = 1, JS_SECONDARY = 2, JS_AUXILIARY = 3, JS_LOCAL = 0

const profile_LAY1 = {

    /*
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    + SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 - SECTION 1 +
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    */

    // The JOIN_SPLIT_ROOM_ROLE const tells the macro in the particular codec it is running
    // what role it should play; JS_PRIMARY , JS_SECONDARY or JS_AUXILIARY
    JS_PRIMARY: 1, JS_SECONDARY: 2, JS_AUXILIARY: 3, JS_LOCAL: 0,

    // set SECONDARY_MULTI_CAM to true if you intend to allow local switching of cameras on a secondary
    // codec, with or without the assistance of local auxiliary codecs
    SECONDARY_MULTI_CAM: false,

    // In this section, write in the values for the constants below.
    // For ROOM_ROLE fill in either JS_PRIMARY or JS_SECONDARY as the value.
    // If you wired your rooms different from what is indicated in the Version_3_Two-way_System_Drawing.pdf document
    // you can modify the  SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID
    // SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID and SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID constants
    // to match your setup. 
    // For PRIMARY_CODEC_IP enter the IP address for the Primary Codec. 
    JOIN_SPLIT_CONFIG: {
        ROOM_ROLE: JS_PRIMARY,
        SECONDARY_VIDEO_TIELINE_OUTPUT_TO_PRI_SEC_ID: 3, // change only for non-standard singe screen setups
        SECONDARY_AUDIO_TIELINE_OUTPUT_TO_PRI_ID: 5, // change only if non standard (i.e. codec EQ)
        SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID: 3, // change only for non-standard singe screen setups
        SECONDARY_VIDEO_TIELINE_INPUT_M2_FROM_PRI_ID: 4, // change only for non-standard singe screen setups
        BOT_TOKEN: '',
        PRIMARY_CODEC_IP: '10.0.0.100' // IP address or webex codec ID (if BOT_TOKEN is set) for primary codec. To obtain codec ID: xStatus Webex DeveloperId
    },

    // If you fill out the OTHER_CODEC_USERNAME and OTHER_CODEC_PASSWORD with the credentials to be able to log
    // into the the Secondary codec (if configuring Primary) or Primary codec (if configuring Secondary)
    // they will be used to establish an HTTP connection with that other codec, but these credentials will be
    // stored clear text in the macro. 
    // If you wish to slightly obfuscate the credentials, use a Base64 encoded string for OTHER_CODEC_USERNAME and
    // leave OTHER_CODEC_PASSWORD blank. If you do that, you would need to combine the username and password in one string
    // separated by a colon (i.e. "username:password") before Base64 encoding with a tool such as https://www.base64encode.org/
    // Instructions for creating these admin accounts are in the "Installation Instructions" document.
    OTHER_CODEC_USERNAME: '',
    OTHER_CODEC_PASSWORD: '',


    // You can fill out the BOT_TOKEN value intead of OTHER_CODEC_USERNAME/OTHER_CODEC_PASSWORD to use the Webex cloud to
    // communicate with other codecs in the system. it should contain the Bot access token you wish to use to have the codec use
    // when sending commands to the other codecs by using Webex messaging. 
    // NOTE: You must add the Bot that corresponds to the bot token you intend to use to the API access list in the Workspace where the device is configured
    // To do so in Control Hub, go to the Workspace for each device, click on the "Edit API Access" button and add the bot to the list (search for it by name)
    // with "Full Access" access level. 
    BOT_TOKEN: '',




    /*
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    + SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 - SECTION 2 
    + Only for use on PRIMARY Codec (i.e set ROOM_ROLE : JS_PRIMARY above, then fill this section
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    */

    // If you wish to pin-protect the room combine/split control
    // panel (when not using wall sensor), enter a numeric value for COMBINE_CONTROL_PIN
    // otherwise leave it blank: ""
    COMBINE_CONTROL_PIN: "",

    // For more reliability when combining and dividing rooms you can use a custom cable connecting the 
    // GPIO pins 2-4 between the primary codec and secondary codecs. This cable cannot be used if you have 
    // a setup where you need to "promote" a secondary room to primary to accomodate specific room layouts
    // in which case the value should be false.
    USE_GPIO_INTERCODEC: false,

    // USE_WALL_SENSOR controls if you use a physical wall sensor or not
    // If set to false, you will get a custom panel to manually switch rooms from join to split
    // If set to true, you will get a PIN protected override button, in case the wall sensor is broken
    // and you need to override manually
    USE_WALL_SENSOR: false,

    // WALL_SENSOR_COMBINED_STATE shoud contain the state of PIN 1 when the rooms is
    // combined. This could be 'High' or 'Low' depending on how the sensor is wired 
    WALL_SENSOR_COMBINED_STATE: 'Low',

    /*
      If you set USE_WALL_SENSOR to true above, you can
      change the override protect PINs here if needed.
    */
    COMBINE_PIN: "1234",
    SPLIT_PIN: "4321",
    FIXED_SENSOR: "5678",


    // USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS speficies if different settings should be used for presentertrack on primary codec
    // for combined and split modes. If set to true, you must modify the settings for presentertrack to use for each scenario in the 
    // SPLIT_PRESENTERTRACK_SETTINGS and COMBINED_PRESENTERTRACK_SETTINGS object constants below. 
    // Instructions on how setup and to obtain the settings from the primary codec can be found in 
    // the "How_to_Setup_Two-PresenterTrack_Zones.pdf" document in the same repository for this macro. 
    USE_ALTERNATE_COMBINED_PRESENTERTRACK_SETTINGS: false,
    SPLIT_PRESENTERTRACK_SETTINGS: {
        PAN: -1000,
        TILT: -309,
        ZOOM: 4104,
        TRIGGERZONE: '0,95,400,850'
    },//Replace these placeholder values with your actual values.

    // Each key in the N_COMBINED_PRESENTERTRACK_SETTINGS object refers to the
    // name of compositions associated to the secondary rooms selected (separated by ':' ), in addition
    // to the primary room,  when combining rooms for which you wish to use the set 
    // of values for presenter track reflected in the value of the entry. 
    // For example, entry with key 'RoomSecondaryRight' will be used when the primary room
    // plus the secondary codec associated to the RoomSecondaryRight are combined, and 
    // entry with key 'RoomSecondaryLeft:RoomSecondaryRight' will be used when the primary room
    // plus the secondary codecs associated to both the RoomSecondaryRight and RoomSecondaryRight are combined
    // into a 3 way combined room 
    N_COMBINED_PRESENTERTRACK_SETTINGS: {
        'RoomSecondaryRight':
        {
            PAN: -1378,
            TILT: -309,
            ZOOM: 4104,
            TRIGGERZONE: '0,89,549,898'
        },
        'RoomSecondaryLeft':
        {
            PAN: -1378,
            TILT: -309,
            ZOOM: 4104,
            TRIGGERZONE: '0,89,549,898'
        },
        'RoomSecondaryLeft:RoomSecondaryRight':
        {
            PAN: -1378,
            TILT: -309,
            ZOOM: 4104,
            TRIGGERZONE: '0,89,549,898'
        },
        'RoomSecondaryLeft:RoomSecondaryRight:RoomSecondaryFarRight':
        {
            PAN: -1378,
            TILT: -309,
            ZOOM: 4104,
            TRIGGERZONE: '0,89,549,898'
        }
    },  //Replace these placeholder values with your actual values.



    // CHK_VUMETER_LOUDSPEAKER specifies if we check the LoudspeakerActivity flag from the VuMeter events
    // to ignore any microphone activity while the loudspeakers are active to reduce the possibility of
    // switching due to sound coming in from remote participants in the meeting if the AfterAEC setting
    // is not being effective. Set to true to perform the check for each microphone activity event. 
    CHK_VUMETER_LOUDSPEAKER: false,

    /*
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    + SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 - SECTION 3 +
    + Only for use on SECONDARY Codec (i.e set ROOM_ROLE : JS_SECONDARY above, then fill this section
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    */

    // To set the volume of the primary codecs to a specific value when combined vs when standalone, set the
    // the PRIMARY_COMBINED_VOLUME_COMBINED and PRIMARY_COMBINED_VOLUME_STANDALONE constants
    // if you leave them with value 0 they will be ignored
    PRIMARY_COMBINED_VOLUME_COMBINED: 0,
    PRIMARY_COMBINED_VOLUME_STANDALONE: 0,

    // Change SECONDARY_COMBINED_VOLUME_CHANGE_STEPS if you want to adjust the volume on the secondary
    // codec when switching modes. Each step is equivalent to a 0.5 dB change. Set the value to 0 if you wish
    // to simply set the actual volume wne combined or standalone by using the SECONDARY_COMBINED_VOLUME_COMBINED and
    // SECONDARY_COMBINED_VOLUME_STANDALONE constants below
    SECONDARY_COMBINED_VOLUME_CHANGE_STEPS: 10,

    // To set the volume of the secondary codecs to a specific value when combined vs when standalone, set the
    // SECONDARY_COMBINED_VOLUME_CHANGE_STEPS to 0 and specific the correct volume you wish to set the codec to using
    // the SECONDARY_COMBINED_VOLUME_COMBINED and SECONDARY_COMBINED_VOLUME_STANDALONE constants
    SECONDARY_COMBINED_VOLUME_COMBINED: 0,
    SECONDARY_COMBINED_VOLUME_STANDALONE: 0,

    // If you would like to use the speaker on the monitor 1 in the secondary room, set SECONDARY_USE_MONITOR_AUDIO to true
    // otherwise the macro will turn off Audio on that connector
    SECONDARY_USE_MONITOR_AUDIO: false,

    /*
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    + SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 - SECTION 4 +
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    
    General microphones and video sources for both primary and secondary codecs

    The monitorMics, ethernetMics and usbMics arrays refer to locally connected microphones for which the macro will monitor vuMeter levels. 
    The ID range for monitorMics is 1-8 since it refers to the physical analog mic input connectors on the codec.
    The ID range for ethernetMics is 11-18, 21-28 an so forth until 81-88 since we support up to 8 ethernet mics with 8 
    sub-ids each. So, for example , ethernec mic ID 12 as specified in this array refers to Ethernet Mic 1, sub-ID 2
    The ID range for usbMics is 101-104 an maps to USB mic IDs 1-4 even though at the moment just one USB Mic input is supported (101)
    The externalMics array refers to externally connected microphones where a controller sends the codec text messages over SSH or 
    serial interface indicating which of those external microphones is currently active. 
    The text message should be sent by the controller in the format “MIC_ACTIVE_XX” where XX is a distinct 
    “microphone” id from 01 o 99. We are reserving 00 to indicate that there is relative silence in the room or that mute is active.
    Even though the receiving of unformatted “MIC_ACTIVE_XX” type strings is supported, for better logging it is strongly 
    recommended that the controller sends the message wrapped as an object as shown in the following examples. 
    sending the MIC_ACTIVE_01 message via serial: 
    xCommand Message Send Text: "{\x5C"App\x5C":\x5C"Crestron\x5C",\x5C"Source\x5C":{},\x5C"Type\x5C":\x5C"Command\x5C",\x5C"Value\x5C":\x5C"MIC_ACTIVE_01\x5C"}"\x0D\x0A  
    sending the MIC_ACTIVE_01 message via SSH:  
    xCommand Message Send Text: "{\"App\":\"Crestron\",\"Source\":{},\"Type\":\"Command\",\"Value\":\"MIC_ACTIVE_01\"}" 
    NOTE: Any combination of microphone types specified in the monitorMics, ethernetMics , usbMics and externalMics is supported by
    the macro, but given the differences in echo cancellation processing perfomed by the different microphone categories it is strongly
    advised to stick to only one type of microphone to use for each installation. 
    NOTE: See section 6 for PresenterTrack QA mode configuration and the PRESENTER_QA_AUDIENCE_MIC_IDS array 
    */

    config: {
        monitorMics: [1, 2, 4, 8], // (ex: [1, 2, 3, 4, 5, 6, 7, 8] ) analog input connectors (1-8) associated to microphones monitored
        ethernetMics: [], // (ex: 11, 12, 13, 14] ) IDs associated to Ethernet mics, up to 8 mics with 8 sub-ids: e.j. 12 is Ethernet Mic 1, sub-ID 2. 
        usbMics: [], // (ex: [101]) Mic input connectors associated to the USB microphones being used in the main codec: 101 is USB Mic 1
        externalMics: [], //  (ex: [901, 902]) input ids associated to microphones connected to an external controller received as message format MIC_ACTIVE_XX where XX is an external mic id 01-99
        compositions: [     // Create your array of compositions, if room role is JS_SECONDARY, these are for local cameras and AUX codecs only, no JS_SECONDARY source compositions allowed 
            {   // example for quadcam directly connected to connector 1 in main room 
                name: 'RoomMain',     // Name for your composition. If source is JS_SECONDARY and ROOM_ROLE is JS_PRIMARY, name will be used in toggle UI
                codecIP: '',        // No CodecIP needed if source is JS_LOCAL
                mics: [5],    // Mics you want to associate with this composition. Example: [1, 2, 3]
                connectors: [1],    // Video input connector Ids to use
                source: JS_LOCAL,   // Always use JS_LOCAL in Primary or Secondary when referring to locally connected camera
                layout: 'Prominent',// Layout to use
                preset: 0           // use a camera preset instead of a layout with specific connectors.
            },
            { // exmaple for video from Secondary codec 'RoomSecondaryRight'
                name: 'RoomSecondaryRight', //Name for your composition. If source is JS_SECONDARY and ROOM_ROLE is JS_PRIMARY, name will be used in toggle UI
                codecIP: '10.0.0.112', // IP address or Webex ID (if BOT_TOKEN is set) of the secondary codec. To obtain codec ID: xStatus Webex DeveloperId
                mics: [8], // in this example, audio tieline coming from secondary codec RoomSecondaryRight is connected into analog/mic connector 8
                connectors: [2], // in this example, video tie line from secondary codec RoomSecondaryRight is connected to input connector 2
                source: JS_SECONDARY, // all compositions related to secondary codecs must speecify source: JS_SECONDARY
                layout: 'Prominent',       // Layout to use
                preset: 0              // use a camera preset instead of a layout with specific connectors.
            },
            { // exmaple for video from Secondary codec 'RoomSecondaryLeft', remove is only using one secondary
                name: 'RoomSecondaryLeft', // Name for your composition. If source is JS_SECONDARY and ROOM_ROLE is JS_PRIMARY, name will be used in toggle UI
                codecIP: '10.0.0.110', // IP address or Webex ID (if BOT_TOKEN is set) of the secondary codec. To obtain codec ID: xStatus Webex DeveloperId
                mics: [7],// in this example, audio tieline coming from secondary codec RoomSecondaryLeft is connected into analog/mic connector 7
                connectors: [3], // in this example, video tie line from secondary codec RoomSecondaryLeft is connected to input connector 3
                source: JS_SECONDARY, // all compositions related to secondary codecs must speecify source: JS_SECONDARY
                layout: 'Prominent',       // Layout to use
                preset: 0 // use a camera preset instead of a layout with specific connectors.
            },
            { // example for auxiliary codec in primary room controlling another quadcam in the room 
                name: 'SecondQuadCam', // Name for your composition. 
                codecIP: '10.0.0.120', // IP address or Webex ID (if BOT_TOKEN is set) of auxiliary codec. To obtain codec ID: xStatus Webex DeveloperId
                mics: [5], // typically directly connected microphones (not from tie lines) when using auxiliary codecs. Here it specifies analog mic 5
                connectors: [4], // in this example, the auxiliary codecs monitor output is connected to input 4 on the primary codec. 
                source: JS_AUXILIARY, // all compositions related to auxiliary codecs in same room must speecify source: JS_AUXILIARY
                layout: 'Prominent',       // Layout to use
                preset: 0 // use a camera preset instead of a layout with specific connectors.
            },
            {
                // NOTE: If you want to always show and overview shot irrespective of microphone input, just
                // set SIDE_BY_SIDE_TIME in section 5 below to 0 
                // Also, if you wish to show several presets in a composition or a combination of presets and 
                // non-preset camera or tie line video inputs, specify the presets to use in the preset key below
                // as an array (i.e. [11,12]) but also include the video connector ID for the cameras for those 
                // presets in the connectors array below in the right order so the macro knows how to lay them out in the composition
                // (i.e. connectors:[2,3,1,4] if the connectorID for the camera associated for preset 11 is 2, 
                // the connectorID for the camera associated for preset 12 is 3 and you want to also include input from quadcam
                // at connector 1 and video from tieline from secondary in connector 4 as the overview shot.)
                name: 'Overview',   // IMPORTANT: There needs to be an overview compositino with mics: [0]
                codecIP: '',        // No CodecIP needed if source is JS_LOCAL
                mics: [0],  // always just [0] for overview compositions
                connectors: [1], // Specify here the video inputs and order to use to compose the "overview" shot. Ex: [2,1] including those for preset related cameras
                source: JS_LOCAL,   // Overview composition always has source JS_LOCAL
                layout: 'Equal',       // Layout to use
                preset: 0 // use a camera preset instead of a layout with specific connectors. Specify a single preset or an array of preset Ids
                // NOTE: do not set preset to just one integer if you want more than one video input to be layed out, if you only
                // have one preset but still want to specify other connectos in the layout then specify and array of just one preset
                // (i.e. preset: [11] if only preset 11 will be used and connectors:[2,1,4] if you want to compose it input from the
                // camera doing the preset with connectors 1 and 4 as well.)
                // Setting preset to just one integeter will force it to ignore the connectors value
                // Set preset to 0 if no presets will be used. 
            }
        ]
    },


    // If you are using a SpeakerTrack 60, set QUAD_CAM_ID to the connector ID where the first camera of the array is connected 
    // and also use that ID in the connetors array in the compositions above 
    // If you are using a QuadCam, set this value to the connector ID being used for it.
    // If you do not have any speakertracking capable cameras, just set this value to 0  
    QUAD_CAM_ID: 1,


    OVERVIEW_SINGLE_SOURCE_ID: 1, // No longer necessary, will be removed in future version

    // In RoomOS 11 there are multiple SpeakerTrack default behaviors to choose from on the navigator or
    // Touch10 device. Set ST_DEFAULT_BEHAVIOR to the one you want this macro to use from these choices:
    // Auto: The same as BestOverview.
    // BestOverview: The default framing mode is Best overview. 
    // Closeup: The default framing mode is Closeup (speaker tracking). 
    // Current: The framing mode is kept unchanged when leaving a call. 
    // Frames: The default framing mode is Frames.
    ST_DEFAULT_BEHAVIOR: 'Closeup',


    /*
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    + SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 - SECTION 5 +
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    
    TIMERS and THRESHOLDS
    */


    // Time to wait for silence before setting Speakertrack Side-by-Side (Overview) mode
    // set SIDE_BY_SIDE_TIME to 0 if you always want to show that mode
    SIDE_BY_SIDE_TIME: 10000, // 10 seconds
    // Time to wait before switching to a new speaker
    NEW_SPEAKER_TIME: 2000, // 2 seconds
    // Time to wait before activating automatic mode at the beginning of a call
    INITIAL_CALL_TIME: 15000, // 15 seconds

    // WEBRTC_VIDEO_UNMUTE_WAIT_TIME only applies to RoomOS version 10 since
    // have to to implement a woraround there to be able to switch cameras
    // while in a WebRTC call. Values less than 1500 ms do not seem to work, but
    // if you are having trouble getting switching to work in WebRTC calls you can increase
    // this value although that will affect the overall experience since during this time
    // the remote participants just see a black screen instead of the video feed.
    WEBRTC_VIDEO_UNMUTE_WAIT_TIME: 1500,

    // Microphone High/Low Thresholds
    MICROPHONELOW: 6,
    MICROPHONEHIGH: 25,

    /*
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    + SECTION 6 - SECTION 6 - SECTION 6 - SECTION 6 - SECTION 6 - SECTION 6 +
    +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

    Presenter Track Q&A Mode
    */

    // ALLOW_PRESENTER_QA_MODE controls if the custom panel for activating PresenterTrack with or without 
    // Q&A Mode is shown in the Touch10 or Navigator. Without it, you cannot activate PresenterTrack Q&A mode
    ALLOW_PRESENTER_QA_MODE: true,

    //PRESENTER_QA_AUDIENCE_MIC_IDS is an array for Mic IDs that are being used for the audience. 
    PRESENTER_QA_AUDIENCE_MIC_IDS: [1, 2],


    // PRESENTER_QA_KEEP_COMPOSITION_TIME is the time in ms that the macro will keep sending
    // a composed image of the presenter and an audience member asking a question after the question
    // has been asked by any audience member. If different audience members ask questions while the composition 
    // is being shown after NEW_SPEAKER_TIME milliseconds have passed, the composition will change 
    // to use that new audience member instead of the original. This will continue until no other audience members have
    // spoken for PRESENTER_QA_KEEP_COMPOSITION_TIME milliseconds and then the code will resume sending only the 
    // full video feed from the Presenter camera 
    PRESENTER_QA_KEEP_COMPOSITION_TIME: 7000
}


/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ IF YOU DO NOT HAVE ANY ALTERNATIVE ROLES FOR CODECS IN YOUR SOLUTIONS 
+ SUCH AS A SECONDARY BECOMING A PRIMARY FOR CERTAIN LAYOUTS, THEN DO NOT EDIT 
+ ANYTHING BELOW THIS LINE                                  +
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/


/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ YOU CAN HAVE UP TO 4 ALTERNATE LAYOUT PROFILES,
+ JUST FILL IN profile_LAY2 thru profile_LAY4 IF YOU NEED MORE
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

const profile_LAY2 = {}
const profile_LAY3 = {}
const profile_LAY4 = {}

/*
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
+ Fill out the IP Address you will use for this codec to be referred to in the
+ value for the 'combine' key in the L_WALLS object for each 'layout'
+ The example shows what you would fill out when configuring for the 
+ primary main room, but different rooms must have a different value for 
+ THIS_CODEC_IP and should match the correct entries in the value for the
+ combine key for each layout.
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
*/

const THIS_CODEC_IP = '10.0.0.100'


// You only need to fill out the LAYOUTS constant object on the main primary codec. 
// Specify the name of the various room combination layouts you implemented below
const LAYOUTS = {
    "LAY1": "Pri: 2, Secs: 1,3,4",
    "LAY2": "Pri:2, Sec:1; Pri: 3, Sec: 4",
    "LAY3": "", // leave empty if a layout is not needed
    "LAY4": "" // leave empty if a layout is not needed
}

// You only need to fill out the L_WALLS constant object on the main primary codec. 
// example below corresponds to the following rooms in the system layed out from left to right:
// 1)10.0.0.110: Always a secondary to room 2
// 2)10.0.0.100: Main Primary. Primary to 1,3 and 4 in Layout1, but only to 1 in Layout 2
// 3)10.0.0.112: Proxy codec; is a Secondary to room 2 in Layout1, but becomes a Primary to room 4 in Layout2
// 4)10.0.0.114: Always a secondary, but to room 2 in Layout1 and to room 3 in Layout2
//NOTE: Always fill out all 3 digits for the keys for the L_WALLS object with either 1 or 0. If you are only using 
// two walls, then always use 0 for the third digit 
const L_WALLS = {
    "111": { "layout": "LAY1", "combine": "" }, // all split
    "000": { "layout": "LAY1", "combine": "10.0.0.100:10.0.0.110:10.0.0.112:10.0.0.114" }, //select all secondaries, combine
    "010": { "layout": "LAY2", "combine": "10.0.0.100:10.0.0.110:10.0.0.112:10.0.0.114" }, // both mains select secondary, both combine
    "110": { "layout": "LAY2", "combine": "10.0.0.112:10.0.0.114" }, //main on 2 splits, main on 3 selects secondary and combines
    "011": { "layout": "LAY1", "combine": "10.0.0.100:10.0.0.110" }, //main on 2 selects secondary1 (deselects 3,4) and combines just 2 and 1
    "101": { "layout": "LAY1", "combine": "10.0.0.100:10.0.0.112" }, //main on 2 selects secondary3 (deselects 1,4) and combines just 2 and 3
    "100": { "layout": "LAY1", "combine": "10.0.0.100:10.0.0.112:10.0.0.114" }, //main on 2 selects secondary3 and secondary 4 (deselects 1) and combines 2,3,4
    "001": { "layout": "LAY1", "combine": "10.0.0.100:10.0.0.110:10.0.0.112" } // main on 2 selects secondary1 and secondary 3 (deselects 4) and combines 1,2,3
}

export { profile_LAY1, profile_LAY2, profile_LAY3, profile_LAY4, LAYOUTS, L_WALLS, THIS_CODEC_IP }
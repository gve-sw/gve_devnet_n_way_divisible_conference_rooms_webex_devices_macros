3/21/23 Changes:

- Added validation for not changing macro name.
- Added code to auto-generate preset 30 if not already configured. Still need to be modified manually to
  show the right image since the code just completey zooms out QuadCam on connector 1 to save the preset.
- Confirmation messages that secondary codecs are online or in calls now kept separate for each one to prevent
  race conditions.
- Added the divisible_room_ECS sample macro to easily add xAPI commands to drive an External Controller based on the
  divisible macro events that are triggered so that code does not have to be embedded in the macro itself in multiple places.

3/25/23 Changes:

- Added ability to select of de-select secondary codecs in the Room Combine Control custom panel button so that only certain secondary rooms are included when combining rooms.

4/20/23 Changes:

- Removed dependency on GPIO custom cable for inter-codec communication with the secondaries
- Added pin protection for the "Room Combine Control" custom panel

5/23/23 Changes:

- Added versioning (currently at version 2.1.2)
- Updated installation instructions
- Fixed issue with restoring speakertrack on primary room after exiting side-by-side view
- changes to GMM connection object instantiation to improve reliability

5/25/23 Changes (version 2.1.3):

- Modified all calls to GMM library to send inter-codec messages to be asynchronous
- Added keep alive mechanism between primary and secondaries

5/31/23 Changes (version 2.1.4):

- Added mechanism to adjust system volume when combined and split so you can hard code settings for each instead of just increasing and decreasing based on number of change steps.

6/1/23 Changes (version 2.1.5):

- Corrected code on Secondary that turns audio input on/off when combine/split from HDMI tie line from Primary specified in SECONDARY_VIDEO_TIELINE_INPUT_M1_FROM_PRI_ID instead of a hard coded value of connector 3
- Stopped displaying a secondary to select in Room Combine Control custom panel when there is only one secondary configured since you cannot deselect it anyhow.

6/5/23 Changes (version 2.1.6)

- Corrected handling of storing to permanent storage display configuration while rooms are combined and macro restarts

6/13/23 Changes (version 2.1.7)

- Implemented more robust mechanism to select secondary codecs and receive confirmation that setting was propagated to target devices
- Corrected situation where secondary in call was not being reported to primary if not using GPIO cable
- Added console log warning when macro on secondary codec is not correctly named

6/15/23 Changes (version 2.1.8)

- Only hide Room Combine Control panel when primary codec is in a call, not when secondaries are since we still check for those not being in call before combining
- Allow combine/split of selected rooms even if un-selected room is in a call.

6/22/23 Changes (version 2.1.9)

- Added an option for the use of the Monitor speakers on Secondary rooms (SECONDARY_USE_MONITOR_AUDIO) since before it was assumed they were not being used.
- Fixed sending audio across tie line from Primary to Secondaries when using HDMI Out connector 2 for single-screen configurations that use Monitor connector 2 instead of splitter on connector 1.

6/30/23 Changes (version 2.1.10)

- Added handlers to detect presentation preview on primary and secondaries and now allow split/combine while presentation preview is active. Same for the primary codec. Behaves the same as when a codec is in a call: refusal to join/split and notification if secondary is in call or in presentation preview and if it is the Primary codec that is in those states, the "Room Combine Control" custom panel is hidden.

8/3/23 Changes (version 2.1.11)

- Added protections so that Primary never switches to a video input coming from a secondary when in standalone mode even if somehow the associated audio input has audio activity (output on secondary out line 5 should have been turned off when switching to standalone). Also for when Primary is in combined mode but audio from a non-selected secondary room is somehow passed over to the primary through it's corresponding connector
- Added code to prevent trying to assign inCall or inPreview status on Primary when corresponding events come from a secondary with an IP that does not match any configured secondaries.
- Added combine/split status to "High Triggered" console log messages to help troubleshooting since VuMeters are turned on even when codec is split.

9/22/23 Changes (version 2.1.12)

- Added support for Codec EQ
- Added validation to stop running on any platform that is not Codec Pro or Codec EQ

9/25/23 Changes (version 2.1.13)

- Added support for multiple combined room configurations for Presentertrack trigger zones to accomodate setups with more than one secondary room.
- Added support for auto-trigger of presenterTrack so that you can keep it on from the custom  
  panel button (including QA mode) and have it stop tracking once you leave the stage and re-acquire  
  when you return to it.

10/9/23 Changes (version 2.1.14)

- Added support for Ethernet and USB mics for compositions on the Primary only
- Added code to turn off HDMI input Audio on all incoming tie lines (connectors) on Primary
- Added ability to set specific volume levels on primary when combining or splitting rooms
- Added explicit commands to turn on Closeup mode for speakertracking when selected as default

10/27/23 Changes (version 2.2.0)

- Added support for external controllers to send microphone active messages in the format MIC_ACTIVE_XX so that the macro will use that for selecting video compositions to switch the video input for a call. This way external controllers can handle all audio for the rooms (mics and speakers) and just let the divisible_room macro handle the video switching and overall call control and touch controller states.
- Added support for switching between different video sources based on local mic input in secondary rooms even when combined
- Added support for multiple quadcams on primary and secondary rooms by supporting Auxiliary codecs running the aux_codec macro to control their locally connected QuadCam
- Split out configuration sections of the macro in the divisible_room.js file to a separate divisible_config.js file for simpler updating of macro code and to support multiple advanced layouts.
- Added support for multiple advanced layouts including the ability to give dual roles to some of the codecs so they act as a Primary or Secondary accourding to the selected layout.
- Added support for up to three wall sensors connected via GPIO PINS 1-3 when using advanced layouts.

11/13/23 Changes (version 2.2.1)

- Support for bot token and device ID for intercodec communication as alternative to username/password (pending GMM_Lib changes)
- Support for preset and list of presets in overview compositions
- Support for "always on" overview by allowing SIDE_BY_SIDE_TIME global to be set to 0.

12/7/23 Changes (version 2.2.2)

- Fixed support for bot token in GMM_Lib and divisible_room and added instructions on needing to add Bot to be used to the API Access list of the Workspace where the device resides in Control Hub

1/24/24 Changes (version 2.2.3)

- Added sending messages to Aux codecs on Primary and Secondary rooms to go automatic or side by side mode since those had been omitted
- Added code to ignore external mic events when in manual mode since they were triggering camera changes when not wanted
- Corrected problems with custom panel PresenterTrack mode (without QA) since speakercamera backgrouding was incorrectly being handled.

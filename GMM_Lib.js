/********************************************************
Copyright (c) 2022 Cisco and/or its affiliates.
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

 * Author:                  Robert(Bobby) McGonigle Jr
 *                          Technical Marketing Engineer
 *                          Cisco Systems
 *                          bomcgoni@cisco.com
 * 
 * 
 * Consulting Engineer:     Gerardo Chaves
 *                          Technical Solutions Architect
 *                          Cisco Systems
 * 
 * Special Thanks:          Zacharie Gignac
 *                          Université Laval
 *                          - Contributions made to the 
 *                            original Memory_Functions have 
 *                            been merged in GMM_Lib version 1.7.0
 * 
 * Released: May 16, 2022
 * Updated: Nov 8, 2023 
 * 
 * Version: 1.9.702
 * 
 * GMM.Config.adjustHTTPClientTimeout
 * 
 * GMM.Config.queueInternvalInMs
 * 
 * GMM.Config.allowLegacyErrorSystem
*/

import xapi from 'xapi';

export const GMM = {
  Config: {
    MacroName: _main_macro_name()
  },
  DevConfig: {
    version: '1.9.702'
  },
  DevAssets: {
    queue: [],
    filterAuthRegex: /[\\]*"Auth[\\]*"\s*:\s*[\\]*"([a-zA-Z0-9\/\+\=\_\-]*)\s*[\\]*"/gm,
    memoryConfig: {
      storageMacro: 'Memory_Storage',
      baseMacro: {
        './GMM_Lib_Info': {
          Warning: 'DO NOT MODIFY THIS FILE. It is accessed by multiple macros running on this Room Device',
          Description: {
            1: 'Memory_Functions is a Macro the acts like a simple database, allowing you to read and write data from you current project',
            2: 'Memory_Storage is accessed by either the original Memory_Functions Macro or the GMM_Lib Macro',
            3: 'Memory_Storage deos not need to be activated, and should remain deactivated to limit the # of active macros on your Room Device',
            4: 'To learn how to use either macro, please reference the guides below',
            Guides: { 'Global Macro Messaging': 'https://roomos.cisco.com/macros/Global%20Macro%20Messaging', 'Memory Functions': 'https://github.com/Bobby-McGonigle/Cisco-RoomDevice-Macro-Projects-Examples/tree/master/Macro%20Memory%20Storage' }
          }
        }
      }
    },
    maxPayloadSize: 1024
  },
  memoryInit: async function () {
    try {
      await xapi.Command.Macros.Macro.Get({ Name: GMM.DevAssets.memoryConfig.storageMacro })
    } catch (e) {
      console.warn({ '⚠ GMM Warn ⚠': `Uh-Oh, GMM Memory Storage Macro not found, creating ${GMM.DevAssets.memoryConfig.storageMacro} macro.` })
      await xapi.Command.Macros.Macro.Save({ Name: GMM.DevAssets.memoryConfig.storageMacro }, `var memory = ${JSON.stringify(GMM.DevAssets.memoryConfig.baseMacro, null, 2)}`)
      console.info({ 'GMM Info': `${GMM.DevAssets.memoryConfig.storageMacro} macro saved to system, restarting macro runtime...` })
      setTimeout(async function () {
        await xapi.Command.Macros.Runtime.Restart()
      }, 1000)
    }
    return
  },
  read: async function (key) {
    var macro = ''
    try {
      macro = await xapi.Command.Macros.Macro.Get({ Name: GMM.DevAssets.memoryConfig.storageMacro, Content: 'True' })
    } catch (e) { }
    return new Promise((resolve, reject) => {
      const raw = macro.Macro[0].Content.replace(/var.*memory.*=\s*{/g, '{');
      let data = JSON.parse(raw);
      let temp;
      if (data[GMM.Config.MacroName] == undefined) {
        data[GMM.Config.MacroName] = {};
        temp = data[GMM.Config.MacroName];
      } else {
        temp = data[GMM.Config.MacroName];
      }
      if (temp[key] != undefined) {
        resolve(temp[key]);
      } else {
        reject({ '⚠ GMM Error ⚠': `GMM.read Error. Object [${key}] not found in [${GMM.DevAssets.memoryConfig.storageMacro}] for Macro [${GMM.Config.MacroName}]` })
      }
    })
  },
  write: async function (key, value) {
    var macro = ''
    try {
      macro = await xapi.Command.Macros.Macro.Get({ Name: GMM.DevAssets.memoryConfig.storageMacro, Content: 'True' })
    } catch (e) { };
    return new Promise((resolve) => {
      const raw = macro.Macro[0].Content.replace(/var.*memory.*=\s*{/g, '{');
      let data = JSON.parse(raw);
      let temp;
      if (data[GMM.Config.MacroName] == undefined) {
        data[GMM.Config.MacroName] = {};
        temp = data[GMM.Config.MacroName];
      } else {
        temp = data[GMM.Config.MacroName];
      }
      temp[key] = value;
      data[GMM.Config.MacroName] = temp;
      const newStore = JSON.stringify(data, null, 2);
      xapi.Command.Macros.Macro.Save({ Name: GMM.DevAssets.memoryConfig.storageMacro }, `var memory = ${newStore}`).then(() => {
        console.debug({ 'GMM Debug': `Local Write Complete`, Location: GMM.Config.MacroName, Data: `{"${key}" : "${value}"}` });
        resolve(value);
      });
    })
  },
  Message: {
    Webex: {
      User: class {
        constructor(CommonBotToken, ...userEmail_Array) {
          this.Params = {
            Url: 'https://webexapis.com/v1/messages',
            Header: ['Content-Type: application/json', 'Authorization: Bearer ' + CommonBotToken,],
            AllowInsecureHTTPS: 'True'
          }
          this.group = userEmail_Array.toString().split(',')
          xapi.Config.HttpClient.Mode.set('On')
          xapi.Config.HttpClient.AllowInsecureHTTPS.set('True')
          console.warn({ '⚠ GMM Warn ⚠': `The HTTPClient has been enabled by instantiating an object with the GMM.Message.Webex.User class found in the ${GMM.Config.MacroName} macro` })
          console.warn({ '⚠ GMM Warn ⚠': `Be sure to securely store your bot token. It is POOR PRACTICE to store any authentication tokens within a Macro` })
        }
        body(message) {
          this.message = `${message}`
          return this
        }
        formattedBody(title = 'Title', subtitle = 'Subtitle', body = 'Message Body', data = '', footer = '') {
          this.message = `- - -\n- - -\n# ${title}\n### ${subtitle}\n **----------------------------------** \n${body}\n${data == '' ? '' : `\`\`\`\n${data}\n\`\`\`\n`}${footer = '' ? '' : `_${footer}_`}\n`
          return this
        }
        async post() {
          const deviceSerial = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()
          const name = await xapi.Status.UserInterface.ContactInfo.Name.get()
          const ip = await xapi.Status.Network[1].IPv4.Address.get().catch(async e => {
            console.debug({ 'GMM Debug': 'Error caught on IPv4 aquisition, Attempting to aquire IPv6...', Class: 'GMM.Message.Webex.User', Error: e })
            const IPv6 = await xapi.Status.Network[1].IPv6.Address.get()
            return IPv6
          })
          var GMM_groupError = []
          for (let i = 0; i < this.group.length; i++) {
            try {
              const body = {
                "toPersonEmail": this.group[i],
                "markdown": this.message + `\n **[ Device Info ]** \n DisplayName: ${name}\nSerial: ${deviceSerial}\nAddress: [${ip}](https://${ip}/)\nTimestamp: ${(new Date()).toLocaleString()}\nMacro(App): ${GMM.Config.MacroName}`
              }
              const request = await xapi.Command.HttpClient.Post(this.Params, JSON.stringify(body))
              console.debug({ 'GMM Debug': `Message sent to usergroup [${this.group[i]}] on the Webex App`, Message: this.message, Response: `${request.StatusCode}:${request.status}` })
            } catch (e) {
              e['GMM_Context'] = {
                Destination: this.group[i],
                Message: 'Failed to send message to Webex User',
                PossibleSolution: 'Invite this user to Webex or else this bot can not send messages to this user'
              }
              GMM_groupError.push(e)
            }
          }
          if (GMM_groupError.length > 0) {
            throw GMM_groupError
          }
        }
      },
      Room: class {
        constructor(CommonBotToken, ...roomId_Array) {
          this.Params = {
            Url: 'https://webexapis.com/v1/messages',
            Header: ['Content-Type: application/json', 'Authorization: Bearer ' + CommonBotToken,],
            AllowInsecureHTTPS: 'True'
          }
          this.group = roomId_Array.toString().split(',')
          console.warn({ '⚠ GMM Warn ⚠': `The HTTPClient has been enabled by instantiating an object with the GMM.Message.Webex.Room class found in the ${GMM.Config.MacroName} macro` })
          console.warn({ '⚠ GMM Warn ⚠': `Be sure to securely store your bot token. It is POOR PRACTICE to store any authentication tokens within a Macro` })
        }
        body(message) {
          this.message = `- - -\n# Message:\n${message}`
          return this
        }
        formattedBody(title = 'Title', subtitle = 'Subtitle', body = 'Message Body', data = '', footer = '') {
          this.message = `- - -\n- - -\n# ${title}\n### ${subtitle}\n **----------------------------------** \n${body}\n${data == '' ? '' : `\`\`\`\n${data}\n\`\`\`\n`}${footer = '' ? '' : `_${footer}_`}\n`
          return this
        }
        async post() {
          const deviceSerial = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()
          const name = await xapi.Status.UserInterface.ContactInfo.Name.get()
          const ip = await xapi.Status.Network[1].IPv4.Address.get().catch(async e => {
            console.debug({ 'GMM Debug': 'Error caught on IPv4 aquisition, Attempting IPv6...', Class: 'GMM.Message.Webex.Room', Error: e })
            const IPv6 = await xapi.Status.Network[1].IPv6.Address.get()
            return IPv6
          })
          var GMM_groupError = []
          for (let i = 0; i < this.group.length; i++) {
            try {
              const body = {
                "roomId": this.group[i],
                "markdown": this.message + `\n **---------------------------------------** \n **[ Device Info ]-------------------------** \n DisplayName: ${name}\nSerial: ${deviceSerial}\nAddress: [${ip}](https://${ip}/)\nTimestamp: ${(new Date()).toLocaleString()}\nMacro(App): ${GMM.Config.MacroName}`
              }
              const request = await xapi.Command.HttpClient.Post(this.Params, JSON.stringify(body))
              console.debug({ 'GMM Debug': `Message sent to roomgroup [${this.group[i]}] on the Webex App`, Message: this.message, Response: `${request.StatusCode}:${request.status}` })
            } catch (e) {
              e['GMM_Context'] = {
                Destination: this.group[i],
                Message: 'Failed to send message to Webex Room',
                PossibleSolution: 'Invite this bot to that Webex Room Destination, or else it can not send messages to the room'
              }
              GMM_groupError.push(e)
            }
          }
          if (GMM_groupError.length > 0) {
            throw GMM_groupError
          }
        }
      }
    }
  },
  Connect: {
    Local: class {
      constructor() {
        this.App = GMM.Config.MacroName
        this.Payload = { App: this.App, Source: { Type: 'Local', Id: 'localhost' }, Type: '', Value: '' }
        if (GMM.Config?.queueInternvalInMs < 250) { console.warn({ '⚠ GMM Warn ⚠': `${GMM.Config.queueInternvalInMs}ms is below the recommended minimum of 250ms for GMM.Config.queueInternvalInMs` }) };
      }
      status(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .status(message) method', Class: 'GMM.Connect.Local Class', Action: 'Provide an object as message parameter' }
        }

        this.Payload['Type'] = 'Status'
        this.Payload['Value'] = message
        return this
      }
      error(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .error(message) method', Class: 'GMM.Connect.Local Class', Action: 'Provide an object as message parameter' }
        }

        this.Payload['Type'] = 'Error'
        this.Payload['Value'] = message
        return this
      }
      command(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .command(message) method', Class: 'GMM.Connect.Local Class', Action: 'Provide an object as message parameter' }
        }
        this.Payload['Type'] = 'Command'
        this.Payload['Value'] = message
        return this
      }
      async queue() {
        GMM.DevAssets.queue.push({ Payload: JSON.parse(JSON.stringify(this.Payload)), Type: 'Local', Id: '_local' })
        console.debug({ 'GMM Debug': `Local [${this.Payload.Type}] queued`, SendingMacro: this.App, Payload: JSON.stringify(this.Payload) })
        console.debug({ Message: `Local Payload queued`, Payload: JSON.stringify(this.Payload) })
      }
      async post() {
        await xapi.Command.Message.Send({ Text: JSON.stringify(this.Payload) })
        console.debug({ 'GMM Debug': `Local [${this.Payload.Type}] sent`, SendingMacro: this.App, Payload: JSON.stringify(this.Payload) })
      }
    },
    IP: class {
      constructor(CommonUsername = '', CommonPassword = '', ...ipArray) {
        const b64_reg = /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{3}=|[A-Za-z\d+/]{2}==)?$/
        if (CommonUsername == '' && CommonPassword == '') {
          throw { '⚠ GMM Error ⚠': 'Common Authentication Parameters not found, unable to contruct GMM.Connect.IP class' }
        } else if (CommonPassword == '' && b64_reg.test(CommonUsername)) {
          this.Params = {
            Url: ``,
            Header: ['Content-Type: text/xml', `Authorization: Basic ${CommonUsername}`],
            AllowInsecureHTTPS: 'True'
          }
        } else {
          this.Params = {
            Url: ``,
            Header: ['Content-Type: text/xml', `Authorization: Basic ${btoa(CommonUsername + ':' + CommonPassword)}`],
            AllowInsecureHTTPS: 'True'
          }
        }
        if (GMM.Config?.adjustHTTPClientTimeout > 0) {
          if (GMM.Config?.adjustHTTPClientTimeout > 30) {
            console.warn({ '⚠ GMM Warn ⚠': `GMM.Config.adjustHTTPClientTimeout max timeout is 30 seconds. Defaulting to 30 seconds` })
          } else {
            this.Params['Timeout'] = GMM.Config.adjustHTTPClientTimeout
          }
        }
        this.Payload = { App: GMM.Config.MacroName, Source: { Type: 'Remote_IP', Id: '' }, Type: '', Value: '' }
        this.group = ipArray.toString().split(',')
        xapi.Config.HttpClient.Mode.set('On')
        xapi.Config.HttpClient.AllowInsecureHTTPS.set('True')
        console.warn({ '⚠ GMM Warn ⚠': `The HTTPClient has been enabled by instantiating an object with the GMM.Connect.IP class found in the ${GMM.Config.MacroName} macro` })
        console.warn({ '⚠ GMM Warn ⚠': `Be sure to securely store your device credentials. It is POOR PRACTICE to store any credentials within a Macro` })
        if (GMM.Config?.queueInternvalInMs < 250) { console.warn({ '⚠ GMM Warn ⚠': `${GMM.Config.queueInternvalInMs}ms is below the recommended minimum of 250ms for GMM.Config.queueInternvalInMs` }) };
      }
      status(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .status(message) method', Class: 'GMM.Connect.IP Class', Action: 'Provide an object as message parameter' }
        }
        this.Payload['Type'] = 'Status'
        this.Payload['Value'] = message
        return this
      }
      error(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .error(message) method', Class: 'GMM.Connect.IP Class', Action: 'Provide an object as message parameter' }
        }
        this.Payload['Type'] = 'Error'
        this.Payload['Value'] = message
        return this
      }
      command(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .command(message) method', Class: 'GMM.Connect.IP Class', Action: 'Provide an object as message parameter' }
        }
        this.Payload['Type'] = 'Command'
        this.Payload['Value'] = message
        return this
      }
      passIP(stack = 'v4') {
        if (stack != 'v4' && stack != 'v6') {
          throw { '⚠ GMM Error ⚠': `[${stack}] is an invalid IPstack. Accepted Values for the method .passIP(stack) are "v4" or "v6"` }
        }
        this.Payload.Source[`IP`] = stack
        return this
      }
      passAuth(username = '', password = '') {
        if (username == '') {
          throw { '⚠ GMM Error ⚠': 'Username parameter was missing from method: .passAuth(username, password)', Class: 'GMM.Connect.IP', Action: 'Provide authentication to class contructor' }
        }
        if (password == '') {
          throw { '⚠ GMM Error ⚠': 'Password parameter was missing from method: .passAuth(username, password)', Class: 'GMM.Connect.IP', Action: 'Provide authentication to class contructor' }
        }
        this.Payload.Source['Auth'] = btoa(`${username}:${password}`)
        console.warn({ '⚠ GMM Warn ⚠': `The passAuth() method has been applied to this payload`, Value: this.Payload.Value })
        return this
      }
      async queue(id, ...GMM_filter_DeviceIP) {
        this.Payload.Source.Id = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()
        if (typeof this.Payload.Source.IP != 'undefined') {
          var temp = JSON.stringify(this.Payload.Source.IP).replace(/"/g, '')
          this.Payload.Source[`IP${this.Payload.Source.IP}`] = await xapi.Status.Network[1][`IP${this.Payload.Source.IP}`].Address.get()
          delete this.Payload.Source.IP
        }
        if (JSON.stringify(this.Payload).length > GMM.DevAssets.maxPayloadSize) {
          throw ({ '⚠ GMM Error ⚠': `GMM Connect IP paylod exceed maximum character limit`, MaxLimit: GMM.DevAssets.maxPayloadSize, Payload: { Size: JSON.stringify(this.Payload).length, Content: JSON.stringify(this.Payload) } })
        }

        if (GMM_filter_DeviceIP == '') {
          for (let i = 0; i < this.group.length; i++) {
            this.Params.Url = `https://${this.group[i]}/putxml`
            const body = `<Command><Message><Send><Text>${JSON.stringify(this.Payload)}</Text></Send></Message></Command>`
            GMM.DevAssets.queue.push({ Params: JSON.parse(JSON.stringify(this.Params)), Body: body, Device: this.group[i], Type: 'Remote_IP', Id: `${id}` })
            console.debug({ 'GMM Debug': `Remote_IP message queued for [${this.group[i]}]`, Filter: 'False', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`) })
          }
        } else {
          const subGroup = GMM_filter_DeviceIP.toString().split(',')
          for (let i = 0; i < subGroup.length; i++) {
            if (this.group.includes(subGroup[i])) {
              this.Params.Url = `https://${subGroup[i]}/putxml`
              const body = `<Command><Message><Send><Text>${JSON.stringify(this.Payload)}</Text></Send></Message></Command>`
              GMM.DevAssets.queue.push({ Params: JSON.parse(JSON.stringify(this.Params)), Body: body, Device: subGroup[i], Type: 'Remote_IP', Id: `${id}` })
              console.debug({ 'GMM Debug': `Remote_IP message queued for [${subGroup[i]}]`, Filter: 'True', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`) })
            } else {
              const filterError = { '⚠ GMM Error ⚠': `Device [${subGroup[i]}] not found in device group`, Resolution: `Remove Device [${subGroup[i]}] from your queue filter or include Device [${subGroup[i]}] when this class is instantiated` }
              console.error(filterError)
            }
          }
        }
        delete this.Payload.Source[`IP${temp}`]
        delete this.Payload.Source.Auth
      }
      async post(...GMM_filter_DeviceIP) {
        this.Payload.Source.Id = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()
        if (typeof this.Payload.Source.IP != 'undefined') {
          var temp = JSON.stringify(this.Payload.Source.IP).replace(/"/g, '')
          this.Payload.Source[`IP${this.Payload.Source.IP}`] = await xapi.Status.Network[1][`IP${this.Payload.Source.IP}`].Address.get()
          delete this.Payload.Source.IP
        }
        if (JSON.stringify(this.Payload).length > GMM.DevAssets.maxPayloadSize) {
          throw ({ '⚠ GMM Error ⚠': `GMM Connect IP paylod exceed maximum character limit`, MaxLimit: GMM.DevAssets.maxPayloadSize, Payload: { Size: JSON.stringify(this.Payload).length, Content: JSON.stringify(this.Payload) } })
        }
        var GMM_groupError = []
        var GMM_groupResponse = []
        if (GMM_filter_DeviceIP == '') {
          for (let i = 0; i < this.group.length; i++) {
            this.Params.Url = `https://${this.group[i]}/putxml`
            const body = `<Command><Message><Send><Text>${JSON.stringify(this.Payload)}</Text></Send></Message></Command>`
            try {
              const request = await xapi.Command.HttpClient.Post(this.Params, body)
              delete request.Headers
              request['Destination'] = this.group[i]
              GMM_groupResponse.push(request)

              if (GMM.Config?.allowLegacyErrorSystem) {
                console.debug({ 'GMM Debug': `Remote_IP message sent to [${this.group[i]}]`, Filter: 'False', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`), Response: `${request.StatusCode}:${request.status}` })
              }
            } catch (e) {
              e['GMM_Context'] = {
                Destination: this.group[i],
                Filter: 'False',
                Message: {
                  Type: this.Payload.Type,
                  Value: this.Payload.Value,
                  Payload: JSON.stringify(body).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`)
                }
              }
              GMM_groupError.push(e)
            }
          }
        } else {
          const subGroup = GMM_filter_DeviceIP.toString().split(',')
          for (let i = 0; i < subGroup.length; i++) {
            if (this.group.includes(subGroup[i])) {
              this.Params.Url = `https://${subGroup[i]}/putxml`
              const body = `<Command><Message><Send><Text>${JSON.stringify(this.Payload)}</Text></Send></Message></Command>`
              try {
                const request = await xapi.Command.HttpClient.Post(this.Params, body)

                delete request.Headers
                request['Destination'] = this.group[i]
                GMM_groupResponse.push(request)

                if (GMM.Config?.allowLegacyErrorSystem) {
                  console.debug({ 'GMM Debug': `Remote_IP message sent to [${subGroup[i]}]`, Filter: 'True', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`), Response: `${request.StatusCode}:${request.status}` })
                }

              } catch (e) {
                e['GMM_Context'] = {
                  Destination: subGroup[i],
                  Filter: 'True',
                  Message: { Type: this.Payload.Type, Value: this.Payload.Value, Payload: JSON.stringify(body).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`) }
                }
                GMM_groupError.push(e)
              }
            } else {
              const filterError = { '⚠ GMM Error ⚠': `Device [${subGroup[i]}] not found in device group`, Resolution: `Remove Device [${subGroup[i]}] from your post filter or include Device [${subGroup[i]}] when this class is instantiated` }
              console.error(filterError)
            }
          }
        }
        delete this.Payload.Source[`IP${temp}`]
        delete this.Payload.Source.Auth

        if (GMM.Config?.allowLegacyErrorSystem) {
          if (GMM_groupError.length > 0) {
            throw GMM_groupError
          }
        } else {
          return {
            Responses: GMM_groupResponse,
            Errors: GMM_groupError
          }
        }
      }
    },
    Direct_xApi: class {
      constructor(CommonUsername = '', CommonPassword = '', ...ipArray) {
        const b64_reg = /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{3}=|[A-Za-z\d+/]{2}==)?$/
        if (CommonUsername == '' && CommonPassword == '') {
          throw { '⚠ GMM Error ⚠': 'Common Authentication Parameters not found, unable to contruct GMM.Connect.Direct_xApi class' }
        } else if (CommonPassword == '' && b64_reg.test(CommonUsername)) {
          this.Params = {
            Url: ``,
            Header: ['Content-Type: text/xml', `Authorization: Basic ${CommonUsername}`],
            AllowInsecureHTTPS: 'True'
          }
        } else {
          this.Params = {
            Url: ``,
            Header: ['Content-Type: text/xml', `Authorization: Basic ${btoa(CommonUsername + ':' + CommonPassword)}`],
            AllowInsecureHTTPS: 'True'
          }
        }
        if (GMM.Config?.adjustHTTPClientTimeout > 0) {
          if (GMM.Config?.adjustHTTPClientTimeout > 30) {
            console.warn({ '⚠ GMM Warn ⚠': `GMM.Config.adjustHTTPClientTimeout max timeout is 30 seconds. Defaulting to 30 seconds` })
          } else {
            this.Params['Timeout'] = GMM.Config.adjustHTTPClientTimeout
          }
        }
        this.Payload = { App: GMM.Config.MacroName, Source: { Type: 'Remote_IP_Direct', Id: '' }, Type: '', Value: '' }
        this.group = ipArray.toString().split(',')
        xapi.Config.HttpClient.Mode.set('On')
        xapi.Config.HttpClient.AllowInsecureHTTPS.set('True')
        console.warn({ '⚠ GMM Warn ⚠': `The HTTPClient has been enabled by instantiating an object with the GMM.Connect.Direct_xApi class found in the ${GMM.Config.MacroName} macro` })
        console.warn({ '⚠ GMM Warn ⚠': `Be sure to securely store your device credentials. It is POOR PRACTICE to store any credentials within a Macro` })
        if (GMM.Config?.queueInternvalInMs < 250) { console.warn({ '⚠ GMM Warn ⚠': `${GMM.Config.queueInternvalInMs}ms is below the recommended minimum of 250ms for GMM.Config.queueInternvalInMs` }) };
      }
      xApi(shellCommand) {

      }
      async queue(id) {

      }
      async post(...GMM_filter_DeviceIP) {

      }
    },
    Webex: class {
      constructor(CommonBotToken, ...deviceIdArray) {
        this.Params = {
          Url: `https://webexapis.com/v1/xapi/command/Message.Send`,
          Header: [`Authorization: Bearer ${CommonBotToken}`, 'Content-Type: application/json'],
          AllowInsecureHTTPS: 'True'
        }
        if (GMM.Config?.adjustHTTPClientTimeout > 0) {
          if (GMM.Config?.adjustHTTPClientTimeout > 30) {
            console.warn({ '⚠ GMM Warn ⚠': `GMM.Config.adjustHTTPClientTimeout max timeout is 30 seconds. Defaulting to 30 seconds` })
          } else {
            this.Params['Timeout'] = GMM.Config.adjustHTTPClientTimeout
          }
        }
        this.Payload = { App: GMM.Config.MacroName, Source: { Type: 'Remote_Webex', Id: '' }, Type: '', Value: '' }
        this.group = deviceIdArray.toString().split(',')
        this.Auth = btoa(CommonBotToken)
        xapi.Config.HttpClient.Mode.set('On')
        xapi.Config.HttpClient.AllowInsecureHTTPS.set('True')
        console.warn({ '⚠ GMM Warn ⚠': `The HTTPClient has been enabled by instantiating an object with the GMM.Connect.Webex class found in the ${GMM.Config.MacroName} macro` })
        console.warn({ '⚠ GMM Warn ⚠': `Be sure to securely store your bot token. It is POOR PRACTICE to store any authentication tokens within a Macro` })
        if (GMM.Config?.queueInternvalInMs < 250) { console.warn({ '⚠ GMM Warn ⚠': `${GMM.Config.queueInternvalInMs}ms is below the recommended minimum of 250ms for GMM.Config.queueInternvalInMs` }) };
      }
      status(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .status(message) method', Class: 'GMM.Connect.Webex Class', Action: 'Provide an object as message parameter' }
        }
        this.Payload['Type'] = 'Status'
        this.Payload['Value'] = message
        return this
      }
      error(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .error(message) method', Class: 'GMM.Connect.Webex Class', Action: 'Provide an object as message parameter' }
        }
        this.Payload['Type'] = 'Error'
        this.Payload['Value'] = message
        return this
      }
      command(message) {
        if (message == undefined || message == '') {
          throw { '⚠ GMM Error ⚠': 'Message parameter not fulfilled in .command(message) method', Class: 'GMM.Connect.Webex Class', Action: 'Provide an object as message parameter' }
        }
        this.Payload['Type'] = 'Command'
        this.Payload['Value'] = message
        return this
      }
      passDeviceId() {
        this.passId = true
        return this
      }
      passToken(newToken = '') {
        if (newToken != '') {
          this.Payload.Source['Auth'] = newToken
        } else {
          this.Payload.Source['Auth'] = atob(this.Auth.toString())
        }
        console.warn({ '⚠ GMM Warn ⚠': `The passToken() method has been applied to this payload and will be sent to the following group of devices`, Group: JSON.stringify(this.group), Value: this.Payload.Value, Reminder: 'Be sure to securely store your bot token. It is POOR PRACTICE to store a any authentication tokens within a Macro' })
        return this
      }
      async queue(id, ...filter_DeviceID) {
        this.Payload.Source.Id = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()
        var discoverDeviceId = async function (header, serial) {
          try {
            const url = `https://webexapis.com/v1/devices?serial=${serial}`
            const request = await xapi.Command.HttpClient.Get({
              Url: url,
              Header: header,
              AllowInsecureHTTPS: 'True'
            })
            return JSON.parse(request.Body)
          } catch (e) {
            console.error({ '⚠ GMM Error ⚠': e.message, StatusCode: e.data.StatusCode, Message: 'Device ID request failed, returning as [not found]' })
            return { items: [] }
          }
        }
        if (typeof this.passId != 'undefined') {
          var temp = await discoverDeviceId(this.Params.Header, this.Payload.Source.Id)
          this.Payload.Source['DeviceId'] = temp.items == '' ? 'Not Found' : temp.items[0].id
        }
        if (JSON.stringify(this.Payload).length > GMM.DevAssets.maxPayloadSize) {
          throw ({ '⚠ GMM Error ⚠': `GMM Connect IP paylod exceed maximum character limit`, MaxLimit: GMM.DevAssets.maxPayloadSize, Payload: { Size: JSON.stringify(this.Payload).length, Content: JSON.stringify(this.Payload) } })
        }
        this.Payload.Source.Id = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()

        if (filter_DeviceID == '') {
          for (let i = 0; i < this.group.length; i++) {
            const body = { deviceId: this.group[i], arguments: { Text: JSON.stringify(this.Payload) } }
            GMM.DevAssets.queue.push({ Params: this.Params, Body: JSON.stringify(body), Device: this.group[i], Type: 'Remote_Webex', Id: `${id}` })
            console.debug({ Message: `Remote_Webex message queued for [${this.group[i]}]`, Filter: 'False', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`) })
          }
        } else {
          const subGroup = filter_DeviceID.toString().split(',')
          for (let i = 0; i < subGroup.length; i++) {
            const body = { deviceId: subGroup[i], arguments: { Text: JSON.stringify(this.Payload) } }
            GMM.DevAssets.queue.push({ Params: this.Params, Body: JSON.stringify(body), Device: subGroup[i], Type: 'Remote_Webex', Id: `${id}` })
            console.debug({ Message: `Remote_Webex message queued for [${subGroup[i]}]`, Filter: 'True', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`) })
          }
        }
        delete this.Payload.Source.DeviceId
        delete this.Payload.Source.Auth
      }
      async post(...filter_DeviceID) {
        this.Payload.Source.Id = await xapi.Status.SystemUnit.Hardware.Module.SerialNumber.get()
        var discoverDeviceId = async function (header, serial) {
          try {
            const url = `https://webexapis.com/v1/devices?serial=${serial}`
            const request = await xapi.Command.HttpClient.Get({
              Url: url,
              Header: header,
              AllowInsecureHTTPS: 'True'
            })
            return JSON.parse(request.Body)
          } catch (e) {
            console.error({ '⚠ GMM Error ⚠': e.message, StatusCode: e.data.StatusCode, Message: 'Device ID request failed, returning as [not found]' })
            return { items: [] }
          }
        }
        if (typeof this.passId != 'undefined') {
          var temp = await discoverDeviceId(this.Params.Header, this.Payload.Source.Id)
          this.Payload.Source['DeviceId'] = temp.items == '' ? 'Not Found' : temp.items[0].id
        }
        if (JSON.stringify(this.Payload).length > GMM.DevAssets.maxPayloadSize) {
          throw ({ '⚠ GMM Error ⚠': `GMM Connect IP paylod exceed maximum character limit`, MaxLimit: GMM.DevAssets.maxPayloadSize, Payload: { Size: JSON.stringify(this.Payload).length, Content: JSON.stringify(this.Payload) } })
        }
        var GMM_groupError = []
        if (filter_DeviceID == '') {
          for (let i = 0; i < this.group.length; i++) {
            const body = { deviceId: this.group[i], arguments: { Text: JSON.stringify(this.Payload) } }
            try {
              const request = await xapi.Command.HttpClient.Post(this.Params, JSON.stringify(body))
              console.debug({ 'GMM Debug': `Remote_Webex message sent to [${this.group[i]}]`, Filter: 'False', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`), Response: `${request.StatusCode}:${request.status}` })
            } catch (e) {
              e['GMM_Context'] = {
                Destination: this.group[i],
                Filter: 'False',
                Message: {
                  Type: this.Payload.Type,
                  Value: this.Payload.Value,
                  Payload: JSON.stringify(body).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`)
                }
              }
              GMM_groupError.push(e)
            }
          }
        } else {
          const subGroup = filter_DeviceID.toString().split(',')
          for (let i = 0; i < subGroup.length; i++) {
            if (this.group.includes(subGroup[i])) {
              const body = { deviceId: subGroup[i], arguments: { Text: JSON.stringify(this.Payload) } }
              try {
                const request = await xapi.Command.HttpClient.Post(this.Params, JSON.stringify(body))
                console.debug({ 'GMM Debug': `Remote_Webex message sent to [${subGroup[i]}]`, Filter: 'True', Payload: JSON.stringify(this.Payload).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`), Response: `${request.StatusCode}:${request.status}` })
              } catch (e) {
                e['GMM_Context'] = {
                  Destination: subGroup[i],
                  Filter: 'True',
                  Message: {
                    Type: this.Payload.Type,
                    Value: this.Payload.Value,
                    Payload: JSON.stringify(body).replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`)
                  }
                }
                GMM_groupError.push(e)
              }
            } else {
              const filterError = { '⚠ GMM Error ⚠': `Device [${subGroup[i]}] not found in device group`, Resolution: `Remove Device [${subGroup[i]}] from your post filter or include Device [${subGroup[i]}] when this class is instantiated` }
              console.error(filterError)
            }
          }
        }
        delete this.Payload.Source.DeviceId
        delete this.Payload.Source.Auth
        if (GMM_groupError.length > 0) {
          throw GMM_groupError
        }
      }
    }
  },
  Event: {
    Receiver: {
      on: function (callback) {
        xapi.Event.Message.Send.on(event => {
          let response = {};
          try {
            response = JSON.parse(event.Text)
            callback(response)
          }
          catch (error) {
            console.debug(`GMM_Lib: Received unformatted message: ${event.Text} ... converting to local status message. `)
            callback({ RawMessage: event.Text })
          }
        })
      },
      once: function (callback) {
        xapi.Event.Message.Send.once(event => {
          callback(JSON.parse(event.Text))
        })
      }
    },
    Schedule: {
      on: function (timeOfDay = '00:00', callBack) {
        //Reference
        //https://github.com/CiscoDevNet/roomdevices-macros-samples/blob/master/Scheduled%20Actions/Scheduler.js
        const [hour, minute] = timeOfDay.replace('.', ':').split(':');
        const now = new Date();
        const parseNow = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        let difference = parseInt(hour) * 3600 + parseInt(minute) * 60 - parseNow;
        if (difference <= 0) {
          difference += 24 * 3600
        };
        console.debug({ 'GMM Debug': `Scheduled Event subscription set for ${timeOfDay} will fire in ${difference} seconds` })
        return setTimeout(function () {
          const message = { Message: `[${timeOfDay}] Scheduled event fired` }
          callBack(message)
          setTimeout(function () {
            GMM.Event.Schedule.on(timeOfDay, callBack)
          }, 1000)
        }, difference * 1000);
      },
      once: function (timeOfDay = '00:00', callBack) {
        const [hour, minute] = timeOfDay.replace('.', ':').split(':');
        const now = new Date();
        const parseNow = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        let difference = parseInt(hour) * 3600 + parseInt(minute) * 60 - parseNow;
        if (difference <= 0) {
          difference += 24 * 3600
        };
        console.debug({ 'GMM Debug': `Scheduled Event set for ${timeOfDay} will fire in ${difference} seconds` })
        return setTimeout(function () {
          const message = { Message: `[${timeOfDay}] Scheduled event fired` }
          callBack(message)
        }, difference * 1000);
      }
    },
    Queue: {
      on: async function (callBack) {
        const determineInterval = () => {
          if (GMM.Config?.queueInternvalInMs > 0) {
            return GMM.Config?.queueInternvalInMs
          }; return 250
        }
        const interval = determineInterval()
        const message = {}
        const remainingIds = function () { var pool = []; for (let i = 0; i < GMM.DevAssets.queue.length; i++) { pool.push(GMM.DevAssets.queue[i].Id) }; return pool; }
        if (GMM.DevAssets.queue.length > 0) {
          switch (GMM.DevAssets.queue[0].Type) {
            case 'Local':
              await xapi.Command.Message.Send({ Text: JSON.stringify(GMM.DevAssets.queue[0].Payload) })
              message['Queue_ID'] = GMM.DevAssets.queue[0].Id
              console.debug({ 'GMM Debug': `${GMM.DevAssets.queue[0].Type} Queue ID [${GMM.DevAssets.queue[0].Id}] processed`, Payload: GMM.DevAssets.queue[0].Payload })
              GMM.DevAssets.queue.shift()
              message['QueueStatus'] = { RemainingRequests: GMM.DevAssets.queue.length == 0 ? 'Clear' : GMM.DevAssets.queue.length, IdPool: remainingIds(), CurrentDelay: `${interval} ms` }
              callBack(message)
              break;
            case 'Remote_IP':
              try {
                const GMM_Queue_request_ip = await xapi.Command.HttpClient.Post(GMM.DevAssets.queue[0].Params, GMM.DevAssets.queue[0].Body)
                message['Queue_ID'] = GMM.DevAssets.queue[0].Id
                message['Response'] = GMM_Queue_request_ip
                console.debug({ 'GMM Debug': `${GMM.DevAssets.queue[0].Type} Queue ID [${GMM.DevAssets.queue[0].Id}] processed and sent to [${GMM.DevAssets.queue[0].Device}]`, Payload: GMM.DevAssets.queue[0].Body.replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`), Response: `${GMM_Queue_request_ip.StatusCode}:${GMM_Queue_request_ip.status}` })
                GMM.DevAssets.queue.shift()
                message['QueueStatus'] = { RemainingRequests: GMM.DevAssets.queue.length == 0 ? 'Empty' : GMM.DevAssets.queue.length, IdPool: remainingIds(), CurrentDelay: `${interval} ms` }
                callBack(message)
              } catch (e) {
                message['Queue_ID'] = GMM.DevAssets.queue[0].Id
                message['Response'] = e
                console.debug({ 'GMM Debug': `${GMM.DevAssets.queue[0].Type} Queue ID [${GMM.DevAssets.queue[0].Id}] processed and sent to [${GMM.DevAssets.queue[0].Device}]`, Payload: GMM.DevAssets.queue[0].Body.replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`), Response: `${GMM_Queue_request_ip.StatusCode}:${GMM_Queue_request_ip.status}` })
                GMM.DevAssets.queue.shift()
                message['QueueStatus'] = { RemainingRequests: GMM.DevAssets.queue.length == 0 ? 'Empty' : GMM.DevAssets.queue.length, IdPool: remainingIds(), CurrentDelay: `${interval} ms` }
                callBack(message)
                console.error({ '⚠ GMM Error ⚠': e.message, StatusCode: e.data.StatusCode, Message: `${GMM.DevAssets.queue[0].Type} Queue ID [${GMM.DevAssets.queue[0].Id}] processed and erred on [${GMM.DevAssets.queue[0].Device}]`, Payload: GMM.DevAssets.queue[0].Body.replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`) })
              }
              break;
            case 'Remote_Webex':
              try {
                const GMM_Queue_request_webex = await xapi.Command.HttpClient.Post(GMM.DevAssets.queue[0].Params, GMM.DevAssets.queue[0].Body)
                message['Queue_ID'] = GMM.DevAssets.queue[0].Id
                message['Response'] = GMM_Queue_request_webex
                console.debug({ Message: `${GMM.DevAssets.queue[0].Type} Queue ID [${GMM.DevAssets.queue[0].Id}] processed and sent to [${GMM.DevAssets.queue[0].Device}]`, Payload: GMM.DevAssets.queue[0].Body.replace(GMM.DevAssets.filterAuthRegex, `\\"Auth\\":\\"***[HIDDEN]***\\"`), Response: `${GMM_Queue_request_webex.StatusCode}:${GMM_Queue_request_webex.status}` })
                GMM.DevAssets.queue.shift()
                message['QueueStatus'] = { RemainingRequests: GMM.DevAssets.queue.length == 0 ? 'Empty' : GMM.DevAssets.queue.length, IdPool: remainingIds(), CurrentDelay: `${interval} ms` }
                callBack(message)
              } catch (e) {
                message['Queue_ID'] = GMM.DevAssets.queue[0].Id
                message['Response'] = e
                console.debug({ 'GMM Debug': `${GMM.DevAssets.queue[0].Type} Queue ID [${GMM.DevAssets.queue[0].Id}] processed and sent to [${GMM.DevAssets.queue[0].Device}]`, Payload: GMM.DevAssets.queue[0].Body.replace(GMM.DevAssets.filterAuthRegex, `\\"Auth\\":\\"***[HIDDEN]***\\"`), Response: `${GMM_Queue_request_webex.StatusCode}:${GMM_Queue_request_webex.status}` })
                GMM.DevAssets.queue.shift()
                message['QueueStatus'] = { RemainingRequests: GMM.DevAssets.queue.length == 0 ? 'Empty' : GMM.DevAssets.queue.length, IdPool: remainingIds(), CurrentDelay: `${interval} ms` }
                callBack(message)
                console.error({ '⚠ GMM Error ⚠': e.message, StatusCode: e.data.StatusCode, Message: `${GMM.DevAssets.queue[0].Type} Queue ID [${GMM.DevAssets.queue[0].Id}] processed and erred on [${GMM.DevAssets.queue[0].Device}]`, Payload: GMM.DevAssets.queue[0].Body.replace(GMM.DevAssets.filterAuthRegex, `"Auth":"***[HIDDEN]***"`) })
              }
              break;
            default:
              break;
          }
        } else {
          callBack({ QueueStatus: { RemainingRequests: 'Empty', IdPool: [], CurrentDelay: `${interval} ms` } })
        }
        setTimeout(function () {
          GMM.Event.Queue.on(callBack)
        }, interval)
      }
    }
  }
}


GMM.read.global = async function (key) {
  var macro = ''
  try {
    macro = await xapi.Command.Macros.Macro.Get({ Name: GMM.DevAssets.memoryConfig.storageMacro, Content: 'True' })
  } catch (e) { }
  return new Promise((resolve, reject) => {
    let raw = macro.Macro[0].Content.replace(/var.*memory.*=\s*{/g, '{')
    let data = JSON.parse(raw)
    if (data[key] != undefined) {
      resolve(data[key])
    } else {
      reject({ '⚠ GMM Error ⚠': `GMM.read.global Error. Object [${key}] not found in [${GMM.DevAssets.memoryConfig.storageMacro}] for Macro [${GMM.Config.MacroName}]` })
    }
  });
}

GMM.read.all = async function () {
  var macro = ''
  try {
    macro = await xapi.Command.Macros.Macro.Get({ Name: GMM.DevAssets.memoryConfig.storageMacro, Content: 'True' })
  } catch (e) { }
  return new Promise((resolve, reject) => {
    let raw = macro.Macro[0].Content.replace(/var.*memory.*=\s*{/g, '{')
    let data = JSON.parse(raw)
    if (data != undefined) {
      resolve(data)
    } else {
      reject({ '⚠ GMM Error ⚠': `GMM.read.all Error. Object [${key}] not found in [${GMM.DevAssets.memoryConfig.storageMacro}] for Macro [${GMM.Config.MacroName}]` })
    }
  });
}

GMM.write.global = async function (key, value) {
  var macro = ''
  try {
    macro = await xapi.Command.Macros.Macro.Get({ Name: GMM.DevAssets.memoryConfig.storageMacro, Content: 'True' })
  } catch (e) { }
  return new Promise(resolve => {
    let raw = macro.Macro[0].Content.replace(/var.*memory.*=\s*{/g, '{');
    let data = JSON.parse(raw);
    data[key] = value;
    let newStore = JSON.stringify(data, null, 4);
    xapi.Command.Macros.Macro.Save({ Name: GMM.DevAssets.memoryConfig.storageMacro }, `var memory = ${newStore}`).then(() => {
      console.debug({ 'GMM Debug': `Global Write Complete`, Location: GMM.Config.MacroName, Data: `{"${key}" : "${value}"}` });
      resolve(value);
    });
  });
}
import xapi from 'xapi';

const PRIMARY_CODEC_USERNAME='';
const PRIMARY_CODEC_PASSWORD='';
const PRIMARY_IP='';

function sendPrimaryDevice(message)
{
    let url = 'https://' + PRIMARY_IP + '/putxml';
    let headers = [
      'Content-Type: text/xml',
      `Authorization: Basic ${btoa(PRIMARY_CODEC_USERNAME + ':' + PRIMARY_CODEC_PASSWORD)}`
    ];

    let payload = "<Command><Message><Send><Text>"+ message +"</Text></Send></Message></Command>";

    xapi.command('HttpClient Post', {Url: url, Header: headers, AllowInsecureHTTPS: 'True'}, payload)
      .then((response) => {if(response.StatusCode === "200") {console.log("Successfully sent: " + payload)}});
}

function handleMessage(event) {
    console.log(`Received: ${event.Text}`);
    var eventText=event.Text;
    var eventSplit=eventText.split(' ');
    var parsedQuestion=eventSplit[0];
    switch(parsedQuestion) {
      case "How":
        sendPrimaryDevice("Doing well!");
        break;
      case "When":
        sendPrimaryDevice("Never!!");
        break;
      case "Where":
        sendPrimaryDevice("In the room next to you.");
        break;
      case "What":
        sendPrimaryDevice("My name is Secondary");
    }
  }
  
xapi.event.on('Message Send', handleMessage);
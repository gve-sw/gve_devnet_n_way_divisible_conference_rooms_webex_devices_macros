import xapi from 'xapi';

const SECONDARY_CODEC_USERNAME='';
const SECONDARY_CODEC_PASSWORD='';
const SECONDARY_IP='';

function sendSecondaryDevice(message)
{
    let url = 'https://' + SECONDARY_IP + '/putxml';
    let headers = [
      'Content-Type: text/xml',
      `Authorization: Basic ${btoa(SECONDARY_CODEC_USERNAME + ':' + SECONDARY_CODEC_PASSWORD)}`
    ];

    let payload = "<Command><Message><Send><Text>"+ message +"</Text></Send></Message></Command>";

    xapi.command('HttpClient Post', {Url: url, Header: headers, AllowInsecureHTTPS: 'True'}, payload)
      .then((response) => {if(response.StatusCode === "200") {console.log("Successfully sent: " + payload)}});
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
async function testHTTP()
  {
    console.log("Starting test....");
    await delay(5000);
    sendSecondaryDevice("How are you?");
    await delay(2000);
    sendSecondaryDevice("Where are you?");
    await delay(2000);
    sendSecondaryDevice("When are you shutting down?");
    await delay(2000);
    sendSecondaryDevice("What is your name?");
  }
  
function handleMessage(event) {
    console.log(`Received message: ${event.Text}`);
  }
  
xapi.event.on('Message Send', handleMessage);

testHTTP();
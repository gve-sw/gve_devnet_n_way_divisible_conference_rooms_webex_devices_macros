import xapi from 'xapi';


xapi.config.set('GPIO Pin 2 Mode', 'OutputManualState');

function setGPIOPin2ToHigh() {
  xapi.command('GPIO ManualState Set', {Pin2: 'High'}).catch(e=>console.debug(e));
  console.log('Pin 2 has been set to High');
}

function setGPIOPin2ToLow() {
  xapi.command('GPIO ManualState Set', {Pin2: 'Low'}).catch(e=>console.debug(e));
  console.log('Pin 2 has been set to Low');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPins()
{
  console.log("Starting test....");
  await delay(5000);
  setGPIOPin2ToHigh();
  await delay(2000);
  setGPIOPin2ToLow();
  await delay(2000);
  setGPIOPin2ToHigh();
  await delay(2000);
  setGPIOPin2ToLow();

}

testPins()
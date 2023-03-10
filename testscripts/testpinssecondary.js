import xapi from 'xapi';
  

xapi.config.set('GPIO Pin 2 Mode', 'InputNoAction');
xapi.config.set('GPIO Pin 3 Mode', 'InputNoAction');
xapi.config.set('GPIO Pin 4 Mode', 'InputNoAction');


xapi.status.on('GPIO Pin 4', (state) => {
    console.log(`GPIO Pin 4[${state.id}] State went to: ${state.State}`);
  });

xapi.status.on('GPIO Pin 3', (state) => {
    console.log(`GPIO Pin 3[${state.id}] State went to: ${state.State}`);
  });

xapi.status.on('GPIO Pin 2', (state) => {
    console.log(`GPIO Pin 2[${state.id}] State went to: ${state.State}`);
  });

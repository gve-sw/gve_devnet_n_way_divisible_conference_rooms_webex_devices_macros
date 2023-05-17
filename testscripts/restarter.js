import xapi from 'xapi';

const Time = '02:00'

function Schedule(timeOfDay = '00:00', callBack) {
    //Reference
    //https://github.com/CiscoDevNet/roomdevices-macros-samples/blob/master/Scheduled%20Actions/Scheduler.js
    const [hour, minute] = timeOfDay.replace('.', ':').split(':');
    const now = new Date();
    const parseNow = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let difference = parseInt(hour) * 3600 + parseInt(minute) * 60 - parseNow;
    if (difference <= 0) {
        difference += 24 * 3600
    };
    console.debug({ Message: `Scheduled Event subscription set for ${timeOfDay} will fire in ${difference} seconds` })
    return setTimeout(function () {
        const message = { Message: `[${timeOfDay}] Scheduled event fired` }
        callBack(message)
        setTimeout(function () {
            GMM.Event.Schedule.on(timeOfDay, callBack)
        }, 1000)
    }, difference * 1000);
}

Schedule(Time, () => {
    xapi.Command.Macros.Runtime.Restart()
}) 
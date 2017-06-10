// Enable strict mode, this allows us to use ES6 specific syntax
// such as 'const' and 'let'
'use strict';

// Import the Real Time Messaging (RTM) client
// from the Slack API in node_modules
const RtmClient = require('@slack/client').RtmClient;

// The memory data store is a collection of useful functions we // can
// include in our RtmClient
const MemoryDataStore = require('@slack/client').MemoryDataStore;

// Import the RTM event constants from the Slack API
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

// Import the client event constants from the Slack API
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

const token = 'xoxb-196368483319-Fzd1ZjcVRNGMyb44uiGcpJlW';

// The Slack constructor takes 2 arguments:
// token - String representation of the Slack token
// opts - Objects with options for our implementation
let slack = new RtmClient(token, {
    // Sets the level of logging we require
    logLevel: 'error',
    // Initialize a data store for our client, this will
    // load additional helper functions for the storing
    // and retrieval of data
    dataStore: new MemoryDataStore(),
    // Boolean indicating whether Slack should automatically
    // reconnect after an error response
    autoReconnect: true,
    // Boolean indicating whether each message should be marked as // read
    // or not after it is processed
    autoMark: true
});


// Returns an array of all the channels the bot resides in
function getChannels(allChannels) {
    let channels = [];

    // Loop over all channels
    for (let id in allChannels) {
        // Get an individual channel
        let channel = allChannels[id];

        // Is this user a member of the channel?
        if (channel.is_member) {
            // If so, push it to the array
            channels.push(channel);
        }
    }

    return channels;
}

// ******************************* //
//    Message Event                //
// ******************************* //
slack.on(RTM_EVENTS.MESSAGE, (message) => {
    let user = slack.dataStore.getUserById(message.user)

    if (user && user.is_bot) {
        return;
    }

    let channel = slack.dataStore.getChannelGroupOrDMById(message.channel);

    if (message.text) {
        let msg = message.text.toLowerCase();

        if (/(hello|hi) (bot|awesomebot)/g.test(msg)) {
            slack.sendMessage(`Hello to you too, ${user.name}!`, channel.id);
        }

        if (/uptime/g.test(msg)) {
            debugger;

            let dm = slack.dataStore.getDMByName(user.name);
            console.log(user.is_admin)

            let uptime = process.uptime();

            // get the uptime in hours, minutes and seconds
            let minutes = parseInt(uptime / 60, 10),
                hours = parseInt(minutes / 60, 10),
                seconds = parseInt(uptime - (minutes * 60) - ((hours * 60) * 60), 10);

            slack.sendMessage(`I have been running for: ${hours} hours, ${minutes} minutes and ${seconds} seconds.`, dm.id);
        }
    }


});

// Add an event listener for the RTM_CONNECTION_OPENED event,
//  which is called when the bot
//  which is called when the bot
// connects to a channel. The Slack API can subscribe to
// events by using the 'on' method
// ******************************* //
//    BOT connection open          //
// ******************************* //
slack.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
    // Get the user's name
    console.log(slack.activeUserId);
    let user = slack.dataStore.getUserById(slack.activeUserId);

    // Get the team's name
    let team = slack.dataStore.getTeamById(slack.activeTeamId);

    // Log the slack team name and the bot's name, using ES6's
    // template string syntax
    console.log(`Connected to ${team.name} as ${user.name}`);

    // Note how the dataStore object contains a list of all
    // channels available
    let channels = getChannels(slack.dataStore.channels);

    // Use Array.map to loop over every instance and return an
    // array of the names of each channel. Then chain Array.join
    // to convert the names array to a string
    let channelNames = channels.map((channel) => {
        return channel.name;
    }).join(', ');

    // log the members of the channel
    channels.forEach((channel) => {
        // get the members by ID using the data store's
        //'getUserByID' function
        let members = channel.members.map((id) => {
            return slack.dataStore.getUserById(id);
        });

        members = members.filter((member) =>{
            return !member.is_bot;
        })

        // Each member object has a 'name' property, so let's
        // get an array of names and join them via Array.join
        let memberNames = members.map((member) => {
            return member.name;
        }).join(', ');

        console.log('Members of channel(', channel.name, '): ', memberNames);
    });

    console.log(`Currently bot is in: ${channelNames}`)
});

// console.log(slack);

// Start the login process
slack.start();

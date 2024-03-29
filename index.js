// Load up the discord.js library
const Discord = require("discord.js");

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

var baseCount = 0;
var tempChannels = [0];
var tempCount = 0;

client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
    client.user.setActivity(`Serving ${client.guilds.size} servers`);
});


client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if (message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix, 
    // which is set in the configuration file.
    if (message.content.indexOf(config.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command. 
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    //set 'user' as the guild member who sent the message
    const user = message.member;

    // Let's go with a few common example commands! Feel free to delete or change those.

    if (command === "ping") {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }

    if (command === "say") {
        // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
        // To get the "message" itself we join the `args` back into a string with spaces: 
        const sayMessage = args.join(" ");
        // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
        message.delete().catch(O_o => {});
        // And we get the bot to say the thing: 
        message.channel.send(sayMessage);
    }

    if (command === "kick") {
        // This command must be limited to mods and admins. In this example we just hardcode the role names.
        // Please read on Array.some() to understand this bit: 
        // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
        if (!message.member.roles.some(r => ["Administrator", "Moderator"].includes(r.name)))
            return message.reply("Sorry, you don't have permissions to use this!");

        // Let's first check if we have a member and if we can kick them!
        // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
        // We can also support getting the member by ID, which would be args[0]
        let member = message.mentions.members.first() || message.guild.members.get(args[0]);
        if (!member)
            return message.reply("Please mention a valid member of this server");
        if (!member.kickable)
            return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

        // slice(1) removes the first part, which here should be the user mention or ID
        // join(' ') takes all the various parts to make it a single string.
        let reason = args.slice(1).join(' ');
        if (!reason) reason = "No reason provided";

        // Now, time for a swift kick in the nuts!
        await member.kick(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
        message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);
    }

    if (command === "ban") {
        // Most of this command is identical to kick, except that here we'll only let admins do it.
        // In the real world mods could ban too, but this is just an example, right? ;)
        if (!message.member.roles.some(r => ["Administrator"].includes(r.name)))
            return message.reply("Sorry, you don't have permissions to use this!");

        let member = message.mentions.members.first();
        if (!member)
            return message.reply("Please mention a valid member of this server");
        if (!member.bannable)
            return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

        let reason = args.slice(1).join(' ');
        if (!reason) reason = "No reason provided";

        await member.ban(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
        message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
    }

    if (command === "purge") {
        // This command removes all messages from all users in the channel, up to 100.

        // get the delete count, as an actual number.
        const deleteCount = parseInt(args[0], 10);
        var moveUser;
        // Ooooh nice, combined conditions. <3
        if (!deleteCount || deleteCount < 2 || deleteCount > 100)
            return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

        // So we get our messages, and delete them. Simple enough, right?
        const fetched = await message.channel.fetchMessages({
            limit: deleteCount
        });
        message.channel.bulkDelete(fetched)
            .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
    }
    if (command === "create") { //create a new voice channel with name and userLimit passed through args
        message.guild.createChannel(args[0], {
            type: 'voice',
            userLimit: args[1],
        }).then(channel => {
            //set channel to top of list
            channel.setPosition(0);
            //if user is in a voice channel already, move them to new temp channel
            if (user.voiceChannel !== undefined) {
                user.setVoiceChannel(channel.id)
            };
            tempChannels[tempCount] = channel;
            tempCount++;
        })
        //.then(console.log)
        //.catch(console.error);

        //move user to channel they created
        //if empty delete
    }
	if (command === "squad") {
		
		var squad1 = 0, squad2 = 0, squad3 = 0, squad4 = 0;
		squad1 = getRandomInt(4);
		squad2 = getRandomInt(4);
		while(squad1 === squad2){
			
			squad2 = getRandomInt(4);
			
		}
		squad3 = getRandomInt(4);
		while((squad1 === squad3) | (squad2 === squad3)){
			
			squad3 = getRandomInt(4);
			
		}
		squad4 = getRandomInt(4);
		while((squad1 === squad4) | (squad2 === squad4) | (squad3 === squad4)){
			
			squad4 = getRandomInt(4);
			
		}
		var pubgRolesMap = new Map();
		pubgRolesMap .set(0, "Commander");
		pubgRolesMap .set(1, "Sniper");
		pubgRolesMap .set(2, "Support");
		pubgRolesMap .set(3, "Medic");

		message.channel.send(`Squad Member 1: ${pubgRolesMap.get(squad1)}\nSquad Member 2: ${pubgRolesMap.get(squad2)}\nSquad Member 3: ${pubgRolesMap.get(squad3)}\nSquad Member 4: ${pubgRolesMap.get(squad4)}`);
		
	}
});

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

client.on('voiceStateUpdate', (oldMember, newMember) => {
    //oldMember is user prior to voiceupdate and newMember is user after voiceupdate
    let newUserChannel = newMember.voiceChannel;
    let oldUserChannel = oldMember.voiceChannel;
    let count = 0;
    //set newUserChannel and oldUserChannel to the voice channel that they came from/went to
    let guild = newMember.guild;
    //initialize guild
    if (baseCount === 0) {
        baseCount = guild.channels.array().length;
    }
    //update the base count of channels in the server only updating if no extra channels have been added
    count = guild.channels.array().length;
    //initialize the number of channels currently in the server, which includes added temp channels
    //"newUserChannel !== undefined ensures there are no crashes on disconnect
    if (newUserChannel !== undefined && oldUserChannel !== newUserChannel) {
        //user joins a voice channel (create channel id = 608116719919300628)
        //if the user joins that specific channel
        if (newUserChannel.id === "608116719919300628") {
            guild.createChannel('temp-channel-' + ((tempCount) + 1), {
                type: 'voice'
            }).then(channel => {
                //create the channel with a postfix number, based on how many channels the server currently has
                channel.setPosition(0),
                    //Set the position of the channel to the top of the list
                    newMember.setVoiceChannel(channel.id)
                tempChannels[tempCount] = channel
                //move the user to the newly created voice channel
                tempCount++;
            })
        }
    } else if (newUserChannel === undefined) {
        tempChannelsL = tempChannels.length;
        //user leaves a voice channel
        //check to see if a temp channel has been empty for 3 minutes
        for (i = 0; i < tempChannelsL; i++) {
            if (tempChannels[i].members.size === 0) {
                sleep(5000);
                tempChannels[i].delete();
                tempCount--;
            }
        }
    }
});

client.login(config.token);

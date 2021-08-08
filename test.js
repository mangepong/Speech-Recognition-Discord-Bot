const Discord = require("discord.js"),
client = new Discord.Client,
settings = {
    prefix: "?",
    token: "ODM2OTcyNDE1NTgxMjkwNTA2.YIlxTg.QNmv3omrAfztU7uGBkNoBOtXy_o"
};

const { Player } = require("discord-player");

// Create a new Player (you don't need any API Key)
const player = new Player(client);

// To easily access the player
client.player = player;

// add the trackStart event so when a song will be played this message will be sent
client.player.on("trackStart", (message, track) => message.channel.send(`Now playing ${track.title}...`))

client.once("ready", () => {
    console.log("I'm ready !");
});

client.on("message", async (message) => {

    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // !play Despacito
    // will play "Despacito" in the voice channel
    if(command === "play"){
        client.player.play(message, args[0]);
        // as we registered the event above, no need to send a success message here
    }

    if (command === "join") {
        await message.member.voice.channel.join();
    }
});

client.login(settings.token);
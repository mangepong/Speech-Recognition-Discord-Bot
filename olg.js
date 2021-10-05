"use strict";

const SpeechToTextV1 = require("ibm-watson/speech-to-text/v1");
const { IamAuthenticator } = require("ibm-watson/auth");
var fs = require("fs");
const Discord = require("discord.js");
const { exec } = require("child_process");
const { google } = require("googleapis");
const config = require("./config.json");
const ytdl = require("ytdl-core");
const ytdld = require("ytdl-core-discord");
const ytsr = require("ytsr");

const customsearch = google.customsearch("v1");

const client = new Discord.Client();

const prefix = "?";

const botChannel = config.botChannel;

const token = config.botToken;

const API_KEY = config.API_KEY;
const CSE_ID = config.CSE_ID;

const IBM_API_KEY = config.IBM_API_KEY;

const IBM_SERVICE_URL = config.IBM_SERVICE_URL;

const calling = ["hey serie", "hey series"];

var status = false;

var queue = [];

const keywords = [
  "google",
  "what",
  "how",
  "who",
  "when",
  "why",
  "what's",
  "where",
  "is",
  "play",
  "skip",
  "stop",
  "lay",
  "next",
  "add",
  "help",
  "commands",
  "queue",
  "q",
];

const logfile = "logs.txt";

client.on("ready", () => {
  console.log(
    `Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`
  );
  client.user.setActivity(`Made by MangePong`);
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === "ping") {
    const m = await message.channel.send("Ping?");
    m.edit(
      `Pong! Latency is ${
        m.createdTimestamp - message.createdTimestamp
      }ms. API Latency is ${Math.round(client.ws.ping)}ms`
    );
  }

  if (command === "leave") {
    await message.member.voice.channel.leave();
    exec("rm *.pcm");
  }

  if (command === "help") {
    const embedMessage = new Discord.MessageEmbed()
      .setColor("#0099ff")
      .setTitle("All commands for Budget Siri")
      .addFields(
        {
          name: prefix + "help",
          value:
            'Show all commands for the bot, you can say "commands" and it will post voice commands.',
        },
        {
          name: prefix + "ping",
          value: "Pings the bot and send the response time.",
        },
        {
          name: prefix + "join",
          value:
            "Joins the current voicechannel of the person who sent the command.",
        },
        {
          name: prefix + "play",
          value: "Plays the song you write after the commad.",
        },
        { name: prefix + "add", value: "Add a song to the queue." },
        { name: prefix + "skip", value: "Skips the current song." },
        { name: prefix + "stop", value: "Stops the music." },
        { name: prefix + "pause", value: "Pauses the music." },
        { name: prefix + "resume", value: "Resumes the music." },
        { name: prefix + "clear cache", value: "Clears the cached files." }
      );

    await message.channel.send(embedMessage);
  }

  if (command === "clear cache") {
    exec("rm *.pcm");
    await message.channel.send("Cache cleared!");
  }

  if (command === "play") {
    console.log(
      "#########################################################################################"
    );
    console.log(args.join(" "));
    getYtID(args.join(" "));
  }

  if (command === "skip") {
    for (const connection of client.voice.connections.values()) {
      if (connection.speaking && queue.length) {
        getYtID(queue[0]);
      } else {
        await message.channel.send("Queue is empty!");
      }
    }
  }

  if (command === "add") {
    for (const connection of client.voice.connections.values()) {
      if (connection.speaking) {
        queue.push(args.join(" "));
        const searchResults = await ytsr(args.join(" "));
        let embed = setEmbed(
          searchResults.items[0].title,
          searchResults.items[0].bestThumbnail.url,
          message.author.username,
          searchResults.items[0].url
        );
        await message.channel.send(
          "**" + searchResults.items[0].title + "**" + " added to the queue!",
          {
            embed: embed,
          }
        );
      } else {
        getYtID(args.join(" "));
      }
    }
  }

  if (command === "stop") {
    for (const connection of client.voice.connections.values()) {
      if (connection.speaking) {
        connection.dispatcher.pause();
      }
    }
  }

  if (command === "pause") {
    for (const connection of client.voice.connections.values()) {
      if (connection.speaking) {
        connection.dispatcher.pause();
      }
    }
  }

  if (command === "resume") {
    for (const connection of client.voice.connections.values()) {
      if (connection.speaking) {
        connection.dispatcher.resume();
      }
    }
  }

  if (command === "join") {
    if (!message.member.voice.channel)
      return message.reply("Please join a voice channel first!");
    if (
      message.member.voice.channel.members.filter(
        (e) => client.user.id === e.user.id
      ).size > 0
    )
      return message.reply(`I'm already in your voice channel!`);

    if (!message.member.voice.channel.joinable)
      return message.reply(
        `I don't have permission to join that voice channel!`
      );
    if (!message.member.voice.channel.speakable)
      return message.reply(
        `I don't have permission to speak in that voice channel!`
      );

    const connection = await message.member.voice.channel.join();

    connection.on("speaking", (user, speaking) => {
      if (!user) return;
      if (user.bot) return;
      if (!speaking) {
        console.log("tyst");
        return;
      }

      let username = user.username;

      const audio = connection.receiver.createStream(user, { mode: "pcm" });

      const audioFileName = "./" + user.id + "_" + Date.now() + ".pcm";

      audio.pipe(fs.createWriteStream(audioFileName));

      audio.on("end", async () => {
        fs.stat(audioFileName, async (err, stat) => {
          if (!err && stat.size) {
            const speechToText = new SpeechToTextV1({
              authenticator: new IamAuthenticator({
                apikey: IBM_API_KEY,
              }),
              serviceUrl: IBM_SERVICE_URL,
            });

            var params = {
              content_type: "audio/wav",
              objectMode: true,
              profanityFilter: false,
              model: "en-US_Multimedia",
            };

            const recognizeStream =
              speechToText.recognizeUsingWebSocket(params);
            exec(
              "ffmpeg -y -f s16be -ar 48000 -ac 2 -acodec pcm_s16le -i " +
                audioFileName +
                " output.wav"
            );

            setTimeout(async function () {
              exec("rm " + audioFileName);
              fs.createReadStream("output.wav").pipe(recognizeStream);
              exec("rm *.pcm");
              recognizeStream.on("data", async function (event) {
                if (!event.results.length == 0) {
                  let result = event.results[0].alternatives[0].transcript;
                  let firstWord = result.split(" ")[0];
                  console.log(result);
                  let resArr = result.split(" ");
                  resArr.shift();
                  let noKeyWord = resArr;
                  if (result) {
                    if (keywords.includes(firstWord)) {
                      if (firstWord == "play" || firstWord == "lay") {
                        try {
                          console.log("inne");
                          console.log(noKeyWord.join(" "));
                          getYtID(noKeyWord.join(" "));
                        } catch (error) {
                          let errorMsg =
                            "Something went wrong when to play song: " +
                            noKeyWord.join(" ") +
                            "." +
                            "\n" +
                            error;
                          fs.writeFile(
                            logfile,
                            errorMsg,
                            { flag: "a+" },
                            (err) => {
                              if (err) {
                                console.error(err);
                                return;
                              }
                            }
                          );
                        }
                      } else if (firstWord == "skip" || firstWord == "next") {
                        try {
                          if (connection.speaking && queue.length) {
                            getYtID(queue[0]);
                          } else {
                            client.channels.cache
                              .get(botChannel)
                              .send("Queue is empty!");
                          }
                        } catch (error) {
                          console.log(
                            "Something went wrong when trying to skip song"
                          );
                          let errorMsg =
                            "Something went wrong when trying to skip song." +
                            "\n" +
                            error;
                          fs.writeFile(
                            logfile,
                            errorMsg,
                            { flag: "a+" },
                            (err) => {
                              if (err) {
                                console.error(err);
                                return;
                              }
                            }
                          );
                          console.log(error);
                        }
                      } else if (firstWord == "stop") {
                        try {
                          for (const connection of client.voice.connections.values()) {
                            if (connection.speaking) {
                              connection.dispatcher.pause();
                            }
                          }
                        } catch (err) {
                          console.log(err);
                        }
                      } else if (
                        firstWord == "add" ||
                        firstWord == "queue" ||
                        firstWord == "q"
                      ) {
                        if (connection.speaking) {
                          try {
                            queue.push(noKeyWord.join(" "));
                            const searchResults = await ytsr(
                              noKeyWord.join(" ")
                            );
                            let embed = setEmbed(
                              searchResults.items[0].title,
                              searchResults.items[0].bestThumbnail.url,
                              username ? username : "Unknown",
                              searchResults.items[0].url
                            );
                            client.channels.cache
                              .get(botChannel)
                              .send(
                                "**" +
                                  searchResults.items[0].title +
                                  "**" +
                                  " added to the queue!",
                                {
                                  embed: embed,
                                }
                              );
                          } catch (error) {
                            let errorMsg =
                              "Something went wrong when trying to add song to queue." +
                              "\n" +
                              error;
                            fs.writeFile(
                              logfile,
                              errorMsg,
                              { flag: "a+" },
                              (err) => {
                                if (err) {
                                  console.error(err);
                                  return;
                                }
                              }
                            );
                          }
                        } else {
                          try {
                            getYtID(noKeyWord.join(" "));
                          } catch (error) {
                            let errorMsg =
                              "Something went wrong when trying to add song to queue." +
                              "\n" +
                              error;
                            fs.writeFile(
                              logfile,
                              errorMsg,
                              { flag: "a+" },
                              (err) => {
                                if (err) {
                                  console.error(err);
                                  return;
                                }
                              }
                            );
                          }
                        }
                      } else if (firstWord == "commands") {
                        const embedMessage = new Discord.MessageEmbed()
                          .setColor("#0099ff")
                          .setTitle("All voice commands for Budget Siri")
                          .addFields(
                            {
                              name: "commands",
                              value:
                                'Show all commands for the bot, you can say "help" and it will post voice commands.',
                            },
                            {
                              name: "play",
                              value: "Plays the song you say after the commad.",
                            },
                            {
                              name: "add/queue",
                              value: "Add a song to the queue.",
                            },
                            { name: "next", value: "Skips the current song." },
                            { name: "stop", value: "In progress" },
                            { name: "pause", value: "In progress" },
                            { name: "resume", value: "In progress" }
                          );
                        client.channels.cache
                          .get(botChannel)
                          .send(embedMessage);
                      }
                    } else {
                      // exec('rm *.pcm');
                      console.log("Inget");
                      // client.channels.cache.get(botChannel).send(`Did you say: "` + result + '"?');
                    }
                  }
                }
              });
            }, 1000);
          } else {
            exec("rm " + audioFileName);
          }
        });
      });
    });
  }
});

async function getYtID(q) {
  if (queue.length) {
    queue.shift();
  }
  const searchResults = await ytsr(q);
  console.log(searchResults.items[0].url);
  const embedMessage = new Discord.MessageEmbed()
    .setColor("#0099ff")
    .addFields({
      name: "Now playing:",
      value:
        "[" +
        searchResults.items[0].title +
        "](" +
        searchResults.items[0].url +
        ")",
    })
    .setThumbnail(searchResults.items[0].bestThumbnail.url);

  client.channels.cache
    .get(botChannel)
    .send("**" + searchResults.items[0].title + "**", {
      embed: embedMessage,
    });
  status = true;

  let arr = [];
  for (const connection of client.voice.connections.values()) {
    arr.push(connection);
  }

  const connection = arr[0];

  const dispatcher = connection.play(
    await ytdld(searchResults.items[0].url, {
      quality: "highestaudio",
      filter: "audioonly",
      opusEncoded: true,
      encoderArgs: ["-af", "bass=g=10,dynaudnorm=f=200"],
    }),
    { volume: 0.5, bitrate: "128", type: "opus" }
  );
  dispatcher.on("speaking", (speaking) => {
    if (!speaking) {
      status = false;
      if (queue.length) {
        console.log(queue);
        getYtID(queue[0]);
        queue.shift();
      }
    }
  });
}

function setEmbed(title, thumbnail = "", user, url) {
  const embedMessage = new Discord.MessageEmbed()
    .setColor("#0099ff")
    .addFields({
      name: "Added to queue:",
      value: "[" + title + "](" + url + ")",
    })
    .setThumbnail(thumbnail)
    .setFooter("Added by " + user);

  return embedMessage;
}

// function onEvent(name, event) {
//   console.log(name, JSON.stringify(event, null, 2));
// }

client.login(token);

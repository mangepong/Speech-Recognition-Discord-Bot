'use strict';

const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
var fs = require('fs');
const Discord = require("discord.js");
const { exec } = require('child_process');
const { google } = require('googleapis');
const config = require("./config.json");
const { Player } = require("discord-player");
const ytdl = require('ytdl-core');
const ytdld = require('ytdl-core-discord');
const ytsr = require('ytsr');

const customsearch = google.customsearch('v1');


const client = new Discord.Client();

const prefix = "?";


const botChannel = config.botChannel;

const token = config.botToken;

const API_KEY = config.API_KEY;
const CSE_ID = config.CSE_ID;

const IBM_API_KEY = config.IBM_API_KEY;

const IBM_SERVICE_URL = config.IBM_SERVICE_URL;

const calling = ["hey serie", "hey series"]

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
  "lay"
];
// getYtID("youtube ironman black sabbath lyrics")

const player = new Player(client);

// To easily access the player
client.player = player;

// add the trackStart event so when a song will be played this message will be sent
client.player.on("trackStart", (message, track) => message.channel.send(`Now playing ${track.title}...`))


client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
  client.user.setActivity(`Made by MangePong`);
});

client.on("message", async message => {
  if(message.author.bot) return;
  if(!message.content.startsWith(prefix)) return;
  
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
     
  if(command === "ping") {
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
  }

  if(command === "leave") {
    await message.member.voice.channel.leave()
    exec('rm *.pcm');
  }

  if(command === "clear cache") {
    exec('rm *.pcm');
    await message.channel.send("Cache cleared!");
  }

  if(command === "play") {
    // connection.play("song.mp3", { volume: 0.5, bitrate: 192000 });
    message.member.voice.channel.play("song.mp3", { volume: 0.5, bitrate: 192000 });
  }

  if(command === "skip" || command === "stop") {
    connection.destroy();
  }

  if(command === "join") {
    if (!message.member.voice.channel) return message.reply('Please join a voice channel first!');
    if ((message.member.voice.channel.members.filter((e) => client.user.id === e.user.id).size > 0)) return message.reply(`I'm already in your voice channel!`);
    
    if (!message.member.voice.channel.joinable) return message.reply(`I don't have permission to join that voice channel!`);
    if (!message.member.voice.channel.speakable) return message.reply(`I don't have permission to speak in that voice channel!`);

    const connection = await message.member.voice.channel.join(); 

    connection.on('speaking', (user, speaking) => { 
      if (!user) return; 
      if (user.bot) return; 
      if (!speaking) {
        console.log("tyst");
        return;
      }  

      const audio = connection.receiver.createStream(user, { mode: 'pcm' }); 

      const audioFileName = './' + user.id + '_' + Date.now() + '.pcm';

      audio.pipe(fs.createWriteStream(audioFileName));

      

    
      audio.on('end', async () => {
        fs.stat(audioFileName, async (err, stat) => { 
          if (!err && stat.size) {

            const speechToText = new SpeechToTextV1({
                authenticator: new IamAuthenticator({
                    apikey: IBM_API_KEY,
                }),
                    serviceUrl: IBM_SERVICE_URL,
                });

            var params = {
                content_type: 'audio/wav',
                objectMode: true,
                profanityFilter: false,
                model: "en-US_Multimedia"
            };


            const file = fs.readFileSync(audioFileName);
            const recognizeStream = speechToText.recognizeUsingWebSocket(params);
            // ffmpeg -f s16be -ar 48000 -ac 2 -acodec pcm_s16le -i 165200428311642122_1619653540809.pcm test.wav
            exec('ffmpeg -y -f s16be -ar 48000 -ac 2 -acodec pcm_s16le -i ' + audioFileName + ' output.wav');
                        
            
            setTimeout(function(){ 
                exec('rm ' + audioFileName);
                // let newFile = fs.readFileSync("output.wav");
                fs.createReadStream('output.wav').pipe(recognizeStream);
                exec('rm *.pcm');
              recognizeStream.on('data', function (event) {
                
                // console.log(event.results[0]);
                if (!event.results.length == 0) {
                    // console.log("FUNKAR");
                    let result = event.results[0].alternatives[0].transcript;
                    let firstWord = result.split(" ")[0];
                    console.log(result);
                    let resArr = result.split(" ");
                    resArr.shift();
                    let noKeyWord = resArr;
                    if (result) {
                        if (keywords.includes(firstWord)) {
                            if (resArr.includes("what") && resArr.includes("time") || resArr.includes("what's") && resArr.includes("time") ) {
                                var current = new Date();
                                client.channels.cache.get(botChannel).send("The time is: " + String(current.toLocaleTimeString()));
                            // exec('rm *.pcm');
                            } else if (firstWord == "play" || firstWord == "lay") {
                                // client.channels.cache.get(botChannel).send(`!join`);
                                // client.channels.cache.get(botChannel).send(`!play ` + noKeyWord);
                                console.log("inne");
                                console.log(noKeyWord.join(' '));
                                getYtID("youtube " + noKeyWord.join(' ') + " HD")
                                setTimeout(function(){ connection.play("song.mp3", { volume: 0.5, bitrate: 192000 }); }, 3000);
                                // connection.play(ytdld("carry on"));
                            } else if (firstWord == "skip" || firstWord == "stop") {
                                connection.destroy();
                            }
                            else {
                                // google_search(result);
                                console.log("GOOGLAR")
                            // exec('rm *.pcm');
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
            exec('rm ' + audioFileName);
          }
        });
      });

    });
  }
  
});

async function getYtID(q) {
  console.log(q);
  const searchResults = await ytsr("not ready to die music");
  console.log(searchResults.items[0].url)

  ytdl(searchResults.items[0].url, { quality: 'highestaudio' })
  .pipe(fs.createWriteStream('song.mp3'));
  client.channels.cache.get(botChannel).send("Now playing: " + searchResults.items[0].title);

  // customsearch.cse.list({
	// 	auth: API_KEY,
	// 	cx: CSE_ID,
	// 	q: q
	// })
	// 	.then(result => result.data)
	// 	.then((result) => {
	// 	const { queries, items, searchInformation } = result;

	// 	const page = (queries.request || [])[0] || {};
	// 	const previousPage = (queries.previousPage || [])[0] || {};
	// 	const nextPage = (queries.nextPage || [])[0] || {};

	// 	const data = {
	// 		q,
	// 		totalResults: page.totalResults,
	// 		count: page.count,
	// 		startIndex: page.startIndex,
	// 		nextPage: nextPage.startIndex,
	// 		previousPage: previousPage.startIndex,
	// 		time: searchInformation.searchTime,
	// 		items: items.map(o => ({
	// 		link: o.link,
	// 		title: o.title,
	// 		snippet: o.snippet,
	// 		img: (((o.pagemap || {}).cse_image || {})[0] || {}).src
	// 		}))
	// 	}
  //     console.log(data.items[0].link);
  //     ytdl(data.items[0].link, { quality: 'highestaudio' })
  //     .pipe(fs.createWriteStream('song.mp3'));
  //     client.channels.cache.get(botChannel).send("Now playing: " + data.items[0].title);
	// 	})
	// 	.catch((err) => {
	// 	  console.log(err);
	// 	});
}

function setEmbed(title, url, desc, thumbnail="") {
   const embedMessage = new Discord.MessageEmbed()
	.setColor('#0099ff')
	.setTitle(title)
	.setURL(url)
	.setDescription(desc)
	.setThumbnail(thumbnail)

  return embedMessage
}

// function onEvent(name, event) {
//   console.log(name, JSON.stringify(event, null, 2));
// }

function google_search(q) {
  client.channels.cache.get(botChannel).send("Searching for: " + q);
  customsearch.cse.list({
		auth: API_KEY,
		cx: CSE_ID,
		q: q
	})
		.then(result => result.data)
		.then((result) => {
		const { queries, items, searchInformation } = result;

		const page = (queries.request || [])[0] || {};
		const previousPage = (queries.previousPage || [])[0] || {};
		const nextPage = (queries.nextPage || [])[0] || {};

		const data = {
			q,
			totalResults: page.totalResults,
			count: page.count,
			startIndex: page.startIndex,
			nextPage: nextPage.startIndex,
			previousPage: previousPage.startIndex,
			time: searchInformation.searchTime,
			items: items.map(o => ({
			link: o.link,
			title: o.title,
			snippet: o.snippet,
			img: (((o.pagemap || {}).cse_image || {})[0] || {}).src
			}))
		}
      let embed = setEmbed(data.items[0].title, data.items[0].link, data.items[0].snippet, data.items[0].img);
      client.channels.cache.get(botChannel).send(embed);
		})
		.catch((err) => {
		  console.log(err);
		});
  }

client.login(token);

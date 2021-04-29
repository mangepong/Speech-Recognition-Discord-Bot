const Discord = require("discord.js");
const speech = require('@google-cloud/speech');
const fs = require('fs');
const DeepSpeech = require('deepspeech');
const Sox = require('sox-stream');
const MemoryStream = require('memory-stream');
const Duplex = require('stream').Duplex;
const { exec } = require('child_process');
const { google } = require('googleapis');

const customsearch = google.customsearch('v1');
let modelPath = './models/deepspeech-0.9.3-models.pbmm';
// let modelPath = './output_graph.pb';
let model = new DeepSpeech.Model(modelPath);

let desiredSampleRate = model.sampleRate();

let scorerPath = './models/deepspeech-0.9.3-models.scorer';

model.enableExternalScorer(scorerPath);

const client = new Discord.Client();

const speechClient = new speech.SpeechClient(); // https://www.npmjs.com/package/@google-cloud/speech https://cloud.google.com/docs/authentication/getting-started

const prefix = "?";

const botChannel = "PUT TEXT CHANNEL ID FOR BOT";

const token = "BOT TOKEN";
const API_KEY = "API KEY FOR GOOGLE SEARCH";
const CSE_ID = "CSE ID FOR THE GOOGLE SEARCH ENGINE";

client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
  client.user.setActivity(`Made by MangePong`);
});

client.on("message", async message => {
  if(message.author.bot) return; // Ignore other bots
  if(!message.content.startsWith(prefix)) return; // Ignore messages not starting with our prefix
  
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
     
  if(command === "ping") {
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
  }

  if(command === "leave") {
    await message.member.voice.channel.leave()
  }


  if(command === "join") {
    if (!message.member.voice.channel) return message.reply('Please join a voice channel first!');
    if ((message.member.voice.channel.members.filter((e) => client.user.id === e.user.id).size > 0)) return message.reply(`I'm already in your voice channel!`);
    
    if (!message.member.voice.channel.joinable) return message.reply(`I don't have permission to join that voice channel!`);
    if (!message.member.voice.channel.speakable) return message.reply(`I don't have permission to speak in that voice channel!`);

    const connection = await message.member.voice.channel.join(); 
    // await connection.play('svenne.wav');

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
            const file = fs.readFileSync(audioFileName);
            const audioBytes = file.toString('base64');
            // ffmpeg -f s16be -ar 48000 -ac 2 -acodec pcm_s16le -i 165200428311642122_1619653540809.pcm test.wav
            exec('ffmpeg -y -f s16be -ar 48000 -ac 2 -acodec pcm_s16le -i ' + audioFileName + ' output.wav');
            
            setTimeout(function(){ 
              exec('rm ' + audioFileName);
              let newFile = fs.readFileSync("output.wav");
              let audioStream = new MemoryStream();
              bufferToStream(newFile).
              pipe(Sox({
                global: {
                  'no-dither': true,
                },
                output: {
                  bits: 16,
                  rate: desiredSampleRate,
                  channels: 1,
                  encoding: 'signed-integer',
                  endian: 'little',
                  compression: 0.0,
                  type: 'raw'
                }
              })).
              pipe(audioStream);
  
              audioStream.on('finish', () => {
                let audioBuffer = audioStream.toBuffer();
                
                const audioLength = (audioBuffer.length / 2) * (1 / desiredSampleRate);
                console.log('audio length', audioLength);
                
                let result = model.stt(audioBuffer);
                
                let firstWord = result.split(" ")[0];
                
                resArr = result.split(" ");

                console.log('result:', result);
                
                console.log(resArr);
                
                if (result) {
                  if ("google" == firstWord || "what" == firstWord || "how" == firstWord || "who" == firstWord || "when" == firstWord) {
                    if (resArr.includes("what") && resArr.includes("time")) {
                      console.log("INNE")
                      var current = new Date();
                      client.channels.cache.get(botChannel).send("The time is: " + String(current.toLocaleTimeString()));
                      exec('rm *.pcm');
                    } else {
                      google_search(result);
                      console.log("GOOGLAR")
                      exec('rm *.pcm');
                    }
                  } else {
                    exec('rm *.pcm');
                    return message.reply(`Did you say: "` + result + '"?');
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

function bufferToStream(buffer) {
	let stream = new Duplex();
	stream.push(buffer);
	stream.push(null);
	return stream;
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
		  // res.status(200).send(data);
      let embed = setEmbed(data.items[0].title, data.items[0].link, data.items[0].snippet, data.items[0].img);
      client.channels.cache.get(botChannel).send(embed);
      console.log(data);
		})
		.catch((err) => {
		  console.log(err);
		});
  }

client.login(token);
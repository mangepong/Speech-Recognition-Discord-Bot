const Discord = require("discord.js");
const speech = require('@google-cloud/speech');
const fs = require('fs');
const DeepSpeech = require('deepspeech');
const Sox = require('sox-stream');
const MemoryStream = require('memory-stream');
const Duplex = require('stream').Duplex;
const { exec } = require('child_process');

let modelPath = './models/deepspeech-0.9.3-models.pbmm';
// let modelPath = './output_graph.pb';
let model = new DeepSpeech.Model(modelPath);

let desiredSampleRate = model.sampleRate();

let scorerPath = './models/deepspeech-0.9.3-models.scorer';

model.enableExternalScorer(scorerPath);

const client = new Discord.Client();

const speechClient = new speech.SpeechClient(); // https://www.npmjs.com/package/@google-cloud/speech https://cloud.google.com/docs/authentication/getting-started

const prefix = "?";

const token = "TOKEN HERE"


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
                
                console.log('result:', result);
                if (result) {
                  return message.reply(`Did you say: "` + result + '"?');
                }
              });
              
            }, 500);

          } else {
            await exec('rm ' + audioFileName);
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

client.login(token);
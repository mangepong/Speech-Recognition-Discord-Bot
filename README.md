# Speech-Recognition-Discord-Bot

Speech Recognition Discord Bot made in NodeJS and with the help of DeepSpeech

### A work in progress

At the moment it can post what you say in the discord chat.

My plan is to do a very simple version of Alexa/Siri for a discord bot.

### Update

The bot now supports googling using one of the keywords `what, how, who, why, google`. It will post in the bot channel
a embeded message with `title, link, thumbnail and description`.

You can also ask the bot for the current time as long as you said these two keywords: `what, time`.

### Setup the bot

You'll need to download and place the models in a `models/` folder.
You can find the models here:
[Link 1](https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.pbmm)
[Link 2](https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.scorer)

Run `npm install` to install all the necessary packages.
You'll need to install `ffmpeg` if you don't have it installed.

# Speech-Recognition-Discord-Bot

Speech Recognition Discord Bot made in NodeJS and with the help of DeepSpeech

### A work in progress

At the moment it can post what you say in the discord chat.

My plan is to do a very simple version of Alexa/Siri for a discord bot.

### Update

The bot now supports googling using one of the keywords `what, how, who, why, when, what's, where, is and google`. It will post in the bot channel
a embeded message with `title, link, thumbnail and description`.

You can also ask the bot for the current time as long as you said these two keywords: `what, time`.

I've now made two different bots one with using the Mozilla DeepSpeech and one with IBM Watson. The DeepSpeech bot is trained with the models down below and are not as good as IBM's version.

### Setup the bot

You'll need to make an account on [IBM Cloud](https://cloud.ibm.com/) and [Google Cloud](https://cloud.google.com/) to be able to get an API KEY and some other information.

You'll also need to create a custom search engine at [Google](https://developers.google.com/) to be able to make google search requests.

Create a `config.json` and put your credentials in there.

#### Example:

`{ "botChannel": "", "botToken": "", "API_KEY": "", "CSE_ID": "", "IBM_API_KEY": "", "IBM_SERVICE_URL": "" }`

#### If you want to use the Deepspeech version of the bot:

You'll need to download and place the models in a `models/` folder.
You can find the models here:
[Link 1](https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.pbmm)
[Link 2](https://github.com/mozilla/DeepSpeech/releases/download/v0.9.3/deepspeech-0.9.3-models.scorer)

---

Run `npm install` to install all the necessary packages.
You'll need to install `ffmpeg` if you don't have it installed.

You can start the bot with `node bot.js` for the DeepSpeech version or `node ibm_bot.js` for the IBM version.

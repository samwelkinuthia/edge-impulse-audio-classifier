# Audio classifer

## About

This is a customized version of the [edge impulse linux audio classifer](https://github.com/edgeimpulse/edge-impulse-linux-cli/blob/master/examples/js/classify-audio.js) with a MongoDB connection and data filtering.

## Usage

The audio classifier can be used to recognize particular sounds based on the model trained on edge impulse. This particular classifier can classify the following sounds:

* Background (mostly silence)
* Bark
* Growl
* Whine

The background sound is then filtered out and the highest scoring class > 0.99 is logged into a mongodb database with a timestamp.

![Screenshot from 2022-01-12 11-44-39](https://user-images.githubusercontent.com/27720313/149093748-2d8ef658-a512-439e-ab7e-66ab9a49b6ad.png)

## Installation

### Pre-requisites

* Node Js
* SoX
* Microphone

### Steps

* Clone this repo and navigate into it.
* Run ```npm install``` to install dependencies
* Run  ```npm install edge-impulse-linux -g --unsafe-perm```.
* Create a .env file and add your mongodb atlas URI
```
ATLAS_URL = <your mongodb connection string>
```
* Download your model file from your Edge Impulse project/account with: ```edge-impulse-linux-runner --download modelfile.eim```
*Connect a microphone and run ```node classsify.js```
  * You will get an error that shows you all available microphones.
  * Run ```node classify-audio.js modelfile.eim <microphone name>```

You can customize ```classify-audio.js``` for different sounds as well as databases etc.

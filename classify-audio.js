require("dotenv").config({path:"config.env"});
const { AudioClassifier, LinuxImpulseRunner, AudioRecorder } = require("edge-impulse-linux");
const { MongoClient, Timestamp} = require('mongodb');
const uri = process.env.ATLAS_URI;
const client = new MongoClient(uri, { useNewUrlParser: true,useUnifiedTopology: true });


// This script expects one argument:
// 1. The model file

// tslint:disable-next-line: no-floating-promises
(async () => {
    try  {
        if (!process.argv[2]) {
            console.log('Missing one argument (model file)');
            process.exit(1);
        }

        let runner = new LinuxImpulseRunner(process.argv[2]);
        let model = await runner.init();

        console.log('Starting the audio classifier for',
            model.project.owner + ' / ' + model.project.name, '(v' + model.project.deploy_version + ')');
        console.log('Parameters', 'freq', model.modelParameters.frequency + 'Hz',
            'window length', ((model.modelParameters.input_features_count / model.modelParameters.frequency) * 1000) + 'ms.',
            'classes', model.modelParameters.labels);

        // Find the right microphone to run this model with (can be passed in as argument to the script)
        let devices = await AudioRecorder.ListDevices();
        if (devices.length === 0) {
            devices = [{ id: '', name: 'Default microphone' }];
        }
        if (devices.length > 1 && !process.argv[3]) {
            throw new Error('Multiple microphones found (' + devices.map(n => '"' + n.name + '"').join(', ') + '), ' +
                'add the microphone to use to this script (node classify-audio.js model.eim microphone)');
        }
        let device;
        if (process.argv[3]) {
            let d = devices.find(x => x.name === process.argv[3]);
            if (!d) {
                throw new Error('Invalid microphone name (' + process.argv[3] + '), found: ' +
                    devices.map(n => '"' + n.name + '"').join(', '));
            }
            device = d.id;
        }
        else {
            device = devices[0].id;
        }

        let audioClassifier = new AudioClassifier(runner, false /* verbose */);

        audioClassifier.on('noAudioError', async () => {
            console.log('');
            console.log('ERR: Did not receive any audio. Here are some potential causes:');
            console.log('* If you are on macOS this might be a permissions issue.');
            console.log('  Are you running this command from a simulated shell (like in Visual Studio Code)?');
            console.log('* If you are on Linux and use a microphone in a webcam, you might also want');
            console.log('  to initialize the camera (see camera.js)');
            await audioClassifier.stop();
            process.exit(1);
        });
        await audioClassifier.start(device, 1000 /* interval, so here 4 times per second */);
        // when new data comes in, this handler is called.
        // Use it to draw conclusions, send interesting events to the cloud etc.
        function getCurrentTime() {
          let date = new Date();
          var hours = date.getHours();
          var minutes = date.getMinutes();
          var ampm = hours >= 12 ? 'pm' : 'am';
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          minutes = minutes < 10 ? '0'+minutes : minutes;
          var strTime = hours + ':' + minutes + ' ' + ampm;
          return strTime
        }
        const omit = (obj, keys) =>
            Object.keys(obj)
                .filter((k) => !keys.includes(k))
                .reduce((res, k) => Object.assign(res, { [k]: obj[k] }), {});

            audioClassifier.on('result', (ev, timeMs, audioAsPcm) => {
                if (!ev.result.classification) return;

                let c = ev.result.classification;
                for (let k of Object.keys(c)) {
                    c[k] = c[k].toFixed(2);
                }
                console.log(c);
                //ignoring background noise
                let y = omit(c, ['background']);

                //current time, in case MongoDB time format sucks.
                let currentTime = getCurrentTime();

                let classified = Object.keys(c).reduce((a, b) => c[a] > c[b] ? a : b);

                // console.log(classified)

                // for (let k of Object.keys(y)) {
                //     y[k] = y[k].toFixed(2);
                // }
                // console.log(y);

                if (y[classified] > 0.99) {
                    if(`${classified}` === 'background'){
                        var new_c = {'class': `${classified}`, 'createtime': new Timestamp()}
                    }
                    else if (`${classified}` === 'bark') {
                        new_c = {'bark': `${y[classified]}`, 'createtime': new Timestamp()}

                    }
                    else if (`${classified}` === 'growl') {
                        new_c = {'growl': `${y[classified]}`, 'createtime': new Timestamp()}

                    }
                    else if (`${classified}` === 'whine') {
                        new_c = {'whine': `${y[classified]}`, 'createtime': new Timestamp()}
                    }

                    console.log('\x1b[36m%s\x1b[5m%s\x1b[0m', new_c);
                    client.connect(err => {
                        const collection = client.db("dog-sound-classification").collection("classifications");
                        collection.insertOne(new_c, (err, res) => {
                            if(err) throw err;
                            console.log("classification inserted");
                        });
                    });
                }
                // console.log(final_z);



                // console.log('classification', timeMs + 'ms.', y);
                // console.log('classification', timeMs + 'ms.', f);
                // console.log(result_c);
            });
        }
    catch (ex) {
        console.error(ex);
        process.exit(1);
    }
})();

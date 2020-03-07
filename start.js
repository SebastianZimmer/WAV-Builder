var examples = {
	sine: {
		code: "// generate a sine wave of 440 Hz\n\
\n\
for (var i=0; i<samplingRate * wavLength; i++){\n\
\n\
    out[i] = Math.sin(440 * i * 2 * Math.PI / samplingRate);\n\
\n\
}",
		samplingRate: 44100,
		wavLength: 10
	},

	triangle: {
		code: "// generate a triangle wave of 440 Hz\n\
\n\
// frequency\n\
var f = 440\n\
// period\n\
var p = 0.5 * samplingRate / f;\n\
// amplitude\n\
var a = 0.7;\n\
\n\
for (var i=0; i<samplingRate * wavLength; i++){\n\
\n\
    out[i] = (a/p) * (p - Math.abs(i % (2*p) - p) ) - (a/2);\n\
\n\
}",
		samplingRate: 44100,
		wavLength: 10
	},

	square: {
		code: "// generate a square wave of 440 Hz\n\
\n\
// frequency\n\
var f = 440\n\
// period\n\
var p = 0.5 * samplingRate / f;\n\
// amplitude\n\
var a = 0.7;\n\
\n\
for (var i=0; i<samplingRate * wavLength; i++){\n\
\n\
    out[i] = (i % (2 * p)) < p ? a : (-a);\n\
\n\
}",
		samplingRate: 44100,
		wavLength: 10
	},

	square_as_sum_of_harmonics: {
		code: "// generate a square wave of 440 Hz\n\
\n\
// frequency\n\
var f = 440;\n\
// period\n\
var p = 0.5 * samplingRate / f;\n\
// amplitude\n\
var a = 0.7;\n\
//angular frequency\n\
var w = 2 * Math.PI * f;\n\
\n\
for (var i=0; i<samplingRate * wavLength; i++){\n\
    \n\
    var s = 0; \n\
\n\
    for (var j=0; j<10; j++){\n\
        s += a * (4 / ((2*j+1) * Math.PI)) * Math.sin((2*j+1) * w * i / samplingRate);\n\
    }\n\
\n\
    out[i] = s;\n\
\n\
}",
		samplingRate: 44100,
		wavLength: 10
	},

	sinc: {
		code: "// sinc function with peak position and offset\n\
\n\
var k = 0.5;\n\
var length = 24;\n\
var peak_pos = 12;\n\
var offset = 0.375;\n\
\n\
for (var i=0; i<length; i++){\n\
\n\
    out[i] = k * Math.sin(Math.PI * (i - peak_pos - offset)) / (Math.PI * (i - peak_pos - offset));\n\
\n\
}\n\
",
    samplingRate: 48000,
    wavLength: 0.0005
  },
  sine_sweep: {
    code: `// generate linear sine sweep

    const A = 1;                                                // sine wave amplitude
    const f0 = 1;                                               // start frequency
    const f1 = 20000;                                           // end frequency
    const T_sweep = wavLength;                                  // duration of sweep (s)
    const lengthInSamples = samplingRate * wavLength;           // duration of sweep (samples)
    
    const f_delta = (f1 - f0) / (samplingRate * wavLength)      // instantaneous frequency increment per sample
    
    let phi = 0;                                                // phase accumulator
    let delta = 2 * Math.PI * f0 / samplingRate;                // phase increment per sample
    let f = f0;                                                 // initial frequency
    
    for (var i=0; i < lengthInSamples; i++){
        out[i] = A * Math.sin(phi);                             // output sample value for current sample
        phi += delta;                                           // increment phase accumulator
        f += f_delta;                                           // increment instantaneous frequency
        delta = 2 * Math.PI * f / samplingRate;                 // re-calculate phase increment
    }`,
    samplingRate: 44100,
    wavLength: 10
  }

}


var g = function(id){

	return document.getElementById(id);

}

var oc = function(element_or_id, action){

	if (typeof element_or_id == "object"){

		var element = element_or_id;

	}

	else {

		element = g(element_or_id);

	}

	element.addEventListener("click", action, false);

};


var setExample = function(example){

	g("textarea_script").value = example.code;
	g("input_samplingRate").value = example.samplingRate;
	g("input_wavLength").value = example.wavLength;

}


document.addEventListener("DOMContentLoaded", function(){

	setExample(examples.sine);

	oc("make_wav", function(){

		var samplingRate = parseInt(g("input_samplingRate").value);
		var wavLength = parseFloat(g("input_wavLength").value);

		var length_of_buffer = Math.round(wavLength * samplingRate);

		var AC = new OfflineAudioContext(1, length_of_buffer, samplingRate);
		var audioBuffer = AC.createBuffer(1, length_of_buffer, samplingRate);
		var channelData = audioBuffer.getChannelData(0);

		var out = new Float32Array(samplingRate * wavLength);

		eval(g("textarea_script").value);

		for (var s = 0; s < samplingRate * wavLength; s++){

			channelData[s] = out[s];

		}

		renderAndDownloadWAV(samplingRate, 1, audioBuffer);

    });

	var input_buttons = document.getElementsByClassName("standard_input_type_button");

	for (var i = 0; i < input_buttons.length; i++) {

		var element = input_buttons[i];

		var type = element.getAttribute("data-type");

		oc(element, function(type){
			return function(){
				console.log(type);

				setExample(examples[type]);

			}
		}(type));

	}

});



var renderAndDownloadWAV = function(samplingRate, numberOfChannels, buffer){

	renderWAVFileFromAudioBuffer(samplingRate, numberOfChannels, buffer, function(blob){

		saveAs(blob, "export.wav");

	});

}


var renderWAVFileFromAudioBuffer = function(samplingRate, numberOfChannels, buffer, then){

	console.log("rendering wav form buffer:");
	console.log(buffer);

	// start a new worker
	var worker = new Worker("recorderWorker.js");

	// initialize the new worker
	worker.postMessage({
		command: 'init',
		config: {
			sampleRate: samplingRate,
			numChannels: numberOfChannels
		}
	});

	// send the channel data from our buffer to the worker
	worker.postMessage({
		command: 'record',
		buffer: [
			buffer.getChannelData(0)/*,
			buffer.getChannelData(1)*/
		]
	});

	// callback for `exportWAV`
	worker.onmessage = function(e) {
		var blob = e.data;
		// this is would be your WAV blob

		then(blob);

	};

	// ask the worker for a WAV
	worker.postMessage({
		command: 'exportWAV',
		type: 'audio/wav'
	});

};

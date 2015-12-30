var code_examples = {
	sine: "// generate a sine wave of 440 Hz\n\
\n\
for (var i=0; i<samplingRate * wavLength; i++){\n\
\n\
    out[i] = Math.sin(440 * i * 2 * Math.PI / samplingRate);\n\
\n\
}",

triangle:
"// generate a triangle wave of 440 Hz\n\
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

square:
"// generate a square wave of 440 Hz\n\
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
}"
	
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


var setTextareaValue = function(value){

	g("textarea_script").value = value;

}


document.addEventListener("DOMContentLoaded", function(){

	setTextareaValue(code_examples.sine);
	
	oc("make_wav", function(){
		
		var samplingRate = parseInt(g("input_samplingRate").value);
		var wavLength = parseInt(g("input_wavLength").value);
		
		var AC = new OfflineAudioContext(1, wavLength * samplingRate, samplingRate);
		var audioBuffer = AC.createBuffer(1, wavLength * samplingRate, samplingRate);
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
				
				setTextareaValue(code_examples[type]);
				
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
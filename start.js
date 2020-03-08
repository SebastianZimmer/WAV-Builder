const examples = {
  sine: {
    code: "// generate a sine wave of 440 Hz\n\
\n\
for (let i=0; i<samplingRate * wavLength; i++){\n\
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
const f = 440\n\
// period\n\
const p = 0.5 * samplingRate / f;\n\
// amplitude\n\
const a = 0.7;\n\
\n\
for (let i=0; i<samplingRate * wavLength; i++){\n\
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
const f = 440\n\
// period\n\
const p = 0.5 * samplingRate / f;\n\
// amplitude\n\
const a = 0.7;\n\
\n\
for (let i=0; i<samplingRate * wavLength; i++){\n\
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
const f = 440;\n\
// period\n\
const p = 0.5 * samplingRate / f;\n\
// amplitude\n\
const a = 0.7;\n\
//angular frequency\n\
const w = 2 * Math.PI * f;\n\
\n\
for (let i=0; i<samplingRate * wavLength; i++){\n\
    \n\
    let s = 0; \n\
\n\
    for (let j=0; j<10; j++){\n\
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
const k = 0.5;\n\
const length = 24;\n\
const peak_pos = 12;\n\
const offset = 0.375;\n\
\n\
for (let i=0; i<length; i++){\n\
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

for (let i=0; i < lengthInSamples; i++){
    out[i] = A * Math.sin(phi);                             // output sample value for current sample
    phi += delta;                                           // increment phase accumulator
    f += f_delta;                                           // increment instantaneous frequency
    delta = 2 * Math.PI * f / samplingRate;                 // re-calculate phase increment
}`,
    samplingRate: 44100,
    wavLength: 10
  },
  log_sine_sweep: {
      code: `// generate logarithmic sine sweep
// source: http://guillaume.perrin74.free.fr/ChalmersMT2012/Papers/Impulse%20Response/IEEE_2008_LSP_IR_SineSweep.pdf

const f0 = 10;                                              // start frequency
const f1 = 20000;                                           // end frequency
const T = wavLength;                                        // duration of sweep (s)
const lengthInSamples = samplingRate * wavLength;           // duration of sweep (samples)

const f0_2pi = 2 * Math.PI * f0;
const f1_2pi = 2 * Math.PI * f1;
const ln = Math.log(f1_2pi / f0_2pi);
const K = (T * f0_2pi) / ln;
const L = T / ln;

for (let i=0; i < lengthInSamples; i++){
  const t = (i / lengthInSamples) * T;
  out[i] = Math.sin(K * (Math.pow(Math.E, t / L) - 1));
}`,
    samplingRate: 44100,
    wavLength: 10
  }

}


const g = function(id){
  return document.getElementById(id);
}


const oc = function(element_or_id, action) {
  if (typeof element_or_id == "object"){
    var element = element_or_id;
  } else {
    element = g(element_or_id);
  }

  element.addEventListener("click", action, false);
};


const setExample = function(example){
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

  var input_buttons = document.getElementsByClassName(
    "standard_input_type_button"
  );

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


const renderAndDownloadWAV = async (
  samplingRate, numberOfChannels, buffer
) => {
  const blob = await renderWAVFileFromAudioBuffer(
    samplingRate, numberOfChannels, buffer
  );
  saveAs(blob, "export.wav");
}


const renderWAVFileFromAudioBuffer = function(
  samplingRate, numberOfChannels, buffer
){

  return new Promise((resolve, reject) => {
    console.log("rendering wav form buffer:");
    console.log(buffer);
  
    // start a new worker
    const worker = new Worker("recorderWorker.js");
  
    worker.postMessage({
      config: {
        sampleRate: samplingRate,
        numChannels: numberOfChannels,
        bitDepth: parseInt(
          document.querySelector('input[name="input_bitDepth"]:checked').value
        ),
      },
      buffers: [
        buffer.getChannelData(0)/*,
        buffer.getChannelData(1)*/
      ],
    });
  
    // callback for `exportWAV`
    worker.onmessage = function(e) {
      const blob = e.data;
      resolve(blob);
    };
  });

};

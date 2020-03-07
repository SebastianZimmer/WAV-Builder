let recLength = 0;
let recBuffers = [];
let sampleRate;
let bitDepth;
let numChannels;

this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'exportWAV':
      exportWAV(e.data.type);
      break;
    case 'getBuffer':
      getBuffer();
      break;
    case 'clear':
      clear();
      break;
  }
};

function init(config){
  sampleRate = config.sampleRate;
  numChannels = config.numChannels;
  bitDepth = config.bitDepth;
  initBuffers();
}

function record(inputBuffer){
  for (var channel = 0; channel < numChannels; channel++){
    recBuffers[channel].push(inputBuffer[channel]);
  }
  recLength += inputBuffer[0].length;
}

function exportWAV(type){
  var buffers = [];
  for (var channel = 0; channel < numChannels; channel++){
    buffers.push(mergeBuffers(recBuffers[channel], recLength));
  }
  if (numChannels === 2){
      var interleaved = interleave(buffers[0], buffers[1]);
  } else {
      var interleaved = buffers[0];
  }
  var dataview = encodeWAV(interleaved);
  var audioBlob = new Blob([dataview], { type: type });

  this.postMessage(audioBlob);
}

function getBuffer(){
  var buffers = [];
  for (var channel = 0; channel < numChannels; channel++){
    buffers.push(mergeBuffers(recBuffers[channel], recLength));
  }
  this.postMessage(buffers);
}

function clear(){
  recLength = 0;
  recBuffers = [];
  initBuffers();
}

function initBuffers(){
  for (var channel = 0; channel < numChannels; channel++){
    recBuffers[channel] = [];
  }
}

function mergeBuffers(recBuffers, recLength){
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < recBuffers.length; i++){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }
  return result;
}

function interleave(inputL, inputR){
  var length = inputL.length + inputR.length;
  var result = new Float32Array(length);

  var index = 0,
    inputIndex = 0;

  while (index < length){
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}


const clampSampleValue = (value) => {
  return Math.max(-1, Math.min(1, value));
}


function floatTo16BitPCM(output, offset, input){
  for (let i = 0; i < input.length; i++, offset += 2){
    const value = clampSampleValue(input[i]);
    const bitValue = value < 0 ? value * 0x8000 : value * 0x7FFF;
    output.setInt16(offset, bitValue, true);
  }
}


function floatTo24BitPCM(output, offset, input){
  for (let i = 0; i < input.length; i++, offset += 3) {
    const value = clampSampleValue(input[i]);
    const bitValue = value < 0 ? value * 0x800000 : value * 0x7FFFFF;

    // WAVE file data is in little-endian, so split the 3 bytes into
    // less significant lower 1 byte part and write that first
    output.setInt8(offset, bitValue & 0x0000FF, true);
    // after that, we write the upper, more significant 2 bytes part ...
    output.setInt16(offset + 1, Math.floor(bitValue / (2**8)), true);
  }
}


function writeString(view, offset, string){
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(interleavedSamples){
  var buffer = new ArrayBuffer(44 + interleavedSamples.length * (bitDepth / 8));
  var view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + interleavedSamples.length * (bitDepth / 8), true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (bytes per second, sample rate * block align) */
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * 2, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, interleavedSamples.length * (bitDepth / 8), true);

  if (bitDepth === 16){
    floatTo16BitPCM(view, 44, interleavedSamples);
  } else {
    floatTo24BitPCM(view, 44, interleavedSamples);
  }


  return view;
}

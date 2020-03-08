this.onmessage = function(e){
  const inputBuffers = e.data.buffers;
  const config = e.data.config;
  const blob = createWAVBlob(inputBuffers, config);
  this.postMessage(blob);
};


function createWAVBlob(buffers, config){
  if (config.numChannels === 2){
      var interleaved = interleave(buffers[0], buffers[1]);
  } else {
      var interleaved = buffers[0];
  }
  const dataview = encodeWAV(interleaved, config);
  const audioBlob = new Blob([dataview], { type: "audio/wav" });
  return audioBlob;
};


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


function floatTo8BitPCM(output, offset, input){
  for (let i = 0; i < input.length; i++, offset++){
    const value = clampSampleValue(input[i]);
    // for whatever reason, 8bit audio is unsigned in contrast to 16bit/24bit.
    // Source: http://soundfile.sapp.org/doc/WaveFormat/
    const bitValue = ((value + 1) / 2) * 0xFF;
    output.setUint8(offset, bitValue);
  }
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

    // WAVE file data is in little-endian, so split the 3 bytes into a
    // less significant lower 1 byte part and write that first
    output.setInt8(offset, bitValue & 0x0000FF, true);
    // after that, we write the upper, more significant 2 bytes part ...
    output.setInt16(offset + 1, Math.floor(bitValue / (2**8)), true);
  }
}


function floatTo32BitFloatPCM(output, offset, input){
  for (let i = 0; i < input.length; i++, offset += 4){
    const value = clampSampleValue(input[i]);
    output.setFloat32(offset, value, true);
  }
}


function writeString(view, offset, string){
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}


function encodeWAV(interleavedSamples, config){
  const sampleRate = config.sampleRate;
  const bitDepth = config.bitDepth;
  const numChannels = config.numChannels;

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
  /* sample format (raw PCM = 1, IEEE Float = 3) */
  const dataFormatCode = config.bitDepth === 32 ? 3 : 1;
  view.setUint16(20, dataFormatCode, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (bytes per second, sample rate * block align) */
  const byteRate = sampleRate * numChannels * (bitDepth / 8);
  view.setUint32(28, byteRate, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * Math.floor((bitDepth + 7) / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, interleavedSamples.length * (bitDepth / 8), true);

  if (bitDepth === 8){
    floatTo8BitPCM(view, 44, interleavedSamples);
  } else if (bitDepth === 16){
    floatTo16BitPCM(view, 44, interleavedSamples);
  } else if (bitDepth === 24){
    floatTo24BitPCM(view, 44, interleavedSamples);
  } else {
    floatTo32BitFloatPCM(view, 44, interleavedSamples);
  }

  return view;
}

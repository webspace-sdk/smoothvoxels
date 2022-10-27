export default function RGBAHandler (state, startIndex, endIndex) {
  const colors = []
  for (let n = 0; n < 256; n++) {
    colors[n] = {
      r: state.Buffer[state.readByteIndex++],
      g: state.Buffer[state.readByteIndex++],
      b: state.Buffer[state.readByteIndex++],
      a: state.Buffer[state.readByteIndex++]
    }
  }
  return colors
};

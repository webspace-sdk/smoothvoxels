export default function SIZEHandler (state, startIndex, endIndex) {
  const sizex = state.Buffer.readInt32LE(state.readByteIndex)
  state.readByteIndex += 4

  const sizey = state.Buffer.readInt32LE(state.readByteIndex)
  state.readByteIndex += 4

  const sizez = state.Buffer.readInt32LE(state.readByteIndex)
  state.readByteIndex += 4

  console.assert(state.readByteIndex === endIndex, "Chunk handler didn't reach end")

  return {
    x: sizex,
    y: sizey,
    z: sizez
  }
};

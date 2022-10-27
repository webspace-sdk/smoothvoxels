import readDict from './read-dict.js'

export default function MATLHandler (state, startIndex, endIndex) {
  const ret = {}

  // node id
  ret.id = state.Buffer.readInt32LE(state.readByteIndex)
  state.readByteIndex += 4

  ret.properties = readDict(state)

  return ret
};

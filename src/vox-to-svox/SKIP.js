// Skip this chunk.
export default function SKIPHandler (state, startIndex, endIndex) {
  state.readByteIndex = endIndex
  return { error: 'Unsupported chunk type' }
}

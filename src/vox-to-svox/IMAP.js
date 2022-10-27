export default function IMAPHandler (state, startIndex, endIndex) {
  const ret = {}
  ret.pal_indices = []

  for (let i = 0; i < 256; i++) {
    ret.pal_indices.push(state.Buffer[state.readByteIndex++])
  }

  return ret
}

export default function readId (state) {
  const id = String.fromCharCode(parseInt(state.Buffer[state.readByteIndex++])) +
           String.fromCharCode(parseInt(state.Buffer[state.readByteIndex++])) +
           String.fromCharCode(parseInt(state.Buffer[state.readByteIndex++])) +
           String.fromCharCode(parseInt(state.Buffer[state.readByteIndex++]))

  return id
};

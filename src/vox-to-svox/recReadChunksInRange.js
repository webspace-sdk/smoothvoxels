import readId from './readId'
import { intByteLength } from './constants'
import getChunkData from './getChunkData'

export default function recReadChunksInRange (Buffer, bufferStartIndex, bufferEndIndex, accum) {
  const state = {
    Buffer,
    readByteIndex: bufferStartIndex
  }

  const id = readId(state, bufferStartIndex)

  const chunkContentByteLength = Buffer.readInt32LE(state.readByteIndex)
  state.readByteIndex += intByteLength

  const childContentByteLength = Buffer.readInt32LE(state.readByteIndex)
  state.readByteIndex += intByteLength

  const definitionEndIndex = state.readByteIndex
  const contentByteLength = chunkContentByteLength
  const totalChunkEndIndex = state.readByteIndex + chunkContentByteLength + childContentByteLength

  if (contentByteLength === 0 && childContentByteLength === 0) {
    console.log('no content or children for', id)
    return accum
  }

  if (contentByteLength && id) {
    const chunkContent = getChunkData(state, id, definitionEndIndex, totalChunkEndIndex)
    console.assert(state.readByteIndex === totalChunkEndIndex, `${id} length mismatch ${state.readByteIndex}:${totalChunkEndIndex}`)
    if (!accum[id]) {
      accum[id] = chunkContent
    } else if (accum[id] && !accum[id][0]?.length) {
      accum[id] = [accum[id], chunkContent]
    } else if (accum[id] && accum[id][0]?.length) {
      accum[id].push(chunkContent)
    }
  }

  // read children
  if (childContentByteLength > 0) {
    return recReadChunksInRange(Buffer,
      definitionEndIndex + contentByteLength,
      bufferEndIndex,
      {})
  }

  // accumulate siblings
  if (totalChunkEndIndex !== bufferEndIndex) {
    return recReadChunksInRange(Buffer,
      totalChunkEndIndex,
      bufferEndIndex,
      accum)
  }

  return accum
};

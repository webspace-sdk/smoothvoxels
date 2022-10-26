import { intByteLength } from './constants'
import recReadChunksInRange from './recReadChunksInRange'
import readId from './readId'
import useDefaultPalette from './useDefaultPalette'
import { Buffer } from 'buffer'

function parseHeader (Buffer) {
  const ret = {}
  const state = {
    Buffer,
    readByteIndex: 0
  }
  ret[readId(state)] = Buffer.readInt32LE(intByteLength)
  return ret
};

export default function parseMagicaVoxel (BufferLikeData) {
  let buffer = BufferLikeData
  buffer = new Buffer(new Uint8Array(BufferLikeData)) // eslint-disable-line

  const header = parseHeader(buffer)
  const body = recReadChunksInRange(
    buffer,
    8, // start on the 8th byte as the header dosen't follow RIFF pattern.
    buffer.length,
    header
  )

  if (!body.RGBA) {
    body.RGBA = useDefaultPalette()
  }

  return Object.assign(header, body)
};

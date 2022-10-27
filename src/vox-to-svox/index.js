import { intByteLength } from './constants'
import recReadChunksInRange from './recReadChunksInRange'
import readId from './readId'
import useDefaultPalette from './useDefaultPalette'
import { Buffer as BrowserBuffer } from 'buffer'
import Voxels, { shiftForSize, voxColorForRGBT } from '../smoothvoxels/voxels'
import { MATSTANDARD, FLAT } from '../smoothvoxels/constants'
import Model from '../smoothvoxels/model'

const BufferImpl = Buffer || BrowserBuffer

function parseHeader (Buffer) {
  const ret = {}
  const state = {
    Buffer,
    readByteIndex: 0
  }
  ret[readId(state)] = BufferImpl.readInt32LE(intByteLength)
  return ret
};

function parseMagicaVoxel (BufferLikeData) {
  let buffer = BufferLikeData
  buffer = new BufferImpl(new Uint8Array(BufferLikeData)) // eslint-disable-line

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

export default function (bufferData, model = null) {
  const vox = parseMagicaVoxel(bufferData)
  console.log(vox)

  // Palette map (since palette indices can be moved in Magica Voxel by CTRL-Drag)
  const iMap = []
  if (vox.IMAP) {
    for (let i = 1; i <= vox.IMAP.pal_indices.length; i++) {
      iMap[vox.IMAP.pal_indices[i - 1]] = i
    }
  }

  let minX = Infinity; let minY = Infinity; let minZ = Infinity
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity

  // Only use first xyzi chunk
  const xyziChunk = Array.isArray(vox.XYZI[0]) ? vox.XYZI[0] : vox.XYZI

  xyziChunk.forEach(function (v) {
    const { x, y, z } = v
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    minZ = Math.min(minZ, z)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    maxZ = Math.max(maxZ, z)
  })

  const voxSizeX = maxX - minX + 1
  const voxSizeY = maxY - minY + 1
  const voxSizeZ = maxZ - minZ + 1

  if (model === null) {
    model = new Model()
    model.origin = '-y'
    model.scale = { x: 0.05, y: 0.05, z: 0.05 }
    model.size = { x: voxSizeX, y: voxSizeZ, z: voxSizeY }

    let paletteBits = 1

    const seenColors = new Set()

    xyziChunk.forEach(({ c }) => seenColors.add(c))

    const numberOfColors = seenColors.size
    if (numberOfColors >= 2) { paletteBits = 2 }
    if (numberOfColors >= 4) { paletteBits = 4 }
    if (numberOfColors >= 16) { paletteBits = 8 }

    model.voxels = new Voxels([model.size.x, model.size.y, model.size.z], paletteBits)
  }
  // Alpha channel is unused(?) in Magica voxel, so just use the same material for all
  // If all colors are already available this new material will have no colors and not be written by the modelwriter
  const newMaterial = model.materials.createMaterial(MATSTANDARD, FLAT)
  const newMaterialIndex = model.materials.materials.indexOf(newMaterial)

  const shiftX = shiftForSize(model.size.x)
  const shiftY = shiftForSize(model.size.y)
  const shiftZ = shiftForSize(model.size.z)

  const voxels = model.voxels
  const RGBA = vox.RGBA

  xyziChunk.forEach(function (v) {
    const { x: vx, y: vz, z: vy, c } = v
    const { r, g, b } = RGBA[c - 1]
    const svoxColor = voxColorForRGBT(r, g, b, newMaterialIndex)
    // ?? not sure why this is needed but objects come in mirrored

    voxels.setColorAt(vx - shiftX - minX, vy - shiftY - minY, vz - shiftZ - minZ, svoxColor)
  })

  return model
}

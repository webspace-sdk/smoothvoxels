import { intByteLength } from './constants'
import recReadChunksInRange from './recReadChunksInRange'
import readId from './readId'
import useDefaultPalette from './useDefaultPalette'
import { Buffer } from 'buffer'
import { shiftForSize, voxColorForRGBT } from '../smoothvoxels/voxels'
import { MATSTANDARD, FLAT } from '../smoothvoxels/constants'

function parseHeader (Buffer) {
  const ret = {}
  const state = {
    Buffer,
    readByteIndex: 0
  }
  ret[readId(state)] = Buffer.readInt32LE(intByteLength)
  return ret
};

function parseMagicaVoxel (BufferLikeData) {
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

export default function (bufferData, model = null) {
  const vox = parseMagicaVoxel(bufferData)

  // if (model = null) {
  // }

  // Alpha channel is unused(?) in Magica voxel, so just use the same material for all
  // If all colors are already available this new material will have no colors and not be written by the modelwriter
  const newMaterial = model.materials.createMaterial(MATSTANDARD, FLAT)
  const newMaterialIndex = model.materials.materials.indexOf(newMaterial)

  // Palette map (since palette indices can be moved in Magica Voxel by CTRL-Drag)
  const iMap = []
  if (vox.IMAP) {
    for (let i = 1; i <= vox.IMAP.pal_indices.length; i++) {
      iMap[vox.IMAP.pal_indices[i - 1]] = i
    }
  }

  let minX = Infinity; let minY = Infinity; let minZ = Infinity
  let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity

  vox.XYZI.forEach(function (v) {
    minX = Math.min(minX, v.x)
    minY = Math.min(minY, v.y)
    minZ = Math.min(minZ, v.z)
    maxX = Math.max(maxX, v.x)
    maxY = Math.max(maxY, v.y)
    maxZ = Math.max(maxZ, v.z)
  })

  const sizeX = maxX - minX + 1
  const sizeY = maxY - minY + 1
  const sizeZ = maxZ - minZ + 1

  const shiftX = shiftForSize(sizeX)
  const shiftY = shiftForSize(sizeY)
  const shiftZ = shiftForSize(sizeZ)

  vox.XYZI.forEach(function (v) {
    const c = v.c
    const voxcol = vox.RGBA[c - 1]
    const svoxColor = voxColorForRGBT(voxcol.r, voxcol.g, voxcol.b, newMaterialIndex)
    model.voxels.setColorAt(v.x - shiftX, v.z - shiftZ, -v.y - shiftY, svoxColor)
  })

  // let scale = 1 / Math.max(model.voxels.bounds.size.x, model.voxels.bounds.size.y, model.voxels.bounds.size.z);
  // model.scale = { x:scale, y:scale, z:scale };
}

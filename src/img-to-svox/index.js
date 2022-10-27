import { MATSTANDARD, BOTH } from '../smoothvoxels/constants'
import Model from '../smoothvoxels/model'
import Voxels, { MAX_SIZE, voxBGRForHex, shiftForSize } from '../smoothvoxels/voxels'

export default function imgToSvox (img, model = null, tempCanvas = null) {
  tempCanvas = tempCanvas || document.createElement('canvas')
  tempCanvas.id = 'tempCanvas'

  if (img.width >= img.height) {
    tempCanvas.width = Math.min(MAX_SIZE, img.width)
    tempCanvas.height = Math.floor(Math.min(MAX_SIZE, img.width) * (img.height / img.width))
  } else {
    tempCanvas.width = Math.floor(Math.min(MAX_SIZE, img.height) * (img.width / img.height))
    tempCanvas.height = Math.min(MAX_SIZE, img.height)
  }

  const ctx = tempCanvas.getContext('2d')
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, tempCanvas.width, tempCanvas.height)
  const pixels = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

  const sizeX = Math.min(MAX_SIZE, tempCanvas.width)
  const sizeZ = Math.min(MAX_SIZE, tempCanvas.height)
  const scaleFactor = 1 / (Math.max(sizeX, sizeZ))

  if (model === null) {
    model = new Model()
    model.scale = { x: scaleFactor, y: 0.1, z: scaleFactor }
    model.size = { x: sizeX, y: 1, z: sizeZ }
    model.origin = '+z'
    model.rotation = { x: 90, y: 0, z: 0 }
  }

  const material = model.materials.createMaterial(MATSTANDARD, BOTH, 0.5, 0, true)
  material.setDeform(10)
  material.clamp = 'y'
  const materialIndex = model.materials.materials.indexOf(material)

  let pixel = 0
  const pixColToVoxColor = new Map()

  for (let z = 0; z < tempCanvas.height; z++) {
    for (let x = 0; x < tempCanvas.width; x++) {
      if (x < MAX_SIZE && z < MAX_SIZE) {
        // 4096 Colors
        // let col = ((pixels.data[pixel+0]&0xF0)<<5) + ((pixels.data[pixel+1]&0xD0)) + ((pixels.data[pixel+2]&0xF0)>>4);

        // 512 Colors
        const pixCol = ((pixels.data[pixel + 0] & 0xE0) << 4) + ((pixels.data[pixel + 1] & 0xE0)) + ((pixels.data[pixel + 2] & 0xE0) >> 4)
        let hex = '000' + Number(pixCol).toString(16)
        hex = '#' + hex.substr(hex.length - 3, 3)

        if (pixels.data[pixel + 3] > 0) {
          if (!pixColToVoxColor.has(pixCol)) {
            const voxBgr = voxBGRForHex(hex)
            const voxColor = (voxBgr | (materialIndex << 24)) >>> 0
            pixColToVoxColor.set(pixCol, voxColor)
          }
        }
      }

      pixel += 4
    }
  }

  pixel = 0

  const numberOfColors = pixColToVoxColor.size
  let paletteBits = 1

  if (numberOfColors >= 2) { paletteBits = 2 }
  if (numberOfColors >= 4) { paletteBits = 4 }
  if (numberOfColors >= 16) { paletteBits = 8 }

  model.voxels = new Voxels([model.size.x, model.size.y, model.size.z], paletteBits)

  console.log('new voxels', [model.size.x, model.size.y, model.size.z], model.voxels.size)

  const xShift = shiftForSize(model.size.x)
  const zShift = shiftForSize(model.size.z)

  for (let z = 0; z < tempCanvas.height; z++) {
    for (let x = 0; x < tempCanvas.width; x++) {
      if (x < MAX_SIZE && z < MAX_SIZE) {
        // 4096 Colors
        // const pixCol = ((pixels.data[pixel+0]&0xF0)<<5) + ((pixels.data[pixel+1]&0xD0)) + ((pixels.data[pixel+2]&0xF0)>>4);

        // 512 Colors
        const pixCol = ((pixels.data[pixel + 0] & 0xE0) << 4) + ((pixels.data[pixel + 1] & 0xE0)) + ((pixels.data[pixel + 2] & 0xE0) >> 4)

        if (pixels.data[pixel + 3] > 0) {
          model.voxels.setColorAt(x - xShift, 0, z - zShift, pixColToVoxColor.get(pixCol))
        }
      }

      pixel += 4
    }
  }
  console.log('new voxels2', model.voxels.size)

  return model
}

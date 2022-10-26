import { MATSTANDARD, FLAT, FRONT } from './constants.js'

export default class ModelWriter {
  /**
   * Serialize the model to a string.
   * When repeat is used, compressed is ignored.
   * @param model The model data.
   * @param compressed Wether the voxels need to be compressed using Recursive Runlength Encoding.
   * @param repeat An integer specifying whether to repeat the voxels to double or tripple the size, default is 1.
   */
  static writeToString (model, compressed, repeat) {
    repeat = Math.round(repeat || 1)

    // Retrieve all colors
    const colors = []
    const colorIds = {}
    model.materials.forEach(function (material) {
      material.colors.forEach(function (color) {
        colors.push(color)
        colorIds[color.id] = color.id
      })
    })

    // Sort the colors on (usage) count
    colors.sort(function (a, b) {
      return b.count - a.count
    })

    // Give the new colors their Id, reusing existing Id's
    let maxIdLength = 0
    let index = 0
    for (let c = 0; c < colors.length; c++) {
      if (!colors[c].id) {
        let colorId
        do {
          colorId = this._colorIdForIndex(index++)
        } while (colorIds[colorId])
        colorIds[colorId] = colorId
        colors[c].id = colorId
      }
      maxIdLength = Math.max(colors[c].id.length, maxIdLength)
    }

    // If multi character color Id's (2 or 3 long) are used, use extra spaces for the '-' for empty voxels
    const voxelWidth = compressed || maxIdLength === 1 || maxIdLength > 3 ? 1 : maxIdLength

    // Add the textures to the result
    let result = this._serializeTextures(model)

    // Add the lights to the result
    result += this._serializeLights(model)

    result += 'model\r\n'
    // Add the size to the result
    const size = model.voxels.bounds.size
    if (size.y === size.x && size.z === size.x) { result += `size = ${size.x * repeat}\r\n` } else { result += `size = ${size.x * repeat} ${size.y * repeat} ${size.z * repeat}\r\n` }

    if (model.shape !== 'box') { result += `shape = ${model.shape}\r\n` }

    // Add the scale
    if (model.scale.x !== 1 || model.scale.y !== 1 || model.scale.z !== 1 || repeat !== 1) {
      if (model.scale.y === model.scale.x && model.scale.z === model.scale.x) { result += `scale = ${model.scale.x / repeat}\r\n` } else { result += `scale = ${model.scale.x / repeat} ${model.scale.y / repeat} ${model.scale.z / repeat}\r\n` }
    }

    if (model.resize) { result += `resize = ${model.resize}\r\n` }

    // Add the rotation (degrees)
    if (model.rotation.x !== 0 || model.rotation.y !== 0 || model.rotation.z !== 0) {
      result += `rotation = ${model.rotation.x} ${model.rotation.y} ${model.rotation.z}\r\n`
    }

    // Add the position (in world scale)
    if (model.position.x !== 0 || model.position.y !== 0 || model.position.z !== 0) {
      result += `position = ${model.position.x} ${model.position.y} ${model.position.z}\r\n`
    }

    if (model.origin) result += `origin = ${model.origin}\r\n`
    if (model.flatten) result += `flatten = ${model.flatten}\r\n`
    if (model.clamp) result += `clamp = ${model.clamp}\r\n`
    if (model.skip) result += `skip = ${model.skip}\r\n`
    if (model.tile) result += `tile = ${model.tile}\r\n`

    if (model.ao) result += `ao =${model.ao.color.toString() !== '#000' ? ' ' + model.ao.color : ''} ${model.ao.maxDistance} ${model.ao.strength}${model.ao.angle !== 70 ? ' ' + model.ao.angle : ''}\r\n`
    if (model.asSides) result += `aosides = ${model.aoSides}\r\n`
    if (model.asSamples) result += `aosamples = ${model.aoSamples}\r\n`

    if (model.wireframe) result += 'wireframe = true\r\n'

    if (!model.simplify) result += 'simplify = false\r\n'

    if (model.data) result += `data = ${this._serializeVertexData(model.data)}\r\n`

    if (model.shell) result += `shell = ${this._getShell(model.shell)}\r\n`

    // Add the materials and colors to the result
    result += this._serializeMaterials(model)

    // Add the voxels to the result
    if (!compressed || repeat !== 1) { result += this._serializeVoxels(model, repeat, voxelWidth) } else { result += this._serializeVoxelsRLE(model, 100) }

    return result
  }

  static _serializeVertexData (data) {
    let result = null
    if (data && data.length > 0) {
      result = ''
      for (let d = 0; d < data.length; d++) {
        result += data[d].name + ' '
        for (let v = 0; v < data[d].values.length; v++) {
          result += data[d].values[v] + ' '
        }
      }
    }
    return result
  }

  /**
   * Serialize the textures of the model.
   * @param model The model data, including the textures.
   */
  static _serializeTextures (model) {
    let result = ''
    let newLine = ''
    Object.getOwnPropertyNames(model.textures).forEach(function (textureName) {
      const texture = model.textures[textureName]

      const settings = []
      settings.push(`id = ${texture.id}`)
      if (texture.cube) { settings.push('cube = true') }
      settings.push(`image = ${texture.image}`)

      result += `texture ${settings.join(', ')}\r\n`
      newLine = '\r\n'
    })

    result += newLine

    return result
  }

  /**
   * Serialize the lights of the model.
   * @param model The model data, including the lights.
   */
  static _serializeLights (model) {
    let result = ''
    let newLine = ''
    model.lights.forEach(function (light) {
      const settings = []
      let colorAndStrength = `${light.color}`
      if (light.strength !== 1) { colorAndStrength += ` ${light.strength}` }
      settings.push(`color = ${colorAndStrength}`)
      if (light.direction) settings.push(`direction = ${light.direction.x} ${light.direction.y} ${light.direction.z}`)
      if (light.position) settings.push(`position = ${light.position.x} ${light.position.y} ${light.position.z}`)
      if (light.distance) settings.push(`distance = ${light.distance}`)
      if (light.size) {
        settings.push(`size = ${light.size}`)
        if (light.detail !== 1) settings.push(`detail = ${light.detail}`)
      }

      result += `light ${settings.join(', ')}\r\n`
      newLine = '\r\n'
    })

    result += newLine

    return result
  }

  /**
   * Serialize the materials of the model.
   * @param model The model data, including the materials.
   */
  static _serializeMaterials (model) {
    let result = ''
    model.materials.forEach(function (material) {
      if (material.colors.length === 0) { return }

      const settings = []

      if (material.type !== MATSTANDARD) settings.push(`type = ${material.type}`)
      if (material.lighting !== FLAT) settings.push(`lighting = ${material.lighting}`)
      if (material.wireframe) settings.push('wireframe = true')
      if (material.roughness !== 1.0) settings.push(`roughness = ${material.roughness}`)
      if (material.metalness !== 0.0) settings.push(`metalness = ${material.metalness}`)
      if (material.fade) settings.push('fade = true')
      if (material.simplify !== null && material.simplify !== model.simplify) settings.push(`simplify = ${material.simplify}`)
      if (material.opacity !== 1.0) settings.push(`opacity = ${material.opacity}`)
      if (material.transparent) settings.push('transparent = true')
      if (material.refractionRatio !== 0.9) settings.push(`refractionRatio = ${material.refractionRatio}`)
      if (material.emissive) settings.push(`emissive = ${material.emissive.color} ${material.emissive.intensity}`)
      if (!material.fog) settings.push('fog = false')
      if (material.side !== FRONT) settings.push(`side = ${material.side}`)

      if (material.deform) settings.push(`deform = ${material.deform.count} ${material.deform.strength}${material.deform.damping !== 1 ? ' ' + material.deform.damping : ''}`)
      if (material.warp) settings.push(`warp = ${material.warp.amplitude} ${material.warp.frequency}`)
      if (material.scatter) settings.push(`scatter = ${material.scatter}`)

      if (material.ao) settings.push(`ao =${material.ao.color !== '#000' ? ' ' + material.ao.color : ''} ${material.ao.maxDistance} ${material.ao.strength}${material.ao.angle !== 70 ? ' ' + material.ao.angle : ''}`)
      if (model.lights.length > 0 && !material.lights) settings.push('lights = false')

      if (material.flatten) settings.push(`flatten = ${material.flatten}`)
      if (material.clamp) settings.push(`clamp = ${material.clamp}`)
      if (material.skip) settings.push(`skip = ${material.skip}`)

      if (material.map) settings.push(`map = ${material.map.id}`)
      if (material.normalMap) settings.push(`normalmap = ${material.normalMap.id}`)
      if (material.roughnessMap) settings.push(`roughnessmap = ${material.roughnessMap.id}`)
      if (material.metalnessMap) settings.push(`metalnessmap = ${material.metalnessMap.id}`)
      if (material.emissiveMap) settings.push(`emissivemap = ${material.emissiveMap.id}`)
      if (material.matcap) settings.push(`matcap = ${material.matcap.id}`)

      if (material.reflectionMap) settings.push(`reflectionmap = ${material.reflectionMap.id}`)
      if (material.refractionMap) settings.push(`refractionmap = ${material.refractionMap.id}`)

      if (material.mapTransform.uscale !== -1 || material.mapTransform.vscale !== -1) {
        let transform = 'maptransform ='
        transform += ` ${material.mapTransform.uscale} ${material.mapTransform.vscale}`
        if (material.mapTransform.uoffset !== 0 || material.mapTransform.voffset !== 0 || material.mapTransform.rotation !== 0) {
          transform += ` ${material.mapTransform.uoffset} ${material.mapTransform.voffset}`
          if (material.mapTransform.rotation !== 0) { transform += ` ${material.mapTransform.rotation}` }
        }
        settings.push(transform)
      }

      if (material.data) settings.push(`data = ${this._serializeVertexData(material.data)}`)

      if (material.shell) settings.push(`shell = ${this._getShell(material.shell)}`)

      result += 'material ' + settings.join(', ') + '\r\n'
      result += '  colors ='
      material.colors.forEach(function (color) {
        result += ` ${color.id}${color.exId == null ? '' : '(' + color.exId + ')'}:${color}`
      })

      result += '\r\n'
    }, this)

    return result
  }

  /**
   * Calculate the color Id, after sorting the colors on usage.
   * This ensures often used colors are encoded as one character A-Z.
   * If there are more then 26 colors used the other colors are Aa, Ab, ... Ba, Bb, etc. or even Aaa, Aab, etc.
   * @param model The sorted index of the color.
   */
  static _colorIdForIndex (index) {
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let id = ''
    do {
      const mod = index % 26
      id = chars[mod] + id.toLowerCase()
      index = (index - mod) / 26
      if (index < 26) { chars = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ' }
    } while (index > 0)
    return id
  }

  /**
   * Create shell string to write
   * @param shell array of shells
   */
  static _getShell (shell) {
    if (shell.length === 0) { return 'none' }

    let result = ''
    for (let sh = 0; sh < shell.length; sh++) {
      result += `${shell[sh].colorId} ${shell[sh].distance} `
    }
    return result.trim()
  }

  /**
   * Serialize the voxels without runlength encoding.
   * This results in a recognizable manualy editable syntax
   * @param model The model data
   */
  static _serializeVoxels (model, repeat, voxelWidth) {
    const emptyVoxel = '-' + ' '.repeat(Math.max(voxelWidth - 1))
    const gutter = ' '.repeat(voxelWidth)
    let result = 'voxels\r\n'

    const voxels = model.voxels
    for (let z = voxels.minZ; z <= voxels.maxZ; z++) {
      for (let zr = 0; zr < repeat; zr++) {
        for (let y = voxels.minY; y <= voxels.maxY; y++) {
          for (let yr = 0; yr < repeat; yr++) {
            for (let x = voxels.minX; x <= voxels.maxX; x++) {
              const voxel = voxels.getVoxel(x, y, z)
              for (let xr = 0; xr < repeat; xr++) {
                if (voxel) {
                  result += voxel.color.id
                  let l = voxel.color.id.length
                  while (l++ < voxelWidth) { result += ' ' }
                } else { result += emptyVoxel }
              }
            }
            result += gutter
          }
        }
        result += '\r\n'
      }
    }

    return result
  }

  /**
   * Serialize the voxels with runlength encoding.
   * Recognizing repeated patterns only in the compression window size
   * @param model The model data.
   * @param compressionWindow Typical values are from 10 to 100.
   */
  static _serializeVoxelsRLE (model, compressionWindow) {
    const queue = []
    let count = 0
    let lastColor

    // Loop over the model, RLE-ing subsequent same colors
    model.voxels.forEachInBoundary(function (voxel) {
      const color = voxel ? voxel.color : null
      if (color === lastColor) {
        count++
      } else {
        // Add this chunk to the RLE queue
        this._addRleChunk(queue, lastColor, count, compressionWindow)
        lastColor = color
        count = 1
      }
    }, this)

    // Add the last chunk to the RLE queue
    this._addRleChunk(queue, lastColor, count, compressionWindow)

    // Create the final result string
    let result = ''
    for (const item of queue) {
      result += this._rleToString(item)
    }

    return 'voxels\r\n' + result + '\r\n' // .match(/.{1,100}/g).join('\r\n') + '\r\n';
  }

  /**
   * Add a chunk (repeat count + color ID, e.g. 13A, 24Aa or 35-) the RLE queue.
   * @param queue The RLE queue.
   * @param color The color to add.
   * @param count The number of times this color is repeated over the voxels.
   * @param compressionWindow Typical values are from 10 to 100.
   */
  static _addRleChunk (queue, color, count, compressionWindow) {
    if (count === 0) { return }

    // Add the chunk to the RLE queue
    let chunk = count > 1 ? count.toString() : ''
    chunk += color ? color.id : '-'
    queue.push([chunk, 1, chunk])

    // Check for repeating patterns of length 1 to the compression window
    for (let k = Math.max(0, queue.length - compressionWindow * 2); k <= queue.length - 2; k++) {
      const item = queue[k][0]

      // First cherk if there is a repeating pattern
      for (let j = 1; j < compressionWindow; j++) {
        if (k + 2 * j > queue.length) { break }
        let repeating = true
        for (let i = 0; i <= j - 1; i++) {
          repeating = queue[k + i][2] === queue[k + i + j][2]
          if (!repeating) break
        }
        if (repeating) {
          // Combine the repeating pattern into a sub array and remove the two occurences
          const arr = queue.splice(k, j)
          queue.splice(k, j - 1)
          queue[k] = [arr, 2, null]
          queue[k][2] = JSON.stringify(queue[k]) // Update for easy string comparison
          k = queue.length
          break
        }
      }

      if (Array.isArray(item) && queue.length > k + item.length) {
        // This was already a repeating pattern, check if it repeats again
        const array = item
        let repeating = true
        for (let i = 0; i < array.length; i++) {
          repeating = array[i][2] === queue[k + 1 + i][2]
          if (!repeating) break
        }
        if (repeating) {
          // Eemove the extra pattern and increase the repeat count
          queue.splice(k + 1, array.length)
          queue[k][1]++
          queue[k][2] = null
          queue[k][2] = JSON.stringify(queue[k]) // Update for easy string comparison
          k = queue.length
        }
      }
    }
  }

  /**
   * Converts one (recursive RLE) chunk to a string.
   * @param chunk the entire RLE queue to start then recursivly the nested chunks.
   */
  static _rleToString (chunk) {
    let result = chunk[1] === 1 ? '' : chunk[1].toString()
    const value = chunk[0]
    if (Array.isArray(value)) {
      result += '('
      for (const sub of value) {
        result += this._rleToString(sub)
      }
      result += ')'
    } else {
      result += value
    }

    return result
  }
}

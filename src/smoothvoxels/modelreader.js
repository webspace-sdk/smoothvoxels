import Model from './model'
import Color from './color'
import Light from './light'
import BoundingBox from './boundingbox'
import Voxels, { shiftForSize } from './voxels'

import { MATSTANDARD, FLAT, QUAD, SMOOTH, BOTH, MATBASIC, FRONT, BOUNDS, MODEL } from './constants.js'

function voxBGRForHex (hex) {
  hex = hex.trim().toUpperCase()

  if (hex.match(/^#([0-9a-fA-F]{3}|#?[0-9a-fA-F]{6})$/)) {
    hex = hex.replace('#', '')

    if (hex.length === 3) {
      hex = hex[2] + hex[2] + hex[1] + hex[1] + hex[0] + hex[0]
    } else {
      hex = hex[4] + hex[5] + hex[2] + hex[3] + hex[0] + hex[1]
    }

    return parseInt(hex, 16)
  }

  return 0
}

const PARSE_REGEX = {
  linecontinuation: /_\s*[\r\n]/gm,
  modelparts: new RegExp(/\s*(\/\/(.*?)\r?\n)/.source + '|' + // Comments
                      /\s*(texture|light|model|material|voxels)\s+/.source + '|' + // SVOX Blocks
                      /\s*([^=,\r\n]+=\s*data:image.*?base64,.*$)\s*/.source + '|' + // Name = data:image/...;base64,iVBORw...
                      /\s*([^=,\r\n]+=[^\r\n=;,/]+)\s*/.source + '|' + // Name = Value
                      /\s*([A-Za-z ()\d -]+)\s*/.source, // Voxel matrix
  'gm')
}

const MANDATORY_MODEL_FIELDS = ['size', 'materials', 'textures', 'lights', 'voxels']
const OPTIONAL_MODEL_FIELDS = ['name', 'shape', 'scale', 'rotation', 'position', 'simplify', 'origin', 'autoresize', 'resize',
  'flatten', 'clamp', 'skip', 'tile', 'ao', 'aosides', 'aosamples', 'shell', 'wireframe', 'data']

const MANDATORY_LIGHT_FIELDS = ['color']
const OPTIONAL_LIGHT_FIELDS = ['direction', 'position', 'distance', 'size', 'detail']

const MANDATORY_TEXTURE_FIELDS = ['id', 'image']
const OPTIONAL_TEXTURE_FIELDS = ['cube']

const MANDATORY_MATERIAL_FIELDS = ['colors']
const OPTIONAL_MATERIAL_FIELDS = ['type', 'lighting', 'fade', 'simplify', 'roughness', 'metalness', 'emissive', 'fog', 'opacity', 'alphatest', 'transparent', 'refractionratio',
  'deform', 'warp', 'scatter', 'flatten', 'clamp', 'skip', 'ao', 'lights', 'wireframe', 'side', 'shell',
  'map', 'normalmap', 'roughnessmap', 'metalnessmap', 'emissivemap', 'matcap', 'reflectionmap', 'refractionmap', 'maptransform', 'data']

export default class ModelReader {
  /**
     * Read the model from a string.
     * @param {any} modelString The string containing the model.
     * @returns {Model} The model.
     */
  static readFromString (modelString) {
    const modelData = this._parse(modelString)
    this._validateModel(modelData)
    return this._createModel(modelData)
  }

  /**
     * Parse the model string into a modelData object which can be converted into a model
     * @param {string} modelString The string to be parsed
     * @returns {object} A simple object with the model data (not yet the actual model).
     */
  static _parse (modelString) {
    const modelData = { lights: [], textures: [], materials: [] }
    let parent = modelData
    let voxelString = null

    // Split the lines so every line contains:
    // - A block name (i.e. "texture"/"light"/"model"/"material"/"voxels")
    // - name = value (e.g. "emissive = #FFF 1")
    // - A line from the voxel matrix
    // while removing all comments
    const lines = Array.from(modelString.replaceAll(PARSE_REGEX.linecontinuation, ' ').matchAll(PARSE_REGEX.modelparts), m => m[0].trim())

    // Now convert the lines to a javascript object
    lines.filter(l => l).forEach(function (line) {
      if (line.startsWith('//')) {
        // Skip comments
      } else if (line === 'texture') {
        // New texture start
        parent = { id: '<no-name>', cube: false }
        modelData.textures.push(parent)
      } else if (line === 'light') {
        // New light start
        parent = { color: '#FFF' }
        modelData.lights.push(parent)
      } else if (line === 'model') {
        // Model settings
        parent = modelData
      } else if (line === 'material') {
        // New material start
        parent = {}
        modelData.materials.push(parent)
      } else if (line === 'voxels') {
        // Voxels belong to the model
        parent = modelData
        voxelString = ''
      } else if (voxelString !== null) {
        // We are in the voxel matrix, so just add the line to the voxel string
        voxelString += line.replace(/\s/g, '')
      } else {
        // Handle one property assignment
        const equalIndex = line.indexOf('=')
        if (equalIndex === -1) {
          throw new Error(`SyntaxError: Invalid definition '${line}'.`)
        }

        // Don't use split because image data contains '='
        const name = line.substring(0, equalIndex).trim().toLowerCase()
        const value = line.substring(equalIndex + 1).trim()

        // Set the property
        parent[name] = value
      }
    }, this)

    modelData.voxels = voxelString

    return modelData
  }

  /**
     * Create the actual model from the parsed model data.
     * @param {object} modelData The simple object from the parsed model string.
     * @returns {Model} The model class with its properties, materials and voxels.
     */
  static _createModel (modelData) {
    const model = new Model()

    model.size = this._parseXYZInt('size', modelData.size, null, true)
    model.scale = this._parseXYZFloat('scale', modelData.scale, '1', true)
    model.rotation = this._parseXYZFloat('rotation', modelData.rotation, '0 0 0', false)
    model.position = this._parseXYZFloat('position', modelData.position, '0 0 0', false)
    model.simplify = modelData.simplify !== 'false'

    if (modelData.resize === BOUNDS) { model.resize = BOUNDS } else if (modelData.resize === MODEL) { model.resize = MODEL } else if (modelData.resize) { model.resize = null } else if (modelData.autoresize === 'true') {
      // autoResize is deprecated, translate to resize = model
      model.resize = MODEL
    }

    model.shape = modelData.shape

    // Set the global wireframe override
    model.wireframe = modelData.wireframe === 'true' || false

    // Set the planar values
    model.origin = modelData.origin || 'x y z'
    model.flatten = modelData.flatten
    model.clamp = modelData.clamp
    model.skip = modelData.skip
    model.tile = modelData.tile

    model.setAo(this._parseAo(modelData.ao))
    model.aoSides = modelData.aosides
    model.aoSamples = parseInt(modelData.aosamples || 50, 10)

    model.data = this._parseVertexData(modelData.data, 'model')

    model.shell = this._parseShell(modelData.shell)

    if (modelData.lights.some((light) => light.size)) {
      // There are visible lights, so create a basic material for them
      model.materials.createMaterial(MATBASIC, FLAT, 1, 0,
        false, false, 1, 0, false, 1, false, FRONT,
        '#FFF', 0, false,
        null, null, null, null, null, null,
        null, null,
        -1, -1, 0, 0, 0)
    }

    for (const lightData of modelData.lights) {
      this._createLight(model, lightData)
    }

    for (const textureData of modelData.textures) {
      this._createTexture(model, textureData)
    }

    const colorIdToVoxBgr = new Map()
    const colorIdToMaterialIndex = new Map()

    for (const materialData of modelData.materials) {
      this._createMaterial(model, materialData, colorIdToVoxBgr, colorIdToMaterialIndex)
    }

    // Find the color (& material) for the shell(s)
    // this._resolveShellColors(model.shell, model)
    // model.materials.forEach(function (material) {
    //   this._resolveShellColors(material.shell, model)
    // }, this)

    // Create all voxels
    this._createVoxels(model, modelData.voxels, colorIdToVoxBgr, colorIdToMaterialIndex)

    return model
  }

  /**
     * Create one light from its parsed data
     * @param {object} lightData The simple object from the parsed model string.
     */
  static _createLight (model, lightData) {
    if (!lightData.color) {
      lightData.color = '#FFF 1'
    }
    if (!lightData.color.startsWith('#')) {
      lightData.color = '#FFF ' + lightData.color
    }
    lightData.strength = parseFloat(lightData.color.split(' ')[1] || 1.0)
    lightData.color = Color.fromHex(lightData.color.split(' ')[0])
    lightData.direction = this._parseXYZFloat('direction', lightData.direction, null, false)
    lightData.position = this._parseXYZFloat('position', lightData.position, null, false)
    lightData.distance = parseFloat(lightData.distance || 0)
    lightData.size = Math.max(0, parseFloat(lightData.size || 0.0))
    lightData.detail = Math.min(3, Math.max(0, parseInt(lightData.detail || 1, 10)))
    const light = new Light(lightData.color, lightData.strength,
      lightData.direction, lightData.position, lightData.distance,
      lightData.size, lightData.detail)

    model.lights.push(light)
  }

  /**
     * Create one texture from its parsed data
     * @param {object} textureData The simple object from the parsed model string.
     */
  static _createTexture (model, textureData) {
    textureData.cube = textureData.cube === 'true' || false
    model.textures[textureData.id] = textureData
  }

  /**
     * Create one material from its parsed data
     * @param {object} materialData The simple object from the parsed model string.
     */
  static _createMaterial (model, materialData, colorIdToVoxBgr, colorIdToMaterialIndex) {
    // Cleanup data
    let lighting = FLAT
    if (materialData.lighting === QUAD) lighting = QUAD
    if (materialData.lighting === SMOOTH) lighting = SMOOTH
    if (materialData.lighting === BOTH) lighting = BOTH

    if (!materialData.emissive) {
      if (materialData.emissivemap) { materialData.emissive = '#FFF 1' } else { materialData.emissive = '#000 0' }
    }
    if (!materialData.emissive.startsWith('#')) {
      materialData.emissive = '#FFF ' + materialData.emissive
    }
    materialData.emissiveColor = materialData.emissive.split(' ')[0]
    materialData.emissiveIntensity = materialData.emissive.split(' ')[1] || 1.0

    if (materialData.ao && !materialData.ao.startsWith('#')) {
      materialData.ao = '#000 ' + materialData.ao
    }
    materialData.maptransform = materialData.maptransform || ''

    let simplify = null
    if (model.simplify && materialData.simplify === 'false') { simplify = false }
    if (!model.simplify && materialData.simplify === 'true') { simplify = true }

    // Create the material with all base attributes to recongnize reusable materials
    const material = model.materials.createMaterial(
      materialData.type || MATSTANDARD,
      lighting,
      parseFloat(materialData.roughness || (materialData.roughnessmap ? 1.0 : 1.0)),
      parseFloat(materialData.metalness || (materialData.metalnessmap ? 1.0 : 0.0)),
      materialData.fade === 'true' || false,
      simplify,
      parseFloat(materialData.opacity || 1.0),
      parseFloat(materialData.alphatest || 0),
      materialData.transparent === 'true' || false,
      parseFloat(materialData.refractionratio || 0.9),
      materialData.wireframe === 'true' || false,
      materialData.side,
      materialData.emissiveColor,
      materialData.emissiveIntensity,
      materialData.fog !== 'false',
      materialData.map ? model.textures[materialData.map] : null,
      materialData.normalmap ? model.textures[materialData.normalmap] : null,
      materialData.roughnessmap ? model.textures[materialData.roughnessmap] : null,
      materialData.metalnessmap ? model.textures[materialData.metalnessmap] : null,
      materialData.emissivemap ? model.textures[materialData.emissivemap] : null,
      materialData.matcap ? model.textures[materialData.matcap] : null,
      materialData.reflectionmap ? model.textures[materialData.reflectionmap] : null,
      materialData.refractionmap ? model.textures[materialData.refractionmap] : null,
      parseFloat(materialData.maptransform.split(' ')[0] || -1.0), // uscale (in voxels,  -1 = cover model)
      parseFloat(materialData.maptransform.split(' ')[1] || -1.0), // vscale (in voxels,  -1 = cover model)
      parseFloat(materialData.maptransform.split(' ')[2] || 0.0), // uoffset
      parseFloat(materialData.maptransform.split(' ')[3] || 0.0), // voffset
      parseFloat(materialData.maptransform.split(' ')[4] || 0.0) // rotation in degrees
    )

    const materialIndex = model.materials.materials.indexOf(material)

    if (materialData.deform) {
      // Parse deform count, strength and damping
      material.setDeform(parseFloat(materialData.deform.split(' ')[0]), // Count
        parseFloat(materialData.deform.split(' ')[1] || 1.0), // Strength
        parseFloat(materialData.deform.split(' ')[2] || 1.0)) // Damping
    }

    if (materialData.warp) {
      // Parse amplitude and frequency
      material.setWarp(parseFloat(materialData.warp.split(' ')[0]),
        parseFloat(materialData.warp.split(' ')[1] || 1.0))
    }

    if (materialData.scatter) { material.scatter = parseFloat(materialData.scatter) }

    // Set the planar values
    material.flatten = materialData.flatten
    material.clamp = materialData.clamp
    material.skip = materialData.skip

    material.setAo(this._parseAo(materialData.ao))
    material.shell = this._parseShell(materialData.shell)

    // Set whether lights affect this material
    material.lights = materialData.lights !== 'false'

    material.data = this._parseVertexData(materialData.data, 'material')
    this._compareVertexData(model.data, material.data)

    // Cleanup the colors string (remove all extra spaces)
    const CLEANCOLORID = /\s*\(\s*(\d+)\s*\)\s*/g
    const CLEANDEFINITION = /([A-Z][a-z]*)\s*(\(\d+\))?[:]\s*(#[a-fA-F0-9]*)\s*/g
    materialData.colors = materialData.colors.replace(CLEANCOLORID, '($1)')
    materialData.colors = materialData.colors.replace(CLEANDEFINITION, '$1$2:$3 ')

    const colors = materialData.colors.split(' ').filter(x => x)

    colors.forEach(function (colorData) {
      let colorId = colorData.split(':')[0]

      // Color ex id is used for VOX import, needs to be dealt with later
      // let colorExId = null
      if (colorId.includes('(')) {
      // colorExId = Number(colorId.split('(')[1].replace(')', ''))
        colorId = colorId.split('(')[0]
      }

      const color = colorData.split(':')[1]

      if (!colorIdToVoxBgr.has(colorId)) {
        const bgr = voxBGRForHex(color)
        if (!/^[A-Z][a-z]*$/.test(colorId)) {
          throw new Error(`SyntaxError: Invalid color ID '${colorId}'`)
        }
        colorIdToVoxBgr.set(colorId, bgr)
        colorIdToMaterialIndex.set(colorId, materialIndex)
      } else {
        throw new Error(`SyntaxError: Duplicate ID '${colorId}'`)
      }
    }, this)
  }

  /**
     * Creates all voxels in the model from the (RLE) Voxel Matrix
     * @param {Model} model The model in which the voxels will be set
     * @param {string} voxels The (RLE) voxel string
     */
  static _createVoxels (model, voxelData, colorIdToVoxBgr, colorIdToMaterialIndex) {
    let errorMaterial = null

    // Split the voxel string in numbers, (repeated) single letters or _ , Longer color Id's or ( and )
    let chunks = []
    if (voxelData.matchAll) { chunks = voxelData.matchAll(/[0-9]+|[A-Z][a-z]*|-+|[()]/g) } else {
      // In case this browser does not support matchAll, DIY match all
      const regex = /[0-9]+|[A-Z][a-z]*|-+|[()]/g
      let chunk
      while ((chunk = regex.exec(voxelData)) !== null) {
        chunks.push(chunk)
      }
      chunks = chunks[Symbol.iterator]()
    }

    const rleArray = this._unpackRle(chunks)

    // Check the voxel matrix size against the specified size
    const totalSize = model.size.x * model.size.y * model.size.z
    let voxelLength = 0

    const numberOfColors = colorIdToVoxBgr.size

    // Palette bits is 1, 2, 4, or 8, and represents the number of bits
    // that are needed to store a palette index given the color count, leaving one extra value for empty
    let paletteBits = 1
    if (numberOfColors >= 2) { paletteBits = 2 }
    if (numberOfColors >= 4) { paletteBits = 4 }
    if (numberOfColors >= 16) { paletteBits = 8 }

    const voxels = model.voxels = new Voxels([model.size.x, model.size.y, model.size.z], paletteBits)

    for (let i = 0; i < rleArray.length; i++) {
      voxelLength += rleArray[i][1]
    }
    if (voxelLength !== totalSize) {
      throw new Error(`SyntaxError: The specified size is ${model.size.x} x ${model.size.y} x ${model.size.z} (= ${totalSize} voxels) but the voxel matrix contains ${voxelLength} voxels.`)
    }

    // Prepare the voxel creation context
    const context = {
      minx: 0,
      miny: 0,
      minz: 0,
      maxx: model.size.x - 1,
      maxy: model.size.y - 1,
      maxz: model.size.z - 1,
      x: 0,
      y: 0,
      z: 0
    }

    model.bounds = new BoundingBox()

    let materialIndex = null
    let materialBounds = null
    const modelBounds = model.bounds
    const size = model.size
    const shiftX = shiftForSize(size.x)
    const shiftY = shiftForSize(size.y)
    const shiftZ = shiftForSize(size.z)

    const materials = model.materials.materials

    // Count all the colors to try to estimate the palette bits for the voxels
    // Create all chunks, using the context as cursor
    for (let i = 0, l = rleArray.length; i < l; i++) {
      let colorId = null
      const rleEntry = rleArray[i]
      const firstChar = rleEntry[0]

      if (firstChar !== '-') {
        colorId = firstChar

        if (!colorIdToVoxBgr.has(colorId)) {
          // Oops, this is not a known color, create a purple 'error' color
          if (errorMaterial === null) { errorMaterial = model.materials.createMaterial(MATSTANDARD, FLAT, 0.5, 0.0, false, 1.0, false) }
          materialIndex = model.materials.materials.indexOf(errorMaterial)
          colorIdToVoxBgr.set(firstChar, voxBGRForHex('#FF00FF'))
          colorIdToMaterialIndex.set(firstChar, materialIndex)
        }

        materialIndex = colorIdToMaterialIndex.get(firstChar)

        const material = materials[materialIndex]
        materialBounds = material.bounds
      }

      const count = rleEntry[1]

      if (colorIdToVoxBgr.has(colorId)) {
        const voxBgr = colorIdToVoxBgr.get(colorId)
        this._setVoxels(modelBounds, materialBounds, materialIndex, shiftX, shiftY, shiftZ, voxBgr, count, context, voxels)
      } else {
        this._advanceContext(count, shiftX, shiftY, shiftZ, context)
      }
    }
  }

  /**
     * Parses a 'color distance strength angle' string to an ao object
     * @param {string} aoData The ao data, or undefined
     * returns {object} { color, maxDistance, strength, angle } or undefined
     */
  static _parseAo (oaData) {
    let ao
    if (oaData) {
      if (!oaData.startsWith('#')) {
        // Default to black color
        oaData = '#000 ' + oaData
      }

      const color = Color.fromHex(oaData.split(' ')[0])
      const maxDistance = Math.abs(parseFloat(oaData.split(' ')[1] || 1.0))
      const strength = parseFloat(oaData.split(' ')[2] || 1.0)
      let angle = parseFloat(oaData.split(' ')[3] || 70.0)
      angle = Math.max(0, Math.min(90, Math.round(angle)))

      ao = { color, maxDistance, strength, angle }
    }
    return ao
  }

  /**
     * Parses a 'colorId distance'+ string to a shell object, e.g. "P 0.25 Q 0.5"
     * @param {string} shellData The shell data, or undefined
     * returns {array} [ { colorID, distance }, ... ] or undefined
     * NOTE: Since the color may be defined in a material which is parsed later,
     *       we'll resolve the colorID later to aad the color.
     */
  static _parseShell (shellData) {
    let shell
    let error = false
    if (shellData) {
      shell = []
      if (shellData !== 'none') {
        const parts = shellData.split(/\s+/)
        if (parts.length < 2 || parts.length % 2 !== 0) {
          error = true
        } else {
          for (let s = 0; s < parts.length / 2; s++) {
            const colorId = parts[s * 2 + 0]
            const distance = parts[s * 2 + 1]
            if (!/^[A-Z][a-z]*$/.test(colorId) || !/^([-+]?[0-9]*\.?[0-9]+)*$/.test(distance)) {
              error = true
              break
            } else { shell.push({ colorId: parts[s * 2], distance: parts[s * 2 + 1] }) }
          }
        }
      }
    }

    if (error) {
      throw new Error(`SyntaxError: shell '${shellData}' must be 'none' or one or more color ID's and distances, e.g. P 0.2 Q 0.4`)
    } else if (shell) {
      shell = shell.sort(function (a, b) {
        return a.distance - b.distance
      })
    }

    return shell
  }

  /**
     * Resolves the color ID of shell to a specific material
     * @param {object} shell The shell array containing objects with containing colorId and distance
     * @param {object} model The shell object containing colorId and distance
     */
  static _resolveShellColors (shell, model) {
    if (!shell || shell.length === 0) { return }

    shell.forEach(function (sh) {
      sh.color = model.colors[sh.colorId]
      if (!sh.color) {
        throw new Error(`SyntaxError: shell color ID '${sh.colorId}' is not a known color`)
      }
    }, this)
  }

  /**
     * Parses vertex data in the model or a material
     * @param {object} modelData The vertex data string
     * @param {string} modelType 'model' or 'material' depending on what is parsed to get a better error on failure
     * @returns {object} the vertex data array e.g. [ {name:"data", values:[0.3,0.6,0.9]}, {name:"size",values:[0.5}]
     * @throws Syntax error in case the vertex data is not correct (i.e. it must be [<name> <float>+]+ )
     */
  static _parseVertexData (vertexData, modelType) {
    if (vertexData) {
      const modelData = []
      const parts = vertexData.split(/\s+/)
      let data = null
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (isNaN(part)) {
          data = { name: part, values: [] }
          modelData.push(data)
        } else if (!data) {
          break
        } else {
          data.values.push(parseFloat(part))
        }
      }

      let error = (modelData.length === 0)
      for (let i = 0; i < modelData.length; i++) {
        error = error || (modelData[i].values.length === 0) || (modelData[i].values.length >= 4)
      }
      if (error) {
        throw new Error(`SyntaxError: The data property '${modelData.data}' of the ${modelType} should consist of one or more names, each followed by 1 to 4 float (default) values.`)
      }

      return modelData
    }
  }

  /**
     * Compares the material vertex data to the model. They must match exactly
     * @param {object} modelData The vertex data of the model
     * @param {object} materialData The vertex data of the material
     * @returns void
     * @throws Syntax error in case the model and material vertex data is different
     */
  static _compareVertexData (modelData, materialData) {
    let error = false
    try {
      if ((modelData || materialData) && materialData) {
        error = materialData && !(modelData)
        error = error || (modelData.length !== materialData.length)
        for (let i = 0; i < modelData.length; i++) {
          error = error || (modelData[i].name !== materialData[i].name)
          error = error || (modelData[i].values.length !== materialData[i].values.length)
        }
      }
    } catch (ex) {
      error = true
    }
    if (error) {
      throw new Error('SyntaxError: The data property of the material should consist of identical names and number of values as the model data property.')
    }
  };

  /**
     * Parses an 'x y z' string into an object with integer x y z values
     * @param {string} name The name of the field
     * @param {string} value The string value of the field
     * @param {string} defaultValue The default value for an optional field
     * @param {boolean} allowUniform When true one value is allowed to fill x, y and z
     * @returns {object} An { x, y, z } object with integers
     */
  static _parseXYZInt (name, value, defaultValue, allowUniform) {
    const xyz = this._parseXYZFloat(name, value, defaultValue, allowUniform)
    return {
      x: Math.trunc(xyz.x),
      y: Math.trunc(xyz.y),
      z: Math.trunc(xyz.z)
    }
  }

  /**
     * Parses an 'x y z' string into an object with float x y z values
     * @param {string} name The name of the field
     * @param {string} value The string value of the field
     * @param {string} defaultValue The default value for an optional field
     * @param {boolean} allowUniform When true one value is allowed to fill x, y and z
     * @returns {object} An { x, y, z } object with floats
     */
  static _parseXYZFloat (name, value, defaultValue, allowUniform) {
    if (!value && defaultValue) { value = defaultValue }

    if (!value) {
      return null
    }

    let xyz = value.split(/[\s/]+/)
    if (xyz.length === 1 && allowUniform) {
      xyz.push(xyz[0])
      xyz.push(xyz[0])
    }

    if (xyz.length !== 3) {
      throw new Error(`SyntaxError: '${name}' must have three values.`)
    }

    xyz = {
      x: parseFloat(xyz[0]),
      y: parseFloat(xyz[1]),
      z: parseFloat(xyz[2])
    }

    if (Number.isNaN(xyz.x) || Number.isNaN(xyz.y) || Number.isNaN(xyz.z)) {
      throw new Error(`SyntaxError: Invalid value '${value}' for ${name}'.`)
    }

    return xyz
  }

  /**
     * Converts the Recursively Run Length Encoded chunks into simple RLE chunks.
     * @param {[][]} chunks An array or RLE chunks (containing Color ID and count or sub chunks and count)
     * @returns {[][]} An array of simple RLE chunks containing arrays with Color ID's and counts.
     */
  static _unpackRle (chunks) {
    const result = []
    let count = 1
    let chunk = chunks.next()
    while (!chunk.done) {
      const value = chunk.value[0]
      if (value[0] >= '0' && value[0] <= '9') {
        count = parseInt(value, 10)
      } else if (value === '(') {
        // Convert the chunk to normal RLE and add it to the result (repeatedly)
        const sub = this._unpackRle(chunks)
        for (let c = 0; c < count; c++) { Array.prototype.push.apply(result, sub) }
        count = 1
      } else if (value === ')') {
        return result
      } else if (value.length > 1 && value[0] >= 'A' && value[0] <= 'Z' && value[1] === value[0]) {
        if (count > 1) {
          result.push([value[0], count])
          result.push([value[0], value.length - 1])
        } else {
          result.push([value[0], value.length])
        }
        count = 1
      } else if (value.length > 1 && value[0] === '-' && value[1] === '-') {
        if (count > 1) {
          result.push(['-', count])
          result.push(['-', value.length - 1])
        } else {
          result.push(['-', value.length])
        }
        count = 1
      } else {
        result.push([value, count])
        count = 1
      }
      chunk = chunks.next()
    }

    return result
  }

  /**
     * Add one or more voxel of the same color to the model in the standard running order (x, y then z).
     * Each invocation automatically advances to the next voxel.
     * @param {Model} model The model to which to add the voxel.
     * @param {Color} color The color to set for this voxel, or null for an empty voxel.
     * @param {int} count The number of voxels to set.
     * @param {object} context The context which holds the current 'cursor' in the voxel array.
     */
  static _setVoxels (modelBounds, materialBounds, materialIndex, shiftX, shiftY, shiftZ, voxBgr, count, context, voxels) {
    let { x: cx, y: cy, z: cz, maxx, maxy, minx, miny } = context

    cx -= shiftX
    cy -= shiftY
    cz -= shiftZ

    minx -= shiftX
    miny -= shiftY
    maxx -= shiftX
    maxy -= shiftY

    const voxColor = (voxBgr | (materialIndex << 24)) >>> 0

    while (count-- > 0) {
      // Convert the color to a 32 bit integer
      modelBounds.set(cx, cy, cz)
      materialBounds.set(cx, cy, cz)
      voxels.setColorAt(cx, cy, cz, voxColor)

      cx++

      if (cx > maxx) {
        cx = minx
        cy++
      }

      if (cy > maxy) {
        cy = miny
        cz++
      }
    }

    context.x = cx + shiftX
    context.y = cy + shiftY
    context.z = cz + shiftZ
  }

  static _advanceContext (count, shiftX, shiftY, shiftZ, context) {
    let { x: cx, y: cy, z: cz, maxx, maxy, minx, miny } = context

    cx -= shiftX
    cy -= shiftY
    cz -= shiftZ

    minx -= shiftX
    miny -= shiftY
    maxx -= shiftX
    maxy -= shiftY

    while (count-- > 0) {
      cx++
      if (cx > maxx) {
        cx = minx
        cy++
      }
      if (cy > maxy) {
        cy = miny
        cz++
      }
    }

    context.x = cx + shiftX
    context.y = cy + shiftY
    context.z = cz + shiftZ
  }

  /**
     * Check whether properties are missing or unrecognized from the model data.
     * @param {object} modelData The simple object from the parsed model string.
     */
  static _validateModel (modelData) {
    this._validateProperties(modelData, MANDATORY_MODEL_FIELDS, OPTIONAL_MODEL_FIELDS, 'model')

    for (const lightData of modelData.lights) {
      this._validateLight(lightData)
    }

    for (const textureData of modelData.textures) {
      this._validateTexture(textureData)
    }

    for (const materialData of modelData.materials) {
      this._validateMaterial(materialData)
    }
  }

  /**
     * Check whether properties are missing or unrecognized from the light data.
     * @param {object} lightData The simple object from the parsed model string.
     */
  static _validateLight (lightData) {
    this._validateProperties(lightData, MANDATORY_LIGHT_FIELDS, OPTIONAL_LIGHT_FIELDS, 'light')

    // Extra checks
    if (lightData.direction && lightData.position) {
      throw new Error('SyntaxError: Light cannot have both a direction and a position.')
    }
    if (lightData.direction && lightData.distance) {
      throw new Error('SyntaxError: Light cannot have both a direction and a distance.')
    }
    if (!lightData.position && (lightData.size || lightData.detail)) {
      throw new Error('SyntaxError: Light with no position cannot have size or detail.')
    }
  }

  /**
     * Check whether properties are missing or unrecognized from the texture data.
     * @param {object} textureData The simple object from the parsed model string.
     */
  static _validateTexture (textureData) {
    this._validateProperties(textureData, MANDATORY_TEXTURE_FIELDS, OPTIONAL_TEXTURE_FIELDS, 'texture')
  }

  /**
     * Check whether properties are missing or unrecognized from the material data.
     * @param {object} materialData The simple object from the parsed model string.
     */
  static _validateMaterial (materialData) {
    this._validateProperties(materialData, MANDATORY_MATERIAL_FIELDS, OPTIONAL_MATERIAL_FIELDS, 'material')
  }

  /**
     * Ensure mandatory properties are present and no unknown properties.
     * @param {object} data The simple object from the parsed model string.
     * @param {string[]} mandatory An array of allowed mandatory property names.
     * @param {string[]} optional An array of allowed optional property names.
     * @param {string} objectName The name of the object being checked.
     */
  static _validateProperties (data, mandatory, optional, objectName) {
    // Ensure all mandatory properties are present
    for (const propertyName of mandatory) {
      if (!Object.hasOwn(data, propertyName)) {
        throw new Error('SyntaxError: ' + objectName + ' is missing mandatory property "' + propertyName + '".')
      }
    }

    // Ensure no unknown properties are present
    for (const propertyName in data) {
      if (!mandatory.includes(propertyName) && !optional.includes(propertyName)) {
        throw new Error('SyntaxError: ' + objectName + ' has unrecognized property "' + propertyName + '".')
      }
    }
  }
}

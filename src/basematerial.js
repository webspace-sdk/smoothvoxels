import { MATSTANDARD, MATBASIC, MATPHONG, MATTOON, MATMATCAP, MATNORMAL, MATLAMBERT, FRONT, BACK, DOUBLE } from './constants'
import Color from './color'

export default class BaseMaterial {
  constructor (type, roughness, metalness,
    opacity, alphaTest, transparent, refractionRatio, wireframe, side,
    emissiveColor, emissiveIntensity, fog,
    map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
    reflectionMap, refractionMap,
    uscale, vscale, uoffset, voffset, rotation) {
    type = type || MATSTANDARD

    switch (type) {
      case MATSTANDARD:
      case MATBASIC:
      case MATLAMBERT:
      case MATPHONG:
      case MATTOON:
      case MATMATCAP:
      case MATNORMAL:
        // Type is ok
        break
      default: {
        throw new Error('SyntaxError: Unknown material type: ' + type)
      }
    }
    this.type = type

    if (((map && map.cube) || (normalMap && normalMap.cube) || (roughnessMap && roughnessMap.cube) || (metalnessMap && metalnessMap.cube) || (emissiveMap && emissiveMap.cube)) &&
        !(uscale === -1 && vscale === -1)) {
      throw new Error('SyntaxError: Cube textures can not be combined with maptransform')
    }

    if (reflectionMap && refractionMap) {
      throw new Error('SyntaxError: One material can have a reflectionmap or a refractionmap, but not both')
    }

    this.index = 0

    // Standard material values
    this.roughness = typeof roughness === 'number' ? roughness : 1
    this.metalness = typeof metalness === 'number' ? metalness : 0
    this.opacity = typeof opacity === 'number' ? opacity : 1
    this.alphaTest = typeof alphaTest === 'number' ? alphaTest : 0
    this.transparent = !!transparent
    this.refractionRatio = typeof refractionRatio === 'number' ? refractionRatio : 0.9
    this.wireframe = !!wireframe
    this.side = side || FRONT
    if (![FRONT, BACK, DOUBLE].includes(this.side)) { this.side = FRONT }
    this.setEmissive(emissiveColor, emissiveIntensity)
    this.fog = typeof fog === 'boolean' ? fog : true

    this.map = map
    this.normalMap = normalMap
    this.roughnessMap = roughnessMap
    this.metalnessMap = metalnessMap
    this.emissiveMap = emissiveMap
    this.matcap = matcap
    this.reflectionMap = reflectionMap
    this.refractionMap = refractionMap
    this.mapTransform = {
      uscale: uscale || -1,
      vscale: vscale || -1,
      uoffset: uoffset || 0,
      voffset: voffset || 0,
      rotation: rotation || 0
    }

    this.aoActive = false

    this._colors = []
  }

  get baseId () {
    if (this._baseId === undefined) {
      this._baseId = `${this.type}|${this.roughness}|${this.metalness}|` +
           `${this.opacity}|${this.alphaTest}|${this.transparent ? 1 : 0}|` +
           `${this.refractionRatio}|${this.wireframe ? 1 : 0}|${this.side}|` +
           (this.emissive ? `${this.emissive.color}|${this.emissive.intensity}|` : '||') +
           `${this.fog ? 1 : 0}|` +
           (this.map ? `${this.map.id}|` : '|') +
           (this.normalMap ? `${this.normalMap.id}|` : '|') +
           (this.roughnessMap ? `${this.roughnessMap.id}|` : '|') +
           (this.metalnessMap ? `${this.metalnessMap.id}|` : '|') +
           (this.emissiveMap ? `${this.emissiveMap.id}|` : '|') +
           (this.matcap ? `${this.matcap.id}|` : '|') +
           (this.reflectionMap ? `${this.reflectionMap.id}|` : '|') +
           (this.refractionMap ? `${this.refractionMap.id}|` : '|') +
           `${this.mapTransform.uscale}|${this.mapTransform.vscale}|` +
           `${this.mapTransform.uoffset}|${this.mapTransform.voffset}|` +
           `${this.mapTransform.rotation}`
    }

    return this._baseId
  }

  get isTransparent () {
    return this.transparent || this.opacity < 1.0
  }

  setEmissive (color, intensity) {
    if (color === undefined || color === '#000' || color === '#000000' || !(intensity || 0)) { this._emissive = undefined } else { this._emissive = { color: Color.fromHex(color), intensity } }
  }

  get emissive () {
    return this._emissive
  }

  get colors () {
    return this._colors
  }

  get colorCount () {
    return this._colors.length
  }

  get colorUsageCount () {
    return this._colors.reduce((s, c) => (s + c.count), 0)
  }
}

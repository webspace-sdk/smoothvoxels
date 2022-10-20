import Planar from './planar'
import BoundingBox from './boundingbox'
import Color from './color'

export default class Material {
  constructor (baseMaterial, lighting, fade, simplify, side) {
    this._baseMaterial = baseMaterial

    // lighting, smooth, flat or both
    this.lighting = lighting
    this.fade = !!fade
    this.simplify = simplify !== false

    // Preset the shape modifiers
    this._deform = undefined
    this._warp = undefined
    this._scatter = undefined

    this._flatten = Planar.parse('')
    this._clamp = Planar.parse('')
    this._skip = Planar.parse('')

    this._ao = undefined
    this.lights = true

    this._side = side

    this._colors = []

    this.bounds = new BoundingBox()
  }

  get baseId () {
    return this._baseMaterial.baseId
  }

  get index () {
    return this._baseMaterial.index
  }

  get colors () {
    return this._colors
  }

  get colorCount () {
    return this._baseMaterial.colorCount
  }

  get type () {
    return this._baseMaterial.type
  }

  get roughness () {
    return this._baseMaterial.roughness
  }

  get metalness () {
    return this._baseMaterial.metalness
  }

  get opacity () {
    return this._baseMaterial.opacity
  }

  get alphaTest () {
    return this._baseMaterial.alphaTest
  }

  get transparent () {
    return this._baseMaterial.transparent
  }

  get isTransparent () {
    return this._baseMaterial.isTransparent
  }

  get refractionRatio () {
    return this._baseMaterial.refractionRatio
  }

  get emissive () {
    return this._baseMaterial.emissive
  }

  get side () {
    return this._side
  }

  get fog () {
    // Emissive materials shine through fog (in case fog used as darkness)
    return this._baseMaterial.fog
  }

  get map () {
    return this._baseMaterial.map
  }

  get normalMap () {
    return this._baseMaterial.normalMap
  }

  get roughnessMap () {
    return this._baseMaterial.roughnessMap
  }

  get metalnessMap () {
    return this._baseMaterial.metalnessMap
  }

  get emissiveMap () {
    return this._baseMaterial.emissiveMap
  }

  get matcap () {
    return this._baseMaterial.matcap
  }

  get reflectionMap () {
    return this._baseMaterial.reflectionMap
  }

  get refractionMap () {
    return this._baseMaterial.refractionMap
  }

  get mapTransform () {
    return this._baseMaterial.mapTransform
  }

  setDeform (count, strength, damping) {
    count = Math.max((count === null || count === undefined) ? 1 : count, 0)
    strength = (strength === null || strength === undefined) ? 1.0 : strength
    damping = (damping === null || damping === undefined) ? 1.0 : damping
    if (count > 0 && strength !== 0.0) { this._deform = { count, strength, damping } } else { this._deform = { count: 0, strength: 0, damping: 0 } }
  }

  get deform () {
    return this._deform
  }

  setWarp (amplitude, frequency) {
    amplitude = amplitude === undefined ? 1.0 : Math.abs(amplitude)
    frequency = frequency === undefined ? 1.0 : Math.abs(frequency)
    if (amplitude > 0.001 && frequency > 0.001) { this._warp = { amplitude, frequency } } else { this._warp = undefined }
  }

  get warp () {
    return this._warp
  }

  set scatter (value) {
    if (value === 0.0) { value = undefined }
    this._scatter = Math.abs(value)
  }

  get scatter () {
    return this._scatter
  }

  // Getters and setters for planar handling
  set flatten (flatten) { this._flatten = Planar.parse(flatten) }
  get flatten () { return Planar.toString(this._flatten) }
  set clamp (clamp) { this._clamp = Planar.parse(clamp) }
  get clamp () { return Planar.toString(this._clamp) }
  set skip (skip) { this._skip = Planar.parse(skip) }
  get skip () { return Planar.toString(this._skip) }

  // Set AO as { color, maxDistance, strength, angle }
  setAo (ao) {
    this._ao = ao
  }

  get ao () {
    return this._ao
  }

  set aoSides (sides) { this._aoSides = Planar.parse(sides) }
  get aoSides () { return Planar.toString(this._aoSides) }

  addColorHEX (hex) {
    return this.addColor(Color.fromHex(hex))
  }

  addColorRGB (r, g, b) {
    return this.addColor(Color.fromRgb(r, g, b))
  }

  addColor (color) {
    if (!(color instanceof Color)) { throw new Error("addColor requires a Color object, e.g. material.addColor(Color.fromHex('#FFFFFF'))") }

    color._setMaterial(this)
    this._colors.push(color)
    this._baseMaterial._colors.push(color)
    return color
  }
}

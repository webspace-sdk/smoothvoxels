import { FRONT, BACK, DOUBLE } from './constants'
import BaseMaterial from './basematerial'
import Material from './material'

export default class MaterialList {
  constructor () {
    this.baseMaterials = []
    this.materials = []
  }

  createMaterial (type, lighting, roughness, metalness,
    fade, simplify, opacity, alphaTest, transparent, refractionRatio, wireframe, side,
    emissiveColor, emissiveIntensity, fog,
    map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
    reflectionmap, refractionmap,
    uscale, vscale, uoffset, voffset, rotation) {
    // Since the mesh generator reverses the faces a front and back side material are the same base material
    side = side || FRONT
    if (![FRONT, BACK, DOUBLE].includes(side)) { side = FRONT }
    const baseSide = (side === DOUBLE) ? DOUBLE : FRONT

    let baseMaterial = new BaseMaterial(type, roughness, metalness,
      opacity, alphaTest, transparent, refractionRatio, wireframe, baseSide,
      emissiveColor, emissiveIntensity, fog,
      map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
      reflectionmap, refractionmap,
      uscale, vscale, uoffset, voffset, rotation)
    const baseId = baseMaterial.baseId
    const existingBase = this.baseMaterials.find(m => m.baseId === baseId)

    if (existingBase) {
      baseMaterial = existingBase
    } else {
      this.baseMaterials.push(baseMaterial)
    }

    const material = new Material(baseMaterial, lighting, fade, simplify, side)
    this.materials.push(material)

    return material
  }

  clearMaterials () {
    this.materials.length = 0
  }

  forEach (func, thisArg, baseOnly) {
    if (baseOnly) {
      this.baseMaterials.foreach(func, thisArg)
    } else {
      this.materials.forEach(func, thisArg)
    }
  }

  find (func) {
    return this.materials.find(func)
  }

  findColorByExId (exId) {
    let color = null
    this.forEach(function (material) {
      if (!color) { color = material.colors.find(c => c.exId === exId) }
    }, this)

    return color
  }

  getMaterialListIndex (material) {
    return this.materials.indexOf(material)
  }
}

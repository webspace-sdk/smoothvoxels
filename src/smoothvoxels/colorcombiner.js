export default class ColorCombiner {
  static combineColors (model, buffers) {
    const { vertColorR, vertColorG, vertColorB, vertColorCount, faceVertColorR, faceVertColorG, faceVertColorB, faceVertLightR, faceVertLightG, faceVertLightB, faceVertIndices, faceMaterials, faceVertAO } = buffers
    const materials = model.materials.materials

    // No need to fade colors when there is no material with fade
    const fadeAny = !!model.materials.find(m => m.fade)

    const fadeMaterials = Array(materials.length).fill(false)

    for (let m = 0, l = materials.length; m < l; m++) {
      if (fadeAny && materials[m].fade) {
        fadeMaterials[m] = true
      }
    }

    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      const fadeFace = fadeMaterials[faceMaterials[faceIndex]]

      if (fadeFace) {
        // Fade vertex colors
        for (let v = 0; v < 4; v++) {
          let r = 0
          let g = 0
          let b = 0
          let count = 0

          const faceVertOffset = faceIndex * 4 + v
          const vertIndex = faceVertIndices[faceVertOffset]
          const colorCount = vertColorCount[vertIndex]

          for (let c = 0; c < colorCount; c++) {
            const faceColorOffset = vertIndex * 6 + c
            r += vertColorR[faceColorOffset]
            g += vertColorG[faceColorOffset]
            b += vertColorB[faceColorOffset]
            count++
          }

          const d = 1.0 / count
          faceVertColorR[faceVertOffset] = r * d
          faceVertColorG[faceVertOffset] = g * d
          faceVertColorB[faceVertOffset] = b * d
        }
      }
    }

    const doAo = model.ao || model.materials.find(function (m) { return m.ao })
    const doLights = model.lights.length > 0

    if (doAo && doLights) {
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]]
        const vAoShared = material.ao || model.ao
        const vAoSharedColor = vAoShared ? vAoShared.color : null

        // Face colors are already set to voxel color during model load
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceIndex * 4 + v
          const vR = faceVertColorR[faceVertOffset]
          const vG = faceVertColorG[faceVertOffset]
          const vB = faceVertColorB[faceVertOffset]

          const vAoColorR = vAoSharedColor ? vAoSharedColor.r : vR
          const vAoColorG = vAoSharedColor ? vAoSharedColor.g : vG
          const vAoColorB = vAoSharedColor ? vAoSharedColor.b : vB
          const vAo = 1 - faceVertAO[faceVertOffset]

          faceVertColorR[faceVertOffset] = vR * faceVertLightR[faceVertOffset] * vAo + vAoColorR * (1 - vAo)
          faceVertColorG[faceVertOffset] = vG * faceVertLightG[faceVertOffset] * vAo + vAoColorG * (1 - vAo)
          faceVertColorB[faceVertOffset] = vB * faceVertLightB[faceVertOffset] * vAo + vAoColorB * (1 - vAo)
        }
      }
    } else if (doLights && !doAo) {
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        // Face colors are already set to voxel color during model load
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceIndex * 4 + v
          faceVertColorR[faceVertOffset] = faceVertColorR[faceVertOffset] * faceVertLightR[faceVertOffset]
          faceVertColorG[faceVertOffset] = faceVertColorG[faceVertOffset] * faceVertLightG[faceVertOffset]
          faceVertColorB[faceVertOffset] = faceVertColorB[faceVertOffset] * faceVertLightB[faceVertOffset]
        }
      }
    } else if (!doLights && doAo) {
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]]
        const vAoShared = material.ao || model.ao
        if (!vAoShared) continue
        const vAoSharedColor = vAoShared.color

        // Face colors are already set to voxel color during model load
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceIndex * 4 + v
          const vR = faceVertColorR[faceVertOffset]
          const vG = faceVertColorG[faceVertOffset]
          const vB = faceVertColorB[faceVertOffset]

          const vAoColorR = vAoSharedColor ? vAoSharedColor.r : vR
          const vAoColorG = vAoSharedColor ? vAoSharedColor.g : vG
          const vAoColorB = vAoSharedColor ? vAoSharedColor.b : vB
          const vAo = 1 - faceVertAO[faceVertOffset]

          faceVertColorR[faceVertOffset] = vAo * vR + vAoColorR * (1 - vAo)
          faceVertColorG[faceVertOffset] = vAo * vG + vAoColorG * (1 - vAo)
          faceVertColorB[faceVertOffset] = vAo * vB + vAoColorB * (1 - vAo)
        }
      }
    }
  }
}

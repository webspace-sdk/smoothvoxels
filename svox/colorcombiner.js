class ColorCombiner {
  
  static combineColors(model, buffers) {
    const { vertColorR, vertColorG, vertColorB, vertColorCount, faceVertColorR, faceVertColorG, faceVertColorB, faceVertLightR, faceVertLightG, faceVertLightB, faceVertIndices, faceMaterials, faceVertAO } = buffers;
    const materials = model.materials.materials;

    // No need to fade colors when there is no material with fade
    let fadeAny = model.materials.find(m => m.colors.length > 1 && m.fade) ? true : false;

    const fadeMaterials = Array(materials.length).fill(false);

    for (let m = 0, l = materials.length; m < l; m++) {
      if (fadeAny && materials[m].colors.length > 1 && materials[m].fade) {
        fadeMaterials[m] = true;
      }
    }

    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      let fadeFace = fadeMaterials[faceMaterials[faceIndex]].fade;

      if (fadeFace) {
        // Fade vertex colors
        for (let v = 0; v < 4; v++) {
          let r = 0;
          let g = 0;
          let b = 0;
          let count = 0;

          const faceVertOffset = faceIndex * 4 + v;
          const vertIndex = faceVertIndices[faceVertOffset];
          const colorCount = vertColorCount[vertIndex];

          for (let c = 0; c < colorCount; c++) {
            const faceColorOffset = vertIndex * 5 + c;
            r += vertColorR[faceColorOffset];
            g += vertColorG[faceColorOffset];
            b += vertColorB[faceColorOffset];
            count++;
          }

          faceVertColorR[faceVertOffset] = r / count;
          faceVertColorG[faceVertOffset] = g / count;
          faceVertColorB[faceVertOffset] = b / count;
        }
      }
    }

    let doAo = model.ao || model.materials.find(function(m) { return m.ao; } );
    let doLights = model.lights.length > 0;

    if (doAo && doLights) {
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]];
        const vAoSharedColor = material.ao ? material.ao.color : model.ao.color;

        // Face colors are already set to voxel color during model load
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceIndex * 4 + v;
          const vR = faceVertColorR[faceVertOffset];
          const vG = faceVertColorG[faceVertOffset];
          const vB = faceVertColorB[faceVertOffset];

          const vAoColorR = vAoSharedColor ? vAoSharedColor.r : vR;
          const vAoColorG = vAoSharedColor ? vAoSharedColor.g : vG;
          const vAoColorB = vAoSharedColor ? vAoSharedColor.b : vB;
          const vAo = 1 - faceVertAO[faceVertOffset];

          faceVertColorR[faceVertOffset] = vR * faceVertLightR[faceVertOffset] * vAo + vAoColorR * (1 - vAo);
          faceVertColorG[faceVertOffset] = vG * faceVertLightG[faceVertOffset] * vAo + vAoColorG * (1 - vAo);
          faceVertColorB[faceVertOffset] = vG * faceVertLightB[faceVertOffset] * vAo + vAoColorR * (1 - vAo);
        }
      }
    } else if (doLights && !doAo) {
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        // Face colors are already set to voxel color during model load
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceIndex * 4 + v;
          faceVertColorR[faceVertOffset] = faceVertColorR[faceVertOffset] * faceVertLightR[faceVertOffset];
          faceVertColorG[faceVertOffset] = faceVertColorG[faceVertOffset] * faceVertLightG[faceVertOffset];
          faceVertColorB[faceVertOffset] = faceVertColorB[faceVertOffset] * faceVertLightB[faceVertOffset];
        }
      }
    } else if (!doLights && doAo) {
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]];
        const vAoSharedColor = material.ao ? material.ao.color : model.ao.color;

        // Face colors are already set to voxel color during model load
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceIndex * 4 + v;
          const vR = faceVertColorR[faceVertOffset];
          const vG = faceVertColorG[faceVertOffset];
          const vB = faceVertColorB[faceVertOffset];

          const vAoColorR = vAoSharedColor ? vAoSharedColor.r : vR;
          const vAoColorG = vAoSharedColor ? vAoSharedColor.g : vG;
          const vAoColorB = vAoSharedColor ? vAoSharedColor.b : vB;
          const vAo = 1 - faceVertAO[faceVertOffset];

          faceVertColorR[faceVertOffset] = vAo * vR + vAoColorR * (1 - vAo);
          faceVertColorG[faceVertOffset] = vAo * vG + vAoColorG * (1 - vAo);
          faceVertColorB[faceVertOffset] = vAo * vB + vAoColorB * (1 - vAo);
        }
      }
    }
  }
}

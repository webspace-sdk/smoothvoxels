class ColorCombiner {
  
  static combineColors(model, buffers) {
    const { vertColorR, vertColorG, vertColorB, vertColorCount, faceVertColorR, faceVertColorG, faceVertColorB, faceVertLightR, faceVertLightG, faceVertLightB, faceVertIndices, faceMaterials } = buffers;
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
      let fadeFace = fadeMaterials[faceMaterials[faceIndex]];

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

    if (model.lights.length > 0) {
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        // Face colors are already set to voxel color during model load
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceIndex * 4 + v;
          faceVertColorR[faceVertOffset] = faceVertColorR[faceVertOffset] * faceVertLightR[faceVertOffset];
          faceVertColorG[faceVertOffset] = faceVertColorG[faceVertOffset] * faceVertLightG[faceVertOffset];
          faceVertColorB[faceVertOffset] = faceVertColorB[faceVertOffset] * faceVertLightB[faceVertOffset];
          //let vAoColor = voxel.material.ao ? voxel.material.ao.color : model.ao ? model.ao.color : vColor;

          //vColor.r = vLight.r * vAo * vColor.r + vAoColor.r * (1 - vAo); 
          //vColor.g = vLight.g * vAo * vColor.g + vAoColor.g * (1 - vAo); 
          //vColor.b = vLight.b * vAo * vColor.b + vAoColor.b * (1 - vAo); 
        }
      }
    }
  }
}

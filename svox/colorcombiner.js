class ColorCombiner {
  
  static combineColors(model, buffers) {
    const { vertColorR, vertColorG, vertColorB, vertColorCount, faceVertColorR, faceVertColorG, faceVertColorB, faceVertIndices, faceMaterials } = buffers;
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

          const vertIndex = faceVertIndices[faceIndex * 4 + v];
          const colorCount = vertColorCount[vertIndex];

          for (let c = 0; c < colorCount; c++) {
            r += vertColorR[vertIndex * 5 + c];
            g += vertColorG[vertIndex * 5 + c];
            b += vertColorB[vertIndex * 5 + c];
            count++;
          }

          faceVertColorR[faceIndex * 4 + v] = r / count;
          faceVertColorG[faceIndex * 4 + v] = g / count;
          faceVertColorB[faceIndex * 4 + v] = b / count;
        }
      } else {
        // Face colors are already set to voxel color during model load
      }
    }
  }
       
  static _fadeFaceColor(voxel, face) {
    face.vertexColors = [ null, null, null, null ];
    for (let v = 0; v < 4; v++) {
      let vert = face.vertices[v];
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;    

      for (let c = 0, l = vert.colors.length; c < l; c++) {
        let col = vert.colors[c];
        if (col.material === voxel.material) {
          r += col.r; 
          g += col.g; 
          b += col.b; 
          count++;
        }
      }

      face.vertexColors[v] = Color.fromRgb(r / count, g / count, b / count);
    }    
  }
}

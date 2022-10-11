class ColorCombiner {
  
  static combineColors(model) {
    const { vertColorR, vertColorG, vertColorB, vertColorCount, faceVertColorR, faceVertColorG, faceVertColorB, faceVertIndices } = model;
    const materials = model.materials.materials;

    // No need to fade colors when there is no material with fade
    let fadeAny = model.materials.find(m => m.colors.length > 1 && m.fade) ? true : false;

    const fadeMaterials = Array(materials.length).fill(false);

    for (let m = 0; m < materials.length; m++) {
      if (fadeAny && materials[m].colors.length > 1 && materials[m].fade) {
        fadeMaterials[m] = true;
      }
    }

    for (let faceIndex = 0; faceIndex < model.facesCount; faceIndex++) {
      let fadeFace = fadeMaterials[faceMaterials[faceIndex]];

      if (!fadeFace) {
        // Copy material colors
        for (let v = 0; v < 3; v++) {
          faceVertColorR[faceIndex * 4 + v] = vertColorR[faceIndex];
          faceVertColorG[faceIndex * 4 + v] = vertColorG[faceIndex];
          faceVertColorB[faceIndex * 4 + v] = vertColorB[faceIndex];
        }
      } else {
        // Fade colors
        for (let v = 0; v < 4; v++) {
          let r = 0;
          let g = 0;
          let b = 0;
          let count = 0;

          const vertIndex = faceVertIndices[faceIndex * 4 + v];
          const vertColorCount = vertColorCount[vertIndex];

          for (let c = 0; c < vertColorCount; c++) {
            r += vertColorR[vertIndex * 4 + c];
            g += vertColorG[vertIndex * 4 + c];
            b += vertColorB[vertIndex * 4 + c];
            count++;
          }

          faceVertColorR[faceIndex * 4 + v] = r / count;
          faceVertColorG[faceIndex * 4 + v] = g / count;
          faceVertColorB[faceIndex * 4 + v] = b / count;
        }
      }
    }

    model.voxels.forEach(function combine(voxel) {
      let fadeVoxel = (fadeAny && voxel.material.fade && voxel.material.colors.length > 1);

      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face && !face.skipped) {
          
          if (!fadeVoxel) {
            // No fading, so no per vertex colors
            delete face.vertexColors;
          }
          else {
            // Fade the colors
            this._fadeFaceColor(voxel, face);
          }   
          
          // Combine AO + Lights + Face color(s)
          // TODO JEL inline
          this._combineFaceColors(model, voxel, face);                   
        }  
      }
    }, this, true);
  }
       
  static _fadeFaceColor(voxel, face) {
    face.vertexColors = [ null, null, null, null ];
    for (let v = 0; v < 4; v++) {
      let vert = face.vertices[v];
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;    

      for (let c = 0; c < vert.colors.length; c++) {
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
  
  static _combineFaceColors(model, voxel, face) {
    if (voxel.material.colorCount === 1 && !voxel.material.ao && !model.ao && model.lights.length === 0) {
      // Color is set in the material
    }
    else if (voxel.material.colorCount > 1 && !voxel.material.ao && !model.ao && model.lights.length === 0 && !face.vertexColors) {
        // Face colors
        face.color  = voxel.color;
    }
    else {

      // The combined result is stored in the vertexColors
      face.vertexColors = face.vertexColors || [ voxel.color.clone(), voxel.color.clone(), voxel.color.clone(), voxel.color.clone() ];      

      let colors = face.vertexColors;
      let light = face.light || [ {r:1, g:1, b:1}, {r:1, g:1, b:1}, {r:1, g:1, b:1}, {r:1, g:1, b:1} ];
      let ao = face.ao;

      // Calculate the vertex colors including Ambient Occlusion (when used)
      for (let v = 0; v < 4; v++) {
        let vColor = colors[v];
        let vLight = light[v];
        let vAo = (1 - ao[v]);
        let vAoColor = voxel.material.ao ? voxel.material.ao.color : model.ao ? model.ao.color : vColor;

        vColor.r = vLight.r * vAo * vColor.r + vAoColor.r * (1 - vAo); 
        vColor.g = vLight.g * vAo * vColor.g + vAoColor.g * (1 - vAo); 
        vColor.b = vLight.b * vAo * vColor.b + vAoColor.b * (1 - vAo); 
      }      
    }    
  }
  
}

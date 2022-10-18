class LightsCalculator {
  
  static calculateLights(model, buffers) {
    let lights = model.lights;
    if (lights.length === 0)
      return;
    
    for (const light of lights) {
      if (light.direction && !light.normalizedDirection) {
        light.normalizedDirection = model._normalize( { x:light.direction.x, y:light.direction.y, z:light.direction.z } );
      }
    }

    const materials = model.materials.materials;

    const { faceMaterials, faceNameIndices, faceVertUs, faceVertVs, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceVertIndices, vertX, vertY, vertZ, faceVertLightR, faceVertLightG, faceVertLightB  } = buffers;

    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      const material = materials[faceMaterials[faceIndex]];
      const faceOffset = faceIndex * 4;

      if (!material.lights) {
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceOffset + v;

          faceVertLightR[faceVertOffset] = 1;
          faceVertLightG[faceVertOffset] = 1;
          faceVertLightB[faceVertOffset] = 1;
        }
      } else {
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceOffset + v;

          const vertIndex = faceVertIndices[faceVertOffset];
          const vx = vertX[vertIndex];
          const vy = vertY[vertIndex];
          const vz = vertZ[vertIndex];

          const nx = faceVertNormalX[faceVertOffset];
          const ny = faceVertNormalY[faceVertOffset];
          const nz = faceVertNormalZ[faceVertOffset];

          for (const light of lights) {
            const { color, strength, distance, normalizedDirection, position } = light;

            let exposure = strength;

            let length = 0;

            if (position) {
              const lvx = position.x - vx;
              const lvy = position.y - vy;
              const lvz = position.z - vz;

              length = Math.sqrt(lvx * lvx + lvy * lvy + lvz * lvz);
              const d = 1.0 / length;

              exposure = strength * Math.max(nx*lvx*d + ny*lvy*d + nz*lvz*d, 0.0);
            } else if (normalizedDirection) {
              exposure = strength * 
                         Math.max(nx*normalizedDirection.x + 
                                  ny*normalizedDirection.y + 
                                  nz*normalizedDirection.z, 0.0);
            }

            if (position && distance) {
              exposure = exposure * (1 - Math.min(length / distance, 1));
            }

            faceVertLightR[faceVertOffset] += color.r * exposure;
            faceVertLightG[faceVertOffset] += color.g * exposure;
            faceVertLightB[faceVertOffset] += color.b * exposure;
          }
        }
      }
    }
  } 

}


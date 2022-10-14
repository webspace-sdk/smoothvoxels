function almostEqual(x, y) {
  return Math.abs(x - y) < 0.0001;
}

function assertAlmostEqual(x, y) {
  if (!almostEqual(x, y))
    throw new Error("Assertion failed: " + x + " != " + y);
}

class UVAssigner {
  
    static assignUVs(model) {
      const { faceMaterials, faceNameIndices, faceVertUs, faceVertVs } = model;

      const materialUseOffsets = [];
      const materialUScales = [];
      const materialVScales = [];

      const materials = model.materials.materials;

      for (let materialIndex = 0; materialIndex < materials.length; materialIndex++) {
        const material = materials[materialIndex];

        let useOffset = 0;  // Simple (per voxel) textures don't need offsets per side
        let uscale = 1;
        let vscale = 1;

        if (material.map || material.normalMap || material.roughnessMap || material.metalnessMap || material.emissiveMap) {
          
          if (material.mapTransform.uscale === -1) {
            uscale = 1 / Math.max(model.voxels.size.x, model.voxels.size.y, model.voxels.size.z);
          }       

          if (material.mapTransform.vscale === -1) {
            vscale = 1 / Math.max(model.voxels.size.x, model.voxels.size.y, model.voxels.size.z);
          }       
          
          if ((material.map && material.map.cube) || 
              (material.normalMap && material.normalMap.cube) ||
              (material.roughnessMap && material.roughnessMap.cube) ||
              (material.metalnessMap && material.metalnessMap.cube) ||
              (material.emissiveMap && material.emissiveMap.cube)) {
            useOffset = 1;        // Use the offsets per face in the cube texture
            uscale = uscale / 4;  // The cube texture is 4 x 2
            vscale = vscale / 2;
          }
        }

        materialUseOffsets.push(useOffset);
        materialUScales.push(uscale);
        materialVScales.push(vscale);
      }

      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const faceMaterialIndex = faceMaterials[faceIndex];
        const useOffset = materialUseOffsets[faceMaterialIndex];
        const uscale = materialUScales[faceMaterialIndex];
        const vscale = materialUScales[faceMaterialIndex];

        const faceUVs = SVOX._FACEINDEXUVS[faceNameIndices[faceIndex]];

        // model initializes the UV arrays to the proper vox x, y, z value
        const voxU0 = faceVertUs[faceIndex * 4 + faceUVs.order[0]];
        const voxV0 = faceVertVs[faceIndex * 4 + faceUVs.order[0]];
        const voxU1 = faceVertUs[faceIndex * 4 + faceUVs.order[1]];
        const voxV1 = faceVertVs[faceIndex * 4 + faceUVs.order[1]];
        const voxU2 = faceVertUs[faceIndex * 4 + faceUVs.order[2]];
        const voxV2 = faceVertVs[faceIndex * 4 + faceUVs.order[2]];
        const voxU3 = faceVertUs[faceIndex * 4 + faceUVs.order[3]];
        const voxV3 = faceVertVs[faceIndex * 4 + faceUVs.order[3]];

        faceVertUs[faceIndex * 4 + faceUVs.order[0]] = useOffset * faceUVs.uo + (voxU0 + 0.0001) * faceUVs.ud * uscale;
        faceVertVs[faceIndex * 4 + faceUVs.order[0]] = useOffset * faceUVs.vo + (voxV0 + 0.0001) * faceUVs.vd * vscale;

        faceVertUs[faceIndex * 4 + faceUVs.order[1]] = useOffset * faceUVs.uo + (voxU1 + 0.0001) * faceUVs.ud * uscale;
        faceVertVs[faceIndex * 4 + faceUVs.order[1]] = useOffset * faceUVs.vo + (voxV1 + 0.9999) * faceUVs.vd * vscale;

        faceVertUs[faceIndex * 4 + faceUVs.order[2]] = useOffset * faceUVs.uo + (voxU2 + 0.9999) * faceUVs.ud * uscale;
        faceVertVs[faceIndex * 4 + faceUVs.order[2]] = useOffset * faceUVs.vo + (voxV2 + 0.9999) * faceUVs.vd * vscale;

        faceVertUs[faceIndex * 4 + faceUVs.order[3]] = useOffset * faceUVs.uo + (voxU3 + 0.9999) * faceUVs.ud * uscale;
        faceVertVs[faceIndex * 4 + faceUVs.order[3]] = useOffset * faceUVs.vo + (voxV3 + 0.0001) * faceUVs.vd * vscale;
      }
  }
}


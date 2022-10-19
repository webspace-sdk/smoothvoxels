class UVAssigner {
  
    static assignUVs(model, buffers) {
      const { faceMaterials, faceNameIndices, faceVertUs, faceVertVs } = buffers;

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
          
          const sizeX = model.voxChunk.size[0];
          const sizeY = model.voxChunk.size[1];
          const sizeZ = model.voxChunk.size[2];

          if (material.mapTransform.uscale === -1) {
            uscale = 1 / Math.max(sizeX, sizeY, sizeZ);
          }       

          if (material.mapTransform.vscale === -1) {
            vscale = 1 / Math.max(sizeX, sizeY, sizeZ);
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
        const vscale = materialVScales[faceMaterialIndex];

        const faceUVs = SVOX._FACEINDEXUVS[faceNameIndices[faceIndex]];

        // model initializes the UV arrays to the proper vox x, y, z value
        const faceOffset = faceIndex * 4; 

        const voxU0 = faceVertUs[faceOffset + faceUVs.order[0]];
        const voxV0 = faceVertVs[faceOffset + faceUVs.order[0]];
        const voxU1 = faceVertUs[faceOffset + faceUVs.order[1]];
        const voxV1 = faceVertVs[faceOffset + faceUVs.order[1]];
        const voxU2 = faceVertUs[faceOffset + faceUVs.order[2]];
        const voxV2 = faceVertVs[faceOffset + faceUVs.order[2]];
        const voxU3 = faceVertUs[faceOffset + faceUVs.order[3]];
        const voxV3 = faceVertVs[faceOffset + faceUVs.order[3]];

        const uv1 = faceOffset + faceUVs.order[0];
        const uv2 = faceOffset + faceUVs.order[1];
        const uv3 = faceOffset + faceUVs.order[2];
        const uv4 = faceOffset + faceUVs.order[3];
        const uOffset = useOffset * faceUVs.uo;
        const vOffset = useOffset * faceUVs.vo;
        const uScale = faceUVs.ud * uscale;
        const vScale = faceUVs.vd * vscale;

        faceVertUs[uv1] = uOffset + (voxU0 + 0.0001) * uScale;
        faceVertVs[uv1] = vOffset + (voxV0 + 0.0001) * vScale;

        faceVertUs[uv2] = uOffset + (voxU1 + 0.0001) * uScale;
        faceVertVs[uv2] = vOffset + (voxV1 + 0.9999) * vScale;

        faceVertUs[uv3] = uOffset + (voxU2 + 0.9999) * uScale;
        faceVertVs[uv3] = vOffset + (voxV2 + 0.9999) * vScale;

        faceVertUs[uv4] = uOffset + (voxU3 + 0.9999) * uScale;
        faceVertVs[uv4] = vOffset + (voxV3 + 0.0001) * vScale;
      }
  }
}


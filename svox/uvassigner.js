class UVAssigner {
  
    static assignUVs(model) {
      
      model.voxels.forEach(function(voxel) {
        let material = voxel.material;
        
        // We're always calculating UV's since even when the voxel does not use them, the shell might need them
        
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

        for (let faceName in voxel.faces) {
          let face = voxel.faces[faceName];
          if (face.skipped)
            continue;
          
          let faceUVs = SVOX._FACEUVS[faceName];
          face.uv = [];
          face.uv[faceUVs.order[0]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.0001)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.0001)*faceUVs.vd*vscale }; 
          face.uv[faceUVs.order[1]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.0001)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.9999)*faceUVs.vd*vscale }; 
          face.uv[faceUVs.order[2]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.9999)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.9999)*faceUVs.vd*vscale }; 
          face.uv[faceUVs.order[3]] = { u:useOffset*faceUVs.uo+(voxel[faceUVs.u]+0.9999)*faceUVs.ud*uscale, v:useOffset*faceUVs.vo+(voxel[faceUVs.v]+0.0001)*faceUVs.vd*vscale };
        }
      }, this, true);  
  }
}


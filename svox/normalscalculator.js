class NormalsCalculator {
 
  static calculateNormals(model) {
    let tile = model.tile;
    let voxels = model.voxels;
    
    voxels.forEach(function computeNormals(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;
        
        face.smooth = face.equidistant === true || (face.equidistant === undefined && !face.flattened && !face.clamped);
        
        let vmid = { 
          x: (face.vertices[0].x + face.vertices[1].x + face.vertices[2].x + face.vertices[3].x) / 4,
          y: (face.vertices[0].y + face.vertices[1].y + face.vertices[2].y + face.vertices[3].y) / 4,
          z: (face.vertices[0].z + face.vertices[1].z + face.vertices[2].z + face.vertices[3].z) / 4
        };

        face.flatNormals = [];

        // Per vertex calculate the normal by means of the cross product
        // using the previous vertex and the quad midpoint.
        // This prevents (most) flipped normals when one vertex moves over the diagonal.
        for (let v = 0; v < 4; v++) {
          let vertex = face.vertices[v];
          let vprev = face.vertices[(v+3) % 4];
          
          vertex.smoothNormal = vertex.smoothNormal || { x:0, y:0, z:0 };
          vertex.bothNormal   = vertex.bothNormal   || { x:0, y:0, z:0 };
          
          // Subtract vectors
          let e1 = { x: vprev.x - vertex.x, y: vprev.y - vertex.y, z: vprev.z - vertex.z };
          let e2 = { x: vmid.x - vertex.x, y: vmid.y - vertex.y, z: vmid.z - vertex.z };
          
          // Normalize 
          model._normalize(e1);
          model._normalize(e2);
          
          // Calculate cross product
          let normal = {
            x: e1.y * e2.z - e1.z * e2.y,
            y: e1.z * e2.x - e1.x * e2.z,
            z: e1.x * e2.y - e1.y * e2.x
          }
          
          // In case of tiling, make normals peripendicular on edges
          if (tile) {
            if (((tile.nx && faceName === 'nx') || (tile.px && faceName === 'px')) &&
                (vertex.y < voxels.minY+0.1 || vertex.y > voxels.maxY+0.9 ||
                 vertex.z < voxels.minZ+0.1 || vertex.z > voxels.maxZ+0.9)) { 
              normal.y = 0; normal.z = 0 
            };
            if (((tile.ny && faceName === 'ny') || (tile.py && faceName === 'py')) &&
                (vertex.x < voxels.minX+0.1 || vertex.x > voxels.maxX+0.9 ||
                 vertex.z < voxels.minZ+0.1 || vertex.z > voxels.maxZ+0.9)) { 
              normal.x = 0; normal.z = 0 
            };
            if (((tile.nz && faceName === 'nz') || (tile.pz && faceName === 'pz')) &&
                (vertex.x < voxels.minX+0.1 || vertex.x > voxels.maxX+0.9 ||
                 vertex.y < voxels.minY+0.1 || vertex.y > voxels.maxY+0.9)) { 
              normal.x = 0; normal.y = 0 
            };
          }

          model._normalize(normal);
          
          // Store the normal for all 4 vertices (used for flat lighting)
          face.flatNormals[v] = normal;
                    
          // Average the normals weighed by angle (i.e. wide adjacent faces contribute more than narrow adjacent faces)
          // Since we're using the mid point we can be wrong on strongly deformed quads, but not noticable
          let mul = e1.x * e2.x + e1.y * e2.y + e1.z * e2.z;
          let angle = Math.acos(mul);
            
          // Always count towards the smoothNormal
          vertex.smoothNormal.x += angle * normal.x;
          vertex.smoothNormal.y += angle * normal.y;
          vertex.smoothNormal.z += angle * normal.z;
          
          // But only add this normal to bothNormal when the face uses smooth lighting
          if (face.smooth) {            
            vertex.bothNormal.x += angle * normal.x;
            vertex.bothNormal.y += angle * normal.y;
            vertex.bothNormal.z += angle * normal.z;
          }
        }
      }
    }, this, true);
      
    // Normalize the vertex normals
    model.forEachVertex(function normalizeNormals(vertex) {   
      model._normalize(vertex.smoothNormal);      
      model._normalize(vertex.bothNormal);      
    }, this);    
    
    model.voxels.forEach(function calculateNormals(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;
        
        // Store all the different normals (needed for the shell)
        
        // face.flatNormals is already set

        face.smoothNormals = [
          face.vertices[0].smoothNormal,
          face.vertices[1].smoothNormal,
          face.vertices[2].smoothNormal,
          face.vertices[3].smoothNormal
        ];
        
        face.bothNormals = [
          !face.smooth || model._isZero(face.vertices[0].bothNormal) ? face.flatNormals[0] : face.vertices[0].bothNormal,
          !face.smooth || model._isZero(face.vertices[1].bothNormal) ? face.flatNormals[1] : face.vertices[1].bothNormal,
          !face.smooth || model._isZero(face.vertices[2].bothNormal) ? face.flatNormals[2] : face.vertices[2].bothNormal,
          !face.smooth || model._isZero(face.vertices[3].bothNormal) ? face.flatNormals[3] : face.vertices[3].bothNormal
        ];
        
        // Now set the actual normals for this face
        switch (voxel.material.lighting) {
          case SVOX.SMOOTH:
            face.normals = face.smoothNormals;
            break;
          case SVOX.BOTH:
            face.normals = face.bothNormals; 
            break;
          default:
            face.normals = face.flatNormals;
            break;
        }
        
      }
    }, this, true);
    
    // Cleanup the vertex normals which are no longer used
    model.forEachVertex(function deleteUnusedNormals(vertex) { 
      delete vertex.smoothNormal;      
      delete vertex.bothNormal;      
    }, this);    
  }  
}


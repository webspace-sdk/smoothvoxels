class FaceAligner {
     
  // Align all 'quad' diagonals to the center, making most models look more symmetrical
  static alignFaceDiagonals(model) {
    // TODO skip culled faces

    model.forEachVertex(function(vertex) { 
      vertex.count = 0;
    }, this);
    
    let maxDist = 0.1 * Math.min(model.scale.x, model.scale.y, model.scale.z);
    maxDist *= maxDist; // No need to use sqrt for the distances
    
    model.voxels.forEach(function(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;

        face.vertices[0].count++; 
        face.vertices[1].count++; 
        face.vertices[2].count++; 
        face.vertices[3].count++; 

        // Determine the diagonal for v0 - v2 mid point and the distances from v1 and v3 to that mid point 
        let mid02X = (face.vertices[0].x + face.vertices[2].x)/2;
        let mid02Y = (face.vertices[0].y + face.vertices[2].y)/2;
        let mid02Z = (face.vertices[0].z + face.vertices[2].z)/2;
        let distance1toMid = (face.vertices[1].x - mid02X) * (face.vertices[1].x - mid02X) + 
                             (face.vertices[1].y - mid02Y) * (face.vertices[1].y - mid02Y) + 
                             (face.vertices[1].z - mid02Z) * (face.vertices[1].z - mid02Z); 
        let distance3toMid = (face.vertices[3].x - mid02X) * (face.vertices[3].x - mid02X) + 
                             (face.vertices[3].y - mid02Y) * (face.vertices[3].y - mid02Y) + 
                             (face.vertices[3].z - mid02Z) * (face.vertices[3].z - mid02Z); 

        // Determine the diagonal for v1 - v3 mid point and the distances from v0 and v2 to that mid point 
        let mid13X = (face.vertices[1].x + face.vertices[3].x)/2;
        let mid13Y = (face.vertices[1].y + face.vertices[3].y)/2;
        let mid13Z = (face.vertices[1].z + face.vertices[3].z)/2;
        let distance0toMid = (face.vertices[0].x - mid13X) * (face.vertices[0].x - mid13X) + 
                             (face.vertices[0].y - mid13Y) * (face.vertices[0].y - mid13Y) + 
                             (face.vertices[0].z - mid13Z) * (face.vertices[0].z - mid13Z); 
        let distance2toMid = (face.vertices[2].x - mid13X) * (face.vertices[2].x - mid13X) + 
                             (face.vertices[2].y - mid13Y) * (face.vertices[2].y - mid13Y) + 
                             (face.vertices[2].z - mid13Z) * (face.vertices[2].z - mid13Z); 

        // NOTE: The check below is not an actual check for concave quads but 
        // checks whether one of the vertices is close to the midpoint of te other diagonal.
        // This can happen in certain cases when deforming, when the vertex itself is not moved, 
        // but two vertices it is dependant on are moved in the 'wrong' direction, resulting 
        // in a concave quad. Since deforming should not make the quad very badly concave
        // this seems enough to prevent ugly artefacts in these edge cases.

        if (distance1toMid < maxDist || distance3toMid < maxDist) {
          // If v1 or v3 is close to the mid point we may have a rare concave quad.
          // Switch the default triangles so this does not show up
          face.vertices.push(face.vertices.shift());
          //face.normals.push(face.normals.shift());
          face.flatNormals.push(face.flatNormals.shift());
          face.smoothNormals.push(face.smoothNormals.shift());
          face.bothNormals.push(face.bothNormals.shift());
          face.ao.push(face.ao.shift());
          face.uv.push(face.uv.shift());
          if (face.vertexColors)
              face.vertexColors.push(face.vertexColors.shift());
        } 
        else if (distance0toMid < maxDist || distance2toMid < maxDist) {
          // If v0 or v2 is close to the mid point we may have a rare concave quad.
          // Keep the default triangles so this does not show up.
        }
        else if (face.ao && 
                 Math.min(face.ao[0], face.ao[1], face.ao[2], face.ao[3]) !==
                 Math.max(face.ao[0], face.ao[1], face.ao[2], face.ao[3])) {
          // This is a 'standard' quad but with an ao gradient 
          // Rotate the vertices so they connect the highest contrast 
          let ao02 = Math.abs(face.ao[0] - face.ao[2]);
          let ao13 = Math.abs(face.ao[1] - face.ao[3]);
          if (ao02 < ao13) {
            face.vertices.push(face.vertices.shift());
            //face.normals.push(face.normals.shift());
            face.flatNormals.push(face.flatNormals.shift());
            face.smoothNormals.push(face.smoothNormals.shift());
            face.bothNormals.push(face.bothNormals.shift());
            face.ao.push(face.ao.shift());
            face.uv.push(face.uv.shift());
            if (face.vertexColors)
              face.vertexColors.push(face.vertexColors.shift());
          }                        
        }
        else {
          // This is a 'standard' quad. 
          // Rotate the vertices so they align to the center
          // For symetric models this improves the end result
          let min = this._getVertexSum(face.vertices[0]);
          while (this._getVertexSum(face.vertices[1]) < min || 
                 this._getVertexSum(face.vertices[2]) < min || 
                 this._getVertexSum(face.vertices[3]) < min) {
            face.vertices.push(face.vertices.shift());
            //face.normals.push(face.normals.shift());
            face.flatNormals.push(face.flatNormals.shift());
            face.smoothNormals.push(face.smoothNormals.shift());
            face.bothNormals.push(face.bothNormals.shift());
            face.ao.push(face.ao.shift());
            face.uv.push(face.uv.shift());              
            if (face.vertexColors)
              face.vertexColors.push(face.vertexColors.shift());
            min = this._getVertexSum(face.vertices[0]);
          }            
        }
      
      }
    }, this, true);
  }
  
  static _getVertexSum(vertex) {
    return Math.abs(vertex.x) + Math.abs(vertex.y) + Math.abs(vertex.z);
  }  
   
}


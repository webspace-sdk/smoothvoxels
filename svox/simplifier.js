class Simplifier {
  
  // Combine all faces which are coplanar, have the same normals, colors, etc.
  static simplify(model) {
    
    if (!model.simplify)
      return;
    
    let context1 = { model };
    let context2 = { model };
    let context3 = { model };
    let context4 = { model };

    let clearContexts = function() {
      context1.lastVoxel = null;
      context2.lastVoxel = null;
      context3.lastVoxel = null;
      context4.lastVoxel = null;      
    }
    
    // Combine nx, px, nz athisnd pz faces vertical up
    for (let i = model.voxelXYZFaceIndices.length - model.faceCount ; i < model.voxelXYZFaceIndices.length; i++) {
      const key = model.voxelXZYFaceIndices[i]
      let faceIndex = Number(key) & 0xFFFFFFFF;
      let x = Number(key >> 32n) & 0xFF;
      let y = Number(key >> 40n) & 0xFF;
      let z = Number(key >> 48n) & 0xFF;
    }

    // Combine nx, px, nz athisnd pz faces vertical up
    for (let x = model.voxels.minX; x <= model.voxels.maxX; x++) {
      for (let z = model.voxels.minZ; z <= model.voxels.maxZ; z++) {
        for (let y = model.voxels.minY; y <= model.voxels.maxY; y++) {
          let voxel = model.voxels.getVoxel(x,y,z); 
          if (voxel) {
            this._mergeFaces(context1, voxel, 'x', 'z', 'y', 'nx', 0, 1, 2, 3);
            this._mergeFaces(context2, voxel, 'x', 'z', 'y', 'px', 0, 1, 2, 3);
            this._mergeFaces(context3, voxel, 'x', 'z', 'y', 'nz', 0, 1, 2, 3);
            this._mergeFaces(context4, voxel, 'x', 'z', 'y', 'pz', 0, 1, 2, 3);
          }
          else
             clearContexts();
        }
      }
    }
    
    // Combine nx, px, ny and py faces from back to front
    clearContexts();
    for (let x = model.voxels.minX; x <= model.voxels.maxX; x++) {
      for (let y = model.voxels.minY; y <= model.voxels.maxY; y++) {
        for (let z = model.voxels.minZ; z <= model.voxels.maxZ; z++) {
          let voxel = model.voxels.getVoxel(x,y,z); 
          if (voxel) {
            this._mergeFaces(context1, voxel, 'x', 'y', 'z', 'nx', 1, 2, 3, 0);
            this._mergeFaces(context2, voxel, 'x', 'y', 'z', 'px', 3, 0, 1, 2);
            this._mergeFaces(context3, voxel, 'x', 'y', 'z', 'ny', 0, 1, 2, 3);
            this._mergeFaces(context4, voxel, 'x', 'y', 'z', 'py', 2, 3, 0, 1);
          }
          else
            clearContexts();
        }
      }
    }
    
    // Combine ny, py, nz and pz faces from left to right
    clearContexts();
    for (let y = model.voxels.minY; y <= model.voxels.maxY; y++) {
      for (let z = model.voxels.minZ; z <= model.voxels.maxZ; z++) {
        for (let x = model.voxels.minX; x <= model.voxels.maxX; x++) {
          let voxel = model.voxels.getVoxel(x,y,z); 
          if (voxel) {
            this._mergeFaces(context1, voxel, 'y', 'z', 'x', 'ny', 1, 2, 3, 0);
            this._mergeFaces(context2, voxel, 'y', 'z', 'x', 'py', 1, 2, 3, 0);
            this._mergeFaces(context3, voxel, 'y', 'z', 'x', 'nz', 3, 0, 1, 2);
            this._mergeFaces(context4, voxel, 'y', 'z', 'x', 'pz', 1, 2, 3, 0);
          }
          else
            clearContexts();
        }
      }
    }

  }
  
  // axis 3 is the movement direction
  // v1, v2 of the last face are candidates for removal
  static _mergeFaces(context, voxel, axis1, axis2, axis3, faceName, v0, v1, v2, v3) {
    let face = null;
    if (voxel)
      face = voxel.faces[faceName];

    if (voxel && context.lastVoxel && 
        (voxel.material.simplify === true || (voxel.material.simplify === null && context.model.simplify === true)) && 
        face && !face.skipped && context.lastFace &&
        voxel.color === context.lastVoxel.color &&
        voxel[axis1] === context.lastVoxel[axis1] &&
        voxel[axis2] === context.lastVoxel[axis2]) {
        
        let faceNormals = face.normals;
        let lastFaceNormals = context.lastFace.normals;
        let faceVertexColors = face.vertexColors;
        let lastFaceVertexColors = context.lastFace.vertexColors;
        let faceVertices = face.vertices;
        let lastFaceVertices = context.lastFace.vertices;
        let faceAo = face.ao; 
        let lastFaceAo = context.lastFace.ao; 
      
        // Calculate the ratio between the face length and the total face length (in case they are combined)
        let faceLength = Math.sqrt(
                          (faceVertices[v1].x - faceVertices[v0].x) * (faceVertices[v1].x - faceVertices[v0].x) +
                          (faceVertices[v1].y - faceVertices[v0].y) * (faceVertices[v1].y - faceVertices[v0].y) +
                          (faceVertices[v1].z - faceVertices[v0].z) * (faceVertices[v1].z - faceVertices[v0].z)
                        );
        let totalLength = Math.sqrt(
                          (faceVertices[v1].x - lastFaceVertices[v0].x) * (faceVertices[v1].x - lastFaceVertices[v0].x) +
                          (faceVertices[v1].y - lastFaceVertices[v0].y) * (faceVertices[v1].y - lastFaceVertices[v0].y) +
                          (faceVertices[v1].z - lastFaceVertices[v0].z) * (faceVertices[v1].z - lastFaceVertices[v0].z)
                        ); 
        let ratio = faceLength / totalLength;
      
        if (this._normalEquals(faceNormals[0], lastFaceNormals[0]) && 
            this._normalEquals(faceNormals[1], lastFaceNormals[1]) && 
            this._normalEquals(faceNormals[2], lastFaceNormals[2]) && 
            this._normalEquals(faceNormals[3], lastFaceNormals[3]) &&
            ( 
              (!faceVertexColors && !lastFaceVertexColors) || (
                this._colorEquals(faceVertexColors[0], lastFaceVertexColors[0]) &&
                this._colorEquals(faceVertexColors[1], lastFaceVertexColors[1]) &&
                this._colorEquals(faceVertexColors[2], lastFaceVertexColors[2]) &&
                this._colorEquals(faceVertexColors[3], lastFaceVertexColors[3]) 
              )
            ) && 
            faceAo[0] === lastFaceAo[0] &&
            faceAo[1] === lastFaceAo[1] &&
            faceAo[2] === lastFaceAo[2] &&
            faceAo[3] === lastFaceAo[3] &&
            
            (false || (
              Math.abs(lastFaceVertices[v1][axis1] - (1-ratio) * faceVertices[v1][axis1] - ratio * lastFaceVertices[v0][axis1]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v1][axis2] - (1-ratio) * faceVertices[v1][axis2] - ratio * lastFaceVertices[v0][axis2]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v1][axis3] - (1-ratio) * faceVertices[v1][axis3] - ratio * lastFaceVertices[v0][axis3]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v2][axis1] - (1-ratio) * faceVertices[v2][axis1] - ratio * lastFaceVertices[v3][axis1]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v2][axis2] - (1-ratio) * faceVertices[v2][axis2] - ratio * lastFaceVertices[v3][axis2]) <= Number.EPSILON * 10 &&
              Math.abs(lastFaceVertices[v2][axis3] - (1-ratio) * faceVertices[v2][axis3] - ratio * lastFaceVertices[v3][axis3]) <= Number.EPSILON * 10 ))
           ) 
        {
          // Everything checks out, so add this face to the last one
          //console.log(`MERGE: ${this._faceVerticesToString(lastFaceVertices)}`);
          //console.log(`  AND: ${this._faceVerticesToString(faceVertices)}`);
          lastFaceVertices[v1] = faceVertices[v1];
          lastFaceVertices[v2] = faceVertices[v2];          
          //console.log(`   TO: ${this._faceVerticesToString(lastFaceVertices)}`);
          
          context.lastFace.uv[v1] = face.uv[v1];
          context.lastFace.uv[v2] = face.uv[v2];
          
          context.lastFace.flatNormals[v1] = face.flatNormals[v1];
          context.lastFace.flatNormals[v2] = face.flatNormals[v2];
          context.lastFace.smoothNormals[v1] = face.smoothNormals[v1];
          context.lastFace.smoothNormals[v2] = face.smoothNormals[v2];
          context.lastFace.bothNormals[v1] = face.bothNormals[v1];
          context.lastFace.bothNormals[v2] = face.bothNormals[v2];
          
          // And remove this face
          delete voxel.faces[faceName];
          return;
        }
    }

    context.lastVoxel = voxel;
    context.lastFace = face;
  }
  
  
  static _normalEquals(vector1, vector2) {
    return Math.abs(vector1.x - vector2.x) < 0.01 && // Allow for minimal differences
           Math.abs(vector1.y - vector2.y) < 0.01 && 
           Math.abs(vector1.z - vector2.z) < 0.01;
  }
  
  static _colorEquals(color1, color2) {
    return color1.r === color2.r &&
           color1.g === color2.g &&
           color1.b === color2.b;
  }  
  
  static _faceVerticesToString(vertices) {
    return `[`+
           `${this._vertexToString(vertices[0],0)},` +
           `${this._vertexToString(vertices[1],0)},` +
           `${this._vertexToString(vertices[2],0)},` +
           `${this._vertexToString(vertices[3],0)}` +
           `]`;
  }
  
  static _vertexToString(vertex, decimals) {
    return `{${vertex.x.toFixed(decimals)},${vertex.y.toFixed(decimals)},${vertex.z.toFixed(decimals)}}`;
  }
    
}


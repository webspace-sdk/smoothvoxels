class FaceAligner {
     
  // Align all 'quad' diagonals to the center, making most models look more symmetrical
  static alignFaceDiagonals(model) {
    // TODO skip culled faces
    let maxDist = 0.1 * Math.min(model.scale.x, model.scale.y, model.scale.z);
    maxDist *= maxDist; // No need to use sqrt for the distances

    const { faceCulled, faceVertIndices, vertX, vertY, vertZ, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertUs, faceVertVs, faceVertColorR, faceVertColorG, faceVertColorB, faceVertNormalX, faceVertNormalY, faceVertNormalZ } = model;

    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      if (faceCulled.get(faceIndex) === 1) continue;

      const faceVertOffset = faceIndex * 4;
      const vert0Index = faceVertIndices[faceVertOffset];
      const vert1Index = faceVertIndices[faceVertOffset + 1];
      const vert2Index = faceVertIndices[faceVertOffset + 2];
      const vert3Index = faceVertIndices[faceVertOffset + 3];

      let vert0X = vertX[vert0Index];
      let vert0Y = vertY[vert0Index];
      let vert0Z = vertZ[vert0Index];
      let vert1X = vertX[vert1Index];
      let vert1Y = vertY[vert1Index];
      let vert1Z = vertZ[vert1Index];
      let vert2X = vertX[vert2Index];
      let vert2Y = vertY[vert2Index];
      let vert2Z = vertZ[vert2Index];
      let vert3X = vertX[vert3Index];
      let vert3Y = vertY[vert3Index];
      let vert3Z = vertZ[vert3Index];

      // Determine the diagonal for v0 - v2 mid point and the distances from v1 and v3 to that mid point 
      const mid02X = (vert0X + vert2X)/2;
      const mid02Y = (vert0Y + vert2Y)/2;
      const mid02Z = (vert0Z + vert2Z)/2;
      const distance1toMid = (vert1X - mid02X) * (vert1X - mid02X) + 
                           (vert1Y - mid02Y) * (vert1Y - mid02Y) + 
                           (vert1Z - mid02Z) * (vert1Z - mid02Z); 
      const distance3toMid = (vert3X - mid02X) * (vert3X - mid02X) + 
                           (vert3Y - mid02Y) * (vert3Y - mid02Y) + 
                           (vert3Z - mid02Z) * (vert3Z - mid02Z); 

      const mid13X = (vert1X + vert3X)/2;
      const mid13Y = (vert1Y + vert3Y)/2;
      const mid13Z = (vert1Z + vert3Z)/2;
      const distance0toMid = (vert0X - mid13X) * (vert0X - mid13X) + 
                           (vert0Y - mid13Y) * (vert0Y - mid13Y) + 
                           (vert0Z - mid13Z) * (vert0Z - mid13Z); 
      const distance2toMid = (vert2X - mid13X) * (vert2X - mid13X) + 
                           (vert2Y - mid13Y) * (vert2Y - mid13Y) + 
                           (vert2Z - mid13Z) * (vert2Z - mid13Z); 

      // NOTE: The check below is not an actual check for concave quads but 
      // checks whether one of the vertices is close to the midpoint of te other diagonal.
      // This can happen in certain cases when deforming, when the vertex itself is not moved, 
      // but two vertices it is dependant on are moved in the 'wrong' direction, resulting 
      // in a concave quad. Since deforming should not make the quad very badly concave
      // this seems enough to prevent ugly artefacts in these edge cases.

      if (distance1toMid < maxDist || distance3toMid < maxDist) {
        // If v1 or v3 is close to the mid point we may have a rare concave quad.
        // Switch the default triangles so this does not show up
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertIndices);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalX);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalY);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalZ);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalX);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalY);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalZ);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalX);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalY);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalZ);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalX);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalY);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalZ);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertUs);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertVs);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorR);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorG);
        this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorB);
        //face.ao.push(face.ao.shift());
      } 
      else if (distance0toMid < maxDist || distance2toMid < maxDist) {
        // If v0 or v2 is close to the mid point we may have a rare concave quad.
        // Keep the default triangles so this does not show up.
      }
      /*else if (face.ao && 
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
      }*/
      else {
        // This is a 'standard' quad. 
        // Rotate the vertices so they align to the center
        // For symetric models this improves the end result
        let min = this._getVertexSumInline(vert0X, vert0Y, vert0Z);

        while (this._getVertexSumInline(vert1X, vert1Y, vert1Z) < min || 
               this._getVertexSumInline(vert2X, vert2Y, vert2Z) < min || 
               this._getVertexSumInline(vert3X, vert3Y, vert3Z) < min) {
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertIndices);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertUs);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertVs);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorR);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorG);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorB);

          const tx = vert0X;
          const ty = vert0Y;
          const tz = vert0Z;
          vert0X = vert1X;
          vert0Y = vert1Y;
          vert0Z = vert1Z;
          vert1X = vert2X;
          vert1Y = vert2Y;
          vert1Z = vert2Z;
          vert2X = vert3X;
          vert2Y = vert3Y;
          vert2Z = vert3Z;
          vert3X = tx;
          vert3Y = ty;
          vert3Z = tz;

          min = this._getVertexSumInline(vert0X, vert0Y, vert0Z);
        }            

      }
    }
  }
  
  static _getVertexSumInline(vx, vy, vz) {
    return Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
  }  
   
  static _shiftFaceVertsAtOffset(offset, arr) {
    const t = arr[offset];
    arr[offset] = arr[offset + 1];
    arr[offset + 1] = arr[offset + 2];
    arr[offset + 2] = arr[offset + 3];
    arr[offset + 3] = t;
  }
}


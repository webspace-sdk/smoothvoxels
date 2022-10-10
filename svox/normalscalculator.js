class NormalsCalculator {
 
  static calculateNormals(model) {
    let tile = model.tile;
    let voxels = model.voxels;

    const { faceNameIndices, faceSkipped, faceEquidistant, faceSmooth, faceFlattened, faceClamped, faceVertX, faceVertY, faceVertZ, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceMaterials } = model;

    for (let faceOffset = 0; faceOffset < model.faceCount; faceOffset++) {
      // Compute face vertex normals
      const faceNameIndex = faceNameIndices[faceOffset];
      const faceName = SVOX._FACES[faceNameIndex];
      const skipped = faceSkipped[faceOffset];
      if (skipped) return;

      const equidistant = faceEquidistant[faceOffset];
      const flattened = faceFlattened[faceOffset];
      const clamped = faceClamped[faceOffset];

      // equidistant || (!flattened && !clamped)
      const faceSmoothValue = equidistant | (1 - (flattened | clamped));
      faceSmooth.set(faceOffset, faceSmoothValue);

      const vmidX = (faceVertX[faceOffset] + faceVertX[faceOffset + 1] + faceVertX[faceOffset + 2] + faceVertZ[faceOffset + 3]) / 4;
      const vmidY = (faceVertY[faceOffset] + faceVertY[faceOffset + 1] + faceVertY[faceOffset + 2] + faceVertY[faceOffset + 3]) / 4;
      const vmidZ = (faceVertZ[faceOffset] + faceVertZ[faceOffset + 1] + faceVertZ[faceOffset + 2] + faceVertZ[faceOffset + 3]) / 4;

      for (let v = 0; v < 4; v++) {
        const vertX = faceVertX[faceOffset + v];
        const vertXPrev = faceVertX[faceOffset + ((v + 3) % 4)];

        const vertY = faceVertY[faceOffset + v];
        const vertYPrev = faceVertY[faceOffset + ((v + 3) % 4)];

        const vertZ = faceVertZ[faceOffset + v];
        const vertZPrev = faceVertZ[faceOffset + ((v + 3) % 4)];

        let smoothX = faceVertSmoothNormalX[faceOffset + v];
        let smoothY = faceVertSmoothNormalY[faceOffset + v];
        let smoothZ = faceVertSmoothNormalZ[faceOffset + v];

        let bothX = faceVertBothNormalX[faceOffset + v];
        let bothY = faceVertBothNormalY[faceOffset + v];
        let bothZ = faceVertBothNormalZ[faceOffset + v];

        // e1 is diff between two verts
        let e1X = vertXPrev - vertX;
        let e1Y = vertYPrev - vertY;
        let e1Z = vertZPrev - vertZ;

        // e2 is diff between vert and mid
        let e2X = vmidX - vertX;
        let e2Y = vmidY - vertY;
        let e2Z = vmidZ - vertZ;

        // Normalize e1 + e2
        const e1l = Math.sqrt(e1X * e1X + e1Y * e1Y + e1Z * e1Z);
        const e2l = Math.sqrt(e2X * e2X + e2Y * e2Y + e2Z * e2Z);
        e1X /= e1l;
        e1Y /= e1l;
        e1Z /= e1l;
        e2X /= e2l;
        e2Y /= e2l;
        e2Z /= e2l;

        // Calculate cross product to start normal
        let normalX = e1Y * e2Z - e1Z * e2Y;
        let normalY = e1Z * e2X - e1X * e2Z;
        let normalZ = e1X * e2Y - e1Y * e2X;

        const voxMinXBuf = voxels.minX + 0.1;
        const voxMaxXBuf = voxels.maxX + 0.9;
        const voxMinYBuf = voxels.minY + 0.1;
        const voxMaxYBuf = voxels.maxY + 0.9;
        const voxMinZBuf = voxels.minZ + 0.1;
        const voxMaxZBuf = voxels.maxZ + 0.9;

        // In case of tiling, make normals peripendicular on edges
        if (tile) {
          if (((tile.nx && faceNameIndex === 0) || (tile.px && faceNameIndex === 1)) &&
              (vertY < voxMinYBuf || vertY > voxMaxYBuf ||
               vertZ < voxMinZBuf || vertZ > voxMaxZBuf)) { 
            normalY = 0; normalZ = 0 
          };
          if (((tile.ny && faceNameIndex === 2) || (tile.py && faceNameIndex === 3)) &&
              (vertX < voxMinXBuf || vertX > voxMaxXBuf ||
               vertZ < voxMinZBuf || vertZ > voxMaxZBuf)) { 
            normalX = 0; normalZ = 0 
          };
          if (((tile.nz && faceNameIndex === 4) || (tile.pz && faceNameIndex === 5)) &&
              (vertex.x < voxMinXBuf || vertex.x > voxMaxXBuf ||
               vertex.y < voxMinYBuf || vertex.y > voxMaxYBuf)) { 
            normalX = 0; normalY = 0 
          };
        }
        
        // Normalize normal
        const nl = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
        normalX /= nl;
        normalY /= nl;
        normalZ /= nl;

        // Store the normal for all 4 vertices (used for flat lighting)
        faceVertFlatNormalX[faceOffset + v] = normalX;
        faceVertFlatNormalY[faceOffset + v] = normalY;
        faceVertFlatNormalZ[faceOffset + v] = normalZ;

        // Average the normals weighed by angle (i.e. wide adjacent faces contribute more than narrow adjacent faces)
        // Since we're using the mid point we can be wrong on strongly deformed quads, but not noticable
        let mul = e1X * e2X + e1Y * e2Y + e1Z * e2Z;
        let angle = Math.acos(mul);

        // Always count towards the smoothNormal
        smoothX += normalX * angle;
        smoothY += normalY * angle;
        smoothZ += normalZ * angle;

        // But only add this normal to bothNormal when the face uses smooth lighting
        bothX += faceSmoothValue * (normalX * angle);
        bothY += faceSmoothValue * (normalY * angle);
        bothZ += faceSmoothValue * (normalZ * angle);

        faceVertSmoothNormalX[faceOffset + v] = smoothX;
        faceVertSmoothNormalY[faceOffset + v] = smoothY;
        faceVertSmoothNormalZ[faceOffset + v] = smoothZ;

        faceVertBothNormalX[faceOffset + v] = bothX;
        faceVertBothNormalY[faceOffset + v] = bothY;
        faceVertBothNormalZ[faceOffset + v] = bothZ;
      }
    }

    // Normalize the smooth + both vertex normals
    for (let faceOffset = 0; faceOffset < model.faceCount; faceOffset++) {
      for (let i = 0; i < 4; i++) {
        const vertOffset = faceOffset + i;
        const smoothX = faceVertSmoothNormalX[vertOffset];
        const smoothY = faceVertSmoothNormalY[vertOffset];
        const smoothZ = faceVertSmoothNormalZ[vertOffset];

        const bothX = faceVertBothNormalX[vertOffset];
        const bothY = faceVertBothNormalY[vertOffset];
        const bothZ = faceVertBothNormalZ[vertOffset];

        const sl = Math.sqrt(smoothX * smoothX + smoothY * smoothY + smoothZ * smoothZ);
        const bl = Math.sqrt(bothX * bothX + bothY * bothY + bothZ * bothZ);

        faceVertSmoothNormalX[vertOffset] = smoothX / sl;
        faceVertSmoothNormalY[vertOffset] = smoothY / sl;
        faceVertSmoothNormalZ[vertOffset] = smoothZ / sl;

        faceVertBothNormalX[vertOffset] = bothX / bl;
        faceVertBothNormalY[vertOffset] = bothY / bl;
        faceVertBothNormalZ[vertOffset] = bothZ / bl;
      }
    }

    // Use flat normals if as both normals for faces if both is not set or isn't smooth
    for (let faceOffset = 0; faceOffset < model.faceCount; faceOffset++) {
      const material = model.materials.materials[faceMaterials[faceOffset]];

      for (let i = 0; i < 4; i++) {
        const vertOffset = faceOffset + i;
      faceVertBothNormalX[vertOffset] = faceVertBothNormalX[vertOffset] === 0 ? faceVertFlatNormalX[vertOffset] : faceVertBothNormalX[vertOffset];
      faceVertBothNormalY[vertOffset] = faceVertBothNormalY[vertOffset] === 0 ? faceVertFlatNormalY[vertOffset] : faceVertBothNormalY[vertOffset];
      faceVertBothNormalZ[vertOffset] = faceVertBothNormalZ[vertOffset] === 0 ? faceVertFlatNormalZ[vertOffset] : faceVertBothNormalZ[vertOffset];

        switch (material.lighting) {
          case SVOX.SMOOTH:
            faceVertNormalX[vertOffset] = faceVertSmoothNormalX[vertOffset];
            faceVertNormalY[vertOffset] = faceVertSmoothNormalY[vertOffset];
            faceVertNormalZ[vertOffset] = faceVertSmoothNormalZ[vertOffset];
            break;
          case SVOX.BOTH:
            faceVertNormalX[vertOffset] = faceVertBothNormalX[vertOffset];
            faceVertNormalY[vertOffset] = faceVertBothNormalY[vertOffset];
            faceVertNormalZ[vertOffset] = faceVertBothNormalZ[vertOffset];
            break;
          default:
            faceVertNormalX[vertOffset] = faceVertFlatNormalX[vertOffset];
            faceVertNormalY[vertOffset] = faceVertFlatNormalY[vertOffset];
            faceVertNormalZ[vertOffset] = faceVertFlatNormalZ[vertOffset];
            break;
        }
      }
    }

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


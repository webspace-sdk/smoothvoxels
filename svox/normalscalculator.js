function almostEqual(x, y) {
  return Math.abs(x - y) < 0.0001;
}

function assertAlmostEqual(x, y) {
  if (!almostEqual(x, y))
    throw new Error("Assertion failed: " + x + " != " + y);
}

class NormalsCalculator {
 
  static calculateNormals(model) {
    let tile = model.tile;
    let voxels = model.voxels;

    const { faceNameIndices, faceSkipped, faceEquidistant, faceSmooth, faceFlattened, faceClamped, faceVertX, faceVertY, faceVertZ, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceMaterials, faceVertIndices, vertSmoothNormalX, vertSmoothNormalY, vertSmoothNormalZ, vertBothNormalX, vertBothNormalY, vertBothNormalZ } = model;

    for (let faceIndex = 0; faceIndex < model.faceCount; faceIndex++) {
      // Compute face vertex normals
      const faceNameIndex = faceNameIndices[faceIndex];
      const equidistant = faceEquidistant[faceIndex];
      const flattened = faceFlattened.get(faceIndex);
      const clamped = faceClamped.get(faceIndex);

      // equidistant || (!flattened && !clamped)
      const faceSmoothValue = equidistant | (1 - (flattened | clamped));
      faceSmooth.set(faceIndex, faceSmoothValue);

      const vert1Index = faceVertIndices[faceIndex * 4];
      const vert2Index = faceVertIndices[faceIndex * 4 + 1];
      const vert3Index = faceVertIndices[faceIndex * 4 + 2];
      const vert4Index = faceVertIndices[faceIndex * 4 + 3];

      const vmidX = (faceVertX[vert1Index] + faceVertX[vert2Index] + faceVertX[vert3Index] + faceVertX[vert4Index]) / 4;
      const vmidY = (faceVertY[vert1Index] + faceVertY[vert2Index] + faceVertY[vert3Index] + faceVertY[vert4Index]) / 4;
      const vmidZ = (faceVertZ[vert1Index] + faceVertZ[vert2Index] + faceVertZ[vert3Index] + faceVertZ[vert4Index]) / 4;

      for (let v = 0; v < 4; v++) {
        const vertIndex = faceVertIndices[faceIndex * 4 + v];
        const prevVertIndex = faceVertIndices[faceIndex * 4 + ((v + 3) % 4)];

        const vertX = faceVertX[vertIndex];
        const vertXPrev = faceVertX[prevVertIndex];

        const vertY = faceVertY[vertIndex];
        const vertYPrev = faceVertY[prevVertIndex];

        const vertZ = faceVertZ[vertIndex];
        const vertZPrev = faceVertZ[prevVertIndex];

        let smoothX = vertSmoothNormalX[vertIndex];
        let smoothY = vertSmoothNormalY[vertIndex];
        let smoothZ = vertSmoothNormalZ[vertIndex];

        let bothX = vertBothNormalX[vertIndex];
        let bothY = vertBothNormalY[vertIndex];
        let bothZ = vertBothNormalZ[vertIndex];

        // e1 is diff between two verts
        let e1X = vertXPrev - vertX;
        let e1Y = vertYPrev - vertY;
        let e1Z = vertZPrev - vertZ;

        // e2 is diff between vert and mid
        let e2X = vmidX - vertX;
        let e2Y = vmidY - vertY;
        let e2Z = vmidZ - vertZ;

        // Normalize e1 + e2
        let e1l = Math.sqrt(e1X * e1X + e1Y * e1Y + e1Z * e1Z);
        let e2l = Math.sqrt(e2X * e2X + e2Y * e2Y + e2Z * e2Z);
        e1l = e1l === 0 ? 1 : e1l;
        e2l = e2l === 0 ? 1 : e2l;

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
        let nl = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
        nl = nl === 0 ? 1 : nl;

        normalX /= nl;
        normalY /= nl;
        normalZ /= nl;

        // Store the normal for all 4 vertices (used for flat lighting)
        faceVertFlatNormalX[faceIndex * 4 + v] = normalX;
        faceVertFlatNormalY[faceIndex * 4 + v] = normalY;
        faceVertFlatNormalZ[faceIndex * 4 + v] = normalZ;

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

        vertSmoothNormalX[vertIndex] = smoothX;
        vertSmoothNormalY[vertIndex] = smoothY;
        vertSmoothNormalZ[vertIndex] = smoothZ;

        vertBothNormalX[vertIndex] = bothX;
        vertBothNormalY[vertIndex] = bothY;
        vertBothNormalZ[vertIndex] = bothZ;
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

    // Normalize the smooth + both vertex normals
    for (let vertIndex = 0; vertIndex < model.vertCount; vertIndex++) {
      const smoothX = vertSmoothNormalX[vertIndex];
      const smoothY = vertSmoothNormalY[vertIndex];
      const smoothZ = vertSmoothNormalZ[vertIndex];

      const bothX = vertBothNormalX[vertIndex];
      const bothY = vertBothNormalY[vertIndex];
      const bothZ = vertBothNormalZ[vertIndex];

      let sl = Math.sqrt(smoothX * smoothX + smoothY * smoothY + smoothZ * smoothZ);
      let bl = Math.sqrt(bothX * bothX + bothY * bothY + bothZ * bothZ);

      if (sl !== 0) {
        vertSmoothNormalX[vertIndex] = smoothX / sl;
        vertSmoothNormalY[vertIndex] = smoothY / sl;
        vertSmoothNormalZ[vertIndex] = smoothZ / sl;
      }

      if (bl !== 0) {
        vertBothNormalX[vertIndex] = bothX / bl;
        vertBothNormalY[vertIndex] = bothY / bl;
        vertBothNormalZ[vertIndex] = bothZ / bl;
      }
    }

    // Use flat normals if as both normals for faces if both is not set or isn't smooth
    for (let faceIndex = 0; faceIndex < model.faceCount; faceIndex++) {
      const material = model.materials.materials[faceMaterials[faceIndex]];
      const isSmooth = faceSmooth.get(faceIndex) === 1;

      for (let i = 0; i < 4; i++) {
        const faceVertNormalIndex = faceIndex * 4 + i;
        const vertIndex = faceVertIndices[faceIndex * 4 + i];
        faceVertSmoothNormalX[faceVertNormalIndex] = vertSmoothNormalX[vertIndex];
        faceVertSmoothNormalY[faceVertNormalIndex] = vertSmoothNormalY[vertIndex];
        faceVertSmoothNormalZ[faceVertNormalIndex] = vertSmoothNormalZ[vertIndex];

        faceVertBothNormalX[faceVertNormalIndex] = !isSmooth || vertBothNormalX[vertIndex] === 0 ? faceVertFlatNormalX[faceVertNormalIndex] : vertBothNormalX[vertIndex];
        faceVertBothNormalY[faceVertNormalIndex] = !isSmooth || vertBothNormalY[vertIndex] === 0 ? faceVertFlatNormalY[faceVertNormalIndex] : vertBothNormalY[vertIndex];
        faceVertBothNormalZ[faceVertNormalIndex] = !isSmooth || vertBothNormalZ[vertIndex] === 0 ? faceVertFlatNormalZ[faceVertNormalIndex] : vertBothNormalZ[vertIndex];

        switch (material.lighting) {
          case SVOX.SMOOTH:
            faceVertNormalX[faceVertNormalIndex] = faceVertSmoothNormalX[faceVertNormalIndex];
            faceVertNormalY[faceVertNormalIndex] = faceVertSmoothNormalY[faceVertNormalIndex];
            faceVertNormalZ[faceVertNormalIndex] = faceVertSmoothNormalZ[faceVertNormalIndex];
            break;
          case SVOX.BOTH:
            faceVertNormalX[faceVertNormalIndex] = faceVertBothNormalX[faceVertNormalIndex];
            faceVertNormalY[faceVertNormalIndex] = faceVertBothNormalY[faceVertNormalIndex];
            faceVertNormalZ[faceVertNormalIndex] = faceVertBothNormalZ[faceVertNormalIndex];
            break;
          default:
            faceVertNormalX[faceVertNormalIndex] = faceVertFlatNormalX[faceVertNormalIndex];
            faceVertNormalY[faceVertNormalIndex] = faceVertFlatNormalY[faceVertNormalIndex];
            faceVertNormalZ[faceVertNormalIndex] = faceVertFlatNormalZ[faceVertNormalIndex];
            break;
        }
      }
    }

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

    model.voxels.forEach(function calculateNormals(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;

        for (let v = 0; v < 4; v++) {
          assertAlmostEqual(face.smoothNormals[v].x, faceVertSmoothNormalX[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.smoothNormals[v].y, faceVertSmoothNormalY[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.smoothNormals[v].z, faceVertSmoothNormalZ[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.flatNormals[v].x, faceVertFlatNormalX[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.flatNormals[v].y, faceVertFlatNormalY[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.flatNormals[v].z, faceVertFlatNormalZ[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.bothNormals[v].x, faceVertBothNormalX[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.bothNormals[v].y, faceVertBothNormalY[face.faceIndex * 4 + v]);
          assertAlmostEqual(face.bothNormals[v].z, faceVertBothNormalZ[face.faceIndex * 4 + v]);
        }
      }
    });
    
    // Cleanup the vertex normals which are no longer used
    model.forEachVertex(function deleteUnusedNormals(vertex) { 
      delete vertex.smoothNormal;      
      delete vertex.bothNormal;      
    }, this);    
  }  
}


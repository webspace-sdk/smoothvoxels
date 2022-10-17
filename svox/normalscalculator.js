class NormalsCalculator {
 
  static calculateNormals(model) {
    let tile = model.tile;
    let voxels = model.voxels;

    const { faceNameIndices, faceSkipped, faceEquidistant, faceSmooth, faceFlattened, faceClamped, vertX, vertY, vertZ, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceMaterials, faceVertIndices, vertSmoothNormalX, vertSmoothNormalY, vertSmoothNormalZ, vertBothNormalX, vertBothNormalY, vertBothNormalZ } = model;

    const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(model.voxChunk.size);

    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      // Compute face vertex normals
      const faceNameIndex = faceNameIndices[faceIndex];
      const equidistant = faceEquidistant.get(faceIndex);
      const flattened = faceFlattened.get(faceIndex);
      const clamped = faceClamped.get(faceIndex);

      // equidistant || (!flattened && !clamped)
      const faceSmoothValue = equidistant | (1 - (flattened | clamped));
      faceSmooth.set(faceIndex, faceSmoothValue);

      const vert1Index = faceVertIndices[faceIndex * 4];
      const vert2Index = faceVertIndices[faceIndex * 4 + 1];
      const vert3Index = faceVertIndices[faceIndex * 4 + 2];
      const vert4Index = faceVertIndices[faceIndex * 4 + 3];

      const vmidX = (vertX[vert1Index] + vertX[vert2Index] + vertX[vert3Index] + vertX[vert4Index]) / 4;
      const vmidY = (vertY[vert1Index] + vertY[vert2Index] + vertY[vert3Index] + vertY[vert4Index]) / 4;
      const vmidZ = (vertZ[vert1Index] + vertZ[vert2Index] + vertZ[vert3Index] + vertZ[vert4Index]) / 4;

      for (let v = 0; v < 4; v++) {
        const vertIndex = faceVertIndices[faceIndex * 4 + v];
        const prevVertIndex = faceVertIndices[faceIndex * 4 + ((v + 3) % 4)];

        const vX = vertX[vertIndex];
        const vXPrev = vertX[prevVertIndex];

        const vY = vertY[vertIndex];
        const vYPrev = vertY[prevVertIndex];

        const vZ = vertZ[vertIndex];
        const vZPrev = vertZ[prevVertIndex];

        let smoothX = vertSmoothNormalX[vertIndex];
        let smoothY = vertSmoothNormalY[vertIndex];
        let smoothZ = vertSmoothNormalZ[vertIndex];

        let bothX = vertBothNormalX[vertIndex];
        let bothY = vertBothNormalY[vertIndex];
        let bothZ = vertBothNormalZ[vertIndex];

        // e1 is diff between two verts
        let e1X = vXPrev - vX;
        let e1Y = vYPrev - vY;
        let e1Z = vZPrev - vZ;

        // e2 is diff between vert and mid
        let e2X = vmidX - vX;
        let e2Y = vmidY - vY;
        let e2Z = vmidZ - vZ;

        // Normalize e1 + e2
        let e1l = Math.sqrt(e1X * e1X + e1Y * e1Y + e1Z * e1Z);
        let e2l = Math.sqrt(e2X * e2X + e2Y * e2Y + e2Z * e2Z);
        e1l = e1l === 0 ? 1 : e1l;
        e2l = e2l === 0 ? 1 : e2l;

        const e1d = 1 / e1l;
        e1X *= e1d;
        e1Y *= e1d;
        e1Z *= e1d;

        const e2d = 1 / e2l;
        e2X *= e2d;
        e2Y *= e2d;
        e2Z *= e2d;

        // Calculate cross product to start normal
        let normalX = e1Y * e2Z - e1Z * e2Y;
        let normalY = e1Z * e2X - e1X * e2Z;
        let normalZ = e1X * e2Y - e1Y * e2X;

        const voxMinXBuf = minX + 0.1;
        const voxMaxXBuf = maxX + 0.9;
        const voxMinYBuf = minY + 0.1;
        const voxMaxYBuf = maxY + 0.9;
        const voxMinZBuf = minZ + 0.1;
        const voxMaxZBuf = maxZ + 0.9;

        // In case of tiling, make normals peripendicular on edges
        if (tile) {
          if (((tile.nx && faceNameIndex === 0) || (tile.px && faceNameIndex === 1)) &&
              (vY < voxMinYBuf || vY > voxMaxYBuf ||
               vZ < voxMinZBuf || vZ > voxMaxZBuf)) { 
            normalY = 0; normalZ = 0 
          };
          if (((tile.ny && faceNameIndex === 2) || (tile.py && faceNameIndex === 3)) &&
              (vX < voxMinXBuf || vX > voxMaxXBuf ||
               vZ < voxMinZBuf || vZ > voxMaxZBuf)) { 
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

        const nd = 1 / nl;
        normalX *= nd;
        normalY *= nd;
        normalZ *= nd;

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

    // Normalize the smooth + both vertex normals
    for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
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

    const materials = model.materials.materials;

    // Use flat normals if as both normals for faces if both is not set or isn't smooth
    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      const isSmooth = faceSmooth.get(faceIndex) === 1;
      const material = materials[faceMaterials[faceIndex]];

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
  }  
}


class Simplifier {
  
  // Combine all faces which are coplanar, have the same normals, colors, etc.
  static simplify(model) {
    
    if (!model.simplify)
      return;
    
    let context1 = { model };
    let context2 = { model };
    let context3 = { model };
    let context4 = { model };

    const contexti1 = {
      filled: false,
      lastVoxelAxis1: 0,
      lastVoxelAxis2: 0,
      maxVoxelAxis3: 0,
      lastFaceIndex: 0,
    }

    const contexti2 = {
      filled: false,
      lastVoxelAxis1: 0,
      lastVoxelAxis2: 0,
      maxVoxelAxis3: 0,
      lastFaceIndex: 0,
    }

    const contexti3 = {
      filled: false,
      lastVoxelAxis1: 0,
      lastVoxelAxis2: 0,
      maxVoxelAxis3: 0,
      lastFaceIndex: 0,
    }

    const contexti4 = {
      filled: false,
      lastVoxelAxis1: 0,
      lastVoxelAxis2: 0,
      maxVoxelAxis3: 0,
      lastFaceIndex: 0,
    }

    let clearContexts = function() {
      context1.lastVoxel = null;
      context2.lastVoxel = null;
      context3.lastVoxel = null;
      context4.lastVoxel = null;      
      contexti1.filled = false;
      contexti2.filled = false;
      contexti3.filled = false;
      contexti4.filled = false;
    }

    const materials = model.materials.materials;
    const { faceMaterials, faceCulled, faceNameIndices, vertX, vertY, vertZ } = model;

    // Combine nx, px, nz and pz faces vertical up
    for (let i = model.voxelXZYFaceIndices.length - model.faceCount, l = model.voxelXZYFaceIndices.length ; i < l; i++) {
      const key = model.voxelXZYFaceIndices[i]
      const faceIndex = Number(key) & 0xFFFFFFFF;
      if (faceCulled.get(faceIndex)) continue;

      const x = Number(key >> 48n) & 0xFF;
      const z = Number(key >> 40n) & 0xFF;
      const y = Number(key >> 32n) & 0xFF;
      const faceNameIndex = faceNameIndices[faceIndex];
      const material = materials[faceMaterials[faceIndex]];

      switch (faceNameIndex) {
        case 0: // nx
            this._mergeFacesInline(material, model, contexti1, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
        case 1: // px
            this._mergeFacesInline(material, model, contexti2, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
        case 4: // nz
            this._mergeFacesInline(material, model, contexti3, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
        case 5: // pz
            this._mergeFacesInline(material, model, contexti4, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
      }
    }

    clearContexts();

    // Combine nx, px, ny and py faces from back to front
    for (let i = model.voxelXYZFaceIndices.length - model.faceCount, l = model.voxelXYZFaceIndices.length ; i < l; i++) {
      const key = model.voxelXYZFaceIndices[i]
      const faceIndex = Number(key) & 0xFFFFFFFF;
      if (faceCulled.get(faceIndex)) continue;

      const x = Number(key >> 48n) & 0xFF;
      const y = Number(key >> 40n) & 0xFF;
      const z = Number(key >> 32n) & 0xFF;
      const faceNameIndex = faceNameIndices[faceIndex];
      const material = materials[faceMaterials[faceIndex]];

      switch (faceNameIndex) {
        case 0: // nx
            this._mergeFacesInline(material, model, contexti1, faceIndex, x, y, z, vertX, vertY, vertZ, 1, 2, 3, 0);
            break;
        case 1: // px
            this._mergeFacesInline(material, model, contexti2, faceIndex, x, y, z, vertX, vertY, vertZ, 3, 0, 1, 2);
            break;
        case 2: // ny
            this._mergeFacesInline(material, model, contexti3, faceIndex, x, y, z, vertX, vertY, vertZ, 0, 1, 2, 3);
            break;
        case 3: // py
            this._mergeFacesInline(material, model, contexti4, faceIndex, x, y, z, vertX, vertY, vertZ, 2, 3, 0, 1);
            break;
      }
    }

    clearContexts();

    // Combine ny, py, nz and pz faces from left to right
    for (let i = model.voxelYZXFaceIndices.length - model.faceCount, l = model.voxelYZXFaceIndices.length ; i < l; i++) {
      const key = model.voxelYZXFaceIndices[i]
      const faceIndex = Number(key) & 0xFFFFFFFF;
      if (faceCulled.get(faceIndex)) continue;

      const y = Number(key >> 48n) & 0xFF;
      const z = Number(key >> 40n) & 0xFF;
      const x = Number(key >> 32n) & 0xFF;
      const faceNameIndex = faceNameIndices[faceIndex];
      const material = materials[faceMaterials[faceIndex]];

      switch (faceNameIndex) {
        case 2: // ny
            this._mergeFacesInline(material, model, contexti1, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0);
            break;
        case 3: // py
            this._mergeFacesInline(material, model, contexti2, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0);
            break;
        case 4: // nz
            this._mergeFacesInline(material, model, contexti3, faceIndex, y, z, x, vertY, vertZ, vertX, 3, 0, 1, 2);
            break;
        case 5: // pz
            this._mergeFacesInline(material, model, contexti4, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0);
            break;
      }
    }

    clearContexts();

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

  static _mergeFacesInline(material, model, context, faceIndex, vaxis1, vaxis2, vaxis3, axis1Arr, axis2Arr, axis3Arr, v0, v1, v2, v3) {
    const { faceCulled, faceMaterials, vertX, vertY, vertZ, faceVertIndices, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceVertColorR, faceVertColorG, faceVertColorB, faceVertUs, faceVertVs, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ } = model;

    if (context.filled && 
        context.lastVoxelAxis1 === vaxis1 && context.lastVoxelAxis2 === vaxis2 &&
        (material.simplify === true || (material.simplify === null && model.simplify === true)) && 
        faceCulled.get(faceIndex) === 0) {
        
      if (context.maxVoxelAxis3 !== vaxis3 - 1) {
        // Voxel was skipped, reset context and continue.
        context.filled = true;
        context.lastVoxelAxis1 = vaxis1;
        context.lastVoxelAxis2 = vaxis2;
        context.maxVoxelAxis3 = vaxis3;
        context.lastFaceIndex = faceIndex;
        return;
      }

      const faceOffset = faceIndex * 4;
      const lastFaceIndex = context.lastFaceIndex;
      const lastFaceOffset = lastFaceIndex * 4;

      const faceVertNormal0X = faceVertNormalX[faceOffset];
      const faceVertNormal0Y = faceVertNormalY[faceOffset];
      const faceVertNormal0Z = faceVertNormalZ[faceOffset];
      const faceVertNormal1X = faceVertNormalX[faceOffset + 1];
      const faceVertNormal1Y = faceVertNormalY[faceOffset + 1];
      const faceVertNormal1Z = faceVertNormalZ[faceOffset + 1];
      const faceVertNormal2X = faceVertNormalX[faceOffset + 2];
      const faceVertNormal2Y = faceVertNormalY[faceOffset + 2];
      const faceVertNormal2Z = faceVertNormalZ[faceOffset + 2];
      const faceVertNormal3X = faceVertNormalX[faceOffset + 3];
      const faceVertNormal3Y = faceVertNormalY[faceOffset + 3];
      const faceVertNormal3Z = faceVertNormalZ[faceOffset + 3];

      const lastFaceVertNormal0X = faceVertNormalX[lastFaceOffset];
      const lastFaceVertNormal0Y = faceVertNormalY[lastFaceOffset];
      const lastFaceVertNormal0Z = faceVertNormalZ[lastFaceOffset];
      const lastFaceVertNormal1X = faceVertNormalX[lastFaceOffset + 1];
      const lastFaceVertNormal1Y = faceVertNormalY[lastFaceOffset + 1];
      const lastFaceVertNormal1Z = faceVertNormalZ[lastFaceOffset + 1];
      const lastFaceVertNormal2X = faceVertNormalX[lastFaceOffset + 2];
      const lastFaceVertNormal2Y = faceVertNormalY[lastFaceOffset + 2];
      const lastFaceVertNormal2Z = faceVertNormalZ[lastFaceOffset + 2];
      const lastFaceVertNormal3X = faceVertNormalX[lastFaceOffset + 3];
      const lastFaceVertNormal3Y = faceVertNormalY[lastFaceOffset + 3];
      const lastFaceVertNormal3Z = faceVertNormalZ[lastFaceOffset + 3];
        
      const normalsEqual = 
          this._normalEqualsInline(faceVertNormal0X, faceVertNormal0Y, faceVertNormal0Z, lastFaceVertNormal0X, lastFaceVertNormal0Y, lastFaceVertNormal0Z) && 
          this._normalEqualsInline(faceVertNormal1X, faceVertNormal1Y, faceVertNormal1Z, lastFaceVertNormal1X, lastFaceVertNormal1Y, lastFaceVertNormal1Z) && 
          this._normalEqualsInline(faceVertNormal2X, faceVertNormal2Y, faceVertNormal2Z, lastFaceVertNormal2X, lastFaceVertNormal2Y, lastFaceVertNormal2Z) && 
          this._normalEqualsInline(faceVertNormal3X, faceVertNormal3Y, faceVertNormal3Z, lastFaceVertNormal3X, lastFaceVertNormal3Y, lastFaceVertNormal3Z);
    
      // Normals not equal, can't merge
      if (!normalsEqual) return;

      const faceVertColor0R = faceVertColorR[faceOffset];
      const faceVertColor0G = faceVertColorG[faceOffset];
      const faceVertColor0B = faceVertColorB[faceOffset];
      const faceVertColor1R = faceVertColorR[faceOffset + 1];
      const faceVertColor1G = faceVertColorG[faceOffset + 1];
      const faceVertColor1B = faceVertColorB[faceOffset + 1];
      const faceVertColor2R = faceVertColorR[faceOffset + 2];
      const faceVertColor2G = faceVertColorG[faceOffset + 2];
      const faceVertColor2B = faceVertColorB[faceOffset + 2];
      const faceVertColor3R = faceVertColorR[faceOffset + 3];
      const faceVertColor3G = faceVertColorG[faceOffset + 3];
      const faceVertColor3B = faceVertColorB[faceOffset + 3];

      const lastFaceVertColor0R = faceVertColorR[lastFaceOffset];
      const lastFaceVertColor0G = faceVertColorG[lastFaceOffset];
      const lastFaceVertColor0B = faceVertColorB[lastFaceOffset];
      const lastFaceVertColor1R = faceVertColorR[lastFaceOffset + 1];
      const lastFaceVertColor1G = faceVertColorG[lastFaceOffset + 1];
      const lastFaceVertColor1B = faceVertColorB[lastFaceOffset + 1];
      const lastFaceVertColor2R = faceVertColorR[lastFaceOffset + 2];
      const lastFaceVertColor2G = faceVertColorG[lastFaceOffset + 2];
      const lastFaceVertColor2B = faceVertColorB[lastFaceOffset + 2];
      const lastFaceVertColor3R = faceVertColorR[lastFaceOffset + 3];
      const lastFaceVertColor3G = faceVertColorG[lastFaceOffset + 3];
      const lastFaceVertColor3B = faceVertColorB[lastFaceOffset + 3];

      const colorsEqual = faceVertColor0R === lastFaceVertColor0R && faceVertColor0G === lastFaceVertColor0G && faceVertColor0B === lastFaceVertColor0B &&
        faceVertColor1R === lastFaceVertColor1R && faceVertColor1G === lastFaceVertColor1G && faceVertColor1B === lastFaceVertColor1B &&
        faceVertColor2R === lastFaceVertColor2R && faceVertColor2G === lastFaceVertColor2G && faceVertColor2B === lastFaceVertColor2B &&
        faceVertColor3R === lastFaceVertColor3R && faceVertColor3G === lastFaceVertColor3G && faceVertColor3B === lastFaceVertColor3B;

      // Colors not equal, can't merge
      if (!colorsEqual) return;

      const faceVertIndexV0 = faceVertIndices[faceOffset + v0];
      const faceVertIndexV1 = faceVertIndices[faceOffset + v1];
      const faceVertIndexV2 = faceVertIndices[faceOffset + v2];
      const faceVertIndexV3 = faceVertIndices[faceOffset + v3];

      const faceVertV0X = vertX[faceVertIndexV0];
      const faceVertV0Y = vertY[faceVertIndexV0];
      const faceVertV0Z = vertZ[faceVertIndexV0];
      const faceVertV1X = vertX[faceVertIndexV1];
      const faceVertV1Y = vertY[faceVertIndexV1];
      const faceVertV1Z = vertZ[faceVertIndexV1];
      const faceVertV2X = vertX[faceVertIndexV2];
      const faceVertV2Y = vertY[faceVertIndexV2];
      const faceVertV2Z = vertZ[faceVertIndexV2];
      const faceVertV3X = vertX[faceVertIndexV3];
      const faceVertV3Y = vertY[faceVertIndexV3];
      const faceVertV3Z = vertZ[faceVertIndexV3];

      const lastFaceVertIndexV0 = faceVertIndices[lastFaceOffset + v0];
      const lastFaceVertIndexV1 = faceVertIndices[lastFaceOffset + v1];
      const lastFaceVertIndexV2 = faceVertIndices[lastFaceOffset + v2];
      const lastFaceVertIndexV3 = faceVertIndices[lastFaceOffset + v3];

      const lastFaceVertV0X = vertX[lastFaceVertIndexV0];
      const lastFaceVertV0Y = vertY[lastFaceVertIndexV0];
      const lastFaceVertV0Z = vertZ[lastFaceVertIndexV0];
      const lastFaceVertV1X = vertX[lastFaceVertIndexV1];
      const lastFaceVertV1Y = vertY[lastFaceVertIndexV1];
      const lastFaceVertV1Z = vertZ[lastFaceVertIndexV1];
      const lastFaceVertV2X = vertX[lastFaceVertIndexV2];
      const lastFaceVertV2Y = vertY[lastFaceVertIndexV2];
      const lastFaceVertV2Z = vertZ[lastFaceVertIndexV2];
      const lastFaceVertV3X = vertX[lastFaceVertIndexV3];
      const lastFaceVertV3Y = vertY[lastFaceVertIndexV3];
      const lastFaceVertV3Z = vertZ[lastFaceVertIndexV3];

      // Calculate the ratio between the face length and the total face length (in case they are combined)
      const faceLength = Math.sqrt(
                        (faceVertV1X - faceVertV0X) * (faceVertV1X - faceVertV0X) +
                        (faceVertV1Y - faceVertV0Y) * (faceVertV1Y - faceVertV0Y) +
                        (faceVertV1Z - faceVertV0Z) * (faceVertV1Z - faceVertV0Z)
                      );
      const totalLength = Math.sqrt(
                        (faceVertV1X - lastFaceVertV0X) * (faceVertV1X - lastFaceVertV0X) +
                        (faceVertV1Y - lastFaceVertV0Y) * (faceVertV1Y - lastFaceVertV0Y) +
                        (faceVertV1Z - lastFaceVertV0Z) * (faceVertV1Z - lastFaceVertV0Z)
                      ); 

      const ratio = faceLength / totalLength;

      /* TODO JEL faceAo[0] === lastFaceAo[0] &&
      faceAo[1] === lastFaceAo[1] &&
      faceAo[2] === lastFaceAo[2] &&
      faceAo[3] === lastFaceAo[3] &&*/

      const positionsEqual = Math.abs(axis1Arr[lastFaceVertIndexV1] - (1-ratio) * axis1Arr[faceVertIndexV1] - ratio * axis1Arr[lastFaceVertIndexV0]) <= EPS &&
            Math.abs(axis2Arr[lastFaceVertIndexV1] - (1-ratio) * axis2Arr[faceVertIndexV1] - ratio * axis2Arr[lastFaceVertIndexV0]) <= EPS &&
            Math.abs(axis3Arr[lastFaceVertIndexV1] - (1-ratio) * axis3Arr[faceVertIndexV1] - ratio * axis3Arr[lastFaceVertIndexV0]) <= EPS &&
            Math.abs(axis1Arr[lastFaceVertIndexV2] - (1-ratio) * axis1Arr[faceVertIndexV2] - ratio * axis1Arr[lastFaceVertIndexV3]) <= EPS &&
            Math.abs(axis2Arr[lastFaceVertIndexV2] - (1-ratio) * axis2Arr[faceVertIndexV2] - ratio * axis2Arr[lastFaceVertIndexV3]) <= EPS &&
            Math.abs(axis3Arr[lastFaceVertIndexV2] - (1-ratio) * axis3Arr[faceVertIndexV2] - ratio * axis3Arr[lastFaceVertIndexV3]) <= EPS;

      if (!positionsEqual) return;

      //console.log("merging faces", faceIndex, lastFaceIndex, faceOffset, lastFaceOffset, v1, v2);
      // Everything checks out, so add this face to the last one
      //console.log(`MERGE: ${this._faceVerticesToString(lastFaceVertices)}`);
      //console.log(`  AND: ${this._faceVerticesToString(faceVertices)}`);
      //console.log("change", faceVertIndices[lastFaceOffset + v1], " to ", faceVertIndexV1);
      //console.log("change", faceVertIndices[lastFaceOffset + v2], " to ", faceVertIndexV2);

      faceVertIndices[lastFaceOffset + v1] = faceVertIndexV1;
      faceVertIndices[lastFaceOffset + v2] = faceVertIndexV2;

      //console.log(`   TO: ${this._faceVerticesToString(lastFaceVertices)}`);
      
      faceVertUs[lastFaceOffset + v1] = faceVertUs[faceOffset + v1];
      faceVertVs[lastFaceOffset + v1] = faceVertVs[faceOffset + v1];

      faceVertUs[lastFaceOffset + v2] = faceVertUs[faceOffset + v2];
      faceVertVs[lastFaceOffset + v2] = faceVertVs[faceOffset + v2];

      faceVertFlatNormalX[lastFaceOffset + v1] = faceVertFlatNormalX[faceOffset + v1];
      faceVertFlatNormalY[lastFaceOffset + v1] = faceVertFlatNormalY[faceOffset + v1];
      faceVertFlatNormalZ[lastFaceOffset + v1] = faceVertFlatNormalZ[faceOffset + v1];
      faceVertFlatNormalX[lastFaceOffset + v2] = faceVertFlatNormalX[faceOffset + v2];
      faceVertFlatNormalY[lastFaceOffset + v2] = faceVertFlatNormalY[faceOffset + v2];
      faceVertFlatNormalZ[lastFaceOffset + v2] = faceVertFlatNormalZ[faceOffset + v2];

      faceVertSmoothNormalX[lastFaceOffset + v1] = faceVertSmoothNormalX[faceOffset + v1];
      faceVertSmoothNormalY[lastFaceOffset + v1] = faceVertSmoothNormalY[faceOffset + v1];
      faceVertSmoothNormalZ[lastFaceOffset + v1] = faceVertSmoothNormalZ[faceOffset + v1];
      faceVertSmoothNormalX[lastFaceOffset + v2] = faceVertSmoothNormalX[faceOffset + v2];
      faceVertSmoothNormalY[lastFaceOffset + v2] = faceVertSmoothNormalY[faceOffset + v2];
      faceVertSmoothNormalZ[lastFaceOffset + v2] = faceVertSmoothNormalZ[faceOffset + v2];

      faceVertBothNormalX[lastFaceOffset + v1] = faceVertBothNormalX[faceOffset + v1];
      faceVertBothNormalY[lastFaceOffset + v1] = faceVertBothNormalY[faceOffset + v1];
      faceVertBothNormalZ[lastFaceOffset + v1] = faceVertBothNormalZ[faceOffset + v1];
      faceVertBothNormalX[lastFaceOffset + v2] = faceVertBothNormalX[faceOffset + v2];
      faceVertBothNormalY[lastFaceOffset + v2] = faceVertBothNormalY[faceOffset + v2];
      faceVertBothNormalZ[lastFaceOffset + v2] = faceVertBothNormalZ[faceOffset + v2];

      context.maxVoxelAxis3 = vaxis3;
      
      // And remove this face
      faceCulled.set(faceIndex, 1);
      return true;
    }

    context.filled = true;
    context.lastVoxelAxis1 = vaxis1;
    context.lastVoxelAxis2 = vaxis2;
    context.maxVoxelAxis3 = vaxis3;
    context.lastFaceIndex = faceIndex;
    return false;
  }
  
  
  static _normalEquals(vector1, vector2) {
    return Math.abs(vector1.x - vector2.x) < 0.01 && // Allow for minimal differences
           Math.abs(vector1.y - vector2.y) < 0.01 && 
           Math.abs(vector1.z - vector2.z) < 0.01;
  }

  static _normalEqualsInline(n1x, n1y, n1z, n2x, n2y, n2z) {
    return Math.abs(n1x - n2x) < 0.01 && // Allow for minimal differences
           Math.abs(n1y - n2y) < 0.01 && 
           Math.abs(n1z - n2z) < 0.01;
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


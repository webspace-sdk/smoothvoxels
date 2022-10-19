// Generates a clean js mesh data model, which serves as the basis for transformation in the SvoxToThreeMeshConverter or the SvoxToAFrameConverter
class SvoxMeshGenerator {

  static generate(model, buffers) {
    let t0 = performance.now();
    model.prepareForRender(buffers);
    console.log("prep for render: " + (performance.now() - t0) + "ms");
  
    const { nonCulledFaceCount } = model;

    let mesh = {
      materials: [],
      groups: [],
      indices: Array(nonCulledFaceCount * 6),
      indicesIndex: 0,
      positions: new Float32Array(nonCulledFaceCount * 4 * 3),
      positionIndex: 0,
      normals: new Float32Array(nonCulledFaceCount * 4 * 3),
      normalIndex: 0,
      colors: new Float32Array(nonCulledFaceCount * 4 * 3),
      colorIndex: 0,
      uvs: new Float32Array(nonCulledFaceCount * 4 * 2),
      uvIndex: 0,
      data: null
    };
    
    t0 = performance.now();
    model.materials.baseMaterials.forEach(function(material) {
      //if (material.colorUsageCount > 0) {
        material.index = mesh.materials.length;
        mesh.materials.push(SvoxMeshGenerator._generateMaterial(material, model));
      //}
    }, this);
    console.log("generate materials: " + (performance.now() - t0) + "ms");

    // TODO JEL does this matter?
    // if (model.data) {
    //   mesh.data = [];
    //   for (let d=0; d<model.data.length; d++) {
    //     mesh.data.push( { name: model.data[d].name,
    //                       width:model.data[d].values.length,
    //                       values: [] } );
    //   }
    // }
    
    t0 = performance.now();
    SvoxMeshGenerator._generateAll(model, mesh, buffers);
    console.log("Mesh generation took " + (performance.now() - t0) + " ms");
    
    return mesh;
  }
  
  static _generateMaterial(definition, modeldefinition) {
    let ao = definition.ao || modeldefinition.ao;
    
    let material = { 
        type:              definition.type,
        roughness:         definition.roughness,
        metalness:         definition.metalness,
        opacity:           definition.opacity,
        alphaTest:         definition.alphaTest,
        transparent:       definition.isTransparent,
        refractionRatio:   definition.refractionRatio,
        wireframe:         definition.wireframe || modeldefinition.wireframe,
        fog:               definition.fog,      
        vertexColors:      true,
      
        // No back, faces are reverse instead because GLTF does not support back faces
        side:              definition.side === SVOX.DOUBLE ? SVOX.DOUBLE : SVOX.FRONT

      };

    if (definition.type !== SVOX.MATNORMAL) {
      // All materials except normal material support colors
      
      // TODO: When none of the materials needs VertexColors, we should just set the material colors instead of using vertex colors.
      //if (definition.colorCount === 1 && !definition.aoActive && !modeldefinition.ao && modeldefinition.lights.length === 0) {
      //  material.vertexColors = 'NoColors';
      //  material.color = definition.colors[0].toString();
      //}
      //else {
      //  material.vertexColors = 'VertexColors';
      //}
      material.color = "#FFF";
    }

    if (definition.emissive) {
      material.emissive = definition.emissive.color.toString();
      material.emissiveIntensity = definition.emissive.intensity;
    }
    
    if (definition.map) {
      material.map = { image:    definition.map.image, 
                       uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                       vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                       uoffset:  definition.mapTransform.uoffset, 
                       voffset:  definition.mapTransform.voffset,
                       rotation: definition.mapTransform.rotation };
    }
    
    if (definition.normalMap) {
      material.normalMap = { image:    definition.normalMap.image, 
                             uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                             vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                             uoffset:  definition.mapTransform.uoffset, 
                             voffset:  definition.mapTransform.voffset,
                             rotation: definition.mapTransform.rotation };
    }
    
    if (definition.roughnessMap) {
      material.roughnessMap = { image:    definition.roughnessMap.image, 
                                uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                                vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                                uoffset:  definition.mapTransform.uoffset, 
                                voffset:  definition.mapTransform.voffset,
                                rotation: definition.mapTransform.rotation };
    }

    if (definition.metalnessMap) {
      material.metalnessMap = { image:    definition.metalnessMap.image, 
                                uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                                vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                                uoffset:  definition.mapTransform.uoffset, 
                                voffset:  definition.mapTransform.voffset,
                                rotation: definition.mapTransform.rotation };
    }

    if (definition.emissiveMap) {
      material.emissiveMap = { image:    definition.emissiveMap.image, 
                               uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                               vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                               uoffset:  definition.mapTransform.uoffset, 
                               voffset:  definition.mapTransform.voffset,
                               rotation: definition.mapTransform.rotation };
    }

    if (definition.matcap) {
      material.matcap = { image: definition.matcap.image };
    }

    if (definition.reflectionMap) {
      material.reflectionMap = { image: definition.reflectionMap.image };
    }
    
    if (definition.refractionMap) {
      material.refractionMap = { image: definition.refractionMap.image };
    }
    
    return material;
  }
  
  static _generateAll(model, mesh, buffers) {
    const materials = model.materials.materials;
    const { faceMaterials, faceCulled } = buffers;

    // Add all vertices to the geometry     
    model.materials.baseMaterials.forEach(function(baseMaterial) {
      let start = mesh.indicesIndex;

      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]];

        // Check for material match and face culling from simplifier
        if (material._baseMaterial === baseMaterial && faceCulled.get(faceIndex) === 0) {
          SvoxMeshGenerator._generateFace(model, buffers, faceIndex, mesh);
        }
      }
      
      // Add the group for this material
      let end = mesh.indicesIndex;
      mesh.groups.push( { start:start, count: (end-start), materialIndex:baseMaterial.index } );       
    }, this);       
  }

  static _generateVoxel(model, voxel, mesh) {
    for (let f = 0; f < SVOX._FACES.length; f++) {
      let face = voxel.faces[SVOX._FACES[f]];
      if (face && !face.skipped) {
      }  
    }
  }

  static _generateFace(model, buffers, faceIndex, mesh) {
    const { faceVertIndices, faceVertNormalX, faceVertNormalY, faceVertNormalZ, vertX, vertY, vertZ, faceVertColorR, faceVertColorG, faceVertColorB, faceVertUs, faceVertVs, faceMaterials, faceSmooth } = buffers;

    const materials = model.materials.materials;
    const material = materials[faceMaterials[faceIndex]];

    const vert0Index = faceVertIndices[faceIndex * 4];
    const vert1Index = faceVertIndices[faceIndex * 4 + 1];
    const vert2Index = faceVertIndices[faceIndex * 4 + 2];
    const vert3Index = faceVertIndices[faceIndex * 4 + 3];

    let vert0X = vertX[vert0Index];
    let vert0Y = vertY[vert0Index];
    let vert0Z = vertZ[vert0Index];
    const vert1X = vertX[vert1Index];
    const vert1Y = vertY[vert1Index];
    const vert1Z = vertZ[vert1Index];
    let vert2X = vertX[vert2Index];
    let vert2Y = vertY[vert2Index];
    let vert2Z = vertZ[vert2Index];
    const vert3X = vertX[vert3Index];
    const vert3Y = vertY[vert3Index];
    const vert3Z = vertZ[vert3Index];

    let norm0X = faceVertNormalX[faceIndex * 4];
    let norm0Y = faceVertNormalY[faceIndex * 4];
    let norm0Z = faceVertNormalZ[faceIndex * 4];
    const norm1X = faceVertNormalX[faceIndex * 4 + 1];
    const norm1Y = faceVertNormalY[faceIndex * 4 + 1];
    const norm1Z = faceVertNormalZ[faceIndex * 4 + 1];
    let norm2X = faceVertNormalX[faceIndex * 4 + 2];
    let norm2Y = faceVertNormalY[faceIndex * 4 + 2];
    let norm2Z = faceVertNormalZ[faceIndex * 4 + 2];
    const norm3X = faceVertNormalX[faceIndex * 4 + 3];
    const norm3Y = faceVertNormalY[faceIndex * 4 + 3];
    const norm3Z = faceVertNormalZ[faceIndex * 4 + 3];

    let col0R = faceVertColorR[faceIndex * 4];
    let col0G = faceVertColorG[faceIndex * 4];
    let col0B = faceVertColorB[faceIndex * 4];
    let col1R = faceVertColorR[faceIndex * 4 + 1];
    let col1G = faceVertColorG[faceIndex * 4 + 1];
    let col1B = faceVertColorB[faceIndex * 4 + 1];
    let col2R = faceVertColorR[faceIndex * 4 + 2];
    let col2G = faceVertColorG[faceIndex * 4 + 2];
    let col2B = faceVertColorB[faceIndex * 4 + 2];
    let col3R = faceVertColorR[faceIndex * 4 + 3];
    let col3G = faceVertColorG[faceIndex * 4 + 3];
    let col3B = faceVertColorB[faceIndex * 4 + 3];

    let uv0U = faceVertUs[faceIndex * 4];
    let uv0V = faceVertVs[faceIndex * 4];
    let uv1U = faceVertUs[faceIndex * 4 + 1];
    let uv1V = faceVertVs[faceIndex * 4 + 1];
    let uv2U = faceVertUs[faceIndex * 4 + 2];
    let uv2V = faceVertVs[faceIndex * 4 + 2];
    let uv3U = faceVertUs[faceIndex * 4 + 3];
    let uv3V = faceVertVs[faceIndex * 4 + 3];

    if (material.side === SVOX.BACK) {
      let swapX, swapY, swapZ;

      swapX = vert0X; swapY = vert0Y; swapZ = vert0Z;
      vert0X = vert2X; vert0Y = vert2Y; vert0Z = vert2Z;
      vert2X = swapX; vert2Y = swapY; vert2Z = swapZ;

      swapX = norm0X; swapY = norm0Y; swapZ = norm0Z;
      norm0X = norm2X; norm0Y = norm2Y; norm0Z = norm2Z;
      norm2X = swapX; norm2Y = swapY; norm2Z = swapZ;

      swapX = color0R; swapY = color0G; swapZ = color0B;
      color0R = color2R; color0G = color2G; color0B = color2B;
      color2R = swapX; color2G = swapY; color2B = swapZ;

      swapX = uv0U; swapY = uv0V;
      uv0U = uv2U; uv0V = uv2V;
      uv2U = swapX; uv2V = swapY;
    }

    const iIdx = mesh.indicesIndex;
    const indices = mesh.indices;

    const pIdx = mesh.positionIndex;
    const positions = mesh.positions;
    const baseIndex = iIdx === 0 ? 0 : (mesh.indices[iIdx - 2] + 1); // vert 3 of last triangle is max index

    // Face 1
    indices[iIdx] = baseIndex + 2;
    indices[iIdx + 1] = baseIndex + 1;
    indices[iIdx + 2] = baseIndex + 0;

    // Face 2
    indices[iIdx + 3] = baseIndex + 0;
    indices[iIdx + 4] = baseIndex + 3;
    indices[iIdx + 5] = baseIndex + 2;

    mesh.indicesIndex += 6;
        
    positions[pIdx] = vert0X;
    positions[pIdx+1] = vert0Y;
    positions[pIdx+2] = vert0Z;
    positions[pIdx+3] = vert1X;
    positions[pIdx+4] = vert1Y;
    positions[pIdx+5] = vert1Z;
    positions[pIdx+6] = vert2X;
    positions[pIdx+7] = vert2Y;
    positions[pIdx+8] = vert2Z;
    positions[pIdx+9] = vert3X;
    positions[pIdx+10] = vert3Y;
    positions[pIdx+11] = vert3Z;

    mesh.positionIndex += 12;

    const nIdx = mesh.normalIndex;
    const normals = mesh.normals;
    const smooth = faceSmooth.get(faceIndex) === 1;
    
    if (material.lighting === SVOX.SMOOTH || (material.lighting === SVOX.BOTH && smooth)) {
      normals[nIdx] = norm0X;
      normals[nIdx+1] = norm0Y;
      normals[nIdx+2] = norm0Z;
      normals[nIdx+3] = norm1X;
      normals[nIdx+4] = norm1Y;
      normals[nIdx+5] = norm1Z;
      normals[nIdx+6] = norm2X;
      normals[nIdx+7] = norm2Y;
      normals[nIdx+8] = norm2Z;
      normals[nIdx+9] = norm3X;
      normals[nIdx+10] = norm3Y;
      normals[nIdx+11] = norm3Z;
    } else {
      // Average the normals to get the flat normals
      let normFace1X = norm2X + norm1X + norm0X;
      let normFace1Y = norm2Y + norm1Y + norm0Y;
      let normFace1Z = norm2Z + norm1Z + norm0Z;
      let normFace2X = norm0X + norm3X + norm2X;
      let normFace2Y = norm0Y + norm3Y + norm2Y;
      let normFace2Z = norm0Z + norm3Z + norm2Z;

      const normFace1Length = Math.sqrt(normFace1X*normFace1X + normFace1Y*normFace1Y + normFace1Z*normFace1Z);
      const normFace2Length = Math.sqrt(normFace2X*normFace2X + normFace2Y*normFace2Y + normFace2Z*normFace2Z);

      const normFace1LengthInv = 1 / normFace1Length;
      const normFace2LengthInv = 1 / normFace2Length;

      normFace1X *= normFace1LengthInv;
      normFace1Y *= normFace1LengthInv;
      normFace1Z *= normFace1LengthInv;
      normFace2X *= normFace2LengthInv;
      normFace2Y *= normFace2LengthInv;
      normFace2Z *= normFace2LengthInv;

      // Average the normals to get the flat normals
      if (material.lighting === SVOX.QUAD) {
        const combinedFaceLength = Math.sqrt(normFace1X*normFace1X + normFace1Y*normFace1Y + normFace1Z*normFace1Z) + Math.sqrt(normFace2X*normFace2X + normFace2Y*normFace2Y + normFace2Z*normFace2Z);
        const combinedFaceLengthInv = 1 / combinedFaceLength;
        
        normFace1X = normFace2X = (normFace1X + normFace2X) * combinedFaceLengthInv;
        normFace1Y = normFace2Y = (normFace1Y + normFace2Y) * combinedFaceLengthInv;
        normFace1Z = normFace2Z = (normFace1Z + normFace2Z) * combinedFaceLengthInv;
      }

      // Note: because of indices, this code when migrated has the wrong FLAT norm for the first and last vert of face 2
      // For now, just use QUAD
      normals[nIdx] = normFace1X;
      normals[nIdx+1] = normFace1Y;
      normals[nIdx+2] = normFace1Z;
      normals[nIdx+3] = normFace1X;
      normals[nIdx+4] = normFace1Y;
      normals[nIdx+5] = normFace1Z;
      normals[nIdx+6] = normFace1X;
      normals[nIdx+7] = normFace1Y;
      normals[nIdx+8] = normFace1Z;
      normals[nIdx+9] = normFace2X;
      normals[nIdx+10] = normFace2Y;
      normals[nIdx+11] = normFace2Z;
      
      // Code from non-indexed vertices:
      // Face 1
      //normals[nIdx] = normFace1X; // index + 2
      //normals[nIdx+1] = normFace1Y;
      //normals[nIdx+2] = normFace1Z;
      //normals[nIdx+3] = normFace1X; // index + 1
      //normals[nIdx+4] = normFace1Y;
      //normals[nIdx+5] = normFace1Z;
      //normals[nIdx+6] = normFace1X; // index + 0
      //normals[nIdx+7] = normFace1Y;
      //normals[nIdx+8] = normFace1Z;

      //// Face 2
      //normals[nIdx+9] = normFace2X; // index + 0
      //normals[nIdx+10] = normFace2Y;
      //normals[nIdx+11] = normFace2Z;
      //normals[nIdx+12] = normFace2X; // index + 3
      //normals[nIdx+13] = normFace2Y;
      //normals[nIdx+14] = normFace2Z;
      //normals[nIdx+15] = normFace2X; // index + 2
      //normals[nIdx+16] = normFace2Y;
      //normals[nIdx+17] = normFace2Z;
    }

    mesh.normalIndex += 12;

    const colIdx = mesh.colorIndex;
    const colors = mesh.colors;

    if (SVOX.clampColors) {
      // Normalize colors
      const col0Length = Math.sqrt(col0R*col0R + col0G*col0G + col0B*col0B);
      const col1Length = Math.sqrt(col1R*col1R + col1G*col1G + col1B*col1B);
      const col2Length = Math.sqrt(col2R*col2R + col2G*col2G + col2B*col2B);
      const col3Length = Math.sqrt(col3R*col3R + col3G*col3G + col3B*col3B);

      if (col0Length > 0) {
        const d = 1 / col0Length;
        col0R *= d;
        col0G *= d;
        col0B *= d;
      }

      if (col1Length > 0) {
        const d = 1 / col1Length;
        col1R *= d;
        col1G *= d;
        col1B *= d;
      }

      if (col2Length > 0) {
        const d = 1 / col2Length
        col2R *= d;
        col2G *= d;
        col2B *= d;
      }

      if (col3Length > 0) {
        const d = 1 / col3Length
        col3R *= d;
        col3G *= d;
        col3B *= d;
      }
    }

    // Face 1
    colors[colIdx] = col0R;
    colors[colIdx+1] = col0G;
    colors[colIdx+2] = col0B;
    colors[colIdx+3] = col1R;
    colors[colIdx+4] = col1G;
    colors[colIdx+5] = col1B;
    colors[colIdx+6] = col2R;
    colors[colIdx+7] = col2G;
    colors[colIdx+8] = col2B;
    colors[colIdx+9] = col3R;
    colors[colIdx+10] = col3G;
    colors[colIdx+11] = col3B;

    mesh.colorIndex += 12;

    const uvIdx = mesh.uvIndex;
    const uvs = mesh.uvs;

    uvs[uvIdx] = uv0U;
    uvs[uvIdx+1] = uv0V;
    uvs[uvIdx+2] = uv1U;
    uvs[uvIdx+3] = uv1V;
    uvs[uvIdx+4] = uv2U;
    uvs[uvIdx+5] = uv2V;
    uvs[uvIdx+6] = uv3U;
    uvs[uvIdx+7] = uv3V;

    mesh.uvIndex += 8;

    //if (mesh.data) {
    //  let data = voxel.material.data || model.data;
    //  for (let vertex=0;vertex<6;vertex++) {
    //    for (let d=0;d<data.length;d++) {
    //      for (let v=0;v<data[d].values.length;v++) {
    //        mesh.data[d].values.push(data[d].values[v]);
    //      }
    //    }
    //  }
    //}
  }

  static _normalize(v) {
    let l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    v.x /= l; 
    v.y /= l; 
    v.z /= l;
    return v;
  } 
}


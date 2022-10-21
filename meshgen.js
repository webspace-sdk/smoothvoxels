import { DOUBLE, FRONT, MATNORMAL, BACK, SMOOTH, BOTH, QUAD } from './constants'
const vertCache = new Map()

// Generates a clean js mesh data model, which serves as the basis for transformation in the SvoxToThreeMeshConverter or the SvoxToAFrameConverter
export default class SvoxMeshGenerator {
  static generate (model, buffers) {
    // let t0 = performance.now()
    model.prepareForRender(buffers)
    // console.log('prep for render: ' + (performance.now() - t0) + 'ms')

    const mesh = {
      materials: [],
      groups: [],
      indices: [],
      numVerts: 0,
      positions: [],
      normals: [],
      colors: [],
      uvs: [],
      data: null
    }

    // t0 = performance.now()
    model.materials.baseMaterials.forEach(function (material) {
      // if (material.colorUsageCount > 0) {
      material.index = mesh.materials.length
      mesh.materials.push(SvoxMeshGenerator._generateMaterial(material, model))
      // }
    }, this)
    // console.log('generate materials: ' + (performance.now() - t0) + 'ms')

    // TODO JEL does this matter?
    // if (model.data) {
    //   mesh.data = [];
    //   for (let d=0; d<model.data.length; d++) {
    //     mesh.data.push( { name: model.data[d].name,
    //                       width:model.data[d].values.length,
    //                       values: [] } );
    //   }
    // }

    // t0 = performance.now()
    vertCache.clear()
    SvoxMeshGenerator._generateAll(model, mesh, buffers)
    // console.log('Mesh generation took ' + (performance.now() - t0) + ' ms')

    return mesh
  }

  static _generateMaterial (definition, modeldefinition) {
    const material = {
      type: definition.type,
      roughness: definition.roughness,
      metalness: definition.metalness,
      opacity: definition.opacity,
      alphaTest: definition.alphaTest,
      transparent: definition.isTransparent,
      refractionRatio: definition.refractionRatio,
      wireframe: definition.wireframe || modeldefinition.wireframe,
      fog: definition.fog,
      vertexColors: true,

      // No back, faces are reverse instead because GLTF does not support back faces
      side: definition.side === DOUBLE ? DOUBLE : FRONT

    }

    if (definition.type !== MATNORMAL) {
      // All materials except normal material support colors

      // TODO: When none of the materials needs VertexColors, we should just set the material colors instead of using vertex colors.
      // if (definition.colorCount === 1 && !definition.aoActive && !modeldefinition.ao && modeldefinition.lights.length === 0) {
      //  material.vertexColors = 'NoColors';
      //  material.color = definition.colors[0].toString();
      // }
      // else {
      //  material.vertexColors = 'VertexColors';
      // }
      material.color = '#FFF'
    }

    if (definition.emissive) {
      material.emissive = definition.emissive.color.toString()
      material.emissiveIntensity = definition.emissive.intensity
    }

    if (definition.map) {
      material.map = {
        image: definition.map.image,
        uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
        vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
        uoffset: definition.mapTransform.uoffset,
        voffset: definition.mapTransform.voffset,
        rotation: definition.mapTransform.rotation
      }
    }

    if (definition.normalMap) {
      material.normalMap = {
        image: definition.normalMap.image,
        uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
        vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
        uoffset: definition.mapTransform.uoffset,
        voffset: definition.mapTransform.voffset,
        rotation: definition.mapTransform.rotation
      }
    }

    if (definition.roughnessMap) {
      material.roughnessMap = {
        image: definition.roughnessMap.image,
        uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
        vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
        uoffset: definition.mapTransform.uoffset,
        voffset: definition.mapTransform.voffset,
        rotation: definition.mapTransform.rotation
      }
    }

    if (definition.metalnessMap) {
      material.metalnessMap = {
        image: definition.metalnessMap.image,
        uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
        vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
        uoffset: definition.mapTransform.uoffset,
        voffset: definition.mapTransform.voffset,
        rotation: definition.mapTransform.rotation
      }
    }

    if (definition.emissiveMap) {
      material.emissiveMap = {
        image: definition.emissiveMap.image,
        uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
        vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
        uoffset: definition.mapTransform.uoffset,
        voffset: definition.mapTransform.voffset,
        rotation: definition.mapTransform.rotation
      }
    }

    if (definition.matcap) {
      material.matcap = { image: definition.matcap.image }
    }

    if (definition.reflectionMap) {
      material.reflectionMap = { image: definition.reflectionMap.image }
    }

    if (definition.refractionMap) {
      material.refractionMap = { image: definition.refractionMap.image }
    }

    return material
  }

  static _generateAll (model, mesh, buffers) {
    const materials = model.materials.materials
    const { faceMaterials, faceCulled } = buffers

    // Add all vertices to the geometry
    model.materials.baseMaterials.forEach(function (baseMaterial) {
      const start = mesh.indicesIndex

      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]]

        // Check for material match and face culling from simplifier
        if (material._baseMaterial === baseMaterial && faceCulled.get(faceIndex) === 0) {
          SvoxMeshGenerator._generateFace(model, buffers, faceIndex, mesh)
        }
      }

      // Add the group for this material
      const end = mesh.indicesIndex

      mesh.groups.push({ start, count: (end - start), materialIndex: baseMaterial.index })
    }, this)
  }

  static _generateFace (model, buffers, faceIndex, mesh) {
    const { faceVertIndices, faceVertNormalX, faceVertNormalY, faceVertNormalZ, vertX, vertY, vertZ, faceVertColorR, faceVertColorG, faceVertColorB, faceVertUs, faceVertVs, faceMaterials, faceSmooth } = buffers

    const materials = model.materials.materials
    const material = materials[faceMaterials[faceIndex]]

    const vert0Index = faceVertIndices[faceIndex * 4]
    const vert1Index = faceVertIndices[faceIndex * 4 + 1]
    const vert2Index = faceVertIndices[faceIndex * 4 + 2]
    const vert3Index = faceVertIndices[faceIndex * 4 + 3]

    let vert0X = vertX[vert0Index]
    let vert0Y = vertY[vert0Index]
    let vert0Z = vertZ[vert0Index]
    const vert1X = vertX[vert1Index]
    const vert1Y = vertY[vert1Index]
    const vert1Z = vertZ[vert1Index]
    let vert2X = vertX[vert2Index]
    let vert2Y = vertY[vert2Index]
    let vert2Z = vertZ[vert2Index]
    const vert3X = vertX[vert3Index]
    const vert3Y = vertY[vert3Index]
    const vert3Z = vertZ[vert3Index]

    let norm0X = faceVertNormalX[faceIndex * 4]
    let norm0Y = faceVertNormalY[faceIndex * 4]
    let norm0Z = faceVertNormalZ[faceIndex * 4]
    let norm1X = faceVertNormalX[faceIndex * 4 + 1]
    let norm1Y = faceVertNormalY[faceIndex * 4 + 1]
    let norm1Z = faceVertNormalZ[faceIndex * 4 + 1]
    let norm2X = faceVertNormalX[faceIndex * 4 + 2]
    let norm2Y = faceVertNormalY[faceIndex * 4 + 2]
    let norm2Z = faceVertNormalZ[faceIndex * 4 + 2]
    let norm3X = faceVertNormalX[faceIndex * 4 + 3]
    let norm3Y = faceVertNormalY[faceIndex * 4 + 3]
    let norm3Z = faceVertNormalZ[faceIndex * 4 + 3]

    let col0R = faceVertColorR[faceIndex * 4]
    let col0G = faceVertColorG[faceIndex * 4]
    let col0B = faceVertColorB[faceIndex * 4]
    const col1R = faceVertColorR[faceIndex * 4 + 1]
    const col1G = faceVertColorG[faceIndex * 4 + 1]
    const col1B = faceVertColorB[faceIndex * 4 + 1]
    let col2R = faceVertColorR[faceIndex * 4 + 2]
    let col2G = faceVertColorG[faceIndex * 4 + 2]
    let col2B = faceVertColorB[faceIndex * 4 + 2]
    const col3R = faceVertColorR[faceIndex * 4 + 3]
    const col3G = faceVertColorG[faceIndex * 4 + 3]
    const col3B = faceVertColorB[faceIndex * 4 + 3]

    let uv0U = faceVertUs[faceIndex * 4]
    let uv0V = faceVertVs[faceIndex * 4]
    const uv1U = faceVertUs[faceIndex * 4 + 1]
    const uv1V = faceVertVs[faceIndex * 4 + 1]
    let uv2U = faceVertUs[faceIndex * 4 + 2]
    let uv2V = faceVertVs[faceIndex * 4 + 2]
    const uv3U = faceVertUs[faceIndex * 4 + 3]
    const uv3V = faceVertVs[faceIndex * 4 + 3]

    if (material.side === BACK) {
      let swapX, swapY, swapZ

      swapX = vert0X; swapY = vert0Y; swapZ = vert0Z
      vert0X = vert2X; vert0Y = vert2Y; vert0Z = vert2Z
      vert2X = swapX; vert2Y = swapY; vert2Z = swapZ

      swapX = norm0X; swapY = norm0Y; swapZ = norm0Z
      norm0X = norm2X; norm0Y = norm2Y; norm0Z = norm2Z
      norm2X = swapX; norm2Y = swapY; norm2Z = swapZ

      swapX = col0R; swapY = col0G; swapZ = col0B
      col0R = col2R; col0G = col2G; col0B = col2B
      col2R = swapX; col2G = swapY; col2B = swapZ

      swapX = uv0U; swapY = uv0V
      uv0U = uv2U; uv0V = uv2V
      uv2U = swapX; uv2V = swapY
    }

    const indices = mesh.indices

    const smooth = faceSmooth.get(faceIndex) === 1

    const positions = mesh.positions
    const normals = mesh.normals
    const colors = mesh.colors
    const uvs = mesh.uvs

    if (!(material.lighting === SMOOTH || (material.lighting === BOTH && smooth))) {
      // Average the normals to get the flat normals
      let normFace1X = norm2X + norm1X + norm0X
      let normFace1Y = norm2Y + norm1Y + norm0Y
      let normFace1Z = norm2Z + norm1Z + norm0Z
      let normFace2X = norm0X + norm3X + norm2X
      let normFace2Y = norm0Y + norm3Y + norm2Y
      let normFace2Z = norm0Z + norm3Z + norm2Z

      const normFace1Length = Math.sqrt(normFace1X * normFace1X + normFace1Y * normFace1Y + normFace1Z * normFace1Z)
      const normFace2Length = Math.sqrt(normFace2X * normFace2X + normFace2Y * normFace2Y + normFace2Z * normFace2Z)

      const normFace1LengthInv = 1 / normFace1Length
      const normFace2LengthInv = 1 / normFace2Length

      normFace1X *= normFace1LengthInv
      normFace1Y *= normFace1LengthInv
      normFace1Z *= normFace1LengthInv
      normFace2X *= normFace2LengthInv
      normFace2Y *= normFace2LengthInv
      normFace2Z *= normFace2LengthInv

      // Average the normals to get the flat normals
      if (material.lighting === QUAD) {
        const combinedFaceLength = Math.sqrt(normFace1X * normFace1X + normFace1Y * normFace1Y + normFace1Z * normFace1Z) + Math.sqrt(normFace2X * normFace2X + normFace2Y * normFace2Y + normFace2Z * normFace2Z)
        const combinedFaceLengthInv = 1 / combinedFaceLength

        normFace1X = normFace2X = (normFace1X + normFace2X) * combinedFaceLengthInv
        normFace1Y = normFace2Y = (normFace1Y + normFace2Y) * combinedFaceLengthInv
        normFace1Z = normFace2Z = (normFace1Z + normFace2Z) * combinedFaceLengthInv
      }

      // Note: because of indices, this code when migrated has the wrong FLAT norm for the first and last vert of face 2
      // For now, just use QUAD
      norm0X = normFace1X
      norm0Y = normFace1Y
      norm0Z = normFace1Z
      norm1X = normFace1X
      norm1Y = normFace1Y
      norm1Z = normFace1Z
      norm2X = normFace1X
      norm2Y = normFace1Y
      norm2Z = normFace1Z
      norm3X = normFace2X
      norm3Y = normFace2Y
      norm3Z = normFace2Z
    }

    // Key is a composition of vert x, y, z, normal, colors, and uv
    const vert0Key = vert0X * 3 + vert0Y * 13 + vert0Z * 23 + norm0X * 37 + norm0Y * 41 + norm0Z * 59 + col0R * 61 + col0G * 83 + col0B * 89 + uv0U * 98 + uv0V * 103
    const vert1Key = vert1X * 3 + vert1Y * 13 + vert1Z * 23 + norm1X * 37 + norm1Y * 41 + norm1Z * 59 + col1R * 61 + col1G * 83 + col1B * 89 + uv1U * 98 + uv1V * 103
    const vert2Key = vert2X * 3 + vert2Y * 13 + vert2Z * 23 + norm2X * 37 + norm2Y * 41 + norm2Z * 59 + col2R * 61 + col2G * 83 + col2B * 89 + uv2U * 98 + uv2V * 103
    const vert3Key = vert3X * 3 + vert3Y * 13 + vert3Z * 23 + norm3X * 37 + norm3Y * 41 + norm3Z * 59 + col3R * 61 + col3G * 83 + col3B * 89 + uv3U * 98 + uv3V * 103

    const hasVert0 = false // vertCache.has(vert0Key)
    const hasVert1 = false // vertCache.has(vert1Key)
    const hasVert2 = false // vertCache.has(vert2Key)
    const hasVert3 = false // vertCache.has(vert3Key)

    let vert0MeshIndex, vert1MeshIndex, vert2MeshIndex, vert3MeshIndex
    let newVertIndex = mesh.numVerts

    if (hasVert0) {
      vert0MeshIndex = vertCache.get(vert0Key)
    } else {
      vert0MeshIndex = newVertIndex++
      positions.push(vert0X)
      positions.push(vert0Y)
      positions.push(vert0Z)
      normals.push(norm0X)
      normals.push(norm0Y)
      normals.push(norm0Z)
      colors.push(col0R)
      colors.push(col0G)
      colors.push(col0B)
      uvs.push(uv0U)
      uvs.push(uv0V)
      vertCache.set(vert0Key, vert0MeshIndex)
    }

    if (hasVert1) {
      vert1MeshIndex = vertCache.get(vert1Key)
    } else {
      vert1MeshIndex = newVertIndex++
      positions.push(vert1X)
      positions.push(vert1Y)
      positions.push(vert1Z)
      normals.push(norm1X)
      normals.push(norm1Y)
      normals.push(norm1Z)
      colors.push(col1R)
      colors.push(col1G)
      colors.push(col1B)
      uvs.push(uv1U)
      uvs.push(uv1V)
      vertCache.set(vert1Key, vert1MeshIndex)
    }

    if (hasVert2) {
      vert2MeshIndex = vertCache.get(vert2Key)
    } else {
      vert2MeshIndex = newVertIndex++
      positions.push(vert2X)
      positions.push(vert2Y)
      positions.push(vert2Z)
      normals.push(norm2X)
      normals.push(norm2Y)
      normals.push(norm2Z)
      colors.push(col2R)
      colors.push(col2G)
      colors.push(col2B)
      uvs.push(uv2U)
      uvs.push(uv2V)
      vertCache.set(vert2Key, vert2MeshIndex)
    }

    if (hasVert3) {
      vert3MeshIndex = vertCache.get(vert3Key)
    } else {
      vert3MeshIndex = newVertIndex++
      positions.push(vert3X)
      positions.push(vert3Y)
      positions.push(vert3Z)
      normals.push(norm3X)
      normals.push(norm3Y)
      normals.push(norm3Z)
      colors.push(col3R)
      colors.push(col3G)
      colors.push(col3B)
      uvs.push(uv3U)
      uvs.push(uv3V)
      vertCache.set(vert3Key, vert3MeshIndex)
    }

    mesh.numVerts = newVertIndex

    // Face 1
    indices.push(vert2MeshIndex)
    indices.push(vert1MeshIndex)
    indices.push(vert0MeshIndex)

    // Face 2
    indices.push(vert0MeshIndex)
    indices.push(vert2MeshIndex)
    indices.push(vert3MeshIndex)
  }
}

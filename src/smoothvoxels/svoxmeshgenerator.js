import { DOUBLE, FRONT, MATNORMAL, BACK, SMOOTH, BOTH, QUAD } from './constants'
const vertCache = new Map()

// Generates a clean js mesh data model, which serves as the basis for transformation in the SvoxToThreeMeshConverter or the SvoxToAFrameConverter
export default class SvoxMeshGenerator {
  static generate (model, buffers) {
    // let t0 = performance.now()
    model.prepareForRender(buffers)
    // console.log('prep for render: ' + (performance.now() - t0) + 'ms')

    const { nonCulledFaceCount } = model

    const shells = SvoxMeshGenerator._getAllShells(model)
    const maxShellCount = shells.map(shell => shell.length).reduce((a, b) => Math.max(a, b), 0) + 1

    const mesh = {
      materials: [],
      groups: [],
      indices: new Uint32Array(nonCulledFaceCount * 4 * 6 * maxShellCount),
      indicesIndex: 0,
      maxIndex: -1,
      positions: new Float32Array(nonCulledFaceCount * 4 * 3 * maxShellCount),
      normals: new Float32Array(nonCulledFaceCount * 4 * 3 * maxShellCount),
      colors: new Float32Array(nonCulledFaceCount * 4 * 3 * maxShellCount),
      uvs: new Float32Array(nonCulledFaceCount * 4 * 2 * maxShellCount),
      bounds: { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity, centerX: 0, centerY: 0, centerZ: 0, radius: 0 },
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
    SvoxMeshGenerator._generateAll(model, mesh, buffers, shells)
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

  static _generateAll (model, mesh, buffers, shells) {
    const materials = model.materials.materials
    const { faceMaterials, faceCulled } = buffers

    const modelScaleX = model.scale.x
    const modelScaleY = model.scale.y
    const modelScaleZ = model.scale.z

    // Add all vertices to the geometry
    model.materials.baseMaterials.forEach(function (baseMaterial) {
      const start = mesh.indicesIndex
      let hasFaces = false

      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        // Check for material match and face culling from simplifier
        if (faceCulled.get(faceIndex) !== 0) continue
        const faceMaterialIndex = faceMaterials[faceIndex]
        const faceMaterial = materials[faceMaterialIndex]

        if (faceMaterial._baseMaterial === baseMaterial) {
          SvoxMeshGenerator._generateFace(model, buffers, faceIndex, mesh)

          if (!hasFaces) {
            hasFaces = true
          }
        }

        for (let i = 0, l = shells.length; i < l; i++) {
          const [voxMaterial, shellMaterial, shellDistance, shellR, shellG, shellB] = shells[i]

          if (shellMaterial._baseMaterial === baseMaterial &&
              voxMaterial === faceMaterial) {
            SvoxMeshGenerator._generateShellFace(model, buffers, faceIndex, mesh, shellDistance * modelScaleX, shellDistance * modelScaleY, shellDistance * modelScaleZ, shellR, shellG, shellB, shellMaterial, modelScaleX, modelScaleY, modelScaleZ)

            if (!hasFaces) {
              hasFaces = true
            }
          }
        }
      }

      if (hasFaces) {
        // Add the group for this material
        const end = mesh.indicesIndex
        mesh.groups.push({ start, count: (end - start), materialIndex: baseMaterial.index })
      }
    }, this)

    const vertCount = (mesh.maxIndex + 1)

    let minX = Infinity; let minY = Infinity; let minZ = Infinity
    let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity

    for (let i = 0, l = vertCount * 3; i < l; i += 3) {
      const x = mesh.positions[i]
      const y = mesh.positions[i + 1]
      const z = mesh.positions[i + 2]
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      minZ = Math.min(minZ, z)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      maxZ = Math.max(maxZ, z)
    }

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const centerZ = (minZ + maxZ) / 2

    let maxRadiusSq = -Infinity

    for (let i = 0, l = vertCount * 3; i < l; i += 3) {
      const x = mesh.positions[i]
      const y = mesh.positions[i + 1]
      const z = mesh.positions[i + 2]
      const dx = x - centerX
      const dy = y - centerY
      const dz = z - centerZ
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz)
    }

    const radius = Math.sqrt(maxRadiusSq)

    mesh.bounds.minX = minX
    mesh.bounds.minY = minY
    mesh.bounds.minZ = minZ
    mesh.bounds.maxX = maxX
    mesh.bounds.maxY = maxY
    mesh.bounds.maxZ = maxZ
    mesh.bounds.centerX = centerX
    mesh.bounds.centerY = centerY
    mesh.bounds.centerZ = centerZ
    mesh.bounds.radius = radius

    mesh.indices = new Uint32Array(mesh.indices.buffer, mesh.indices.byteOffset, mesh.indicesIndex)
    mesh.positions = new Float32Array(mesh.positions.buffer, mesh.positions.byteOffset, vertCount * 3)
    mesh.normals = new Float32Array(mesh.normals.buffer, mesh.normals.byteOffset, vertCount * 3)
    mesh.colors = new Float32Array(mesh.colors.buffer, mesh.colors.byteOffset, vertCount * 3)
    mesh.uvs = new Float32Array(mesh.uvs.buffer, mesh.uvs.byteOffset, vertCount * 2)
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

    const smooth = faceSmooth.get(faceIndex) === 1

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

    const indices = mesh.indices
    const positions = mesh.positions
    const normals = mesh.normals
    const colors = mesh.colors
    const uvs = mesh.uvs

    // UVs need to be rounded since left and right side are usually off by a bit
    const vert0Key = vert0X * 3 + vert0Y * 61673 + vert0Z * 87119 + norm0X * 2766691 + norm0Y * 73091 + norm0Z * 5040949 + col0R * 8636137 + col0G * 2360719 + col0B * 4739729 + Math.round(uv0U * 1000) * 719959 + Math.round(uv0V * 1000) * 172741
    const vert1Key = vert1X * 3 + vert1Y * 61673 + vert1Z * 87119 + norm1X * 2766691 + norm1Y * 73091 + norm1Z * 5040949 + col1R * 8636137 + col1G * 2360719 + col1B * 4739729 + Math.round(uv1U * 1000) * 719959 + Math.round(uv1V * 1000) * 172741
    const vert2Key = vert2X * 3 + vert2Y * 61673 + vert2Z * 87119 + norm2X * 2766691 + norm2Y * 73091 + norm2Z * 5040949 + col2R * 8636137 + col2G * 2360719 + col2B * 4739729 + Math.round(uv2U * 1000) * 719959 + Math.round(uv2V * 1000) * 172741
    const vert3Key = vert3X * 3 + vert3Y * 61673 + vert3Z * 87119 + norm3X * 2766691 + norm3Y * 73091 + norm3Z * 5040949 + col3R * 8636137 + col3G * 2360719 + col3B * 4739729 + Math.round(uv3U * 1000) * 719959 + Math.round(uv3V * 1000) * 172741

    const hasVert0 = vertCache.has(vert0Key)
    const hasVert1 = vertCache.has(vert1Key)
    const hasVert2 = vertCache.has(vert2Key)
    const hasVert3 = vertCache.has(vert3Key)

    let vert0Idx, vert1Idx, vert2Idx, vert3Idx

    if (hasVert0) {
      vert0Idx = vertCache.get(vert0Key)
    } else {
      vert0Idx = mesh.maxIndex + 1
      const offset30 = vert0Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert0Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert0Idx
      positions[offset30] = vert0X
      positions[offset31] = vert0Y
      positions[offset32] = vert0Z
      normals[offset30] = norm0X
      normals[offset31] = norm0Y
      normals[offset32] = norm0Z
      colors[offset30] = col0R
      colors[offset31] = col0G
      colors[offset32] = col0B
      uvs[offset20] = uv0U
      uvs[offset21] = uv0V
      vertCache.set(vert0Key, vert0Idx)
    }

    if (hasVert1) {
      vert1Idx = vertCache.get(vert1Key)
    } else {
      vert1Idx = mesh.maxIndex + 1
      const offset30 = vert1Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert1Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert1Idx
      positions[offset30] = vert1X
      positions[offset31] = vert1Y
      positions[offset32] = vert1Z
      normals[offset30] = norm1X
      normals[offset31] = norm1Y
      normals[offset32] = norm1Z
      colors[offset30] = col1R
      colors[offset31] = col1G
      colors[offset32] = col1B
      uvs[offset20] = uv1U
      uvs[offset21] = uv1V
      vertCache.set(vert1Key, vert1Idx)
    }

    if (hasVert2) {
      vert2Idx = vertCache.get(vert2Key)
    } else {
      vert2Idx = mesh.maxIndex + 1
      const offset30 = vert2Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert2Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert2Idx
      positions[offset30] = vert2X
      positions[offset31] = vert2Y
      positions[offset32] = vert2Z
      normals[offset30] = norm2X
      normals[offset31] = norm2Y
      normals[offset32] = norm2Z
      colors[offset30] = col2R
      colors[offset31] = col2G
      colors[offset32] = col2B
      uvs[offset20] = uv2U
      uvs[offset21] = uv2V
      vertCache.set(vert2Key, vert2Idx)
    }

    if (hasVert3) {
      vert3Idx = vertCache.get(vert3Key)
    } else {
      vert3Idx = mesh.maxIndex + 1
      const offset30 = vert3Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert3Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert3Idx
      positions[offset30] = vert3X
      positions[offset31] = vert3Y
      positions[offset32] = vert3Z
      normals[offset30] = norm3X
      normals[offset31] = norm3Y
      normals[offset32] = norm3Z
      colors[offset30] = col3R
      colors[offset31] = col3G
      colors[offset32] = col3B
      uvs[offset20] = uv3U
      uvs[offset21] = uv3V
      vertCache.set(vert3Key, vert3Idx)
    }

    const iIdx = mesh.indicesIndex

    // Face 1
    indices[iIdx] = vert2Idx
    indices[iIdx + 1] = vert1Idx
    indices[iIdx + 2] = vert0Idx

    // Face 2
    indices[iIdx + 3] = vert0Idx
    indices[iIdx + 4] = vert3Idx
    indices[iIdx + 5] = vert2Idx

    mesh.indicesIndex += 6
  }

  static _generateShellFace (model, buffers, faceIndex, mesh, distanceX, distanceY, distanceZ, colorR, colorG, colorB, material) {
    const { faceVertIndices, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, vertX, vertY, vertZ, faceVertUs, faceVertVs, faceSmooth } = buffers

    const vert0Index = faceVertIndices[faceIndex * 4]
    const vert1Index = faceVertIndices[faceIndex * 4 + 1]
    const vert2Index = faceVertIndices[faceIndex * 4 + 2]
    const vert3Index = faceVertIndices[faceIndex * 4 + 3]

    let vert0X = vertX[vert0Index]
    let vert0Y = vertY[vert0Index]
    let vert0Z = vertZ[vert0Index]
    let vert1X = vertX[vert1Index]
    let vert1Y = vertY[vert1Index]
    let vert1Z = vertZ[vert1Index]
    let vert2X = vertX[vert2Index]
    let vert2Y = vertY[vert2Index]
    let vert2Z = vertZ[vert2Index]
    let vert3X = vertX[vert3Index]
    let vert3Y = vertY[vert3Index]
    let vert3Z = vertZ[vert3Index]

    let shellDirection0X = faceVertSmoothNormalX[faceIndex * 4]
    let shellDirection0Y = faceVertSmoothNormalY[faceIndex * 4]
    let shellDirection0Z = faceVertSmoothNormalZ[faceIndex * 4]
    const shellDirection1X = faceVertSmoothNormalX[faceIndex * 4 + 1]
    const shellDirection1Y = faceVertSmoothNormalY[faceIndex * 4 + 1]
    const shellDirection1Z = faceVertSmoothNormalZ[faceIndex * 4 + 1]
    let shellDirection2X = faceVertSmoothNormalX[faceIndex * 4 + 2]
    let shellDirection2Y = faceVertSmoothNormalY[faceIndex * 4 + 2]
    let shellDirection2Z = faceVertSmoothNormalZ[faceIndex * 4 + 2]
    const shellDirection3X = faceVertSmoothNormalX[faceIndex * 4 + 3]
    const shellDirection3Y = faceVertSmoothNormalY[faceIndex * 4 + 3]
    const shellDirection3Z = faceVertSmoothNormalZ[faceIndex * 4 + 3]

    let norm0X, norm0Y, norm0Z, norm1X, norm1Y, norm1Z, norm2X, norm2Y, norm2Z, norm3X, norm3Y, norm3Z

    const smooth = faceSmooth.get(faceIndex) === 1

    switch (material.lighting) {
      case SMOOTH:
        norm0X = faceVertSmoothNormalX[faceIndex * 4]
        norm0Y = faceVertSmoothNormalY[faceIndex * 4]
        norm0Z = faceVertSmoothNormalZ[faceIndex * 4]
        norm1X = faceVertSmoothNormalX[faceIndex * 4 + 1]
        norm1Y = faceVertSmoothNormalY[faceIndex * 4 + 1]
        norm1Z = faceVertSmoothNormalZ[faceIndex * 4 + 1]
        norm2X = faceVertSmoothNormalX[faceIndex * 4 + 2]
        norm2Y = faceVertSmoothNormalY[faceIndex * 4 + 2]
        norm2Z = faceVertSmoothNormalZ[faceIndex * 4 + 2]
        norm3X = faceVertSmoothNormalX[faceIndex * 4 + 3]
        norm3Y = faceVertSmoothNormalY[faceIndex * 4 + 3]
        norm3Z = faceVertSmoothNormalZ[faceIndex * 4 + 3]
        break
      case BOTH:
        if (smooth) {
          norm0X = faceVertBothNormalX[faceIndex * 4]
          norm0Y = faceVertBothNormalY[faceIndex * 4]
          norm0Z = faceVertBothNormalZ[faceIndex * 4]
          norm1X = faceVertBothNormalX[faceIndex * 4 + 1]
          norm1Y = faceVertBothNormalY[faceIndex * 4 + 1]
          norm1Z = faceVertBothNormalZ[faceIndex * 4 + 1]
          norm2X = faceVertBothNormalX[faceIndex * 4 + 2]
          norm2Y = faceVertBothNormalY[faceIndex * 4 + 2]
          norm2Z = faceVertBothNormalZ[faceIndex * 4 + 2]
          norm3X = faceVertBothNormalX[faceIndex * 4 + 3]
          norm3Y = faceVertBothNormalY[faceIndex * 4 + 3]
          norm3Z = faceVertBothNormalZ[faceIndex * 4 + 3]
        } else {
          norm0X = faceVertFlatNormalX[faceIndex * 4]
          norm0Y = faceVertFlatNormalY[faceIndex * 4]
          norm0Z = faceVertFlatNormalZ[faceIndex * 4]
          norm1X = faceVertFlatNormalX[faceIndex * 4 + 1]
          norm1Y = faceVertFlatNormalY[faceIndex * 4 + 1]
          norm1Z = faceVertFlatNormalZ[faceIndex * 4 + 1]
          norm2X = faceVertFlatNormalX[faceIndex * 4 + 2]
          norm2Y = faceVertFlatNormalY[faceIndex * 4 + 2]
          norm2Z = faceVertFlatNormalZ[faceIndex * 4 + 2]
          norm3X = faceVertFlatNormalX[faceIndex * 4 + 3]
          norm3Y = faceVertFlatNormalY[faceIndex * 4 + 3]
          norm3Z = faceVertFlatNormalZ[faceIndex * 4 + 3]
        }

        break
      default:
        norm0X = faceVertFlatNormalX[faceIndex * 4]
        norm0Y = faceVertFlatNormalY[faceIndex * 4]
        norm0Z = faceVertFlatNormalZ[faceIndex * 4]
        norm1X = faceVertFlatNormalX[faceIndex * 4 + 1]
        norm1Y = faceVertFlatNormalY[faceIndex * 4 + 1]
        norm1Z = faceVertFlatNormalZ[faceIndex * 4 + 1]
        norm2X = faceVertFlatNormalX[faceIndex * 4 + 2]
        norm2Y = faceVertFlatNormalY[faceIndex * 4 + 2]
        norm2Z = faceVertFlatNormalZ[faceIndex * 4 + 2]
        norm3X = faceVertFlatNormalX[faceIndex * 4 + 3]
        norm3Y = faceVertFlatNormalY[faceIndex * 4 + 3]
        norm3Z = faceVertFlatNormalZ[faceIndex * 4 + 3]
        break
    }

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

      swapX = uv0U; swapY = uv0V
      uv0U = uv2U; uv0V = uv2V
      uv2U = swapX; uv2V = swapY

      swapX = shellDirection0X; swapY = shellDirection0Y; swapZ = shellDirection0Z
      shellDirection0X = shellDirection2X; shellDirection0Y = shellDirection2Y; shellDirection0Z = shellDirection2Z
      shellDirection2X = swapX; shellDirection2Y = swapY; shellDirection2Z = swapZ
    }

    // Push out the vertices according to the average normals
    vert0X += distanceX * shellDirection0X
    vert0Y += distanceY * shellDirection0Y
    vert0Z += distanceZ * shellDirection0Z
    vert1X += distanceX * shellDirection1X
    vert1Y += distanceY * shellDirection1Y
    vert1Z += distanceZ * shellDirection1Z
    vert2X += distanceX * shellDirection2X
    vert2Y += distanceY * shellDirection2Y
    vert2Z += distanceZ * shellDirection2Z
    vert3X += distanceX * shellDirection3X
    vert3Y += distanceY * shellDirection3Y
    vert3Z += distanceZ * shellDirection3Z

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

    const indices = mesh.indices
    const positions = mesh.positions
    const normals = mesh.normals
    const colors = mesh.colors
    const uvs = mesh.uvs

    // UVs need to be rounded since left and right side are usually off by a bit
    const vert0Key = vert0X * 3 + vert0Y * 61673 + vert0Z * 87119 + norm0X * 2766691 + norm0Y * 73091 + norm0Z * 5040949 + colorR * 8636137 + colorG * 2360719 + colorB * 4739729 + Math.round(uv0U * 1000) * 719959 + Math.round(uv0V * 1000) * 172741
    const vert1Key = vert1X * 3 + vert1Y * 61673 + vert1Z * 87119 + norm1X * 2766691 + norm1Y * 73091 + norm1Z * 5040949 + colorR * 8636137 + colorG * 2360719 + colorB * 4739729 + Math.round(uv1U * 1000) * 719959 + Math.round(uv1V * 1000) * 172741
    const vert2Key = vert2X * 3 + vert2Y * 61673 + vert2Z * 87119 + norm2X * 2766691 + norm2Y * 73091 + norm2Z * 5040949 + colorR * 8636137 + colorG * 2360719 + colorB * 4739729 + Math.round(uv2U * 1000) * 719959 + Math.round(uv2V * 1000) * 172741
    const vert3Key = vert3X * 3 + vert3Y * 61673 + vert3Z * 87119 + norm3X * 2766691 + norm3Y * 73091 + norm3Z * 5040949 + colorR * 8636137 + colorG * 2360719 + colorB * 4739729 + Math.round(uv3U * 1000) * 719959 + Math.round(uv3V * 1000) * 172741

    const hasVert0 = vertCache.has(vert0Key)
    const hasVert1 = vertCache.has(vert1Key)
    const hasVert2 = vertCache.has(vert2Key)
    const hasVert3 = vertCache.has(vert3Key)

    let vert0Idx, vert1Idx, vert2Idx, vert3Idx

    if (hasVert0) {
      vert0Idx = vertCache.get(vert0Key)
    } else {
      vert0Idx = mesh.maxIndex + 1
      const offset30 = vert0Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert0Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert0Idx
      positions[offset30] = vert0X
      positions[offset31] = vert0Y
      positions[offset32] = vert0Z
      normals[offset30] = norm0X
      normals[offset31] = norm0Y
      normals[offset32] = norm0Z
      colors[offset30] = colorR
      colors[offset31] = colorG
      colors[offset32] = colorB
      uvs[offset20] = uv0U
      uvs[offset21] = uv0V
      vertCache.set(vert0Key, vert0Idx)
    }

    if (hasVert1) {
      vert1Idx = vertCache.get(vert1Key)
    } else {
      vert1Idx = mesh.maxIndex + 1
      const offset30 = vert1Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert1Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert1Idx
      positions[offset30] = vert1X
      positions[offset31] = vert1Y
      positions[offset32] = vert1Z
      normals[offset30] = norm1X
      normals[offset31] = norm1Y
      normals[offset32] = norm1Z
      colors[offset30] = colorR
      colors[offset31] = colorG
      colors[offset32] = colorB
      uvs[offset20] = uv1U
      uvs[offset21] = uv1V
      vertCache.set(vert1Key, vert1Idx)
    }

    if (hasVert2) {
      vert2Idx = vertCache.get(vert2Key)
    } else {
      vert2Idx = mesh.maxIndex + 1
      const offset30 = vert2Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert2Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert2Idx
      positions[offset30] = vert2X
      positions[offset31] = vert2Y
      positions[offset32] = vert2Z
      normals[offset30] = norm2X
      normals[offset31] = norm2Y
      normals[offset32] = norm2Z
      colors[offset30] = colorR
      colors[offset31] = colorG
      colors[offset32] = colorB
      uvs[offset20] = uv2U
      uvs[offset21] = uv2V
      vertCache.set(vert2Key, vert2Idx)
    }

    if (hasVert3) {
      vert3Idx = vertCache.get(vert3Key)
    } else {
      vert3Idx = mesh.maxIndex + 1
      const offset30 = vert3Idx * 3
      const offset31 = offset30 + 1
      const offset32 = offset30 + 2
      const offset20 = vert3Idx * 2
      const offset21 = offset20 + 1
      mesh.maxIndex = vert3Idx
      positions[offset30] = vert3X
      positions[offset31] = vert3Y
      positions[offset32] = vert3Z
      normals[offset30] = norm3X
      normals[offset31] = norm3Y
      normals[offset32] = norm3Z
      colors[offset30] = colorR
      colors[offset31] = colorG
      colors[offset32] = colorB
      uvs[offset20] = uv3U
      uvs[offset21] = uv3V
      vertCache.set(vert3Key, vert3Idx)
    }

    const iIdx = mesh.indicesIndex

    // Face 1
    indices[iIdx] = vert2Idx
    indices[iIdx + 1] = vert1Idx
    indices[iIdx + 2] = vert0Idx

    // Face 2
    indices[iIdx + 3] = vert0Idx
    indices[iIdx + 4] = vert3Idx
    indices[iIdx + 5] = vert2Idx

    mesh.indicesIndex += 6
  }

  static _getAllShells (model) {
    const shells = []

    model.materials.forEach(function (material) {
      let shell
      if (model.shell && model.shell.length > 0 && !material.shell) { shell = model.shell }
      if (material.shell && material.shell.length > 0) { shell = material.shell }

      if (shell) {
        shell.forEach(function (sh) {
          const voxBgr = sh.voxBgr
          const b = ((voxBgr >> 16) & 0xff) / 255.0
          const g = ((voxBgr >> 8) & 0xff) / 255.0
          const r = ((voxBgr >> 0) & 0xff) / 255.0

          shells.push([material, model.materials.materials[sh.materialIndex], sh.distance, r, g, b])
        }, this)
      }
    }, this)

    shells.sort((a, b) => a[1] - b[1])

    return shells
  };
}

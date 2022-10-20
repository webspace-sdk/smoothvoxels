const EPS = 0.0001

const contexti1 = {
  filled: false,
  lastVoxelAxis1: 0,
  lastVoxelAxis2: 0,
  maxVoxelAxis3: 0,
  lastFaceIndex: 0
}

const contexti2 = {
  filled: false,
  lastVoxelAxis1: 0,
  lastVoxelAxis2: 0,
  maxVoxelAxis3: 0,
  lastFaceIndex: 0
}

const contexti3 = {
  filled: false,
  lastVoxelAxis1: 0,
  lastVoxelAxis2: 0,
  maxVoxelAxis3: 0,
  lastFaceIndex: 0
}

const contexti4 = {
  filled: false,
  lastVoxelAxis1: 0,
  lastVoxelAxis2: 0,
  maxVoxelAxis3: 0,
  lastFaceIndex: 0
}

export default class Simplifier {
  // Combine all faces which are coplanar, have the same normals, colors, etc.
  static simplify (model, buffers) {
    if (!model.simplify) { return }

    const clearContexts = function () {
      contexti1.filled = false
      contexti2.filled = false
      contexti3.filled = false
      contexti4.filled = false
    }

    const materials = model.materials.materials
    const { faceCulled, faceNameIndices, vertX, vertY, vertZ, voxelXZYFaceIndices, voxelXYZFaceIndices, voxelYZXFaceIndices } = buffers

    // Combine nx, px, nz and pz faces vertical up
    for (let i = voxelXZYFaceIndices.length - model.faceCount, l = voxelXZYFaceIndices.length; i < l; i++) {
      const key = voxelXZYFaceIndices[i]
      const faceIndex = key & ((1 << 28) - 1)
      if (faceCulled.get(faceIndex)) continue

      const xzy = key / (1 << 28)
      const x = xzy >> 16 & 0xFF
      const z = xzy >> 8 & 0xFF
      const y = xzy & 0xFF
      const faceNameIndex = faceNameIndices[faceIndex]

      switch (faceNameIndex) {
        case 0: // nx
          this._mergeFaces(materials, model, buffers, contexti1, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3)
          break
        case 1: // px
          this._mergeFaces(materials, model, buffers, contexti2, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3)
          break
        case 4: // nz
          this._mergeFaces(materials, model, buffers, contexti3, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3)
          break
        case 5: // pz
          this._mergeFaces(materials, model, buffers, contexti4, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3)
          break
      }
    }

    clearContexts()

    // Combine nx, px, ny and py faces from back to front
    for (let i = voxelXYZFaceIndices.length - model.faceCount, l = voxelXYZFaceIndices.length; i < l; i++) {
      const key = voxelXYZFaceIndices[i]
      const faceIndex = key & ((1 << 28) - 1)
      if (faceCulled.get(faceIndex)) continue

      const xyz = key / (1 << 28)
      const x = xyz >> 16 & 0xFF
      const y = xyz >> 8 & 0xFF
      const z = xyz & 0xFF

      const faceNameIndex = faceNameIndices[faceIndex]

      switch (faceNameIndex) {
        case 0: // nx
          this._mergeFaces(materials, model, buffers, contexti1, faceIndex, x, y, z, vertX, vertY, vertZ, 1, 2, 3, 0)
          break
        case 1: // px
          this._mergeFaces(materials, model, buffers, contexti2, faceIndex, x, y, z, vertX, vertY, vertZ, 3, 0, 1, 2)
          break
        case 2: // ny
          this._mergeFaces(materials, model, buffers, contexti3, faceIndex, x, y, z, vertX, vertY, vertZ, 0, 1, 2, 3)
          break
        case 3: // py
          this._mergeFaces(materials, model, buffers, contexti4, faceIndex, x, y, z, vertX, vertY, vertZ, 2, 3, 0, 1)
          break
      }
    }

    clearContexts()

    // Combine ny, py, nz and pz faces from left to right
    for (let i = voxelYZXFaceIndices.length - model.faceCount, l = voxelYZXFaceIndices.length; i < l; i++) {
      const key = voxelYZXFaceIndices[i]
      const faceIndex = key & ((1 << 28) - 1)
      if (faceCulled.get(faceIndex)) continue

      const yzx = key / (1 << 28)
      const y = yzx >> 16 & 0xFF
      const z = yzx >> 8 & 0xFF
      const x = yzx & 0xFF

      const faceNameIndex = faceNameIndices[faceIndex]

      switch (faceNameIndex) {
        case 2: // ny
          this._mergeFaces(materials, model, buffers, contexti1, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0)
          break
        case 3: // py
          this._mergeFaces(materials, model, buffers, contexti2, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0)
          break
        case 4: // nz
          this._mergeFaces(materials, model, buffers, contexti3, faceIndex, y, z, x, vertY, vertZ, vertX, 3, 0, 1, 2)
          break
        case 5: // pz
          this._mergeFaces(materials, model, buffers, contexti4, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0)
          break
      }
    }

    clearContexts()
  }

  static _mergeFaces (materials, model, buffers, context, faceIndex, vaxis1, vaxis2, vaxis3, axis1Arr, axis2Arr, axis3Arr, v0, v1, v2, v3) {
    const { faceCulled, faceMaterials, vertX, vertY, vertZ, faceVertIndices, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceVertColorR, faceVertColorG, faceVertColorB, faceVertUs, faceVertVs, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ } = buffers
    const materialIndex = faceMaterials[faceIndex]
    const material = materials[materialIndex]

    if (context.filled &&
        context.lastVoxelAxis1 === vaxis1 && context.lastVoxelAxis2 === vaxis2 &&
        (material.simplify === true || (material.simplify === null && model.simplify === true)) &&
        faceCulled.get(faceIndex) === 0) {
      if (context.maxVoxelAxis3 !== vaxis3 - 1) {
        // Voxel was skipped, reset context and continue.
        context.filled = true
        context.lastVoxelAxis1 = vaxis1
        context.lastVoxelAxis2 = vaxis2
        context.maxVoxelAxis3 = vaxis3
        context.lastFaceIndex = faceIndex
        return
      }

      const faceOffset = faceIndex * 4
      const lastFaceIndex = context.lastFaceIndex
      const lastFaceOffset = lastFaceIndex * 4
      if (faceMaterials[lastFaceIndex] !== materialIndex) return

      const faceVertNormal0X = faceVertNormalX[faceOffset]
      const faceVertNormal0Y = faceVertNormalY[faceOffset]
      const faceVertNormal0Z = faceVertNormalZ[faceOffset]
      const faceVertNormal1X = faceVertNormalX[faceOffset + 1]
      const faceVertNormal1Y = faceVertNormalY[faceOffset + 1]
      const faceVertNormal1Z = faceVertNormalZ[faceOffset + 1]
      const faceVertNormal2X = faceVertNormalX[faceOffset + 2]
      const faceVertNormal2Y = faceVertNormalY[faceOffset + 2]
      const faceVertNormal2Z = faceVertNormalZ[faceOffset + 2]
      const faceVertNormal3X = faceVertNormalX[faceOffset + 3]
      const faceVertNormal3Y = faceVertNormalY[faceOffset + 3]
      const faceVertNormal3Z = faceVertNormalZ[faceOffset + 3]

      const lastFaceVertNormal0X = faceVertNormalX[lastFaceOffset]
      const lastFaceVertNormal0Y = faceVertNormalY[lastFaceOffset]
      const lastFaceVertNormal0Z = faceVertNormalZ[lastFaceOffset]
      const lastFaceVertNormal1X = faceVertNormalX[lastFaceOffset + 1]
      const lastFaceVertNormal1Y = faceVertNormalY[lastFaceOffset + 1]
      const lastFaceVertNormal1Z = faceVertNormalZ[lastFaceOffset + 1]
      const lastFaceVertNormal2X = faceVertNormalX[lastFaceOffset + 2]
      const lastFaceVertNormal2Y = faceVertNormalY[lastFaceOffset + 2]
      const lastFaceVertNormal2Z = faceVertNormalZ[lastFaceOffset + 2]
      const lastFaceVertNormal3X = faceVertNormalX[lastFaceOffset + 3]
      const lastFaceVertNormal3Y = faceVertNormalY[lastFaceOffset + 3]
      const lastFaceVertNormal3Z = faceVertNormalZ[lastFaceOffset + 3]

      const normalsEqual =
          this._normalEquals(faceVertNormal0X, faceVertNormal0Y, faceVertNormal0Z, lastFaceVertNormal0X, lastFaceVertNormal0Y, lastFaceVertNormal0Z) &&
          this._normalEquals(faceVertNormal1X, faceVertNormal1Y, faceVertNormal1Z, lastFaceVertNormal1X, lastFaceVertNormal1Y, lastFaceVertNormal1Z) &&
          this._normalEquals(faceVertNormal2X, faceVertNormal2Y, faceVertNormal2Z, lastFaceVertNormal2X, lastFaceVertNormal2Y, lastFaceVertNormal2Z) &&
          this._normalEquals(faceVertNormal3X, faceVertNormal3Y, faceVertNormal3Z, lastFaceVertNormal3X, lastFaceVertNormal3Y, lastFaceVertNormal3Z)

      // Normals not equal, can't merge
      if (!normalsEqual) return

      const faceVertColor0R = faceVertColorR[faceOffset]
      const faceVertColor0G = faceVertColorG[faceOffset]
      const faceVertColor0B = faceVertColorB[faceOffset]
      const faceVertColor1R = faceVertColorR[faceOffset + 1]
      const faceVertColor1G = faceVertColorG[faceOffset + 1]
      const faceVertColor1B = faceVertColorB[faceOffset + 1]
      const faceVertColor2R = faceVertColorR[faceOffset + 2]
      const faceVertColor2G = faceVertColorG[faceOffset + 2]
      const faceVertColor2B = faceVertColorB[faceOffset + 2]
      const faceVertColor3R = faceVertColorR[faceOffset + 3]
      const faceVertColor3G = faceVertColorG[faceOffset + 3]
      const faceVertColor3B = faceVertColorB[faceOffset + 3]

      const lastFaceVertColor0R = faceVertColorR[lastFaceOffset]
      const lastFaceVertColor0G = faceVertColorG[lastFaceOffset]
      const lastFaceVertColor0B = faceVertColorB[lastFaceOffset]
      const lastFaceVertColor1R = faceVertColorR[lastFaceOffset + 1]
      const lastFaceVertColor1G = faceVertColorG[lastFaceOffset + 1]
      const lastFaceVertColor1B = faceVertColorB[lastFaceOffset + 1]
      const lastFaceVertColor2R = faceVertColorR[lastFaceOffset + 2]
      const lastFaceVertColor2G = faceVertColorG[lastFaceOffset + 2]
      const lastFaceVertColor2B = faceVertColorB[lastFaceOffset + 2]
      const lastFaceVertColor3R = faceVertColorR[lastFaceOffset + 3]
      const lastFaceVertColor3G = faceVertColorG[lastFaceOffset + 3]
      const lastFaceVertColor3B = faceVertColorB[lastFaceOffset + 3]

      const colorsEqual = faceVertColor0R === lastFaceVertColor0R && faceVertColor0G === lastFaceVertColor0G && faceVertColor0B === lastFaceVertColor0B &&
        faceVertColor1R === lastFaceVertColor1R && faceVertColor1G === lastFaceVertColor1G && faceVertColor1B === lastFaceVertColor1B &&
        faceVertColor2R === lastFaceVertColor2R && faceVertColor2G === lastFaceVertColor2G && faceVertColor2B === lastFaceVertColor2B &&
        faceVertColor3R === lastFaceVertColor3R && faceVertColor3G === lastFaceVertColor3G && faceVertColor3B === lastFaceVertColor3B

      // Colors not equal, can't merge
      if (!colorsEqual) return

      const faceVertIndexV0 = faceVertIndices[faceOffset + v0]
      const faceVertIndexV1 = faceVertIndices[faceOffset + v1]
      const faceVertIndexV2 = faceVertIndices[faceOffset + v2]
      const faceVertIndexV3 = faceVertIndices[faceOffset + v3]

      const faceVertV0X = vertX[faceVertIndexV0]
      const faceVertV0Y = vertY[faceVertIndexV0]
      const faceVertV0Z = vertZ[faceVertIndexV0]
      const faceVertV1X = vertX[faceVertIndexV1]
      const faceVertV1Y = vertY[faceVertIndexV1]
      const faceVertV1Z = vertZ[faceVertIndexV1]

      const lastFaceVertIndexV0 = faceVertIndices[lastFaceOffset + v0]
      const lastFaceVertIndexV1 = faceVertIndices[lastFaceOffset + v1]
      const lastFaceVertIndexV2 = faceVertIndices[lastFaceOffset + v2]
      const lastFaceVertIndexV3 = faceVertIndices[lastFaceOffset + v3]

      const lastFaceVertV0X = vertX[lastFaceVertIndexV0]
      const lastFaceVertV0Y = vertY[lastFaceVertIndexV0]
      const lastFaceVertV0Z = vertZ[lastFaceVertIndexV0]

      // Calculate the ratio between the face length and the total face length (in case they are combined)
      const faceLength = Math.sqrt(
        (faceVertV1X - faceVertV0X) * (faceVertV1X - faceVertV0X) +
                        (faceVertV1Y - faceVertV0Y) * (faceVertV1Y - faceVertV0Y) +
                        (faceVertV1Z - faceVertV0Z) * (faceVertV1Z - faceVertV0Z)
      )
      const totalLength = Math.sqrt(
        (faceVertV1X - lastFaceVertV0X) * (faceVertV1X - lastFaceVertV0X) +
                        (faceVertV1Y - lastFaceVertV0Y) * (faceVertV1Y - lastFaceVertV0Y) +
                        (faceVertV1Z - lastFaceVertV0Z) * (faceVertV1Z - lastFaceVertV0Z)
      )

      const ratio = faceLength / totalLength

      /* TODO JEL faceAo[0] === lastFaceAo[0] &&
      faceAo[1] === lastFaceAo[1] &&
      faceAo[2] === lastFaceAo[2] &&
      faceAo[3] === lastFaceAo[3] && */

      const positionsEqual = Math.abs(axis1Arr[lastFaceVertIndexV1] - (1 - ratio) * axis1Arr[faceVertIndexV1] - ratio * axis1Arr[lastFaceVertIndexV0]) <= EPS &&
            Math.abs(axis2Arr[lastFaceVertIndexV1] - (1 - ratio) * axis2Arr[faceVertIndexV1] - ratio * axis2Arr[lastFaceVertIndexV0]) <= EPS &&
            Math.abs(axis3Arr[lastFaceVertIndexV1] - (1 - ratio) * axis3Arr[faceVertIndexV1] - ratio * axis3Arr[lastFaceVertIndexV0]) <= EPS &&
            Math.abs(axis1Arr[lastFaceVertIndexV2] - (1 - ratio) * axis1Arr[faceVertIndexV2] - ratio * axis1Arr[lastFaceVertIndexV3]) <= EPS &&
            Math.abs(axis2Arr[lastFaceVertIndexV2] - (1 - ratio) * axis2Arr[faceVertIndexV2] - ratio * axis2Arr[lastFaceVertIndexV3]) <= EPS &&
            Math.abs(axis3Arr[lastFaceVertIndexV2] - (1 - ratio) * axis3Arr[faceVertIndexV2] - ratio * axis3Arr[lastFaceVertIndexV3]) <= EPS

      if (!positionsEqual) return

      // console.log("merging faces", faceIndex, lastFaceIndex, faceOffset, lastFaceOffset, v1, v2);
      // Everything checks out, so add this face to the last one
      // console.log(`MERGE: ${this._faceVerticesToString(lastFaceVertices)}`);
      // console.log(`  AND: ${this._faceVerticesToString(faceVertices)}`);
      // console.log("change", faceVertIndices[lastFaceOffset + v1], " to ", faceVertIndexV1);
      // console.log("change", faceVertIndices[lastFaceOffset + v2], " to ", faceVertIndexV2);

      faceVertIndices[lastFaceOffset + v1] = faceVertIndexV1
      faceVertIndices[lastFaceOffset + v2] = faceVertIndexV2

      // console.log(`   TO: ${this._faceVerticesToString(lastFaceVertices)}`);

      faceVertUs[lastFaceOffset + v1] = faceVertUs[faceOffset + v1]
      faceVertVs[lastFaceOffset + v1] = faceVertVs[faceOffset + v1]

      faceVertUs[lastFaceOffset + v2] = faceVertUs[faceOffset + v2]
      faceVertVs[lastFaceOffset + v2] = faceVertVs[faceOffset + v2]

      faceVertFlatNormalX[lastFaceOffset + v1] = faceVertFlatNormalX[faceOffset + v1]
      faceVertFlatNormalY[lastFaceOffset + v1] = faceVertFlatNormalY[faceOffset + v1]
      faceVertFlatNormalZ[lastFaceOffset + v1] = faceVertFlatNormalZ[faceOffset + v1]
      faceVertFlatNormalX[lastFaceOffset + v2] = faceVertFlatNormalX[faceOffset + v2]
      faceVertFlatNormalY[lastFaceOffset + v2] = faceVertFlatNormalY[faceOffset + v2]
      faceVertFlatNormalZ[lastFaceOffset + v2] = faceVertFlatNormalZ[faceOffset + v2]

      faceVertSmoothNormalX[lastFaceOffset + v1] = faceVertSmoothNormalX[faceOffset + v1]
      faceVertSmoothNormalY[lastFaceOffset + v1] = faceVertSmoothNormalY[faceOffset + v1]
      faceVertSmoothNormalZ[lastFaceOffset + v1] = faceVertSmoothNormalZ[faceOffset + v1]
      faceVertSmoothNormalX[lastFaceOffset + v2] = faceVertSmoothNormalX[faceOffset + v2]
      faceVertSmoothNormalY[lastFaceOffset + v2] = faceVertSmoothNormalY[faceOffset + v2]
      faceVertSmoothNormalZ[lastFaceOffset + v2] = faceVertSmoothNormalZ[faceOffset + v2]

      faceVertBothNormalX[lastFaceOffset + v1] = faceVertBothNormalX[faceOffset + v1]
      faceVertBothNormalY[lastFaceOffset + v1] = faceVertBothNormalY[faceOffset + v1]
      faceVertBothNormalZ[lastFaceOffset + v1] = faceVertBothNormalZ[faceOffset + v1]
      faceVertBothNormalX[lastFaceOffset + v2] = faceVertBothNormalX[faceOffset + v2]
      faceVertBothNormalY[lastFaceOffset + v2] = faceVertBothNormalY[faceOffset + v2]
      faceVertBothNormalZ[lastFaceOffset + v2] = faceVertBothNormalZ[faceOffset + v2]

      context.maxVoxelAxis3 = vaxis3

      // And remove this face
      faceCulled.set(faceIndex, 1)
      model.nonCulledFaceCount--

      return true
    }

    context.filled = true
    context.lastVoxelAxis1 = vaxis1
    context.lastVoxelAxis2 = vaxis2
    context.maxVoxelAxis3 = vaxis3
    context.lastFaceIndex = faceIndex
    return false
  }

  static _normalEquals (n1x, n1y, n1z, n2x, n2y, n2z) {
    return Math.abs(n1x - n2x) < 0.01 && // Allow for minimal differences
           Math.abs(n1y - n2y) < 0.01 &&
           Math.abs(n1z - n2z) < 0.01
  }
}

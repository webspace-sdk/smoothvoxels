class SVOXBuffers {
  constructor (maxVerts) {
    const maxVertBits = Math.floor(maxVerts / 8);
    const maxFaces = maxVerts / 4;
    const maxFaceBits = Math.floor(maxFaces / 8);
    const maxFaceVerts = maxFaces * 4;

    this.tmpVertIndexLookup = new Map();

    this.vertX = new Float32Array(maxVerts);
    this.vertY = new Float32Array(maxVerts);
    this.vertZ = new Float32Array(maxVerts);

    // Used for deform
    this.vertTmpX = new Float32Array(maxVerts);
    this.vertTmpY = new Float32Array(maxVerts);
    this.vertTmpZ = new Float32Array(maxVerts);
    this.vertHasTmp = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);

    // Verts can have up to 5 colors, given it will belong to at most 5 visible faces (a corner on a flat part)
    this.vertColorR = new Float32Array(maxVerts * 5);
    this.vertColorG = new Float32Array(maxVerts * 5);
    this.vertColorB = new Float32Array(maxVerts * 5);
    this.vertColorCount = new Uint8Array(maxVerts);

    this.vertSmoothNormalX = new Float32Array(maxVerts);
    this.vertSmoothNormalY = new Float32Array(maxVerts);
    this.vertSmoothNormalZ = new Float32Array(maxVerts);
    this.vertBothNormalX = new Float32Array(maxVerts);
    this.vertBothNormalY = new Float32Array(maxVerts);
    this.vertBothNormalZ = new Float32Array(maxVerts);
    this.vertFlattenedX = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
    this.vertFlattenedY = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
    this.vertFlattenedZ = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
    this.vertClampedX = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
    this.vertClampedY = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
    this.vertClampedZ = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
    this.vertFullyClamped = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
    this.vertDeformCount = new Uint8Array(maxVerts);
    this.vertDeformDamping = new Float32Array(maxVerts);
    this.vertDeformStrength = new Float32Array(maxVerts);
    this.vertWarpAmplitude = new Float32Array(maxVerts);
    this.vertWarpFrequency = new Float32Array(maxVerts);
    this.vertScatter = new Float32Array(maxVerts);
    this.vertRing = new Float32Array(maxVerts);
    this.vertNrOfClampedLinks = new Uint8Array(maxVerts);
    this.vertLinkCounts = new Uint8Array(maxVerts); // A vert can be linked to up to 6 other verts
    this.vertLinkIndices = new Uint32Array(maxVerts * 6);

    this.faceFlattened = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
    this.faceClamped = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
    this.faceSmooth = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
    this.faceEquidistant = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
    this.faceCulled = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0); // Bits for removed faces from simplify
    this.faceNameIndices = new Uint8Array(maxFaces);
    this.faceMaterials = new Uint8Array(maxFaces);

    this.faceVertIndices = new Uint32Array(maxFaceVerts);
    this.faceVertNormalX = new Float32Array(maxFaceVerts);
    this.faceVertNormalY = new Float32Array(maxFaceVerts);
    this.faceVertNormalZ = new Float32Array(maxFaceVerts);
    this.faceVertFlatNormalX = new Float32Array(maxFaceVerts);
    this.faceVertFlatNormalY = new Float32Array(maxFaceVerts);
    this.faceVertFlatNormalZ = new Float32Array(maxFaceVerts);
    this.faceVertSmoothNormalX = new Float32Array(maxFaceVerts);
    this.faceVertSmoothNormalY = new Float32Array(maxFaceVerts);
    this.faceVertSmoothNormalZ = new Float32Array(maxFaceVerts);
    this.faceVertBothNormalX = new Float32Array(maxFaceVerts);
    this.faceVertBothNormalY = new Float32Array(maxFaceVerts);
    this.faceVertBothNormalZ = new Float32Array(maxFaceVerts);
    this.faceVertColorR = new Float32Array(maxFaceVerts);
    this.faceVertColorG = new Float32Array(maxFaceVerts);
    this.faceVertColorB = new Float32Array(maxFaceVerts);
    this.faceVertUs = new Float32Array(maxFaceVerts);
    this.faceVertVs = new Float32Array(maxFaceVerts);

    this.tmpVoxelXZYFaceIndices = Array(maxFaces).fill(0);
    this.tmpVoxelXYZFaceIndices = Array(maxFaces).fill(0);
    this.tmpVoxelYZXFaceIndices = Array(maxFaces).fill(0);
    this.voxelXZYFaceIndices = null;
    this.voxelXYZFaceIndices = null;
    this.voxelYZXFaceIndices = null;

  }
}


class Light {
  constructor(color, strength, direction, position, distance, size, detail) {
    this.color = color;
    this.strength = strength;
    this.direction = direction;
    this.position = position;
    this.distance = distance;
    this.size = size;
    this.detail = detail;
  } 
}


class Model {

  set origin(origin)  { this._origin = Planar.parse(origin); }
  get origin() { return Planar.toString(this._origin); }
  set flatten(flatten)  { this._flatten = Planar.parse(flatten); }
  get flatten() { return Planar.toString(this._flatten); }
  set clamp(clamp)  { this._clamp = Planar.parse(clamp); }
  get clamp() { return Planar.toString(this._clamp); }
  set skip(skip)  { this._skip = Planar.parse(skip); }
  get skip() { return Planar.toString(this._skip); }
  set tile(tile)  { 
    // Parse the planer expression, ensuring we don't get an undefined
    this._tile = Planar.parse(tile || ' '); 
    
    // Cleanup so only edges are named
    if (this._tile.x) this._tile = Planar.combine( this._tile, { nx:true, px:true } );
    if (this._tile.y) this._tile = Planar.combine( this._tile, { ny:true, py:true } );
    if (this._tile.z) this._tile = Planar.combine( this._tile, { nz:true, pz:true } );
    this._tile.x = false;
    this._tile.y = false;
    this._tile.z = false;
  }
  get tile() { return Planar.toString(this._tile); }
  
  set shape(shape) {
    this._shape = (shape || 'box').trim();
    if (!['box', 'sphere', 'cylinder-x', 'cylinder-y', 'cylinder-z'].includes(this._shape)) {
      throw {
        name: 'SyntaxError',
        message: `Unrecognized shape ${this._shape}. Allowed are box, sphere, cylinder-x, cylinder-y and cylinder-z`,
      };
    }
  }
  get shape() { return this._shape; }
  
  // Set AO as { color, maxDistance, strength, angle }
  setAo(ao) {
     this._ao = ao;
  }  
   
  get ao() {
    return this._ao;
  }
  
  set aoSides(sides)  { this._aoSides = Planar.parse(sides); }
  get aoSides() { return Planar.toString(this._aoSides); }
  set aoSamples(samples)  { this._aoSamples = Math.round(samples); }
  get aoSamples() { return this._aoSamples; }

  constructor() {
    this.name = 'main';
    this.lights = [];
    this.textures = {};
    this.materials = new MaterialList();
    this.voxels = new VoxelMatrix();
    this.vertices = []; 
    
    this.scale = { x:1, y:1, z:1 };
    this.rotation = { x:0, y:0, z:0 };  // In degrees
    this.position = { x:0, y:0, z:0 };   // In world scale
    this.resize = false;
    
    this._origin = Planar.parse('x y z');
    this._flatten = Planar.parse('');
    this._clamp = Planar.parse('');
    this._skip = Planar.parse('');
    this._tile = Planar.parse('');

    this._ao = undefined;
    this._aoSamples = 50;
    this._aoSides = Planar.parse('');

    this.shape = 'box';
    
    this.wireframe = false;
    this.simplify = true;
    
    this.triCount = 0;
    this.octCount = 0;
    this.octMissCount = 0;

    this.faceCount = 0;
    this.vertCount = 0;
    this.nonCulledFaceCount = 0;
    this.tmpVertIndexLookup = new Map();

    const MAX_VERTS = 1024 * 1024;
    const MAX_VERT_BITS = Math.floor(MAX_VERTS / 8);
    const MAX_FACES = MAX_VERTS / 4;
    const MAX_FACE_BITS = Math.floor(MAX_FACES / 8);
    const MAX_FACE_VERTS = MAX_FACES * 4;

    this.vertX = new Float32Array(MAX_VERTS);
    this.vertY = new Float32Array(MAX_VERTS);
    this.vertZ = new Float32Array(MAX_VERTS);

    // Used for deform
    this.vertTmpX = new Float32Array(MAX_VERTS);
    this.vertTmpY = new Float32Array(MAX_VERTS);
    this.vertTmpZ = new Float32Array(MAX_VERTS);
    this.vertHasTmp = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);

    // Verts can have up to 5 colors, given it will belong to at most 5 visible faces (a corner on a flat part)
    this.vertColorR = new Float32Array(MAX_VERTS * 5);
    this.vertColorG = new Float32Array(MAX_VERTS * 5);
    this.vertColorB = new Float32Array(MAX_VERTS * 5);
    this.vertColorCount = new Uint8Array(MAX_VERTS);

    this.vertSmoothNormalX = new Float32Array(MAX_VERTS);
    this.vertSmoothNormalY = new Float32Array(MAX_VERTS);
    this.vertSmoothNormalZ = new Float32Array(MAX_VERTS);
    this.vertBothNormalX = new Float32Array(MAX_VERTS);
    this.vertBothNormalY = new Float32Array(MAX_VERTS);
    this.vertBothNormalZ = new Float32Array(MAX_VERTS);
    this.vertFlattenedX = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);
    this.vertFlattenedY = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);
    this.vertFlattenedZ = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);
    this.vertClampedX = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);
    this.vertClampedY = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);
    this.vertClampedZ = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);
    this.vertFullyClamped = Bits.create(new Uint8Array(MAX_VERT_BITS).buffer, 1, 0);
    this.vertDeformCount = new Uint8Array(MAX_VERTS);
    this.vertDeformDamping = new Float32Array(MAX_VERTS);
    this.vertDeformStrength = new Float32Array(MAX_VERTS);
    this.vertWarpAmplitude = new Float32Array(MAX_VERTS);
    this.vertWarpFrequency = new Float32Array(MAX_VERTS);
    this.vertScatter = new Float32Array(MAX_VERTS);
    this.vertRing = new Float32Array(MAX_VERTS);
    this.vertNrOfClampedLinks = new Uint8Array(MAX_VERTS);
    this.vertLinkCounts = new Uint8Array(MAX_VERTS); // A vert can be linked to up to 6 other verts
    this.vertLinkIndices = new Uint32Array(MAX_VERTS * 6);

    this.faceFlattened = Bits.create(new Uint8Array(MAX_FACE_BITS).buffer, 1, 0);
    this.faceClamped = Bits.create(new Uint8Array(MAX_FACE_BITS).buffer, 1, 0);
    this.faceSmooth = Bits.create(new Uint8Array(MAX_FACE_BITS).buffer, 1, 0);
    this.faceEquidistant = Bits.create(new Uint8Array(MAX_FACE_BITS).buffer, 1, 0);
    this.faceCulled = Bits.create(new Uint8Array(MAX_FACE_BITS).buffer, 1, 0); // Bits for removed faces from simplify
    this.faceNameIndices = new Uint8Array(MAX_FACES);
    this.faceMaterials = new Uint8Array(MAX_FACES);

    this.faceVertIndices = new Uint32Array(MAX_FACE_VERTS);
    this.faceVertNormalX = new Float32Array(MAX_FACE_VERTS);
    this.faceVertNormalY = new Float32Array(MAX_FACE_VERTS);
    this.faceVertNormalZ = new Float32Array(MAX_FACE_VERTS);
    this.faceVertFlatNormalX = new Float32Array(MAX_FACE_VERTS);
    this.faceVertFlatNormalY = new Float32Array(MAX_FACE_VERTS);
    this.faceVertFlatNormalZ = new Float32Array(MAX_FACE_VERTS);
    this.faceVertSmoothNormalX = new Float32Array(MAX_FACE_VERTS);
    this.faceVertSmoothNormalY = new Float32Array(MAX_FACE_VERTS);
    this.faceVertSmoothNormalZ = new Float32Array(MAX_FACE_VERTS);
    this.faceVertBothNormalX = new Float32Array(MAX_FACE_VERTS);
    this.faceVertBothNormalY = new Float32Array(MAX_FACE_VERTS);
    this.faceVertBothNormalZ = new Float32Array(MAX_FACE_VERTS);
    this.faceVertColorR = new Float32Array(MAX_FACE_VERTS);
    this.faceVertColorG = new Float32Array(MAX_FACE_VERTS);
    this.faceVertColorB = new Float32Array(MAX_FACE_VERTS);
    this.faceVertUs = new Float32Array(MAX_FACE_VERTS);
    this.faceVertVs = new Float32Array(MAX_FACE_VERTS);

    this.tmpVoxelXZYFaceIndices = Array(MAX_FACES).fill(0);
    this.tmpVoxelXYZFaceIndices = Array(MAX_FACES).fill(0);
    this.tmpVoxelYZXFaceIndices = Array(MAX_FACES).fill(0);
    this.voxelXZYFaceIndices = null;
    this.voxelXYZFaceIndices = null;
    this.voxelYZXFaceIndices = null;

    // Need to zero on reset:
    // face vert link counts, color counts
    // all bitfields
    // vert ring, since deformer checks for ring equality
    // vert nr of clamped links
  }
   
  _setVertex(x, y, z, vertex) {
    vertex.x = x;
    vertex.y = y;
    vertex.z = z;
    
    let matrixy = this.vertices[z + 1000000];
    if (!matrixy) {
      matrixy = [ ];
      this.vertices[z + 1000000] = matrixy;
    }
    let matrixx = matrixy[y + 1000000];
    if (!matrixx) {
      matrixx = [ ];
      matrixy[y + 1000000] = matrixx;
    }
    matrixx[x + 1000000] = vertex;
  }
  
  _getVertex(x, y, z) {
    let matrix = this.vertices[z + 1000000];
    if (matrix) {
      matrix = matrix[y + 1000000];
      if (matrix) {
        return matrix[x + 1000000];
      }
    }
    return null;
  }
  
  forEachVertex(func, thisArg) {
    let param = [];
    for (let indexz in this.vertices) {
      let matrixy = this.vertices[indexz];
      for (let indexy in matrixy) {
        let matrixx = matrixy[indexy];
        for (let indexx in matrixx) {
          param[0] = matrixx[indexx];
          func.apply(thisArg, param);
        }
      }
    }
  }
    
  prepareForWrite() {
    this.materials.forEach(function(material) {
      
      // Reset all material bounding boxes
      material.bounds.reset();
      
      material.colors.forEach(function(color) {
        // Reset all color counts
        color.count = 0;
      }, this);
    }, this);
    
    // Add color usage count for model shell colors (to ensure the material is generated)
    if (this.shell) {
      this.shell.forEach(function (sh) {
        sh.color.count++;
      }, this);
    }
      
    // Add color usage count for material shell colors
    this.materials.forEach(function(material) {
      if (material.shell) {
        material.shell.forEach(function (sh) {
          sh.color.count++;      
        }, this);
      }
    }, this);    
    
    if (this.lights.some((light) => light.size)) {
      // There are visible lights, so the modelreader created a material and a color for them
      // Set the count to 1 to indicate it is used
      this.materials.materials[0].colors[0].count = 1;
    }
        
    this.voxels.prepareForWrite();
  }
    

  prepareForRender() {
    const { voxels, tmpVertIndexLookup, tmpVoxelXZYFaceIndices, tmpVoxelXYZFaceIndices, tmpVoxelYZXFaceIndices } = this;

    this.prepareForWrite();
    
    let maximumDeformCount = Deformer.maximumDeformCount(this);

    this.vertices = [];
  
    let removeCount = 0;

    this.faceCount = 0;
    this.vertCount = 0;

    voxels.forEach(function createFaces(voxel) {

      let faceCount = 0;

      // Hacky trick to pack keys into 52 bits. BigInts are slow.
      const xzyKey = (voxel.x << 16 | voxel.z << 8 | voxel.y) * (1 << 28);
      const xyzKey = (voxel.x << 16 | voxel.y << 8 | voxel.z) * (1 << 28);
      const yzxKey = (voxel.x << 16 | voxel.z << 8 | voxel.y) * (1 << 28);

      // Check which faces should be generated
      for (let faceNameIndex = 0, l = SVOX._FACES.length; faceNameIndex < l; faceNameIndex++) {

        const neighbor = SVOX._NEIGHBORS[faceNameIndex];
        const created = this._createFace(voxel, faceNameIndex,
                          voxels.getVoxel(voxel.x+neighbor[0], voxel.y+neighbor[1], voxel.z+neighbor[2]),
                          maximumDeformCount > 0, tmpVertIndexLookup);  // Only link the vertices when needed
        if (created) {
          //voxel.faces[faceName] = face;
          const faceIndex = this.faceCount - 1;

          tmpVoxelXZYFaceIndices[faceIndex] = xzyKey + faceIndex;
          tmpVoxelXYZFaceIndices[faceIndex] = xyzKey + faceIndex;
          tmpVoxelYZXFaceIndices[faceIndex] = yzxKey + faceIndex;

          voxel.color.count++;
          faceCount++;
        }
      }
      
      // TODO JEL remove
      voxel.visible = faceCount > 0;
    }, this, false);

    this.nonCulledFaceCount = this.faceCount;
    tmpVertIndexLookup.clear();

    console.log(this);
    // Sort ordered faces, used for simplifier
    this.voxelXZYFaceIndices = tmpVoxelXZYFaceIndices.slice(0, this.faceCount);
    this.voxelXYZFaceIndices = tmpVoxelXYZFaceIndices.slice(0, this.faceCount);
    this.voxelYZXFaceIndices = tmpVoxelYZXFaceIndices.slice(0, this.faceCount);
    this.voxelXZYFaceIndices.sort();
    this.voxelXYZFaceIndices.sort();
    this.voxelYZXFaceIndices.sort();

    VertexLinker.fixClampedLinks(this); 
    
    Deformer.changeShape(this, this._shape);
       
    Deformer.deform(this, maximumDeformCount);
    
    Deformer.warpAndScatter(this);
    
    NormalsCalculator.calculateNormals(this);
    
    VertexTransformer.transformVertices(this);    
    
    //LightsCalculator.calculateLights(this);
    
    //AOCalculator.calculateAmbientOcclusion(this);
    
    ColorCombiner.combineColors(this);

    UVAssigner.assignUVs(this);
    
    Simplifier.simplify(this);
    
    FaceAligner.alignFaceDiagonals(this);
  }

  determineBoundsOffsetAndRescale(resize) {
    let bos = { bounds:null, offset:null, rescale:1 };
    
    let minX, minY, minZ, maxX, maxY, maxZ;
    const { vertX, vertY, vertZ } = this;
    
    if (resize === SVOX.BOUNDS || resize === SVOX.MODEL) {
      // Determine the actual model size if resize is set (to model or bounds)
      minX = Number.POSITIVE_INFINITY;
      minY = Number.POSITIVE_INFINITY;
      minZ = Number.POSITIVE_INFINITY;
      maxX = Number.NEGATIVE_INFINITY;
      maxY = Number.NEGATIVE_INFINITY;
      maxZ = Number.NEGATIVE_INFINITY;

      // Skip the skipped faces when determining the bounds
      for (let vertIndex = 0, c = this.vertCount; vertIndex < c; vertIndex++) {
        const vx = vertX[vertIndex];
        const vy = vertY[vertIndex];
        const vz = vertZ[vertIndex];

        if (vx<minX) minX = vx;
        if (vy<minY) minY = vy;
        if (vz<minZ) minZ = vz;
        if (vx>maxX) maxX = vx;
        if (vy>maxY) maxY = vy;
        if (vz>maxZ) maxZ = vz;
      }

      if (resize === SVOX.MODEL) {
        // Resize the actual model to the original voxel bounds
        let scaleX = (this.voxels.maxX-this.voxels.minX+1)/(maxX-minX);
        let scaleY = (this.voxels.maxY-this.voxels.minY+1)/(maxY-minY);
        let scaleZ = (this.voxels.maxZ-this.voxels.minZ+1)/(maxZ-minZ);
        bos.rescale = Math.min(scaleX, scaleY, scaleZ);
      }
    }
    
    if (!resize) {
      // Just use it's original bounds
      minX = this.voxels.bounds.minX;
      maxX = this.voxels.bounds.maxX+1;
      minY = this.voxels.bounds.minY;
      maxY = this.voxels.bounds.maxY+1;
      minZ = this.voxels.bounds.minZ;
      maxZ = this.voxels.bounds.maxZ+1;
    }
    
    let offsetX = -(minX + maxX)/2;
    let offsetY = -(minY + maxY)/2;
    let offsetZ = -(minZ + maxZ)/2;

    if (this._origin.nx) offsetX = -minX;
    if (this._origin.px) offsetX = -maxX;
    if (this._origin.ny) offsetY = -minY;
    if (this._origin.py) offsetY = -maxY;
    if (this._origin.nz) offsetZ = -minZ;
    if (this._origin.pz) offsetZ = -maxZ;

    bos.bounds = { minX, minY, minZ, maxX, maxY, maxZ };
    bos.offset = { x: offsetX, y:offsetY, z:offsetZ };
    
    return bos;
  }  
  
  _createFace(voxel, faceNameIndex, neighbor, linkVertices, vertIndexLookup) {
    const material = voxel?.material;
    const neighborMaterial = neighbor?.material;
    
    if (!material || material.opacity === 0) {
      // No voxel, so no face
      return false;
    }
    else if (!neighborMaterial) {
      // The voxel is next to an empty voxel, so create a face
    }
    else if (!material.isTransparent && !material.wireframe) {
      // The neighbor is not see through, so skip this face
      return false;
    }
    else if (!material.isTransparent && !material.wireframe) {
      // The voxel is not see through, but the neighbor is, so create the face 
    }
    else if (material.isTransparent && !material.wireframe && neighborMaterial.wireframe) {
       // The voxel is transparent and the neighbor is wireframe, create the face 
    }
    else {
      return false;
    }

    let flattened = this._isFacePlanar(voxel, faceNameIndex, material, material._flatten, this._flatten);
    let clamped   = this._isFacePlanar(voxel, faceNameIndex, material, material._clamp, this._clamp);
    let skipped   = this._isFacePlanar(voxel, faceNameIndex, material, material._skip, this._skip);

    if (skipped) return false;

    const { faceVertIndices, faceVertColorR, faceVertColorG, faceVertColorB, faceFlattened, faceClamped, faceSmooth, faceCulled, faceMaterials, faceNameIndices, faceVertUs, faceVertVs, faceCount} = this;
    const faceVertOffset = faceCount * 4;

    faceVertIndices[faceVertOffset] = this._createVertex(voxel, faceNameIndex, 0, flattened, clamped, vertIndexLookup);
    faceVertIndices[faceVertOffset + 1] = this._createVertex(voxel, faceNameIndex, 1, flattened, clamped, vertIndexLookup);
    faceVertIndices[faceVertOffset + 2] = this._createVertex(voxel, faceNameIndex, 2, flattened, clamped, vertIndexLookup);
    faceVertIndices[faceVertOffset + 3] = this._createVertex(voxel, faceNameIndex, 3, flattened, clamped, vertIndexLookup);

    for (let v = 0; v < 4; v++) {
      faceVertColorR[faceVertOffset + v] = voxel.color.r;
      faceVertColorG[faceVertOffset + v] = voxel.color.g;
      faceVertColorB[faceVertOffset + v] = voxel.color.b;
    }

    faceFlattened.set(faceCount, flattened ? 1 : 0);
    faceClamped.set(faceCount, clamped ? 1 : 0);
    faceSmooth.set(faceCount, 0);
    faceCulled.set(faceCount, 0);
    faceMaterials[faceCount] = voxel.materialListIndex;
    faceNameIndices[faceCount] = faceNameIndex;

    // See UVAssigner, we fill in the proper x, y, z value from the voxel for the UV mapping to be resolved later
    const faceUVs = SVOX._FACEINDEXUVS[faceNameIndex];
    for (let i = 0; i < 4; i++) {
      faceVertUs[faceVertOffset + i] = voxel[faceUVs.u];
      faceVertVs[faceVertOffset + i] = voxel[faceUVs.v];
    }

     // Link the vertices for deformation
    if (linkVertices)
      VertexLinker.linkVertices(model, faceCount);

    this.faceCount++;

    return true;
  }
  
  _createVertex(voxel, faceNameIndex, vi, flattened, clamped, vertIndexLookup) {
    // Calculate the actual vertex coordinates
    const vertexOffset = SVOX._VERTEX_OFFSETS[faceNameIndex][vi];
    const x = voxel.x + vertexOffset[0];
    const y = voxel.y + vertexOffset[1];
    const z = voxel.z + vertexOffset[2];

    const material = voxel.material;

    // Key is bit shifted x, y, z values as ints
    const key = (x << 20) | (y << 10) | z;

    const shape = model._shape;
    const { vertDeformCount, vertDeformDamping, vertDeformStrength, vertWarpAmplitude, vertWarpFrequency, vertScatter, vertX, vertY, vertZ, vertLinkCounts, vertFullyClamped, vertRing, _flatten: modelFlatten, _clamp: modelClamp, vertClampedX, vertClampedY, vertClampedZ, vertColorR, vertColorG, vertColorB, vertColorCount, vertFlattenedX, vertFlattenedY, vertFlattenedZ } = model;

    const { deform, warp, scatter } = material;

    let vertIndex;

    if (vertIndexLookup.has(key)) {
      vertIndex = vertIndexLookup.get(key);

      // Favour less deformation over more deformation
      if (!deform) {
        vertDeformCount[vertIndex] = 0;
        vertDeformDamping[vertIndex] = 0;
        vertDeformStrength[vertIndex] = 0;
      }
      else if (vertDeformCount[vertIndex] !== 0 &&
               (this._getDeformIntegral(material.deform) < this._getDeformIntegralAtVertex(vertIndex))) {
        vertDeformStrength[vertIndex] = deform.strength;
        vertDeformDamping[vertIndex] = deform.damping;
        vertDeformCount[vertIndex] = deform.count;
      }

      // Favour less / less requent warp over more warp
      if (!warp) {
        vertWarpAmplitude[vertIndex] = 0;
        vertWarpFrequency[vertIndex] = 0;
      }
      else if (vertWarpAmplitude[vertIndex] !== 0 &&
               ((warp.amplitude < vertWarpAmplitude[vertIndex]) ||
                (warp.amplitude === vertWarpAmplitude[vertIndex] && warp.frequency > vertWarpFrequency[vertIndex]))) {
        vertWarpAmplitude[vertIndex] = warp.amplitude;
        vertWarpFrequency[vertIndex] = warp.frequency;
      }

      // Favour less scatter over more scatter
      if (!scatter)
        vertScatter[vertIndex] = 0;
      else if (vertScatter[vertIndex] !== 0 &&
               Math.abs(scatter) < Math.abs(vertScatter[vertIndex])) {
        vertScatter[vertIndex] = scatter;
      }
    } else {
      vertIndex = this.vertCount;
      vertIndexLookup.set(key, vertIndex);

      vertX[vertIndex] = x;
      vertY[vertIndex] = y;
      vertZ[vertIndex] = z;

      if (deform) {
        vertDeformDamping[vertIndex] = deform.damping;
        vertDeformCount[vertIndex] = deform.count;
        vertDeformStrength[vertIndex] = deform.strength;
        vertLinkCounts[vertIndex] = 0;
        vertFullyClamped.set(vertIndex, 0);
      }

      if (warp) {
        vertWarpAmplitude[vertIndex] = warp.amplitude;
        vertWarpFrequency[vertIndex] = warp.frequency;
      }

      if (scatter) {
        vertScatter[vertIndex] = scatter;
      }

      vertColorCount[vertIndex] = 0;
      vertRing[vertIndex] = 0;
    }

    // This will || the planar values
    this._setIsVertexPlanar(voxel, x, y, z, material._flatten, modelFlatten, vertFlattenedX, vertFlattenedY, vertFlattenedZ, vertIndex);
    this._setIsVertexPlanar(voxel, x, y, z, material._clamp, modelClamp, vertClampedX, vertClampedY, vertClampedZ, vertIndex);

    const vertColorIndex = vertColorCount[vertIndex];
    const color = voxel.color;
    const vertColorOffset = vertIndex * 5;
    vertColorR[vertColorOffset + vertColorIndex] = color.r;
    vertColorG[vertColorOffset + vertColorIndex] = color.g;
    vertColorB[vertColorOffset + vertColorIndex] = color.b;
    vertColorCount[vertIndex] = vertColorIndex + 1;

    this.vertCount++;

    return vertIndex;
  }
  
  _getDeformIntegral(deform) {
    // Returns the total amount of deforming done by caluclating the integral
    return (deform.damping === 1)
       ? deform.strength*(deform.count + 1)
       : (deform.strength*(1-Math.pow(deform.damping,deform.count+1)))/(1-deform.damping);
  }

  _getDeformIntegralAtVertex(vertIndex) {
    const damping = this.vertDeformDamping[vertIndex];
    const count = this.vertDeformCount[vertIndex];
    const strength = this.vertDeformStrength[vertIndex];

    // Returns the total amount of deforming done by caluclating the integral
    return (damping === 1)
       ? strength*(count + 1)
       : (strength*(1-Math.pow(damping,count+1)))/(1-damping);
  }
  
  _isFacePlanar(voxel, faceNameIndex, material, materialPlanar, modelPlanar) {
    let planar = materialPlanar;
    let bounds = material.bounds;
    if (!planar) {
      planar = modelPlanar;
      bounds = this.voxels.bounds;
    }
    
    if (!planar) return false;

    switch(faceNameIndex) {
      case 0 : return planar.x || (planar.nx && voxel.x === bounds.minX); // nx
      case 1 : return planar.x || (planar.px && voxel.x === bounds.maxX); // px
      case 2 : return planar.y || (planar.ny && voxel.y === bounds.minY); // ny
      case 3 : return planar.y || (planar.py && voxel.y === bounds.maxY); // py
      case 4 : return planar.z || (planar.nz && voxel.z === bounds.minZ); // nz
      case 5 : return planar.z || (planar.pz && voxel.z === bounds.maxZ); // pz
      default: return false;
    }
  }

  _setIsVertexPlanar(voxel, vx, vy, vz, materialPlanar, modelPlanar, arrX, arrY, arrZ, vertIndex) {
    let material = voxel.material;  
    
    let planar = materialPlanar;
    let bounds = material.bounds;
    if (!planar) {
      planar = modelPlanar;
      bounds = this.voxels.bounds;
    }
    
    if (planar) {
        // Note bounds are in voxel coordinates and vertices add from 0 0 0 to 1 1 1
      arrX.set(vertIndex, (planar.x || (planar.nx && vx < bounds.minX + 0.5) || (planar.px && vx > bounds.maxX + 0.5 )) ? 1 : 0);
      arrY.set(vertIndex, (planar.y || (planar.ny && vy < bounds.minY + 0.5) || (planar.py && vy > bounds.maxY + 0.5 )) ? 1 : 0);
      arrZ.set(vertIndex, (planar.z || (planar.nz && vz < bounds.minZ + 0.5) || (planar.pz && vz > bounds.maxZ + 0.5 )) ? 1 : 0);
    } else {
      arrX.set(vertIndex, 0);
      arrY.set(vertIndex, 0);
      arrZ.set(vertIndex, 0);
    }
  }
    
  // TODO remove
  _normalize(vector) {
    if (vector) {
      let length = Math.sqrt( vector.x * vector.x + vector.y * vector. y + vector.z * vector.z );
      if (length > 0) {
        vector.x /= length;
        vector.y /= length;
        vector.z /= length;
      }
    }
    return vector;
  }
  
  _isZero(vector) {
    return !vector || (vector.x === 0 && vector.y === 0 && vector.z === 0);
  }
  
  // End of class Model
}


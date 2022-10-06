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
    this.prepareForWrite();
    
    let maximumDeformCount = Deformer.maximumDeformCount(this);

    this.vertices = [];
  
    this.voxels.forEach(function createFaces(voxel) {
      let faceCount = 0;
      // Check which faces should be generated
      for (let f=0; f < SVOX._FACES.length; f++) {
        let faceName = SVOX._FACES[f];
        let neighbor = SVOX._NEIGHBORS[faceName];
        let face = this._createFace(voxel, faceName, 
                                    this.voxels.getVoxel(voxel.x+neighbor.x, voxel.y+neighbor.y, voxel.z+neighbor.z),
                                    maximumDeformCount > 0);  // Only link the vertices when needed
        if (face) {
          voxel.faces[faceName] = face;
          if (!face.skipped)
            voxel.color.count++;
          faceCount++;
        }
      }
      
      voxel.visible = faceCount > 0;
    }, this, false);
    
    VertexLinker.fixClampedLinks(this.voxels); 
    
    //VertexLinker.logLinks(this.voxels);

    Deformer.changeShape(this, this._shape);
       
    Deformer.deform(this, maximumDeformCount);
    
    Deformer.warpAndScatter(this);
    
    NormalsCalculator.calculateNormals(this);
    
    VertexTransformer.transformVertices(this);    
    
    LightsCalculator.calculateLights(this);
    
    AOCalculator.calculateAmbientOcclusion(this);
    
    ColorCombiner.combineColors(this);

    UVAssigner.assignUVs(this);
    
    Simplifier.simplify(this);
    
    FaceAligner.alignFaceDiagonals(this);
  }
     
  determineBoundsOffsetAndRescale(resize) {
    let bos = { bounds:null, offset:null, rescale:1 };
    
    let minX, minY, minZ, maxX, maxY, maxZ;
    
    if (resize === SVOX.BOUNDS || resize === SVOX.MODEL) {
      // Determine the actual model size if resize is set (to model or bounds)
      minX = Number.POSITIVE_INFINITY;
      minY = Number.POSITIVE_INFINITY;
      minZ = Number.POSITIVE_INFINITY;
      maxX = Number.NEGATIVE_INFINITY;
      maxY = Number.NEGATIVE_INFINITY;
      maxZ = Number.NEGATIVE_INFINITY;

      // Skip the skipped faces when determining the bounds
      this.voxels.forEach(function(voxel) {
        for (let faceName in voxel.faces) {
          let face = voxel.faces[faceName];
          if (!face.skipped) {
            for (let v = 0; v < 4; v++) {
              let vertex = face.vertices[v];
              if (vertex.x<minX) minX = vertex.x;
              if (vertex.y<minY) minY = vertex.y;
              if (vertex.z<minZ) minZ = vertex.z;
              if (vertex.x>maxX) maxX = vertex.x;
              if (vertex.y>maxY) maxY = vertex.y;
              if (vertex.z>maxZ) maxZ = vertex.z;
            }
          }
        }
      }, this, true);
      
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
  
  _createFace(voxel, faceName, neighbor, linkVertices) {
    
    if (!voxel || !voxel.material || voxel.material.opacity === 0) {
      // No voxel, so no face
      return null;
    }
    else if (!neighbor || !neighbor.material) {
      // The voxel is next to an empty voxel, so create a face
    }
    else if (!neighbor.material.isTransparent && !neighbor.material.wireframe) {
      // The neighbor is not see through, so skip this face
      return null;
    }
    else if (!voxel.material.isTransparent && !voxel.material.wireframe) {
      // The voxel is not see through, but the neighbor is, so create the face 
    }
    else if (voxel.material.isTransparent && !voxel.material.wireframe && neighbor.material.wireframe) {
       // The voxel is transparent and the neighbor is wireframe, create the face 
    }
    else
      return null;
    
    let flattened = this._isFacePlanar(voxel, faceName, voxel.material._flatten, this._flatten);
    let clamped   = this._isFacePlanar(voxel, faceName, voxel.material._clamp, this._clamp);
    let skipped   = this._isFacePlanar(voxel, faceName, voxel.material._skip, this._skip);

    let face = {
      
      vertices: skipped ? null : [
        this._createVertex(voxel, faceName, 0, flattened, clamped),
        this._createVertex(voxel, faceName, 1, flattened, clamped),
        this._createVertex(voxel, faceName, 2, flattened, clamped),
        this._createVertex(voxel, faceName, 3, flattened, clamped)
      ],
      
      ao: [0, 0, 0, 0],
        
      uv: [null, null, null, null],  // When used will have {u,v} items
            
      flattened,
      clamped,
      skipped,
    };
  
     // Link the vertices for deformation
    if (linkVertices)
      VertexLinker.linkVertices(voxel, face, faceName);
    
    return face;
  }
  
  _createVertex(voxel, faceName, vi, flattened, clamped) {
    // Calculate the actual vertex coordinates
    let vertexOffset = SVOX._VERTICES[faceName][vi];
    let x = voxel.x + vertexOffset.x;
    let y = voxel.y + vertexOffset.y;
    let z = voxel.z + vertexOffset.z;
    
    // Retrieve the material of the voxel to set the different material properties for the vertex
    let material = voxel.material;

    let flatten = this._isVertexPlanar(voxel, x, y, z, material._flatten, this._flatten);
    let clamp   = this._isVertexPlanar(voxel, x, y, z, material._clamp, this._clamp);

    // Create the vertex if it does not yet exist
    let vertex = this._getVertex(x, y, z);
    if (!vertex) {
      vertex = { x, y, z,
                 newPos: { x: 0, y:0, z: 0, set: false },
                 links: [ ],
                 nrOfClampedLinks: 0,
                 colors: [ voxel.color ],
                 deform: material.deform,
                 warp: material.warp,
                 scatter: material.scatter,
                 flatten: flatten,
                 clamp: clamp,
                 equidistant: undefined,
                 count:1
               };
      this._setVertex(x, y, z, vertex);
    }
    else {
      
      vertex.colors.push(voxel.color);
      
      vertex.flatten.x = vertex.flatten.x || flatten.x;
      vertex.flatten.y = vertex.flatten.y || flatten.y;
      vertex.flatten.z = vertex.flatten.z || flatten.z;
      vertex.clamp.x   = vertex.clamp.x   || clamp.x;
      vertex.clamp.y   = vertex.clamp.y   || clamp.y;
      vertex.clamp.z   = vertex.clamp.z   || clamp.z;
      
      // Favour less deformation over more deformation
      if (!material.deform)
        vertex.deform = null;
      else if (vertex.deform &&
               (this._getDeformIntegral(material.deform) < this._getDeformIntegral(vertex.deform))) {
        vertex.deform = material.deform;
      }

      // Favour less / less requent warp over more warp
      if (!material.warp)
        vertex.warp = null;
      else if (vertex.warp &&
               ((material.warp.amplitude < vertex.warp.amplitude) ||
                (material.warp.amplitude === vertex.warp.amplitude && material.warp.frequency > vertex.warp.frequency))) {
        vertex.warp = material.warp;
      }

      // Favour less scatter over more scatter
      if (!material.scatter)
        vertex.scatter = null;
      else if (vertex.scatter &&
               Math.abs(material.scatter) < Math.abs(vertex.scatter)) {
        vertex.scatter = material.scatter;
      }
    }

    return vertex; 
  }
  
  _getDeformIntegral(deform) {
    // Returns the total amount of deforming done by caluclating the integral
    return (deform.damping === 1)
       ? deform.strength*(deform.count + 1)
       : (deform.strength*(1-Math.pow(deform.damping,deform.count+1)))/(1-deform.damping);
  }
  
  _isFacePlanar(voxel, faceName, materialPlanar, modelPlanar) {
    let material = voxel.material;
    
    let planar = materialPlanar;
    let bounds = material.bounds;
    if (!planar) {
      planar = modelPlanar;
      bounds = this.voxels.bounds;
    }
    
    if (!planar) {
      faceName = 'not';
    }
    
    switch(faceName) {
      case 'nx' : return planar.x || (planar.nx && voxel.x === bounds.minX);
      case 'px' : return planar.x || (planar.px && voxel.x === bounds.maxX);
      case 'ny' : return planar.y || (planar.ny && voxel.y === bounds.minY);
      case 'py' : return planar.y || (planar.py && voxel.y === bounds.maxY);
      case 'nz' : return planar.z || (planar.nz && voxel.z === bounds.minZ);
      case 'pz' : return planar.z || (planar.pz && voxel.z === bounds.maxZ);
      case 'not': return false;
      default: return false;
    }
  }
  
  _isVertexPlanar(voxel, vx, vy, vz, materialPlanar, modelPlanar) {
    let material = voxel.material;  
    
    let planar = materialPlanar;
    let bounds = material.bounds;
    if (!planar) {
      planar = modelPlanar;
      bounds = this.voxels.bounds;
    }
    
    let result = { x:false, y:false, z:false};
    if (planar) {
      // Note bounds are in voxel coordinates and vertices add from 0 0 0 to 1 1 1
      result.x = planar.x || (planar.nx && vx < bounds.minX + 0.5) || (planar.px && vx > bounds.maxX + 0.5);
      result.y = planar.y || (planar.ny && vy < bounds.minY + 0.5) || (planar.py && vy > bounds.maxY + 0.5);
      result.z = planar.z || (planar.nz && vz < bounds.minZ + 0.5) || (planar.pz && vz > bounds.maxZ + 0.5);
    }
    
    return result;
  }
    
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


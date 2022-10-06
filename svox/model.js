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

// =====================================================
// /smoothvoxels/svox/modelreader.js
// =====================================================

class ModelReader {

    /**
     * Read the model from a string.
     * @param {any} modelString The string containing the model.
     * @returns {Model} The model.
     */
    static readFromString(modelString) {

        let modelData = this._parse(modelString);
        this._validateModel(modelData);

        let model = this._createModel(modelData);

        return model;
    }

    /**
     * Parse the model string into a modelData object which can be converted into a model
     * @param {string} modelString The string to be parsed
     * @returns {object} A simple object with the model data (not yet the actual model).
     */
    static _parse(modelString) {
        const regex = {
            linecontinuation: new RegExp(/_\s*[\r\n]/gm),
            modelparts: new RegExp(
                          /\s*(\/\/(.*?)\r?\n)/.source + '|' +                             // Comments
                          /\s*(texture|light|model|material|voxels)\s+/.source + '|' +     // SVOX Blocks
                          /\s*([^=,\r\n]+=\s*data:image.*?base64,.*$)\s*/.source + '|' +   // Name = data:image/...;base64,iVBORw...
                          /\s*([^=,\r\n]+=[^\r\n=;,\/]+)\s*/.source + '|' +                // Name = Value
                          /\s*([A-Za-z \(\)\d -]+)\s*/.source,                             // Voxel matrix
                          "gm")
        };
        
        let modelData = { lights:[], textures:[], materials:[] };
        let parent = modelData;
        let voxelString = null;

        // Split the lines so every line contains:
        // - A block name (i.e. "texture"/"light"/"model"/"material"/"voxels")
        // - name = value (e.g. "emissive = #FFF 1")
        // - A line from the voxel matrix
        // while removing all comments
        let lines = Array.from(modelString.replaceAll(regex.linecontinuation,' ').matchAll(regex.modelparts), m => m[0].trim());
      
        // Now convert the lines to a javascript object
        lines.filter(l => l).forEach(function (line) {
            
          if (line.startsWith('//')) {
              // Skip comments
          }
          else if (line === 'texture') {
              // New texture start
              parent = { id:'<no-name>', cube:false };
              modelData.textures.push(parent);
          }
          else if (line === 'light') {
              // New light start
              parent = { color:'#FFF' };
              modelData.lights.push(parent);
          }
          else if (line === 'model') {
            // Model settings
            parent = modelData;
          } 
          else if (line === 'material') {
              // New material start
              parent = {};
              modelData.materials.push(parent);
          }
          else if (line === 'voxels') {
              // Voxels belong to the model
              parent = modelData; 
              voxelString = "";
          } 
          else if (voxelString !== null) {
              // We are in the voxel matrix, so just add the line to the voxel string
              voxelString += line.replace(/\s/g, '');
          } 
          else {
            // Handle one property assignment 
            let equalIndex = line.indexOf('=');
            if (equalIndex === -1) {
                throw {
                    name: 'SyntaxError',
                    message: `Invalid definition '${line}'.`
                };
            }
            
            // Don't use split because image data contains '='
            let name  = line.substring(0, equalIndex).trim().toLowerCase();
            let value = line.substring(equalIndex+1).trim();
            
            // Set the property
            parent[name] = value;
          }
        }, this);

        modelData.voxels = voxelString;
      
        return modelData;
    }

    /**
     * Create the actual model from the parsed model data.
     * @param {object} modelData The simple object from the parsed model string.
     * @returns {Model} The model class with its properties, materials and voxels.
     */
    static _createModel(modelData) {
        let model = new Model();
    
        model.size = this._parseXYZInt('size', modelData.size, null, true);
        model.scale = this._parseXYZFloat('scale', modelData.scale, '1', true);
        model.rotation = this._parseXYZFloat('rotation', modelData.rotation, '0 0 0', false);
        model.position = this._parseXYZFloat('position', modelData.position, '0 0 0', false);
        model.simplify = modelData.simplify === "false" ? false : true;
     
        if (modelData.resize === SVOX.BOUNDS)
          model.resize = SVOX.BOUNDS;
        else if (modelData.resize === SVOX.MODEL)
          model.resize = SVOX.MODEL;
        else if (modelData.resize)
          model.resize = null;
        else if (modelData.autoresize === "true") // autoResize is deprecated, translate to resize = model
          model.resize = SVOX.MODEL;

        model.shape = modelData.shape;

        // Set the global wireframe override
        model.wireframe = modelData.wireframe === "true" || false;

        // Set the planar values
        model.origin = modelData.origin || 'x y z';
        model.flatten = modelData.flatten;
        model.clamp = modelData.clamp;
        model.skip = modelData.skip;
        model.tile = modelData.tile;
      
        model.setAo(this._parseAo(modelData.ao));
        model.aoSides = modelData.aosides;
        model.aoSamples = parseInt(modelData.aosamples || 50, 10);
      
        model.data = this._parseVertexData(modelData.data, 'model');
      
        model.shell = this._parseShell(modelData.shell);    
      
        if (modelData.lights.some((light) => light.size)) {
          // There are visible lights, so create a basic material for them
          let lightMaterial = model.materials.createMaterial(SVOX.MATBASIC, SVOX.FLAT, 1, 0, 
                                                             false, false, 1, 0, false, 1, false, SVOX.FRONT, 
                                                             '#FFF', 0, false, 
                                                             null, null, null, null, null, null, 
                                                             null, null,
                                                             -1, -1, 0, 0, 0);
          lightMaterial.addColorHEX('#FFFFFF');      
        }
                     

        modelData.lights.forEach(function (lightData) {
            this._createLight(model, lightData);
        }, this);
      
        modelData.textures.forEach(function (textureData) {
            this._createTexture(model, textureData);
        }, this);
         
        modelData.materials.forEach(function (materialData) {
            this._createMaterial(model, materialData);
        }, this);
      
        // Retrieve all colors and Id's from all materials
        model.colors = {};
        model.materials.forEach(function (material) {
            material.colors.forEach(function (color) {
                model.colors[color.id] = color;
            });
        });
      
        // Find the color (& material) for the shell(s)
        this._resolveShellColors(model.shell, model);
        model.materials.forEach(function (material) {
          this._resolveShellColors(material.shell, model);
        }, this);

        // Create all voxels
        this._createVoxels(model, modelData.voxels);

        return model;
    }

    /**
     * Create one light from its parsed data
     * @param {object} lightData The simple object from the parsed model string.
     */
    static _createLight(model, lightData) {
        if (!lightData.color) {
          lightData.color = "#FFF 1";
        }
        if (!lightData.color.startsWith('#')) {
            lightData.color = "#FFF " + lightData.color;
        }  
        lightData.strength  = parseFloat(lightData.color.split(' ')[1] || 1.0);  
        lightData.color     = Color.fromHex(lightData.color.split(' ')[0]);
        lightData.direction = this._parseXYZFloat('direction', lightData.direction, null, false);
        lightData.position  = this._parseXYZFloat('position', lightData.position, null, false);
        lightData.distance  = parseFloat(lightData.distance || 0);
        lightData.size      = Math.max(0, parseFloat(lightData.size || 0.0));
        lightData.detail    = Math.min(3, Math.max(0, parseInt(lightData.detail || 1, 10)));
        let light = new Light(lightData.color, lightData.strength,
                              lightData.direction, lightData.position, lightData.distance,
                              lightData.size, lightData.detail);
      
        model.lights.push(light);
    }
  
    /**
     * Create one texture from its parsed data
     * @param {object} textureData The simple object from the parsed model string.
     */
    static _createTexture(model, textureData) {
        textureData.cube = textureData.cube === "true" || false;
        model.textures[textureData.id] = textureData;      
    }

    /**
     * Create one material from its parsed data
     * @param {object} materialData The simple object from the parsed model string.
     */
    static _createMaterial(model, materialData) {
      
        // Cleanup data
        let lighting = SVOX.FLAT;
        if (materialData.lighting === SVOX.QUAD) lighting = SVOX.QUAD;
        if (materialData.lighting === SVOX.SMOOTH) lighting = SVOX.SMOOTH;
        if (materialData.lighting === SVOX.BOTH) lighting = SVOX.BOTH;
      
        if (!materialData.emissive) {
          if (materialData.emissivemap)
            materialData.emissive = "#FFF 1";
          else
            materialData.emissive = "#000 0";
        }
        if (!materialData.emissive.startsWith('#')) {
            materialData.emissive = "#FFF " + materialData.emissive;
        }
        materialData.emissiveColor     = materialData.emissive.split(' ')[0];
        materialData.emissiveIntensity = materialData.emissive.split(' ')[1] || 1.0;
      
        if (materialData.ao && !materialData.ao.startsWith('#')) {
            materialData.ao = "#000 " + materialData.ao;
        }
        materialData.maptransform = materialData.maptransform || '';
      
        let simplify = null;
        if (model.simplify && materialData.simplify === "false")
          simplify = false;
        if (!model.simplify && materialData.simplify === "true")
          simplify = true;

        // Create the material with all base attributes to recongnize reusable materials
        let material =  model.materials.createMaterial(
          materialData.type || SVOX.MATSTANDARD, 
          lighting, 
          parseFloat(materialData.roughness || (materialData.roughnessmap ? 1.0 : 1.0)), 
          parseFloat(materialData.metalness || (materialData.metalnessmap ? 1.0 : 0.0)), 
          materialData.fade === "true" || false, 
          simplify,
          parseFloat(materialData.opacity || 1.0), 
          parseFloat(materialData.alphatest || 0), 
          materialData.transparent === "true" || false,
          parseFloat(materialData.refractionratio || 0.9), 
          materialData.wireframe === "true" || false, 
          materialData.side, 
          materialData.emissiveColor,
          materialData.emissiveIntensity,
          materialData.fog === "false" ? false : true, 
          materialData.map ? model.textures[materialData.map] : null,
          materialData.normalmap ? model.textures[materialData.normalmap] : null,
          materialData.roughnessmap ? model.textures[materialData.roughnessmap] : null,
          materialData.metalnessmap ? model.textures[materialData.metalnessmap] : null,
          materialData.emissivemap ? model.textures[materialData.emissivemap] : null,
          materialData.matcap ? model.textures[materialData.matcap] : null,
          materialData.reflectionmap ? model.textures[materialData.reflectionmap] : null,
          materialData.refractionmap ? model.textures[materialData.refractionmap] : null,
          parseFloat(materialData.maptransform.split(' ')[0] || -1.0),    // uscale (in voxels,  -1 = cover model)
          parseFloat(materialData.maptransform.split(' ')[1] || -1.0),    // vscale (in voxels,  -1 = cover model)
          parseFloat(materialData.maptransform.split(' ')[2] || 0.0),     // uoffset
          parseFloat(materialData.maptransform.split(' ')[3] || 0.0),     // voffset
          parseFloat(materialData.maptransform.split(' ')[4] || 0.0)      // rotation in degrees
        ); 
      
        if (materialData.deform) {
            // Parse deform count, strength and damping
            material.setDeform(parseFloat(materialData.deform.split(' ')[0]),          // Count
                               parseFloat(materialData.deform.split(' ')[1] || 1.0),   // Strength
                               parseFloat(materialData.deform.split(' ')[2] || 1.0));  // Damping
        }

        if (materialData.warp) {
            // Parse amplitude and frequency
            material.setWarp(parseFloat(materialData.warp.split(' ')[0]),
                             parseFloat(materialData.warp.split(' ')[1] || 1.0));
        }

        if (materialData.scatter)
            material.scatter = parseFloat(materialData.scatter);
      
        // Set the planar values
        material.flatten = materialData.flatten;
        material.clamp = materialData.clamp;
        material.skip = materialData.skip;
                                  
        material.setAo(this._parseAo(materialData.ao));
        material.shell = this._parseShell(materialData.shell);

        // Set whether lights affect this material
        material.lights = materialData.lights === "false" ? false : true; 
      
        material.data = this._parseVertexData(materialData.data, 'material');
        this._compareVertexData(model.data, material.data);

        // Cleanup the colors string (remove all extra spaces)
        const CLEANCOLORID = /\s*\(\s*(\d+)\s*\)\s*/g;
        const CLEANDEFINITION = /([A-Z][a-z]*)\s*(\(\d+\))?[:]\s*(#[a-fA-F0-9]*)\s*/g; 
        materialData.colors = materialData.colors.replace(CLEANCOLORID, '($1)');
        materialData.colors = materialData.colors.replace(CLEANDEFINITION, '$1$2:$3 ')
        
        let colors = materialData.colors.split(' ').filter(x => x);
      
        colors.forEach(function (colorData) {
            let colorId = colorData.split(':')[0];
            let colorExId = null;
            if (colorId.includes('(')) {
              colorExId = Number(colorId.split('(')[1].replace(')',''));
              colorId = colorId.split('(')[0];
            }
            let color = colorData.split(':')[1];
            if (!material.colors[colorId]) {
                color = material.addColor(Color.fromHex(color));
                if (!/^[A-Z][a-z]*$/.test(colorId)) {
                  throw {
                    name: 'SyntaxError',
                    message: `Invalid color ID '${colorId}'.`
                  };
                }
                color.id   = colorId;
                color.exId = colorExId; 
            }
        }, this);
    }

    /**
     * Creates all voxels in the model from the (RLE) Voxel Matrix
     * @param {Model} model The model in which the voxels will be set
     * @param {string} voxels The (RLE) voxel string
     */
    static _createVoxels(model, voxels) {
        let colors = model.colors;
        let errorMaterial = null; 
        
        // Split the voxel string in numbers, (repeated) single letters or _ , Longer color Id's or ( and ) 
        let chunks = [];
        if (voxels.matchAll)
          chunks = voxels.matchAll(/[0-9]+|[A-Z][a-z]*|-+|[()]/g);
        else {
          // In case this browser does not support matchAll, DIY match all
          let regex = RegExp('[0-9]+|[A-Z][a-z]*|-+|[()]', 'g');
          let chunk;
          while ((chunk = regex.exec(voxels)) !== null) {
            console.log(chunk);
            chunks.push(chunk);
          }
          chunks = chunks[Symbol.iterator]();
        }
          
        let rleArray = this._unpackRle(chunks);

        // Check the voxel matrix size against the specified size
        let totalSize = model.size.x * model.size.y * model.size.z;
        let voxelLength = 0;
        for (let i = 0; i < rleArray.length; i++) {
            voxelLength += rleArray[i][1];
        }
        if (voxelLength !== totalSize) {
            throw {
                name: 'SyntaxError',
                message: `The specified size is ${model.size.x} x ${model.size.y} x ${model.size.z} (= ${totalSize} voxels) but the voxel matrix contains ${voxelLength} voxels.`
            };
        }

        // Prepare the voxel creation context      
        let context = {
            minx: 0,
            miny: 0,
            minz: 0,
            maxx: model.size.x - 1,
            maxy: model.size.y - 1,
            maxz: model.size.z - 1,
            x: 0,
            y: 0,
            z: 0
        };

        // Create all chunks, using the context as cursor
        for (let i = 0; i < rleArray.length; i++) {
            let color = null;
            if (rleArray[i][0] !== '-') {
                color = colors[rleArray[i][0]];
                if (!color) {
                  // Oops, this is not a known color, create a purple 'error' color
                  if (errorMaterial === null)
                    errorMaterial = model.materials.createMaterial(SVOX.MATSTANDARD, SVOX.FLAT, 0.5, 0.0, false, 1.0, false);
                  color = Color.fromHex('#FF00FF');
                  color.id = rleArray[i][0];
                  errorMaterial.addColor(color);
                  colors[rleArray[i][0]] = color;
                }
            }

            this._setVoxels(model, color, rleArray[i][1], context);
        }
    }
  
    /**
     * Parses a 'color distance strength angle' string to an ao object
     * @param {string} aoData The ao data, or undefined
     * returns {object} { color, maxDistance, strength, angle } or undefined
     */
    static _parseAo(oaData) {
      let ao = undefined;
      if (oaData) {

        if (!oaData.startsWith('#')) { 
            // Default to black color
            oaData = "#000 " + oaData;
        }

        let color = Color.fromHex(oaData.split(' ')[0]);
        let maxDistance = Math.abs(parseFloat(oaData.split(' ')[1] || 1.0));
        let strength = parseFloat(oaData.split(' ')[2] || 1.0);
        let angle = parseFloat(oaData.split(' ')[3] || 70.0);
        angle = Math.max(0, Math.min(90, Math.round(angle)));

        ao = { color, maxDistance, strength, angle };
      }
      return ao;
    }
  
     /**
     * Parses a 'colorId distance'+ string to a shell object, e.g. "P 0.25 Q 0.5"
     * @param {string} shellData The shell data, or undefined
     * returns {array} [ { colorID, distance }, ... ] or undefined
     * NOTE: Since the color may be defined in a material which is parsed later, 
     *       we'll resolve the colorID later to aad the color.
     */
    static _parseShell(shellData) {
      let shell = undefined;
      let error = false;
      if (shellData) {
        shell = [];
        if (shellData !== 'none') {
          let parts = shellData.split(/\s+/);
          if (parts.length < 2 || parts.length % 2 !== 0) { 
            error = true;
          }
          else {
            for (let s = 0; s < parts.length/2; s++) {
              let colorId  = parts[s*2 + 0];
              let distance = parts[s*2 + 1];
              if (!/^[A-Z][a-z]*$/.test(colorId) || !/^([-+]?[0-9]*\.?[0-9]+)*$/.test(distance)) {
                error = true;
                break;
              }
              else
                shell.push( { colorId:parts[s*2], distance:parts[s*2+1] } );
            }
          }
        }
      }
      
      if (error) {
        throw {
          name: 'SyntaxError',
          message: `shell '${shellData}' must be 'none' or one or more color ID's and distances, e.g. P 0.2 Q 0.4`
        };        
      }
      else if (shell) {
        shell = shell.sort(function(a,b) {
          return a.distance - b.distance;
        });
      }
        
      
      return shell;
    }
  
    /**
     * Resolves the color ID of shell to a specific material
     * @param {object} shell The shell array containing objects with containing colorId and distance
     * @param {object} model The shell object containing colorId and distance
     */
    static _resolveShellColors(shell, model) {
      if (!shell || shell.length === 0)
        return;
      
      shell.forEach(function (sh) {
        sh.color = model.colors[sh.colorId];
        if (!sh.color) {
          throw {
            name: 'SyntaxError',
            message: `shell color ID '${sh.colorId}' not found in one of the materials.`
          };           
        }
      }, this);
    }
  
    /**
     * Parses vertex data in the model or a material
     * @param {object} modelData The vertex data string
     * @param {string} modelType 'model' or 'material' depending on what is parsed to get a better error on failure
     * @returns {object} the vertex data array e.g. [ {name:"data", values:[0.3,0.6,0.9]}, {name:"size",values:[0.5}]
     * @throws Syntax error in case the vertex data is not correct (i.e. it must be [<name> <float>+]+ )
     */
    static _parseVertexData(vertexData, modelType) {
      if (vertexData) {
        let modelData = [];
        let parts = vertexData.split(/\s+/);
        let data = null;
        for (let i = 0; i < parts.length; i++) {
          let part = parts[i];
          if (isNaN(part)) {
            data = { name:part, values:[] };
            modelData.push(data);
          }
          else if (!data) {
            break;
          }
          else {
            data.values.push(parseFloat(part));
          }
        }

        let error = (modelData.length === 0);
        for (let i = 0; i < modelData.length; i++) {
          error = error || (modelData[i].values.length === 0) || (modelData[i].values.length >= 4);
        }
        if (error) {
          throw {
            name: 'SyntaxError',
            message: `The data property '${modelData.data}' of the ${modelType} should consist of one or more names, each followed by 1 to 4 float (default) values.`
          };
        }
        
        return modelData;
      }
    }

    /**
     * Compares the material vertex data to the model. They must match exactly
     * @param {object} modelData The vertex data of the model
     * @param {object} materialData The vertex data of the material
     * @returns void
     * @throws Syntax error in case the model and material vertex data is different
     */
    static _compareVertexData(modelData, materialData) {
      let error = false;
      try {
        if ((modelData || materialData) && materialData) {
          error = materialData && !(modelData);
          error = error || (modelData.length !== materialData.length);
          for (let i = 0; i < modelData.length; i++) {
            error = error || (modelData[i].name  !== materialData[i].name);
            error = error || (modelData[i].values.length !== materialData[i].values.length);
          } 
        }
      }
      catch (ex) {
        error = true;
      }    
      if (error) {
        throw {
          name: 'SyntaxError',
          message: `The data property of the material should consist of identical names and number of values as the model data property.`
        };
      }
    };    

    /**
     * Parses an 'x y z' string into an object with integer x y z values
     * @param {string} name The name of the field
     * @param {string} value The string value of the field
     * @param {string} defaultValue The default value for an optional field
     * @param {boolean} allowUniform When true one value is allowed to fill x, y and z
     * @returns {object} An { x, y, z } object with integers 
     */
    static _parseXYZInt(name, value, defaultValue, allowUniform) {
      let xyz = this._parseXYZFloat(name, value, defaultValue, allowUniform);
      return {
        x: Math.trunc(xyz.x),  
        y: Math.trunc(xyz.y),  
        z: Math.trunc(xyz.z)  
      };
    }
  
    /**
     * Parses an 'x y z' string into an object with float x y z values
     * @param {string} name The name of the field
     * @param {string} value The string value of the field
     * @param {string} defaultValue The default value for an optional field
     * @param {boolean} allowUniform When true one value is allowed to fill x, y and z
     * @returns {object} An { x, y, z } object with floats 
     */
    static _parseXYZFloat(name, value, defaultValue, allowUniform) {
      if (!value && defaultValue) 
        value = defaultValue;
      
      if (!value) {
        return null;
      }
        
      let xyz = value.split(/[\s/]+/);
      if (xyz.length === 1 && allowUniform) {
        xyz.push(xyz[0]);  
        xyz.push(xyz[0]);  
      }

      if (xyz.length !== 3) {
        throw {
          name: 'SyntaxError',
          message: `'${name}' must have three values.`
        };
      }
        
      xyz = { 
          x: parseFloat(xyz[0]), 
          y: parseFloat(xyz[1]), 
          z: parseFloat(xyz[2])
      };
      
      if (Number.isNaN(xyz.x) || Number.isNaN(xyz.y) || Number.isNaN(xyz.z)) {
        throw {
          name: 'SyntaxError',
          message: `Invalid value '${value}' for ${name}'.`
        };
      }
      
      return xyz;
    }

    /**
     * Converts the Recursively Run Length Encoded chunks into simple RLE chunks.
     * @param {[][]} chunks An array or RLE chunks (containing Color ID and count or sub chunks and count)
     * @returns {[][]} An array of simple RLE chunks containing arrays with Color ID's and counts.
     */
    static _unpackRle(chunks) {
        let result = [];
        let count = 1;
        let chunk = chunks.next();
        while (!chunk.done) {
            let value = chunk.value[0];
            if (value[0] >= '0' && value[0] <= '9') {
                count = parseInt(value, 10);
            }
            else if (value === '(') {
                // Convert the chunk to normal RLE and add it to the result (repeatedly)
                let sub = this._unpackRle(chunks);
                for (let c = 0; c < count; c++)
                    Array.prototype.push.apply(result, sub);
                count = 1;
            }
            else if (value === ')') {
                return result;
            }
            else if (value.length > 1 && value[0] >= 'A' && value[0] <= 'Z' && value[1] === value[0]) {
                if (count > 1) {
                  result.push([value[0], count]);
                  result.push([value[0], value.length -1]);
                }
                else {
                  result.push([value[0], value.length]);
                }
                count = 1;
            }
            else if (value.length > 1 && value[0] === '-' && value[1] === '-') {
                if (count > 1) {
                  result.push(['-', count]);
                  result.push(['-', value.length -1]);
                }
                else {
                  result.push(['-', value.length]);
                }
                count = 1;
            }
            else {
                result.push([value, count]);
                count = 1;
            }
            chunk = chunks.next();
        }

        return result;
    }

    /**
     * Add one or more voxel of the same color to the model in the standard running order (x, y then z).
     * Each invocation automatically advances to the next voxel. 
     * @param {Model} model The model to which to add the voxel.
     * @param {Color} color The color to set for this voxel, or null for an empty voxel.
     * @param {int} count The number of voxels to set. 
     * @param {object} context The context which holds the current 'cursor' in the voxel array.
     */
    static _setVoxels(model, color, count, context) {
        while (count-- > 0) {
            if (color) 
              model.voxels.setVoxel(context.x, context.y, context.z, new Voxel(color));
            else if(!model.resize) // Keep the empty voxels except when resize is set (to model or bounds)
              model.voxels.clearVoxel(context.x, context.y, context.z);
            context.x++;
            if (context.x > context.maxx) {
                context.x = context.minx;
                context.y++;
            }
            if (context.y > context.maxy) {
                context.y = context.miny;
                context.z++;
            }
        }
    }

    /**
     * Check whether properties are missing or unrecognized from the model data.
     * @param {object} modelData The simple object from the parsed model string.
     */
    static _validateModel(modelData) {
        let mandatory = ['size', 'materials', 'textures', 'lights', 'voxels'];
        let optional =  ['name', 'shape', 'scale', 'rotation', 'position', 'simplify', 'origin', 'autoresize', 'resize',
                         'flatten', 'clamp', 'skip', 'tile', 'ao', 'aosides', 'aosamples', 'shell', 'wireframe', 'data' ];
        this._validateProperties(modelData, mandatory, optional, 'model');

        modelData.lights.forEach(function (lightData) {
            this._validateLight(lightData);
        }, this);

        modelData.textures.forEach(function (textureData) {
            this._validateTexture(textureData);
        }, this);

        modelData.materials.forEach(function (materialData) {
            this._validateMaterial(materialData);
        }, this);
    }
  
    /**
     * Check whether properties are missing or unrecognized from the light data.
     * @param {object} lightData The simple object from the parsed model string.
     */
    static _validateLight(lightData) {
        let mandatory = ['color'];
        let optional =  ['direction', 'position', 'distance', 'size', 'detail'];
        this._validateProperties(lightData, mandatory, optional, 'light');
      
        // Extra checks
        if (lightData.direction && lightData.position) {
          throw {
            name: 'SyntaxError',
            message: `A light cannot have a 'position' as well as a 'direction'.`
          };        
        }
        if (lightData.direction && lightData.distance) {
          throw {
            name: 'SyntaxError',
            message: `A directional light cannot have a 'distance'.`
          };        
        }
        if (!lightData.position && (lightData.size || lightData.detail)) {
          throw {
            name: 'SyntaxError',
            message: `Only positional lights can have size and detail.`
          };        
        }
    }

    /**
     * Check whether properties are missing or unrecognized from the texture data.
     * @param {object} textureData The simple object from the parsed model string.
     */
    static _validateTexture(textureData) {
        let mandatory = ['id', 'image'];
        let optional =  ['cube'];
        this._validateProperties(textureData, mandatory, optional, 'texture');
    }

    /**
     * Check whether properties are missing or unrecognized from the material data.
     * @param {object} materialData The simple object from the parsed model string.
     */
    static _validateMaterial(materialData) {
        let mandatory = ['colors'];
        let optional =  ['type', 'lighting', 'fade', 'simplify', 'roughness', 'metalness', 'emissive', 'fog', 'opacity', 'alphatest', 'transparent', 'refractionratio',
                         'deform', 'warp', 'scatter', 'flatten', 'clamp', 'skip', 'ao', 'lights', 'wireframe', 'side', 'shell',
                         'map', 'normalmap', 'roughnessmap', 'metalnessmap', 'emissivemap', 'matcap', 'reflectionmap', 'refractionmap', 'maptransform', 'data'];
        this._validateProperties(materialData, mandatory, optional, 'material');
    }

     /**
     * Ensure mandatory properties are present and no unknown properties.
     * @param {object} data The simple object from the parsed model string.
     * @param {string[]} mandatory An array of allowed mandatory property names.
     * @param {string[]} optional An array of allowed optional property names.
     * @param {string} objectName The name of the object being checked.
     */
    static _validateProperties(data, mandatory, optional, objectName) {

        // Ensure all mandatory properties are present
        for (let propertyName of mandatory) {
            if (!data[propertyName]) {
                throw {
                    name: 'SyntaxError',
                    message: `Mandatory property '${propertyName}' not set in ${objectName}.`
                };
            }
        }

        // Ensure no unknown properties are present
        for (let propertyName in data) {
            if (!mandatory.includes(propertyName) && !optional.includes(propertyName)) {
                throw {
                    name: 'SyntaxError',
                    message: `Unknown property '${propertyName}' found in ${objectName}.`
                };
            }
        }
    }
}


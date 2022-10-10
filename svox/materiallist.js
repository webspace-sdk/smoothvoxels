const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

// =====================================================
// class Color
// =====================================================

/* Note, the Color class only supports hexadecimal colors like #FFF or #FFFFFF. */
/*       Its r, g and b members are stored as floats between 0 and 1.           */

class Color {

  static fromHex(hex) {
    let color = new Color();
    color._set(hex);
        
    color.id = '';
    color.exId = null; // Used for MagicaVoxel color index
    color.count = 0;
    
    return color;
  } 
  
  // r, g, b from 0 to 1 !!
  static fromRgb(r, g, b) {
    r = Math.round(clamp(r, 0, 1) * 255);
    g = Math.round(clamp(g, 0, 1) * 255);
    b = Math.round(clamp(b, 0, 1) * 255);
    let color = '#' +
                (r < 16 ? '0' : '') + r.toString(16) +
                (g < 16 ? '0' : '') + g.toString(16) +
                (b < 16 ? '0' : '') + b.toString(16);
    return Color.fromHex(color);
  } 
  
  clone() {
    let clone = new Color();
    clone._color = this._color;
    clone.r = this.r;
    clone.g = this.g;
    clone.b = this.b;
    clone._material = this._material;
    return clone;
  }
  
  multiply(factor) {
    if (factor instanceof Color)
      return Color.fromRgb(this.r*factor.r, this.g*factor.g, this.b*factor.b);
    else
      return Color.fromRgb(this.r*factor, this.g*factor, this.b*factor);
  }
  
  normalize() {
    let d = Math.sqrt(this.r*this.r + this.g*this.g + this.b*this.b);
    return this.multiply(1/d);
  }
  
  add(...colors) {
    let r = this.r + colors.reduce((sum, color) => sum + color.r, 0);
    let g = this.g + colors.reduce((sum, color) => sum + color.g, 0);
    let b = this.b + colors.reduce((sum, color) => sum + color.b, 0);
    return Color.fromRgb(r, g, b);
  }

  _setMaterial(material) {
    if (this._material !== undefined)
      throw "A Color can only be added once.";

    this._material = material;    
    this.count = 0;
  }
  
  get material() {
    return this._material;
  }
  
  _set(colorValue) {
    let color = colorValue;
    if (typeof color === 'string' || color instanceof String) {
      color = color.trim().toUpperCase();
      if (color.match(/^#([0-9a-fA-F]{3}|#?[0-9a-fA-F]{6})$/)) {
        color = color.replace('#', '');
        
        this._color = '#' + color;
        
        if (color.length === 3) {
          color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]; 
        }
        
        // Populate .r .g and .b
        let value = parseInt(color, 16);
        this.r = ((value >> 16) & 255) / 255;
        this.g = ((value >> 8) & 255) / 255;
        this.b = (value & 255) / 255;
        
        return;
      }
    }    
    
    throw {
        name: 'SyntaxError',
        message: `Color ${colorValue} is not a hexadecimal color of the form #000 or #000000.`
    };
  }
  
  toString() {
    return this._color;
  }
}

// =====================================================
// class BaseMaterial
// =====================================================

class BaseMaterial {
  
  constructor(type, roughness, metalness, 
              opacity, alphaTest, transparent, refractionRatio, wireframe, side,
              emissiveColor, emissiveIntensity, fog,
              map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
              reflectionMap, refractionMap,
              uscale, vscale, uoffset, voffset, rotation) {

    type = type || SVOX.MATSTANDARD;
    
    switch (type) {
      case SVOX.MATSTANDARD:
      case SVOX.MATBASIC:
      case SVOX.MATLAMBERT:
      case SVOX.MATPHONG:
      case SVOX.MATTOON:
      case SVOX.MATMATCAP:
      case SVOX.MATNORMAL:
        // Type is ok
        break;
      default: {
        throw {
          name: 'SyntaxError',
          message: `Unknown material type '${type}'.`
        };            
      }
    }
    this.type = type;
    
    if (((map && map.cube) || (normalMap && normalMap.cube) || (roughnessMap && roughnessMap.cube) || (metalnessMap && metalnessMap.cube) || (emissiveMap && emissiveMap.cube)) &&
        !(uscale === -1 && vscale === -1)) {
      throw {
          name: 'SyntaxError',
          message: `Cube textures can not be combined with maptransform`
      };
    }
    
    if (reflectionMap && refractionMap) {
      throw {
          name: 'SyntaxError',
          message: `One material can have a reflectionmap or a refractionmap, but not both`
      };
    }

    this.index = 0;
    
    // Standard material values
    this.roughness = typeof roughness === 'number' ? roughness : 1;
    this.metalness = typeof metalness === 'number' ? metalness : 0;
    this.opacity   = typeof opacity   === 'number' ? opacity   : 1;
    this.alphaTest = typeof alphaTest === 'number' ? alphaTest : 0;
    this.transparent = transparent ? true : false;
    this.refractionRatio = typeof refractionRatio === 'number' ? refractionRatio : 0.9;
    this.wireframe = wireframe ? true : false;
    this.side = side ? side : 'front';
    if (![SVOX.FRONT, SVOX.BACK, SVOX.DOUBLE].includes(this.side))
      this.side = SVOX.FRONT;
    this.setEmissive(emissiveColor, emissiveIntensity);  
    this.fog = typeof fog === 'boolean' ? fog : true;
    
    this.map = map;
    this.normalMap = normalMap;
    this.roughnessMap = roughnessMap;
    this.metalnessMap = metalnessMap;
    this.emissiveMap = emissiveMap;
    this.matcap = matcap;
    this.reflectionMap = reflectionMap;
    this.refractionMap = refractionMap;
    this.mapTransform = { uscale:uscale || -1, vscale:vscale || -1, 
                          uoffset:uoffset || 0, voffset:voffset || 0, 
                          rotation:rotation || 0 };
    
    this.aoActive = false;
    
    this._colors = [];
  }
  
  get baseId() {
    return `${this.type}|${this.roughness}|${this.metalness}|` +
           `${this.opacity}|${this.alphaTest}|${this.transparent?1:0}|` + 
           `${this.refractionRatio}|${this.wireframe?1:0}|${this.side}|`+ 
           (this.emissive ? `${this.emissive.color}|${this.emissive.intensity}|` : `||`) + 
           `${this.fog?1:0}|` +
           (this.map ? `${this.map.id}|` : `|`) + 
           (this.normalMap ? `${this.normalMap.id}|` : `|`) +
           (this.roughnessMap ? `${this.roughnessMap.id}|` : `|`) +
           (this.metalnessMap ? `${this.metalnessMap.id}|` : `|`) +
           (this.emissiveMap  ? `${this.emissiveMap.id}|`  : `|`) +
           (this.matcap ? `${this.matcap.id}|` : `|`) +
           (this.reflectionMap ? `${this.reflectionMap.id}|` : `|`) +
           (this.refractionMap ? `${this.refractionMap.id}|` : `|`) +
           `${this.mapTransform.uscale}|${this.mapTransform.vscale}|` + 
           `${this.mapTransform.uoffset}|${this.mapTransform.voffset}|` +
           `${this.mapTransform.rotation}`;
  }
  
  get isTransparent() {
    return this.transparent || this.opacity < 1.0;
  }
  
  setEmissive(color, intensity) {
    if (color === undefined || color === "#000" || color === "#000000" || !(intensity || 0))
      this._emissive = undefined;
    else
      this._emissive = { color: Color.fromHex(color), intensity: intensity };
  }
  
  get emissive() {
    return this._emissive;
  }
   
  get colors() {
    return this._colors;
  }
  
  get colorCount() {
    return this._colors.length;
  } 
  
  get colorUsageCount() {
    return this._colors.reduce((s,c) => (s + c.count), 0);
  } 
}

// =====================================================
// class Material
// =====================================================

class Material {
  
  constructor(baseMaterial, lighting, fade, simplify, side) {
  
    this._baseMaterial = baseMaterial;
    
    // lighting, smooth, flat or both
    this.lighting = lighting;
    this.fade = fade ? true : false;
    this.simplify = simplify === false ? false : true;
    
    // Preset the shape modifiers
    this._deform = undefined;
    this._warp = undefined;
    this._scatter = undefined;
    
    this._flatten = Planar.parse('');
    this._clamp = Planar.parse('');
    this._skip = Planar.parse('');    
    
    this._ao = undefined;
    this.lights = true;
    
    this._side = side;

    this._colors = [];
    
    this.bounds = new BoundingBox();
  }
    
  get baseId() {
    return this._baseMaterial.baseId;
  }
  
  get index() {
    return this._baseMaterial.index;
  }
  
  get colors() {
    return this._colors;
  }
  
  get colorCount() {
    return this._baseMaterial.colorCount;
  }
  
  get type() {
    return this._baseMaterial.type;
  }

  get roughness() {
    return this._baseMaterial.roughness;
  }
    
  get metalness() {
    return this._baseMaterial.metalness;
  }
    
  get opacity() {
    return this._baseMaterial.opacity;
  }
  
  get alphaTest() {
    return this._baseMaterial.alphaTest;
  }
  
  get transparent() {
    return this._baseMaterial.transparent;
  }

  get isTransparent() {
    return this._baseMaterial.isTransparent;
  }
  
  get refractionRatio() {
    return this._baseMaterial.refractionRatio;
  }
      
  get emissive() {
    return this._baseMaterial.emissive;
  }
  
  get side() {
    return this._side;
  }
    
  get fog() {
    // Emissive materials shine through fog (in case fog used as darkness) 
    return this._baseMaterial.fog;
  }
  
  get map() {
    return this._baseMaterial.map;
  }
    
  get normalMap() {
    return this._baseMaterial.normalMap;
  }
  
  get roughnessMap() {
    return this._baseMaterial.roughnessMap;
  }
  
  get metalnessMap() {
    return this._baseMaterial.metalnessMap;
  }
  
  get emissiveMap() {
    return this._baseMaterial.emissiveMap;
  }
  
  get matcap() {
    return this._baseMaterial.matcap;
  }
  
  get reflectionMap() {
    return this._baseMaterial.reflectionMap;
  }
  
  get refractionMap() {
    return this._baseMaterial.refractionMap;
  }

  get mapTransform() {
    return this._baseMaterial.mapTransform;
  }

  setDeform(count, strength, damping) {
    count = Math.max((count === null || count === undefined) ? 1 : count, 0);
    strength = (strength === null || strength === undefined) ? 1.0 : strength;
    damping = (damping === null || damping === undefined) ? 1.0 : damping;
    if (count > 0 && strength !== 0.0)
      this._deform = { count, strength, damping };
    else
      this._deform = undefined;
  }
  
  get deform() {
    return this._deform;
  }
  
  setWarp(amplitude, frequency) {
    amplitude = amplitude === undefined ? 1.0 : Math.abs(amplitude);
    frequency = frequency === undefined ? 1.0 : Math.abs(frequency);
    if (amplitude > 0.001 && frequency > 0.001)
      this._warp = { amplitude:amplitude, frequency:frequency };
    else
      this._warp = undefined;
  }

  get warp() {
    return this._warp;
  }

  set scatter(value) {
    if (value === 0.0) 
      value = undefined;
    this._scatter = Math.abs(value);
  }

  get scatter() {
    return this._scatter;
  }
  
  // Getters and setters for planar handling
  set flatten(flatten)  { this._flatten = Planar.parse(flatten); }
  get flatten() { return Planar.toString(this._flatten); }
  set clamp(clamp)  { this._clamp = Planar.parse(clamp); }
  get clamp() { return Planar.toString(this._clamp); }
  set skip(skip)  { this._skip = Planar.parse(skip); }
  get skip() { return Planar.toString(this._skip); }
  
  // Set AO as { color, maxDistance, strength, angle }
  setAo(ao) {
     this._ao = ao;
  }  
   
  get ao() {
    return this._ao;
  }
  
  set aoSides(sides)  { this._aoSides = Planar.parse(sides); }
  get aoSides() { return Planar.toString(this._aoSides); }
  
  get colors() {
    return this._colors;
  }
  
  addColorHEX(hex) {
    return this.addColor(Color.fromHex(hex));
  }  

  addColorRGB(r, g, b) {
    return this.addColor(Color.fromRgb(r, g, b));
  }    
  
  addColor(color) {
    if (!(color instanceof Color))
      throw "addColor requires a Color object, e.g. material.addColor(Color.fromHex('#FFFFFF'))";
       
    color._setMaterial(this);
    this._colors.push(color);
    this._baseMaterial._colors.push(color);
    return color;
  }
   
}

// =====================================================
// class MaterialList
// =====================================================

class MaterialList {
  
    constructor() {
      this.baseMaterials = [];
      this.materials = [];
    }
  
    createMaterial(type, lighting, roughness, metalness, 
                   fade, simplify, opacity, alphaTest, transparent, refractionRatio, wireframe, side,
                   emissiveColor, emissiveIntensity, fog,
                   map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
                   reflectionmap, refractionmap,
                   uscale, vscale, uoffset, voffset, rotation) {
      
      // Since the mesh generator reverses the faces a front and back side material are the same base material
      side = side ? side : SVOX.FRONT;
      if (![SVOX.FRONT, SVOX.BACK, SVOX.DOUBLE].includes(side))
        side = SVOX.FRONT;
      let baseSide = (side === SVOX.DOUBLE) ? SVOX.DOUBLE : SVOX.FRONT;

      let baseMaterial = new BaseMaterial(type, roughness, metalness, 
                                          opacity, alphaTest, transparent, refractionRatio, wireframe, baseSide,
                                          emissiveColor, emissiveIntensity, fog,
                                          map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap,
                                          reflectionmap, refractionmap,
                                          uscale, vscale, uoffset, voffset, rotation);
      let baseId = baseMaterial.baseId;
      let existingBase = this.baseMaterials.find(m => m.baseId === baseId);
      
      if (existingBase) {
        baseMaterial = existingBase;
      }
      else {
        this.baseMaterials.push(baseMaterial);
      }
      
      let material = new Material(baseMaterial, lighting, fade, simplify, side);
      this.materials.push(material);
      
      return material;
    }
  
    forEach(func, thisArg, baseOnly) {
      if (baseOnly) {
        this.baseMaterials.foreach(func, thisArg);
      }
      else {
        this.materials.forEach(func, thisArg);
      }
    }
  
    find(func) {
      return this.materials.find(func);
    }
  
    findColorByExId(exId) {
      let color = null;
      this.forEach(function(material) {
        if (!color) 
          color = material.colors.find(c => c.exId === exId);
      }, this);
      
      return color;
    }

    getMaterialListIndex(material) {
      return this.materials.indexOf(material);
    }
}

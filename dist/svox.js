(() => {
  // src/svox/constants.js
  var MATSTANDARD = "standard";
  var MATBASIC = "basic";
  var MATLAMBERT = "lambert";
  var MATPHONG = "phong";
  var MATMATCAP = "matcap";
  var MATTOON = "toon";
  var MATNORMAL = "normal";
  var BOUNDS = "bounds";
  var MODEL = "model";
  var FLAT = "flat";
  var QUAD = "quad";
  var SMOOTH = "smooth";
  var BOTH = "both";
  var FRONT = "front";
  var BACK = "back";
  var DOUBLE = "double";
  var _FACES = ["nx", "px", "ny", "py", "nz", "pz"];
  var _VERTEX_OFFSETS = [
    [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]],
    [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [1, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]]
  ];
  var _NEIGHBORS = [
    [-1, 0, 0],
    [1, 0, 0],
    [0, -1, 0],
    [0, 1, 0],
    [0, 0, -1],
    [0, 0, 1]
  ];
  var _FACEINDEXUVS = [
    { u: "z", v: "y", order: [0, 1, 2, 3], ud: 1, vd: 1, uo: 0, vo: 0 },
    { u: "z", v: "y", order: [3, 2, 1, 0], ud: -1, vd: 1, uo: 0.75, vo: 0 },
    { u: "x", v: "z", order: [0, 1, 2, 3], ud: 1, vd: 1, uo: 0.75, vo: 0.5 },
    { u: "x", v: "z", order: [1, 0, 3, 2], ud: 1, vd: -1, uo: 0.25, vo: 1 },
    { u: "x", v: "y", order: [3, 2, 1, 0], ud: -1, vd: 1, uo: 1, vo: 0 },
    { u: "x", v: "y", order: [0, 1, 2, 3], ud: 1, vd: 1, uo: 0.25, vo: 0 }
  ];
  var _FACEINDEXUV_MULTIPLIERS = [
    [[0, 0, 1], [0, 1, 0]],
    [[0, 0, 1], [0, 1, 0]],
    [[1, 0, 0], [0, 0, 1]],
    [[1, 0, 0], [0, 0, 1]],
    [[1, 0, 0], [0, 1, 0]],
    [[1, 0, 0], [0, 1, 0]]
  ];

  // src/svox/color.js
  var clamp = (num, min, max) => Math.min(Math.max(num, min), max);
  var Color = class {
    static fromHex(hex) {
      const color = new Color();
      color._set(hex);
      color.id = "";
      color.exId = null;
      color.count = 0;
      return color;
    }
    static fromRgb(r, g, b) {
      r = Math.round(clamp(r, 0, 1) * 255);
      g = Math.round(clamp(g, 0, 1) * 255);
      b = Math.round(clamp(b, 0, 1) * 255);
      const color = "#" + (r < 16 ? "0" : "") + r.toString(16) + (g < 16 ? "0" : "") + g.toString(16) + (b < 16 ? "0" : "") + b.toString(16);
      return Color.fromHex(color);
    }
    clone() {
      const clone = new Color();
      clone._color = this._color;
      clone.r = this.r;
      clone.g = this.g;
      clone.b = this.b;
      clone._material = this._material;
      return clone;
    }
    multiply(factor) {
      if (factor instanceof Color) {
        return Color.fromRgb(this.r * factor.r, this.g * factor.g, this.b * factor.b);
      } else {
        return Color.fromRgb(this.r * factor, this.g * factor, this.b * factor);
      }
    }
    normalize() {
      const d = Math.sqrt(this.r * this.r + this.g * this.g + this.b * this.b);
      return this.multiply(1 / d);
    }
    add(...colors) {
      const r = this.r + colors.reduce((sum, color) => sum + color.r, 0);
      const g = this.g + colors.reduce((sum, color) => sum + color.g, 0);
      const b = this.b + colors.reduce((sum, color) => sum + color.b, 0);
      return Color.fromRgb(r, g, b);
    }
    _setMaterial(material) {
      if (this._material !== void 0) {
        throw new Error("A Color can only be added once.");
      }
      this._material = material;
      this.count = 0;
    }
    get material() {
      return this._material;
    }
    _set(colorValue) {
      let color = colorValue;
      if (typeof color === "string" || color instanceof String) {
        color = color.trim().toUpperCase();
        if (color.match(/^#([0-9a-fA-F]{3}|#?[0-9a-fA-F]{6})$/)) {
          color = color.replace("#", "");
          this._color = "#" + color;
          if (color.length === 3) {
            color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
          }
          const value = parseInt(color, 16);
          this.r = (value >> 16 & 255) / 255;
          this.g = (value >> 8 & 255) / 255;
          this.b = (value & 255) / 255;
          return;
        }
      }
      throw new Error(`SyntaxError: Color ${colorValue} is not a hexadecimal color of the form #000 or #000000.`);
    }
    toString() {
      return this._color;
    }
  };

  // src/svox/basematerial.js
  var BaseMaterial = class {
    constructor(type, roughness, metalness, opacity, alphaTest, transparent, refractionRatio, wireframe, side, emissiveColor, emissiveIntensity, fog, map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap, reflectionMap, refractionMap, uscale, vscale, uoffset, voffset, rotation) {
      type = type || MATSTANDARD;
      switch (type) {
        case MATSTANDARD:
        case MATBASIC:
        case MATLAMBERT:
        case MATPHONG:
        case MATTOON:
        case MATMATCAP:
        case MATNORMAL:
          break;
        default: {
          throw new Error("SyntaxError: Unknown material type: " + type);
        }
      }
      this.type = type;
      if ((map && map.cube || normalMap && normalMap.cube || roughnessMap && roughnessMap.cube || metalnessMap && metalnessMap.cube || emissiveMap && emissiveMap.cube) && !(uscale === -1 && vscale === -1)) {
        throw new Error("SyntaxError: Cube textures can not be combined with maptransform");
      }
      if (reflectionMap && refractionMap) {
        throw new Error("SyntaxError: One material can have a reflectionmap or a refractionmap, but not both");
      }
      this.index = 0;
      this.roughness = typeof roughness === "number" ? roughness : 1;
      this.metalness = typeof metalness === "number" ? metalness : 0;
      this.opacity = typeof opacity === "number" ? opacity : 1;
      this.alphaTest = typeof alphaTest === "number" ? alphaTest : 0;
      this.transparent = !!transparent;
      this.refractionRatio = typeof refractionRatio === "number" ? refractionRatio : 0.9;
      this.wireframe = !!wireframe;
      this.side = side || FRONT;
      if (![FRONT, BACK, DOUBLE].includes(this.side)) {
        this.side = FRONT;
      }
      this.setEmissive(emissiveColor, emissiveIntensity);
      this.fog = typeof fog === "boolean" ? fog : true;
      this.map = map;
      this.normalMap = normalMap;
      this.roughnessMap = roughnessMap;
      this.metalnessMap = metalnessMap;
      this.emissiveMap = emissiveMap;
      this.matcap = matcap;
      this.reflectionMap = reflectionMap;
      this.refractionMap = refractionMap;
      this.mapTransform = {
        uscale: uscale || -1,
        vscale: vscale || -1,
        uoffset: uoffset || 0,
        voffset: voffset || 0,
        rotation: rotation || 0
      };
      this.aoActive = false;
      this._colors = [];
    }
    get baseId() {
      if (this._baseId === void 0) {
        this._baseId = `${this.type}|${this.roughness}|${this.metalness}|${this.opacity}|${this.alphaTest}|${this.transparent ? 1 : 0}|${this.refractionRatio}|${this.wireframe ? 1 : 0}|${this.side}|` + (this.emissive ? `${this.emissive.color}|${this.emissive.intensity}|` : "||") + `${this.fog ? 1 : 0}|` + (this.map ? `${this.map.id}|` : "|") + (this.normalMap ? `${this.normalMap.id}|` : "|") + (this.roughnessMap ? `${this.roughnessMap.id}|` : "|") + (this.metalnessMap ? `${this.metalnessMap.id}|` : "|") + (this.emissiveMap ? `${this.emissiveMap.id}|` : "|") + (this.matcap ? `${this.matcap.id}|` : "|") + (this.reflectionMap ? `${this.reflectionMap.id}|` : "|") + (this.refractionMap ? `${this.refractionMap.id}|` : "|") + `${this.mapTransform.uscale}|${this.mapTransform.vscale}|${this.mapTransform.uoffset}|${this.mapTransform.voffset}|${this.mapTransform.rotation}`;
      }
      return this._baseId;
    }
    get isTransparent() {
      return this.transparent || this.opacity < 1;
    }
    setEmissive(color, intensity) {
      if (color === void 0 || color === "#000" || color === "#000000" || !(intensity || 0)) {
        this._emissive = void 0;
      } else {
        this._emissive = { color: Color.fromHex(color), intensity };
      }
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
      return this._colors.reduce((s, c) => s + c.count, 0);
    }
  };

  // src/svox/bits.js
  function set(offset, value, bits, view) {
    let bufOffset = bits * offset;
    for (let i = 0; i < bits; ) {
      const bitOffset = bufOffset & 7;
      const byteOffset = bufOffset >> 3;
      const remaining = bits - i;
      const residual = 8 - bitOffset;
      const wrote = remaining < residual ? remaining : residual;
      const mask = ~(255 << wrote);
      const writeBits = value & mask;
      value >>= wrote;
      const destMask = ~(mask << bitOffset);
      view[byteOffset] = view[byteOffset] & destMask | writeBits << bitOffset;
      bufOffset += wrote;
      i += wrote;
    }
  }
  var Bits1 = class {
    constructor(view) {
      this.view = view;
    }
    get(offset) {
      return this.view[offset >> 3] >> (offset & 7) & 1;
    }
    set(offset, value) {
      return set(offset, value, 1, this.view);
    }
    clear() {
      this.view.fill(0);
    }
  };
  var Bits2 = class {
    constructor(view) {
      this.view = view;
    }
    get(offset) {
      return this.view[offset >> 2] >> ((offset & 3) << 1) & 3;
    }
    set(offset, value) {
      return set(offset, value, 2, this.view);
    }
    clear() {
      this.view.fill(0);
    }
  };
  var Bits4 = class {
    constructor(view) {
      this.view = view;
    }
    get(offset) {
      return this.view[offset >> 1] >> ((offset & 1) << 2) & 15;
    }
    set(offset, value) {
      return set(offset, value, 4, this.view);
    }
    clear() {
      this.view.fill(0);
    }
  };
  var Bits8 = class {
    constructor(view) {
      this.view = view;
    }
    get(offset) {
      return this.view[offset] >>> 0;
    }
    set(offset, value) {
      return set(offset, value, 8, this.view);
    }
    clear() {
      this.view.fill(0);
    }
  };
  var BitsN = class {
    constructor(view, bits) {
      this.view = view;
      this.bits = bits;
    }
    get(offset) {
      const { view, bits } = this;
      let bufOffset = offset * bits;
      let value = 0;
      for (let i = 0; i < bits; ) {
        const bitOffset = bufOffset & 7;
        const byteOffset = bufOffset >> 3;
        const remaining = bits - i;
        const residual = 8 - bitOffset;
        const read = remaining < residual ? remaining : residual;
        const currentByte = view[byteOffset];
        const mask = ~(255 << read);
        const readBits = currentByte >> bitOffset & mask;
        value |= readBits << i;
        bufOffset += read;
        i += read;
      }
      return value >>> 0;
    }
    set(offset, value) {
      set(offset, value, this.bits, this.view);
    }
    clear() {
      this.view.fill(0);
    }
  };
  var Bits = class {
    static create(buffer, bits, offset, length = null) {
      const view = length ? new Uint8Array(buffer, offset, length) : new Uint8Array(buffer, offset);
      switch (bits) {
        case 1:
          return new Bits1(view);
        case 2:
          return new Bits2(view);
        case 4:
          return new Bits4(view);
        case 8:
          return new Bits8(view);
        default:
          return new BitsN(view);
      }
    }
  };

  // src/svox/boundingbox.js
  var BoundingBox = class {
    get size() {
      if (this.minX > this.maxX) {
        return { x: 0, y: 0, z: 0 };
      } else {
        return {
          x: this.maxX - this.minX + 1,
          y: this.maxY - this.minY + 1,
          z: this.maxZ - this.minZ + 1
        };
      }
    }
    constructor() {
      this.reset();
    }
    reset() {
      this.minX = Number.POSITIVE_INFINITY;
      this.minY = Number.POSITIVE_INFINITY;
      this.minZ = Number.POSITIVE_INFINITY;
      this.maxX = Number.NEGATIVE_INFINITY;
      this.maxY = Number.NEGATIVE_INFINITY;
      this.maxZ = Number.NEGATIVE_INFINITY;
    }
    set(x, y, z) {
      this.minX = Math.min(this.minX, x);
      this.minY = Math.min(this.minY, y);
      this.minZ = Math.min(this.minZ, z);
      this.maxX = Math.max(this.maxX, x);
      this.maxY = Math.max(this.maxY, y);
      this.maxZ = Math.max(this.maxZ, z);
    }
  };

  // src/svox/light.js
  var Light = class {
    constructor(color, strength, direction, position, distance, size, detail) {
      this.color = color;
      this.strength = strength;
      this.direction = direction;
      this.position = position;
      this.distance = distance;
      this.size = size;
      this.detail = detail;
    }
  };

  // src/svox/planar.js
  var Planar = class {
    static parse(value) {
      if (!value) {
        return void 0;
      }
      value = " " + (value || "").toLowerCase();
      if (value !== " " && !/^(?!$)(\s+(?:none|-x|x|\+x|-y|y|\+y|-z|z|\+z|\s))+\s*$/.test(value)) {
        throw new Error(`SyntaxError: Planar expression '${value}' is only allowed to be 'none' or contain -x x +x -y y +y -z z +z.`);
      }
      const none = value.includes("none");
      return {
        nx: !none && value.includes("-x"),
        x: !none && value.includes(" x"),
        px: !none && value.includes("+x"),
        ny: !none && value.includes("-y"),
        y: !none && value.includes(" y"),
        py: !none && value.includes("+y"),
        nz: !none && value.includes("-z"),
        z: !none && value.includes(" z"),
        pz: !none && value.includes("+z")
      };
    }
    static toString(planar) {
      if (!planar) {
        return void 0;
      }
      const result = (planar.nx ? " -x" : "") + (planar.x ? " x" : "") + (planar.px ? " +x" : "") + (planar.ny ? " -y" : "") + (planar.y ? " y" : "") + (planar.py ? " +y" : "") + (planar.nz ? " -z" : "") + (planar.z ? " z" : "") + (planar.pz ? " +z" : "");
      return result.trim();
    }
    static combine(planar1, planar2, defaultPlanar) {
      if (!planar1 && !planar2) {
        return defaultPlanar;
      }
      if (!planar1) {
        return planar2;
      }
      if (!planar2) {
        return planar1;
      }
      if (planar1 === planar2) {
        return planar1;
      }
      return {
        nx: planar1.nx || planar2.nx,
        x: planar1.x || planar2.x,
        px: planar1.px || planar2.px,
        ny: planar1.ny || planar2.ny,
        y: planar1.y || planar2.y,
        py: planar1.py || planar2.py,
        nz: planar1.nz || planar2.nz,
        z: planar1.z || planar2.z,
        pz: planar1.pz || planar2.pz
      };
    }
  };

  // src/svox/material.js
  var Material = class {
    constructor(baseMaterial, lighting, fade, simplify, side) {
      this._baseMaterial = baseMaterial;
      this.lighting = lighting;
      this.fade = !!fade;
      this.simplify = simplify !== false;
      this._deform = void 0;
      this._warp = void 0;
      this._scatter = void 0;
      this._flatten = Planar.parse("");
      this._clamp = Planar.parse("");
      this._skip = Planar.parse("");
      this._ao = void 0;
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
      count = Math.max(count === null || count === void 0 ? 1 : count, 0);
      strength = strength === null || strength === void 0 ? 1 : strength;
      damping = damping === null || damping === void 0 ? 1 : damping;
      if (count > 0 && strength !== 0) {
        this._deform = { count, strength, damping };
      } else {
        this._deform = { count: 0, strength: 0, damping: 0 };
      }
    }
    get deform() {
      return this._deform;
    }
    setWarp(amplitude, frequency) {
      amplitude = amplitude === void 0 ? 1 : Math.abs(amplitude);
      frequency = frequency === void 0 ? 1 : Math.abs(frequency);
      if (amplitude > 1e-3 && frequency > 1e-3) {
        this._warp = { amplitude, frequency };
      } else {
        this._warp = void 0;
      }
    }
    get warp() {
      return this._warp;
    }
    set scatter(value) {
      if (value === 0) {
        value = void 0;
      }
      this._scatter = Math.abs(value);
    }
    get scatter() {
      return this._scatter;
    }
    set flatten(flatten) {
      this._flatten = Planar.parse(flatten);
    }
    get flatten() {
      return Planar.toString(this._flatten);
    }
    set clamp(clamp2) {
      this._clamp = Planar.parse(clamp2);
    }
    get clamp() {
      return Planar.toString(this._clamp);
    }
    set skip(skip) {
      this._skip = Planar.parse(skip);
    }
    get skip() {
      return Planar.toString(this._skip);
    }
    setAo(ao) {
      this._ao = ao;
    }
    get ao() {
      return this._ao;
    }
    set aoSides(sides) {
      this._aoSides = Planar.parse(sides);
    }
    get aoSides() {
      return Planar.toString(this._aoSides);
    }
    addColorHEX(hex) {
      return this.addColor(Color.fromHex(hex));
    }
    addColorRGB(r, g, b) {
      return this.addColor(Color.fromRgb(r, g, b));
    }
    addColor(color) {
      if (!(color instanceof Color)) {
        throw new Error("addColor requires a Color object, e.g. material.addColor(Color.fromHex('#FFFFFF'))");
      }
      color._setMaterial(this);
      this._colors.push(color);
      this._baseMaterial._colors.push(color);
      return color;
    }
  };

  // src/svox/materiallist.js
  var MaterialList = class {
    constructor() {
      this.baseMaterials = [];
      this.materials = [];
    }
    createMaterial(type, lighting, roughness, metalness, fade, simplify, opacity, alphaTest, transparent, refractionRatio, wireframe, side, emissiveColor, emissiveIntensity, fog, map, normalMap, roughnessMap, metalnessMap, emissiveMap, matcap, reflectionmap, refractionmap, uscale, vscale, uoffset, voffset, rotation) {
      side = side || FRONT;
      if (![FRONT, BACK, DOUBLE].includes(side)) {
        side = FRONT;
      }
      const baseSide = side === DOUBLE ? DOUBLE : FRONT;
      let baseMaterial = new BaseMaterial(
        type,
        roughness,
        metalness,
        opacity,
        alphaTest,
        transparent,
        refractionRatio,
        wireframe,
        baseSide,
        emissiveColor,
        emissiveIntensity,
        fog,
        map,
        normalMap,
        roughnessMap,
        metalnessMap,
        emissiveMap,
        matcap,
        reflectionmap,
        refractionmap,
        uscale,
        vscale,
        uoffset,
        voffset,
        rotation
      );
      const baseId = baseMaterial.baseId;
      const existingBase = this.baseMaterials.find((m) => m.baseId === baseId);
      if (existingBase) {
        baseMaterial = existingBase;
      } else {
        this.baseMaterials.push(baseMaterial);
      }
      const material = new Material(baseMaterial, lighting, fade, simplify, side);
      this.materials.push(material);
      return material;
    }
    clearMaterials() {
      this.materials.length = 0;
    }
    forEach(func, thisArg, baseOnly) {
      if (baseOnly) {
        this.baseMaterials.foreach(func, thisArg);
      } else {
        this.materials.forEach(func, thisArg);
      }
    }
    find(func) {
      return this.materials.find(func);
    }
    findColorByExId(exId) {
      let color = null;
      this.forEach(function(material) {
        if (!color) {
          color = material.colors.find((c) => c.exId === exId);
        }
      }, this);
      return color;
    }
    getMaterialListIndex(material) {
      return this.materials.indexOf(material);
    }
  };

  // src/svox/svoxmeshgenerator.js
  var vertCache = /* @__PURE__ */ new Map();
  var SvoxMeshGenerator = class {
    static generate(model, buffers) {
      model.prepareForRender(buffers);
      const { nonCulledFaceCount } = model;
      const mesh = {
        materials: [],
        groups: [],
        indices: Array(nonCulledFaceCount * 6),
        indicesIndex: 0,
        maxIndex: -1,
        positions: new Float32Array(nonCulledFaceCount * 4 * 3),
        normals: new Float32Array(nonCulledFaceCount * 4 * 3),
        colors: new Float32Array(nonCulledFaceCount * 4 * 3),
        uvs: new Float32Array(nonCulledFaceCount * 4 * 2),
        data: null
      };
      model.materials.baseMaterials.forEach(function(material) {
        material.index = mesh.materials.length;
        mesh.materials.push(SvoxMeshGenerator._generateMaterial(material, model));
      }, this);
      vertCache.clear();
      SvoxMeshGenerator._generateAll(model, mesh, buffers);
      return mesh;
    }
    static _generateMaterial(definition, modeldefinition) {
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
        side: definition.side === DOUBLE ? DOUBLE : FRONT
      };
      if (definition.type !== MATNORMAL) {
        material.color = "#FFF";
      }
      if (definition.emissive) {
        material.emissive = definition.emissive.color.toString();
        material.emissiveIntensity = definition.emissive.intensity;
      }
      if (definition.map) {
        material.map = {
          image: definition.map.image,
          uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
          vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
          uoffset: definition.mapTransform.uoffset,
          voffset: definition.mapTransform.voffset,
          rotation: definition.mapTransform.rotation
        };
      }
      if (definition.normalMap) {
        material.normalMap = {
          image: definition.normalMap.image,
          uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
          vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
          uoffset: definition.mapTransform.uoffset,
          voffset: definition.mapTransform.voffset,
          rotation: definition.mapTransform.rotation
        };
      }
      if (definition.roughnessMap) {
        material.roughnessMap = {
          image: definition.roughnessMap.image,
          uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
          vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
          uoffset: definition.mapTransform.uoffset,
          voffset: definition.mapTransform.voffset,
          rotation: definition.mapTransform.rotation
        };
      }
      if (definition.metalnessMap) {
        material.metalnessMap = {
          image: definition.metalnessMap.image,
          uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
          vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
          uoffset: definition.mapTransform.uoffset,
          voffset: definition.mapTransform.voffset,
          rotation: definition.mapTransform.rotation
        };
      }
      if (definition.emissiveMap) {
        material.emissiveMap = {
          image: definition.emissiveMap.image,
          uscale: definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale,
          vscale: definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
          uoffset: definition.mapTransform.uoffset,
          voffset: definition.mapTransform.voffset,
          rotation: definition.mapTransform.rotation
        };
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
      model.materials.baseMaterials.forEach(function(baseMaterial) {
        const start = mesh.indicesIndex;
        for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
          const material = materials[faceMaterials[faceIndex]];
          if (material._baseMaterial === baseMaterial && faceCulled.get(faceIndex) === 0) {
            SvoxMeshGenerator._generateFace(model, buffers, faceIndex, mesh);
          }
        }
        const end = mesh.indicesIndex;
        mesh.groups.push({ start, count: end - start, materialIndex: baseMaterial.index });
      }, this);
      console.log(vertCache);
      mesh.indices.length = mesh.indicesIndex;
      mesh.positions = new Float32Array(mesh.positions, 0, mesh.indicesIndex * 3);
      mesh.normals = new Float32Array(mesh.normals, 0, mesh.indicesIndex * 3);
      mesh.colors = new Float32Array(mesh.colors, 0, mesh.indicesIndex * 3);
      mesh.uvs = new Float32Array(mesh.uvs, 0, mesh.indicesIndex * 2);
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
      let norm1X = faceVertNormalX[faceIndex * 4 + 1];
      let norm1Y = faceVertNormalY[faceIndex * 4 + 1];
      let norm1Z = faceVertNormalZ[faceIndex * 4 + 1];
      let norm2X = faceVertNormalX[faceIndex * 4 + 2];
      let norm2Y = faceVertNormalY[faceIndex * 4 + 2];
      let norm2Z = faceVertNormalZ[faceIndex * 4 + 2];
      let norm3X = faceVertNormalX[faceIndex * 4 + 3];
      let norm3Y = faceVertNormalY[faceIndex * 4 + 3];
      let norm3Z = faceVertNormalZ[faceIndex * 4 + 3];
      let col0R = faceVertColorR[faceIndex * 4];
      let col0G = faceVertColorG[faceIndex * 4];
      let col0B = faceVertColorB[faceIndex * 4];
      const col1R = faceVertColorR[faceIndex * 4 + 1];
      const col1G = faceVertColorG[faceIndex * 4 + 1];
      const col1B = faceVertColorB[faceIndex * 4 + 1];
      let col2R = faceVertColorR[faceIndex * 4 + 2];
      let col2G = faceVertColorG[faceIndex * 4 + 2];
      let col2B = faceVertColorB[faceIndex * 4 + 2];
      const col3R = faceVertColorR[faceIndex * 4 + 3];
      const col3G = faceVertColorG[faceIndex * 4 + 3];
      const col3B = faceVertColorB[faceIndex * 4 + 3];
      let uv0U = faceVertUs[faceIndex * 4];
      let uv0V = faceVertVs[faceIndex * 4];
      const uv1U = faceVertUs[faceIndex * 4 + 1];
      const uv1V = faceVertVs[faceIndex * 4 + 1];
      let uv2U = faceVertUs[faceIndex * 4 + 2];
      let uv2V = faceVertVs[faceIndex * 4 + 2];
      const uv3U = faceVertUs[faceIndex * 4 + 3];
      const uv3V = faceVertVs[faceIndex * 4 + 3];
      if (material.side === BACK) {
        let swapX, swapY, swapZ;
        swapX = vert0X;
        swapY = vert0Y;
        swapZ = vert0Z;
        vert0X = vert2X;
        vert0Y = vert2Y;
        vert0Z = vert2Z;
        vert2X = swapX;
        vert2Y = swapY;
        vert2Z = swapZ;
        swapX = norm0X;
        swapY = norm0Y;
        swapZ = norm0Z;
        norm0X = norm2X;
        norm0Y = norm2Y;
        norm0Z = norm2Z;
        norm2X = swapX;
        norm2Y = swapY;
        norm2Z = swapZ;
        swapX = col0R;
        swapY = col0G;
        swapZ = col0B;
        col0R = col2R;
        col0G = col2G;
        col0B = col2B;
        col2R = swapX;
        col2G = swapY;
        col2B = swapZ;
        swapX = uv0U;
        swapY = uv0V;
        uv0U = uv2U;
        uv0V = uv2V;
        uv2U = swapX;
        uv2V = swapY;
      }
      const smooth = faceSmooth.get(faceIndex) === 1;
      if (!(material.lighting === SMOOTH || material.lighting === BOTH && smooth)) {
        let normFace1X = norm2X + norm1X + norm0X;
        let normFace1Y = norm2Y + norm1Y + norm0Y;
        let normFace1Z = norm2Z + norm1Z + norm0Z;
        let normFace2X = norm0X + norm3X + norm2X;
        let normFace2Y = norm0Y + norm3Y + norm2Y;
        let normFace2Z = norm0Z + norm3Z + norm2Z;
        const normFace1Length = Math.sqrt(normFace1X * normFace1X + normFace1Y * normFace1Y + normFace1Z * normFace1Z);
        const normFace2Length = Math.sqrt(normFace2X * normFace2X + normFace2Y * normFace2Y + normFace2Z * normFace2Z);
        const normFace1LengthInv = 1 / normFace1Length;
        const normFace2LengthInv = 1 / normFace2Length;
        normFace1X *= normFace1LengthInv;
        normFace1Y *= normFace1LengthInv;
        normFace1Z *= normFace1LengthInv;
        normFace2X *= normFace2LengthInv;
        normFace2Y *= normFace2LengthInv;
        normFace2Z *= normFace2LengthInv;
        if (material.lighting === QUAD) {
          const combinedFaceLength = Math.sqrt(normFace1X * normFace1X + normFace1Y * normFace1Y + normFace1Z * normFace1Z) + Math.sqrt(normFace2X * normFace2X + normFace2Y * normFace2Y + normFace2Z * normFace2Z);
          const combinedFaceLengthInv = 1 / combinedFaceLength;
          normFace1X = normFace2X = (normFace1X + normFace2X) * combinedFaceLengthInv;
          normFace1Y = normFace2Y = (normFace1Y + normFace2Y) * combinedFaceLengthInv;
          normFace1Z = normFace2Z = (normFace1Z + normFace2Z) * combinedFaceLengthInv;
        }
        norm0X = normFace1X;
        norm0Y = normFace1Y;
        norm0Z = normFace1Z;
        norm1X = normFace1X;
        norm1Y = normFace1Y;
        norm1Z = normFace1Z;
        norm2X = normFace1X;
        norm2Y = normFace1Y;
        norm2Z = normFace1Z;
        norm3X = normFace2X;
        norm3Y = normFace2Y;
        norm3Z = normFace2Z;
      }
      const indices = mesh.indices;
      const positions = mesh.positions;
      const normals = mesh.normals;
      const colors = mesh.colors;
      const uvs = mesh.uvs;
      const vert0Key = vert0X * 3 + vert0Y * 13 + vert0Z * 23 + norm0X * 37 + norm0Y * 41 + norm0Z * 59 + col0R * 61 + col0G * 83 + col0B * 89 + uv0U * 98 + uv0V * 103;
      const vert1Key = vert1X * 3 + vert1Y * 13 + vert1Z * 23 + norm1X * 37 + norm1Y * 41 + norm1Z * 59 + col1R * 61 + col1G * 83 + col1B * 89 + uv1U * 98 + uv1V * 103;
      const vert2Key = vert2X * 3 + vert2Y * 13 + vert2Z * 23 + norm2X * 37 + norm2Y * 41 + norm2Z * 59 + col2R * 61 + col2G * 83 + col2B * 89 + uv2U * 98 + uv2V * 103;
      const vert3Key = vert3X * 3 + vert3Y * 13 + vert3Z * 23 + norm3X * 37 + norm3Y * 41 + norm3Z * 59 + col3R * 61 + col3G * 83 + col3B * 89 + uv3U * 98 + uv3V * 103;
      const hasVert0 = vertCache.has(vert0Key);
      const hasVert1 = vertCache.has(vert1Key);
      const hasVert2 = vertCache.has(vert2Key);
      const hasVert3 = vertCache.has(vert3Key);
      let vert0Idx, vert1Idx, vert2Idx, vert3Idx;
      if (hasVert0) {
        vert0Idx = vertCache.get(vert0Key);
      } else {
        vert0Idx = mesh.maxIndex + 1;
        const offset30 = vert0Idx * 3;
        const offset31 = offset30 + 1;
        const offset32 = offset30 + 2;
        const offset20 = vert0Idx * 2;
        const offset21 = offset20 + 1;
        mesh.maxIndex = vert0Idx;
        positions[offset30] = vert0X;
        positions[offset31] = vert0Y;
        positions[offset32] = vert0Z;
        normals[offset30] = norm0X;
        normals[offset31] = norm0Y;
        normals[offset32] = norm0Z;
        colors[offset30] = col0R;
        colors[offset31] = col0G;
        colors[offset32] = col0B;
        uvs[offset20] = uv0U;
        uvs[offset21] = uv0V;
        vertCache.set(vert0Key, vert0Idx);
      }
      if (hasVert1) {
        vert1Idx = vertCache.get(vert1Key);
      } else {
        vert1Idx = mesh.maxIndex + 1;
        const offset30 = vert1Idx * 3;
        const offset31 = offset30 + 1;
        const offset32 = offset30 + 2;
        const offset20 = vert1Idx * 2;
        const offset21 = offset20 + 1;
        mesh.maxIndex = vert1Idx;
        positions[offset30] = vert1X;
        positions[offset31] = vert1Y;
        positions[offset32] = vert1Z;
        normals[offset30] = norm1X;
        normals[offset31] = norm1Y;
        normals[offset32] = norm1Z;
        colors[offset30] = col1R;
        colors[offset31] = col1G;
        colors[offset32] = col1B;
        uvs[offset20] = uv1U;
        uvs[offset21] = uv1V;
        vertCache.set(vert1Key, vert1Idx);
      }
      if (hasVert2) {
        vert2Idx = vertCache.get(vert2Key);
      } else {
        vert2Idx = mesh.maxIndex + 1;
        const offset30 = vert2Idx * 3;
        const offset31 = offset30 + 1;
        const offset32 = offset30 + 2;
        const offset20 = vert2Idx * 2;
        const offset21 = offset20 + 1;
        mesh.maxIndex = vert2Idx;
        positions[offset30] = vert2X;
        positions[offset31] = vert2Y;
        positions[offset32] = vert2Z;
        normals[offset30] = norm2X;
        normals[offset31] = norm2Y;
        normals[offset32] = norm2Z;
        colors[offset30] = col2R;
        colors[offset31] = col2G;
        colors[offset32] = col2B;
        uvs[offset20] = uv2U;
        uvs[offset21] = uv2V;
        vertCache.set(vert2Key, vert2Idx);
      }
      if (hasVert3) {
        vert3Idx = vertCache.get(vert3Key);
      } else {
        vert3Idx = mesh.maxIndex + 1;
        const offset30 = vert3Idx * 3;
        const offset31 = offset30 + 1;
        const offset32 = offset30 + 2;
        const offset20 = vert3Idx * 2;
        const offset21 = offset20 + 1;
        mesh.maxIndex = vert3Idx;
        positions[offset30] = vert3X;
        positions[offset31] = vert3Y;
        positions[offset32] = vert3Z;
        normals[offset30] = norm3X;
        normals[offset31] = norm3Y;
        normals[offset32] = norm3Z;
        colors[offset30] = col3R;
        colors[offset31] = col3G;
        colors[offset32] = col3B;
        uvs[offset20] = uv3U;
        uvs[offset21] = uv3V;
        vertCache.set(vert3Key, vert3Idx);
      }
      const iIdx = mesh.indicesIndex;
      indices[iIdx] = vert2Idx;
      indices[iIdx + 1] = vert1Idx;
      indices[iIdx + 2] = vert0Idx;
      indices[iIdx + 3] = vert0Idx;
      indices[iIdx + 4] = vert3Idx;
      indices[iIdx + 5] = vert2Idx;
      mesh.indicesIndex += 6;
    }
  };

  // src/svox/voxels.js
  var VERSION = 0;
  var EMPTY_VOXEL_PALETTE_INDEX = 0;
  var MAX_SIZE = 128;
  var HEADER_SIZE = 8;
  var VOXEL_TYPE_DIFFUSE = 0;
  var VOXEL_TYPE_REMOVE = 255;
  var REMOVE_VOXEL_COLOR = VOXEL_TYPE_REMOVE << 24 >>> 0;
  var VOX_CHUNK_FILTERS = {
    NONE: 0,
    PAINT: 1,
    KEEP: 2
  };
  var RESERVED_PALETTE_INDEXES = 1;
  var iPalOpToIPalSnap = /* @__PURE__ */ new Map();
  var shiftForSize = (size) => Math.floor(size % 2 === 0 ? size / 2 - 1 : size / 2);
  var xyzRangeForSize = (size) => {
    const [x, y, z] = size;
    const xShift = shiftForSize(x);
    const yShift = shiftForSize(y);
    const zShift = shiftForSize(z);
    const maxX = x - xShift - 1;
    const maxY = y - yShift - 1;
    const maxZ = z - zShift - 1;
    const minX = -xShift;
    const minY = -yShift;
    const minZ = -zShift;
    return [minX, maxX, minY, maxY, minZ, maxZ];
  };
  var PALETTE_ENTRY_SIZE_INTS = 1;
  var PALETTE_ENTRY_SIZE_BYTES = PALETTE_ENTRY_SIZE_INTS * 4;
  function createViewsForBitsPerIndex(size, bitsPerIndex, buffer = null) {
    const numPaletteEntries = 2 ** bitsPerIndex - RESERVED_PALETTE_INDEXES;
    const paletteBytes = PALETTE_ENTRY_SIZE_BYTES * numPaletteEntries;
    const indexBits = size[0] * size[1] * size[2] * bitsPerIndex;
    const indexBytes = Math.floor(indexBits / 8) + 1;
    const bytes = HEADER_SIZE + paletteBytes + indexBytes;
    if (buffer == null) {
      if (typeof Buffer !== "undefined") {
        buffer = Buffer.alloc(bytes).buffer;
      } else {
        buffer = new ArrayBuffer(bytes);
      }
    }
    const header = new Uint8Array(buffer, 0, HEADER_SIZE);
    const paletteLength = paletteBytes / PALETTE_ENTRY_SIZE_BYTES;
    const palette = new Uint32Array(buffer, HEADER_SIZE, paletteLength);
    const indices = Bits.create(buffer, bitsPerIndex, HEADER_SIZE + paletteBytes);
    header[0] = VERSION;
    [header[1], header[2], header[3]] = size;
    header[4] = bitsPerIndex;
    return [buffer, palette, indices];
  }
  var Voxels = class {
    constructor(size = null, paletteBuffer = null, indicesBuffer = null, bitsPerIndex = 8, paletteOffset = 0, paletteByteLength = null, indicesOffset = 0, indicesByteLength = null) {
      if (paletteBuffer && indicesBuffer) {
        this.size = [size[0], size[1], size[2]];
        this.bitsPerIndex = bitsPerIndex;
        paletteByteLength = paletteByteLength || paletteBuffer.length;
        indicesByteLength = indicesByteLength || indicesBuffer.length;
        this.palette = new Uint32Array(paletteBuffer, paletteOffset || 0, paletteByteLength / 4);
        this.indices = Bits.create(indicesBuffer, bitsPerIndex, indicesOffset, indicesByteLength);
        this.xShift = shiftForSize(size[0]);
        this.yShift = shiftForSize(size[1]);
        this.zShift = shiftForSize(size[2]);
        this._rebuildRefCounts();
      } else if (size) {
        const [buffer, palette, indices] = createViewsForBitsPerIndex(size, 1);
        this.palette = palette;
        this.indices = indices;
        this._refCounts = new Array(this.palette.length).fill(0);
        this._recomputeSizeFieldsForBuffer(buffer);
      }
    }
    _recomputeSizeFieldsForBuffer(buffer) {
      const header = new Uint8Array(buffer, 0, HEADER_SIZE);
      this.size = [0, 0, 0];
      [, this.size[0], this.size[1], this.size[2], this.bitsPerIndex] = header;
      this.xShift = shiftForSize(this.size[0]);
      this.yShift = shiftForSize(this.size[1]);
      this.zShift = shiftForSize(this.size[2]);
    }
    getPaletteIndexAt(x, y, z) {
      const { indices } = this;
      const offset = this._getOffset(x, y, z);
      return indices.get(offset);
    }
    getPaletteIndexAtOffset(offset) {
      const { indices } = this;
      return indices.get(offset);
    }
    getColorAt(x, y, z) {
      const idx = this.getPaletteIndexAt(x, y, z);
      return this.colorForPaletteIndex(idx);
    }
    hasVoxelAt(x, y, z) {
      return this.getPaletteIndexAt(x, y, z) !== EMPTY_VOXEL_PALETTE_INDEX;
    }
    removeVoxelAt(x, y, z) {
      return this.setPaletteIndexAt(x, y, z, EMPTY_VOXEL_PALETTE_INDEX);
    }
    getTotalNonEmptyVoxels() {
      let sum = 0;
      for (let i = 0; i < this._refCounts.length; i += 1) {
        sum += this._refCounts[i];
      }
      return sum;
    }
    getPaletteColor(idx) {
      return this.palette[(idx - RESERVED_PALETTE_INDEXES) * PALETTE_ENTRY_SIZE_INTS];
    }
    setPaletteColor(idx, color) {
      this.palette[(idx - RESERVED_PALETTE_INDEXES) * PALETTE_ENTRY_SIZE_INTS] = color;
    }
    paletteHasReferences(idx) {
      return this._refCounts[idx - RESERVED_PALETTE_INDEXES] !== 0;
    }
    resetPaletteRefcountToOne(idx) {
      this._refCounts[idx - RESERVED_PALETTE_INDEXES] = 1;
    }
    incrementPaletteRefcount(idx) {
      this._refCounts[idx - RESERVED_PALETTE_INDEXES] += 1;
    }
    decrementPaletteRefcount(idx) {
      this._refCounts[idx - RESERVED_PALETTE_INDEXES] -= 1;
    }
    static isNonEmptyPaletteIndex(idx) {
      return idx !== 0;
    }
    setPaletteIndexAt(x, y, z, paletteIndex) {
      const offset = this._getOffset(x, y, z);
      this.setPaletteIndexAtOffset(offset, paletteIndex);
    }
    setPaletteIndexAtOffset(offset, paletteIndex) {
      const { indices } = this;
      const currentPaletteIndex = this.getPaletteIndexAtOffset(offset);
      if (Voxels.isNonEmptyPaletteIndex(currentPaletteIndex)) {
        this.decrementPaletteRefcount(currentPaletteIndex);
      }
      if (Voxels.isNonEmptyPaletteIndex(paletteIndex)) {
        this.incrementPaletteRefcount(paletteIndex);
      }
      indices.set(offset, paletteIndex);
    }
    setEmptyAt(x, y, z) {
      this.setPaletteIndexAt(x, y, z, 0);
    }
    clear() {
      this.indices.clear();
      this._refCounts.fill(0);
    }
    setColorAt(x, y, z, color) {
      const offset = this._getOffset(x, y, z);
      return this.setColorAtOffset(offset, color);
    }
    setColorAtOffset(offset, color) {
      const { palette, indices } = this;
      const currentPaletteIndex = this.getPaletteIndexAtOffset(offset);
      const currentIsColor = Voxels.isNonEmptyPaletteIndex(currentPaletteIndex);
      if (currentIsColor) {
        this.decrementPaletteRefcount(currentPaletteIndex);
      }
      for (let i = 0; i < palette.length; i += 1) {
        const paletteIndex = i + RESERVED_PALETTE_INDEXES;
        const palColor = this.getPaletteColor(paletteIndex);
        if (palColor === color) {
          this.incrementPaletteRefcount(paletteIndex);
          indices.set(offset, paletteIndex);
          return paletteIndex;
        }
      }
      if (currentIsColor && !this.paletteHasReferences(currentPaletteIndex)) {
        this.setPaletteColor(currentPaletteIndex, color);
        this.resetPaletteRefcountToOne(currentPaletteIndex);
        return currentPaletteIndex;
      }
      const newEntryPaletteIndex = this._getFreePaletteIndex();
      this.setPaletteColor(newEntryPaletteIndex, color);
      this.resetPaletteRefcountToOne(newEntryPaletteIndex);
      this.indices.set(offset, newEntryPaletteIndex);
      return newEntryPaletteIndex;
    }
    colorForPaletteIndex(idx) {
      return this.palette[(idx - RESERVED_PALETTE_INDEXES) * PALETTE_ENTRY_SIZE_INTS];
    }
    filterByChunk(targetChunk, offsetX, offsetY, offsetZ, filter) {
      if (filter === VOX_CHUNK_FILTERS.NONE)
        return;
      const targetSize = targetChunk.size;
      const [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);
      const { size } = this;
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          for (let z = minZ; z <= maxZ; z += 1) {
            const iPalOp = this.getPaletteIndexAt(x, y, z);
            if (iPalOp === 0)
              continue;
            const targetX = x + offsetX;
            const targetY = y + offsetY;
            const targetZ = z + offsetZ;
            const targetOutOfRange = targetX > targetMaxX || targetX < targetMinX || targetY > targetMaxY || targetY < targetMinY || targetZ > targetMaxZ || targetZ < targetMinZ;
            const targetHasVoxel = !targetOutOfRange && targetChunk.hasVoxelAt(targetX, targetY, targetZ);
            if (filter === VOX_CHUNK_FILTERS.PAINT && !targetHasVoxel || filter === VOX_CHUNK_FILTERS.KEEP && targetHasVoxel) {
              this.setEmptyAt(x, y, z);
            }
          }
        }
      }
    }
    _getFreePaletteIndex() {
      const { palette, size, indices, bitsPerIndex } = this;
      for (let i = 0; i < palette.length; i += 1) {
        const paletteIndex = i + RESERVED_PALETTE_INDEXES;
        if (!this.paletteHasReferences(paletteIndex)) {
          return paletteIndex;
        }
      }
      const newBitsPerIndex = bitsPerIndex * 2;
      const [newBuffer, newPalette, newIndices] = createViewsForBitsPerIndex(size, newBitsPerIndex);
      for (let i = 0; i < palette.length * PALETTE_ENTRY_SIZE_INTS; i += 1) {
        newPalette[i] = palette[i];
      }
      while (this._refCounts.length < newPalette.length) {
        this._refCounts.push(0);
      }
      for (let i = 0, s = size[0] * size[1] * size[2]; i < s; i += 1) {
        const idx = indices.get(i);
        newIndices.set(i, idx);
      }
      this.palette = newPalette;
      this.indices = newIndices;
      this._recomputeSizeFieldsForBuffer(newBuffer);
      return this._getFreePaletteIndex();
    }
    resizeToFit(x, y, z) {
      const { size } = this;
      const sx = Math.max(1, size[0], Math.abs(x) * 2 + 1);
      const sy = Math.max(1, size[1], Math.abs(y) * 2 + 1);
      const sz = Math.max(1, size[2], Math.abs(z) * 2 + 1);
      this.resizeTo([sx, sy, sz]);
    }
    resizeTo(size) {
      if (this.size[0] >= size[0] && this.size[1] >= size[1] && this.size[2] >= size[2])
        return;
      const chunk = new Voxels(size);
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(this.size);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          for (let z = minZ; z <= maxZ; z += 1) {
            const idx = this.getPaletteIndexAt(x, y, z);
            if (idx !== 0) {
              chunk.setColorAt(x, y, z, this.getColorAt(x, y, z));
            }
          }
        }
      }
      const { buffer } = chunk.palette;
      [this.size[0], this.size[1], this.size[2]] = size;
      const { bitsPerIndex } = chunk;
      this.bitsPerIndex = bitsPerIndex;
      const [, palette, indices] = createViewsForBitsPerIndex(size, bitsPerIndex, buffer);
      this.palette = palette;
      this.indices = indices;
      this._refCounts = chunk._refCounts;
      this._recomputeSizeFieldsForBuffer(buffer);
    }
    static fromJSON(json) {
      if (typeof json === "string")
        return Voxels.deserialize(json);
      const { size, palette, indices } = json;
      const chunk = new Voxels(size);
      for (let i = 0; i < palette.length + RESERVED_PALETTE_INDEXES; i += 1) {
        for (let j = 0; j < indices.length; j += 1) {
          const paletteIndex = indices[j];
          if (paletteIndex === i) {
            if (paletteIndex >= RESERVED_PALETTE_INDEXES) {
              const color = palette[paletteIndex - RESERVED_PALETTE_INDEXES];
              chunk.setColorAtOffset(j, color);
            } else if (paletteIndex === i) {
              chunk.setPaletteIndexAtOffset(j, paletteIndex);
            }
          }
        }
      }
      return chunk;
    }
    toJSON(arg, readable) {
      if (!readable)
        return this.serialize();
      const palette = [];
      const indices = [];
      for (let i = 0; i < this.palette.length; i += 1) {
        const paletteIndex = i + RESERVED_PALETTE_INDEXES;
        const color = this.getPaletteColor(paletteIndex);
        if (color > 0) {
          palette.push(color);
        }
      }
      for (let i = 0, s = this.size[0] * this.size[1] * this.size[2]; i < s; i += 1) {
        indices.push(this.indices.get(i));
      }
      return {
        size: [...this.size],
        palette,
        indices
      };
    }
    clone() {
      return new Voxels(
        this.size,
        this.palette.buffer.slice(0),
        this.indices.view.buffer.slice(0),
        this.bitsPerIndex,
        this.palette.byteOffset,
        this.palette.byteLength,
        this.indices.view.byteOffset,
        this.indices.view.byteLength
      );
    }
    _getOffset(x, y, z) {
      const { size, xShift, yShift, zShift } = this;
      return (x + xShift) * size[1] * size[2] + (y + yShift) * size[2] + (z + zShift);
    }
    _rebuildRefCounts() {
      this._refCounts = new Array(this.palette.length).fill(0);
      for (let i = 0, s = this.size[0] * this.size[1] * this.size[2]; i < s; i += 1) {
        const paletteIndex = this.getPaletteIndexAtOffset(i);
        if (Voxels.isNonEmptyPaletteIndex(paletteIndex)) {
          this.incrementPaletteRefcount(paletteIndex);
        }
      }
    }
    applyToChunk(targetChunk, offsetX = 0, offsetY = 0, offsetZ = 0) {
      iPalOpToIPalSnap.clear();
      let targetSize = targetChunk.size;
      let [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);
      const { size } = this;
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          for (let z = minZ; z <= maxZ; z += 1) {
            const iPalOp = this.getPaletteIndexAt(x, y, z);
            if (iPalOp !== 0) {
              const targetX = x + offsetX;
              const targetY = y + offsetY;
              const targetZ = z + offsetZ;
              let requiredSizeX = targetSize[0];
              let requiredSizeY = targetSize[1];
              let requiredSizeZ = targetSize[2];
              if (targetX > targetMaxX) {
                requiredSizeX = targetX * 2;
              }
              if (targetX < targetMinX) {
                requiredSizeX = Math.max(requiredSizeX, -targetX * 2 + 1);
              }
              if (targetY > targetMaxY) {
                requiredSizeY = targetY * 2;
              }
              if (targetY < targetMinY) {
                requiredSizeY = Math.max(requiredSizeY, -targetY * 2 + 1);
              }
              if (targetZ > targetMaxZ) {
                requiredSizeZ = targetZ * 2;
              }
              if (targetZ < targetMinZ) {
                requiredSizeZ = Math.max(requiredSizeZ, -targetZ * 2 + 1);
              }
              if (requiredSizeX > MAX_SIZE || requiredSizeY > MAX_SIZE || requiredSizeZ > MAX_SIZE) {
                continue;
              }
              if (targetSize[0] < requiredSizeX || targetSize[1] < requiredSizeY || targetSize[2] < requiredSizeZ) {
                targetChunk.resizeTo([requiredSizeX, requiredSizeY, requiredSizeZ]);
                targetSize = targetChunk.size;
                [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);
                iPalOpToIPalSnap.clear();
              }
              const newIPalSnap = iPalOpToIPalSnap.get(iPalOp);
              if (newIPalSnap === void 0) {
                const color = this.getColorAt(x, y, z);
                if (color === REMOVE_VOXEL_COLOR) {
                  targetChunk.setEmptyAt(targetX, targetY, targetZ);
                } else {
                  const iPalSnap = targetChunk.setColorAt(targetX, targetY, targetZ, color);
                  iPalOpToIPalSnap.set(iPalOp, iPalSnap);
                }
              } else {
                const currentIPalSnap = targetChunk.getPaletteIndexAt(targetX, targetY, targetZ);
                if (currentIPalSnap !== newIPalSnap) {
                  targetChunk.setPaletteIndexAt(targetX, targetY, targetZ, newIPalSnap);
                }
              }
            }
          }
        }
      }
    }
    createInverse = (targetChunk, offset) => {
      iPalOpToIPalSnap.clear();
      const targetSize = targetChunk.size;
      const [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);
      const { size } = this;
      const inverse = new Voxels(size);
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          for (let z = minZ; z <= maxZ; z += 1) {
            const iPalOp = this.getPaletteIndexAt(x, y, z);
            if (iPalOp === 0)
              continue;
            const targetX = x + offset[0];
            const targetY = y + offset[1];
            const targetZ = z + offset[2];
            if (targetX > targetMaxX || targetX < targetMinX || targetY > targetMaxY || targetY < targetMinY || targetZ > targetMaxZ || targetZ < targetMinZ || !targetChunk.hasVoxelAt(targetX, targetY, targetZ)) {
              inverse.setColorAt(x, y, z, REMOVE_VOXEL_COLOR);
            } else {
              const currentColor = targetChunk.getColorAt(targetX, targetY, targetZ);
              inverse.setColorAt(x, y, z, currentColor);
            }
          }
        }
      }
      return inverse;
    };
    mergeWith(targetChunk, offset, targetOffset, targetAlwaysWins = false) {
      iPalOpToIPalSnap.clear();
      const thisPalIndexToWinPalIndex = iPalOpToIPalSnap;
      const offsetX = targetOffset[0] - offset[0];
      const offsetY = targetOffset[1] - offset[1];
      const offsetZ = targetOffset[2] - offset[2];
      const targetSize = targetChunk.size;
      const [targetMinX, targetMaxX, targetMinY, targetMaxY, targetMinZ, targetMaxZ] = xyzRangeForSize(targetSize);
      const { size } = this;
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(size);
      for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) {
          for (let z = minZ; z <= maxZ; z += 1) {
            const thisPaletteIndex = this.getPaletteIndexAt(x, y, z);
            if (thisPaletteIndex === 0)
              continue;
            const targetX = x + offsetX;
            const targetY = y + offsetY;
            const targetZ = z + offsetZ;
            const targetOutOfRange = targetX > targetMaxX || targetX < targetMinX || targetY > targetMaxY || targetY < targetMinY || targetZ > targetMaxZ || targetZ < targetMinZ;
            const targetHasVoxel = !targetOutOfRange && targetChunk.hasVoxelAt(targetX, targetY, targetZ);
            if (!targetHasVoxel)
              continue;
            if (thisPalIndexToWinPalIndex.has(thisPaletteIndex)) {
              this.setPaletteIndexAt(x, y, z, thisPalIndexToWinPalIndex.get(thisPaletteIndex));
            } else {
              if (targetAlwaysWins || targetChunk.getColorAt(targetX, targetY, targetZ) > this.getColorAt(x, y, z)) {
                this.removeVoxelAt(x, y, z);
              }
              const newPalIndex = this.getPaletteIndexAt(x, y, z);
              thisPalIndexToWinPalIndex.set(thisPaletteIndex, newPalIndex);
            }
          }
        }
      }
    }
  };
  function voxColorForRGBT(r, g, b, t = VOXEL_TYPE_DIFFUSE) {
    return (r | g << 8 | b << 16 | t << 24) >>> 0;
  }
  function rgbtForVoxColor(voxColor) {
    const r = voxColor & 255;
    const g = (voxColor & 65280) >> 8;
    const b = (voxColor & 16711680) >> 16;
    const t = (voxColor & 4278190080) >> 24;
    return {
      r,
      g,
      b,
      t
    };
  }

  // src/svox/noise.js
  function noise_default() {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(Math.random() * 256);
      p[i + 256] = p[i];
    }
    function fade(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    function lerp(t, a, b) {
      return a + t * (b - a);
    }
    function grad(hash, x, y, z) {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    return {
      noise: function(x, y, z) {
        const floorX = Math.floor(x);
        const floorY = Math.floor(y);
        const floorZ = Math.floor(z);
        const X = floorX & 255;
        const Y = floorY & 255;
        const Z = floorZ & 255;
        x -= floorX;
        y -= floorY;
        z -= floorZ;
        const xMinus1 = x - 1;
        const yMinus1 = y - 1;
        const zMinus1 = z - 1;
        const u = fade(x);
        const v = fade(y);
        const w = fade(z);
        const A = p[X] + Y;
        const AA = p[A] + Z;
        const AB = p[A + 1] + Z;
        const B = p[X + 1] + Y;
        const BA = p[B] + Z;
        const BB = p[B + 1] + Z;
        return lerp(
          w,
          lerp(
            v,
            lerp(
              u,
              grad(p[AA], x, y, z),
              grad(p[BA], xMinus1, y, z)
            ),
            lerp(
              u,
              grad(p[AB], x, yMinus1, z),
              grad(p[BB], xMinus1, yMinus1, z)
            )
          ),
          lerp(
            v,
            lerp(
              u,
              grad(p[AA + 1], x, y, zMinus1),
              grad(p[BA + 1], xMinus1, y, z - 1)
            ),
            lerp(
              u,
              grad(p[AB + 1], x, yMinus1, zMinus1),
              grad(p[BB + 1], xMinus1, yMinus1, zMinus1)
            )
          )
        );
      }
    };
  }

  // src/svox/deformer.js
  var Deformer = class {
    static changeShape(model, buffers, shape) {
      const { faceEquidistant } = buffers;
      switch (shape) {
        case "sphere":
          this._circularDeform(model, buffers, 1, 1, 1);
          break;
        case "cylinder-x":
          this._circularDeform(model, buffers, 0, 1, 1);
          break;
        case "cylinder-y":
          this._circularDeform(model, buffers, 1, 0, 1);
          break;
        case "cylinder-z":
          this._circularDeform(model, buffers, 1, 1, 0);
          break;
        default:
          for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
            faceEquidistant.set(faceIndex, 0);
          }
          break;
      }
    }
    static _circularDeform(model, buffers, xStrength, yStrength, zStrength) {
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(model.voxChunk.size);
      const xMid = (minX + maxX) / 2 + 0.5;
      const yMid = (minY + maxY) / 2 + 0.5;
      const zMid = (minZ + maxZ) / 2 + 0.5;
      const { vertX, vertY, vertZ, vertRing } = buffers;
      for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
        const vx = vertX[vertIndex];
        const vy = vertY[vertIndex];
        const vz = vertZ[vertIndex];
        const x = vx - xMid;
        const y = vy - yMid;
        const z = vz - zMid;
        const sphereSize = Math.max(Math.abs(x * xStrength), Math.abs(y * yStrength), Math.abs(z * zStrength));
        const vertexDistance = Math.sqrt(x * x * xStrength + y * y * yStrength + z * z * zStrength);
        if (vertexDistance === 0)
          continue;
        const factor = sphereSize / vertexDistance;
        vertX[vertIndex] = x * (1 - xStrength + xStrength * factor) + xMid;
        vertY[vertIndex] = y * (1 - yStrength + yStrength * factor) + yMid;
        vertZ[vertIndex] = z * (1 - zStrength + zStrength * factor) + zMid;
        vertRing[vertIndex] = sphereSize;
      }
      this._markEquidistantFaces(model, buffers);
    }
    static _markEquidistantFaces(model, buffers) {
      const { faceVertIndices, vertRing, faceEquidistant } = buffers;
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const faceVertIndex0 = faceIndex * 4;
        const faceVertIndex1 = faceVertIndex0 + 1;
        const faceVertIndex2 = faceVertIndex0 + 2;
        const faceVertIndex3 = faceVertIndex0 + 3;
        faceEquidistant.set(faceIndex, vertRing[faceVertIndices[faceVertIndex0]] === vertRing[faceVertIndices[faceVertIndex1]] && vertRing[faceVertIndices[faceVertIndex0]] === vertRing[faceVertIndices[faceVertIndex2]] && vertRing[faceVertIndices[faceVertIndex0]] === vertRing[faceVertIndices[faceVertIndex3]] ? 1 : 0);
      }
    }
    static maximumDeformCount(model) {
      let maximumCount = 0;
      model.materials.forEach(function(material) {
        if (material.deform) {
          maximumCount = Math.max(maximumCount, material.deform.count);
        }
      });
      return maximumCount;
    }
    static deform(model, buffers, maximumDeformCount) {
      const { vertLinkIndices, vertLinkCounts, vertDeformCount, vertDeformDamping, vertDeformStrength, vertFlattenedX, vertFlattenedY, vertFlattenedZ, vertClampedX, vertClampedY, vertClampedZ, vertX, vertY, vertZ, vertTmpX, vertTmpY, vertTmpZ, vertHasTmp } = buffers;
      for (let step = 0; step < maximumDeformCount; step++) {
        let hasDeforms = false;
        for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
          const deformCount = vertDeformCount[vertIndex];
          if (deformCount <= step)
            continue;
          const vertLinkCount = vertLinkCounts[vertIndex];
          if (vertLinkCount === 0)
            continue;
          hasDeforms = true;
          const vx = vertX[vertIndex];
          const vy = vertY[vertIndex];
          const vz = vertZ[vertIndex];
          const deformDamping = vertDeformDamping[vertIndex];
          const deformStrength = vertDeformStrength[vertIndex];
          const notClampOrFlattenX = 1 - (vertClampedX.get(vertIndex) | vertFlattenedX.get(vertIndex));
          const notClampOrFlattenY = 1 - (vertClampedY.get(vertIndex) | vertFlattenedY.get(vertIndex));
          const notClampOrFlattenZ = 1 - (vertClampedZ.get(vertIndex) | vertFlattenedZ.get(vertIndex));
          let x = 0;
          let y = 0;
          let z = 0;
          for (let i = 0; i < vertLinkCount; i++) {
            const linkIndex = vertLinkIndices[vertIndex * 6 + i];
            x += vertX[linkIndex];
            y += vertY[linkIndex];
            z += vertZ[linkIndex];
          }
          const strength = Math.pow(deformDamping, step) * deformStrength;
          const offsetX = x / vertLinkCount - vx;
          const offsetY = y / vertLinkCount - vy;
          const offsetZ = z / vertLinkCount - vz;
          vertTmpX[vertIndex] = vx + notClampOrFlattenX * offsetX * strength;
          vertTmpY[vertIndex] = vy + notClampOrFlattenY * offsetY * strength;
          vertTmpZ[vertIndex] = vz + notClampOrFlattenZ * offsetZ * strength;
          vertHasTmp.set(vertIndex, notClampOrFlattenX | notClampOrFlattenY | notClampOrFlattenZ);
        }
        if (hasDeforms) {
          for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
            if (vertHasTmp.get(vertIndex) === 0)
              continue;
            vertX[vertIndex] = vertTmpX[vertIndex];
            vertY[vertIndex] = vertTmpY[vertIndex];
            vertZ[vertIndex] = vertTmpZ[vertIndex];
          }
          vertHasTmp.clear();
        }
      }
    }
    static warpAndScatter(model, buffers) {
      const noise = noise_default().noise;
      const { nx: tnx, px: tpx, ny: tny, py: tpy, nz: tnz, pz: tpz } = model._tile;
      let [vxMinX, vxMaxX, vxMinY, vxMaxY, vxMinZ, vxMaxZ] = xyzRangeForSize(model.voxChunk.size);
      const { vertX, vertY, vertZ, vertWarpAmplitude, vertWarpFrequency, vertScatter, vertFlattenedX, vertFlattenedY, vertFlattenedZ, vertClampedX, vertClampedY, vertClampedZ } = buffers;
      vxMinX += 0.1;
      vxMinY += 0.1;
      vxMinZ += 0.1;
      vxMaxX += 0.9;
      vxMaxY += 0.9;
      vxMaxZ += 0.9;
      for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
        const vx = vertX[vertIndex];
        const vy = vertY[vertIndex];
        const vz = vertZ[vertIndex];
        if (tnx && vx < vxMinX || tpx && vx > vxMaxX || tny && vy < vxMinY || tpy && vy > vxMaxY || tnz && vz < vxMinZ || tpz && vz > vxMaxZ) {
          continue;
        }
        const amplitude = vertWarpAmplitude[vertIndex];
        const frequency = vertWarpFrequency[vertIndex];
        const scatter = vertScatter[vertIndex];
        const hasAmplitude = amplitude > 0;
        const hasScatter = scatter > 0;
        if (hasAmplitude || hasScatter) {
          let xOffset = 0;
          let yOffset = 0;
          let zOffset = 0;
          if (hasAmplitude) {
            xOffset = noise((vx + 0.19) * frequency, vy * frequency, vz * frequency) * amplitude;
            yOffset = noise((vy + 0.17) * frequency, vz * frequency, vx * frequency) * amplitude;
            zOffset = noise((vz + 0.13) * frequency, vx * frequency, vy * frequency) * amplitude;
          }
          if (hasScatter) {
            xOffset += (Math.random() * 2 - 1) * scatter;
            yOffset += (Math.random() * 2 - 1) * scatter;
            zOffset += (Math.random() * 2 - 1) * scatter;
          }
          const notClampOrFlattenX = 1 - (vertClampedX.get(vertIndex) | vertFlattenedX.get(vertIndex));
          const notClampOrFlattenY = 1 - (vertClampedY.get(vertIndex) | vertFlattenedY.get(vertIndex));
          const notClampOrFlattenZ = 1 - (vertClampedZ.get(vertIndex) | vertFlattenedZ.get(vertIndex));
          vertX[vertIndex] = vx + notClampOrFlattenX * xOffset;
          vertY[vertIndex] = vy + notClampOrFlattenY * yOffset;
          vertZ[vertIndex] = vz + notClampOrFlattenZ * zOffset;
        }
      }
    }
  };

  // src/svox/vertexlinker.js
  var VertexLinker = class {
    static linkVertices(model, buffers, faceIndex) {
      const { faceClamped, vertNrOfClampedLinks, faceVertIndices, vertLinkIndices, vertLinkCounts } = buffers;
      const clamped = faceClamped.get(faceIndex);
      if (clamped === 1) {
        for (let v = 0; v < 4; v++) {
          const vertIndex = faceVertIndices[faceIndex * 4 + v];
          let hasSelfLink = false;
          for (let l = 0, c = vertLinkCounts[vertIndex]; l < c; l++) {
            if (vertLinkIndices[vertIndex * 6 + l] === vertIndex) {
              hasSelfLink = true;
              break;
            }
          }
          if (!hasSelfLink) {
            vertLinkIndices[vertIndex * 6 + vertLinkCounts[vertIndex]] = vertIndex;
            vertLinkCounts[vertIndex]++;
            vertNrOfClampedLinks[vertIndex]++;
          }
        }
      } else {
        for (let v = 0; v < 4; v++) {
          const vertIndexFrom = faceVertIndices[faceIndex * 4 + v];
          const vertIndexTo = faceVertIndices[faceIndex * 4 + (v + 1) % 4];
          let hasForwardLink = false;
          for (let l = 0, c = vertLinkCounts[vertIndexFrom]; l < c; l++) {
            if (vertLinkIndices[vertIndexFrom * 6 + l] === vertIndexTo) {
              hasForwardLink = true;
              break;
            }
          }
          if (!hasForwardLink) {
            vertLinkIndices[vertIndexFrom * 6 + vertLinkCounts[vertIndexFrom]] = vertIndexTo;
            vertLinkCounts[vertIndexFrom]++;
          }
          let hasBackwardLink = false;
          for (let l = 0, c = vertLinkCounts[vertIndexTo]; l < c; l++) {
            if (vertLinkIndices[vertIndexTo * 6 + l] === vertIndexFrom) {
              hasBackwardLink = true;
              break;
            }
          }
          if (!hasBackwardLink) {
            vertLinkIndices[vertIndexTo * 6 + vertLinkCounts[vertIndexTo]] = vertIndexFrom;
            vertLinkCounts[vertIndexTo]++;
          }
        }
      }
    }
    static fixClampedLinks(model, buffers) {
      const { faceVertIndices, vertNrOfClampedLinks, vertFullyClamped, vertLinkCounts, vertLinkIndices } = buffers;
      for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
        const nrOfClampedLinks = vertNrOfClampedLinks[vertIndex];
        const nrOfLinks = vertLinkCounts[vertIndex];
        if (nrOfClampedLinks === nrOfLinks) {
          vertFullyClamped.set(vertIndex, 1);
          vertLinkCounts[vertIndex] = 0;
        }
      }
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        for (let v = 0; v < 4; v++) {
          const vertIndexFrom = faceVertIndices[faceIndex * 4 + v];
          const vertIndexTo = faceVertIndices[faceIndex * 4 + (v + 1) % 4];
          if (vertFullyClamped.get(vertIndexFrom) === 1) {
            let hasForwardLink = false;
            for (let l = 0, c2 = vertLinkCounts[vertIndexFrom]; l < c2; l++) {
              if (vertLinkIndices[vertIndexFrom * 6 + l] === vertIndexTo) {
                hasForwardLink = true;
                break;
              }
            }
            if (!hasForwardLink) {
              vertLinkIndices[vertIndexFrom * 6 + vertLinkCounts[vertIndexFrom]] = vertIndexTo;
              vertLinkCounts[vertIndexFrom]++;
            }
          }
          if (vertFullyClamped.get(vertIndexTo) === 1) {
            let hasBackwardLink = false;
            for (let l = 0, c2 = vertLinkCounts[vertIndexTo]; l < c2; l++) {
              if (vertLinkIndices[vertIndexTo * 6 + l] === vertIndexFrom) {
                hasBackwardLink = true;
                break;
              }
            }
            if (!hasBackwardLink) {
              vertLinkIndices[vertIndexTo * 6 + vertLinkCounts[vertIndexTo]] = vertIndexFrom;
              vertLinkCounts[vertIndexTo]++;
            }
          }
        }
      }
    }
  };

  // src/svox/normalscalculator.js
  var NormalsCalculator = class {
    static calculateNormals(model, buffers) {
      const tile = model.tile;
      const { faceNameIndices, faceEquidistant, faceSmooth, faceFlattened, faceClamped, vertX, vertY, vertZ, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceMaterials, faceVertIndices, vertSmoothNormalX, vertSmoothNormalY, vertSmoothNormalZ, vertBothNormalX, vertBothNormalY, vertBothNormalZ } = buffers;
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(model.voxChunk.size);
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const faceOffset = faceIndex * 4;
        for (let v = 0; v < 4; v++) {
          const vertIndex = faceVertIndices[faceOffset + v];
          vertSmoothNormalX[vertIndex] = 0;
          vertSmoothNormalY[vertIndex] = 0;
          vertSmoothNormalZ[vertIndex] = 0;
          vertBothNormalX[vertIndex] = 0;
          vertBothNormalY[vertIndex] = 0;
          vertBothNormalZ[vertIndex] = 0;
        }
      }
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const faceNameIndex = faceNameIndices[faceIndex];
        const equidistant = faceEquidistant.get(faceIndex);
        const flattened = faceFlattened.get(faceIndex);
        const clamped = faceClamped.get(faceIndex);
        const faceSmoothValue = equidistant | 1 - (flattened | clamped);
        faceSmooth.set(faceIndex, faceSmoothValue);
        const vert1Index = faceVertIndices[faceIndex * 4];
        const vert2Index = faceVertIndices[faceIndex * 4 + 1];
        const vert3Index = faceVertIndices[faceIndex * 4 + 2];
        const vert4Index = faceVertIndices[faceIndex * 4 + 3];
        const vmidX = (vertX[vert1Index] + vertX[vert2Index] + vertX[vert3Index] + vertX[vert4Index]) / 4;
        const vmidY = (vertY[vert1Index] + vertY[vert2Index] + vertY[vert3Index] + vertY[vert4Index]) / 4;
        const vmidZ = (vertZ[vert1Index] + vertZ[vert2Index] + vertZ[vert3Index] + vertZ[vert4Index]) / 4;
        for (let v = 0; v < 4; v++) {
          const vertIndex = faceVertIndices[faceIndex * 4 + v];
          const prevVertIndex = faceVertIndices[faceIndex * 4 + (v + 3) % 4];
          const vX = vertX[vertIndex];
          const vXPrev = vertX[prevVertIndex];
          const vY = vertY[vertIndex];
          const vYPrev = vertY[prevVertIndex];
          const vZ = vertZ[vertIndex];
          const vZPrev = vertZ[prevVertIndex];
          let smoothX = vertSmoothNormalX[vertIndex];
          let smoothY = vertSmoothNormalY[vertIndex];
          let smoothZ = vertSmoothNormalZ[vertIndex];
          let bothX = vertBothNormalX[vertIndex];
          let bothY = vertBothNormalY[vertIndex];
          let bothZ = vertBothNormalZ[vertIndex];
          let e1X = vXPrev - vX;
          let e1Y = vYPrev - vY;
          let e1Z = vZPrev - vZ;
          let e2X = vmidX - vX;
          let e2Y = vmidY - vY;
          let e2Z = vmidZ - vZ;
          let e1l = Math.sqrt(e1X * e1X + e1Y * e1Y + e1Z * e1Z);
          let e2l = Math.sqrt(e2X * e2X + e2Y * e2Y + e2Z * e2Z);
          e1l = e1l === 0 ? 1 : e1l;
          e2l = e2l === 0 ? 1 : e2l;
          const e1d = 1 / e1l;
          e1X *= e1d;
          e1Y *= e1d;
          e1Z *= e1d;
          const e2d = 1 / e2l;
          e2X *= e2d;
          e2Y *= e2d;
          e2Z *= e2d;
          let normalX = e1Y * e2Z - e1Z * e2Y;
          let normalY = e1Z * e2X - e1X * e2Z;
          let normalZ = e1X * e2Y - e1Y * e2X;
          const voxMinXBuf = minX + 0.1;
          const voxMaxXBuf = maxX + 0.9;
          const voxMinYBuf = minY + 0.1;
          const voxMaxYBuf = maxY + 0.9;
          const voxMinZBuf = minZ + 0.1;
          const voxMaxZBuf = maxZ + 0.9;
          if (tile) {
            if ((tile.nx && faceNameIndex === 0 || tile.px && faceNameIndex === 1) && (vY < voxMinYBuf || vY > voxMaxYBuf || vZ < voxMinZBuf || vZ > voxMaxZBuf)) {
              normalY = 0;
              normalZ = 0;
            }
            ;
            if ((tile.ny && faceNameIndex === 2 || tile.py && faceNameIndex === 3) && (vX < voxMinXBuf || vX > voxMaxXBuf || vZ < voxMinZBuf || vZ > voxMaxZBuf)) {
              normalX = 0;
              normalZ = 0;
            }
            ;
            if ((tile.nz && faceNameIndex === 4 || tile.pz && faceNameIndex === 5) && (vX < voxMinXBuf || vX > voxMaxXBuf || vY < voxMinYBuf || vY > voxMaxYBuf)) {
              normalX = 0;
              normalY = 0;
            }
            ;
          }
          let nl = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
          nl = nl === 0 ? 1 : nl;
          const nd = 1 / nl;
          normalX *= nd;
          normalY *= nd;
          normalZ *= nd;
          faceVertFlatNormalX[faceIndex * 4 + v] = normalX;
          faceVertFlatNormalY[faceIndex * 4 + v] = normalY;
          faceVertFlatNormalZ[faceIndex * 4 + v] = normalZ;
          const mul = e1X * e2X + e1Y * e2Y + e1Z * e2Z;
          const angle = Math.acos(mul);
          smoothX += normalX * angle;
          smoothY += normalY * angle;
          smoothZ += normalZ * angle;
          bothX += faceSmoothValue * (normalX * angle);
          bothY += faceSmoothValue * (normalY * angle);
          bothZ += faceSmoothValue * (normalZ * angle);
          vertSmoothNormalX[vertIndex] = smoothX;
          vertSmoothNormalY[vertIndex] = smoothY;
          vertSmoothNormalZ[vertIndex] = smoothZ;
          vertBothNormalX[vertIndex] = bothX;
          vertBothNormalY[vertIndex] = bothY;
          vertBothNormalZ[vertIndex] = bothZ;
        }
      }
      for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
        const smoothX = vertSmoothNormalX[vertIndex];
        const smoothY = vertSmoothNormalY[vertIndex];
        const smoothZ = vertSmoothNormalZ[vertIndex];
        const bothX = vertBothNormalX[vertIndex];
        const bothY = vertBothNormalY[vertIndex];
        const bothZ = vertBothNormalZ[vertIndex];
        const sl = Math.sqrt(smoothX * smoothX + smoothY * smoothY + smoothZ * smoothZ);
        const bl = Math.sqrt(bothX * bothX + bothY * bothY + bothZ * bothZ);
        if (sl !== 0) {
          vertSmoothNormalX[vertIndex] = smoothX / sl;
          vertSmoothNormalY[vertIndex] = smoothY / sl;
          vertSmoothNormalZ[vertIndex] = smoothZ / sl;
        }
        if (bl !== 0) {
          vertBothNormalX[vertIndex] = bothX / bl;
          vertBothNormalY[vertIndex] = bothY / bl;
          vertBothNormalZ[vertIndex] = bothZ / bl;
        }
      }
      const materials = model.materials.materials;
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const isSmooth = faceSmooth.get(faceIndex) === 1;
        const material = materials[faceMaterials[faceIndex]];
        for (let i = 0; i < 4; i++) {
          const faceVertNormalIndex = faceIndex * 4 + i;
          const vertIndex = faceVertIndices[faceIndex * 4 + i];
          faceVertSmoothNormalX[faceVertNormalIndex] = vertSmoothNormalX[vertIndex];
          faceVertSmoothNormalY[faceVertNormalIndex] = vertSmoothNormalY[vertIndex];
          faceVertSmoothNormalZ[faceVertNormalIndex] = vertSmoothNormalZ[vertIndex];
          faceVertBothNormalX[faceVertNormalIndex] = !isSmooth || vertBothNormalX[vertIndex] === 0 ? faceVertFlatNormalX[faceVertNormalIndex] : vertBothNormalX[vertIndex];
          faceVertBothNormalY[faceVertNormalIndex] = !isSmooth || vertBothNormalY[vertIndex] === 0 ? faceVertFlatNormalY[faceVertNormalIndex] : vertBothNormalY[vertIndex];
          faceVertBothNormalZ[faceVertNormalIndex] = !isSmooth || vertBothNormalZ[vertIndex] === 0 ? faceVertFlatNormalZ[faceVertNormalIndex] : vertBothNormalZ[vertIndex];
          switch (material.lighting) {
            case SMOOTH:
              faceVertNormalX[faceVertNormalIndex] = faceVertSmoothNormalX[faceVertNormalIndex];
              faceVertNormalY[faceVertNormalIndex] = faceVertSmoothNormalY[faceVertNormalIndex];
              faceVertNormalZ[faceVertNormalIndex] = faceVertSmoothNormalZ[faceVertNormalIndex];
              break;
            case BOTH:
              faceVertNormalX[faceVertNormalIndex] = faceVertBothNormalX[faceVertNormalIndex];
              faceVertNormalY[faceVertNormalIndex] = faceVertBothNormalY[faceVertNormalIndex];
              faceVertNormalZ[faceVertNormalIndex] = faceVertBothNormalZ[faceVertNormalIndex];
              break;
            default:
              faceVertNormalX[faceVertNormalIndex] = faceVertFlatNormalX[faceVertNormalIndex];
              faceVertNormalY[faceVertNormalIndex] = faceVertFlatNormalY[faceVertNormalIndex];
              faceVertNormalZ[faceVertNormalIndex] = faceVertFlatNormalZ[faceVertNormalIndex];
              break;
          }
        }
      }
    }
  };

  // src/svox/matrix.js
  var Matrix = class {
    constructor() {
      const m = [
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      ];
      this.m = new Float32Array(m);
    }
    transformPoint(v) {
      const m = this.m;
      const div = m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15];
      const x = (m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3]) / div;
      const y = (m[4] * v.x + m[5] * v.y + m[6] * v.z + m[7]) / div;
      const z = (m[8] * v.x + m[9] * v.y + m[10] * v.z + m[11]) / div;
      v.x = x;
      v.y = y;
      v.z = z;
    }
    transformPointInline(xs, ys, zs, index) {
      const vx = xs[index];
      const vy = ys[index];
      const vz = zs[index];
      const m = this.m;
      const div = m[12] * vx + m[13] * vy + m[14] * vz + m[15];
      const x = (m[0] * vx + m[1] * vy + m[2] * vz + m[3]) / div;
      const y = (m[4] * vx + m[5] * vy + m[6] * vz + m[7]) / div;
      const z = (m[8] * vx + m[9] * vy + m[10] * vz + m[11]) / div;
      xs[index] = x;
      ys[index] = y;
      zs[index] = z;
    }
    transformVector(v) {
      const m = this.m;
      const x = m[0] * v.x + m[1] * v.y + m[2] * v.z;
      const y = m[4] * v.x + m[5] * v.y + m[6] * v.z;
      const z = m[8] * v.x + m[9] * v.y + m[10] * v.z;
      v.x = x;
      v.y = y;
      v.z = z;
    }
    transformVectorInline(xs, ys, zs, index) {
      const vx = xs[index];
      const vy = ys[index];
      const vz = zs[index];
      const m = this.m;
      const x = m[0] * vx + m[1] * vy + m[2] * vz;
      const y = m[4] * vx + m[5] * vy + m[6] * vz;
      const z = m[8] * vx + m[9] * vy + m[10] * vz;
      xs[index] = x;
      ys[index] = y;
      zs[index] = z;
    }
    static identity(result) {
      result = result || new Matrix();
      const m = result.m;
      m[0] = m[5] = m[10] = m[15] = 1;
      m[1] = m[2] = m[3] = m[4] = m[6] = m[7] = m[8] = m[9] = m[11] = m[12] = m[13] = m[14] = 0;
      return result;
    }
    static multiply(left, right, result) {
      result = result || new Matrix();
      const a = left.m;
      const b = right.m;
      const r = result.m;
      r[0] = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12];
      r[1] = a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13];
      r[2] = a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14];
      r[3] = a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15];
      r[4] = a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12];
      r[5] = a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13];
      r[6] = a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14];
      r[7] = a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15];
      r[8] = a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12];
      r[9] = a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13];
      r[10] = a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14];
      r[11] = a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15];
      r[12] = a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12];
      r[13] = a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13];
      r[14] = a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14];
      r[15] = a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15];
      return result;
    }
    static transpose(matrix, result) {
      result = result || new Matrix();
      const m = matrix.m;
      const r = result.m;
      r[0] = m[0];
      r[1] = m[4];
      r[2] = m[8];
      r[3] = m[12];
      r[4] = m[1];
      r[5] = m[5];
      r[6] = m[9];
      r[7] = m[13];
      r[8] = m[2];
      r[9] = m[6];
      r[10] = m[10];
      r[11] = m[14];
      r[12] = m[3];
      r[13] = m[7];
      r[14] = m[11];
      r[15] = m[15];
      return result;
    }
    static inverse(matrix, result) {
      result = result || new Matrix();
      const m = matrix.m;
      const r = result.m;
      r[0] = m[5] * m[10] * m[15] - m[5] * m[14] * m[11] - m[6] * m[9] * m[15] + m[6] * m[13] * m[11] + m[7] * m[9] * m[14] - m[7] * m[13] * m[10];
      r[1] = -m[1] * m[10] * m[15] + m[1] * m[14] * m[11] + m[2] * m[9] * m[15] - m[2] * m[13] * m[11] - m[3] * m[9] * m[14] + m[3] * m[13] * m[10];
      r[2] = m[1] * m[6] * m[15] - m[1] * m[14] * m[7] - m[2] * m[5] * m[15] + m[2] * m[13] * m[7] + m[3] * m[5] * m[14] - m[3] * m[13] * m[6];
      r[3] = -m[1] * m[6] * m[11] + m[1] * m[10] * m[7] + m[2] * m[5] * m[11] - m[2] * m[9] * m[7] - m[3] * m[5] * m[10] + m[3] * m[9] * m[6];
      r[4] = -m[4] * m[10] * m[15] + m[4] * m[14] * m[11] + m[6] * m[8] * m[15] - m[6] * m[12] * m[11] - m[7] * m[8] * m[14] + m[7] * m[12] * m[10];
      r[5] = m[0] * m[10] * m[15] - m[0] * m[14] * m[11] - m[2] * m[8] * m[15] + m[2] * m[12] * m[11] + m[3] * m[8] * m[14] - m[3] * m[12] * m[10];
      r[6] = -m[0] * m[6] * m[15] + m[0] * m[14] * m[7] + m[2] * m[4] * m[15] - m[2] * m[12] * m[7] - m[3] * m[4] * m[14] + m[3] * m[12] * m[6];
      r[7] = m[0] * m[6] * m[11] - m[0] * m[10] * m[7] - m[2] * m[4] * m[11] + m[2] * m[8] * m[7] + m[3] * m[4] * m[10] - m[3] * m[8] * m[6];
      r[8] = m[4] * m[9] * m[15] - m[4] * m[13] * m[11] - m[5] * m[8] * m[15] + m[5] * m[12] * m[11] + m[7] * m[8] * m[13] - m[7] * m[12] * m[9];
      r[9] = -m[0] * m[9] * m[15] + m[0] * m[13] * m[11] + m[1] * m[8] * m[15] - m[1] * m[12] * m[11] - m[3] * m[8] * m[13] + m[3] * m[12] * m[9];
      r[10] = m[0] * m[5] * m[15] - m[0] * m[13] * m[7] - m[1] * m[4] * m[15] + m[1] * m[12] * m[7] + m[3] * m[4] * m[13] - m[3] * m[12] * m[5];
      r[11] = -m[0] * m[5] * m[11] + m[0] * m[9] * m[7] + m[1] * m[4] * m[11] - m[1] * m[8] * m[7] - m[3] * m[4] * m[9] + m[3] * m[8] * m[5];
      r[12] = -m[4] * m[9] * m[14] + m[4] * m[13] * m[10] + m[5] * m[8] * m[14] - m[5] * m[12] * m[10] - m[6] * m[8] * m[13] + m[6] * m[12] * m[9];
      r[13] = m[0] * m[9] * m[14] - m[0] * m[13] * m[10] - m[1] * m[8] * m[14] + m[1] * m[12] * m[10] + m[2] * m[8] * m[13] - m[2] * m[12] * m[9];
      r[14] = -m[0] * m[5] * m[14] + m[0] * m[13] * m[6] + m[1] * m[4] * m[14] - m[1] * m[12] * m[6] - m[2] * m[4] * m[13] + m[2] * m[12] * m[5];
      r[15] = m[0] * m[5] * m[10] - m[0] * m[9] * m[6] - m[1] * m[4] * m[10] + m[1] * m[8] * m[6] + m[2] * m[4] * m[9] - m[2] * m[8] * m[5];
      const det = m[0] * r[0] + m[1] * r[4] + m[2] * r[8] + m[3] * r[12];
      for (let i = 0; i < 16; i++)
        r[i] /= det;
      return result;
    }
    static scale(x, y, z, result) {
      result = result || new Matrix();
      const m = result.m;
      m[0] = x;
      m[1] = 0;
      m[2] = 0;
      m[3] = 0;
      m[4] = 0;
      m[5] = y;
      m[6] = 0;
      m[7] = 0;
      m[8] = 0;
      m[9] = 0;
      m[10] = z;
      m[11] = 0;
      m[12] = 0;
      m[13] = 0;
      m[14] = 0;
      m[15] = 1;
      return result;
    }
    static translate(x, y, z, result) {
      result = result || new Matrix();
      const m = result.m;
      m[0] = 1;
      m[1] = 0;
      m[2] = 0;
      m[3] = x;
      m[4] = 0;
      m[5] = 1;
      m[6] = 0;
      m[7] = y;
      m[8] = 0;
      m[9] = 0;
      m[10] = 1;
      m[11] = z;
      m[12] = 0;
      m[13] = 0;
      m[14] = 0;
      m[15] = 1;
      return result;
    }
    static rotate(a, x, y, z, result) {
      if (!a || !x && !y && !z) {
        return Matrix.identity(result);
      }
      result = result || new Matrix();
      const m = result.m;
      const d = Math.sqrt(x * x + y * y + z * z);
      a *= Math.PI / 180;
      x /= d;
      y /= d;
      z /= d;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const t = 1 - c;
      m[0] = x * x * t + c;
      m[1] = x * y * t - z * s;
      m[2] = x * z * t + y * s;
      m[3] = 0;
      m[4] = y * x * t + z * s;
      m[5] = y * y * t + c;
      m[6] = y * z * t - x * s;
      m[7] = 0;
      m[8] = z * x * t - y * s;
      m[9] = z * y * t + x * s;
      m[10] = z * z * t + c;
      m[11] = 0;
      m[12] = 0;
      m[13] = 0;
      m[14] = 0;
      m[15] = 1;
      return result;
    }
    static lookAtORIGINAL(ex, ey, ez, cx, cy, cz, ux, uy, uz, result) {
      result = result || new Matrix();
      const m = result.m;
      let fx = ex - cx;
      let fy = ey - cy;
      let fz = ez - cz;
      let d = Math.sqrt(fx * fx + fy * fy + fz * fz);
      fx /= d;
      fy /= d;
      fz /= d;
      let sx = uy * fz - uz * fy;
      let sy = uz * fx - ux * fz;
      let sz = ux * fy - uy * fx;
      d = Math.sqrt(sx * sx + sy * sy + sz * sz);
      sx /= d;
      sy /= d;
      sz /= d;
      let tx = fy * sz - fz * sy;
      let ty = fz * sx - fx * sz;
      let tz = fx * sy - fy * sx;
      d = Math.sqrt(tx * tx + ty * ty + tz * tz);
      tx /= d;
      ty /= d;
      tz /= d;
      m[0] = sx;
      m[1] = sy;
      m[2] = sz;
      m[3] = -(sx * ex + sy * ey + sz * ez);
      m[4] = tx;
      m[5] = ty;
      m[6] = tz;
      m[7] = -(tx * ex + ty * ey + tz * ez);
      m[8] = fx;
      m[9] = fy;
      m[10] = fz;
      m[11] = -(fx * ex + fy * ey + fz * ez);
      m[12] = 0;
      m[13] = 0;
      m[14] = 0;
      m[15] = 1;
      return result;
    }
    static lookAtTRYOUT(nx, ny, nz, result) {
      result = result || new Matrix();
      const m = result.m;
      const len = Math.sqrt(nx * nx + nz * nz);
      m[0] = nz / len;
      m[1] = 0;
      m[2] = -nx / len;
      m[3] = 0;
      m[4] = nx * ny / len;
      m[5] = -len;
      m[6] = nz * ny / len;
      m[7] = 0;
      m[8] = nx;
      m[9] = ny;
      m[10] = nz;
      m[11] = 0;
      m[12] = 0;
      m[13] = 0;
      m[14] = 0;
      m[15] = 1;
      return result;
    }
    static lookAt(nx, ny, nz, result) {
      result = result || new Matrix();
      const m = result.m;
      const len = Math.sqrt(nx * nx + nz * nz);
      const c2 = len ? nx / len : 1;
      const s2 = len ? nz / len : 0;
      m[0] = nx;
      m[1] = -s2;
      m[2] = -nz * c2;
      m[3] = 0;
      m[4] = ny;
      m[5] = 0;
      m[6] = len;
      m[7] = 0;
      m[8] = nz;
      m[9] = c2;
      m[10] = -nz * s2;
      m[11] = 0;
      m[12] = 0;
      m[13] = 0;
      m[14] = 0;
      m[15] = 1;
      return result;
    }
  };

  // src/svox/vertextransformer.js
  var normalXs = [null, null, null, null];
  var normalYs = [null, null, null, null];
  var normalZs = [null, null, null, null];
  var VertexTransformer = class {
    static transformVertices(model, buffers) {
      const { vertX, vertY, vertZ, faceVertNormalX, faceVertFlatNormalX, faceVertNormalY, faceVertFlatNormalY, faceVertNormalZ, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ } = buffers;
      const bor = model.determineBoundsOffsetAndRescale(model.resize, buffers);
      let vertexTransform = new Matrix();
      vertexTransform = Matrix.multiply(vertexTransform, Matrix.translate(model.position.x, model.position.y, model.position.z));
      vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.z, 0, 0, 1));
      vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.y, 0, 1, 0));
      vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.x, 1, 0, 0));
      vertexTransform = Matrix.multiply(vertexTransform, Matrix.scale(model.scale.x, model.scale.y, model.scale.z));
      vertexTransform = Matrix.multiply(vertexTransform, Matrix.scale(bor.rescale, bor.rescale, bor.rescale));
      vertexTransform = Matrix.multiply(vertexTransform, Matrix.translate(bor.offset.x, bor.offset.y, bor.offset.z));
      let normalTransform = Matrix.inverse(vertexTransform);
      normalTransform = Matrix.transpose(normalTransform);
      for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
        vertexTransform.transformPointInline(vertX, vertY, vertZ, vertIndex);
      }
      normalXs[0] = faceVertNormalX;
      normalYs[0] = faceVertNormalY;
      normalZs[0] = faceVertNormalZ;
      normalXs[1] = faceVertFlatNormalX;
      normalYs[1] = faceVertFlatNormalY;
      normalZs[1] = faceVertFlatNormalZ;
      normalXs[2] = faceVertSmoothNormalX;
      normalYs[2] = faceVertSmoothNormalY;
      normalZs[2] = faceVertSmoothNormalZ;
      normalXs[3] = faceVertBothNormalX;
      normalYs[3] = faceVertBothNormalY;
      normalZs[3] = faceVertBothNormalZ;
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const faceOffset = faceIndex * 4;
        for (let normalIndex = 0; normalIndex < 4; normalIndex++) {
          for (let normalType = 0, c2 = normalXs.length; normalType < c2; normalType++) {
            const xs = normalXs[normalType];
            const ys = normalYs[normalType];
            const zs = normalZs[normalType];
            const idx = faceOffset + normalIndex;
            normalTransform.transformVectorInline(xs, ys, zs, idx);
            const normalX = xs[idx];
            const normalY = ys[idx];
            const normalZ = zs[idx];
            const normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
            if (normalLength > 0) {
              const d = 1 / normalLength;
              xs[idx] = normalX * d;
              ys[idx] = normalY * d;
              zs[idx] = normalZ * d;
            }
          }
        }
      }
    }
  };

  // src/svox/lightscalculator.js
  var LightsCalculator = class {
    static calculateLights(model, buffers) {
      const lights = model.lights;
      if (lights.length === 0) {
        return;
      }
      for (const light of lights) {
        if (light.direction && !light.normalizedDirection) {
          const length = Math.sqrt(light.direction.x * light.direction.x + light.direction.y * light.direction.y + light.direction.z * light.direction.z);
          light.normalizedDirection = { x: light.direction.x, y: light.direction.y, z: light.direction.z };
          if (length > 0) {
            const d = 1 / length;
            light.normalizedDirection.x *= d;
          }
        }
      }
      const materials = model.materials.materials;
      const { faceMaterials, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceVertIndices, vertX, vertY, vertZ, faceVertLightR, faceVertLightG, faceVertLightB } = buffers;
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]];
        const faceOffset = faceIndex * 4;
        if (!material.lights) {
          for (let v = 0; v < 4; v++) {
            const faceVertOffset = faceOffset + v;
            faceVertLightR[faceVertOffset] = 1;
            faceVertLightG[faceVertOffset] = 1;
            faceVertLightB[faceVertOffset] = 1;
          }
        } else {
          for (let v = 0; v < 4; v++) {
            const faceVertOffset = faceOffset + v;
            const vertIndex = faceVertIndices[faceVertOffset];
            const vx = vertX[vertIndex];
            const vy = vertY[vertIndex];
            const vz = vertZ[vertIndex];
            const nx = faceVertNormalX[faceVertOffset];
            const ny = faceVertNormalY[faceVertOffset];
            const nz = faceVertNormalZ[faceVertOffset];
            faceVertLightR[faceVertOffset] = 0;
            faceVertLightG[faceVertOffset] = 0;
            faceVertLightB[faceVertOffset] = 0;
            for (const light of lights) {
              const { color, strength, distance, normalizedDirection, position } = light;
              let exposure = strength;
              let length = 0;
              if (position) {
                const lvx = position.x - vx;
                const lvy = position.y - vy;
                const lvz = position.z - vz;
                length = Math.sqrt(lvx * lvx + lvy * lvy + lvz * lvz);
                const d = 1 / length;
                exposure = strength * Math.max(nx * lvx * d + ny * lvy * d + nz * lvz * d, 0);
              } else if (normalizedDirection) {
                exposure = strength * Math.max(nx * normalizedDirection.x + ny * normalizedDirection.y + nz * normalizedDirection.z, 0);
              }
              if (position && distance) {
                exposure = exposure * (1 - Math.min(length / distance, 1));
              }
              faceVertLightR[faceVertOffset] += color.r * exposure;
              faceVertLightG[faceVertOffset] += color.g * exposure;
              faceVertLightB[faceVertOffset] += color.b * exposure;
            }
          }
        }
      }
    }
  };

  // src/svox/aocalculator.js
  var OCTREE_NODE_POOL = [];
  var aoCache = /* @__PURE__ */ new Map();
  var getOctreeNode = () => {
    return OCTREE_NODE_POOL.pop() || {
      minx: Number.MAX_VALUE,
      miny: Number.MAX_VALUE,
      minz: Number.MAX_VALUE,
      maxx: -Number.MAX_VALUE,
      maxy: -Number.MAX_VALUE,
      maxz: -Number.MAX_VALUE,
      partitions: Array(8).fill(null),
      triangles: []
    };
  };
  var releaseOctreeNode = (node) => {
    for (const partition of node.partitions) {
      if (partition) {
        releaseOctreeNode(partition);
      }
    }
    node.minx = Number.MAX_VALUE;
    node.miny = Number.MAX_VALUE;
    node.minz = Number.MAX_VALUE;
    node.maxx = -Number.MAX_VALUE;
    node.maxy = -Number.MAX_VALUE;
    node.maxz = -Number.MAX_VALUE;
    node.partitions.fill(null);
    node.triangles.length = 0;
    OCTREE_NODE_POOL.push(node);
  };
  var AOCalculator = class {
    static calculateAmbientOcclusion(model, buffers) {
      const doAo = model.ao || model.materials.find(function(m) {
        return m.ao;
      });
      if (!doAo) {
        return;
      }
      const { faceMaterials, faceVertIndices, faceVertAO, vertX, vertY, vertZ, faceVertNormalX, faceVertNormalY, faceVertNormalZ } = buffers;
      const { faceCount } = model;
      const materials = model.materials.materials;
      const triangles = this._getAllFaceTriangles(model, buffers);
      let octree = this._trianglesToOctree(triangles, model, buffers);
      if (model._aoSides) {
        octree = this._aoSidesToOctree(model, buffers, octree);
      }
      const nrOfSamples = model.aoSamples;
      const samples = this._generateFibonacciSamples(nrOfSamples);
      aoCache.clear();
      const modelScaleX = model.scale.x;
      const modelScaleY = model.scale.y;
      const modelScaleZ = model.scale.z;
      for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]];
        const ao = material.ao || model.ao;
        const faceOffset = faceIndex * 4;
        faceVertAO[faceOffset] = 0;
        faceVertAO[faceOffset + 1] = 0;
        faceVertAO[faceOffset + 2] = 0;
        faceVertAO[faceOffset + 3] = 0;
        if (!ao || ao.maxDistance === 0 || ao.strength === 0 || ao.angle < 1 || material.opacity === 0)
          continue;
        const max = ao.maxDistance * Math.max(modelScaleX, modelScaleY, modelScaleZ);
        const strength = ao.strength;
        const angle = Math.cos(ao.angle / 180 * Math.PI);
        for (let v = 0; v < 4; v++) {
          const faceVertOffset = faceOffset + v;
          const vertIndex = faceVertIndices[faceVertOffset];
          const vx = vertX[vertIndex];
          const vy = vertY[vertIndex];
          const vz = vertZ[vertIndex];
          const nx = faceVertNormalX[faceVertOffset];
          const ny = faceVertNormalY[faceVertOffset];
          const nz = faceVertNormalZ[faceVertOffset];
          const vKey = vx * 16384 + vy * 128 + vz;
          const nKey = nx * 1e7 + ny * 1e5 + nz * 1e3;
          const cacheKey = vKey * 1e9 + nKey;
          const cachedAo = aoCache.get(cacheKey);
          if (cachedAo !== void 0) {
            faceVertAO[faceVertOffset] = cachedAo;
            continue;
          }
          const oppositeVertIndex = faceVertIndices[faceOffset + (v + 2) % 4];
          const oppositeVertX = vertX[oppositeVertIndex];
          const oppositeVertY = vertY[oppositeVertIndex];
          const oppositeVertZ = vertZ[oppositeVertIndex];
          const originX = vx * 0.99999 + oppositeVertX * 1e-5 + nx * 1e-5;
          const originY = vy * 0.99999 + oppositeVertY * 1e-5 + ny * 1e-5;
          const originZ = vz * 0.99999 + oppositeVertZ * 1e-5 + nz * 1e-5;
          let total = 0;
          let count = 0;
          for (const [directionX, directionY, directionZ] of samples) {
            const dot = directionX * nx + directionY * ny + directionZ * nz;
            if (dot <= angle)
              continue;
            const endX = originX + directionX * max;
            const endY = originY + directionY * max;
            const endZ = originZ + directionZ * max;
            let distance = this._distanceToOctree(model, buffers, octree, originX, originY, originZ, directionX, directionY, directionZ, max, endX, endY, endZ);
            if (distance) {
              distance = distance / max;
            } else {
              distance = 1;
            }
            total += distance;
            count++;
          }
          let ao2 = 0;
          if (count !== 0) {
            total = Math.max(Math.min(total / count, 1), 0);
            ao2 = 1 - Math.pow(total, strength);
          }
          faceVertAO[faceVertOffset] = ao2;
          aoCache.set(cacheKey, ao2);
        }
      }
      releaseOctreeNode(octree);
    }
    static _getAllFaceTriangles(model, buffers) {
      const { faceMaterials } = buffers;
      const { faceCount } = model;
      const triangles = [];
      const materials = model.materials.materials;
      for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
        const material = materials[faceMaterials[faceIndex]];
        if (material.opacity < 0.75)
          continue;
        const triIndex = faceIndex * 2;
        triangles.push(triIndex);
        triangles.push(triIndex + 1);
      }
      return triangles;
    }
    static _trianglesToOctree(triangles, model, buffers) {
      const { faceVertIndices, vertX, vertY, vertZ } = buffers;
      const length = triangles.length;
      if (length <= 32) {
        const partition = getOctreeNode();
        partition.triangles = triangles;
        for (let t = 0; t < length; t++) {
          const triIndex = triangles[t];
          const faceIndex = triIndex >> 1;
          const faceOffset = faceIndex * 4;
          let triVertIndex0, triVertIndex1, triVertIndex2;
          if ((triIndex & 1) === 0) {
            triVertIndex0 = faceVertIndices[faceOffset + 2];
            triVertIndex1 = faceVertIndices[faceOffset + 1];
            triVertIndex2 = faceVertIndices[faceOffset + 0];
          } else {
            triVertIndex0 = faceVertIndices[faceOffset + 0];
            triVertIndex1 = faceVertIndices[faceOffset + 3];
            triVertIndex2 = faceVertIndices[faceOffset + 2];
          }
          const x0 = vertX[triVertIndex0];
          const y0 = vertY[triVertIndex0];
          const z0 = vertZ[triVertIndex0];
          const x1 = vertX[triVertIndex1];
          const y1 = vertY[triVertIndex1];
          const z1 = vertZ[triVertIndex1];
          const x2 = vertX[triVertIndex2];
          const y2 = vertY[triVertIndex2];
          const z2 = vertZ[triVertIndex2];
          partition.minx = Math.min(partition.minx, x0, x1, x2);
          partition.miny = Math.min(partition.miny, y0, y1, y2);
          partition.minz = Math.min(partition.minz, z0, z1, z2);
          partition.maxx = Math.max(partition.maxx, x0, x1, x2);
          partition.maxy = Math.max(partition.maxy, y0, y1, y2);
          partition.maxz = Math.max(partition.maxz, z0, z1, z2);
        }
        return partition;
      } else {
        let midx = 0;
        let midy = 0;
        let midz = 0;
        for (let t = 0; t < length; t++) {
          const triIndex = triangles[t];
          const faceIndex = triIndex >> 1;
          const faceOffset = faceIndex * 4;
          let triVertIndex0, triVertIndex1, triVertIndex2;
          if ((triIndex & 1) === 0) {
            triVertIndex0 = faceVertIndices[faceOffset + 2];
            triVertIndex1 = faceVertIndices[faceOffset + 1];
            triVertIndex2 = faceVertIndices[faceOffset + 0];
          } else {
            triVertIndex0 = faceVertIndices[faceOffset + 0];
            triVertIndex1 = faceVertIndices[faceOffset + 3];
            triVertIndex2 = faceVertIndices[faceOffset + 2];
          }
          const x0 = vertX[triVertIndex0];
          const y0 = vertY[triVertIndex0];
          const z0 = vertZ[triVertIndex0];
          const x1 = vertX[triVertIndex1];
          const y1 = vertY[triVertIndex1];
          const z1 = vertZ[triVertIndex1];
          const x2 = vertX[triVertIndex2];
          const y2 = vertY[triVertIndex2];
          const z2 = vertZ[triVertIndex2];
          midx += x0 + x1 + x2;
          midy += y0 + y1 + y2;
          midz += z0 + z1 + z2;
        }
        const d = 1 / length;
        midx *= d;
        midy *= d;
        midz *= d;
        const subTriangles = Array(8).fill(null);
        for (let t = 0; t < length; t++) {
          const triIndex = triangles[t];
          const faceIndex = triIndex >> 1;
          const faceOffset = faceIndex * 4;
          let triVertIndex0, triVertIndex1, triVertIndex2;
          if ((triIndex & 1) === 0) {
            triVertIndex0 = faceVertIndices[faceOffset + 2];
            triVertIndex1 = faceVertIndices[faceOffset + 1];
            triVertIndex2 = faceVertIndices[faceOffset + 0];
          } else {
            triVertIndex0 = faceVertIndices[faceOffset + 0];
            triVertIndex1 = faceVertIndices[faceOffset + 3];
            triVertIndex2 = faceVertIndices[faceOffset + 2];
          }
          const x0 = vertX[triVertIndex0];
          const y0 = vertY[triVertIndex0];
          const z0 = vertZ[triVertIndex0];
          const x1 = vertX[triVertIndex1];
          const y1 = vertY[triVertIndex1];
          const z1 = vertZ[triVertIndex1];
          const x2 = vertX[triVertIndex2];
          const y2 = vertY[triVertIndex2];
          const z2 = vertZ[triVertIndex2];
          const x = x0 + x1 + x2 < midx ? 0 : 1;
          const y = y0 + y1 + y2 < midy ? 0 : 1;
          const z = z0 + z1 + z2 < midz ? 0 : 1;
          const index = x + y * 2 + z * 4;
          if (subTriangles[index] === null) {
            subTriangles[index] = [triIndex];
          } else {
            subTriangles[index].push(triIndex);
          }
        }
        const partition = getOctreeNode();
        for (let index = 0; index < 8; index++) {
          if (subTriangles[index] === null)
            continue;
          const subPartition = this._trianglesToOctree(subTriangles[index], model, buffers);
          partition.partitions[index] = subPartition;
          partition.minx = Math.min(partition.minx, subPartition.minx);
          partition.miny = Math.min(partition.miny, subPartition.miny);
          partition.minz = Math.min(partition.minz, subPartition.minz);
          partition.maxx = Math.max(partition.maxx, subPartition.maxx);
          partition.maxy = Math.max(partition.maxy, subPartition.maxy);
          partition.maxz = Math.max(partition.maxz, subPartition.maxz);
        }
        return partition;
      }
    }
    static _distanceToOctree(model, buffers, octree, originX, originY, originZ, directionX, directionY, directionZ, max, endX, endY, endZ) {
      if (this._hitsBox(originX, originY, originZ, endX, endY, endZ, octree) === false) {
        return null;
      }
      if (octree.triangles.length > 0) {
        return this._distanceToModel(model, buffers, octree.triangles, originX, originY, originZ, directionX, directionY, directionZ, max);
      }
      let minDistance = max;
      const partitions = octree.partitions;
      for (let index = 0; index < 8; index++) {
        const partition = partitions[index];
        if (partition === null)
          continue;
        const dist = this._distanceToOctree(model, buffers, partition, originX, originY, originZ, directionX, directionY, directionZ, max, endX, endY, endZ);
        if (dist) {
          minDistance = Math.min(minDistance, dist);
        }
      }
      return minDistance;
    }
    static _aoSidesToOctree(model, buffers, octree) {
      const bounds = model.determineBoundsOffsetAndRescale(MODEL, buffers).bounds;
      let { vertCount, faceCount } = model;
      const { faceVertIndices, faceCulled, vertX, vertY, vertZ } = buffers;
      const pushNewTriangleIntoFaceVerts = (x0, y0, z0, x1, y1, z1, x2, y2, z2) => {
        const newFaceVertOffset = faceCount * 4;
        vertX[vertCount] = x0;
        vertY[vertCount] = y0;
        vertZ[vertCount] = z0;
        vertX[vertCount + 1] = x1;
        vertY[vertCount + 1] = y1;
        vertZ[vertCount + 1] = z1;
        vertX[vertCount + 2] = x2;
        vertY[vertCount + 2] = y2;
        vertZ[vertCount + 2] = z2;
        faceVertIndices[newFaceVertOffset] = vertCount + 2;
        faceVertIndices[newFaceVertOffset + 1] = vertCount + 1;
        faceVertIndices[newFaceVertOffset + 2] = vertCount + 0;
        faceCulled.set(faceCount, 1);
        const newTriIndex = faceCount * 2;
        faceCount++;
        vertCount += 3;
        return newTriIndex;
      };
      const sideTriangles = [];
      if (model._aoSides.nx) {
        sideTriangles.push(pushNewTriangleIntoFaceVerts(bounds.minX - 0.05, 1e6, -1e6, bounds.minX - 0.05, 1e6, 1e6, bounds.minX - 0.05, -1e7, 0));
      }
      if (model._aoSides.px) {
        sideTriangles.push(pushNewTriangleIntoFaceVerts(bounds.maxX + 0.05, 1e6, 1e6, bounds.maxX + 0.05, 1e6, -1e6, bounds.maxX + 0.05, -1e7, 0));
      }
      if (model._aoSides.ny) {
        sideTriangles.push(pushNewTriangleIntoFaceVerts(1e6, bounds.minY - 0.05, -1e6, -1e6, bounds.minY - 0.05, -1e6, 0, bounds.minY - 0.05, 1e7));
      }
      if (model._aoSides.py) {
        sideTriangles.push(pushNewTriangleIntoFaceVerts(-1e6, bounds.maxY + 0.05, -1e6, 1e6, bounds.maxY + 0.05, -1e6, 0, bounds.maxY + 0.05, 1e7));
      }
      if (model._aoSides.nz) {
        sideTriangles.push(pushNewTriangleIntoFaceVerts(1e6, 1e6, bounds.minZ - 0.05, -1e6, 1e6, bounds.minZ - 0.05, 0, -1e7, bounds.minZ - 0.05));
      }
      if (model._aoSides.pz) {
        sideTriangles.push(pushNewTriangleIntoFaceVerts(-1e6, 1e6, bounds.maxZ + 0.05, 1e6, 1e6, bounds.maxZ + 0.05, 0, -1e7, bounds.maxZ + 0.05));
      }
      if (sideTriangles.length > 0) {
        const sideOctree = this._trianglesToOctree(sideTriangles, model, buffers);
        const octree2 = getOctreeNode();
        octree2.partitions = [octree2, sideOctree];
      }
      return octree;
    }
    static _hitsBox(originX, originY, originZ, endX, endY, endZ, box) {
      const boxMinX = box.minx;
      if (originX < boxMinX && endX < boxMinX)
        return false;
      const boxMaxX = box.maxx;
      if (originX > boxMaxX && endX > boxMaxX)
        return false;
      const boxMinY = box.miny;
      if (originY < boxMinY && endY < boxMinY)
        return false;
      const boxMaxY = box.maxy;
      if (originY > boxMaxY && endY > boxMaxY)
        return false;
      const boxMinZ = box.minz;
      if (originZ < boxMinZ && endZ < boxMinZ)
        return false;
      const boxMaxZ = box.maxz;
      if (originZ > boxMaxZ && endZ > boxMaxZ)
        return false;
      const cx = originX - (boxMinX + boxMaxX) * 0.5;
      const ex = (boxMaxX - boxMinX) * 0.5;
      const dx = (endX - originX) * 0.5;
      const adx = Math.abs(dx);
      if (Math.abs(cx) > ex + adx) {
        return false;
      }
      const ey = (boxMaxY - boxMinY) * 0.5;
      const dy = (endY - originY) * 0.5;
      const ady = Math.abs(dy);
      const cy = originY - (boxMinY + boxMaxY) * 0.5;
      if (Math.abs(cy) > ey + ady) {
        return false;
      }
      const ez = (boxMaxZ - boxMinZ) * 0.5;
      const dz = (endZ - originZ) * 0.5;
      const adz = Math.abs(dz);
      const cz = originZ - (boxMinZ + boxMaxZ) * 0.5;
      if (Math.abs(cz) > ez + adz) {
        return false;
      }
      if (Math.abs(dy * cz - dz * cy) > ey * adz + ez * ady + Number.EPSILON) {
        return false;
      }
      if (Math.abs(dz * cx - dx * cz) > ez * adx + ex * adz + Number.EPSILON) {
        return false;
      }
      if (Math.abs(dx * cy - dy * cx) > ex * ady + ey * adx + Number.EPSILON) {
        return false;
      }
      return true;
    }
    static _distanceToModel(model, buffers, triangles, originX, originY, originZ, directionX, directionY, directionZ, max) {
      let minDistance = null;
      const { faceVertIndices } = buffers;
      for (let t = 0; t < triangles.length; t++) {
        const triIndex = triangles[t];
        const faceIndex = triIndex >> 1;
        const faceVertOffset = faceIndex * 4;
        let vert0Index, vert1Index, vert2Index;
        if ((triIndex & 1) === 0) {
          vert0Index = faceVertIndices[faceVertOffset + 2];
          vert1Index = faceVertIndices[faceVertOffset + 1];
          vert2Index = faceVertIndices[faceVertOffset + 0];
        } else {
          vert0Index = faceVertIndices[faceVertOffset + 0];
          vert1Index = faceVertIndices[faceVertOffset + 3];
          vert2Index = faceVertIndices[faceVertOffset + 2];
        }
        const dist = this._triangleDistance(model, buffers, vert0Index, vert1Index, vert2Index, originX, originY, originZ, directionX, directionY, directionZ);
        if (dist) {
          if (!minDistance) {
            if (dist < max) {
              minDistance = dist;
            }
          } else {
            minDistance = Math.min(minDistance, dist);
          }
        }
      }
      return minDistance;
    }
    static _triangleDistance(model, buffers, vertIndex0, vertIndex1, vertIndex2, originX, originY, originZ, directionX, directionY, directionZ) {
      const { vertX, vertY, vertZ } = buffers;
      const vert0X = vertX[vertIndex0];
      const vert0Y = vertY[vertIndex0];
      const vert0Z = vertZ[vertIndex0];
      const vert1X = vertX[vertIndex1];
      const vert1Y = vertY[vertIndex1];
      const vert1Z = vertZ[vertIndex1];
      const vert2X = vertX[vertIndex2];
      const vert2Y = vertY[vertIndex2];
      const vert2Z = vertZ[vertIndex2];
      const edge1x = vert1X - vert0X;
      const edge1y = vert1Y - vert0Y;
      const edge1z = vert1Z - vert0Z;
      const edge2x = vert2X - vert0X;
      const edge2y = vert2Y - vert0Y;
      const edge2z = vert2Z - vert0Z;
      const h0 = directionY * edge2z - directionZ * edge2y;
      const h1 = directionZ * edge2x - directionX * edge2z;
      const h2 = directionX * edge2y - directionY * edge2x;
      const a = edge1x * h0 + edge1y * h1 + edge1z * h2;
      if (a < Number.EPSILON) {
        return null;
      }
      const f = 1 / a;
      const sx = originX - vert0X;
      const sy = originY - vert0Y;
      const sz = originZ - vert0Z;
      const u = f * (sx * h0 + sy * h1 + sz * h2);
      if (u < 0 || u > 1) {
        return null;
      }
      const q0 = sy * edge1z - sz * edge1y;
      const q1 = sz * edge1x - sx * edge1z;
      const q2 = sx * edge1y - sy * edge1x;
      const v = f * (directionX * q0 + directionY * q1 + directionZ * q2);
      if (v < 0 || u + v > 1) {
        return null;
      }
      const t = f * (edge2x * q0 + edge2y * q1 + edge2z * q2);
      if (t <= Number.EPSILON) {
        return null;
      }
      return t;
    }
    static _generateFibonacciSamples(count) {
      const samples = [];
      const gr = (Math.sqrt(5) + 1) / 2;
      const ga = (2 - gr) * (2 * Math.PI);
      for (let i = 1; i <= count; ++i) {
        const lat = Math.asin(-1 + 2 * i / (count + 1));
        const lon = ga * i;
        const x = Math.cos(lon) * Math.cos(lat);
        const y = Math.sin(lat);
        const z = Math.sin(lon) * Math.cos(lat);
        samples.push([x, y, z]);
      }
      return samples;
    }
    static _generateOctahedronSamples(verticalCount) {
      const samples = [];
      const verticalAngle = Math.PI / 2 / verticalCount;
      for (let vc = 0; vc <= verticalCount; vc++) {
        const va = vc * verticalAngle;
        const y = Math.cos(va);
        const d = Math.sin(va);
        let horizontalCount = Math.max(1, vc * 4);
        const horizontalAngle = Math.PI * 2 / horizontalCount;
        for (let hc = 0; hc < horizontalCount; hc++) {
          const ha = hc * horizontalAngle;
          const x = d * Math.sin(ha);
          const z = d * Math.cos(ha);
          samples.push({ x, y, z });
          if (vc < verticalCount) {
            samples.push({ x, y: -y, z });
          }
        }
        horizontalCount += 4;
      }
      return samples;
    }
  };

  // src/svox/uvassigner.js
  var UVAssigner = class {
    static assignUVs(model, buffers) {
      const { faceMaterials, faceNameIndices, faceVertUs, faceVertVs } = buffers;
      const materialUseOffsets = [];
      const materialUScales = [];
      const materialVScales = [];
      const materials = model.materials.materials;
      for (let materialIndex = 0; materialIndex < materials.length; materialIndex++) {
        const material = materials[materialIndex];
        let useOffset = 0;
        let uscale = 1;
        let vscale = 1;
        if (material.map || material.normalMap || material.roughnessMap || material.metalnessMap || material.emissiveMap) {
          const sizeX = model.voxChunk.size[0];
          const sizeY = model.voxChunk.size[1];
          const sizeZ = model.voxChunk.size[2];
          if (material.mapTransform.uscale === -1) {
            uscale = 1 / Math.max(sizeX, sizeY, sizeZ);
          }
          if (material.mapTransform.vscale === -1) {
            vscale = 1 / Math.max(sizeX, sizeY, sizeZ);
          }
          if (material.map && material.map.cube || material.normalMap && material.normalMap.cube || material.roughnessMap && material.roughnessMap.cube || material.metalnessMap && material.metalnessMap.cube || material.emissiveMap && material.emissiveMap.cube) {
            useOffset = 1;
            uscale = uscale / 4;
            vscale = vscale / 2;
          }
        }
        materialUseOffsets.push(useOffset);
        materialUScales.push(uscale);
        materialVScales.push(vscale);
      }
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const faceMaterialIndex = faceMaterials[faceIndex];
        const useOffset = materialUseOffsets[faceMaterialIndex];
        const uscale = materialUScales[faceMaterialIndex];
        const vscale = materialVScales[faceMaterialIndex];
        const faceUVs = _FACEINDEXUVS[faceNameIndices[faceIndex]];
        const faceOffset = faceIndex * 4;
        const voxU0 = faceVertUs[faceOffset + faceUVs.order[0]];
        const voxV0 = faceVertVs[faceOffset + faceUVs.order[0]];
        const voxU1 = faceVertUs[faceOffset + faceUVs.order[1]];
        const voxV1 = faceVertVs[faceOffset + faceUVs.order[1]];
        const voxU2 = faceVertUs[faceOffset + faceUVs.order[2]];
        const voxV2 = faceVertVs[faceOffset + faceUVs.order[2]];
        const voxU3 = faceVertUs[faceOffset + faceUVs.order[3]];
        const voxV3 = faceVertVs[faceOffset + faceUVs.order[3]];
        const uv1 = faceOffset + faceUVs.order[0];
        const uv2 = faceOffset + faceUVs.order[1];
        const uv3 = faceOffset + faceUVs.order[2];
        const uv4 = faceOffset + faceUVs.order[3];
        const uOffset = useOffset * faceUVs.uo;
        const vOffset = useOffset * faceUVs.vo;
        const uScale = faceUVs.ud * uscale;
        const vScale = faceUVs.vd * vscale;
        faceVertUs[uv1] = uOffset + (voxU0 + 1e-4) * uScale;
        faceVertVs[uv1] = vOffset + (voxV0 + 1e-4) * vScale;
        faceVertUs[uv2] = uOffset + (voxU1 + 1e-4) * uScale;
        faceVertVs[uv2] = vOffset + (voxV1 + 0.9999) * vScale;
        faceVertUs[uv3] = uOffset + (voxU2 + 0.9999) * uScale;
        faceVertVs[uv3] = vOffset + (voxV2 + 0.9999) * vScale;
        faceVertUs[uv4] = uOffset + (voxU3 + 0.9999) * uScale;
        faceVertVs[uv4] = vOffset + (voxV3 + 1e-4) * vScale;
      }
    }
  };

  // src/svox/colorcombiner.js
  var ColorCombiner = class {
    static combineColors(model, buffers) {
      const { vertColorR, vertColorG, vertColorB, vertColorCount, faceVertColorR, faceVertColorG, faceVertColorB, faceVertLightR, faceVertLightG, faceVertLightB, faceVertIndices, faceMaterials, faceVertAO } = buffers;
      const materials = model.materials.materials;
      const fadeAny = !!model.materials.find((m) => m.colors.length > 1 && m.fade);
      const fadeMaterials = Array(materials.length).fill(false);
      for (let m = 0, l = materials.length; m < l; m++) {
        if (fadeAny && materials[m].colors.length > 1 && materials[m].fade) {
          fadeMaterials[m] = true;
        }
      }
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        const fadeFace = fadeMaterials[faceMaterials[faceIndex]];
        if (fadeFace) {
          for (let v = 0; v < 4; v++) {
            let r = 0;
            let g = 0;
            let b = 0;
            let count = 0;
            const faceVertOffset = faceIndex * 4 + v;
            const vertIndex = faceVertIndices[faceVertOffset];
            const colorCount = vertColorCount[vertIndex];
            for (let c2 = 0; c2 < colorCount; c2++) {
              const faceColorOffset = vertIndex * 6 + c2;
              r += vertColorR[faceColorOffset];
              g += vertColorG[faceColorOffset];
              b += vertColorB[faceColorOffset];
              count++;
            }
            const d = 1 / count;
            faceVertColorR[faceVertOffset] = r * d;
            faceVertColorG[faceVertOffset] = g * d;
            faceVertColorB[faceVertOffset] = b * d;
          }
        }
      }
      const doAo = model.ao || model.materials.find(function(m) {
        return m.ao;
      });
      const doLights = model.lights.length > 0;
      if (doAo && doLights) {
        for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
          const material = materials[faceMaterials[faceIndex]];
          const vAoShared = material.ao || model.ao;
          const vAoSharedColor = vAoShared ? vAoShared.color : null;
          for (let v = 0; v < 4; v++) {
            const faceVertOffset = faceIndex * 4 + v;
            const vR = faceVertColorR[faceVertOffset];
            const vG = faceVertColorG[faceVertOffset];
            const vB = faceVertColorB[faceVertOffset];
            const vAoColorR = vAoSharedColor ? vAoSharedColor.r : vR;
            const vAoColorG = vAoSharedColor ? vAoSharedColor.g : vG;
            const vAoColorB = vAoSharedColor ? vAoSharedColor.b : vB;
            const vAo = 1 - faceVertAO[faceVertOffset];
            faceVertColorR[faceVertOffset] = vR * faceVertLightR[faceVertOffset] * vAo + vAoColorR * (1 - vAo);
            faceVertColorG[faceVertOffset] = vG * faceVertLightG[faceVertOffset] * vAo + vAoColorG * (1 - vAo);
            faceVertColorB[faceVertOffset] = vB * faceVertLightB[faceVertOffset] * vAo + vAoColorB * (1 - vAo);
          }
        }
      } else if (doLights && !doAo) {
        for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
          for (let v = 0; v < 4; v++) {
            const faceVertOffset = faceIndex * 4 + v;
            faceVertColorR[faceVertOffset] = faceVertColorR[faceVertOffset] * faceVertLightR[faceVertOffset];
            faceVertColorG[faceVertOffset] = faceVertColorG[faceVertOffset] * faceVertLightG[faceVertOffset];
            faceVertColorB[faceVertOffset] = faceVertColorB[faceVertOffset] * faceVertLightB[faceVertOffset];
          }
        }
      } else if (!doLights && doAo) {
        for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
          const material = materials[faceMaterials[faceIndex]];
          const vAoShared = material.ao || model.ao;
          if (!vAoShared)
            continue;
          const vAoSharedColor = vAoShared.color;
          for (let v = 0; v < 4; v++) {
            const faceVertOffset = faceIndex * 4 + v;
            const vR = faceVertColorR[faceVertOffset];
            const vG = faceVertColorG[faceVertOffset];
            const vB = faceVertColorB[faceVertOffset];
            const vAoColorR = vAoSharedColor ? vAoSharedColor.r : vR;
            const vAoColorG = vAoSharedColor ? vAoSharedColor.g : vG;
            const vAoColorB = vAoSharedColor ? vAoSharedColor.b : vB;
            const vAo = 1 - faceVertAO[faceVertOffset];
            faceVertColorR[faceVertOffset] = vAo * vR + vAoColorR * (1 - vAo);
            faceVertColorG[faceVertOffset] = vAo * vG + vAoColorG * (1 - vAo);
            faceVertColorB[faceVertOffset] = vAo * vB + vAoColorB * (1 - vAo);
          }
        }
      }
    }
  };

  // src/svox/simplifier.js
  var EPS = 1e-4;
  var contexti1 = {
    filled: false,
    lastVoxelAxis1: 0,
    lastVoxelAxis2: 0,
    maxVoxelAxis3: 0,
    lastFaceIndex: 0
  };
  var contexti2 = {
    filled: false,
    lastVoxelAxis1: 0,
    lastVoxelAxis2: 0,
    maxVoxelAxis3: 0,
    lastFaceIndex: 0
  };
  var contexti3 = {
    filled: false,
    lastVoxelAxis1: 0,
    lastVoxelAxis2: 0,
    maxVoxelAxis3: 0,
    lastFaceIndex: 0
  };
  var contexti4 = {
    filled: false,
    lastVoxelAxis1: 0,
    lastVoxelAxis2: 0,
    maxVoxelAxis3: 0,
    lastFaceIndex: 0
  };
  var Simplifier = class {
    static simplify(model, buffers) {
      if (!model.simplify) {
        return;
      }
      const clearContexts = function() {
        contexti1.filled = false;
        contexti2.filled = false;
        contexti3.filled = false;
        contexti4.filled = false;
      };
      const materials = model.materials.materials;
      const { faceCulled, faceNameIndices, vertX, vertY, vertZ, voxelXZYFaceIndices, voxelXYZFaceIndices, voxelYZXFaceIndices } = buffers;
      for (let i = voxelXZYFaceIndices.length - model.faceCount, l = voxelXZYFaceIndices.length; i < l; i++) {
        const key = voxelXZYFaceIndices[i];
        const faceIndex = key & (1 << 28) - 1;
        if (faceCulled.get(faceIndex))
          continue;
        const xzy = key / (1 << 28);
        const x = xzy >> 16 & 255;
        const z = xzy >> 8 & 255;
        const y = xzy & 255;
        const faceNameIndex = faceNameIndices[faceIndex];
        switch (faceNameIndex) {
          case 0:
            this._mergeFaces(materials, model, buffers, contexti1, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
          case 1:
            this._mergeFaces(materials, model, buffers, contexti2, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
          case 4:
            this._mergeFaces(materials, model, buffers, contexti3, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
          case 5:
            this._mergeFaces(materials, model, buffers, contexti4, faceIndex, x, z, y, vertX, vertZ, vertY, 0, 1, 2, 3);
            break;
        }
      }
      clearContexts();
      for (let i = voxelXYZFaceIndices.length - model.faceCount, l = voxelXYZFaceIndices.length; i < l; i++) {
        const key = voxelXYZFaceIndices[i];
        const faceIndex = key & (1 << 28) - 1;
        if (faceCulled.get(faceIndex))
          continue;
        const xyz = key / (1 << 28);
        const x = xyz >> 16 & 255;
        const y = xyz >> 8 & 255;
        const z = xyz & 255;
        const faceNameIndex = faceNameIndices[faceIndex];
        switch (faceNameIndex) {
          case 0:
            this._mergeFaces(materials, model, buffers, contexti1, faceIndex, x, y, z, vertX, vertY, vertZ, 1, 2, 3, 0);
            break;
          case 1:
            this._mergeFaces(materials, model, buffers, contexti2, faceIndex, x, y, z, vertX, vertY, vertZ, 3, 0, 1, 2);
            break;
          case 2:
            this._mergeFaces(materials, model, buffers, contexti3, faceIndex, x, y, z, vertX, vertY, vertZ, 0, 1, 2, 3);
            break;
          case 3:
            this._mergeFaces(materials, model, buffers, contexti4, faceIndex, x, y, z, vertX, vertY, vertZ, 2, 3, 0, 1);
            break;
        }
      }
      clearContexts();
      for (let i = voxelYZXFaceIndices.length - model.faceCount, l = voxelYZXFaceIndices.length; i < l; i++) {
        const key = voxelYZXFaceIndices[i];
        const faceIndex = key & (1 << 28) - 1;
        if (faceCulled.get(faceIndex))
          continue;
        const yzx = key / (1 << 28);
        const y = yzx >> 16 & 255;
        const z = yzx >> 8 & 255;
        const x = yzx & 255;
        const faceNameIndex = faceNameIndices[faceIndex];
        switch (faceNameIndex) {
          case 2:
            this._mergeFaces(materials, model, buffers, contexti1, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0);
            break;
          case 3:
            this._mergeFaces(materials, model, buffers, contexti2, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0);
            break;
          case 4:
            this._mergeFaces(materials, model, buffers, contexti3, faceIndex, y, z, x, vertY, vertZ, vertX, 3, 0, 1, 2);
            break;
          case 5:
            this._mergeFaces(materials, model, buffers, contexti4, faceIndex, y, z, x, vertY, vertZ, vertX, 1, 2, 3, 0);
            break;
        }
      }
      clearContexts();
    }
    static _mergeFaces(materials, model, buffers, context, faceIndex, vaxis1, vaxis2, vaxis3, axis1Arr, axis2Arr, axis3Arr, v0, v1, v2, v3) {
      const { faceCulled, faceMaterials, vertX, vertY, vertZ, faceVertIndices, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceVertColorR, faceVertColorG, faceVertColorB, faceVertUs, faceVertVs, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ } = buffers;
      const materialIndex = faceMaterials[faceIndex];
      const material = materials[materialIndex];
      if (context.filled && context.lastVoxelAxis1 === vaxis1 && context.lastVoxelAxis2 === vaxis2 && (material.simplify === true || material.simplify === null && model.simplify === true) && faceCulled.get(faceIndex) === 0) {
        if (context.maxVoxelAxis3 !== vaxis3 - 1) {
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
        if (faceMaterials[lastFaceIndex] !== materialIndex)
          return;
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
        const normalsEqual = this._normalEquals(faceVertNormal0X, faceVertNormal0Y, faceVertNormal0Z, lastFaceVertNormal0X, lastFaceVertNormal0Y, lastFaceVertNormal0Z) && this._normalEquals(faceVertNormal1X, faceVertNormal1Y, faceVertNormal1Z, lastFaceVertNormal1X, lastFaceVertNormal1Y, lastFaceVertNormal1Z) && this._normalEquals(faceVertNormal2X, faceVertNormal2Y, faceVertNormal2Z, lastFaceVertNormal2X, lastFaceVertNormal2Y, lastFaceVertNormal2Z) && this._normalEquals(faceVertNormal3X, faceVertNormal3Y, faceVertNormal3Z, lastFaceVertNormal3X, lastFaceVertNormal3Y, lastFaceVertNormal3Z);
        if (!normalsEqual)
          return;
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
        const colorsEqual = faceVertColor0R === lastFaceVertColor0R && faceVertColor0G === lastFaceVertColor0G && faceVertColor0B === lastFaceVertColor0B && faceVertColor1R === lastFaceVertColor1R && faceVertColor1G === lastFaceVertColor1G && faceVertColor1B === lastFaceVertColor1B && faceVertColor2R === lastFaceVertColor2R && faceVertColor2G === lastFaceVertColor2G && faceVertColor2B === lastFaceVertColor2B && faceVertColor3R === lastFaceVertColor3R && faceVertColor3G === lastFaceVertColor3G && faceVertColor3B === lastFaceVertColor3B;
        if (!colorsEqual)
          return;
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
        const lastFaceVertIndexV0 = faceVertIndices[lastFaceOffset + v0];
        const lastFaceVertIndexV1 = faceVertIndices[lastFaceOffset + v1];
        const lastFaceVertIndexV2 = faceVertIndices[lastFaceOffset + v2];
        const lastFaceVertIndexV3 = faceVertIndices[lastFaceOffset + v3];
        const lastFaceVertV0X = vertX[lastFaceVertIndexV0];
        const lastFaceVertV0Y = vertY[lastFaceVertIndexV0];
        const lastFaceVertV0Z = vertZ[lastFaceVertIndexV0];
        const faceLength = Math.sqrt(
          (faceVertV1X - faceVertV0X) * (faceVertV1X - faceVertV0X) + (faceVertV1Y - faceVertV0Y) * (faceVertV1Y - faceVertV0Y) + (faceVertV1Z - faceVertV0Z) * (faceVertV1Z - faceVertV0Z)
        );
        const totalLength = Math.sqrt(
          (faceVertV1X - lastFaceVertV0X) * (faceVertV1X - lastFaceVertV0X) + (faceVertV1Y - lastFaceVertV0Y) * (faceVertV1Y - lastFaceVertV0Y) + (faceVertV1Z - lastFaceVertV0Z) * (faceVertV1Z - lastFaceVertV0Z)
        );
        const ratio = faceLength / totalLength;
        const positionsEqual = Math.abs(axis1Arr[lastFaceVertIndexV1] - (1 - ratio) * axis1Arr[faceVertIndexV1] - ratio * axis1Arr[lastFaceVertIndexV0]) <= EPS && Math.abs(axis2Arr[lastFaceVertIndexV1] - (1 - ratio) * axis2Arr[faceVertIndexV1] - ratio * axis2Arr[lastFaceVertIndexV0]) <= EPS && Math.abs(axis3Arr[lastFaceVertIndexV1] - (1 - ratio) * axis3Arr[faceVertIndexV1] - ratio * axis3Arr[lastFaceVertIndexV0]) <= EPS && Math.abs(axis1Arr[lastFaceVertIndexV2] - (1 - ratio) * axis1Arr[faceVertIndexV2] - ratio * axis1Arr[lastFaceVertIndexV3]) <= EPS && Math.abs(axis2Arr[lastFaceVertIndexV2] - (1 - ratio) * axis2Arr[faceVertIndexV2] - ratio * axis2Arr[lastFaceVertIndexV3]) <= EPS && Math.abs(axis3Arr[lastFaceVertIndexV2] - (1 - ratio) * axis3Arr[faceVertIndexV2] - ratio * axis3Arr[lastFaceVertIndexV3]) <= EPS;
        if (!positionsEqual)
          return;
        faceVertIndices[lastFaceOffset + v1] = faceVertIndexV1;
        faceVertIndices[lastFaceOffset + v2] = faceVertIndexV2;
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
        faceCulled.set(faceIndex, 1);
        model.nonCulledFaceCount--;
        return true;
      }
      context.filled = true;
      context.lastVoxelAxis1 = vaxis1;
      context.lastVoxelAxis2 = vaxis2;
      context.maxVoxelAxis3 = vaxis3;
      context.lastFaceIndex = faceIndex;
      return false;
    }
    static _normalEquals(n1x, n1y, n1z, n2x, n2y, n2z) {
      return Math.abs(n1x - n2x) < 0.01 && Math.abs(n1y - n2y) < 0.01 && Math.abs(n1z - n2z) < 0.01;
    }
  };

  // src/svox/facealigner.js
  var FaceAligner = class {
    static alignFaceDiagonals(model, buffers) {
      let maxDist = 0.1 * Math.min(model.scale.x, model.scale.y, model.scale.z);
      maxDist *= maxDist;
      const { faceCulled, faceVertIndices, vertX, vertY, vertZ, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertUs, faceVertVs, faceVertColorR, faceVertColorG, faceVertColorB, faceVertNormalX, faceVertNormalY, faceVertNormalZ } = buffers;
      for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
        if (faceCulled.get(faceIndex) === 1)
          continue;
        const faceVertOffset = faceIndex * 4;
        const vert0Index = faceVertIndices[faceVertOffset];
        const vert1Index = faceVertIndices[faceVertOffset + 1];
        const vert2Index = faceVertIndices[faceVertOffset + 2];
        const vert3Index = faceVertIndices[faceVertOffset + 3];
        let vert0X = vertX[vert0Index];
        let vert0Y = vertY[vert0Index];
        let vert0Z = vertZ[vert0Index];
        let vert1X = vertX[vert1Index];
        let vert1Y = vertY[vert1Index];
        let vert1Z = vertZ[vert1Index];
        let vert2X = vertX[vert2Index];
        let vert2Y = vertY[vert2Index];
        let vert2Z = vertZ[vert2Index];
        let vert3X = vertX[vert3Index];
        let vert3Y = vertY[vert3Index];
        let vert3Z = vertZ[vert3Index];
        const mid02X = (vert0X + vert2X) / 2;
        const mid02Y = (vert0Y + vert2Y) / 2;
        const mid02Z = (vert0Z + vert2Z) / 2;
        const distance1toMid = (vert1X - mid02X) * (vert1X - mid02X) + (vert1Y - mid02Y) * (vert1Y - mid02Y) + (vert1Z - mid02Z) * (vert1Z - mid02Z);
        const distance3toMid = (vert3X - mid02X) * (vert3X - mid02X) + (vert3Y - mid02Y) * (vert3Y - mid02Y) + (vert3Z - mid02Z) * (vert3Z - mid02Z);
        const mid13X = (vert1X + vert3X) / 2;
        const mid13Y = (vert1Y + vert3Y) / 2;
        const mid13Z = (vert1Z + vert3Z) / 2;
        const distance0toMid = (vert0X - mid13X) * (vert0X - mid13X) + (vert0Y - mid13Y) * (vert0Y - mid13Y) + (vert0Z - mid13Z) * (vert0Z - mid13Z);
        const distance2toMid = (vert2X - mid13X) * (vert2X - mid13X) + (vert2Y - mid13Y) * (vert2Y - mid13Y) + (vert2Z - mid13Z) * (vert2Z - mid13Z);
        if (distance1toMid < maxDist || distance3toMid < maxDist) {
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertIndices);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalX);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalY);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalZ);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertUs);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertVs);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorR);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorG);
          this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorB);
        } else if (distance0toMid < maxDist || distance2toMid < maxDist) {
        } else {
          let min = this._getVertexSumInline(vert0X, vert0Y, vert0Z);
          while (this._getVertexSumInline(vert1X, vert1Y, vert1Z) < min || this._getVertexSumInline(vert2X, vert2Y, vert2Z) < min || this._getVertexSumInline(vert3X, vert3Y, vert3Z) < min) {
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertIndices);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalX);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalY);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertNormalZ);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalX);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalY);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertFlatNormalZ);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalX);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalY);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertSmoothNormalZ);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalX);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalY);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertBothNormalZ);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertUs);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertVs);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorR);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorG);
            this._shiftFaceVertsAtOffset(faceVertOffset, faceVertColorB);
            const tx = vert0X;
            const ty = vert0Y;
            const tz = vert0Z;
            vert0X = vert1X;
            vert0Y = vert1Y;
            vert0Z = vert1Z;
            vert1X = vert2X;
            vert1Y = vert2Y;
            vert1Z = vert2Z;
            vert2X = vert3X;
            vert2Y = vert3Y;
            vert2Z = vert3Z;
            vert3X = tx;
            vert3Y = ty;
            vert3Z = tz;
            min = this._getVertexSumInline(vert0X, vert0Y, vert0Z);
          }
        }
      }
    }
    static _getVertexSumInline(vx, vy, vz) {
      return Math.abs(vx) + Math.abs(vy) + Math.abs(vz);
    }
    static _shiftFaceVertsAtOffset(offset, arr) {
      const t = arr[offset];
      arr[offset] = arr[offset + 1];
      arr[offset + 1] = arr[offset + 2];
      arr[offset + 2] = arr[offset + 3];
      arr[offset + 3] = t;
    }
  };

  // src/svox/model.js
  var SORT_NUMBERS = (a, b) => a - b;
  var Model = class {
    set origin(origin) {
      this._origin = Planar.parse(origin);
    }
    get origin() {
      return Planar.toString(this._origin);
    }
    set flatten(flatten) {
      this._flatten = Planar.parse(flatten);
    }
    get flatten() {
      return Planar.toString(this._flatten);
    }
    set clamp(clamp2) {
      this._clamp = Planar.parse(clamp2);
    }
    get clamp() {
      return Planar.toString(this._clamp);
    }
    set skip(skip) {
      this._skip = Planar.parse(skip);
    }
    get skip() {
      return Planar.toString(this._skip);
    }
    set tile(tile) {
      this._tile = Planar.parse(tile || " ");
      if (this._tile.x)
        this._tile = Planar.combine(this._tile, { nx: true, px: true });
      if (this._tile.y)
        this._tile = Planar.combine(this._tile, { ny: true, py: true });
      if (this._tile.z)
        this._tile = Planar.combine(this._tile, { nz: true, pz: true });
      this._tile.x = false;
      this._tile.y = false;
      this._tile.z = false;
    }
    get tile() {
      return Planar.toString(this._tile);
    }
    set shape(shape) {
      this._shape = (shape || "box").trim();
      if (!["box", "sphere", "cylinder-x", "cylinder-y", "cylinder-z"].includes(this._shape)) {
        throw new Error(`SyntaxError Unrecognized shape ${this._shape}. Allowed are box, sphere, cylinder-x, cylinder-y and cylinder-z`);
      }
    }
    get shape() {
      return this._shape;
    }
    setAo(ao) {
      this._ao = ao;
    }
    get ao() {
      return this._ao;
    }
    set aoSides(sides) {
      this._aoSides = Planar.parse(sides);
    }
    get aoSides() {
      return Planar.toString(this._aoSides);
    }
    set aoSamples(samples) {
      this._aoSamples = Math.round(samples);
    }
    get aoSamples() {
      return this._aoSamples;
    }
    constructor() {
      this.name = "main";
      this.lights = [];
      this.textures = {};
      this.materials = new MaterialList();
      this.voxChunk = null;
      this.scale = { x: 1, y: 1, z: 1 };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.position = { x: 0, y: 0, z: 0 };
      this.resize = false;
      this._origin = Planar.parse("x y z");
      this._flatten = Planar.parse("");
      this._clamp = Planar.parse("");
      this._skip = Planar.parse("");
      this._tile = Planar.parse("");
      this._ao = void 0;
      this._aoSamples = 50;
      this._aoSides = Planar.parse("");
      this.shape = "box";
      this.wireframe = false;
      this.simplify = true;
      this.triCount = 0;
      this.octCount = 0;
      this.octMissCount = 0;
      this.faceCount = 0;
      this.vertCount = 0;
      this.nonCulledFaceCount = 0;
    }
    prepareForWrite() {
      if (this.lights.some((light) => light.size)) {
        this.materials.materials[0].colors[0].count = 1;
      }
    }
    prepareForRender(buffers) {
      const { tmpVertIndexLookup, tmpVoxelXZYFaceIndices, tmpVoxelXYZFaceIndices, tmpVoxelYZXFaceIndices } = buffers;
      const { voxChunk } = this;
      this.prepareForWrite();
      const maximumDeformCount = Deformer.maximumDeformCount(this);
      this.faceCount = 0;
      this.vertCount = 0;
      const allowDeform = maximumDeformCount > 0;
      const [minX, maxX, minY, maxY, minZ, maxZ] = xyzRangeForSize(voxChunk.size);
      const materials = this.materials.materials;
      const xShift = shiftForSize(voxChunk.size[0]);
      const yShift = shiftForSize(voxChunk.size[1]);
      const zShift = shiftForSize(voxChunk.size[2]);
      for (let vx = minX; vx <= maxX; vx++) {
        for (let vy = minY; vy <= maxY; vy++) {
          for (let vz = minZ; vz <= maxZ; vz++) {
            const paletteIndex = voxChunk.getPaletteIndexAt(vx, vy, vz);
            if (paletteIndex === 0)
              continue;
            const pvx = vx + xShift;
            const pvy = vy + yShift;
            const pvz = vz + zShift;
            const pvxTop = pvx << 16;
            const pvzMid = pvz << 8;
            const xzyKey = (pvxTop | pvzMid | pvy) * (1 << 28);
            const xyzKey = (pvxTop | pvy << 8 | pvz) * (1 << 28);
            const yzxKey = (pvy << 16 | pvzMid | pvx) * (1 << 28);
            for (let faceNameIndex = 0, l = _FACES.length; faceNameIndex < l; faceNameIndex++) {
              const neighbor = _NEIGHBORS[faceNameIndex];
              let neighborPaletteIndex;
              const nvx = vx + neighbor[0];
              const nvy = vy + neighbor[1];
              const nvz = vz + neighbor[2];
              if (nvx < minX || nvx > maxX || nvy < minY || nvy > maxY || nvz < minZ || nvz > maxZ) {
                neighborPaletteIndex = 0;
              } else {
                neighborPaletteIndex = voxChunk.getPaletteIndexAt(nvx, nvy, nvz);
              }
              const created = this._createFace(voxChunk, buffers, materials, vx, vy, vz, xShift, yShift, zShift, paletteIndex, neighborPaletteIndex, faceNameIndex, allowDeform, tmpVertIndexLookup);
              if (created) {
                const faceIndex = this.faceCount - 1;
                tmpVoxelXZYFaceIndices[faceIndex] = xzyKey + faceIndex;
                tmpVoxelXYZFaceIndices[faceIndex] = xyzKey + faceIndex;
                tmpVoxelYZXFaceIndices[faceIndex] = yzxKey + faceIndex;
              }
            }
          }
        }
      }
      this.nonCulledFaceCount = this.faceCount;
      tmpVertIndexLookup.clear();
      buffers.voxelXZYFaceIndices = tmpVoxelXZYFaceIndices.slice(0, this.faceCount);
      buffers.voxelXYZFaceIndices = tmpVoxelXYZFaceIndices.slice(0, this.faceCount);
      buffers.voxelYZXFaceIndices = tmpVoxelYZXFaceIndices.slice(0, this.faceCount);
      buffers.voxelXZYFaceIndices.sort(SORT_NUMBERS);
      buffers.voxelXYZFaceIndices.sort(SORT_NUMBERS);
      buffers.voxelYZXFaceIndices.sort(SORT_NUMBERS);
      VertexLinker.fixClampedLinks(this, buffers);
      Deformer.changeShape(this, buffers, this._shape);
      Deformer.deform(this, buffers, maximumDeformCount);
      Deformer.warpAndScatter(this, buffers);
      NormalsCalculator.calculateNormals(this, buffers);
      VertexTransformer.transformVertices(this, buffers);
      LightsCalculator.calculateLights(this, buffers);
      AOCalculator.calculateAmbientOcclusion(this, buffers);
      ColorCombiner.combineColors(this, buffers);
      UVAssigner.assignUVs(this, buffers);
      Simplifier.simplify(this, buffers);
      FaceAligner.alignFaceDiagonals(this, buffers);
    }
    determineBoundsOffsetAndRescale(resize, buffers) {
      const bos = { bounds: null, offset: null, rescale: 1 };
      let minX, minY, minZ, maxX, maxY, maxZ;
      const { vertX, vertY, vertZ } = buffers;
      if (resize === BOUNDS || resize === MODEL) {
        minX = Number.POSITIVE_INFINITY;
        minY = Number.POSITIVE_INFINITY;
        minZ = Number.POSITIVE_INFINITY;
        maxX = Number.NEGATIVE_INFINITY;
        maxY = Number.NEGATIVE_INFINITY;
        maxZ = Number.NEGATIVE_INFINITY;
        for (let vertIndex = 0, c = this.vertCount; vertIndex < c; vertIndex++) {
          const vx = vertX[vertIndex];
          const vy = vertY[vertIndex];
          const vz = vertZ[vertIndex];
          if (vx < minX)
            minX = vx;
          if (vy < minY)
            minY = vy;
          if (vz < minZ)
            minZ = vz;
          if (vx > maxX)
            maxX = vx;
          if (vy > maxY)
            maxY = vy;
          if (vz > maxZ)
            maxZ = vz;
        }
        if (resize === MODEL) {
          const [minX2, maxX2, minY2, maxY2, minZ2, maxZ2] = xyzRangeForSize(this.voxChunk.size);
          const scaleX = (maxX2 - minX2 + 1) / (maxX2 - minX2);
          const scaleY = (maxY2 - minY2 + 1) / (maxY2 - minY2);
          const scaleZ = (maxZ2 - minZ2 + 1) / (maxZ2 - minZ2);
          bos.rescale = Math.min(scaleX, scaleY, scaleZ);
        }
      }
      if (!resize) {
        minX = this.bounds.minX;
        maxX = this.bounds.maxX + 1;
        minY = this.bounds.minY;
        maxY = this.bounds.maxY + 1;
        minZ = this.bounds.minZ;
        maxZ = this.bounds.maxZ + 1;
      }
      let offsetX = -(minX + maxX) / 2;
      let offsetY = -(minY + maxY) / 2;
      let offsetZ = -(minZ + maxZ) / 2;
      if (this._origin.nx)
        offsetX = -minX;
      if (this._origin.px)
        offsetX = -maxX;
      if (this._origin.ny)
        offsetY = -minY;
      if (this._origin.py)
        offsetY = -maxY;
      if (this._origin.nz)
        offsetZ = -minZ;
      if (this._origin.pz)
        offsetZ = -maxZ;
      bos.bounds = { minX, minY, minZ, maxX, maxY, maxZ };
      bos.offset = { x: offsetX, y: offsetY, z: offsetZ };
      return bos;
    }
    _createFace(voxChunk, buffers, materials, vx, vy, vz, xShift, yShift, zShift, paletteIndex, neighborPaletteIndex, faceNameIndex, linkVertices, vertIndexLookup) {
      const color = voxChunk.colorForPaletteIndex(paletteIndex);
      const materialIndex = (color & 4278190080) >> 24;
      const material = materials[materialIndex];
      if (material.opacity === 0) {
        return false;
      } else if (neighborPaletteIndex === 0) {
      } else {
        const neightborMaterialIndex = (voxChunk.colorForPaletteIndex(neighborPaletteIndex) & 4278190080) >> 24;
        const neighborMaterial = materials[neightborMaterialIndex];
        if (!neighborMaterial.isTransparent && !material.wireframe) {
          return false;
        } else if (!material.isTransparent && !material.wireframe) {
        } else if (material.isTransparent && !material.wireframe && neighborPaletteIndex !== 0 && materials[(voxChunk.colorForPaletteIndex(neighborPaletteIndex) & 4278190080) >> 24].wireframe) {
        } else {
          return false;
        }
      }
      const flattened = this._isFacePlanar(material, vx, vy, vz, faceNameIndex, material._flatten, this._flatten);
      const clamped = this._isFacePlanar(material, vx, vy, vz, faceNameIndex, material._clamp, this._clamp);
      const skipped = this._isFacePlanar(material, vx, vy, vz, faceNameIndex, material._skip, this._skip);
      if (skipped)
        return false;
      const { faceVertIndices, faceVertColorR, faceVertColorG, faceVertColorB, faceFlattened, faceClamped, faceSmooth, faceCulled, faceMaterials, faceNameIndices, faceVertUs, faceVertVs } = buffers;
      const { faceCount } = this;
      const faceVertOffset = faceCount * 4;
      const vr = (color & 255) / 255;
      const vg = ((color & 65280) >> 8) / 255;
      const vb = ((color & 16711680) >> 16) / 255;
      faceVertIndices[faceVertOffset] = this._createVertex(buffers, material, vx, vy, vz, vr, vg, vb, xShift, yShift, zShift, faceNameIndex, 0, flattened, clamped, vertIndexLookup);
      faceVertIndices[faceVertOffset + 1] = this._createVertex(buffers, material, vx, vy, vz, vr, vg, vb, xShift, yShift, zShift, faceNameIndex, 1, flattened, clamped, vertIndexLookup);
      faceVertIndices[faceVertOffset + 2] = this._createVertex(buffers, material, vx, vy, vz, vr, vg, vb, xShift, yShift, zShift, faceNameIndex, 2, flattened, clamped, vertIndexLookup);
      faceVertIndices[faceVertOffset + 3] = this._createVertex(buffers, material, vx, vy, vz, vr, vg, vb, xShift, yShift, zShift, faceNameIndex, 3, flattened, clamped, vertIndexLookup);
      for (let v2 = 0; v2 < 4; v2++) {
        faceVertColorR[faceVertOffset + v2] = vr;
        faceVertColorG[faceVertOffset + v2] = vg;
        faceVertColorB[faceVertOffset + v2] = vb;
      }
      faceFlattened.set(faceCount, flattened ? 1 : 0);
      faceClamped.set(faceCount, clamped ? 1 : 0);
      faceSmooth.set(faceCount, 0);
      faceCulled.set(faceCount, 0);
      faceMaterials[faceCount] = materialIndex;
      faceNameIndices[faceCount] = faceNameIndex;
      const faceUVs = _FACEINDEXUV_MULTIPLIERS[faceNameIndex];
      const faceUVsU = faceUVs[0];
      const faceUVsV = faceUVs[1];
      const vxs = vx + xShift;
      const vys = vy + yShift;
      const vzs = vz + zShift;
      const u = vxs * faceUVsU[0] + vys * faceUVsU[1] + vzs * faceUVsU[2];
      const v = vxs * faceUVsV[0] + vys * faceUVsV[1] + vzs * faceUVsV[2];
      for (let i = 0; i < 4; i++) {
        faceVertUs[faceVertOffset + i] = u;
        faceVertVs[faceVertOffset + i] = v;
      }
      if (linkVertices) {
        VertexLinker.linkVertices(this, buffers, faceCount);
      }
      this.faceCount++;
      return true;
    }
    _createVertex(buffers, material, vx, vy, vz, vr, vg, vb, xShift, yShift, zShift, faceNameIndex, vi, flattened, clamped, vertIndexLookup) {
      const vertexOffset = _VERTEX_OFFSETS[faceNameIndex][vi];
      const x = vx + vertexOffset[0];
      const y = vy + vertexOffset[1];
      const z = vz + vertexOffset[2];
      const key = x + xShift << 20 | y + yShift << 10 | z + zShift;
      const { _clamp: modelClamp, _flatten: modelFlatten } = this;
      const { vertDeformCount, vertDeformDamping, vertDeformStrength, vertWarpAmplitude, vertWarpFrequency, vertScatter, vertX, vertY, vertZ, vertLinkCounts, vertFullyClamped, vertRing, vertClampedX, vertClampedY, vertClampedZ, vertColorR, vertColorG, vertColorB, vertColorCount, vertFlattenedX, vertFlattenedY, vertFlattenedZ } = buffers;
      const { deform, warp, scatter } = material;
      let vertIndex;
      if (vertIndexLookup.has(key)) {
        vertIndex = vertIndexLookup.get(key);
        if (!deform) {
          vertDeformCount[vertIndex] = 0;
          vertDeformDamping[vertIndex] = 0;
          vertDeformStrength[vertIndex] = 0;
        } else if (vertDeformCount[vertIndex] !== 0 && this._getDeformIntegral(material.deform) < this._getDeformIntegralAtVertex(buffers, vertIndex)) {
          vertDeformStrength[vertIndex] = deform.strength;
          vertDeformDamping[vertIndex] = deform.damping;
          vertDeformCount[vertIndex] = deform.count;
        }
        if (!warp) {
          vertWarpAmplitude[vertIndex] = 0;
          vertWarpFrequency[vertIndex] = 0;
        } else if (vertWarpAmplitude[vertIndex] !== 0 && (warp.amplitude < vertWarpAmplitude[vertIndex] || warp.amplitude === vertWarpAmplitude[vertIndex] && warp.frequency > vertWarpFrequency[vertIndex])) {
          vertWarpAmplitude[vertIndex] = warp.amplitude;
          vertWarpFrequency[vertIndex] = warp.frequency;
        }
        if (!scatter) {
          vertScatter[vertIndex] = 0;
        } else if (vertScatter[vertIndex] !== 0 && Math.abs(scatter) < Math.abs(vertScatter[vertIndex])) {
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
        } else {
          vertDeformCount[vertIndex] = 0;
        }
        if (warp) {
          vertWarpAmplitude[vertIndex] = warp.amplitude;
          vertWarpFrequency[vertIndex] = warp.frequency;
        } else {
          vertWarpAmplitude[vertIndex] = 0;
        }
        if (scatter) {
          vertScatter[vertIndex] = scatter;
        } else {
          vertScatter[vertIndex] = 0;
        }
        vertColorCount[vertIndex] = 0;
        vertRing[vertIndex] = 0;
        vertClampedX.set(vertIndex, 0);
        vertClampedY.set(vertIndex, 0);
        vertClampedZ.set(vertIndex, 0);
        vertFlattenedX.set(vertIndex, 0);
        vertFlattenedY.set(vertIndex, 0);
        vertFlattenedZ.set(vertIndex, 0);
      }
      this._setIsVertexPlanar(material, x, y, z, material._flatten, modelFlatten, vertFlattenedX, vertFlattenedY, vertFlattenedZ, vertIndex);
      this._setIsVertexPlanar(material, x, y, z, material._clamp, modelClamp, vertClampedX, vertClampedY, vertClampedZ, vertIndex);
      if (material.fade) {
        const vertColorIndex = vertColorCount[vertIndex];
        const vertColorOffset = vertIndex * 6;
        vertColorR[vertColorOffset + vertColorIndex] = vr;
        vertColorG[vertColorOffset + vertColorIndex] = vg;
        vertColorB[vertColorOffset + vertColorIndex] = vb;
        vertColorCount[vertIndex]++;
      }
      this.vertCount++;
      return vertIndex;
    }
    _getDeformIntegral(deform) {
      return deform.damping === 1 ? deform.strength * (deform.count + 1) : deform.strength * (1 - Math.pow(deform.damping, deform.count + 1)) / (1 - deform.damping);
    }
    _getDeformIntegralAtVertex(buffers, vertIndex) {
      const { vertDeformDamping, vertDeformStrength, vertDeformCount } = buffers;
      const damping = vertDeformDamping[vertIndex];
      const count = vertDeformCount[vertIndex];
      const strength = vertDeformStrength[vertIndex];
      return damping === 1 ? strength * (count + 1) : strength * (1 - Math.pow(damping, count + 1)) / (1 - damping);
    }
    _isFacePlanar(material, vx, vy, vz, faceNameIndex, materialPlanar, modelPlanar) {
      let planar = materialPlanar;
      let bounds = material.bounds;
      if (!planar) {
        planar = modelPlanar;
        bounds = this.bounds;
      }
      if (!planar)
        return false;
      switch (faceNameIndex) {
        case 0:
          return planar.x || planar.nx && vx === bounds.minX;
        case 1:
          return planar.x || planar.px && vx === bounds.maxX;
        case 2:
          return planar.y || planar.ny && vy === bounds.minY;
        case 3:
          return planar.y || planar.py && vy === bounds.maxY;
        case 4:
          return planar.z || planar.nz && vz === bounds.minZ;
        case 5:
          return planar.z || planar.pz && vz === bounds.maxZ;
        default:
          return false;
      }
    }
    _setIsVertexPlanar(material, vx, vy, vz, materialPlanar, modelPlanar, arrX, arrY, arrZ, vertIndex) {
      let planar = materialPlanar;
      let bounds = material.bounds;
      if (!planar) {
        planar = modelPlanar;
        bounds = this.bounds;
      }
      if (planar) {
        arrX.set(vertIndex, planar.x || planar.nx && vx < bounds.minX + 0.5 || planar.px && vx > bounds.maxX + 0.5 ? 1 : arrX.get(vertIndex) | 0);
        arrY.set(vertIndex, planar.y || planar.ny && vy < bounds.minY + 0.5 || planar.py && vy > bounds.maxY + 0.5 ? 1 : arrY.get(vertIndex) | 0);
        arrZ.set(vertIndex, planar.z || planar.nz && vz < bounds.minZ + 0.5 || planar.pz && vz > bounds.maxZ + 0.5 ? 1 : arrZ.get(vertIndex) | 0);
      } else {
        arrX.set(vertIndex, arrX.get(vertIndex) | 0);
        arrY.set(vertIndex, arrY.get(vertIndex) | 0);
        arrZ.set(vertIndex, arrZ.get(vertIndex) | 0);
      }
    }
  };

  // src/svox/modelreader.js
  var ModelReader = class {
    static readFromString(modelString) {
      const modelData = this._parse(modelString);
      this._validateModel(modelData);
      const model = this._createModel(modelData);
      return model;
    }
    static _parse(modelString) {
      const regex = {
        linecontinuation: /_\s*[\r\n]/gm,
        modelparts: new RegExp(
          /\s*(\/\/(.*?)\r?\n)/.source + "|" + /\s*(texture|light|model|material|voxels)\s+/.source + "|" + /\s*([^=,\r\n]+=\s*data:image.*?base64,.*$)\s*/.source + "|" + /\s*([^=,\r\n]+=[^\r\n=;,/]+)\s*/.source + "|" + /\s*([A-Za-z ()\d -]+)\s*/.source,
          "gm"
        )
      };
      const modelData = { lights: [], textures: [], materials: [] };
      let parent = modelData;
      let voxelString = null;
      const lines = Array.from(modelString.replaceAll(regex.linecontinuation, " ").matchAll(regex.modelparts), (m) => m[0].trim());
      lines.filter((l) => l).forEach(function(line) {
        if (line.startsWith("//")) {
        } else if (line === "texture") {
          parent = { id: "<no-name>", cube: false };
          modelData.textures.push(parent);
        } else if (line === "light") {
          parent = { color: "#FFF" };
          modelData.lights.push(parent);
        } else if (line === "model") {
          parent = modelData;
        } else if (line === "material") {
          parent = {};
          modelData.materials.push(parent);
        } else if (line === "voxels") {
          parent = modelData;
          voxelString = "";
        } else if (voxelString !== null) {
          voxelString += line.replace(/\s/g, "");
        } else {
          const equalIndex = line.indexOf("=");
          if (equalIndex === -1) {
            throw new Error(`SyntaxError: Invalid definition '${line}'.`);
          }
          const name = line.substring(0, equalIndex).trim().toLowerCase();
          const value = line.substring(equalIndex + 1).trim();
          parent[name] = value;
        }
      }, this);
      modelData.voxels = voxelString;
      return modelData;
    }
    static _createModel(modelData) {
      const model = new Model();
      model.size = this._parseXYZInt("size", modelData.size, null, true);
      model.scale = this._parseXYZFloat("scale", modelData.scale, "1", true);
      model.rotation = this._parseXYZFloat("rotation", modelData.rotation, "0 0 0", false);
      model.position = this._parseXYZFloat("position", modelData.position, "0 0 0", false);
      model.simplify = modelData.simplify !== "false";
      if (modelData.resize === BOUNDS) {
        model.resize = BOUNDS;
      } else if (modelData.resize === MODEL) {
        model.resize = MODEL;
      } else if (modelData.resize) {
        model.resize = null;
      } else if (modelData.autoresize === "true") {
        model.resize = MODEL;
      }
      model.shape = modelData.shape;
      model.wireframe = modelData.wireframe === "true" || false;
      model.origin = modelData.origin || "x y z";
      model.flatten = modelData.flatten;
      model.clamp = modelData.clamp;
      model.skip = modelData.skip;
      model.tile = modelData.tile;
      model.setAo(this._parseAo(modelData.ao));
      model.aoSides = modelData.aosides;
      model.aoSamples = parseInt(modelData.aosamples || 50, 10);
      model.data = this._parseVertexData(modelData.data, "model");
      model.shell = this._parseShell(modelData.shell);
      if (modelData.lights.some((light) => light.size)) {
        const lightMaterial = model.materials.createMaterial(
          MATBASIC,
          FLAT,
          1,
          0,
          false,
          false,
          1,
          0,
          false,
          1,
          false,
          FRONT,
          "#FFF",
          0,
          false,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          -1,
          -1,
          0,
          0,
          0
        );
        lightMaterial.addColorHEX("#FFFFFF");
      }
      modelData.lights.forEach(function(lightData) {
        this._createLight(model, lightData);
      }, this);
      modelData.textures.forEach(function(textureData) {
        this._createTexture(model, textureData);
      }, this);
      modelData.materials.forEach(function(materialData) {
        this._createMaterial(model, materialData);
      }, this);
      model.colors = {};
      model.materials.forEach(function(material) {
        material.colors.forEach(function(color) {
          model.colors[color.id] = color;
        });
      });
      this._resolveShellColors(model.shell, model);
      model.materials.forEach(function(material) {
        this._resolveShellColors(material.shell, model);
      }, this);
      this._createVoxels(model, modelData.voxels);
      return model;
    }
    static _createLight(model, lightData) {
      if (!lightData.color) {
        lightData.color = "#FFF 1";
      }
      if (!lightData.color.startsWith("#")) {
        lightData.color = "#FFF " + lightData.color;
      }
      lightData.strength = parseFloat(lightData.color.split(" ")[1] || 1);
      lightData.color = Color.fromHex(lightData.color.split(" ")[0]);
      lightData.direction = this._parseXYZFloat("direction", lightData.direction, null, false);
      lightData.position = this._parseXYZFloat("position", lightData.position, null, false);
      lightData.distance = parseFloat(lightData.distance || 0);
      lightData.size = Math.max(0, parseFloat(lightData.size || 0));
      lightData.detail = Math.min(3, Math.max(0, parseInt(lightData.detail || 1, 10)));
      const light = new Light(
        lightData.color,
        lightData.strength,
        lightData.direction,
        lightData.position,
        lightData.distance,
        lightData.size,
        lightData.detail
      );
      model.lights.push(light);
    }
    static _createTexture(model, textureData) {
      textureData.cube = textureData.cube === "true" || false;
      model.textures[textureData.id] = textureData;
    }
    static _createMaterial(model, materialData) {
      let lighting = FLAT;
      if (materialData.lighting === QUAD)
        lighting = QUAD;
      if (materialData.lighting === SMOOTH)
        lighting = SMOOTH;
      if (materialData.lighting === BOTH)
        lighting = BOTH;
      if (!materialData.emissive) {
        if (materialData.emissivemap) {
          materialData.emissive = "#FFF 1";
        } else {
          materialData.emissive = "#000 0";
        }
      }
      if (!materialData.emissive.startsWith("#")) {
        materialData.emissive = "#FFF " + materialData.emissive;
      }
      materialData.emissiveColor = materialData.emissive.split(" ")[0];
      materialData.emissiveIntensity = materialData.emissive.split(" ")[1] || 1;
      if (materialData.ao && !materialData.ao.startsWith("#")) {
        materialData.ao = "#000 " + materialData.ao;
      }
      materialData.maptransform = materialData.maptransform || "";
      let simplify = null;
      if (model.simplify && materialData.simplify === "false") {
        simplify = false;
      }
      if (!model.simplify && materialData.simplify === "true") {
        simplify = true;
      }
      const material = model.materials.createMaterial(
        materialData.type || MATSTANDARD,
        lighting,
        parseFloat(materialData.roughness || (materialData.roughnessmap ? 1 : 1)),
        parseFloat(materialData.metalness || (materialData.metalnessmap ? 1 : 0)),
        materialData.fade === "true" || false,
        simplify,
        parseFloat(materialData.opacity || 1),
        parseFloat(materialData.alphatest || 0),
        materialData.transparent === "true" || false,
        parseFloat(materialData.refractionratio || 0.9),
        materialData.wireframe === "true" || false,
        materialData.side,
        materialData.emissiveColor,
        materialData.emissiveIntensity,
        materialData.fog !== "false",
        materialData.map ? model.textures[materialData.map] : null,
        materialData.normalmap ? model.textures[materialData.normalmap] : null,
        materialData.roughnessmap ? model.textures[materialData.roughnessmap] : null,
        materialData.metalnessmap ? model.textures[materialData.metalnessmap] : null,
        materialData.emissivemap ? model.textures[materialData.emissivemap] : null,
        materialData.matcap ? model.textures[materialData.matcap] : null,
        materialData.reflectionmap ? model.textures[materialData.reflectionmap] : null,
        materialData.refractionmap ? model.textures[materialData.refractionmap] : null,
        parseFloat(materialData.maptransform.split(" ")[0] || -1),
        parseFloat(materialData.maptransform.split(" ")[1] || -1),
        parseFloat(materialData.maptransform.split(" ")[2] || 0),
        parseFloat(materialData.maptransform.split(" ")[3] || 0),
        parseFloat(materialData.maptransform.split(" ")[4] || 0)
      );
      if (materialData.deform) {
        material.setDeform(
          parseFloat(materialData.deform.split(" ")[0]),
          parseFloat(materialData.deform.split(" ")[1] || 1),
          parseFloat(materialData.deform.split(" ")[2] || 1)
        );
      }
      if (materialData.warp) {
        material.setWarp(
          parseFloat(materialData.warp.split(" ")[0]),
          parseFloat(materialData.warp.split(" ")[1] || 1)
        );
      }
      if (materialData.scatter) {
        material.scatter = parseFloat(materialData.scatter);
      }
      material.flatten = materialData.flatten;
      material.clamp = materialData.clamp;
      material.skip = materialData.skip;
      material.setAo(this._parseAo(materialData.ao));
      material.shell = this._parseShell(materialData.shell);
      material.lights = materialData.lights !== "false";
      material.data = this._parseVertexData(materialData.data, "material");
      this._compareVertexData(model.data, material.data);
      const CLEANCOLORID = /\s*\(\s*(\d+)\s*\)\s*/g;
      const CLEANDEFINITION = /([A-Z][a-z]*)\s*(\(\d+\))?[:]\s*(#[a-fA-F0-9]*)\s*/g;
      materialData.colors = materialData.colors.replace(CLEANCOLORID, "($1)");
      materialData.colors = materialData.colors.replace(CLEANDEFINITION, "$1$2:$3 ");
      const colors = materialData.colors.split(" ").filter((x) => x);
      colors.forEach(function(colorData) {
        let colorId = colorData.split(":")[0];
        let colorExId = null;
        if (colorId.includes("(")) {
          colorExId = Number(colorId.split("(")[1].replace(")", ""));
          colorId = colorId.split("(")[0];
        }
        let color = colorData.split(":")[1];
        if (!material.colors[colorId]) {
          color = material.addColor(Color.fromHex(color));
          if (!/^[A-Z][a-z]*$/.test(colorId)) {
            throw new Error(`SyntaxError: Invalid color ID '${colorId}'`);
          }
          color.id = colorId;
          color.exId = colorExId;
        }
      }, this);
    }
    static _createVoxels(model, voxels) {
      const colors = model.colors;
      let errorMaterial = null;
      let chunks = [];
      if (voxels.matchAll) {
        chunks = voxels.matchAll(/[0-9]+|[A-Z][a-z]*|-+|[()]/g);
      } else {
        const regex = /[0-9]+|[A-Z][a-z]*|-+|[()]/g;
        let chunk;
        while ((chunk = regex.exec(voxels)) !== null) {
          chunks.push(chunk);
        }
        chunks = chunks[Symbol.iterator]();
      }
      const rleArray = this._unpackRle(chunks);
      const totalSize = model.size.x * model.size.y * model.size.z;
      let voxelLength = 0;
      const voxChunk = model.voxChunk = new Voxels([model.size.x, model.size.y, model.size.z]);
      for (let i = 0; i < rleArray.length; i++) {
        voxelLength += rleArray[i][1];
      }
      if (voxelLength !== totalSize) {
        throw new Error(`SyntaxError: The specified size is ${model.size.x} x ${model.size.y} x ${model.size.z} (= ${totalSize} voxels) but the voxel matrix contains ${voxelLength} voxels.`);
      }
      const context = {
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
      model.bounds = new BoundingBox();
      let materialIndex = 0;
      for (let i = 0; i < rleArray.length; i++) {
        let color = null;
        if (rleArray[i][0] !== "-") {
          color = colors[rleArray[i][0]];
          materialIndex = model.materials.materials.findIndex((m) => m.colors.includes(color));
          if (!color) {
            if (errorMaterial === null) {
              errorMaterial = model.materials.createMaterial(MATSTANDARD, FLAT, 0.5, 0, false, 1, false);
            }
            color = Color.fromHex("#FF00FF");
            color.id = rleArray[i][0];
            errorMaterial.addColor(color);
            colors[rleArray[i][0]] = color;
          }
        }
        this._setVoxels(model, color, rleArray[i][1], context, voxChunk, materialIndex);
      }
    }
    static _parseAo(oaData) {
      let ao;
      if (oaData) {
        if (!oaData.startsWith("#")) {
          oaData = "#000 " + oaData;
        }
        const color = Color.fromHex(oaData.split(" ")[0]);
        const maxDistance = Math.abs(parseFloat(oaData.split(" ")[1] || 1));
        const strength = parseFloat(oaData.split(" ")[2] || 1);
        let angle = parseFloat(oaData.split(" ")[3] || 70);
        angle = Math.max(0, Math.min(90, Math.round(angle)));
        ao = { color, maxDistance, strength, angle };
      }
      return ao;
    }
    static _parseShell(shellData) {
      let shell;
      let error = false;
      if (shellData) {
        shell = [];
        if (shellData !== "none") {
          const parts = shellData.split(/\s+/);
          if (parts.length < 2 || parts.length % 2 !== 0) {
            error = true;
          } else {
            for (let s = 0; s < parts.length / 2; s++) {
              const colorId = parts[s * 2 + 0];
              const distance = parts[s * 2 + 1];
              if (!/^[A-Z][a-z]*$/.test(colorId) || !/^([-+]?[0-9]*\.?[0-9]+)*$/.test(distance)) {
                error = true;
                break;
              } else {
                shell.push({ colorId: parts[s * 2], distance: parts[s * 2 + 1] });
              }
            }
          }
        }
      }
      if (error) {
        throw new Error(`SyntaxError: shell '${shellData}' must be 'none' or one or more color ID's and distances, e.g. P 0.2 Q 0.4`);
      } else if (shell) {
        shell = shell.sort(function(a, b) {
          return a.distance - b.distance;
        });
      }
      return shell;
    }
    static _resolveShellColors(shell, model) {
      if (!shell || shell.length === 0) {
        return;
      }
      shell.forEach(function(sh) {
        sh.color = model.colors[sh.colorId];
        if (!sh.color) {
          throw new Error(`SyntaxError: shell color ID '${sh.colorId}' is not a known color`);
        }
      }, this);
    }
    static _parseVertexData(vertexData, modelType) {
      if (vertexData) {
        const modelData = [];
        const parts = vertexData.split(/\s+/);
        let data = null;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (isNaN(part)) {
            data = { name: part, values: [] };
            modelData.push(data);
          } else if (!data) {
            break;
          } else {
            data.values.push(parseFloat(part));
          }
        }
        let error = modelData.length === 0;
        for (let i = 0; i < modelData.length; i++) {
          error = error || modelData[i].values.length === 0 || modelData[i].values.length >= 4;
        }
        if (error) {
          throw new Error(`SyntaxError: The data property '${modelData.data}' of the ${modelType} should consist of one or more names, each followed by 1 to 4 float (default) values.`);
        }
        return modelData;
      }
    }
    static _compareVertexData(modelData, materialData) {
      let error = false;
      try {
        if ((modelData || materialData) && materialData) {
          error = materialData && !modelData;
          error = error || modelData.length !== materialData.length;
          for (let i = 0; i < modelData.length; i++) {
            error = error || modelData[i].name !== materialData[i].name;
            error = error || modelData[i].values.length !== materialData[i].values.length;
          }
        }
      } catch (ex) {
        error = true;
      }
      if (error) {
        throw new Error("SyntaxError: The data property of the material should consist of identical names and number of values as the model data property.");
      }
    }
    static _parseXYZInt(name, value, defaultValue, allowUniform) {
      const xyz = this._parseXYZFloat(name, value, defaultValue, allowUniform);
      return {
        x: Math.trunc(xyz.x),
        y: Math.trunc(xyz.y),
        z: Math.trunc(xyz.z)
      };
    }
    static _parseXYZFloat(name, value, defaultValue, allowUniform) {
      if (!value && defaultValue) {
        value = defaultValue;
      }
      if (!value) {
        return null;
      }
      let xyz = value.split(/[\s/]+/);
      if (xyz.length === 1 && allowUniform) {
        xyz.push(xyz[0]);
        xyz.push(xyz[0]);
      }
      if (xyz.length !== 3) {
        throw new Error(`SyntaxError: '${name}' must have three values.`);
      }
      xyz = {
        x: parseFloat(xyz[0]),
        y: parseFloat(xyz[1]),
        z: parseFloat(xyz[2])
      };
      if (Number.isNaN(xyz.x) || Number.isNaN(xyz.y) || Number.isNaN(xyz.z)) {
        throw new Error(`SyntaxError: Invalid value '${value}' for ${name}'.`);
      }
      return xyz;
    }
    static _unpackRle(chunks) {
      const result = [];
      let count = 1;
      let chunk = chunks.next();
      while (!chunk.done) {
        const value = chunk.value[0];
        if (value[0] >= "0" && value[0] <= "9") {
          count = parseInt(value, 10);
        } else if (value === "(") {
          const sub = this._unpackRle(chunks);
          for (let c = 0; c < count; c++) {
            Array.prototype.push.apply(result, sub);
          }
          count = 1;
        } else if (value === ")") {
          return result;
        } else if (value.length > 1 && value[0] >= "A" && value[0] <= "Z" && value[1] === value[0]) {
          if (count > 1) {
            result.push([value[0], count]);
            result.push([value[0], value.length - 1]);
          } else {
            result.push([value[0], value.length]);
          }
          count = 1;
        } else if (value.length > 1 && value[0] === "-" && value[1] === "-") {
          if (count > 1) {
            result.push(["-", count]);
            result.push(["-", value.length - 1]);
          } else {
            result.push(["-", value.length]);
          }
          count = 1;
        } else {
          result.push([value, count]);
          count = 1;
        }
        chunk = chunks.next();
      }
      return result;
    }
    static _setVoxels(model, color, count, context, voxChunk, materialIndex) {
      const material = model.materials.materials[materialIndex];
      while (count-- > 0) {
        if (color) {
          const r = Math.floor(color.r * 255);
          const g = Math.floor(color.g * 255);
          const b = Math.floor(color.b * 255);
          const t = materialIndex;
          const rgbt = voxColorForRGBT(r, g, b, t);
          const vx = context.x - shiftForSize(model.size.x);
          const vy = context.y - shiftForSize(model.size.y);
          const vz = context.z - shiftForSize(model.size.z);
          model.bounds.set(vx, vy, vz);
          material.bounds.set(vx, vy, vz);
          voxChunk.setColorAt(vx, vy, vz, rgbt);
        }
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
    static _validateModel(modelData) {
      const mandatory = ["size", "materials", "textures", "lights", "voxels"];
      const optional = [
        "name",
        "shape",
        "scale",
        "rotation",
        "position",
        "simplify",
        "origin",
        "autoresize",
        "resize",
        "flatten",
        "clamp",
        "skip",
        "tile",
        "ao",
        "aosides",
        "aosamples",
        "shell",
        "wireframe",
        "data"
      ];
      this._validateProperties(modelData, mandatory, optional, "model");
      modelData.lights.forEach(function(lightData) {
        this._validateLight(lightData);
      }, this);
      modelData.textures.forEach(function(textureData) {
        this._validateTexture(textureData);
      }, this);
      modelData.materials.forEach(function(materialData) {
        this._validateMaterial(materialData);
      }, this);
    }
    static _validateLight(lightData) {
      const mandatory = ["color"];
      const optional = ["direction", "position", "distance", "size", "detail"];
      this._validateProperties(lightData, mandatory, optional, "light");
      if (lightData.direction && lightData.position) {
        throw new Error("SyntaxError: Light cannot have both a direction and a position.");
      }
      if (lightData.direction && lightData.distance) {
        throw new Error("SyntaxError: Light cannot have both a direction and a distance.");
      }
      if (!lightData.position && (lightData.size || lightData.detail)) {
        throw new Error("SyntaxError: Light with no position cannot have size or detail.");
      }
    }
    static _validateTexture(textureData) {
      const mandatory = ["id", "image"];
      const optional = ["cube"];
      this._validateProperties(textureData, mandatory, optional, "texture");
    }
    static _validateMaterial(materialData) {
      const mandatory = ["colors"];
      const optional = [
        "type",
        "lighting",
        "fade",
        "simplify",
        "roughness",
        "metalness",
        "emissive",
        "fog",
        "opacity",
        "alphatest",
        "transparent",
        "refractionratio",
        "deform",
        "warp",
        "scatter",
        "flatten",
        "clamp",
        "skip",
        "ao",
        "lights",
        "wireframe",
        "side",
        "shell",
        "map",
        "normalmap",
        "roughnessmap",
        "metalnessmap",
        "emissivemap",
        "matcap",
        "reflectionmap",
        "refractionmap",
        "maptransform",
        "data"
      ];
      this._validateProperties(materialData, mandatory, optional, "material");
    }
    static _validateProperties(data, mandatory, optional, objectName) {
      for (const propertyName of mandatory) {
        if (!data[propertyName]) {
          throw new Error("SyntaxError: " + objectName + ' is missing mandatory property "' + propertyName + '".');
        }
      }
      for (const propertyName in data) {
        if (!mandatory.includes(propertyName) && !optional.includes(propertyName)) {
          throw new Error("SyntaxError: " + objectName + ' has unrecognized property "' + propertyName + '".');
        }
      }
    }
  };

  // src/svox/modelwriter.js
  var ModelWriter = class {
    static writeToString(model, compressed, repeat) {
      repeat = Math.round(repeat || 1);
      model.prepareForWrite();
      const colors = [];
      const colorIds = {};
      model.materials.forEach(function(material) {
        material.colors.forEach(function(color) {
          colors.push(color);
          colorIds[color.id] = color.id;
        });
      });
      colors.sort(function(a, b) {
        return b.count - a.count;
      });
      let maxIdLength = 0;
      let index = 0;
      for (let c = 0; c < colors.length; c++) {
        if (!colors[c].id) {
          let colorId;
          do {
            colorId = this._colorIdForIndex(index++);
          } while (colorIds[colorId]);
          colorIds[colorId] = colorId;
          colors[c].id = colorId;
        }
        maxIdLength = Math.max(colors[c].id.length, maxIdLength);
      }
      const voxelWidth = compressed || maxIdLength === 1 || maxIdLength > 3 ? 1 : maxIdLength;
      let result = this._serializeTextures(model);
      result += this._serializeLights(model);
      result += "model\r\n";
      const size = model.voxels.bounds.size;
      if (size.y === size.x && size.z === size.x) {
        result += `size = ${size.x * repeat}\r
`;
      } else {
        result += `size = ${size.x * repeat} ${size.y * repeat} ${size.z * repeat}\r
`;
      }
      if (model.shape !== "box") {
        result += `shape = ${model.shape}\r
`;
      }
      if (model.scale.x !== 1 || model.scale.y !== 1 || model.scale.z !== 1 || repeat !== 1) {
        if (model.scale.y === model.scale.x && model.scale.z === model.scale.x) {
          result += `scale = ${model.scale.x / repeat}\r
`;
        } else {
          result += `scale = ${model.scale.x / repeat} ${model.scale.y / repeat} ${model.scale.z / repeat}\r
`;
        }
      }
      if (model.resize) {
        result += `resize = ${model.resize}\r
`;
      }
      if (model.rotation.x !== 0 || model.rotation.y !== 0 || model.rotation.z !== 0) {
        result += `rotation = ${model.rotation.x} ${model.rotation.y} ${model.rotation.z}\r
`;
      }
      if (model.position.x !== 0 || model.position.y !== 0 || model.position.z !== 0) {
        result += `position = ${model.position.x} ${model.position.y} ${model.position.z}\r
`;
      }
      if (model.origin)
        result += `origin = ${model.origin}\r
`;
      if (model.flatten)
        result += `flatten = ${model.flatten}\r
`;
      if (model.clamp)
        result += `clamp = ${model.clamp}\r
`;
      if (model.skip)
        result += `skip = ${model.skip}\r
`;
      if (model.tile)
        result += `tile = ${model.tile}\r
`;
      if (model.ao)
        result += `ao =${model.ao.color.toString() !== "#000" ? " " + model.ao.color : ""} ${model.ao.maxDistance} ${model.ao.strength}${model.ao.angle !== 70 ? " " + model.ao.angle : ""}\r
`;
      if (model.asSides)
        result += `aosides = ${model.aoSides}\r
`;
      if (model.asSamples)
        result += `aosamples = ${model.aoSamples}\r
`;
      if (model.wireframe)
        result += "wireframe = true\r\n";
      if (!model.simplify)
        result += "simplify = false\r\n";
      if (model.data)
        result += `data = ${this._serializeVertexData(model.data)}\r
`;
      if (model.shell)
        result += `shell = ${this._getShell(model.shell)}\r
`;
      result += this._serializeMaterials(model);
      if (!compressed || repeat !== 1) {
        result += this._serializeVoxels(model, repeat, voxelWidth);
      } else {
        result += this._serializeVoxelsRLE(model, 100);
      }
      return result;
    }
    static _serializeVertexData(data) {
      let result = null;
      if (data && data.length > 0) {
        result = "";
        for (let d = 0; d < data.length; d++) {
          result += data[d].name + " ";
          for (let v = 0; v < data[d].values.length; v++) {
            result += data[d].values[v] + " ";
          }
        }
      }
      return result;
    }
    static _serializeTextures(model) {
      let result = "";
      let newLine = "";
      Object.getOwnPropertyNames(model.textures).forEach(function(textureName) {
        const texture = model.textures[textureName];
        const settings = [];
        settings.push(`id = ${texture.id}`);
        if (texture.cube) {
          settings.push("cube = true");
        }
        settings.push(`image = ${texture.image}`);
        result += `texture ${settings.join(", ")}\r
`;
        newLine = "\r\n";
      });
      result += newLine;
      return result;
    }
    static _serializeLights(model) {
      let result = "";
      let newLine = "";
      model.lights.forEach(function(light) {
        const settings = [];
        let colorAndStrength = `${light.color}`;
        if (light.strength !== 1) {
          colorAndStrength += ` ${light.strength}`;
        }
        settings.push(`color = ${colorAndStrength}`);
        if (light.direction)
          settings.push(`direction = ${light.direction.x} ${light.direction.y} ${light.direction.z}`);
        if (light.position)
          settings.push(`position = ${light.position.x} ${light.position.y} ${light.position.z}`);
        if (light.distance)
          settings.push(`distance = ${light.distance}`);
        if (light.size) {
          settings.push(`size = ${light.size}`);
          if (light.detail !== 1)
            settings.push(`detail = ${light.detail}`);
        }
        result += `light ${settings.join(", ")}\r
`;
        newLine = "\r\n";
      });
      result += newLine;
      return result;
    }
    static _serializeMaterials(model) {
      let result = "";
      model.materials.forEach(function(material) {
        if (material.colors.length === 0) {
          return;
        }
        const settings = [];
        if (material.type !== MATSTANDARD)
          settings.push(`type = ${material.type}`);
        if (material.lighting !== FLAT)
          settings.push(`lighting = ${material.lighting}`);
        if (material.wireframe)
          settings.push("wireframe = true");
        if (material.roughness !== 1)
          settings.push(`roughness = ${material.roughness}`);
        if (material.metalness !== 0)
          settings.push(`metalness = ${material.metalness}`);
        if (material.fade)
          settings.push("fade = true");
        if (material.simplify !== null && material.simplify !== model.simplify)
          settings.push(`simplify = ${material.simplify}`);
        if (material.opacity !== 1)
          settings.push(`opacity = ${material.opacity}`);
        if (material.transparent)
          settings.push("transparent = true");
        if (material.refractionRatio !== 0.9)
          settings.push(`refractionRatio = ${material.refractionRatio}`);
        if (material.emissive)
          settings.push(`emissive = ${material.emissive.color} ${material.emissive.intensity}`);
        if (!material.fog)
          settings.push("fog = false");
        if (material.side !== FRONT)
          settings.push(`side = ${material.side}`);
        if (material.deform)
          settings.push(`deform = ${material.deform.count} ${material.deform.strength}${material.deform.damping !== 1 ? " " + material.deform.damping : ""}`);
        if (material.warp)
          settings.push(`warp = ${material.warp.amplitude} ${material.warp.frequency}`);
        if (material.scatter)
          settings.push(`scatter = ${material.scatter}`);
        if (material.ao)
          settings.push(`ao =${material.ao.color !== "#000" ? " " + material.ao.color : ""} ${material.ao.maxDistance} ${material.ao.strength}${material.ao.angle !== 70 ? " " + material.ao.angle : ""}`);
        if (model.lights.length > 0 && !material.lights)
          settings.push("lights = false");
        if (material.flatten)
          settings.push(`flatten = ${material.flatten}`);
        if (material.clamp)
          settings.push(`clamp = ${material.clamp}`);
        if (material.skip)
          settings.push(`skip = ${material.skip}`);
        if (material.map)
          settings.push(`map = ${material.map.id}`);
        if (material.normalMap)
          settings.push(`normalmap = ${material.normalMap.id}`);
        if (material.roughnessMap)
          settings.push(`roughnessmap = ${material.roughnessMap.id}`);
        if (material.metalnessMap)
          settings.push(`metalnessmap = ${material.metalnessMap.id}`);
        if (material.emissiveMap)
          settings.push(`emissivemap = ${material.emissiveMap.id}`);
        if (material.matcap)
          settings.push(`matcap = ${material.matcap.id}`);
        if (material.reflectionMap)
          settings.push(`reflectionmap = ${material.reflectionMap.id}`);
        if (material.refractionMap)
          settings.push(`refractionmap = ${material.refractionMap.id}`);
        if (material.mapTransform.uscale !== -1 || material.mapTransform.vscale !== -1) {
          let transform = "maptransform =";
          transform += ` ${material.mapTransform.uscale} ${material.mapTransform.vscale}`;
          if (material.mapTransform.uoffset !== 0 || material.mapTransform.voffset !== 0 || material.mapTransform.rotation !== 0) {
            transform += ` ${material.mapTransform.uoffset} ${material.mapTransform.voffset}`;
            if (material.mapTransform.rotation !== 0) {
              transform += ` ${material.mapTransform.rotation}`;
            }
          }
          settings.push(transform);
        }
        if (material.data)
          settings.push(`data = ${this._serializeVertexData(material.data)}`);
        if (material.shell)
          settings.push(`shell = ${this._getShell(material.shell)}`);
        result += "material " + settings.join(", ") + "\r\n";
        result += "  colors =";
        material.colors.forEach(function(color) {
          result += ` ${color.id}${color.exId == null ? "" : "(" + color.exId + ")"}:${color}`;
        });
        result += "\r\n";
      }, this);
      return result;
    }
    static _colorIdForIndex(index) {
      let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let id = "";
      do {
        const mod = index % 26;
        id = chars[mod] + id.toLowerCase();
        index = (index - mod) / 26;
        if (index < 26) {
          chars = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        }
      } while (index > 0);
      return id;
    }
    static _getShell(shell) {
      if (shell.length === 0) {
        return "none";
      }
      let result = "";
      for (let sh = 0; sh < shell.length; sh++) {
        result += `${shell[sh].colorId} ${shell[sh].distance} `;
      }
      return result.trim();
    }
    static _serializeVoxels(model, repeat, voxelWidth) {
      const emptyVoxel = "-" + " ".repeat(Math.max(voxelWidth - 1));
      const gutter = " ".repeat(voxelWidth);
      let result = "voxels\r\n";
      const voxels = model.voxels;
      for (let z = voxels.minZ; z <= voxels.maxZ; z++) {
        for (let zr = 0; zr < repeat; zr++) {
          for (let y = voxels.minY; y <= voxels.maxY; y++) {
            for (let yr = 0; yr < repeat; yr++) {
              for (let x = voxels.minX; x <= voxels.maxX; x++) {
                const voxel = voxels.getVoxel(x, y, z);
                for (let xr = 0; xr < repeat; xr++) {
                  if (voxel) {
                    result += voxel.color.id;
                    let l = voxel.color.id.length;
                    while (l++ < voxelWidth) {
                      result += " ";
                    }
                  } else {
                    result += emptyVoxel;
                  }
                }
              }
              result += gutter;
            }
          }
          result += "\r\n";
        }
      }
      return result;
    }
    static _serializeVoxelsRLE(model, compressionWindow) {
      const queue = [];
      let count = 0;
      let lastColor;
      model.voxels.forEachInBoundary(function(voxel) {
        const color = voxel ? voxel.color : null;
        if (color === lastColor) {
          count++;
        } else {
          this._addRleChunk(queue, lastColor, count, compressionWindow);
          lastColor = color;
          count = 1;
        }
      }, this);
      this._addRleChunk(queue, lastColor, count, compressionWindow);
      let result = "";
      for (const item of queue) {
        result += this._rleToString(item);
      }
      return "voxels\r\n" + result + "\r\n";
    }
    static _addRleChunk(queue, color, count, compressionWindow) {
      if (count === 0) {
        return;
      }
      let chunk = count > 1 ? count.toString() : "";
      chunk += color ? color.id : "-";
      queue.push([chunk, 1, chunk]);
      for (let k = Math.max(0, queue.length - compressionWindow * 2); k <= queue.length - 2; k++) {
        const item = queue[k][0];
        for (let j = 1; j < compressionWindow; j++) {
          if (k + 2 * j > queue.length) {
            break;
          }
          let repeating = true;
          for (let i = 0; i <= j - 1; i++) {
            repeating = queue[k + i][2] === queue[k + i + j][2];
            if (!repeating)
              break;
          }
          if (repeating) {
            const arr = queue.splice(k, j);
            queue.splice(k, j - 1);
            queue[k] = [arr, 2, null];
            queue[k][2] = JSON.stringify(queue[k]);
            k = queue.length;
            break;
          }
        }
        if (Array.isArray(item) && queue.length > k + item.length) {
          const array = item;
          let repeating = true;
          for (let i = 0; i < array.length; i++) {
            repeating = array[i][2] === queue[k + 1 + i][2];
            if (!repeating)
              break;
          }
          if (repeating) {
            queue.splice(k + 1, array.length);
            queue[k][1]++;
            queue[k][2] = null;
            queue[k][2] = JSON.stringify(queue[k]);
            k = queue.length;
          }
        }
      }
    }
    static _rleToString(chunk) {
      let result = chunk[1] === 1 ? "" : chunk[1].toString();
      const value = chunk[0];
      if (Array.isArray(value)) {
        result += "(";
        for (const sub of value) {
          result += this._rleToString(sub);
        }
        result += ")";
      } else {
        result += value;
      }
      return result;
    }
  };

  // src/svox/buffers.js
  var Buffers = class {
    constructor(maxVerts) {
      const maxVertBits = Math.floor(maxVerts / 8);
      const maxFaces = maxVerts / 4;
      const maxFaceBits = Math.floor(maxFaces / 8);
      const maxFaceVerts = maxFaces * 4;
      this.tmpVertIndexLookup = /* @__PURE__ */ new Map();
      this.vertX = new Float32Array(maxVerts);
      this.vertY = new Float32Array(maxVerts);
      this.vertZ = new Float32Array(maxVerts);
      this.vertTmpX = new Float32Array(maxVerts);
      this.vertTmpY = new Float32Array(maxVerts);
      this.vertTmpZ = new Float32Array(maxVerts);
      this.vertHasTmp = Bits.create(new Uint8Array(maxVertBits).buffer, 1, 0);
      this.vertColorR = new Float32Array(maxVerts * 6);
      this.vertColorG = new Float32Array(maxVerts * 6);
      this.vertColorB = new Float32Array(maxVerts * 6);
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
      this.vertLinkCounts = new Uint8Array(maxVerts);
      this.vertLinkIndices = new Uint32Array(maxVerts * 6);
      this.faceFlattened = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
      this.faceClamped = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
      this.faceSmooth = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
      this.faceEquidistant = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
      this.faceCulled = Bits.create(new Uint8Array(maxFaceBits).buffer, 1, 0);
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
      this.faceVertLightR = new Float32Array(maxFaceVerts);
      this.faceVertLightG = new Float32Array(maxFaceVerts);
      this.faceVertLightB = new Float32Array(maxFaceVerts);
      this.faceVertAO = new Float32Array(maxFaceVerts);
      this.faceVertUs = new Float32Array(maxFaceVerts);
      this.faceVertVs = new Float32Array(maxFaceVerts);
      this.tmpVoxelXZYFaceIndices = Array(maxFaces).fill(0);
      this.tmpVoxelXYZFaceIndices = Array(maxFaces).fill(0);
      this.tmpVoxelYZXFaceIndices = Array(maxFaces).fill(0);
      this.voxelXZYFaceIndices = null;
      this.voxelXYZFaceIndices = null;
      this.voxelYZXFaceIndices = null;
    }
    clear() {
      this.tmpVertIndexLookup.clear();
      this.vertX.fill(0);
      this.vertY.fill(0);
      this.vertZ.fill(0);
      this.vertTmpX.fill(0);
      this.vertTmpY.fill(0);
      this.vertTmpZ.fill(0);
      this.vertHasTmp.clear();
      this.vertColorR.fill(0);
      this.vertColorG.fill(0);
      this.vertColorB.fill(0);
      this.vertColorCount.fill(0);
      this.vertSmoothNormalX.fill(0);
      this.vertSmoothNormalY.fill(0);
      this.vertSmoothNormalZ.fill(0);
      this.vertBothNormalX.fill(0);
      this.vertBothNormalY.fill(0);
      this.vertBothNormalZ.fill(0);
      this.vertFlattenedX.clear();
      this.vertFlattenedY.clear();
      this.vertFlattenedZ.clear();
      this.vertClampedX.clear();
      this.vertClampedY.clear();
      this.vertClampedZ.clear();
      this.vertFullyClamped.clear();
      this.vertDeformCount.fill(0);
      this.vertDeformDamping.fill(0);
      this.vertDeformStrength.fill(0);
      this.vertWarpAmplitude.fill(0);
      this.vertWarpFrequency.fill(0);
      this.vertScatter.fill(0);
      this.vertRing.fill(0);
      this.vertNrOfClampedLinks.fill(0);
      this.vertLinkCounts.fill(0);
      this.vertLinkIndices.fill(0);
      this.faceFlattened.clear();
      this.faceClamped.clear();
      this.faceSmooth.clear();
      this.faceEquidistant.clear();
      this.faceCulled.clear();
      this.faceNameIndices.fill(0);
      this.faceMaterials.fill(0);
      this.faceVertIndices.fill(0);
      this.faceVertNormalX.fill(0);
      this.faceVertNormalY.fill(0);
      this.faceVertNormalZ.fill(0);
      this.faceVertFlatNormalX.fill(0);
      this.faceVertFlatNormalY.fill(0);
      this.faceVertFlatNormalZ.fill(0);
      this.faceVertSmoothNormalX.fill(0);
      this.faceVertSmoothNormalY.fill(0);
      this.faceVertSmoothNormalZ.fill(0);
      this.faceVertBothNormalX.fill(0);
      this.faceVertBothNormalY.fill(0);
      this.faceVertBothNormalZ.fill(0);
      this.faceVertColorR.fill(0);
      this.faceVertColorG.fill(0);
      this.faceVertColorB.fill(0);
      this.faceVertLightR.fill(0);
      this.faceVertLightG.fill(0);
      this.faceVertLightB.fill(0);
      this.faceVertAO.fill(0);
      this.faceVertUs.fill(0);
      this.faceVertVs.fill(0);
      this.tmpVoxelXZYFaceIndices.length = 0;
      this.tmpVoxelXYZFaceIndices.length = 0;
      this.tmpVoxelYZXFaceIndices.length = 0;
      this.voxelXZYFaceIndices = null;
      this.voxelXYZFaceIndices = null;
      this.voxelYZXFaceIndices = null;
    }
  };

  // inline-worker:__inline-worker
  function inlineWorker(scriptText) {
    let blob = new Blob([scriptText], { type: "text/javascript" });
    let url = URL.createObjectURL(blob);
    let worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  }

  // src/svox/svox.worker.js
  function Worker2() {
    return inlineWorker('var Ss=Object.defineProperty;var Os=(S,t,s)=>t in S?Ss(S,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):S[t]=s;var us=(S,t,s)=>(Os(S,typeof t!="symbol"?t+"":t,s),s);var J=class{static parse(t){if(!t)return;if(t=" "+(t||"").toLowerCase(),t!==" "&&!/^(?!$)(\\s+(?:none|-x|x|\\+x|-y|y|\\+y|-z|z|\\+z|\\s))+\\s*$/.test(t))throw new Error(`SyntaxError: Planar expression \'${t}\' is only allowed to be \'none\' or contain -x x +x -y y +y -z z +z.`);let s=t.includes("none");return{nx:!s&&t.includes("-x"),x:!s&&t.includes(" x"),px:!s&&t.includes("+x"),ny:!s&&t.includes("-y"),y:!s&&t.includes(" y"),py:!s&&t.includes("+y"),nz:!s&&t.includes("-z"),z:!s&&t.includes(" z"),pz:!s&&t.includes("+z")}}static toString(t){return t?((t.nx?" -x":"")+(t.x?" x":"")+(t.px?" +x":"")+(t.ny?" -y":"")+(t.y?" y":"")+(t.py?" +y":"")+(t.nz?" -z":"")+(t.z?" z":"")+(t.pz?" +z":"")).trim():void 0}static combine(t,s,e){return!t&&!s?e:t?!s||t===s?t:{nx:t.nx||s.nx,x:t.x||s.x,px:t.px||s.px,ny:t.ny||s.ny,y:t.y||s.y,py:t.py||s.py,nz:t.nz||s.nz,z:t.z||s.z,pz:t.pz||s.pz}:s}};var le="standard",Le="basic",ps="lambert",xs="phong",ds="matcap",gs="toon",ke="normal",xe="bounds",Gt="model",Ue="flat",de="quad",ee="smooth",se="both",Nt="front",fe="back",Ht="double",vs=["nx","px","ny","py","nz","pz"],Fs=[[[0,0,0],[0,1,0],[0,1,1],[0,0,1]],[[1,0,1],[1,1,1],[1,1,0],[1,0,0]],[[0,0,0],[0,0,1],[1,0,1],[1,0,0]],[[0,1,1],[0,1,0],[1,1,0],[1,1,1]],[[1,0,0],[1,1,0],[0,1,0],[0,0,0]],[[0,0,1],[0,1,1],[1,1,1],[1,0,1]]],Vs=[[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]],As=[{u:"z",v:"y",order:[0,1,2,3],ud:1,vd:1,uo:0,vo:0},{u:"z",v:"y",order:[3,2,1,0],ud:-1,vd:1,uo:.75,vo:0},{u:"x",v:"z",order:[0,1,2,3],ud:1,vd:1,uo:.75,vo:.5},{u:"x",v:"z",order:[1,0,3,2],ud:1,vd:-1,uo:.25,vo:1},{u:"x",v:"y",order:[3,2,1,0],ud:-1,vd:1,uo:1,vo:0},{u:"x",v:"y",order:[0,1,2,3],ud:1,vd:1,uo:.25,vo:0}],ys=[[[0,0,1],[0,1,0]],[[0,0,1],[0,1,0]],[[1,0,0],[0,0,1]],[[1,0,0],[0,0,1]],[[1,0,0],[0,1,0]],[[1,0,0],[0,1,0]]];var Je=(S,t,s)=>Math.min(Math.max(S,t),s),rt=class{static fromHex(t){let s=new rt;return s._set(t),s.id="",s.exId=null,s.count=0,s}static fromRgb(t,s,e){t=Math.round(Je(t,0,1)*255),s=Math.round(Je(s,0,1)*255),e=Math.round(Je(e,0,1)*255);let r="#"+(t<16?"0":"")+t.toString(16)+(s<16?"0":"")+s.toString(16)+(e<16?"0":"")+e.toString(16);return rt.fromHex(r)}clone(){let t=new rt;return t._color=this._color,t.r=this.r,t.g=this.g,t.b=this.b,t._material=this._material,t}multiply(t){return t instanceof rt?rt.fromRgb(this.r*t.r,this.g*t.g,this.b*t.b):rt.fromRgb(this.r*t,this.g*t,this.b*t)}normalize(){let t=Math.sqrt(this.r*this.r+this.g*this.g+this.b*this.b);return this.multiply(1/t)}add(...t){let s=this.r+t.reduce((o,n)=>o+n.r,0),e=this.g+t.reduce((o,n)=>o+n.g,0),r=this.b+t.reduce((o,n)=>o+n.b,0);return rt.fromRgb(s,e,r)}_setMaterial(t){if(this._material!==void 0)throw new Error("A Color can only be added once.");this._material=t,this.count=0}get material(){return this._material}_set(t){let s=t;if((typeof s=="string"||s instanceof String)&&(s=s.trim().toUpperCase(),s.match(/^#([0-9a-fA-F]{3}|#?[0-9a-fA-F]{6})$/))){s=s.replace("#",""),this._color="#"+s,s.length===3&&(s=s[0]+s[0]+s[1]+s[1]+s[2]+s[2]);let e=parseInt(s,16);this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255;return}throw new Error(`SyntaxError: Color ${t} is not a hexadecimal color of the form #000 or #000000.`)}toString(){return this._color}};var ge=class{constructor(t,s,e,r,o,n,i,a,c,f,l,h,m,u,v,p,A,F,g,V,x,_,N,d,M){switch(t=t||le,t){case le:case Le:case ps:case xs:case gs:case ds:case ke:break;default:throw new Error("SyntaxError: Unknown material type: "+t)}if(this.type=t,(m&&m.cube||u&&u.cube||v&&v.cube||p&&p.cube||A&&A.cube)&&!(x===-1&&_===-1))throw new Error("SyntaxError: Cube textures can not be combined with maptransform");if(g&&V)throw new Error("SyntaxError: One material can have a reflectionmap or a refractionmap, but not both");this.index=0,this.roughness=typeof s=="number"?s:1,this.metalness=typeof e=="number"?e:0,this.opacity=typeof r=="number"?r:1,this.alphaTest=typeof o=="number"?o:0,this.transparent=!!n,this.refractionRatio=typeof i=="number"?i:.9,this.wireframe=!!a,this.side=c||Nt,[Nt,fe,Ht].includes(this.side)||(this.side=Nt),this.setEmissive(f,l),this.fog=typeof h=="boolean"?h:!0,this.map=m,this.normalMap=u,this.roughnessMap=v,this.metalnessMap=p,this.emissiveMap=A,this.matcap=F,this.reflectionMap=g,this.refractionMap=V,this.mapTransform={uscale:x||-1,vscale:_||-1,uoffset:N||0,voffset:d||0,rotation:M||0},this.aoActive=!1,this._colors=[]}get baseId(){return this._baseId===void 0&&(this._baseId=`${this.type}|${this.roughness}|${this.metalness}|${this.opacity}|${this.alphaTest}|${this.transparent?1:0}|${this.refractionRatio}|${this.wireframe?1:0}|${this.side}|`+(this.emissive?`${this.emissive.color}|${this.emissive.intensity}|`:"||")+`${this.fog?1:0}|`+(this.map?`${this.map.id}|`:"|")+(this.normalMap?`${this.normalMap.id}|`:"|")+(this.roughnessMap?`${this.roughnessMap.id}|`:"|")+(this.metalnessMap?`${this.metalnessMap.id}|`:"|")+(this.emissiveMap?`${this.emissiveMap.id}|`:"|")+(this.matcap?`${this.matcap.id}|`:"|")+(this.reflectionMap?`${this.reflectionMap.id}|`:"|")+(this.refractionMap?`${this.refractionMap.id}|`:"|")+`${this.mapTransform.uscale}|${this.mapTransform.vscale}|${this.mapTransform.uoffset}|${this.mapTransform.voffset}|${this.mapTransform.rotation}`),this._baseId}get isTransparent(){return this.transparent||this.opacity<1}setEmissive(t,s){t===void 0||t==="#000"||t==="#000000"||!s?this._emissive=void 0:this._emissive={color:rt.fromHex(t),intensity:s}}get emissive(){return this._emissive}get colors(){return this._colors}get colorCount(){return this._colors.length}get colorUsageCount(){return this._colors.reduce((t,s)=>t+s.count,0)}};var re=class{get size(){return this.minX>this.maxX?{x:0,y:0,z:0}:{x:this.maxX-this.minX+1,y:this.maxY-this.minY+1,z:this.maxZ-this.minZ+1}}constructor(){this.reset()}reset(){this.minX=Number.POSITIVE_INFINITY,this.minY=Number.POSITIVE_INFINITY,this.minZ=Number.POSITIVE_INFINITY,this.maxX=Number.NEGATIVE_INFINITY,this.maxY=Number.NEGATIVE_INFINITY,this.maxZ=Number.NEGATIVE_INFINITY}set(t,s,e){this.minX=Math.min(this.minX,t),this.minY=Math.min(this.minY,s),this.minZ=Math.min(this.minZ,e),this.maxX=Math.max(this.maxX,t),this.maxY=Math.max(this.maxY,s),this.maxZ=Math.max(this.maxZ,e)}};var ve=class{constructor(t,s,e,r,o){this._baseMaterial=t,this.lighting=s,this.fade=!!e,this.simplify=r!==!1,this._deform=void 0,this._warp=void 0,this._scatter=void 0,this._flatten=J.parse(""),this._clamp=J.parse(""),this._skip=J.parse(""),this._ao=void 0,this.lights=!0,this._side=o,this._colors=[],this.bounds=new re}get baseId(){return this._baseMaterial.baseId}get index(){return this._baseMaterial.index}get colors(){return this._colors}get colorCount(){return this._baseMaterial.colorCount}get type(){return this._baseMaterial.type}get roughness(){return this._baseMaterial.roughness}get metalness(){return this._baseMaterial.metalness}get opacity(){return this._baseMaterial.opacity}get alphaTest(){return this._baseMaterial.alphaTest}get transparent(){return this._baseMaterial.transparent}get isTransparent(){return this._baseMaterial.isTransparent}get refractionRatio(){return this._baseMaterial.refractionRatio}get emissive(){return this._baseMaterial.emissive}get side(){return this._side}get fog(){return this._baseMaterial.fog}get map(){return this._baseMaterial.map}get normalMap(){return this._baseMaterial.normalMap}get roughnessMap(){return this._baseMaterial.roughnessMap}get metalnessMap(){return this._baseMaterial.metalnessMap}get emissiveMap(){return this._baseMaterial.emissiveMap}get matcap(){return this._baseMaterial.matcap}get reflectionMap(){return this._baseMaterial.reflectionMap}get refractionMap(){return this._baseMaterial.refractionMap}get mapTransform(){return this._baseMaterial.mapTransform}setDeform(t,s,e){t=Math.max(t==null?1:t,0),s=s==null?1:s,e=e==null?1:e,t>0&&s!==0?this._deform={count:t,strength:s,damping:e}:this._deform={count:0,strength:0,damping:0}}get deform(){return this._deform}setWarp(t,s){t=t===void 0?1:Math.abs(t),s=s===void 0?1:Math.abs(s),t>.001&&s>.001?this._warp={amplitude:t,frequency:s}:this._warp=void 0}get warp(){return this._warp}set scatter(t){t===0&&(t=void 0),this._scatter=Math.abs(t)}get scatter(){return this._scatter}set flatten(t){this._flatten=J.parse(t)}get flatten(){return J.toString(this._flatten)}set clamp(t){this._clamp=J.parse(t)}get clamp(){return J.toString(this._clamp)}set skip(t){this._skip=J.parse(t)}get skip(){return J.toString(this._skip)}setAo(t){this._ao=t}get ao(){return this._ao}set aoSides(t){this._aoSides=J.parse(t)}get aoSides(){return J.toString(this._aoSides)}addColorHEX(t){return this.addColor(rt.fromHex(t))}addColorRGB(t,s,e){return this.addColor(rt.fromRgb(t,s,e))}addColor(t){if(!(t instanceof rt))throw new Error("addColor requires a Color object, e.g. material.addColor(Color.fromHex(\'#FFFFFF\'))");return t._setMaterial(this),this._colors.push(t),this._baseMaterial._colors.push(t),t}};var Fe=class{constructor(){this.baseMaterials=[],this.materials=[]}createMaterial(t,s,e,r,o,n,i,a,c,f,l,h,m,u,v,p,A,F,g,V,x,_,N,d,M,z,C,y){h=h||Nt,[Nt,fe,Ht].includes(h)||(h=Nt);let O=h===Ht?Ht:Nt,E=new ge(t,e,r,i,a,c,f,l,O,m,u,v,p,A,F,g,V,x,_,N,d,M,z,C,y),Z=E.baseId,B=this.baseMaterials.find(X=>X.baseId===Z);B?E=B:this.baseMaterials.push(E);let Y=new ve(E,s,o,n,h);return this.materials.push(Y),Y}clearMaterials(){this.materials.length=0}forEach(t,s,e){e?this.baseMaterials.foreach(t,s):this.materials.forEach(t,s)}find(t){return this.materials.find(t)}findColorByExId(t){let s=null;return this.forEach(function(e){s||(s=e.colors.find(r=>r.exId===t))},this),s}getMaterialListIndex(t){return this.materials.indexOf(t)}};function Ve(S,t,s,e){let r=s*S;for(let o=0;o<s;){let n=r&7,i=r>>3,a=s-o,c=8-n,f=a<c?a:c,l=~(255<<f),h=t&l;t>>=f;let m=~(l<<n);e[i]=e[i]&m|h<<n,r+=f,o+=f}}var je=class{constructor(t){this.view=t}get(t){return this.view[t>>3]>>(t&7)&1}set(t,s){return Ve(t,s,1,this.view)}clear(){this.view.fill(0)}},De=class{constructor(t){this.view=t}get(t){return this.view[t>>2]>>((t&3)<<1)&3}set(t,s){return Ve(t,s,2,this.view)}clear(){this.view.fill(0)}},ts=class{constructor(t){this.view=t}get(t){return this.view[t>>1]>>((t&1)<<2)&15}set(t,s){return Ve(t,s,4,this.view)}clear(){this.view.fill(0)}},es=class{constructor(t){this.view=t}get(t){return this.view[t]>>>0}set(t,s){return Ve(t,s,8,this.view)}clear(){this.view.fill(0)}},ss=class{constructor(t,s){this.view=t,this.bits=s}get(t){let{view:s,bits:e}=this,r=t*e,o=0;for(let n=0;n<e;){let i=r&7,a=r>>3,c=e-n,f=8-i,l=c<f?c:f,h=s[a],m=~(255<<l);o|=(h>>i&m)<<n,r+=l,n+=l}return o>>>0}set(t,s){Ve(t,s,this.bits,this.view)}clear(){this.view.fill(0)}},lt=class{static create(t,s,e,r=null){let o=r?new Uint8Array(t,e,r):new Uint8Array(t,e);switch(s){case 1:return new je(o);case 2:return new De(o);case 4:return new ts(o);case 8:return new es(o);default:return new ss(o)}}};var Es=0,Ms=0,rs=128,Ae=8,Ys=0,Zs=255,_s=Zs<<24>>>0,os={NONE:0,PAINT:1,KEEP:2},yt=1,oe=new Map,pt=S=>Math.floor(S%2===0?S/2-1:S/2),mt=S=>{let[t,s,e]=S,r=pt(t),o=pt(s),n=pt(e),i=t-r-1,a=s-o-1,c=e-n-1,f=-r,l=-o,h=-n;return[f,i,l,a,h,c]},ye=1,Cs=ye*4;function ns(S,t,s=null){let e=2**t-yt,r=Cs*e,o=S[0]*S[1]*S[2]*t,n=Math.floor(o/8)+1,i=Ae+r+n;s==null&&(typeof Buffer!="undefined"?s=Buffer.alloc(i).buffer:s=new ArrayBuffer(i));let a=new Uint8Array(s,0,Ae),c=r/Cs,f=new Uint32Array(s,Ae,c),l=lt.create(s,t,Ae+r);return a[0]=Es,[a[1],a[2],a[3]]=S,a[4]=t,[s,f,l]}var Vt=class{constructor(t=null,s=null,e=null,r=8,o=0,n=null,i=0,a=null){us(this,"createInverse",(t,s)=>{oe.clear();let e=t.size,[r,o,n,i,a,c]=mt(e),{size:f}=this,l=new Vt(f),[h,m,u,v,p,A]=mt(f);for(let F=h;F<=m;F+=1)for(let g=u;g<=v;g+=1)for(let V=p;V<=A;V+=1){if(this.getPaletteIndexAt(F,g,V)===0)continue;let _=F+s[0],N=g+s[1],d=V+s[2];if(_>o||_<r||N>i||N<n||d>c||d<a||!t.hasVoxelAt(_,N,d))l.setColorAt(F,g,V,_s);else{let M=t.getColorAt(_,N,d);l.setColorAt(F,g,V,M)}}return l});if(s&&e)this.size=[t[0],t[1],t[2]],this.bitsPerIndex=r,n=n||s.length,a=a||e.length,this.palette=new Uint32Array(s,o||0,n/4),this.indices=lt.create(e,r,i,a),this.xShift=pt(t[0]),this.yShift=pt(t[1]),this.zShift=pt(t[2]),this._rebuildRefCounts();else if(t){let[c,f,l]=ns(t,1);this.palette=f,this.indices=l,this._refCounts=new Array(this.palette.length).fill(0),this._recomputeSizeFieldsForBuffer(c)}}_recomputeSizeFieldsForBuffer(t){let s=new Uint8Array(t,0,Ae);this.size=[0,0,0],[,this.size[0],this.size[1],this.size[2],this.bitsPerIndex]=s,this.xShift=pt(this.size[0]),this.yShift=pt(this.size[1]),this.zShift=pt(this.size[2])}getPaletteIndexAt(t,s,e){let{indices:r}=this,o=this._getOffset(t,s,e);return r.get(o)}getPaletteIndexAtOffset(t){let{indices:s}=this;return s.get(t)}getColorAt(t,s,e){let r=this.getPaletteIndexAt(t,s,e);return this.colorForPaletteIndex(r)}hasVoxelAt(t,s,e){return this.getPaletteIndexAt(t,s,e)!==Ms}removeVoxelAt(t,s,e){return this.setPaletteIndexAt(t,s,e,Ms)}getTotalNonEmptyVoxels(){let t=0;for(let s=0;s<this._refCounts.length;s+=1)t+=this._refCounts[s];return t}getPaletteColor(t){return this.palette[(t-yt)*ye]}setPaletteColor(t,s){this.palette[(t-yt)*ye]=s}paletteHasReferences(t){return this._refCounts[t-yt]!==0}resetPaletteRefcountToOne(t){this._refCounts[t-yt]=1}incrementPaletteRefcount(t){this._refCounts[t-yt]+=1}decrementPaletteRefcount(t){this._refCounts[t-yt]-=1}static isNonEmptyPaletteIndex(t){return t!==0}setPaletteIndexAt(t,s,e,r){let o=this._getOffset(t,s,e);this.setPaletteIndexAtOffset(o,r)}setPaletteIndexAtOffset(t,s){let{indices:e}=this,r=this.getPaletteIndexAtOffset(t);Vt.isNonEmptyPaletteIndex(r)&&this.decrementPaletteRefcount(r),Vt.isNonEmptyPaletteIndex(s)&&this.incrementPaletteRefcount(s),e.set(t,s)}setEmptyAt(t,s,e){this.setPaletteIndexAt(t,s,e,0)}clear(){this.indices.clear(),this._refCounts.fill(0)}setColorAt(t,s,e,r){let o=this._getOffset(t,s,e);return this.setColorAtOffset(o,r)}setColorAtOffset(t,s){let{palette:e,indices:r}=this,o=this.getPaletteIndexAtOffset(t),n=Vt.isNonEmptyPaletteIndex(o);n&&this.decrementPaletteRefcount(o);for(let a=0;a<e.length;a+=1){let c=a+yt;if(this.getPaletteColor(c)===s)return this.incrementPaletteRefcount(c),r.set(t,c),c}if(n&&!this.paletteHasReferences(o))return this.setPaletteColor(o,s),this.resetPaletteRefcountToOne(o),o;let i=this._getFreePaletteIndex();return this.setPaletteColor(i,s),this.resetPaletteRefcountToOne(i),this.indices.set(t,i),i}colorForPaletteIndex(t){return this.palette[(t-yt)*ye]}filterByChunk(t,s,e,r,o){if(o===os.NONE)return;let n=t.size,[i,a,c,f,l,h]=mt(n),{size:m}=this,[u,v,p,A,F,g]=mt(m);for(let V=u;V<=v;V+=1)for(let x=p;x<=A;x+=1)for(let _=F;_<=g;_+=1){if(this.getPaletteIndexAt(V,x,_)===0)continue;let d=V+s,M=x+e,z=_+r,y=!(d>a||d<i||M>f||M<c||z>h||z<l)&&t.hasVoxelAt(d,M,z);(o===os.PAINT&&!y||o===os.KEEP&&y)&&this.setEmptyAt(V,x,_)}}_getFreePaletteIndex(){let{palette:t,size:s,indices:e,bitsPerIndex:r}=this;for(let c=0;c<t.length;c+=1){let f=c+yt;if(!this.paletteHasReferences(f))return f}let o=r*2,[n,i,a]=ns(s,o);for(let c=0;c<t.length*ye;c+=1)i[c]=t[c];for(;this._refCounts.length<i.length;)this._refCounts.push(0);for(let c=0,f=s[0]*s[1]*s[2];c<f;c+=1){let l=e.get(c);a.set(c,l)}return this.palette=i,this.indices=a,this._recomputeSizeFieldsForBuffer(n),this._getFreePaletteIndex()}resizeToFit(t,s,e){let{size:r}=this,o=Math.max(1,r[0],Math.abs(t)*2+1),n=Math.max(1,r[1],Math.abs(s)*2+1),i=Math.max(1,r[2],Math.abs(e)*2+1);this.resizeTo([o,n,i])}resizeTo(t){if(this.size[0]>=t[0]&&this.size[1]>=t[1]&&this.size[2]>=t[2])return;let s=new Vt(t),[e,r,o,n,i,a]=mt(this.size);for(let m=e;m<=r;m+=1)for(let u=o;u<=n;u+=1)for(let v=i;v<=a;v+=1)this.getPaletteIndexAt(m,u,v)!==0&&s.setColorAt(m,u,v,this.getColorAt(m,u,v));let{buffer:c}=s.palette;[this.size[0],this.size[1],this.size[2]]=t;let{bitsPerIndex:f}=s;this.bitsPerIndex=f;let[,l,h]=ns(t,f,c);this.palette=l,this.indices=h,this._refCounts=s._refCounts,this._recomputeSizeFieldsForBuffer(c)}static fromJSON(t){if(typeof t=="string")return Vt.deserialize(t);let{size:s,palette:e,indices:r}=t,o=new Vt(s);for(let n=0;n<e.length+yt;n+=1)for(let i=0;i<r.length;i+=1){let a=r[i];if(a===n)if(a>=yt){let c=e[a-yt];o.setColorAtOffset(i,c)}else a===n&&o.setPaletteIndexAtOffset(i,a)}return o}toJSON(t,s){if(!s)return this.serialize();let e=[],r=[];for(let o=0;o<this.palette.length;o+=1){let n=o+yt,i=this.getPaletteColor(n);i>0&&e.push(i)}for(let o=0,n=this.size[0]*this.size[1]*this.size[2];o<n;o+=1)r.push(this.indices.get(o));return{size:[...this.size],palette:e,indices:r}}clone(){return new Vt(this.size,this.palette.buffer.slice(0),this.indices.view.buffer.slice(0),this.bitsPerIndex,this.palette.byteOffset,this.palette.byteLength,this.indices.view.byteOffset,this.indices.view.byteLength)}_getOffset(t,s,e){let{size:r,xShift:o,yShift:n,zShift:i}=this;return(t+o)*r[1]*r[2]+(s+n)*r[2]+(e+i)}_rebuildRefCounts(){this._refCounts=new Array(this.palette.length).fill(0);for(let t=0,s=this.size[0]*this.size[1]*this.size[2];t<s;t+=1){let e=this.getPaletteIndexAtOffset(t);Vt.isNonEmptyPaletteIndex(e)&&this.incrementPaletteRefcount(e)}}applyToChunk(t,s=0,e=0,r=0){oe.clear();let o=t.size,[n,i,a,c,f,l]=mt(o),{size:h}=this,[m,u,v,p,A,F]=mt(h);for(let g=m;g<=u;g+=1)for(let V=v;V<=p;V+=1)for(let x=A;x<=F;x+=1){let _=this.getPaletteIndexAt(g,V,x);if(_!==0){let N=g+s,d=V+e,M=x+r,z=o[0],C=o[1],y=o[2];if(N>i&&(z=N*2),N<n&&(z=Math.max(z,-N*2+1)),d>c&&(C=d*2),d<a&&(C=Math.max(C,-d*2+1)),M>l&&(y=M*2),M<f&&(y=Math.max(y,-M*2+1)),z>rs||C>rs||y>rs)continue;(o[0]<z||o[1]<C||o[2]<y)&&(t.resizeTo([z,C,y]),o=t.size,[n,i,a,c,f,l]=mt(o),oe.clear());let O=oe.get(_);if(O===void 0){let E=this.getColorAt(g,V,x);if(E===_s)t.setEmptyAt(N,d,M);else{let Z=t.setColorAt(N,d,M,E);oe.set(_,Z)}}else t.getPaletteIndexAt(N,d,M)!==O&&t.setPaletteIndexAt(N,d,M,O)}}}mergeWith(t,s,e,r=!1){oe.clear();let o=oe,n=e[0]-s[0],i=e[1]-s[1],a=e[2]-s[2],c=t.size,[f,l,h,m,u,v]=mt(c),{size:p}=this,[A,F,g,V,x,_]=mt(p);for(let N=A;N<=F;N+=1)for(let d=g;d<=V;d+=1)for(let M=x;M<=_;M+=1){let z=this.getPaletteIndexAt(N,d,M);if(z===0)continue;let C=N+n,y=d+i,O=M+a;if(!!(!(C>l||C<f||y>m||y<h||O>v||O<u)&&t.hasVoxelAt(C,y,O)))if(o.has(z))this.setPaletteIndexAt(N,d,M,o.get(z));else{(r||t.getColorAt(C,y,O)>this.getColorAt(N,d,M))&&this.removeVoxelAt(N,d,M);let B=this.getPaletteIndexAt(N,d,M);o.set(z,B)}}}};function Is(S,t,s,e=Ys){return(S|t<<8|s<<16|e<<24)>>>0}function Ns(){let S=[];for(let r=0;r<256;r++)S[r]=Math.floor(Math.random()*256),S[r+256]=S[r];function t(r){return r*r*r*(r*(r*6-15)+10)}function s(r,o,n){return o+r*(n-o)}function e(r,o,n,i){let a=r&15,c=a<8?o:n,f=a<4?n:a===12||a===14?o:i;return((a&1)===0?c:-c)+((a&2)===0?f:-f)}return{noise:function(r,o,n){let i=Math.floor(r),a=Math.floor(o),c=Math.floor(n),f=i&255,l=a&255,h=c&255;r-=i,o-=a,n-=c;let m=r-1,u=o-1,v=n-1,p=t(r),A=t(o),F=t(n),g=S[f]+l,V=S[g]+h,x=S[g+1]+h,_=S[f+1]+l,N=S[_]+h,d=S[_+1]+h;return s(F,s(A,s(p,e(S[V],r,o,n),e(S[N],m,o,n)),s(p,e(S[x],r,u,n),e(S[d],m,u,n))),s(A,s(p,e(S[V+1],r,o,v),e(S[N+1],m,o,n-1)),s(p,e(S[x+1],r,u,v),e(S[d+1],m,u,v))))}}}var Jt=class{static changeShape(t,s,e){let{faceEquidistant:r}=s;switch(e){case"sphere":this._circularDeform(t,s,1,1,1);break;case"cylinder-x":this._circularDeform(t,s,0,1,1);break;case"cylinder-y":this._circularDeform(t,s,1,0,1);break;case"cylinder-z":this._circularDeform(t,s,1,1,0);break;default:for(let o=0,n=t.faceCount;o<n;o++)r.set(o,0);break}}static _circularDeform(t,s,e,r,o){let[n,i,a,c,f,l]=mt(t.voxChunk.size),h=(n+i)/2+.5,m=(a+c)/2+.5,u=(f+l)/2+.5,{vertX:v,vertY:p,vertZ:A,vertRing:F}=s;for(let g=0,V=t.vertCount;g<V;g++){let x=v[g],_=p[g],N=A[g],d=x-h,M=_-m,z=N-u,C=Math.max(Math.abs(d*e),Math.abs(M*r),Math.abs(z*o)),y=Math.sqrt(d*d*e+M*M*r+z*z*o);if(y===0)continue;let O=C/y;v[g]=d*(1-e+e*O)+h,p[g]=M*(1-r+r*O)+m,A[g]=z*(1-o+o*O)+u,F[g]=C}this._markEquidistantFaces(t,s)}static _markEquidistantFaces(t,s){let{faceVertIndices:e,vertRing:r,faceEquidistant:o}=s;for(let n=0,i=t.faceCount;n<i;n++){let a=n*4,c=a+1,f=a+2,l=a+3;o.set(n,r[e[a]]===r[e[c]]&&r[e[a]]===r[e[f]]&&r[e[a]]===r[e[l]]?1:0)}}static maximumDeformCount(t){let s=0;return t.materials.forEach(function(e){e.deform&&(s=Math.max(s,e.deform.count))}),s}static deform(t,s,e){let{vertLinkIndices:r,vertLinkCounts:o,vertDeformCount:n,vertDeformDamping:i,vertDeformStrength:a,vertFlattenedX:c,vertFlattenedY:f,vertFlattenedZ:l,vertClampedX:h,vertClampedY:m,vertClampedZ:u,vertX:v,vertY:p,vertZ:A,vertTmpX:F,vertTmpY:g,vertTmpZ:V,vertHasTmp:x}=s;for(let _=0;_<e;_++){let N=!1;for(let d=0,M=t.vertCount;d<M;d++){if(n[d]<=_)continue;let C=o[d];if(C===0)continue;N=!0;let y=v[d],O=p[d],E=A[d],Z=i[d],B=a[d],Y=1-(h.get(d)|c.get(d)),X=1-(m.get(d)|f.get(d)),R=1-(u.get(d)|l.get(d)),U=0,L=0,q=0;for(let I=0;I<C;I++){let P=r[d*6+I];U+=v[P],L+=p[P],q+=A[P]}let b=Math.pow(Z,_)*B,$=U/C-y,w=L/C-O,G=q/C-E;F[d]=y+Y*$*b,g[d]=O+X*w*b,V[d]=E+R*G*b,x.set(d,Y|X|R)}if(N){for(let d=0,M=t.vertCount;d<M;d++)x.get(d)!==0&&(v[d]=F[d],p[d]=g[d],A[d]=V[d]);x.clear()}}}static warpAndScatter(t,s){let e=Ns().noise,{nx:r,px:o,ny:n,py:i,nz:a,pz:c}=t._tile,[f,l,h,m,u,v]=mt(t.voxChunk.size),{vertX:p,vertY:A,vertZ:F,vertWarpAmplitude:g,vertWarpFrequency:V,vertScatter:x,vertFlattenedX:_,vertFlattenedY:N,vertFlattenedZ:d,vertClampedX:M,vertClampedY:z,vertClampedZ:C}=s;f+=.1,h+=.1,u+=.1,l+=.9,m+=.9,v+=.9;for(let y=0,O=t.vertCount;y<O;y++){let E=p[y],Z=A[y],B=F[y];if(r&&E<f||o&&E>l||n&&Z<h||i&&Z>m||a&&B<u||c&&B>v)continue;let Y=g[y],X=V[y],R=x[y],U=Y>0,L=R>0;if(U||L){let q=0,b=0,$=0;U&&(q=e((E+.19)*X,Z*X,B*X)*Y,b=e((Z+.17)*X,B*X,E*X)*Y,$=e((B+.13)*X,E*X,Z*X)*Y),L&&(q+=(Math.random()*2-1)*R,b+=(Math.random()*2-1)*R,$+=(Math.random()*2-1)*R);let w=1-(M.get(y)|_.get(y)),G=1-(z.get(y)|N.get(y)),I=1-(C.get(y)|d.get(y));p[y]=E+w*q,A[y]=Z+G*b,F[y]=B+I*$}}}};var he=class{static linkVertices(t,s,e){let{faceClamped:r,vertNrOfClampedLinks:o,faceVertIndices:n,vertLinkIndices:i,vertLinkCounts:a}=s;if(r.get(e)===1)for(let f=0;f<4;f++){let l=n[e*4+f],h=!1;for(let m=0,u=a[l];m<u;m++)if(i[l*6+m]===l){h=!0;break}h||(i[l*6+a[l]]=l,a[l]++,o[l]++)}else for(let f=0;f<4;f++){let l=n[e*4+f],h=n[e*4+(f+1)%4],m=!1;for(let v=0,p=a[l];v<p;v++)if(i[l*6+v]===h){m=!0;break}m||(i[l*6+a[l]]=h,a[l]++);let u=!1;for(let v=0,p=a[h];v<p;v++)if(i[h*6+v]===l){u=!0;break}u||(i[h*6+a[h]]=l,a[h]++)}}static fixClampedLinks(t,s){let{faceVertIndices:e,vertNrOfClampedLinks:r,vertFullyClamped:o,vertLinkCounts:n,vertLinkIndices:i}=s;for(let a=0,c=t.vertCount;a<c;a++){let f=r[a],l=n[a];f===l&&(o.set(a,1),n[a]=0)}for(let a=0,c=t.faceCount;a<c;a++)for(let f=0;f<4;f++){let l=e[a*4+f],h=e[a*4+(f+1)%4];if(o.get(l)===1){let m=!1;for(let u=0,v=n[l];u<v;u++)if(i[l*6+u]===h){m=!0;break}m||(i[l*6+n[l]]=h,n[l]++)}if(o.get(h)===1){let m=!1;for(let u=0,v=n[h];u<v;u++)if(i[h*6+u]===l){m=!0;break}m||(i[h*6+n[h]]=l,n[h]++)}}}};var Me=class{static calculateNormals(t,s){let e=t.tile,{faceNameIndices:r,faceEquidistant:o,faceSmooth:n,faceFlattened:i,faceClamped:a,vertX:c,vertY:f,vertZ:l,faceVertFlatNormalX:h,faceVertFlatNormalY:m,faceVertFlatNormalZ:u,faceVertSmoothNormalX:v,faceVertSmoothNormalY:p,faceVertSmoothNormalZ:A,faceVertBothNormalX:F,faceVertBothNormalY:g,faceVertBothNormalZ:V,faceVertNormalX:x,faceVertNormalY:_,faceVertNormalZ:N,faceMaterials:d,faceVertIndices:M,vertSmoothNormalX:z,vertSmoothNormalY:C,vertSmoothNormalZ:y,vertBothNormalX:O,vertBothNormalY:E,vertBothNormalZ:Z}=s,[B,Y,X,R,U,L]=mt(t.voxChunk.size);for(let b=0,$=t.faceCount;b<$;b++){let w=b*4;for(let G=0;G<4;G++){let I=M[w+G];z[I]=0,C[I]=0,y[I]=0,O[I]=0,E[I]=0,Z[I]=0}}for(let b=0,$=t.faceCount;b<$;b++){let w=r[b],G=o.get(b),I=i.get(b),P=a.get(b),K=G|1-(I|P);n.set(b,K);let H=M[b*4],j=M[b*4+1],tt=M[b*4+2],T=M[b*4+3],ot=(c[H]+c[j]+c[tt]+c[T])/4,nt=(f[H]+f[j]+f[tt]+f[T])/4,dt=(l[H]+l[j]+l[tt]+l[T])/4;for(let ft=0;ft<4;ft++){let et=M[b*4+ft],xt=M[b*4+(ft+3)%4],ut=c[et],wt=c[xt],gt=f[et],zt=f[xt],Yt=l[et],Kt=l[xt],Pt=z[et],jt=C[et],Dt=y[et],Rt=O[et],Lt=E[et],te=Z[et],Zt=wt-ut,Tt=zt-gt,vt=Kt-Yt,at=ot-ut,it=nt-gt,ct=dt-Yt,Ft=Math.sqrt(Zt*Zt+Tt*Tt+vt*vt),Bt=Math.sqrt(at*at+it*it+ct*ct);Ft=Ft===0?1:Ft,Bt=Bt===0?1:Bt;let kt=1/Ft;Zt*=kt,Tt*=kt,vt*=kt;let Ut=1/Bt;at*=Ut,it*=Ut,ct*=Ut;let At=Tt*ct-vt*it,Xt=vt*at-Zt*ct,bt=Zt*it-Tt*at,ne=B+.1,ae=Y+.9,_t=X+.1,St=R+.9,Ct=U+.1,Ot=L+.9;e&&((e.nx&&w===0||e.px&&w===1)&&(gt<_t||gt>St||Yt<Ct||Yt>Ot)&&(Xt=0,bt=0),(e.ny&&w===2||e.py&&w===3)&&(ut<ne||ut>ae||Yt<Ct||Yt>Ot)&&(At=0,bt=0),(e.nz&&w===4||e.pz&&w===5)&&(ut<ne||ut>ae||gt<_t||gt>St)&&(At=0,Xt=0));let It=Math.sqrt(At*At+Xt*Xt+bt*bt);It=It===0?1:It;let k=1/It;At*=k,Xt*=k,bt*=k,h[b*4+ft]=At,m[b*4+ft]=Xt,u[b*4+ft]=bt;let Q=Zt*at+Tt*it+vt*ct,W=Math.acos(Q);Pt+=At*W,jt+=Xt*W,Dt+=bt*W,Rt+=K*(At*W),Lt+=K*(Xt*W),te+=K*(bt*W),z[et]=Pt,C[et]=jt,y[et]=Dt,O[et]=Rt,E[et]=Lt,Z[et]=te}}for(let b=0,$=t.vertCount;b<$;b++){let w=z[b],G=C[b],I=y[b],P=O[b],K=E[b],H=Z[b],j=Math.sqrt(w*w+G*G+I*I),tt=Math.sqrt(P*P+K*K+H*H);j!==0&&(z[b]=w/j,C[b]=G/j,y[b]=I/j),tt!==0&&(O[b]=P/tt,E[b]=K/tt,Z[b]=H/tt)}let q=t.materials.materials;for(let b=0,$=t.faceCount;b<$;b++){let w=n.get(b)===1,G=q[d[b]];for(let I=0;I<4;I++){let P=b*4+I,K=M[b*4+I];switch(v[P]=z[K],p[P]=C[K],A[P]=y[K],F[P]=!w||O[K]===0?h[P]:O[K],g[P]=!w||E[K]===0?m[P]:E[K],V[P]=!w||Z[K]===0?u[P]:Z[K],G.lighting){case ee:x[P]=v[P],_[P]=p[P],N[P]=A[P];break;case se:x[P]=F[P],_[P]=g[P],N[P]=V[P];break;default:x[P]=h[P],_[P]=m[P],N[P]=u[P];break}}}}};var D=class{constructor(){let t=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];this.m=new Float32Array(t)}transformPoint(t){let s=this.m,e=s[12]*t.x+s[13]*t.y+s[14]*t.z+s[15],r=(s[0]*t.x+s[1]*t.y+s[2]*t.z+s[3])/e,o=(s[4]*t.x+s[5]*t.y+s[6]*t.z+s[7])/e,n=(s[8]*t.x+s[9]*t.y+s[10]*t.z+s[11])/e;t.x=r,t.y=o,t.z=n}transformPointInline(t,s,e,r){let o=t[r],n=s[r],i=e[r],a=this.m,c=a[12]*o+a[13]*n+a[14]*i+a[15],f=(a[0]*o+a[1]*n+a[2]*i+a[3])/c,l=(a[4]*o+a[5]*n+a[6]*i+a[7])/c,h=(a[8]*o+a[9]*n+a[10]*i+a[11])/c;t[r]=f,s[r]=l,e[r]=h}transformVector(t){let s=this.m,e=s[0]*t.x+s[1]*t.y+s[2]*t.z,r=s[4]*t.x+s[5]*t.y+s[6]*t.z,o=s[8]*t.x+s[9]*t.y+s[10]*t.z;t.x=e,t.y=r,t.z=o}transformVectorInline(t,s,e,r){let o=t[r],n=s[r],i=e[r],a=this.m,c=a[0]*o+a[1]*n+a[2]*i,f=a[4]*o+a[5]*n+a[6]*i,l=a[8]*o+a[9]*n+a[10]*i;t[r]=c,s[r]=f,e[r]=l}static identity(t){t=t||new D;let s=t.m;return s[0]=s[5]=s[10]=s[15]=1,s[1]=s[2]=s[3]=s[4]=s[6]=s[7]=s[8]=s[9]=s[11]=s[12]=s[13]=s[14]=0,t}static multiply(t,s,e){e=e||new D;let r=t.m,o=s.m,n=e.m;return n[0]=r[0]*o[0]+r[1]*o[4]+r[2]*o[8]+r[3]*o[12],n[1]=r[0]*o[1]+r[1]*o[5]+r[2]*o[9]+r[3]*o[13],n[2]=r[0]*o[2]+r[1]*o[6]+r[2]*o[10]+r[3]*o[14],n[3]=r[0]*o[3]+r[1]*o[7]+r[2]*o[11]+r[3]*o[15],n[4]=r[4]*o[0]+r[5]*o[4]+r[6]*o[8]+r[7]*o[12],n[5]=r[4]*o[1]+r[5]*o[5]+r[6]*o[9]+r[7]*o[13],n[6]=r[4]*o[2]+r[5]*o[6]+r[6]*o[10]+r[7]*o[14],n[7]=r[4]*o[3]+r[5]*o[7]+r[6]*o[11]+r[7]*o[15],n[8]=r[8]*o[0]+r[9]*o[4]+r[10]*o[8]+r[11]*o[12],n[9]=r[8]*o[1]+r[9]*o[5]+r[10]*o[9]+r[11]*o[13],n[10]=r[8]*o[2]+r[9]*o[6]+r[10]*o[10]+r[11]*o[14],n[11]=r[8]*o[3]+r[9]*o[7]+r[10]*o[11]+r[11]*o[15],n[12]=r[12]*o[0]+r[13]*o[4]+r[14]*o[8]+r[15]*o[12],n[13]=r[12]*o[1]+r[13]*o[5]+r[14]*o[9]+r[15]*o[13],n[14]=r[12]*o[2]+r[13]*o[6]+r[14]*o[10]+r[15]*o[14],n[15]=r[12]*o[3]+r[13]*o[7]+r[14]*o[11]+r[15]*o[15],e}static transpose(t,s){s=s||new D;let e=t.m,r=s.m;return r[0]=e[0],r[1]=e[4],r[2]=e[8],r[3]=e[12],r[4]=e[1],r[5]=e[5],r[6]=e[9],r[7]=e[13],r[8]=e[2],r[9]=e[6],r[10]=e[10],r[11]=e[14],r[12]=e[3],r[13]=e[7],r[14]=e[11],r[15]=e[15],s}static inverse(t,s){s=s||new D;let e=t.m,r=s.m;r[0]=e[5]*e[10]*e[15]-e[5]*e[14]*e[11]-e[6]*e[9]*e[15]+e[6]*e[13]*e[11]+e[7]*e[9]*e[14]-e[7]*e[13]*e[10],r[1]=-e[1]*e[10]*e[15]+e[1]*e[14]*e[11]+e[2]*e[9]*e[15]-e[2]*e[13]*e[11]-e[3]*e[9]*e[14]+e[3]*e[13]*e[10],r[2]=e[1]*e[6]*e[15]-e[1]*e[14]*e[7]-e[2]*e[5]*e[15]+e[2]*e[13]*e[7]+e[3]*e[5]*e[14]-e[3]*e[13]*e[6],r[3]=-e[1]*e[6]*e[11]+e[1]*e[10]*e[7]+e[2]*e[5]*e[11]-e[2]*e[9]*e[7]-e[3]*e[5]*e[10]+e[3]*e[9]*e[6],r[4]=-e[4]*e[10]*e[15]+e[4]*e[14]*e[11]+e[6]*e[8]*e[15]-e[6]*e[12]*e[11]-e[7]*e[8]*e[14]+e[7]*e[12]*e[10],r[5]=e[0]*e[10]*e[15]-e[0]*e[14]*e[11]-e[2]*e[8]*e[15]+e[2]*e[12]*e[11]+e[3]*e[8]*e[14]-e[3]*e[12]*e[10],r[6]=-e[0]*e[6]*e[15]+e[0]*e[14]*e[7]+e[2]*e[4]*e[15]-e[2]*e[12]*e[7]-e[3]*e[4]*e[14]+e[3]*e[12]*e[6],r[7]=e[0]*e[6]*e[11]-e[0]*e[10]*e[7]-e[2]*e[4]*e[11]+e[2]*e[8]*e[7]+e[3]*e[4]*e[10]-e[3]*e[8]*e[6],r[8]=e[4]*e[9]*e[15]-e[4]*e[13]*e[11]-e[5]*e[8]*e[15]+e[5]*e[12]*e[11]+e[7]*e[8]*e[13]-e[7]*e[12]*e[9],r[9]=-e[0]*e[9]*e[15]+e[0]*e[13]*e[11]+e[1]*e[8]*e[15]-e[1]*e[12]*e[11]-e[3]*e[8]*e[13]+e[3]*e[12]*e[9],r[10]=e[0]*e[5]*e[15]-e[0]*e[13]*e[7]-e[1]*e[4]*e[15]+e[1]*e[12]*e[7]+e[3]*e[4]*e[13]-e[3]*e[12]*e[5],r[11]=-e[0]*e[5]*e[11]+e[0]*e[9]*e[7]+e[1]*e[4]*e[11]-e[1]*e[8]*e[7]-e[3]*e[4]*e[9]+e[3]*e[8]*e[5],r[12]=-e[4]*e[9]*e[14]+e[4]*e[13]*e[10]+e[5]*e[8]*e[14]-e[5]*e[12]*e[10]-e[6]*e[8]*e[13]+e[6]*e[12]*e[9],r[13]=e[0]*e[9]*e[14]-e[0]*e[13]*e[10]-e[1]*e[8]*e[14]+e[1]*e[12]*e[10]+e[2]*e[8]*e[13]-e[2]*e[12]*e[9],r[14]=-e[0]*e[5]*e[14]+e[0]*e[13]*e[6]+e[1]*e[4]*e[14]-e[1]*e[12]*e[6]-e[2]*e[4]*e[13]+e[2]*e[12]*e[5],r[15]=e[0]*e[5]*e[10]-e[0]*e[9]*e[6]-e[1]*e[4]*e[10]+e[1]*e[8]*e[6]+e[2]*e[4]*e[9]-e[2]*e[8]*e[5];let o=e[0]*r[0]+e[1]*r[4]+e[2]*r[8]+e[3]*r[12];for(let n=0;n<16;n++)r[n]/=o;return s}static scale(t,s,e,r){r=r||new D;let o=r.m;return o[0]=t,o[1]=0,o[2]=0,o[3]=0,o[4]=0,o[5]=s,o[6]=0,o[7]=0,o[8]=0,o[9]=0,o[10]=e,o[11]=0,o[12]=0,o[13]=0,o[14]=0,o[15]=1,r}static translate(t,s,e,r){r=r||new D;let o=r.m;return o[0]=1,o[1]=0,o[2]=0,o[3]=t,o[4]=0,o[5]=1,o[6]=0,o[7]=s,o[8]=0,o[9]=0,o[10]=1,o[11]=e,o[12]=0,o[13]=0,o[14]=0,o[15]=1,r}static rotate(t,s,e,r,o){if(!t||!s&&!e&&!r)return D.identity(o);o=o||new D;let n=o.m,i=Math.sqrt(s*s+e*e+r*r);t*=Math.PI/180,s/=i,e/=i,r/=i;let a=Math.cos(t),c=Math.sin(t),f=1-a;return n[0]=s*s*f+a,n[1]=s*e*f-r*c,n[2]=s*r*f+e*c,n[3]=0,n[4]=e*s*f+r*c,n[5]=e*e*f+a,n[6]=e*r*f-s*c,n[7]=0,n[8]=r*s*f-e*c,n[9]=r*e*f+s*c,n[10]=r*r*f+a,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,o}static lookAtORIGINAL(t,s,e,r,o,n,i,a,c,f){f=f||new D;let l=f.m,h=t-r,m=s-o,u=e-n,v=Math.sqrt(h*h+m*m+u*u);h/=v,m/=v,u/=v;let p=a*u-c*m,A=c*h-i*u,F=i*m-a*h;v=Math.sqrt(p*p+A*A+F*F),p/=v,A/=v,F/=v;let g=m*F-u*A,V=u*p-h*F,x=h*A-m*p;return v=Math.sqrt(g*g+V*V+x*x),g/=v,V/=v,x/=v,l[0]=p,l[1]=A,l[2]=F,l[3]=-(p*t+A*s+F*e),l[4]=g,l[5]=V,l[6]=x,l[7]=-(g*t+V*s+x*e),l[8]=h,l[9]=m,l[10]=u,l[11]=-(h*t+m*s+u*e),l[12]=0,l[13]=0,l[14]=0,l[15]=1,f}static lookAtTRYOUT(t,s,e,r){r=r||new D;let o=r.m,n=Math.sqrt(t*t+e*e);return o[0]=e/n,o[1]=0,o[2]=-t/n,o[3]=0,o[4]=t*s/n,o[5]=-n,o[6]=e*s/n,o[7]=0,o[8]=t,o[9]=s,o[10]=e,o[11]=0,o[12]=0,o[13]=0,o[14]=0,o[15]=1,r}static lookAt(t,s,e,r){r=r||new D;let o=r.m,n=Math.sqrt(t*t+e*e),i=n?t/n:1,a=n?e/n:0;return o[0]=t,o[1]=-a,o[2]=-e*i,o[3]=0,o[4]=s,o[5]=0,o[6]=n,o[7]=0,o[8]=e,o[9]=i,o[10]=-e*a,o[11]=0,o[12]=0,o[13]=0,o[14]=0,o[15]=1,r}};var me=[null,null,null,null],_e=[null,null,null,null],Ce=[null,null,null,null],Ie=class{static transformVertices(t,s){let{vertX:e,vertY:r,vertZ:o,faceVertNormalX:n,faceVertFlatNormalX:i,faceVertNormalY:a,faceVertFlatNormalY:c,faceVertNormalZ:f,faceVertFlatNormalZ:l,faceVertSmoothNormalX:h,faceVertSmoothNormalY:m,faceVertSmoothNormalZ:u,faceVertBothNormalX:v,faceVertBothNormalY:p,faceVertBothNormalZ:A}=s,F=t.determineBoundsOffsetAndRescale(t.resize,s),g=new D;g=D.multiply(g,D.translate(t.position.x,t.position.y,t.position.z)),g=D.multiply(g,D.rotate(t.rotation.z,0,0,1)),g=D.multiply(g,D.rotate(t.rotation.y,0,1,0)),g=D.multiply(g,D.rotate(t.rotation.x,1,0,0)),g=D.multiply(g,D.scale(t.scale.x,t.scale.y,t.scale.z)),g=D.multiply(g,D.scale(F.rescale,F.rescale,F.rescale)),g=D.multiply(g,D.translate(F.offset.x,F.offset.y,F.offset.z));let V=D.inverse(g);V=D.transpose(V);for(let x=0,_=t.vertCount;x<_;x++)g.transformPointInline(e,r,o,x);me[0]=n,_e[0]=a,Ce[0]=f,me[1]=i,_e[1]=c,Ce[1]=l,me[2]=h,_e[2]=m,Ce[2]=u,me[3]=v,_e[3]=p,Ce[3]=A;for(let x=0,_=t.faceCount;x<_;x++){let N=x*4;for(let d=0;d<4;d++)for(let M=0,z=me.length;M<z;M++){let C=me[M],y=_e[M],O=Ce[M],E=N+d;V.transformVectorInline(C,y,O,E);let Z=C[E],B=y[E],Y=O[E],X=Math.sqrt(Z*Z+B*B+Y*Y);if(X>0){let R=1/X;C[E]=Z*R,y[E]=B*R,O[E]=Y*R}}}}};var Ne=class{static calculateLights(t,s){let e=t.lights;if(e.length===0)return;for(let p of e)if(p.direction&&!p.normalizedDirection){let A=Math.sqrt(p.direction.x*p.direction.x+p.direction.y*p.direction.y+p.direction.z*p.direction.z);if(p.normalizedDirection={x:p.direction.x,y:p.direction.y,z:p.direction.z},A>0){let F=1/A;p.normalizedDirection.x*=F}}let r=t.materials.materials,{faceMaterials:o,faceVertNormalX:n,faceVertNormalY:i,faceVertNormalZ:a,faceVertIndices:c,vertX:f,vertY:l,vertZ:h,faceVertLightR:m,faceVertLightG:u,faceVertLightB:v}=s;for(let p=0,A=t.faceCount;p<A;p++){let F=r[o[p]],g=p*4;if(F.lights)for(let V=0;V<4;V++){let x=g+V,_=c[x],N=f[_],d=l[_],M=h[_],z=n[x],C=i[x],y=a[x];m[x]=0,u[x]=0,v[x]=0;for(let O of e){let{color:E,strength:Z,distance:B,normalizedDirection:Y,position:X}=O,R=Z,U=0;if(X){let L=X.x-N,q=X.y-d,b=X.z-M;U=Math.sqrt(L*L+q*q+b*b);let $=1/U;R=Z*Math.max(z*L*$+C*q*$+y*b*$,0)}else Y&&(R=Z*Math.max(z*Y.x+C*Y.y+y*Y.z,0));X&&B&&(R=R*(1-Math.min(U/B,1))),m[x]+=E.r*R,u[x]+=E.g*R,v[x]+=E.b*R}}else for(let V=0;V<4;V++){let x=g+V;m[x]=1,u[x]=1,v[x]=1}}}};var ws=[],as=new Map,is=()=>ws.pop()||{minx:Number.MAX_VALUE,miny:Number.MAX_VALUE,minz:Number.MAX_VALUE,maxx:-Number.MAX_VALUE,maxy:-Number.MAX_VALUE,maxz:-Number.MAX_VALUE,partitions:Array(8).fill(null),triangles:[]},zs=S=>{for(let t of S.partitions)t&&zs(t);S.minx=Number.MAX_VALUE,S.miny=Number.MAX_VALUE,S.minz=Number.MAX_VALUE,S.maxx=-Number.MAX_VALUE,S.maxy=-Number.MAX_VALUE,S.maxz=-Number.MAX_VALUE,S.partitions.fill(null),S.triangles.length=0,ws.push(S)},we=class{static calculateAmbientOcclusion(t,s){if(!(t.ao||t.materials.find(function(_){return _.ao})))return;let{faceMaterials:r,faceVertIndices:o,faceVertAO:n,vertX:i,vertY:a,vertZ:c,faceVertNormalX:f,faceVertNormalY:l,faceVertNormalZ:h}=s,{faceCount:m}=t,u=t.materials.materials,v=this._getAllFaceTriangles(t,s),p=this._trianglesToOctree(v,t,s);t._aoSides&&(p=this._aoSidesToOctree(t,s,p));let A=t.aoSamples,F=this._generateFibonacciSamples(A);as.clear();let g=t.scale.x,V=t.scale.y,x=t.scale.z;for(let _=0;_<m;_++){let N=u[r[_]],d=N.ao||t.ao,M=_*4;if(n[M]=0,n[M+1]=0,n[M+2]=0,n[M+3]=0,!d||d.maxDistance===0||d.strength===0||d.angle<1||N.opacity===0)continue;let z=d.maxDistance*Math.max(g,V,x),C=d.strength,y=Math.cos(d.angle/180*Math.PI);for(let O=0;O<4;O++){let E=M+O,Z=o[E],B=i[Z],Y=a[Z],X=c[Z],R=f[E],U=l[E],L=h[E],q=B*16384+Y*128+X,b=R*1e7+U*1e5+L*1e3,$=q*1e9+b,w=as.get($);if(w!==void 0){n[E]=w;continue}let G=o[M+(O+2)%4],I=i[G],P=a[G],K=c[G],H=B*.99999+I*1e-5+R*1e-5,j=Y*.99999+P*1e-5+U*1e-5,tt=X*.99999+K*1e-5+L*1e-5,T=0,ot=0;for(let[dt,ft,et]of F){if(dt*R+ft*U+et*L<=y)continue;let ut=H+dt*z,wt=j+ft*z,gt=tt+et*z,zt=this._distanceToOctree(t,s,p,H,j,tt,dt,ft,et,z,ut,wt,gt);zt?zt=zt/z:zt=1,T+=zt,ot++}let nt=0;ot!==0&&(T=Math.max(Math.min(T/ot,1),0),nt=1-Math.pow(T,C)),n[E]=nt,as.set($,nt)}}zs(p)}static _getAllFaceTriangles(t,s){let{faceMaterials:e}=s,{faceCount:r}=t,o=[],n=t.materials.materials;for(let i=0;i<r;i++){if(n[e[i]].opacity<.75)continue;let c=i*2;o.push(c),o.push(c+1)}return o}static _trianglesToOctree(t,s,e){let{faceVertIndices:r,vertX:o,vertY:n,vertZ:i}=e,a=t.length;if(a<=32){let c=is();c.triangles=t;for(let f=0;f<a;f++){let l=t[f],m=(l>>1)*4,u,v,p;(l&1)===0?(u=r[m+2],v=r[m+1],p=r[m+0]):(u=r[m+0],v=r[m+3],p=r[m+2]);let A=o[u],F=n[u],g=i[u],V=o[v],x=n[v],_=i[v],N=o[p],d=n[p],M=i[p];c.minx=Math.min(c.minx,A,V,N),c.miny=Math.min(c.miny,F,x,d),c.minz=Math.min(c.minz,g,_,M),c.maxx=Math.max(c.maxx,A,V,N),c.maxy=Math.max(c.maxy,F,x,d),c.maxz=Math.max(c.maxz,g,_,M)}return c}else{let c=0,f=0,l=0;for(let v=0;v<a;v++){let p=t[v],F=(p>>1)*4,g,V,x;(p&1)===0?(g=r[F+2],V=r[F+1],x=r[F+0]):(g=r[F+0],V=r[F+3],x=r[F+2]);let _=o[g],N=n[g],d=i[g],M=o[V],z=n[V],C=i[V],y=o[x],O=n[x],E=i[x];c+=_+M+y,f+=N+z+O,l+=d+C+E}let h=1/a;c*=h,f*=h,l*=h;let m=Array(8).fill(null);for(let v=0;v<a;v++){let p=t[v],F=(p>>1)*4,g,V,x;(p&1)===0?(g=r[F+2],V=r[F+1],x=r[F+0]):(g=r[F+0],V=r[F+3],x=r[F+2]);let _=o[g],N=n[g],d=i[g],M=o[V],z=n[V],C=i[V],y=o[x],O=n[x],E=i[x],Z=_+M+y<c?0:1,B=N+z+O<f?0:1,Y=d+C+E<l?0:1,X=Z+B*2+Y*4;m[X]===null?m[X]=[p]:m[X].push(p)}let u=is();for(let v=0;v<8;v++){if(m[v]===null)continue;let p=this._trianglesToOctree(m[v],s,e);u.partitions[v]=p,u.minx=Math.min(u.minx,p.minx),u.miny=Math.min(u.miny,p.miny),u.minz=Math.min(u.minz,p.minz),u.maxx=Math.max(u.maxx,p.maxx),u.maxy=Math.max(u.maxy,p.maxy),u.maxz=Math.max(u.maxz,p.maxz)}return u}}static _distanceToOctree(t,s,e,r,o,n,i,a,c,f,l,h,m){if(this._hitsBox(r,o,n,l,h,m,e)===!1)return null;if(e.triangles.length>0)return this._distanceToModel(t,s,e.triangles,r,o,n,i,a,c,f);let u=f,v=e.partitions;for(let p=0;p<8;p++){let A=v[p];if(A===null)continue;let F=this._distanceToOctree(t,s,A,r,o,n,i,a,c,f,l,h,m);F&&(u=Math.min(u,F))}return u}static _aoSidesToOctree(t,s,e){let r=t.determineBoundsOffsetAndRescale(Gt,s).bounds,{vertCount:o,faceCount:n}=t,{faceVertIndices:i,faceCulled:a,vertX:c,vertY:f,vertZ:l}=s,h=(u,v,p,A,F,g,V,x,_)=>{let N=n*4;c[o]=u,f[o]=v,l[o]=p,c[o+1]=A,f[o+1]=F,l[o+1]=g,c[o+2]=V,f[o+2]=x,l[o+2]=_,i[N]=o+2,i[N+1]=o+1,i[N+2]=o+0,a.set(n,1);let d=n*2;return n++,o+=3,d},m=[];if(t._aoSides.nx&&m.push(h(r.minX-.05,1e6,-1e6,r.minX-.05,1e6,1e6,r.minX-.05,-1e7,0)),t._aoSides.px&&m.push(h(r.maxX+.05,1e6,1e6,r.maxX+.05,1e6,-1e6,r.maxX+.05,-1e7,0)),t._aoSides.ny&&m.push(h(1e6,r.minY-.05,-1e6,-1e6,r.minY-.05,-1e6,0,r.minY-.05,1e7)),t._aoSides.py&&m.push(h(-1e6,r.maxY+.05,-1e6,1e6,r.maxY+.05,-1e6,0,r.maxY+.05,1e7)),t._aoSides.nz&&m.push(h(1e6,1e6,r.minZ-.05,-1e6,1e6,r.minZ-.05,0,-1e7,r.minZ-.05)),t._aoSides.pz&&m.push(h(-1e6,1e6,r.maxZ+.05,1e6,1e6,r.maxZ+.05,0,-1e7,r.maxZ+.05)),m.length>0){let u=this._trianglesToOctree(m,t,s),v=is();v.partitions=[v,u]}return e}static _hitsBox(t,s,e,r,o,n,i){let a=i.minx;if(t<a&&r<a)return!1;let c=i.maxx;if(t>c&&r>c)return!1;let f=i.miny;if(s<f&&o<f)return!1;let l=i.maxy;if(s>l&&o>l)return!1;let h=i.minz;if(e<h&&n<h)return!1;let m=i.maxz;if(e>m&&n>m)return!1;let u=t-(a+c)*.5,v=(c-a)*.5,p=(r-t)*.5,A=Math.abs(p);if(Math.abs(u)>v+A)return!1;let F=(l-f)*.5,g=(o-s)*.5,V=Math.abs(g),x=s-(f+l)*.5;if(Math.abs(x)>F+V)return!1;let _=(m-h)*.5,N=(n-e)*.5,d=Math.abs(N),M=e-(h+m)*.5;return!(Math.abs(M)>_+d||Math.abs(g*M-N*x)>F*d+_*V+Number.EPSILON||Math.abs(N*u-p*M)>_*A+v*d+Number.EPSILON||Math.abs(p*x-g*u)>v*V+F*A+Number.EPSILON)}static _distanceToModel(t,s,e,r,o,n,i,a,c,f){let l=null,{faceVertIndices:h}=s;for(let m=0;m<e.length;m++){let u=e[m],p=(u>>1)*4,A,F,g;(u&1)===0?(A=h[p+2],F=h[p+1],g=h[p+0]):(A=h[p+0],F=h[p+3],g=h[p+2]);let V=this._triangleDistance(t,s,A,F,g,r,o,n,i,a,c);V&&(l?l=Math.min(l,V):V<f&&(l=V))}return l}static _triangleDistance(t,s,e,r,o,n,i,a,c,f,l){let{vertX:h,vertY:m,vertZ:u}=s,v=h[e],p=m[e],A=u[e],F=h[r],g=m[r],V=u[r],x=h[o],_=m[o],N=u[o],d=F-v,M=g-p,z=V-A,C=x-v,y=_-p,O=N-A,E=f*O-l*y,Z=l*C-c*O,B=c*y-f*C,Y=d*E+M*Z+z*B;if(Y<Number.EPSILON)return null;let X=1/Y,R=n-v,U=i-p,L=a-A,q=X*(R*E+U*Z+L*B);if(q<0||q>1)return null;let b=U*z-L*M,$=L*d-R*z,w=R*M-U*d,G=X*(c*b+f*$+l*w);if(G<0||q+G>1)return null;let I=X*(C*b+y*$+O*w);return I<=Number.EPSILON?null:I}static _generateFibonacciSamples(t){let s=[],e=(Math.sqrt(5)+1)/2,r=(2-e)*(2*Math.PI);for(let o=1;o<=t;++o){let n=Math.asin(-1+2*o/(t+1)),i=r*o,a=Math.cos(i)*Math.cos(n),c=Math.sin(n),f=Math.sin(i)*Math.cos(n);s.push([a,c,f])}return s}static _generateOctahedronSamples(t){let s=[],e=Math.PI/2/t;for(let r=0;r<=t;r++){let o=r*e,n=Math.cos(o),i=Math.sin(o),a=Math.max(1,r*4),c=Math.PI*2/a;for(let f=0;f<a;f++){let l=f*c,h=i*Math.sin(l),m=i*Math.cos(l);s.push({x:h,y:n,z:m}),r<t&&s.push({x:h,y:-n,z:m})}a+=4}return s}};var ze=class{static assignUVs(t,s){let{faceMaterials:e,faceNameIndices:r,faceVertUs:o,faceVertVs:n}=s,i=[],a=[],c=[],f=t.materials.materials;for(let l=0;l<f.length;l++){let h=f[l],m=0,u=1,v=1;if(h.map||h.normalMap||h.roughnessMap||h.metalnessMap||h.emissiveMap){let p=t.voxChunk.size[0],A=t.voxChunk.size[1],F=t.voxChunk.size[2];h.mapTransform.uscale===-1&&(u=1/Math.max(p,A,F)),h.mapTransform.vscale===-1&&(v=1/Math.max(p,A,F)),(h.map&&h.map.cube||h.normalMap&&h.normalMap.cube||h.roughnessMap&&h.roughnessMap.cube||h.metalnessMap&&h.metalnessMap.cube||h.emissiveMap&&h.emissiveMap.cube)&&(m=1,u=u/4,v=v/2)}i.push(m),a.push(u),c.push(v)}for(let l=0,h=t.faceCount;l<h;l++){let m=e[l],u=i[m],v=a[m],p=c[m],A=As[r[l]],F=l*4,g=o[F+A.order[0]],V=n[F+A.order[0]],x=o[F+A.order[1]],_=n[F+A.order[1]],N=o[F+A.order[2]],d=n[F+A.order[2]],M=o[F+A.order[3]],z=n[F+A.order[3]],C=F+A.order[0],y=F+A.order[1],O=F+A.order[2],E=F+A.order[3],Z=u*A.uo,B=u*A.vo,Y=A.ud*v,X=A.vd*p;o[C]=Z+(g+1e-4)*Y,n[C]=B+(V+1e-4)*X,o[y]=Z+(x+1e-4)*Y,n[y]=B+(_+.9999)*X,o[O]=Z+(N+.9999)*Y,n[O]=B+(d+.9999)*X,o[E]=Z+(M+.9999)*Y,n[E]=B+(z+1e-4)*X}}};var Xe=class{static combineColors(t,s){let{vertColorR:e,vertColorG:r,vertColorB:o,vertColorCount:n,faceVertColorR:i,faceVertColorG:a,faceVertColorB:c,faceVertLightR:f,faceVertLightG:l,faceVertLightB:h,faceVertIndices:m,faceMaterials:u,faceVertAO:v}=s,p=t.materials.materials,A=!!t.materials.find(x=>x.colors.length>1&&x.fade),F=Array(p.length).fill(!1);for(let x=0,_=p.length;x<_;x++)A&&p[x].colors.length>1&&p[x].fade&&(F[x]=!0);for(let x=0,_=t.faceCount;x<_;x++)if(F[u[x]])for(let d=0;d<4;d++){let M=0,z=0,C=0,y=0,O=x*4+d,E=m[O],Z=n[E];for(let Y=0;Y<Z;Y++){let X=E*6+Y;M+=e[X],z+=r[X],C+=o[X],y++}let B=1/y;i[O]=M*B,a[O]=z*B,c[O]=C*B}let g=t.ao||t.materials.find(function(x){return x.ao}),V=t.lights.length>0;if(g&&V)for(let x=0,_=t.faceCount;x<_;x++){let d=p[u[x]].ao||t.ao,M=d?d.color:null;for(let z=0;z<4;z++){let C=x*4+z,y=i[C],O=a[C],E=c[C],Z=M?M.r:y,B=M?M.g:O,Y=M?M.b:E,X=1-v[C];i[C]=y*f[C]*X+Z*(1-X),a[C]=O*l[C]*X+B*(1-X),c[C]=E*h[C]*X+Y*(1-X)}}else if(V&&!g)for(let x=0,_=t.faceCount;x<_;x++)for(let N=0;N<4;N++){let d=x*4+N;i[d]=i[d]*f[d],a[d]=a[d]*l[d],c[d]=c[d]*h[d]}else if(!V&&g)for(let x=0,_=t.faceCount;x<_;x++){let d=p[u[x]].ao||t.ao;if(!d)continue;let M=d.color;for(let z=0;z<4;z++){let C=x*4+z,y=i[C],O=a[C],E=c[C],Z=M?M.r:y,B=M?M.g:O,Y=M?M.b:E,X=1-v[C];i[C]=X*y+Z*(1-X),a[C]=X*O+B*(1-X),c[C]=X*E+Y*(1-X)}}}};var qe={filled:!1,lastVoxelAxis1:0,lastVoxelAxis2:0,maxVoxelAxis3:0,lastFaceIndex:0},$e={filled:!1,lastVoxelAxis1:0,lastVoxelAxis2:0,maxVoxelAxis3:0,lastFaceIndex:0},Ge={filled:!1,lastVoxelAxis1:0,lastVoxelAxis2:0,maxVoxelAxis3:0,lastFaceIndex:0},He={filled:!1,lastVoxelAxis1:0,lastVoxelAxis2:0,maxVoxelAxis3:0,lastFaceIndex:0},be=class{static simplify(t,s){if(!t.simplify)return;let e=function(){qe.filled=!1,$e.filled=!1,Ge.filled=!1,He.filled=!1},r=t.materials.materials,{faceCulled:o,faceNameIndices:n,vertX:i,vertY:a,vertZ:c,voxelXZYFaceIndices:f,voxelXYZFaceIndices:l,voxelYZXFaceIndices:h}=s;for(let m=f.length-t.faceCount,u=f.length;m<u;m++){let v=f[m],p=v&(1<<28)-1;if(o.get(p))continue;let A=v/(1<<28),F=A>>16&255,g=A>>8&255,V=A&255;switch(n[p]){case 0:this._mergeFaces(r,t,s,qe,p,F,g,V,i,c,a,0,1,2,3);break;case 1:this._mergeFaces(r,t,s,$e,p,F,g,V,i,c,a,0,1,2,3);break;case 4:this._mergeFaces(r,t,s,Ge,p,F,g,V,i,c,a,0,1,2,3);break;case 5:this._mergeFaces(r,t,s,He,p,F,g,V,i,c,a,0,1,2,3);break}}e();for(let m=l.length-t.faceCount,u=l.length;m<u;m++){let v=l[m],p=v&(1<<28)-1;if(o.get(p))continue;let A=v/(1<<28),F=A>>16&255,g=A>>8&255,V=A&255;switch(n[p]){case 0:this._mergeFaces(r,t,s,qe,p,F,g,V,i,a,c,1,2,3,0);break;case 1:this._mergeFaces(r,t,s,$e,p,F,g,V,i,a,c,3,0,1,2);break;case 2:this._mergeFaces(r,t,s,Ge,p,F,g,V,i,a,c,0,1,2,3);break;case 3:this._mergeFaces(r,t,s,He,p,F,g,V,i,a,c,2,3,0,1);break}}e();for(let m=h.length-t.faceCount,u=h.length;m<u;m++){let v=h[m],p=v&(1<<28)-1;if(o.get(p))continue;let A=v/(1<<28),F=A>>16&255,g=A>>8&255,V=A&255;switch(n[p]){case 2:this._mergeFaces(r,t,s,qe,p,F,g,V,a,c,i,1,2,3,0);break;case 3:this._mergeFaces(r,t,s,$e,p,F,g,V,a,c,i,1,2,3,0);break;case 4:this._mergeFaces(r,t,s,Ge,p,F,g,V,a,c,i,3,0,1,2);break;case 5:this._mergeFaces(r,t,s,He,p,F,g,V,a,c,i,1,2,3,0);break}}e()}static _mergeFaces(t,s,e,r,o,n,i,a,c,f,l,h,m,u,v){let{faceCulled:p,faceMaterials:A,vertX:F,vertY:g,vertZ:V,faceVertIndices:x,faceVertNormalX:_,faceVertNormalY:N,faceVertNormalZ:d,faceVertColorR:M,faceVertColorG:z,faceVertColorB:C,faceVertUs:y,faceVertVs:O,faceVertFlatNormalX:E,faceVertFlatNormalY:Z,faceVertFlatNormalZ:B,faceVertSmoothNormalX:Y,faceVertSmoothNormalY:X,faceVertSmoothNormalZ:R,faceVertBothNormalX:U,faceVertBothNormalY:L,faceVertBothNormalZ:q}=e,b=A[o],$=t[b];if(r.filled&&r.lastVoxelAxis1===n&&r.lastVoxelAxis2===i&&($.simplify===!0||$.simplify===null&&s.simplify===!0)&&p.get(o)===0){if(r.maxVoxelAxis3!==a-1){r.filled=!0,r.lastVoxelAxis1=n,r.lastVoxelAxis2=i,r.maxVoxelAxis3=a,r.lastFaceIndex=o;return}let w=o*4,G=r.lastFaceIndex,I=G*4;if(A[G]!==b)return;let P=_[w],K=N[w],H=d[w],j=_[w+1],tt=N[w+1],T=d[w+1],ot=_[w+2],nt=N[w+2],dt=d[w+2],ft=_[w+3],et=N[w+3],xt=d[w+3],ut=_[I],wt=N[I],gt=d[I],zt=_[I+1],Yt=N[I+1],Kt=d[I+1],Pt=_[I+2],jt=N[I+2],Dt=d[I+2],Rt=_[I+3],Lt=N[I+3],te=d[I+3];if(!(this._normalEquals(P,K,H,ut,wt,gt)&&this._normalEquals(j,tt,T,zt,Yt,Kt)&&this._normalEquals(ot,nt,dt,Pt,jt,Dt)&&this._normalEquals(ft,et,xt,Rt,Lt,te)))return;let Tt=M[w],vt=z[w],at=C[w],it=M[w+1],ct=z[w+1],Ft=C[w+1],Bt=M[w+2],kt=z[w+2],Ut=C[w+2],At=M[w+3],Xt=z[w+3],bt=C[w+3],ne=M[I],ae=z[I],_t=C[I],St=M[I+1],Ct=z[I+1],Ot=C[I+1],It=M[I+2],k=z[I+2],Q=C[I+2],W=M[I+3],st=z[I+3],ht=C[I+3];if(!(Tt===ne&&vt===ae&&at===_t&&it===St&&ct===Ct&&Ft===Ot&&Bt===It&&kt===k&&Ut===Q&&At===W&&Xt===st&&bt===ht))return;let pe=x[w+h],$t=x[w+m],Qt=x[w+u],Ze=x[w+v],Te=F[pe],ie=g[pe],ls=V[pe],Be=F[$t],Pe=g[$t],Re=V[$t],ce=x[I+h],We=x[I+m],Ke=x[I+u],Qe=x[I+v],fs=F[ce],hs=g[ce],ms=V[ce],Xs=Math.sqrt((Be-Te)*(Be-Te)+(Pe-ie)*(Pe-ie)+(Re-ls)*(Re-ls)),bs=Math.sqrt((Be-fs)*(Be-fs)+(Pe-hs)*(Pe-hs)+(Re-ms)*(Re-ms)),Et=Xs/bs;return Math.abs(c[We]-(1-Et)*c[$t]-Et*c[ce])<=1e-4&&Math.abs(f[We]-(1-Et)*f[$t]-Et*f[ce])<=1e-4&&Math.abs(l[We]-(1-Et)*l[$t]-Et*l[ce])<=1e-4&&Math.abs(c[Ke]-(1-Et)*c[Qt]-Et*c[Qe])<=1e-4&&Math.abs(f[Ke]-(1-Et)*f[Qt]-Et*f[Qe])<=1e-4&&Math.abs(l[Ke]-(1-Et)*l[Qt]-Et*l[Qe])<=1e-4?(x[I+m]=$t,x[I+u]=Qt,y[I+m]=y[w+m],O[I+m]=O[w+m],y[I+u]=y[w+u],O[I+u]=O[w+u],E[I+m]=E[w+m],Z[I+m]=Z[w+m],B[I+m]=B[w+m],E[I+u]=E[w+u],Z[I+u]=Z[w+u],B[I+u]=B[w+u],Y[I+m]=Y[w+m],X[I+m]=X[w+m],R[I+m]=R[w+m],Y[I+u]=Y[w+u],X[I+u]=X[w+u],R[I+u]=R[w+u],U[I+m]=U[w+m],L[I+m]=L[w+m],q[I+m]=q[w+m],U[I+u]=U[w+u],L[I+u]=L[w+u],q[I+u]=q[w+u],r.maxVoxelAxis3=a,p.set(o,1),s.nonCulledFaceCount--,!0):void 0}return r.filled=!0,r.lastVoxelAxis1=n,r.lastVoxelAxis2=i,r.maxVoxelAxis3=a,r.lastFaceIndex=o,!1}static _normalEquals(t,s,e,r,o,n){return Math.abs(t-r)<.01&&Math.abs(s-o)<.01&&Math.abs(e-n)<.01}};var Se=class{static alignFaceDiagonals(t,s){let e=.1*Math.min(t.scale.x,t.scale.y,t.scale.z);e*=e;let{faceCulled:r,faceVertIndices:o,vertX:n,vertY:i,vertZ:a,faceVertFlatNormalX:c,faceVertFlatNormalY:f,faceVertFlatNormalZ:l,faceVertSmoothNormalX:h,faceVertSmoothNormalY:m,faceVertSmoothNormalZ:u,faceVertBothNormalX:v,faceVertBothNormalY:p,faceVertBothNormalZ:A,faceVertUs:F,faceVertVs:g,faceVertColorR:V,faceVertColorG:x,faceVertColorB:_,faceVertNormalX:N,faceVertNormalY:d,faceVertNormalZ:M}=s;for(let z=0,C=t.faceCount;z<C;z++){if(r.get(z)===1)continue;let y=z*4,O=o[y],E=o[y+1],Z=o[y+2],B=o[y+3],Y=n[O],X=i[O],R=a[O],U=n[E],L=i[E],q=a[E],b=n[Z],$=i[Z],w=a[Z],G=n[B],I=i[B],P=a[B],K=(Y+b)/2,H=(X+$)/2,j=(R+w)/2,tt=(U-K)*(U-K)+(L-H)*(L-H)+(q-j)*(q-j),T=(G-K)*(G-K)+(I-H)*(I-H)+(P-j)*(P-j),ot=(U+G)/2,nt=(L+I)/2,dt=(q+P)/2,ft=(Y-ot)*(Y-ot)+(X-nt)*(X-nt)+(R-dt)*(R-dt),et=(b-ot)*(b-ot)+($-nt)*($-nt)+(w-dt)*(w-dt);if(tt<e||T<e)this._shiftFaceVertsAtOffset(y,o),this._shiftFaceVertsAtOffset(y,N),this._shiftFaceVertsAtOffset(y,d),this._shiftFaceVertsAtOffset(y,M),this._shiftFaceVertsAtOffset(y,c),this._shiftFaceVertsAtOffset(y,f),this._shiftFaceVertsAtOffset(y,l),this._shiftFaceVertsAtOffset(y,h),this._shiftFaceVertsAtOffset(y,m),this._shiftFaceVertsAtOffset(y,u),this._shiftFaceVertsAtOffset(y,v),this._shiftFaceVertsAtOffset(y,p),this._shiftFaceVertsAtOffset(y,A),this._shiftFaceVertsAtOffset(y,F),this._shiftFaceVertsAtOffset(y,g),this._shiftFaceVertsAtOffset(y,V),this._shiftFaceVertsAtOffset(y,x),this._shiftFaceVertsAtOffset(y,_);else if(!(ft<e||et<e)){let xt=this._getVertexSumInline(Y,X,R);for(;this._getVertexSumInline(U,L,q)<xt||this._getVertexSumInline(b,$,w)<xt||this._getVertexSumInline(G,I,P)<xt;){this._shiftFaceVertsAtOffset(y,o),this._shiftFaceVertsAtOffset(y,N),this._shiftFaceVertsAtOffset(y,d),this._shiftFaceVertsAtOffset(y,M),this._shiftFaceVertsAtOffset(y,c),this._shiftFaceVertsAtOffset(y,f),this._shiftFaceVertsAtOffset(y,l),this._shiftFaceVertsAtOffset(y,h),this._shiftFaceVertsAtOffset(y,m),this._shiftFaceVertsAtOffset(y,u),this._shiftFaceVertsAtOffset(y,v),this._shiftFaceVertsAtOffset(y,p),this._shiftFaceVertsAtOffset(y,A),this._shiftFaceVertsAtOffset(y,F),this._shiftFaceVertsAtOffset(y,g),this._shiftFaceVertsAtOffset(y,V),this._shiftFaceVertsAtOffset(y,x),this._shiftFaceVertsAtOffset(y,_);let ut=Y,wt=X,gt=R;Y=U,X=L,R=q,U=b,L=$,q=w,b=G,$=I,w=P,G=ut,I=wt,P=gt,xt=this._getVertexSumInline(Y,X,R)}}}}static _getVertexSumInline(t,s,e){return Math.abs(t)+Math.abs(s)+Math.abs(e)}static _shiftFaceVertsAtOffset(t,s){let e=s[t];s[t]=s[t+1],s[t+1]=s[t+2],s[t+2]=s[t+3],s[t+3]=e}};var cs=(S,t)=>S-t,Oe=class{set origin(t){this._origin=J.parse(t)}get origin(){return J.toString(this._origin)}set flatten(t){this._flatten=J.parse(t)}get flatten(){return J.toString(this._flatten)}set clamp(t){this._clamp=J.parse(t)}get clamp(){return J.toString(this._clamp)}set skip(t){this._skip=J.parse(t)}get skip(){return J.toString(this._skip)}set tile(t){this._tile=J.parse(t||" "),this._tile.x&&(this._tile=J.combine(this._tile,{nx:!0,px:!0})),this._tile.y&&(this._tile=J.combine(this._tile,{ny:!0,py:!0})),this._tile.z&&(this._tile=J.combine(this._tile,{nz:!0,pz:!0})),this._tile.x=!1,this._tile.y=!1,this._tile.z=!1}get tile(){return J.toString(this._tile)}set shape(t){if(this._shape=(t||"box").trim(),!["box","sphere","cylinder-x","cylinder-y","cylinder-z"].includes(this._shape))throw new Error(`SyntaxError Unrecognized shape ${this._shape}. Allowed are box, sphere, cylinder-x, cylinder-y and cylinder-z`)}get shape(){return this._shape}setAo(t){this._ao=t}get ao(){return this._ao}set aoSides(t){this._aoSides=J.parse(t)}get aoSides(){return J.toString(this._aoSides)}set aoSamples(t){this._aoSamples=Math.round(t)}get aoSamples(){return this._aoSamples}constructor(){this.name="main",this.lights=[],this.textures={},this.materials=new Fe,this.voxChunk=null,this.scale={x:1,y:1,z:1},this.rotation={x:0,y:0,z:0},this.position={x:0,y:0,z:0},this.resize=!1,this._origin=J.parse("x y z"),this._flatten=J.parse(""),this._clamp=J.parse(""),this._skip=J.parse(""),this._tile=J.parse(""),this._ao=void 0,this._aoSamples=50,this._aoSides=J.parse(""),this.shape="box",this.wireframe=!1,this.simplify=!0,this.triCount=0,this.octCount=0,this.octMissCount=0,this.faceCount=0,this.vertCount=0,this.nonCulledFaceCount=0}prepareForWrite(){this.lights.some(t=>t.size)&&(this.materials.materials[0].colors[0].count=1)}prepareForRender(t){let{tmpVertIndexLookup:s,tmpVoxelXZYFaceIndices:e,tmpVoxelXYZFaceIndices:r,tmpVoxelYZXFaceIndices:o}=t,{voxChunk:n}=this;this.prepareForWrite();let i=Jt.maximumDeformCount(this);this.faceCount=0,this.vertCount=0;let a=i>0,[c,f,l,h,m,u]=mt(n.size),v=this.materials.materials,p=pt(n.size[0]),A=pt(n.size[1]),F=pt(n.size[2]);for(let g=c;g<=f;g++)for(let V=l;V<=h;V++)for(let x=m;x<=u;x++){let _=n.getPaletteIndexAt(g,V,x);if(_===0)continue;let N=g+p,d=V+A,M=x+F,z=N<<16,C=M<<8,y=(z|C|d)*(1<<28),O=(z|d<<8|M)*(1<<28),E=(d<<16|C|N)*(1<<28);for(let Z=0,B=vs.length;Z<B;Z++){let Y=Vs[Z],X,R=g+Y[0],U=V+Y[1],L=x+Y[2];if(R<c||R>f||U<l||U>h||L<m||L>u?X=0:X=n.getPaletteIndexAt(R,U,L),this._createFace(n,t,v,g,V,x,p,A,F,_,X,Z,a,s)){let b=this.faceCount-1;e[b]=y+b,r[b]=O+b,o[b]=E+b}}}this.nonCulledFaceCount=this.faceCount,s.clear(),t.voxelXZYFaceIndices=e.slice(0,this.faceCount),t.voxelXYZFaceIndices=r.slice(0,this.faceCount),t.voxelYZXFaceIndices=o.slice(0,this.faceCount),t.voxelXZYFaceIndices.sort(cs),t.voxelXYZFaceIndices.sort(cs),t.voxelYZXFaceIndices.sort(cs),he.fixClampedLinks(this,t),Jt.changeShape(this,t,this._shape),Jt.deform(this,t,i),Jt.warpAndScatter(this,t),Me.calculateNormals(this,t),Ie.transformVertices(this,t),Ne.calculateLights(this,t),we.calculateAmbientOcclusion(this,t),Xe.combineColors(this,t),ze.assignUVs(this,t),be.simplify(this,t),Se.alignFaceDiagonals(this,t)}determineBoundsOffsetAndRescale(t,s){let e={bounds:null,offset:null,rescale:1},r,o,n,i,a,c,{vertX:f,vertY:l,vertZ:h}=s;if(t===xe||t===Gt){r=Number.POSITIVE_INFINITY,o=Number.POSITIVE_INFINITY,n=Number.POSITIVE_INFINITY,i=Number.NEGATIVE_INFINITY,a=Number.NEGATIVE_INFINITY,c=Number.NEGATIVE_INFINITY;for(let p=0,A=this.vertCount;p<A;p++){let F=f[p],g=l[p],V=h[p];F<r&&(r=F),g<o&&(o=g),V<n&&(n=V),F>i&&(i=F),g>a&&(a=g),V>c&&(c=V)}if(t===Gt){let[p,A,F,g,V,x]=mt(this.voxChunk.size),_=(A-p+1)/(A-p),N=(g-F+1)/(g-F),d=(x-V+1)/(x-V);e.rescale=Math.min(_,N,d)}}t||(r=this.bounds.minX,i=this.bounds.maxX+1,o=this.bounds.minY,a=this.bounds.maxY+1,n=this.bounds.minZ,c=this.bounds.maxZ+1);let m=-(r+i)/2,u=-(o+a)/2,v=-(n+c)/2;return this._origin.nx&&(m=-r),this._origin.px&&(m=-i),this._origin.ny&&(u=-o),this._origin.py&&(u=-a),this._origin.nz&&(v=-n),this._origin.pz&&(v=-c),e.bounds={minX:r,minY:o,minZ:n,maxX:i,maxY:a,maxZ:c},e.offset={x:m,y:u,z:v},e}_createFace(t,s,e,r,o,n,i,a,c,f,l,h,m,u){let v=t.colorForPaletteIndex(f),p=(v&4278190080)>>24,A=e[p];if(A.opacity===0)return!1;if(l!==0){let H=(t.colorForPaletteIndex(l)&4278190080)>>24;if(!e[H].isTransparent&&!A.wireframe)return!1;if(!(!A.isTransparent&&!A.wireframe)){if(!(A.isTransparent&&!A.wireframe&&l!==0&&e[(t.colorForPaletteIndex(l)&4278190080)>>24].wireframe))return!1}}let F=this._isFacePlanar(A,r,o,n,h,A._flatten,this._flatten),g=this._isFacePlanar(A,r,o,n,h,A._clamp,this._clamp);if(this._isFacePlanar(A,r,o,n,h,A._skip,this._skip))return!1;let{faceVertIndices:x,faceVertColorR:_,faceVertColorG:N,faceVertColorB:d,faceFlattened:M,faceClamped:z,faceSmooth:C,faceCulled:y,faceMaterials:O,faceNameIndices:E,faceVertUs:Z,faceVertVs:B}=s,{faceCount:Y}=this,X=Y*4,R=(v&255)/255,U=((v&65280)>>8)/255,L=((v&16711680)>>16)/255;x[X]=this._createVertex(s,A,r,o,n,R,U,L,i,a,c,h,0,F,g,u),x[X+1]=this._createVertex(s,A,r,o,n,R,U,L,i,a,c,h,1,F,g,u),x[X+2]=this._createVertex(s,A,r,o,n,R,U,L,i,a,c,h,2,F,g,u),x[X+3]=this._createVertex(s,A,r,o,n,R,U,L,i,a,c,h,3,F,g,u);for(let H=0;H<4;H++)_[X+H]=R,N[X+H]=U,d[X+H]=L;M.set(Y,F?1:0),z.set(Y,g?1:0),C.set(Y,0),y.set(Y,0),O[Y]=p,E[Y]=h;let q=ys[h],b=q[0],$=q[1],w=r+i,G=o+a,I=n+c,P=w*b[0]+G*b[1]+I*b[2],K=w*$[0]+G*$[1]+I*$[2];for(let H=0;H<4;H++)Z[X+H]=P,B[X+H]=K;return m&&he.linkVertices(this,s,Y),this.faceCount++,!0}_createVertex(t,s,e,r,o,n,i,a,c,f,l,h,m,u,v,p){let A=Fs[h][m],F=e+A[0],g=r+A[1],V=o+A[2],x=F+c<<20|g+f<<10|V+l,{_clamp:_,_flatten:N}=this,{vertDeformCount:d,vertDeformDamping:M,vertDeformStrength:z,vertWarpAmplitude:C,vertWarpFrequency:y,vertScatter:O,vertX:E,vertY:Z,vertZ:B,vertLinkCounts:Y,vertFullyClamped:X,vertRing:R,vertClampedX:U,vertClampedY:L,vertClampedZ:q,vertColorR:b,vertColorG:$,vertColorB:w,vertColorCount:G,vertFlattenedX:I,vertFlattenedY:P,vertFlattenedZ:K}=t,{deform:H,warp:j,scatter:tt}=s,T;if(p.has(x)?(T=p.get(x),H?d[T]!==0&&this._getDeformIntegral(s.deform)<this._getDeformIntegralAtVertex(t,T)&&(z[T]=H.strength,M[T]=H.damping,d[T]=H.count):(d[T]=0,M[T]=0,z[T]=0),j?C[T]!==0&&(j.amplitude<C[T]||j.amplitude===C[T]&&j.frequency>y[T])&&(C[T]=j.amplitude,y[T]=j.frequency):(C[T]=0,y[T]=0),tt?O[T]!==0&&Math.abs(tt)<Math.abs(O[T])&&(O[T]=tt):O[T]=0):(T=this.vertCount,p.set(x,T),E[T]=F,Z[T]=g,B[T]=V,H?(M[T]=H.damping,d[T]=H.count,z[T]=H.strength,Y[T]=0,X.set(T,0)):d[T]=0,j?(C[T]=j.amplitude,y[T]=j.frequency):C[T]=0,tt?O[T]=tt:O[T]=0,G[T]=0,R[T]=0,U.set(T,0),L.set(T,0),q.set(T,0),I.set(T,0),P.set(T,0),K.set(T,0)),this._setIsVertexPlanar(s,F,g,V,s._flatten,N,I,P,K,T),this._setIsVertexPlanar(s,F,g,V,s._clamp,_,U,L,q,T),s.fade){let ot=G[T],nt=T*6;b[nt+ot]=n,$[nt+ot]=i,w[nt+ot]=a,G[T]++}return this.vertCount++,T}_getDeformIntegral(t){return t.damping===1?t.strength*(t.count+1):t.strength*(1-Math.pow(t.damping,t.count+1))/(1-t.damping)}_getDeformIntegralAtVertex(t,s){let{vertDeformDamping:e,vertDeformStrength:r,vertDeformCount:o}=t,n=e[s],i=o[s],a=r[s];return n===1?a*(i+1):a*(1-Math.pow(n,i+1))/(1-n)}_isFacePlanar(t,s,e,r,o,n,i){let a=n,c=t.bounds;if(a||(a=i,c=this.bounds),!a)return!1;switch(o){case 0:return a.x||a.nx&&s===c.minX;case 1:return a.x||a.px&&s===c.maxX;case 2:return a.y||a.ny&&e===c.minY;case 3:return a.y||a.py&&e===c.maxY;case 4:return a.z||a.nz&&r===c.minZ;case 5:return a.z||a.pz&&r===c.maxZ;default:return!1}}_setIsVertexPlanar(t,s,e,r,o,n,i,a,c,f){let l=o,h=t.bounds;l||(l=n,h=this.bounds),l?(i.set(f,l.x||l.nx&&s<h.minX+.5||l.px&&s>h.maxX+.5?1:i.get(f)|0),a.set(f,l.y||l.ny&&e<h.minY+.5||l.py&&e>h.maxY+.5?1:a.get(f)|0),c.set(f,l.z||l.nz&&r<h.minZ+.5||l.pz&&r>h.maxZ+.5?1:c.get(f)|0)):(i.set(f,i.get(f)|0),a.set(f,a.get(f)|0),c.set(f,c.get(f)|0))}};var Ee=class{constructor(t,s,e,r,o,n,i){this.color=t,this.strength=s,this.direction=e,this.position=r,this.distance=o,this.size=n,this.detail=i}};var ue=class{static readFromString(t){let s=this._parse(t);return this._validateModel(s),this._createModel(s)}static _parse(t){let s={linecontinuation:/_\\s*[\\r\\n]/gm,modelparts:new RegExp(/\\s*(\\/\\/(.*?)\\r?\\n)/.source+"|"+/\\s*(texture|light|model|material|voxels)\\s+/.source+"|"+/\\s*([^=,\\r\\n]+=\\s*data:image.*?base64,.*$)\\s*/.source+"|"+/\\s*([^=,\\r\\n]+=[^\\r\\n=;,/]+)\\s*/.source+"|"+/\\s*([A-Za-z ()\\d -]+)\\s*/.source,"gm")},e={lights:[],textures:[],materials:[]},r=e,o=null;return Array.from(t.replaceAll(s.linecontinuation," ").matchAll(s.modelparts),i=>i[0].trim()).filter(i=>i).forEach(function(i){if(!i.startsWith("//"))if(i==="texture")r={id:"<no-name>",cube:!1},e.textures.push(r);else if(i==="light")r={color:"#FFF"},e.lights.push(r);else if(i==="model")r=e;else if(i==="material")r={},e.materials.push(r);else if(i==="voxels")r=e,o="";else if(o!==null)o+=i.replace(/\\s/g,"");else{let a=i.indexOf("=");if(a===-1)throw new Error(`SyntaxError: Invalid definition \'${i}\'.`);let c=i.substring(0,a).trim().toLowerCase(),f=i.substring(a+1).trim();r[c]=f}},this),e.voxels=o,e}static _createModel(t){let s=new Oe;return s.size=this._parseXYZInt("size",t.size,null,!0),s.scale=this._parseXYZFloat("scale",t.scale,"1",!0),s.rotation=this._parseXYZFloat("rotation",t.rotation,"0 0 0",!1),s.position=this._parseXYZFloat("position",t.position,"0 0 0",!1),s.simplify=t.simplify!=="false",t.resize===xe?s.resize=xe:t.resize===Gt?s.resize=Gt:t.resize?s.resize=null:t.autoresize==="true"&&(s.resize=Gt),s.shape=t.shape,s.wireframe=t.wireframe==="true"||!1,s.origin=t.origin||"x y z",s.flatten=t.flatten,s.clamp=t.clamp,s.skip=t.skip,s.tile=t.tile,s.setAo(this._parseAo(t.ao)),s.aoSides=t.aosides,s.aoSamples=parseInt(t.aosamples||50,10),s.data=this._parseVertexData(t.data,"model"),s.shell=this._parseShell(t.shell),t.lights.some(e=>e.size)&&s.materials.createMaterial(Le,Ue,1,0,!1,!1,1,0,!1,1,!1,Nt,"#FFF",0,!1,null,null,null,null,null,null,null,null,-1,-1,0,0,0).addColorHEX("#FFFFFF"),t.lights.forEach(function(e){this._createLight(s,e)},this),t.textures.forEach(function(e){this._createTexture(s,e)},this),t.materials.forEach(function(e){this._createMaterial(s,e)},this),s.colors={},s.materials.forEach(function(e){e.colors.forEach(function(r){s.colors[r.id]=r})}),this._resolveShellColors(s.shell,s),s.materials.forEach(function(e){this._resolveShellColors(e.shell,s)},this),this._createVoxels(s,t.voxels),s}static _createLight(t,s){s.color||(s.color="#FFF 1"),s.color.startsWith("#")||(s.color="#FFF "+s.color),s.strength=parseFloat(s.color.split(" ")[1]||1),s.color=rt.fromHex(s.color.split(" ")[0]),s.direction=this._parseXYZFloat("direction",s.direction,null,!1),s.position=this._parseXYZFloat("position",s.position,null,!1),s.distance=parseFloat(s.distance||0),s.size=Math.max(0,parseFloat(s.size||0)),s.detail=Math.min(3,Math.max(0,parseInt(s.detail||1,10)));let e=new Ee(s.color,s.strength,s.direction,s.position,s.distance,s.size,s.detail);t.lights.push(e)}static _createTexture(t,s){s.cube=s.cube==="true"||!1,t.textures[s.id]=s}static _createMaterial(t,s){let e=Ue;s.lighting===de&&(e=de),s.lighting===ee&&(e=ee),s.lighting===se&&(e=se),s.emissive||(s.emissivemap?s.emissive="#FFF 1":s.emissive="#000 0"),s.emissive.startsWith("#")||(s.emissive="#FFF "+s.emissive),s.emissiveColor=s.emissive.split(" ")[0],s.emissiveIntensity=s.emissive.split(" ")[1]||1,s.ao&&!s.ao.startsWith("#")&&(s.ao="#000 "+s.ao),s.maptransform=s.maptransform||"";let r=null;t.simplify&&s.simplify==="false"&&(r=!1),!t.simplify&&s.simplify==="true"&&(r=!0);let o=t.materials.createMaterial(s.type||le,e,parseFloat(s.roughness||(s.roughnessmap,1)),parseFloat(s.metalness||(s.metalnessmap?1:0)),s.fade==="true"||!1,r,parseFloat(s.opacity||1),parseFloat(s.alphatest||0),s.transparent==="true"||!1,parseFloat(s.refractionratio||.9),s.wireframe==="true"||!1,s.side,s.emissiveColor,s.emissiveIntensity,s.fog!=="false",s.map?t.textures[s.map]:null,s.normalmap?t.textures[s.normalmap]:null,s.roughnessmap?t.textures[s.roughnessmap]:null,s.metalnessmap?t.textures[s.metalnessmap]:null,s.emissivemap?t.textures[s.emissivemap]:null,s.matcap?t.textures[s.matcap]:null,s.reflectionmap?t.textures[s.reflectionmap]:null,s.refractionmap?t.textures[s.refractionmap]:null,parseFloat(s.maptransform.split(" ")[0]||-1),parseFloat(s.maptransform.split(" ")[1]||-1),parseFloat(s.maptransform.split(" ")[2]||0),parseFloat(s.maptransform.split(" ")[3]||0),parseFloat(s.maptransform.split(" ")[4]||0));s.deform&&o.setDeform(parseFloat(s.deform.split(" ")[0]),parseFloat(s.deform.split(" ")[1]||1),parseFloat(s.deform.split(" ")[2]||1)),s.warp&&o.setWarp(parseFloat(s.warp.split(" ")[0]),parseFloat(s.warp.split(" ")[1]||1)),s.scatter&&(o.scatter=parseFloat(s.scatter)),o.flatten=s.flatten,o.clamp=s.clamp,o.skip=s.skip,o.setAo(this._parseAo(s.ao)),o.shell=this._parseShell(s.shell),o.lights=s.lights!=="false",o.data=this._parseVertexData(s.data,"material"),this._compareVertexData(t.data,o.data);let n=/\\s*\\(\\s*(\\d+)\\s*\\)\\s*/g,i=/([A-Z][a-z]*)\\s*(\\(\\d+\\))?[:]\\s*(#[a-fA-F0-9]*)\\s*/g;s.colors=s.colors.replace(n,"($1)"),s.colors=s.colors.replace(i,"$1$2:$3 "),s.colors.split(" ").filter(c=>c).forEach(function(c){let f=c.split(":")[0],l=null;f.includes("(")&&(l=Number(f.split("(")[1].replace(")","")),f=f.split("(")[0]);let h=c.split(":")[1];if(!o.colors[f]){if(h=o.addColor(rt.fromHex(h)),!/^[A-Z][a-z]*$/.test(f))throw new Error(`SyntaxError: Invalid color ID \'${f}\'`);h.id=f,h.exId=l}},this)}static _createVoxels(t,s){let e=t.colors,r=null,o=[];if(s.matchAll)o=s.matchAll(/[0-9]+|[A-Z][a-z]*|-+|[()]/g);else{let h=/[0-9]+|[A-Z][a-z]*|-+|[()]/g,m;for(;(m=h.exec(s))!==null;)o.push(m);o=o[Symbol.iterator]()}let n=this._unpackRle(o),i=t.size.x*t.size.y*t.size.z,a=0,c=t.voxChunk=new Vt([t.size.x,t.size.y,t.size.z]);for(let h=0;h<n.length;h++)a+=n[h][1];if(a!==i)throw new Error(`SyntaxError: The specified size is ${t.size.x} x ${t.size.y} x ${t.size.z} (= ${i} voxels) but the voxel matrix contains ${a} voxels.`);let f={minx:0,miny:0,minz:0,maxx:t.size.x-1,maxy:t.size.y-1,maxz:t.size.z-1,x:0,y:0,z:0};t.bounds=new re;let l=0;for(let h=0;h<n.length;h++){let m=null;n[h][0]!=="-"&&(m=e[n[h][0]],l=t.materials.materials.findIndex(u=>u.colors.includes(m)),m||(r===null&&(r=t.materials.createMaterial(le,Ue,.5,0,!1,1,!1)),m=rt.fromHex("#FF00FF"),m.id=n[h][0],r.addColor(m),e[n[h][0]]=m)),this._setVoxels(t,m,n[h][1],f,c,l)}}static _parseAo(t){let s;if(t){t.startsWith("#")||(t="#000 "+t);let e=rt.fromHex(t.split(" ")[0]),r=Math.abs(parseFloat(t.split(" ")[1]||1)),o=parseFloat(t.split(" ")[2]||1),n=parseFloat(t.split(" ")[3]||70);n=Math.max(0,Math.min(90,Math.round(n))),s={color:e,maxDistance:r,strength:o,angle:n}}return s}static _parseShell(t){let s,e=!1;if(t&&(s=[],t!=="none")){let r=t.split(/\\s+/);if(r.length<2||r.length%2!==0)e=!0;else for(let o=0;o<r.length/2;o++){let n=r[o*2+0],i=r[o*2+1];if(!/^[A-Z][a-z]*$/.test(n)||!/^([-+]?[0-9]*\\.?[0-9]+)*$/.test(i)){e=!0;break}else s.push({colorId:r[o*2],distance:r[o*2+1]})}}if(e)throw new Error(`SyntaxError: shell \'${t}\' must be \'none\' or one or more color ID\'s and distances, e.g. P 0.2 Q 0.4`);return s&&(s=s.sort(function(r,o){return r.distance-o.distance})),s}static _resolveShellColors(t,s){!t||t.length===0||t.forEach(function(e){if(e.color=s.colors[e.colorId],!e.color)throw new Error(`SyntaxError: shell color ID \'${e.colorId}\' is not a known color`)},this)}static _parseVertexData(t,s){if(t){let e=[],r=t.split(/\\s+/),o=null;for(let i=0;i<r.length;i++){let a=r[i];if(isNaN(a))o={name:a,values:[]},e.push(o);else if(o)o.values.push(parseFloat(a));else break}let n=e.length===0;for(let i=0;i<e.length;i++)n=n||e[i].values.length===0||e[i].values.length>=4;if(n)throw new Error(`SyntaxError: The data property \'${e.data}\' of the ${s} should consist of one or more names, each followed by 1 to 4 float (default) values.`);return e}}static _compareVertexData(t,s){let e=!1;try{if((t||s)&&s){e=s&&!t,e=e||t.length!==s.length;for(let r=0;r<t.length;r++)e=e||t[r].name!==s[r].name,e=e||t[r].values.length!==s[r].values.length}}catch(r){e=!0}if(e)throw new Error("SyntaxError: The data property of the material should consist of identical names and number of values as the model data property.")}static _parseXYZInt(t,s,e,r){let o=this._parseXYZFloat(t,s,e,r);return{x:Math.trunc(o.x),y:Math.trunc(o.y),z:Math.trunc(o.z)}}static _parseXYZFloat(t,s,e,r){if(!s&&e&&(s=e),!s)return null;let o=s.split(/[\\s/]+/);if(o.length===1&&r&&(o.push(o[0]),o.push(o[0])),o.length!==3)throw new Error(`SyntaxError: \'${t}\' must have three values.`);if(o={x:parseFloat(o[0]),y:parseFloat(o[1]),z:parseFloat(o[2])},Number.isNaN(o.x)||Number.isNaN(o.y)||Number.isNaN(o.z))throw new Error(`SyntaxError: Invalid value \'${s}\' for ${t}\'.`);return o}static _unpackRle(t){let s=[],e=1,r=t.next();for(;!r.done;){let o=r.value[0];if(o[0]>="0"&&o[0]<="9")e=parseInt(o,10);else if(o==="("){let n=this._unpackRle(t);for(let i=0;i<e;i++)Array.prototype.push.apply(s,n);e=1}else{if(o===")")return s;o.length>1&&o[0]>="A"&&o[0]<="Z"&&o[1]===o[0]?(e>1?(s.push([o[0],e]),s.push([o[0],o.length-1])):s.push([o[0],o.length]),e=1):o.length>1&&o[0]==="-"&&o[1]==="-"?(e>1?(s.push(["-",e]),s.push(["-",o.length-1])):s.push(["-",o.length]),e=1):(s.push([o,e]),e=1)}r=t.next()}return s}static _setVoxels(t,s,e,r,o,n){let i=t.materials.materials[n];for(;e-- >0;){if(s){let a=Math.floor(s.r*255),c=Math.floor(s.g*255),f=Math.floor(s.b*255),h=Is(a,c,f,n),m=r.x-pt(t.size.x),u=r.y-pt(t.size.y),v=r.z-pt(t.size.z);t.bounds.set(m,u,v),i.bounds.set(m,u,v),o.setColorAt(m,u,v,h)}r.x++,r.x>r.maxx&&(r.x=r.minx,r.y++),r.y>r.maxy&&(r.y=r.miny,r.z++)}}static _validateModel(t){let s=["size","materials","textures","lights","voxels"],e=["name","shape","scale","rotation","position","simplify","origin","autoresize","resize","flatten","clamp","skip","tile","ao","aosides","aosamples","shell","wireframe","data"];this._validateProperties(t,s,e,"model"),t.lights.forEach(function(r){this._validateLight(r)},this),t.textures.forEach(function(r){this._validateTexture(r)},this),t.materials.forEach(function(r){this._validateMaterial(r)},this)}static _validateLight(t){let s=["color"],e=["direction","position","distance","size","detail"];if(this._validateProperties(t,s,e,"light"),t.direction&&t.position)throw new Error("SyntaxError: Light cannot have both a direction and a position.");if(t.direction&&t.distance)throw new Error("SyntaxError: Light cannot have both a direction and a distance.");if(!t.position&&(t.size||t.detail))throw new Error("SyntaxError: Light with no position cannot have size or detail.")}static _validateTexture(t){let s=["id","image"],e=["cube"];this._validateProperties(t,s,e,"texture")}static _validateMaterial(t){let s=["colors"],e=["type","lighting","fade","simplify","roughness","metalness","emissive","fog","opacity","alphatest","transparent","refractionratio","deform","warp","scatter","flatten","clamp","skip","ao","lights","wireframe","side","shell","map","normalmap","roughnessmap","metalnessmap","emissivemap","matcap","reflectionmap","refractionmap","maptransform","data"];this._validateProperties(t,s,e,"material")}static _validateProperties(t,s,e,r){for(let o of s)if(!t[o])throw new Error("SyntaxError: "+r+\' is missing mandatory property "\'+o+\'".\');for(let o in t)if(!s.includes(o)&&!e.includes(o))throw new Error("SyntaxError: "+r+\' has unrecognized property "\'+o+\'".\')}};var Mt=new Map,Wt=class{static generate(t,s){t.prepareForRender(s);let{nonCulledFaceCount:e}=t,r={materials:[],groups:[],indices:Array(e*6),indicesIndex:0,maxIndex:-1,positions:new Float32Array(e*4*3),normals:new Float32Array(e*4*3),colors:new Float32Array(e*4*3),uvs:new Float32Array(e*4*2),data:null};return t.materials.baseMaterials.forEach(function(o){o.index=r.materials.length,r.materials.push(Wt._generateMaterial(o,t))},this),Mt.clear(),Wt._generateAll(t,r,s),r}static _generateMaterial(t,s){let e={type:t.type,roughness:t.roughness,metalness:t.metalness,opacity:t.opacity,alphaTest:t.alphaTest,transparent:t.isTransparent,refractionRatio:t.refractionRatio,wireframe:t.wireframe||s.wireframe,fog:t.fog,vertexColors:!0,side:t.side===Ht?Ht:Nt};return t.type!==ke&&(e.color="#FFF"),t.emissive&&(e.emissive=t.emissive.color.toString(),e.emissiveIntensity=t.emissive.intensity),t.map&&(e.map={image:t.map.image,uscale:t.mapTransform.uscale===-1?1:t.mapTransform.uscale,vscale:t.mapTransform.vscale===-1?1:t.mapTransform.vscale,uoffset:t.mapTransform.uoffset,voffset:t.mapTransform.voffset,rotation:t.mapTransform.rotation}),t.normalMap&&(e.normalMap={image:t.normalMap.image,uscale:t.mapTransform.uscale===-1?1:t.mapTransform.uscale,vscale:t.mapTransform.vscale===-1?1:t.mapTransform.vscale,uoffset:t.mapTransform.uoffset,voffset:t.mapTransform.voffset,rotation:t.mapTransform.rotation}),t.roughnessMap&&(e.roughnessMap={image:t.roughnessMap.image,uscale:t.mapTransform.uscale===-1?1:t.mapTransform.uscale,vscale:t.mapTransform.vscale===-1?1:t.mapTransform.vscale,uoffset:t.mapTransform.uoffset,voffset:t.mapTransform.voffset,rotation:t.mapTransform.rotation}),t.metalnessMap&&(e.metalnessMap={image:t.metalnessMap.image,uscale:t.mapTransform.uscale===-1?1:t.mapTransform.uscale,vscale:t.mapTransform.vscale===-1?1:t.mapTransform.vscale,uoffset:t.mapTransform.uoffset,voffset:t.mapTransform.voffset,rotation:t.mapTransform.rotation}),t.emissiveMap&&(e.emissiveMap={image:t.emissiveMap.image,uscale:t.mapTransform.uscale===-1?1:t.mapTransform.uscale,vscale:t.mapTransform.vscale===-1?1:t.mapTransform.vscale,uoffset:t.mapTransform.uoffset,voffset:t.mapTransform.voffset,rotation:t.mapTransform.rotation}),t.matcap&&(e.matcap={image:t.matcap.image}),t.reflectionMap&&(e.reflectionMap={image:t.reflectionMap.image}),t.refractionMap&&(e.refractionMap={image:t.refractionMap.image}),e}static _generateAll(t,s,e){let r=t.materials.materials,{faceMaterials:o,faceCulled:n}=e;t.materials.baseMaterials.forEach(function(i){let a=s.indicesIndex;for(let f=0,l=t.faceCount;f<l;f++)r[o[f]]._baseMaterial===i&&n.get(f)===0&&Wt._generateFace(t,e,f,s);let c=s.indicesIndex;s.groups.push({start:a,count:c-a,materialIndex:i.index})},this),console.log(Mt),s.indices.length=s.indicesIndex,s.positions=new Float32Array(s.positions,0,s.indicesIndex*3),s.normals=new Float32Array(s.normals,0,s.indicesIndex*3),s.colors=new Float32Array(s.colors,0,s.indicesIndex*3),s.uvs=new Float32Array(s.uvs,0,s.indicesIndex*2)}static _generateFace(t,s,e,r){let{faceVertIndices:o,faceVertNormalX:n,faceVertNormalY:i,faceVertNormalZ:a,vertX:c,vertY:f,vertZ:l,faceVertColorR:h,faceVertColorG:m,faceVertColorB:u,faceVertUs:v,faceVertVs:p,faceMaterials:A,faceSmooth:F}=s,V=t.materials.materials[A[e]],x=o[e*4],_=o[e*4+1],N=o[e*4+2],d=o[e*4+3],M=c[x],z=f[x],C=l[x],y=c[_],O=f[_],E=l[_],Z=c[N],B=f[N],Y=l[N],X=c[d],R=f[d],U=l[d],L=n[e*4],q=i[e*4],b=a[e*4],$=n[e*4+1],w=i[e*4+1],G=a[e*4+1],I=n[e*4+2],P=i[e*4+2],K=a[e*4+2],H=n[e*4+3],j=i[e*4+3],tt=a[e*4+3],T=h[e*4],ot=m[e*4],nt=u[e*4],dt=h[e*4+1],ft=m[e*4+1],et=u[e*4+1],xt=h[e*4+2],ut=m[e*4+2],wt=u[e*4+2],gt=h[e*4+3],zt=m[e*4+3],Yt=u[e*4+3],Kt=v[e*4],Pt=p[e*4],jt=v[e*4+1],Dt=p[e*4+1],Rt=v[e*4+2],Lt=p[e*4+2],te=v[e*4+3],Zt=p[e*4+3];if(V.side===fe){let k,Q,W;k=M,Q=z,W=C,M=Z,z=B,C=Y,Z=k,B=Q,Y=W,k=L,Q=q,W=b,L=I,q=P,b=K,I=k,P=Q,K=W,k=T,Q=ot,W=nt,T=xt,ot=ut,nt=wt,xt=k,ut=Q,wt=W,k=Kt,Q=Pt,Kt=Rt,Pt=Lt,Rt=k,Lt=Q}let Tt=F.get(e)===1;if(!(V.lighting===ee||V.lighting===se&&Tt)){let k=I+$+L,Q=P+w+q,W=K+G+b,st=L+H+I,ht=q+j+P,qt=b+tt+K,pe=Math.sqrt(k*k+Q*Q+W*W),$t=Math.sqrt(st*st+ht*ht+qt*qt),Qt=1/pe,Ze=1/$t;if(k*=Qt,Q*=Qt,W*=Qt,st*=Ze,ht*=Ze,qt*=Ze,V.lighting===de){let Te=Math.sqrt(k*k+Q*Q+W*W)+Math.sqrt(st*st+ht*ht+qt*qt),ie=1/Te;k=st=(k+st)*ie,Q=ht=(Q+ht)*ie,W=qt=(W+qt)*ie}L=k,q=Q,b=W,$=k,w=Q,G=W,I=k,P=Q,K=W,H=st,j=ht,tt=qt}let vt=r.indices,at=r.positions,it=r.normals,ct=r.colors,Ft=r.uvs,Bt=M*3+z*13+C*23+L*37+q*41+b*59+T*61+ot*83+nt*89+Kt*98+Pt*103,kt=y*3+O*13+E*23+$*37+w*41+G*59+dt*61+ft*83+et*89+jt*98+Dt*103,Ut=Z*3+B*13+Y*23+I*37+P*41+K*59+xt*61+ut*83+wt*89+Rt*98+Lt*103,At=X*3+R*13+U*23+H*37+j*41+tt*59+gt*61+zt*83+Yt*89+te*98+Zt*103,Xt=Mt.has(Bt),bt=Mt.has(kt),ne=Mt.has(Ut),ae=Mt.has(At),_t,St,Ct,Ot;if(Xt)_t=Mt.get(Bt);else{_t=r.maxIndex+1;let k=_t*3,Q=k+1,W=k+2,st=_t*2,ht=st+1;r.maxIndex=_t,at[k]=M,at[Q]=z,at[W]=C,it[k]=L,it[Q]=q,it[W]=b,ct[k]=T,ct[Q]=ot,ct[W]=nt,Ft[st]=Kt,Ft[ht]=Pt,Mt.set(Bt,_t)}if(bt)St=Mt.get(kt);else{St=r.maxIndex+1;let k=St*3,Q=k+1,W=k+2,st=St*2,ht=st+1;r.maxIndex=St,at[k]=y,at[Q]=O,at[W]=E,it[k]=$,it[Q]=w,it[W]=G,ct[k]=dt,ct[Q]=ft,ct[W]=et,Ft[st]=jt,Ft[ht]=Dt,Mt.set(kt,St)}if(ne)Ct=Mt.get(Ut);else{Ct=r.maxIndex+1;let k=Ct*3,Q=k+1,W=k+2,st=Ct*2,ht=st+1;r.maxIndex=Ct,at[k]=Z,at[Q]=B,at[W]=Y,it[k]=I,it[Q]=P,it[W]=K,ct[k]=xt,ct[Q]=ut,ct[W]=wt,Ft[st]=Rt,Ft[ht]=Lt,Mt.set(Ut,Ct)}if(ae)Ot=Mt.get(At);else{Ot=r.maxIndex+1;let k=Ot*3,Q=k+1,W=k+2,st=Ot*2,ht=st+1;r.maxIndex=Ot,at[k]=X,at[Q]=R,at[W]=U,it[k]=H,it[Q]=j,it[W]=tt,ct[k]=gt,ct[Q]=zt,ct[W]=Yt,Ft[st]=te,Ft[ht]=Zt,Mt.set(At,Ot)}let It=r.indicesIndex;vt[It]=Ct,vt[It+1]=St,vt[It+2]=_t,vt[It+3]=_t,vt[It+4]=Ot,vt[It+5]=Ct,r.indicesIndex+=6}};var Ye=class{constructor(t){let s=Math.floor(t/8),e=t/4,r=Math.floor(e/8),o=e*4;this.tmpVertIndexLookup=new Map,this.vertX=new Float32Array(t),this.vertY=new Float32Array(t),this.vertZ=new Float32Array(t),this.vertTmpX=new Float32Array(t),this.vertTmpY=new Float32Array(t),this.vertTmpZ=new Float32Array(t),this.vertHasTmp=lt.create(new Uint8Array(s).buffer,1,0),this.vertColorR=new Float32Array(t*6),this.vertColorG=new Float32Array(t*6),this.vertColorB=new Float32Array(t*6),this.vertColorCount=new Uint8Array(t),this.vertSmoothNormalX=new Float32Array(t),this.vertSmoothNormalY=new Float32Array(t),this.vertSmoothNormalZ=new Float32Array(t),this.vertBothNormalX=new Float32Array(t),this.vertBothNormalY=new Float32Array(t),this.vertBothNormalZ=new Float32Array(t),this.vertFlattenedX=lt.create(new Uint8Array(s).buffer,1,0),this.vertFlattenedY=lt.create(new Uint8Array(s).buffer,1,0),this.vertFlattenedZ=lt.create(new Uint8Array(s).buffer,1,0),this.vertClampedX=lt.create(new Uint8Array(s).buffer,1,0),this.vertClampedY=lt.create(new Uint8Array(s).buffer,1,0),this.vertClampedZ=lt.create(new Uint8Array(s).buffer,1,0),this.vertFullyClamped=lt.create(new Uint8Array(s).buffer,1,0),this.vertDeformCount=new Uint8Array(t),this.vertDeformDamping=new Float32Array(t),this.vertDeformStrength=new Float32Array(t),this.vertWarpAmplitude=new Float32Array(t),this.vertWarpFrequency=new Float32Array(t),this.vertScatter=new Float32Array(t),this.vertRing=new Float32Array(t),this.vertNrOfClampedLinks=new Uint8Array(t),this.vertLinkCounts=new Uint8Array(t),this.vertLinkIndices=new Uint32Array(t*6),this.faceFlattened=lt.create(new Uint8Array(r).buffer,1,0),this.faceClamped=lt.create(new Uint8Array(r).buffer,1,0),this.faceSmooth=lt.create(new Uint8Array(r).buffer,1,0),this.faceEquidistant=lt.create(new Uint8Array(r).buffer,1,0),this.faceCulled=lt.create(new Uint8Array(r).buffer,1,0),this.faceNameIndices=new Uint8Array(e),this.faceMaterials=new Uint8Array(e),this.faceVertIndices=new Uint32Array(o),this.faceVertNormalX=new Float32Array(o),this.faceVertNormalY=new Float32Array(o),this.faceVertNormalZ=new Float32Array(o),this.faceVertFlatNormalX=new Float32Array(o),this.faceVertFlatNormalY=new Float32Array(o),this.faceVertFlatNormalZ=new Float32Array(o),this.faceVertSmoothNormalX=new Float32Array(o),this.faceVertSmoothNormalY=new Float32Array(o),this.faceVertSmoothNormalZ=new Float32Array(o),this.faceVertBothNormalX=new Float32Array(o),this.faceVertBothNormalY=new Float32Array(o),this.faceVertBothNormalZ=new Float32Array(o),this.faceVertColorR=new Float32Array(o),this.faceVertColorG=new Float32Array(o),this.faceVertColorB=new Float32Array(o),this.faceVertLightR=new Float32Array(o),this.faceVertLightG=new Float32Array(o),this.faceVertLightB=new Float32Array(o),this.faceVertAO=new Float32Array(o),this.faceVertUs=new Float32Array(o),this.faceVertVs=new Float32Array(o),this.tmpVoxelXZYFaceIndices=Array(e).fill(0),this.tmpVoxelXYZFaceIndices=Array(e).fill(0),this.tmpVoxelYZXFaceIndices=Array(e).fill(0),this.voxelXZYFaceIndices=null,this.voxelXYZFaceIndices=null,this.voxelYZXFaceIndices=null}clear(){this.tmpVertIndexLookup.clear(),this.vertX.fill(0),this.vertY.fill(0),this.vertZ.fill(0),this.vertTmpX.fill(0),this.vertTmpY.fill(0),this.vertTmpZ.fill(0),this.vertHasTmp.clear(),this.vertColorR.fill(0),this.vertColorG.fill(0),this.vertColorB.fill(0),this.vertColorCount.fill(0),this.vertSmoothNormalX.fill(0),this.vertSmoothNormalY.fill(0),this.vertSmoothNormalZ.fill(0),this.vertBothNormalX.fill(0),this.vertBothNormalY.fill(0),this.vertBothNormalZ.fill(0),this.vertFlattenedX.clear(),this.vertFlattenedY.clear(),this.vertFlattenedZ.clear(),this.vertClampedX.clear(),this.vertClampedY.clear(),this.vertClampedZ.clear(),this.vertFullyClamped.clear(),this.vertDeformCount.fill(0),this.vertDeformDamping.fill(0),this.vertDeformStrength.fill(0),this.vertWarpAmplitude.fill(0),this.vertWarpFrequency.fill(0),this.vertScatter.fill(0),this.vertRing.fill(0),this.vertNrOfClampedLinks.fill(0),this.vertLinkCounts.fill(0),this.vertLinkIndices.fill(0),this.faceFlattened.clear(),this.faceClamped.clear(),this.faceSmooth.clear(),this.faceEquidistant.clear(),this.faceCulled.clear(),this.faceNameIndices.fill(0),this.faceMaterials.fill(0),this.faceVertIndices.fill(0),this.faceVertNormalX.fill(0),this.faceVertNormalY.fill(0),this.faceVertNormalZ.fill(0),this.faceVertFlatNormalX.fill(0),this.faceVertFlatNormalY.fill(0),this.faceVertFlatNormalZ.fill(0),this.faceVertSmoothNormalX.fill(0),this.faceVertSmoothNormalY.fill(0),this.faceVertSmoothNormalZ.fill(0),this.faceVertBothNormalX.fill(0),this.faceVertBothNormalY.fill(0),this.faceVertBothNormalZ.fill(0),this.faceVertColorR.fill(0),this.faceVertColorG.fill(0),this.faceVertColorB.fill(0),this.faceVertLightR.fill(0),this.faceVertLightG.fill(0),this.faceVertLightB.fill(0),this.faceVertAO.fill(0),this.faceVertUs.fill(0),this.faceVertVs.fill(0),this.tmpVoxelXZYFaceIndices.length=0,this.tmpVoxelXYZFaceIndices.length=0,this.tmpVoxelYZXFaceIndices.length=0,this.voxelXZYFaceIndices=null,this.voxelXYZFaceIndices=null,this.voxelYZXFaceIndices=null}};var Ts=new Ye(1024*1024);onmessage=function(S){let t=Bs(S.data.svoxmodel);postMessage({svoxmesh:t,elementId:S.data.elementId,worker:S.data.worker})};function Bs(S){let t="model size=9,scale=0.05,material lighting=flat,colors=B:#FF8800 C:#FF0000 A:#FFFFFF,voxels 10B7-2(2B2-3C2-2B4-C2-)2B2-3C2-2B7-11B7-B-6(7A2-)7A-B7-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B2-C4-B-2(7A-C7A2C)7A-C7AC-7A-B2-C4-2B2-3C2-B3(-7A-C7AC)-7A-B2-3C2-2B2-C4-B-7A-C2(7AC-7A2C)7AC-7A-B2-C4-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B7-B-6(7A2-)7A-B7-11B7-2(2B2-3C2-2B2-C4-)2B2-3C2-2B7-10B",s="model size=9,scale=0.05,material lighting=flat,colors=A:#FFFFFF B:#FF8800 C:#FF0000,voxels 10B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-11B7-B-6(7A2-)7A-B7-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B3-C3-B-2(7A2-)7A-C7AC-2(7A2-)7A-B3-C3-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B7-B-6(7A2-)7A-B7-11B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-10B",e;(!S||S.trim()==="")&&(e={name:"ConfigError",message:"Model not found"},S=t);let r=null;try{r=ue.readFromString(S)}catch(n){e=n,r=ue.readFromString(s)}let o=Wt.generate(r,Ts);return o.error=e,o}\n');
  }

  // src/svox/workerpool.js
  var WorkerPool = class {
    constructor(resultHandler, resultCallback) {
      this._resultHandler = resultHandler;
      this._resultCallback = resultCallback;
      this._nrOfWorkers = window.navigator.hardwareConcurrency;
      this._workers = [];
      this._free = [];
      this._tasks = [];
    }
    executeTask(task) {
      if (this._workers.length < this._nrOfWorkers) {
        const worker = new Worker2();
        const _this = this;
        worker.onmessage = function(task2) {
          _this._free.push(event.data.worker);
          _this._processNextTask();
          _this._resultCallback.apply(_this._resultHandler, [event.data]);
        };
        this._free.push(this._workers.length);
        this._workers.push(worker);
      }
      this._tasks.push(task);
      this._processNextTask();
    }
    _processNextTask() {
      if (this._tasks.length > 0 && this._free.length > 0) {
        const task = this._tasks.shift();
        task.worker = this._free.shift();
        const worker = this._workers[task.worker];
        worker.postMessage(task);
      }
    }
  };

  // src/svox/svoxtothreemeshconverter.js
  var SvoxToThreeMeshConverter = class {
    static generate(model) {
      const materials = [];
      model.materials.forEach(function(material) {
        materials.push(SvoxToThreeMeshConverter._generateMaterial(material));
      }, this);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(model.positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(model.normals, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(model.colors, 3));
      if (model.uvs) {
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(model.uvs, 2));
      }
      if (model.data) {
        for (let d = 0; d < model.data.length; d++) {
          geometry.setAttribute(model.data[d].name, new THREE.Float32BufferAttribute(model.data[d].values, model.data[d].width));
        }
      }
      geometry.setIndex(model.indices);
      model.groups.forEach(function(group) {
        geometry.addGroup(group.start, group.count, group.materialIndex);
      }, this);
      geometry.computeBoundingBox();
      geometry.uvsNeedUpdate = true;
      const mesh = new THREE.Mesh(geometry, materials);
      return mesh;
    }
    static _generateMaterial(definition) {
      definition.reflectivity = (1 - definition.roughness) * (definition.metalness * 0.95 + 0.05);
      definition.shininess = Math.pow(10, 5 * Math.pow(1 - definition.roughness, 1.1)) * 0.1;
      switch (definition.side) {
        case "back":
          definition.side = THREE.BackSide;
          break;
        case "double":
          definition.side = THREE.DoubleSide;
          break;
        default:
          definition.side = THREE.FrontSide;
          break;
      }
      if (definition.map) {
        definition.map = SvoxToThreeMeshConverter._generateTexture(
          definition.map.image,
          THREE.sRGBEncoding,
          definition.map.uscale,
          definition.map.vscale,
          definition.map.uoffset,
          definition.map.voffset,
          definition.map.rotation
        );
      }
      if (definition.normalMap) {
        definition.normalMap = SvoxToThreeMeshConverter._generateTexture(
          definition.normalMap.image,
          THREE.LinearEncoding,
          definition.normalMap.uscale,
          definition.normalMap.vscale,
          definition.normalMap.uoffset,
          definition.normalMap.voffset,
          definition.normalMap.rotation
        );
      }
      if (definition.roughnessMap) {
        definition.roughnessMap = SvoxToThreeMeshConverter._generateTexture(
          definition.roughnessMap.image,
          THREE.LinearEncoding,
          definition.roughnessMap.uscale,
          definition.roughnessMap.vscale,
          definition.roughnessMap.uoffset,
          definition.roughnessMap.voffset,
          definition.roughnessMap.rotation
        );
      }
      if (definition.metalnessMap) {
        definition.metalnessMap = SvoxToThreeMeshConverter._generateTexture(
          definition.metalnessMap.image,
          THREE.LinearEncoding,
          definition.metalnessMap.uscale,
          definition.metalnessMap.vscale,
          definition.metalnessMap.uoffset,
          definition.metalnessMap.voffset,
          definition.metalnessMap.rotation
        );
      }
      if (definition.emissiveMap) {
        definition.emissiveMap = SvoxToThreeMeshConverter._generateTexture(
          definition.emissiveMap.image,
          THREE.sRGBEncoding,
          definition.emissiveMap.uscale,
          definition.emissiveMap.vscale,
          definition.emissiveMap.uoffset,
          definition.emissiveMap.voffset,
          definition.emissiveMap.rotation
        );
      }
      if (definition.matcap) {
        definition.matcap = SvoxToThreeMeshConverter._generateTexture(definition.matcap.image, THREE.sRGBEncoding);
      }
      if (definition.reflectionMap) {
        definition.envMap = new THREE.TextureLoader().load(definition.reflectionMap.image);
        definition.envMap.encoding = THREE.sRGBEncoding;
        definition.envMap.mapping = THREE.EquirectangularReflectionMapping;
        delete definition.reflectionMap;
      }
      if (definition.refractionMap) {
        definition.envMap = new THREE.TextureLoader().load(definition.refractionMap.image);
        definition.envMap.encoding = THREE.sRGBEncoding;
        definition.envMap.mapping = THREE.EquirectangularRefractionMapping;
        delete definition.refractionMap;
      }
      let material = null;
      const type = definition.type;
      delete definition.index;
      delete definition.type;
      switch (type) {
        case "standard":
          delete definition.reflectivity;
          delete definition.shininess;
          material = new THREE.MeshStandardMaterial(definition);
          break;
        case "basic":
          delete definition.roughness;
          delete definition.metalness;
          delete definition.shininess;
          delete definition.emissive;
          delete definition.emissiveIntensity;
          delete definition.roughnessMap;
          delete definition.metalnessMap;
          delete definition.emissiveMap;
          material = new THREE.MeshBasicMaterial(definition);
          break;
        case "lambert":
          delete definition.roughness;
          delete definition.metalness;
          delete definition.shininess;
          delete definition.roughnessMap;
          delete definition.metalnessMap;
          material = new THREE.MeshLambertMaterial(definition);
          break;
        case "phong":
          delete definition.roughness;
          delete definition.metalness;
          delete definition.roughnessMap;
          delete definition.metalnessMap;
          material = new THREE.MeshPhongMaterial(definition);
          break;
        case "matcap":
          delete definition.roughness;
          delete definition.metalness;
          delete definition.wireframe;
          delete definition.reflectivity;
          delete definition.shininess;
          delete definition.emissive;
          delete definition.emissiveIntensity;
          delete definition.envMap;
          delete definition.roughnessMap;
          delete definition.metalnessMap;
          delete definition.emissiveMap;
          delete definition.reflectionMap;
          delete definition.refractionMap;
          delete definition.refractionRatio;
          material = new THREE.MeshMatcapMaterial(definition);
          break;
        case "toon":
          delete definition.roughness;
          delete definition.metalness;
          delete definition.reflectivity;
          delete definition.shininess;
          delete definition.emissive;
          delete definition.emissiveIntensity;
          delete definition.envMap;
          delete definition.roughnessMap;
          delete definition.metalnessMap;
          delete definition.reflectionMap;
          delete definition.refractionMap;
          delete definition.refractionRatio;
          material = new THREE.MeshToonMaterial(definition);
          break;
        case "normal":
          delete definition.roughness;
          delete definition.metalness;
          delete definition.reflectivity;
          delete definition.shininess;
          delete definition.emissive;
          delete definition.emissiveIntensity;
          delete definition.map;
          delete definition.envMap;
          delete definition.roughnessMap;
          delete definition.metalnessMap;
          delete definition.emissiveMap;
          delete definition.reflectionMap;
          delete definition.refractionMap;
          delete definition.refractionRatio;
          material = new THREE.MeshNormalMaterial(definition);
          break;
        default: {
          throw new Error(`SyntaxError: Unknown material type ${type}`);
        }
      }
      return material;
    }
    static _generateTexture(image, encoding, uscale, vscale, uoffset, voffset, rotation) {
      const threetexture = new THREE.TextureLoader().load(image);
      threetexture.encoding = encoding;
      threetexture.repeat.set(1 / uscale, 1 / vscale);
      threetexture.wrapS = THREE.RepeatWrapping;
      threetexture.wrapT = THREE.RepeatWrapping;
      threetexture.offset = new THREE.Vector2(uoffset, voffset);
      threetexture.rotation = rotation * Math.PI / 180;
      return threetexture;
    }
  };

  // src/svox/smoothvoxel.js
  if (typeof window !== "undefined") {
    if (typeof AFRAME !== "undefined") {
      let WORKERPOOL = null;
      AFRAME.registerComponent("svox", {
        schema: {
          model: { type: "string" },
          worker: { type: "boolean", default: false }
        },
        multiple: false,
        _MISSING: "model size=9,scale=0.05,material lighting=flat,colors=A:#FFFFFF B:#FF8800 C:#FF0000,voxels 10B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-11B7-B-6(7A2-)7A-B7-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B3-C3-B-2(7A2-)7A-C7AC-2(7A2-)7A-B3-C3-2B2-C-C2-B-7A2-2(7A-C7AC-)7A2-7A-B2-C-C2-2B-C3-C-B-7A-C7AC-2(7A2-)7A-C7AC-7A-B-C3-C-2B7-B-6(7A2-)7A-B7-11B7-2B-C3-C-2B2-C-C2-2B3-C3-2B2-C-C2-2B-C3-C-2B7-10B",
        _ERROR: "model size=9,scale=0.05,material lighting=flat,colors=B:#FF8800 C:#FF0000 A:#FFFFFF,voxels 10B7-2(2B2-3C2-2B4-C2-)2B2-3C2-2B7-11B7-B-6(7A2-)7A-B7-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B2-C4-B-2(7A-C7A2C)7A-C7AC-7A-B2-C4-2B2-3C2-B3(-7A-C7AC)-7A-B2-3C2-2B2-C4-B-7A-C2(7AC-7A2C)7AC-7A-B2-C4-2B2-3C2-B-6(7A2-)7A-B2-3C2-2B7-B-6(7A2-)7A-B7-11B7-2(2B2-3C2-2B2-C4-)2B2-3C2-2B7-10B",
        _workerPool: null,
        init: function() {
          const el = this.el;
          const data = this.data;
          let useWorker = data.worker;
          let error = false;
          const modelName = data.model;
          let modelString = window.SVOX.models[modelName];
          if (!modelString) {
            this._logError({ name: "ConfigError", message: "Model not found" });
            modelString = this._MISSING;
            error = true;
            useWorker = false;
          }
          if (!useWorker) {
            this._generateModel(modelString, el, error);
          } else {
            this._generateModelInWorker(modelString, el);
          }
        },
        _generateModel: function(modelString, el, error) {
          let model;
          try {
            model = window.model = ModelReader.readFromString(modelString);
          } catch (ex) {
            this._logError(ex);
            model = ModelReader.readFromString(this._ERROR);
            error = true;
          }
          const buffers = new Buffers(1024 * 1024);
          const t0 = performance.now();
          const svoxmesh = SvoxMeshGenerator.generate(model, buffers);
          console.log(svoxmesh);
          const t1 = performance.now();
          this.mesh = SvoxToThreeMeshConverter.generate(svoxmesh);
          console.log(svoxmesh);
          const statsText = `Time: ${Math.round(t1 - t0)}ms. Verts:${svoxmesh.maxIndex + 1} Faces:${svoxmesh.indices.length / 3} Materials:${this.mesh.material.length}`;
          const statsEl = document.getElementById("svoxstats");
          if (statsEl && !error) {
            statsEl.innerHTML = "Last render: " + statsText;
          }
          el.setObject3D("mesh", this.mesh);
        },
        _generateModelInWorker: function(svoxmodel, el) {
          if (!el.id) {
            el.id = new Date().valueOf().toString(36) + Math.random().toString(36).substr(2);
          }
          const task = { svoxmodel, elementId: el.id };
          if (!WORKERPOOL) {
            WORKERPOOL = new WorkerPool(this, this._processResult);
          }
          WORKERPOOL.executeTask(task);
        },
        _processResult: function(data) {
          if (data.svoxmesh.error) {
            this._logError(data.svoxmesh.error);
          } else {
            const mesh = SvoxToThreeMeshConverter.generate(data.svoxmesh);
            const el = document.querySelector("#" + data.elementId);
            el.setObject3D("mesh", mesh);
          }
        },
        _toSharedArrayBuffer(floatArray) {
          const buffer = new Float32Array(new ArrayBuffer(floatArray.length * 4));
          buffer.set(floatArray, 0);
          return buffer;
        },
        _logError: function(error) {
          const errorText = error.name + ": " + error.message;
          const errorElement = document.getElementById("svoxerrors");
          if (errorElement) {
            errorElement.innerHTML = errorText;
          }
          console.error(`SVOXERROR (${this.data.model}) ${errorText}`);
        },
        update: function(oldData) {
        },
        remove: function() {
          const maps = ["map", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "matcap"];
          if (this.mesh) {
            while (this.mesh.material.length > 0) {
              maps.forEach(function(map) {
                if (this.mesh.material[0][map]) {
                  this.mesh.material[0][map].dispose();
                }
              }, this);
              this.mesh.material[0].dispose();
              this.mesh.material.shift();
            }
            this.mesh.geometry.dispose();
            this.el.removeObject3D("mesh");
            delete this.mesh;
          }
        },
        pause: function() {
        },
        play: function() {
        },
        events: {}
      });
    }
  }

  // src/index.js
  var src_default = {
    BaseMaterial,
    Bits,
    BoundingBox,
    Color,
    Light,
    Material,
    MaterialList,
    SvoxMeshGenerator,
    Model,
    ModelReader,
    ModelWriter,
    Buffers,
    Voxels,
    xyzRangeForSize,
    shiftForSize,
    voxColorForRGBT,
    rgbtForVoxColor,
    WorkerPool
  };
})();

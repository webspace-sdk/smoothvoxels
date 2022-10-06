/* Note, voxels only supports hexadecimal colors like #FFF or #FFFFFF*/
class Voxel {
  
  constructor(color) {
    this.color = color;
    this.material = color.material;
    this.faces = { };
    this.visible = true;
  }
  
  dispose() {
    this.color = null;
    this.material = null;
    this.faces = null;
  }
}

// =====================================================
// class VoxelMatrix
// =====================================================

// NOTE the double nested arrays make this code (much) more complex but gives a 20+% performance gain 
// over the simple version of this._voxels[x + y * 100000 + z * 10000000000] = voxel
class VoxelMatrix {
  
  get minX()  { return this.bounds.minX; }
  get minY()  { return this.bounds.minY; }
  get minZ()  { return this.bounds.minZ; }
  get maxX()  { return this.bounds.maxX; }
  get maxY()  { return this.bounds.maxY; }
  get maxZ()  { return this.bounds.maxZ; }
  
  get size() { 
    if (this.minX > this.maxX)
      return { x:0, y:0, z:0};
    else
      return {
        x: this.maxX - this.minX + 1,
        y: this.maxY - this.minY + 1,
        z: this.maxZ - this.minZ + 1
      };
  }
 
  get count() { return this._count; }
  
  constructor() {
    this.bounds = new BoundingBox();
    this._voxels = [];
    this._count = 0;
    this.prepareForWrite();
  }
  
  reset() {
    this.forEach(function(voxel) {
      voxel.reset;
    }, this, true);
    this.bounds.reset();
    this._voxels = [];
    this._count = 0;
  }
  
  setVoxel(x, y, z, voxel) {
    if (!(voxel instanceof Voxel))
     throw new Error("setVoxel requires a Voxel set to an existing color of a material of this model.");
     
    this.bounds.set(x, y, z);
    voxel.material.bounds.set(x, y, z);

    voxel.x = x;
    voxel.y = y;
    voxel.z = z;
    
    let matrixy = this._voxels[z + 1000000];
    if (!matrixy) { 
      matrixy = [ ];
      this._voxels[z + 1000000] = matrixy;
    }
    let matrixx = matrixy[y + 1000000];
    if (!matrixx) {
      matrixx = [ ];
      matrixy[y + 1000000] = matrixx;
    }
    
    if (!matrixx[x + 1000000])
      this._count++;
  
    matrixx[x + 1000000] = voxel;
  }
   
  clearVoxel(x, y, z) {
    this.bounds.set(x, y, z);
    let matrix = this._voxels[z + 1000000];
    if (matrix) {
      matrix = matrix[y + 1000000];
      if (matrix) {
        let voxel = matrix[x + 1000000];
        if (voxel) {
          voxel.color--;   
          this._count++;
          matrix[x + 1000000] = null;
          //matrix.splice(x,1);   // Very slow!
        }
      }
    }
  }
  
  getVoxel(x, y, z) {
    let matrix = this._voxels[z + 1000000];
    if (matrix) {
      matrix = matrix[y + 1000000];
      if (matrix) {
        return matrix[x + 1000000];
      }
    }
    return null;
  }
      
  forEach(func, thisArg, visibleOnly) {
    let param = [];
    for (let indexz in this._voxels) {
      let matrixy = this._voxels[indexz];
      for (let indexy in matrixy) {
        let matrixx = matrixy[indexy];
        for (let indexx in matrixx) {
          let voxel = matrixx[indexx];
          if (voxel && (!visibleOnly || voxel.visible)) {
            param[0] = voxel;
            let stop = func.apply(thisArg, param);
            if (stop === true) return;
          }
        }
      }
    }
  }
  
  forEachInBoundary(func, thisArg) {
    let param = [];
    for (let z = this.bounds.minZ; z <= this.bounds.maxZ; z++) {
      for (let y = this.bounds.minY; y <= this.bounds.maxY; y++) {
        for (let x = this.bounds.minX; x <= this.bounds.maxX; x++) {
          param[0] = this.getVoxel(x,y,z);
          let stop = func.apply(thisArg, param);
          if (stop === true) return;
        }
      }
    }
  }
    
  prepareForWrite() {
    //this.bounds.reset();
    this._count = 0;
    
    this.forEach(function overwriteVoxel(voxel) {
      // Overrwite all voxels to recalulate the bounding box, count the voxels and counts the colors
      this.setVoxel(voxel.x, voxel.y, voxel.z, voxel);
    }, this);  
  }
    
  /*
  _determineOriginOffset() { 
    let xOffset = -(this.bounds.minX + this.bounds.maxX)/2;
    let yOffset = -(this.bounds.minY + this.bounds.maxY)/2;
    let zOffset = -(this.bounds.minZ + this.bounds.maxZ)/2;
    
    if (this._origin.nx) xOffset = -(this.bounds.minX - 0.5);
    if (this._origin.px) xOffset = -(this.bounds.maxX + 0.5);
    if (this._origin.ny) yOffset = -(this.bounds.minY - 0.5);
    if (this._origin.py) yOffset = -(this.bounds.maxY + 0.5);
    if (this._origin.nz) zOffset = -(this.bounds.minZ - 0.5);
    if (this._origin.pz) zOffset = -(this.bounds.maxZ + 0.5);

    this._originOffset = { x: xOffset, y:yOffset, z:zOffset };
  }
  */
  
  // End of class VoxelMatrix
}

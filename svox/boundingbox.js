class BoundingBox {

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
        
  // End of class BoundingBox
}

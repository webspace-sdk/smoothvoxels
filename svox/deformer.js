
class Deformer {
  
  static changeShape(model, shape) {
    switch (shape) {
      case 'sphere' : this._circularDeform(model, 1, 1, 1); break;
      case 'cylinder-x' : this._circularDeform(model, 0, 1, 1); break;
      case 'cylinder-y' : this._circularDeform(model, 1, 0, 1); break;
      case 'cylinder-z' : this._circularDeform(model, 1, 1, 0); break;
      case 'box': break;
      default: break;
    }
  }

  static _circularDeform(model, xStrength, yStrength, zStrength) {
    let xMid = (model.voxels.minX + model.voxels.maxX)/2 + 0.5;
    let yMid = (model.voxels.minY + model.voxels.maxY)/2 + 0.5;
    let zMid = (model.voxels.minZ + model.voxels.maxZ)/2 + 0.5;    

    const { vertX, vertY, vertZ, vertRing } = model;

    for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
      const vx = vertX[vertIndex];
      const vy = vertY[vertIndex];
      const vz = vertZ[vertIndex];

      const x = (vx - xMid);
      const y = (vy - yMid);
      const z = (vz - zMid);

      const sphereSize = Math.max(Math.abs(x * xStrength), Math.abs(y * yStrength), Math.abs(z * zStrength));
      const vertexDistance = Math.sqrt(x*x*xStrength + y*y*yStrength + z*z*zStrength);
      if (vertexDistance === 0) continue;
      const factor = sphereSize / vertexDistance;

      vertX[vertIndex] = x*((1-xStrength) + (xStrength)*factor) + xMid;
      vertY[vertIndex] = y*((1-yStrength) + (yStrength)*factor) + yMid;
      vertZ[vertIndex] = z*((1-zStrength) + (zStrength)*factor) + zMid;
      vertRing[vertIndex] = sphereSize;
    }

    model.forEachVertex(function(vertex) {
      let x = (vertex.x - xMid);
      let y = (vertex.y - yMid);
      let z = (vertex.z - zMid);
      let sphereSize = Math.max(
                          Math.abs(x * xStrength), 
                          Math.abs(y * yStrength), 
                          Math.abs(z * zStrength)
                        );
      let vertexDistance = Math.sqrt(x*x*xStrength + y*y*yStrength + z*z*zStrength);
      if (vertexDistance === 0) return;
      let factor = sphereSize / vertexDistance;
      vertex.newPos.x = x*((1-xStrength) + (xStrength)*factor) + xMid;
      vertex.newPos.y = y*((1-yStrength) + (yStrength)*factor) + yMid;
      vertex.newPos.z = z*((1-zStrength) + (zStrength)*factor) + zMid;
      vertex.newPos.set = true;
      vertex.ring = sphereSize;
    }, this);

    this._repositionChangedVertices(model, true);
    
    this._markEquidistantFaces(model);
  }  
  
    
  static _markEquidistantFaces(model) {
    const { faceVertIndices, vertRing, faceEquidistant } = model;

    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      const faceVertIndex0 = faceIndex * 3;
      const faceVertIndex1 = faceVertIndex0 + 1;
      const faceVertIndex2 = faceVertIndex0 + 2;
      const faceVertIndex3 = faceVertIndex0 + 3;

      faceEquidistant.set(faceIndex, vertRing[faceVertIndices[faceVertIndex0]] === vertRing[faceVertIndices[faceVertIndex1]] &&
        vertRing[faceVertIndices[faceVertIndex0]] === vertRing[faceVertIndices[faceVertIndex2]] &&
        vertRing[faceVertIndices[faceVertIndex0]] === vertRing[faceVertIndices[faceVertIndex3]] ? 1 : 0);
    }

    model.voxels.forEach(function(voxel) {      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;

        face.equidistant = true;
        let ring = face.vertices[0].ring;
        
        for (let v = 1; v < 4; v++) {
          let vertex = face.vertices[v];
          if (vertex.ring !== ring) {
            face.equidistant = false;
            break;
          }
        }
      }
    }, this, true);
  }
  
  
  static maximumDeformCount(model) {
    let maximumCount = 0;
    model.materials.forEach(function(material) {
      if (material.deform)
        maximumCount = Math.max(maximumCount, material.deform.count)
    });
    return maximumCount;
  }
  
  static deform(model, maximumDeformCount) {
    const { vertLinkIndices, vertLinkCounts, vertDeformCount, vertDeformDamping, vertDeformStrength, vertFlattenedX, vertFlattenedY, vertFlattenedZ, vertClampedX, vertClampedY, vertClampedZ, vertX, vertY, vertZ, vertTmpX, vertTmpY, vertTmpZ, vertHasTmp } = model;

    for (let step = 0; step < maximumDeformCount; step++) {
      let hasDeforms = false;

      for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
        const deformCount = vertDeformCount[vertIndex];
        if (deformCount <= step) continue;

        const vertLinkCount = vertLinkCounts[vertIndex];
        if (vertLinkCount === 0) continue;

        hasDeforms = true;

        const vx = vertX[vertIndex];
        const vy = vertY[vertIndex];
        const vz = vertZ[vertIndex];

        const deformDamping = vertDeformDamping[vertIndex];
        const deformStrength = vertDeformStrength[vertIndex];
        const notClampOrFlattenX = 1 - (vertClampedX.get(vertIndex) | vertFlattenedX.get(vertIndex));
        const notClampOrFlattenY = 1 - (vertClampedY.get(vertIndex) | vertFlattenedY.get(vertIndex));
        const notClampOrFlattenZ = 1 - (vertClampedZ.get(vertIndex) | vertFlattenedZ.get(vertIndex));

        let x = 0, y = 0, z = 0;

        for (let i = 0 ; i < vertLinkCount; i++) {
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
          if (vertHasTmp.get(vertIndex) === 0) continue;

          vertX[vertIndex] = vertTmpX[vertIndex];
          vertY[vertIndex] = vertTmpY[vertIndex];
          vertZ[vertIndex] = vertTmpZ[vertIndex];
        }

        vertHasTmp.clear();
      }
    }

    
    for (let step = 0; step < maximumDeformCount; step++) {

      model.forEachVertex(function(vertex) {
        
        if (vertex.deform && vertex.deform.count > step) {
          let links = vertex.links;

          if (links.length > 0) {
            // Average all connected vertices
            let x=0, y=0, z=0;
            for (let l=0; l < links.length; l++) {
              x += links[l].x;
              y += links[l].y;
              z += links[l].z;
            }
            
            // The offset is the average of the connected vertices
            let offsetX = x/links.length - vertex.x;
            let offsetY = y/links.length - vertex.y; 
            let offsetZ = z/links.length - vertex.z;
            
            let strength = Math.pow(vertex.deform.damping, step) * vertex.deform.strength;
            if (strength !== 0) {
              vertex.newPos.x = vertex.x+offsetX*strength; 
              vertex.newPos.y = vertex.y+offsetY*strength; 
              vertex.newPos.z = vertex.z+offsetZ*strength;
              vertex.newPos.set = true;
            } 
          }
        }
      }, this);

      this._repositionChangedVertices(model);
    }
  }
  
  static warpAndScatter(model) {
    let noise = SVOX.Noise().noise;
    let voxels = model.voxels;
    let { nx: tnx, px: tpx, ny: tny, py: tpy, nz: tnz, pz: tpz } = model._tile;
    let tile = model._tile;

    let { minX: vxMinX, minY: vxMinY, minZ: vxMinZ, maxX: vxMaxX, maxY: vxMaxY, maxZ: vxMaxZ } = voxels;
    const { vertX, vertY, vertZ, vertWarpAmplitude, vertWarpFrequency, vertScatter, vertFlattenedX, vertFlattenedY, vertFlattenedZ, vertClampedX, vertClampedY, vertClampedZ } = model;

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

      // In case of tiling, do not warp or scatter the edges
      if ((tnx && vx < vxMinX) || 
          (tpx && vx > vxMaxX) ||
          (tny && vy < vxMinY) || 
          (tpy && vy > vxMaxY) ||
          (tnz && vz < vxMinZ) || 
          (tpz && vz > vxMaxZ))
        continue;
      
      const amplitude = vertWarpAmplitude[vertIndex];
      const frequency = vertWarpFrequency[vertIndex];
      const scatter = vertScatter[vertIndex];
      const hasAmplitude = amplitude > 0;
      const hasScatter = scatter > 0;

      if (hasAmplitude || hasScatter) {
        let xOffset = 0, yOffset = 0, zOffset = 0;

        if (hasAmplitude) {
          xOffset = noise( (vx+0.19) * frequency, vy * frequency, vz * frequency) * amplitude;
          yOffset = noise( (vy+0.17) * frequency, vz * frequency, vx * frequency) * amplitude;
          zOffset = noise( (vz+0.13) * frequency, vx * frequency, vy * frequency) * amplitude;
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

    model.forEachVertex(function(vertex) {

      // In case of tiling, do not warp or scatter the edges
      if ((tile.nx && vertex.x < voxels.minX+0.1) || 
          (tile.px && vertex.x > voxels.maxX+0.9) ||
          (tile.ny && vertex.y < voxels.minY+0.1) || 
          (tile.py && vertex.y > voxels.maxY+0.9) ||
          (tile.nz && vertex.z < voxels.minZ+0.1) || 
          (tile.pz && vertex.z > voxels.maxZ+0.9))
        return;
      
      let amplitude = vertex.warp ? vertex.warp.amplitude : 0;
      let frequency = vertex.warp ? vertex.warp.frequency : 0;
      let scatter = vertex.scatter || 0;
      
      if (amplitude || scatter) {
        let xOffset = 0, yOffset = 0, zOffset = 0;

        if (amplitude) {
          xOffset = noise( (vertex.x+0.19) * frequency, vertex.y * frequency, vertex.z * frequency) * amplitude;
          yOffset = noise( (vertex.y+0.17) * frequency, vertex.z * frequency, vertex.x * frequency) * amplitude;
          zOffset = noise( (vertex.z+0.13) * frequency, vertex.x * frequency, vertex.y * frequency) * amplitude;
        }

        if (scatter) {
          xOffset += (Math.random() * 2 - 1) * scatter;
          yOffset += (Math.random() * 2 - 1) * scatter;
          zOffset += (Math.random() * 2 - 1) * scatter;
        }

        vertex.newPos.x = vertex.x + xOffset;
        vertex.newPos.y = vertex.y + yOffset;
        vertex.newPos.z = vertex.z + zOffset;
        vertex.newPos.set = true;
      }
    }, this);

    this._repositionChangedVertices(model);
  }

  static _repositionChangedVertices(model, dontclamp) {
    if (dontclamp) {
      // Move all vertices to their new position without clamping / flattening
      model.forEachVertex(function(vertex) {
        if (vertex.newPos.set) {
          vertex.x = vertex.newPos.x;
          vertex.y = vertex.newPos.y;
          vertex.z = vertex.newPos.z;
          vertex.newPos.set = false;
        }
      }, this); 
    }
    else {
      // Move all vertices to their new position clamping / flattening as required
      model.forEachVertex(function(vertex) {
        if (vertex.newPos.set) {
          vertex.x = (vertex.flatten.x || vertex.clamp.x) ? vertex.x : vertex.newPos.x;
          vertex.y = (vertex.flatten.y || vertex.clamp.y) ? vertex.y : vertex.newPos.y;
          vertex.z = (vertex.flatten.z || vertex.clamp.z) ? vertex.z : vertex.newPos.z;
          vertex.newPos.set = false;
        }          
      }, this); 
    }
  }
  
}

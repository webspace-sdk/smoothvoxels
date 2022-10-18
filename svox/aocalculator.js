const TRI_VERT_OFFSETS = [
  [2, 1, 0],
  [0, 3, 2]
];

class AOCalculator {
  
  static calculateAmbientOcclusion(model, buffers) {
    let doAo = model.ao || model.materials.find(function(m) { return m.ao; } );
    if (!doAo) 
      return;
    const { faceMaterials, faceVertIndices, faceVertAO, vertX, vertY, vertZ, faceVertNormalX, faceVertNormalY, faceVertNormalZ } = buffers;
    const { faceCount } = model;
             
    const materials = model.materials.materials;

    let triangles = this._getAllFaceTriangles(model, buffers);
    let octree = this._trianglesToOctree(triangles, model, buffers);

    if (model._aoSides)
      octree = this._aoSidesToOctree(model, buffers, octree);

    let nrOfSamples = model.aoSamples;
    let samples = this._generateFibonacciSamples(nrOfSamples);
    
    model.triCount = 0;
    model.octCount = 0;

    let cache = {};

    const modelScaleX = model.scale.x;
    const modelScaleY = model.scale.y;
    const modelScaleZ = model.scale.z;
    
    for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
      const material = materials[faceMaterials[faceIndex]];

      let ao = material.ao || model.ao;
      if (!ao || ao.maxDistance === 0 || ao.strength === 0 || ao.angle < 1 || material.opacity === 0) continue;

      let max = ao.maxDistance * Math.max(modelScaleX, modelScaleY, modelScaleZ);
      let strength = ao.strength;
      let angle = Math.cos(ao.angle / 180 * Math.PI);

      const faceOffset = faceIndex * 4;
      faceVertAO[faceIndex] = 0;
      faceVertAO[faceIndex + 1] = 0;
      faceVertAO[faceIndex + 2] = 0;
      faceVertAO[faceIndex + 3] = 0;

      for (let v = 0; v < 4; v++) {
        const faceVertOffset = faceIndex * 4 + v;
        const vertIndex = faceVertIndices[faceVertOffset];

        const vx = vertX[vertIndex];
        const vy = vertY[vertIndex];
        const vz = vertZ[vertIndex];

        const nx = faceVertNormalX[faceVertOffset];
        const ny = faceVertNormalY[faceVertOffset];
        const nz = faceVertNormalZ[faceVertOffset];

        let cacheKey = `${vx}|${vy}|${vz}|${nx}|${ny}|${nz}`;
        let cachedAo = cache[cacheKey];

        if (cachedAo) {
          faceVertAO[faceVertOffset] = cachedAo;
          continue;
        }

        const oppositeVertIndex = faceVertIndices[faceOffset + ((v + 2) % 4)];
        const oppositeVertX = vertX[oppositeVertIndex];
        const oppositeVertY = vertY[oppositeVertIndex];
        const oppositeVertZ = vertZ[oppositeVertIndex];

        const originX = vx * 0.99999 + oppositeVertX * 0.00001 + nx * 0.00001;
        const originY = vy * 0.99999 + oppositeVertY * 0.00001 + ny * 0.00001;
        const originZ = vz * 0.99999 + oppositeVertZ * 0.00001 + nz * 0.00001;

        let total = 0;
        let count = 0;

        for (let s = 0; s < nrOfSamples; s++) {
          let direction = samples[s];
          let dot = direction.x*nx + direction.y*ny + direction.z*nz;
          if (dot <= angle) continue;

          const endX = originX + direction.x * max;
          const endY = originY + direction.y * max;
          const endZ = originZ + direction.z * max;

          let distance = this._distanceToOctree(model, buffers, octree, originX, originY, originZ, direction, max, endX, endY, endZ);
          distance = (distance || max) / max;
          total += distance; 
          count++;
        }

        if (count === 0) {
          faceVertAO[faceVertOffset] = 0;
        } else {
          total = Math.max(Math.min(total/count, 1), 0);
          faceVertAO[faceVertOffset] = 1 - Math.pow(total, strength);  
        }

        cache[cacheKey] = faceVertAO[faceVertOffset];
      }
    }
  }
   
  static _getAllFaceTriangles(model, buffers) {
    const { faceMaterials, faceVertIndices } = buffers;
    const { faceCount } = model;
    const triangles = [];

    const materials = model.materials.materials;
    for (let faceIndex = 0; faceIndex < faceCount; faceIndex++) {
      const material = materials[faceMaterials[faceIndex]];
      if (material.opacity < 0.75) continue;

      const triIndex = faceIndex * 2;
      triangles.push(triIndex);
      triangles.push(triIndex + 1);
    }

    return triangles;
  }
  
  static _trianglesToOctree(triangles, model, buffers) {
    const { faceVertIndices, faceMaterials, vertX, vertY, vertZ } = buffers;

    let length = triangles.length;

    if (length <= 32) {
      
      let partition = { 
        minx: Number.MAX_VALUE, miny: Number.MAX_VALUE, minz: Number.MAX_VALUE,
        maxx: -Number.MAX_VALUE, maxy: -Number.MAX_VALUE, maxz: -Number.MAX_VALUE,
        partitions: null,
        triangles
      }
      
      for(let t=0; t<length; t++) {
        let triIndex = triangles[t];
        const faceIndex = triIndex >> 1;
        const triVertOffset = TRI_VERT_OFFSETS[triIndex & 1];
        const faceOffset = faceIndex * 4;
        const triVertIndex0 = faceVertIndices[faceOffset + triVertOffset[0]];
        const triVertIndex1 = faceVertIndices[faceOffset + triVertOffset[1]];
        const triVertIndex2 = faceVertIndices[faceOffset + triVertOffset[2]];
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
      
    }
    else {
      
      let midx = 0, midy = 0, midz = 0;
      for(let t=0; t<length; t++) {
        let triIndex = triangles[t];
        const faceIndex = triIndex >> 1;
        const triVertOffset = TRI_VERT_OFFSETS[triIndex & 1];
        const faceOffset = faceIndex * 4;
        const triVertIndex0 = faceVertIndices[faceOffset + triVertOffset[0]];
        const triVertIndex1 = faceVertIndices[faceOffset + triVertOffset[1]];
        const triVertIndex2 = faceVertIndices[faceOffset + triVertOffset[2]];
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
      const d = 1.0 / length;
      midx *= d;   // Don't devide by 3 so we don't have to do that below
      midy *= d;
      midz *= d;
      
      // TODO this can re-use memory, just used for passing tris to the next level
      let subTriangles = Array(8).fill(null);

      for(let t=0; t<length; t++) {
        let triIndex = triangles[t];
        const faceIndex = triIndex >> 1;
        const triVertOffset = TRI_VERT_OFFSETS[triIndex & 1];
        const faceOffset = faceIndex * 4;
        const triVertIndex0 = faceVertIndices[faceOffset + triVertOffset[0]];
        const triVertIndex1 = faceVertIndices[faceOffset + triVertOffset[1]];
        const triVertIndex2 = faceVertIndices[faceOffset + triVertOffset[2]];
        const x0 = vertX[triVertIndex0];
        const y0 = vertY[triVertIndex0];
        const z0 = vertZ[triVertIndex0];
        const x1 = vertX[triVertIndex1];
        const y1 = vertY[triVertIndex1];
        const z1 = vertZ[triVertIndex1];
        const x2 = vertX[triVertIndex2];
        const y2 = vertY[triVertIndex2];
        const z2 = vertZ[triVertIndex2];

        const x = (x0 + x1 + x2) < midx ? 0 : 1;
        const y = (y0 + y1 + y2) < midy ? 0 : 1;
        const z = (z0 + z1 + z2) < midz ? 0 : 1;

        const index = x + y*2 + z*4;

        if (subTriangles[index] === null) {
          subTriangles[index] = [ triIndex ];
        } else {
          subTriangles[index].push(triIndex);
        }
      }

      const partitions = Array(8).fill(null);
        
      const partition = {
        minx: Number.MAX_VALUE, miny: Number.MAX_VALUE, minz: Number.MAX_VALUE,
        maxx: -Number.MAX_VALUE, maxy: -Number.MAX_VALUE, maxz: -Number.MAX_VALUE,  
        partitions,
        triangles: []
      };
      
      for (let index = 0; index < 8; index++) {
        if (subTriangles[index] === null) continue;

        partitions[index] = this._trianglesToOctree(subTriangles[index], model, buffers);
        partition.minx = Math.min(partition.minx, partitions[index].minx);
        partition.miny = Math.min(partition.miny, partitions[index].miny);
        partition.minz = Math.min(partition.minz, partitions[index].minz);
        partition.maxx = Math.max(partition.maxx, partitions[index].maxx);
        partition.maxy = Math.max(partition.maxy, partitions[index].maxy);
        partition.maxz = Math.max(partition.maxz, partitions[index].maxz);
      }
        
      return partition;        
    }
  }  
   
  static _distanceToOctree(model, buffers, octree, originX, originY, originZ, direction, max, endX, endY, endZ) {
    
    model.octCount++;
    
    if (!this._hitsBox(originX, originY, originZ, endX, endY, endZ, octree))
      return null;

    if (octree.triangles.length > 0) {
      let dist =  this._distanceToModel(model, buffers, octree.triangles, originX, originY, originZ, direction, max);
      if (!dist) 
        model.octMissCount++; 
      return dist;
    }
    
    let minDistance = max;

    for (let p=0; p < octree.partitions.length; p++) { 
      let dist = this._distanceToOctree(model, buffers, octree.partitions[p], originX, originY, originZ, direction, max, endX, endY, endZ);
      if (dist) {
        minDistance = Math.min(minDistance, dist);
      }      
    }    
    return minDistance;    
  }
  
  static _aoSidesToOctree(model, buffers, octree) {
    const bounds = model.determineBoundsOffsetAndRescale(SVOX.MODEL, buffers).bounds;
    let { vertCount, faceCount } = model;
    const { faceVertIndices, faceCulled, vertX, vertY, vertZ } = buffers;
    
    // Kind of hacky, we add these fake triangles to the buffers as fake faces.
    // We flip the culling bit just in case so they don't get rendered. (They shouldn't since faceCount is fixed)
    const pushNewTriangleIntoFaceVerts = (x0, y0, z0, x1, y1, z1, x2, y2, z2) => {
      // Push 2, 1, 0
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

      // Return the triindex
      return newTriIndex;
    }

    let sideTriangles = [];
    if (model._aoSides.nx) 
      sideTriangles.push ( pushNewTriangleIntoFaceVerts(bounds.minX-0.05, 1000000, -1000000, bounds.minX-0.05, 1000000, 1000000, bounds.minX-0.05, -10000000, 0))
    if (model._aoSides.px) 
      sideTriangles.push ( pushNewTriangleIntoFaceVerts(bounds.maxX+0.05, 1000000, 1000000 , bounds.maxX+0.05, 1000000,-1000000, bounds.maxX+0.05, -10000000, 0 ))
    if (model._aoSides.ny) 
      sideTriangles.push ( pushNewTriangleIntoFaceVerts(   1000000, bounds.minY-0.05, -1000000 ,  -1000000, bounds.minY-0.05, -1000000 ,         0, bounds.minY-0.05, 10000000));
    if (model._aoSides.py) 
      sideTriangles.push (pushNewTriangleIntoFaceVerts(   -1000000, bounds.maxY+0.05, -1000000 ,   1000000, bounds.maxY+0.05, -1000000 ,         0, bounds.maxY+0.05, 10000000));
    if (model._aoSides.nz) 
      sideTriangles.push (pushNewTriangleIntoFaceVerts(   1000000,  1000000,  bounds.minZ-0.05 ,  -1000000,  1000000,  bounds.minZ-0.05 ,         0, -10000000, bounds.minZ-0.05))
    if (model._aoSides.pz) 
      sideTriangles.push (pushNewTriangleIntoFaceVerts(  -1000000,  1000000,  bounds.maxZ+0.05 ,   1000000,  1000000,  bounds.maxZ+0.05 ,         0, -10000000, bounds.maxZ+0.05))
    
    if (sideTriangles.length > 0) {
      let sideOctree = this._trianglesToOctree(sideTriangles, model, buffers);

      octree = { 
          minx: -Number.MAX_VALUE, miny: -Number.MAX_VALUE, minz: -Number.MAX_VALUE,
          maxx: Number.MAX_VALUE, maxy: Number.MAX_VALUE, maxz: Number.MAX_VALUE,
          
          // Combine the sideOctree with the octree
          partitions: [ octree, sideOctree ],
          triangles: []
        }
    }
    
    return octree;
  } 
  
  // Algorithm copied from https://www.gamedev.net/zakwayda
  // https://www.gamedev.net/forums/topic/338987-aabb-line-segment-intersection-test/3209917/
  // Rewritten for js and added the quick tests at the top to improve speed
  static _hitsBox(originX, originY, originZ, endX, endY, endZ, box) {
    
    // Check if the entire line is fuly outside of the box planes
    if (originX < box.minx && endX < box.minx) return false;
    if (originX > box.maxx && endX > box.maxx) return false;
    if (originY < box.miny && endY < box.miny) return false;
    if (originY > box.maxy && endY > box.maxy) return false;
    if (originZ < box.minz && endZ < box.minz) return false;
    if (originZ > box.maxz && endZ > box.maxz) return false;
    
    let dx = (endX-originX)*0.5;
    let dy = (endY-originY)*0.5;
    let dz = (endZ-originZ)*0.5;
    let ex = (box.maxx-box.minx)*0.5;
    let ey = (box.maxy-box.miny)*0.5;
    let ez = (box.maxz-box.minz)*0.5;
    let cx = originX - (box.minx + box.maxx) * 0.5;
    let cy = originY - (box.miny + box.maxy) * 0.5;
    let cz = originZ - (box.minz + box.maxz) * 0.5;
    let adx = Math.abs(dx);
    let ady = Math.abs(dy);
    let adz = Math.abs(dz);

    if (Math.abs(cx) > ex + adx)
        return false;
    if (Math.abs(cy) > ey + ady)
        return false;
    if (Math.abs(cz) > ez + adz)
        return false;
    if (Math.abs(dy * cz - dz * cy) > ey * adz + ez * ady + EPS)
        return false;
    if (Math.abs(dz * cx - dx * cz) > ez * adx + ex * adz + EPS)
        return false;
    if (Math.abs(dx * cy - dy * cx) > ex * ady + ey * adx + EPS) 
       return false;        
    
    return true;
  }
  
  static _distanceToModel(model, buffers, triangles, originX, originY, originZ, direction, max) {  
    let minDistance = null;
    const { faceVertIndices } = buffers;
    
    for (let t=0; t < triangles.length; t++) {
      const triIndex = triangles[t];
      const faceIndex = triIndex >> 1;
      const triVertOffset = TRI_VERT_OFFSETS[triIndex & 1];

      const faceVertOffset = faceIndex * 4;
      const vert0Index = buffers.faceVertIndices[faceVertOffset + triVertOffset[0]];
      const vert1Index = buffers.faceVertIndices[faceVertOffset + triVertOffset[1]];
      const vert2Index = buffers.faceVertIndices[faceVertOffset + triVertOffset[2]];
      
      let dist = this._triangleDistance(model, buffers, vert0Index, vert1Index, vert2Index, originX, originY, originZ, direction);
      if (dist) {
        if (!minDistance) {
          if (dist < max)
            minDistance = dist;
        }
        else
          minDistance = Math.min(minDistance, dist);
      }      
    }
    
    return minDistance;    
  }
  
  // Ray - triangle Möller–Trumbore intersection algorithm
  // https://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
  // Adapted to return distance and minimize object allocations
  // Note: direction must be normalized.
  static _triangleDistance(model, buffers, vertIndex0, vertIndex1, vertIndex2, originX, originY, originZ, direction) {
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

    model.triCount++;

    let edge1x = vert1X - vert0X;
    let edge1y = vert1Y - vert0Y;
    let edge1z = vert1Z - vert0Z;
    let edge2x = vert2X - vert0X;
    let edge2y = vert2Y - vert0Y;
    let edge2z = vert2Z - vert0Z;
    
    // h = crossProduct(direction, edge2)
    let h0 = direction.y * edge2z - direction.z * edge2y;
    let h1 = direction.z * edge2x - direction.x * edge2z; 
    let h2 = direction.x * edge2y - direction.y * edge2x;
    
    // a = dotProduct(edge1, h)
    let a = edge1x * h0 + edge1y * h1 + edge1z * h2;
    if (a < EPS)
        return null;    // This ray is parallel to this triangle.
    
    let f = 1.0/a;
    let sx = originX - vert0X;
    let sy = originY - vert0Y;
    let sz = originZ - vert0Z;
    
    // u = f * dotProduct(s, h);
    let u = f * (sx * h0 + sy * h1 + sz * h2);
    if (u < 0.0 || u > 1.0)  // > a?
        return null;
    
    // q = crossProduct(s, edge1)
    let q0 = sy * edge1z - sz * edge1y;
    let q1 = sz * edge1x - sx * edge1z;
    let q2 = sx * edge1y - sy * edge1x;
    
    // v = f * dotProduct(direction, q);
    let v = f * (direction.x * q0 + direction.y * q1 + direction.z * q2);
    if (v < 0.0 || u + v > 1.0)   // > a? 
        return null;
    
    // At this stage we can compute t to find out where the intersection point is on the line.
    // t = f * dotProduct(edge2, q)
    let t = f * (edge2x * q0 + edge2y * q1 + edge2z * q2);
    if (t <= EPS) 
        return null;  // This means that there is a line intersection but not a ray intersection.
      
    // Ray intersection is at:
    // { x:origin.x + rayVector.x * t, y:origin.y + rayVector.y * t, z:origin.z + rayVector.z * t }
    // But we're only interested in the distance (t)
    
    // Discard the face of origin
    //if (t < 0.001)
    // return null;
    
    //console.log(`a:${a} u:${u} v:${v} t:${t}`);
    
    return t;
  }
  
  
  // Generate the samples using a Fibonacci Spiral
  // https://bduvenhage.me/geometry/2019/07/31/generating-equidistant-vectors.html
  static _generateFibonacciSamples(count) {
    let samples = [];
   
    let gr = (Math.sqrt(5.0) + 1.0) / 2.0;  // golden ratio = 1.6180339887498948482
    let ga = (2.0 - gr) * (2.0*Math.PI);    // golden angle = 2.39996322972865332

    for (let i=1; i <= count; ++i) {
        let lat = Math.asin(-1.0 + 2.0 * i / (count+1));
        let lon = ga * i;

        let x = Math.cos(lon)*Math.cos(lat);
        let y = Math.sin(lat);
        let z = Math.sin(lon)*Math.cos(lat);

        //samples.push( { x:x, y:y*1.25+0.5, z:z } ); // Elongate and move up for light from above
        samples.push( { x:x, y:y, z:z } );
    }
    
    return samples;
  }
  
  // Generate the samples using a regular spaced grid based on an octahedron.
  // The vertical count between 1 and 10 gives the folowing numbers of samples:
  //    6, 18, 38, 66, 102, 146, 198, 258, 326, 402
  // In theory this regular grid should produce less asymmetric artefacts, however
  // vertical count 1 and 2 have too few samples for normal use and 3 (38 samples) and higher
  // provide only marginal improvements over the Fibonacci spiral above.
  // Since the Fibonacci spiral provides any number of samples that was the final choice. 
  static _generateOctahedronSamples(verticalCount) {
    let samples = [];

    let verticalAngle = Math.PI / 2 / verticalCount;

    for (let vc=0; vc <= verticalCount; vc++) {
      let va = vc * verticalAngle;
      let y = Math.cos(va); 
      let d = Math.sin(va);

      let horizontalCount = Math.max(1, vc * 4);
      let horizontalAngle = Math.PI * 2 / horizontalCount; 

      for (let hc=0; hc < horizontalCount; hc++) {
        let ha = hc * horizontalAngle;
        let x = d * Math.sin(ha);
        let z = d * Math.cos(ha);

        samples.push( { x:x, y:y, z:z } );
        if (vc < verticalCount)
          samples.push( { x:x, y:-y, z:z } );
      }

      horizontalCount += 4;
    }

    return samples;
  }
  
}


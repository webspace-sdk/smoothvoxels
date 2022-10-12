class AOCalculator {
  
  static calculateAmbientOcclusion(model) {
    let doAo = model.ao || model.materials.find(function(m) { return m.ao; } );
    if (!doAo) 
      return;
             
    let triangles = this._getAllFaceTriangles(model);
    let octree = this._trianglesToOctree(triangles);
    if (model._aoSides)
      octree = this._aoSidesToOctree(model, octree);

    let nrOfSamples = model.aoSamples;
    let samples = this._generateFibonacciSamples(nrOfSamples);
    
    model.triCount = 0;
    model.octCount = 0;

    let cache = {};
    
    model.voxels.forEach(function calculateAO(voxel) {
      let ao = voxel.material.ao || model.ao;
      if (!ao || ao.maxDistance === 0 || ao.strength === 0 || ao.angle < 1 || voxel.material.opacity === 0)
        return;

      let max = ao.maxDistance * Math.max(model.scale.x, model.scale.y, model.scale.z);
      let strength = ao.strength;
      let angle = Math.cos(ao.angle / 180 * Math.PI);

      let origin = { x:0, y:0, z:0 };
      let end    = { x:0, y:0, z:0 };

      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;
        
        face.ao[0] = 0; face.ao[1] = 0; face.ao[2] = 0; face.ao[3] = 0;
          
        for (let v = 0; v<4; v++) {

          let vertex = face.vertices[v];
          let normal = face.normals[v];        
          
          let cacheKey = `${vertex.x}|${vertex.y}|${vertex.z}|${normal.x}|${normal.y}|${normal.z}`;
          let cachedAo = cache[cacheKey];
          if (cachedAo) {
            face.ao[v] = cachedAo;
            continue;
          }
                              
          // Move the ray origin out of the corner and out of the plane.
          let opposite = face.vertices[(v+2) % 4];
          origin.x = vertex.x * 0.99999 + opposite.x * 0.00001 + normal.x/10000;
          origin.y = vertex.y * 0.99999 + opposite.y * 0.00001 + normal.y/10000;
          origin.z = vertex.z * 0.99999 + opposite.z * 0.00001 + normal.z/10000;
          
          let total = 0;
          let count = 0;

          for (let s = 0; s < nrOfSamples; s++) {
            let direction = samples[s];
            let dot = direction.x*normal.x + direction.y*normal.y + direction.z*normal.z;
            if (dot <= angle) continue;
            
            end.x = origin.x + direction.x * max;
            end.y = origin.y + direction.y * max;
            end.z = origin.z + direction.z * max;
            
            let distance = this._distanceToOctree(model, octree, origin, direction, max, end);
            distance = (distance || max) / max;
            total += distance; 
            count++;
          }
          
          if (count === 0)
            face.ao[v] = 0;
          else {
            total = Math.max(Math.min(total/count, 1), 0);
            
            face.ao[v] = 1 - Math.pow(total, strength);  
          }
          
          cache[cacheKey] = face.ao[v];

        }
      }
    }, this, true);  // true == visible voxels only 
    
    //console.log(`Oct: ${model.octCount}  OctMiss: ${model.octMissCount}  Tri: ${model.triCount}`);
  }
   
  static _getAllFaceTriangles(model) {
    let triangles = [];
    model.voxels.forEach(function(voxel) {
      if (voxel.material.opacity < 0.75) return;

      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;
            
        triangles.push([face.vertices[2], face.vertices[1], face.vertices[0]]);
        triangles.push([face.vertices[0], face.vertices[3], face.vertices[2]]);        
      }
    }, this, true); // Visible only
        
    return triangles;
  }
  
  static _trianglesToOctree(triangles) {
    let length = triangles.length;

    if (length <= 32) {
      
      let partition = { 
        minx: Number.MAX_VALUE, miny: Number.MAX_VALUE, minz: Number.MAX_VALUE,
        maxx: -Number.MAX_VALUE, maxy: -Number.MAX_VALUE, maxz: -Number.MAX_VALUE,
        triangles: triangles
      }
      
      for(let t=0; t<length; t++) {
        let triangle = triangles[t];
        partition.minx = Math.min(partition.minx, triangle[0].x, triangle[1].x, triangle[2].x);
        partition.miny = Math.min(partition.miny, triangle[0].y, triangle[1].y, triangle[2].y);
        partition.minz = Math.min(partition.minz, triangle[0].z, triangle[1].z, triangle[2].z);
        partition.maxx = Math.max(partition.maxx, triangle[0].x, triangle[1].x, triangle[2].x);
        partition.maxy = Math.max(partition.maxy, triangle[0].y, triangle[1].y, triangle[2].y);
        partition.maxz = Math.max(partition.maxz, triangle[0].z, triangle[1].z, triangle[2].z);
      }
      return partition;
      
    }
    else {
      
      let midx = 0, midy = 0, midz = 0;
      for(let t=0; t<length; t++) {
        let triangle = triangles[t];
        midx += triangle[0].x + triangle[1].x + triangle[2].x;
        midy += triangle[0].y + triangle[1].y + triangle[2].y;
        midz += triangle[0].z + triangle[1].z + triangle[2].z;
      }
      midx /= length;   // Don't devide by 3 so we don't have to do that below
      midy /= length;
      midz /= length;
      
      let partitions = []
      for(let t=0; t<length; t++) {
        let triangle = triangles[t];
        let x = (triangle[0].x + triangle[1].x + triangle[2].x) < midx ? 0 : 1;
        let y = (triangle[0].y + triangle[1].y + triangle[2].y) < midy ? 0 : 1;
        let z = (triangle[0].z + triangle[1].z + triangle[2].z) < midz ? 0 : 1;
        let index = x + y*2 + z*4;
        if (partitions[index])
          partitions[index].push(triangle);
        else
          partitions[index] = [ triangle ];
      }
        
      let partition = {
        minx: Number.MAX_VALUE, miny: Number.MAX_VALUE, minz: Number.MAX_VALUE,
        maxx: -Number.MAX_VALUE, maxy: -Number.MAX_VALUE, maxz: -Number.MAX_VALUE,  
        partitions: partitions
      };
      
      for (let index = 7; index >= 0; index--) {
        if (!partitions[index]) 
          partitions.splice(index, 1);
        else {
          partitions[index] = this._trianglesToOctree(partitions[index]);
          partition.minx = Math.min(partition.minx, partitions[index].minx);
          partition.miny = Math.min(partition.miny, partitions[index].miny);
          partition.minz = Math.min(partition.minz, partitions[index].minz);
          partition.maxx = Math.max(partition.maxx, partitions[index].maxx);
          partition.maxy = Math.max(partition.maxy, partitions[index].maxy);
          partition.maxz = Math.max(partition.maxz, partitions[index].maxz);
        }
      }
        
      return partition;        
    }
  }  
   
  static _distanceToOctree(model, octree, origin, direction, max, end) {
    
    model.octCount++;
    
    if (!this._hitsBox(origin, end, octree))
      return null;
    
    if (octree.triangles) {
      let dist =  this._distanceToModel(model, octree.triangles, origin, direction, max);
      if (!dist) 
        model.octMissCount++; 
      return dist;
    }

    let minDistance = max;
    for (let p=0; p < octree.partitions.length; p++) { 
      let dist = this._distanceToOctree(model, octree.partitions[p], origin, direction, max, end);
      if (dist) {
        minDistance = Math.min(minDistance, dist);
      }      
    }    
    return minDistance;    
  }
  
  static _aoSidesToOctree(model, octree) {
    let bounds = model.determineBoundsOffsetAndRescale(SVOX.MODEL).bounds;
    
    let sideTriangles = [];
    if (model._aoSides.nx) 
      sideTriangles.push ( [ { x:bounds.minX-0.05, y:  1000000, z:-1000000 }, 
                             { x:bounds.minX-0.05, y:  1000000, z: 1000000 }, 
                             { x:bounds.minX-0.05, y:-10000000, z:      0 } ] );
    if (model._aoSides.px) 
      sideTriangles.push ( [ { x:bounds.maxX+0.05, y: 1000000,  z: 1000000 }, 
                             { x:bounds.maxX+0.05, y: 1000000,  z:-1000000 }, 
                             { x:bounds.maxX+0.05, y:-10000000, z:       0 } ] );
    if (model._aoSides.ny) 
      sideTriangles.push ( [ { x: 1000000, y:bounds.minY-0.05, z:-1000000 }, 
                             { x:-1000000, y:bounds.minY-0.05, z:-1000000 }, 
                             { x:       0, y:bounds.minY-0.05, z:10000000 } ] );
    if (model._aoSides.py) 
      sideTriangles.push ( [ { x:-1000000, y:bounds.maxY+0.05, z:-1000000 }, 
                             { x: 1000000, y:bounds.maxY+0.05, z:-1000000 }, 
                             { x:       0, y:bounds.maxY+0.05, z:10000000 } ] );
    if (model._aoSides.nz) 
      sideTriangles.push ( [ { x: 1000000, y: 1000000,  z:bounds.minZ-0.05 }, 
                             { x:-1000000, y: 1000000,  z:bounds.minZ-0.05 }, 
                             { x:       0, y:-10000000, z:bounds.minZ-0.05 } ] );
    if (model._aoSides.pz) 
      sideTriangles.push ( [ { x:-1000000, y: 1000000,  z:bounds.maxZ+0.05 }, 
                             { x: 1000000, y: 1000000,  z:bounds.maxZ+0.05 }, 
                             { x:       0, y:-10000000, z:bounds.maxZ+0.05 } ] );    
    
    if (sideTriangles.length > 0) {
      let sideOctree = this._trianglesToOctree(sideTriangles);
      octree = { 
          minx: -Number.MAX_VALUE, miny: -Number.MAX_VALUE, minz: -Number.MAX_VALUE,
          maxx: Number.MAX_VALUE, maxy: Number.MAX_VALUE, maxz: Number.MAX_VALUE,
          
          // Combine the sideOctree with the octree
          partitions: [ octree, sideOctree ]
        }
    }
    
    return octree;
  } 
  
  // Algorithm copied from https://www.gamedev.net/zakwayda
  // https://www.gamedev.net/forums/topic/338987-aabb-line-segment-intersection-test/3209917/
  // Rewritten for js and added the quick tests at the top to improve speed
  static _hitsBox(origin, end, box) {
    
    // Check if the entire line is fuly outside of the box planes
    if (origin.x < box.minx && end.x < box.minx) return false;
    if (origin.x > box.maxx && end.x > box.maxx) return false;
    if (origin.y < box.miny && end.y < box.miny) return false;
    if (origin.y > box.maxy && end.y > box.maxy) return false;
    if (origin.z < box.minz && end.z < box.minz) return false;
    if (origin.z > box.maxz && end.z > box.maxz) return false;
    
    let dx = (end.x-origin.x)*0.5;
    let dy = (end.y-origin.y)*0.5;
    let dz = (end.z-origin.z)*0.5;
    let ex = (box.maxx-box.minx)*0.5;
    let ey = (box.maxy-box.miny)*0.5;
    let ez = (box.maxz-box.minz)*0.5;
    let cx = origin.x - (box.minx + box.maxx) * 0.5;
    let cy = origin.y - (box.miny + box.maxy) * 0.5;
    let cz = origin.z - (box.minz + box.maxz) * 0.5;
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
  
  static _distanceToModel(model, triangles, origin, direction, max) {  
    let minDistance = null;
    
    for (let t=0; t < triangles.length; t++) {
      let triangle = triangles[t];
      
      let dist = this._triangleDistance(model, triangle[0], triangle[1], triangle[2], origin, direction);
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
  static _triangleDistance(model, vertex0, vertex1, vertex2, origin, direction) {

    model.triCount++;

    let edge1x = vertex1.x - vertex0.x;
    let edge1y = vertex1.y - vertex0.y;
    let edge1z = vertex1.z - vertex0.z;
    let edge2x = vertex2.x - vertex0.x;
    let edge2y = vertex2.y - vertex0.y;
    let edge2z = vertex2.z - vertex0.z;
    
    // h = crossProduct(direction, edge2)
    let h0 = direction.y * edge2z - direction.z * edge2y;
    let h1 = direction.z * edge2x - direction.x * edge2z; 
    let h2 = direction.x * edge2y - direction.y * edge2x;
    
    // a = dotProduct(edge1, h)
    let a = edge1x * h0 + edge1y * h1 + edge1z * h2;
    if (a < EPS)
        return null;    // This ray is parallel to this triangle.
    
    let f = 1.0/a;
    let sx = origin.x - vertex0.x;
    let sy = origin.y - vertex0.y;
    let sz = origin.z - vertex0.z;
    
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


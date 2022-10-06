class LightsCalculator {
  
  static calculateLights(model) {

    let lights = model.lights;
    if (lights.length === 0)
      return;
    
    for (let l = 0; l < lights.length; l++) {
      if (lights[l].direction)
        lights[l].normalizedDirection = model._normalize( { x:lights[l].direction.x, y:lights[l].direction.y, z:lights[l].direction.z } );
    }

    model.voxels.forEach(function(voxel) {

      // If this material is not affected by lights, no need to calculate the lights
      if (!voxel.material.lights)
        return;
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
      
        // If this face is skipped, no need to calculate the lights
        if (face.skipped)
          continue;
        
        face.light = [
          { r:0, g:0, b:0 },
          { r:0, g:0, b:0 }, 
          { r:0, g:0, b:0 }, 
          { r:0, g:0, b:0 } 
        ];
          
        for (let v = 0; v<4; v++) {

          let vertex = face.vertices[v];
          let normal = face.normals[v]; 
          
          for (let l = 0; l < lights.length; l++) {
            let light = lights[l];
            let exposure = light.strength;
            let normalizedDirection = light.normalizedDirection;
            let length = 0;
            if (light.position) {
              let vector = { x:light.position.x - vertex.x, 
                             y:light.position.y - vertex.y, 
                             z:light.position.z - vertex.z };
              length = Math.sqrt( vector.x * vector.x + vector.y * vector. y + vector.z * vector.z );
              normalizedDirection = { x:vector.x/length, y:vector.y/length, z:vector.z/length };
            }
            if (normalizedDirection) {
              exposure = light.strength * 
                         Math.max(normal.x*normalizedDirection.x + 
                                  normal.y*normalizedDirection.y + 
                                  normal.z*normalizedDirection.z, 0.0);
            }
            if (light.position && light.distance) {
              exposure = exposure * (1 - Math.min(length / light.distance, 1));
            }
            face.light[v].r += light.color.r * exposure;
            face.light[v].g += light.color.g * exposure;
            face.light[v].b += light.color.b * exposure;
          }
        }
      }
    }, this, true);  // true == visible voxels only 
  } 

}


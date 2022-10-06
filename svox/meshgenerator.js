// Generates a clean js mesh data model, which serves as the basis for transformation in the SvoxToThreeMeshConverter or the SvoxToAFrameConverter
class SvoxMeshGenerator {

  static generate(model) {
  
    let mesh = {
      materials: [],
      groups: [],
      indices: [],
      positions: [],
      normals: [],
      colors: [],
      uvs: null,
      data: null
    };

    model.prepareForRender();
    
    let generateUVs = false;
    model.materials.baseMaterials.forEach(function(material) {
      if (material.colorUsageCount > 0) {
        material.index = mesh.materials.length;
        mesh.materials.push(SvoxMeshGenerator._generateMaterial(material, model));
        generateUVs = generateUVs || material.map || material.normalMap || material.roughnessMap || material.metalnessMap || material.emissiveMap;
      }
    }, this);

    if (generateUVs)
      mesh.uvs = [];
    
    if (model.data) {
      mesh.data = [];
      for (let d=0; d<model.data.length; d++) {
        mesh.data.push( { name: model.data[d].name,
                          width:model.data[d].values.length,
                          values: [] } );
      }
    }
    
    SvoxMeshGenerator._generateAll(model, mesh);
    
    SvoxMeshGenerator._generateLights(model, mesh);
    
    mesh = SvoxMeshGenerator._toIndexed(mesh);

    return mesh;
  }
  
  static _toIndexed(mesh) {
    
    let ids = {};
    let lastIndex = -1;
    for (let i=0; i < mesh.positions.length / 3; i++) {
      let id = '';
      id += `${mesh.positions[i*3]}|${mesh.positions[i*3+1]}|${mesh.positions[i*3+2]}`;
      id += `|${mesh.normals[i*3]}|${mesh.normals[i*3+1]}|${mesh.normals[i*3+2]}`;
      if (mesh.colors && mesh.colors.length > 0)
        id += `|${mesh.colors[i*3]}|${mesh.colors[i*3+1]}|${mesh.colors[i*3+2]}`;
      if (mesh.uvs && mesh.uvs.length > 0)
        id += `|${mesh.uvs[i*2]}|${mesh.uvs[i*2+1]}`;
      if (mesh.data) {
        for (let d=0;d<mesh.data.length;d++) {
          let data = mesh.data[d];
          for (let v=0; v<data.width; v++)
            id += `|${data.values[i*data.width+v]}`;
        }
      }
      let index = ids[id];
      if (index === undefined) {
        ids[id] = ++lastIndex;
        index = lastIndex; 
      }
      mesh.indices[i] = index;
    }
    
    let newMesh = {
      materials: mesh.materials,
      groups: mesh.groups,
      indices: mesh.indices,
      positions: [],
      normals: [],
      colors: mesh.colors ? [] : null,
      uvs: mesh.uvs ? [] : null,
      data: mesh.data ? [] : null
    };
    
    if (mesh.data) {
      for (let d=0;d<mesh.data.length;d++) {
        newMesh.data.push( {name:mesh.data[d].name, width:mesh.data[d].width, values:[] } );
      }
    }

    let index = -1;
    for (let i=0; i < mesh.positions.length / 3; i++) {
      if (mesh.indices[i] > index) {
        newMesh.positions.push(mesh.positions[i*3], mesh.positions[i*3+1], mesh.positions[i*3+2]);
        newMesh.normals.push(mesh.normals[i*3], mesh.normals[i*3+1], mesh.normals[i*3+2]);
        if (mesh.colors)
          newMesh.colors.push(mesh.colors[i*3], mesh.colors[i*3+1], mesh.colors[i*3+2]);
        if (mesh.uvs)
          newMesh.uvs.push(mesh.uvs[i*2], mesh.uvs[i*2+1]);
        if (mesh.data) {
          for (let d=0;d<mesh.data.length;d++) {
            let data = mesh.data[d];
            let newData = newMesh.data[d];
            for (let v=0; v<data.width; v++) {
              newData.values.push(data.values[i*data.width+v]);
            }
          }          
        }
        
        index++;
      }
    }
    
    // console.log(`Indexed Geometry: From ${mesh.positions.length / 3} verts to ${lastIndex+1}`);
    
    return newMesh;
  }

  static _generateMaterial(definition, modeldefinition) {
    let ao = definition.ao || modeldefinition.ao;
    
    let material = { 
        type:              definition.type,
        roughness:         definition.roughness,
        metalness:         definition.metalness,
        opacity:           definition.opacity,
        alphaTest:         definition.alphaTest,
        transparent:       definition.isTransparent,
        refractionRatio:   definition.refractionRatio,
        wireframe:         definition.wireframe || modeldefinition.wireframe,
        fog:               definition.fog,      
        vertexColors:      'FaceColors',
      
        // No back, faces are reverse instead because GLTF does not support back faces
        side:              definition.side === SVOX.DOUBLE ? SVOX.DOUBLE : SVOX.FRONT

      };

    if (definition.type !== SVOX.MATNORMAL) {
      // All materials except normal material support colors
      
      // TODO: When none of the materials needs VertexColors, we should just set the material colors instead of using vertex colors.
      //if (definition.colorCount === 1 && !definition.aoActive && !modeldefinition.ao && modeldefinition.lights.length === 0) {
      //  material.vertexColors = 'NoColors';
      //  material.color = definition.colors[0].toString();
      //}
      //else {
      //  material.vertexColors = 'VertexColors';
      //}
      material.vertexColors = 'VertexColors';
      material.color = "#FFF";
    }
    
    if (definition.emissive) {
      material.emissive = definition.emissive.color.toString();
      material.emissiveIntensity = definition.emissive.intensity;
    }
    
    if (definition.map) {
      material.map = { image:    definition.map.image, 
                       uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                       vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                       uoffset:  definition.mapTransform.uoffset, 
                       voffset:  definition.mapTransform.voffset,
                       rotation: definition.mapTransform.rotation };
    }
    
    if (definition.normalMap) {
      material.normalMap = { image:    definition.normalMap.image, 
                             uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                             vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                             uoffset:  definition.mapTransform.uoffset, 
                             voffset:  definition.mapTransform.voffset,
                             rotation: definition.mapTransform.rotation };
    }
    
    if (definition.roughnessMap) {
      material.roughnessMap = { image:    definition.roughnessMap.image, 
                                uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                                vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                                uoffset:  definition.mapTransform.uoffset, 
                                voffset:  definition.mapTransform.voffset,
                                rotation: definition.mapTransform.rotation };
    }

    if (definition.metalnessMap) {
      material.metalnessMap = { image:    definition.metalnessMap.image, 
                                uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                                vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                                uoffset:  definition.mapTransform.uoffset, 
                                voffset:  definition.mapTransform.voffset,
                                rotation: definition.mapTransform.rotation };
    }

    if (definition.emissiveMap) {
      material.emissiveMap = { image:    definition.emissiveMap.image, 
                               uscale:   definition.mapTransform.uscale === -1 ? 1 : definition.mapTransform.uscale, 
                               vscale:   definition.mapTransform.vscale === -1 ? 1 : definition.mapTransform.vscale,
                               uoffset:  definition.mapTransform.uoffset, 
                               voffset:  definition.mapTransform.voffset,
                               rotation: definition.mapTransform.rotation };
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
  
  static _generateLights(model, mesh) {
    if (model.lights.some((light) => light.size)) {
      
      // The octahedron that will be subdivided depending on the light.detail
      let vTop      = { x: 0, y: 1, z: 0 };
      let vFront    = { x: 0, y: 0, z:-1 };
      let vRight    = { x: 1, y: 0, z: 0 };
      let vBack     = { x: 0, y: 0, z: 1 };
      let vLeft     = { x:-1, y: 0, z: 0 };
      let vBottom   = { x: 0, y:-1, z: 0 };

      let start = mesh.positions.length;
      model.lights.filter(l => l.position).forEach(function(light) {
        if (light.size > 0) {
          let scale = light.size / 2;
          let detail = light.detail;

          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vFront, vRight,  vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vRight, vBack,   vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vBack,  vLeft,   vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vLeft,  vFront,  vTop  , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vFront, vBottom, vRight, mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vRight, vBottom, vBack , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vBack,  vBottom, vLeft , mesh);
          SvoxMeshGenerator._createLightFace(light.position, light.color, scale, detail, vLeft,  vBottom, vFront, mesh);
        }
      });
      let end = mesh.positions.length;
      
      // Add the group for the lights (it always uses the first material, so index 0)
      mesh.groups.push( { start: start/3, count: (end-start)/3, materialIndex: 0 } );           
    }
  }
  
  static _createLightFace(position, color, scale, divisions, v0, v1, v2, mesh) {
    if (divisions === 0) {
      mesh.positions.push(position.x + v2.x * scale, position.y + v2.y * scale, position.z + v2.z * scale); 
      mesh.positions.push(position.x + v1.x * scale, position.y + v1.y * scale, position.z + v1.z * scale); 
      mesh.positions.push(position.x + v0.x * scale, position.y + v0.y * scale, position.z + v0.z * scale); 

      mesh.normals.push(0.0, 0.0, 1.0);
      mesh.normals.push(0.0, 0.0, 1.0);
      mesh.normals.push(0.0, 0.0, 1.0);

      mesh.colors.push(color.r, color.g, color.b);
      mesh.colors.push(color.r, color.g, color.b);
      mesh.colors.push(color.r, color.g, color.b);

      if (mesh.uvs) {
        mesh.uvs.push(0.0, 0.0);
        mesh.uvs.push(0.0, 0.0);
        mesh.uvs.push(0.0, 0.0);
      }    
    }
    else {
      // Recursively subdivide untill we have the number of divisions we need
      let v10 = SvoxMeshGenerator._normalize( { x:(v1.x+v0.x)/2, y:(v1.y+v0.y)/2, z:(v1.z+v0.z)/2 } );  
      let v12 = SvoxMeshGenerator._normalize( { x:(v1.x+v2.x)/2, y:(v1.y+v2.y)/2, z:(v1.z+v2.z)/2 } );
      let v02 = SvoxMeshGenerator._normalize( { x:(v0.x+v2.x)/2, y:(v0.y+v2.y)/2, z:(v0.z+v2.z)/2 } );
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v10, v1,  v12, mesh);
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v0,  v10, v02, mesh);
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v02, v12, v2,  mesh);
      SvoxMeshGenerator._createLightFace(position, color, scale, divisions-1, v10, v12, v02, mesh);
    }
  }
  
  static _generateAll(model, mesh) {
    let shells = SvoxMeshGenerator._getAllShells(model);

    // Add all vertices to the geometry     
    model.materials.baseMaterials.forEach(function(material) {
      if (material.colorUsageCount > 0) {

        let start = mesh.positions.length;

        model.voxels.forEach(function(voxel) {
          
          if (voxel.material.index === material.index) {
            SvoxMeshGenerator._generateVoxel(model, voxel, mesh);
          }
          
          shells.forEach(function (shell) {
            if (shell.shellMaterialIndex === material.index &&
                shell.voxelMaterial === voxel.color.material) {
              SvoxMeshGenerator._generateVoxelShell(model, voxel, mesh, shell.distance, shell.color);
            }
          }, this);
          
        }, this, true);
        
        // Add the group for this material
        let end = mesh.positions.length;
        mesh.groups.push( { start:start/3, count: (end-start)/3, materialIndex:material.index } );       
        
      }      
    }, this);       
  }

  static _generateVoxel(model, voxel, mesh) {
    for (let f = 0; f < SVOX._FACES.length; f++) {
      let face = voxel.faces[SVOX._FACES[f]];
      if (face && !face.skipped) {
        SvoxMeshGenerator._generateVoxelFace(model, voxel, face, mesh);
      }  
    }
  }

  static _generateVoxelFace(model, voxel, face, mesh) {
    let vert0, vert1, vert2, vert3;
    let norm0, norm1, norm2, norm3;
    let col0, col1, col2, col3;
    let uv0, uv1, uv2, uv3;
    let id = '';
    
    vert0 = face.vertices[0];
    vert1 = face.vertices[1];
    vert2 = face.vertices[2];
    vert3 = face.vertices[3];
        
    norm0 = face.normals[0];
    norm1 = face.normals[1];
    norm2 = face.normals[2];
    norm3 = face.normals[3];
    
    if (face.vertexColors) {
      col0 = face.vertexColors[0];
      col1 = face.vertexColors[1];
      col2 = face.vertexColors[2];
      col3 = face.vertexColors[3];
    }
    
    if (mesh.uvs) {
      uv0 = face.uv[0] || { u:0, v:0 };
      uv1 = face.uv[1] || { u:0, v:0 };
      uv2 = face.uv[2] || { u:0, v:0 };
      uv3 = face.uv[3] || { u:0, v:0 };
    }
        
    if (voxel.color.material.side === 'back') {
      let swap;
      swap = vert0; vert0 = vert2; vert2 = swap;
      swap = norm0; norm0 = norm2; norm2 = swap;
      swap =  col0;  col0 =  col2;  col2 = swap;
      swap =   uv0;   uv0 =   uv2;   uv2 = swap;
    }
        
    // Face 1
    mesh.positions.push(vert2.x, vert2.y, vert2.z); 
    mesh.positions.push(vert1.x, vert1.y, vert1.z); 
    mesh.positions.push(vert0.x, vert0.y, vert0.z); 
    
    // Face 2
    mesh.positions.push(vert0.x, vert0.y, vert0.z); 
    mesh.positions.push(vert3.x, vert3.y, vert3.z); 
    mesh.positions.push(vert2.x, vert2.y, vert2.z); 
    
    if (voxel.material.lighting === SVOX.SMOOTH || (voxel.material.lighting === SVOX.BOTH && face.smooth)) {
      // Face 1
      mesh.normals.push(norm2.x, norm2.y, norm2.z);
      mesh.normals.push(norm1.x, norm1.y, norm1.z);
      mesh.normals.push(norm0.x, norm0.y, norm0.z);

      // Face 2
      mesh.normals.push(norm0.x, norm0.y, norm0.z);
      mesh.normals.push(norm3.x, norm3.y, norm3.z);
      mesh.normals.push(norm2.x, norm2.y, norm2.z);
    }
    else {
      // Average the normals to get the flat normals
      let normFace1 = model._normalize({ x:norm2.x+norm1.x+norm0.x, y:norm2.y+norm1.y+norm0.y, z:norm2.z+norm1.z+norm0.z});
      let normFace2 = model._normalize({ x:norm0.x+norm3.x+norm2.x, y:norm0.y+norm3.y+norm2.y, z:norm0.z+norm3.z+norm2.z});
      if (voxel.material.lighting === SVOX.QUAD) {
        normFace1 = model._normalize({ x:normFace1.x+normFace2.x, y:normFace1.y+normFace2.y, z:normFace1.z+normFace2.z});
        normFace2 = normFace1;
      }
      
      // Face 1
      mesh.normals.push(normFace1.x, normFace1.y, normFace1.z);
      mesh.normals.push(normFace1.x, normFace1.y, normFace1.z);
      mesh.normals.push(normFace1.x, normFace1.y, normFace1.z);

      // Face 2
      mesh.normals.push(normFace2.x, normFace2.y, normFace2.z);
      mesh.normals.push(normFace2.x, normFace2.y, normFace2.z);
      mesh.normals.push(normFace2.x, normFace2.y, normFace2.z);
    }
    
    if (face.vertexColors) {     

      // TODO: move to prepare for render, now it is done multiple times
      if (SVOX.clampColors) {
        col0 = col0.normalize();
        col1 = col1.normalize();
        col2 = col2.normalize();
        col3 = col3.normalize();
      }
      
      // Face 1
      mesh.colors.push(col2.r, col2.g, col2.b); 
      mesh.colors.push(col1.r, col1.g, col1.b); 
      mesh.colors.push(col0.r, col0.g, col0.b); 

      // Face 2
      mesh.colors.push(col0.r, col0.g, col0.b); 
      mesh.colors.push(col3.r, col3.g, col3.b); 
      mesh.colors.push(col2.r, col2.g, col2.b); 
    }
    else if (face.color) {
        // Face colors, so all vertices for both faces are the same color
        for (let v=0; v<6; v++) {
          mesh.colors.push(face.color.r, face.color.g, face.color.b);
        }
    }
    else {
        // Material colors
        let color = voxel.color;
        for (let v=0; v<6; v++) {
          mesh.colors.push(color.r, color.g, color.b);
        }
    }
      
    if (mesh.uvs) {
     
      // Face 1
      mesh.uvs.push(uv2.u, uv2.v);
      mesh.uvs.push(uv1.u, uv1.v);
      mesh.uvs.push(uv0.u, uv0.v);

      // Face 1
      mesh.uvs.push(uv0.u, uv0.v);
      mesh.uvs.push(uv3.u, uv3.v);
      mesh.uvs.push(uv2.u, uv2.v);
    }
    
    if (mesh.data) {
      let data = voxel.material.data || model.data;
      for (let vertex=0;vertex<6;vertex++) {
        for (let d=0;d<data.length;d++) {
          for (let v=0;v<data[d].values.length;v++) {
            mesh.data[d].values.push(data[d].values[v]);
          }
        }
      }
    }
  }

  static _getAllShells(model) {
   
    let shells = [];
    
    model.materials.forEach(function (material) {    
      
      let shell = undefined
      if (model.shell && model.shell.length > 0 && !material.shell)
        shell = model.shell;
      if (material.shell && material.shell.length > 0)
        shell = material.shell;
      
      if (shell) {
        shell.forEach(function (sh) {
          shells.push({
            voxelMaterial: material,
            shellMaterialIndex: sh.color.material.index,
            color: sh.color,
            distance: sh.distance
          });
        }, this);
      }
    }, this);
    
    shells.sort(function(a,b) {
      let v = a.shellMaterialIndex - b.shellMaterialIndex;
    });
    
    return shells;
  };
  
  static _generateVoxelShell(model, voxel, mesh, distance, color) {
    for (let f = 0; f < SVOX._FACES.length; f++) {
      let face = voxel.faces[SVOX._FACES[f]];
      if (face && !face.skipped) {
        SvoxMeshGenerator._generateVoxelShellFace(model, voxel, face, mesh, distance, color);
      }  
    }
  }

  static _generateVoxelShellFace(model, voxel, face, mesh, distance, color) {
    let vert0, vert1, vert2, vert3;
    let shellDirection0, shellDirection1, shellDirection2, shellDirection3;
    let norm0, norm1, norm2, norm3;
    let col0, col1, col2, col3;
    let uv0, uv1, uv2, uv3;
    
    vert0 = face.vertices[0];
    vert1 = face.vertices[1];
    vert2 = face.vertices[2];
    vert3 = face.vertices[3];
    
    shellDirection0 = face.smoothNormals[0];
    shellDirection1 = face.smoothNormals[1];
    shellDirection2 = face.smoothNormals[2];
    shellDirection3 = face.smoothNormals[3];

    // Now set the actual normals for this face
    let normals = null;
    switch (color.material.lighting) {
      case SVOX.SMOOTH:
        normals = face.smoothNormals;
        break;
      case SVOX.BOTH:
        normals = face.smooth ? face.bothNormals : face.flatNormals; 
        break;
      default:
        normals = face.flatNormals;
        break;
    }    

    norm0 = normals[0];
    norm1 = normals[1];
    norm2 = normals[2];
    norm3 = normals[3];
    
    if (mesh.uvs) {
      uv0 = face.uv[0] || { u:0.0001, v:0.0001 };
      uv1 = face.uv[1] || { u:0.0001, v:0.9999 };
      uv2 = face.uv[2] || { u:0.9999, v:0.9999 };
      uv3 = face.uv[3] || { u:0.9999, v:0.0001 };
    }
        
    if (color.material.side === 'back') {
      let swap;
      swap = vert0; vert0 = vert2; vert2 = swap;
      swap = norm0; norm0 = norm2; norm2 = swap;
      swap = shellDirection0; shellDirection0 = shellDirection2; shellDirection2 = swap;
      swap =   uv0;   uv0 =   uv2;   uv2 = swap;
    }
    
    // Push out the vertices according to the average normals
    let vert0x = vert0.x + shellDirection0.x * distance * model.scale.x;
    let vert0y = vert0.y + shellDirection0.y * distance * model.scale.y;
    let vert0z = vert0.z + shellDirection0.z * distance * model.scale.z;
    let vert1x = vert1.x + shellDirection1.x * distance * model.scale.x;  
    let vert1y = vert1.y + shellDirection1.y * distance * model.scale.y;
    let vert1z = vert1.z + shellDirection1.z * distance * model.scale.z;
    let vert2x = vert2.x + shellDirection2.x * distance * model.scale.x;  
    let vert2y = vert2.y + shellDirection2.y * distance * model.scale.y;
    let vert2z = vert2.z + shellDirection2.z * distance * model.scale.z;
    let vert3x = vert3.x + shellDirection3.x * distance * model.scale.x;  
    let vert3y = vert3.y + shellDirection3.y * distance * model.scale.y;
    let vert3z = vert3.z + shellDirection3.z * distance * model.scale.z;
            
    // Face 1
    mesh.positions.push(vert2x, vert2y, vert2z); 
    mesh.positions.push(vert1x, vert1y, vert1z); 
    mesh.positions.push(vert0x, vert0y, vert0z); 
    
    // Face 2
    mesh.positions.push(vert0x, vert0y, vert0z); 
    mesh.positions.push(vert3x, vert3y, vert3z); 
    mesh.positions.push(vert2x, vert2y, vert2z);  

    if (color.material.lighting === SVOX.SMOOTH || (color.material.lighting === SVOX.BOTH && face.smooth)) {
      // Face 1
      mesh.normals.push(norm2.x, norm2.y, norm2.z);
      mesh.normals.push(norm1.x, norm1.y, norm1.z);
      mesh.normals.push(norm0.x, norm0.y, norm0.z);

      // Face 2
      mesh.normals.push(norm0.x, norm0.y, norm0.z);
      mesh.normals.push(norm3.x, norm3.y, norm3.z);
      mesh.normals.push(norm2.x, norm2.y, norm2.z);
    }
    else {
      // Average the normals to get the flat normals
      let normFace1 = model._normalize({ x:norm2.x+norm1.x+norm0.x, y:norm2.y+norm1.y+norm0.y, z:norm2.z+norm1.z+norm0.z});
      let normFace2 = model._normalize({ x:norm0.x+norm3.x+norm2.x, y:norm0.y+norm3.y+norm2.y, z:norm0.z+norm3.z+norm2.z});
      if (voxel.material.lighting === SVOX.QUAD) {
        normFace1 = model._normalize({ x:normFace1.x+normFace2.x, y:normFace1.y+normFace2.y, z:normFace1.z+normFace2.z});
        normFace2 = normFace1;
      }
      
      // Face 1
      mesh.normals.push(normFace1.x, normFace1.y, normFace1.z);
      mesh.normals.push(normFace1.x, normFace1.y, normFace1.z);
      mesh.normals.push(normFace1.x, normFace1.y, normFace1.z);

      // Face 2
      mesh.normals.push(normFace2.x, normFace2.y, normFace2.z);
      mesh.normals.push(normFace2.x, normFace2.y, normFace2.z);
      mesh.normals.push(normFace2.x, normFace2.y, normFace2.z);
    }

    for (let v=0; v<6; v++) {
      mesh.colors.push(color.r, color.g, color.b);
    }
      
    if (mesh.uvs) {     
      // Face 1
      mesh.uvs.push(uv2.u, uv2.v);
      mesh.uvs.push(uv1.u, uv1.v);
      mesh.uvs.push(uv0.u, uv0.v);

      // Face 1
      mesh.uvs.push(uv0.u, uv0.v);
      mesh.uvs.push(uv3.u, uv3.v);
      mesh.uvs.push(uv2.u, uv2.v);
    }
    
    if (mesh.data) {
      let data = voxel.material.data || model.data;
      for (let vertex=0;vertex<6;vertex++) {
        for (let d=0;d<data.length;d++) {
          for (let v=0;v<data[d].values.length;v++) {
            mesh.data.push(data[d].values[v]);
          }
        }
      }
    }    
  }
  
  static _normalize(v) {
    let l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
    v.x /= l; 
    v.y /= l; 
    v.z /= l;
    return v;
  } 
}


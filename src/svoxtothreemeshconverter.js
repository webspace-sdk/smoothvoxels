class SvoxToThreeMeshConverter {
  static generate(model) {
    let materials = [];

    model.materials.forEach(function (material) {
      materials.push(SvoxToThreeMeshConverter._generateMaterial(material));
    }, this);

    let geometry = new THREE.BufferGeometry();

    // Set the geometry attribute buffers from the model
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(model.positions, 3)
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(model.normals, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(model.colors, 3)
    );

    if (model.uvs)
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(model.uvs, 2)
      );

    if (model.data) {
      for (let d = 0; d < model.data.length; d++) {
        geometry.setAttribute(
          model.data[d].name,
          new THREE.Float32BufferAttribute(
            model.data[d].values,
            model.data[d].width
          )
        );
      }
    }

    geometry.setIndex(model.indices);

    //let indices = [];
    //for (let i = 0; i < model.positions.length / 3; i++) {
    //  indices.push(i);
    //}
    //geometry.setIndex(indices);

    // Add the groups for each material
    model.groups.forEach(function (group) {
      geometry.addGroup(group.start, group.count, group.materialIndex);
    }, this);

    geometry.computeBoundingBox();
    geometry.uvsNeedUpdate = true;

    //geometry = THREE.BufferGeometryUtils.mergeVertices(geometry);

    let mesh = new THREE.Mesh(geometry, materials);
    //return new THREE.VertexNormalsHelper(mesh, 0.1);
    //return new THREE.FaceNormalsHelper(mesh, 0.1);

    return mesh;
  }

  static _generateMaterial(definition) {
    // Create reflectivity from roughness
    definition.reflectivity =
      (1 - definition.roughness) * (definition.metalness * 0.95 + 0.05);

    // Create shininess from roughness
    definition.shininess =
      Math.pow(10, 5 * Math.pow(1 - definition.roughness, 1.1)) * 0.1;

    switch (definition.side) {
      case "back":
        definition.side = THREE.BackSide;
        break; // Should never occur, faces are reversed instead
      case "double":
        definition.side = THREE.DoubleSide;
        break;
      default:
        definition.side = THREE.FrontSide;
        break;
    }

    // Color encodings according to https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
    // TODO: Should color management be addressed aywhere else?

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
      definition.matcap = SvoxToThreeMeshConverter._generateTexture(
        definition.matcap.image,
        THREE.sRGBEncoding
      );
    }

    if (definition.reflectionMap) {
      definition.envMap = new THREE.TextureLoader().load(
        definition.reflectionMap.image
      );
      definition.envMap.encoding = THREE.sRGBEncoding;
      definition.envMap.mapping = THREE.EquirectangularReflectionMapping;
      delete definition.reflectionMap;
    }

    if (definition.refractionMap) {
      definition.envMap = new THREE.TextureLoader().load(
        definition.refractionMap.image
      );
      definition.envMap.encoding = THREE.sRGBEncoding;
      definition.envMap.mapping = THREE.EquirectangularRefractionMapping;
      delete definition.refractionMap;
    }

    let material = null;
    let type = definition.type;
    delete definition.index;
    delete definition.type;
    switch (type) {
      //case 'physical':
      //  Supported on A-Frame 1.3.0 for much better (single surface) refractive and reflective glass
      //  Use for instance metalness 0.1 and roughness 0.1 with the below settings
      //  definition.transmission =  1;
      //  definition.thickness = 1.5;
      //  material = new THREE.MeshPhysicalMaterial(definition);
      //  break;
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
        throw {
          name: "SyntaxError",
          message: `Unknown material type '${type}'.`,
        };
      }
    }

    return material;
  }

  static _generateTexture(
    image,
    encoding,
    uscale,
    vscale,
    uoffset,
    voffset,
    rotation
  ) {
    let threetexture = new THREE.TextureLoader().load(image);
    threetexture.encoding = encoding;
    threetexture.repeat.set(1 / uscale, 1 / vscale);
    threetexture.wrapS = THREE.RepeatWrapping;
    threetexture.wrapT = THREE.RepeatWrapping;
    threetexture.offset = new THREE.Vector2(uoffset, voffset);
    threetexture.rotation = (rotation * Math.PI) / 180;
    return threetexture;
  }
}

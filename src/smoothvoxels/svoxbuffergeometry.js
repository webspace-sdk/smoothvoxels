/* global THREE */

export default class SvoxBufferGeometry extends THREE.BufferGeometry {
  constructor () {
    super()
    this.type = 'SvoxBufferGeometry'
  }

  // Updates the geometry with the specified svox model
  update (svoxMesh, addGroups = true) {
    const { positions, normals, colors, bounds, uvs, data, indices } = svoxMesh

    this.freeAttributeMemory()

    let boundingBox = this.boundingBox
    let boundingSphere = this.boundingSphere

    if (!boundingBox) {
      boundingBox = this.boundingBox = new THREE.Box3()
    }

    if (!boundingSphere) {
      boundingSphere = this.boundingSphere = new THREE.Sphere()
    }

    boundingBox.min.set(bounds.minX, bounds.minY, bounds.minZ)
    boundingBox.max.set(bounds.maxX, bounds.maxY, bounds.maxZ)
    boundingSphere.center.set(bounds.centerX, bounds.centerY, bounds.centerZ)
    boundingSphere.radius = bounds.radius

    // Set the this attribute buffers from the model
    this.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    this.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    if (uvs) {
      this.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    }

    if (data) {
      for (let d = 0; d < data.length; d++) {
        this.setAttribute(data[d].name, new THREE.Float32BufferAttribute(data[d].values, data[d].width))
      }
    }

    this.setIndex(new THREE.BufferAttribute(indices, 1))
    this.clearGroups()

    if (addGroups) {
    // Add the groups for each material
      svoxMesh.groups.forEach(function (group) {
        this.addGroup(group.start, group.count, group.materialIndex)
      }, this)
    } else {
      this.setDrawRange(0, indices.length)
    }

    this.uvsNeedUpdate = true
  }

  dispose () {
    this.freeMemory()

    super.dispose()
  }

  freeMemory () {
    for (const attribute of Object.keys(this.attributes)) {
      this.deleteAttribute(attribute)
    }

    this.clearGroups()
  }
}

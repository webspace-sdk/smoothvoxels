class VertexTransformer {
         
  static transformVertices(model) {
    let bor = model.determineBoundsOffsetAndRescale(model.resize);
    
    // Define the transformation in reverse order to how they are carried out
    let vertexTransform = new Matrix(); 

    vertexTransform = Matrix.multiply(vertexTransform, Matrix.translate(model.position.x, model.position.y, model.position.z));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.z, 0, 0, 1));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.y, 0, 1, 0));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.rotate(model.rotation.x, 1, 0, 0)); 
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.scale(model.scale.x, model.scale.y, model.scale.z));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.scale(bor.rescale, bor.rescale, bor.rescale));
    vertexTransform = Matrix.multiply(vertexTransform, Matrix.translate(bor.offset.x, bor.offset.y, bor.offset.z));    
    
    // Convert the vertex transform matrix in a normal transform matrix 
    let normalTransform = Matrix.inverse(vertexTransform);
    normalTransform = Matrix.transpose(normalTransform);

    // Now move all vertices to their new position and transform the average normals
    model.forEachVertex(function(vertex) {      
      vertexTransform.transformPoint(vertex)
    }, this); 
         
    // Transform all normals
    model.voxels.forEach(function transformNormals(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face && !face.skipped) {
          for (let n = 0; n<face.normals.length; n++) {
            if (!face.flatNormals[n].transformed) {
              normalTransform.transformVector(face.flatNormals[n]);
              model._normalize(face.flatNormals[n]);
              face.flatNormals[n].transformed = true;
            }
            if (!face.smoothNormals[n].transformed) {
              normalTransform.transformVector(face.smoothNormals[n]);
              model._normalize(face.smoothNormals[n]);
              face.smoothNormals[n].transformed = true;
            }
            if (!face.bothNormals[n].transformed) {
              normalTransform.transformVector(face.bothNormals[n]);
              model._normalize(face.bothNormals[n]);
              face.bothNormals[n].transformed = true;
            }
          }
        }
      }
    }, this, true);
  }
  
}

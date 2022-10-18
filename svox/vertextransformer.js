const normalXs = [null, null, null, null];
const normalYs = [null, null, null, null];
const normalZs = [null, null, null, null];

class VertexTransformer {
         
  static transformVertices(model, buffers) {
    const { vertX, vertY, vertZ, faceVertNormalX, faceVertFlatNormalX, faceVertNormalY, faceVertFlatNormalY, faceVertNormalZ, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ } = buffers;
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
    for (let vertIndex = 0, c = model.vertCount; vertIndex < c; vertIndex++) {
      vertexTransform.transformPointInline(vertX, vertY, vertZ, vertIndex);
    }

    normalXs[0] = faceVertNormalX;
    normalYs[0] = faceVertNormalY;
    normalZs[0] = faceVertNormalZ;
    normalXs[1] = faceVertFlatNormalX;
    normalYs[1] = faceVertFlatNormalY;
    normalZs[1] = faceVertFlatNormalZ;
    normalXs[2] = faceVertSmoothNormalX;
    normalYs[2] = faceVertSmoothNormalY;
    normalZs[2] = faceVertSmoothNormalZ;
    normalXs[3] = faceVertBothNormalX;
    normalYs[3] = faceVertBothNormalY;
    normalZs[3] = faceVertBothNormalZ;

    // Transform all normals
    for (let faceIndex = 0, c = model.faceCount; faceIndex < c; faceIndex++) {
      const faceOffset = faceIndex * 4;

      for (let normalIndex = 0; normalIndex < 4; normalIndex++) {
        for (let normalType = 0, c = normalXs.length; normalType < c; normalType++) {
          const xs = normalXs[normalType];
          const ys = normalYs[normalType];
          const zs = normalZs[normalType];

          const idx = faceOffset + normalIndex;
          normalTransform.transformVectorInline(xs, ys, zs, idx);

          // Normalize
          const normalX = xs[idx];
          const normalY = ys[idx];
          const normalZ = zs[idx];

          const normalLength = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);

          if (normalLength > 0) {
            const d = 1 / normalLength;
            xs[idx] = normalX * d;
            ys[idx] = normalY * d;
            zs[idx] = normalZ * d;
          }
        }
      }
    }
  }
}

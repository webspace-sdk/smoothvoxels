function almostEqual(x, y) {
  return Math.abs(x - y) < 0.0001;
}

function assertAlmostEqual(x, y) {
  console.log(x, y, almostEqual(x, y));
  if (!almostEqual(x, y))
    throw new Error("Assertion failed: " + x + " != " + y);
}

class VertexLinker {
  
  static linkVertices(model, face, faceIndex) {
    const { faceClamped, faceNrOfClampedLinks, faceVertIndices, vertLinkIndices, vertLinkCounts } = model;

    const clamped = faceClamped.get(faceIndex);

    if (clamped === 1) {
      // Do not link clamped face vertices so the do not pull in the sides on deform.
      // But now this leaves these vertices with only 3 links, which offsets the average.
      // Add the vertex itself to compensate the average.
      // This, for instance, results in straight 45 degree roofs when clamping the sides.
      // This is the only difference in handling flatten vs clamp.
      for (let v = 0; v < 4; v++) {
        const vertIndex = faceVertIndices[faceIndex * 4 + v];

        let hasSelfLink = false;

        for (let l = 0, c = vertLinkCounts[vertIndex]; l < c; l++) {
          if (vertLinkIndices[vertIndex * 6 + l] === vertIndex) {
            hasSelfLink = true;
            break;
          }
        }

        if (!hasSelfLink) {
          vertLinkIndices[vertIndex * 6 + vertLinkCounts[vertIndex]] = vertIndex;
          vertLinkCounts[vertIndex]++;
        }

        vertLinkCounts[vertIndex]++;
      }
    } else {
      // Link each vertex with its neighbor and back (so not diagonally)
      for (let v = 0; v < 4; v++) {
        const vertIndexFrom = faceVertIndices[faceIndex * 4 + v];
        const vertIndexTo = faceVertIndices[faceIndex * 4 + (v + 1) % 4];

        let hasForwardLink = false;

        for (let l = 0, c = vertLinkCounts[vertIndexFrom]; l < c; l++) {
          if (vertLinkIndices[vertIndexFrom * 6 + l] === vertIndexTo) {
            hasForwardLink = true;
            break;
          }
        }

        if (!hasForwardLink) {
          vertLinkIndices[vertIndexFrom * 6 + vertLinkCounts[vertIndexFrom]] = vertIndexTo;
          vertLinkCounts[vertIndexFrom]++;
        }

        let hasBackwardLink = false;

        for (let l = 0, c = vertLinkCounts[vertIndexTo]; l < c; l++) {
          if (vertLinkIndices[vertIndexTo * 6 + l] === vertIndexFrom) {
            hasBackwardLink = true;
            break;
          }
        }

        if (!hasBackwardLink) {
          vertLinkIndices[vertIndexTo * 6 + vertLinkCounts[vertIndexTo]] = vertIndexFrom;
          vertLinkCounts[vertIndexTo]++;
        }
      }
    }

    if (face.skipped)
      return;
    
    if (face.clamped) {
      // Do not link clamped face vertices so the do not pull in the sides on deform.
      // But now this leaves these vertices with only 3 links, which offsets the average.
      // Add the vertex itself to compensate the average.
      // This, for instance, results in straight 45 degree roofs when clamping the sides.
      // This is the only difference in handling flatten vs clamp.
      for (let v = 0; v < 4; v++) {
        let vertex = face.vertices[v];
        if (vertex.links.indexOf(vertex) === -1) {
          vertex.links.push(vertex);
          vertex.nrOfClampedLinks++;
        }
      }
    }
    else {
      // Link each vertex with its neighbor and back (so not diagonally)
      for (let v = 0; v < 4; v++) {
        let vertexFrom = face.vertices[v];
        let vertexTo = face.vertices[(v+1) % 4];

        if (vertexFrom.links.indexOf(vertexTo) === -1)
          vertexFrom.links.push(vertexTo);
        if (vertexTo.links.indexOf(vertexFrom) === -1)
          vertexTo.links.push(vertexFrom);
      }
    }  

    model.voxels.forEach(function computeNormals(voxel) {
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped) 
          continue;

        for (let v = 0; v < 4; v++) {
          const vertFrom = face.vertices[v];
          if (vertFrom.links.length !== vertLinkCounts[faceVertIndices[face.faceIndex * 4 + v]]) {
            assertAlmostEqual(vertFrom.links.length, vertLinkCounts[faceVertIndices[face.faceIndex * 4 + v]]);
          }
        }
      }
    }, this, true);
  }
  
  static fixClampedLinks(model) {
    const voxels = model.voxels;

    const { faceNameIndices, faceEquidistant, faceSmooth, faceFlattened, faceClamped, faceVertFlatNormalX, faceVertFlatNormalY, faceVertFlatNormalZ, faceVertSmoothNormalX, faceVertSmoothNormalY, faceVertSmoothNormalZ, faceVertBothNormalX, faceVertBothNormalY, faceVertBothNormalZ, faceVertNormalX, faceVertNormalY, faceVertNormalZ, faceMaterials, faceVertIndices, faceNrOfClampedLinks, vertFullyClamped } = model;

    // Clamped sides are ignored when deforming so the clamped side does not pull in the other sodes.
    // This results in the other sides ending up nice and peripendicular to the clamped sides.
    // However, this als makes all of the vertices of the clamped side not deform.
    // This then results in the corners of these sides sticking out sharply with high deform counts.
    
    // Find all vertices that are fully clamped (i.e. not at the edge of the clamped side)
    for (let faceIndex = 0; faceIndex < model.faceCount; faceIndex++) {
      const clamped = faceClamped.get(faceIndex);
      if (clamped === 0) return;

      for (let v = 0; v < 4; v++) {
        const vertIndexFrom = faceVertIndices[faceIndex * 4 + v];
        const vertIndexTo = faceVertIndices[faceIndex * 4 + (v + 1) % 4];

        const nrOfClampedLinks = faceNrOfClampedLinks[vertIndex];
        const linkCount = vertLinkCounts[vertIndex];

        if (nrOfClampedLinks === linkCount) {
          vertFullyClamped.set(vertIndex, 1);
          vertLinkCounts[vertIndex] = 0; // Leave link vert indices dangling.
        }
      }
    }

    // For these fully clamped vertices add links for normal deforming
    for (let faceIndex = 0; faceIndex < model.faceCount; faceIndex++) {
      const clamped = faceClamped.get(faceIndex);
      if (clamped === 0) return;

      for (let v = 0; v < 4; v++) {
        const vertIndex = faceVertIndices[faceIndex * 4 + v];
        if (vertFullyClamped.get(vertIndex) === 1) continue;

        const vertIndexFrom = faceVertIndices[faceIndex * 4 + v];
        const vertIndexTo = faceVertIndices[faceIndex * 4 + (v + 1) % 4];

        if (vertFullyClamped.get(vertIndexFrom) === 1) {
          let hasForwardLink = false;

          for (let l = 0; l < vertLinkCounts[vertIndexFrom]; l++) {
            if (vertLinkIndices[vertIndexFrom * 6 + l] === vertIndexTo) {
              hasForwardLink = true;
              break;
            }
          }

          if (!hasForwardLink) {
            vertLinkIndices[vertIndexFrom * 6 + vertLinkCounts[vertIndexFrom]] = vertIndexTo;
            vertLinkCounts[vertIndexFrom]++;
          }
        }

        if (vertFullyClamped.get(vertIndexTo) === 1) {
          let hasBackwardLink = false;

          for (let l = 0; l < vertLinkCounts[vertIndexTo]; l++) {
            if (vertLinkIndices[vertIndexTo * 6 + l] === vertIndexFrom) {
              hasBackwardLink = true;
              break;
            }
          }

          if (!hasBackwardLink) {
            vertLinkIndices[vertIndexTo * 6 + vertLinkCounts[vertIndexTo]] = vertIndexFrom;
            vertLinkCounts[vertIndexTo]++;
          }
        }
      }
    }

    // Clamped sides are ignored when deforming so the clamped side does not pull in the other sodes.
    // This results in the other sides ending up nice and peripendicular to the clamped sides.
    // However, this als makes all of the vertices of the clamped side not deform.
    // This then results in the corners of these sides sticking out sharply with high deform counts.
    
    // Find all vertices that are fully clamped (i.e. not at the edge of the clamped side)
    voxels.forEach(function(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped || !face.clamped)
          continue;

        for (let v = 0; v < 4; v++) {
          let vertex = face.vertices[v];
          vertex.fullyClamped = vertex.fullyClamped || (vertex.nrOfClampedLinks === vertex.links.length);
          if (vertex.fullyClamped)
            vertex.links = [];
        }
 
      }        
    }, this, true);

    // For these fully clamped vertices add links for normal deforming
    voxels.forEach(function(voxel) {
      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped || !face.clamped) 
          continue;
        
        for (let v = 0; v < 4; v++) {
          let vertexFrom = face.vertices[v];
          let vertexTo = face.vertices[(v+1) % 4];

          if (vertexFrom.fullyClamped && vertexFrom.links.indexOf(vertexTo) === -1) {
            vertexFrom.links.push(vertexTo);
          }
          if (vertexTo.fullyClamped && vertexTo.links.indexOf(vertexFrom) === -1) {
            vertexTo.links.push(vertexFrom);
          }
        }
      }
    }, this, true);
  }   
  
  static logLinks(voxels) {
    voxels.forEach(function(voxel) {      
      for (let faceName in voxel.faces) {
        let face = voxel.faces[faceName];
        if (face.skipped)
          continue;
        
        let log = `VOXEL (${voxel.x},${voxel.y},${voxel.z}):${faceName}\r\n`;
        for (let v = 0; v < 4; v++) {
          let vertex = face.vertices[v];
          vertex.fullyClamped = vertex.fullyClamped || (vertex.nrOfClampedLinks === vertex.links.length);
          log += `    VERTEX (${vertex.x},${vertex.y},${vertex.z}):${vertex.fullyClampes?"fully":""} :`;
          for (let l = 0; l < vertex.links.length; l++) {
            let link = vertex.links[l];
            log += `(${link.x},${link.y},${link.z}) `;          
          }
          log += `\r\n`;
        }
        
        console.log(log);
      }
    }, this, true);
  }
  
}

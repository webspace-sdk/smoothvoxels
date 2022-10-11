var SVOX = {
  clampColors: false,
  models : {}
};

// Material type constants
SVOX.MATSTANDARD = "standard";
SVOX.MATBASIC    = "basic";
SVOX.MATLAMBERT  = "lambert";
SVOX.MATPHONG    = "phong";
SVOX.MATMATCAP   = "matcap";
SVOX.MATTOON     = "toon";
SVOX.MATNORMAL   = "normal";

// Material resize constants
SVOX.BOUNDS = "bounds"; // Resize the bounds to fit the model
SVOX.MODEL  = "model";  // Resize the model to fit the bounds

// Material lighting constants
SVOX.FLAT   = "flat";   // Flat shaded triangles
SVOX.QUAD   = "quad";   // Flat shaded quads
SVOX.SMOOTH = "smooth"; // Smooth shaded triangles
SVOX.BOTH   = "both";   // Smooth shaded, but flat shaded clamped / flattened

// Material side constants
SVOX.FRONT  = "front";  // Show only front side of the material
SVOX.BACK   = "back";   // Show only back side of the material
SVOX.DOUBLE = "double"; // Show both sides of the material

SVOX._FACES   = [ 'nx', 'px', 'ny', 'py', 'nz', 'pz'];

// Vertex numbering per side. 
// The shared vertices for side nx (negative x) and pz (positive z) indicated as example:
//
//           --------
//           |1    2|
//           |  py  |
//           |0    3|
//    -----------------------------
//    |1   [2|1]   2|1    2|1    2|    nx shares vertext 2 & 3 
//    |  nx  |  pz  |  px  |  nz  |
//    |0   [3|0]   3|0    3|0    3|    with vertex 1 & 0 of pz
//    -----------------------------
//           |1    2|
//           |  ny  |
//           |0    3|
//           --------

// Define the vertex offsets for each side.

SVOX._VERTICES = {
  nx: [ { x:0, y:0, z:0 },  
        { x:0, y:1, z:0 },  
        { x:0, y:1, z:1 },  
        { x:0, y:0, z:1 }  
      ],
  px: [ { x:1, y:0, z:1 },  
        { x:1, y:1, z:1 },  
        { x:1, y:1, z:0 },  
        { x:1, y:0, z:0 }  
      ],
  ny: [ { x:0, y:0, z:0 },  
        { x:0, y:0, z:1 },  
        { x:1, y:0, z:1 },  
        { x:1, y:0, z:0 }  
      ],
  py: [ { x:0, y:1, z:1 },  
        { x:0, y:1, z:0 },  
        { x:1, y:1, z:0 },  
        { x:1, y:1, z:1 }  
      ],
  nz: [ { x:1, y:0, z:0 },  
        { x:1, y:1, z:0 },  
        { x:0, y:1, z:0 },  
        { x:0, y:0, z:0 }  
      ],
  pz: [ { x:0, y:0, z:1 },  
        { x:0, y:1, z:1 },  
        { x:1, y:1, z:1 },  
        { x:1, y:0, z:1 }  
      ]
};

// Define the neighbor voxels for each face
SVOX._NEIGHBORS = {
  nx: { x:-1, y:0, z:0 },
  px: { x:+1, y:0, z:0 },
  ny: { x:0, y:-1, z:0 },
  py: { x:0, y:+1, z:0 },
  nz: { x:0, y:0, z:-1 },
  pz: { x:0, y:0, z:+1 }  
};

// Define the uv's for each face
// Textures can be shown on all sides of all voxels (allows scaling and rotating) 
// Or a textures with the layout below can be projected on all model sides (no scaling or rotating allowed) 
// NOTE: To cover a model, ensure that the model fits the voxel matrix, i.e has no empty voxels next to it 
//       (export the model to remove unused space).
//
//    0.0   0.25    0.5    0.75   1.0
// 1.0 -----------------------------
//     |      |o     |      |      |
//     |      |  py  |      |  ny  |
//     |      |      |      |o     |
// 0.5 -----------------------------
//     |      |      |      |      |
//     |  nx  |  pz  |  px  |  nz  |
//     |o     |      |     o|      |
// 0.0 -----------------------------
//
SVOX._FACEUVS = {
  nx: {u:'z', v:'y', order:[0,1,2,3], ud: 1, vd: 1, uo:0.00, vo:0.00 },
  px: {u:'z', v:'y', order:[3,2,1,0], ud:-1, vd: 1, uo:0.75, vo:0.00 },
  ny: {u:'x', v:'z', order:[0,1,2,3], ud: 1, vd: 1, uo:0.75, vo:0.50 },
  py: {u:'x', v:'z', order:[1,0,3,2], ud: 1, vd:-1, uo:0.25, vo:1.00 }, 
  nz: {u:'x', v:'y', order:[3,2,1,0], ud:-1, vd: 1, uo:1.00, vo:0.00 },  
  pz: {u:'x', v:'y', order:[0,1,2,3], ud: 1, vd: 1, uo:0.25, vo:0.00 }  
};
SVOX._FACEINDEXUVS = [
  {u:'z', v:'y', order:[0,1,2,3], ud: 1, vd: 1, uo:0.00, vo:0.00 },
  {u:'z', v:'y', order:[3,2,1,0], ud:-1, vd: 1, uo:0.75, vo:0.00 },
  {u:'x', v:'z', order:[0,1,2,3], ud: 1, vd: 1, uo:0.75, vo:0.50 },
  {u:'x', v:'z', order:[1,0,3,2], ud: 1, vd:-1, uo:0.25, vo:1.00 }, 
  {u:'x', v:'y', order:[3,2,1,0], ud:-1, vd: 1, uo:1.00, vo:0.00 },  
  {u:'x', v:'y', order:[0,1,2,3], ud: 1, vd: 1, uo:0.25, vo:0.00 }  
];

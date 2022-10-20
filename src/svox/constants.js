// Material type constants
export const MATSTANDARD = 'standard'
export const MATBASIC = 'basic'
export const MATLAMBERT = 'lambert'
export const MATPHONG = 'phong'
export const MATMATCAP = 'matcap'
export const MATTOON = 'toon'
export const MATNORMAL = 'normal'

// Material resize constants
export const BOUNDS = 'bounds' // Resize the bounds to fit the model
export const MODEL = 'model' // Resize the model to fit the bounds

// Material lighting constants
export const FLAT = 'flat' // Flat shaded triangles
export const QUAD = 'quad' // Flat shaded quads
export const SMOOTH = 'smooth' // Smooth shaded triangles
export const BOTH = 'both' // Smooth shaded, but flat shaded clamped / flattened

// Material side constants
export const FRONT = 'front' // Show only front side of the material
export const BACK = 'back' // Show only back side of the material
export const DOUBLE = 'double' // Show both sides of the material

export const _FACES = ['nx', 'px', 'ny', 'py', 'nz', 'pz']

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

export const _VERTEX_OFFSETS = [
  // nx
  [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]],
  // px
  [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]],
  // ny
  [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]],
  // py
  [[0, 1, 1], [0, 1, 0], [1, 1, 0], [1, 1, 1]],
  // nz
  [[1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]],
  // pz
  [[0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]]
]

// Define the neighbor voxels for each face
export const _NEIGHBORS = [
  [-1, 0, 0], // nx
  [+1, 0, 0], // px
  [0, -1, 0], // ny
  [0, +1, 0], // py
  [0, 0, -1], // nz
  [0, 0, +1] // pz
]

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
export const _FACEINDEXUVS = [
  { u: 'z', v: 'y', order: [0, 1, 2, 3], ud: 1, vd: 1, uo: 0.00, vo: 0.00 },
  { u: 'z', v: 'y', order: [3, 2, 1, 0], ud: -1, vd: 1, uo: 0.75, vo: 0.00 },
  { u: 'x', v: 'z', order: [0, 1, 2, 3], ud: 1, vd: 1, uo: 0.75, vo: 0.50 },
  { u: 'x', v: 'z', order: [1, 0, 3, 2], ud: 1, vd: -1, uo: 0.25, vo: 1.00 },
  { u: 'x', v: 'y', order: [3, 2, 1, 0], ud: -1, vd: 1, uo: 1.00, vo: 0.00 },
  { u: 'x', v: 'y', order: [0, 1, 2, 3], ud: 1, vd: 1, uo: 0.25, vo: 0.00 }
]

// Optimization over above
export const _FACEINDEXUV_MULTIPLIERS = [
  [[0, 0, 1], [0, 1, 0]],
  [[0, 0, 1], [0, 1, 0]],
  [[1, 0, 0], [0, 0, 1]],
  [[1, 0, 0], [0, 0, 1]],
  [[1, 0, 0], [0, 1, 0]],
  [[1, 0, 0], [0, 1, 0]]
]

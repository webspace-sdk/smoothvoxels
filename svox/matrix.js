// Single Matrix class adapted from https://github.com/evanw/lightgl.js
// Simplified to only the parts needed

// Represents a 4x4 matrix stored in row-major order that uses Float32Arrays
// when available. Matrix operations can either be done using convenient
// methods that return a new matrix for the result or optimized methods
// that store the result in an existing matrix to avoid generating garbage.

let hasFloat32Array = (typeof Float32Array != 'undefined');

// ### new Matrix()
//
// This constructor creates an identity matrix.
class Matrix {
  
  constructor() {
    let m = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
    this.m = hasFloat32Array ? new Float32Array(m) : m;
  }

  // ### .transformPoint(point)
  //
  // Transforms the vector as a point with a w coordinate of 1. This
  // means translations will have an effect, for example.
  transformPoint(v) {
    let m = this.m;
    let div = m[12] * v.x + m[13] * v.y + m[14] * v.z + m[15];
    let x = ( m[0] * v.x + m[1] * v.y + m[2] * v.z + m[3] ) / div;
    let y = ( m[4] * v.x + m[5] * v.y + m[6] * v.z + m[7] ) / div;
    let z = ( m[8] * v.x + m[9] * v.y + m[10] * v.z + m[11] ) / div;
    v.x = x;
    v.y = y;
    v.z = z;
  }

  transformPointInline(xs, ys, zs, index) {
    const vx = xs[index];
    const vy = ys[index];
    const vz = zs[index];

    let m = this.m;
    let div = m[12] * vx + m[13] * vy + m[14] * vz + m[15];
    let x = ( m[0] * vx + m[1] * vy + m[2] * vz + m[3] ) / div;
    let y = ( m[4] * vx + m[5] * vy + m[6] * vz + m[7] ) / div;
    let z = ( m[8] * vx + m[9] * vy + m[10] * vz + m[11] ) / div;
    xs[index] = x;
    ys[index] = y;
    zs[index] = z;
  }

  // ### .transformVector(vector)
  //
  // Transforms the vector as a vector with a w coordinate of 0. This
  // means translations will have no effect, for example.
  transformVector(v) {
    let m = this.m;
    let x = ( m[0] * v.x + m[1] * v.y + m[2] * v.z );
    let y = ( m[4] * v.x + m[5] * v.y + m[6] * v.z );
    let z = ( m[8] * v.x + m[9] * v.y + m[10] * v.z );
    v.x = x;
    v.y = y;
    v.z = z;
  }

  transformVectorInline(xs, ys, zs, index) {
    const vx = xs[index];
    const vy = ys[index];
    const vz = zs[index];

    let m = this.m;
    let x = ( m[0] * vx + m[1] * vy + m[2] * vz );
    let y = ( m[4] * vx + m[5] * vy + m[6] * vz );
    let z = ( m[8] * vx + m[9] * vy + m[10] * vz );
    xs[index] = x;
    ys[index] = y;
    zs[index] = z;
  }

  // ### Matrix.identity([result])
  //
  // Returns an identity matrix. You can optionally pass an existing matrix in
  // `result` to avoid allocating a new matrix. 
  static identity(result) {
    result = result || new Matrix();
    let m = result.m;
    m[0] = m[5] = m[10] = m[15] = 1;
    m[1] = m[2] = m[3] = m[4] = m[6] = m[7] = m[8] = m[9] = m[11] = m[12] = m[13] = m[14] = 0;
    return result;
  }

  // ### Matrix.multiply(left, right[, result])
  //
  // Returns the concatenation of the transforms for `left` and `right`. You can
  // optionally pass an existing matrix in `result` to avoid allocating a new
  // matrix. 
  static multiply(left, right, result) {
    result = result || new Matrix();
    let a = left.m, b = right.m, r = result.m;

    r[0] = a[0] * b[0] + a[1] * b[4] + a[2] * b[8] + a[3] * b[12];
    r[1] = a[0] * b[1] + a[1] * b[5] + a[2] * b[9] + a[3] * b[13];
    r[2] = a[0] * b[2] + a[1] * b[6] + a[2] * b[10] + a[3] * b[14];
    r[3] = a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3] * b[15];

    r[4] = a[4] * b[0] + a[5] * b[4] + a[6] * b[8] + a[7] * b[12];
    r[5] = a[4] * b[1] + a[5] * b[5] + a[6] * b[9] + a[7] * b[13];
    r[6] = a[4] * b[2] + a[5] * b[6] + a[6] * b[10] + a[7] * b[14];
    r[7] = a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7] * b[15];

    r[8] = a[8] * b[0] + a[9] * b[4] + a[10] * b[8] + a[11] * b[12];
    r[9] = a[8] * b[1] + a[9] * b[5] + a[10] * b[9] + a[11] * b[13];
    r[10] = a[8] * b[2] + a[9] * b[6] + a[10] * b[10] + a[11] * b[14];
    r[11] = a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11] * b[15];

    r[12] = a[12] * b[0] + a[13] * b[4] + a[14] * b[8] + a[15] * b[12];
    r[13] = a[12] * b[1] + a[13] * b[5] + a[14] * b[9] + a[15] * b[13];
    r[14] = a[12] * b[2] + a[13] * b[6] + a[14] * b[10] + a[15] * b[14];
    r[15] = a[12] * b[3] + a[13] * b[7] + a[14] * b[11] + a[15] * b[15];

    return result;
  }

  // ### Matrix.transpose(matrix[, result])
  //
  // Returns `matrix`, exchanging columns for rows. You can optionally pass an
  // existing matrix in `result` to avoid allocating a new matrix.
  static  transpose(matrix, result) {
    result = result || new Matrix();
    let m = matrix.m, r = result.m;
    r[0]  = m[0]; r[1]  = m[4]; r[2]  = m[8];  r[3]  = m[12];
    r[4]  = m[1]; r[5]  = m[5]; r[6]  = m[9];  r[7]  = m[13];
    r[8]  = m[2]; r[9]  = m[6]; r[10] = m[10]; r[11] = m[14];
    r[12] = m[3]; r[13] = m[7]; r[14] = m[11]; r[15] = m[15];
    return result;
  }

  // ### Matrix.inverse(matrix[, result])
  //
  // Returns the matrix that when multiplied with `matrix` results in the
  // identity matrix. You can optionally pass an existing matrix in `result`
  // to avoid allocating a new matrix. This implementation is from the Mesa
  // OpenGL function `__gluInvertMatrixd()` found in `project.c`.
  static inverse(matrix, result) {
    result = result || new Matrix();
    let m = matrix.m, r = result.m;

    r[0]  =  m[5]*m[10]*m[15] - m[5]*m[14]*m[11] - m[6]*m[9]*m[15] + m[6]*m[13]*m[11] + m[7]*m[9]*m[14] - m[7]*m[13]*m[10];
    r[1]  = -m[1]*m[10]*m[15] + m[1]*m[14]*m[11] + m[2]*m[9]*m[15] - m[2]*m[13]*m[11] - m[3]*m[9]*m[14] + m[3]*m[13]*m[10];
    r[2]  =  m[1]*m[6]*m[15]  - m[1]*m[14]*m[7]  - m[2]*m[5]*m[15] + m[2]*m[13]*m[7]  + m[3]*m[5]*m[14] - m[3]*m[13]*m[6];
    r[3]  = -m[1]*m[6]*m[11]  + m[1]*m[10]*m[7]  + m[2]*m[5]*m[11] - m[2]*m[9]*m[7]  - m[3]*m[5]*m[10]  + m[3]*m[9]*m[6];

    r[4]  = -m[4]*m[10]*m[15] + m[4]*m[14]*m[11] + m[6]*m[8]*m[15] - m[6]*m[12]*m[11] - m[7]*m[8]*m[14] + m[7]*m[12]*m[10];
    r[5]  =  m[0]*m[10]*m[15] - m[0]*m[14]*m[11] - m[2]*m[8]*m[15] + m[2]*m[12]*m[11] + m[3]*m[8]*m[14] - m[3]*m[12]*m[10];
    r[6]  = -m[0]*m[6]*m[15]  + m[0]*m[14]*m[7]  + m[2]*m[4]*m[15] - m[2]*m[12]*m[7]  - m[3]*m[4]*m[14] + m[3]*m[12]*m[6];
    r[7]  =  m[0]*m[6]*m[11]  - m[0]*m[10]*m[7]  - m[2]*m[4]*m[11] + m[2]*m[8]*m[7]   + m[3]*m[4]*m[10] - m[3]*m[8]*m[6];

    r[8]  =  m[4]*m[9]*m[15]  - m[4]*m[13]*m[11] - m[5]*m[8]*m[15] + m[5]*m[12]*m[11] + m[7]*m[8]*m[13] - m[7]*m[12]*m[9];
    r[9]  = -m[0]*m[9]*m[15]  + m[0]*m[13]*m[11] + m[1]*m[8]*m[15] - m[1]*m[12]*m[11] - m[3]*m[8]*m[13] + m[3]*m[12]*m[9];
    r[10] =  m[0]*m[5]*m[15]  - m[0]*m[13]*m[7]  - m[1]*m[4]*m[15] + m[1]*m[12]*m[7]  + m[3]*m[4]*m[13] - m[3]*m[12]*m[5];
    r[11] = -m[0]*m[5]*m[11]  + m[0]*m[9]*m[7]   + m[1]*m[4]*m[11] - m[1]*m[8]*m[7]   - m[3]*m[4]*m[9]  + m[3]*m[8]*m[5];

    r[12] = -m[4]*m[9]*m[14]  + m[4]*m[13]*m[10] + m[5]*m[8]*m[14] - m[5]*m[12]*m[10] - m[6]*m[8]*m[13] + m[6]*m[12]*m[9];
    r[13] =  m[0]*m[9]*m[14]  - m[0]*m[13]*m[10] - m[1]*m[8]*m[14] + m[1]*m[12]*m[10] + m[2]*m[8]*m[13] - m[2]*m[12]*m[9];
    r[14] = -m[0]*m[5]*m[14]  + m[0]*m[13]*m[6]  + m[1]*m[4]*m[14] - m[1]*m[12]*m[6]  - m[2]*m[4]*m[13] + m[2]*m[12]*m[5];
    r[15] =  m[0]*m[5]*m[10]  - m[0]*m[9]*m[6]   - m[1]*m[4]*m[10] + m[1]*m[8]*m[6]   + m[2]*m[4]*m[9]  - m[2]*m[8]*m[5];

    let det = m[0]*r[0] + m[1]*r[4] + m[2]*r[8] + m[3]*r[12];
    for (let i = 0; i < 16; i++) r[i] /= det;
    return result;
  }

  // ### Matrix.scale(x, y, z[, result])
  //
  // Create a scaling matrix. You can optionally pass an
  // existing matrix in `result` to avoid allocating a new matrix.
  static scale(x, y, z, result) {
    result = result || new Matrix();
    let m = result.m;

    m[0] = x;
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;

    m[4] = 0;
    m[5] = y;
    m[6] = 0;
    m[7] = 0;

    m[8] = 0;
    m[9] = 0;
    m[10] = z;
    m[11] = 0;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  }

  // ### Matrix.translate(x, y, z[, result])
  //
  // Create a translation matrix. You can optionally pass
  // an existing matrix in `result` to avoid allocating a new matrix.
  static translate(x, y, z, result) {
    result = result || new Matrix();
    let m = result.m;

    m[0] = 1;
    m[1] = 0;
    m[2] = 0;
    m[3] = x;

    m[4] = 0;
    m[5] = 1;
    m[6] = 0;
    m[7] = y;

    m[8] = 0;
    m[9] = 0;
    m[10] = 1;
    m[11] = z;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  }

  // ### Matrix.rotate(a, x, y, z[, result])
  //
  // Create a rotation matrix that rotates by `a` degrees around the vector `x, y, z`.
  // You can optionally pass an existing matrix in `result` to avoid allocating
  // a new matrix. This emulates the OpenGL function `glRotate()`.
  static rotate(a, x, y, z, result) {
    if (!a || (!x && !y && !z)) {
      return Matrix.identity(result);
    }

    result = result || new Matrix();
    let m = result.m;

    let d = Math.sqrt(x*x + y*y + z*z);
    a *= Math.PI / 180; x /= d; y /= d; z /= d;
    let c = Math.cos(a), s = Math.sin(a), t = 1 - c;

    m[0] = x * x * t + c;
    m[1] = x * y * t - z * s;
    m[2] = x * z * t + y * s;
    m[3] = 0;

    m[4] = y * x * t + z * s;
    m[5] = y * y * t + c;
    m[6] = y * z * t - x * s;
    m[7] = 0;

    m[8] = z * x * t - y * s;
    m[9] = z * y * t + x * s;
    m[10] = z * z * t + c;
    m[11] = 0;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  }

  // ### Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz[, result])
  //
  // Returns a matrix that puts the camera at the eye point `ex, ey, ez` looking
  // toward the center point `cx, cy, cz` with an up direction of `ux, uy, uz`.
  // You can optionally pass an existing matrix in `result` to avoid allocating
  // a new matrix. This emulates the OpenGL function `gluLookAt()`.
  static lookAtORIGINAL(ex, ey, ez, cx, cy, cz, ux, uy, uz, result) {
    result = result || new Matrix();
    let m = result.m;

    // f = e.subtract(c).unit()
    let fx = ex-cx, fy = ey-cy, fz = ez-cz;
    let d = Math.sqrt(fx*fx + fy*fy + fz*fz);
    fx /= d; fy /= d; fz /= d;
    
    // s = u.cross(f).unit()
    let sx = uy * fz - uz * fy;
    let sy = uz * fx - ux * fz;
    let sz = ux * fy - uy * fx;
    d = Math.sqrt(sx*sx + sy*sy + sz*sz);
    sx /= d; sy /= d; sz /= d;
    
    // t = f.cross(s).unit()
    let tx = fy * sz - fz * sy;
    let ty = fz * sx - fx * sz;
    let tz = fx * sy - fy * sx;
    d = Math.sqrt(tx*tx + ty*ty + tz*tz);
    tx /= d; ty /= d; tz /= d;

    m[0] = sx;
    m[1] = sy;
    m[2] = sz;
    m[3] = -(sx*ex + sy*ey + sz*ez);  // -s.dot(e)

    m[4] = tx;
    m[5] = ty;
    m[6] = tz;
    m[7] = -(tx*ex + ty*ey + tz*ez);  // -t.dot(e)

    m[8] = fx;
    m[9] = fy;
    m[10] = fz;
    m[11] = -(fx*ex + fy*ey + fz*ez);  // -f.dot(e)

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  };
  
// ### Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz[, result])
  //
  // Returns a matrix that puts the camera at the eye point `ex, ey, ez` looking
  // toward the center point `cx, cy, cz` with an up direction of `ux, uy, uz`.
  // You can optionally pass an existing matrix in `result` to avoid allocating
  // a new matrix. This emulates the OpenGL function `gluLookAt()`.
  static lookAtTRYOUT(nx, ny, nz, result) {
    result = result || new Matrix();
    let m = result.m;
   
    let len = Math.sqrt(nx*nx + nz*nz);
    
    m[0] =  nz / len;
    m[1] =  0;
    m[2] = -nx / len;
    m[3] =  0;  

    m[4] =  nx*ny / len;
    m[5] = -len;
    m[6] =  nz*ny / len;
    m[7] =  0;

    m[8]  = nx;
    m[9]  = ny;
    m[10] = nz;
    m[11] = 0; 

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  };
  
  static lookAt(nx, ny, nz, result) {
    result = result || new Matrix();
    let m = result.m;
   
    let len = Math.sqrt(nx*nx + nz*nz);
    
    /* Find cosθ and sinθ; if gimbal lock, choose (1,0) arbitrarily */
    let c2 = len ? nx / len : 1.0;
    let s2 = len ? nz / len : 0.0;

    m[0] = nx;
    m[1] = -s2;
    m[2] = -nz*c2;
    m[3] = 0;
    
    m[4] = ny;
    m[5] = 0;
    m[6] = len;
    m[7] = 0;
    
    m[8] = nz;
    m[9] = c2;
    m[10] = -nz*s2;
    m[11] = 0;
    
    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return result;
  };

}

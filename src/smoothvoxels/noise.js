// http://mrl.nyu.edu/~perlin/noise/

// This is the Improved Noise from the examples of Three.js.
// It was adapted to change the permutation array from hard coded to generated.

export default function () {
  const p = []
  for (let i = 0; i < 256; i++) {
    p[i] = Math.floor(Math.random() * 256)
    p[i + 256] = p[i]
  }

  function fade (t) {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  function lerp (t, a, b) {
    return a + t * (b - a)
  }

  function grad (hash, x, y, z) {
    const h = hash & 15
    const u = h < 8 ? x : y; const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  return {

    noise: function (x, y, z) {
      const floorX = Math.floor(x)
      const floorY = Math.floor(y)
      const floorZ = Math.floor(z)

      const X = floorX & 255
      const Y = floorY & 255
      const Z = floorZ & 255

      x -= floorX
      y -= floorY
      z -= floorZ

      const xMinus1 = x - 1; const yMinus1 = y - 1; const zMinus1 = z - 1
      const u = fade(x); const v = fade(y); const w = fade(z)
      const A = p[X] + Y
      const AA = p[A] + Z
      const AB = p[A + 1] + Z
      const B = p[X + 1] + Y
      const BA = p[B] + Z
      const BB = p[B + 1] + Z

      return lerp(w,
        lerp(v,
          lerp(u, grad(p[AA], x, y, z),
            grad(p[BA], xMinus1, y, z)),
          lerp(u, grad(p[AB], x, yMinus1, z),
            grad(p[BB], xMinus1, yMinus1, z))
        ),
        lerp(v,
          lerp(u, grad(p[AA + 1], x, y, zMinus1),
            grad(p[BA + 1], xMinus1, y, z - 1)),
          lerp(u, grad(p[AB + 1], x, yMinus1, zMinus1),
            grad(p[BB + 1], xMinus1, yMinus1, zMinus1))
        )
      )
    }
  }
};

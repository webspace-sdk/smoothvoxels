// http://mrl.nyu.edu/~perlin/noise/

// This is the Improved Noise from the examples of Three.js.
// It was adapted to change the permutation array from hard coded to generated.

SVOX.Noise = function () {

	let p = [];
  for ( let i = 0; i < 256; i ++ ) {
    p[i] = Math.floor(Math.random()*256);
		p[i + 256] = p[i];
	}

	function fade( t ) {
		return t * t * t * ( t * ( t * 6 - 15 ) + 10 );
	}

	function lerp( t, a, b ) {
		return a + t * ( b - a );
	}

	function grad( hash, x, y, z ) {
		let h = hash & 15;
		let u = h < 8 ? x : y, v = h < 4 ? y : h == 12 || h == 14 ? x : z;
		return ( ( h & 1 ) == 0 ? u : - u ) + ( ( h & 2 ) == 0 ? v : - v );
	}

	return {

		noise: function ( x, y, z ) {

			let floorX = Math.floor( x ), 
          floorY = Math.floor( y ), 
          floorZ = Math.floor( z );

			let X = floorX & 255, 
          Y = floorY & 255, 
          Z = floorZ & 255;

			x -= floorX;
			y -= floorY;
			z -= floorZ;

			let xMinus1 = x - 1, yMinus1 = y - 1, zMinus1 = z - 1;
			let u = fade( x ), v = fade( y ), w = fade( z );
			let  A = p[ X ] + Y, 
          AA = p[ A ] + Z, 
          AB = p[ A + 1 ] + Z, 
           B = p[ X + 1 ] + Y, 
          BA = p[ B ] + Z, 
          BB = p[ B + 1 ] + Z;

			return lerp( w, 
          lerp( v, 
                lerp( u, grad( p[ AA ], x, y, z ),
                         grad( p[ BA ], xMinus1, y, z ) ),
                lerp( u, grad( p[ AB ], x, yMinus1, z ),
                         grad( p[ BB ], xMinus1, yMinus1, z ) ) 
              ),
    			lerp( v, 
               lerp( u, grad( p[ AA + 1 ], x, y, zMinus1 ),
				                grad( p[ BA + 1 ], xMinus1, y, z - 1 ) ),
			         lerp( u, grad( p[ AB + 1 ], x, yMinus1, zMinus1 ),
				                grad( p[ BB + 1 ], xMinus1, yMinus1, zMinus1 ) ) 
              ) 
      );
		}
	};

};


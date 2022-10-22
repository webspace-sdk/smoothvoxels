# Smooth Voxels

This is an optimized and npm packaged fork of the [Smooth Voxels](https://svox.glitch.me/) library by Samuel van Egmond.

It has been updated to use Typed Arrays and bitfields which results in a 5x or so speedup. All features from the main project are supported other than Shells.

Beyond this it also includes:

- Ability to re-use memory across re-meshing
- Per-voxel colorization (not per-material)

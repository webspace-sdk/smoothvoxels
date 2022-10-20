# Smooth Voxels

This is a optimized and packaged fork of the [Smooth Voxels](https://svox.glitch.me/) library by Samuel van Egmond.

It has been updated to use Typed Arrays which results in a 5x or so speedup. All features are supported other than Shells.

Beyond this it also includes:

- Ability to re-use memory across model loads
- Per-voxel colorization (not per-material)
- A flatbuffers based SVOX binary format

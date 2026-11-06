# Three.js r187

Pinned dependency: three@0.187.0 from the official npm package (mrdoob/three.js), distributed under the included MIT LICENSE.

Source: https://github.com/mrdoob/three.js/tree/r187

The minified module/core are stored locally. Imports in OrbitControls and BufferGeometryUtils point to the local module; the module core import points to three.core.js. No CDN request is needed at runtime.

export const TILE_WIDTH = 1;
export const TILE_HEIGHT = 1;
export const TILE_DEPTH = 1;

/**
 *
 * @constructor
 */
export default function TileBufferGeometry()
{
	THREE.BufferGeometry.call(this);

	this.type = "TileBufferGeometry";

	let scope = this;

	// buffers
	const indices = [];
	const vertices = [];
	const uvs = [];

	// helper variables
	let numberOfVertices = 0;
	let numberOfMaterials = 0;
	let groupStart = 0;

	this.topVerts = {pp: [], pn: [], np: [], nn: []};

	function buildPlane(u, v, w, udir, vdir, width, height, depth)
	{
		const widthHalf = width / 2;
		const heightHalf = height / 2;
		const depthHalf = depth / 2;

		let vertexCounter = 0;
		let groupCount = 0;

		const vector = new THREE.Vector3();

		// generate vertices, normals and uvs
		for (let iy = 0; iy < 2; iy++)
		{
			let y = iy * height - heightHalf;

			for (let ix = 0; ix < 2; ix++)
			{
				let x = ix * width - widthHalf;

				// set values to correct vector component
				vector[u] = x * udir;
				vector[v] = y * vdir;
				vector[w] = depthHalf;

				// now apply vector to vertex buffer
				vertices.push(vector.x, vector.y, vector.z);

				if (vector.y === TILE_HEIGHT / 2)
				{
					if (vector.x < 0)
					{
						if (vector.z < 0)
						{
							scope.topVerts.nn.push(numberOfVertices + vertexCounter);
						} else {
							scope.topVerts.np.push(numberOfVertices + vertexCounter);
						}
					} else {
						if (vector.z < 0)
						{
							scope.topVerts.pn.push(numberOfVertices + vertexCounter);
						} else {
							scope.topVerts.pp.push(numberOfVertices + vertexCounter);
						}
					}
				}

				// uvs
				uvs.push(ix);
				uvs.push(1 - iy);

				// counters
				vertexCounter += 1;
			}
		}

		// indices

		// 1. you need three indices to draw a single face
		// 2. a single segment consists of two faces
		// 3. so we need to generate six (2*3) indices per segment
		const a = numberOfVertices;
		const b = numberOfVertices + 2;
		const c = numberOfVertices + 3;
		const d = numberOfVertices + 1;

		// faces
		indices.push(a, b, d);
		indices.push(b, c, d);

		// increase counter
		groupCount += 6;

		// add a group to the geometry. this will ensure multi material support
		scope.addGroup(groupStart, groupCount, numberOfMaterials++);

		// calculate new start value for groups
		groupStart += groupCount;

		// update total number of vertices
		numberOfVertices += vertexCounter;
	}

	// build each side of the box geometry
	// Back Plane (positive x)
	buildPlane("z", "y", "x", -1, -1, TILE_DEPTH, TILE_HEIGHT, TILE_WIDTH);

	// Front Plane (negative x)
	buildPlane("z", "y", "x", 1, -1, TILE_DEPTH, TILE_HEIGHT, -TILE_WIDTH);

	// Top Plane (positive y)
	buildPlane("x", "z", "y", 1, 1, TILE_WIDTH, TILE_DEPTH, TILE_HEIGHT);

	// Bottom Plane (negative y)
	//buildPlane("x", "z", "y", 1, -1, TILE_WIDTH, TILE_DEPTH, -TILE_HEIGHT);

	// Left Plane (positive z)
	buildPlane("x", "y", "z", 1, -1, TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH);

	// Right Plane (negative z)
	buildPlane("x", "y", "z", -1, -1, TILE_WIDTH, TILE_HEIGHT, -TILE_DEPTH);

	// build geometry
	this.setIndex(indices);
	this.addAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
	this.addAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
}

TileBufferGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);

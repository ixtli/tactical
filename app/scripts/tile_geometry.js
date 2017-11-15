import * as THREE from "../../bower_components/three.js/build/three.module";

/**
 *
 * @param {number} width
 * @param {number} height
 * @param {number} depth
 * @constructor
 */
export default function TileBufferGeometry(width, height, depth)
{
	THREE.BufferGeometry.call(this);

	const widthSegments = 1;
	const heightSegments = 1;
	const depthSegments = 1;

	this.type = "BoxBufferGeometry";

	width = width || 1;
	height = height || 1;
	depth = depth || 1;

	this.parameters = {
		width: width,
		height: height,
		depth: depth,
		widthSegments: widthSegments,
		heightSegments: heightSegments,
		depthSegments: depthSegments
	};

	let scope = this;

	// buffers
	const indices = [];
	const vertices = [];
	const uvs = [];

	// helper variables
	let numberOfVertices = 0;
	let numberOfMaterials = 0;
	let groupStart = 0;

	function buildPlane(u, v, w, udir, vdir, width, height, depth)
	{
		const gridX = 1;
		const gridY = 1;

		const segmentWidth = width / gridX;
		const segmentHeight = height / gridY;

		const widthHalf = width / 2;
		const heightHalf = height / 2;
		const depthHalf = depth / 2;

		const gridX1 = gridX + 1;
		const gridY1 = gridY + 1;

		let vertexCounter = 0;
		let groupCount = 0;

		const vector = new THREE.Vector3();

		// generate vertices, normals and uvs
		for (let iy = 0; iy < gridY1; iy++)
		{

			let y = iy * segmentHeight - heightHalf;

			for (let ix = 0; ix < gridX1; ix++)
			{

				let x = ix * segmentWidth - widthHalf;

				// set values to correct vector component
				vector[u] = x * udir;
				vector[v] = y * vdir;
				vector[w] = depthHalf;

				// now apply vector to vertex buffer
				vertices.push(vector.x, vector.y, vector.z);

				// uvs
				uvs.push(ix / gridX);
				uvs.push(1 - ( iy / gridY ));

				// counters
				vertexCounter += 1;
			}
		}

		// indices

		// 1. you need three indices to draw a single face
		// 2. a single segment consists of two faces
		// 3. so we need to generate six (2*3) indices per segment
		for (let iy = 0; iy < gridY; iy++)
		{
			for (let ix = 0; ix < gridX; ix++)
			{
				let a = numberOfVertices + ix + gridX1 * iy;
				let b = numberOfVertices + ix + gridX1 * ( iy + 1 );
				let c = numberOfVertices + ( ix + 1 ) + gridX1 * ( iy + 1 );
				let d = numberOfVertices + ( ix + 1 ) + gridX1 * iy;

				// faces
				indices.push(a, b, d);
				indices.push(b, c, d);

				// increase counter
				groupCount += 6;
			}
		}

		// add a group to the geometry. this will ensure multi material support
		scope.addGroup(groupStart, groupCount, numberOfMaterials++);

		// calculate new start value for groups
		groupStart += groupCount;

		// update total number of vertices
		numberOfVertices += vertexCounter;
	}

	// build each side of the box geometry
	buildPlane("z", "y", "x", -1, -1, depth, height, width); // px
	buildPlane("z", "y", "x", 1, -1, depth, height, -width); // nx
	buildPlane("x", "z", "y", 1, 1, width, depth, height); // py
	buildPlane("x", "z", "y", 1, -1, width, depth, -height); // ny
	buildPlane("x", "y", "z", 1, -1, width, height, depth); // pz
	buildPlane("x", "y", "z", -1, -1, width, height, -depth); // nz

	// build geometry
	this.setIndex(indices);
	this.addAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
	this.addAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
}

TileBufferGeometry.prototype = Object.create(THREE.BufferGeometry.prototype);

import Chunk from "./chunk"; // jshint ignore:line
import TileBufferGeometry, {TILE_HEIGHT, TILE_WIDTH} from "../tile_geometry";

export const MAX_CHUNK_WIDTH = 64;
export const MAX_CHUNK_DEPTH = 64;
export const MAX_CHUNK_HEIGHT = 16;

const MAX_TILES = MAX_CHUNK_WIDTH * MAX_CHUNK_HEIGHT * MAX_CHUNK_DEPTH;

const box = new TileBufferGeometry();
const VERT_COUNT = box.attributes.position.array.length;
const INDEX_COUNT = box.index.array.length;
const UV_COUNT = box.attributes.uv.array.length;
const indexArray = new Uint32Array(MAX_TILES * INDEX_COUNT);
const indexBuffer = new THREE.BufferAttribute(indexArray, 1);

function generateIndexBufferValues()
{
	console.time(`Generate index buffer for ${indexArray.length} indices.`);
	const source = box.index.array;
	const chunks = indexArray.length / INDEX_COUNT;
	const faceCount = box.attributes.position.count;
	let base = 0, offset = 0;
	for (let i = 0; i < chunks; i++, base += INDEX_COUNT, offset = i * faceCount)
	{
		for (let j = 0; j < INDEX_COUNT; j++)
		{
			indexArray[base + j] = source[j] + offset;
		}
	}
	console.timeEnd(`Generate index buffer for ${indexArray.length} indices.`);
}

generateIndexBufferValues();

/**
 *
 * @param {Chunk} mapData
 * @constructor
 */
export default function ChunkMesh(mapData)
{
	/**
	 *
	 * @type {BufferGeometry}
	 * @private
	 */
	this._geometry = new THREE.BufferGeometry();

	/**
	 *
	 * @type {BufferGeometry}
	 * @private
	 */
	this._pickingGeometry = new THREE.BufferGeometry();

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._positionBuffer = new THREE.BufferAttribute(new Float32Array(0), 3);

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._colorBuffer = new THREE.BufferAttribute(new Float32Array(0), 3);

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._uvBuffer = new THREE.BufferAttribute(new Float32Array(0), 2);

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._pickColorBuffer = new THREE.BufferAttribute(new Float32Array(0), 3);

	/**
	 *
	 * @type {Chunk}
	 * @private
	 */
	this._map = mapData;
}

ChunkMesh.prototype.init = function()
{
	this._geometry.addAttribute("position", this._positionBuffer);
	this._geometry.addAttribute("color", this._colorBuffer);
	this._geometry.addAttribute("uv", this._uvBuffer);
	this._pickingGeometry.addAttribute("position", this._positionBuffer);
	this._pickingGeometry.addAttribute("color", this._pickColorBuffer);
	this._geometry.setIndex(indexBuffer);
	this._pickingGeometry.setIndex(indexBuffer);
	this._geometry.setDrawRange(0, 0);
	this._pickingGeometry.setDrawRange(0, 0);
};

ChunkMesh.prototype.destroy = function()
{
	if (this._geometry)
	{
		this._geometry.dispose();
		this._geometry = null;
	}

	if (this._pickingGeometry)
	{
		this._pickingGeometry.dispose();
		this._pickingGeometry = null;
	}
};

/**
 *
 * @param {Number} tileCount
 * @private
 */
ChunkMesh.prototype._resizeBuffers = function(tileCount)
{
	const oldVertexCount = this._geometry.attributes.position.array.length;
	const vertexCount = VERT_COUNT * tileCount;
	const uvCount = UV_COUNT * tileCount;

	if (oldVertexCount < vertexCount)
	{
		const buffer = Math.min(MAX_TILES, tileCount * 2);
		const bufferUVCount = buffer * UV_COUNT;
		const bufferVertexCount = buffer * VERT_COUNT;
		console.log(`Allocating ${buffer} tiles. (${bufferVertexCount} verts, ` +
			(buffer * VERT_COUNT * 4 * 3) / 1000000 + "mb)");

		this._positionBuffer.setArray(new Float32Array(bufferVertexCount));
		this._colorBuffer.setArray(new Float32Array(bufferVertexCount));
		this._pickColorBuffer.setArray(new Float32Array(bufferVertexCount));
		this._uvBuffer.setArray(new Float32Array(bufferUVCount));
	}

	this._positionBuffer.updateRange.count = vertexCount;
	this._colorBuffer.updateRange.count = vertexCount;
	this._pickColorBuffer.updateRange.count = vertexCount;
	this._uvBuffer.updateRange.count = uvCount;

	this._positionBuffer.needsUpdate = true;
	this._pickColorBuffer.needsUpdate = true;
	this._colorBuffer.needsUpdate = true;
	this._uvBuffer.needsUpdate = true;
};

ChunkMesh.prototype.regenerate = function()
{
	console.time("Chunk::regenerate()");
	const d = this._map.depth();
	const h = this._map.height();
	const w = this._map.width();

	const tileCount = this._map.getTileCount();
	const data = this._map.getData();

	this._resizeBuffers(tileCount);

	const positionArray = this._positionBuffer.array;
	const colorArray = this._colorBuffer.array;
	const pickArray = this._pickColorBuffer.array;
	const uvArray = this._uvBuffer.array;

	const pickColor = new THREE.Color();

	const tileArray = this._map.getTileArray();

	let skipped = 0;
	let generated = 0;
	let px, py, pz;

	let zOffset = 0;
	let offset = 0;
	for (let z = 0; z < d; z++)
	{
		zOffset = z * w * h;
		for (let y = 0; y < h; y++)
		{
			offset = zOffset + y * w;
			for (let x = 0; x < w; x++)
			{
				let idx = offset + x;
				let datum = data[idx];

				if (datum === 0)
				{
					continue;
				}

				let tile = tileArray[datum - 1];

				let blockLeft = (x > 0 && data[idx - 1]);
				let blockRight = (x < w - 1 && data[idx + 1]);
				let blockAbove = (y < h - 1 && data[idx + w]);
				let blockIn = (z > 0 && data[idx - w * h]);
				let blockOut = (z < d - 1 && data[idx + w * h]);

				if (blockLeft && blockRight && blockAbove && blockIn && blockOut)
				{
					skipped++;
					continue;
				}

				px = x * TILE_WIDTH;
				py = y * TILE_HEIGHT;
				pz = z * TILE_WIDTH;

				pickColor.setHex(idx + 1);

				let start = generated * VERT_COUNT;
				let positions = tile.getPositionArray();
				for (let i = 0; i < VERT_COUNT; i += 3)
				{
					positionArray[start + i] = positions[i] + px;
					positionArray[start + i + 1] = positions[i + 1] + py;
					positionArray[start + i + 2] = positions[i + 2] + pz;

					pickArray[start + i] = pickColor.r;
					pickArray[start + i + 1] = pickColor.g;
					pickArray[start + i + 2] = pickColor.b;
				}

				uvArray.set(tile.getUVArray(), start);
				colorArray.set(tile.getColorArray(), start);

				generated++;
			}
		}
	}

	const drawRange = INDEX_COUNT * generated;
	this._geometry.setDrawRange(0, drawRange);
	this._pickingGeometry.setDrawRange(0, drawRange);
	this._geometry.computeBoundingSphere();
	this._pickingGeometry.boundingSphere = this._geometry.boundingSphere;

	console.timeEnd("Chunk::regenerate()");

	console.log("Rendered", generated, "/", tileCount, "tiles.");
};


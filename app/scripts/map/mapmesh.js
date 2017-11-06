import * as THREE from "../../../bower_components/three.js/build/three.module";

import TerrainMap from "./map"; // jshint ignore:line

export const TILE_WIDTH = 1;
export const TILE_HEIGHT = 1;

const MAX_CHUNK_WIDTH = 64;
const MAX_CHUNK_DEPTH = 64;
const MAX_CHUNK_HEIGHT = 16;

const box = new THREE.BoxBufferGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH);
const VERT_COUNT = box.attributes.position.array.length;
const boxVerts = box.attributes.position.array;

const INDEX_COUNT = box.index.array.length;
const is = new Uint32Array(MAX_CHUNK_WIDTH * MAX_CHUNK_HEIGHT *
	MAX_CHUNK_DEPTH * INDEX_COUNT);
const indexBuffer = new THREE.BufferAttribute(is, 1);

function genIs()
{
	console.time(`Generate index buffer for ${is.length} indices.`);
	const source = box.index.array;
	const chunks = is.length / INDEX_COUNT;
	const faceCount = box.attributes.position.count;
	let base = 0, offset = 0;
	for (let i = 0; i < chunks; i++, base += INDEX_COUNT, offset = i * faceCount)
	{
		for (let j = 0; j < INDEX_COUNT; j++)
		{
			is[base + j] = source[j] + offset;
		}
	}
	console.timeEnd(`Generate index buffer for ${is.length} indices.`);
}

genIs();

/**
 *
 * @param {TerrainMap} mapData
 * @constructor
 */
export default function TerrainMapMesh(mapData)
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
	this._pickColorBuffer = new THREE.BufferAttribute(new Float32Array(0), 3);

	/**
	 *
	 * @type {TerrainMap}
	 * @private
	 */
	this._map = mapData;
}

TerrainMapMesh.prototype.init = function()
{
	this._geometry.addAttribute("position", this._positionBuffer);
	this._geometry.addAttribute("color", this._colorBuffer);
	this._pickingGeometry.addAttribute("position", this._positionBuffer);
	this._pickingGeometry.addAttribute("color", this._pickColorBuffer);
	this._geometry.setIndex(indexBuffer);
	this._pickingGeometry.setIndex(indexBuffer);
	this._geometry.setDrawRange(0, 0);
	this._pickingGeometry.setDrawRange(0, 0);
};

TerrainMapMesh.prototype.destroy = function()
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

TerrainMapMesh.prototype.regenerate = function()
{
	console.time("TerrainMap::regenerate()");
	const d = this._map.depth();
	const h = this._map.height();
	const w = this._map.width();

	const tileCount = this._map.getTileCount();
	const data = this._map.getData();

	const vertexCount = VERT_COUNT * tileCount;

	let positionArray, colorArray, pickArray;

	if (this._geometry.attributes.position.array.length < vertexCount)
	{
		const b = vertexCount * 4 * 3;
		console.log("allocating new array with",
			vertexCount,
			"verts",
			`${b / 1000000}mb`);

		positionArray = new Float32Array(vertexCount);
		colorArray = new Float32Array(vertexCount);
		pickArray = new Float32Array(vertexCount);

		this._positionBuffer.setArray(positionArray);
		this._colorBuffer.setArray(colorArray);
		this._pickColorBuffer.setArray(pickArray);

		this._positionBuffer.updateRange.count = -1;
		this._colorBuffer.updateRange.count = -1;
		this._pickColorBuffer.updateRange.count = -1;
	}
	else
	{
		positionArray = this._positionBuffer.array;
		colorArray = this._colorBuffer.array;
		pickArray = this._pickColorBuffer.array;

		this._positionBuffer.updateRange.count = vertexCount;
		this._colorBuffer.updateRange.count = vertexCount;
		this._pickColorBuffer.updateRange.count = vertexCount;
	}

	const color = new THREE.Color();
	const pickColor = new THREE.Color();

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

				px = x * TILE_WIDTH;
				py = y * TILE_HEIGHT;
				pz = z * TILE_WIDTH;

				color.setHSL(0.3, Math.random(), 0.5);
				pickColor.setHex(idx + 1);

				let start = generated * VERT_COUNT;
				for (let i = 0; i < VERT_COUNT; i += 3)
				{
					positionArray[start + i] = boxVerts[i] + px;
					positionArray[start + i + 1] = boxVerts[i + 1] + py;
					positionArray[start + i + 2] = boxVerts[i + 2] + pz;

					colorArray[start + i] = color.r;
					colorArray[start + i + 1] = color.g;
					colorArray[start + i + 2] = color.b;

					pickArray[start + i] = pickColor.r;
					pickArray[start + i + 1] = pickColor.g;
					pickArray[start + i + 2] = pickColor.b;
				}

				generated++;
			}
		}
	}

	const drawRange = INDEX_COUNT * tileCount;
	this._geometry.setDrawRange(0, drawRange);
	this._pickingGeometry.setDrawRange(0, drawRange);
	this._positionBuffer.needsUpdate = true;
	this._pickColorBuffer.needsUpdate = true;
	this._colorBuffer.needsUpdate = true;
	this._geometry.computeBoundingSphere();
	this._pickingGeometry.boundingSphere = this._geometry.boundingSphere;

	console.timeEnd("TerrainMap::regenerate()");
};


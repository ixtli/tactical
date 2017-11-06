import * as THREE from "../../bower_components/three.js/build/three.module";

import TerrainMap from "./map"; // jshint ignore:line

export const TILE_WIDTH = 1;
export const TILE_HEIGHT = 1;

const MAX_MAP_DIMENSION = 32;

const box = new THREE.BoxBufferGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH);
const VERT_COUNT = box.attributes.position.array.length;
const boxVerts = box.attributes.position.array;

const INDEX_COUNT = box.index.array.length;
const is = new Uint16Array(Math.pow(MAX_MAP_DIMENSION, 3) * INDEX_COUNT);
const indexBuffer = new THREE.BufferAttribute(is, 1);

debugger;

function genIs()
{
	const source = box.index.array;
	const chunks = is.length / INDEX_COUNT;
	const faceCount = box.attributes.position.count;
	for (let i = 0; i < chunks; i++)
	{
		let offset = i * faceCount;
		let base = i * INDEX_COUNT;
		for (let j = 0; j < INDEX_COUNT; j++)
		{
			is[base + j] = source[j] + offset;
		}
	}
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
	 * @type {TerrainMap}
	 * @private
	 */
	this._map = mapData;
}

TerrainMapMesh.prototype.init = function()
{
	const blank = new Float32Array(0);
	this._geometry.addAttribute("position", new THREE.BufferAttribute(blank, 3));
	this._geometry.addAttribute("color", new THREE.BufferAttribute(blank, 3));
	this._pickingGeometry.addAttribute("position",
		new THREE.BufferAttribute(blank, 3));
	this._pickingGeometry.addAttribute("color",
		new THREE.BufferAttribute(blank, 3));
	this._geometry.setIndex(indexBuffer);
	this._pickingGeometry.setIndex(indexBuffer);
	this._geometry.setDrawRange(0, 0);
	this._pickingGeometry.setDrawRange(0, 0);
	this._geometry.index.needsUpdate = true;
	this._pickingGeometry.index.needsUpdate = true;
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
		console.log("allocating new array with", vertexCount, "verts");

		positionArray = new Float32Array(vertexCount);
		colorArray = new Float32Array(vertexCount);
		pickArray = new Float32Array(vertexCount);

		this._geometry.attributes.position.setArray(positionArray);
		this._pickingGeometry.attributes.position.setArray(positionArray);
		this._geometry.attributes.color.setArray(colorArray);
		this._pickingGeometry.attributes.color.setArray(pickArray);

		this._geometry.attributes.position.updateRange.count = -1;
		this._pickingGeometry.attributes.position.updateRange.count = -1;
		this._geometry.attributes.color.updateRange.count = -1;
		this._pickingGeometry.attributes.color.updateRange.count = -1;
	}
	else
	{
		positionArray = this._geometry.attributes.position.array;
		colorArray = this._geometry.attributes.color.array;
		pickArray = this._pickingGeometry.attributes.color.array;

		this._geometry.attributes.position.updateRange.count = vertexCount;
		this._pickingGeometry.attributes.position.updateRange.count = vertexCount;
		this._geometry.attributes.color.updateRange.count = vertexCount;
		this._pickingGeometry.attributes.color.updateRange.count = vertexCount;
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

	const indexCount = INDEX_COUNT * tileCount;
	this._geometry.setDrawRange(0, indexCount);
	this._pickingGeometry.setDrawRange(0, indexCount);

	this._geometry.attributes.position.needsUpdate = true;
	this._pickingGeometry.attributes.position.needsUpdate = true;
	this._geometry.attributes.color.needsUpdate = true;
	this._pickingGeometry.attributes.color.needsUpdate = true;

	this._geometry.computeBoundingSphere();
	this._pickingGeometry.computeBoundingSphere();

	console.timeEnd("TerrainMap::regenerate()");
};


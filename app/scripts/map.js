import * as THREE from "../../bower_components/three.js/build/three.module";
import TerrainMapMesh from "./mapmesh";
import {subscribe, unsubscribe} from "./bus";

/**
 *
 * @param {number} w
 * @param {number} h
 * @param {number} d
 * @constructor
 */
export default function TerrainMap(w, h, d)
{
	console.assert(w > 0, "Map width must be positive.");
	console.assert(h > 0, "Map height must be positive.");
	console.assert(d > 0, "Map depth must be positive.");

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._width = w;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._height = h;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._depth = d;

	/**
	 *
	 * @type {Uint16Array}
	 * @private
	 */
	this._data = new Uint16Array(w * h * d);

	/**
	 *
	 * @type {TerrainMapMesh}
	 * @private
	 */
	this._mesh = new TerrainMapMesh(this);
}

TerrainMap.prototype.init = function()
{
	this._mesh.init();
	subscribe("select.toggle", this, this._toggleTile);
};

TerrainMap.prototype.destroy = function()
{
	unsubscribe("select.toggle", this, this._toggleTile);
	this._data = null;
	this._mesh.destroy();
};

TerrainMap.prototype._toggleTile = function(vec1, vec2)
{
	const d = this._depth;
	const h = this._height;
	const w = this._width;

	if (!vec2)
	{
		vec2 = vec1;
	}

	const xMin = Math.max(Math.min(vec1.x, vec2.x), 0);
	const yMin = Math.max(Math.min(vec1.y, vec2.y), 0);
	const zMin = Math.max(Math.min(vec1.z, vec2.z), 0);
	const xMax = Math.min(Math.max(vec1.x, vec2.x), w - 1);
	const yMax = Math.min(Math.max(vec1.y, vec2.y), h - 1);
	const zMax = Math.min(Math.max(vec1.z, vec2.z), d - 1);

	const data = this._data;

	let tilesModified = 0;
	let offset = 0;
	let zOffset = 0;
	for (let z = zMin; z <= zMax; z++)
	{
		zOffset = z * w * h;
		for (let y = yMin; y <= yMax; y++)
		{
			offset = zOffset + y * w;
			for (let x = xMin; x <= xMax; x++)
			{
				data[offset + x] = data[offset + x] ? 0 : 1;
				tilesModified++;
			}
		}
	}

	this._mesh.regenerate();

	console.log("Toggled", tilesModified, "tiles.");
};

/**
 *
 * @param {Vector3} vec
 * @private
 */
TerrainMap.prototype._toggleSingleTile = function(vec)
{
	if (vec.x < 0 || vec.y < 0 || vec.z < 0)
	{
		return;
	}

	const h = this._height;
	const w = this._width;

	if (vec.x >= w || vec.y >= h || vec.z >= this._depth)
	{
		return;
	}

	const idx = (vec.z * h * w) + (vec.y * w) + vec.x;
	this._data[idx] = this._data[idx] ? 0 : 1;
};

/**
 *
 * @param {number} groundDepth
 */
TerrainMap.prototype.randomGround = function(groundDepth)
{
	const d = this._depth;
	const h = this._height;
	const w = this._width;
	const data = this._data;
	let zOffset = 0;
	let offset = 0;
	let tileCount = 0;
	console.time("TerrainMap::randomGround()");
	for (let z = 0; z < d; z++)
	{
		zOffset = z * w * h;
		for (let y = 0; y < groundDepth; y++)
		{
			offset = zOffset + y * w;
			for (let x = 0; x < w; x++)
			{
				data[offset + x] = (Math.random() < y / groundDepth) ? 0 : 1;
				tileCount++;
			}
		}
	}
	console.timeEnd("TerrainMap::randomGround()");
	console.debug("Generated map with", tileCount, "tiles.");
};

/**
 *
 * @param {Vector3} vec
 */
TerrainMap.prototype.inBounds = function(vec)
{
	if (vec.x < 0 || vec.y < 0 || vec.z < 0)
	{
		return false;
	}

	return !(vec.x >= this.width() || vec.y >= this.height() || vec.z >=
		this.width());

};

/**
 *
 * @param {number} id
 * @returns {Vector3}
 */
TerrainMap.prototype.tileForID = function(id)
{
	if (id > this._data.length || !this._data[id])
	{
		console.error("Could not find tile", id);
		return null;
	}

	const w = this._width;
	const tilesInPlane = w * this._height;
	const subIndex = id % tilesInPlane;
	const z = Math.floor(id / tilesInPlane);
	const x = subIndex % w;
	const y = Math.floor(subIndex / w);
	return new THREE.Vector3(x, y, z);
};

/**
 *
 * @returns {Uint16Array}
 */
TerrainMap.prototype.getData = function()
{
	return this._data;
};

/**
 * How tall the map is
 * @returns {number}
 */
TerrainMap.prototype.height = function()
{
	return this._height;
};

/**
 * How wide the map is
 * @returns {number}
 */
TerrainMap.prototype.width = function()
{
	return this._width;
};

/**
 * How deep into the scene the map goes
 * @returns {number}
 */
TerrainMap.prototype.depth = function()
{
	return this._depth;
};

/**
 *
 * @returns {TerrainMapMesh}
 */
TerrainMap.prototype.getMesh = function()
{
	return this._mesh;
};

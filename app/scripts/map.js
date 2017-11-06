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

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._tileCount = 0;
}

TerrainMap.prototype.init = function()
{
	this._mesh.init();
	subscribe("select.toggle", this, this.toggleBetween);
	subscribe("select.add", this, this.addBetween);
	subscribe("select.remove", this, this.removeBetween);
};

TerrainMap.prototype.destroy = function()
{
	unsubscribe("select.toggle", this, this.toggleBetween);
	unsubscribe("select.add", this, this.addBetween);
	unsubscribe("select.remove", this, this.removeBetween);
	this._data = null;
	this._mesh.destroy();
};

/**
 *
 * @param {Vector3} vec1
 * @param {Vector3} vec2
 */
TerrainMap.prototype.toggleBetween = function(vec1, vec2)
{
	this._changeBetween(vec1, vec2, (old) => old ? 0 : 1);
};

/**
 *
 * @param {Vector3} vec1
 * @param {Vector3} vec2
 */
TerrainMap.prototype.addBetween = function(vec1, vec2)
{
	this._changeBetween(vec1, vec2, () => 1);
};

/**
 *
 * @param {Vector3} vec1
 * @param {Vector3} vec2
 */
TerrainMap.prototype.removeBetween = function(vec1, vec2)
{
	this._changeBetween(vec1, vec2, () => 0);
};

/**
 *
 * @param {Vector3} vec1
 * @param {Vector3} vec2
 * @param {Function} fxn
 * @private
 */
TerrainMap.prototype._changeBetween = function(vec1, vec2, fxn)
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
				let oldValue = data[offset + x];
				let newValue = fxn(oldValue);

				if (oldValue === newValue)
				{
					continue;
				}

				this._tileCount += newValue ? 1 : -1;
				data[offset + x] = newValue;
				tilesModified++;
			}
		}
	}

	console.log(this._tileCount);

	this._mesh.regenerate();
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
	this._tileCount += this._data[idx] ? -1 : 1;
	this._data[idx] = this._data[idx] ? 0 : 1;
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

/**
 *
 * @returns {number}
 */
TerrainMap.prototype.getTileCount = function()
{
	return this._tileCount;
};

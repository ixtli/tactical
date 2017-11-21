import * as THREE from "../../../bower_components/three.js/build/three.module";
import ChunkMesh, {
	MAX_CHUNK_DEPTH, MAX_CHUNK_HEIGHT, MAX_CHUNK_WIDTH
} from "./chunk_mesh";
import {subscribe, unsubscribe} from "../bus";
import Tile from "./tile"; // jshint ignore:line
import TileDictionary from "./tile_dictionary";

/**
 *
 * @param {number} w
 * @param {number} h
 * @param {number} d
 * @constructor
 */
export default function Chunk(w, h, d)
{
	console.assert(w > 0, "Map width must be positive.");
	console.assert(h > 0, "Map height must be positive.");
	console.assert(d > 0, "Map depth must be positive.");
	console.assert(w <= MAX_CHUNK_WIDTH, "Map too wide: " + w);
	console.assert(h <= MAX_CHUNK_HEIGHT, "Map too high: " + h);
	console.assert(d <= MAX_CHUNK_DEPTH, "Map too deep: " + d);

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
	 * @type {ChunkMesh}
	 * @private
	 */
	this._mesh = new ChunkMesh(this);

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._tileCount = 0;

	/**
	 *
	 * @type {TileDictionary}
	 * @private
	 */
	this._tileDictionary = new TileDictionary();
}

Chunk.prototype.init = function()
{
	this._tileDictionary.init();
	this._mesh.init();
	subscribe("select.toggle", this, this.toggleBetween);
	subscribe("select.add", this, this.addBetween);
	subscribe("select.remove", this, this.removeBetween);
};

Chunk.prototype.destroy = function()
{
	unsubscribe("select.toggle", this, this.toggleBetween);
	unsubscribe("select.add", this, this.addBetween);
	unsubscribe("select.remove", this, this.removeBetween);
	this._data = null;
	this._mesh.destroy();
	this._tileDictionary.destroy();
};

/**
 *
 * @param {Vector3} vec1
 * @param {Vector3} vec2
 */
Chunk.prototype.toggleBetween = function(vec1, vec2)
{
	this._changeBetween(vec1, vec2, (old) => old ? 0 : 1);
};

/**
 *
 * @param {Vector3} vec1
 * @param {Vector3} vec2
 */
Chunk.prototype.addBetween = function(vec1, vec2)
{
	this._changeBetween(vec1, vec2, () => 1);
};

/**
 *
 * @param {Vector3} vec1
 * @param {Vector3} vec2
 */
Chunk.prototype.removeBetween = function(vec1, vec2)
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
Chunk.prototype._changeBetween = function(vec1, vec2, fxn)
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

	this._mesh.regenerate();
};

/**
 *
 * @param {Vector3} vec
 * @private
 */
Chunk.prototype._toggleSingleTile = function(vec)
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
Chunk.prototype.inBounds = function(vec)
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
Chunk.prototype.tileForID = function(id)
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
Chunk.prototype.getData = function()
{
	return this._data;
};

/**
 * How tall the map is
 * @returns {number}
 */
Chunk.prototype.height = function()
{
	return this._height;
};

/**
 * How wide the map is
 * @returns {number}
 */
Chunk.prototype.width = function()
{
	return this._width;
};

/**
 * How deep into the scene the map goes
 * @returns {number}
 */
Chunk.prototype.depth = function()
{
	return this._depth;
};

/**
 *
 * @returns {ChunkMesh}
 */
Chunk.prototype.getMesh = function()
{
	return this._mesh;
};

/**
 *
 * @returns {number}
 */
Chunk.prototype.getTileCount = function()
{
	return this._tileCount;
};

/**
 *
 * @returns {Tile[]}
 */
Chunk.prototype.getTileArray = function()
{
	return this._tileDictionary.getArray();
};

/**
 *
 * @param {Vector3} vec
 * @returns {Tile|null}
 */
Chunk.prototype.getTileForLocation = function(vec)
{
	const idx = vec.z * this._width * this._height + vec.y * this._width + vec.x;
	const tileIndex = this._data[idx];
	return tileIndex ? this._tileDictionary.getArray()[tileIndex - 1] : null;
};

/**
 *
 * @param {Vector3} vec
 * @param {Tile} tile
 * @returns {Tile}
 */
Chunk.prototype.setTileForLocation = function(vec, tile)
{
	const tileIndex = this._tileDictionary.add(tile);
	const idx = vec.z * this._width * this._height + vec.y * this._width + vec.x;

	if (this._data[idx] !== tileIndex + 1)
	{
		this._data[idx] = tileIndex + 1;
		this._mesh.regenerate();
	}

	return this._tileDictionary.getArray()[tileIndex];
};

/**
 *
 * @param {Tile} tile
 * @param {TileAttributes} attributes
 * @returns {Tile}
 */
Chunk.prototype.updateTile = function(tile, attributes)
{
	console.assert(this._tileDictionary.has(tile), `Tile ${tile} not in map`);

	// Easy out: no changes
	if (tile.attributeEquals(attributes))
	{
		return tile;
	}

	// Has something actually changed requiring a regeneration?
	let delta = false;

	// Do the new attributes exists in the tile dict?
	const idx = this._tileDictionary.indexForAttributes(attributes);

	if (idx !== -1)
	{
		// If so, delete the current one and replace all instances of its idx in
		// data array with the new one
		const oldIdx = this._tileDictionary.remove(tile);
		this._updateAllTileIndices(oldIdx, idx);
	}
	else
	{
		// If not, simply update this tile
		delta = this._tileDictionary.update(tile, attributes);
	}

	if (delta)
	{
		this._mesh.regenerate();
	}

	return tile;
};

/**
 *
 * @param {number} oldIndex
 * @param {number} newIndex
 * @returns {number}
 * @private
 */
Chunk.prototype._updateAllTileIndices = function(oldIndex, newIndex)
{
	const data = this._data;
	const len = data.length;
	let delta = 0;
	for (let i = 0; i < len; i++)
	{
		if (data[i] === oldIndex + 1)
		{
			data[i] = newIndex + 1;
			delta++;
		}
	}
	return delta;
};

/**
 *
 * @param {TileAttributes} attributes
 * @returns {Tile|null}
 */
Chunk.prototype.tileForAttributes = function(attributes)
{
	return this._tileDictionary.tileForAttributes(attributes);
};

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

	this._geometry = null;
	this._pickingGeometry = null;
}

/**
 *
 * @param {number} groundDepth
 */
TerrainMap.prototype.randomGround = function(groundDepth)
{
	const d = this._depth;
	const h = this._height;
	const w = this._width;
	const newData = new Uint16Array(w * h * d);
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
				if (Math.random() < y / groundDepth)
				{
					continue;
				}

				newData[offset + x] = 1;
				tileCount++;
			}
		}
	}
	console.timeEnd("TerrainMap::randomGround()");
	console.debug("Generated map with", tileCount, "tiles.");
	this._data = newData;
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

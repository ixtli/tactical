import Tile from "./tile.js";

/**
 *
 * @constructor
 */
export default function TileDictionary() {
	/**
  *
  * @type {Tile[]}
  * @private
  */
	this._array = [];

	/**
  * Deduplication map of hash -> {array idx, tile instance}
  *
  * @type {Object.<string, {idx: number, tile: Tile}>}
  * @private
  */
	this._dict = {};
}

TileDictionary.prototype.init = function () {
	this.add(new Tile("grass").init());
};

TileDictionary.prototype.destroy = function () {
	for (let t of this._array) {
		t.destroy();
	}
};

/**
 *
 * @param {Tile} newTile
 * @returns {number}
 */
TileDictionary.prototype.add = function (newTile) {
	const exists = this.indexForTile(newTile);

	if (exists >= 0) {
		return exists;
	}

	let idx = 0;
	const array = this._array;
	const len = array.length;

	for (; idx < len; idx++) {
		if (array[idx] === null) {
			break;
		}
	}

	if (idx === len) {
		array.push(newTile);
	} else {
		array[idx] = newTile;
	}

	this._dict[newTile.hashKey()] = { idx: idx, tile: newTile };

	return idx;
};

/**
 *
 * @param {Tile} tile
 * @param {TileAttributes} newAttributes
 * @returns {boolean}
 */
TileDictionary.prototype.update = function (tile, newAttributes) {
	console.assert(this.indexForAttributes(newAttributes) === -1, `attempt to update a duplicate tile ${newAttributes}`);

	if (tile.attributeEquals(newAttributes)) {
		return false;
	}

	const oldHash = tile.hashKey();
	console.assert(this.indexForTile(tile) !== -1, `tile ${oldHash} does not exist`);

	const entry = this._dict[oldHash];
	delete this._dict[oldHash];
	tile.setAttributes(newAttributes);
	this._dict[tile.hashKey()] = entry;
	return true;
};

/**
 *
 * @param {Tile} tile
 * @returns {number}
 */
TileDictionary.prototype.remove = function (tile) {
	const idx = this.indexForTile(tile);
	console.assert(idx === -1, `tile ${tile} not in dictionary`);
	this._array[idx] = null;
	delete this._dict[tile.hashKey()];
	return idx;
};

/**
 *
 * @param {TileAttributes} attributes
 * @return {Tile|null}
 */
TileDictionary.prototype.tileForAttributes = function (attributes) {
	const exists = this._dict[attributes.hashKey()];
	return exists >= 0 ? this._array[exists] : null;
};

/**
 *
 * @param {Tile} tile
 * @returns {number}
 */
TileDictionary.prototype.indexForTile = function (tile) {
	const exists = this._dict[tile.hashKey()];
	return exists ? exists.idx : -1;
};

/**
 *
 * @param {TileAttributes} attributes
 * @returns {number}
 */
TileDictionary.prototype.indexForAttributes = function (attributes) {
	const exists = this._dict[attributes.hashKey()];
	return exists ? exists.idx : -1;
};

/**
 *
 * @returns {Tile[]}
 */
TileDictionary.prototype.getArray = function () {
	return this._array;
};

/**
 *
 * @param {Tile} tile
 * @returns {boolean}}
 */
TileDictionary.prototype.has = function (tile) {
	return !!this._dict[tile.hashKey()];
};
import * as THREE from "../../../bower_components/three.js/build/three.module";
import TileBufferGeometry, {TILE_HEIGHT} from "../tile_geometry";

const DEFAULT_COLOR = new THREE.Color().setHSL(0.3, 0.75, 0.5);

const box = new TileBufferGeometry();
const DEFAULT_VERTS = box.attributes.position.array;

/**
 *
 * @param {TileDeformation?} other
 * @constructor
 */
function TileDeformation(other)
{
	/**
	 *
	 * @type {number}
	 */
	this.pp = 1;

	/**
	 *
	 * @type {number}
	 */
	this.pn = 1;

	/**
	 *
	 * @type {number}
	 */
	this.np = 1;

	/**
	 *
	 * @type {number}
	 */
	this.nn = 1;

	if (other)
	{
		this.set(other);
	}
}

/**
 *
 * @param {TileDeformation} other
 * @returns {boolean}
 */
TileDeformation.prototype.set = function(other)
{
	if (this.equals(other))
	{
		return false;
	}

	this.pp = other.pp;
	this.pn = other.pn;
	this.np = other.np;
	this.nn = other.nn;

	return true;
};

/**
 *
 * @param {TileDeformation} other
 * @returns {string[]}
 */
TileDeformation.prototype.diff = function(other)
{
	const ret = [];

	if (this.nn !== other.nn)
	{
		ret.push("nn");
	}
	if (this.pn !== other.pn)
	{
		ret.push("pn");
	}
	if (this.np !== other.np)
	{
		ret.push("np");
	}
	if (this.pp !== other.pp)
	{
		ret.push("pp");
	}

	return ret;
};

/**
 *
 * @param {TileDeformation} other
 * @returns {boolean}
 */
TileDeformation.prototype.equals = function(other)
{
	return this.hashKey() === other.hashKey();
};

/**
 *
 * @param {string} side
 * @param {number} value
 */
TileDeformation.prototype.setSide = function(side, value)
{
	console.assert(this.hasOwnProperty(side), "invalid side " + side);
	console.assert(value >= 0 && value <= 1, "non-normal amount " + value);
	this[side] = value;
};

/**
 *
 * @returns {string}
 */
TileDeformation.prototype.hashKey = function()
{
	return `${this.nn}${this.np}${this.pn}${this.pp}`;
};

/**
 *
 * @param {TileAttributes?} other
 * @constructor
 */
export function TileAttributes(other)
{
	/**
	 *
	 * @type {Color}
	 * @private
	 */
	Object.defineProperty(this, "_color", {value: new THREE.Color()});

	/**
	 *
	 * @type {TileDeformation}
	 * @private
	 */
	Object.defineProperty(this, "_deform", {value: new TileDeformation()});

	/**
	 *
	 * @type {string}
	 * @private
	 */
	this._hashKey = "";

	if (other)
	{
		this.set(other);
	}
	else
	{
		this._regenerateHashKey();
	}
}

/**
 *
 * @param {TileAttributes} other
 * @returns {boolean}
 */
TileAttributes.prototype.set = function(other)
{
	if (this.equals(other))
	{
		return false;
	}

	this._deform.set(other._deform);
	this._color.set(other._color);
	this._regenerateHashKey();

	return true;
};

/**
 *
 * @param {TileAttributes} other
 * @returns {boolean}
 */
TileAttributes.prototype.equals = function(other)
{
	return this.hashKey() === other.hashKey();
};

/**
 *
 * @param {string} side
 * @param {number} value
 */
TileAttributes.prototype.deformSide = function(side, value)
{
	this._deform.setSide(side, value);
	this._regenerateHashKey();
};

/**
 *
 * @param {string} side
 * @returns {number}
 */
TileAttributes.prototype.getDeformationForSide = function(side)
{
	console.assert(this._deform.hasOwnProperty(side), `Invalid side "${side}"`);
	return this._deform[side];
};

/**
 *
 * @param {number?} newHex
 * @returns {number|TileAttributes}
 */
TileAttributes.prototype.colorHex = function(newHex)
{
	if (newHex === undefined)
	{
		return this._color.getHex();
	}

	this.color.setHex(newHex);
	this._regenerateHashKey();

	return this;
};

/**
 *
 * @param {Color?} newColor
 * @returns {Color|TileAttributes}
 */
TileAttributes.prototype.color = function(newColor)
{
	if (!newColor)
	{
		return this._color;
	}

	this._color.set(newColor);
	this._regenerateHashKey();

	return this;
};

/**
 *
 * @returns {string}
 */
TileAttributes.prototype.hashKey = function()
{
	return this._hashKey;
};

/**
 *
 * @param {TileAttributes} other
 * @returns {string[]}
 */
TileAttributes.prototype.deformationDiff = function(other)
{
	return this._deform.diff(other._deform);
};

/**
 *
 * @private
 */
TileAttributes.prototype._regenerateHashKey = function()
{
	const d = this._deform;
	const c = this._color;
	this._hashKey = `${c.getHex()}${d.hashKey()}`;
};

/**
 *
 * @param {String?} name
 * @constructor
 */
export default function Tile(name)
{
	/**
	 *
	 * @type {string}
	 */
	this._name = name || "";

	/**
	 *
	 * @type {BoxGeometry}
	 * @private
	 */
	this._geometry = new THREE.BufferGeometry();

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._position = new THREE.Float32BufferAttribute(DEFAULT_VERTS, 3);

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._color =
		new THREE.BufferAttribute(new Float32Array(this._position.array.length), 3);

	/**
	 *
	 * @type {TileAttributes}
	 * @private
	 */
	Object.defineProperty(this, "_attributes", {value: new TileAttributes()});
}

/**
 *
 * @param {TileAttributes?} attributes
 * @returns {Tile}
 */
Tile.prototype.init = function(attributes)
{
	this._geometry.addAttribute("position", this._position);
	this._geometry.addAttribute("color", this._color);
	this._geometry.setIndex(box.index);

	if (attributes)
	{
		this.setAttributes(attributes);
	} else {
		this._attributes.color(DEFAULT_COLOR);
		//this.debugColor();
		this._applyColor();
	}

	return this;
};

Tile.prototype.destroy = function()
{

};

Tile.prototype.debugColor = function()
{
	const debugColors = [
		new THREE.Color("red"), new THREE.Color("green"), new THREE.Color("blue"),
		new THREE.Color("black"), new THREE.Color("white"),
		new THREE.Color(0x999999)
	];
	let colorIndex = 0;
	const arr = this._color.array;
	const len = arr.length;
	for (let i = 0; i < len;)
	{
		let color = debugColors[colorIndex++];
		let r = color.r;
		let g = color.g;
		let b = color.b;
		arr[i++] = r;
		arr[i++] = g;
		arr[i++] = b;

		arr[i++] = r;
		arr[i++] = g;
		arr[i++] = b;

		arr[i++] = r;
		arr[i++] = g;
		arr[i++] = b;

		arr[i++] = r;
		arr[i++] = g;
		arr[i++] = b;
	}
};

/**
 *
 * @private
 */
Tile.prototype._applyColor = function()
{
	const color = this._attributes.color();
	const r = color.r;
	const g = color.g;
	const b = color.b;
	const arr = this._color.array;
	const len = arr.length;
	for (let i = 0; i < len;)
	{
		arr[i++] = r;
		arr[i++] = g;
		arr[i++] = b;
	}

	this._color.needsUpdate = true;
};

/**
 *
 * @param {TileAttributes} newAttributes
 * @returns {boolean}
 */
Tile.prototype.setAttributes = function(newAttributes)
{
	if (newAttributes.equals(this._attributes))
	{
		return false;
	}

	const deformDiff = this._attributes.deformationDiff(newAttributes);

	this._attributes.set(newAttributes);

	for (let side of deformDiff)
	{
		this._applySideDeformation(side);
	}

	this._applyColor();

	return true;
};

/**
 *
 * @param {string} side
 * @private
 */
Tile.prototype._applySideDeformation = function(side)
{
	const amount = this._attributes.getDeformationForSide(side);
	const idxArray = box.topVerts[side];
	const idxCount = idxArray.length;
	const computedHeight = amount - TILE_HEIGHT / 2;
	const arr = this._position.array;
	let delta = false;
	for (let i = 0; i < idxCount; i++)
	{
		let idx = idxArray[i] * 3 + 1;
		if (arr[idx] !== computedHeight)
		{
			arr[idx] = computedHeight;
			delta = true;
		}
	}

	if (delta)
	{
		this._position.needsUpdate = true;
	}
};

/**
 *
 * @returns {BoxGeometry}
 */
Tile.prototype.getGeometry = function()
{
	return this._geometry;
};

/**
 *
 * @param {String?} newValue
 * @returns {Tile|String}
 */
Tile.prototype.name = function(newValue)
{
	if (!newValue)
	{
		return this._name;
	}

	this._name = newValue;

	return this;
};

/**
 *
 * @returns {Float32Array}
 */
Tile.prototype.getPositionArray = function()
{
	return this._position.array;
};

/**
 *
 * @returns {Float32Array}
 */
Tile.prototype.getColorArray = function()
{
	return this._color.array;
};

/**
 *
 * @param side
 * @returns {number}
 */
Tile.prototype.getSideDeform = function(side)
{
	return this._attributes.getDeformationForSide(side);
};

/**
 *
 * @returns {string}
 */
Tile.prototype.hashKey = function()
{
	return this._attributes.hashKey();
};

/**
 *
 * @returns {string}
 */
Tile.prototype.toString = function()
{
	return `${this._name}:${this.hashKey()}`;
};

/**
 *
 * @param {number?} val
 * @returns {number|Tile}
 */
Tile.prototype.colorHex = function(val)
{
	if (val === undefined)
	{
		return this._attributes.colorHex();
	} else {
		this._attributes.colorHex(val);
		return this;
	}
};

/**
 *
 * @returns {TileAttributes}
 */
Tile.prototype.getNewCopyOfAttributes = function()
{
	return new TileAttributes(this._attributes);
};

/**
 *
 * @param {TileAttributes} other
 * @returns {boolean}
 */
Tile.prototype.attributeEquals = function(other)
{
	return this._attributes.equals(other);
};

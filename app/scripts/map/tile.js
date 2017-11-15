import * as THREE from "../../../bower_components/three.js/build/three.module";

export const TILE_WIDTH = 1;
export const TILE_HEIGHT = 1;
const DEFAULT_COLOR = new THREE.Color().setHSL(0.3, 0.75, 0.5);

const box = new THREE.BoxBufferGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH);
const DEFAULT_VERTS = box.attributes.position;

const ar = box.attributes.position.array;
const arl = ar.length;

for (let i = 0; i < arl;)
{
	let msg = `${ar[i++]},${ar[i++]},${ar[i++]}  `;
	msg += `${ar[i++]},${ar[i++]},${ar[i++]}  `;
	msg += `${ar[i++]},${ar[i++]},${ar[i++]}`;
	console.log(msg);
}

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
	this._geometry.addAttribute("position", DEFAULT_VERTS);

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._position = this._geometry.attributes.position;

	/**
	 *
	 * @type {Float32Array}
	 */
	this.positionArray = this._position.array;

	/**
	 *
	 * @type {Float32Array}
	 */
	this.colorArray = new Float32Array(this.positionArray.length);

	/**
	 *
	 * @type {BufferAttribute}
	 * @private
	 */
	this._colorAttribute = new THREE.BufferAttribute(this.colorArray, 3);

	/**
	 *
	 * @type {Color}
	 * @private
	 */
	this._color = new THREE.Color();

	/**
	 *
	 * @type {null|Vector4}
	 * @private
	 */
	this._deform = null;
}

/**
 *
 * @returns {Tile}
 */
Tile.prototype.init = function()
{
	this._geometry.addAttribute("color", this._colorAttribute);
	this._geometry.setIndex(box.index);
	this.color(DEFAULT_COLOR);
	this.debugColor();
	this.height(0.75);
	return this;
};

Tile.prototype.destroy = function()
{

};

Tile.prototype.debugColor = function()
{
	const debugColors = [
		new THREE.Color("red"), new THREE.Color("green"), new THREE.Color("blue"),
		new THREE.Color(0x999999), new THREE.Color("white"),
		new THREE.Color("black")
	];
	let colorIndex = 0;
	const arr = this.colorArray;
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
 * @param {Color?} incoming
 * @returns {Color|Tile}
 */
Tile.prototype.color = function(incoming)
{
	if (!incoming)
	{
		return this._color;
	}

	this._color.copy(incoming);

	const r = this._color.r;
	const g = this._color.g;
	const b = this._color.b;
	const arr = this.colorArray;
	const len = arr.length;
	for (let i = 0; i < len;)
	{
		arr[i++] = r;
		arr[i++] = g;
		arr[i++] = b;
	}
	this._colorAttribute.needsUpdate = true;

	return this;
};

Tile.prototype.height = function(newHeight)
{
	const indicies = box.index.array;
	const relativeHeight = newHeight - 0.5;
	const start = 6 * 3;
	const end = start + 6;
	for (let i = start - 1; i < end; i++)
	{
		let idx = indicies[i];
		this._position.array[idx * 3 + 1] = relativeHeight;
	}

	this._position.needsUpdate = true;

	return this;
};

/**
 *
 * @param {Vector4} deformation
 * @returns {Vector4|null|Tile}
 */
Tile.prototype.deform = function(deformation)
{
	if (!deformation)
	{
		return this._deform;
	}

	deformation = new THREE.Vector4();

	this._deform = deformation.clone();

	return this;
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
 * @param {number?} newHex
 * @returns {number|Tile}
 */
Tile.prototype.colorHex = function(newHex)
{
	if (!newHex)
	{
		return this._color.getHex();
	}

	this.color(new THREE.Color(newHex));

	return this;
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

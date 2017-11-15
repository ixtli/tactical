import * as THREE from "../../../bower_components/three.js/build/three.module";
import TileBufferGeometry, {TILE_HEIGHT} from "../tile_geometry";

const DEFAULT_COLOR = new THREE.Color().setHSL(0.3, 0.75, 0.5);

const box = new TileBufferGeometry();
const DEFAULT_VERTS = box.attributes.position;

const ar = box.attributes.position.array;
const arl = ar.length;

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
	//this.debugColor();
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
		new THREE.Color("black"), new THREE.Color("white"),
		new THREE.Color(0x999999)
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
	const idxCount = box.topVerts.length;
	const computedHeight = newHeight - TILE_HEIGHT / 2;
	for (let i = 0; i < idxCount; i++)
	{
		let idx = box.topVerts[i] * 3 + 1;
		this.positionArray[idx] = computedHeight;
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

import * as THREE from "../../../bower_components/three.js/build/three.module";

export const TILE_WIDTH = 1;
export const TILE_HEIGHT = 1;
const DEFAULT_COLOR = new THREE.Color().setHSL(0.3, 0.75, 0.5);

const box = new THREE.BoxBufferGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH);
const DEFAULT_VERTS = box.attributes.position;

/**
 *
 * @constructor
 */
export default function Tile()
{
	/**
	 *
	 * @type {string}
	 * @private
	 */
	this._name = "";

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
	this.color(DEFAULT_COLOR);
	return this;
};

Tile.prototype.destroy = function()
{

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

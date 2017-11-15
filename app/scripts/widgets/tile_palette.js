import * as THREE from "../../../bower_components/three.js/build/three.module";
import WidgetBase from "./base_widget";
import Tile from "../map/tile"; // jshint ignore:line
import Chunk from "../map/chunk"; // jshint ignore:line
import {subscribe, unsubscribe} from "../bus";

const VIEW_SIZE = 96;

/**
 *
 * @type {MeshPhongMaterial}
 */
const TILE_MATERIAL = new THREE.MeshPhongMaterial({
	color: 0xffffff,
	flatShading: true,
	vertexColors: THREE.VertexColors,
	shininess: 0
});

/**
 *
 * @constructor
 */
export default function TilePalette()
{
	WidgetBase.call(this);

	/**
	 *
	 * @type {WebGLRenderer}
	 * @private
	 */
	this._renderer = new THREE.WebGLRenderer({antialias: false});

	/**
	 *
	 * @type {OrthographicCamera}
	 * @private
	 */
	this._camera = new THREE.OrthographicCamera(0, 0, 0, 0, 0.1, 2000);

	/**
	 *
	 * @type {Scene}
	 * @private
	 */
	this._scene = new THREE.Scene();

	/**
	 *
	 * @type {null|Chunk}
	 * @private
	 */
	this._currentMap = null;

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._nameInput = document.createElement("input");

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._colorInput = document.createElement("input");

	/**
	 *
	 * @type {null|Tile}
	 * @private
	 */
	this._currentTile = null;

	/**
	 *
	 * @type {null|Mesh}
	 * @private
	 */
	this._mesh = null;
}

TilePalette.prototype = Object.create(WidgetBase.prototype);

TilePalette.prototype.init = function()
{
	WidgetBase.prototype.init.call(this);

	window.devicePixelRatio = window.devicePixelRatio || 1;
	this._renderer.setPixelRatio(window.devicePixelRatio);
	this._renderer.setSize(VIEW_SIZE, VIEW_SIZE);

	this._scene.background = new THREE.Color(0x8BFFF7);
	this._scene.add(new THREE.AmbientLight(0x555555));
	const light = new THREE.SpotLight(0xffffff, 1.5);
	light.position.set(100, 500, 1900);
	this._scene.add(light);

	this._camera.left = -1;
	this._camera.right = 1;
	this._camera.top = -1;
	this._camera.bottom = 1;
	this._camera.updateProjectionMatrix();
	this._camera.position.set(-2, 1, -2);
	this._camera.lookAt(new THREE.Vector3());

	this._nameInput.placeholder = "Tile Name";
	this._nameInput.addEventListener("keypress", (function(evt)
	{
		this._currentTile.name(evt.target.value);
	}).bind(this));

	this._colorInput.placeholder = "Color Hex";
	this._colorInput.addEventListener("input", (function(evt)
	{
		this._currentTile.colorHex(parseInt(evt.target.value, 16));
		this._render();
	}).bind(this));

	this._container.appendChild(this._renderer.domElement);
	this._container.appendChild(this._nameInput);
	this._container.appendChild(this._colorInput);

	this._container.classList.add("tile-palette");

	subscribe("engine.map.change", this, this._mapChange);
};

/**
 *
 * @private
 */
TilePalette.prototype._currentTileChange = function()
{
	const ct = this._currentTile;
	if (!ct)
	{
		this._nameInput.disabled = true;
		this._colorInput.disabled = true;
		return;
	}

	this._nameInput.disabled = false;
	this._colorInput.disabled = false;
	this._nameInput.value = ct.name();
	this._colorInput.value = ct.colorHex().toString(16);
};

TilePalette.prototype.destroy = function()
{
	unsubscribe("engine.map.change", this, this._mapChange);
	this._container.classList.remove("tile-palette");

	WidgetBase.prototype.destroy.call(this);
};

/**
 *
 * @param {Chunk} newMap
 * @private
 */
TilePalette.prototype._mapChange = function(newMap)
{
	this._currentMap = newMap;
	this._setCurrentTile(this._currentMap._tileArray[0]);
	this._render();
};

/**
 *
 * @param {Tile} newTile
 * @private
 */
TilePalette.prototype._setCurrentTile = function(newTile)
{
	if (this._mesh)
	{
		this._scene.remove(this._mesh);
	}

	this._currentTile = newTile;
	this._currentTileChange();
	this._mesh = new THREE.Mesh(newTile.getGeometry(), TILE_MATERIAL);
	this._mesh.position.set(0, 0, 0);
	this._scene.add(this._mesh);
};

TilePalette.prototype._render = function()
{
	this._renderer.render(this._scene, this._camera);
};

import * as THREE from "../../../bower_components/three.js/build/three.module";
import WidgetBase from "./base_widget";
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
	this._container.appendChild(this._renderer.domElement);

	this._scene.background = new THREE.Color(0x8BFFF7);
	this._scene.add(new THREE.AmbientLight(0x555555));
	const light = new THREE.SpotLight(0xffffff, 1.5);
	light.position.set(100, 500, 1900);
	this._scene.add(light);

	this._camera.left = -1;
	this._camera.right= 1;
	this._camera.top = -1;
	this._camera.bottom = 1;
	this._camera.updateProjectionMatrix();

	this._camera.position.set(-2, 1, -2);
	this._camera.lookAt(new THREE.Vector3());

	this._render();

	this._container.classList.add("tile-palette");

	subscribe("engine.map.change", this, this._mapChange);
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

	if (this._mesh)
	{
		this._scene.remove(this._mesh);
	}

	const tile = this._currentMap._tileArray[0];
	this._mesh = new THREE.Mesh(tile.getGeometry(), TILE_MATERIAL);
	this._mesh.position.set(0,0,0);
	this._scene.add(this._mesh);

	this._render();
};

TilePalette.prototype._render = function()
{
	this._renderer.render(this._scene, this._camera);
};

import * as THREE from "../../../bower_components/three.js/build/three.module";
import WidgetBase from "./base_widget";
import Tile, {TileAttributes} from "../map/tile"; // jshint ignore:line
import Chunk from "../map/chunk"; // jshint ignore:line
import {subscribe, unsubscribe} from "../bus";

const VIEW_SIZE = 96;

/**
 *
 * @type {MeshPhongMaterial}
 */
const TILE_MATERIAL = new THREE.MeshPhongMaterial({
	color: 0xffffff, flatShading: true, vertexColors: THREE.VertexColors
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
	 * @type {Array.<Element>}
	 * @private
	 */
	this._colorInput = [
		document.createElement("input"), document.createElement("input"),
		document.createElement("input")
	];

	/**
	 *
	 * @type {Array.<Element>}
	 * @private
	 */
	this._deformInput = [
		document.createElement("input"), document.createElement("input"),
		document.createElement("input"), document.createElement("input")
	];

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._checkBoxContainer = document.createElement("div");

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

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._modifyExistingTile = true;

	/**
	 *
	 * @type {TileAttributes}
	 * @private
	 */
	this._attributes = new TileAttributes();

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._currentLocation = new THREE.Vector3();
}

TilePalette.prototype = Object.create(WidgetBase.prototype);

TilePalette.prototype.init = function()
{
	WidgetBase.prototype.init.call(this);

	this._initializeTilePreview();
	this._initializeDOM();

	subscribe("engine.map.change", this, this._mapChange);
	subscribe("select.primary.tile", this, this._primarySelectionChange);
	subscribe("select.toggle", this, this._primarySelectionChange);
	subscribe("select.add", this, this._primarySelectionChange);
	subscribe("select.remove", this, this._primarySelectionChange);
};

TilePalette.prototype.destroy = function()
{
	unsubscribe("engine.map.change", this, this._mapChange);
	unsubscribe("select.primary.tile", this, this._primarySelectionChange);
	unsubscribe("select.toggle", this, this._primarySelectionChange);
	unsubscribe("select.add", this, this._primarySelectionChange);
	unsubscribe("select.remove", this, this._primarySelectionChange);

	this._container.classList.remove("tile-palette");

	WidgetBase.prototype.destroy.call(this);
};

TilePalette.prototype._initializeDOM = function()
{
	this._nameInput.placeholder = "Tile Name";
	this._nameInput.addEventListener("input", (function(evt)
	{
		this._currentTile.name(evt.target.value);
	}).bind(this));

	this._colorInput[0].id = "r";
	this._colorInput[1].id = "g";
	this._colorInput[2].id = "b";

	this._deformInput[0].id = "pp";
	this._deformInput[1].id = "pn";
	this._deformInput[2].id = "np";
	this._deformInput[3].id = "nn";

	const cb = document.createElement("input");
	cb.id = "met";
	cb.type = "checkbox";
	cb.checked = this._modifyExistingTile;
	cb.addEventListener("change", (function(evt)
	{
		this._modifyExistingTile = evt.target.checked;
	}).bind(this));
	const label = document.createElement("label");
	label.for = "met";
	label.innerHTML = "Modify";
	this._checkBoxContainer.appendChild(cb);
	this._checkBoxContainer.appendChild(label);

	this._container.appendChild(this._renderer.domElement);
	this._container.appendChild(this._nameInput);

	let fxn = this._colorInputChange.bind(this);

	for (let ci of this._colorInput)
	{
		ci.classList.add("color-input");
		ci.placeholder = ci.id;
		ci.addEventListener("input", fxn);
		this._container.appendChild(ci);
	}

	fxn = this._deformInputChange.bind(this);

	for (let di of this._deformInput)
	{
		di.classList.add("deform-input");
		di.placeholder = di.id;
		di.addEventListener("input", fxn);
		this._container.appendChild(di);
	}

	this._container.appendChild(this._checkBoxContainer);
	this._container.classList.add("tile-palette");

	this._container.style.display = "none";
};

TilePalette.prototype._initializeTilePreview = function()
{
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
	this._camera.top = 1;
	this._camera.bottom = -1;
	this._camera.updateProjectionMatrix();
	this._camera.position.set(-2, 1, -2);
	this._camera.lookAt(new THREE.Vector3());
};

/**
 *
 * @param {Vector3} p
 * @private
 */
TilePalette.prototype._primarySelectionChange = function(p)
{
	this.currentTile(p ? this._currentMap.getTileForLocation(p) : null);
	this._currentLocation.copy(p);
};

/**
 *
 * @param {InputEvent} evt
 * @private
 */
TilePalette.prototype._deformInputChange = function(evt)
{
	const me = evt.target;
	const val = parseFloat(me.value);

	if (val >= 0 && val <= 1)
	{
		me.classList.remove("invalid");
	}
	else
	{
		me.classList.add("invalid");
		return;
	}

	this._attributes.deformSide(me.id, val);

	this._attributesHaveChanged();
};

/**
 *
 * @param {InputEvent} evt
 * @private
 */
TilePalette.prototype._colorInputChange = function(evt)
{
	const me = evt.target;
	const val = parseFloat(me.value);

	if (val >= 0 && val <= 1)
	{
		me.classList.remove("invalid");
	}
	else
	{
		me.classList.add("invalid");
		return;
	}

	this._attributes.colorRGBComponent(me.id, val);
	this._attributesHaveChanged();
};

TilePalette.prototype._attributesHaveChanged = function()
{
	if (this._currentTile.attributeEquals(this._attributes))
	{
		return;
	}

	let nt = null;
	if (this._modifyExistingTile)
	{
		let tile = this._currentMap.tileForAttributes(this._attributes);

		if (tile === null)
		{
			tile = new Tile(this._currentTile.name());
			tile.init(this._attributes);
		}

		nt = this._currentMap.setTileForLocation(this._currentLocation, tile);
	}
	else
	{
		nt = this._currentMap.updateTile(this._currentTile, this._attributes);
	}

	this.currentTile(nt);
};

/**
 *
 * @param {null|Tile?} newTile
 * @returns {Tile|TilePalette}
 */
TilePalette.prototype.currentTile = function(newTile)
{
	const ct = this._currentTile;

	if (!newTile && newTile !== null)
	{
		return ct;
	}

	if (newTile === ct)
	{
		this._render();
		return this;
	}

	if (!newTile)
	{
		this._container.style.display = "none";
		this._currentTile = null;
		return this;
	}

	this._container.style.display = null;
	this._nameInput.value = newTile.name();

	// Copy attributes locally
	this._attributes.set(newTile.getNewCopyOfAttributes());

	// Update attribute fields with new values
	const color = this._attributes.color();
	this._colorInput[0].value = color.r;
	this._colorInput[1].value = color.g;
	this._colorInput[2].value = color.b;

	for (let di of this._deformInput)
	{
		di.value = this._attributes.getDeformationForSide(di.id);
	}

	if (this._mesh)
	{
		this._scene.remove(this._mesh);
	}

	this._mesh = new THREE.Mesh(newTile.getGeometry(), TILE_MATERIAL);
	this._mesh.position.set(0, 0, 0);
	this._scene.add(this._mesh);
	this._render();

	this._currentTile = newTile;

	return this;
};

/**
 *
 * @param {Chunk} newMap
 * @private
 */
TilePalette.prototype._mapChange = function(newMap)
{
	if (newMap === this._currentMap)
	{
		return;
	}

	this._currentMap = newMap;
	this.currentTile(null);
};

TilePalette.prototype._render = function()
{
	this._renderer.render(this._scene, this._camera);
};

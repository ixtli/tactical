import * as THREE from "../../bower_components/three.js/build/three.module";
import Engine from "./engine";
import {TILE_WIDTH} from "./mapmesh";
import {subscribe, unsubscribe} from "./bus";

/**
 *
 * @param {Engine} graphicsEngine
 * @constructor
 */
export default function SelectionManager(graphicsEngine)
{
	this._engine = graphicsEngine;

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._selection = new THREE.Vector3();

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._offset = new THREE.Vector3(0.5, 0.5, 0.5);

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._selectionBox = new THREE.Mesh();

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._highlightBox = new THREE.Mesh();

	/**
	 *
	 * @type {BoxGeometry}
	 * @private
	 */
	this._highlightBoxGeometry =
		new THREE.BoxGeometry(TILE_WIDTH, TILE_WIDTH, TILE_WIDTH);

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._highlightBoxCenter = this._highlightBoxGeometry.center();

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._nextPickSelects = false;

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._shiftDown = false;

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._altDown = false;

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._controlDown = false;

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._metaDown = false;

	/**
	 *
	 * @type {Vector2}
	 * @private
	 */
	this._mouseDownLocation = new THREE.Vector2();

	/**
	 *
	 * @type {Vector2}
	 * @private
	 */
	this._previousDragLocation = new THREE.Vector2();

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._dragScrollDampingFactor = 10;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._zoomStepSize = 2;
}

SelectionManager.prototype.init = function()
{
	this._highlightBox =
		new THREE.Mesh(this._highlightBoxGeometry, new THREE.MeshLambertMaterial({
			transparent: true, opacity: 0.5, color: 0xffff00
		}));
	this._highlightBox.scale.add(this._offset);
	this._selectionBox =
		new THREE.Mesh(this._highlightBoxGeometry, new THREE.MeshLambertMaterial({
			transparent: true, opacity: 0.5, color: 0x2222ff
		}));
	this._selectionBox.scale.add(this._offset);

	this._engine.addObjectToScene(this._selectionBox);
	this._engine.addObjectToScene(this._highlightBox);

	subscribe("engine.pick", this, this._engineHasPicked);
	subscribe("input.click", this, this._userClicked);
	subscribe("input.mousedown", this, this._mouseDown);
	subscribe("input.keypress", this, this._keyPress);
	subscribe("input.keyup", this, this._keyUp);
	subscribe("input.keydown", this, this._keyDown);
	subscribe("input.drag", this, this._onDrag);
	subscribe("input.wheel", this, this._onWheel);
};

SelectionManager.prototype.destroy = function()
{
	unsubscribe("engine.pick", this, this._engineHasPicked);
	unsubscribe("input.click", this, this._userClicked);
	unsubscribe("input.mousedown", this, this._mouseDown);
	unsubscribe("input.keypress", this, this._keyPress);
	unsubscribe("input.keyup", this, this._keyUp);
	unsubscribe("input.keydown", this, this._keyDown);
	unsubscribe("input.drag", this, this._onDrag);
	unsubscribe("input.wheel", this, this._onWheel);

	this._engine.removeObjectFromScene(this._selectionBox);
	this._engine.removeObjectFromScene(this._highlightBox);
};

/**
 *
 * @param {number} deltaY
 * @private
 */
SelectionManager.prototype._onWheel = function(deltaY)
{
	if (deltaY > 0)
	{
		this._engine.zoom(this._zoomStepSize, 250);
	} else {
		this._engine.zoom(-this._zoomStepSize, 250);
	}
};

/**
 *
 * @param {{x: number, y: number}} evt
 * @private
 */
SelectionManager.prototype._onDrag = function(evt)
{
	if (this._metaDown)
	{
		// Scroll relative to the distance between the last drag update and now
		let delta = new THREE.Vector3();
		const df = this._dragScrollDampingFactor;
		delta.x = (evt.x - this._previousDragLocation.x) / df;
		delta.z = (evt.y - this._previousDragLocation.y) / df;
		this._engine.panCameraRelative(delta);
		this._previousDragLocation.set(evt.x, evt.y);
	}
};

/**
 *
 * @param {number} x
 * @param {number} y
 * @private
 */
SelectionManager.prototype._mouseDown = function(x, y)
{
	this._mouseDownLocation.set(x, y);
	this._previousDragLocation.set(x, y);
};

/**
 *
 * @param {number} x
 * @param {number} y
 * @private
 */
SelectionManager.prototype._userClicked = function(x, y)
{
	this._nextPickSelects = true;
};

/**
 *
 * @param {null|Vector3} vec
 * @private
 */
SelectionManager.prototype._engineHasPicked = function(vec)
{
	if (this._nextPickSelects)
	{

		if (vec)
		{
			this._selectionBox.visible = true;
			this._selection = vec;
			this.selectTile(vec);
			this._engine.lookAt(vec, 250);
		}
		else
		{
			this._selectionBox.visible = false;
		}

		this._nextPickSelects = false;
	}

	if (!vec)
	{
		this._highlightBox.visible = false;
		return;
	}

	this._highlightBox.visible = true;
	this.highlightTile(vec);
};

/**
 *
 * @param {Vector3} vec
 */
SelectionManager.prototype.selectTile = function(vec)
{
	this._selectionBox.position.copy(vec);
	this._selectionBox.position.multiplyScalar(TILE_WIDTH);
};

/**
 *
 * @param {Vector3} vec
 */
SelectionManager.prototype.highlightTile = function(vec)
{
	this._highlightBox.position.copy(vec);
	this._highlightBox.position.multiplyScalar(TILE_WIDTH);
};

/**
 *
 * @param {KeyboardEvent} event
 * @private
 */
SelectionManager.prototype._keyPress = function(event)
{
	let updateSelection = false;
	switch (event.key)
	{
		case "q":
			this._engine.orbit(500, false);
			break;
		case "e":
			this._engine.orbit(500, true);
			break;
		case "w":
			this._selection.z++;
			updateSelection = true;
			break;
		case "a":
			this._selection.x++;
			updateSelection = true;
			break;
		case "s":
			this._selection.z--;
			updateSelection = true;
			break;
		case "d":
			this._selection.x--;
			updateSelection = true;
			break;
		case "r":
			this._selection.y++;
			updateSelection = true;
			break;
		case "f":
			this._selection.y--;
			updateSelection = true;
			break;
		default:
			return;
	}

	if (updateSelection)
	{
		this.selectTile(this._selection);
		this._engine.lookAt(this._selection, 250);
	}

	event.preventDefault();
};

/**
 *
 * @param {KeyboardEvent} event
 */
SelectionManager.prototype._keyUp = function(event)
{
	switch (event.key)
	{
		case "Meta":
			this._metaDown = false;
			break;
		case "Control":
			this._controlDown = false;
			break;
		case "Alt":
			this._altDown = false;
			break;
		case "Shift":
			this._shiftDown = false;
			break;
		default:
			return;
	}
};

/**
 *
 * @param {KeyboardEvent} event
 */
SelectionManager.prototype._keyDown = function(event)
{
	switch (event.key)
	{
		case "Meta":
			this._metaDown = true;
			break;
		case "Control":
			this._controlDown = true;
			break;
		case "Alt":
			this._altDown = true;
			break;
		case "Shift":
			this._shiftDown = true;
			break;
		default:
			return;
	}
};

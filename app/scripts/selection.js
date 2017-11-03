import * as THREE from "../../bower_components/three.js/build/three.module";
import Engine, {EAST, NORTH, SOUTH, WEST} from "./engine"; // jshint ignore:line
import {TILE_HEIGHT, TILE_WIDTH} from "./mapmesh";
import {emit, subscribe, unsubscribe} from "./bus";
import generateFSM from "./state_machine";

/**
 *
 * @type {number}
 */
const HIGHLIGHT_BOX_COLOR = 0xffff00;

/**
 *
 * @type {number}
 */
const PRIMARY_SELECTION_BOX_COLOR = 0x2222ff;

/**
 *
 * @type {number}
 */
const SECONDARY_SELECTION_BOX_COLOR = 0x22ff22;

const NO_SELECTION = Symbol("NO_SELECTION");

const PRIMARY_SELECTION = Symbol("PRIMARY_SELECTION");

const SECONDARY_SELECTION = Symbol("SECONDARY_SELECTION");

/**
 *
 * @param {Engine} graphicsEngine
 * @constructor
 */
export default function SelectionManager(graphicsEngine)
{
	/**
	 *
	 * @type {Engine}
	 * @private
	 */
	this._engine = graphicsEngine;

	/**
	 *
	 * @type {null|Vector3}
	 * @private
	 */
	this._primarySelection = null;

	/**
	 *
	 * @type {null|Vector3}
	 * @private
	 */
	this._secondarySelection = null;

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
	this._primarySelectionBox = new THREE.Mesh();

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._secondarySelectionBox = new THREE.Mesh();

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
		new THREE.BoxBufferGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH);

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

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._facingModifiers = new THREE.Vector3(1, 1, 1);

	const stateMap = {
		[NO_SELECTION]: {
			enter: this.deselect,
			leave: null,
			from: new Set([PRIMARY_SELECTION, SECONDARY_SELECTION]),
			to: new Set([PRIMARY_SELECTION])
		},
		[PRIMARY_SELECTION]: {
			enter: null,
			leave: null,
			from: new Set([NO_SELECTION, SECONDARY_SELECTION]),
			to: new Set([NO_SELECTION, SECONDARY_SELECTION])
		},
		[SECONDARY_SELECTION]: {
			enter: null,
			leave: null,
			from: new Set([PRIMARY_SELECTION]),
			to: new Set([NO_SELECTION, PRIMARY_SELECTION])
		}
	};

	const [mutate, getter] = generateFSM(this, stateMap, NO_SELECTION, "select");

	/**
	 * @type {Function}
	 */
	Object.defineProperty(this, "changeSelectionState", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: mutate
	});

	/**
	 * @type {Function}
	 */
	Object.defineProperty(this, "getSelectionState", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: getter
	});
}

SelectionManager.prototype.init = function()
{
	this._highlightBox =
		new THREE.Mesh(this._highlightBoxGeometry, new THREE.MeshLambertMaterial({
			transparent: true, opacity: 0.5, color: HIGHLIGHT_BOX_COLOR
		}));
	this._highlightBox.scale.add(this._offset);
	this._primarySelectionBox =
		new THREE.Mesh(this._highlightBoxGeometry, new THREE.MeshLambertMaterial({
			transparent: true, opacity: 0.5, color: PRIMARY_SELECTION_BOX_COLOR
		}));
	this._primarySelectionBox.scale.add(this._offset);

	this._secondarySelectionBox =
		new THREE.Mesh(this._highlightBoxGeometry,
			new THREE.MeshLambertMaterial({
				transparent: true,
				opacity: 0.5,
				color: SECONDARY_SELECTION_BOX_COLOR
			}));

	this._primarySelectionBox.visible = false;
	this._secondarySelectionBox.visible = false;

	this._subscribe();
	this._engine.addObjectToScene(this._primarySelectionBox);
	this._engine.addObjectToScene(this._highlightBox);
	this._engine.addObjectToScene(this._secondarySelectionBox);
};

SelectionManager.prototype.destroy = function()
{
	this._unsubscribe();
	this._engine.removeObjectFromScene(this._primarySelectionBox);
	this._engine.removeObjectFromScene(this._highlightBox);
	this._engine.removeObjectFromScene(this._secondarySelectionBox);
};

SelectionManager.prototype._subscribe = function()
{
	subscribe("engine.pick", this, this._engineHasPicked);
	subscribe("engine.camera.facing", this, this._facingChange);
	subscribe("input.click", this, this._userClicked);
	subscribe("input.mousedown", this, this._mouseDown);
	subscribe("input.keypress", this, this._keyPress);
	subscribe("input.keyup", this, this._keyUp);
	subscribe("input.keydown", this, this._keyDown);
	subscribe("input.drag", this, this._onDrag);
	subscribe("input.wheel", this, this._onWheel);
};

SelectionManager.prototype._unsubscribe = function()
{
	unsubscribe("engine.pick", this, this._engineHasPicked);
	unsubscribe("engine.camera.facing", this, this._facingChange);
	unsubscribe("input.click", this, this._userClicked);
	unsubscribe("input.mousedown", this, this._mouseDown);
	unsubscribe("input.keypress", this, this._keyPress);
	unsubscribe("input.keyup", this, this._keyUp);
	unsubscribe("input.keydown", this, this._keyDown);
	unsubscribe("input.drag", this, this._onDrag);
	unsubscribe("input.wheel", this, this._onWheel);
};

SelectionManager.prototype.deselect = function()
{
	this._primarySelection = null;
	this._secondarySelection = null;
	this._primarySelectionBox.visible = false;
	this._secondarySelectionBox.visible = false;
};

/**
 *
 * @param {Symbol} newDirection
 * @private
 */
SelectionManager.prototype._facingChange = function(newDirection)
{
	this._facingModifiers.set(1, 1, 1);
	switch (newDirection)
	{
		case NORTH:
			this._facingModifiers.z = -1;
			break;
		case EAST:
			break;
		case WEST:
			this._facingModifiers.z = -1;
			this._facingModifiers.x = -1;
			break;
		case SOUTH:
			this._facingModifiers.x = -1;
			break;
	}
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
	}
	else
	{
		this._engine.zoom(-this._zoomStepSize, 250);
	}
};

/**
 *
 * @param {number} x
 * @param {number} y
 * @private
 */
SelectionManager.prototype._onDrag = function(x, y)
{
	if (this._metaDown)
	{
		// Scroll relative to the distance between the last drag update and now
		let delta = new THREE.Vector3();
		const df = this._dragScrollDampingFactor;
		const dx = (x - this._previousDragLocation.x) / df;
		const fc = this._facingModifiers;
		delta.x = dx * fc.x;
		delta.z = dx * fc.z;
		delta.y = fc.y * (y - this._previousDragLocation.y) / df;
		this._engine.panCameraRelative(delta);
		this._previousDragLocation.set(x, y);
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
	this._engine.pickAtCoordinates(x, y, true);
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
			this._primarySelectionBox.visible = true;
			this._primarySelection = vec;
			this.selectTile(vec);
			this._engine.lookAt(vec, 250);
		}
		else
		{
			this._primarySelectionBox.visible = false;
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
	this._primarySelectionBox.position.copy(vec);
	this._primarySelectionBox.position.multiplyScalar(TILE_WIDTH);
	this._primarySelectionBox.position.add(new THREE.Vector3(0, 0, 0));
	emit("selection.tile", [vec]);
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
			this._primarySelection.z++;
			updateSelection = true;
			break;
		case "a":
			this._primarySelection.x++;
			updateSelection = true;
			break;
		case "s":
			this._primarySelection.z--;
			updateSelection = true;
			break;
		case "d":
			this._primarySelection.x--;
			updateSelection = true;
			break;
		case "r":
			this._primarySelection.y++;
			updateSelection = true;
			break;
		case "f":
			this._primarySelection.y--;
			updateSelection = true;
			break;
		case "h":
			console.error("This should be a help dialog.");
			break;
		case " ":
			emit("editor.tile.toggle", [this._primarySelection]);
			break;
		default:
			console.log(event.key);
			return;
	}

	if (updateSelection)
	{
		this.selectTile(this._primarySelection);
		this._engine.lookAt(this._primarySelection, 250);
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
		case "Escape":
			this.changeSelectionState(NO_SELECTION);
			break;
		default:
			console.log(event);
			return;
	}
};

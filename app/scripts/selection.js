import * as THREE from "../../bower_components/three.js/build/three.module";
import Engine, {EAST, NORTH, SOUTH, WEST} from "./engine"; // jshint ignore:line
import {TILE_HEIGHT, TILE_WIDTH} from "./mapmesh";
import {emit, subscribe, unsubscribe} from "./bus";
import generateFSM, {START} from "./state_machine";

/**
 *
 * @type {number}
 */
const SHIFT_MOVE_JUMP = 10;

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

/**
 * Nothing is selected
 * @type {Symbol}
 */
export const NO_SELECTION = Symbol("NO_SELECTION");

/**
 * There is a primary selection
 * @type {Symbol}
 */
export const PRIMARY_SELECTION = Symbol("PRIMARY_SELECTION");

/**
 * We have or are currently selecting a secondary selection
 * @type {Symbol}
 */
export const SECONDARY_SELECTION = Symbol("SECONDARY_SELECTION");

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
			enter: this.deselectAll,
			leave: null,
			from: new Set([PRIMARY_SELECTION, SECONDARY_SELECTION, START]),
			to: new Set([PRIMARY_SELECTION])
		}, [PRIMARY_SELECTION]: {
			enter: null,
			leave: null,
			from: new Set([NO_SELECTION, SECONDARY_SELECTION]),
			to: new Set([NO_SELECTION, SECONDARY_SELECTION])
		}, [SECONDARY_SELECTION]: {
			enter: null,
			leave: null,
			from: new Set([PRIMARY_SELECTION]),
			to: new Set([NO_SELECTION, PRIMARY_SELECTION])
		}
	};

	const [mutate, getter] = generateFSM(this, stateMap, "select");

	/**
	 * @type {Function}
	 */
	Object.defineProperty(this, "changeSelectionState", {
		enumerable: false, configurable: false, writable: false, value: mutate
	});

	/**
	 * @type {Function}
	 */
	Object.defineProperty(this, "getSelectionState", {
		enumerable: false, configurable: false, writable: false, value: getter
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
		new THREE.Mesh(this._highlightBoxGeometry, new THREE.MeshLambertMaterial({
			transparent: true, opacity: 0.5, color: SECONDARY_SELECTION_BOX_COLOR
		}));
	this._secondarySelectionBox.scale.add(this._offset);

	this._primarySelectionBox.visible = false;
	this._secondarySelectionBox.visible = false;

	this._subscribe();
	this._engine.addObjectToScene(this._primarySelectionBox);
	this._engine.addObjectToScene(this._highlightBox);
	this._engine.addObjectToScene(this._secondarySelectionBox);

	this.changeSelectionState(NO_SELECTION);
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

SelectionManager.prototype.deselectAll = function()
{
	this.deselectPrimary();
	this.deselectSecondary();
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
		if (vec && this._engine.getCurrentMap().inBounds(vec))
		{
			this.select(vec);

			if (this.getSelectionState() === NO_SELECTION)
			{
				this.changeSelectionState(PRIMARY_SELECTION);
			}
		}
		else
		{
			this.deselect();
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
SelectionManager.prototype.select = function(vec)
{
	console.assert(vec, "Must provide a vector to select or use deselect.");
	const state = this.getSelectionState();
	switch (state)
	{
		case NO_SELECTION:
		case PRIMARY_SELECTION:
			this.selectPrimary(vec);
			break;
		case SECONDARY_SELECTION:
			this.selectSecondary(vec);
			break;
	}
};

/**
 *
 * @param {Vector3} vec
 */
SelectionManager.prototype.selectSecondary = function(vec)
{
	this._secondarySelectionBox.position.copy(vec);
	this._secondarySelectionBox.position.multiplyScalar(TILE_WIDTH);
	this._secondarySelectionBox.position.add(new THREE.Vector3(0, 0, 0));
	this._secondarySelectionBox.visible = true;
	this._secondarySelection = vec;
	emit("select.secondary.tile", [vec]);
};

/**
 *
 * @param {Vector3} vec
 */
SelectionManager.prototype.selectPrimary = function(vec)
{
	this._primarySelectionBox.position.copy(vec);
	this._primarySelectionBox.position.multiplyScalar(TILE_WIDTH);
	this._primarySelectionBox.position.add(new THREE.Vector3(0, 0, 0));
	this._primarySelectionBox.visible = true;
	this._primarySelection = vec;
	emit("select.primary.tile", [vec]);
	this._engine.lookAt(vec, 250);
};

SelectionManager.prototype.deselect = function()
{
	const state = this.getSelectionState();
	switch (state)
	{
		case PRIMARY_SELECTION:
			this.deselectPrimary();
			this.changeSelectionState(NO_SELECTION);
			break;
		case SECONDARY_SELECTION:
			this.deselectSecondary();
			this.changeSelectionState(PRIMARY_SELECTION);
			break;
		default:
			break;
	}
};

SelectionManager.prototype.deselectSecondary = function()
{
	this._secondarySelectionBox.visible = false;
	this._secondarySelection = null;
	emit("select.secondary.deselect", []);
};

SelectionManager.prototype.deselectPrimary = function()
{
	this._primarySelectionBox.visible = false;
	this._primarySelection = null;
	emit("select.primary.deselect", []);
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
	const selectionDelta = new THREE.Vector3();
	switch (event.code)
	{
		case "KeyQ":
			this._engine.orbit(500, false);
			break;
		case "KeyE":
			this._engine.orbit(500, true);
			break;
		case "ArrowUp":
		case "KeyW":
			selectionDelta.z += this._shiftDown ? SHIFT_MOVE_JUMP : 1;
			updateSelection = true;
			break;
		case "ArrowLeft":
		case "KeyA":
			selectionDelta.x += this._shiftDown ? SHIFT_MOVE_JUMP : 1;
			updateSelection = true;
			break;
		case "ArrowDown":
		case "KeyS":
			selectionDelta.z -= this._shiftDown ? SHIFT_MOVE_JUMP : 1;
			updateSelection = true;
			break;
		case "ArrowRight":
		case "KeyD":
			selectionDelta.x -= this._shiftDown ? SHIFT_MOVE_JUMP : 1;
			updateSelection = true;
			break;
		case "KeyR":
			if (this._altDown)
			{
				this.changeSelectionState(NO_SELECTION);
				this._engine.resetCamera();
			}
			else
			{
				selectionDelta.y += this._shiftDown ? SHIFT_MOVE_JUMP : 1;
				updateSelection = true;
			}
			break;
		case "KeyF":
			selectionDelta.y -= this._shiftDown ? SHIFT_MOVE_JUMP : 1;
			updateSelection = true;
			break;
		case "KeyH":
			console.error("This should be a help dialog.");
			break;
		case "KeyZ":
			switch (this.getSelectionState())
			{
				case PRIMARY_SELECTION:
					this.changeSelectionState(SECONDARY_SELECTION);
					break;
				case SECONDARY_SELECTION:
					this.changeSelectionState(PRIMARY_SELECTION);
					break;
			}
			break;
		case "Space":
			this.toggleSelection();
			break;
		default:
			console.log(event.key);
			return;
	}

	if (updateSelection)
	{
		selectionDelta.add(this._primarySelection);
		this.select(selectionDelta);
		this._engine.lookAt(this._primarySelection, 250);
	}

	event.preventDefault();
};

SelectionManager.prototype.toggleSelection = function()
{
	emit("select.primary.toggle", [this._primarySelection]);
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
			if (this.getSelectionState() === SECONDARY_SELECTION)
			{
				this.changeSelectionState(PRIMARY_SELECTION);
			}
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
			if (this.getSelectionState() === PRIMARY_SELECTION)
			{
				this.changeSelectionState(SECONDARY_SELECTION);
			}
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

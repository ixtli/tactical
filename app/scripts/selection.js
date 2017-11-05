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
 *
 * @type {number}
 */
const VOLUME_SELECTION_COLOR = 0xff7777;

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
 * An otherwise unrelated selection of tiles.
 * @type {Symbol}
 */
export const DISJOINT_SELECTION = Symbol("DISJOINT_SELECTION");

/**
 *
 * @type {MeshLambertMaterial}
 */
const SELECTION_VOLUME_MATERIAL = new THREE.MeshLambertMaterial({
	color: VOLUME_SELECTION_COLOR, fog: false, transparent: true, opacity: 0.5
});

/**
 *
 * @type {MeshLambertMaterial}
 */
const SECONDARY_SELECTION_BOX_MATERIAL = new THREE.MeshLambertMaterial({
	transparent: true,
	opacity: 0.5,
	color: SECONDARY_SELECTION_BOX_COLOR,
	fog: false
});

/**
 *
 * @type {MeshLambertMaterial}
 */
const PRIMARY_SELECTION_BOX_MATERIAL = new THREE.MeshLambertMaterial({
	transparent: true,
	opacity: 0.5,
	color: PRIMARY_SELECTION_BOX_COLOR,
	fog: false
});

/**
 *
 * @type {MeshLambertMaterial}
 */
const HIGHLIGHT_BOX_MATERIAL = new THREE.MeshLambertMaterial({
	transparent: true, opacity: 0.5, color: HIGHLIGHT_BOX_COLOR, fog: false
});

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
	 * @type {BoxGeometry}
	 * @private
	 */
	this._highlightBoxGeometry =
		new THREE.BoxBufferGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH);

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._primarySelectionBox =
		new THREE.Mesh(this._highlightBoxGeometry, PRIMARY_SELECTION_BOX_MATERIAL);

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._secondarySelectionBox =
		new THREE.Mesh(this._highlightBoxGeometry,
			SECONDARY_SELECTION_BOX_MATERIAL);

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._highlightBox =
		new THREE.Mesh(this._highlightBoxGeometry, HIGHLIGHT_BOX_MATERIAL);

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._selectionVolume =
		new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1),
			SELECTION_VOLUME_MATERIAL);

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
	 * @type {null|Vector2}
	 * @private
	 */
	this._previousDragLocation = null;

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
	this._zoomStepSize = 1;

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._facingModifiers = new THREE.Vector3(1, 1, 1);

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._mouseDownIsRightClick = false;

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._cameraShouldFollowClick = false;

	/**
	 *
	 * @type {{}}
	 */
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
			to: new Set([NO_SELECTION, SECONDARY_SELECTION, DISJOINT_SELECTION])
		}, [SECONDARY_SELECTION]: {
			enter: null,
			leave: null,
			from: new Set([PRIMARY_SELECTION]),
			to: new Set([NO_SELECTION, PRIMARY_SELECTION, DISJOINT_SELECTION])
		}, [DISJOINT_SELECTION]: {
			enter: null,
			leave: null,
			from: new Set([PRIMARY_SELECTION, SECONDARY_SELECTION]),
			to: new Set([NO_SELECTION, PRIMARY_SELECTION, DISJOINT_SELECTION])
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
	this._highlightBox.scale.add(this._offset);
	this._primarySelectionBox.scale.add(this._offset);
	this._secondarySelectionBox.scale.add(this._offset);

	this._primarySelectionBox.visible = false;
	this._secondarySelectionBox.visible = false;

	this._highlightBoxGeometry.attributes.position.setDynamic(false);
	this._selectionVolume.geometry.attributes.position.setDynamic(true);

	this._subscribe();
	this._engine.addObjectToScene(this._selectionVolume);
	this._engine.addObjectToScene(this._primarySelectionBox);
	this._engine.addObjectToScene(this._secondarySelectionBox);
	this._engine.addObjectToScene(this._highlightBox);

	// There's probably a better way to solve this intersection issue
	this._primarySelectionBox.renderOrder = 0.25;
	this._secondarySelectionBox.renderOrder = 0.25;
	this._selectionVolume.renderOrder = 0.75;

	this._updateSelectionVolume();

	this.changeSelectionState(NO_SELECTION);
};

/**
 *
 * @param {boolean?} should
 * @returns {boolean|SelectionManager}
 */
SelectionManager.prototype.cameraShouldFollowClick = function(should)
{
	if (should === undefined)
	{
		return this._cameraShouldFollowClick;
	}

	this._cameraShouldFollowClick = should;
	return this;
};

/**
 *
 * @private
 */
SelectionManager.prototype._updateSelectionVolume = function()
{
	const p = this._primarySelection;
	const s = this._secondarySelection;

	if (!p || !s || p.equals(s))
	{
		this._selectionVolume.visible = false;
		emit("select.volume", [null, 0, 0, 0]);
		return;
	}

	const OFFSET = 0.001;

	const w = Math.abs(p.x - s.x) + TILE_WIDTH + OFFSET;
	const h = Math.abs(p.y - s.y) + TILE_HEIGHT + OFFSET;
	const d = Math.abs(p.z - s.z) + TILE_WIDTH + OFFSET;

	const geo = new THREE.BoxBufferGeometry(w, h, d);
	this._selectionVolume.geometry.attributes.position
		.set(geo.attributes.position.array);
	this._selectionVolume.geometry.attributes.position.needsUpdate = true;
	this._selectionVolume.visible = true;

	this._selectionVolume.position.set(Math.min(p.x, s.x) + (w / 2) -
		((TILE_WIDTH + OFFSET) / 2), Math.min(p.y, s.y) + (h / 2) -
		((TILE_HEIGHT + OFFSET) / 2), Math.min(p.z, s.z) + (d / 2) -
		((TILE_WIDTH + OFFSET) / 2));
	emit("select.volume", [this._selectionVolume.position, w, h, d]);
};

SelectionManager.prototype.destroy = function()
{
	this._unsubscribe();
	this._engine.removeObjectFromScene(this._primarySelectionBox);
	this._engine.removeObjectFromScene(this._highlightBox);
	this._engine.removeObjectFromScene(this._secondarySelectionBox);
	this._engine.removeObjectFromScene(this._selectionVolume);
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
		this._engine.zoom(this._engine._zoomTarget << 1, 250);
	}
	else
	{
		this._engine.zoom(this._engine._zoomTarget >> 1, 250);
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
		if (!this._previousDragLocation)
		{
			this._previousDragLocation = new THREE.Vector2(x, y);
			emit("select.drag.begin", [x, y]);
		}

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
 * @param {boolean} right
 * @private
 */
SelectionManager.prototype._mouseDown = function(x, y, right)
{
	this._mouseDownIsRightClick = right;
	this._mouseDownLocation.set(x, y);
};

/**
 *
 * @param {number} x
 * @param {number} y
 * @private
 */
SelectionManager.prototype._userClicked = function(x, y)
{
	if (this._previousDragLocation)
	{
		this._previousDragLocation = null;
		emit("select.drag.end", [x, y]);
		return;
	}

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
 * @returns {null|Vector3}
 */
SelectionManager.prototype.getCurrentSelectionVector = function()
{
	const state = this.getSelectionState();
	switch (state)
	{
		case NO_SELECTION:
			return null;
		case PRIMARY_SELECTION:
			return this._primarySelection;
		case SECONDARY_SELECTION:
			return this._secondarySelection;
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
	this._updateSelectionVolume();
	emit("select.secondary.tile",
		[this._primarySelection, this._secondarySelection]);

	if (this._cameraShouldFollowClick)
	{
		this._engine.lookAt(vec, 250);
	}
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
	this._updateSelectionVolume();
	emit("select.primary.tile",
		[this._primarySelection, this._secondarySelection]);

	if (this._cameraShouldFollowClick)
	{
		this._engine.lookAt(vec, 250);
	}
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
	this._updateSelectionVolume();
	emit("select.secondary.deselect",
		[this._primarySelection, this._secondarySelection]);
};

SelectionManager.prototype.deselectPrimary = function()
{
	this._primarySelectionBox.visible = false;
	this._primarySelection = null;
	this._updateSelectionVolume();
	emit("select.primary.deselect",
		[this._primarySelection, this._secondarySelection]);
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
		const currentVector = this.getCurrentSelectionVector();
		if (currentVector)
		{
			selectionDelta.add(currentVector);
			this.select(selectionDelta);
		}
	}

	event.preventDefault();
};

SelectionManager.prototype.toggleSelection = function()
{
	emit("select.toggle", [this._primarySelection, this._secondarySelection]);
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
			if (this.getSelectionState() === SECONDARY_SELECTION)
			{
				this.changeSelectionState(PRIMARY_SELECTION);
			}
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
			if (this.getSelectionState() === PRIMARY_SELECTION)
			{
				this.changeSelectionState(SECONDARY_SELECTION);
			}
			break;
		case "Escape":
			this.changeSelectionState(NO_SELECTION);
			break;
		default:
			console.log(event);
			return;
	}
};

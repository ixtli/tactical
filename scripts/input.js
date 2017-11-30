import Engine from "./engine.js"; // jshint ignore:line
import { emit } from "./bus.js";

/**
 *
 * @param {Engine} engine
 * @constructor
 */
export default function InputController(engine) {
	/**
  *
  * @type {Engine}
  * @private
  */
	this._engine = engine;

	/**
  *
  * @type {Element}
  * @private
  */
	this._container = engine.getContainer();

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._onClickFunction = this.onClick.bind(this);

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._mouseMoveFunction = this.onMouseMove.bind(this);

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._mouseUpFunction = this.onMouseUp.bind(this);

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._mouseDownFunction = this.onMouseDown.bind(this);

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._keyDownFunction = this.onKeyDown.bind(this);

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._keyUpFunction = this.onKeyUp.bind(this);

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._keyPressFunction = this.onKeyPress.bind(this);

	/**
  *
  * @type {function(this:InputController)}
  * @private
  */
	this._wheelFunction = this.onWheel.bind(this);

	/**
  *
  * @type {Vector3}
  * @private
  */
	this._primarySelection = new THREE.Vector3();

	/**
  *
  * @type {boolean}
  * @private
  */
	this._mouseDown = false;

	/**
  *
  * @type {boolean}
  * @private
  */
	this._contextMenuBlocked = false;
}

InputController.prototype.init = function () {
	console.info("Initializing input subsystem.");
	this.registerEventHandlers();
	this.blockContextMenu(true);
};

InputController.prototype.destroy = function () {
	this.deRegisterEventHandlers();
};

InputController.prototype.registerEventHandlers = function () {
	const elt = this._engine.getDOMElement();
	elt.tabIndex = 1;

	elt.addEventListener("mousemove", this._mouseMoveFunction);
	elt.addEventListener("mousedown", this._mouseDownFunction);
	elt.addEventListener("mouseup", this._mouseUpFunction);
	elt.addEventListener("click", this._onClickFunction);

	// https://developers.google.com/web/updates/2016/06/passive-event-listeners
	// noinspection JSCheckFunctionSignatures
	elt.addEventListener("wheel", this._wheelFunction, { passive: true });

	elt.addEventListener("keyup", this._keyUpFunction);
	elt.addEventListener("keydown", this._keyDownFunction);
	elt.addEventListener("keypress", this._keyPressFunction);
};

InputController.prototype.deRegisterEventHandlers = function () {
	this._container.removeEventListener("mousemove", this._mouseMoveFunction);
	this._container.removeEventListener("click", this._onClickFunction);
	this._container.removeEventListener("mousedown", this._mouseDownFunction);
	this._container.removeEventListener("mouseup", this._mouseUpFunction);

	// noinspection JSCheckFunctionSignatures
	this._container.removeEventListener("wheel", this._wheelFunction, {
		passive: true
	});
	this._container.removeEventListener("keyup", this._keyUpFunction);
	this._container.removeEventListener("keydown", this._keyDownFunction);
	this._container.removeEventListener("keypress", this._keyPressFunction);

	this.blockContextMenu(false);
};

/**
 *
 * @param {boolean} isBlocked
 */
InputController.prototype.blockContextMenu = function (isBlocked) {
	this._contextMenuBlocked = isBlocked;
	if (isBlocked) {
		this._container.addEventListener("contextmenu", this._onClickFunction);
	} else {
		this._container.removeEventListener("contextmenu", this._onClickFunction);
	}
};

/**
 *
 * @param {WheelEvent} event
 */
InputController.prototype.onWheel = function (event) {
	emit("input.wheel", [event.deltaY]);
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onClick = function (event) {
	const right = event.type === "contextmenu";
	emit("input.click", [event.clientX, event.clientY, right]);
	this._engine.pickAtCoordinates(event.clientX, event.clientY);
	event.preventDefault();
	return false;
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseDown = function (event) {
	const right = event.type === "contextmenu";
	this._mouseDown = true;
	emit("input.mousedown", [event.clientX, event.clientY, right]);
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseUp = function (event) {
	this._mouseDown = false;
	const right = event.type === "contextmenu";
	emit("input.mouseup", [event.clientX, event.clientY, right]);
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseMove = function (event) {
	if (this._mouseDown) {
		emit("input.drag", [event.clientX, event.clientY]);
	} else {
		this._engine.pickAtCoordinates(event.clientX, event.clientY);
	}
};

/**
 *
 * @param {KeyboardEvent} event
 */
InputController.prototype.onKeyPress = function (event) {
	if (event.ctrlKey) {
		const results = emit("input.signal", [event]);
		const len = results.length;
		for (let i = 0; i < len; i++) {
			if (!!results[i]) {
				return;
			}
		}
	}

	emit("input.keypress", [event]);
};

/**
 *
 * @param {KeyboardEvent} event
 */
InputController.prototype.onKeyDown = function (event) {
	emit("input.keydown", [event]);
};

/**
 *
 * @param {KeyboardEvent} event
 */
InputController.prototype.onKeyUp = function (event) {
	emit("input.keyup", [event]);
};
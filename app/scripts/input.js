import Engine from "./engine";
import * as THREE from "../../bower_components/three.js/build/three.module";
import {send} from "./bus";

/**
 *
 * @param {Engine} engine
 * @constructor
 */
export default function InputController(engine)
{
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

	this._wheelFunction = this.onWheel.bind(this);

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._selection = new THREE.Vector3();

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._mouseDown = false;
}

InputController.prototype.init = function()
{
	console.info("Initializing input subsystem.");
	this.registerEventHandlers();
};

InputController.prototype.destroy = function()
{
	this.deRegisterEventHandlers();
};

InputController.prototype.registerEventHandlers = function()
{
	this._container.addEventListener("mousemove", this._mouseMoveFunction);
	this._container.addEventListener("mousedown", this._mouseDownFunction);
	this._container.addEventListener("mouseup", this._mouseUpFunction);
	this._container.addEventListener("click", this._onClickFunction);

	// https://developers.google.com/web/updates/2016/06/passive-event-listeners
	// noinspection JSCheckFunctionSignatures
	this._container.addEventListener("wheel", this._wheelFunction, {
		passive: true});

	window.addEventListener("keyup", this._keyUpFunction);
	window.addEventListener("keydown", this._keyDownFunction);
	window.addEventListener("keypress", this._keyPressFunction);
};

InputController.prototype.deRegisterEventHandlers = function()
{
	this._container.removeEventListener("mousemove", this._mouseMoveFunction);
	this._container.removeEventListener("click", this._onClickFunction);
	this._container.removeEventListener("mousedown", this._mouseDownFunction);
	this._container.removeEventListener("mouseup", this._mouseUpFunction);

	// noinspection JSCheckFunctionSignatures
	this._container.removeEventListener("wheel", this._wheelFunction, {
		passive: true
	});
	window.removeEventListener("keyup", this._keyUpFunction);
	window.removeEventListener("keydown", this._keyDownFunction);
	window.removeEventListener("keypress", this._keyPressFunction);
};

/**
 *
 * @param {WheelEvent} event
 */
InputController.prototype.onWheel = function(event)
{
	send("input.wheel", event.deltaY);
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onClick = function(event)
{
	send("input.click", {x: event.clientX, y: event.clientY});
	this._engine.pickAtCoordinates(event.clientX, event.clientY);
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseDown = function(event)
{
	this._mouseDown = true;
	send("input.mousedown", {x: event.clientX, y: event.clientY});
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseUp = function(event)
{
	this._mouseDown = false;
	send("input.mouseup", {x: event.clientX, y: event.clientY});
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseMove = function(event)
{
	this._engine.pickAtCoordinates(event.clientX, event.clientY);

	if (this._mouseDown)
	{
		send("input.drag", {x: event.clientX, y: event.clientY});
	}
};

/**
 *
 * @param {KeyboardEvent} event
 */
InputController.prototype.onKeyPress = function(event)
{
	// For now we want to respect clicks when navigating with keyboard
	send("input.keypress", event);
};

/**
 *
 * @param {KeyboardEvent} event
 */
InputController.prototype.onKeyDown = function(event)
{
	send("input.keydown", event);
};

/**
 *
 * @param {KeyboardEvent} event
 */
InputController.prototype.onKeyUp = function(event)
{
	send("input.keyup", event);
};


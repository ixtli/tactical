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

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._selection = new THREE.Vector3();
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
	this._container.addEventListener("keydown", this._keyDownFunction);
	this._container.addEventListener("mouseup", this._mouseUpFunction);
	this._container.addEventListener("keyup", this._keyUpFunction);
	this._container.addEventListener("click", this._onClickFunction);
	window.addEventListener("keypress", this._keyPressFunction);
};

InputController.prototype.deRegisterEventHandlers = function()
{
	this._container.removeEventListener("mousemove", this._mouseMoveFunction);
	this._container.removeEventListener("click", this._onClickFunction);
	this._container.removeEventListener("mousedown", this._mouseDownFunction);
	this._container.removeEventListener("keydown", this._keyDownFunction);
	this._container.removeEventListener("mouseup", this._mouseUpFunction);
	this._container.removeEventListener("keyup", this._keyUpFunction);
	window.removeEventListener("keypress", this._keyPressFunction);
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
	send("input.mousedown", {x: event.clientX, y: event.clientY});
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseUp = function(event)
{
	send("input.mouseup", {x: event.clientX, y: event.clientY});
};

/**
 *
 * @param {MouseEvent} event
 */
InputController.prototype.onMouseMove = function(event)
{
	this._engine.pickAtCoordinates(event.clientX, event.clientY);
};

/**
 *
 * @param {KeyboardEvent} event
 */
InputController.prototype.onKeyPress = function(event)
{
	// For now we want to respect clicks when navigating with keyboard
	const responses = send("input.keypress", event.key);
	const len = responses.length;

	for (let i = 0; i < len; i++)
	{
		if (responses[i] === true)
		{
			event.preventDefault();
			return true;
		}
	}

	return false;
};

InputController.prototype.onKeyDown = function(event)
{
	console.log(event);
};

InputController.prototype.onKeyUp = function(event)
{
	console.log(event);
};


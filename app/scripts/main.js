import Engine from "./engine";
import InputController from "./input";
import SelectionManager from "./selection";
import EditorHUD from "./editor_hud";
import HUD from "./hud"; // jshint ignore:line
import {subscribe} from "./bus";
import generateFSM from "./state_machine";

/**
 *
 * @type {Symbol}
 */
export const NO_STATE = Symbol("NO_STATE");

/**
 *
 * @type {Symbol}
 */
export const INIT = Symbol("INIT");

/**
 * Gameplay mode
 * @type {Symbol}
 */
export const GAME = Symbol("GAME");

/**
 * Map editor mode
 * @type {Symbol}
 */
export const EDITOR = Symbol("EDITOR");

/**
 * UI editor mode
 * @type {Symbol}
 */
export const EDITOR_UI = Symbol("EDITOR_UI");

/***
 *
 * @param {Element} container
 * @constructor
 */
export default function TacticalEngine(container)
{
	console.info("Tactical Engine.");

	/**
	 * @type {Element}
	 */
	Object.defineProperty(this, "container", {
		enumerable: false, configurable: false, writable: false, value: container
	});

	/**
	 * @type {Engine}
	 */
	Object.defineProperty(this, "engine", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: new Engine(this.container)
	});

	/**
	 * @type {InputController}
	 */
	Object.defineProperty(this, "inputController", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: new InputController(this.engine)
	});

	/**
	 *
	 * @type {HUD|null}
	 * @private
	 */
	this._currentHUD = null;

	/**
	 *
	 * @type {null|SelectionManager}
	 * @private
	 */
	this._selectionManager = null;

	/**
	 *
	 * @type {Object.<Symbol, StateDesc>}
	 */
	const stateMap = {
		[NO_STATE]: {
			enter: null, leave: null, from: new Set(), to: new Set([INIT])
		}, [INIT]: {
			enter: this._enterInitState,
			leave: null,
			from: new Set([NO_STATE]),
			to: new Set([EDITOR])
		}, [EDITOR]: {
			enter: this._enterEditorState,
			leave: this._leaveEditorState,
			from: new Set([INIT, GAME, EDITOR_UI]),
			to: new Set([GAME, EDITOR_UI]),
		}, [EDITOR_UI]: {
			enter: this._enterEditorUIState,
			leave: this._leaveEditorUIState,
			from: new Set([INIT, GAME, EDITOR]),
			to: new Set([GAME, EDITOR])
		}, [GAME]: {
			enter: this._enterGameState,
			leave: this._leaveGameState,
			from: new Set([INIT, EDITOR, EDITOR_UI]),
			to: new Set([EDITOR, EDITOR_UI])
		}
	};

	/**
	 * @type {Function}
	 */
	Object.defineProperty(this, "changeState", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: generateFSM(this, stateMap, NO_STATE, "TE")
	});
}

/**
 *
 * @private
 */
TacticalEngine.prototype._enterInitState = function()
{
	this.engine.init();
	this.inputController.init();
	subscribe("input.signal", this, this._controlKey);
};

TacticalEngine.prototype._enterEditorUIState = function()
{

};

TacticalEngine.prototype._leaveEditorUIState = function()
{

};

TacticalEngine.prototype._enterGameState = function()
{

};

TacticalEngine.prototype._leaveGameState = function()
{

};

/**
 *
 * @private
 */
TacticalEngine.prototype._leaveEditorState = function()
{
	this._selectionManager.destroy();
	this._selectionManager = null;
	this._currentHUD.destroy();
	this._currentHUD = null;
};

/**
 *
 * @private
 */
TacticalEngine.prototype._enterEditorState = function()
{
	this._selectionManager = new SelectionManager(this.engine);
	this._selectionManager.init();
	this._currentHUD = new EditorHUD();
	this._currentHUD.init();
	this.container.appendChild(this._currentHUD.layer);
};

/**
 *
 * @param {KeyboardEvent} event
 * @private
 */
TacticalEngine.prototype._controlKey = function(event)
{
	switch(event.key)
	{
		case "g":
			this.changeState(GAME);
			break;
		case "e":
			this.changeState(EDITOR);
			break;
		default:
			console.log("Unhandled control sequence:", event.key);
			break;
	}
};

import {subscribe, unsubscribe} from "../bus";
import {stringifySymbol} from "../state_machine";
import WidgetBase from "./base_widget";
import {
	NO_SELECTION, PRIMARY_SELECTION, SECONDARY_SELECTION
} from "../selection";

const SELECTION_STATE = {
	[NO_SELECTION]: {
		text: "none"
	}, [PRIMARY_SELECTION]: {
		text: "primary"
	}, [SECONDARY_SELECTION]: {
		text: "secondary"
	}
};

/**
 *
 * @constructor
 */
export default function StatusLine()
{
	WidgetBase.call(this);

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._engineMode = document.createElement("h1");

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._selectionMode = document.createElement("h1");

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._pathContainer = document.createElement("div");
}

StatusLine.prototype = Object.create(WidgetBase.prototype);

StatusLine.prototype.init = function()
{
	WidgetBase.prototype.init.call(this);

	const symbol = document.createElement("div");
	symbol.innerHTML = "📦";
	symbol.id = "logo";
	this._container.appendChild(symbol);

	this._engineMode.id = "engine-mode";
	this._addPathComponent(this._engineMode);

	this._selectionMode.id = "selection-mode";
	this._addPathComponent(this._selectionMode);

	this._container.appendChild(this._pathContainer);
	this._container.classList.add("status-line");
	subscribe("te.fsm.change", this, this._engineStateChange);
	subscribe("select.fsm.change", this, this._selectionStateChange);
};

StatusLine.prototype.destroy = function()
{
	this._container.classList.remove("status-line");
	unsubscribe("te.fsm.change", this, this._engineStateChange);
	unsubscribe("select.fsm.change", this, this._selectionStateChange);

	WidgetBase.prototype.destroy.call(this);
};

/**
 *
 * @param {Element} elt
 * @private
 */
StatusLine.prototype._addPathComponent = function(elt)
{
	elt.classList.add("path-component");

	const count = this._pathContainer.childNodes.length;

	if (count)
	{
		let sep = document.createElement("p");
		sep.innerHTML = "/";
		this._pathContainer.appendChild(sep);
	}

	this._pathContainer.appendChild(elt);
};

/**
 *
 * @param {Symbol} previous
 * @param {Symbol} current
 * @private
 */
StatusLine.prototype._engineStateChange = function(previous, current)
{
	this._engineMode.innerHTML = stringifySymbol(current).toLowerCase();
};

/**
 *
 * @param {Symbol} previous
 * @param {Symbol} current
 * @private
 */
StatusLine.prototype._selectionStateChange = function(previous, current)
{
	const elt = this._selectionMode;
	if (SELECTION_STATE[previous])
	{
		elt.classList.remove(SELECTION_STATE[previous].text);
	}
	elt.classList.add(SELECTION_STATE[current].text);
	elt.innerHTML =  SELECTION_STATE[current].text;
};

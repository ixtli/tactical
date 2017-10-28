import {subscribe, unsubscribe} from "../bus";
import WidgetBase from "./base_widget";

/**
 *
 * @param {string} name
 * @param {string} event
 * @constructor
 */
export default function ScalarEventWidget(name, event)
{
	WidgetBase.call(this);

	/**
	 *
	 * @type {string}
	 * @private
	 */
	this._name = name;

	/**
	 *
	 * @type {string}
	 * @private
	 */
	this._event = event;

	/**
	 *
	 * @type {Element}
	 * @protected
	 */
	this._display = document.createElement("h1");
}

ScalarEventWidget.prototype = Object.create(WidgetBase.prototype);

ScalarEventWidget.prototype.init = function()
{
	WidgetBase.prototype.init.call(this);

	const v = document.createElement("h2");
	v.innerHTML = this._name;
	this._container.appendChild(v);
	this._container.classList.add("widget-container");
	this._container.appendChild(this._display);
	this._valueChanged();
	subscribe(this._event, this, this._valueChanged);
};

ScalarEventWidget.prototype.destroy = function()
{
	unsubscribe(this._event, this, this._valueChanged);
	WidgetBase.prototype.destroy.call(this);
};

/**
 *
 * @param {*} scalar
 * @private
 */
ScalarEventWidget.prototype._valueChanged = function(scalar)
{
	if (scalar === null || scalar === undefined)
	{
		this._display.innerHTML = "~";
	} else {
		this._display.innerHTML = String(scalar);
	}
};

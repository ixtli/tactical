import {subscribe, unsubscribe} from "../bus";
import WidgetBase from "./base_widget";

export default function PositionWidget()
{
	WidgetBase.call(this);

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._display = document.createElement("h1");
}

PositionWidget.prototype = Object.create(WidgetBase.prototype);

PositionWidget.prototype.init = function()
{
	WidgetBase.prototype.init.call(this);

	const v = document.createElement("h2");
	v.innerHTML = "position";
	this._container.appendChild(v);
	this._display.innerHTML = "0";
	this._container.appendChild(this._display);

	subscribe("engine.pick", this, this._positionChanged);
};

PositionWidget.prototype.destroy = function()
{
	unsubscribe("engine.camera.zoom", this, this._positionChanged);
	WidgetBase.prototype.destroy.call(this);
};

PositionWidget.prototype._positionChanged = function(vec)
{
	if (!vec)
	{
		this._display.innerHTML = "~";
	} else {
		this._display.innerHTML = `${vec.x}, ${vec.y}, ${vec.z}`;
	}
};

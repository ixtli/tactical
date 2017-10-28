import {subscribe, unsubscribe} from "../bus";
import WidgetBase from "./base_widget";

export default function ZoomWidget()
{
	WidgetBase.call(this);

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._display = document.createElement("h1");
}

ZoomWidget.prototype = Object.create(WidgetBase.prototype);

ZoomWidget.prototype.init = function()
{
	WidgetBase.prototype.init.call(this);

	const v = document.createElement("h2");
	v.innerHTML = "zoom";
	this._container.appendChild(v);
	this._container.classList.add("widget-container");
	this._display.innerHTML = "0";
	this._container.appendChild(this._display);
	subscribe("engine.camera.zoom", this, this._zoomChanged);
};

ZoomWidget.prototype.destroy = function()
{
	unsubscribe("engine.camera.zoom", this, this._zoomChanged);
	WidgetBase.prototype.destroy.call(this);
};

/**
 *
 * @param {number} newZoom
 * @private
 */
ZoomWidget.prototype._zoomChanged = function(newZoom)
{
	this._display.innerHTML = String(newZoom);
};

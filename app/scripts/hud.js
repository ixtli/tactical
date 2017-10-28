import {subscribe, unsubscribe} from "./bus";

/**
 *
 * @param {Element} container
 * @constructor
 */
export default function HUD(container)
{
	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._container = container;

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._layer = document.createElement("div");

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._zoomWidget = document.createElement("h1");
}

HUD.prototype.init = function()
{
	const layer = this._layer;
	layer.id = "hud-container";

	const v = document.createElement("h1");

	v.id = "zoom-level";
	v.innerHTML = "0";
	this._zoomWidget = v;

	layer.appendChild(v);
	this._container.appendChild(this._layer);

	subscribe("engine.camera.zoom", this, this._zoomChanged);
};

HUD.prototype.destroy = function()
{
	unsubscribe("engine.camera.zoom", this, this._zoomChanged);
	this._layer.remove();
};

/**
 *
 * @param {number} newZoom
 * @private
 */
HUD.prototype._zoomChanged = function(newZoom)
{
	this._zoomWidget.innerHTML = String(newZoom);
};

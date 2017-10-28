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
};

HUD.prototype.destroy = function()
{
	this._layer.remove();
};

HUD.prototype._zoomChanged = function(newZoom)
{

};
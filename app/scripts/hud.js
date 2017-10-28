import {subscribe, unsubscribe} from "./bus";
import ZoomWidget from "./widgets/zoom_widget";
import PositionWidget from "./widgets/position_widget";

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

	this._widgets = [];
}

HUD.prototype.init = function()
{
	this._widgets.push(new ZoomWidget());
	this._widgets.push(new PositionWidget());

	const layer = this._layer;

	const len = this._widgets.length;
	for (let i = 0; i < len; i++)
	{
		this._widgets[i].init();
		layer.appendChild(this._widgets[i].getContainer());
	}

	layer.id = "hud-container";
	this._container.appendChild(layer);
};

HUD.prototype.destroy = function()
{
	const len = this._widgets.length;
	for (let i = 0; i < len; i++)
	{
		this._widgets[i].destroy();
	}

	this._layer.remove();
};


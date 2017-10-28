import ScalarEventWidget from "./widgets/scalar_event_widget";
import PositionWidget from "./widgets/vec3_event_widget";

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
	this._widgets.push(new ScalarEventWidget("zoom", "engine.camera.zoom"));
	this._widgets.push(new PositionWidget("mouse", "engine.pick"));
	this._widgets.push(new PositionWidget("selection", "selection.tile"));

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


import ScalarEventWidget from "./widgets/scalar_event_widget";
import Vec3EventWidget from "./widgets/vec3_event_widget";
import WidgetBase from "./widgets/base_widget"; // jshint ignore:line
import {EAST, NORTH, SOUTH, WEST} from "./engine";

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
	 * @type {Array.<WidgetBase>}
	 * @private
	 */
	this._widgets = [];
}

HUD.prototype.init = function()
{
	this._widgets.push(new ScalarEventWidget("zoom", "engine.camera.zoom"));
	this._widgets.push(new Vec3EventWidget("mouse", "engine.pick"));
	this._widgets.push(new Vec3EventWidget("selection", "selection.tile"));
	this._widgets.push(new ScalarEventWidget("orbit", "engine.camera.orbit"));
	this._widgets.push(new ScalarEventWidget("facing",
		"engine.camera.facing",
		(d) =>
		{
			switch (d)
			{
				case NORTH:
					return "North";
				case SOUTH:
					return "South";
				case EAST:
					return "East";
				case WEST:
					return "West";
				default:
					return "~";
			}
		}));

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


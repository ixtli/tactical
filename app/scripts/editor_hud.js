import ScalarEventWidget from "./widgets/scalar_event_widget";
import Vec3EventWidget from "./widgets/vec3_event_widget";
import StatusLine from "./widgets/status_line";
import {EAST, NORTH, SOUTH, WEST} from "./engine";
import HUD from "./hud";
import TilePalette from "./widgets/tile_palette";
import WidgetSet from "./widgets/widget_set";

/**
 *
 * @param {Element} container
 * @param {VersionInfo} version
 * @constructor
 */
export default function EditorHUD(container, version)
{
	HUD.call(this, container);

	/**
	 *
	 * @type {StatusLine}
	 * @private
	 */
	this._statusLine = new StatusLine(version);
}

EditorHUD.prototype = Object.create(HUD.prototype);

EditorHUD.prototype.init = function()
{
	const set = new WidgetSet("view-metrics");

	set.init();

	set.add(new ScalarEventWidget("zoom", "engine.camera.zoom"));
	set.add(new Vec3EventWidget("mouse", "engine.pick"));
	set.add(new Vec3EventWidget("selection", "selection.tile"));
	set.add(new ScalarEventWidget("orbit", "engine.camera.orbit"));
	set.add(new ScalarEventWidget("facing", "engine.camera.facing", (d) =>
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

	this._addSet(set);
	this._addWidget(new TilePalette());
	this._addWidget(this._statusLine);

	HUD.prototype.init.call(this);
};

EditorHUD.prototype.destroy = function()
{
	HUD.prototype.destroy.call(this);
};


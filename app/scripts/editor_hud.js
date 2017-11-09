import ScalarEventWidget from "./widgets/scalar_event_widget";
import Vec3EventWidget from "./widgets/vec3_event_widget";
import StatusLine from "./widgets/status_line";
import {EAST, NORTH, SOUTH, WEST} from "./engine";
import HUD from "./hud";
import TilePalette from "./widgets/tile_palette";

/**
 *
 * @constructor
 */
export default function EditorHUD()
{
	HUD.call(this);

	/**
	 *
	 * @type {StatusLine}
	 * @private
	 */
	this._statusLine = new StatusLine();
}

EditorHUD.prototype = Object.create(HUD.prototype);

EditorHUD.prototype.init = function()
{
	this._add(new ScalarEventWidget("zoom", "engine.camera.zoom"));
	this._add(new Vec3EventWidget("mouse", "engine.pick"));
	this._add(new Vec3EventWidget("selection", "selection.tile"));
	this._add(new ScalarEventWidget("orbit", "engine.camera.orbit"));
	this._add(new ScalarEventWidget("facing", "engine.camera.facing", (d) =>
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

	this._add(new TilePalette());

	this._add(this._statusLine);

	HUD.prototype.init.call(this);
};

EditorHUD.prototype.destroy = function()
{
	HUD.prototype.destroy.call(this);
};


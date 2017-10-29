import ScalarEventWidget from "./widgets/scalar_event_widget";
import Vec3EventWidget from "./widgets/vec3_event_widget";
import {EAST, NORTH, SOUTH, WEST} from "./engine";
import HUD from "./hud";

/**
 *
 * @constructor
 */
export default function EditorHUD()
{
	HUD.call(this);
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

	HUD.prototype.init.call(this);
};

EditorHUD.prototype.destroy = function()
{
	HUD.prototype.destroy.call(this);
};


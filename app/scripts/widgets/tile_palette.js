import * as THREE from "../../../bower_components/three.js/build/three.module";
import WidgetBase from "./base_widget";

/**
 *
 * @constructor
 */
export default function TilePalette()
{
	WidgetBase.call(this);

	/**
	 *
	 * @type {WebGLRenderer}
	 * @private
	 */
	this._renderer = new THREE.WebGLRenderer();
}

TilePalette.prototype = Object.create(WidgetBase.prototype);

TilePalette.prototype.init = function()
{
	WidgetBase.prototype.init.call(this);

	this._container.classList.add("tile-palette");
};

TilePalette.prototype.destroy = function()
{
	this._container.classList.remove("tile-palette");

	WidgetBase.prototype.destroy.call(this);
};

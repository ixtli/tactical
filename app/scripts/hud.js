import WidgetBase from "./widgets/base_widget"; // jshint ignore:line

/**
 *
 * @constructor
 */
export default function HUD()
{
	/**
	 * @type {Element}
	 */
	Object.defineProperty(this, "layer", {
		enumerable: false,
		configurable: false,
		writable: false,
		value: document.createElement("div")
	});

	/**
	 *
	 * @type {Array.<WidgetBase>}
	 * @protected
	 */
	this._widgets = [];
}

HUD.prototype.init = function()
{
	const len = this._widgets.length;

	for (let i = 0; i < len; i++)
	{
		this._widgets[i].init();
		this.layer.appendChild(this._widgets[i].getContainer());
	}

	this.layer.id = "hud-container";
};

HUD.prototype.destroy = function()
{
	const len = this._widgets.length;

	for (let i = 0; i < len; i++)
	{
		this._widgets[i].destroy();
	}

	this.layer.remove();
};

/**
 *
 * @param {WidgetBase} widget
 * @protected
 */
HUD.prototype._add = function(widget)
{
	this._widgets.push(widget);
};

import WidgetSet from "./widgets/widget_set"; // jshint ignore:line
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
	 * @type {Set.<WidgetSet>}
	 * @protected
	 */
	this._sets = new Set();

	/**
	 *
	 * @type {Set.<WidgetBase>}
	 * @protected
	 */
	this._widgets = new Set();
}

HUD.prototype.init = function()
{
	for (let s of this._sets)
	{
		s.initializeWidgets();
		this.layer.appendChild(s.layer);
	}

	for (let w of this._widgets)
	{
		w.init();
		this.layer.appendChild(w.getContainer());
	}

	this.layer.id = "hud-container";
};

HUD.prototype.destroy = function()
{
	const len = this._sets.length;

	for (let i = 0; i < len; i++)
	{
		this._sets[i].destroy();
	}

	this.layer.remove();
};

/**
 *
 * @param {WidgetSet} widgetSet
 * @protected
 */
HUD.prototype._addSet = function(widgetSet)
{
	this._sets.add(widgetSet);
};

/**
 *
 * @param {WidgetBase} widget
 * @protected
 */
HUD.prototype._addWidget = function(widget)
{
	console.assert(!this._widgets.has(widget), `${this} already has ${widget}`);
	this._widgets.add(widget);
};

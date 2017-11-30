import WidgetSet from "./widgets/widget_set.js"; // jshint ignore:line
import WidgetBase from "./widgets/base_widget.js"; // jshint ignore:line

/**
 *
 * @param {Element} container
 * @constructor
 */
export default function HUD(container) {
	/**
  *
  * @type {Element}
  * @private
  */
	this._container = container;

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

HUD.prototype.init = function () {
	for (let s of this._sets) {
		s.initializeWidgets();
		this._container.appendChild(s.layer);
	}

	for (let w of this._widgets) {
		w.init();
		this._container.appendChild(w.getContainer());
	}
};

HUD.prototype.destroy = function () {
	for (let s of this._sets) {
		s.destroy();
	}

	for (let w of this._widgets) {
		w.destroy();
	}
};

/**
 *
 * @param {WidgetSet} widgetSet
 * @protected
 */
HUD.prototype._addSet = function (widgetSet) {
	this._sets.add(widgetSet);
};

/**
 *
 * @param {WidgetBase} widget
 * @protected
 */
HUD.prototype._addWidget = function (widget) {
	console.assert(!this._widgets.has(widget), `${this} already has ${widget}`);
	this._widgets.add(widget);
};
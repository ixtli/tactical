import WidgetBase from "./base_widget.js"; // jshint ignore:line

/**
 *
 * @param {string?} name
 * @constructor
 */
export default function WidgetSet(name) {
	/**
  *
  * @type {string}
  * @private
  */
	this._name = name;

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
  * @type {Set.<WidgetBase>}
  */
	Object.defineProperty(this, "widgets", {
		enumerable: false, configurable: false, writable: false, value: new Set()
	});
}

WidgetSet.prototype.init = function () {
	if (this._name) {
		this.layer.id = this._name;
	}

	this.layer.classList.add("widget-set");
};

WidgetSet.prototype.initializeWidgets = function () {
	for (let w of this.widgets) {
		w.init();
	}
};

WidgetSet.prototype.destroy = function () {
	for (let w of this.widgets) {
		w.destroy();
	}

	this.layer.remove();
};

/**
 *
 * @param {WidgetBase} widget
 */
WidgetSet.prototype.add = function (widget) {
	console.assert(!this.widgets.has(widget), `${this} already has ${widget}`);
	this.widgets.add(widget);
	this.layer.appendChild(widget.getContainer());
};
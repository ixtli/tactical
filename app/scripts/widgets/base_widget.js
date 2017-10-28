export default function WidgetBase()
{
	/**
	 *
	 * @type {Element}
	 * @private
	 */
	Object.defineProperty(this, "_container", {
		enumerable: true,
		configurable: false,
		writable: false,
		value: document.createElement("div")
	});
}

WidgetBase.prototype.init = function()
{
	this._container.classList.add("widget-container");
};

WidgetBase.prototype.destroy = function()
{
	this._container.remove();
};

WidgetBase.prototype.getContainer = function()
{
	return this._container;
};

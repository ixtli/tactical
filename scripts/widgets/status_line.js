import { subscribe, unsubscribe } from "../bus.js";
import { stringifySymbol } from "../state_machine.js";
import WidgetBase from "./base_widget.js";
import { DISJOINT_SELECTION, NO_SELECTION, PRIMARY_SELECTION, SECONDARY_SELECTION } from "../selection.js";
import { hideElement, showElement } from "../dom_util.js";

const SELECTION_STATE = {
	[NO_SELECTION]: {
		text: "none", showSelectionDisplay: false
	}, [PRIMARY_SELECTION]: {
		text: "primary", showSelectionDisplay: true
	}, [SECONDARY_SELECTION]: {
		text: "secondary", showSelectionDisplay: true
	}, [DISJOINT_SELECTION]: {
		text: "disjoint", showSelectionDisplay: false
	}
};

/**
 *
 * @param {VersionInfo} version
 * @constructor
 */
export default function StatusLine(version) {
	WidgetBase.call(this);

	/**
  * @type {VersionInfo}
  * @private
  */
	this._version = version;

	/**
  *
  * @type {Element}
  * @private
  */
	this._versionDisplay = document.createElement("h1");

	/**
  *
  * @type {Element}
  * @private
  */
	this._engineMode = document.createElement("h1");

	/**
  *
  * @type {Element}
  * @private
  */
	this._selectionMode = document.createElement("h1");

	/**
  *
  * @type {Element}
  * @private
  */
	this._selectionGroup = document.createElement("div");

	/**
  *
  * @type {Element}
  * @private
  */
	this._selectionGroupSeparator = document.createElement("p");

	/**
  *
  * @type {Element}
  * @private
  */
	this._primarySelectionDisplay = document.createElement("h2");

	/**
  *
  * @type {Element}
  * @private
  */
	this._secondarySelectionDisplay = document.createElement("h2");

	/**
  *
  * @type {Element}
  * @private
  */
	this._pathContainer = document.createElement("div");
}

StatusLine.prototype = Object.create(WidgetBase.prototype);

StatusLine.prototype.init = function () {
	WidgetBase.prototype.init.call(this);

	const symbol = document.createElement("div");
	symbol.innerHTML = "📦";
	symbol.id = "logo";
	this._container.appendChild(symbol);

	this._versionDisplay.id = "version-display";
	if (this._version.buildID === "local") {
		this._versionDisplay.innerHTML = "local";
		this._versionDisplay.classList.add("local");
	} else {
		this._versionDisplay.innerHTML = this._version.hash.slice(0, 7);
	}
	this._container.appendChild(this._versionDisplay);

	this._engineMode.id = "engine-mode";
	this._addPathComponent(this._engineMode);

	this._selectionMode.id = "selection-mode";
	this._addPathComponent(this._selectionMode);

	this._container.appendChild(this._pathContainer);

	this._selectionGroup.id = "selection-display";
	this._primarySelectionDisplay.classList.add("invisible");
	this._selectionGroupSeparator.innerHTML = ":";
	this._primarySelectionDisplay.classList.add("primary-bg");
	this._secondarySelectionDisplay.classList.add("secondary-bg");
	this._selectionGroup.appendChild(this._primarySelectionDisplay);
	this._selectionGroup.appendChild(this._selectionGroupSeparator);
	this._selectionGroup.appendChild(this._secondarySelectionDisplay);
	this._updateSelectionDisplay(null, null);
	this._container.appendChild(this._selectionGroup);

	this._container.classList.add("status-line");
	subscribe("te.fsm.change", this, this._engineStateChange);
	subscribe("select.fsm.change", this, this._selectionStateChange);
	subscribe("select.primary.tile", this, this._primarySelectionChange);
	subscribe("select.secondary.tile", this, this._secondarySelectionChange);
	subscribe("select.primary.deselect", this, this._primarySelectionChange);
	subscribe("select.secondary.deselect", this, this._secondarySelectionChange);
};

StatusLine.prototype.destroy = function () {
	this._container.classList.remove("status-line");
	unsubscribe("te.fsm.change", this, this._engineStateChange);
	unsubscribe("select.fsm.change", this, this._selectionStateChange);
	unsubscribe("select.primary.tile", this, this._primarySelectionChange);
	unsubscribe("select.secondary.tile", this, this._secondarySelectionChange);
	unsubscribe("select.primary.deselect", this, this._primarySelectionChange);
	unsubscribe("select.secondary.deselect", this, this._secondarySelectionChange);

	WidgetBase.prototype.destroy.call(this);
};

/**
 *
 * @param {Element} elt
 * @private
 */
StatusLine.prototype._addPathComponent = function (elt) {
	elt.classList.add("path-component");

	const count = this._pathContainer.childNodes.length;

	if (count) {
		let sep = document.createElement("p");
		sep.innerHTML = "/";
		this._pathContainer.appendChild(sep);
	}

	this._pathContainer.appendChild(elt);
};

/**
 *
 * @param {Symbol} previous
 * @param {Symbol} current
 * @private
 */
StatusLine.prototype._engineStateChange = function (previous, current) {
	this._engineMode.innerHTML = stringifySymbol(current).toLowerCase();
};

/**
 *
 * @param {Symbol} previous
 * @param {Symbol} current
 * @private
 */
StatusLine.prototype._selectionStateChange = function (previous, current) {
	const elt = this._selectionMode;
	if (SELECTION_STATE[previous]) {
		elt.classList.remove(SELECTION_STATE[previous].text);
	}
	const nextState = SELECTION_STATE[current];
	elt.classList.add(nextState.text);
	elt.innerHTML = nextState.text;

	if (nextState.showSelectionDisplay) {
		showElement(this._selectionGroup);
	} else {
		this._updateSelectionDisplay(null, null);
		hideElement(this._selectionGroup);
	}
};

/**
 *
 * @param {Vector3} primary
 * @param {Vector3} secondary
 * @private
 */
StatusLine.prototype._primarySelectionChange = function (primary, secondary) {
	this._updateSelectionDisplay(primary, secondary);
};

/**
 *
 * @param {Vector3} primary
 * @param {Vector3} secondary
 * @private
 */
StatusLine.prototype._secondarySelectionChange = function (primary, secondary) {
	this._updateSelectionDisplay(primary, secondary);
};

/**
 *
 * @param {Vector3} primary
 * @param {Vector3} secondary
 * @private
 */
StatusLine.prototype._updateSelectionDisplay = function (primary, secondary) {
	if (primary) {
		this._primarySelectionDisplay.innerHTML = `${primary.x},${primary.y},${primary.z}`;
		showElement(this._primarySelectionDisplay);
	} else {
		hideElement(this._primarySelectionDisplay);
	}

	if (secondary) {
		this._secondarySelectionDisplay.innerHTML = `${secondary.x},${secondary.y},${secondary.z}`;
		showElement(this._selectionGroupSeparator);
		showElement(this._secondarySelectionDisplay);
	} else {
		hideElement(this._secondarySelectionDisplay);
		hideElement(this._selectionGroupSeparator);
	}
};
import ScalarEventWidget from "./scalar_event_widget.js";

/**
 *
 * @param {string} name
 * @param {string} event
 * @constructor
 */
export default function Vec3EventWidget(event, name) {
  ScalarEventWidget.call(this, event, name);
}

Vec3EventWidget.prototype = Object.create(ScalarEventWidget.prototype);

/**
 *
 * @param {null|THREE.Vector3} vec
 * @private
 */
Vec3EventWidget.prototype._valueChanged = function (vec) {
  if (!vec) {
    this._display.innerHTML = "~";
  } else {
    this._display.innerHTML = `${vec.x}, ${vec.y}, ${vec.z}`;
  }
};
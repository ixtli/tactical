import * as THREE from "../../bower_components/three.js/build/three.module";
import Engine from "./engine";
import {TILE_WIDTH} from "./mapmesh";
import {subscribe, unsubscribe} from "./bus";

/**
 *
 * @param {Engine} graphicsEngine
 * @constructor
 */
export default function SelectionManager(graphicsEngine)
{
	this._engine = graphicsEngine;

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._selection = new THREE.Vector3();

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._offset = new THREE.Vector3(0.5, 0.5, 0.5);

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._selectionBox = new THREE.Mesh();

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._highlightBox = new THREE.Mesh();

	/**
	 *
	 * @type {BoxGeometry}
	 * @private
	 */
	this._highlightBoxGeometry =
		new THREE.BoxGeometry(TILE_WIDTH, TILE_WIDTH, TILE_WIDTH);

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._highlightBoxCenter = this._highlightBoxGeometry.center();

	/**
	 *
	 * @type {function(this:SelectionManager)}
	 * @private
	 */
	this._enginePickCallback = this._engineHasPicked.bind(this);

	/**
	 *
	 * @type {function(this:SelectionManager)}
	 * @private
	 */
	this._clickCallback = this._userClicked.bind(this);

	/**
	 *
	 * @type {function(this:SelectionManager)}
	 * @private
	 */
	this._keyPressCallback = this._gotKey.bind(this);

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._nextPickSelects = false;
}

SelectionManager.prototype.init = function()
{
	this._highlightBox =
		new THREE.Mesh(this._highlightBoxGeometry, new THREE.MeshLambertMaterial({
			transparent: true, opacity: 0.5, color: 0xffff00
		}));
	this._highlightBox.scale.add(this._offset);
	this._selectionBox =
		new THREE.Mesh(this._highlightBoxGeometry, new THREE.MeshLambertMaterial({
			transparent: true, opacity: 0.5, color: 0x2222ff
		}));
	this._selectionBox.scale.add(this._offset);

	this._engine.addObjectToScene(this._selectionBox);
	this._engine.addObjectToScene(this._highlightBox);

	subscribe("engine.pick", this._enginePickCallback);
	subscribe("input.click", this._clickCallback);
	subscribe("input.keypress", this._keyPressCallback);
};

SelectionManager.prototype.destroy = function()
{
	unsubscribe("engine.pick", this._enginePickCallback);
	unsubscribe("input.click", this._clickCallback);
	unsubscribe("input.keypress", this._keyPressCallback);

	this._engine.removeObjectFromScene(this._selectionBox);
	this._engine.removeObjectFromScene(this._highlightBox);
};

/**
 *
 * @param {{x: number, y: number}} evt
 * @private
 */
SelectionManager.prototype._userClicked = function(evt)
{
	this._nextPickSelects = true;
};

/**
 *
 * @param {null|Vector3} vec
 * @private
 */
SelectionManager.prototype._engineHasPicked = function(vec)
{
	if (this._nextPickSelects)
	{

		if (vec)
		{
			this._selectionBox.visible = true;
			this._selection = vec;
			this.selectTile(vec);
			this._engine.LERPCameraNow(vec, 250);
		}
		else
		{
			this._selectionBox.visible = false;
		}

		this._nextPickSelects = false;
	}

	if (!vec)
	{
		this._highlightBox.visible = false;
		return;
	}

	this._highlightBox.visible = true;
	this.highlightTile(vec);
};

/**
 *
 * @param {Vector3} vec
 */
SelectionManager.prototype.selectTile = function(vec)
{
	this._selectionBox.position.copy(vec);
	this._selectionBox.position.multiplyScalar(TILE_WIDTH);

	/**
	 position.add(this._highlightBoxCenter);
	 position.y = 25 + position.y;
	 position.x = position.x - (TILE_WIDTH * this._terrain.width() / 2);
	 position.z = position.z - (TILE_WIDTH * this._terrain.depth() / 2);
	 this._engine.LERPCameraNow(position, 500);
	 */
};

/**
 *
 * @param {Vector3} vec
 */
SelectionManager.prototype.highlightTile = function(vec)
{
	this._highlightBox.position.copy(vec);
	this._highlightBox.position.multiplyScalar(TILE_WIDTH);
};

/**
 *
 * @param {string} key
 * @private
 */
SelectionManager.prototype._gotKey = function(key)
{
	let updateSelection = false;
	switch (key)
	{
		case "q":
			break;
		case "e":
			break;
		case "w":
			this._selection.z++;
			updateSelection = true;
			break;
		case "a":
			this._selection.x++;
			updateSelection = true;
			break;
		case "s":
			this._selection.z--;
			updateSelection = true;
			break;
		case "d":
			this._selection.x--;
			updateSelection = true;
			break;
		case "r":
			this._selection.y++;
			updateSelection = true;
			break;
		case "f":
			this._selection.y--;
			updateSelection = true;
			break;
		default:
			break;
	}

	if (updateSelection)
	{
		this.selectTile(this._selection);
		this._engine.jumpCameraNow(this._selection);
	}
};

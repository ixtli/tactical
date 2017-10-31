import * as THREE from "../../bower_components/three.js/build/three.module";
import generateDebounce from "./debounce";
import TerrainMap from "./map"; // jshint ignore:line
import {TILE_HEIGHT, TILE_WIDTH} from "./mapmesh";
import TWEEN from "./Tween";
import {emit, emitb} from "./bus";

/**
 *
 * @type {Uint8Array}
 */
const PICK_PIXEL_BUFFER = new Uint8Array(4);

export const NORTH = Symbol("north");
export const SOUTH = Symbol("south");
export const EAST = Symbol("east");
export const WEST = Symbol("west");

const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 5000;

/**
 *
 * @param {Element} container
 * @param {{}?} options
 * @constructor
 */
export default function Engine(container, options)
{
	/**
	 *
	 * @type {{}|{antialias: boolean}}
	 * @private
	 */
	this._rendererOptions = options || {antialias: false};

	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._container = container;

	/**
	 *
	 * @type {OrthographicCamera}
	 * @private
	 */
	this._camera =
		new THREE.OrthographicCamera(0,
			0,
			0,
			0,
			CAMERA_NEAR,
			CAMERA_FAR,
			this._rendererOptions);

	/**
	 *
	 * @type {Scene}
	 * @private
	 */
	this._scene = new THREE.Scene();

	/**
	 *
	 * @type {Scene}
	 * @private
	 */
	this._pickingScene = new THREE.Scene();

	/**
	 *
	 * @type {WebGLRenderer}
	 * @private
	 */
	this._renderer = new THREE.WebGLRenderer();

	/**
	 *
	 * @type {Vector2}
	 * @private
	 */
	this._nextPickCoordinates = new THREE.Vector2();

	/**
	 *
	 * @type {function(this:Engine)}
	 * @private
	 */
	this._frameCallback = this._animate.bind(this);

	/**
	 *
	 * @type {function}
	 * @private
	 */
	this._resizeFunction = generateDebounce(this._onWindowResize.bind(this), 500);

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._pickStateDirty = true;

	/**
	 *
	 * @type {null|Vector3}
	 * @private
	 */
	this._lastPick = null;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._aspectRatio = window.innerWidth / window.innerHeight;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._horizontalBackoff = 500;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._verticalBackoff = 250;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._orbitStepSize = 360 / 4;

	/**
	 * This is the current degrees orbited around the current tile the camera is
	 * @type {number}
	 * @private
	 */
	this._cameraOrbitDegrees = 45;

	/**
	 * When the camera is moving, this is the orbit it will eventually end up at
	 * @type {number}
	 * @private
	 */
	this._orbitTarget = this._cameraOrbitDegrees;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._zoom = 4;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._zoomTarget = this._zoom;

	/**
	 *
	 * @type {null|TWEEN.Tween}
	 * @private
	 */
	this._zoomTween = null;

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._lookingAt = new THREE.Vector3();

	/**
	 *
	 * @type {null|TWEEN.Tween}
	 * @private
	 */
	this._orbitTween = null;

	/**
	 *
	 * @type {null|TWEEN.Tween}
	 * @private
	 */
	this._panTween = null;

	/**
	 *
	 * @type {boolean}
	 * @private
	 */
	this._broadcastNextPick = false;

	/**
	 *
	 * @type {Symbol}
	 * @private
	 */
	this._cameraFacingDirection = NORTH;

	/**
	 *
	 * @type {null|TerrainMap}
	 * @private
	 */
	this._currentMap = null;

	/**
	 *
	 * @type {null|Mesh}
	 * @private
	 */
	this._currentMapSceneObject = null;

	/**
	 *
	 * @type {null|Mesh}
	 * @private
	 */
	this._currentMapPickingSceneObject = null;
}

Engine.prototype.init = function()
{
	console.log("Initializing graphics engine.");

	this._setupCamera();
	this._setupScene();
	this._constructRenderer();
	this.registerEventHandlers();
	this._animate(0.0);
};

Engine.prototype.destroy = function()
{
	this.deRegisterEventHandlers();
};

Engine.prototype.registerEventHandlers = function()
{
	window.addEventListener("resize", this._resizeFunction);
};

Engine.prototype.deRegisterEventHandlers = function()
{
	window.removeEventListener("resize", this._resizeFunction);
};

/**
 *
 * @returns {Element}
 */
Engine.prototype.getContainer = function()
{
	return this._container;
};

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {boolean?} force
 */
Engine.prototype.pickAtCoordinates = function(x, y, force)
{
	this._nextPickCoordinates.x = x;
	this._nextPickCoordinates.y = y;
	this._pickStateDirty = true;
	this._broadcastNextPick = this._broadcastNextPick || force;
};

Engine.prototype.getSceneWidth = function()
{
	const w = this._currentMap ? this._currentMap.width() : 1;
	return w * TILE_WIDTH + 50;
};

Engine.prototype.getSceneHeight = function()
{
	const h = this._currentMap ? this._currentMap.height() : 1;
	return h * TILE_HEIGHT + 50;
};

/**
 *
 * @private
 */
Engine.prototype._setupCamera = function()
{
	this._updateCameraFrustum();
	this.lookAt(this._lookingAt, 0);
};

/**
 *
 * @private
 */
Engine.prototype._updateCameraFrustum = function()
{
	const aspect = this._aspectRatio;
	const cam = this._camera;
	const value = this._zoom;
	const frustumSize = Math.max(this.getSceneWidth(), this.getSceneHeight());
	cam.left = frustumSize * aspect / -value;
	cam.right = frustumSize * aspect / value;
	cam.top = frustumSize / value;
	cam.bottom = frustumSize / -value;
	cam.updateProjectionMatrix();
};

/**
 *
 * @private
 */
Engine.prototype._setupScene = function()
{
	this.setBackgroundColor(new THREE.Color(0x8BFFF7));
	this._pickingTexture =
		new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
	this._pickingTexture.stencilBuffer = false;
	this._pickingTexture.texture.minFilter = THREE.LinearFilter;

	this._scene.add(new THREE.AmbientLight(0x555555));
	const light = new THREE.SpotLight(0xffffff, 1.5);
	light.position.set(0, 500, 2000);
	this._scene.add(light);

	/**
	 const gridHelper = new THREE.GridHelper(100, 100, "red", "gray");
	 gridHelper.position.x = -0.5;
	 gridHelper.position.y = -0.5;
	 gridHelper.position.z = -0.5;
	 this._scene.add(gridHelper);

	 const axisHelper = new THREE.AxisHelper(5);
	 this._scene.add(axisHelper);
	 */
};

/**
 *
 * @param {TerrainMap} newMap
 */
Engine.prototype.useMap = function(newMap)
{
	console.assert(newMap, "Can't pass no map to useMap()");

	const pickingMaterial = new THREE.MeshBasicMaterial({
		vertexColors: THREE.VertexColors,
		blending: THREE.NoBlending,
		fog: false,
		lights: false
	});
	const defaultMaterial = new THREE.MeshPhongMaterial({
		color: 0xffffff,
		flatShading: true,
		vertexColors: THREE.VertexColors,
		shininess: 0
	});

	const mapGeom = newMap.getMesh()._geometry;
	const pickingGeom = newMap.getMesh()._pickingGeometry;

	this._currentMapSceneObject = new THREE.Mesh(mapGeom, defaultMaterial);
	this._scene.add(this._currentMapSceneObject);
	this._currentMapPickingSceneObject =
		new THREE.Mesh(pickingGeom, pickingMaterial);
	this._pickingScene.add(this._currentMapPickingSceneObject);

	this._currentMap = newMap;
};

Engine.prototype.unloadCurrentMap = function()
{
	this._scene.remove(this._currentMapSceneObject);
	this._pickingScene.remove(this._currentMapPickingSceneObject);
	this._currentMapSceneObject = null;
	this._currentMapPickingSceneObject = null;
};

/**
 *
 * @param {Mesh} obj
 */
Engine.prototype.addObjectToScene = function(obj)
{
	this._scene.add(obj);
};

/**
 *
 * @param {Mesh} obj
 */
Engine.prototype.removeObjectFromScene = function(obj)
{
	this._scene.remove(obj);
};

/**
 *
 * @private
 */
Engine.prototype._constructRenderer = function()
{
	window.devicePixelRatio = window.devicePixelRatio || 1;
	this._renderer.setPixelRatio(window.devicePixelRatio);
	this._renderer.setSize(window.innerWidth, window.innerHeight);
	this._container.appendChild(this._renderer.domElement);
};

/**
 *
 * @private
 */
Engine.prototype._pick = function()
{
	if (!this._currentMap)
	{
		this._pickStateDirty = false;
		this._broadcastNextPick = false;
		return;
	}

	//render the picking scene off-screen
	this._renderer.render(this._pickingScene, this._camera, this._pickingTexture);
	//create buffer for reading single pixel
	//read the pixel under the mouse from the texture

	this._renderer.readRenderTargetPixels(this._pickingTexture,
		this._nextPickCoordinates.x, this._pickingTexture.height -
																 this._nextPickCoordinates.y,
		1,
		1,
		PICK_PIXEL_BUFFER);

	this._pickStateDirty = false;
	//interpret the pixel as an ID
	let id = ( PICK_PIXEL_BUFFER[0] << 16 ) | ( PICK_PIXEL_BUFFER[1] << 8 ) |
					 ( PICK_PIXEL_BUFFER[2] );

	if (this._broadcastNextPick)
	{
		this._broadcastNextPick = false;
		this._lastPick = id > 0 ? this._currentMap.tileForID(id - 1) : null;
		emit("engine.pick", [this._lastPick]);
		return;
	}

	let lp = this._lastPick;

	if (!id)
	{
		if (lp)
		{
			emit("engine.pick", [null]);
			this._lastPick = null;
		}
		return;
	}

	const picked = this._currentMap.tileForID(id - 1);

	if (lp && picked.equals(lp))
	{
		return;
	}

	this._lastPick = picked;
	emit("engine.pick", [this._lastPick]);
};

/**
 *
 * @private
 */
Engine.prototype._onWindowResize = function()
{
	const width = window.innerWidth;
	const height = window.innerHeight;
	this._aspectRatio = width / height;
	console.debug("Window resize", width, "x", height);
	this._updateCameraFrustum();
	const dpr = this._renderer.getPixelRatio();
	this._renderer.setSize(width * dpr, height * dpr);
	this._pickingTexture.setSize(width * dpr, height * dpr);
};

/**
 *
 * @param {Vector3} target
 * @returns {Vector3}
 */
Engine.prototype.getCameraPosition = function(target)
{
	const pos = new THREE.Vector3();
	const bk = this._horizontalBackoff * TILE_WIDTH;
	const degs = this._cameraOrbitDegrees;
	pos.x = target.x - (bk * Math.cos(THREE.Math.degToRad(degs)));
	pos.z = target.z - (bk * Math.sin(THREE.Math.degToRad(degs)));
	pos.y = target.y + this._verticalBackoff * TILE_WIDTH;
	return pos;
};

/**
 *
 * @param {number} newFactor
 * @param {number} ms
 */
Engine.prototype.zoom = function(newFactor, ms)
{
	let target = this._zoomTarget + newFactor;

	if (target < 2 || target > 32)
	{
		return;
	}

	if (this._zoomTween)
	{
		this._zoomTween.stop();
		this._zoomTween = null;
	}

	emit("engine.camera.zoom", [target]);

	if (ms < 1)
	{
		this._zoom = target;
		this._zoomTarget = target;
		this._updateCameraFrustum();
	}
	else
	{
		this._zoomTarget = target;
		emit("engine.camera.zoom.begin", [ms]);
		this._zoomTween = new TWEEN.Tween(this).to({_zoom: this._zoomTarget}, ms)
			.onUpdate(this._updateCameraFrustum.bind(this))
			.onComplete(emitb("engine.camera.zoom.end", [ms]))
			.start();
	}
};

/**
 *
 * @param {Vector3} delta
 */
Engine.prototype.panCameraRelative = function(delta)
{
	if (this._panTween)
	{
		this._panTween.stop();
		this._panTween = null;
	}

	this._camera.position.add(delta);
};

/**
 *
 * @param {Vector3} target
 * @param {number} ms
 */
Engine.prototype.lookAt = function(target, ms)
{
	const pos = this.getCameraPosition(target);

	if (this._lookingAt !== target)
	{
		this._lookingAt.set(target.x, target.y, target.z);
		emit("engine.camera.move", [this._lookingAt]);
	}

	if (this._panTween)
	{
		this._panTween.stop();
		this._panTween = null;
	}

	if (ms < 1)
	{
		this._camera.position.set(pos.x, pos.y, pos.z);
		this._camera.lookAt(target);
	}
	else
	{
		emit("engine.camera.pan.begin", [ms]);
		this._panTween = new TWEEN.Tween(this._camera.position).to(pos)
			.easing(TWEEN.Easing.Quintic.Out)
			.onComplete(emitb("engine.camera.pan.end", null))
			.start();
	}
};

/**
 *
 * @param {number} ms
 * @param {boolean} reverse
 */
Engine.prototype.orbit = function(ms, reverse)
{
	this._orbitTarget += (reverse ? -1 : 1) * this._orbitStepSize;
	const ot = this._orbitTarget;

	if (this._orbitTween)
	{
		this._orbitTween.stop();
	}

	if (ms < 1)
	{
		this._orbitTarget = ot % 360;
		this._cameraOrbitDegrees = this._orbitTarget;
		this._updateCameraFacingDirection();
		emit("engine.camera.orbit", [this._cameraOrbitDegrees]);
		return;
	}

	const self = this;
	emit("engine.camera.orbit.begin", [ms]);
	this._orbitTween = new TWEEN.Tween(this).to({_cameraOrbitDegrees: ot}, ms)
		.onUpdate(() =>
		{
			self.lookAt(self._lookingAt, 0);
		})
		.onComplete(() =>
		{
			self._orbitTarget = self._orbitTarget % 360;

			if (self._orbitTarget < 0)
			{
				self._orbitTarget = 360 + self._orbitTarget;
			}

			self._cameraOrbitDegrees = self._orbitTarget;
			this._updateCameraFacingDirection();
			emit("engine.camera.orbit.end", [ms]);
			emit("engine.camera.orbit", [self._cameraOrbitDegrees]);
		})
		.easing(TWEEN.Easing.Quintic.Out)
		.start();
};

/**
 *
 * @param {number} timestamp
 * @private
 */
Engine.prototype._animate = function(timestamp)
{
	requestAnimationFrame(this._frameCallback);
	TWEEN.update(timestamp);
	this._render();
};

/**
 *
 * @private
 */
Engine.prototype._render = function()
{
	if (this._pickStateDirty)
	{
		this._pick();
	}
	this._renderer.render(this._scene, this._camera);
};

/**
 *
 * @param {Color} newColor
 */
Engine.prototype.setBackgroundColor = function(newColor)
{
	this._scene.background = newColor;
};

/**
 *
 * @private
 */
Engine.prototype._updateCameraFacingDirection = function()
{
	let old = this._cameraOrbitDegrees;
	switch (Math.floor(this._cameraOrbitDegrees / 45))
	{
		case 0:
		case 1:
			this._cameraFacingDirection = NORTH;
			break;
		case 2:
		case 3:
			this._cameraFacingDirection = EAST;
			break;
		case 4:
		case 5:
			this._cameraFacingDirection = SOUTH;
			break;
		case 6:
		case 7:
			this._cameraFacingDirection = WEST;
			break;
		default:
			throw new Error("No cardinal direction for " + this._cameraOrbitDegrees);
	}

	if (old !== this._cameraFacingDirection)
	{
		emit("engine.camera.facing", [this._cameraFacingDirection]);
	}
};


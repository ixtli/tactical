import * as THREE from "../../bower_components/three.js/build/three.module";
import generateDebounce from "./debounce";
import {TILE_HEIGHT, TILE_WIDTH} from "./map/chunk_mesh";
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
const CAMERA_FAR = 2000;
const SELECT_SIZE = 1000;
const MIN_ZOOM = 4;
const MAX_ZOOM = 32;
const START_ZOOM = 8;

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
		new THREE.OrthographicCamera(0, 0, 0, 0, CAMERA_NEAR, CAMERA_FAR);

	/**
	 *
	 * @type {Number}
	 * @private
	 */
	this._windowWidth = window.innerWidth;

	/**
	 *
	 * @type {Number}
	 * @private
	 */
	this._windowHeight = window.innerHeight;

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
	this._renderer = new THREE.WebGLRenderer(this._rendererOptions);

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
	this._zoom = START_ZOOM;

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
	 * @type {null|Chunk}
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

	/**
	 *
	 * @type {Mesh}
	 * @private
	 */
	this._selectionPlaneMesh =
		new THREE.Mesh(new THREE.PlaneBufferGeometry(SELECT_SIZE, SELECT_SIZE),
			new THREE.MeshBasicMaterial({color: 0x202020, visible: false}));

	/**
	 * If true and mouseover selection fails to hit a tile, try to select an
	 * empty tile where y = 0;
	 * @type {boolean}
	 * @private
	 */
	this._pickFromEmptySpaceAsFallback = true;

	/**
	 *
	 * @type {Raycaster}
	 * @private
	 */
	this._raycaster = new THREE.Raycaster();

	/**
	 *
	 * @type {GridHelper}
	 * @private
	 */
	this._grid = new THREE.GridHelper(10, 10, "red", "gray");

	/**
	 *
	 * @type {null|LineSegments}
	 * @private
	 */
	this._mapBoundingCube = null;

	/**
	 *
	 * @type {AxisHelper}
	 * @private
	 */
	this._axisHelper = new THREE.AxisHelper(10);
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
	const cam = this._camera;

	// Bigger zooms out
	const value = this._zoom * 0.000876; // who knows why
	const w = value * this._windowWidth;
	const h = value * this._windowHeight;
	cam.left = w / -2;
	cam.right = w / 2;
	cam.top = h / 2;
	cam.bottom = h / -2;

	cam.updateProjectionMatrix();
};

/**
 *
 * @param {boolean} visible
 */
Engine.prototype.setAxisHelperVisible = function(visible)
{
	this._axisHelper.visible = visible;
	emit("engine.axishelper.visibility", [visible]);
};

/**
 *
 * @private
 */
Engine.prototype._setupScene = function()
{
	this._selectionPlaneMesh.position.addScalar(TILE_WIDTH / -2);
	this.setBackgroundColor(new THREE.Color(0x8BFFF7));
	this._pickingTexture =
		new THREE.WebGLRenderTarget(this._windowWidth, this._windowHeight);
	this._pickingTexture.stencilBuffer = false;
	this._pickingTexture.texture.minFilter = THREE.LinearFilter;

	this._scene.add(new THREE.AmbientLight(0x555555));
	const light = new THREE.SpotLight(0xffffff, 1.5);
	light.position.set(0, 500, 2000);
	this._scene.add(light);

	this._scene.add(this._axisHelper);
	this.setAxisHelperVisible(true);

	// Rotate so it "lays flat" on the x,z plane and so that the top face
	// is pointing up.
	this._selectionPlaneMesh.rotateX(THREE.Math.degToRad(-90));
	this._scene.add(this._selectionPlaneMesh);
};

/**
 *
 * @param {boolean} visible
 */
Engine.prototype.gridVisible = function(visible)
{
	this._grid.visible = visible;
	emit("engine.grid.visiblility", [visible]);
};

/**
 *
 * @param {boolean} visible
 */
Engine.prototype.mapBoundingCubeVisible = function(visible)
{
	this._mapBoundingCube.visible = visible;
	emit("engine.mapboundingcube.visibility", [visible]);
};

/**
 *
 * @param {Chunk} newMap
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

	this._scene.remove(this._grid);
	const mapSize = Math.max(newMap.width(), newMap.depth());
	this._grid = new THREE.GridHelper(mapSize, mapSize, "red", "gray");
	this._grid.position.x = mapSize / 2 - (TILE_WIDTH / 2);
	this._grid.position.y = TILE_WIDTH / -2;
	this._grid.position.z = mapSize / 2 - (TILE_WIDTH / 2);
	this._scene.add(this._grid);
	this.gridVisible(true);

	const geom = new THREE.BoxBufferGeometry(newMap.width(),
		newMap.height(),
		newMap.depth());
	const edges = new THREE.EdgesGeometry(geom);
	const mat = new THREE.LineBasicMaterial({
		color: 0xffffff, depthWrite: false, lights: false
	});
	this._mapBoundingCube = new THREE.LineSegments(edges, mat);
	this._mapBoundingCube.position.x = newMap.width() / 2 - (TILE_WIDTH / 2);
	this._mapBoundingCube.position.z = newMap.depth() / 2 - (TILE_WIDTH / 2);
	this._mapBoundingCube.position.y = newMap.height() / 2 - (TILE_HEIGHT / 2);
	this._scene.add(this._mapBoundingCube);
	this.mapBoundingCubeVisible(false);

	this._currentMap = newMap;

	this.resetCamera();
};

Engine.prototype.resetCamera = function()
{
	const map = this._currentMap;
	this.orbitImmediate(45);
	this.lookAt(new THREE.Vector3(Math.floor(map.width() / 2),
		0,
		Math.floor(map.depth() / 2)), 0);
	this.zoom(START_ZOOM, 0);
	emit("engine.camera.reset", []);
};

Engine.prototype.unloadCurrentMap = function()
{
	this._scene.remove(this._currentMapSceneObject);
	this._scene.remove(this._mapBoundingCube);
	this._scene.remove(this._grid);
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
	this._renderer.setSize(this._windowWidth, this._windowHeight);
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

	// Is the mouse pointing at an object in the scene?
	let found = id > 0 ? this._currentMap.tileForID(id - 1) : null;

	if (found)
	{
		// If so, get the index of the tile in the map
		found = this._currentMap.tileForID(id - 1);
	}
	else if (!found && this._pickFromEmptySpaceAsFallback)
	{
		// If not, see what tile it WOULD be pointing at on the x,z plane
		const nn = this._nextPickCoordinates.x / this._windowWidth * 2 - 1;
		const ny = -(this._nextPickCoordinates.y / this._windowHeight) * 2 + 1;
		this._raycaster.setFromCamera(new THREE.Vector2(nn, ny), this._camera);
		let intersects = this._raycaster.intersectObject(this._selectionPlaneMesh);
		if (intersects.length)
		{
			let uv = intersects[0].uv;
			uv.x = Math.floor(uv.x * SELECT_SIZE) - SELECT_SIZE / 2;
			uv.y = Math.floor((1 - uv.y) * SELECT_SIZE) - SELECT_SIZE / 2;
			// noinspection JSSuspiciousNameCombination
			found = new THREE.Vector3(uv.x, 0, uv.y);
		}
	}

	const lp = this._lastPick;

	// If both exist, change only if they're not equal
	// If they dont both exist, change only if one exists and the other doesn't
	const delta = found && lp ? !found.equals(lp) : !!(found || lp);

	if (!delta && !this._broadcastNextPick)
	{
		return;
	}

	this._broadcastNextPick = false;
	emit("engine.pick", [found]);
	this._lastPick = found;
};

/**
 *
 * @private
 */
Engine.prototype._onWindowResize = function()
{
	const width = this._windowWidth = window.innerWidth;
	const height = this._windowHeight = window.innerHeight;
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
	pos.y = target.y + this._verticalBackoff * TILE_HEIGHT;
	return pos;
};

/**
 *
 * @param {number} newFactor
 * @param {number} ms
 */
Engine.prototype.zoom = function(newFactor, ms)
{
	const target = newFactor;

	if (target < MIN_ZOOM || target > MAX_ZOOM)
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
 * @param {number} target
 */
Engine.prototype.orbitImmediate = function(target)
{
	if (this._orbitTween)
	{
		this._orbitTween.stop();
	}

	this._orbitTarget = target % 360;
	this._cameraOrbitDegrees = this._orbitTarget;
	this._updateCameraFacingDirection();
	emit("engine.camera.orbit", [this._cameraOrbitDegrees]);
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

/**
 *
 * @returns {null|Chunk}
 */
Engine.prototype.getCurrentMap = function()
{
	return this._currentMap;
};

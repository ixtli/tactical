import * as THREE from "../../bower_components/three.js/build/three.module";
import Stats from "./stats";
import generateDebounce from "./debounce";
import TerrainMap from "./map";
import TerrainMapMesh, {TILE_WIDTH} from "./mapmesh";
import {send} from "./bus";
import TWEEN from "./Tween";

/**
 *
 * @type {Uint8Array}
 */
const PICK_PIXEL_BUFFER = new Uint8Array(4);

/**
 *
 * @param {Element} container
 * @constructor
 */
export default function Engine(container)
{
	/**
	 *
	 * @type {Element}
	 * @private
	 */
	this._container = container;

	this._camera = null;
	this._scene = null;
	this._pickingScene = null;
	this._renderer = null;
	this._stats = null;

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
	this._frameCallback = this.animate.bind(this);

	/**
	 *
	 * @type {function}
	 * @private
	 */
	this._resizeFunction = generateDebounce(this.onWindowResize.bind(this), 500);

	/**
	 *
	 * @type {TerrainMap}
	 * @private
	 */
	this._terrain = new TerrainMap(100, 2, 100);

	/**
	 *
	 * @type {TerrainMapMesh}
	 * @private
	 */
	this._terrainMesh = new TerrainMapMesh(this._terrain);

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
}

Engine.prototype.init = function()
{
	console.log("Initializing graphics engine.");

	this._terrain.randomGround(7);
	this._terrainMesh.regenerate();

	this.setupCamera();
	this.setupScene();
	this.constructGeometry();
	this.constructRenderer();
	//this.constructGUI();

	this.registerEventHandlers();
};

Engine.prototype.destroy = function()
{
	this.deRegisterEventHandlers();
	this._terrainMesh.destroy();
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
 */
Engine.prototype.pickAtCoordinates = function(x, y)
{
	this._nextPickCoordinates.x = x;
	this._nextPickCoordinates.y = y;
	this._pickStateDirty = true;
};

Engine.prototype.getSceneWidth = function()
{
	return this._terrain.width() * TILE_WIDTH + 50;
};

Engine.prototype.getSceneHeight = function()
{
	return this._terrain.height() * TILE_WIDTH + 50;
};

Engine.prototype.setupCamera = function()
{
	const near = 0.1;
	const far = 5000;
	this._camera = new THREE.OrthographicCamera(0, 0, 0, 0, near, far);
	this.updateCameraFrustum();
	this.lookAt(this._lookingAt, 0);
};

Engine.prototype.updateCameraFrustum = function()
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

Engine.prototype.constructGUI = function()
{
	const gui = new dat.GUI({resizable: false});
	gui.add(this, "_zoom", 0, 32)
		.onChange(this.updateCameraFrustum.bind(this));
};

Engine.prototype.setupScene = function()
{
	this._scene = new THREE.Scene();
	this.setBackgroundColor(new THREE.Color(0x8BFFF7));
	this._pickingScene = new THREE.Scene();
	this._pickingTexture =
		new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
	this._pickingTexture.stencilBuffer = false;
	this._pickingTexture.texture.minFilter = THREE.LinearFilter;

	this._scene.add(new THREE.AmbientLight(0x555555));
	const light = new THREE.SpotLight(0xffffff, 1.5);
	light.position.set(0, 500, 2000);
	this._scene.add(light);
};

Engine.prototype.addHelpers = function()
{
	const gridHelper = new THREE.GridHelper(100, 100, "red", "gray");
	gridHelper.position.x = -0.5;
	gridHelper.position.y = -0.5;
	gridHelper.position.z = -0.5;
	this._scene.add(gridHelper);

	const axisHelper = new THREE.AxisHelper(5);
	this._scene.add(axisHelper);
};

Engine.prototype.constructGeometry = function()
{
	console.time("Engine::constructGeometry()");
	console.timeStamp("Engine::constructGeometry()");
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

	const mapGeom = this._terrainMesh._geometry;
	const pickingGeom = this._terrainMesh._pickingGeometry;

	const drawnObject = new THREE.Mesh(mapGeom, defaultMaterial);
	this._scene.add(drawnObject);
	this._pickingScene.add(new THREE.Mesh(pickingGeom, pickingMaterial));
	console.timeEnd("Engine::constructGeometry()");
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

Engine.prototype.constructRenderer = function()
{
	const renderer = new THREE.WebGLRenderer({antialias: true});
	window.devicePixelRatio = window.devicePixelRatio || 1;
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	this._container.appendChild(renderer.domElement);
	this._stats = new Stats();
	this._container.appendChild(this._stats.dom);

	this._renderer = renderer;
};

Engine.prototype.pick = function()
{
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

	// Remember to adjust +1 because 0 is no object present
	const position = id > 0 ? this._terrain.vectorForIndex(id - 1) : false;

	this._lastPick = position;
	send("engine.pick", position);
};

Engine.prototype.onWindowResize = function()
{
	const width = window.innerWidth;
	const height = window.innerHeight;
	this._aspectRatio = width / height;
	console.debug("Window resize", width, "x", height);
	this.updateCameraFrustum();
	const dpr = this._renderer.getPixelRatio();
	this._renderer.setSize(width * dpr, height * dpr);
	this._pickingTexture.setSize(width * dpr, height * dpr);
};

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

	send("engine.zoom", this._zoomTarget);

	if (ms < 1)
	{
		this._zoom = target;
		this._zoomTarget = target;
		this.updateCameraFrustum();
	}
	else
	{
		this._zoomTarget = target;
		this._zoomTween = new TWEEN.Tween(this).to({_zoom: this._zoomTarget}, ms)
			.onUpdate(this.updateCameraFrustum.bind(this))
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
		send("engine.camera.move", this._lookingAt);
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
		send("engine.camera.pan.begin", ms);
		this._panTween = new TWEEN.Tween(this._camera.position).to(pos)
			.easing(TWEEN.Easing.Quintic.Out)
			.onComplete(send.bind(send, "engine.camera.pan.end"))
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

	const self = this;
	send("engine.camera.orbit.begin", ot);
	this._orbitTween = new TWEEN.Tween(this).to({_cameraOrbitDegrees: ot}, ms)
		.onUpdate(() =>
		{
			self.lookAt(self._lookingAt, 0);
		})
		.onComplete(() =>
		{
			self._orbitTarget = self._orbitTarget % 360;
			self._cameraOrbitDegrees = self._orbitTarget;
			send("engine.camera.orbit.end", self._orbitTarget);
		})
		.easing(TWEEN.Easing.Quintic.Out)
		.start();
};

/**
 *
 * @param {number} timestamp
 */
Engine.prototype.animate = function(timestamp)
{
	requestAnimationFrame(this._frameCallback);
	TWEEN.update(timestamp);
	this.render();
	this._stats.update();
};

Engine.prototype.render = function()
{
	if (this._pickStateDirty)
	{
		this.pick();
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

import * as THREE from "../../bower_components/three.js/build/three.module";
import TrackballControls from "./trackballcontrols";
import Stats from "./stats";
import generateDebounce from "./debounce";
import TerrainMap from "./map";
import TerrainMapMesh, {TILE_WIDTH} from "./mapmesh";
import {send} from "./bus";

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
	this._controls = null;
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
	this._terrain = new TerrainMap(50, 20, 50);

	/**
	 * @type {Vector3}
	 */
	this._sceneCenter = new THREE.Vector3(25 * TILE_WIDTH, 0, 25 * TILE_WIDTH);

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
	 * @type {number}
	 * @private
	 */
	this._zoom = 4;

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._cameraLERPOrigin = new THREE.Vector3();

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._cameraLERPTarget = new THREE.Vector3();

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._cameraLERPStart = -1;

	/**
	 *
	 * @type {number}
	 * @private
	 */
	this._cameraLERPEnd = -1;

	/**
	 *
	 * @type {null|Vector3}
	 * @private
	 */
	this._lastPick = null;
}

Engine.prototype.init = function()
{
	console.log("Initializing graphics engine.");

	this._terrain.randomGround(7);
	this._terrainMesh.regenerate();

	this.setupCamera();
	//this.setupControls();
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
	const far = 500;
	this._camera = new THREE.OrthographicCamera(0, 0, 0, 0, near, far);
	this.updateCameraFrustum();
	this._camera.position.y = 25;

	this._camera.lookAt(this._sceneCenter);
};

Engine.prototype.updateCameraFrustum = function()
{
	const aspect = window.innerWidth / window.innerHeight;
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
	const cam = this._camera;
	const pos = cam.position;
	const sc = this._sceneCenter;
	const gui = new dat.GUI({resizable: false});
	const redoMVPM = () =>
	{
		cam.lookAt(sc);
		cam.updateProjectionMatrix();
	};
	gui.add(pos, "y", -100, 100).onChange(redoMVPM);
	gui.add(pos, "x", -100, 100).onChange(redoMVPM);
	gui.add(pos, "z", -100, 100).onChange(redoMVPM);
	gui.add(this, "_zoom", 0, 32)
		.onChange(this.updateCameraFrustum.bind(this));
	gui.add(cam, "near", 0.1, 25).onChange(redoMVPM);
	gui.add(cam, "far", 500, 5000).onChange(redoMVPM);
};

Engine.prototype.setupControls = function()
{
	const controls = new TrackballControls(this._camera);
	controls.rotateSpeed = 1.0;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	controls.noZoom = false;
	controls.noPan = false;
	controls.staticMoving = true;
	controls.dynamicDampingFactor = 0.3;
	this._controls = controls;
};

Engine.prototype.setupScene = function()
{
	this._scene = new THREE.Scene();
	this._scene.background = new THREE.Color(0xffffff);
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
	console.debug("Window resize", width, "x", height);
	this.updateCameraFrustum();
	const dpr = this._renderer.getPixelRatio();
	this._renderer.setSize(width * dpr, height * dpr);
	this._pickingTexture.setSize(width * dpr, height * dpr);
};

/**
 *
 * @param {Vector3} target
 * @param {number} ms
 */
Engine.prototype.LERPCameraNow = function(target, ms)
{
	this._cameraLERPOrigin = this._camera.position.clone();
	this._cameraLERPStart = performance.now();
	this._cameraLERPEnd = ms + this._cameraLERPStart;

	// noinspection JSUnresolvedFunction
	const t = target.clone();

	t.y = 25 + t.y;
	t.x = t.x - (TILE_WIDTH * this._terrain.width() / 2);
	t.z = t.z - (TILE_WIDTH * this._terrain.depth() / 2);

	this._cameraLERPTarget = t;
};

/**
 *
 * @param {Vector3} target
 */
Engine.prototype.jumpCameraNow = function(target)
{
	const p = this._camera.position;
	p.y = 25 + target.y;
	p.x = target.x - (TILE_WIDTH * this._terrain.width() / 2);
	p.z = target.z - (TILE_WIDTH * this._terrain.depth() / 2);
};

/**
 *
 * @param {number} timestamp
 */
Engine.prototype.animate = function(timestamp)
{
	requestAnimationFrame(this._frameCallback);

	/**
	 const timer = Date.now() * 0.0001;
	 this._camera.position.x = Math.cos(timer) * 100;
	 this._camera.position.z = Math.sin(timer) * 100;
	 this._camera.lookAt(this._sceneCenter);
	 */
	if (this._cameraLERPStart > 0)
	{
		let len = this._cameraLERPEnd - timestamp;
		if (len < 1)
		{
			this._camera.position.copy(this._cameraLERPTarget);
			this._cameraLERPStart = -1;
			this._cameraLERPEnd = -1;
		}
		else
		{
			let dist = this._cameraLERPEnd - this._cameraLERPStart;
			let total = len / dist;
			this._camera.position.lerpVectors(this._cameraLERPTarget,
				this._cameraLERPOrigin,
				total);
		}
	}

	this.render();
	this._stats.update();
};

Engine.prototype.render = function()
{
	//this._controls.update();

	if (this._pickStateDirty)
	{
		this.pick();
	}
	this._renderer.render(this._scene, this._camera);
};


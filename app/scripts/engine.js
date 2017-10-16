import * as THREE from "../../bower_components/three.js/build/three.module";
import TrackballControls from "./trackballcontrols";
import Stats from "./stats";
import generateDebounce from "./debounce";
import TerrainMap from "./map";
import TerrainMapMesh, {TILE_WIDTH} from "./mapmesh";

const FRUSTUM_SIZE = 1000;

/**
 *
 * @type {Uint8Array}
 */
const PICK_PIXEL_BUFFER = new Uint8Array(4);

/**
 *
 * @param {HTMLDivElement} container
 * @constructor
 */
export default function Engine(container)
{
	/**
	 *
	 * @type {HTMLDivElement}
	 * @private
	 */
	this._container = container;

	this._camera = null;
	this._controls = null;
	this._scene = null;
	this._pickingScene = null;
	this._renderer = null;
	this._stats = null;
	this._highlightBox = null;

	/**
	 *
	 * @type {Vector2}
	 * @private
	 */
	this._mouse = new THREE.Vector2();

	/**
	 *
	 * @type {Vector3}
	 * @private
	 */
	this._offset = new THREE.Vector3(0.25, 0.25, 0.25);

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
	 * @type {function(this:Engine)}
	 * @private
	 */
	this._mouseMoveFunction = this.onMouseMove.bind(this);

	/**
	 *
	 * @type {TerrainMap}
	 * @private
	 */
	this._terrain = new TerrainMap(50, 20, 50);

	/**
	 * @type {Vector3}
	 */
	this._sceneCenter =
		new THREE.Vector3(25 * TILE_WIDTH, 0, 25 * TILE_WIDTH);

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
}

/**
 *
 * @param {MouseEvent} event
 */
Engine.prototype.onMouseMove = function(event)
{
	this._mouse.x = event.clientX;
	this._mouse.y = event.clientY;
	this._pickStateDirty = true;
};

Engine.prototype.init = function()
{
	console.log("Initializing terrain");
	this._terrain.randomGround(3);
	this._terrainMesh.regenerate();

	console.log("Initializing THREE.js");
	this.setupCamera();
	this.setupControls();
	this.setupScene();
	this.constructGeometry();
	this.constructRenderer();

	this.registerEventHandlers();
};

Engine.prototype.destroy = function()
{
	this.deregisterEventHandlers();
	this._terrainMesh.destroy();
};

Engine.prototype.registerEventHandlers = function()
{
	const element = this._renderer.domElement;
	element.addEventListener("mousemove", this._mouseMoveFunction);
	window.addEventListener("resize", this._resizeFunction);
};

Engine.prototype.deregisterEventHandlers = function()
{
	const element = this._renderer.domElement;
	element.removeEventListener("mousemove", this._mouseMoveFunction);
	window.removeEventListener("resize", this._resizeFunction);
};

Engine.prototype.setupCamera = function()
{
	const width = window.innerWidth;
	const height = window.innerHeight;
	const aspect = width / height;
	const left = FRUSTUM_SIZE * aspect / -2;
	const right = FRUSTUM_SIZE * aspect / 2;
	const top = FRUSTUM_SIZE / 2;
	const bottom = FRUSTUM_SIZE / -2;
	const near = 1;
	const far = 3000;
	this._camera =
		new THREE.OrthographicCamera(left, right, top, bottom, near, far);
	this._camera.position.y = TILE_WIDTH * 20;
	this._camera.lookAt(this._sceneCenter);
};

Engine.prototype.lookAt = function(x, y, z)
{
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
		vertexColors: THREE.VertexColors
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
	this._highlightBox =
		new THREE.Mesh(new THREE.BoxGeometry(32, 32, 32),
			new THREE.MeshLambertMaterial({
				transparent: true, opacity: 0.5, color: 0xffff00
			}));
	this._highlightBox.scale.add(this._offset);
	this._scene.add(this._highlightBox);
	console.timeEnd("Engine::constructGeometry()");
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
		this._mouse.x, this._pickingTexture.height - this._mouse.y,
		1,
		1,
		PICK_PIXEL_BUFFER);
	//interpret the pixel as an ID
	let id = ( PICK_PIXEL_BUFFER[0] << 16 ) | ( PICK_PIXEL_BUFFER[1] << 8 ) |
					 ( PICK_PIXEL_BUFFER[2] );

	// Remember to adjust +1 because 0 is no object present
	const position = id > 0 ? this._terrain.vectorForIndex(id - 1) : false;

	if (position)
	{

		position.multiplyScalar(32);
		this._highlightBox.position.copy(position);
		this._highlightBox.visible = true;
	}
	else
	{
		this._highlightBox.visible = false;
	}
};

Engine.prototype.onWindowResize = function()
{
	const width = window.innerWidth;
	const height = window.innerHeight;
	console.debug("Window resize", width, "x", height);
	const aspect = width / height;
	this._camera.left = FRUSTUM_SIZE * aspect / -2;
	this._camera.right = FRUSTUM_SIZE * aspect / 2;
	this._camera.top = FRUSTUM_SIZE / 2;
	this._camera.bottom = FRUSTUM_SIZE / -2;
	this._camera.updateProjectionMatrix();
	const dpr = this._renderer.getPixelRatio();
	this._renderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
};

Engine.prototype.animate = function()
{
	requestAnimationFrame(this._frameCallback);

	var timer = Date.now() * 0.0001;
	this._camera.position.x = Math.cos(timer) * 800;
	this._camera.position.z = Math.sin(timer) * 800;
	this._camera.lookAt(this._sceneCenter);

	this.render();
	this._stats.update();
};

Engine.prototype.render = function()
{
	this._controls.update();
	if (this._pickStateDirty)
	{
		this.pick();
		this._pickStateDirty = false;
	}
	this._renderer.render(this._scene, this._camera);
};


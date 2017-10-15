import * as THREE from '../../bower_components/three.js/build/three.module';
import TrackballControls from './trackballcontrols';
import Stats from './stats';
import generateDebounce from './debounce';
import TerrainMap from './map';

function Engine()
{
	this._container = null;
	this._camera = null;
	this._controls = null;
	this._scene = null;
	this._pickingScene = null;
	this._renderer = null;
	this._stats = null;
	this._highlightBox = null;
	this._pickingData = [];
	this._mouse = new THREE.Vector2();
	this._offset = new THREE.Vector3(2, 2, 2);
	this._frameCallback = this.animate.bind(this);
	this._resizeFunction = generateDebounce(this.onWindowResize.bind(this), 500);

	this._terrain = null;
}

Engine.prototype.onMouseMove = function(event)
{
	this._mouse.x = event.clientX;
	this._mouse.y = event.clientY;
};

Engine.prototype.init = function()
{
	console.log('Initializing terrain');
	this._terrain = new TerrainMap(50, 50, 20);
	this._terrain.regenerateGeometry();

	console.log('Initializing THREE.js');
	this._container = $('#wrapper')[0];
	this.setupCamera();
	this.setupControls();
	this.setupScene();
	this.constructGeometry();
	this.constructRenderer();
};

Engine.prototype.setupCamera = function()
{
	let screenWidth = window.innerWidth;
	let screenHeight = window.innerHeight;

	this._camera =
		new THREE.PerspectiveCamera(70, screenWidth / screenHeight, 1, 50000);
	this._camera.position.z = 10;
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
	console.time('Engine::constructGeometry()');
	console.timeStamp('Engine::constructGeometry()');
	const pickingMaterial = new THREE.MeshBasicMaterial(
		{vertexColors: THREE.VertexColors});
	const defaultMaterial = new THREE.MeshPhongMaterial({
		color: 0xffffff,
		flatShading: true,
		vertexColors: THREE.VertexColors,
		shininess: 0
	});

	const mapGeom = this._terrain._geometry;
	const pickingGeom = this._terrain._pickingGeometry;

	const drawnObject = new THREE.Mesh(mapGeom, defaultMaterial);
	this._scene.add(drawnObject);
	this._pickingScene.add(new THREE.Mesh(pickingGeom, pickingMaterial));
	this._highlightBox = new THREE.Mesh(
		new THREE.BoxGeometry(1, 1, 1),
		new THREE.MeshLambertMaterial({color: 0xffff00}
	));
	this._highlightBox.scale.add(this._offset);
	this._scene.add(this._highlightBox);
	console.timeEnd('Engine::constructGeometry()');
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
	renderer.domElement.addEventListener('mousemove',
		this.onMouseMove.bind(this));

	$(window).resize(this._resizeFunction);

	this._renderer = renderer;
};

Engine.prototype.pick = function()
{
	//render the picking scene off-screen
	this._renderer.render(this._pickingScene, this._camera, this._pickingTexture);
	//create buffer for reading single pixel
	let pixelBuffer = new Uint8Array(4);
	//read the pixel under the mouse from the texture
	this._renderer.readRenderTargetPixels(this._pickingTexture,
		this._mouse.x, this._pickingTexture.height - this._mouse.y, 1, 1,
		pixelBuffer);
	//interpret the pixel as an ID
	let id = ( pixelBuffer[0] << 16 ) | ( pixelBuffer[1] << 8 ) |
					 ( pixelBuffer[2] );
	let position = this._terrain.vectorForIndex(id);
	if (position)
	{
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
	console.debug('Window resize', width, 'x', height);
	this._camera.aspect = width / height;
	this._camera.updateProjectionMatrix();
	let dpr = this._renderer.getPixelRatio();
	this._renderer.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
};

Engine.prototype.animate = function()
{
	requestAnimationFrame(this._frameCallback);
	this.render();
	this._stats.update();
};

Engine.prototype.render = function()
{
	this._controls.update();
	this.pick();
	this._renderer.render(this._scene, this._camera);
};

export default Engine;

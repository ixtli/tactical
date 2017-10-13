import * as THREE from '../../bower_components/three.js/build/three.module';
import TrackballControls from './trackballcontrols';
import Stats from './stats';

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
	this._offset = new THREE.Vector3(10, 10, 10);
	this._frameCallback = this.animate.bind(this);
}

Engine.prototype.onMouseMove = function (event)
{
	this._mouse.x = event.clientX;
	this._mouse.y = event.clientY;
};

Engine.prototype.init = function ()
{
	console.log('Initializing THREE.js');
	this._container = $('#wrapper')[0];
	this.setupCamera();
	this.setupControls();
	this.setupScene();
	this.constructGeometry();
	this.constructRenderer();
};

Engine.prototype.setupCamera = function ()
{
	let screenWidth = window.innerWidth;
	let screenHeight = window.innerHeight;

	this._camera =
		new THREE.PerspectiveCamera(70, screenWidth / screenHeight, 1, 10000);
	this._camera.position.z = 1000;
};

Engine.prototype.setupControls = function ()
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

Engine.prototype.setupScene = function ()
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

Engine.prototype.constructGeometry = function ()
{
	const geometry = new THREE.Geometry(),
		pickingGeometry = new THREE.Geometry(),
		pickingMaterial = new THREE.MeshBasicMaterial(
			{vertexColors: THREE.VertexColors}),
		defaultMaterial = new THREE.MeshPhongMaterial({
			color: 0xffffff,
			flatShading: true,
			vertexColors: THREE.VertexColors,
			shininess: 0
		});

	function applyVertexColors(g, c)
	{
		g.faces.forEach(function (f)
		{
			let n = f instanceof THREE.Face3 ? 3 : 4;
			for (let j = 0; j < n; j++)
			{
				f.vertexColors[j] = c;
			}
		});
	}

	const geom = new THREE.BoxGeometry(1, 1, 1);
	const color = new THREE.Color();
	const matrix = new THREE.Matrix4();
	const quaternion = new THREE.Quaternion();
	for (let i = 0; i < 5000; i++)
	{
		let position = new THREE.Vector3();
		position.x = Math.random() * 10000 - 5000;
		position.y = Math.random() * 6000 - 3000;
		position.z = Math.random() * 8000 - 4000;
		let rotation = new THREE.Euler();
		rotation.x = Math.random() * 2 * Math.PI;
		rotation.y = Math.random() * 2 * Math.PI;
		rotation.z = Math.random() * 2 * Math.PI;
		let scale = new THREE.Vector3();
		scale.x = Math.random() * 200 + 100;
		scale.y = Math.random() * 200 + 100;
		scale.z = Math.random() * 200 + 100;
		quaternion.setFromEuler(rotation, false);
		matrix.compose(position, quaternion, scale);
		// give the geom's vertices a random color, to be displayed
		applyVertexColors(geom, color.setHex(Math.random() * 0xffffff));
		geometry.merge(geom, matrix);
		// give the geom's vertices a color corresponding to the "id"
		applyVertexColors(geom, color.setHex(i));
		pickingGeometry.merge(geom, matrix);
		this._pickingData[i] = {
			position: position,
			rotation: rotation,
			scale: scale
		};
	}
	const drawnObject = new THREE.Mesh(geometry, defaultMaterial);
	this._scene.add(drawnObject);
	this._pickingScene.add(new THREE.Mesh(pickingGeometry, pickingMaterial));
	this._highlightBox = new THREE.Mesh(
		new THREE.BoxGeometry(1, 1, 1),
		new THREE.MeshLambertMaterial({color: 0xffff00}
		));
	this._scene.add(this._highlightBox);
};

Engine.prototype.constructRenderer = function ()
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

	this._renderer = renderer;
};

Engine.prototype.pick = function ()
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
	let data = this._pickingData[id];
	if (data)
	{
		//move our highlightBox so that it surrounds the picked object
		if (data.position && data.rotation && data.scale)
		{
			this._highlightBox.position.copy(data.position);
			this._highlightBox.rotation.copy(data.rotation);
			this._highlightBox.scale.copy(data.scale)
				.add(this._offset);
			this._highlightBox.visible = true;
		}
	}
	else
	{
		this._highlightBox.visible = false;
	}
};

Engine.prototype.animate = function ()
{
	requestAnimationFrame(this._frameCallback);
	this.render();
	this._stats.update();
};

Engine.prototype.render = function ()
{
	this._controls.update();
	this.pick();
	this._renderer.render(this._scene, this._camera);
};

export default Engine;

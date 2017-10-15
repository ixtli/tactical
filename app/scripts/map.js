import * as THREE from '../../bower_components/three.js/build/three.module';

function applyVertexColors(geom, color)
{
	geom.faces.forEach((f) =>
	{
		let n = f instanceof THREE.Face3 ? 3 : 4;
		for (let j = 0; j < n; j++)
		{
			f.vertexColors[j] = color;
		}
	});
}

export default function TerrainMap(w, h, d)
{
	console.assert(w > 0, 'Map width must be positive.');
	console.assert(h > 0, 'Map height must be positive.');
	console.assert(d > 0, 'Map depth must be positive.');
	this._width = w;
	this._height = h;
	this._depth = d;
	this._data = new Uint16Array(w * h * d);
	this._geometry = null;
	this._pickingGeometry = null;
}

TerrainMap.prototype.destroyGeometry = function()
{
	if (this._geometry)
	{
		this._geometry.dispose();
		this._geometry = null;
	}

	if (this._pickingGeometry)
	{
		this._pickingGeometry.dispose();
		this._pickingGeometry = null;
	}
};

TerrainMap.prototype.vectorForIndex = function(idx)
{
	if (idx > this._data.length || !this._data[idx])
	{
		console.error('Could not find tile', idx);
		return null;
	}

	const w = this._width;
	const tilesInPlane = w * this._height;
	const z = Math.floor(idx / tilesInPlane);
	const subIndex = idx % tilesInPlane;
	const x = subIndex % w;
	const y = Math.floor(subIndex / w);
	return new THREE.Vector3(x, y, z);
};

TerrainMap.prototype.regenerateGeometry = function()
{
	const newGeometry = new THREE.Geometry();
	const pickingGeom = new THREE.Geometry();
	const d = this._depth;
	const h = this._height;
	const w = this._width;
	const boxGeom = new THREE.BoxGeometry(1, 1, 1);
	const color = new THREE.Color();
	const matrix = new THREE.Matrix4();
	const quaternion = new THREE.Quaternion();

	const scale = new THREE.Vector3();
	scale.x = 1;
	scale.y = 1;
	scale.z = 1;

	// @TODO: This should guide generation
	this._data = new Uint16Array(w * h * d);

	let currentIndex = 0;

	console.time('TerrainMap::regenerateGeometry()');
	for (let z = 0; z < 2; z++)
	{
		for (let y = 0; y < h; y++)
		{
			for (let x = 0; x < w; x++)
			{
				let position = new THREE.Vector3();
				position.x = x;
				position.y = y;
				position.z = z;
				matrix.compose(position, quaternion, scale);
				// give the geom's vertices a random color, to be displayed
				let c = color.setHSL(0.3, Math.random(), 0.5);
				applyVertexColors(boxGeom, c);
				newGeometry.merge(boxGeom, matrix);

				applyVertexColors(boxGeom, color.setHex(currentIndex));
				pickingGeom.merge(boxGeom, matrix);

				currentIndex++;

				// @TODO: Probably, you know, store something here.
				this._data[z*w*h + y*w + x] = true;
			}
		}
	}
	console.timeEnd('TerrainMap::regenerateGeometry()');
	console.debug('Generated', currentIndex, 'tiles.');

	this._geometry = newGeometry;
	this._pickingGeometry = pickingGeom;
};

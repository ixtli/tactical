import * as THREE from "../../bower_components/three.js/build/three.module";

import TerrainMap from "./map"; // jshint ignore:line

export const TILE_WIDTH = 1;
export const TILE_HEIGHT = 1;

function _applyVertColors(geom, color)
{
	const faces = geom.faces;
	const len = faces.length;
	for (let i = 0; i < len; i++)
	{
		let face = faces[i];
		for (let j = 0; j < 3; j++)
		{
			face.vertexColors[j] = color;
		}
	}
}

/**
 *
 * @param {TerrainMap} mapData
 * @constructor
 */
export default function TerrainMapMesh(mapData)
{
	/**
	 *
	 * @type {BufferGeometry}
	 * @private
	 */
	this._geometry = new THREE.BufferGeometry();

	/**
	 *
	 * @type {BufferGeometry}
	 * @private
	 */
	this._pickingGeometry = new THREE.BufferGeometry();

	/**
	 *
	 * @type {TerrainMap}
	 * @private
	 */
	this._map = mapData;
}

TerrainMapMesh.prototype.init = function()
{

};

TerrainMapMesh.prototype.destroy = function()
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

TerrainMapMesh.prototype.regenerate = function()
{
	console.time("TerrainMap::regenerate()");
	const newGeometry = new THREE.Geometry();
	const pickingGeom = new THREE.Geometry();
	const d = this._map.depth();
	const h = this._map.height();
	const w = this._map.width();
	const boxGeom = new THREE.BoxGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_WIDTH);
	const color = new THREE.Color();
	const matrix = new THREE.Matrix4();
	const quaternion = new THREE.Quaternion();

	const scale = new THREE.Vector3();
	scale.x = 1;
	scale.y = 1;
	scale.z = 1;

	const data = this._map.getData();

	let generated = 0;
	let position = new THREE.Vector3();

	let zOffset = 0;
	let offset = 0;
	for (let z = 0; z < d; z++)
	{
		zOffset = z * w * h;
		for (let y = 0; y < h; y++)
		{
			offset = zOffset + y * w;
			for (let x = 0; x < w; x++)
			{
				let idx = offset + x;
				let datum = data[idx];

				if (datum === 0)
				{
					continue;
				}

				generated++;

				position.x = x * TILE_WIDTH;
				position.y = y * TILE_HEIGHT;
				position.z = z * TILE_WIDTH;
				matrix.compose(position, quaternion, scale);
				// give the geom's vertices a random color, to be displayed
				_applyVertColors(boxGeom, color.setHSL(0.3, Math.random(), 0.5));
				newGeometry.merge(boxGeom, matrix);

				// +1 because zero indicates no object present
				_applyVertColors(boxGeom, color.setHex(idx + 1));
				pickingGeom.merge(boxGeom, matrix);

			}
		}
	}
	newGeometry.mergeVertices();
	pickingGeom.mergeVertices();
	this._geometry.fromGeometry(newGeometry);
	this._pickingGeometry.fromGeometry(pickingGeom);
	this._geometry.computeBoundingSphere();
	this._pickingGeometry.computeBoundingSphere();
	console.timeEnd("TerrainMap::regenerate()");
};


import * as THREE from "../../bower_components/three.js/build/three.module";

import TerrainMap from "./map"; // jshint ignore:line

export const TILE_WIDTH = 1;

function _applyVertColors(geom, color)
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

/**
 *
 * @param {TerrainMap} mapData
 * @constructor
 */
export default function TerrainMapMesh(mapData)
{
	this._geometry = null;
	this._pickingGeometry = null;

	/**
	 *
	 * @type {TerrainMap}
	 * @private
	 */
	this._map = mapData;
}

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
	const newGeometry = new THREE.Geometry();
	const pickingGeom = new THREE.Geometry();
	const d = this._map.depth();
	const h = this._map.height();
	const w = this._map.width();
	const boxGeom = new THREE.BoxGeometry(TILE_WIDTH, TILE_WIDTH, TILE_WIDTH);
	const color = new THREE.Color();
	const matrix = new THREE.Matrix4();
	const quaternion = new THREE.Quaternion();

	const scale = new THREE.Vector3();
	scale.x = 1;
	scale.y = 1;
	scale.z = 1;

	const data = this._map.getData();

	let generated = 0;

	console.time("TerrainMap::regenerateGeometry()");
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

				let position = new THREE.Vector3();
				position.x = x * TILE_WIDTH;
				position.y = y * TILE_WIDTH;
				position.z = z * TILE_WIDTH;
				matrix.compose(position, quaternion, scale);
				// give the geom's vertices a random color, to be displayed
				let c = color.setHSL(0.3, Math.random(), 0.5);
				_applyVertColors(boxGeom, c);
				newGeometry.merge(boxGeom, matrix);

				// +1 because zero indicates no object present
				_applyVertColors(boxGeom, color.setHex(idx + 1));
				pickingGeom.merge(boxGeom, matrix);

			}
		}
	}
	console.timeEnd("TerrainMap::regenerateGeometry()");
	console.debug("Generated", generated, "tiles.");

	this._geometry = newGeometry;
	this._pickingGeometry = pickingGeom;
};


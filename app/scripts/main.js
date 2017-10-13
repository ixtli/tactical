import doAThing from './dummy';
import * as THREE from '../../bower_components/three.js/build/three.module';

$(() =>
{
	console.log('Hello!');

	doAThing();

	let screenWidth = window.innerWidth;
	let screenHeight = window.innerHeight;

	let camera =
		new THREE.PerspectiveCamera(70, screenWidth / screenHeight, 1, 10000);
	console.log(camera);
});


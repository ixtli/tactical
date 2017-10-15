import Engine from './engine';

/***
 *
 * @param {Element} container
 * @constructor
 */
export default function TacticalEngine(container)
{
	console.info('Tactical Engine.');
	this.graphicsEngine = new Engine(container);
	this.graphicsEngine.init();
	this.graphicsEngine.animate();
}

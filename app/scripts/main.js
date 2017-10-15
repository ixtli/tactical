import Engine from './engine';

export default function TacticalEngine()
{
	console.info('Tactical Engine.');
	this.graphicsEngine = new Engine();
	this.graphicsEngine.init();
	this.graphicsEngine.animate();
}

// Bootstrap the engine in a new document.
window.TE = new TacticalEngine();


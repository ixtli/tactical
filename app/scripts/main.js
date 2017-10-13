import Engine from './engine';

$(() =>
{
	console.log('Tactical Engine.');
	const engine = new Engine();
	engine.init();
	engine.animate();
});


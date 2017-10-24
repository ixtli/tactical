import Engine from "./engine";
import InputController from "./input";
import SelectionManager from "./selection";
import HUD from "./hud";


/***
 *
 * @param {Element} container
 * @constructor
 */
export default function TacticalEngine(container)
{
	console.info("Tactical Engine.");
	this.graphicsEngine = new Engine(container);
	this.graphicsEngine.init();
	this.graphicsEngine.animate(0.0);
	this.hud = new HUD(container);
	this.hud.init();
	this.inputController = new InputController(this.graphicsEngine);
	this.inputController.init();
	this.selectionManager = new SelectionManager(this.graphicsEngine);
	this.selectionManager.init();
}

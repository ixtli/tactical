/**
 * @typedef {{enter: Function, leave: Function, from: Set, to: Set}} StateDesc
 */

import {emit} from "./bus";

/**
 *
 * @type {Symbol}
 */
const TRANSITION_STATE = Symbol("TRANSITION_STATE");

/**
 *
 * @param {Symbol} sym
 * @returns {string}
 */
function stringifySymbol(sym)
{
	return String(sym).slice(7, -1);
}

/**
 *
 * @param {Object} context
 * @param {Object.<Symbol, StateDesc>} stateMap
 * @param {Symbol} initial
 * @param {String} name
 * @returns {[Function, Function]}
 */
export default function generateFSM(context, stateMap, initial, name)
{
	let currentState = initial;

	/**
	 *
	 * @param {Symbol} newState
	 * @returns {Object}
	 */
	let ret = (newState) =>
	{
		if (newState === currentState)
		{
			return context;
		}

		const oldState = currentState;
		const tName = stringifySymbol(newState);
		const cName = stringifySymbol(currentState);
		const target = stateMap[newState];
		const current = stateMap[currentState];

		console.assert(current.to.has(newState),
			`${name}: Can't transition from ${cName} to ${tName}`);

		console.assert(target.from.has(currentState),
			`${name}: Can't transition to ${tName} from ${cName}`);

		let ts = `${name}:State:Leave:${cName}`;
		if (current.leave)
		{
			console.time(ts);
			current.leave.call(context, newState);
			console.timeEnd(ts);
		}
		else
		{
			console.debug(ts);
		}

		currentState = TRANSITION_STATE;
		emit(name + "." + cName + ".leave", [oldState]);

		ts = `${name}:State:Enter:${tName}`;
		if (target.enter)
		{
			console.time(ts);
			target.enter.call(context, currentState);
			console.timeEnd(ts);
		}
		else
		{
			console.debug(ts);
		}

		currentState = newState;
		emit(name + "." + tName + ".enter", [currentState]);

		return context;
	};

	return [
		ret, () => currentState ]
	;
}


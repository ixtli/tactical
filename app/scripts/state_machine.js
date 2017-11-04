/**
 * @typedef {{enter: Function, leave: Function, from: Set, to: Set}} StateDesc
 */

import {emit} from "./bus";

/**
 *
 * @type {Symbol}
 */
export const START = Symbol("FSM_START");

/**
 *
 * @type {Symbol}
 */
export const END = Symbol("FSM_END");

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
export function stringifySymbol(sym)
{
	return String(sym).slice(7, -1);
}

/**
 *
 * @param {Object} context
 * @param {Object.<Symbol, StateDesc>} stateMap
 * @param {String} name
 * @param {Symbol?} initial
 * @returns {[Function, Function]}
 */
export default function generateFSM(context, stateMap, name, initial)
{
	let currentState = initial || START;

	/**
	 *
	 * @param {Symbol} newState
	 * @returns {Object}
	 */
	let ret = (newState) =>
	{
		console.assert(currentState !== END, "Attempt to transition from END.");

		console.assert(newState !== START, "Attempt to transition to START.");

		if (newState === currentState)
		{
			return context;
		}

		const oldState = currentState;
		const tName = stringifySymbol(newState);
		const cName = stringifySymbol(currentState);
		const target = newState === END ? null : stateMap[newState];
		const current = currentState === START ? null : stateMap[currentState];

		if (current !== null)
		{
			console.assert(current.to.has(newState),
				`${name}: Can't transition from ${cName} to ${tName}`);
		}

		if (target !== null)
		{
			console.assert(target.from.has(currentState),
				`${name}: Can't transition to ${tName} from ${cName}`);
		}

		let ts = `${name}:State:Leave:${cName}`;
		if (currentState !== START && current.leave)
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
		if (newState !== END && target.enter)
		{
			console.time(ts);
			target.enter.call(context, oldState);
			console.timeEnd(ts);
		}
		else
		{
			console.debug(ts);
		}

		currentState = newState;
		emit(name + "." + tName + ".enter", [currentState]);
		emit(name + ".fsm.change", [oldState, currentState]);

		return context;
	};

	return [
		ret, () => currentState
	];
}


/**
 * @typedef {{enter: Function, leave: Function, from: Set, to: Set}} StateDesc
 */

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
 * @returns {Function}
 */
export default function generateFSM(context, stateMap, initial, name)
{
	let currentState = initial;

	/**
	 *
	 * @param {Symbol} newState
	 * @returns {Object}
	 */
	return (newState) =>
	{
		const tName = stringifySymbol(newState);
		const cName = stringifySymbol(currentState);
		const target = stateMap[newState];
		const current = stateMap[currentState];

		console.assert(current.to.has(newState),
			`${name}: Can't transition from ${cName} to ${tName}`);

		console.assert(target.from.has(currentState),
			`${name}: Can't transition to ${tName} from ${cName}`);

		let ts = `%c${name}:State:Leave:${cName}`;
		if (current.leave)
		{
			console.time(ts, "color: #bada55");
			current.leave.call(context, newState);
			console.timeEnd(ts, "color: #bada55");
		}
		else
		{
			console.debug(ts, "color: #bada55");
		}

		ts = `%c${name}:State:Enter:${tName}`;
		if (target.enter)
		{
			console.time(ts, "color: #bada55");
			target.enter.call(context, currentState);
			console.timeEnd(ts, "color: #bada55");
		}
		else
		{
			console.debug(ts, "color: #bada55");
		}

		currentState = newState;

		return context;
	};
}


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
	let ret = (newState) =>
	{
		if (newState === currentState)
		{
			return context;
		}

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

		return context;
	};

	/**
	 * @type {Function}
	 */
	Object.defineProperty(ret, "getCurrentState", {
		enumerable: false,
		configurable: false,
		writeable: false,
		value: () => { return currentState; }
	});

	return ret;
}


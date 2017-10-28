/**
 *
 * @type {Object.<string, Array.<Object, Function>>}
 */
const registry = {};

/**
 *
 * @param {string|number} name
 * @param {Array.<*>|null} message
 * @returns {Array.<*>}
 */
export function emit(name, message)
{
	const list = registry[name];

	if (!list)
	{
		return [];
	}

	const count = list.length;
	const responses = new Array(count);
	for (let i = 0; i < count; i++)
	{
		let elt = list[i];
		responses[i] = elt[0].apply(elt[1], message || []);
	}

	return responses;
}

/**
 *
 * @param {string|number} name
 * @param {Array.<*>|null} message
 * @returns {function(this:emit)}
 */
export function emitb(name, message)
{
	return emit.bind(emit, name, message);
}

/**
 *
 * @param {string|number} name
 * @param {Object} context
 * @param {Function} callback
 */
export function subscribe(name, context, callback)
{
	console.assert(typeof context === "object", "Invalid context");
	console.assert(typeof callback === "function", "Invalid callback");

	if (!registry[name])
	{
		registry[name] = [];
	}

	const list = registry[name];
	const count = list.length;
	for (let i = 0; i < count; i++)
	{
		let [f, c] = list[i];
		console.assert(!(c === context && f ===
										 callback), "Double subscription to " + name);
	}

	list.push([callback, context]);
}

/**
 *
 * @param {string|number} name
 * @param {Object} context
 * @param {function} fxn
 */
export function unsubscribe(name, context, fxn)
{
	console.assert(registry[name], "Attempt to unsubscribe from unknown " + name);

	const list = registry[name];
	const count = list.length;
	let removed = 0;

	for (let i = count; i >= 0; i--)
	{
		let [f, c] = list[i];

		if (c !== context)
		{
			continue;
		}

		if (fxn && fxn !== f)
		{
			continue;
		}

		list.splice(i, 1);
		removed++;
	}

	if (!removed)
	{
		throw new Error("Unsubscription of unknown callback from " + name);
	}

	if (list.length === 0)
	{
		delete registry[name];
	}
}

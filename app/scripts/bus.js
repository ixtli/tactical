/**
 *
 * @type {Object.<string, Array.<Function>>}
 */
const registry = {};

/**
 *
 * @param {string|number} name
 * @param {*} message
 */
export function send(name, message)
{
	const list = registry[name];

	if (!list)
	{
		return;
	}

	const count = list.length;
	for (let i = 0; i < count; i++)
	{
		list[i](message);
	}
}

/**
 *
 * @param {string|number} name
 * @param {Function} callback
 */
export function subscribe(name, callback)
{
	if (!registry[name])
	{
		registry[name] = [];
	}

	const list = registry[name];
	const count = list.length;
	for (let i = 0; i < count; i++)
	{
		console.assert(list[count] !== callback, "Double subscription to " + name);
	}

	list.push(callback);
}

/**
 *
 * @param {string|number} name
 * @param {Function} callback
 * @returns {Function}
 */
export function unsubscribe(name, callback)
{
	console.assert(registry[name], "Attempt to unsubscribe from unknown " + name);

	const list = registry[name];
	const count = list.length;
	for (let i = 0; i < count; i++)
	{
		if (list[i] !== callback)
		{
			continue;
		}

		const ret = list.splice(i, 1)[0];

		if (list.length === 0)
		{
			delete registry[name];
		}

		return ret;
	}

	throw new Error("Unsubscription of unknown callback from " + name);
}

/**
 *
 * @param {function} fxn
 * @param {number} ms
 * @returns {function}
 */
export default function generateDebounce(fxn, ms)
{
	let timeout = null;
	let lastCall = 0;

	function debounceWrapper()
	{
		timeout = null;
		fxn();
		lastCall = +(new Date());
	}

	return function debounceInvoker()
	{
		if (timeout !== null)
		{
			return;
		}

		const now = +(new Date());

		if (now > lastCall + ms)
		{
			debounceWrapper();
		}
		else
		{
			timeout = setTimeout(debounceWrapper, (lastCall + ms) - now);
		}
	};
}

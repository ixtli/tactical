/**
 * Chrome requires a full path for module names. So you have to have .js at the
 * end of everything. This uses babel to rewrite the module names.
 *
 * @param originalPath The path of the file being included
 * @param callingFileName The file doing the import
 * @returns {string} A new filename
 */
module.exports = function replaceImport(originalPath, callingFileName)
{
	if (originalPath.slice(-3) !== '.js')
	{
		return originalPath += '.js';
	}
};

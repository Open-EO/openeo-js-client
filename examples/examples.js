function makeList(data, level) {
	var items = [];
	var callback = function (val, key) {
		var type = typeof val;
		if (type === "array" || type === "object") {
			val = makeList(val, level ? level+1 : 1);
		}
		if (key && (!isNumeric(key) || level > 0 || type !== 'string')) {
			val = "<em>" + key + "</em>: " + val;
		}
		items.push("<li>" + val + "</li>");
	};
	for (var key in data) {
		callback(data[key], key);
	}
	return "<ul>" + items.join("") + "</ul>";
}
function replaceWithList(id, data) {
	replace(id, makeList(data));
}
function replace(id, content) {
	document.getElementById(id).innerHTML = content;
}
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
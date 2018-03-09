function makeList(data, level) {
	var items = [];
	var callback = function (val, key) {
		var typeOfVal = typeof val;
		if (typeOfVal === "object") {
			val = makeList(val, level ? level+1 : 1);
		}
		if (!this.isNumeric(key) || typeOfVal === 'object') {
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
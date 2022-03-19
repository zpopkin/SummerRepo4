
/* very strange behaviour with IE <= 8 and jQuery. the $ var is undefined when this script is loaded, but the jQuery is there */
if (typeof jQuery != 'undefined' && typeof $ == 'undefined') {
	var $ = jQuery; // fix it
}

(function ($) {
    $.fn.load = function ($val) {
        $(this).on('load', $val);
    };
    $.fn.size = function () {
        return this.length;
    };
    $.fn.unload = function ($val) {
        window.addEventListener("beforeunload", $val);
    };
}(jQuery));

$(document).ready(function () {
	$('[role="tooltip"]').attr('aria-owns', null);
});

$.formdesk = {};

var __loading_start = new Date();

var _FD = window.FD = {
	_trace: true,
	_info: null,
	_routeInfo: null,
	/*setMode: function (mode) { this._mode = (mode == 'backend' ? 0 : 1); },*/
	getMode: function () {
		if (!this._info) this._init();
		return this._info.mode;
	},
	isFrontend: function () { return this.getMode() == 1; },
	isBackend: function () { return this.getMode() == 0; },
	getInfo: function () {
		var doc = (arguments.length > 0 && typeof arguments[0] == 'object' ? arguments[0] : null), info = this._info;
		if (doc || !this._info) info = this._init(doc);
		if (arguments.length > 0 && typeof arguments[0] == 'string') {
			eval('info = this._info.' + arguments[0]);
			return info;
		} else {
			return info;
		}
	},
	getVersion: function () { return this.getInfo().version; },
	getAssets: function () { return this.getInfo().version.assets; },
	getLabel: function () { return this.getInfo().label; },
	getAuth: function () { return this.getInfo().auth; },
	hasRole: function (role) {
		if (role == 'admin') role = 'supervisor';
		var auth = this.getAuth();
		return auth.roles.seek(role);
	},
	_inRouteInfo: false,
	getRouteInfo: function () {

		if (this._inRouteInfo) return new FDUriRoute();
		this._inRouteInfo = true;

		if (!this._routeInfo) {
			var routeInfo = this.getInfo().routeInfo;
			if (!routeInfo) {
				routeInfo = { identifier: "~", route: "" };
			}
			this._routeInfo = new FDUriRoute().setup(routeInfo);
		}

		this._inRouteInfo = false;

		return this._routeInfo;
	},
	getLang: function () { return this.getInfo().lang; },
	setInfo: function (info, doc) {
		doc = doc || document;
		if (String.is(info)) {
			info = jQuery.parseJSON(info);
		}
		if (info && String.is(info.version.assets)) {
			try {
				var all = info.label.id + 'v' + info.version.assets, versions = info.version.assets.split('.');
				info.version.assets = { all: all, js: parseInt(versions[0]), css: parseInt(versions[1]), img: parseInt(versions[2]), lang: parseInt(versions[3]), no: versions[0] + versions[1] + versions[2] };
			} catch (e) { alert('_populate 2: ' + (e.message || e)); }
		}
		if (doc == document) this._info = info;
		//String.log('FD.setInfo, info=' + Object.inspect(info));

		return info;
	},
	_init: function (doc) {
		this._info = { version: { app: '', assets: '0.0.0.0', mode: '' }, mode: 1, lang: 2, label: { id: 0, name: '', path: '', assets: '' }, auth: { type: '', id: '', sidn: ''} };
		try {
			doc = doc || document;
			var meta = doc.getElementsByName('application-info')[0], info = this._info;
			if (!meta) meta = top.document.getElementsByName('application-info')[0];
			if (meta) {
				info = this.setInfo(meta.content);
			} /* else {
				alert('no info');
			}*/
		} catch (e) { alert('_init: ' + (e.message || e) + ', ' + FD._init.caller); }
		return info;
	},

	getContext: function () {
		this.cleanContext();
		var sidn = FDUri.current.queryGet('sidn') || this.getAuth().sidn, prefix = (FD.isFrontend() ? 'frontend' : 'backend'),
			context = FD.Cookie.GetKeys(prefix + '.' + sidn, null, true);
		return context;
	},
	saveContext: function (keys) {
		var sidn = FDUri.current.queryGet('sidn') || this.getAuth().sidn, prefix = (FD.isFrontend() ? 'frontend' : 'backend'); //, context = FD.Cookie.GetKeys('context.' + sidn, null, true);
		keys.set('ts', (new Date()).getTime());

		// Remove the 'old' cookie at the parent domain
		FD.Cookie.Delete(prefix + '.' + sidn, '/' + this.getInfo().domain, FD.Cookie._domain(true));

		FD.Cookie.Set(prefix + '.' + sidn, keys, -1, '/' + this.getInfo().domain, FDUri.current.isSecure());
	},
	removeContext: function () {
		var sidn = FDUri.current.queryGet('sidn') || this.getAuth().sidn, prefix = (FD.isFrontend() ? 'frontend' : 'backend');
		if (sidn) FD.Cookie.Delete(prefix + '.' + sidn, '/' + this.getInfo().domain);
	},
	setOpenSidn: function () {
		var secure = (Boolean.is(arguments[0]) ? arguments[0] : FDUri.isSecure(arguments[0]));
		FD.Cookie.Set('open.sidn', FD.getAuth().sidn, -1, '/' + FD.getInfo().domain, secure || false, true);
		if (String.is(arguments[0])) window.open(arguments[0], '_blank', 'resizable=yes,scrollbars=yes');
	},
	cleanContext: function () {

		//String.log('FD.cleanContext', 'group');

		try {

			var list = FD.Cookie.getAll().filter(/(front|back)end\./), now = (new Date()).getTime(),
				keyList = [],
				period = (3600 * 24) * (list.length < 10 ? 7 : 3),
				domain = this.getInfo().domain,
				remove = false;

			for (var i = list.length - 1; i >= 0; i--) {
				
				keys = new FDKeys(list[i].getValue());
				
				remove = !keys.exists('ts');
				if (!remove) remove = (now - keys.get('ts', 0, 'int')) / 1000 > period; // idle for (60m * 24h) * 7d 

				
				if (remove) {

					//String.log('FD.cleanContext, remove ' + list[i].key + ', idle for ' + ((now - keys.get('ts', 0, 'int')) / 1000) + ' seconds (period=' + period + ')');

					FD.Cookie.Delete(list[i].key, '/' + domain);

					list.remove(i);

				} else {

					list[i].value = keys;

				}

			}

			if (list.length > 20) {

				// sort descending / oldelst first
				list.sort(function (a, b) {
					return a.value.get('ts', 0, 'int') - b.value.get('ts', 0, 'int');
				});

				for (var i = list.length - 1; i > 10; i--) {

					//String.log('FD.cleanContext, extended ' + i + ', remove ' + list[i].key + ', idle for ' + ((now - keys.get('ts', 0, 'int')) / 1000) + ' seconds (period=' + period + ')');

					FD.Cookie.Delete(list[i].key, '/' + domain);

				}

			}

		} catch (e) {
			String.log('FD.cleanContext, error=' + (e.message || e), 'error');
		}

		//String.log('', 'groupEnd');

	},

	Label: {
		getInfo: function (type, extend) {
			var info = FD.getInfo(), retval = this.createInfo({ cdn: info.label.cdn || '', path: info.label.path, version: info.version.assets[type] });
			if (extend) {
				retval = Object.extend(retval, extend);
			}
			return retval;
		},
		getUrl: function (type, file) {
			var info = this.getInfo(type);
			return info.cdn + info.path.append((type == 'img' ? 'images/' : '') + file, '/') + '?v' + info.version;
		},
		getPath: function () { return this.getUrl.apply(this, arguments); },
		createInfo: function (info) {
			// just for future use so that every label info object contains the required propertyes
			return Object.extend({ path: '', version: '' }, info);
		}
	},

	// Debug is overwriten when the fd_debug script is loaded
	Debug: {
		trace: function () { },
		log: function () { },
		deprecated: function () { },
		reportError: function () { }
	},

	defined: function (something) { return typeof something != 'undefined' && something != null; },
	undefined: function (something) { return something == null || typeof something == 'undefined'; },

	isInFrame: function () {
		var inFrame = false;
		try {
			inFrame = window.self !== window.top;
		} catch (e) {
			inFrame = true;
		}
		return inFrame;
	},
	isCtrlKey: function (e) {
		return (e.ctrlKey || (FD.Browser.mac && e.metaKey));
	}

};

/*
if (typeof jQuery != 'undefined') {
	jQuery(document).ready(function () { try { FD._trace = FD.getVersion().mode == 'dev' && FD.Browser.greater('ie', 8, true, true); } catch (e) { }; });
}
*/

function FDBrowser() {
	this.Name = navigator.appName; this.appVersion = navigator.appVersion; this.version = parseInt(this.appVersion);
	var ua = navigator.userAgent, ua_lower = ua.toLowerCase(), match;

	this.win = ua.search('Windows') > 0;
	this.linux = ua.search('Linux') > 0;
	this.mac = /(Macintosh|Mac_)/.test(ua);
	this.WebKit = this.webkit = /AppleWebKit/.test(ua); // ua.indexOf('AppleWebKit') > -1;
	this.bot = /bingbot|googlebot/.test(ua);

	/*
	Some apps use an embedded version of safari (of what it looks like to be).
	But they lack a good global identification string in the useragent.
	E.g. Facebook uses an embedded version of safari. It doesn't say it is safari but it functions identical to safari.
	Chrome also uses AppleWebkit but functions somewhat different. For example, in Chrome a NodeList is an object as in Safari it is a function type.
	*/
	if (this.WebKit && /(AppleWebKit\/)/.test(ua))
		this.version_webkit = this.version = parseFloat(ua.match(/WebKit\/(.*) /)[1]);

	this.ios = this.WebKit && /CPU ([^OS]*)?OS [\d]/.test(ua);
	if (this.ios) this.ios_version = parseFloat(/OS ([\d]+)/.exec(ua)[1]) || 0;

	this.android = /android/i.test(ua);
	if (this.android) {
		if ((match = /Android ([\d]*\.?[\d]*)/.exec(ua))) this.android_version = parseFloat(match[1]) || 0;
	}

	this.mobile = /iphone|ipad|ipod|android|blackbarry|mini|webos|windows\sce|palm/i.test(ua);
	this.tablet = (/android/i.test(ua) && !/mobile/i.test(ua)) || /ipad|playbook/i.test(ua);
	this.phone = this.mobile && !this.tablet;

	if (this.mobile || this.tablet) {
		var classes = [];
		if (this.mobile) classes.push('is-mobile');
		if (this.tablet) classes.push('is-tablet');
		$(document).ready(function () { $('body').addClass(classes.join(' ')); });
	}
	this.opera = ua.search('Opera') >= 0;
	if (this.opera && ua.search('Version/') > 0) {
		this.version = parseFloat(ua.match(/Version\/(.*)/)[1]);
	}
	this.gecko = ua.search('Gecko/') >= 0;
	this.ns = ua.search('Netscape') >= 0;

	this.ie = /MSIE|Trident\//.test(ua); // (this.Name == "Microsoft Internet Explorer");
	for (var i = 5; i < 20; i++) { this['ie' + i] = false; }
	if (this.ie) {
		if (/MSIE/.test(ua)) {
			this.version = parseFloat(ua.match(/MSIE ([\d]*\.?[\d]*)/)[1]); // parseFloat(this.appVersion.match(/MSIE ([\d]*\.?[\d]*)/)[1]);
			this['ie' + ua.match(/MSIE ([\d]*)/)[1]] = true;
		} else { // msie 11 useragent string Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko
			this.version = parseFloat(ua.match(/rv:([\d]*)/)[1]);
			this['ie' + ua.match(/rv:([\d]+)/)[1]] = true;
		}
		//this.inCompatView = this.version < parseFloat(this.appVersion.match(/MSIE ([\d]*\.?[\d]*)/)[1]);
		if (this.version >= 10) document.msCSSOMElementFloatMetrics = true;
		//FD._trace = this.version > 8;
	}
	this.chrome = ua.search('Chrome') > 0;
	if (this.chrome) {
		this.version_chrome = ua.match(/Chrome\/([\d\.]*)/)[1].split('.');
		for (i = 0; i < this.version_chrome.length; i++)
			this.version_chrome[i] = parseFloat(this.version_chrome[i]);
		this.version = this.version_chrome[0];
	}
	this.safari = !this.chrome && this.WebKit; // ua.search('Safari') > 0;
	if (this.safari && ua.search('Version/') > 0) {
		this.version = parseFloat(ua.match(/Version\/(.*)/)[1]);
	}
	
	this.camino = ua.search('Camino') > 0;
	if (this.camino)
		this.version = parseFloat(ua.match(/Camino\/(.*)/)[1]);
	this.firefox = ua.search('Firefox') > 0;
	if (this.firefox)
		this.version = parseFloat(ua.match(/Firefox\/(.*)/)[1]);

	this.W3C = document.getElementById ? true : false;

	this.is = function (browser, version) {
		return (this[browser] && this.version == version);
	}
	this.less = function (browser, version, equal, not) {
		return ((this[browser] && ((!equal && this.version < version) || (equal && this.version <= version))) || (typeof not == 'boolean' && not && !this[browser]));
	}
	this.greater = function (browser, version, equal, not) {
		return ((this[browser] && ((!equal && this.version > version) || (equal && this.version >= version))) || (typeof not == 'boolean' && not && !this[browser]));
	}

	this.isComp = function (lvl) {
		var compatible = 0, loc;
		if (lvl > 0) {
			compatible = ((this.gecko && (!this.ns || this.version >= 7)) || (this.WebKit && this.version_webkit > 534) ? 0 : 1);
			if (compatible == 1 && this.ie) {
				if (this.version < 8 && typeof document.documentMode == 'undefined') compatible = 2; // ie version to old
				else if (document.documentMode < 8) compatible = 3; // ie document mode to low
				else if (this.version < 8) compatible = 4; // ie browser mode below the actual version
				else compatible = 0;
			}
			if (compatible > 0) {
				var box = $('.fdalert,.message-alert'), cnt = 10, intval;
				if (lvl == 1 /* alert and redirect */) {
					var lang = 2;
					try { lang = FD.getInfo().lang; } catch (e) { }

					try {
						if (box.length > 0) {
							box.addClass('multiline');
							box.html(FD.Texts.get('Browser.COMPAT_' + compatible).replace(/\n/g, '<br>').replace(/\r/g, '<br>') + '<div id="redirect" style="text-align:right;color:silver"><a href="#" style="color:silver">' + cnt + '&nbsp;&gt;&gt;</a></div>');
						} else alert(FD.Texts.get('Browser.COMPAT_' + compatible));
					} catch (e) {
						box = null;
						FD.Error.Send('Incompatible Browser! ERROR showing message', document.location.href, 0, 'FDBrowser.isComp', 'compatible=' + compatible + ', documentMode=' + document.documentMode);
						alert(FD.Texts.get('Browser.COMPAT_' + compatible));
					}

					if (compatible == 3) {
						loc = 'https://en.formdesk.com/compatibility-view/';
						switch (lang) {
							case 1: loc = 'https://nl.formdesk.com/compatibiliteitsweergave/'; break;
							case 4: loc = 'https://website.formdesk.com/de/kompatibilitaet/'; break;
						}
					} else if (compatible == 4) {
						loc = 'https://website.formdesk.com/en/delete-browsing-history/';
						switch (lang) {
							case 1: loc = 'https://website.formdesk.com/nl/browsegeschiedenis-verwijderen/'; break;
							/*case 4: loc = 'https://website.formdesk.com/de/kompatibilitaet/'; break;*/ 
						}
					} else {
						loc = 'https://en.formdesk.com';
						switch (lang) {
							case 1: loc = 'https://nl.formdesk.com'; break;
							case 4: loc = 'https://de.formdesk.com'; break;
						}
					}
					if (loc) {
						try {
							if (box && box.length > 0) {
								$('#redirect a').on('click', function () { window.clearInterval(intval); document.location = loc; });
								intval = (function () { cnt--; $('#redirect a').html(cnt + ' >>'); if (cnt <= 0) { window.clearInterval(intval); document.location = loc; } }).interval(1000);
								$('#languages,#login,#blognews').remove();
								box.show();
							} else {
								document.location = loc;
							}
						} catch (e) { document.location = loc; }
					}
				} else if (lvl == 2) {
					FD.Error.Send('Incompatible Browser!', document.location.href, 0, 'FDBrowser.isComp', 'version=' + this.version + ', compatible=' + compatible + ', documentMode=' + document.documentMode);
				} else if (lvl == 3) {
					return compatible;
				}
			}
		}
		return (lvl == 3 ? 0 : compatible == 0);
	}
}
var Browser = FD.Browser = new FDBrowser();


if (/AppleWebKit\//.test(navigator.userAgent)) {
	var $A = function (iterable) {
		if (!iterable) return [];
		if (!(typeof iterable == 'function' && iterable == '[object NodeList]') && iterable.toArray) return iterable.toArray();
		var length = iterable.length || 0, results = new Array(length);
		while (length--) { results[length] = iterable[length]; }
		return results;
	};
} else {
	var $A = function (iterable) {
		if (!iterable) return [];
		if (iterable.toArray) return iterable.toArray();
		var length = iterable.length || 0, results = new Array(length);
		while (length--) results[length] = iterable[length];
		return results;
	};
}

// redefine the decodeURIComponent function to fall back to iso-8859-1 decode when an error occurs decoding with utf-8
(function () {
	var decode = decodeURIComponent;
	decodeURIComponent = function (str) {
		str = str.replace(/\+/g, '%20');
		var dstr = '';
		try { dstr = decode(str); } catch (e) { /* not utf8 encoded, so fall back to iso-8859-1 */ dstr = URLDecode(str); }
		return dstr;
	};
})();

/*--> Extend prototypes and objects
	We don't use the Object.extend or [Object to extend].extend methods because Mootools marks some functions/methods on objects as $protected. Both methods don't overwrite $protected functions.
	Instead we use the basic jQuery $.extend function.
*/
$.extend(Object, {
	DEFAULT: 0,
	PSEUDOTYPE: 1,
	REALTYPE: 2,
	BASETYPE: 3
});

// Mootools Type
Type.extend({
	fromTypeString: function (typeString) {
		typeString = typeString.toLowerCase();
		if (typeString.list('string', 'c')) {
			return String;
		} else if (typeString.list('int', 'integer', 'i', 'float', 'f', 'n', 'number')) {
			return Number;
		} else if (typeString.list('bool', 'boolean', 'l', 'logical')) {
			return Boolean;
		} else if (typeString.list('array', 'a')) {
			return Array;
		} else if (typeString.list('date', 'd', 'datetime', 't')) {
			return Date;
		}
		return null;
	},
	equals: function (object, type) {
		if (String.is(type)) {
			type = Type.fromTypeString(type);
		}
		if (!type) return false;
		return type.is(object);
	}
});

Object.toType = (function toType(global) {
	return function (obj, truetype) {
		if (typeof obj == 'undefined') return 'undefined';
		if (obj === global) {
			return "global";
		} else if (obj && obj.$family) {
			return obj.$family();
		} else if (obj && obj.$$family) {
			return obj.$$family();
		}
		var type = Object.prototype.toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
		return (truetype ? type : (/document|xmldocument|element|event|mouseevent/.test(type) ? 'object' : type));
	}
})(this);
Object.getType = (function toType(global) {
	return function (obj, type) {
		if (typeof obj == 'undefined') return 'undefined';
		if (obj === global) {
			return "global";
		} else if (obj && obj.$family) {
			return obj.$family(type);
		}
		var objectType = Object.prototype.toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
		return (type && type.REALTYPE ? objectType : (/document|xmldocument|element|event|mouseevent/.test(objectType) ? 'object' : objectType));
	}
})(this);
Object.isPlain = function (obj) { // taken from jQuery
	// Must be an Object.
	// Because of IE, we also have to check the presence of the constructor property.
	// Make sure that DOM nodes and window objects don't pass through, as well
	if (!obj || Object.toType(obj) !== "object" || obj.nodeType || obj == obj.window) {
		return false;
	}

	var core_hasOwn = {}.hasOwnProperty;
	try {
		// Not own constructor property must be Object
		if (obj.constructor &&
			!core_hasOwn.call(obj, "constructor") &&
			!core_hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
			return false;
		}
	} catch (e) {
		// IE8,9 Will throw exceptions on certain host objects #9897
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.

	var key;
	for (key in obj) { }

	return key === undefined || core_hasOwn.call(obj, key);
};
var __log = function (log, end) { if (Object.logExtend) console.log(log); return !end; };
Object.extend = function () {
	var start = (arguments.length > 1 ? (typeof arguments[0] != 'boolean' ? 1 : 2) : 0), destination = (start == 0 ? {} : (start == 1 ? arguments[0] : arguments[1])), source, property;
	var own = (start == 2 && arguments[0]), own_source = false, self = Object.extend, is_options = (typeof FDOptions != 'undefined' && FDOptions.is(destination));
	if (!self.count) self.count = 0;
	if (self.count >= 100) {
		//this.count = 0;
		throw "Object.extend, recursive loop detected!";
		return destination;
	}
	self.count++;
	if (this.logExtend) console.group('Object.extend, length=' + arguments.length + ', own=' + own);
	for (var i = start; i < arguments.length; i++) {
		source = arguments[i];
		if (typeof source == 'undefined') continue;
		own_source = source && typeof source.$constructor != 'undefined';
		if (this.logExtend) { console.group('source ' + i + ', own_source=' + own_source); console.log(source); }
		for (property in source) {
			try {
				//if (this.logExtend) console.log('property=' + property);
				if (((own || own_source) && (!source.hasOwnProperty(property) || property.left(1).list('_', '$') || property.list('caller', 'events', 'options', '_guid', '_owner')))) continue;
				if (typeof destination[property] != 'undefined' && destination[property] != null && (destination[property].$protected || destination[property].$locked)) continue;
				else if (destination[property] != null && this.isPlain(destination[property]) && this.isPlain(source[property])) { if (this.logExtend) console.log('object is plain'); this.extend(destination[property], source[property]); }
				else if (typeof destination[property] == 'object' && FDKeys.is(destination[property])) { if (this.logExtend) console.log('merge to FDKeys object'); destination[property].merge(source[property]); }
				else if (source[property] && typeof source[property].clone == 'function' && !(source[property] instanceof jQuery) && !is_options) {
					if (this.logExtend) console.log('clone object');
					destination[property] = source[property].clone();
				} else {
					if (this.logExtend) console.log('set property=' + property);
					destination[property] = source[property];
				}
			} catch (e) { String.log('Object.extend, object=' /*+ Object.inspect(source, null, 2, ['string']) */+ ', property=' + property + ', error=' + (e.message || e)); }
		}
		if (this.logExtend) console.groupEnd();
		if (source) this.extendNatives(destination, source);
	}
	if (this.logExtend) console.groupEnd();
	self.count--;
	return destination;
};
Object.extend.count = 0;
Object.logExtend = false;

if (FD.Browser.less('ie', 9, true)) {
	(function () {
		// in IE <= 9 Object.extend does not extend the toString function automatically
		var hasOwnProperty = Object.prototype.hasOwnProperty;
		Object.extendNatives = function (destination, source) {
			if (hasOwnProperty.call(source, 'toString')) destination.toString = source.toString;
			// maybe more follow
		};
	})();
} else {
	Object.extendNatives = function (destination, source) { return destination; };
}
$.extend(Object, {
	clone: function (source) {
		return Object.extend({}, source);
	},
	inspect: function (obj, list, level, vartypes) {
		var dump = '', prop = '', val;
		if (String.is(list)) list = list.split(',');
		if (!level) level = 0;
		//if (level > 4) return '{level exceeded}';
		try {
			//alert(type);
			for (prop in obj) {
				if ((obj.hasOwnProperty(prop) || prop == '_class') && prop.left(1) != '$' && !prop.list('caller', 'events', 'options', '_guid', '_owner') && (!vartypes || vartypes.seek(typeof (obj[prop]))) && (!list || list.seek(prop))) {
					if (obj[prop] == null) val = 'null';
					else if (String.is(obj[prop])) val = '"' + obj[prop] + '"';
					else if (FDObjects.is(obj[prop])) val = obj[prop].toString(null, level + 1);
					else if (FDKeys.is(obj[prop])) val = obj[prop].toString();
					else if (Function.is(obj[prop])) val = '<function>';
					else if (typeof obj[prop] === 'object' && !Date.is(obj[prop]) && level < 2) val = Object.inspect(obj[prop], list, level + 1, vartypes);
					else val = obj[prop];
					dump = dump.append(prop + ': ' + val, ', ');
				}
			}
		} catch (e) { dump = dump.append("error inspecting property '" + prop + "':" + FD.Error._message(e), '; '); }
		return '{' + dump + '}';
	},
	traverse: function (keys, sep) {
		sep = sep || '.';
		if (!Array.is(keys)) keys = keys.split(sep);
		var field = keys.pop(), len = keys.length, key, obj = this;
		while (len-- && obj) {
			key = keys.shift();
			obj = obj[key];
			//if (!Object.is(obj)) throw "Key '" + key + "' not an object";
		}
		return (obj ? obj[field] : null);
	},
	toString: function (obj, char, suffix) {
		var string = '', val;
		char = char || '&';
		suffix = suffix || '';
		for (var key in obj) {
			val = obj[key];
			if (typeof val == 'object') {
				string = string.append(encodeURIComponent(key + suffix) + '=' + encodeURIComponent(FDKeys.is(val) ? val.toString(false, char, suffix) : (Object.isPlain(val) ? Object.toString(val, char, suffix) : val.toString())), char);
			} else {
				string = string.append(encodeURIComponent(key + suffix) + (typeof val != 'string' || val != '' ? '=' + encodeURIComponent(val) : ''), char); // URLEncode
			}
		}
		return string;
	},
	toXml: function () { // obj, { root, indent }
		var args = $A(arguments), obj = (Object.is(args[0]) ? args.shift() : this), options = $.extend({ root: 'object', indent: 0 }, (Object.is(args[0]) ? args.shift() : {}));
		var indent_str = (options.indent > 0 ? '\t'.times(options.indent) : ''), string = (options.root ? indent_str + '<' + options.root + '>\n' : ''), val;
		for (var key in obj) {
			if (key.left(1).list('_', '$')) continue;
			val = obj[key];
			if (typeof val == 'object') {
				if (val.toXml) string += val.toXml(key, { indent: options.indent + 1 }) + '\n';
				else string += Object.toXml.apply(val, { root: key, indent: options.indent + 1 }) + '\n';
				//string = '\t<' + encodeURIComponent(key) + '>' + encodeURIComponent(FDKeys.is(val) ? val.toXml() : (Object.isPlain(val) ? Object.toXml(val, char, suffix) : val.toString())), char);
			} else {
				string += indent_str + '\t<' + key + '>' + (typeof val != 'string' || val != '' ? String.create(val).xmlencode(true) : '') + '</' + key + '>\n';
			}
		}
		if (options.root) {
			string += indent_str + '</' + options.root + '>';
		} else {
			string = string.substr(0, string.length - 1);
		}
		return string;
	},
	toXmlDom: function (obj, options) { // obj, { parentNode, rootName }

		var doc = (options.parentNode ? options.parentNode.ownerDocument : FD.Ajax.stringToXMLDoc('<' + (options.rootName || 'object') + (this.rootAttributes ? ' ' + this.rootAttributes : '') + ' />')),
			root, node;

		if (options.rootName == null && options.parentNode) root = options.parentNode;
		else {
			if (!options.parentNode) {
				root = doc.documentElement;
			} else {
				root = doc.createElement(options.rootName);
				options.parentNode.appendChild(root);
			}
		}

		for (var key in obj) {
			if (key.left(1).list('_', '$')) continue;
			val = obj[key];
			if (typeof val == 'object') {
				if (val.toXmlDom) {
					val.toXmlDom({ parentNode: root, rootName: key });
				} else {
					Object.toXmlDom(val, { parentNode: root, rootName: key });
				}
			} else {
				node = doc.createElement(key);
				node.innerHTML = (typeof val != 'string' || val != '' ? String.create(val).xmlencode() : '');
				root.appendChild(node);
			}
		}

		return doc;
	},
	toXmlString: function (obj, options) {
		var xmlDoc = Object.toXmlDom(obj, options);
		return FD.Ajax.xmlDocToString(xmlDoc);
	},
	getXmlType: function (val) {
		var type;
		if (val && typeof val.$family != 'undefined') {
			type = val.$family(Object.PSEUDOTYPE); // return a pseudo type when applicable (Formdesk specific, eg: FDDate returns date or datetime)
		} else {
			type = typeof val;
		}
		if (type == 'object') {
			if (String.is(val)) type = 'string';
			else if (Number.is(val)) type = 'number';
			else if (Boolean.is(val)) type = 'boolean';
			else if (Date.is(val)) type = 'date';
			else type = Object.toType(val, true);
		}
		//alert('getXmlType, val=' + val + ', typeof=' + typeof val + ', type=' + type + ', boolean.is=' + Boolean.is(val));
		if (type == 'number') {
			if (parseInt(val) == val) {
				type = 'int';
			} else {
				type = 'float';
			}
		}
		return type;
	},
	compareXmlType: function (val, compareType) {
		var type = this.getXmlType(val);
		if (type == compareType) {
			return true;
		}
		if (type == 'boolean' && compareType == 'bool') return true;
		if (type == 'int' && compareType == 'integer') return true;

		return false;
	},
	toJson: function () { // obj, { root, indent }
		var args = $A(arguments), obj = (Object.is(args[0]) ? args.shift() : this), options = $.extend({ root: 'object', indent: 0 }, (Object.is(args[0]) ? args.shift() : {}));
		var indent_str = (options.indent > 0 ? '\t'.times(options.indent) : ''), string = '', val;
		alert('jep');
		for (var key in obj) {

			if (key.left(1).list('_', '$')) continue;
			val = obj[key];

			string += (string.length > 0 ? ',\n' : '' ) + indent_str + '\t' + JSON.stringify(key) + ': ';

			if (typeof val == 'object') {
				if (val.toJson) string += val.toJson({ root: null, indent: options.indent + 1 });
				else string += Object.toJson.apply(val, { root: '', indent: options.indent + 1 });
			} else {
				string += JSON.stringify(val);
			}

		}

		string =
			(options.root ? JSON.stringify(options.root) + ': {\n' : '{\n') +
			string +
			(string.length > 0 ? '\n' : '') +
			indent_str +
			'}';

		return string;
	},
	fromString: function (str, char) {
		var obj = {}, items = str.split(char || '&'), i, item;
		for (i = 0; i < items.length; i++) {
			item = items[i].split('=');
			obj[decodeURIComponent(item[0])] = (typeof item[1] == 'undefined' || item[1] == 'undefined' ? '' : decodeURIComponent(item[1]));
		}
		return obj;
	},
	parseFloat: function () {
		for (var key in this) {
			if (this.hasOwnProperty(key) && String.is(this[key])) this[key] = parseFloat(this[key]);
		}
	},
	empty: function (obj) {
		var empty = true;
		for (var prop in obj) {
			empty = false; break;
		}
		return empty;
	},
	keys: function (obj) {
		var keys = [];
		if (obj == null) return keys;
		for (var key in obj) {
			keys.push(key);
		}
		return keys;
	},
	keyCount: function (obj) {
		if (obj == null) return 0;
		var count = 0;
		for (var key in obj) {
			count++;
		}
		return count;
	}
});

$.extend(Boolean, {
	create: function (bool) {
		if (String.is(bool)) {
			return bool.trim().toLowerCase().list('true', '.t.', '1', 'yes');
		} else if (Number.is(bool)) {
			return bool > 0;
		} else if (Boolean.is(bool)) {
			return bool;
		}
		return false;
	}
});

$.extend(String, {
	_proper_string: ' \.\-_\+=\(\)\*&\^%\$#@!~\'"\\\|;\:\/\?\.<>,',
	_proper_regexp: null,
	_proper_cache: {},
	_checkproper_regexp: null,
	create: function (str) {
		return (typeof str == 'string' ? str : (str || Number.is(str) || Boolean.is(str) ? new String(str) + '' : ''));
	},
	empty: function (str) {
		return (str == null || typeof str != 'string' || str.empty());
	},
	coalesce: function () {
		for (var i = 0; i < arguments.length; i++) {
			if (arguments[i] && !arguments[i].empty()) return arguments[i];
		}
		return '';
	},
	proper: function (str, regexp) {
		var re;
		if (regexp) {
			if (this._proper_cache[regexp]) re = this._proper_cache[regexp];
			else this._proper_cache[regexp] = re = new RegExp('([^' + regexp.toRegExp() + ']+($|[' + regexp.toRegExp() + '])+)', 'g');
		} else {
			if (!this._proper_regexp) this._proper_regexp = re = new RegExp('([^' + this._proper_string.toRegExp() + ']+($|[' + this._proper_string.toRegExp() + '])+)', 'g');
			else re = this._proper_regexp;
		}
		return str.toLowerCase().replace(re, function ($0, $1, $2) { return $1.left(1).toUpperCase() + $1.substr(1); });
	},
	checkProperCharacter: function (chr) {
		if (!this._checkproper_regexp) this._checkproper_regexp = new RegExp('^[' + this._proper_string.toRegExp() + ']{1}$');
		return this._checkproper_regexp.test(chr);
	},
	stripHTML: function (str, tags) {
		var re;
		if (tags) {
			tags.forEach(function (tag, index) {
				re = new RegExp("<\\/?" + tag + "[^><]* ?\\/?>", "gmi");
				str = str.replace(re, "");
			});
		} else {
			re = /<\S[^><]*>/g;
			str = str.replace(re, "").htmldecode(); //.replace(/&[^&;]{1,8};/ig, ""));
		}
		return str;
	},
	stripScript: function (str) {
		var re = /<script[^>]*>([\\S\\s]*?)<\/script>/img;
		return (str.replace(re, ""));
	},
	format: function () {
		var args = $A(arguments), type = args[0].match(/^([^\-]+)\-?(.*)/);
		args[0] = (type.length > 2 ? type[2] : '');
		args[1] = this.create(args[1]);
		var format = FD.Input.Formats[(type[1].list('int', 'integer', 'float') ? 'number' : type[1])];
		return (format ? format.apply(format, args) : args[1]);
	},
	formatXml: function (xml) {
		var formatted = '';
		var reg = /(>)(<)(\/*)/g;
		xml = xml.replace(reg, '$1\r\n$2$3');
		var pad = 0;
		jQuery.each(xml.split('\r\n'), function (index, node) {
			var indent = 0;
			if (node.match(/.+<\/\w[^>]*>$/)) {
				indent = 0;
			} else if (node.match(/^<\/\w/)) {
				if (pad != 0) {
					pad -= 1;
				}
			} else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
				indent = 1;
			} else {
				indent = 0;
			}

			var padding = '';
			for (var i = 0; i < pad; i++) {
				padding += '\t';
			}

			formatted += padding + node + '\r\n';
			pad += indent;
		});

		return formatted;
	},
	formatXml2: function(text) {

		var ar = text.replace(/>\s{0,}</g,"><")
					 .replace(/</g,"~::~<")
					 .replace(/\s*xmlns\:/g,"~::~xmlns:")
					 .replace(/\s*xmlns\=/g,"~::~xmlns=")
					 .split('~::~'),
			len = ar.length,
			inComment = false,
			deep = 0,
			str = '',
			ix = 0,
			shift = this._shift || null;

		if (shift == null) {
			shift = ['\n']; // array of shifts
			for (ix = 0; ix < 100; ix++) {
				shift.push(shift[ix] + '\t');
			}
			this._shift = shift;
		}

		for (ix = 0; ix < len; ix++) {
			
			if (ar[ix].search(/<!/) > -1) { // start comment or <![CDATA[...]]> or <!DOCTYPE //
				str += shift[deep] + ar[ix];
				inComment = true;
				// end comment  or <![CDATA[...]]> //
				if (ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1 || ar[ix].search(/!DOCTYPE/) > -1) {
					inComment = false;
				}
			} else if (ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1) { // end comment  or <![CDATA[...]]> //
				str += ar[ix];
				inComment = false;
			} else if (/^<\w/.exec(ar[ix - 1]) && /^<\/\w/.exec(ar[ix]) &&
				/^<[\w:\-\.\,]+/.exec(ar[ix - 1]) == /^<\/[\w:\-\.\,]+/.exec(ar[ix])[0].replace('/', '')) { // <elm></elm> //
				str += ar[ix];
				if (!inComment) deep--;
			} else if (ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) == -1 && ar[ix].search(/\/>/) == -1) { // <elm> //
				str = !inComment ? str += shift[deep++] + ar[ix] : str += ar[ix];
			} else if (ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) > -1) { // <elm>...</elm> //
				str = !inComment ? str += shift[deep] + ar[ix] : str += ar[ix];
			} else if (ar[ix].search(/<\//) > -1) { // </elm> //
				str = !inComment ? str += shift[--deep] + ar[ix] : str += ar[ix];
			} else if (ar[ix].search(/\/>/) > -1) { // <elm/> //
				str = !inComment ? str += shift[deep] + ar[ix] : str += ar[ix];
			} else if (ar[ix].search(/<\?/) > -1) { // <? xml ... ?> //
				str += shift[deep] + ar[ix];
			} else if (ar[ix].search(/xmlns\:/) > -1 || ar[ix].search(/xmlns\=/) > -1) { // xmlns //
				str += shift[deep] + ar[ix];
			} else {
				str += ar[ix];
			}

		}
		
		return  (str[0] == '\n') ? str.slice(1) : str;
	},

	log: function log (str, type, force) {
		if ((FD._trace || force) && window.console) {
			if (typeof FDBaseFunctions != 'undefined') {
				var args = $A(arguments);
				if (args.length < 2) args.push('');
				if (args.length < 3) args.push(true);
				FDBaseFunctions.log.apply(FDBaseFunctions, args);
			} else {
				type = type || 'log';
				switch (type) {
					case 'log': window.console.log(str); break;
					case 'error': window.console.error(str); break;
					case 'info': window.console.info(str); break;
					case 'group': window.console.group(str); break;
					case 'groupEnd': window.console.groupEnd(); break;
				}
			}
		}
	},
	random: function (multiply) {
		if (!Number.is(multiply)) multiply = 100000;
		return Math.round(Math.random() * multiply);
	},
	uniqueID: function () {
		return this.create(Math.random()).replace(/\D/g, "");
	},
	threadID: function () {
		return 'th' + this.random();
	},
	removeOn: function (string) { // borrowed from mootools core
		return string.replace(/^on([A-Z])/, function (full, first) {
			return first.toLowerCase();
		});
	}

});

(function () {
	var special = {
		'a': /[àáâãäåăą]/g,
		'A': /[ÀÁÂÃÄÅĂĄ]/g,
		'c': /[ćčç]/g,
		'C': /[ĆČÇ]/g,
		'd': /[ďđ]/g,
		'D': /[ĎÐ]/g,
		'e': /[èéêëěę]/g,
		'E': /[ÈÉÊËĚĘ]/g,
		'g': /[ğ]/g,
		'G': /[Ğ]/g,
		'i': /[ìíîï]/g,
		'I': /[ÌÍÎÏ]/g,
		'l': /[ĺľł]/g,
		'L': /[ĹĽŁ]/g,
		'n': /[ñňń]/g,
		'N': /[ÑŇŃ]/g,
		'o': /[òóôõöøő]/g,
		'O': /[ÒÓÔÕÖØ]/g,
		'r': /[řŕ]/g,
		'R': /[ŘŔ]/g,
		's': /[ššş]/g,
		'S': /[ŠŞŚ]/g,
		't': /[ťţ]/g,
		'T': /[ŤŢ]/g,
		'u': /[ùúûůüµ]/g,
		'U': /[ÙÚÛŮÜ]/g,
		'y': /[ÿý]/g,
		'Y': /[ŸÝ]/g,
		'z': /[žźż]/g,
		'Z': /[ŽŹŻ]/g,
		'th': /[þ]/g,
		'TH': /[Þ]/g,
		'dh': /[ð]/g,
		'DH': /[Ð]/g,
		'ss': /[ß]/g,
		'oe': /[œ]/g,
		'OE': /[Œ]/g,
		'ae': /[æ]/g,
		'AE': /[Æ]/g
	},

	tidy = {
		' ': /[\xa0\u2002\u2003\u2009]/g,
		'*': /[\xb7]/g,
		'\'': /[\u2018\u2019]/g,
		'"': /[\u201c\u201d]/g,
		'...': /[\u2026]/g,
		'-': /[\u2013]/g,
		//	'--': /[\u2014]/g,
		'&raquo;': /[\uFFFD]/g
	},

	walk = function (string, replacements) {
		var result = string, key;
		for (key in replacements) result = result.replace(replacements[key], key);
		return result;
	},
	
	getRegexForTag = function(tag, contents){
		tag = tag || '';
		var regstr = contents ? "<" + tag + "(?!\\w)[^>]*>([\\s\\S]*?)<\/" + tag + "(?!\\w)>" : "<\/?" + tag + "([^>]+)?>",
			reg = new RegExp(regstr, "gi");
		return reg;
	};

	$.extend(String.prototype, {
		// standardize & tidy taken from mootools-more
		standardize: function () { // Removes non-ascii characters and converts them to their most appropriate ascii character
			return walk(this, special);
		},
		normalize: function () { // same as standardize
			return walk(this, special);
		},
		tidy: function() { // Replaces common special characters with their ASCII counterparts (smart quotes, elipse characters, stuff from MS Word, etc.)
			return walk(this, tidy);
		},
		left: function (length) {
			return this.substr(0, length);
		},
		right: function (length) {
			return this.substr(Math.max(this.length - length, 0));
		},
		trim: function () {
			return this.ltrim().rtrim();
		},
		rtrim: function () {
			return this.replace(/\s+$/, '');
		},
		ltrim: function () {
			return this.replace(/^\s+/, '');
		},
		truncate: function (length, truncation) {
			length = length || 30;
			truncation = typeof truncation == 'undefined' ? '...' : truncation;
			return this.length > length ?
			this.slice(0, length - truncation.length) + truncation : String(this);
		},
		times: function (count) {
			return count < 1 ? '' : new Array(count + 1).join(this);
		},
		padl: function (size, pad) {
			pad = (typeof pad == 'undefined' ? ' ' : pad);
			return pad.times(size - this.length) + this;
		},
		padr: function (size, pad) {
			pad = (typeof pad == 'undefined' ? ' ' : pad);
			return this + pad.times(size - this.length);
		},
		append: function (str, chr) {
			return this + (!this.empty() && !str.empty() && this.charAt(this.length - 1) != chr && str.charAt(0) != chr ? chr : '') + str;
		},
		prepend: function (str, chr) {
			return str + (!this.empty() && !str.empty() && this.charAt(0) != chr && str.charAt(str.length - 1) != chr ? chr : '') + this;
		},
		add: function (chr, before) {
			if (before && this.left(chr.length) != chr) {
				return chr + this;
			} else if (!before && this.right(chr.length) != chr) {
				return this + chr;
			}
			return this;
		},
		int: function () {
			var retval = parseInt(this);
			return ((this.length == 0 || isNaN(retval)) ? 0 : retval);
		},
		float: function (simple) {
			var match = this.match(/[\-]{0,1}[\d]+[,\.\d]{0,}/);
			simple = simple || /[^\d,\.\-]/.test(this) || /^[\d]+\.[\d]{1,2}$/.test(this);
			var retval = (match != null ? parseFloat((simple ? String(match).replace(',', '.') : String.format('number', match, true, false))) : 0);
			//DEBUG.trace('float', retval);
			return (isNaN(retval) ? 0 : retval);
		},
		array: function (chr, type) {
			var arr = this.split(chr);
			if (type && type.list('int', 'float')) {
				for (var i = arr.length - 1; i >= 0; i--) {
					if (arr[i].empty()) arr.splice(i, 1);
					else arr[i] = (type == 'int' ? arr[i].int() : arr[i].float());
				}
			}
			return arr;
		},
		sprintf: function () {
			var args = [this + ''].concat($A(arguments));
			return String.sprintf.apply(this, args);
		},
		toRegExp: function () {

			return RegExp.escape(this);

			if (!String._regexp1) String._regexp1 = new RegExp('([\\\(\\\[\\\{\\\\])', 'gm');
			if (!String._regexp2) String._regexp2 = new RegExp('([\\\)\\\]\\\}\\\?\\\.\\\-])', 'gm');
			str = this.replace(String._regexp1, '\\\$1');
			return str.replace(String._regexp2, '\\\$1');
		},
		replaceAll: function (what, withwhat, icase) {
			var re = new RegExp(what.toRegExp(), (icase ? "i" : "") + "gm");
			return this.replace(re, withwhat);
		},
		empty: function (nolength) {
			if (nolength && this.length == 0) return false;
			return !(/[^\s]/.test(this));
		},
		occurs: function (str) {
			var re = new RegExp(str.toRegExp(), "igm"), occurs = this.match(re);
			return (occurs ? occurs.length : 0);
		},
		list: function () {
			for (var i = 0; i < arguments.length; i++) {
				if (this == arguments[i]) return true;
			}
			return false;
		},
		contains: function () {
			var args = $A(arguments.length == 1 && Array.is(arguments[0]) ? arguments[0] : arguments);
			var ci = Boolean.is(args[0]), stringSearched = this;
			if (ci) {
				args.shift();
				stringSearched = stringSearched.toLowerCase();
			}

			for (var i = 0; i < args.length; i++) {
				var str = (ci ? args[i].toLowerCase() : args[i]);
				if (stringSearched.search(str) > -1) return true;
			}
			return false;
		},
		proper: function () {
			return String.proper(this); // this.toLowerCase().replace(/([^ ]+($| )+)/g, function ($0, $1, $2) { return $1.left(1).toUpperCase() + $1.substr(1); });
		},
		encodeEntities: function () {
			var str = this.replace(/&/g, "&amp;");
			str = str.replace(/</g, "&lt;");
			str = str.replace(/>/g, "&gt;");
			str = str.replace(/"/g, "&#34;");
			return str
		},
		urlencode: function () { return encodeURIComponent(this); },
		urldecode: function () { return decodeURIComponent(this); },
		htmlencode: function () { return $('<div />').text(this).html(); },
		htmldecode: function () { return $('<div />').html(this).text(); },
		encodeHtmlEntity: function() {
			var buf = [];
			for (var i = this.length - 1; i >= 0; i--) {
				buf.unshift(['&#', this[i].charCodeAt(), ';'].join(''));
			}
			return buf.join('');
		},
		decodeHtmlEntity: function() {
			return this.replace(/&#(\d+);/g, function(match, dec) {
				return String.fromCharCode(dec);
			});
		},
		xmlencode: function (cdata) {
			if (cdata && /&|<|>|"/g.test(this)) {
				return '<![CDATA[' + this + ']]>';
			}
			var str = this.replace(/&/g, "&amp;");
			str = str.replace(/</g, "&lt;");
			str = str.replace(/>/g, "&gt;");
			str = str.replace(/"/g, "&quot;");
			return str;
		},
		encode: function (type) {
			var args = $A(arguments), type = args.shift();
			if (type.list('url', 'html', 'xml')) {
				return this[type + 'encode'].apply(this, args);
			} else if (type == 'entity') {
				return this.encodeHtmlEntity();
			} else if (type.list('attribute', 'entities')) {
				return this.encodeEntities();
			}
			return this;
		},
		stripHTML: function (tags) {
			return String.stripHTML.call(String, this, tags);
		},
		stripScript: function () {
			return this.stripTags('script');
//			var re = /<script[^>]*>([\\S\\s]*?)<\/script>/img;
//			return (this.replace(re, ""));
		},
		getTags: function(tag, contents){
			return this.match(getRegexForTag(tag, (arguments.length > 1 ? contents : true))) || [];
		},
		stripTags: function(tag, contents){
			return this.replace(getRegexForTag(tag, (arguments.length > 1 ? contents : true)), '');
		},
		html: function () {
			return this.htmlencode().replace(/\r/g, '').replace(/\n/g, '<br />\r\n');
		},
		text: function (options) {
			var text = this.replace(/&nbsp;/ig, ' '), tb = (options && options.transformBreaks);
			text = text.replace(/<br( ?\/)?>/ig, (tb ? '__##__' : ' '));
			text = text.stripHTML().stripScript().replace(/(\r\n){2,}/g, '\r\n').replace(/\r\n/g, ' ').replace(/[\r\n]/g, '');
			if (tb) text = text.replace('__##__', '\r\n');
			if (options && options.truncate) text = text.truncate(options.truncate);
			return text;
		},
		toType: function (type) {
			if (!type) return this;
			type = type.toLowerCase();
			if (type.list('int', 'integer', 'i')) {
				return Number.int(this);
			} else if (type.list('bool', 'boolean', 'l', 'logical')) {
				return this.toLowerCase().list('true', '1', '.t.', 'on', 'yes');
			} else if (type.list('float', 'f', 'n', 'number')) {
				return Number.float(this);
			} else if (type.list('array', 'a')) {
				return this.split(','); // new Array(this);
			} else if (type == 'date') {
				var date = this.match(/(\d{4})-(\d{2})-(\d{2})/);
				if (!date) return null;
				return new Date(date[1], Number.int(date[2]) - 1, date[3]);
			} else if (type == 'datetime') {
				var date = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(this);
				if (!date) return null;
				return new Date(date[1], Number.int(date[2]) - 1, date[3], date[4], date[5], date[6]);
			}
			return this + '';
		},
		assert: function () {
			for (var i = 0, len = arguments.length; i < len; i++) {
				if (this == arguments[i]) return this + '';
			}
			throw "Assertion failed for '" + this + "'";
		},
		log: function () {
			if (window.console) window.console.log(this);
		},
		alert: function () {
			alert(this);
		},
		splitline: function () {
			var splitChar = (/\r\n/.test(this) ? '\r\n' : (/\n/.test(this) ? '\n' : '\r'));
			return this.split(splitChar);
		},
		coalesce: function () {
			if (!this.empty()) return this;
			for (var i = 0, len = arguments.length; i < len; i++) {
				if (String.is(arguments[i]) && !arguments[i].empty()) return arguments[i];
			}
			return this;
		},
		pluralize: function () {
			var word = this;
			if (word.right(1).toUpperCase() == 'Y') {
				word = word.substr(0, word.length - 2) + 'ie';
			}
			return word + 's';
		},
		singularize: function () {
			var word = this;
			if (word.right(1).toUpperCase() == 'S') {
				word = word.substr(0, word.length - 1);
				if (word.right(2).toUpperCase() == 'IE') {
					word = word.substr(0, word.length - 2) + 'y';
				}
			}
			return word;
		}
	});
})();

(function () {
	// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
	//
	// Referring to the table here:
	// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/regexp
	// these characters should be escaped
	// \ ^ $ * + ? . ( ) | { } [ ]
	// These characters only have special meaning inside of brackets
	// they do not need to be escaped, but they MAY be escaped
	// without any adverse effects (to the best of my knowledge and casual testing)
	// : ! , = 
	// my test "~!@#$%^&*(){}[]`/=?+\|-_;:'\",<.>".match(/[\#]/g)

	var specials = [
		  // order matters for these
			"-"
		  , "["
		  , "]"
		  // order doesn't matter for any of these
		  , "/"
		  , "{"
		  , "}"
		  , "("
		  , ")"
		  , "*"
		  , "+"
		  , "?"
		  , "."
		  , "\\"
		  , "^"
		  , "$"
		  , "|"
	]

		// I choose to escape every character with '\'
		// even though only some strictly require it when inside of []
	  , regex = RegExp('[' + specials.join('\\') + ']', 'g')
	;

	RegExp.escape = function (str) {
		return str.replace(regex, "\\$&");
	};

}());

$.extend(Number, {
	_regexp_tsep: new RegExp("[,]", "g"),
	_regexp_dsep: new RegExp("[\\\.]", "g"),
	_regexp_match: new RegExp("([\\d]+)?,?([\\d]+)\\\.?([\\d]+)?"),
	_regexp_replace: new RegExp("[^\\d,\\\.\-]", "g"),
	_regexp_wrong: new RegExp("[\\d]+\\\.[\\d]{3},[\\d]+"),
	tsep: ',', /* thousand seperator */
	dsep: '.', /* decimal seperator */
	setFormat: function (format) {
		String.log('Number.format=' + format);
		FD.Input.Log.Add('Number.format: ' + format);
		if (format.empty()) return;
		if (format.left(1) == '@') format = format.substr(1);
		this.tsep = format.left(1);
		this.dsep = format.right(1);
		this._regexp_dsep = new RegExp("[" + Number.dsep.toRegExp() + "]", "g");
		this._regexp_tsep = new RegExp("[" + Number.tsep.toRegExp() + "]", "g");
		this._regexp_match = new RegExp("([\\d]+)?" + this.tsep.toRegExp() + "?([\\d])+" + this.dsep.toRegExp() + "?([\\d]+)?");
		this._regexp_replace = new RegExp("[^\\d" + this.tsep.toRegExp() + this.dsep.toRegExp() + "\-]", "g");
		this._regexp_wrong = new RegExp("[\\d]+" + this.dsep.toRegExp() + "[\\d]{3}" + this.tsep.toRegExp() + "[\\d]+");
		this._regexp_test = null;
	},
	DSepInStr: function (str) {
		if (!this._regexp_dsep) this._regexp_dsep = new RegExp("[" + Number.dsep.toRegExp() + "]");
		return this._regexp_dsep.test(str);
	},
	TSepInStr: function (str) {
		if (!this._regexp_tsep) this._regexp_tsep = new RegExp("[" + Number.tsep.toRegExp() + "]");
		return this._regexp_tsep.test(str);
	},
	int: function (val) {
		if (typeof val == 'string') val = val.replace(/^[0]+/, "");
		var retval = parseInt(val);
		return (isNaN(retval) ? 0 : retval);
	},
	float: function (val) {
		var retval = parseFloat(val);
		return (isNaN(retval) ? 0 : retval);
	},
	cumulate: function (el) {
		var cum = 0;
		if (Array.is(el)) {
			for (var i = 0; i < el.length; i++) {
				if (Object.isPlain(el[i]) || Array.is(el[i])) cum += this.cumulate(el[i]);
				else cum += this.float(el[i]);
			}
		} else if (Object.is(el)) {
			for (var key in el) {
				if (Object.isPlain(el[key]) || Array.is(el[key])) cum += this.cumulate(el[key]);
				else cum += this.float(el[key]);
			}
		}
		return cum;
	},
	correct: function () {
		return this.float(correctNumber.apply(this, arguments)[0]);
	},
	parse: function (str) {
		if (!this._regexp_test) this._regexp_test = new RegExp("[\\d]{0,}" + Number.tsep.toRegExp() + "[\\d]{0,}" + Number.dsep.toRegExp()); // new RegExp("^([\\d]{1,3}" + Number.tsep.toRegExp() + "[\\d]{3}){0,}[\\d]{0,}(" + Number.dsep.toRegExp() + "[\\d]+){0,}$");
		str = str.replace(this._regexp_replace, "");
		//alert(str + '; ' + this._regexp_test.test(str) + '; ' + this._regexp_tsep.test(str) + '; ' + this._regexp_dsep.test(str) + '; ' + this.tsep + '; ' + (!this._regexp_tsep.test(str) || !this._regexp_dsep.test(str) || this._regexp_test.test(str)) + '; ' + this._regexp_tsep + '; ' + str.replace(this._regexp_tsep, ";"));
		return this.float(str.replace((!this._regexp_tsep.test(str) || !this._regexp_dsep.test(str) || this._regexp_test.test(str) ? this._regexp_tsep : this._regexp_dsep), "").replace(/,/, "."));
	},
	range: function (start, end) {
		var r = [];
		for (var i = start; i <= end; i++) r.push(i);
		return r;
	},
	create: function (num) {
		switch (Object.toType(num)) {
			case 'number':
				return (isNaN(num) ? 0 : num); break;
			case 'string':
				return this.parse(num); break;
			case 'date':
				return FD.Date.toJulian(num); break;
			case 'boolean':
				return (num ? 1 : 0); break;
		}
		return 0;
	},
	round: function (num, precision) {
		return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
	},
	bounds: function (num, boundStart, boundEnd) {
		var diff = boundEnd - boundStart + 1, remainder = num % diff;
		if (remainder < boundStart) {
			remainder = diff + remainder;
		}
		return remainder;
	}
});
$.extend(Number.prototype, {
	between: function (low, high) {
		return (this >= low && this <= high);
	},
	list: function () {
		for (var i = 0; i < arguments.length; i++) {
			if (this == arguments[i]) return true;
		}
		return false;
	},
	decimals: function (decimals, type) {
		type = type || 'round';
		var factor = parseInt('1'.padr((decimals || 0) + 1, '0'));
		return Math[type](this * factor) / factor;
	},
	round: function (precision) {
		return Number.round(this, precision);
	},
	format: function () {
		var format = FD.Input.Formats['number'];
		return (format ? format('', String.create(this)) : String.create(this));
	},
	empty: function () {
		return isNaN(this) || this == 0;
	},
	toRegExp: function () {
		return (this + '').toRegExp();
	}
});

if (!Date.now) {
	Date.now = function now() {
		return new Date().getTime();
	};
}
$.extend(Date, {
	between: function (date, low, high) {
		if (Object.is(date)) date = date.Date;
		if (!date) return false;
		return date.between(low, high);
	},
	ts: function (seconds, date) {
		if (!date) date = new Date();
		return Math.floor(date.now() / (seconds ? 1000 : 1));
	}
});
$.extend(Date.prototype, {
	between: function (low, high) {
		return (this >= low && this <= high);
	},
	getTimeStamp: function () {
		return (new Date()) - this;
	},
	now: function () {
		return this.getTime();
	}
});
// for older browsers like <= IE8
if (!Date.prototype.toISOString) {
	(function () {

		function pad(number) {
			if (number < 10) {
				return '0' + number;
			}
			return number;
		}

		Date.prototype.toISOString = function () {
			return this.getUTCFullYear() +
			  '-' + pad(this.getUTCMonth() + 1) +
			  '-' + pad(this.getUTCDate()) +
			  'T' + pad(this.getUTCHours()) +
			  ':' + pad(this.getUTCMinutes()) +
			  ':' + pad(this.getUTCSeconds()) +
			  '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
			  'Z';
		};

	}());
}

$.extend(Function, {
	exist: function (func) {
		try { return typeof eval(func) != 'undefined' && this.is(eval(func)); }
		catch (e) { return false; }
	},
	_depLevel: 0,
	depricated: function (name, func, replace, scope) {
		scope = scope || window;
		var __name = name, __func = func, __replace = replace || 'another function';
		scope[__name] = function () {
			if (!FD.Browser.less('ie', 8, true)) {
				var stack = FD.Stack.Format(', '), retval;
				if (!this._stacks) { // first time
					if (FD.isBackend()) {
						jQuery(window).unload(function () { FD.Error.Send('Depricated function calls!', document.location.href, 0, 'Function.depricated', $('#_fd_depricated').val()); });
					}
					this._stacks = [];
				}
				if (!this._stacks.seek(stack)) {
					this._stacks.push(stack);
					String.log(['Function ' + __name + ' has been depricated, please replace this function with ' + __replace + ', stack count=' + this._stacks.length + ', stack=' + stack, this], 'error');
					FD.Form.AppendElement('input[type="hidden"]', '_fd_depricated', 'function=' + __name + ', depLevel=' + Function._depLevel + ', replace=' + __replace + ', count=' + this._stacks.length + ', stack=' + stack, '\n');
				}
			}
			Function._depLevel++;
			retval = __func.apply(__func, arguments);
			Function._depLevel--;

			return retval;
		};
	},
	exec: function (func, times, delay) {
		if (!Number.is(times)) times = 2;
		if (!Number.is(delay)) delay = 500;
		try { func(); } catch (e) { String.log('Function.exec, error=' + (e.message || e) + ', delay=' + delay + ', times=' + times); if (times > 0) Function.exec.delay(this, delay, func, --times, delay); }
	},
	eval: function (func) {
		if (typeof func == 'function') return func();
		else if (String.is(func)) eval(func);
	},
	once: function (func) {
		func.once = true;
		return func;
	}
});
$.extend(Function.prototype, {
	bind: function () {
		var __method = this, args = $A(arguments.length == 1 && Array.is(arguments[0]) && !FDArray.is(arguments[0]) ? arguments[0] : arguments);
		//console.log('typeof args[0]=' + typeof args[0] + ', length=' + arguments.length);
		var object = (typeof args[0] == 'object' ? args.shift() : this);
		var f = function () {
			var all = args.concat($A(arguments));
			return __method.apply(object, all); //.concat($A(arguments))
		};
		f.toString = function () { return __method.toString(); };
		f.object = (object ? (object.$family || '<unknown family>') + '::' + (object._class || '<unknown class>') + '::' + (object.name || '<unknown name>') : '<not an objecct>');
		f.debug = __method.toString();
		return f;
	},
	bindAsEventListener: function () {
		var __method = this, args = $A(arguments), object = args.shift();
		return function (event) {
			return __method.apply(object, [event || window.event].concat(args));
		}
	},
	before: function () {
		var __method = this, __before = arguments[0], object = (arguments.length > 1 ? arguments[1] : this);
		return function () {
			var args = $A(arguments);
			__before.apply(object, args);
			__method.apply(object, args);
		}
	},
	after: function () {
		var __method = this, __after = arguments[0], object = (arguments.length > 1 ? arguments[1] : this);
		return function () {
			var args = $A(arguments);
			__method.apply(object, args);
			__after.apply(object, args);
		}
	},
	delay: function () {
		var __method = this, args = $A(arguments), object = ((typeof args[0]).list('object', 'function') ? args.shift() : this), timeout = (args.length > 0 ? args.shift() : -1);
		if (timeout >= 0) {
			return window.setTimeout(function () {
				return __method.apply(object, args);
			}, timeout);
		} else {
			return __method.apply(object, args);
		}
	},
	interval: function () {
		var __method = this, args = $A(arguments), object = ((typeof args[0]).list('object', 'function') ? args.shift() : this), interval = (args.length > 0 ? args.shift() : -1);
		if (interval >= 0) {
			return window.setInterval(function () {
				return __method.apply(object, args);
			}, interval);
		} else {
			return __method.apply(object, args);
		}
	},
	loop: function () {
		try {
			var __method = this, args = $A(arguments), object = (typeof args[0] == 'object' ? args.shift() : this), times = args.shift(), start = (typeof args[0] == 'number' ? args.shift() : 0);
			for (var i = start; i < (start + times); i++) {
				object.apply(object, [i].concat(args));
			}
		} catch (e) { alert('Function.loop:\r\n' + (e.message ? e.message : e)); }
		return object;
	},
	lock: function () {
		this.$locked = true;
		return this;
	},
	compare: function (fn) {
		if (typeof fn == 'string') return this.toString() == fn;
		else return this == fn;
	}
});

$.extend(Math, { // Math does not have it's own extend method (not prototypable)
	log10: function (num) {
		return this.log(num) / this.log(10);
	},
	median: function (array) {
		if (array.length == 0) return 0;
		array.sort(function (a, B) { return (a - B); });
		if (array.length % 2 > 0) { // odd
			return array[Math.floor(array.length / 2)];
		} else {
			var mid = array.length / 2;
			return (array[mid - 1] + array[mid]) / 2;
		}
	},
	/* tan, cos and sin function work with radians, so the two function below convert between degrees and radians */
	toDegrees: function (radians) {
		return radians * (180 / Math.PI); // converts an angle in radians to degrees
	},
	toRadians: function (degree) {
		return degree * (Math.PI / 180); // converts an angle in degrees to radians
	}
});

$.extend(Array, {
	create: function (arr) {
		if (typeof arr == 'undefined' || arr == null) return [];
		if (Array.is(arr)) return arr;
		return [arr];
	},
	sortNum: function (a, b) {
		return a - b;
	},
	typeOf: function (arr, type) {
		return (Array.is(arr) && arr.type && arr.type == type);
	}
});
$.extend(Array.prototype, {
	clone: function () {
		return this.slice(0);
	},
	insert: function () {
		var args = $A(arguments.length < 2 ? arguments[0] : arguments), index = args.shift();
		if (index < this.length) {
			this.splice.apply(this, [index, 0].concat(args));
//			var temp = this.splice(arg[0], this.length - arg[0]);
//			this.add(arg, 1);
//			this.add(temp);
		} else {
			this.push.apply(this, args);
//			this.add(args);
		}
		return this;
	},
	add: function (items, start, index) {
		if (Number.is(items)) { var tmp = start; start = items; items = tmp; } // backward compatibility. params order change
		start = start || 0;
		if (Object.toType(items).list('array', 'arguments') || (/*(FD.Browser.ie || FD.Browser.opera) &&*/typeof items[0] != 'undefined')) {
			for (var i = start; i < items.length; i++) {
				if (index) items[i].index = this.length;
				this.push(items[i]);
			}
		} else {
			this.push(items);
			if (index) this[this.length - 1].index = this.length - 1;
		}
		return this;
	},
	item: function (index) {
		return (index >= 0 && index < this.length ? this[index] : null);
	},
	search: function (search, xd, coll) { // xd = x-dimension = number of columns
		var i, j;
		if (arguments.length < 3) coll = -1;
		for (i = 0; i < this.length; i++) {
			if (xd) {
				if (coll > -1) {
					if (this[i][coll] == search) return i;
				} else {
					for (j = 0; j < xd; j++) { if (this[i][j] == search) return { row: i, col: j, index: (i * xd) - (xd - j) }; }
				}
			} else { if (this[i] == search) return i; }
		}
		return (xd ? { row: -1, col: -1, index: -1} : -1);
	},
	keySearch: function (key, search) {
		for (i = 0; i < this.length; i++) {
			if (this[i][key] == search) return this[i];
		}
		return null;
	},
	seek: function (search, md, key) { // md = multi-dimension = true when multiple columns
		var i, j;
		for (i = 0; i < this.length; i++) {
			if (md && arguments.length < 3) {
				for (j = 0; j < this[i].length; j++) { if (this[i][j] == search) return true; }
			} else if (arguments.length == 3) {
				if (this[i][key] == search) return true;
			} else {
				if (this[i] == search) return true;
			}
		}
		return false;
	},
	exists: function (search, md, key) {
		return this.seek.apply(this, arguments);
	},
	textSearch: function (search, xd) {
		var i, j;
		for (i = 0; i < this.length; i++) {
			if (xd) {
				for (j = 0; j < xd; j++) { if (this[i][j].search(search) > -1) return { row: i, col: j, index: (i * xd) - (xd - j) }; }
			} else {
				if (this[i].search) { if (this[i].search(search) > -1) return i; }
				else if (this[i] === search) return i;
			}
		}
		return (xd ? { row: -1, col: -1, index: -1} : -1);
	},
	remove: function (index) {
		return this.splice(index, 1);
	},
	clear: function () {
		//this.length = 0;
		this.splice(0, this.length);
		return this;
	},
	zap: function () {
		this.length = 0;
		return this;
	},
	trim: function () {
		for (var i = 0; i < this.length; i++) {
			this[i] = String(this[i]).trim();
		}
		return this;
	},
	ltrim: function () {
		for (var i = 0, j = 0; i < this.length; i++) {
			if (String.is(this[i]) && !this[i].empty()) break;
			j++;
		}
		if (j > 0) this.splice(0, j);
		return this;
	},
	rtrim: function () {
		for (var i = this.length - 1, j = 0; i >= 0; i--) {
			if (String.is(this[i]) && !this[i].empty()) break;
			j++;
		}
		if (j > 0) this.splice(i + 1, j);
		return this;
	},
	pad: function (size, pad, before) {
		var tmp = [];
		for (var i = this.length; i < size; i++) {
			tmp.push(pad);
		}
		if (tmp.length > 0) {
			if (before) {
				tmp = tmp.concat(this.splice(0, this.length));
			}
			this.add(tmp);
		}
		return this;
	},
	padl: function (size, pad) {
		return this.pad(size, pad, true);
	},
	padr: function (size, pad) {
		return this.pad(size, pad);
	},
	pack: function () {
		var i = 0;
		for (var i = this.length; i >= 0; i--) {
			if (String.is(this[i]) && this[i].trim().empty()) {
				this.remove(i);
			}
		}
		return this;
	},
	loop: function (func) {
		for (var i = 0; i < this.length; i++) {
			func(this, i);
		}
		return this;
	},
	walk: function (fn, bind) {
		bind = bind || this;
		for (var i = 0; i < this.length; i++) {
			fn.call(bind, this[i], i, this);
		}
		return this;
	},
	distinct: function () {
		var i, tmp = [], tmp_seek = [], args = $A(arguments), use_col = Number.is(args[0]), col = (use_col ? args.shift() : 0), use_lc = Boolean.is(args[0]), lc;
		for (i = 0; i < this.length; i++) {
            if (use_col) {
                lc = (use_lc && String.is(this[i][col]));
                if (!tmp_seek.seek((lc ? this[i][col].toLowerCase() : this[i][col]))) {
                    tmp_seek.push((lc ? this[i][col].toLowerCase() : this[i][col]));
                    tmp.push(this[i]);
                }
				//if (tmp.length == 0 || !tmp.seek(this[i][col], true, coll)) tmp.push(this[i]);
			} else {
				lc = (use_lc && String.is(this[i]));
				if (!tmp_seek.seek((lc ? this[i].toLowerCase() : this[i]))) {
					tmp_seek.push((lc ? this[i].toLowerCase() : this[i]));
					tmp.push(this[i]);
				}
			}
		}
		return tmp;
	},
	move: function (from, to) {
		if (from == to) return this;
		var el = this[from], i;
		if (from < to) {
			for (i = from; i < to; i++)
				this[i] = this[i + 1];
		} else {
			for (i = from; i > to; i--)
				this[i] = this[i - 1];
		}
		this[to] = el;
		return this;
	},
	sort_multi: function (coll) {
		var i, j, index;
		if (!Number.is(coll)) { return this.sort(); }
		for (i = 0; i < this.length; i++) {
			index = i;
			for (j = i; j < this.length - 1; j++) {
				if (this[j + 1][coll] < this[index][coll]) index = j + 1;
			}
			if (index != i) {
				this.move(index, i);
			}
		}
		return this;
	},
	sortByKey: function (key, icase) {
		this.sort(function (a, b) {
			if (!Object.is(a) || !Object.is(b)) return -1;
			var keyA = (icase && String.is(a[key]) ? a[key].toLowerCase() : a[key]), keyB = (icase && String.is(b[key]) ? b[key].toLowerCase() : b[key]);
			if (keyA < keyB) return -1;
			if (keyA > keyB) return 1;
			return 0;
		});
		return this;
	},
	count: function () { return this.length; },
	sum: function (type, coll) {
		var sum = 0, xd = (arguments.length > 1 && Number.is(coll));
		for (var i = 0; i < this.length; i++) {
			sum += Number.create((xd ? this[i][coll] : this[i]));
		}
		switch (type) {
			case 'string':
				return String.create(sum); break;
			case 'date':
				return FD.Date.fromJulian(sum); break;
		}
		return sum;
	},
	avg: function (type) {
		var avg = Number.float(this.sum() / this.length);
		switch (type) {
			case 'string':
				return String.create(avg); break;
			case 'date':
				return FD.Date.fromJulian(avg); break;
		}
		return avg;
	},
	min: function () {
		var min = this[0];
		for (var i = 1; i < this.length; i++) {
			if (this[i] < min) min = this[i];
		}
		return min;
	},
	max: function () {
		var max = this[0];
		for (var i = 1; i < this.length; i++) {
			if (this[i] > max) max = this[i];
		}
		return max;
	},
	first: function () { return (this.length > 0 ? this[0] : null); },
	last: function () { return (this.length > 0 ? this[this.length - 1] : null); },
	indexes: function () {
		var arr = [];
		for (var i = 0; i < arguments.length; i++) {
			arr.push(this[arguments[i]]);
		}
		return arr;
	},
	chunk: function (length, chunk) {
		if (arguments.length == 1) return Math.ceil(this.length / length);
		index = chunk * length;
		return this.slice(index, Math.min(index + length, this.length));
	},
	chunks: function (length) {
		var chunks = [], count = this.chunk(length);
		for (var i = 0; i < count; i++) {
			chunks.push(this.chunk(length, i));
		}
		return chunks;
	}
});

if (!Array.prototype.push) {
	Array.prototype.push = function () {
		for (var i = 0; i < arguments.length; i++)
			this[this.length] = arguments[i];
		return this.length;
	}
}

$.extend(RegExp.prototype, {
	execAll: function (str) {
		var result = [], arr;
		while ((arr = this.exec(str)) != null) {
			result.push(arr[1]);
		}
		return (result.length > 0 ? result : null);
	}
});

var __tmp = {
	isObject: function (a, test) {
		try {
			if (test)
				return (a != null && (typeof a == 'object' || typeof a == 'function') && (typeof test == 'undefined' || (eval('typeof a.' + test) != 'undefined' && eval('typeof a.' + test) != 'unknown')));
			return a !== null && typeof a != 'undefined' && Object.toType(a).list('object', 'global', 'window', 'domwindow' /*safari*/); //(typeof a == 'object' && !Object.toType(a) == 'date') || 
		} catch (e) { return false; }
	},
	isString: function (a) {
		return (typeof a == 'string' || a instanceof String);
	},
	isNumber: function (a) {
		return (typeof a == 'number' && !isNaN(a) && isFinite(a));
	},
	isArray: function (a) {
		return a !== null && (Object.toType(a).list('array', 'fdarray', 'nodelist', 'htmlcollection', 'arguments') || (typeof FDArray != 'undefined' && a instanceof FDArray) /* not realy necessary because toType returns 'fdarray' */);
	},
	isCollection: function (a) {
		return ((typeof a == 'object' || (Browser.safari && typeof a == 'function')) && typeof a[0] != 'undefined');
	},
	isBoolean: function (a) {
		return Object.toType(a) == 'boolean'; //(typeof a == 'boolean');
	},
	isFunction: function (a) {
		return Object.toType(a) == 'function'; // (typeof a == 'function');
	},
	isEmpty: function (str, nolength) {
		if (typeof str == 'undefined' || str == null) return true;
		return str.empty(nolength);
	},
	isEmptyVal: function (opDoc, vpEl) {
		var el = FD.get(vpEl, opDoc);
		if (!Object.is(el)) return true;
		if (typeof el.tagName == 'undefined' && typeof el[0] != 'undefined')
			return FD.selected(el, 'index') == -1;
		else return String.create(el.value).empty();
	},
	inList: function () {
		var value = arguments[0];
		for (var i = 1; i < arguments.length; i++) {
			if (value == arguments[i]) return true;
		}
		return false;
	},
	inBetween: function (npTestVal, npLowVal, npHighVal) {
		return (npTestVal >= npLowVal && npTestVal <= npHighVal);
	}
};
Object.extend(window, __tmp);

// isDate was already in use by a client, so we called it FD_isDate. thats wy the isDate is not initially included in the FDUtils
function FD_isDate(a) {
	return typeof a == 'date' || a instanceof Date;
//	return Object.toType(a) == 'date';
}


Date.is = FD_isDate;
Object.is = __tmp.isObject;
String.is = __tmp.isString;
Number.is = __tmp.isNumber;
Array.is = __tmp.isArray;
Boolean.is = __tmp.isBoolean;
Function.is = __tmp.isFunction;
Math.between = __tmp.inBetween;

if (!window.getComputedStyle) {
	window.getComputedStyle = function(el, pseudo) {
		this.el = el;
		this.getPropertyValue = function(prop) {
			var re = /(\-([a-z]){1})/g;
			if (prop == 'float') prop = 'styleFloat';
			if (re.test(prop)) {
				prop = prop.replace(re, function () {
					return arguments[2].toUpperCase();
				});
			}
			return el.currentStyle && el.currentStyle[prop] ? el.currentStyle[prop] : null;
		}
		return this;
	}
}

//--> MooTools

/*
(function () {
	var _Implements = Class.Mutators['Implements'];
	Class.Mutators['Implements'] = function (items) {

		if (!this.$implements) this.$implements = [];
		this.$implements.add(Array.from(items));

		_Implements.call(this, items);
	}

})();
*/

/*
	extends the Mootools Event class with event firering functionality 
	by which an event can prevent further execution of the event chain and/or the code after where fireDecision is called
*/
Events.implement({

	_preventDefault: false,
	_stopPropagation: false,

	preventDefault: function () {
		this._preventDefault = this._stopPropagation = true;
	},
	stopPropagation: function () {
		this._stopPropagation = true;
	},
	addEventsFromOptions: function (options) {
		var clear = options && Boolean.is(options.clear) && options.clear;
		for (var option in options) {
			if (!Function.is(options[option]) || !(/^on[A-Z]/).test(option)) continue;
			if (clear) {
				this.clearEvents(option);
			}
			this.addEvent(option, options[option]);
			delete options[option];
		}
		return this;
	},
	queueEvent: function (type, fn) {
		type = String.removeOn(type);
		if (typeof this['_' + type.toLowerCase()] != 'undefined' && this['_' + type.toLowerCase()]) {
			fd.apply(this);
		} else {
			this.addEvent(type, fn);
		}
		return this;
	},
	fireEvent: function (type, args, delay, final) {
		type = String.removeOn(type);
		var events = this.$events[type], onces = 0, index = -1, trace = this._traceEvents && (!this._traceEventsExclude || !this._traceEventsExclude.seek(type));
		if (!events || events.length == 0) return this;
		args = Array.from(args);
		if (trace) this.log('.fireEvent, type=' + type + ', length=' + events.length, 'group');
		events.each(function (fn) {
			index++;
			if (trace) this.log('.fireEvent, type=' + type + ', index=' + index, 'group');
			try {
				if (delay) fn.delay(this, delay, args);
				else fn.apply(this, args);
				if (fn.once) onces++;
			} catch (e) {
				this.log('.fireEvent.ERROR, type=' + type + ', index=' + index + '/' + events.length + ', e=' + (e.message || e) + ', func=' + fn, 'error', true);
			}
			if (trace) this.log('', 'groupEnd');
		}, this);
		//if (trace) this.log(onces + ' Onces to remove... (length=' + events.length + ')');
		if (onces > 0) {
			for (var i = events.length - 1; i >= 0; i--) {
				if (!events[i] || events[i].once) {
					delete events[i];
					events.splice(i, 1);
				}
			}
			//if (trace) this.log(onces + ' removed (length=' + events.length + ')');
		}
		if (Function.is(final)) final.apply(this, args);
		if (trace) this.log('', 'groupEnd');
		return this;
	},
	fireDecision: function (type, args) {
		this._preventDefault = this._stopPropagation = false;
		type = String.removeOn(type);
		var events = this.$events[type];
		if (!events) return true;
		args = Array.from(args);
		$(events).each((function (index, fn) {
			var retval = fn.apply(this, args);
			if (typeof retval == 'boolean' && !retval) this.preventDefault();
			if (this._stopPropagation) return false;
		}).bind(this));
		return !this._preventDefault;
	},
	addEvent: function (type, fn, internal, index) {
		type = String.removeOn(type);
		if (arguments.length <= 3) {
			this.$events[type] = (this.$events[type] || []).include(fn);
		} else {
			this.$events[type] = (this.$events[type] || []).insert(index, fn);
		}
		if (internal) fn.internal = true;
		return this;
	},
	addOnce: function (type, fn) {
		fn.once = true;
		return this.addEvent(type, fn);
	},
	hasEvent: function (type, fn) {
		type = String.removeOn(type);
		if (!fn) return typeof this.$events[type] != 'undefined';
		else {
			if (typeof this.$events[type] == 'undefined') return false;
			for (var i = 0, len = this.$events[type].length; i < len; i++) {
				if (this.$events[type][i].compare(fn)) return true;
			}
		}
		return false;
	},
	removeEvent: function (type, fn) {
		type = String.removeOn(type);
		var events = this.$events[type];
		if (events) {
			for (var i = events.length - 1; i >= 0; i--) {
				if (events[i] && events[i].compare(fn)) {
					this.log('.removeEvent, type=' + type + ', index=' + i);
					events.remove(i);
				}
			}
		}
		return this;
	},
	clearEvents: function (type) {
		if (type) {
			type = String.removeOn(type);
			var events = this.$events[type];
			if (!events) return this;

			for (var i = events.length - 1; i >= 0; i--) {
				if (!events[i] || !events[i].internal) {
					delete events[i];
				}
			}
			//this.$events[type] = [];
		} else {
			this.$events = {};
		}
		return this;
	}
});

(function () {
	
	var types = { log: 'log', info: 'info', error: 'error', group: 'group', groupEnd: 'groupEnd' }, less_ie = FD.Browser.less('ie', 9, true);
	if (less_ie) {
		types.group = types.groupEnd = 'log';
	}
	if (!window.console) { var f = function () {}; console = {}; for (var t in types) { console[t] = f; } };

	this.FDBaseFunctions = {
		
		_guid: '',

		namespace: '',
		options: {},
		_proxy: {},

		_trace: false,
		_traceEvents: false,
		
		$$family: function (type) {
			//console.log('$family, type='+ type + ', ' + typeof this.parent);
			try {
				if (type && type == Object.BASETYPE && this._class) return this._class.toLowerCase();
				else return 'object';
			} catch (e) {
				console.log(e, 'error');
				return 'object';
			}
		},
		createProxies: function (proxies) {
			if (proxies) this._proxy = Object.extend({}, this._proxy, proxies);
		},
		log: function (log, type, force) {
			if ((FD._trace && this._trace && window.console) || force) {
				try {

					if (!this._guid) this._guid = this.getUniqueID();

					var caller = this.log.caller, cname = '', end = type == 'groupEnd';
					if (end && log !== '') type = 'log';

					if (!this._class && caller && (caller.$$name || ((caller = caller.caller) && caller.$$name) || (caller && (caller = caller.caller) && caller.$$name))) {
						/*
							The caller can be the String.log. In that case we need the caller of the caller.
							But when the caller of the caller is a function of a class, this function is actualy a mootools wrapper which calls the real function with an apply. In those cases we need the caller of the caller of the caller (third level).
						*/
						var cname = caller.$$name, instance = caller.$$instance, owner = caller.$$owner;
						if (instance) cname = instance._class + '<instance>.' + cname;
						else if (owner) cname = owner._class + '<class>.' + cname;
					}
					var prefix = (this._guid || '') + ', ' + (this._class || this.type ? (this._class || this.type) + (this.Name || this.name ? '[' + (this.Name || this.name) + ']' : '') : cname), item, groupEnd = false;
					type = types[type || 'log'];
					if (Array.is(log)) {
						if (/%/.test(log[0])) {
							if (log[0].left(2) == '%c') {
								if (FD.Browser.webkit) prefix = '%c' + prefix;
								else log.remove(1);
								log[0] = log[0].substr(2);
							}
							log[0] = prefix + (log[0].left(1) != '.' && (this._class || this._type || cname) ? ' -> ' : '') + log[0];
							console[type].apply(window.console, log);
						} else {
							item = log.shift();
							if (String.is(item)) { groupEnd = true; console[types.group](prefix + (item.left(1) != '.' && (this._class || this._type || cname) ? ' -> ' : '') + item); }
							else console[type](item);
							while (log.length > 0) {
								item = log.shift();
								if (String.is(item)) console[type]((!groupEnd ? prefix + (item.left(1) != '.' && (this._class || this._type || cname) ? ' -> ' : '') : '') + item);
								else {
									if (less_ie && Object.is(item)) console[type](Object.inspect(item));
									else console[type](item);
								}
							}
							if (groupEnd) console[types.groupEnd]();
						}
					} else {
						if (String.is(log)) console[type](prefix + (log.left(1) != '.' && (this._class || this._type || cname) ? ' -> ' : '') + log);
						else console[type](log);
					}

					if (end && log !== '') console['groupEnd']();

				} catch (e) { console.error(e); }
			}
		},
		logEnd: function (retval) {
			this.log('', 'groupEnd');
			return retval
		},
		getUniqueID: function () {
			return String.uniqueID();
		},
		_textCache: {},
		getText: function () { //text, key, prefix
			
			var options = (!String.is(arguments[0]) ? arguments[0] : null),
				text = (options ? options.text : arguments[0]),
				prefix = (options && options.prefix ? options.prefix : arguments[2] || ''),
				key = (options && options.key ? options.key : (arguments[1] ? arguments[1] : (this.options && this.options.textKey ? this.options.textKey : ''))),
				texts = (options && options.texts ? options.texts : (this.options && this.options.texts ? this.options.texts : FD.Texts));

			//this.log('.getText, text=' + text + ', prefix=' + prefix + ', key=' + key);

			if (!text || /[^A-Z0-9_]/.test(text)) return text || '';
			var tkey = key.append(prefix.append(text, '_'), '.');
			if (!texts.exists(tkey)) tkey = key.append(text, '.'); // without prefix
			return texts.get(tkey, (options && typeof options.alt != 'undefined' ? options.alt : text));
			
			/*
			var options = arguments[0];
			if (arguments.length > 1 || String.is(text)) options = { text: text, key: key || null, prefix: prefix };
			var texts = (options.texts ? options.texts : (this.options && this.options.texts ? this.options.texts : FD.Texts));
			if ((typeof options.key == 'undefined' || options.key == null) && this.options && this.options.textKey) options.key = this.options.textKey;

			try {
				if (!options.text || /[^A-Z0-9_]/.test(options.text)) return options.text || '';
				var tkey = (options.key || '').append((options.prefix || '').append(options.text, '_'), '.');
				if (!texts.exists(tkey)) tkey = (options.key || '').append(options.text, '.'); // without prefix
				return texts.get(tkey, (typeof options.alt != 'undefined' ? options.alt : options.text));
			} catch (e) {
				alert('getText, error=' + (e.message || e));
			}*/
			return '';
		},

		setOptions: function () {
			var options = this.options = FDOptions.create(this.options).mergeArray(arguments); // Object.extend.apply(Object, [{}, this.options].append(arguments));
			if (this.addEvent && this.addEventsFromOptions) {
				this.addEventsFromOptions(options);
			}
			if (this.$themed && this.getTheme) this.getTheme();
			return this;
		},
		_getDefaultOptions: function (options, defaults) {
			var def = this.getDefaultOptions();
			if (this.$themed && this.getTheme) def = $.extend(FDThemeBase.defaults, def);
			if (Object.is(defaults) || FDOptions.is(defaults)) this.defaults = Object.extend({}, def || {}, defaults);
			if (def) options = FDOptions.create(def, options);
			return options;
		},
		getDefaultOptions: function (parent) {
			parent = parent || this;
			if (typeof this.__proto__ != 'undefined') {
				var def = (parent.__proto__ && parent.__proto__.$constructor ? this.getDefaultOptions(parent.__proto__) : null);
			} else {
				var def = (parent.$constructor && parent.$constructor.parent ? this.getDefaultOptions(parent.$constructor.parent.prototype) : null);
			}
			if (parent.$constructor.defaults) def = Object.extend({}, def, parent.$constructor.defaults);
			return def;
		},
		getParentClass: function () {
			if (typeof this.__proto__ != 'undefined') {
				if (this.__proto__ && typeof this.__proto__._class != 'undefined' && this.__proto__._class != this._class) return this.__proto__;
				if (this.__proto__ && this.__proto__.__proto__ && typeof this.__proto__.__proto__._class != 'undefined') return this.__proto__.__proto__;
			} else {
				if (this.$constructor && typeof this.$constructor.parent != 'undefined' && typeof this.$constructor.parent.prototype._class != 'undefined') return this.$constructor.parent.prototype;
			}
			return null;
		},
		getRootClass: function () {
			var root = this.getParentClass();
			if (typeof this.__proto__ != 'undefined') {
				while (root && typeof root.__proto__._class != 'undefined') root = root.__proto__;
			} else {
				while (root && typeof root.$constructor && root.$constructor.parent && root.$constructor.parent.prototype._class) root = root.$constructor.parent.prototype;
			}
			return root;
		},
		getClassChain: function () {
			var chain = [this._class], root = this.getParentClass();
			if (typeof this.__proto__ != 'undefined') {
				while (root && typeof root.__proto__._class != 'undefined') { chain.push(root._class); root = root.__proto__; }
			} else {
				while (root && typeof root.$constructor && root.$constructor.parent && root.$constructor.parent.prototype._class) { chain.push(root._class); root = root.$constructor.parent.prototype; }
			}
			if (root) chain.push(root._class);
			chain.reverse();
			return chain.join('::');
		}
		
	};
})();

Class.implement(
	$.extend({ 
		is: function (type) { return type != null && ((type instanceof this) || (typeof type._class != 'undefined' && type._class == this.prototype._class)); }
	}, FDBaseFunctions)
);

(function () {
	var _extend = Function.prototype.extend;
	Function.prototype.extend = function () {
		_extend.apply(this, arguments);
		if (arguments.length == 1 && typeof arguments[0] == 'object' && this.prototype && this.prototype._class) {
			var obj = arguments[0];
			for (var f in obj) {
				if (typeof obj[f] == 'function') {
					obj[f].$$name = f;
					obj[f].$$owner = this.prototype;
				}
			}
		}
		return this;
	}
})();

/* Extend the base FD namespace object with the base functions and event prototype functions */
var __trace = FD._trace;
$.extend(FD, FDBaseFunctions, Events.prototype);
// reset the _trace value
FD._trace = __trace;


// this is our baseclass for all (or most) classes
var FDBaseClass = new Class({

	_class: 'FDBaseClass',

	clonable: false,
	namespace: '',
	options: {},

	_namespacePrefix: 'fd',

	initialize: function (options, defaults) {
		if (this._guid == '') this._guid = this.getUniqueID();
		
		options = this._getDefaultOptions(options, defaults);
		this.setOptions(options);

		this.createProxies();
		if (this.namespace && this._namespacePrefix) {
			this.namespace = this._namespacePrefix.append(this.namespace, '-');
		}

		for (var f in this) {
			if (typeof this[f] == 'function' && !this[f].$$name) {
				this[f].$$name = f;
				this[f].$$instance = this;
			}
		}

	},

	clone: function (options) {
		if (!this.clonable) return this;
		this.log('.clone');
		var clone = new this.$constructor();
		Object.extend(clone, this);
		if (options) clone.setOptions(options);
		return clone;
	}

}).implement(FDBaseFunctions);

var FDOptions = (new Type('FDOptions', function (options, events) {

	if (options) {
		$.extend(this, options);
	}
	if (events) {
		this.addEventsFromOptions(events);
	}

})).implement(
	$.extend({}, FDBaseFunctions, Events.prototype, {
		extendTo: function (destination) {
			for (var property in this) {
				if (!this.hasOwnProperty(property) || property.left(1).list('_', '$') || property.list('caller', 'events', 'options', '_guid', '_owner')) continue;
				destination[property] = this[property];
			}
		},
		merge: function () {
			for (var i = 0; i < arguments.length; i++) {
				Object.extend(true, this, arguments[i]);
			}
			return this;
		},
		mergeArray: function (arr) {
			for (var i = 0; i < arr.length; i++) {
				if (arr[i]) Object.extend(true, this, arr[i]);
			}
			return this;
		},
		getValue: function (name, type, alt) { // choosen for a longer function name to avoid option name collision
			var value = (typeof this[name] == 'undefined' ? (arguments.length == 3 ? alt : null) : this[name]);
			if (type && typeof value != type) return String.create(value).toType(type);
			return value;
		},
		setValue: function (name, value) {
			this[name] = value;
			return this;
		},
		setDefaults: function (defaults) {
			for (var prop in defaults) {
				this.setDefault(prop, defaults[prop]);
			}
			return this;
		},
		setDefault: function (name, value) {
			if (typeof this[name] == 'undefined') this[name] = value;
			return this;
		}
	})
).extend({
	is: function (options) { return (options instanceof FDOptions); },
	create: function (options) {
		var args = $A(arguments), options = (this.is(args[0]) ? args.shift() : new FDOptions(args.shift()));
		if (args.length > 0) options.mergeArray(args);
		return options;
	}
});

var FDDeferred = new Class({
	deferred: null,
	makeDeferred: function () {

		// always a new deferred object
		this.deferred = new $.Deferred();
		// attach the deferred event handling methods to this object (make it a Promise)
		this.deferred.promise(this);

		return this;
	}
})

// this class is to be implemented
var FDThemeBase = new Class({
	$themed: true,
	getTheme: function () {
		var options = this.options, className = '';
		if (!options.label) {
			// privatelabel defaults
			options.label = FD.Label.getInfo('img'); // { path: ..., version: ... }
		}
		if (options.theme) $.each(options.theme.split(","), function (i, n) { className = className.append(options.themePrefix + n, ' '); });
		if (!options.orgClassName) options.orgClassName = options.className;
		options.className = className;
	}
}).extend({
	defaults: {
		// style defaults
		className: '',
		themePrefix: 'theme-',
		theme: 'default',
		// fade defaults
		fadeIn: 200,
		fadeOut: 100
	}
});

// this class is to be implemented
var FDButtonBase = new Class({

	createButton: function (suffix, className, label, onclick, rtype, focus) {
		var options;
		if (arguments.length > 1) {
			options = { suffix: suffix || '', className: className || '', label: label || '', onclick: onclick || null, rtype: rtype || 0, focus: focus || false };
		} else {
			options = arguments[0];
		}

		if (!options.proxyClick && this._proxy.buttonClick) options.proxyClick = this._proxy.buttonClick;
		return FDButtonFactory.create(options);
	}
});
var FDButtonFactory = {
	create: function (options) { // options = { suffix, className, buttonClassName, label, onclick, rtype, focus }

		var button = $('<div role="button" tabindex="0"></div>', options.document || document), id = options.id || String.uniqueID();
		button.prop('id', id);

		button.addClass('button' + (options.suffix ? '-' + options.suffix : ''));
		if (options.suffix == 'icon') {
			button.append('<span role="none presentation" aria-hidden="true" class="icon icon-' + options.className + '"></span>');
			if (options.buttonClassName) button.addClass(options.buttonClassName);
			if (options.fontSizeTo) button.data('fontSizeTo', options.fontSizeTo);
		} else if (options.suffix == 'fa') {
			button.append('<span role="none presentation" aria-hidden="true" class="fa fa-' + options.className + '"></span>');
			if (options.buttonClassName) button.addClass(options.buttonClassName);
			if (options.fontSizeTo) button.data('fontSizeTo', options.fontSizeTo);
		} else if (options.suffix == 'svg') {
			button.append('<span role="none presentation" aria-hidden="true" class="svg svg-' + options.className + '"><img class="svg" src="' + options.image + '"></span>');
			if (options.buttonClassName) button.addClass(options.buttonClassName);
			if (options.fontSizeTo) button.data('fontSizeTo', options.fontSizeTo);
		} else {
			button.addClass(options.className);
		}
		this.bind(button, null);
/*!remove		button.bind({
			focus: BTN.Focus,
			blur: BTN.Blur,
			mouseenter: function (e) { BTN.MouseOver(e, null); },
			mouseleave: function (e) { BTN.MouseOut(this); }
		});*/

		if (options.label) button.attr('aria-labelledby', id + '_label').append('<span class="text" id="' + id + '_label">' + (options.suffix == 'icon' ? '&nbsp;' : '') + String.stripHTML(unescape(options.label)) + '</span>');

		if (String.is(options.tooltip) && typeof FDTooltip == 'undefined') button[0].title = options.tooltip;
		else if (options.tooltip) {
			// aria-owns="' + id + '" (dit komt uit onderstaande tooltip html)
			button.append($('<div role="tooltip" id="' + id + '-tooltip" aria-hidden="false" style="display:none"></div>').html((Function.is(options.tooltip) ? options.tooltip() : options.tooltip)));
			button.attr((options.label ? 'aria-describedby' : 'aria-labelledby'), id + '-tooltip'); //.attr('aria-owns', id + '-tooltip');
		}
		
		if (options.title) button[0].title = options.title;

		if (options.focus) button.prop('id', 'btnFocus').addClass('button-focus');
		if (options.rtype) button.data('rtype', options.rtype);
		if (options.onclick) {
			var _click = function (e) { cancelEvent(e); if (this.disabled || $(this).hasClass('button-disabled')) return; if (typeof FDTooltip != 'undefined') FD.Tooltip.hide(); options.onclick.call(this, e); }
			button.on({
				click: _click,
				keydown: function (e) { if (e.keyCode.list(13, 32)) { _click(e); e.stopImmediatePropagation(); return false; } }
			});
		} else if (options.proxyClick) {
			button.on({
				click: options.proxyClick,
				keydown: function (e) { if (e.keyCode.list(13, 32)) { options.proxyClick(e); e.stopImmediatePropagation(); return false; } }
			});
		}

		return button;
	},
	bind: function (button, events) {

		if (events == null && typeof BTN == 'undefined' /* only available in backend */) return;

		events = Object.extend({
			'focus.factory': BTN.Focus,
			'blur.factory': BTN.Blur,
			'mouseenter.factory': function (e) { BTN.MouseOver(e, null); },
			'mouseleave.factory': function (e) { BTN.MouseOut(this); }
		}, events);

		button.off('.factory').bind(events);

	}
}

/* Create a subclassable type of object which mimics the behaviour of an array */
var FDArray = this.FDArray = function () {
	if (arguments.length > 0) this.push.apply(this, arguments);
};

FDArray.prototype = { length: 0, type: 'FDArray', _class: 'FDArray' };
FDArray.parent = Array;

new Type('FDArray', FDArray).implement(
	Object.extend({},
		FDBaseFunctions,
		{
			clone: function () { return new this.$constructor(this); } .protect(),
			push: function () {
				var length = this.length;
				for (var i = 0, l = arguments.length; i < l; i++) {
					this[length++] = arguments[i];
				}
				return (this.length = length);
			} .protect(),
			toString: function () {
				var ret = [];
				for (var i = 0, l = this.length; i < l; i++) {
					ret.push(this[i]);
				}
				return ret.join(',');
			},
			toXml: function () {
				var options = $.extend({ root: (this.options && this.options.root ? this.options.root : (this.name || 'array')), pair: (this.options && this.options.pair ? this.options.pair : 'item'), indent: 0 }, arguments[0]), indent_str = (options.indent > 0 ? '\t'.times(options.indent) : ''), string = (options.root ? indent_str + '<' + options.root + '>\n' : '');
				for (var i = 0, l = this.length, item; i < l; i++) {
					item = this[i];
					if (Object.is(item) || FDArray.is(item)) {
						//this.log(['.toXml', item]);
						if (item.toXml) string += item.toXml({ root: options.pair, indent: options.indent + 1 }) + '\n';
						else string += Object.toXml(item, { root: options.pair, indent: options.indent + 1 }) + '\n';
					} else {
						string += indent_str + '\t<' + options.pair + '>' + String.create(item).xmlencode(true) + '</' + options.pair + '>\n';
					}
				}
				if (options.root) {
					string += indent_str + '</' + options.root + '>';
				} else {
					string = string.substr(0, string.length - 1);
				}
				return string;
			}
		}
	)
);

(function () {

	// FF, IE
	var splice = Array.prototype.splice, object = { '0': 0, '1': 1, length: 2 };

	splice.call(object, 1, 1);
	if (object[1] == 1) FDArray.implement('splice', function () {
		var length = this.length;
		var result = splice.apply(this, arguments);
		while (length >= this.length) delete this[length--];
		return result;
	} .protect());
	Array.forEachMethod(function (method, name) {
		FDArray.implement(name, method);
	});

	Array.mirror(FDArray);

})();
FDArray.is = function (arr) { return arr !== null && (arr instanceof this); }

//--> Specialized Array Objects

var FDKeyValuePair = new Class({
	
	Extends: FDBaseClass,
	_class: 'FDKeyValuePair',

	orgKey: '',
	orgValue: null,

	lkey: '',
	key: '',
	value: null,
	changed: false,
	attributes: null,
	order: -1,

	initialize: function (key, value) {
		this.orgKey = key || '';
		this.orgValue = value || '';
		this.setKey(this.orgKey).setValue(this.orgValue);
		this.changed = false;
	},
	setKey: function (key) {
		this.key = key;
		this.lkey = key.toLowerCase();
		return this;
	},
	setValue: function (value) {

		var current = this.getValue(), dt;
		this.changed = current != value;

		if (typeof current != typeof value && this.attributes && (dt = this.attributes.filter(/[^:]*:?dt/)).length > 0) {
			for (var i = 0; i < dt.length; i++) {
				if (!Object.compareXmlType(value, dt[i].getValue())) {
					//alert(value + ', ' + typeof value + ' / ' + Object.getXmlType(value));
					this.attributes.set(dt[i].key, Object.getXmlType(value));
				}
			}
		}
		this.value = value;
		return this;
	},
	getValue: function () {
		if (this.value && String.is(this.value)) {
			return this.value.toString();
		}
		return this.value;
	},
	clone: function () {
		return (new this.$constructor(this.key, this.value));
	},
	toString: function (options) {
		if (!options) {
			return this.key + '=' + this.getValue();
		} else {

			var pairChar = options.pairChar || '=',
				enclose = typeof options.encloseChar != 'undefined',
				encloseBegin = (enclose ? options.encloseChar.left(1) : ''),
				encloseEnd = (enclose ? options.encloseChar.right(1) : ''),
				value = this.getValue();

			return this.key + pairChar + encloseBegin + (options.encode ? (String.is(options.encode) ? value.encode(options.encode) : value.htmlencode()) : value) + encloseEnd;

		}
	}
}).extend({
	parse: function (kv, decode) {
		var match = /([^=]*)=?(.*)?/.exec(kv), item = ['', '']; //kv.split('=');
		if (match) {
			if (typeof match[1] != 'undefined') item[0] = (decode ? decodeURIComponent(match[1]) : match[1]);
			if (typeof match[2] != 'undefined') item[1] = (decode ? decodeURIComponent(match[2]) : match[2]);
		}
		//String.log(['FDKeyValuePair.parse', match, item]);
		return item;
	}
});

var FDKeys = new Class({

	Extends: FDArray,
	Implements: Events,
	_class: 'FDKeys',

	_trace: false,
	_keyvalueClass: FDKeyValuePair,

	type: 0,
	realtype: false, // if realtype = false then values other than type object and function are converted to type string
	changed: false, // keeps track of changes made to the keys or values

	initialize: function (nodes, options) {
		if (this._guid == '') this._guid = this.getUniqueID();

		this.log('.initialize', 'group');

		options = $.extend({}, this.getDefaultOptions()/*, FDKeys.defaults*/, options);

		if (options.realtype) this.realtype = options.realtype;
		if (options.keyvalueClass) {
			this._keyvalueClass = options.keyvalueClass;
			delete options.keyvalueClass;
		}
		this.setOptions(options);

		if (nodes) {
			this.add(nodes, options && options.decode);
			this.changed = false;
		}

		//this.log(['.initialize, length=' + this.length, this]);

		this.log('', 'groupEnd');
	},

	create: function (key, value) {
		return (new this._keyvalueClass(key, value));
	},

	push: function () {
		if (arguments.length == 2 && typeof arguments[0] == 'string') {
			this.set(arguments[0], arguments[1]);
		} else {
			for (var i = 0; i < arguments.length; i++) {
				if (this._keyvalueClass.is(arguments[i])) {
					this.set(arguments[i].key, arguments[i].value);
				} else if (Array.is(arguments[i])) {
					this.set(arguments[i][0], arguments[i][1]);
				} else {
					this.set(arguments[i], '');
				}
			}
		}
		return this;
	},
	concat: function (items) {
		this.push(items);
	},
	merge: function (items) {
		//this.log('.merge, items=' + items);
		if (arguments.length > 1) {
			for (var i = 0, len = arguments.length; i < len; i++) {
				this.merge(arguments[i]);
			}
		} else {
			if (!Object.is(items) && items.length == 0) return this;
			if (Object.is(items) || Array.is(items[0]) || FDKeys.is(items) || this._keyvalueClass.is(items[0])) { // consider all items to be an array
				this.add(items);
			} else if (String.is(items)) {
				this.add(items.split(this.options.splitChar.trim()), true);
			} else { // flat array with key,value,key,value pairs
				for (var i = 0, len = items.length; i < len; i += 2) {
					this.set(items[i], items[i + 1], true);
				}
			}
		}
		return this;
	},
	add: function (items, decode, realtype) {
		var i, item;
		if (realtype) this.realtype = realtype;
		if (String.is(items)) items = items.split(this.options.splitChar.trim());
		//this.log('.add, items=' + items + ', ' + FDKeys.is(items));
		if (Array.is(items) || FDKeys.is(items)) {
			for (i = 0; i < items.length; i++) {
				item = items[i];
				//this.log('.add, item=' + item + ', ' + FDKeyValuePair.is(item));
				if (typeof item == 'string') {
					item = this._keyvalueClass.parse(item, decode);
					//this.log(['.add', item]);
					this.set(item[0], item[1], true);
				} else if (Array.is(item)) {
					this.set(item[0], item[1], true)
				} else if (this._keyvalueClass.is(item)) {
					this.set(item.key, item.value, true);
				} else if (item && typeof item.clone != 'undefined') {
					this.push(item.clone());
				}
			}
			this.changed = true;
		} else if (this._keyvalueClass.is(items)) {
			this.set(items.key, items.value, true);
		} else if (Object.is(items)) {
			for (item in items) {
				this.set(item, items[item], true);
			}
		}
		return this;
	},
	item: function (name) {
		var item = null, len = this.length;
		name = name.toLowerCase();
		while (len--) {
			if (this[len].lkey == name) { item = this[len]; break; }
		}
		return item;
	},
	get: function (name) { // [, alt, type, decode] or [, options]
		name = name.toLowerCase();
		if (arguments.length > 1 && Object.is(arguments[1])) {
			var options = arguments[1], alt = options.alt || null, type = options.type || null, decode = options.decode || false;
		} else {
			var alt = typeof arguments[1] != 'undefined' ? arguments[1] : null, type = arguments[2] || (alt != null ? typeof alt : null), decode = arguments[3] || false;
		}
		var item = this.item(name), val = (item == null ? '' : item.value);
		if (item == null && arguments.length > 1 && alt != null) return alt;
		if (decode) {
			val = (typeof decodeURIComponent != 'undefined' ? decodeURIComponent(val) : URLDecode(val));
		}
		if (arguments.length < 3 && alt != null) type = typeof alt;
		else if (arguments.length < 3 || type == null) return val;
		if (typeof val == 'function') val = val();
		else if (typeof val == 'object') val = val.toString();
		val = String.create(val).toType(type);
		return val;
	},
	exist: function (name) {
		return this.exists(name);
	},
	exists: function (name) {
		return (this.item(name) != null);
	},
	index: function (name) {
		name = name.toLowerCase();
		var len = this.length;
		while (len--) {
			if (this[len].lkey == name) return len;
		}
		return -1;
	},
	set: function () {
		if (arguments.length > 1) {
			var length = this.length || 0, index = -1, args = $A(arguments), name = args.shift(), lc_name = name.toLowerCase(), value = args.shift();
			if (name == '') return index;
			if (!this.realtype) {
				if (value == null) {
					return this.remove(name);
				} else {
					value = (typeof value == 'string' ? value : (!(typeof value).list('object', 'function') ? new String(value) : value));
				}
			}

			if (lc_name == '#last') index = this.length - 1;
			else if (lc_name == '#first') index = 0;
			else index = this.index(lc_name);

			if (index == -1) {
				index = length++;
				this[index] = new this._keyvalueClass(name, value); // new Array(name, value);
				this.changed = true;
			} else {
				//this[index][0] = name;
				this.changed = this.changed || this[index].value != value;
				if (args.length > 0) { args.unshift(value); this[index].setValue.apply(this[index], args); }
				else this[index].setValue(value);
			}
			this.length = length;
		} else if (this._keyvalueClass.is(arguments[0])) {
			this.set(arguments[0].key, arguments[0].value);
		} else if (FDKeys.is(arguments[0])) {
			this.add(arguments[0]);
		} else if (Object.is(arguments[0])) {
			var items = arguments[0];
			for (var item in items) {
				this.set(item, items[item]);
			}
		}
		return this;
	},
	remove: function () {
		var key = (arguments.length > 1 ? arguments[1] : 'lkey');
		if (Number.is(arguments[0])) {
			this.splice(arguments[0], 1);
			this.changed = true;
		} else if (Array.is(arguments[0])) {
			for (var i = 0; i < arguments[0].length; i++) {
				this.remove(arguments[0][i], key);
			}
		} else if (typeof arguments[0] == 'object') { // asume a regex object
			var re = arguments[0];
			for (var i = this.length - 1; i >= 0; i--) {
				if (re.test(this[i][key])) { this.splice(i, 1); this.changed = true; }
			}
		} else {
			var name = arguments[0].toLowerCase();
			for (var i = this.length - 1; i >= 0; i--) {
				if (this[i][key] == name) { this.splice(i, 1); this.changed = true; if (key == 'lkey') break; }
			}
		}
		return this;
	},
	removeByValue: function () {
		this.remove.call(this, arguments[0], 'value');
		return this;
	},
	filter: function (filter, exclude) {
		if (String.is(filter)) filter = filter.split(',');
		var k = new this.$constructor(), item;
		if (!Array.is(filter)) { // consider to be an regexp object
			for (var i = 0; i < this.length; i++) {
				if (filter.test(this[i].key)) {
					if (!exclude) k.push(this[i]);
				} else if (exclude)
					k.push(this[i]);
			}
		} else {
			for (var i = 0; i < this.length; i++) {
				//if (exclude) String.log('.filter, key=' + this[i].key + ', seek=' + filter.seek(this[i].key));
				if (filter.seek(this[i].key)) {
					if (!exclude) k.push(this[i]);
				} else if (exclude)
					k.push(this[i]);
			}
		}
		//String.log(['.filter, exclude=' + exclude, filter, k]);
			/*for (var i = 0; i < filter.length; i++) {
				if (Object.toType(filter[i], true) == 'regexp') k.merge(this.filter(filter[i], exclude));
				else {
					item = this.keySearch(filter[i]);
					if (item) k.push(item);
				}
			}*/

		return k;
	},
	prefix: function (prefix) {
		var len = this.length, item;
		while (len--) {
			if ((item = this[len])) item.setKey(prefix + item.key);
		}
		return this;
	},
	suffix: function (suffix) {
		var len = this.length, item;
		while (len--) {
			if ((item = this[len])) item.setKey(item.key + suffix);
		}
		return this;
	},
	keySearch: function (key) {
		return this.item(key);
	},
	keyChange: function (key, newKey) {
		var index = this.index(key);
		if (index > -1) {
			this[index].setKey(newKey);
			return true;
		}
		return false;
	},
	getKeys: function () {
		var keys = [];
		for (var i = 0, len = this.length; i < len; i++) {
			if (this[i]) keys.push(this[i].key);
		}
		return keys;
	},
	getDiff: function (compare) {
		var diff = new this.$constructor(), item, i, key;
		String.log(['.getDiff', compare], 'group');
		if (!compare || compare.length == 0) return diff;

		for (i = 0; i < this.length; i++) {
			item = compare.item(this[i].key);
			String.log(['.getDiff', this[i], item]);
			if (!item || item.getValue() !== this[i].getValue()) {
				diff.add(this[i]);
			}
		}
		//String.log(diff);
		String.log('', 'groupEnd');
		return diff;
	},
	toString: function () {
		var type = this.type;
		if (Object.is(arguments[0])) {
			if (Number.is(arguments[0].type)) type = arguments[0].type;
			if (!type && Number.is(arguments[0].typeIfUnknown)) type = arguments[0].typeIfUnknown;
		}
		switch (type) {
			case FDKeys.ATTRIBUTES:
				return this.toStringAttr.apply(this, arguments);
				break;
			case FDKeys.XML:
				return this.toXml.apply(this, arguments);
				break;
			case FDKeys.JSON:
				return this.toJson.apply(this, arguments);
				break;
			case FDKeys.PAIR_ATTRIBUTES:
				return this.toPairAttributes.apply(this, arguments);
			default:
				return this.buildString.apply(this, arguments);
		}
	},
	join: function (options) {
		if (String.is(options)) {
			return this.parent.apply(this, arguments);
		} else {

			var arr = [];
			for (var i = 0, len = this.length; i < len; i++) {
				arr.push(this[i].toString(options));
			}
			return arr.join(options.char);

		}
	}

}).implement({

	fromPairAttributes: function (attributes) {
		this.type = FDKeys.PAIR_ATTRIBUTES;
		if (!attributes) return this;
		var self = this;
		$(attributes).each(function () {
			self.set(this.name, this.value);
		});
		return this;
	},
	toPairAttributes: function (options) {
		if (!options) {
			options = { char: ' ', pairChar: '=', encloseChar: '"', encode: 'attribute' };
		}
		return this.join(options);
	},
	toQueryString: function () { return this.buildString.apply(this, arguments); }, // always return a querystring representation
	// build a url parameter string
	buildString: function () { // [bookmark, ]char, suffix, appendEmptyValues
		var args = $A(arguments),
			options = (Object.is(args[0]) ? args.shift() : null),
			bookmark = (options ? options.bookmark || false : (Boolean.is(args[0]) ? args.shift() : false)),
			splitChar = (options ? options.splitChar : (args.length > 0 ? args.shift() || this.options.splitChar : this.options.splitChar)),
			keyvalueChar = (options ? options.keyvalueChar : this.options.keyvalueChar),
			suffix = (options ? options.suffix : (args.length > 0 ? args.shift() : '')),
			appendEmptyValues = (options ? options.appendEmptyValues || false : (args.length > 0 ? args.shift() : this.options.appendEmptyValues)),
			ignoreEmptyValues = (options ? options.ignoreEmptyValue || this.options.ignoreEmptyValues : this.options.ignoreEmptyValues),
			encoder = (options ? options.encoder || this.options.encoder : this.options.encoder),
			item;

		var string = '', append = '', bm = '';
		splitChar = splitChar || this.options.splitChar;
		keyvalueChar = keyvalueChar || this.options.keyvalueChar;
		suffix = suffix || '';

		this.log('.buildString, len=' + this.length + ', splitchar=' + splitChar + ', keyvalueChar=' + keyvalueChar + ', suffix=' + suffix, 'group');

		for (var i = 0, len = this.length; i < len; i++) {
			item = this[i];
			//this.log(item);
			if (item) {
				if (item.key.charAt(0) != '#') { // it's not a bookmark
					if (typeof item.value == 'object') {
						string = string.append(encoder(item.key + suffix) + keyvalueChar + (Function.is(item.value.toString) ? encoder(item.value.toString(false, splitChar, suffix)) : '[object ' + Object.toType(item.value, true) + ']'), splitChar);
					} else {
						if (item.key.length == 0 || item.value == null || (String.is(item.value) && item.value.length == 0)) {
							if (ignoreEmptyValues && (item.value == null || item.value.length == 0)) continue;
							if (!appendEmptyValues) string = string.append(encoder(item.key + suffix) + keyvalueChar, splitChar);
							else append = append.append(encoder(item.key) + encoder(item.value || ''), splitChar);
						} else {
							string = string.append(encoder(item.key + suffix) + keyvalueChar + encoder(item.value), splitChar);
						}
					}
				} else {
					bm = item.key;
				}
			}
		}

		this.log('.buildString, string=' + string);
		this.log('', 'groupEnd');

		return string.append(append, splitChar) + (bookmark ? bm : '');
	},
	fromString: function () {
		if (String.is(arguments[0])) {
			if (arguments[0].empty()) return this;
			if (arguments[0].search('<=<') > -1) return this.fromStringAttr(arguments[0]);
			if (/<([\S]*)(?!\w)[^>]*>([\s\S]*?)<\/\1(?!\w)>/.test(arguments[0])) return this.fromXml(arguments[0]);
			if (/([^=]*)=?(.*)?/.test(arguments[0]) || arguments[0].search(this.options.splitChar) > -1) return this.fromQueryString(arguments[0]);
		}
		return this; //return this.fromQueryString.apply(this, arguments); // redirect to fromQueryString by default
	},
	// from a url parameter string
	fromQueryString: function (str) {
		this.type = FDKeys.QUERYSTRING;
		this.add(str.split(this.options.splitChar.trim()), true);
		this.changed = false;
		return this;
	},
	fromStringAttr: function (str) {
		this.type = FDKeys.ATTRIBUTES;
		this.realtype = true;
		var re = new RegExp('<=<([^\\[\\]<=>]*)(\\[[^\\[\\]]*\\])?<=>([^>=>]*)>=>', 'im'), val;
		while ((val = re.exec(str))) {
			this.set(val[1], val[3].toType((val[2] ? val[2].substr(1, 1) : '')));
			str = str.replace(re, '');
		}
		this.changed = false;
		return this;
	},
	toStringAttr: function () {
		var string = '', attr, item;
		for (var i = 0; i < this.length; i++) {
			item = this[i];
			if (item) {
				attr = (Boolean.is(item.value) ? 'l' : (Number.is(item.value) ? 'n' : ''));
				string = string.append('<=<' + item.key + (attr ? '[' + attr + ']' : '') + '<=>' + item.value + '>=>', '\n');
			}
		}
		return string;
	},
	fromXml: function (doc) {
		this.type = FDKeys.XML;
		if (doc && (!String.is(doc) || !doc.trim().empty())) {
			doc = (Object.is(doc) ? doc : FD.Ajax.stringToXMLDoc(doc));
			if (doc && doc.documentElement) {

				var root = doc.documentElement, child, item, name, attributes;
				this.rootName = root.nodeName;
				
				var attr2String = function (attributes) {
					if (!attributes) return '';
					var attrs = [];
					$(attributes).each(function () {
						attrs.push(this.name + '="' + this.value + '"');
					});
					return attrs.join(' ');
				}
				this.attributes = FDKeys.fromPairAttributes(root.attributes);
				this.rootAttributes = attr2String(root.attributes);

				this.pairName = '';
				for (var i = 0, j = root.childNodes.length; i < j; i++) {

					child = root.childNodes[i];
					if (child.nodeType != 1 /* NODE_ELEMENT */ || child.nodeName == 'parsererror') continue;
					if (!this.pairName && child.getAttribute('name')) this.pairName = child.nodeName;

					this._xmlTraverse(child);

				}
			}
		}

		this.changed = false;
		return this;
	},
	_xmlTraverse: function (node, name) {

		name = (name ? name + '/' : '') + (node.getAttribute('name') || node.nodeName);

		if (typeof node.childNodes != 'undefined' && node.childNodes.length > node.selectNodes('text()').length) {
			var child;
			for (var i = 0, j = node.childNodes.length; i < j; i++) {
				child = node.childNodes[i];
				if (child.nodeType != 1) continue;
				this._xmlTraverse(child, name);
			}
		} else {

			var attributes = FDKeys.fromPairAttributes(node.attributes);
			if (attributes.filter(/[^:]*:?dt/).length > 0) this.realtype = true;

			item = this.set(name, AJAX.getNodeValue(node, null, null, true)).item(name);
			item.attributes = attributes;

		}
	},

	toXml: function () { // rootName, pairName, indent

		this.log(['.toXml, length=' + this.length], 'group');

		var args = $A(arguments), options = $.extend({ root: (String.is(args[0]) ? args.shift() : ''), pair: (String.is(args[0]) ? args.shift() : ''), indent: 0 }, (Object.is(args[0]) ? args.shift() : {})), indent_str = (options.indent > 0 ? '\t'.times(options.indent) : ''), /*rootName = (String.is(args[0]) ? args.shift() : ''), pairName = (String.is(args[0]) ? args.shift() : ''), indent = (Number.is(args[0]) ? args.shift() : 0),*/
			usePairName = (!String.empty(options.pair) || !String.empty(this.pairName) || (String.empty(options.root) && options.root != null && String.empty(this.rootName))), item;

		var rootName = (options.root == null ? '' : options.root || this.rootName || 'keysvalues'),
			pairName = options.pair || this.pairName || 'keyvalue',
			string = (rootName ? indent_str + '<' + rootName + (this.rootAttributes ? ' ' + this.rootAttributes : '') + '>\n' : ''),
			node;

		this.log('rootName=' + rootName + ', pairName=' + pairName + ', string=' + string);

		for (var i = 0; i < this.length; i++) {
			item = this[i];

			if (!usePairName) pairName = item.key;
			if (Object.is(item.value) || FDArray.is(item.value)) {
				if (usePairName) string += indent_str + '\t<' + pairName + ' name="' + item.key.xmlencode() + '"' + (item.attributes ? ' ' + item.attributes.toString() : '') + (item.xmlAttributes ? ' ' + item.xmlAttributes : '') + '>\n';

				if (item.value.toXml) { string += item.value.toXml({ root: (usePairName ? null : item.key), indent: options.indent + 1 }) + '\n'; }
				else { string += Object.toXml(item.value, { root: (usePairName ? null : item.key), indent: options.indent + 1 }) + '\n'; }

				if (usePairName) string += indent_str + '\t</' + pairName + '>\n';
			} else {

				node = '<' + pairName + (usePairName ? ' name="' + item.key.xmlencode() + '"' : '') + (item.attributes ? ' ' + item.attributes.toString() : '') + (item.xmlAttributes ? ' ' + item.xmlAttributes : '') + '>' + (item.value ? String.create(item.value).xmlencode(true) : '') + '</' + pairName + '>';
				string += indent_str + '\t' + node + '\n';

			}
		}
		if (rootName) {
			string += indent_str + '</' + rootName + '>';
		} else {
			string = string.substr(0, string.length - 1);
		}

		this.log('.toXml, string=' + string, 'groupEnd');

		return string;
	},
	toXmlDom: function (options) { // { parentNode, rootName, pairName }

		this.log(['.toXmlDom, length=' + this.length], 'group');

		options = options || {};
		var usePairName = ((options.pairName && !String.empty(options.pairName)) || !String.empty(this.pairName) || (String.empty(options.rootName) && options.rootName != null && String.empty(this.rootName))), item;

		var rootName = (options.rootName || this.rootName || 'keysvalues'),
			pairName = options.pairName || this.pairName || 'keyvalue',
			doc = (options.parentNode ? options.parentNode.ownerDocument : FD.Ajax.stringToXMLDoc('<' + rootName + (this.rootAttributes ? ' ' + this.rootAttributes : '') + ' />')),
			root;

		var attributes = function (node, attributes) {
			var item;
			for (var i = 0, j = attributes.length; i < j; i++) {
				item = attributes[i];
				node.setAttribute(item.key, item.value);
			}
		}

		if (options.rootName == null && options.parentNode) root = options.parentNode;
		else {
			if (!options.parentNode) {
				root = doc.documentElement;
			} else {
				root = doc.createElement(rootName);
				if (this.attributes) {
					attributes(root, this.attributes);
				}
				options.parentNode.appendChild(root);
			}
		}

		this.log('.toXmlDom, rootName=' + rootName + ', pairName=' + pairName);

		for (var i = 0; i < this.length; i++) {

			this.log('.toXmlDom, i=' + i + '/' + this.length + ', ' + this[i].key);

			item = this[i];
				if (!usePairName) pairName = item.key;

			this.log('.toXmlDom, pairName=' + pairName, 'group');

			var parts = pairName.split('/'), parent = root, node;
			pairName = parts.pop();

			if (parts.length > 0) {

				this.log('.toXmlDom, pairName=' + pairName + ', parts=' + parts + ', joined=' + parts.join('/') + ', exists=' + typeof root.selectSingleNode(parts.join('/')) != null);

				parent = root.selectSingleNode(parts.join('/'));
				if (parent == null) {
					parent = root;
					for (var j = 0, k = parts.length; j < k; j++) {
						node = FD.Ajax.selectSingleNode(parent, parts[j]);

						this.log('.toXmlDom, part=' + parts[j] + ', node=' + (node != null));

						if (node == null) {
							node = doc.createElement(parts[j]);
							parent.appendChild(node);
						}
						parent = node;
					}
				}
			}

			if (Object.is(item.value) || FDArray.is(item.value)) {

				if (usePairName) {
					node = doc.createElement(pairName);
					node.setAttribute('name', item.key);
				}  else {
					node = doc.createElement(item.key);
				}
				if (item.attributes) {
					attributes(node, item.attributes);
				}

				parent.appendChild(node);

				if (item.value.toXmlDom) item.value.toXmlDom({ parentNode: node, rootName: null });
				else Object.toXmlDom(item.value, { parentNode: node, rootName: null });

			} else {

				node = doc.createElement(pairName);
				if (usePairName) node.setAttribute('name', item.key);
				if (item.attributes) {
					attributes(node, item.attributes);
				}

				if (typeof node.innerHTML != 'undefined')
					node.innerHTML = (item.value ? String.create(item.value).xmlencode(true) : '');
				else {
					var text = doc.createTextNode((item.value ? String.create(item.value).xmlencode(true) : ''));
					node.appendChild(text);
				}

				parent.appendChild(node);

			}

			this.log('', 'groupEnd');

		}

		this.log(['.toXmlDom', typeof doc, typeof root], 'groupEnd');

		return doc;
	},
	toXmlString: function (options) {
		var xmlDoc = this.toXmlDom(options);
		return FD.Ajax.xmlDocToString(xmlDoc);
	},
	toJson: function () { // rootName, pairName, indent

		this.log(['.toJson, length=' + this.length], 'group');

		var args = $A(arguments), options = $.extend({ root: (String.is(args[0]) ? args.shift() : ''), indent: 0 }, (Object.is(args[0]) ? args.shift() : {})),
			indent_str = (options.indent > 0 ? '\t'.times(options.indent) : ''), /*rootName = (String.is(args[0]) ? args.shift() : ''), pairName = (String.is(args[0]) ? args.shift() : ''), indent = (Number.is(args[0]) ? args.shift() : 0),*/
			item;

		var rootName = (options.root == null ? '' : options.root || this.rootName || 'keysvalues'),
			string = '',
			node;

		this.log('rootName=' + rootName);

		for (var i = 0; i < this.length; i++) {

			item = this[i];

			if (string.length > 0) string += ',\n';
			string +=  indent_str + '\t' + JSON.stringify(item.key) + ': ';

			if (Object.is(item.value) || FDArray.is(item.value)) {
				
				if (item.value.toJson) { string += item.value.toJson({ root: null, indent: options.indent + 1 }); }
				else { string += Object.toJson(item.value, { root: '', indent: options.indent + 1 }); }

			} else {

				string += JSON.stringify(item.value);

			}
		}

		string =
			(rootName ? JSON.stringify(rootName) + ': {\n' : '{\n') +
			string +
			(string.length > 0 ? '\n' : '') +
			indent_str +
			'}';

		this.log('.toJson, string=' + string, 'groupEnd');

		return string;
	},
	fromForm: function (selector) {
		var self = this;
		selector = selector || '';
		if (selector) {
			selector = selector + ' ';
		}
		$(selector + 'input,' + selector + 'select,' + selector + 'textarea').each(function () {
			if (this.type && /^(range|button)$/.test(this.type)) return;
			if (this.type && /^(radio|checkbox)$/.test(this.type)) {
				if (this.checked) {
					self.set(this.name, this.value);
				}
				return;
			}
			self.set(this.name, $(this).valordef());
		});
		return this;
	},
	toForm: function (options) {
		var self = this;
		$('input,select,textarea').each(function () {
			if (!self.exists(this.name)) return;
			var val = self.get(this.name);

			if (!options || !options.defaults) {

				self.log('.toForm, name=' + this.name + ', val=' + val + '/' + $(this).val());

				if (this.type && /^(radio|checkbox)$/.test(this.type)) {
					this.checked = this.value == val;
					if (this.checked) {
						if (this.onclick) $(this).click();
						$(this).change();
					}
				} else {
					this.value = val;
					$(this).change();
				}

			} else {

				$(this).placeholder(val);
				self.log('.toForm, name=' + this.name + ', val=' + val + '/' + $(this).val());

				if (this.type && /^(radio|checkbox)$/.test(this.type) && this.checked) {
					if (this.onclick) $(this).click();
					$(this).change();
				}

			}
		});
		return this;
	},
	fillFields: function (parentName) {
		if (parentName) {
			parentName += '/';
		} else {
			parentName = '';
		}
		
		this.log(['.fillFields, parentName=' + parentName, this], 'group');

		var i, length = this.length, $el;
		for (i = 0; i < length; i++) {
			$el = $('[name="' + parentName + this[i].key + '"]');

			this.log('name=' + parentName + this[i].key);

			if ($el.length > 1) {
				// to be implemented
			} else if ($el.length == 1) {
				$el.val(this[i].value).change();
			}
		}

		this.log('', 'groupEnd');

	}

}).extend({
	
	UNKNOWN: 0,
	QUERYSTRING: 1,
	ATTRIBUTES: 2,
	XML: 3,
	PAIR_ATTRIBUTES: 4,
	JSON: 5,

	TYPE_UNKNOWN: 0,
	TYPE_QUERYSTRING: 1,
	TYPE_ATTRIBUTES: 2,
	TYPE_XML: 3,
	TYPE_PAIR_ATTRIBUTES: 4,
	TYPE_JSON: 5,

	defaults: {
		realtype: false,
		splitChar: '&',
		keyvalueChar: '=',
		appendEmptyValues: false,
		ignoreEmptyValues: false,
		encoder: encodeURIComponent
	},
	create: function () {
		var args = $A(arguments);
		var arr = (args[0] instanceof FDKeys ? args.shift() : (Boolean.is(args[0]) ? new FDKeys(null, { realtype: args.shift() }) : new FDKeys()));
		if (args.length > 0) arr.add.apply(arr, args);
		return arr;
	},
	json: function () {
		var arr = this.create.apply(this, (arguments.length == 0 || !Boolean.is(arguments[0]) ? [true].add(arguments) : arguments));
		arr.type = this.JSON;
	},
	xml: function () {
		var arr = this.create.apply(this, (arguments.length == 0 || !Boolean.is(arguments[0]) ? [true].add(arguments) : arguments));
		arr.type = this.XML;
	},
	fromPairAttributes: function () {
		var arr = new FDKeys()
		return arr.fromPairAttributes.apply(arr, arguments);
	},
	fromString: function () {
		var arr = new FDKeys()
		return arr.fromString.apply(arr, arguments);
	},
	fromStringAttr: function () {
		var arr = new FDKeys()
		return arr.fromStringAttr.apply(arr, arguments);
	},
	fromXml: function () {
		var arr = new FDKeys()
		return arr.fromXml.apply(arr, arguments);
	},
	fromQueryString: function () {
		var arr = new FDKeys()
		return arr.fromQueryString.apply(arr, arguments);
	},
	fromForm: function (selector) {
		var arr = new FDKeys();
		return arr.fromForm(selector);
	},
	is: function (keys) {
		return keys != null && (keys instanceof FDKeys || (typeof keys == 'object' && keys._class && keys._class == 'FDKeys'));
	},
	possible: function (str) {
		return (
			(str.search('<=<') > -1) ||
			(/<([\S]*)(?!\w)[^>]*>([\s\S]*?)<\/\1(?!\w)>/.test(str)) ||
			(/([^=]*)=(.*)?/.test(str) || str.search('&') > -1)
		);
	},
	get: function () {
		var args = $A(arguments);
		var arr = this.fromString(args.shift());
		return arr.get.apply(arr, args);
	}
});

/* depricated */
Function.depricated('FDKeyArray', function (items, decode, realtype) {
	return new FDKeys(items, { decode: decode || false, realtype: realtype || false });
}, 'FDKeys');
FDKeyArray.create = function () {
	return FDKeys.create.apply(FDKeys, arguments);
}

var FDObjectsItem = new Class({

	Extends: FDBaseClass,
	_class: 'FDObjectsItem',

	initialize: function (item, options) {
		this.parent(options);
		if (item) $.extend(this, item);
	},
	setOptions: function () {
		this.parent.apply(this, arguments);
		if (this.options.owner) this._owner = this.options.owner;
		if (typeof this.options.index != 'undefined') this.index = this.options.index;
	}
});

var FDObjects = new Class({

	Extends: FDArray,
	_class: 'FDObjects',

	_type: 0, // DEFAULT
	_itemClass: null,
	_itemsMapClass: null,
	_key: { 'string': 'name', 'number': 'id' },
	_searchMatch: true,
	_owner: null,
	_tmr: 0,

	clonable: true,

	initialize: function () {
		if (this._guid == '') this._guid = this.getUniqueID();
		if (!this._itemsMapClass) this._itemsMapClass = FDObjectsMap;

		var args = $A(arguments), options;
		if (args.length > 0 && FDOptions.is(args[0])) {
			options = args.shift();
			if (options.key) {
				this._key = options.key;
				delete options.key;
			}
			if (options.itemClass) {
				this._itemClass = options.itemClass;
				delete options.itemClass;
			}
			if (options.itemsMapClass) {
				this._itemsMapClass = options.itemsMapClass;
				delete options.itemsMapClass;
			}
			if (options.owner) {
				this._owner = options.owner;
				delete options.owner;
			}

			Object.extend(true, this, options);

			//if (this.$constructor.defaults) options = Object.extend({}, this.$constructor.defaults, options);
			//if (this.$constructor.parent && this.$constructor.parent.defaults) options = Object.extend({}, this.$constructor.parent.defaults, options);
			options = this._getDefaultOptions(options)
			this.setOptions(options);

		} else {
			if ((options = this._getDefaultOptions(options))) this.setOptions(options);
		}

		if (args.length > 0) {
			if (args.length == 1) {
				if (Array.is(args[0])) this.push.apply(this, args[0]);
				else this.push.apply(this, args);
			} else this.push.apply(this, args);
		}
	},
	createMapObject: function () {
		var map = new this._itemsMapClass(FDOptions.create({ key: $.extend({}, this._key) }));
		map._owner = this;
		map._itemsMapClass = this._itemsMapClass;
		if (arguments.length > 0) map.add.apply(map, arguments);
		return map;
	},
	clone: function () {
		if (!this.clonable || this._type == FDObjects.type.MAP) return this;
		this.log('.clone');
		var clones = [];
		for (var i = 0, len = this.length; i < len; i++) {
			if (!Object.is(this[i])) continue;
			this[i]._owner = null;
			if (this[i].clone) clones.push(this[i].clone());
			else clones.push(Object.extend({}, this[i]));
			this[i]._owner = this;
		}
		var clone = new this.$constructor();
		clone._itemClass = this._itemClass;
		clone._key = $.extend({}, this._key);
		clone.add(clones);
		return clone;
	},
	concat: function () {
		var concat = this.clone(), item, clone, can_clone = this._type == FDObjects.type.DEFAULT;
		for (var i = 0, len = arguments.length; i < len; i++) {
			item = arguments[i];
			if (Array.is(item) || FDArray.is(item)) {
				clone = (can_clone && item.clone ? item.clone() : item);
				concat.add(clone);
			}
		}
		return concat;
	},

	search: function () {
		var prop = (arguments.length > 1 ? arguments[0] : this._key[typeof arguments[0]]);
		var search = (arguments.length > 1 ? arguments[1] : arguments[0]), arr = [], len = this.length, isKeyString = (prop == this._key['string']), item;
		if (isKeyString) {
			search = search.toLowerCase();
			var s = /\//.test(search), wc = s && /\/\*$/.test(search) /* wildcard */;
			if (wc) search = search.match(/[^\/]*/)[0];
            //String.log('FDObjects.search, wildcard=' + wc + ', search=' + search + ', prop=' + prop);
		}
		var searchMatch = this._searchMatch && (!s || wc);
        //String.log('FDObjects.search, searchMatch=' + this._searchMatch + '/' + searchMatch + '/s=' + s + '/wc=' + wc + ', isKeyString=' + isKeyString + ', len=' + len);
		while (len--) {
			item = this[len];
			if (typeof item[prop] == 'undefined') continue;
			if (isKeyString) {
				if (searchMatch) {
                    //String.log('FDObjects.searchMatch, item[' + prop + ']=' + item[prop] + ', match=' + item[prop].match(/[^\/]*/)[0]);
					if (item[prop].match(/[^\/]*/)[0].toLowerCase() == search) { if (wc) arr.push(item); else return item; }
				} else if (item[prop].toLowerCase() == search) return item;
			} else {
				if (item[prop] == search) return item;
			}
		}
		return (arr.length > 0 ? arr : null);
	},
	item: function () { return this.search.apply(this, arguments); },
	get: function () { return this.search.apply(this, arguments); },
	exists: function () {
		return (this.search.apply(this, arguments) != null);
	},
	map: function () {
		var map = this.createMapObject(), i, len = this.length, args = $A(arguments);
		if (len == 0) return map;
		if (Function.is(args[0])) {
			var fn = args.shift();
			for (i = 0; i < len; i++) {
				if (fn.apply(this[i], args)) {
					map.push(this[i]);
				}
			}
		} else if (Array.is(args[0])) {
			var arr = args[0], el;
			for (i = 0, len = arr.length; i < len; i++) {
				el = this.search(arr[i]);
				if (el) map.push(el);
			}
		}
		return map;
	},
	first: function () {
		return (this.length > 0 ? this[0] : null);
	},
	last: function () {
		return (this.length > 0 ? this[this.length - 1] : null);
	},
	next: function (current) {
		if (!current || current.index >= this.length - 1 || current.index < 0) return null;
		return (this[current.index + 1]);
	},
	prev: function (current) {
		if (!current || current.index > this.length - 1 || current.index <= 0) return null;
		return this[current.index - 1];
	},
	push: function () {
		var item, i, len = arguments.length;
		for (i = 0; i < len; i++) {
			item = arguments[i]
			if (item == null) continue;
			if (this._type == FDObjects.type.DEFAULT) {
				if (this._itemClass) {
					if (!this._itemClass.is(item)) item = new this._itemClass(item, { index: this.length, owner: this });
					else if (FDBaseClass.is(item)) item.setOptions({ index: this.length, owner: this });
				}
				item.index = this.length;
				this.parent(item);
				item._owner = this;
			} else {
				this.parent(item);
			}
			//this.log('.push, item=' + Object.inspect(item, null, 2, ['integer', 'string']));
		}
		return this;
	},
	insert: function () {
		this.parent.apply(this, arguments);
		this.reindex(arguments.length > 0 ? arguments[0] + 1 : 0);
		return this;
	},
	after: function () {
		var after = this.search(arguments[0]);
		if (!after) throw 'FDObjects.after: ' + arguments[0] + ' not found';
		arguments[0] = after.index + 1;
		return this.insert.apply(this, arguments);
	},
	before: function () {
		var before = this.search(arguments[0]);
		if (!before) throw 'FDObjects.before: ' + arguments[0] + ' not found';
		arguments[0] = before.index;
		return this.insert.apply(this, arguments);
	},
	add: function (items, start) {
		return this.parent(items, start);
	},
	remove: function (item) {
		if (!Number.is(item)) item = item.index;
		this.splice(item, 1);
		this.reindex(item);
		return this;
	},
	removeBySearch: function () {
		var item = this.search.apply(this, arguments);
		if (item) this.remove(item.index);
		return this;
	},
	reindex: function (start) {
		if (this._type == FDObjects.type.MAP) return this; // don't reindex when this object is of type MAP
		for (var i = start || 0, len = this.length; i < len; i++) {
			this[i].index = i;
			this[i]._owner = this;
		}
		return this;
	},
	toString: function (sep, level) {
		if (level && level >= 2) return '[object ' + this._class + ']';
		var ret = [];
		for (var i = 0, len = this.length; i < len; i++) {
			ret.push(Object.inspect(this[i], null, level));
		}
		return ret.join(sep || ',');
	},
	toArray: function () {
		var arr = [];
		for (var i = 0, len = this.length; i < len; i++) arr.push(this[i]);
		return arr;
	},
	sort: function (key, dir) {
		if (this.length == 0) return this;
		if (Function.is(key)) return this.parent(key);

		var self = this;
		key = key || this._key['string'];
		dir = dir || FDObjects.sort.ASCENDING;

		//this.log('.sort, len=' + this.length + ', key=' + key + ', dir=' + dir);

		this.parent((function (a, b) {
			var _a = Object.traverse.call(a, key), _b = Object.traverse.call(b, key);
			if (typeof _a == 'function') _a = _a.call(a);
			if (typeof _b == 'function') _b = _b.call(b);
			if (_a == null && _b != null) _a = ''.toType(typeof _b);
			if (_b == null && _a != null) _b = ''.toType(typeof _a);
			if (String.is(_a) && String.is(_b)) {
				_a = _a.toUpperCase();
				_b = _b.toUpperCase();
			}
			//this.log('.sort, _a=' + _a + ', _b=' + _b);
			return ((_a < _b ? -1 : (_a > _b ? 1 : 0)) * dir);
		}).bind(this));
		this.reindex();

		return this;
	}

}).extend({
	type: {
		DEFAULT: 0,
		MAP: 1
	},
	sort: {
		ASCENDING: 1,
		DESCENDING: -1
	}
});

var FDObjectsMap = new Class({

	Extends: FDObjects,
	_class: 'FDObjectsMap',

	_type: FDObjects.type.MAP,
	_owner: null,
	clonable: false,

	getIDs: function () {
		var ids = [];
		for (var i = 0, len = this.length; i < len; i++) {
			ids.push(this[i].id);
		}
		return ids;
	},
	reindex: function () { return; }

});


/* depricated */
Function.depricated('FDObjectArray', function () {
	var objects = new FDObjects();
	if (arguments.length > 0) objects.add.apply(objects, arguments);
	return objects;
}, 'FDObjects');


var FDLog = new Class({

	Extends: FDArray,
	_class: 'FDLog',

	initialize: function (options) {
		options = this._getDefaultOptions(options);
		this.setOptions(options);
	},

	add: function (source, log, line) {
		//try {
		var obj = {
			source: source,
			message: log.message || log,
			line: line || 0,
			toString: function (encode) { return ((this.source ? this.source + ' -> ' : '') + (this.line ? this.line + ', ' : '') + (encode && encodeURIComponent ? encodeURIComponent(this.message) : this.message)); }
		};
		//this.log('.add, obj=' + obj.toString());
		this.push(obj);
	},
	clear: function () {
		this.length = 0;
	},
	toString: function (encode, sep) {
		var str = '';
		sep = sep || this.options.sep;
		for (var i = 0; i < this.length; i++) {
			str = str.append(this[i].toString(encode), sep);
		}
		return str;
	}
}).extend({
	defaults: {
		sep: '; '
	}
});

/* depricated */
Function.depricated('FDLogArray', function () { return new FDLog(); }, 'FDLog');

//--> Specialized Array Objects

var FDUriRouteSegment = new Class({

	Extends: FDObjectsItem,
	_class: 'FDUriRouteSegment',

	name: '',
	id: null,

	initialize: function () {
		var args = $A(arguments);

		if (args.length > 0 && String.is(args[0])) {
			// consider the first two parameters to be name and id
			args = [{ name: args[0], id: args[1] }];
		}
		this.parent.apply(this, args);
	},
	toString: function () {
		return this.name + (this.id != null ? '/' + this.id : '');
	}
}).extend({
	is: function (obj) {
		return obj != null && obj instanceof FDUriRouteSegment;
	}
});
var FDUriRouteSegmentList = new Class({

	Extends: FDObjects,
	_class: 'FDUriRouteSegmentList',

	_itemClass: FDUriRouteSegment,
	_owner: null,

	toString: function () {
		var parts = [];
		for (var i = 0, j = this.length; i < j; i++) {
			parts.push(this[i].toString());
		}
		return parts.join('/');
	}
})
var FDUriRoute = new Class({

	Extends: FDBaseClass,
	_class: 'FDUriRoute',

	_trace: false,

	identifier: '',
	route: '',
	base: '',
	next: '',

	baseParts: [],
	segments: null,

	initialize: function () { // path|object, options

		this.segments = new FDUriRouteSegmentList(FDOptions.create({ owner: this }));
		var args = $A(arguments);

		this.log(['.initialize', args]);

		if (args.length > 0) {
			this.setup(args.shift());
		}

		this.parent.apply(this, args);
	},
	setup: function () {
		var args = $A(arguments), route, fromObj = false;
		if (args.length > 0) {
			if (String.is(args[0]))
				route = args.shift();
			else if (Object.is(args[0])) {
				var obj = args.shift();
				fromObj = true;
			}
		}

		if (route) {
			if (route.left(1) == '/')
				this.fromPath(route);
			else {
				var segments = 
				this.parse(route);
			}
		}
		if (fromObj) {
			if (obj.identifier) this.identifier = obj.identifier;
			if (obj.base) this.baseParts = obj.base.split('/').pack();
			if (obj.route) this.parse(obj.route); //this.routeParts = obj.route.split('/');
			if (obj.path) this.fromPath(obj.path);
		}

		if (!this.identifier) {
			this.identifier = (FDUri.current ? FDUri.current.getRouteInfo().identifier || FD.getRouteInfo().identifier : FD.getRouteInfo().identifier);
		}

		return this;
	},
	fromPath: function (path) {
		this.parse(path);
		this.next = (FDUri.current ? FDUri.current.queryGet('from') : '');

		//this.log(['.fromPath', this]);

		return this;
	},
	parse: function (route) {

		this.log(['.parse', route], 'group');

		if (this.identifier == '') {
			var match = /([^\!~]{0,})([\!~])(.*)/.exec(route);

			this.log(['.parse, match', match]);

			if (match != null) {
				this.base = match[1] || '';
				this.identifier = match[2];
				route = match[3];
			} else {
				this.identifier = (FDUri.current ? FDUri.current.getRouteInfo().identifier || FD.getRouteInfo().identifier : FD.getRouteInfo().identifier);
				if (this.identifier && route.indexOf(this.identifier) > -1) {
					var match = route.split(this.identifier);
					this.base = match[0];
					route = match[1];
				} else if (route.left(1) == '/') { // consider the route to be a path or directory
					this.base = route;
					route = '';
				}
			}
		} else if (route.indexOf(this.identifier) > -1) {
			var match = route.split(this.identifier);
			this.base = match[0];
			route = match[1];
		} else {
			this.base = route;
			route = '';
		}
		if (this.base) {
			this.baseParts = this.base.split('/').pack();
			this.base = '/' + (this.baseParts.length > 0 ? this.baseParts.join('/') + '/' : '');
		}

		var segments = FDUriRoute.parse(route);
		if (segments.length > 0) {
			this.segments.add(segments);
		}

		this.log(['.parse', this]);
		this.log('', 'groupEnd');

		return this;
	},
	getBase: function () {
		return '/' + (this.baseParts.length > 0 ? this.baseParts.join('/') + '/' : '');
	},
	getRoute: function () {
		return this.segments.toString();
	},
	setBase: function (base) {
		return this.appendBase(base, true);
	},
	appendBase: function (base, clear) {
		if (clear) {
			this.baseParts = [];
		}
		if (String.is(base)) {
			base = base.split('/').pack();
		}
		if (base.length > 0) {
			this.baseParts.add(base);
		}
		return this;
	},
	prependBase: function (base) {
		if (String.is(base)) {
			base = base.split('/').pack();
		}
		if (base.length > 0) {
			this.baseParts.insert(0, base);
		}
		return this;
	},
	append: function (route) {
		var segments = FDUriRoute.is(route) ? route.segments : FDUriRoute.parse(route);
		if (segments.length > 0) {
			this.segments.add(segments);
		}
		return this;
	},
	prepend: function (route) {
		var segments = FDUriRoute.is(route) ? route.segments : FDUriRoute.parse(route);
		if (segments.length > 0) {
			this.segments.insert(0, segments);
		}
		return this;
//		this.routeParts.splice.apply(this, [0, 0].concat(FDUriRoute.is(route) ? route.routeParts : route.split('/')));
	},
	merge: function (routeInfo, append) {
		if (append) {
			this.append(routeInfo);
		} else {
			// We take over the segment list without cloning!
			this.segments = routeInfo.segments;
			this.segments._owner = this;
		}

		//this.log(['.merge', this, routeInfo, append]);

		return this;
	},
	getPart: function (index, type) {
		this.log(['.getPart, index=' + index, this]);

		var part = '';
		for (var i = 0, j = this.segments.length; i < j; i++) {
			var segment = this.segments[i];
			if (index == i) {
				part = segment.name;
				break;
			} else if (index == i + 1 && segment.id != null) {
				part = segment.id;
				break;
			}
			if (segment.id != null) {
				index--;
			}
		}
		return (!type || Type.equals(part, type) ? part : (part + '').toType(type));
	},
	getSegment: function (name) {
		return this.segments.search(name);
	},
	getSegmentId: function (name, type) {
		var segment = this.segments.search(name),
			id = (segment ? segment.id || '' : '');
		return (!type || Type.equals(id, type) ? id : (id + '').toType(type));
	},
	getResourceId: function (type) {
		var id = '';
		for (var i = this.segments.length - 1; i >= 0; i--) {
			if (this.segments[i].id != null) {
				id = this.segments[i].id;
				break;
			}
		}
		return (!type || Type.equals(id, type) ? id : (id + '').toType(type));
	},
	isEmpty: function (total) {
		if (total) {
			return this.baseParts.length == 0 && this.segments.length == 0;
		} else {
			return this.segments.length == 0;
		}
	},
	isRouteEqual: function (route) {
		return this.getRoute() == route.getRoute();
	},
	toString: function () {
		if (this.segments.length > 0) {
			return this.getBase() + (this.getPart(0) != 'login' ? this.identifier : '') + this.getRoute();
		} else {
			return this.getBase();
		}
	}
}).extend({
	codeIdSegments: ['edit', 'workflow', 'delete', 'confirm', 'verify'],
	create: function () {
		var info = new FDUriRoute();
		info.setup.apply(info, arguments);
		return info;
	},
	is: function (obj) {
		return obj != null && obj instanceof FDUriRoute;
	},
	parse: function (route) {
		var parts = route.split('/').pack(),
			segments = [];

		for (var i = 0, j = parts.length; i < j; i++) {
			var name = parts[i],
				resourceId = null;

			if (i + 1 < j && (resourceId = this.isResourceId(name, parts[i + 1])) != null) {
				i++;
			}
			segments.push({ name: name, id: resourceId });
		}
		return segments;
	},
	isResourceId: function (part, id) {
		var guid = /^[0-9a-f]{8}[0-9a-f]{4}[1-5][0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}$/i;
		if (/^[\d]+$/.test(id)) {
			return Number.create(id);
		} else if (guid.test(id)) {
			return id;
		} else if (this.codeIdSegments.seek(part) && (id.length == 6 || id.length == 10)) {
			return id;
		}
		return null;
	}
});

var FDUri = new Class({

	Extends: FDBaseClass,
	_class: 'FDUri',

	_trace: false,

	_parsedURI: null,

	routeInfo: null,
	inheritProtocol: false,

	initialize: function (uri, options) {
		this.parent(Object.extend({}, this.options, FDUri.defaults, options));
		if (Object.is(uri)) {
			this.invalidate();
			Object.extend(this, uri);
			//this.log(['.initialize', uri, this]);
		} else {
			try { this.parse(uri); } catch (e) { alert('FDUri.initialize: ' + (e.message || e)); }
		}
	},

	trace: function (toggle) {
		this._trace = toggle || arguments.length == 0;
		return this;
	},
	clone: function (keys) {
		var from = (keys ? {} : this);
		if (keys) {
			for (var i = 0, len = keys.length; i < len; i++) {
				if (this[keys[i]]) from[keys[i]] = this[keys[i]];
			}
		}
		var clone = new FDUri(from);
		return clone;
	},

	set: function () {
		if (arguments.length == 1 && Object.is(arguments[0])) {
			var source = arguments[0], property;
			for (property in source) {
				if (source.hasOwnProperty(property)) this.set(property, source[property]);
			}
		} else {
			var key = arguments[0], value = arguments[1];
			switch (key) {
				case 'anchor': this[key] = value; this['hash'] = (value ? '#' + value : ''); break;
				case 'hash': this[key] = value; this['anchor'] = (value ? value.substr(value.charAt(0) == '#' ? 1 : 0) : ''); break;
				case 'query': this[key].merge(value); break;
				case 'file':
					if (/\?/.test(value)) {
						var parts = value.split('?');
						this['query'].merge(parts[1]);
						value = parts[0];
					}
					this['file'] = value;
					break;
				default: this[key] = value; break;
			}
		}
		return this;
	},

	invalidate: function () {
		var keys = this.options.keys;
		for (var i = 0; i < keys.length; i++) {
			this[keys[i]] = '';
		}
		this[this.options.queryKey] = new FDKeys();
		return this;
	},

	parse: function (uri) {
		if (uri && (uri = this.parseURI(uri))) {
			$.extend(this, uri);
			this.log(['.parse', this.getRouteInfo()]);
		} else this.invalidate();
		return this;
	},

	getAccount: function () {
		var routeInfo = this.getRouteInfo(); //, parts = routeInfo.base.split('/'), index = 1; (this.directory.left(1) == '/' ? 1 : 0);
		if (routeInfo.baseParts.length > 0) return routeInfo.baseParts[0];
		return FD.getInfo().domain || '';
	},
	getForm: function () {
		if (!FD.isFrontend()) return '';
		var parts = this.path.split('/'), index = (this.directory.left(1) == '/' ? 2 : 1);
		if (parts.length > index) return parts[index];
		return '';
	},
	getBase: function (type) {
		var base = (document.querySelector('base') || {}).href;
		if (!base) {

			var options = $.extend({}, this.options);
			options.keys = options.keys.indexes(1, 6, 7, 10, 11, 14, 12); // protocol, host, directory, file, anchor, querystring

			// build a uri with the following parts: protocol + host

			var keys = options.keys, kc = keys.length;
			base = '';

			if (this[keys[0]] && this['host']) base = this[keys[0]] + '://'; // protocol
			if (kc > 1 && this[keys[1]]) base += this[keys[1]]; // host

			if (!type) {
				type = (FD.isBackend() ? 'account' : 'form');
				//var routeInfo = this.getRouteInfo();
				//base += routeInfo.base;
			}
			if (type == 'account') {
				base = base.append(this.getAccount(), '/') + '/';
			} else if (type == 'form') {
				base = base.append(this.getAccount(), '/').append(this.getForm(), '/') + '/';
			}

		}
		return new FDUri(base);
	},
	getRouteInfo: function () {
		if (!this.routeInfo) {
			this.routeInfo = new FDUriRoute();
			this.routeInfo.setup(this.directory);
		}
		return this.routeInfo;
	},
	setRoute: function (route, options) {
		options = $.extend({}, { cancel: false }, options);
		var routeInfo = (FDUriRoute.is(route) ? route : FDUriRoute.create(route)),
			currentRouteInfo = this.getRouteInfo(),
			baseRouteInfo = FDUri.current.getRouteInfo();

		this.log(['.setRoute', route, routeInfo, currentRouteInfo, baseRouteInfo]);

		if (!currentRouteInfo.identifier) currentRouteInfo.identifier = baseRouteInfo.identifier;
		currentRouteInfo.merge(routeInfo, options.append || false);
		
		this.directory = currentRouteInfo.toString();
		if (!baseRouteInfo.isEmpty() && !options.cancel && !options.omitFrom && !baseRouteInfo.isRouteEqual(routeInfo)) {
			this.querySet('from', baseRouteInfo.getRoute());
		}
		return this.makeSession();
	},
	cancelRoute: function (route) {
		return this.setRoute(route, { cancel: true });
	},
	addVersion: function (type) {
		var version = '';
		if (!type && !this.file.empty()) {
			type = (this.file.lastIndexOf('.css') >= 0 ? 'css' : (this.file.lastIndexOf('.js') >= 0 ? 'js' : 'all'));
		}
		type = type || 'all';
		try { version = FD.getAssets()[type]; } catch (e) { }
		this.removeVersion().setVersion((type != 'all' ? 'v' : '') + version);
		return this;
	},
	setVersion: function (version) {
		this.removeVersion();
		this[this.options.queryKey].set(version, '');
		return this;
	},
	removeVersion: function () {
		var query = this[this.options.queryKey], re = this.options.versionRegExp;
		for (var i = query.length - 1; i >= 0; i--) {
			if (re.test(query[i].key) && !query[i].value) query.remove(i);
		}
		return this;
	},
	getVersion: function () {
		var query = this[this.options.queryKey], re = this.options.versionRegExp;
		for (var i = 0; i < query.length; i++) {
			if (re.test(query[i].key) && !query[i].value) return query[i].key;
		}
		return '';
	},

	makeSession: function () {
		if (FDUri.current.queryExists('token')) {
			this[this.options.queryKey].set('token', FDUri.current.queryGet('token'));
		}
		var auth = FD.getAuth();
		if (auth) { this[this.options.queryKey].set('sidn', auth.sidn); }
		return this;
	},
	hasSession: function () {
		return this.queryExists('sidn');
	},
	hasToken: function () {
		return this.queryExists('token');
	},

	tokenize: function () {
		var auth = FD.getAuth();
		if (auth && auth.rvtoken) { this[this.options.queryKey].set('rvtoken', auth.rvtoken); }
		else {
			var token = $('#__rvtoken').val();
			if (token) this[this.options.queryKey].set('rvtoken', token);
		}
		return this;
	},

	addLang: function () {
		this[this.options.queryKey].set('lang', FD.getLang());
		return this;
	},

	randomize: function () {
		this[this.options.queryKey].set('random', this.getUniqueID());
		return this;
	},

	queryGet: function () {
		return this[this.options.queryKey].get.apply(this[this.options.queryKey], arguments);
	},
	querySet: function () {
		this[this.options.queryKey].set.apply(this[this.options.queryKey], arguments);
		return this;
	},
	queryRemove: function () {
		this[this.options.queryKey].remove.apply(this[this.options.queryKey], arguments);
		return this;
	},
	queryExists: function (key) {
		return this[this.options.queryKey].exists(key);
	},
	queryMerge: function (query) {
		if (query)
			this[this.options.queryKey].merge(query);
		return this;
	},
	queryFilter: function () {
		return this[this.options.queryKey].filter.apply(this[this.options.queryKey], arguments);
	},

	parseURI: function (uri) {
		try {
			var options = this.options,
			re = options.parser[options.strictMode ? "strict" : "loose"].exec(uri),
			inheritProtocol = /^:?\/\//.test(uri),
			uri = {},
			i = options.keys.length;
		} catch (e) { alert('parseUrl, error=' + (e.message || e)); return null; }

		this.log('.parseURI, re=' + re);

		if (!re) return null;

		while (i--) uri[options.keys[i]] = re[i] || "";
		if (uri["port"]) uri["port"] = Number.int(uri["port"]);

		uri.inheritProtocol = inheritProtocol;
		if (inheritProtocol && FDUri.current) uri.protocol = FDUri.current.protocol;

		if (!uri.protocol && uri.host && !/\./.test(uri.host)) {
			// consider the host not a legitimate host but be part of the path. correct the corresponding keys.
			uri.directory = uri.host.append(uri.directory, '/');
			uri.path = uri.host.append(uri.path, '/');
			uri.relative = uri.host.append(uri.relative, '/');
			uri.host = '';
		}

		uri[options.queryKey] = new FDKeys(uri[options.keys[12]].split('&'), { decode: true });
		uri[options.queryKey].remove('random'); // loose the random parameter

		this.log(['.parseURI', uri]);

		this._parsedURI = uri;

		return uri;
	},

	isFormdesk: function () {
		return /^(\w+\.)?formdesk\./.test(this.host);
	},

	toString: function (keys_options) { // keys || options

		var options = $.extend({}, this.options);
		options.keys = options.keys.indexes(1, 6, 7, 10, 11, 14, 12);

		if (Array.is(keys_options)) {
			options.keys = keys_options;
		} else {
			options = $.extend(options, keys_options);
		}

		if (typeof options.logout != 'undefined' && !options.logout) {
			options.makeSession = true;
			this.querySet('logout', false);
		}
		if (options.makeSession) {
			this.makeSession();
			FD.Params.Set('logout', false);
		}

		// build a uri with the following parts: protocol + host + port + directory + file + query + anchor

		var keys = options.keys, kc = keys.length, uri = '';
		if (this[keys[0]] && this['host']) uri = this[keys[0]] + '://'; // protocol
		if (kc > 1 && this[keys[1]]) uri += this[keys[1]]; // host
		if (kc > 2 && this[keys[2]]) uri = uri.append(this[keys[2]], ':'); // port

		if (kc > 3 /*&& this[keys[3]]*/) {
			//this.log(['.toString', routeInfo, 'directory=' + directory]);
			if (this.routeInfo && !this.routeInfo.isEmpty(true)) {
				var directory = this.routeInfo.toString();
				uri = uri.append(directory, '/') + (this.hasSession() && directory.right(1) != '/' ? '/' : ''); // directory
			} else if (this[keys[3]]) {
				uri = uri.append(this[keys[3]], '/') + (this.hasSession() && this[keys[3]].right(1) != '/' ? '/' : ''); // directory
			}
		}
		if (kc > 4 && this[keys[4]]) uri = uri.append(this[keys[4]], '/'); // file
		if ((arguments.length == 0 || keys.seek('querystring') || keys.seek('query')) && this[options.queryKey] && this[options.queryKey].length > 0) {
			var query = this[options.queryKey], item, order, re = this.options.versionRegExp;

			for (var i = 0, j = query.length; i < j; i++) {
				item = query[i];
				switch (item.lkey) {
					case 'action': item.order = 0; break;
					case 'step': item.order = 1; break;
					case 'nextstep': item.order = 2; break;
					case 'sidn': item.order = 996; break;
					case 'from': item.order = 997; break;
					case 'next': item.order = 998; break;
					case 'redir': item.order = 999; break;
					default: item.order = 3; break;
				}
				if (re.test(item.lkey)) {
					item.order = 1000;
				}
			}
			query.sortByKey('order');

			var querystring = query.toString('', '', true /* append keys with empty values to the end of the querystring */);
			if (querystring) uri += ('?' + querystring);
		}
		if (kc > 5 && this[keys[5]]) uri = uri.append(this[keys[5]], '#'); // anchor/hash

		this.log(['.toString, uri=' + uri, options]);

		return uri;
	},

	justPath: function (includeHost)  {
		var url = new FDUri();
		url.set('directory', this['directory']);
		if (includeHost) {
			url.set({ 'protocol': this['protocol'], 'host': this['host'] });
		}
		return url;
	},

	addPath: function (path) {
		var keys = this.options.keys;
		if (this.routeInfo) {
			this.routeInfo.appendBase(path);
			this.log('.addPath, appended to routeInfo, ' + this.routeInfo.baseParts);
		} else {
			if (!this.directory) this.directory = '';
			this.directory += (this.directory.right(1) != '/' ? '/' : '') + path;
			this.log('.addPath, appended to directory, ' + this.directory);
		}
		return this;
	},

	isExternal: function () {
		return (this.protocol && this.host !== FDUri.current.host ? true : false);
	},
	hasSSL: function () {
		return this.protocol == 'https';
	},
	isSecure: function () {
		return (this.protocol == 'https' || (this.isRelative() && FDUri.current.isSecure()));
	},
	isRelative: function () {
		return this.host.empty();
	},

	goto: function () {
		var options = (arguments.length > 0 ? Object.extend(this.options.goto, arguments[0]) : FDUri.defaults["goto"]);
		var doc = options.document || document, wnd = doc.parentWindow || doc.defaultView;

		var url = this.toString(options);

		this.log('.goto, url=' + url + ', target=' + (options ? options.target : ''));
		if (FD.Browser.ie) {
			var l = $('<a href="' + url + '" style="display:none" target="_self"></a>', doc);
			if (options.target) l.attr('target', options.target);
			$('body', doc).append(l);
			this.log('.goto, url=' + url + ', target=' + l.attr('target'));
			l[0].click();
			//try { l.remove(); } catch (e) { }
		} else if (options.replace) {
			doc.location.replace(url);
		} else {
			doc.location = url;
		}
	}
}).extend({
	defaults: {
		strictMode: false,
		// Formdesk itself uses these default values to directly read/write the uri object properties
		keys: ["source" /* the original uri */, "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative" /* path+query */, "path" /* directory+file */, "directory", "file", "querystring", "hash", "anchor"],
		queryKey: "query",
		parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@\?]*)(?::([^:@\?]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
			loose: /^(?:(?![^:@\?]+:[^:@\/\?]*@)([^:\/?#.]+)?:)?(?:\/\/)?((?:(([^:@\?]*)(?::([^:@\?]*))?)?@)?((?:[^:\/?#]{3,})?)(?::(\d*))?)(((\.{0,2}\/?(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(#(.*))?)/
		},
		versionRegExp: /([\d]+)?v([\d]+)(\.([\d]+)\.([\d]+))?/,
		goto: {
			replace: false,
			target: '_self',
			clone: Object.clone /* for Object.extend to clone this object */
		}
	},

	/* regexp's to test IPv4, IPv6 and hostname */
	IPv4: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}/,
	IPv6: /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i,
	IP: { test: function (ip) { return FDUri.IPv4.test(ip) || FDUri.IPv6.test(ip); } },
	hostname: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)+([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])*([a-zA-Z]{2,})$/,

	create: function (uri) {
		if (!this.is(uri)) {
			uri = new FDUri(uri);
		}
		return uri;
	},
	is: function (uri) {
		return (uri instanceof FDUri) || (typeof uri == 'object' && uri._class && uri._class == 'FDUri');
	},
	base: function (type) {
		return this.current.getBase(type);
	},
	queryMerge: function (uri, query) {
		var uri = new FDUri(uri);
		return uri.queryMerge(query).toString();
	},
	isExternal: function (url) {
		return (new FDUri(url)).isExternal();
	},
	isRelative: function (url) {
		return (new FDUri(url)).isRelative();
	},
	hasProtocol: function (url) {
		return (/^(:?\w+:)/).test(url);
	},
	isSecure: function (url) {
		return (new FDUri(url)).isSecure();
	},
	encode: function (url, strict) {
		return encodeURI(url);
	},
	encodeComponent: function (str, strict) {
		var str = encodeURIComponent(str);
		if (strict) {
			var str_strict = '', strict_chars = "!~*'()", HEX = "0123456789ABCDEF";
			for (var i = 0; i < str.length; i++) {
				if (strict_chars.indexOf(str.charAt(i)) >= 0) {
					var charCode = str.charCodeAt(i);
					str_strict += ("%" + HEX.charAt((charCode >> 4) & 0xF) + HEX.charAt(charCode & 0xF));
				} else {
					str_strict += str.charAt(i);
				}
			}
			return str_strict;
		}
		return str;
	},
	goto: function () {
		var args = $A(arguments), uri = args.shift();
		//alert(uri instanceof FDUri);
		if (this.is(uri)) uri.goto.apply(uri, args);
		else {
			uri = new FDUri(uri);
			uri.goto.apply(uri, args);
		}
	},
	getAccountUri: function () {
		var uri = this.current.getBase('account');
		String.log(['.getAccountUri', uri]);
		return uri;
	},
	getDomainUri: function () {
		var uri = this.current.getBase('account');
		String.log(['.getDomainUri', uri]);
		return uri;
	},
	getFormUri: function () {
		var uri = this.current.getBase('form');
		String.log(['.getFormUri', uri]);
		return uri;
	},
	getClearCurrentUri: function () {
		var clone = this.current.clone();
		clone[this.defaults.queryKey].clear();
		String.log(['getClearCurrentUri', clone]);
		return clone;
	},
	isFormdesk: function (host) {
		return /^(\w+\.)?formdesk\./.test(host);
	}
});
FD.Uri = FDUri.current = new FDUri(document.location.href);

/*var uriTest = new FDUri(document.location.href);
uriTest.setRoute('form/layout/134');
String.log('uriTest=' + uriTest.toString());
*/

var FDEmailAddress = new Class({

	Extends: FDBaseClass,
	_class: 'FDEmailAddress',

	_trace: false,

	original: '',

	name: '',
	hasName: false,

	local: '',
	localIsQuoted: false,
	domain: '',
	domainIsIP: false,

	valid: false,
	corrected: false,
	errorCode: 0,
	errorMessage: '',

	initialize: function (email, options) {
		this.parent(Object.extend({}, this.options, options));
		if (Object.is(email)) {
			this.invalidate();
			Object.extend(this, email);
		} else {
			try { this.parse(email); } catch (e) { alert('FDEmailAddress.initialize: ' + (e.message || e)); }
		}
	},

	setError: function (error) {
		this.errorCode = error.code;
		this.errorMessage = this.getText({ text: error.text, key: 'Validate', alt: error.message });
		return (this.valid = false);
	},

	invalidate: function () {
		this.original = this.local = this.domain = '';
		this.domainIsIP = this.localIsQuoted = false;
		this.valid = this.corrected = false;
		this.errorCode = 0;
		this.errorMessage = '';
	},
	parse: function (email) {

		if (/[<>]/.test(email)) {
			var match = email.match(/^([^<>]*)<([^<>]*)>$/);
			if (match && match.length > 1) {
				this.name = match[1].trim();
				this.hasName = this.name != '';
				email = match[2];
			}
		}
		email = email.trim().toLowerCase();

		this.log('.parse, email=' + email);

		this.original = email;
		this.valid = true;

		var matchArray = email.match(/^(.+)@(.+)$/)
		if (matchArray == null) {
			return this.setError(FDEmailAddress.errors['GENERAL']);
		}

		this._parseDomain(matchArray[2]);
		this._parseLocal(matchArray[1]);

		// Validate the final lengths.
		var len1 = this.local.length, len2 = this.domain.length, email = this.local + '@' + this.domain;
		if (len1 > 64 || len2 > 253 || len1 + len2 + 1 > 253) {
			this.valid = false;
			this.setError(FDEmailAddress.errors['LENGTH']);
		}

		this.corrected = this.corrected && !this.local.empty() && !this.domain.empty();

		this.log('.parse, valid=' + this.valid + ', corrected=' + this.corrected + ', local=' + this.local + ', domain=' + this.domain);

		return this.valid;
	},

	_parseDomain: function (domainPart) {
		// Reverse parse out the initial domain/IP address part of the e-mail address.
		var org = domainPart, domain = "", state = "domend", laststate = "", depth = 0, prevchr, lastchr, len, valid = false;

		while (domainPart != "" && state != "") {

			len = domainPart.length;
			prevchr = domainPart.substr(len - 2, 1);
			lastchr = domainPart.substr(len - 1);

			switch (state) {
				case "domend":
					{
						if (lastchr == ")") {
							laststate = "domain";
							state = "cfws";
						} else if (lastchr == "]" || lastchr == "}") {
							domain = "]" + domain;
							domainPart = domainPart.substr(0, len - 1).trim();
							state = "ipaddr";
							this.domainIsIP = true;
						} else if (FDUri.IP.test(domainPart)) {
							state = "ipaddr";
							this.domainIsIP = true;
						} else {
							state = "domain";
							this.domainIsIP = false;
						}

						break;
					}
				case "cfws": // (comments, folding whitespace)
					{
						if (prevchr == "\\") domainPart = domainPart.substr(0, len - 2).trim();
						else if (lastchr == ")") {
							domainPart = domainPart.substr(0, len - 1).trim();
							depth++;
						} else if (lastchr == "(") {
							domainPart = domainPart.substr(0, len - 1);
							depth--;
							if (!depth && domainPart.substr(len - 1) != ")") state = laststate;
						} else {
							domainPart = domainPart.substr(0, len - 1).trim();
						}

						break;
					}
				case "ipaddr":
					{
						if (lastchr == "[" || lastchr == "{" || lastchr == "@") {
							domain = "[" + domain;
							state = "@";

							if (lastchr == "@") break;
						}
						else if (lastchr == "," || lastchr == ".") domain = "." + domain;
						else if (lastchr == ";" || lastchr == ":") domain = ":" + domain;
						else if (/[A-Za-z0-9]/.test(lastchr)) domain = lastchr + domain;

						domainPart = domainPart.substr(0, len - 1).trim();

						break;
					}
				case "domain":
					{
						if (lastchr == "@") {
							state = "@";

							break;
						} else if (lastchr == ")") {
							state = "cfws";
							laststate = "@";

							break;
						}
						else if ((lastchr == "," || lastchr == ".") && !prevchr.list(',', '.')) domain = "." + domain;
						else if (/[A-Za-z0-9\-]/.test(lastchr)) domain = lastchr + domain;

						domainPart = domainPart.substr(0, len - 1).trim();

						break;
					}
				case "@":
					{
						if (lastchr == "@") state = "";

						domainPart = domainPart.substr(0, len - 1).trim();

						break;
					}
			}
		}

		valid = domain != '';

		// Analyze the domain/IP part and fix any issues.
		domain = domain.replace(/[\.]+/, ".");
		if (this.domainIsIP || FDUri.IP.test(domain)) {

			if (domain.left(1) != '[') domain = '[' + domain;
			if (domain.right(1) != ']') domain += ']';

			var stripped = domain.replace(/ipv6\:/i, "").replace(/[\[\]]/g, "");
			valid = FDUri.IP.test(stripped); // test if the domain is a valid IPv4 or IPv6 address

			if (FDUri.IPv6.test(stripped) && domain.left(6).toLowerCase() != '[ipv6:') {
				domain = '[IPv6:' + domain.substr(6);
			}
		} else {
			// Process the domain.
			if (domain.left(1) == ".") domain = domain.substr(1);
			if (domain.right(1) == ".") domain = domain.substr(0, domain.length - 1);

			var parts = domain.split('.'), part;
			for (var i = 0; i < parts.length; i++) {
				part = parts[i];
				if (part.left(1) == "-") part = part.substr(1);
				if (part.right(1) == "-") part = part.substr(0, part.length - 1);
				if (part.length > 63) part = part.left(63);

				parts[i] = part;
			}

			domain = parts.join('.');

			valid = valid && FDUri.hostname.test(domain); // test if the domain is a valid hostname
		}

		this.domain = domain;

		this.corrected = this.corrected || domain != org;
		if (!valid) this.setError(FDEmailAddress.errors['DOMAIN']);

		this.valid = this.valid && valid;

	},

	_parseLocal: function (localPart) {
		var org = localPart, currchr, nextchr, depth, local = "";

		// Remove CFWS (comments, folding whitespace).
		while (localPart.substr(0, 1) == "(") {
			while (localPart != "") {
				currchr = localPart.substr(0, 1);
				if (currchr == "\\") localPart = localPart.substr(2).trim();
				else if (currchr == "(") {
					depth++;
					localPart = localPart.substr(1).trim();
				}
				else if (currchr == ")") {
					localPart = localPart.substr(1).trim();
					depth--;
					if (!depth && localPart.substr(0, 1) != "(") break;
				}
			}
		}

		// Standardize the local part. Special characters will be converted to their simple equivalents.
		localPart = localPart.standardize();

		// Process quoted/unquoted string.
		if (localPart.substr(0, 1) == '"') {

			this.localIsQuoted = true;

			local = '"';
			localPart = localPart.substr(1);
			while (localPart != "") {

				currchr = localPart.substr(0, 1);
				nextchr = localPart.substr(1, 1);

				if (currchr == "\\") {
					if (nextchr == "\\" || nextchr == '"') {
						local += localPart.substr(0, 2);
						localPart = localPart.substr(2);
					} else if (nextchr.charCodeAt(0).between(32, 126)) { // 32-space is allowed in a quoted string
						local += nextchr;
						localPart = localPart.substr(2);
					}
				}
				else if (currchr == '"') break;
				else if (currchr.charCodeAt(0).between(33, 126)) {
					local += currchr;
					localPart = localPart.substr(1);
				}
				else localPart = localPart.substr(1);
			}

			if (local.right(1) != '"') local += '"';

		} else {

			while (localPart != "") {
				currchr = localPart.substr(0, 1);

				if (/[a-z0-9!#$%&'*+\/=?^_`{|}~\-\.]/.test(currchr)) {
					local += currchr;
				}
				localPart = localPart.substr(1);
				//else break;
			}

			local = local.replace(/[\.]+/, ".");
			if (local.substr(0, 1) == ".") local = local.substr(1);
			if (local.right(1) == ".") local = local.substr(0, local.length - 1);
		}

		var len = local.length;
		while (local.substr(len - 2) == '\\"') {
			local = local.substr(0, len - 2) + '"';
			len = local.length;
		}
		if (local == '"' || local == '""') local = "";

		this.local = local;

		this.corrected = this.corrected || local != org;
		if (local == '') {
			this.setError(FDEmailAddress.errors['LOCAL']);
		}
		this.valid = this.valid && local != '';

	},

	checkSpf: function () {
		return success = FD.Ajax.Form.Task.check('spf', this.toString());
	},

	toString: function () {
		return (this.valid || this.corrected ? this.local + '@' + this.domain : '');
	}

}).extend({
	errors: {
		GENERAL: { code: -1, text: 'EMAIL', message: 'Invalid Email Address' },
		LOCAL: { code: -2, text: 'EMAIL', message: 'Invalid Local Part' },
		DOMAIN: { code: -3, text: 'EMAIL', message: 'Invalid Domain Part' },
		LENGTH: { code: -4, text: 'EMAIL', message: 'Email adress is too long' }
	},
	create: function (email) {
		if (!this.is(email)) {
			email = new FDEmailAddress(email);
		}
		return email;
	},
	validate: function (email, options) {
		var email = new FDEmailAddress(email);
		if (Object.is(options)) options.email = email;
		return email.valid && (!email.corrected || (Object.is(options) && options.correction));
	}
});

var FDEvent = (new Type('FDEvent', function (options, events) {

	this.eventName = '';
	this.params = null;
	this.returnValue = true;
	this.stopEvent = false;

	if (options) {
		$.extend(this, options);
	}
	if (events) {
		this.addEventsFromOptions(events);
	}

})).implement(
	$.extend({}, FDBaseFunctions, Events.prototype)
).extend({
	is: function (evt) { return (evt instanceof FDEvent); }
});
var FDEventHandler = new Class({

	Extends: FDBaseClass,
	_class: 'FDEventHandler',

	_trace: false,

	_owner: null,
	_events: {},

	eventName: '',
	params: null,
	returnValue: true,
	stopEvent: false,

	initialize: function (owner) {
		this.parent();
		this._owner = owner || document;
	},

	AttachEvent: function (eventNames, functionPointer, index, apply) {
		var events = eventNames.split(','), eventName, eventArray;
		this.log('.AttachEvent, eventNames=' + eventNames + ', index=' + (Number.is(arguments[2]) ? arguments[2] : -1), 'group');
		for (var i = 0, len = events.length; i < len; i++) {
			eventName = events[i];
			if (!this._events[eventName]) this._events[eventName] = [];
			eventArray = this._events[eventName];
			if (typeof index == 'number' && index < eventArray.length) {
				for (var j = eventArray.length - 1; j >= index; j--) eventArray[j + 1] = eventArray[j];
			} else
				index = eventArray.length;

			if (arguments.length == 4) functionPointer._apply = apply;
			eventArray[index] = functionPointer;

			this.log('.AttachEvent, index=' + (Number.is(arguments[2]) ? arguments[2] : -1) + '/' + index + ', name=' + eventName);
		}
		this.log('', 'groupEnd');

		return this;
	},
	attachEvent: function () {
		return this.AttachEvent.apply(this, arguments);
	},
	addEvent: function () {
		return this.AttachEvent.apply(this, arguments);
	},
	FireEvent: function (eventName, params, stop) {
		var retval = true, retval_call = true, apply = Array.is(params);
		var list = this._events[eventName];

		this.log('.FireEvent, name=' + eventName + ', count=' + (list ? list.length : 0));

		if (list) {
			var args = new FDEvent({ eventName: eventName, params: params, returnValue: true, stopEvent: false });
			//				this.eventName = eventName; this.params = params; returnValue = true; this.stopEvent = false;
			for (var i = 0; i < list.length; i++) {
				if (list[i]) {
					try {
						if (apply) {
							retval_call = list[i].apply(list[i], params);
							retval = (typeof retval_call == 'boolean' ? retval_call : true) && retval;
						} else {
							retval_call = list[i].call(args, args);
							retval = (typeof retval_call == 'boolean' ? retval_call : args.returnValue) && retval;
						}
					} catch (e) { this.log('.FireEvent.ERROR, name=' + eventName + ', index=' + i + ', e=' + (e.message || e) + ', func=' + list[i] + ', object=' + (list[i] && list[i].object ? list[i].object : '') + ', debug=' + (list[i] && list[i].debug ? list[i].debug : 'n/a'), 'error', true); list.remove(i); i--; }
					if ((!retval && stop) || args.stopEvent) break;
				}
			}
		}

		return retval;
	},
	fireEvent: function () {
		return this.FireEvent.apply(this, arguments);
	},
	fire: function () {
		return this.FireEvent.apply(this, arguments);
	},
	clear: function (event) {

		this.log('.Clear, name=' + (event ? event : 'all') + ', count=' + (event && this._events[event] ? this._events[event].length : 0));

		if (arguments.length == 0) {
			this._events = new Object();
		} else {
			this._events[event] = null;
		}
	},
	Clear: function () { return this.clear.apply(this, arguments); },

	exists: function (event) {
		return typeof this._events[event] != 'undefined' && Array.is(this._events[event]);
	},
	Exists: function () { return this.exists.apply(this, arguments); },

	create: function () {
		return new this.$constructor();
	}
});

FD.Events = new FDEventHandler();

//<-- Extended prototypes and objects

function addEventHandler(opEl, cpType, ppListener, useCapture) {
	try {
		if (opEl.addEventListener)
			opEl.addEventListener(cpType.substr(2), ppListener, useCapture);
		else if (opEl.attachEvent)
			opEl.attachEvent(cpType, ppListener);
	} catch (e) { };
}
function removeEventHandler(opEl, cpType, ppListener, useCapture) {
	try {
		if (opEl.removeEventListener)
			opEl.removeEventListener(cpType.substr(2), ppListener, useCapture);
		else if (opEl.detachEvent)
			opEl.detachEvent(cpType, ppListener);
	} catch (e) { };
}

var FDLock = new Class({

	Extends: FDBaseClass,
	_class: 'FDLock',

	_trace: false,

	_locked: 0,
	_queue: '',
	_tmr: 0,

	Set: function () {
		this._locked++;
		this.log('.Set, count=' + this._locked);
	},
	Release: function (all) {
		if (all) { this._locked = 0; }
		else this._locked--;

		this.log('.Release, count=' + this._locked + ', typeofQueue=' + typeof this._queue);

		if (this._locked < 0) this._locked = 0;
		if (this._locked == 0 && this._queue) {
			this.ExecQueue.delay(this, 500);
		}
	},
	ExecQueue: function () {
		if (typeof this._queue == 'object' || Function.is(this._queue)) this._queue();
		else eval(this._queue);
		this._queue = '';
	},
	Cancel: function (all) {
		if (all) this._locked = 0;
		else this._locked--;
		if (this._locked < 0) this._locked = 0;
		this._queue = '';
	},
	Check: function (queue) {
		//		alert('check: ' + this._locked + ', ' + queue);
		if (!this._locked) return true;
		if (queue) this._queue = queue;

		this.log('.Check, locked');

		return false;
	}
});
FD.Lock = new FDLock();

var FDQueue = new Class({

	Extends: FDBaseClass,
	_class: 'FDQueue',

	_keys: [],
	_items: {},

	push: function () { // key, f
		var key = (arguments.length == 1 ? String.random() : arguments[0]), f = (arguments.length == 1 ? arguments[0] : arguments[1]);
		if (!this[key]) {
			this._keys.push(key);
		}
		this._items[key] = f;
	},
	remove: function (key) {
		var index = this._keys.search(key);
		if (index > -1) {
			this._keys.remove(index);
			this._items[key] = null;
		}
	},
	next: function () { // [this, ...]
		if (this._keys.length == 0) return 0;

		var args = $(arguments), _this = (args.length > 0 ? args.shift() : null),
			key = this._keys.shift();

		this._items[key].apply(_this, args);
		this._items[key] = null;

		if (this._keys.length == 0) this._items = {};

		return this._keys.length;
	},
	getNext: function () {
		if (this._keys.length == 0) return null;

		var key = this._keys.shift(),
			f = this._items[key];

		this._items[key] = null;
		if (this._keys.length == 0) this._items = {};

		return f;
	},
	has: function (key) {
		return this._keys.search(key) > -1;
	},
	process: function () {
		while (this.next.apply(this, arguments) > 0) { }
	}

})
var FDErrorHandler = new Class({

	Extends: FDBaseClass,
	_class: 'FDErrorHandler',

	_items: [], _tmrAlert: 0, _tmrSend: 0, _reporting: false,
	reportPlain: function () { // msg, url, line, source, send
		//FD._trace = true;
		var err, args = $A(arguments), send = (args.length == 5 && args.pop()) || args.length.between(2, 4);

		if (!Object.is(args[0])) err = new FDError(args);
		else err = args[0];

		this.log('.reportPlain, msg=' + err.message + ', url=' + err.url + ', line=' + err.line + ', source=' + err.source + ', send=' + send, 'error');
		if (this._exclude(err.message, err.url) || FD.Browser.bot) { this.log('.reportPlain, exclude error from reporting'); return true; }

		this._reporting = true;
		if (send) window.clearTimeout(this._tmrSend);

		if (typeof oProgress != 'undefined') { FD.Form.setLoading(false); oProgress.finish(true); }
		if (FD.Form && typeof FD.Form.Stack != 'undefined') FD.Form.Stack.Clear();
		if (FD.Form && typeof FD.Form.References != 'undefined') FD.Form.References.Clear();

		err.alert();

		if (send) {
			if (!err.source) err.source = this._class + '.reportPlain';
			this.Send(err);
		}

		this._reporting = false;
		return true;
	},
	reportFlash: function (e, msg, id, description) {
		var item = FD.Form.Items.search(id);
		if (item) {
			top.FD.Window.alert(msg + (msg.right(2) == ': ' ? (item.index + 1) : '') + (e ? '\n\n' + (typeof e.message != 'undefined' ? e.message : e) : '') + (description ? '\n\n' + description : ''));
			FD.Utils.Blink.Start(item);
		}
	},
	reportCalc: function (e, id) {
		this.reportFlash(e, FD.Texts.Error.get('SCRIPT_ERROR_CALC'), id);
	},
	reportDep: function (e, id) {
		this.reportFlash(e, FD.Texts.Error.get('SCRIPT_ERROR_DEP'), id);
	},
	Queue: {
		prev_onerror: null, Items: null, Message: '', AttribID: 0,
		Start: function (msg) {
			this.Message = msg;
			this.AttribID = 0;
			if (!this.prev_onerror) this.prev_onerror = window.onerror;
			window.onerror = FD.Error.Queue.Add;
		},
		Stop: function () {
			if (this.prev_onerror) window.onerror = this.prev_onerror;
			prev_onerror = null;
		},
		Add: function (msg, url, line) {
			var queue = FD.Error.Queue;
			if (!queue.Items) {
				queue.Items = [];
				FD.Events.AttachEvent('AfterLoad', queue.Report);
			}
			queue.Items.push({ message: queue.Message, description: msg, line: line, id: queue.AttribID });
			String.log(['.Queue.Add', arguments], 'error');
			return true;
		},
		Report: function () {
			var queue = FD.Error.Queue, attrib;
			for (var i = 0; i < queue.Items.length; i++) {
				if (queue.Items[i].id > 0)
					FD.Error.reportFlash(null, queue.Items[i].message, queue.Items[i].id, queue.Items[i].description);
				else
					FD.Error.reportPlain(queue.Items[i].message, '', queue.Items[i].line, queue.Items[i].description);
			}
			queue.Clear();
		},
		Clear: function () {
			this.Stop();
			this.Items = [];
			this.Message = '';
			this.AttribID = 0;
		}
	},
	Alert: function (send, msg, url, line, source) {
		if (FD.Browser.bot) return true;
		var args = $A(arguments), send = args.shift(), err = new FDError(args);
		if (this._exclude(err.message, err.url)) return this;

		window.clearTimeout(this._tmrAlert);
		if (send) { this.Send(err); }
		this._tmrAlert = this.reportPlain.delay(this, 100, err);
	},
	Send: function () { // message, url, line, source, custom1, custom2, ....
		try {
			if (this._items.length > 10 || FD.Browser.bot) return;
			window.clearTimeout(this._tmrSend);
			var args = $A(arguments), showAlert = false, item;
			if (Boolean.is(args[0])) {
				showAlert = args.shift();
			}

			if (args.length > 0 && args[0] instanceof FDError) {
				item = args[0];
			} else {
				args.push({ stack: FD.Stack.Format({ type: 'xml' }), lastfunction: FD.Stack._lastfunction, lastfunctions: FD.Stack._lastfunctions });
				item = new FDError(args);
			}

			//if (this._exclude(item.message, item.url)) return this;

			if (this._items.length == 0 || !this._items.last().equals(item)) {

				this._items.push(item);

				this._tmrSend = this._send.delay(this, 1000);
				if (showAlert) {
					window.clearTimeout(this._tmrAlert);
					this._tmrAlert = this.reportPlain.delay(this, 100, item.message, item.url, item.line, '', false);
				}

			}
		} catch (e) { alert('FD.Error.Send, ' + (e.message || e)); }
		return this;
	},
	now: function () {
		window.clearTimeout(this._tmrSend);
		this._send();
	},
	_send: function () {
		try {
			if (this._items.length == 0) return;
			if (this._reporting) { this._tmrSend = this._send.delay(this, 500); return; }
			var params = new FDKeys(), content = new FDKeys();
			try {
				if (typeof RequestId != 'undefined') params.set('id_request', RequestId);
				try { content.set('timeAfterInit', FD.Form.getTimestamp()); } catch (e) { }
				try { content.set('application-info', Object.inspect(FD.getInfo())); } catch (e) { }
				content.set('location', document.location.href);
				if (FD.isBackend()) { content.set('context', FD.Backend.Context); }
				for (var i = 0; i < this._items.length; i++) {
					if (!this._items[i].sent) {
						content.merge(this._items[i].toArray((this._items.length > 1 ? (i + 1) + '' : '')));
						this._items[i].sent = true;
					}
				}
				try { content.merge(this._scripts()); } catch (e) { }
				params.set('msg', (FD.isBackend() ? 'BACKEND' : 'FRONTEND') + ', ' + (!this._scripts_loaded ? '[scripts_loaded_error], ' : '') + this._items[0].message + (this._items.length > 1 ? ' (' + this._items.length + ' errors)' : ''));
			} catch (e) {
				params.set('msg', 'ERRORROUTINE, ' + this._message(e));
				content.set('error', this._message(e));
			}
			try {
				if (typeof FD.Ajax != 'undefined') {
					FD.Ajax.sendRequest({ verb: 'POST', url: '/error.asp?xml=true&' + params.toString(), content: content.toString(), async: true, callback: function (req, data) { ; } });
				}
			} catch (e) { }
		} catch (e) { }
		//this._items = [];
	},
	_construct: function (content, item, suffix) {
		suffix = suffix || '';
		content
			.set('ts' + suffix, item.timestamp)
			.set('msg' + suffix, (Object.toType(item.msg) == 'error' ? item.msg.message || item.msg : item.msg) + '')
			.set('url' + suffix, item.url)
			.set('line' + suffix, item.line)
			.set('source' + suffix, item.source)
			.set('stack' + suffix, item.stack);

		if (item.stack_lastfunctions.length > 0) {
			item.stack_lastfunctions.loop(function (arr, i) {
				content.set('stack_function' + suffix.append((i + 1) + '', '.'), arr[i].truncate(300));
			});
		}
		if (item.formstack) content.set('formstack' + suffix, item.formstack);
		if (item.lastevent) content.set('lastevent' + suffix, item.lastevent);
		if (item.custom) {
			item.custom.loop(function (arr, i) {
				if (Array.is(arr[i])) content.merge(arr[i].suffix((arr.length > 1 ? suffix.append((i + 1) + '', '.') : suffix)));
				else content.set('custom' + suffix.append((i + 1) + '', '.'), arr[i]);
			});
		}
		return content;
	},
	_message: function (msg) {
		if (typeof msg.message != 'undefined') msg = msg.message;
		else if (typeof msg.description != 'undefined') msg = msg.description;
		else if (typeof msg.toString != 'undefined') msg = msg.toString();
		if (!msg) msg = '<empty>';
		return msg;
	},
	_inspect_event: function (evt) {
		var dump = '{type: ' + evt.type, props = ['tagName', 'type', 'id', 'name'];
		if (evt.currentTarget) dump += ', currentTarget: ' + Object.inspect(evt.currentTarget, props);
		if (evt.target) dump += ', target: ' + Object.inspect(evt.target, props);
		if (evt.fromElement) dump += ', fromElement: ' + Object.inspect(evt.fromElement, props);
		if (evt.srcElement) dump += ', srcElement: ' + Object.inspect(evt.srcElement, props);
		if (evt.toElement) dump += ', toElement: ' + Object.inspect(evt.toElement, props);
		return dump + '}';
	},
	_exclude_list: [/Script error/i, /variable\: COT/, /'COT'/, /'JSON'/, /Unexpected token \:/, /argv is not defined/, /chrome\:\/\/|resource\:\/\//, /addEventListener/, /gCrWeb/, /elt\.parentNode/], _scripts_array: null,
	_exclude: function (msg, url) {
		var i, external_script = false, plugin_script = false;

		try { if (/bingbot|googlebot|^Java/.test(navigator.userAgent)) return true; } catch (e) { }

		for (i = 0; i < this._exclude_list.length; i++) {
			if (this._exclude_list[i].test(msg)) return true;
		}
		if (!this._scripts_array) this._scripts_array = FD.Script.toArray();
		for (i = 0; i < this._scripts_array.length; i++) {
			external_script = external_script || this._scripts_array[i].external;
			plugin_script = plugin_script || this._scripts_array[i].plugin;
		}
		if (FD.isFrontend() && (external_script || plugin_script)) {
			return true;
		}
		try { if (url && FD.Script.isExternal(url)) return true; } catch (e) { alert('external: ' + e); }
		return false;
	},
	_scripts_loaded: true, _scripts_array: null,
	_scripts: function () {
		if (!this._scripts_array) this._scripts_array = FD.Script.toArray();
		var i, scripts = new FDKeys(), script;
		this._scripts_loaded = true;
		for (i = 0; i < this._scripts_array.length; i++) {
			script = this._scripts_array[i];
			scripts.set('script' + (i + 1), script.src + ' (' + (script.loaded_var || 'loaded') + '=' + script.loaded + (script.external ? ', external' : '') + (script.plugin ? ', plugin)' : '') + ')');
			this._scripts_loaded = this._scripts_loaded && script.loaded;
		}
		return scripts;
	},
	_extra: function (item) {
		if (/method 'get'|FD\.Texts/.test(item.msg)) {
			item.custom.push((FD.Texts && FD.Texts.dump ? FD.Texts.dump() : 'can not dump the texts'));
		}
	}
});
FD.Error = new FDErrorHandler();

var FDError = new Class({

	Extends: FDBaseClass,
	_class: 'FDError',

	message: '',
	url: '',
	line: '',

	timestamp: 0,
	source: '',
	stack: '',
	stack_lastfunction: '',
	stack_lastfunctions: '',
	formstack: '',
	custom: [],

	sent: false,

	initialize: function () { // message, url, line, source, stack
		this.parent();

		var args = (arguments.length == 1 && Array.is(arguments[0]) ? arguments[0] : $A(arguments));

		if (args.length > 0) {
			this.message = this._message(args.shift());
			try { this.timestamp = FD.Form.getTimestamp(); } catch (e) { }
			if (args.length > 0 && typeof args[args.length - 1].stack != 'undefined') {
				var stack = args.pop();
				this.stack = stack.stack;
				this.stack_lastfunction = stack.lastfunction;
				this.stack_lastfunctions = stack.lastfunctions;
			} else {
				try {
					this.stack = FD.Stack.Get().toXml(); //FD.Stack.Format('; ');
					this.stack_lastfunction = FD.Stack._lastfunction;
					this.stack_lastfunctions = FD.Stack._lastfunctions;
				} catch (e) { }
			}
			this.url = (args.length > 0 ? args.shift() : '') || document.location.href;
			if (typeof this.url == 'object') this.url = (typeof this.url.toString != 'undefined' ? this.url.toString() : '');
			this.line = (args.length > 0 ? args.shift() : 0) || 0;
			this.source = (args.length > 0 ? args.shift() : '') || '';
			this.custom = args;
			try { this.formstack = FD.Form.Stack.Format(); } catch (e) { }
			this._extra();
		}
	},

	_message: function (msg) {
		if (typeof msg.message != 'undefined') msg = msg.message;
		else if (typeof msg.description != 'undefined') msg = msg.description;
		else if (typeof msg.toString != 'undefined') msg = msg.toString();
		if (!msg) msg = '<empty>';
		return msg;
	},
	_extra: function () {
		if (/method 'get'|FD\.Texts/.test(this.message)) {
			this.custom.push((FD.Texts && FD.Texts.dump ? FD.Texts.dump() : 'Can not dump the texts'));
		}
	},

	send: function () {
		this.log('.send');
		FD.Error.Send(this);
		return this;
	},
	alert: function () {
		var texts = FD.Texts;
		var message = (texts && texts.exists('Error.CLIENT_ERROR_INFO') ? texts.get('Error.CLIENT_ERROR_INFO') + '\n\n' : '\n') + (this.line && texts && texts.exists('Error.CLIENT_ERROR_LINE') ? texts.get('Error.CLIENT_ERROR_LINE') + this.line + '\n' : '') + (texts ? texts.get('Error.CLIENT_ERROR_MSG') : '') + this.message;
		message = 'Error Report:\n' + message + (this.url ? '\n\nUrl: ' + this.url + (this.line ? '\nLine: ' + this.line : '') : '');
		try {
			var wnd = window;
			try { var wnd = (top.FD ? top : window); } catch (e) { }
			wnd.FD.Window.alert(message);
		} catch (e) {
			alert(message);
		}
		return this;
	},

	toArray: function (suffix) {
		suffix = suffix || '';
		var content = new FDKeys({
			'timestamp': this.timestamp,
			'message': (Object.toType(this.message) == 'error' ? this.message.message || this.message : this.message) + '',
			'url': this.url,
			'line': this.line,
			'source': this.source,
			'stack': this.stack
		});
		if (suffix) content.suffix(suffix);

		/*if (this.stack_lastfunctions.length > 0) {
			this.stack_lastfunctions.loop(function (arr, i) {
				content.set('stack_function' + suffix.append((i + 1) + '', '.'), arr[i].truncate(300));
			});
		}*/
		if (this.formstack) content.set('formstack' + suffix, this.formstack);
		if (this.lastevent) content.set('lastevent' + suffix, this.lastevent);
		if (this.custom) {
			this.custom.loop(function (arr, i) {
				if (Array.is(arr[i])) content.merge(arr[i].suffix((arr.length > 1 ? suffix.append((i + 1) + '', '.') : suffix)));
				else content.set('custom' + suffix.append((i + 1) + '', '.'), arr[i]);
			});
		}
		return content;
	},
	toString: function () {
		return this.toArray().toString();
	},
	equals: function (other) {
		return
			other.message == this.message &&
			other.url == this.url &&
			other.line == this.line;
	}

}).extend({
	severity: {
		NONE: 0,
		INFO: 1,
		GENERAL: 2,
		FATAL: 3
	},
	implementClass: {

		__errorImp: true,
		error: false,
		errorSeverity: 0,

		setError: function (toggle, severity) {
			this.error = toggle;

			if (!toggle) {
				this.errorSeverity = FDError.severity.NONE;
			} else {
				severity = severity || FDError.severity.GENERAL;
				if (severity && severity > this.errorSeverity) {
					this.errorSeverity = severity;
				}
			}

			if (toggle && this._owner && this._owner.__errorImp) {
				this._owner.setError(toggle, severity);
			}
		}
	}
});

var FDStackHandler = new Class({

	Extends: FDBaseClass,
	_class: 'FDStackHandler',

	Items: null,
	_lastfunction: '',
	_lastfunctions: [],
	_cl: 0,
	_loop: 0,
	_limit: 100,

	Get: function (func, options) {

		if (!func) func = FD.Stack.Get.caller;
		options = $.extend({ truncate: 400 }, options);

		var items = new FDObjects(FDOptions.create({ root: 'levels', pair: 'level' })), level, name, loop = 0, scopes = 0, funcStr;
		this._lastfunctions.zap();

		while (func && loop < this._limit && scopes < 6) {
			if (func.caller && func.caller.$origin && func.caller.$origin == func) {
				func = func.caller;
			}
			funcStr = (func.$origin ? func.$origin.toString() : func.toString());
			if (!/\$prototyping/.test(funcStr)) { //\$protected|
				loop++;
				name = this.getFunctionName(func);
				level = { 'name': name || 'unknown', 'function': funcStr.truncate(options.truncate) };
				items.push(level);
				if (/\(scope\)/.test(name)) scopes++;
				else scopes = 0;
				if (scopes < 6) this._lastfunctions.push(funcStr);
			}
			func = func.caller || null;
		}
		try { this._lastfunction = (this._lastfunctions.length > 0 ? this._lastfunctions[this._lastfunctions.length - 1] : ''); } catch (e) { this._lastfunction = (e.message || e); };
		if (scopes == 6) items.push({ name: '...' });
		this.Items = items.reverse().reindex();
		this._lastfunctions = this._lastfunctions.reverse();
		return this.Items;
	},
	Format: function (options, func) {
		try {
			func = func || FD.Stack.Format.caller;
			this.Get(func, options);
			var stack = [];
			if (!Object.is(options)) options = { type: 'string', join: options || '\n' };
			if (options.type && options.type == 'xml') {
				return this.Items.toXml();
			}
			for (var i = 0; i < this.Items.length; i++) {
				stack.push((i + 1) + ': ' + this.Items[i].name);
			}
			return stack.join(options.join);
		} catch (e) {
			return 'Error formatting the stack: ' + (e.message||e);
		}
	},
	getFunctionName: function (func) {
		//DEBUG.trace('getFunctionName', func + ', '+typeof func);
		try {
			/*if (func.$$owner) this.log(['.getFunctionName, type=' + typeof func + ', name=' + func.$$name, func.toString(), func.$origin.toString(), func.$$owner._class, func.prototype, func, func.$$owner.getClassChain()]);
			else {
				this.log(['.getFunctionName', func.toString(), (func.caller && func.caller.$origin ? func.caller.$origin == func: 'nop')]);
			}*/
			if (typeof func == 'function') {
				if (func.$$name) {
					var fname = func.$$name, instance = func.$$instance, owner = func.$$owner;
					if (instance) fname = instance._class + '.' + fname;
					else if (owner) fname = owner._class + '<class>.' + fname;
					return fname;
				}
				if (func.name) return '(func) ' + func.name;
				var name = new RegExp("function ([^\(\)]*)").exec(func);
				if (name && name[1].replace(/\s/ig, '') != '') return '(func) ' + name[1];
				name = null;
			} else if (func && func.callee) {
				var name = new RegExp("function ([^\(\)]*)").exec(func.callee);
				if (name) return '(callee) ' + name[1];
			}
			if (func && !name && (name = ('(scope) ' + this.findName(window, func)))) return name;
		} catch (e) { return 'error finding function name (' + (e.description || e) + ')'; }
		return '';
	},
	findName: function (scope, search, recur, lvl) {
		var i, j, k, posible = [], exclude = 'top,global,window,parent,frames,self,navigator', scope_exclude = '[object DOMPlugin],[object Navigator],[object DOMMimeType]';
		if (!recur) { this._cl++; this._loop = 0; lvl = 0; }
		if (this._loop < this._limit && scope_exclude.search(scope.toString()) < 0) {
			lvl++;
			for (var i in scope) {
				if (scope[i] == search) posible.push(i);
				try {
					if (lvl <= 10 && exclude.search(i.toLowerCase()) < 0 && typeof scope[i] == 'object' && scope[i] && typeof scope[i].nodeType == 'undefined' && (typeof scope[i]._cl == 'undefined' || scope[i]._cl != this._cl || i == 'Stack')) {
						scope[i]._cl = this._cl;
						if ((j = this.findName(scope[i], search, true, lvl)) && j.length > 0) {
							for (k = 0; k < j.length; k++) j[k] = i + '.' + j[k];
							posible.push(j.join(', '));
						}
					}
				} catch (e) { };
			}
		}
		return (!recur ? posible.join(', ') : posible);
	},
	CalledFrom: function () {
		var func = FD.Stack.CalledFrom.caller;
		return (func && func.caller ? this.findName(window, func.caller) : '');
	},
	Members: function (scope, join) {
		var members = [];
		join = join || '\r\n';
		for (var i in scope) {
			members.push(i + ' (' + typeof (scope[i]) + ')');
		}
		return members.join(join);
	}
});
FD.Stack = new FDStackHandler();

var FDUtils = FD.Utils = {
	doFile: function (cel, action, options) {

		FD.Upload.set(cel, action, options);
		return;

		var el = FD.get('hd' + cel), file, container = $('#upl_' + cel);
		if (!el) return;
		if (action == 3 && el.prevValue && el.prevValue == '0') action = 1;
		else el.prevValue = el.value;
		if (action > 0) el.value = (action == 1 ? 0 : 1);
		if (action == 0 && FD.Browser.ios && FD.Browser.safari && FD.Browser.ios_version <= 5 && (file = document.getElementById(cel)) && file.type == 'file') {
			container.after($('<span>' + FD.Texts.get('FILE_IOS_SAFARI') + '</span>')).css('visibility', 'hidden');
		}
		//		alert(action + ', ' + FD.get('tbl' + cel) + ', ' + parseInt(el.value));
		$('#upl_' + cel + '_readonly').toggle(parseInt(el.value) == 1); /* set the display of the readonly part */
		if (!(FD.Browser.ios && FD.Browser.safari)) {
			container.toggle(parseInt(el.value) == 0); /* set the display of the file input */
		}
		if (typeof aEvents != 'undefined' && (!options || (Object.is(options) && !options.no_events)) /*25-04-2012 && FD.Form.isLoading */) aEvents.exec(cel, null, this, cel + '.doFile', false, true, (options && options.thread ? options.thread : ''));
	},
	setCounter: function (id, max) {
		$('#cnt' + id).html('(' + FD.get(id).value.replace(/\r\n/g, '').length + (max ? '/' + max : '') + ' ' + FD.Texts.get('CHARACTER_COUNT') + ')');
	},
	maxLength: function (e, max, chk) {
		var el = null;
		if (chk) el = e;
		else el = checkEvent(e);
		if (!Object.is(el)) return;
		var val = el.value.replace(/\r\n/g, '');
		if (val.length >= max && (chk || !e.keyCode.list(8, 9, 16, 17, 18, 35, 36, 37, 38, 39, 40, 46))) {
			var newval = '', char, i, j = max;
			for (i = 0; i < j; i++) {
				char = el.value.charAt(i);
				newval += char;
				if (char == '\r' || char == '\n') {
					j++;
				}
			}
			if (!chk) {
				if (typeof e.preventDefault != 'undefined') e.preventDefault();
				else if (FD.Browser.ie) e.returnValue = false;
				else el.value = newval;
			} else if (val.length > max) {
				el.value = newval.trim();
				fireEvent(el, 'onkeyup');
			}
		}
	},
	checkLabel: function (el) {
		if (!el.tagName || el.tagName.toUpperCase() != 'LABEL' || !el.htmlFor) return el;
		return FD.get(el.htmlFor);
	},
	Random: function () {
		return Math.round(Math.random() * 100000);
	},
	RegExp: function (exp, clean) {
		var re = /(\*|\+|\$|\(|\)|\.|\[|\]|\?|\\|\/|\^|\{|\}|\|)/g; // escape the special characters
		exp = exp.replace(re, '\\$1');
		return (clean ? exp : new RegExp(exp));
	},
	Blink: {
		tmr: 0, items: new FDObjects(), el1: null, el2: null, show: true,
		isBlinking: function (attrib) {
			return this.items.search('id', attrib.id);
		},
		Start: function (attrib) {
			var item = this.items.search('id', attrib.id);
			if (item) return true;
			item = { id: attrib.id, el1: FD.get('tdQA' + attrib.id) };
			if (!item.el1) {
				item.el1 = FD.get('tdA' + attrib.id);
				item.el2 = FD.get('tdQ' + attrib.id);
			}
			this.items.push(item);
			this.Exec();
		},
		Exec: function () {
			window.clearTimeout(this.tmr);
			this.tmr = this.Exec.delay(this, (this.show ? 1300 : 400));
			for (var i = 0; i < this.items.length; i++) {
				this.Show(this.items[i], this.show);
			}
			this.show = !this.show;
		},
		Show: function (item, show) {
			show = (arguments.length == 1 ? item.el1.style.visibility == 'hidden' : show);
			show = (show ? '' : 'hidden');
			if (item.el1) item.el1.style.visibility = show;
			if (item.el2) item.el2.style.visibility = show;
		},
		Stop: function (id) {
			if (this.tmr) window.clearTimeout(this.tmr);
			if (id) {
				var item = this.items.search('id', id);
				if (item) {
					this.items.remove(item.index);
					this.Show(item, true);
				}
				item = null;
			} else {
				for (var i = 0; i < this.items.length; i++) this.Show(this.items[i], true);
				this.items = new FDObjects();
			}
			if (this.items.length == 0 && this.tmr) window.clearTimeout(this.tmr);
			else if (this.items.length > 0) this.tmr = window.setTimeout('FD.Utils.Blink.Exec();', (this.show ? 1300 : 400));
		}
	},
	isElementInView: function (elem, complete) {
		var dim = getWindowDim(), horizontal = false, vertical = false;
		var docViewLeft = dim.scrollLeft, docViewRight = docViewLeft + dim.clientWidth;
		var elemLeft = getX(elem, true), elemRight = elemLeft + elem.offsetWidth;
		var docViewTop = dim.scrollTop, docViewBottom = docViewTop + dim.clientHeight;
		var elemTop = getY(elem, true), elemBottom = elemTop + elem.offsetHeight;
		//alert(dim.clientWidth + ', '+docViewLeft + '/' + docViewRight + ', ' + elemLeft + '/' + elemRight + '; ' + docViewTop + '/' + docViewBottom + ', ' + elemTop + '/' + elemBottom);
		if (complete) {
			horizontal = (elemLeft >= docViewLeft && elemRight <= docViewRight);
			vertical = (elemTop >= docViewTop && elemBottom <= docViewBottom);
		} else {
			horizontal = ((elemLeft >= docViewLeft && elemLeft < docViewRight) || (elemRight <= docViewRight && elemRight > docViewLeft) || (elemLeft <= docViewLeft && elemRight >= docViewRight));
			vertical = ((elemTop >= docViewTop && elemTop < docViewBottom) || (elemBottom <= docViewBottom && elemBottom > docViewTop));
		}

		return (horizontal && vertical);
	}
};
Object.extend(FDUtils, __tmp);

var FDResource = new Class({

	Extends: FDBaseClass,
	Implements: Events,

	_class: 'FDResource',
	_trace: false,

	_load: 0,
	_rh: null, // ResourceHandler

	key: '',
	name: '',
	type: '',
	element: null,
	uri: null,
	exists: false,
	ready: false,

	initialize: function (options, rh) {

		this.parent();
		this._rh = rh || null;

		if (!Object.is(options)) {
			this.uri = FDUri.create(options || '');
		} else if (options instanceof FDUri) {
			this.uri = options;
		} else {
			this.setOptions(options);
		}
		this.name = this.uri.toString();

		//this.log('.initialize, ' + Object.inspect(this, ['key', 'name', 'type', 'ready'], 2));

		if (this.ready) {
			this.setReady();
		}

	},
	setOptions: function (options) {
		if (options) {
			this.parent(options);
			if (options.name) this.name = options.name;
			if (options.key) this.key = options.key;
			if (options.type) this.type = options.type || '';
			if (options.uri) this.uri = (String.is(options.uri) && !/\//.test(options.uri) ? FDUri.create().set('file', options.uri) : FDUri.create(options.uri));
			if (this.uri.host.empty() && this.uri.directory.empty()) {
				(this._rh || FD.Resource).checkUri(this.uri);
			}
			if (options.document) this.document = options.document || document;
			if (options.element) this.element = options.element || null;
			if (typeof options.ready != 'undefined') this.ready = options.ready || false;

			if (!this.name) this.name = this.uri.toString();
			this.log('.setOptions, options=' + Object.inspect(options, null, 2));
		}
		this.exists = (this.element ? true : false);

		return this;
	},
	load: function () {
		(this._rh || FD.Resource).load(this);
	},
	setReady: function () {
		this.log('.setReady');
		this.ready = true;
		this.fireEvent('onLoad');
		this.fireEvent('onReady');
		if (this._rh) {
			this._rh.fireEvent('onResourceLoaded', [this]);
			this._rh.fireEvent('onResourceReady', [this]);
		}
	},
	remove: function () {
		delete this._rh._cache[this.key];
		this._rh = this.document = this.element = null;
	}
});

var FDResourceHandler = new Class({

	Extends: FDBaseClass,
	Implements: Events,

	_class: 'FDResourceHandler',

	_trace: false,
	_tmr: {},

	_defaultProtocol: '',
	_defaultHost: '',

	_cache: {},

	initialize: function (options, defaults) {
		this.parent(options);
		this.defaults = Object.extend({}, FDResourceHandler.defaults, defaults);

		var rs = this.find('fd_general.js', true);
		this._defaultProtocol = rs.uri.protocol;
		this._defaultHost = rs.uri.host;

		this.log('.initialize, defaultProtocol=' + this._defaultProtocol + ', defaultHost=' + this._defaultHost);
	},

	load: function () {

		var args = $A(arguments), options = args[0], resource;
		if (!Object.is(options)) {
			options = {
				uri: args.shift(),
				onload: (Function.is(args[0]) ? args.shift() : null),
				check_version: (String.is(args[0]) || Boolean.is(args[0]) ? args.shift() : '')
			}
		}

		var isResource = FDResource.is(options), uri = (isResource ? options.uri : (Object.is(options.uri) || /\//.test(options.uri) ? FDUri.create(options.uri) : FDUri.create().set('file', options.uri))), doc = options.document || document, version = '';

		var e, type = (uri.file.lastIndexOf('.css') > 0 ? 'css' : 'js');

		if (options.check_version) {
			if (Boolean.is(options.check_version)) {
				try { version = 'v' + FD.Label.getInfo(type).version; } catch (e) { this.log('.load, error getting version', 'error'); }
			} else {
				version = this.getVersion(options.check_version);
			}
		} else if (!Boolean.is(options.check_version) || options.check_version) {
			try { version = 'v' + FD.Label.getInfo(type).version; } catch (e) { version = ''; this.log('.load, error getting version, message=' + (e.message||e), 'error'); }
		}
		// Dynamically load the file (it can be a CSS or a JS)

		this.log(['.load, version=' + version + ', uri=', uri, options]); //.toString());

		if ((resource = this.find((isResource ? options : uri.toString()), doc, true)) && resource.exists) { // find the resource, create a resource object if not in cache and return the resource object
			this.log('.load, resource already loaded');
			if (options.onload) {
				if (resource.ready) options.onload.call(resource);
				else resource.addEvent('onLoad', options.onload);
			}
			return resource;
		}

		if (resource.type == 'css') {
			e = doc.createElement('link');
			e.rel = 'stylesheet';
			e.type = 'text/css';
		} else {
			e = doc.createElement("script");
			e.type = "text/javascript";
			e.language = "javascript";
		}

		resource.setOptions({ element: e });
		if (version) resource.uri.querySet(version, '');

		// Add the new object to the HEAD.
		doc.getElementsByTagName("head")[0].appendChild(e);

		// Start downloading it.
		// Gecko fires the "onload" event and IE fires "onreadystatechange" (from IE10 also the onload event)
		if (options.onload) {
			resource.addEvent('onLoad', options.onload);
		}

		resource._load = 0;
		var handler = this, onload = e.onload = function () { resource._load++; resource.log('.onload, count=' + resource._load); if (resource._load <= 1) resource.setReady(); };

		if (FD.Browser.ie && (FD.Browser.version < 9 || doc.documentMode < 9)) {
			e.onreadystatechange = function () {
				if (this.readyState == 'loaded') {
					if (handler._tmr[this.src]) clearTimeout(handler._tmr[this.src]);
					handler._tmr[this.src] = setTimeout(onload, 200);
				}
				if (this.readyState == 'complete') {
					if (handler._tmr[this.src]) clearTimeout(handler._tmr[this.src]);
					handler._tmr[this.src] = setTimeout(onload, 500);
				}
			};
		}

		(function () {
			if (resource.type == 'css') {
				e.href = resource.uri.toString();
			} else {
				e.src = resource.uri.toString();
			}
		}).delay(0);

		this.log('.load, loading resource ' + resource.uri.toString());

		return resource;
	},
	loadFile: function () { return this.load.apply(this, arguments); },
	getVersion: function (resource) {
		resource = this.find(resource, true);
		return resource.uri.getVersion();

		var scripts = document.getElementsByTagName("script"), version = '';
		for (var i = 0; i < scripts.length; i++) {
			if (scripts[i].src.search(scriptname) > -1) {
				var match = /\?(.*)?/.exec(scripts[i].src);
				if (match) version = match[1];
				return version;
			}
		}
		return version;
	},
	getPath: function (filePath, host) {
		var type = (filePath.lastIndexOf('.css') > 0 ? 'link' : 'script'), coll = document.getElementsByTagName(type), path = '', arr;
		for (var i = 0; i < coll.length; i++) {
			path = (type == 'link' ? coll[i].href : coll[i].src);
			if (path.search(filePath) > -1) {
				if (host) {
					arr = path.match(/([htps]{4,5}\:\/\/[^\/\?]+)/);
					path = (arr ? arr[1] : '');
				} else {
					var arr = path.split('/');
					if (arr) {
						arr.pop();
						path = arr.join('/');
					} else {
						path = '';
					}
				}
				return path;
			}
		}
		return path;
	},
	toString: function () {
		var scripts = document.getElementsByTagName("script"), params = new FDKeys();
		for (var i = 0; i < scripts.length; i++) {
			if (scripts[i].src) params.set('script' + (i + 1), scripts[i].src);
		}
		return params.toString();
	},
	toArray: function () {
		var scripts = document.getElementsByTagName("script"), arr = [], script, host = document.location.protocol + '//' + document.location.host;
		for (var i = 0; i < scripts.length; i++) {
			if (scripts[i].src) {
				script = { src: scripts[i].src, external: /(^\/\/)|http(s)?:/.test(scripts[i].src) && scripts[i].src.search(host) <= -1 && !/googleadservices|google-analytics/.test(scripts[i].src), plugin: /(^chrome-extension)/.test(scripts[i].src), loaded: true, loaded_var: '' };
				try {
					var re = /fd_(.*)\.js/.exec(script.src.replace(/\.min/i, ''));
					if (re) script.loaded_var = '__FD_' + re[1].toUpperCase().replace(/\./, '_');
					else if (/get\.asp(.*)expr1=(2|4)(.*)expr2=JS/.test(script.src)) script.loaded_var = '__FD_LANGUAGE';
					else if (/overlib/.test(script.src)) script.loaded_var = '__FD_OVERLIB';
					if (script.loaded_var) {
						script.loaded = eval('(typeof ' + script.loaded_var + ' != "undefined" ? ' + script.loaded_var + ' : false)');
					}
				} catch (e) { }
				arr.push(script);
			}
		}
		return arr;
	},
	isExternal: function (src) {
		var host = document.location.protocol + '//' + document.location.host;
		return /(^\/\/)|chrome:\/\/|resource:\/\/|http(s)?:/.test(src) && src.search(host) <= -1;
	},
	find: function () { // resource, [doc, ]createResource
		var args = $A(arguments),
			resource = args.shift(),
			doc = (args.length > 0 && Object.is(args[0]) ? args.shift() : document),
			createResource = (args.length > 0 && Boolean.is(args[0]) ? args.shift() : false);

		var isObject = Object.is(resource), isResource = FDResource.is(resource), type = (isObject ? resource.type : resource.lastIndexOf('.css') > 0 ? 'css' : 'js');
		doc = (isObject ? resource.document || doc : doc);
		var rs = null, el = null, resourceName = (isObject ? resource.uri.toString() : resource), list = doc.getElementsByTagName((type == 'css' ? 'link' : 'script')), uri = null;

		this.log('.find, resource=' + resourceName + ', createResource=' + (createResource || false) + ', isResource=' + (isResource ? 'yes' : 'no'));

		for (var i = 0, len = list.length; i < len; i++) {
			try {
				if (type == 'js' && list[i].src.search(resourceName) > -1) {
					el = list[i];
					resourceName = el.src;
					break;
				} else if (type == 'css' && list[i].href.search(resourceName) > -1) {
					el = list[i];
					resourceName = el.href;
					break;
				}
			} catch (e) {
				this.log(['.find, type=' + type + ', i=' + i + '/' + len + ', error=' + (e.message || e), list, list[i]]);
			}
		}

		resource = null;
		if (createResource) {

			uri = (/\//.test(resourceName) ? FDUri.create(resourceName) : FDUri.create().set('file', resourceName));
			this.checkUri(uri);

			if (!isResource) {
				rs = { uri: uri, type: type, document: doc, ready: (el ? true : false), element: el };
				if (isObject) rs = Object.extend(resource, rs);
			} else {
				rs = resource.setOptions({ uri: uri, ready: (el ? true : false), element: el });
			}
			resource = this.create(rs);
		}

		return resource || el;
	},
	exists: function (resourceName, doc) {
		var resource;
		return (this.find(resourceName, doc) != null);
	},
	getObject: function () { return this.find.apply(this, arguments); },
	create: function (resource) {
		doc = resource.document || document;

		if (!doc['__resourceHandlerKey']) doc['__resourceHandlerKey'] = this.getUniqueID();
		var key = resource.key = doc['__resourceHandlerKey'] + '::' + resource.uri.toString();

		this.log('.create, key=' + key + ', cached=' + (this._cache[key] ? 'yes' : 'no') + ', isResource=' + (FDResource.is(resource) ? 'yes' : 'no'), 'group');

		if (this._cache[key]) resource = this._cache[key];
		else {
			var instance = FDResourceHandler.classes[resource.type || 'default'] || FDResourceHandler.classes['default'];
			this._cache[key] = resource = (resource instanceof instance ? resource : new instance(resource, this));
		}

		this.log(resource);
		this.log('', 'groupEnd');

		return resource;
	},
	checkUri: function (uri) {
		if (uri.file) {
			var info, type;
			// if there is a file part of the uri but no host or directory part then fill these with the defaults to get a full uri
			if (uri.host.empty()) {
				uri.set({ protocol: this._defaultProtocol, host: this._defaultHost });
			}
			if (uri.directory.empty() && (type = /\.(\w{2,3})$/.exec(uri.file))) {
				if (type[1] == 'css') var info = FD.Label.getInfo(type[1]);
				uri.set({ directory: (type[1] == 'css' ? info.path : '/scripts/') });
			}
		}
		return uri;
	},
	isLoaded: function (scriptname) {
		return (this.find(scriptname) ? true : false);
	},
	Check: function () {
		var scripts = this.toArray(), script, retval = true;
		for (var i = 0; i < scripts.length; i++) {
			script = scripts[i];
			if (script.loaded_var && !script.loaded) { retval = false; alert(script.src); break; }
		}
		return retval;
	}
}).extend({
	classes: {
		'default': FDResource
		// extendable with classes prefixed with the extension, e.g. FDResourceCss
	}
});
FD.Script = FD.Resource = new FDResourceHandler();

var FDForm = new Class({

	Extends: FDBaseClass,
	Implements: Events,

	_class: 'FDForm',
	_trace: true,

	name: '',
	domain: '',
	account: '',

	_form: null,
	_inited: false,
	_in_event: false,
	_time: null,
	_loading_call_count: 0,
	/*_refcount: new FDKeys(),*/

	isLoading: false,
	Info: { action: 0 },

	initialize: function () {
		this.parent();
		this._time = new Date();

		var dir = FDUri.current.directory.substr(1).split('/');
		if (dir.length > 0) this.domain = this.account = dir.shift();
		if (dir.length > 0) this.name = dir.shift();

		this.log('.initialize, domain=' + this.domain + ', name=' + this.name);

		try {
			// these two events are fired from the load function of the document
			FD.Events.AttachEvent('BeforeLoad', (function () { this.beforeLoad(true); }).bind(this));
			FD.Events.AttachEvent('AfterLoad', this.afterLoad.bind(this, true));

			if (typeof jQuery != 'undefined') jQuery(document).ready(this.ready.bind(this));
			else addEventHandler(window, 'onload', this.ready.bind(this));

		} catch (e) { alert('fdform.initialize: ' + e); }
	},

	ready: function () {
		if (!document.body) {
			this.ready.delay(this, 50);
			return;
		}
		this.log('.ready');
		var forms = document.getElementsByTagName('form');
		if (forms && forms.length > 0) this._form = forms[0];
		this.fireEvent('onReady');
	},

	beforeLoad: function (fromEvents) {
		if (this._in_event) return;
		this.log('.beforeLoad, fromEvents=' + fromEvents);
		this._in_event = true;
		this.fireEvent('onBeforeLoad');
		if (!fromEvents) FD.Events.FireEvent('BeforeLoad');
		this._in_event = false;
	},
	afterLoad: function (fromEvents) {
		if (this._in_event) return;
		this.log('.afterLoad, fromEvents=' + fromEvents);
		this._in_event = true;
		this.fireEvent('onAfterLoad');
		if (!fromEvents) FD.Events.FireEvent('AfterLoad');
		this._in_event = false;
	},

	setLoading: function (loading, reset) {
		if (reset) this._loading_call_count = 0;
		else this._loading_call_count += (loading ? 1 : -1);
		if (this._loading_call_count > 0 && !loading) loading = true;
		this.isLoading = lLoading = loading;
	},
	getTimestamp: function () {
		return (new Date()) - this._time;
	},
	getDuration: function () {
		return this.getTimestamp();
	},
	getStarted: function (format) {
		format = format || 'dd-mm-jjjj hh:mm:ss';
		return FD.Date.Format(this._time, format);
	},
	Action: {
		Get: function (param, alt, type) {
			var uri = new FDUri(document.builder.action);
			return uri.queryGet(param, (arguments.length > 1 ? alt : null), (arguments.length > 2 ? type : null));
		},
		Set: function (query, extra) {
			var uri = (new FDUri(document.builder.action)).queryMerge(query);
			if (extra) uri.queryMerge(extra);
			document.builder.action = uri.toString();
		},
		Remove: function (keys) {
			if (!Array.is(keys)) keys = keys.split(',');
			var uri = (new FDUri(document.builder.action)).queryRemove(keys);
			document.builder.action = uri.toString();
		},
		setRoute: function (route, options) {
			var uri = new FDUri(document.builder.action);
			uri.setRoute(route, options);
			document.builder.action = uri.toString();
		}
	},
	AppendElement: function () {
		var args = $A(arguments), doc = (Object.is(args[0]) ? args.shift() : document);
		var type = /([^\[\]]*)\[?(?:type=)?"?'?([^\[\]"']*)'?"?\]?/.exec(args[0]);
		var el = doc.getElementById(args[1]);

		if (!el) {
			el = doc.createElement(type[1]);
			if (type.length > 2) {
				el.type = type[2];
			}
			el.name = el.id = args[1];
			el.value = args[2];
			var form = doc.getElementsByTagName('form')[0];
			if (!form) {
				$(doc).ready((function () { this.AppendElement.call(this, [doc].append(args)); }).bind(this));
			} else {
				form.appendChild(el);
			}
		} else {
			if (type[1] == 'input' && el.type && /text|hidden/.test(el.type) && (args.length <= 3 || args[3])) el.value = String.create(el.value).append(args[2], (args.length >= 4 ? args[3] : '\r\n---\r\n'));
			else el.value = args[2];
		}
		String.log('.AppendElement, element appended');
		return el;
	},
	Submit: function (params) {
		if (params) this.Action.Set(params);
		document.builder.submit();
	},
	silentSubmit: function (cancel) {
		if (FD.Uri.queryExists('r')) return true; // no submit when a form is edited or inserted from the results summary
		try { if (typeof AJAX == 'undefined' || !AJAX.checkEnabled()) return true; } catch (e) { return true; }
		try {
			FD.Events.FireEvent('AfterSubmitForm', { action: 0 });
		} catch (e) { FD.Error.Alert(true, e, 'fd_general.js', 2449, 'FD.Form.silentSubmit'); }

		var url = document.builder.action;
		var data = {
			url: url + '&xml=true' + (cancel ? '&cancel=true' : ''),
			async: false,
			verb: 'POST',
			charset: 'utf-8',
			content: AJAX.Utils.collectFormData(document.builder, false, true),
			callback: function () { }
		};
		var retval = 0, req = AJAX.sendRequest(data);
		try {
			var oData = req.responseXML, node = oData.selectNodes('//result').item(0);
		} catch (e) { ; }
		if (node) {
			if (Number.int(AJAX.getNodeValue(node, 'code', '')) == 0) {
				node = node.selectSingleNode('value/form');
				$('#_fd_upd').val(AJAX.getNodeValue(node, 'upd'));
				var id = Number.int(AJAX.getNodeValue(node, 'id'));
				if (id > 0) {
					FD.Form.Action.Set({ 'id_form_visitor': id });
					var el = document.createElement('input');
					el.name = 'txtUID';
					el.type = 'hidden';
					el.value = AJAX.getNodeValue(node, 'uid');
					document.builder.appendChild(el);
					retval = 1;
				}
			} else {
				var msg = AJAX.getNodeValue(node, 'error_message_extended');
				alert(msg);
				retval = 2;
			}
		}
		FD.Input.Reverse(null, true);
		return retval;
	},
	Features: {
		has: function () { return false; },
		get: function () { return null; }
	}

});
FD.Form = new FDForm();

var FDFormResult = new Class({

	Extends: FDBaseClass,
	_class: 'FDFormResult',

	_parent: null,
	Status: null,

	initialize: function () {
		var args = $A(arguments);
		if (args.length == 1 && Object.is(args[0])) {
			this._parent = args.shift();
		}
		this.parent.apply(this, args);
		this.Status = new FDFormResultStatus();
	},
	getID: function () {
		var id = FD.Form.Action.Get('id_form_visitor', 0, 'int');
		if (!id) id = FD.Form.Action.Get('id_form_result', 0, 'int');
		if (!id) id = FD.Form.Info.id_form_result || 0;
		return id;
	},
	setID: function (id) {

		FD.Form.Action.Set(['id_form_visitor', id, 'id_form_result', id]);

		if (this._isParentInfo()) {
			this._parent.id_form_result = id;
		} else {
			FD.Form.Info.id_form_result = id;
		}
		return id;
	},
	_isParentInfo: function () {
		return this._parent != null && typeof (FDInfo) != 'undefined' && this._parent instanceof FDInfo;
	}
});
var FDFormResultStatus = new Class({

	Extends: FDBaseClass,
	_class: 'FDFormResultStatus',

	_current: '',

	List: { all: [], form: [], Set: function (all, form) { this['all'] = all; this['form'] = form; } },
	Set: function (status) {
		this._current = status;
		if (arguments.length > 1) this.List.Set(arguments[1], arguments[2]);
	},
	Current: function (status) {
		var status = (status ? status : this._current);
		var search = this.List.form.search(status, 2 /* 2d array */), search_org, loop = 0;
		if (search.index < 0) {
			/*	(current) status is not part of the current form features anymore
			this is possible when a corresponding setting/feature has been switched off */
			do {
				// search this index in the total list of statuses
				search_org = this.List.all.search(status, 2 /* 2d array */);

				if (search_org.row > 0) {
					status = this.List.all[search_org.row - 1][1] // previous done status;
					search = this.List.form.search(status, 2 /* 2d array */);
				}
			} while (search.index < 0 && search_org.row > 0)
		}
		var retval = { name: (search.index >= 0 ? status : ''), row: search.row, col: search.col, index: search.index };
		return retval;
	},
	Index: function (list, status) {
		return this.List[list].search(status, 2).index;
	},
	Compare: function () {
		var compare = arguments[0], status = this.Current((arguments.length == 2 ? '' : arguments[1])), with_status = this.Current((arguments.length == 2 ? arguments[1] : arguments[2]));
		switch (compare) {
			case 'equal':
				return status.index == with_status.index;
			case 'greater':
				return status.index > with_status.index;
			case 'greater-equal':
				return status.index >= with_status.index;
			case 'less':
				return status.index < with_status.index;
			case 'less-equal':
				return status.index <= with_status.index;
		}
	}
}).extend({
	// Most importand statusses
	SAVED: 'SAVED',
	SUBMITTED: 'SUBM',
	CONFIRMATION_STARTED: 'CFS',
	EMAIL_VERIFICATION_STARTED: 'EVS',
	SMS_VERIFICATION_STARTED: 'SVS',
	PAYMENT_STARTED: 'PMS',
	SIGNING_STARTED: 'DNS',
	WORKFLOW_STARTED: 'WFS',
	CANCELLED: 'CANC',
	DONE: 'DONE'
});
FD.Form.Result = new FDFormResult();

FDViewPort = new Class({

	Extends: FDBaseClass,
	_class: 'FDViewPort',

	_trace: true,

	orientation: 0, // 0 & 180 = portrait, 90 = landscape
	viewportScale: 1,

	initialize: function () {
		this.parent();
		FD.Resource.load('detect-zoom.js', true);
		if (true || FD.Browser.mobile) {
			if (FD.isFrontend()) {
				addEventHandler(window, 'onload', (function () {
					try { if (!window.frameElement) this.Set(); } catch (e) { return; }
					try {
						var wnd = (window.frameElement ? top : window);
						if (typeof wnd.orientation === 'undefined') {
							var media = wnd.matchMedia("(orientation: portrait)");
							media.addListener(this.Set.bind(this));
						} else {
							addEventHandler(wnd, 'onorientationchange', this.Set.bind(this));
						}
					} catch (e) { }
				}).bind(this));
			} else if (true) { //if(!FD.Cookie.Get('desktop', null, 'boolean')) {
				//$(window).on('load', (function () { if ($('body').hasClass('responsive-enable')) { /*this.setToScreenWidth('minimum-scale=1,maximum-scale=1');*/ this.setToScreenWidth(); $(window).resize(); } }).bind(this));
				try {
					var wnd = (window.frameElement ? top : window), _fn = (function () {
						//$('body').css('visibility', 'hidden');
						this.setToScreenWidth();
					}).bind(this);
					if (typeof wnd.orientation === 'undefined') {
						var media = wnd.matchMedia("(orientation: portrait)");
						media.addListener(_fn);
					} else {
						addEventHandler(wnd, 'onorientationchange', _fn);
					}
				} catch (e) { }
			}
		}
	},

	setToScreenWidth: function (settings) {
		try { this.getScale(); } catch (e) { alert('setToScreenWidth: ' + (e.message || e)); }
		//alert(this.screenWidth + ', ' + ($('body').hasClass('responsive-enable') && FD.Backend.Settings.get('responsive/mode') == 'mobile' ? this.screenWidth : 1024));
		this.Set(null, ($('body').hasClass('responsive-enable') && FD.Backend.Settings.get('responsive/mode', 'mobile') == 'mobile' ? this.screenWidth : 1024), settings);
	},
	remove: function () {
		$('meta[name=viewport]').attr('content', 'width=device-width, initial-scale=1');
		//		$('meta[name="viewport"]').remove();
	},

	Set: function (el, width, settings) {

		if (typeof Event != 'undefined' && instanceOf(el, Event)) el = null;

		try {
			this.orientation = (window.frameElement ? top : window).orientation;
		} catch (e) { }
		if (false && !FD.Browser.mobile) {
			this.log('.Set, not a mobile browser');
			return;
		}
		//this.log('.Set, width=' + width);
		if (!width) {
			el = FD.get(el || 'set-viewport');
			if (!el) el = FD.get('builder');
			if (!el) return;
			var margin = padding = 0;
			if (window.getComputedStyle) {
				var css = window.getComputedStyle(document.body, null);
				margin = FD.Element.Dimensions.getMargin(null, 'left,right', css); //Number.create(css.getPropertyValue('margin-left')) + Number.create(css.getPropertyValue('margin-right'));
				padding = FD.Element.Dimensions.getPadding(null, 'left,right', css);
			}
			width = el.offsetWidth;

			//this.log(['.Set, width=' + width + ', el=' + el + ', margin=' + margin + ', padding=' + padding + ', typeof(Event)=' + typeof Event + ', ' + instanceOf(el, Event), el, Event]);

			width = width + margin + padding;
			if (FD.Browser.tablet && width < 600) width = 600;
			else if (!FD.Browser.tablet && width < 300) width = 300;

		}
		var viewport = FD.get('viewport');
		if (!viewport) {
			$('head').append($('<meta name="viewport"></meta>'));
			viewport = FD.get('viewport');
		}
		if (viewport) {
			this.log('.Set, content="width=' + (width + 10) + ', user-scalable=yes"');
			/* initial-scale prevents subsequent viewport scaling meaning that subsequent calling of this function won't do anything when initial-scale is present in the string */
			viewport.setAttribute('content', 'width=' + width + /*',initial-scale=' + (FD.isFrontend() ? '1' : '0.6') + */(settings ? ',' + settings : ''));
		}
		//if (typeof jQuery != 'undefined') $(window).resize();
	},

	// Update viewport orientation
	//-----------------------------
	updateOrientation: function () {
		try {
			this.orientation = (window.frameElement ? top : window).orientation;
		} catch (e) {
			try {
				this.orientation = window.orientation;
			} catch (e) { }
		}
		if (this.orientation === undefined) {
			// No JavaScript orientation support. Work it out.
			if (document.documentElement.clientWidth > document.documentElement.clientHeight) this.orientationType = 'landscape';
			else this.orientationType = 'portrait';

		}
		else if (this.orientation === 0 || this.orientation === 180) this.orientationType = 'portrait';
		else this.orientationType = 'landscape'; // Assumed default, most laptop and PC screens.

	},

	// Get current scale
	//-------------------
	getScale: function () {

		// Get viewport width
		var viewportWidth = document.documentElement.clientWidth;

		// Abort. Screen width is greater than the viewport width (not fullscreen).
		/*if (screen.width > viewportWidth) {
		this.log('.getScale, Aborted viewport scale measurement. Screen width > viewport width');
		return;

		}*/

		// Get the orientation corrected screen width
		this.updateOrientation();

		var inFrame = false, width, height;

		try {
			inFrame = (typeof window.frameElement != 'undefined' && window.frameElement != null);
		} catch (e) {
			inFrame = true; // posible a cross origin exception. then we are in a frame
		}

		this.log(['.getScale', window, top]);

		if (inFrame) {
			width = this.screenWidth = $(window).innerWidth();
			height = this.screenHeight = $(window).innerHeight();
		} else {
			width = this.screenWidth = screen.width;
			height = this.screenHeight = screen.height
		}
		if (this.orientationType === 'portrait') {
			// Take smaller of the two dimensions
			if (screen.width > screen.height) {
				this.screenWidth = height;
				this.screenHeight = width;
			}
		} else if (screen.width < screen.height) { // Take larger of the two dimensions
			this.screenWidth = height;
			this.screenHeight = width;
		}

		// Calculate viewport scale
		this.viewportScale = this.screenWidth / window.innerWidth;
		return this.viewportScale;

	},

	getDimensions: function (wnd) {

		
		// not yet found a solution to get the right dimensions on a tablet/mobile
		try {
			if (top != window && typeof top.FD != 'undefined' && typeof top.FD.Backend != 'undefined') {
				return top.FD.ViewPort.getDimensions();
			}
		} catch (e) { this.log('.getDimensions, ERROR, ' + (e.message || e)); }

		//this.updateOrientation();
		this.getScale();
		var device = 1, zoom = 1;
		if (typeof detectZoom != 'undefined') {
			device = detectZoom.device();
			zoom = detectZoom.zoom();
			if (FD.Browser.WebKit && (!FD.Browser.mobile || zoom == 0)) zoom = window.outerWidth / ($(window).outerWidth() + (document.body.scrollHeight - $(document.body).getPadding('top,bottom') > document.body.offsetHeight ? 17 : 0));
			//this.log('.getDimensions, outerWidth=' + window.outerWidth + ', ' + $(window).outerWidth() + ', ' + ($(window).outerWidth() + (document.body.scrollHeight - $(document.body).getPadding('top,bottom') > document.body.offsetHeight ? 17 : 0)) + ', ' + window.getComputedStyle(document.body).getPropertyValue('padding-top'));
		}
		//alert(FD.Browser.android_version + ', ' + this.screenWidth + ', ' + zoom + ', ' + (this.screenWidth / zoom) + ', outerWidth=' + window.outerWidth + ', ' + $(window).outerWidth());
		var width = this.screenWidth, height = this.screenHeight, inFrame = false;
		try {
			inFrame = (typeof window.frameElement != 'undefined' && window.frameElement != null);
		} catch (e) {
			// probably an access denied. So, we're in an iframe
			inFrame = true;
		}
		if (!inFrame) {
			width = width / zoom;
			height = height / zoom;
		}
		var dim = { width: width, height: height, device: device, zoom: zoom, scrollLeft: $(document).scrollLeft(), scrollTop: $(document).scrollTop() };

		this.log('.getDimensions, ' + Object.inspect(dim));
		return dim;
	},

	getWindowDimensions: function (wnd) {

		wnd = $(wnd);
		var dim = { width: wnd.innerWidth(), height: wnd.innerHeight(), zoom: 1 };
		if (FD.Browser.mobile) {

			// still have to find a way how to get the right dimension on a tablet
			var viewport = Object.extend(dim, this.getDimensions(wnd[0]));
			dim.centerX = (viewport.width / 2) + viewport.scrollLeft;
			dim.centerY = (100 / viewport.zoom) + viewport.scrollTop;

			this.log(['.getWindowDimensions', Object.inspect(dim)]);

			//alert(Object.inspect(dim));
		} else {
			dim.centerX = (dim.width / 2) + $(wnd[0].document).scrollLeft();
			dim.centerY = (dim.height / 2) + $(wnd[0].document).scrollTop();
		}
		return dim;
	}

});
FD.ViewPort = new FDViewPort();

// a depricated wrapper for the new FDUri.current object
var FDParams = new Class({

	Extends: FDBaseClass,
	_class: 'FDParams',

	initialize: function () {
		this.parent();
		// normalize some methods to correspond with the FDKeyArray
		this.get = this.Get;
		this.exist = this.exists = this.Exists;
		this.remove = this.Remove;
	},

	Get: function (name, alt, type) {
		return FDUri.current.queryGet.apply(FDUri.current, arguments);
	},
	Set: function () {
		return FDUri.current.querySet.apply(FDUri.current, arguments);
	},
	Exists: function (name) {
		return FDUri.current.queryExists.apply(FDUri.current, arguments);
	},
	Exist: function (name) { return FDUri.current.queryExists.apply(FDUri.current, arguments); },
	Remove: function (name) { return FDUri.current.queryRemove.apply(FDUri.current, arguments); }
});
FD.Params = FD.Form.Params = new FDParams();

FD.Logout = function (lang) {
	//if ((typeof window.noForce != 'undefined' && window.noForce) || !FD.Params.Get('logout', true, 'boolean') || (FD.Form.Info.action > 100 && !FD.Form.Info.isTesting)) return;
	var action = 0, sidn = '';
	try {
		action = FDUri.current.queryGet('action', 0, 'int');
		if (action <= 0) action = FD.Form.Action.Get('action', 0, 'int');
		sidn = FDUri.current.queryGet('sidn');
		if (sidn.empty()) sidn = FD.getAuth().sidn || FD.Form.Action.Get('sidn');
	} catch (e) { }
	lang = lang || FD.Form.Info.lang;
	action = (action >= 100 ? 100 : 1); // Math.min(action, 100);
	var nextstep = (action < 100 ? 3 : 65);
	if (typeof AJAX != 'undefined') {
		var data = FD.Ajax.Form.Task.create('logout');
		data.callback = function () { };
		data.noload = FD.Ajax.silent = true;
		FD.removeContext();
		FD.Ajax.Form.Task.get('logout', true, 'nextstep=' + nextstep + (!sidn.empty() ? '&sidn=' + sidn : ''));
	} else {
		var oWnd = OpenWindow(window, '', 200, 100, 'no', 'no');
		if (Object.is(oWnd)) {
			oWnd.document.write(unescape('%3Chtml%3E%3Chead%3E%3Ctitle%3E' + FD.Texts.get('FORCED_LOG_OUT') + '%3C/title%3E%3C/head%3E%3Cbody bgcolor=%22LightGrey%22 style=%22margin:0px%22%3E%3Ctable cellspacing=%220%22 cellpadding=%220%22 width=%22100%%22 height=%22100%22%3E%3Ctr%3E%3Ctd style=%22font-family: arial, verdana;font-size:10pt%22%3E%3Cimg border=%220%22 src="' + FD.Info.getLabel().path + 'images/key.gif" align=%22absmiddle%22%3E&nbsp;' + FD.Texts.get('FORCED_LOG_OUT') + '%3C/td%3E%3C/tr%3E%3C/table%3E%3C/body%3E%3C/html%3E'));
			oWnd.document.close();
			oWnd.setTimeout("document.location = '?lang=" + lang + "&action=" + action + "&nextstep=" + nextstep + (!sidn.empty() ? '&sidn=' + sidn : '') + "&close=true'", 10);
		} else {
			document.location = '?lang=' + lang + '&action=' + action + '&nextstep=' + nextstep + (!sidn.empty() ? '&sidn=' + sidn : '');
		}
	}
	
};
// not used (yet)
FD.setLogout = function (lang) {
	$(window).on('beforeunload', function () {
		if (!window.Submitted && !window.IsRefreshing) {
			FD.Logout(lang);
		}
	});
	$(document).on('keydown', function (e) {
		if ((e.keyCode == 65 && e.ctrlKey) || (e.which || e.keyCode) == 116) {
			e.preventDefault();
		}
	});
}

FD.closeWindow = function (e) {

	String.log(['FD.closeWindow', e]);

	if (!e || e.type != 'load') {
		window.setTimeout(function () { try { var wnd = (typeof FD.Window != 'undefined' ? FD.Window : window); wnd.alert(FD.Texts.get('ALERT_CLOSE_FORM')); } catch (e) { } }, 500);
	}
	try {
		$('#btnClose').disable();
//		var el = FD.get('btnClose');
//		if (el) el.parentNode.removeChild(el);
	} catch (e) { ; }
	try { // IE, Chrome trick
		window.opener = 'X';
		window.open('', (FD.Browser.ie ? '_parent' : '_self'), '');
		window.close();
	} catch (e) {
		String.log(e, 'error');
		window.close();
	}

};

var FDInputHandler = new Class({

	Extends: FDBaseClass,
	_class: 'FDInputHandler',

	_trace: true,

	_init: false,
	_el: null,
	_inputTmr: 0,
	activeElement: null,
	_log: [],
	_eventsBound: false,

	initialize: function () {

		this.parent();
		this.log('.initialize');

		this.Log = new FDInputLog();
		this.Masks = new FDInputMasks();
		this.Formats = new FDInputFormats();

		if (FD.isBackend()) $(document).ready(this.init.bind(this));
		else {
			FD.Events.AttachEvent('BeforeLoad', this.init.bind(this), 0);
		}
		addEventHandler(document, 'onkeypress', this.keyEvent.bind(this), true);
	},

	Init: function () { return this.init.apply(this, arguments); },
	init: function (el) {
		this.log('.init, el=' + el + ', isevent=' + FDEvent.is(el), 'group');
		this.log(el);

		if (el && ((Function.is(el) && !(el instanceof jQuery)) || FDEvent.is(el))) el = null;
		if (this._init && !el) {
			this.log('', 'groupEnd');
			return;
		}
		if (!el) { this._init = true; }
		var handler = this, coll = (el && !FDEvent.is(el) ? (el instanceof jQuery ? el : new Array(el)) : document.getElementsByTagName('input')), format, num = false, readonly = false, item, $item, f;

		this.log('.init, count=' + coll.length);

		$(coll).off('.inputhandler');

		for (var i = 0; i < coll.length; i++) {

			item = coll[i];
			$item = $(item);

			if (item.disabled || !item.getAttribute) continue;
			format = item.getAttribute('fd:format');
			if (format) {
				this.log('.init, i=' + i + ', format=' + format);
				readonly = item.readOnly;
				if (item.readOnly) coll[i].readOnly = false;

				f = handler.blurEvent.bind(handler);
				if (item.onblur) {
					f = item.onblur.before(f, item);
					item.onblur = null;
					//item.onblur = item.onblur.before(function (e) { e = e || window.event; handler.blurEvent(e); }, item);
				}
				$item
					.on('blur.inputhandler', f)
					.on('paste.inputhandler', function (e) { e = e || window.event; handler.blurEvent.delay(handler, 100, cloneEvent(e)); });

				//if (item.type == 'number') {
				// also handle the spinner clicks
				$item
					.on('input.inputhandler', function (e) {
						//String.log(['oninput',e]);
						clearTimeout(handler._inputTmr);
						if (!$(e.target).is(':focus')) {
							handler._inputTmr = handler.inputEvent.delay(handler, 200, e);
						}
					})
					.on('keyup.inputhandler', function (e) { if (handler._inputTmr) clearTimeout(handler._inputTmr); handler._inputTmr = 0; });
				//}

				if (format == 'number') {
					num = true;
					$item.css('text-align', 'right');
					item.setAttribute('fd:inputmask', 'm:number');

					f = handler.focusEvent.bind(handler);
					if (item.onfocus) {
						f = item.onfocus.before(f, item);
						item.onfocus = null;
					}
					$item.on('focus.inputhandler', function (e) { e = e || window.event; handler.focusEvent(e); });

					f = handler.changeEvent.bind(handler);
					if (item.onchange) {
						f = item.onchange.before(f, item);
						item.onchange = null;
					}
					$item.on('change.inputhandler', f);

				} else if (!item.getAttribute('fd:inputmask') && typeof handler.Masks[format] != 'undefined') {
					item.setAttribute('fd:inputmask', 'm:' + format);
				}
				if (readonly) item.readOnly = readonly;
				item.initInput = true;
				if (!item.value.empty() && typeof WYSIWYG == 'undefined') item.value = this.Format(item, item.value, false, null, true);
			}
		}
		if (num && (!el || !this._eventsBound)) {
			this._eventsBound = true;
			FD.Events.AttachEvent('AfterSubmitForm', this.Reverse.bind(this)); // frontend
			if (FD.isBackend()) FD.Backend.addEvent('onBeforeSubmit', this.Reverse.bind(this));
			else FD.Events.AttachEvent('BeforeSubmit', this.Reverse.bind(this)); // backend ??
		}

		if (FD.isFrontend()) {
			try {
				FD.Form.AppendElement('input[type="hidden"]', '_fd_inputhandler_init', 'hasNum=' + num + ', eventsBound=' + this._eventsBound);
			} catch (e) { }
		}

		this.log('', 'groupEnd');
	},

	_reverseTraceLog: [],
	_reverseCount: 0,

	Reverse: function (args, show) {

		this._reverseTraceLog.push('show=' + (show || false) + ', count=' + this._reverseCount + '\r\n---------- Stack\r\n' + FD.Stack.Format({ type: 'xml', truncate: 100 }) + '\r\n' + '--------------');

		if ((!show && this._reverseCount >= 1)) {

			try {
				FD.Form.AppendElement('input[type="hidden"]', '_fd_reverse', 'Double FDInputHandler.Reverse call!');
			} catch (e) { }

			FD.Error.Send('Double FDInputHandler.Reverse call!', document.location.href, 0, 'FDInputHandler.Reverse', this._reverseTraceLog.join('\r\n'));
			return;
		}

		/* show: true to format the values to show on the form, false to format the values to be saved */
		var i,
			el,
			coll = document.getElementsByTagName('input'),
			format,
			orgval,
			newval,
			dec,
			debug = 'tsep=' + Number.tsep + '; dsep=' + Number.dsep + '\r\n',
			_alert = false,
			reg = new RegExp("[" + Number.dsep.toRegExp() + "]"),
			isReadOnly, isDisabled;

		this.log('.Reverse, length=' + coll.length);
		for (var i = 0; i < coll.length; i++) {
			el = coll[i];
			if ((format = el.getAttribute('fd:format')) && !el.value.empty() && (el.getAttribute('fd:reverse') == null || el.getAttribute('fd:reverse') == 'true')) { // && format == 'number'
				orgval = el.value;
				dec = Number.int(el.getAttribute('fd:decimals'));
				if (!show) {
					debug += ('ID=' + el.id + ', value=' + orgval + ', dec=' + dec + ', tsep=' + Boolean.create(el.getAttribute('fd:tsep')) + ', readOnly=' + el.readOnly + ', disabled=' + el.disabled);
					try {
						debug += (', initInput=' + (el.initInput || false));
						debug += (', fillInput=' + (el.fillInput || false));
						debug += (', focusInput=' + (el.focusInput || false));
						debug += (', blurInput=' + (el.blurInput || false));
					} catch (e) { }
				}

				if (show) {
					el.value = FD.Input.Format(el, el.value, false, null);
				} else {
					el.value = newval = FD.Input.Format(el, el.value, true, false);
				}

				if (!show) {
					debug += (', reversed=' + newval + ', value=' + el.value);
					if (format == 'number' && (((reg.test(orgval) || dec > 0) && !/[\.]/.test(newval)) || /,/.test(newval) || /,/.test(el.value))) {
						debug += ', ALERT';
						_alert = true;
						isReadOnly = el.readOnly;
						isDisabled = el.disabled;
						if (isReadOnly || isDisabled) {
							el.readOnly = el.disabled = false;
							el.value = newval;
							debug += (', readonly or disabled!, value=' + el.value);
							if (isReadOnly) el.readOnly = true;
							if (isDisabled) el.disabled = true;
						}
					}
					debug += '\r\n';
				}
			}
		}
		if (!show) {
			this._reverseCount++;
			if ((FD.Form._inited || FD.isBackend())) {
				try {
					FD.Form.AppendElement('input[type="hidden"]', '_fd_reverse', 'reverseCount=' + this._reverseCount + '; ' + debug);
					if (_alert) FD.Form.Action.Set({ num_err: true });
				} catch (e) { }
			}
		} else if (this._reverseCount > 0) {
			this._reverseCount--
		}

	},

	isAllSelected: function (el) {
		try {
			if (FD.Browser.ie && document.selection) return (document.selection.createRange().text.length == el.value.length);
			else return (el.selectionStart + el.selectionEnd == el.value.length);
		} catch (e) {
			return false;
		}
	},

	focusEvent: function (e) {
		var el = checkEvent(e), val = el.value, format, pos = 0, occurs, moved, start, selectall = false;
		if ((format = el.getAttribute('fd:format')) && format == 'number' && el.type != 'number') {
			el.focusInput = true;
			try {
				selectall = this.isAllSelected(el);
				if (FD.Browser.ie && document.selection) {
					if (!selectall) {
						moved = document.selection.createRange().moveEnd('character', 200);
						start = val.left(val.length - moved);
						pos = val.length - moved - start.occurs(Number.tsep);
					}
				} else {
					if (!selectall) {
						moved = el.selectionStart;
						start = val.left(moved);
						pos = moved - start.occurs(Number.tsep);
					}
				}
				el.value = this.Format(el, el.value, true, true);  //String.format('number', el.value, true, true);
				if (!selectall) { FD.Selection.setCaretToPos(el, pos); }
				else { el.select(); }
			} catch (e) {
				this.Log.Add("ALERT! FD.Input.focusEvent: el.name=" + el.name + ", value=" + val + ", message=" + (e.message || e));
				FD.Error.Alert(true, e, 'fd_general.js', 3046, 'FD.Input.focusEvent');
			}
		}
	},

	keyEvent: function (e) {
		this.log('.keyEvent, e=' + e);
		e = e || window.event;
		if (!e) return true;
		var el = checkEvent(e), km = null, im = null;
		if (!el || typeof el.getAttribute == 'undefined' || (FD.Browser.android && FD.Browser.android_version < 4)) return true;
		try { km = el.getAttribute('fd:keymask'); im = el.getAttribute('fd:inputmask'); } catch (e) { }
		if (el && !el.disabled && !el.readOnly && !e.ctrlKey && (im || km)) {
			var kc = (FD.Browser.ie ? e.keyCode : e.charCode);
			//this.log('.keyEvent, keyCode=' + kc + ', inputMask=' + im);
			if (kc > 0 && ((km && !this.keyValidate(el, String.fromCharCode(kc), km.split('|'))) || (im && !this.maskValidate(el, String.fromCharCode(kc), im)))) {
				if (typeof e.preventDefault != 'undefined') {
					e.preventDefault();
				} else if (Browser.ie) {
					e.returnValue = false;
				}
				return false;
			}
		}
		return true;
	},

	blurEvent: function (e) {
		e = e || window.event;
		var el = checkEvent(e), format;

		if (el._tmrChange) { window.clearTimeout(el._tmrChange) }

		this.log(['.blurEvent', e, el, el.value]);

		if (!el) return;
		/*if (!el || typeof el.value == 'undefined') {
			FD.Error.Send(
				"Invalid object, e=" + e + ", e.typeof=" + typeof e + ", e.jQuery=" + (e ? (e instanceof jQuery) : 'false') + ", el.typeof=" + typeof el + ", e.target=" + typeof e.target,
				'fd_general.js', 5338, 'FDInputHandler.blurEvent', Object.inspect(e, null, 2)
			);
		}*/
		if (el.value.length > 0) {
			this.log('.blurEvent, el=' + el.id + ', ' + el.name + ', ' + el.className);
			//if ((format = el.getAttribute('fd:format')) && format == 'number' && (new RegExp("[\\d]+" + Number.tsep.toRegExp() + "[\\d]+")).test(el.value)) return;
			el.value = this.Format(el, el.value);
			el.blurInput = true;
		} else if (el.type && el.type == 'number') {
			el.value = '';
		}
	},

	inputEvent: function (e) {
		this.log(['.inputEvent', e]);
		e = e || window.event;
		if (e.type != 'input') return;

		var el = checkEvent(e), format, cpos;
		try {
			cpos = FD.Selection.getCaretPos(el, true);
		} catch (e) { }

		if (!el || cpos > 0) return;
		if (el.value.length > 0) {
			this.log('.inputEvent, el=' + el.id + ', ' + el.name + ', ' + el.className);
			el.value = this.Format(el, el.value);
		}
	},

	changeEvent: function (e) {
		e = e || window.event;
		var el = checkEvent(e);
		if (!el) return;
		el._tmrChange = this._changeEvent.delay(this, 100, el);
	},
	_changeEvent: function (el) {
		this.log('._changeEvent');
		/*e = e || window.event;
		var el = checkEvent(e), format;*/
		if (!el) return;
		if (el.value.length > 0) {
			this.log('.changeEvent, el=' + el.id + ', ' + el.name + ', ' + el.className);
			el.value = this.Format(el, el.value);
		}
	},

	keyValidate: function (el, value, km) {
		var retval = false;
		for (var i = 0; i < km.length; i++) {
			switch (km[i]) {
				case 'N':
					retval = retval || /^[\d]*$/.test(value);
					break;
				case 'C':
					retval = retval || /^[a-zA-Z]*$/.test(value);
					break;
				case 'U':
					if (/^[a-z]$/.test(value)) {
						charAtCaretPos(el, value.toUpperCase());
						retval = false;
					}
					break;
				case 'L':
					if (/^[A-Z]$/.test(value)) {
						charAtCaretPos(el, value.toLowerCase());
						retval = false;
					}
					break;
				default:
					var re = new RegExp(km[i], "igm");
					retval = retval || re.test(value);
					break;
			}
			//if (!retval) return false;
		}
		return retval;
	},

	maskValidate: function (el, value, im) {
		var retval = false, pos = FD.Selection.getCaretPos(el);
		if (im.left(2) == 'm:') { // mask function
			this.log('.maskValidate, im=' + im);
			im = im.substr(2);
			retval = this.Masks[im].apply(this.Masks, arguments);
		} else if (im.left(2) == 'r:') { // regexp
			im = im.substr(2);
			var re = new RegExp(mask, "igm");
			retval = re.test(value);
		} else if (pos < im.length) {
			im = (im.search(/[|]/) > -1 ? im.split('|') : im.split(''));
			retval = true;
			var mask = im[pos];
			if (/[\d]/.test(mask)) {
				retval = /[\d]/.test(value);
			} else if (mask == 'A') {
				retval = /[a-zA-Z0-9]/.test(value);
			} else if (mask == 'C') {
				retval = /[a-zA-Z ]/.test(value);
			} else if (mask == '?') {
				retval = /[a-zA-Z]/.test(value);
			} else if (mask.list('L', 'U')) {
				retval = false;
				if (/[a-zA-Z]/.test(value)) {
					FD.Selection.charAtCaretPos(el, (mask == 'L' ? value.toLowerCase() : value.toUpperCase()));
					FD.Selection.setCaretToPos.delay(FD.Selection, 100, el, pos + 1);
				}
			} else if (mask.length > 1) {
				var re = new RegExp(mask, "igm");
				retval = re.test(value);
			} else if (mask != value) {
				retval = false;
				if (!(FD.Browser.android && FD.Browser.android_version < 4)) {
					FD.Selection.charAtCaretPos(el, mask).setCaretToPos(pos + 1);
					retval = this.maskValidate(el, value, im.join('|'));
				}
			}
		}
		return retval;
	},

	/* Parameters:
		- el : DOM object of jQuery object
		- value [optional, any|null] : value to format. null when not specified.
		- reverse [optional, true|false] : deformats the value
		- options|tsep [optional, number|null|true|false] : when options is meant then specifies e.g. if a thousands separator should be included or the value is already deformatted. when tsep is meant, then false or true. null when unspecified.
		- deformatted [optional, true|false] : specifies the value is already deformatted (better use the options parameter)
	*/
	Format: function (el, value, reverse) {

		if (el && (el instanceof jQuery)) el = el.get(0);

		var self = FD.Input;
		self._el = self.activeElement = el; // keep track of current element

		if (arguments.length == 1 || value == null) value = el.value;
		var format = (el ? el.getAttribute('fd:format') : null);

		this.log(['.Format, format=' + format + ', value=' + value, arguments]);

		if (format && (!String.is(value) || value.length > 0)) {
			var args = $A(arguments), type = format.match(/^([^\-]+)\-?(.*)/), format = this.Formats[type[1]], orgval = value;
			args[0] = (type.length > 2 ? type[2] : '');
			if (arguments.length == 1) args[1] = value;
			if (type[1] == 'number') {
				// a switch from the browser on one display to an application on a seconds display and bring the focus back to the browser the gets first an onblur (MSIE). Don't know why, just prevent a double formating
				if (!reverse) {
					var options = {},
						hasDecimals = el.getAttribute('fd:decimals') != null;

					if (hasDecimals) {
						options.decimals = Number.int(el.getAttribute('fd:decimals'));
					}

					if (Number.is(args[3])) {
						options.tsep = args[3] & FDInputHandler.TSEP_YES || (!(args[3] & FDInputHandler.TSEP_NO) && Boolean.create(el.getAttribute('fd:tsep')));
						options.deformatted = args[3] & FDInputHandler.DEFORMATTED;
					} else {
						options.tsep = (args.length < 4 || args[3] == null ? Boolean.create(el.getAttribute('fd:tsep')) : args[3]);
						options.deformatted = args.length >= 5 && args[4];
					}
					//if (args.length <= 3 || args[3] == null) args[3] = Boolean.create(el.getAttribute('fd:tsep'));

					if (String.is(value) && value.trim() == '-') value = '';

					value = this.formatNumber(value, options);

					/*
					// normally, this format function assumes a partially formatted value
					// when no fifth parameter is passed or when it is false and a tsep character is found it assumes a formated value and first deformats the value prior to the formatting
					if (!deformatted && (((new RegExp("[\\d]+" + Number.dsep.toRegExp() + "[\\d]{3}" + Number.tsep.toRegExp() + "[\\d]+")).test(value) || ((new RegExp("[\\d]+" + Number.tsep.toRegExp() + "[\\d]{3}(" + Number.dsep.toRegExp() + "|" + Number.tsep.toRegExp() + ")")).test(value) && (value.occurs(Number.tsep) > 1 || !(new RegExp("^[\\d]+\\.[\\d]{1," + (dec > 2 ? dec : 2) + "}$")).test(value)))))) { value = FD.Input.Format(el, value, true); }
					args[1] = correctNumber(value, (el.getAttribute('fd:decimals') ? Number.int(el.getAttribute('fd:decimals')) : null), true)[0];

					this.log('.Format, value=' + value + ', args[1]=' + args[1]);

					value = format.apply(format, args);

					*/

					var reg = el.getAttribute('fd:regexp'), dsep = false;
					if (!reg) {
						reg = '\\d{1,}';
						if (options.tsep) reg = "(\\d{1,3}" + Number.tsep.toRegExp() + "){0,}" + reg;
						if (hasDecimals && options.decimals > 0) {
							dsep = true;
							reg += Number.dsep.toRegExp() + "\\d{" + options.decimals + "}";
						}
						el.setAttribute('fd:regexp', reg);
					}
					if (!value.empty() && !(new RegExp(reg)).test(value)) {
						this.Log.Add("Wrong format, tsep=" + options.tsep + ", dsep=" + dsep + ", orgval=" + orgval + ", value=" + value);
					}

					if (el.getAttribute('fd:symbol')) {
						value = el.getAttribute('fd:symbol') + ' ' + value;
					}

				} else if (reverse) {
					args.remove(2); // remove the reverse parameter
					value = format.Reverse.apply(format.Reverse, args);  //String.format('number', value, true, (arguments.length > 3 && arguments[3]));
				}
			} else {
				if (!reverse) {
					value = format.apply(this.Formats, args);
				} else if (format.Reverse) {
					args.remove(2); // remove the reverse parameter
					value = format.Reverse.apply(format.Reverse, args);
				}
			}
		} else if (!reverse) {
			switch (Object.toType(value)) {
				case 'date':
					value = FD.Date.Format(value); break;
				case 'boolean':
					value = FD.Texts.get('Format.' + (value ? 'YES' : 'NO'), (value ? 'Yes' : 'No'));
			}
		}

		self._el = null; // reset the current element track
		return value;
	},

	formatNumber: function (value, options, reverse) {

		var format = this.Formats['number'],
			hasDecimals = typeof options.decimals != 'undefined',
			dec = (hasDecimals ? Number.int(options.decimals) : 0),
			tsep = (typeof options.tsep != 'undefined' && options.tsep),
			deformatted = (typeof options.deformatted != 'undefined' && options.deformatted);
		
		if (String.is(value) && value.trim() == '-') value = '';

		if (!reverse) {

			// normally, this format function assumes a partially formatted value
			// when no fifth parameter is passed or when it seems the value is somehow formatted the value is first deformatted
			if (!deformatted /* value is not already deformatted */ && (((new RegExp("[\\d]+" + Number.dsep.toRegExp() + "[\\d]{3}" + Number.tsep.toRegExp() + "[\\d]+")).test(value) || ((new RegExp("[\\d]+" + Number.tsep.toRegExp() + "[\\d]{3}(" + Number.dsep.toRegExp() + "|" + Number.tsep.toRegExp() + ")")).test(value) && (value.occurs(Number.tsep) > 1 || !(new RegExp("^[\\d]+\\.[\\d]{1," + (dec > 2 ? dec : 2) + "}$")).test(value)))))) { value = format.Reverse('', value); }
			value = correctNumber(value, (hasDecimals ? dec : null), true)[0];

		}

		this.log(['.formatNumber, value=' + value + ', hasDecimals=' + hasDecimals + ', dec=' + dec + ', tsep=' + tsep + ', deformatted=' + deformatted, options]);

		value = format.call(format, '', value, reverse, tsep);

		if (options.symbol) {
			value = options.symbol + ' ' + value;
		}

		return value;

	}
}).extend({
	TSEP_YES: 1,
	TSEP_NO: 2,
	DEFORMATTED: 4
});

var FDInputMasks = new Class({

	Extends: FDBaseClass,
	_class: 'FDInputMasks',

	_trace: false,

	initialize: function () {
		this.parent();
		this.log('.initialize');
	},

	'number': function (el, value, im) {
		var pos = FD.Selection.getCaretPos(el), dec = el.getAttribute('fd:decimals');
		if ((value == '-' && pos > 0) || !(new RegExp("[\\d\\-" + (dec == null || Number.int(dec) != 0 ? "\\.," : "") + "]")).test(value)) return false;
		var val = el.value.split(Number.dsep), rpos = FD.Selection.getCaretPos(el, true);
		if (pos == 0 && val[0].length > 0 && value == '0' && FD.Selection.getSelection(el).length != el.value.length) return false;
		if (/^[0]{1,}$/.test(val[0].left(pos)) && !/[\.,]/.test(value) && pos > 0 && (val.length == 1 || pos.between(1, val[0].length))) return false;
		if (!FD.Input.isAllSelected(el)) {
			if (val.length > 1 && dec != null && dec > 0 && rpos <= dec && val[1].length >= dec) return false;
		}
		if (/[\.,]/.test(value)) {
			if (val.length == 1 && (dec == null || rpos <= dec)) FD.Selection.charAtCaretPos(el, Number.dsep);
			return false;
		}
		return true;
	},
	'date': function (el, value, im) {
		if (!/[\d\-\/\.]/.test(value)) return false;
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el), addsep = false;
		im = el.getAttribute('fd:format').match(/^([^\-]+)\-?(.*)/)[2]
		var format = FDDate.parseFormat(im), sep = format.separator, val = el.value.split(sep);
		var lval = el.value.left(pos), rval = el.value.substr(pos), index = lval.occurs(sep);
		if (/[\-\/\.]/.test(value)) {
			value = sep; // make sure we have the right separator
		} else {
			var intval = value.int();
		}
		if (value == sep && (val.length >= 3 || lval.right(1) == sep)) return false; // already two separators or separator is already in place
		var fchar = im.charAt(pos); // mask character for this position
		if (fchar == sep && value == sep) return true;
		if (fchar == sep && value != sep) { // should be the separator. if not, insert it
			if (lval.right(1) == sep) {
				el.value = val[0].padl(2, '0') + sep + (val.length > 1 && index != 1 ? val[1].padl(2, '0') + sep : '');
				pos = el.value.length;
				el.value += rval;
				FD.Selection.setCaretToPos(el, pos);
			} else {
				FD.Selection.charAtCaretPos(el, sep).setCaretToPos(++pos);
				fchar = im.charAt(pos);
				index++; // we move to the next part of the date
				if (index > val.length - 1) val[index] = ''; // input wasn't so far yet
			}
		}
		var first = (fchar != im.charAt(pos - 1)), day = (fchar == format.day);
		if (day || fchar == format.month) {
			if (val[index].length >= 2) return false;
			if (first && !/[\d]/.test(el.value.charAt(pos))) {
				if ((day && intval > 3) || (!day && intval > 1)) {
					if (/[\d]/.test(el.value.charAt(pos))) return false;
					FD.Selection.charAtCaretPos(el, '0').setCaretToPos(++pos);
					addsep = true;
				}
			} else if (!first && !/[\d]/.test(el.value.charAt(pos - 1))) {
				FD.Selection.setCaretToPos(el, pos - 1).charAtCaretPos('0');
				pos++;
				addsep = true;
			} else {
				var fval = Number.int((first ? value + el.value.charAt(pos) : el.value.charAt(pos - 1) + value));
				if (fval == 0) return false;
				if (day && fval > 31) {
					if (first || val.length >= 3) return false;
					FD.Selection
						.setCaretToPos(el, pos - 1).charAtCaretPos('0')
						.setCaretToPos(++pos).charAtCaretPos(sep)
						.setCaretToPos(++pos);
					index++;
					fchar = im.charAt(pos); // get the next format character
					if ((fchar == format.month && intval > 1) /* || (/[jy]{2,4}/.test(format[index]) && intval > 2) */) {
						FD.Selection.charAtCaretPos(el, '0').setCaretToPos(++pos);
						addsep = index < 2;
					}
				} else if (fchar == format.month && fval > 12) {
					if (first || val.length >= 3 || intval >= 3) return false;
					FD.Selection
						.setCaretToPos(el, pos - 1).charAtCaretPos('0')
						.setCaretToPos(++pos).charAtCaretPos(sep)
						.setCaretToPos(++pos);
				} else {
					addsep = !first && value != sep;
				}
			}
		} else if (val[index].length >= 4) {
			return false;
		}
		FD.Selection.charAtCaretPos(el, value);
		if (addsep) {
			FD.Selection.setCaretToPos(el, pos + 1);
			if (el.value.charAt(pos + 1) != sep) {
				FD.Selection.charAtCaretPos(el, sep);
			} else {
				FD.Selection.setCaretToPos(el, pos + 2);
			}
		}
		return false;
	},
	'datetime': function (el, value, im) {
		if (!/[\d\-\/\.\: ]/.test(value)) return false;
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el), addsep = false;
		im = el.getAttribute('fd:format').match(/^([^\-]+)\-?(.*)/)[2];
		var format = FDDate.parseFormat(im), sep_date = format.separator, sep_time = format.time.separator, val = el.value.split(' '),
			val_date = el.value.left(im.indexOf(' ') - 1).split(sep_date), val_time = (val.length > 1 ? val[1].split(sep_time) : el.value.substr(im.indexOf(' ')).trim().split(sep_time));
		var lval = el.value.left(pos), rval = el.value.substr(pos), in_date = pos < im.indexOf(' '), index_date = lval.occurs(sep_date), index_time = lval.occurs(sep_time), org = value;
		if (/[\-\/\.]/.test(value)) {
			value = sep_date; // make sure we have the right separator
		} else if (value == sep_time) {
			value = sep_time;
		} else {
			var intval = value.int();
		}
		var fchar = im.charAt(pos); // mask character for this position
		if ((fchar == sep_date && value == sep_date) || (fchar == sep_time && value == sep_time)) {
			FD.Selection.setCaretToPos(el, ++pos);
			return false;
		}
		if (value == sep_date && (!in_date || val_date.length >= 3 || lval.right(1) == sep_date)) return false; // already two separators or separator is already in place
		if (value == sep_time && (in_date || val_time.length >= format.time.length || lval.right(1) == sep_time)) return false;

		if (fchar == sep_date && value != sep_date) { // should be the separator. if not, insert it
			if (lval.right(1) == sep_date) {
				el.value = val_date[0].padl(2, '0') + sep_date + (val_date.length > 1 && index_date != 1 ? val_date[1].padl(2, '0') + sep_date : '');
				pos = el.value.length;
				el.value += rval;
				FD.Selection.setCaretToPos(el, pos);
				fchar = im.charAt(pos);
			} else {
				FD.Selection.charAtCaretPos(el, sep_date).setCaretToPos(++pos);
				fchar = im.charAt(pos);
				index_date++; // we move to the next part of the date
				if (index_date > val_date.length - 1) val_date[index_date] = ''; // input wasn't so far yet
			}
		} else if (fchar == sep_time && value != sep_time) {
			if (lval.right(1) == sep_time) {
				el.value = val_date.join(sep_date) + ' ' + val_time[0].padl(2, '0') + sep_time + (val_time.length > 1 && index_time != 1 ? val_time[1].padl(2, '0') + sep_time : '');
				pos = el.value.length;
				el.value += rval;
				FD.Selection.setCaretToPos(el, pos);
			} else {
				if (rval.left(1) != sep_time) FD.Selection.charAtCaretPos(el, sep_time)
				FD.Selection.setCaretToPos(++pos);
				fchar = im.charAt(pos);
				index_time++; // we move to the next part of the date
				if (index_time > val_time.length - 1) val_time[index_time] = ''; // input wasn't so far yet
			}
		}

		if (in_date) {
			this.log('.datetime, in_date');
			var first = (fchar != im.charAt(pos - 1)), day = (fchar == format.day), index_current = format[fchar + 'Index'], fval = Number.int((first ? value + el.value.charAt(pos) : el.value.charAt(pos - 1) + value));
			if (day || fchar == format.month) {
				/*this.log(['.datetime, first=' + first + ', index_current=' + index_current + ', fchar=' + fchar + ', fval=' + fval + ', format=', format, val_date]);
				if (val_date[index_current].length >= 2) {
				fval = Number.int((first ? value + val_date[index_current].substr(1) : val_date[index_current].left(val_date[index_current].length - 1) + value));
				this.log('.datetime, yep, left=' + el.value.left(pos) + ', right=' + el.value.substr(pos + 1));
				if ((day && fval > 31) || (!day && fval > 12)) return false;
				el.value = el.value.left(pos) + value + el.value.substr(pos + (first ? 1 : 2));
				FD.Selection.setCaretToPos(el, ++pos);
				return false;
				}*/
				if (val_date[index_current].length >= 2) { return false; }
				if (first && !/[\d]/.test(el.value.charAt(pos))) {
					if ((day && intval > 3) || (!day && intval > 1)) { // the first number of a day can not exceed 3 and the first number of a month can not exceed 1
						if (/[\d]/.test(el.value.charAt(pos))) return false;
						FD.Selection.charAtCaretPos(el, '0').setCaretToPos(++pos);
						addsep = true;
					}
				} else if (!first && !/[\d]/.test(el.value.charAt(pos - 1))) {
					FD.Selection.setCaretToPos(el, pos - 1).charAtCaretPos('0');
					pos++;
					addsep = true;
				} else {
					if (fval == 0) return false;
					if (day && fval > 31) {
						if (first || val_date.length >= 3) return false;
						FD.Selection
							.setCaretToPos(el, pos - 1).charAtCaretPos('0')
							.setCaretToPos(++pos).charAtCaretPos(sep_date)
							.setCaretToPos(++pos);
						index++;
						fchar = im.charAt(pos); // get the next format character
						if ((fchar == format.month && intval > 1)) {
							FD.Selection.charAtCaretPos(el, '0').setCaretToPos(++pos);
							addsep = index < 2;
						}
					} else if (fchar == format.month && fval > 12) {
						if (first || val_date.length >= 3 || intval >= 3) return false;
						FD.Selection
							.setCaretToPos(el, pos - 1).charAtCaretPos('0')
							.setCaretToPos(++pos).charAtCaretPos(sep_date)
							.setCaretToPos(++pos);
					} else {
						addsep = !first && value != sep_date;
					}
				}
			} else if (val_date[index_date].length >= 4) {
				return false;
			}
			FD.Selection.charAtCaretPos(el, value);
			if (addsep) {
				FD.Selection.setCaretToPos(el, pos + 1);
				if (el.value.charAt(pos + 1) != sep_date) {
					FD.Selection.charAtCaretPos(el, sep_date);
				} else {
					FD.Selection.setCaretToPos(el, pos + 2);
				}
			}
		} else {
			var time_start = im.indexOf(' ') + 1, max_length = time_start + (format.time.seconds ? 8 : (format.time.minutes ? 5 : 2));
			this.log('.datetime, in_time, max_length=' + max_length + ', value.length=' + el.value.length);
			addsep = true;
			if (pos == time_start - 1 && value != ' ') {
				addsep = false;
				FD.Selection
					.charAtCaretPos(el, ' ')
					.setCaretToPos(++pos);
				if (val_time.length > 0 && val_time[0].length > 1) {
					FD.Selection.setRange(el, pos, pos + 1);
					return FD.Input.Masks['datetime'](el, org, im);
					//					el.value = el.value.left(pos) + value + el.value.substr(pos + 1);
					//				FD.Selection.setCaretToPos(++pos);
				} else {
					FD.Selection.charAtCaretPos(value);
				}
			} else if (pos == time_start && value > 2 && val_time[0].length == 0) {
				addsep = false;
				FD.Selection
					.charAtCaretPos(el, '0')
					.setCaretToPos(++pos)
					.charAtCaretPos(value);
				if (val_time.length == 1) {
					FD.Selection.setCaretToPos(el, ++pos).charAtCaretPos(':');
				}
			} else if (pos >= max_length || (pos == time_start && value > 2) || (pos == time_start + 1 && val_time[0].left(1).int() == 2 && value > 3) || (pos - (val_time.length > 1 ? 1 : 0) == time_start + 2 && value > 5) || (org == ':' && val_time.length > (!format.minutes ? 0 : (!format.time.seconds ? 1 : 2)))) {
				return false;
			} else if (pos == time_start + 1 && val_time.length == 1) {
				addsep = false;
				FD.Selection
					.charAtCaretPos(el, value)
					.setCaretToPos(++pos)
					.charAtCaretPos(':');
			} else if (pos >= time_start + 2 && val_time.length == 1) {
				FD.Selection
					.setCaretToPos(el, 2)
					.charAtCaretPos(':')
					.setCaretToPos(++pos);
			} else if (pos < max_length && el.value.length >= max_length) {
				if (org != sep_time && (pos <= time_start + 1 || pos >= time_start + 3)) {
					FD.Selection.setRange(el, pos, pos + 1);
					return FD.Input.Masks['datetime'](el, org, im);
				}
				return false;
			}
			if (addsep) FD.Selection.charAtCaretPos(el, org);
		}
		return false;
	},
	'lowercase': function (el, value, im) {
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el);
		if (/[A-Z]/.test(value) && (!el.maxLength || el.maxLength < 0 || el.value.length < Number.int(el.maxLength))) {
			FD.Selection.charAtCaretPos(el, value.toLowerCase());
			return false;
		}
		return true;
	},
	'uppercase': function (el, value, im) {
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el);
		if (/[a-z]/.test(value) && (!el.maxLength || el.maxLength < 0 || el.value.length < Number.int(el.maxLength))) {
			FD.Selection.charAtCaretPos(el, value.toUpperCase());
			return false;
		}
		return true;
	},
	'proper': function (el, value, im) {
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el);
		if (((pos == 0 || String.checkProperCharacter(el.value.charAt(pos - 1))) && value != value.toUpperCase()) && (!el.maxLength || el.maxLength < 0 || el.value.length < Number.int(el.maxLength))) {
			FD.Selection.charAtCaretPos(el, value.toUpperCase());
			return false;
		}
		return true;
	},
	'digit': function (el, value, im) {
		if (!/[\d]/.test(value)) return false;
		return true;
	},
	'carreg': function (el, value, im) {
		var pos = FD.Selection.getCaretPos(el), add = true, occurs = el.value.occurs('-');
		FD.Selection.emptySelection(el);
		if (!/[a-zA-Z\d\-]/.test(value) || el.value.replace(/[^\da-zA-Z]/g, '').length >= 6) return false;
		value = value.toUpperCase();
		if ((pos == 0 || pos == 7 || occurs >= 2) && value == '-') return false;
		if (pos > 0) {
			var chr = el.value.charAt(pos - 1);
			if (chr != '-' && value != '-' && /[\d]/.test(chr) != /[\d]/.test(value)) {
				if (pos == 7 || occurs >= 2) return false;
				FD.Selection.charAtCaretPos(el, '-');
				pos++;
			} else {
				var lval = el.value.left(pos), rval = el.value.substr(pos);
				if (value == '-') {
					// do nothing
				} else if (/([A-Z]{3})$/.test(lval) || /([\d]{3})$/.test(lval)) {
					FD.Selection
						.setCaretToPos(el, pos - 1).charAtCaretPos('-')
						.setCaretToPos(++pos);
				} else if (/^([A-Z]{3})/.test(rval) || /^([\d]{3})/.test(rval)) {
					FD.Selection
						.setCaretToPos(el, pos + 1)
						.charAtCaretPos('-')
						.setCaretToPos(pos);
				} else if ((/([A-Z]{2})$/.test(lval) && /^([A-Z]{1})/.test(rval)) || (/([\d]{2})$/.test(lval) && /^([\d]{1})/.test(rval))) {
					FD.Selection.charAtCaretPos(el, '-').setCaretToPos(++pos);
				} else if ((/([A-Z]{1})$/.test(lval) && /^([A-Z]{2})/.test(rval)) || (/([\d]{1})$/.test(lval) && /^([\d]{2})/.test(rval))) {
					add = false;
					FD.Selection
						.charAtCaretPos(el, value)
						.setCaretToPos(pos + 1)
						.charAtCaretPos('-');
				} else if (rval.length > 0 && rval.left(1) != '-' && /[\d]/.test(rval.left(1)) != /[\d]/.test(value)) {
					if (occurs >= 2) return;
					add = false;
					FD.Selection
						.charAtCaretPos(el, value)
						.setCaretToPos(pos + 1)
						.charAtCaretPos('-')
						.setCaretToPos(pos + 1);
				}
			}
		}
		if (add) FD.Selection.charAtCaretPos(el, value);
		return false;
	},
	'accountnumber': function (el, value, im) {
		FD.Selection.emptySelection(el);
		var vlen = el.value.replace(/[^\d]/g, '').length, pos = FD.Selection.getCaretPos(el), add = true;
		if (vlen >= 9 && value != '.') return false;
		var lval = el.value.left(pos), rval = el.value.substr(pos);
		if (value == '.' && (pos == 0 || !/[\d]{2}$|[\d]{4}$/.test(lval) || /^[\d]{3}$/.test(lval) || /^[\d]{4}$/.test(rval) || (vlen >= 8 && !/^[\d]{2}|^[\d]{4}/.test(rval)) || pos - el.value.occurs('.') > 6)) return false;
		if (el.value.length + 1 > 7) {
			if (value != '.' && !/[\.]/.test(el.value) && rval.length == 0) {
				el.value = FD.Input.Formats['accountnumber']('', el.value + value);
				el.value = el.value.left(el.value.length - 1);
				pos = el.value.length;
				FD.Selection.setCaretToPos(el, pos);
			}
			if (/[\d]/.test(value) && (/^[\d]{1}$|^[\d]{3}$/.test(lval) || (pos < 8 && /\.[\d]{1}$/.test(lval)))) {
				add = false;
				FD.Selection
					.charAtCaretPos(el, value)
					.setCaretToPos(pos + 1)
					.charAtCaretPos(el, '.');
			} else if (/[\d]/.test(value) && (/^[\d]{2}$|^[\d]{3}$/.test(lval) || (pos < 8 && /\.[\d]{2}$/.test(lval)))) {
				FD.Selection.charAtCaretPos(el, '.');
				pos++;
			}
		}
		if (add) FD.Selection.charAtCaretPos(el, value);
		return false;
	},
	'time': function (el, value, im) {
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el), val = el.value.split(':'), add = true;
		if (pos - (val.length > 1 ? 1 : 0) >= 4) return false;
		var lval = el.value.left(pos), rval = el.value.substr(pos), index = (lval.search(':') > -1 ? 1 : 0), org = value;
		value = Number.int(value);
		if (pos == 0 && value > 2 && val[0].length == 0) {
			add = false;
			FD.Selection
				.charAtCaretPos(el, '0')
				.setCaretToPos(++pos)
				.charAtCaretPos(value);
			if (val.length == 1) {
				FD.Selection.setCaretToPos(el, ++pos).charAtCaretPos(':');
			}
		} else if ((pos == 0 && value > 2) || (pos == 1 && val[0].left(1).int() == 2 && value > 3) || (pos - (val.length > 1 ? 1 : 0) == 2 && value > 5) || (org == ':' && val.length > 1)) {
			return false;
		} else if (pos == 1 && val.length == 1) {
			add = false;
			FD.Selection
				.charAtCaretPos(el, value)
				.setCaretToPos(++pos)
				.charAtCaretPos(':');
		} else if (pos >= 2 && val.length == 1) {
			FD.Selection
				.setCaretToPos(el, 2)
				.charAtCaretPos(':')
				.setCaretToPos(++pos);
		} else if (el.value.length >= 5) {
			if (org != ':' && (pos <= 1 || pos >= 3)) {
				FD.Selection.setRange(el, pos, pos + 1);
				return FD.Input.Masks['time'](el, org, im);
			}
			return false;
		}
		if (add) FD.Selection.charAtCaretPos(el, org);
		FD.Selection.setCaretToPos(el, pos + (rval.left(1) == ':' ? 2 : 1));
		return false;
	},
	'phone-nl': function (el, value, im) {
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el), lval = el.value.left(pos) + value, rval = el.value.substr(pos), netno, numbers = FD.Input.Formats._netnum;
		if (/[\d]/.test(value) && el.value.replace(/[^0-9]/g, '').length >= 10) return false;
		if ((value == '(' && (el.value.search(/\(/) > -1 || lval.search(/\)/) > -1)) || (value == ')' && (pos < 2 || el.value.search(/\)/) > -1 || rval.search(/\)/) > -1))) return false;
		if (rval.length == 0) {
			if (pos <= 4 && /^\({0,1}[\d]{2,4}/.test(lval)) {
				if (lval.left(1) == '(') lval = lval.substr(1);
				if (lval.left(2) == '14') {
					netno = '14';
					i = 1;
				} else {
					for (var i = pos + 1; i >= 0; i--) {
						netno = lval.left(i);
						if (numbers.seek(netno)) break;
					}
				}
				if (i > 0) {
					el.value = '(' + netno + ') ';
					FD.Selection.setCaretToPos(el, el.value.length);
					return false;
				}
			} else if (pos > 3 && (netno = lval.match(/^\(([\d]{2,4})\)/))) {
				var len = netno[1].length, reg = "\\([\\d]{" + len + "}\\) [\\d]{" + (len == 3 ? 3 : 2) + "}";
				if (netno[1] == '14' && el.value.replace(/[^0-9]/g, '').length >= 6) return false;
				if (netno[1] != '14' && ((new RegExp(reg + "$")).test(lval) || (new RegExp(reg + " [\\d]{2}$")).test(lval) || (len == 2 && (new RegExp(reg + " [\\d]{2} [\\d]{2}$")).test(lval)))) {
					el.value = lval + ' ';
					FD.Selection.setCaretToPos(el, pos + 2);
					return false;
				}
			}
		}
		return true;
	},
	'postalcode-uk': function (el, value, im) {
		/*
		length: 6-8 characters (x{2,4} xxx)
		first part: must begin with a alpha
		second part: length of 3, must begin with a numeric, second and third alpha
		*/
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el), val = el.value.split(' '), lval = el.value.left(pos) + value, rval = el.value.substr(pos), index = (lval.search(' ') > -1 ? 1 : 0);
		if (/[^\da-zA-Z ]/.test(value) || el.value.length >= 8 || (value == ' ' && el.value.occurs(' ') >= 1)) return false;
		if ((pos == 0 && /[^a-zA-Z]/.test(value)) || (pos <= 1 && value == ' ')) return false;
		if (index == 1) { // we are at the second part
			var rpos = pos - (val[0].length + 1);
			if ((rpos == 0 && /[^\d]/.test(value)) || (rpos > 0 && /[^a-zA-Z]/.test(value))) return false;
		} else if (index == 0) { // we are at the first part
			if (false && pos == 4 && val.length == 1 && value != ' ') {
				FD.Selection.charAtCaretPos(el, ' ').setCaretToPos(++pos);
				if (/[^\d]/.test(value) || rval.length >= 3) return false;
			} else if (val[0].length == 4 && val.length >= 2) {
				return false;
			}
		}
		FD.Selection.charAtCaretPos(el, value.toUpperCase());
		return false;
	},
	'postalcode-de': function (el, value, im) {
		/*
		length: 5 digits (01000 - 99999)
		*/
		FD.Selection.emptySelection(el);
		var pos = FD.Selection.getCaretPos(el), lval = el.value.left(pos), rval = el.value.substr(pos);
		if (el.value.length >= 5 || /[^\d]/.test(value) || (pos >= 1 && /^[^1-9]+$/.test(lval) && value == '0') || (pos == 0 && rval.left(1) == '0' && value == '0')) return false;
		return true;
	}
});

var FDInputLog = new Class({
	
	Extends: FDBaseClass,
	_class: 'FDInputLog',

	_log: [],
	Add: function (entry) {
		try {
			if (FD.Input._el) {
				entry = 'Current element: ' + FD.Input._el.tagName + ', id=' + FD.Input._el.id + '\r\n' + entry;
			}
			entry += '\r\nStack: ' + FD.Stack.Format(', ', this.caller);
			this._log.push(entry);
			FD.Debug.trace('FD.Input.Log.Add', entry);
		} catch (e) { FD.Error.Alert(true, e, 'fd_general.js', 2870, 'FD.Input.Log'); }
	},
	Get: function () {
		var log = ''
		for (var i = 0; i < this._log.length; i++) {
			log += (i + ' --->\r\n' + this._log[i] + '\r\n<---\r\n');
		}
		return log;
	}
});

var FDInputFormats = new Class({

	Extends: FDBaseClass,
	_class: 'FDInputFormats',

	_trace: false,

	_netnum: ['06', '085', '088', '091', '010', '0111', '0113', '0114', '0115', '0117', '0118', '013', '014', '015', '0161', '0162', '0164', '0165', '0166', '0167', '0168', '0172', '0174', '0180', '0181', '0182', '0183', '0184', '0186', '0187', '020', '0222', '0223', '0224', '0226', '0227', '0228', '0229', '023', '024', '0251', '0252', '0255', '026', '0294', '0297', '0299', '030', '0313', '0314', '0315', '0316', '0317', '0318', '0320', '0321', '033', '0341', '0342', '0343', '0344', '0345', '0346', '0347', '0348', '035', '036', '038', '040', '0411', '0412', '0413', '0416', '0418', '043', '045', '046', '0475', '0478', '0481', '0485', '0486', '0487', '0488', '0492', '0493', '0495', '0497', '0499', '050', '0511', '0512', '0513', '0514', '0515', '0516', '0517', '0518', '0519', '0521', '0522', '0523', '0524', '0525', '0527', '0528', '0529', '053', '0541', '0543', '0544', '0545', '0546', '0547', '0548', '055', '0561', '0562', '0566', '0570', '0571', '0572', '0573', '0575', '0577', '0578', '058', '0591', '0592', '0593', '0594', '0595', '0596', '0597', '0598', '0599', '070', '071', '072', '073', '074', '075', '076', '077', '078', '079', '084', '085', '087'],

	initialize: function () {
		this.parent();
		this.log('.initialize');
		this['number'].Reverse = this['number-reverse'];
	},

	'number': function (subtype, str, reverse) {
		if (!reverse) {
			var arr = str.split('.'), rgx = /(\d+)(\d{3})/;
			str = arr[0];
			if (str.trim() == '-') str = '';
			if (arguments.length > 3 && arguments[3]) { // include thousands separator
				while (rgx.test(str))
					str = str.replace(rgx, '$1' + Number.tsep + '$2');
			}
			return str + (arr.length > 1 ? Number.dsep + arr[1] : '');
		} else {
			if (!this.Reverse) alert(FD.Stack.Format(',', this));
			return this.Reverse(subtype, str, arguments.length > 3 && arguments[3]);
		}
	},
	'number-reverse': function (subtype, str, partially) {
		var arr;
		if (Number._regexp_wrong.test(str)) { // wrong format. posible paste action
			FD.Input.Log.Add("Number.Reverse: Wrong format (dsep/tsep switched), str=" + str);
			arr = str.replace(/[^\d\.,\-]/g, '').split(Number.tsep);
			str = arr[0].replace(Number._regexp_dsep, '');
		} else {
			var dsep = Number.DSepInStr(str);
			arr = str.replace(/[^\d\.,\-]/g, '').split(Number.dsep);
			if (dsep && arr.length <= 1) {
				FD.Input.Log.Add("Number.Reverse: Wrong format (dsep disappeared), str=" + str + ", arr=" + arr.join('|'));
			}
			str = arr[0].replace(Number._regexp_tsep, '');
		}
		if (str == '-') str = '0';
		dsep = (partially ? Number.dsep : '.'); // arguments[3] = reverse partially, keep the locale decimal
		return str + (arr.length > 1 ? dsep + arr[1] : '');
	},
	'date': function (subtype, str) {
		return FD.Date.parse(str, subtype).toString();
	},
	'datetime': function (subtype, str) {
		return FD.Date.Parse(str, subtype).toString();
	},
	'proper': function (subtype, str) {
		return str.proper();
	},
	'uppercase': function (subtype, str) {
		return str.toUpperCase();
	},
	'lowercase': function (subtype, str) {
		return str.toLowerCase();
	},
	'digit': function (subtype, str) {
		return str.replace(/[^\d]/g, '');
	},
	'phone': function (subtype, str) {
		str = str.replace(/^[\+]/, '00').replace(/[^\d]/g, '');
		if (subtype.list('nl', 'nl.int')) {
			var cc = false, netno, numbers = FD.Input.Formats._netnum, i, j;
			if (str.left(4) == '0031') { cc = true; str = '0' + str.substr(4); }
			else if (str.left(2) == '31') { cc = true; str = '0' + str.substr(2); }
			else if (str.left(2) == '00') {
				if (subtype == 'int') return str.replace(/^([\d]{4})([0-9]+)/, '$1 $2');
				return str.substr(4);
			}
			if (subtype == 'nl' && str.left(2) == '14') {
				for (i = 4; i > 0; i--) {
					netno = str.substr(2, i);
					if (numbers.seek(netno)) break;
				}
				j = i;
				i = 2;
				netno = '14';
			} else {
				for (i = 4; i > 0; i--) {
					netno = str.left(i);
					if (numbers.seek(netno)) break;
				}
				j = i;
			}
			//alert("([\\d]{" + i + "})([\\d]{" + (i == 3 ? 3 : 2) + "})([\\d]{2})([\\d]+), "+str.match(reg));
			if (subtype == 'nl.int') {
				var reg = new RegExp("([\\d]{" + i + "})([\\d]+)", "g");
				return '+31-(' + netno.left(1) + ')' + netno.substr(1) + '-' + str.replace(reg, '$2');
			} else {
				var reg = new RegExp("([\\d]{" + i + "})([\\d]{" + (j == 3 ? 3 : 2) + "})" + (netno != '14' ? "([\\d]{2})" + (j == 2 ? "([\\d]{2})([\\d]+)" : "([\\d]+)") : ''), "g");
				return str.replace(reg, '($1) $2' + (netno != '14' ? ' $3 $4' + (j == 2 ? " $5" : '') : ''));
			}
		} else if (subtype == 'nanp') {
			return str.replace(/([\d]{3})([\d]{3})([\d]+)/, '$1-$2-$3');
		}
		return str;
	},
	'postalcode': function (subtype, str) {
		switch (subtype) {
			case 'nl':
				str = str.replace(/[ ]/g, '');
				str = str.left(4) + (str.length > 4 ? ' ' + str.substr(4, 2).toUpperCase() : '');
				//if (str && !/[1-9]{1}[0-9]{3} [A-Z]{2}/.test(str) && !FD.Validate.alerting) FD.Validate.alert(FDOptions.create({ message: FD.Texts.get('Validate.POSTALCODE'), el_focus: FD.Input.activeElement }));
				return str;
			case 'us':
				str = str.replace(/[^\d]/g, '');
				if (str.length > 5) str = str.left(5) + '-' + str.substr(5);
				//if (str && !/^[\d]{5}(\-[\d]{4})?$/.test(str) && !FD.Validate.alerting) FD.Validate.alert(FDOptions.create({ message: FD.Texts.get('Validate.POSTALCODE_US'), el_focus: FD.Input.activeElement }));
				return str;
			case 'uk':
				str = str.replace(/[^\da-zA-Z]/g, '');
				str = str.left(str.length - 3) + ' ' + str.right(3);
				//if (str && !/^[a-zA-Z]{1}[\da-zA-Z]{1,3} [\d]{1}[a-zA-Z]{2}$/.test(str) && !FD.Validate.alerting) FD.Validate.alert(FDOptions.create({ message: FD.Texts.get('Validate.POSTALCODE'), el_focus: FD.Input.activeElement }));
				return str;
			case 'de':
				str = str.replace(/[^\d]/g, '').padl(5, '0');
				//if (str && (/[^\d]/.test(str) || str.length != 5 || str.int() < 1000) && !FD.Validate.alerting) FD.Validate.alert(FDOptions.create({ message: FD.Texts.get('Validate.POSTALCODE'), el_focus: FD.Input.activeElement }));
				return str;
		}

	},
	'time': function (subtype, str) {
		return (!str.empty() ? FDTime.parse(str, { includeSeconds: false }).toString() : '');
	},
	'creditcard': function (subtype, str) {
		if (str.empty()) return str;
		var rgx = /(\d{4})(\d+)/;
		str = str.replace(/[^0-9]/g, '');
		while (rgx.test(str))
			str = str.replace(rgx, '$1 $2');
		return str;
	},
	'accountnumber': function (subtype, str) {
		if (/[\d]{4}\.[\d]{2}\.[\d]{3}/.test(str)) return str;
		str = str.replace(/[^\d]/g, '');
		if (str.length <= 7) return str; // ing/giro
		var rgx = /(\d{2})(\d{2,})/;
		while (rgx.test(str))
			str = str.replace(rgx, '$1.$2');
		return str;
	},
	'carreg': function (subtype, str) {
		var reg1 = /([\d]{1})([A-Z]{1})/, reg2 = /([A-Z]{1})([\d]{1})/, reg3 = /([A-Z]{2})([A-Z]{2})/, reg4 = /([\d]{2})([\d]{2})/; ;
		str = str.replace(/[^\da-zA-Z]/g, '').toUpperCase();
		while (reg1.test(str))
			str = str.replace(reg1, '$1-$2');
		while (reg2.test(str))
			str = str.replace(reg2, '$1-$2');
		while (reg3.test(str))
			str = str.replace(reg3, '$1-$2');
		while (reg4.test(str))
			str = str.replace(reg4, '$1-$2');
		return str;
	},
	'vat': function (subtype, str) {
		return str.left(2).toUpperCase() + str.substr(2);
	},
	'email': function (subtype, str) {
		//FD.Validate.CheckValue(FD.Input.activeElement, 'validate-email', 0, null);
		return str;
	},
	'url': function (subtype, str) {
		return str;
		// code below not necessary anymore. the event procedure now calls the system validations.
		var url = FDUri.create(str), strUrl = url.toString();
		FD.Input.log(['.url', url]);
		if (strUrl != str || url.host == '') {
			FD.Validate.CheckValue(FD.Input.activeElement, 'validate-url', 0, null);
		}
		return strUrl;
	}
});

FD.Input = new FDInputHandler();

//--> dimensions
var FDElementDimensions = new Class({

	Extends: FDBaseClass,
	_class: 'FDElementDimensions',

	_trace: false,

	_useComputedStyle: true,
	_computedStyleIncludePaddings: true,
	_paddingsFix: false,
	_computedStyleIncludeBorders: false, // ie8 outerspace when paddings are exlcuded
	_computedTableIncludePaddings: false,
	_round: false,
	_correct: 0,

	initialize: function () {

		this.parent();

		this._useComputedStyle = /*!FD.Browser.mobile &&*/FD.Browser.greater('ie', 7, true, true);

		// Chrome and Firefox (version 23+, real gecko) include the paddings and border width in the computedstyle height and width values
		// IE 9+ does not include the paddings and border width in these values
		// In IE (11) the computedstyle returns the width without paddings when the element is visible, but with paddings when not visible
		this._computedStyleIncludePaddings = (!FD.Browser.greater('ie', 9, true)) && (!FD.Browser.gecko || FD.Browser.version > 22);
		this._paddingsFix = FD.Browser.greater('ie', 11, true) || FD.Browser.less('firefox', 23, true);
		this._computedStyleIncludeBorders = FD.Browser.less('ie', 8, true) || !FD.Browser.ie;
		// the webkit engine includes paddings on the table tag, the other browsers don't
		this._computedTableIncludePaddings = FD.Browser.WebKit;

		this._round = FD.Browser.less('ie', 8, true); // round the values in IE8 and less using floor

		if (FD.Browser.less('ie', 8, true)) {
			if (FD.ViewPort.getDimensions().zoom != 1) this._correct = 1;
			$(window).resize((function () { this._correct = (FD.ViewPort.getDimensions().zoom != 1 ? 1 : 0); }).bind(this));
		}

		this.log('.initialize, include-paddings=' + this._computedStyleIncludePaddings + ', include-border=' + this._computedStyleIncludeBorders + ', TableIncludePadding=' + this._computedTableIncludePaddings);
		/* content_include_paddings
		From IE9 on the computed style does not include the padding, border and scrollbars when the box-sizing is border-box
		The content_include_paddings is true for all browser except IE >= 9
		*/
	},

	getCorrection: function () { return this._correct; },

	getPadding: function (el, side, style) {
		side = (!side ? ['top', 'right', 'bottom', 'left'] : side.split(','));
		var padding = 0;
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			for (var i = 0; i < side.length; i++) {
				padding += Number.float(style.getPropertyValue('padding-' + side[i]));
			}
		} else {
			for (var i = 0; i < side.length; i++) {
				padding += Number.float(el.css('padding' + side[i].proper()));
			}
		}
		return padding;
	},
	getPaddings: function (el, style) {
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0]);
			if (!style) return null;
			return {
				paddingLeft: Number.float(style.getPropertyValue('padding-left')),
				paddingRight: Number.float(style.getPropertyValue('padding-right')),
				paddingTop: Number.float(style.getPropertyValue('padding-top')),
				paddingBottom: Number.float(style.getPropertyValue('padding-bottom'))
			};
		} else {
			return el.css(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']).parseFloat();
		}
	},

	getMargin: function (el, side, style) {
		side = side.split(',');
		var margin = 0;
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			for (var i = 0; i < side.length; i++) {
				margin += Number.float(style.getPropertyValue('margin-' + side[i]));
			}
		} else {
			for (var i = 0; i < side.length; i++) {
				margin += Number.float(el.css('margin' + side[i].proper()));
			}
		}
		return margin;
	},
	getMargins: function (el, style) {
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			return {
				marginLeft: Number.float(style.getPropertyValue('margin-left')),
				margingRight: Number.float(style.getPropertyValue('margin-right')),
				marginTop: Number.float(style.getPropertyValue('margin-top')),
				marginBottom: Number.float(style.getPropertyValue('margin-bottom'))
			};
		} else {
			return el.css(['marginLeft', 'marginRight', 'marginTop', 'marginBottom']).parseFloat();
		}
	},

	getBorder: function (el, side, style) {
		side = (Array.is(side) ? side : side.split(','));
		var border = 0;
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			for (var i = 0; i < side.length; i++) {
				border += Number.float(style.getPropertyValue('border-' + side[i] + '-width'));
			}
		} else {
			for (var i = 0; i < side.length; i++) {
				border += Number.float(el.css('border-' + side[i] + '-width'));
			}
		}
		return border;
	},
	getBorders: function (el, style) {
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			return {
				top: Number.float(style.getPropertyValue('border-top-width')),
				right: Number.float(style.getPropertyValue('border-right-width')),
				bottom: Number.float(style.getPropertyValue('border-bottom-width')),
				left: Number.float(style.getPropertyValue('border-left-width'))
			};
		} else {
			return el.css(['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width']);
		}
		return border;
	},

	getWidthByParent: function (el) {
		var _self = jQuery(el), _parent = (_self.hasClass('fullscreen') ? _self.offsetParent() : _self.parent());

		var style = window.getComputedStyle(_parent[0], null),
			parent_width = this.getContentWidth(_parent, false, false, style),
			parent_padding = (_parent.data('resize-width-excluded') || this.getWidthOuterSpace(_parent, false, false, style)), /*this.getPadding(_parent, 'right', style),*/
			parent_scrollwidth = Math.max(_parent[0].scrollWidth - parent_padding, 0);

		//this.log('.getWidthByParent, id=' + el.id + '/' + el.tagName + ', parent_width=' + parent_width + '/' + Number.create(parent_width) + ', scrollWidth=' + _parent[0].scrollWidth + '/' + parent_scrollwidth + ', padding=' + parent_padding);
		//el.setAttribute('getWidthByParent', 'parent_width=' + parent_width + '/' + _parent.data('resize-width-excluded') + '/' + this.getWidthOuterSpace(_parent, false, false, style) + ', scrollWidth=' + _parent[0].scrollWidth + '/' + parent_scrollwidth + ', padding=' + parent_padding);

		if (Math.round(parent_scrollwidth * 100) / 100 == parent_width) parent_width = parent_scrollwidth;
		else if (parent_scrollwidth > parent_width + 1) parent_width = parent_scrollwidth;

		var w =
			parent_width - /*parent_padding -*/
			(_self.data('resize-width') || this.getWidthOuterSpace(_self, true)) -
			(_parent.css('overflow') == 'auto' ? 17 : 0) -
			Number.create(_self.attr('resize-width-min'));

		//this.log('.getWidthByParent, id=' + el.id + '/' + el.tagName + ', parent_width=' + parent_width + ', w=' + w );
		//el.setAttribute('getWidthByParent2', 'parent_width=' + parent_width + ', w=' + w);

		if (_self.css('float') == 'left') {
			var _prev = _self.prevAll('div'), _item;
			for (var i = 0; i < _prev.length; i++) {
				_item = jQuery(_prev[i]);
				if (_item.css('display') != 'none' && _item.css('float') == 'left') { w -= this.getWidth(_item, true); }
			}
		}
		return Math.max((this._round ? Math.floor(w) : w) - this._correct, 2);
	},
	getWidth: function (el, include_margin, style) { //resize_width_self
		if (!el || el.size() == 0) return 0;

		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			var width = style.getPropertyValue('width'), fallback = width == 'auto' || width.right(1) == '%';
			if (fallback) { width = el.innerWidth(); }
			return Number.create(parseFloat(width) + this.getWidthOuterSpace(null, include_margin, el.css('box-sizing') == 'border-box' && this._computedStyleIncludePaddings && (!fallback || el[0].tagName.list('TABLE', 'TD')), style) + (el.css('overflow') == 'auto' || el.css('overflow-y') == 'auto' ? 0 /*17*/ : 0));
		} else {
			return el.outerWidth(typeof include_margin != 'undefined' && include_margin);
		}
	},
	getContentWidth: function (el, style) {
		if (!el || el.size() == 0) return 0;
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			var width = style.getPropertyValue('width');
			if (width == 'auto' || width.right(1) == '%') { width = el.innerWidth(); }
			// in IE (11) the computedstyle returns the width without paddings when the element is visible, but with paddings when not visible
			width = parseFloat(width) - (el.css('box-sizing') == 'border-box' && (this._computedStyleIncludePaddings || (this._paddingsFix && el[0].offsetWidth == 0) || (this._computedTableIncludePaddings && el[0].tagName == 'TABLE')) ? this.getWidthOuterSpace(el, false, false, style) : 0);
		} else {
			var width = el.innerWidth();
		}
		return Number.create(width);
	},
	getWidthOuterSpace: function (el, include_margin, exclude_padding, style) { //resize_width_paddings
		if (!include_margin && !exclude_padding && el && el.data('resize-width-excluded')) return el.data('resize-width-excluded');
		if (this._useComputedStyle) {
			if (!style && el) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			return Number.create(
				(!exclude_padding ?
					Number.float(style.getPropertyValue('padding-left')) + Number.float(style.getPropertyValue('padding-right')) +
					Number.float(style.getPropertyValue('border-left-width')) + Number.float(style.getPropertyValue('border-right-width'))
					:
					(!this._computedStyleIncludeBorders ? Number.float(style.getPropertyValue('border-left-width')) + Number.float(style.getPropertyValue('border-right-width')) : 0)
				) +
				(include_margin ? Number.float(style.getPropertyValue('margin-left')) + Number.float(style.getPropertyValue('margin-right')) : 0)
			);
		} else {
			var _prop = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'];
			if (include_margin) _prop.push('marginLeft', 'marginRight');
			return Number.cumulate(el.css(_prop));
		}
	},
	setWidth: function (el, width, exclude_outerspace) {
		if (isNaN(width)) return;

		var bs = el.css('box-sizing');
		if (bs == 'border-box' && !exclude_outerspace) width += (Number.create(el.data('resize-width-excluded')) || this.getWidthOuterSpace(el));
		else if ((!bs || bs == 'content-box') && exclude_outerspace) width -= (Number.create(el.data('resize-width-excluded')) || this.getWidthOuterSpace(el));
		el.css('width', width + 'px');

	},

	getHeightByParent: function (el) {
		var h = 0, _self = jQuery(el), _parent = _self.data('resizeOffsetParent') || _self.offsetParent();
		var selector = _self.attr('resize-height-selector'), h;
		if (selector) {
			//var _prop = _self.css(['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth']);
			switch (selector) {
				case 'previous': selector = _self.prev(); break; //_self.prev().outerHeight(); break;
				case 'next': selector = _self.next(); break;
				default: selector = $(selector); break;
			}
			h = this.getHeight(selector);
			selector.data('child-height-selector', _self);
			if (h > 0) h = h - this.getHeightOuterSpace(_self, true);

		}
		if (!h) {
			var style = window.getComputedStyle(_parent[0], null),
				parent_height = this.getContentHeight(_parent, style),
				parent_padding = this.getHeightOuterSpace(_parent, false, false, style),
				parent_scrollheight = Math.max(_parent[0].scrollHeight - parent_padding, 0);

			//el.setAttribute('resizeParentHeight', parent_height + '/' + parent_scrollheight + '/' + this.getPadding(_parent, 'top', style));

			if (Math.round(parent_scrollheight * 100) / 100 == parent_height) parent_height = parent_scrollheight;
			else if (parent_scrollheight > parent_height + 1) parent_height = parent_scrollheight;


			//this.log('.getHeightByParent, id=' + el.id + '/' + el.tagName + ', ' + parent_height + ', padding=' + parent_padding + ', scrollHeight=' + parent_scrollheight + ', paddingTop=' + this.getPadding(_parent, style, 'top') + ', outerHeight=' + this.getHeightOuterSpace(_self, null, true));

			h =
				parent_height /* - parent_padding*/ -
				((Number.create(_self.data('resize-top')) || el.offsetTop) - this.getPadding(_parent, 'top', style)) -
				(FD.Browser.mobile && FD.Browser.safari ? (this.getPadding(_parent, 'top', style) * 2) : 0) -
				(_self.data('resize-height') || this.getHeightOuterSpace(_self, true)) -
				Number.create(_self.attr('resize-height-min'));

			//el.setAttribute('resizeParentHeight2', h + '/' + (Number.create(_self.data('resize-top'))));
			//this.log('.getHeightByParent, id=' + el.id + '/' + el.tagName + ', ' + h);

			var _next = _self.nextAll().get(), _item, _marginBottom = this.getMargin(_self, 'bottom') > 0;
			for (var i = 0; i < _next.length; i++) {
				_item = jQuery(_next[i]);
				if (_item.css('float') != 'left' && _item.css('position') != 'absolute') {
					h -= (this.getHeight(_item, true) - (_marginBottom ? this.getMargin(_item, 'top') : 0));
					_marginBottom = this.getMargin(_item, 'bottom') > 0;
				}
			}

			//this.log('.getHeightByParent, id=' + el.id + '/' + el.tagName + ', ' + h);
			//el.setAttribute('getHeightByParent', h + '/' + parent_height + '/' + Number.create(_self.data('resize-height')));
		}
		h = Math.max(h, Number.create(_self.css('min-height'), 2));

		return (this._round ? Math.floor(h) : h) - this._correct;
	},
	getHeight: function (el, include_margin, style, debug) { //resize_height_self
		// height including padding, border and margin
		if (!el || el.size() == 0 || el.css('display') == 'none') return 0;
		if (this._useComputedStyle) {
			if (!style) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			var height = style.getPropertyValue('height'), fallback = height == 'auto' || height.right(1) == '%';
			if (fallback) { height = el.innerHeight(); el[0].setAttribute('getHeightFallback', 'true'); }
			//String.log('box-sizing=' + style.getPropertyValue('box-sizing') + ', ' + this._computedStyleIncludePaddings + ', ' + el[0].tagName.list('TABLE', 'TD'));
			return Number.create(
				parseFloat(height) +
				this.getHeightOuterSpace(el, include_margin, el.css('box-sizing') == 'border-box' && this._computedStyleIncludePaddings && (!fallback || el[0].tagName.list('TABLE', 'TD')), style)
			);
		} else {
			return el.outerHeight(typeof include_margin != 'undefined' && include_margin) /*+ Number.create(el.attr('resize-height-min'))*/;
		}
	},
	getContentHeight: function (el, style) {
		if (!el || el.size() == 0) return 0;
		if (this._useComputedStyle) {
			if (!style) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			var height = style.getPropertyValue('height'), bs = el.css('box-sizing');
			if (height == 'auto' || height.right(1) == '%') { height = el.innerHeight() - (bs == 'border-box' && el[0].tagName == 'TABLE' ? this.getHeightOuterSpace(null, false, false, style) : 0); }
			else height = parseFloat(height) - (bs == 'border-box' && (this._computedStyleIncludePaddings || (this._paddingsFix && el[0].offsetHeight == 0) || (this._computedTableIncludePaddings && el[0].tagName.list('TABLE', 'TD'))) ? this.getHeightOuterSpace(el, false, false, style) : 0);
		} else {
			var height = el.innerHeight();
		}
		return Number.create(height);
	},
	getScrollHeight: function (el, style) {
		if (!el || el.size() == 0) return 0;
		if (!style) style = window.getComputedStyle(el[0], null);
		if (!style) return 0;
		//alert(this.getHeight(el) + ', ' + el[0].scrollHeight);
		var height = this.getHeight(el);
		if (el[0].scrollHeight > height) height = el[0].scrollHeight + (!FD.Browser.WebKit ? this.getPadding(el, 'bottom', style) : 0) + this.getBorder(el, 'bottom', style);
		return height;
	},
	getHeightOuterSpace: function (el, include_margin, exclude_padding, style) {
		if (!el || el.size() == 0) return 0;
		if (!include_margin && !exclude_padding && el && el.data('resize-height-excluded')) return el.data('resize-height-excluded');
		if (this._useComputedStyle) {
			if (!style) style = window.getComputedStyle(el[0], null);
			if (!style) return 0;
			var space = Number.create(
				(!exclude_padding ?
					Number.float(style.getPropertyValue('padding-top')) + Number.float(style.getPropertyValue('padding-bottom')) +
					Number.float(style.getPropertyValue('border-top-width')) + Number.float(style.getPropertyValue('border-bottom-width'))
					:
					(!this._computedStyleIncludeBorders ? Number.float(style.getPropertyValue('border-top-width')) + Number.float(style.getPropertyValue('border-bottom-width')) : 0)
				) +
				(include_margin ? Number.float(style.getPropertyValue('margin-top')) + Number.float(style.getPropertyValue('margin-bottom')) : 0)
			);
			return space;
		} else {
			var _prop = ['paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth'];
			if (include_margin) _prop.push('marginTop', 'marginBottom');
			return Number.cumulate(el.css(_prop));
		}
	},
	setHeight: function (el, height, exclude_outerspace) { // sets the total height (content height + padding + border) of an element
		/*
		the height parameter is by default considered only the content height
		when exclude_outerspace=true then the height parameter is considered the content height + padding + border

		when box-sizing=border-box then the css height is the content height + padding + border
		when box-sizing=content-box then the css height is only the content height
		*/

		var bs = el.css('box-sizing');
		if (bs == 'border-box' && !exclude_outerspace) height += (Number.create(el.data('resize-height-excluded')) || this.getHeightOuterSpace(el));
		else if ((!bs || bs == 'content-box') && exclude_outerspace) height -= (Number.create(el.data('resize-height-excluded')) || this.getHeightOuterSpace(el));
		el.css('height', height + 'px');
	}

});
FD.Element = { Dimensions: new FDElementDimensions() };

FD.Security = {
	/* This function/object checks for Internet Security software */
	checkIS: function (opWND) {

		var obj = { IS: false, Continue: true };

		opWND = (typeof opWND == 'object' ? opWND : window);
		var cOnError = new String(opWND.onerror), cOpen = new String(opWND.open);
		if (typeof opWND.onerror != 'undefined' && cOnError.search('native') <= -1 && cOnError.search('fdOnError') <= -1 && cOnError.search('FD.') <= -1) {
			obj.IS = true;
			opWND.onerror = null;
		}
		if (opWND.open && ((!FD.Browser.safari && cOpen.search('native') <= -1) || (FD.Browser.safari && cOpen != '[function]'))) {
			obj.IS = true;
			if (opWND.SymRealWinOpen)
				opWND.open = opWND.SymRealWinOpen;
			else
				obj.Continue = false;
		}

		return obj;
	}
};

var FDTexts = new Class({

	Extends: FDBaseClass,
	_class: 'FDTexts',

	_trace: false,

	name: 'root',
	lang: 0,
	_subs: [],
	_keys: [],
	_texts: {},
	_cloning: false,

	initialize: function (options) {
		this.parent();

		if (options) {
			if (options.name) this.name = options.name;
			if (options.lang) this.lang = options.lang;
			if (options.texts) this.set(options.texts);
		}

		this.log('.initialize');
	},

	set: function (texts) {

		this.log('.set, texts=' + Object.inspect(texts));

		for (var key in texts) {
			if (!this._texts[key]) this._keys.push(key);
			this._texts[key] = texts[key];
		}

		if (this.name == 'Format') {
			var format = this.get('NUMBER');
			if (format) Number.setFormat(format);
		}
	},
	get: function (key, alt) {

		if (this._keys.length == 0 && this.name == 'root' && !this._cloning) this._getCloned();

		key = key.split('.');
		var sub = (key.length > 1 ? this._texts[key.shift()] : this), val = (sub && sub._texts[key[0]] ? sub._texts[key[0]] : (alt ? alt : ''));

		return (typeof val == 'string' ? unescape(val) : val);
	},
	exists: function (key) {
		key = key.split('.');
		var sub = (key.length > 1 ? this._texts[key.shift()] : this);
		return (typeof sub != 'undefined' && typeof sub._texts[key[0]] != 'undefined');
	},
	sprintf: function () {
		var args = $A(arguments), key = args.shift();
		return String.sprintf.apply(this, [this.get(key)].concat(args));
	},
	create: function (sub, texts) {
		if (this._texts[sub]) this._texts[sub].set(texts);
		else {
			this._texts[sub] = this[sub] = new FDTexts({ name: sub, lang: this.lang, texts: texts });
			this._subs.push(sub);
			this._keys.push(sub);
		}
	},
	_getCloned: function () {

		this.log('._getCloned');

		this._cloning = true;

		var from = null;
		try {
			if (top.FD && typeof top.FD.Texts != 'undefined') {
				this.log('.getCloned, from the top FDTexts');
				from = top.FD.Texts;
			} else if (top.opener && typeof top.opener.FD != 'undefined' && typeof top.opener.FD.Texts != 'undefined') {
				String.log('.getCloned, from the opener FDTexts');
				from = top.opener.FD.Texts;
			} else {
				String.log('.getCloned, nothing to clone')
			}
		} catch (e) { }

		if (from) {
			this._subs = from._subs.clone();
			this._keys = from._keys.clone();

			Object.extend(this._texts, from._texts);
			for (var sub in this._texts) {
				if (Object.is(this._texts[sub])) {
					this.log('.clone, sub=' + sub);
					this[sub] = this._texts[sub];
				}
			}

			//var format = this.get('Formats.NUMBER');
			//if (format) Number.setFormat(format);

		}

		this._cloning = false;

	},
	clone: function () {

		this.log('.clone');

		var clone = new FDTexts({ name: this.name, lang: this.lang });
		this.log('.cloning');
		clone._subs = this._subs.clone();
		clone._keys = this._keys.clone();

		Object.extend(clone._texts, this._texts);
		for (var sub in clone._texts) {
			if (Object.is(clone._texts[sub])) {
				this.log('.clone, sub=' + sub);
				clone[sub] = clone._texts[sub];
			}
		}

		this.log('.clone, keys=' + clone._keys);
		return clone;
	},
	dump: function (prefix) {
		var dump = (!prefix ? 'Lang=' + (this.lang ? this.lang : '') + ', is_loaded=' + (typeof __FD_LANGUAGE != 'undefined' ? __FD_LANGUAGE : 'not defined') + ', ' : '') + 'Prefix=' + (prefix ? prefix : 'root') + ', Keys (' + this._keys.length + ')=' + this._keys + '\n', key;
		try {
			for (var i = 0; i < this._keys.length; i++) {
				key = this._keys[i];
				try {
					if (Object.is(this._texts[key])) dump += this._texts[key].dump((prefix ? prefix + '.' : '') + key);
					else dump += (prefix ? prefix + '.' : '') + key + '=' + this._texts[key] + '\n';
				} catch (e) { dump += "error dumping key '" + key + "', type=" + Object.toType(this._texts[key]) + ', inspect=' + (Object.is(this._texts[key]) ? Object.inspect(this._texts[key]) : 'not an object') + "\n"; }
			}
		} catch (e) { dump += 'Error dumping: ' + FD.Error._message(e); }
		return dump;
	},
	count: function () {
		return this._keys.length;
	}
});

FD.Texts = new FDTexts();

var FDCookieHandler = new Class({

	Extends: FDBaseClass,
	_class: 'FDCookieHandler',

	_trace: false,
	_cache: null,

	initialize: function () {
		this.parent();
		this._cache = new FDKeys();
	},

	getAll: function (cookies) {
		var keys = new FDKeys((cookies ? cookies : document.cookie).split('; '), { decode: true /* decode values */ });
		return keys;
	},
	Get: function (cookie, cookies, type) {
		cookies = this.getAll((arguments.length > 1 ? cookies : null));
		return cookies.get(cookie, false, type);
	},
	GetKeys: function (cookie, cookies, reload, domain) {
		var keys = (!reload ? this._cache.get('keys/' + cookie) : null);
		if (!keys) {
			cookies = this.getAll((arguments.length > 1 && String.is(cookies) ? cookies : null));
			var value = cookies.get(cookie);
			keys = new FDKeys((value ? value.split('&') : null), { decode: true });
			if (domain) {
				while (keys.exists('domain') && keys.get('domain') != domain) {
					this.log('.GetKeys, removing cookie (domain=' + keys.get('domain') + ', required=' + domain);
					cookies.remove(cookie);
					value = cookies.get(cookie);
					keys = new FDKeys((value ? value.split('&') : null), { decode: true });
				}
			}
			if (keys.length > 0) this._cache.set('keys/' + cookie, keys);
		}
		return keys;
	},
	/*
	getContextKeys: function () {
	var cookies = this.getAll(), domain = FD.getInfo().domain.toLowerCase(), keys;
	for (var i = 0; i < cookies.length; i++) {
	if (cookies[i][0] == 'context') {
	keys = FDKeyArray(cookies[i][0].split('&'));
	if (keys.get('domain') == domain) return keys;
	}
	}
	return FDKeyArray();
	},
	*/
	GetKey: function (cookie, key, cookies) {
		var keys = this.GetKeys(cookie, cookies);
		return keys.get(key);
	},
	Exist: function (cookie, cookies) {
		cookies = this.getAll((arguments.length > 1 ? cookies : null));
		return cookies.exist(cookie);
	},
	Set: function (cookie, value, expireDays) {
		var val = '', path, domain, secure, args = $A(arguments).slice(3), i = 0, p, hasSecure = false;
		while (args.length > 0) {
			i++; p = args.shift();
			if (String.is(p)) { if (i == 1 /* last param */) path = p; else domain = p; }
			if (Number.is(p) && !hasSecure) { secure = FDUri.current.isSecure(); hasSecure = true; }
			if (Boolean.is(p) && !hasSecure) { secure = p; hasSecure = true; }
		}
		if (Array.is(value)) {
			val = this.GetKeys(cookie);
			val.merge(value);
			val = val.toString();
		} else if (typeof value == 'object') {
			for (var key in value) {
				val += ("&" + key + "=" + escape(value[key]));
			}
			val = val.substr(1);
		} else {
			val = value;
		}
		cookie = cookie + "=" + escape(val);

		if (!Number.is(expireDays)) expireDays = 365;
		if (expireDays >= 0) {
			var exdate = new Date();
			exdate.setDate(exdate.getDate() + expireDays);
			cookie += "; expires=" + exdate.toGMTString();
		}

		if (!domain) domain = this._domain();
		if (domain) cookie += "; domain=" + domain;

		if (!path) path = this._path();
		cookie += "; path=" + path;

		if (secure) cookie += "; secure";

		cookie += "; samesite=Strict";

		//alert(cookie);
		this.log('.Set, cookie=' + cookie);
		//alert(cookie);
		document.cookie = cookie;
		//alert(document.cookie);
	},
	Delete: function (cookie, path, domain, secure) {
		if (this.Exist(cookie)) {

			cookie = cookie + "=; expires=Thu, 01-Jan-1970 00:00:01 GMT";

			if (!domain) domain = this._domain();
			if (domain) cookie += "; domain=" + (domain == '/' ? '' : domain);

			if (!path) path = this._path();
			cookie += "; path=" + path;

			if (secure) cookie += "; secure";

			this.log('.Delete, cookie=' + cookie);
			document.cookie = cookie;
		}
	},
	Remove: function () {
		this.Delete.apply(this, arguments);
	},

	_domain: function (parentDomain) {
		var host = window.location.hostname.split('.'), is_ip = /^([\d]+)\.([\d]+)\.([\d]+)\.([\d]+)$/.test(window.location.hostname), prefix = (!is_ip && host.length > 1 && parentDomain ? '.' : '');
		if (parentDomain && !is_ip && host.length > 2) host.shift();
		this.log('._domain, hostname=' + window.location.hostname + ', is_ip=' + is_ip + ', prefix=' + prefix + ', domain=' + prefix + host.join('.'));
		return (host.length > 1 ? prefix + host.join('.') : '');
	},
	_path: function () {
		var path = window.location.pathname.match(/(.*)[\/\\]([^\/\\]+\.\w+)$/);
		return (path ? path[1].add('/') : window.location.pathname);
	}
});

FD.Cookie = new FDCookieHandler();

var FDSvg = new Class({

	Extends: FDBaseClass,

	_class: 'FDSvg',

	_trace: false,

	_cache: {},
	selector: 'img.svg',

	process: function (options) {

		if (options) {
			this.setOptions(options);
		}
		var selector = this.options.selector;

		var $svgs = ((selector instanceof jQuery) ? selector : $(selector));

		this.log('.init, selector=' + selector + ', count=' + $svgs.length);

		if ($svgs.length == 0) return;

		if (FD.Browser.less('ie', 9)) {
			$svgs.each(this.fallback.bind(this));
		} else {
			$svgs.each(this.each.bind(this));
		}

	},
	each: function (index, value) {

		var url = $(value).attr('src');
		if (!/\.svg/i.test(url)) return;

		if (!this._cache[url]) {

			var options = this.options;

			if (this.options.master && $(this.options.master).length > 0) {
				this._cache[url] = new $.Deferred();
				this._cache[url].resolve($(this.options.master).html());
			} else {
				this._cache[url] = $.get(url); //.promise();
			}
		}

		this._cache[url].done(this.replace.bind(value));

	},
	replace: function (data) {

		//String.log(['FDSvg.replace begin', data]);

		var $img = $(this),
			attributes = $img.prop('attributes'), alt = $img.attr('alt');

		var $data = $(data), $svg = (($data.prop('tagName') || '').toUpperCase() == 'SVG' ? $data.clone() : $(data).find('svg').clone());

		// Remove any invalid XML tags as per http://validator.w3.org
		$svg = $svg.removeAttr('xmlns:a');

		if (attributes) {
			$.each(attributes, function () {
				$svg.attr(this.name, this.value);
			});
			if (alt) {
				$svg.attr('aria-label', alt);
			}
		}
		
		$svg.attr('role', 'img');
		$img.replaceWith($svg);

	},
	fallback: function (index, value) {

		var url = $(value).attr('src');
		if (!this._cache[url]) {
			this._cache[url] = this._getFallback(url);
		}

		$(value).attr('src', this._cache[url]);

	},
	_getFallback: function (url) {

		if (this.options.fallback) {

			return this.options.fallback;

		} else if (FDSvg.fallbacks[url]) {

			return FDSvg.fallbacks[url];

		} else {

			FDSvg.fallbacks[url] = url.replace('.svg', '.png');
			return FDSvg.fallbacks[url];
		}

	}

}).extend({

	instances: {},
	defaults: {
		type: 'default',
		selector: 'img.svg',
		fallback: ''
	},
	types: {
		help: {
			selector: '.info-link',
			fallback: '/images/system/help/help014.png',
			master: '.master-image'
		}
	},
	fallbacks: {},
	process: function (type_or_options) {

		var options = type_or_options;

		if (String.is(type_or_options)) {
			options = this.types[type_or_options];
			options.type = type_or_options;
		}

		options = $.extend({}, this.defaults, options), type = options.type;

		if (!this.instances[type]) {
			this.instances[type] = new FDSvg(options);
		}

		this.instances[type].process(options);
	}
});


function URLEncode(cpString, cpSAFECHARS, lpUrl) {
	// The Javascript escape and unescape functions do not correspond
	// with what browsers actually do...
	var SAFECHARS = "0123456789" + 				// Numeric
					"ABCDEFGHIJKLMNOPQRSTUVWXYZ" + // Alphabetic
					"abcdefghijklmnopqrstuvwxyz" +
					"-_.!~*'()" + (cpSAFECHARS || ''); // RFC2396 Mark characters
	var HEX = "0123456789ABCDEF";

	var cEncoded = "";
	for (var i = 0; i < cpString.length; i++) {
		var ch = cpString.charAt(i);
		if (ch == " ") {
			cEncoded += (lpUrl ? "%20" : "+"); 			// x-www-urlencoded, rather than %20
		} else if (SAFECHARS.indexOf(ch) != -1) {
			cEncoded += ch;
		} else {
			var charCode = ch.charCodeAt(0);
			cEncoded += "%";
			cEncoded += HEX.charAt((charCode >> 4) & 0xF);
			cEncoded += HEX.charAt(charCode & 0xF);
		}
	} // for

	return cEncoded;
}
if (typeof encodeURIComponent == 'undefined') var encodeURIComponent = URLEncode;
function URLEncodeFull(cpString) {
	var aUrl = cpString.match(/(http(s?)\:\/\/)?([^\?]+)(\?(.*))?/); // MSIE 5.0 compatible
	// ((?:http(?:s?))\:\/\/)?([^\?]+)(?:\?(.*))? // MSIE 5.5+ compatible
	if (aUrl) return ((aUrl[1] ? aUrl[1] : '') + URLEncode(aUrl[3], '/%', true) + (aUrl[5] && aUrl[5].length > 0 ? '?' + URLEncode(aUrl[5], '&=') : ''));
	else return ('');
}
function URLDecode(cpString) {
	// Replace + with ' '
	// Replace %xx with equivalent character
	var cDecoded = "", i = 0;
	while (i < cpString.length) {
		var ch = cpString.charAt(i);
		if (ch == "+") {
			cDecoded += " ";
			i++;
		} else if (ch == "%" && cpString.charAt(i + 1) != "%") {
			cDecoded += unescape(cpString.substr(i, 3));
			i += 3;
		} else {
			cDecoded += ch;
			i++;
		}
	} // while
	if (i < cpString.length) {
		cDecoded += cpString.substr(i, cpString.length - i);
	}

	return unescape(cDecoded);
}
if (typeof decodeURIComponent == 'undefined') var decodeURIComponent = URLDecode;

function OpenWindow(opWindow, cpPage, npWidth, npHeight, cpScroll, cpStatus, cpToolbar, cpName, opParentProp, lpDialog, vpArg) {
	var lParent = Object.is(opParentProp), cScroll = (cpScroll ? cpScroll : 'yes'), wnd = (lParent ? opParentProp.Window : window), inIFrame = false, canAccessWindow = true;
	try {
		inIFrame = wnd.self != window.top;
	} catch (e) {
		inIFrame = true;
	}
	try {
		var test = wnd.document.location;
	} catch (e) {
		canAccessWindow = false;
	}
	lParent = lParent && canAccessWindow;

	var cStatus = (cpStatus ? cpStatus : 'yes'), cToolbar = (cpToolbar ? cpToolbar : 'no');
	var nAvailWidth = 0, nAvailHeight = 0; //, oDim = new getWindowDim( window, true );
	//if( window.screen ){
	nAvailWidth = window.screen.availWidth;
	nAvailHeight = window.screen.availHeight - (Browser.ie ? 60 : 56);
	//}
	var nWidth = 0, nHeight = 0, nTop = 0, nLeft = 0;
	npWidth = (typeof npWidth == 'undefined' ? (lParent ? 0 : nAvailWidth) : (npWidth > nAvailWidth ? nAvailWidth : npWidth));
	npHeight = (typeof npHeight == 'undefined' ? (lParent ? 0 : nAvailHeight) : ((npHeight + 32) >= nAvailHeight ? nAvailHeight - 50 : npHeight));
	lpDialog = lpDialog && Browser.ie;
	if (lParent) {
		var oWnd = opParentProp.Window;
		oDim = new getWindowDim(oWnd, true);
		nWidth = oDim.outerWidth, nHeight = Math.min(oDim.outerHeight, nAvailHeight), nTop = oDim.Top, nLeft = oDim.Left;

		nWidth = nWidth - opParentProp.offsetWidth - 12 - (Browser.ie ? 6 : 0); //scrollbar;  && cScroll != 'yes'
		nHeight = nHeight - opParentProp.offsetHeight - 26 - (cStatus == 'yes' ? 37 : 0);
		nTop = nTop + (opParentProp.offsetHeight / 2);
		nLeft = nLeft + (opParentProp.offsetWidth / 2);
	}
	if (canAccessWindow) {
		nWidth = Math.max(nWidth, npWidth);
		nHeight = Math.max(nHeight, npHeight);
	}

	if (!lParent || (nLeft + nWidth > nAvailWidth))
		nLeft = (nAvailWidth / 2) - ((nWidth + (cScroll == 'yes' ? 8 : 0)) / 2);
	if (!lParent || (nTop + nHeight > nAvailHeight))
		nTop = (nAvailHeight / 2) - (nHeight / 2) - 25;
	if (nTop < 0) nTop = 0;
	var oFromWindow = ((Object.is(opWindow)) ? opWindow : window), oWindow = null, vReturn;
	
	if (lpDialog)
		vReturn = oFromWindow.showModalDialog(cpPage, (vpArg ? vpArg : window), 'dialogWidth:' + nWidth + 'px;dialogHeight:' + nHeight + 'px;center:yes;scroll:' + cScroll + ';status:' + cStatus);
	else
		oWindow = oFromWindow.open(cpPage, (cpName ? cpName : ''), 'toolbar=' + cToolbar + ',directories=no,menubar=no,status=' + cStatus + ',resizable=yes,scrollbars=' + cScroll + ',top=' + nTop + ',left=' + nLeft + (nWidth > 0 ? ',width=' + nWidth : '') + (nHeight > 0 ? ',height=' + nHeight : ''));

	if (!lpDialog && Browser.ie && oWindow) oWindow.opener = oFromWindow;
	return (lpDialog ? vReturn : (Object.is(oWindow, 'document') ? oWindow : null));
}

function maximizeWindow(npMaxWidth, npMaxHeight) {
	var nAvailWidth = window.screen.availWidth, nAvailHeight = window.screen.availHeight;
	var nWidth = (arguments.length == 0 || npMaxWidth > nAvailWidth) ? nAvailWidth : npMaxWidth;
	var nHeight = (arguments.length == 0 || (npMaxHeight + 32) >= nAvailHeight) ? nAvailHeight - 50 : npMaxHeight;
	var nLeft = (nAvailWidth / 2) - (nWidth / 2);
	var nTop = (nAvailHeight / 2) - (nHeight / 2) - 25;
	if (nTop < 0) nTop = 0;
	window.moveTo(nLeft, nTop);
	window.resizeTo(nWidth, nHeight);
}

function centerWindow(opWnd) {
	var oDim = new getWindowDim(opWnd, true);
	var nTop = Math.max((oDim.availHeight / 2) - (oDim.outerHeight / 2) - (Browser.ie ? 25 : 0), 0);
	var nLeft = Math.max((oDim.availWidth / 2) - (oDim.outerWidth / 2), 0);
	opWnd.moveTo(nLeft, nTop);
	//	oDim = new getWindowDim( opWnd, true );
	//	alert(oDim.availWidth+ '; '+nTop+', ' + nLeft+'; '+oDim.Top+', '+oDim.Left + ', ' + oDim.outerWidth+', ' + opWnd.scrollbars);
}

function getWindowDim(opWnd, lpCreated) {
	if (!lpCreated) return (new getWindowDim(opWnd || window, true));

	this.outerWidth = 0, this.outerHeight = 0, this.clientWidth = 0, this.clientHeight = 0, this.scrollTop = 0, this.scrollLeft = 0;
	this.Top = 0, this.Left = 0, this.availWidth = opWnd.screen.availWidth, this.availHeight = opWnd.screen.availHeight;
	with (this) {
		if (Browser.gecko || Browser.WebKit || typeof opWnd.pageYOffset != 'undefined') {
			availHeight = availHeight - 56;
			Top = opWnd.screenY;
			Left = opWnd.screenX;
			outerWidth = opWnd.outerWidth;
			outerHeight = opWnd.outerHeight + 2;
			clientWidth = opWnd.innerWidth;
			clientHeight = opWnd.innerHeight;
			scrollTop = opWnd.pageYOffset;
			scrollLeft = opWnd.pageXOffset;
		} else if (Browser.ie) {
			availHeight = availHeight - 60;
			Top = opWnd.screenTop;
			Left = opWnd.screenLeft;
			if (opWnd.document.body) {
				outerWidth = opWnd.document.body.offsetWidth + 6; // -6 voor de scrollbar
				outerHeight = opWnd.document.body.offsetHeight;
				clientWidth = opWnd.document.body.clientWidth;
				clientHeight = opWnd.document.body.clientHeight;
				scrollTop = opWnd.document.body.scrollTop;
				scrollLeft = opWnd.document.body.scrollLeft;
			}
		}
	}
}

function Select(opDoc, vpEl, lpNoError) {
	var oEl = FD.get(vpEl, opDoc);
	if (typeof oEl[0] != 'undefined' && (typeof oEl.tagName == 'undefined' || oEl.tagName != 'SELECT')) oEl = oEl[0];
	if (typeof oEl.type != 'undefined' && oEl.type == 'hidden') return;
	if ((typeof oEl.disabled == 'undefined' || !oEl.disabled) && (typeof oEl.readOnly == 'undefined' || !oEl.readOnly)) {
		if (Browser.W3C) {
			try {
				if (typeof oEl.focus != 'undefined') oEl.focus();
				if (typeof oEl.select != 'undefined') oEl.select();
			} catch (e) { }
		} else {
			if (typeof oEl.focus != 'undefined') oEl.focus();
			if (typeof oEl.select != 'undefined') oEl.select();
		}
	}
}

function SwapImage(opDocument, cpImgName, cpImg, cpImgDir) {
	opDocument.images[cpImgName].src = (typeof cpImgDir != 'undefined' ? cpImgDir : 'images/') + cpImg;
}

// deprecated; use isEmpty instead
function CheckEmpty(str, lpNoLength) {
	return String.create(str).empty(lpNoLength);
}


/**
*
*  Javascript sprintf
*  http://www.webtoolkit.info/
*
*
**/
sprintfWrapper = {

	init: function () {

		if (typeof arguments == "undefined") { return null; }
		if (arguments.length < 1) { return null; }
		if (typeof arguments[0] != "string") { return null; }
		if (typeof RegExp == "undefined") { return null; }

		var args = $A(arguments);
		var string = arguments[0];
		var exp = new RegExp(/(%([%]|(\-)?(\+|\x20)?(0)?(\d+)?(\.(\d)?)?([bcdfosxX])))/g);
		var matches = new Array(), strings = new Array();
		var convCount = 0, stringPosStart = 0, stringPosEnd = 0, matchPosEnd = 0, newString = '', match = null;

		while (match = exp.exec(string)) {
			if (match[9]) { convCount += 1; }

			stringPosStart = matchPosEnd;
			stringPosEnd = exp.lastIndex - match[0].length;
			strings[strings.length] = string.substring(stringPosStart, stringPosEnd);

			matchPosEnd = exp.lastIndex;
			matches[matches.length] = { match: match[0], left: match[3] ? true : false, sign: match[4] || '', pad: match[5] || ' ', min: match[6] || 0, precision: match[8], code: match[9] || '%', negative: parseInt(arguments[convCount]) < 0 ? true : false, argument: String(arguments[convCount] == null ? '' : arguments[convCount]) };
		}
		strings[strings.length] = string.substring(matchPosEnd);

		if (matches.length == 0) { return string; }
		//args.padr(convCount + 1, '');
		//if ((args.length - 1) < convCount) { return null; }

		var code = null;
		var match = null;
		var i = null;

		for (i = 0; i < matches.length; i++) {

			if (matches[i].code == '%') { substitution = '%' }
			else if (matches[i].code == 'b') {
				matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(2));
				substitution = sprintfWrapper.convert(matches[i], true);
			}
			else if (matches[i].code == 'c') {
				matches[i].argument = String(String.fromCharCode(parseInt(Math.abs(parseInt(matches[i].argument)))));
				substitution = sprintfWrapper.convert(matches[i], true);
			}
			else if (matches[i].code == 'd') {
				matches[i].argument = String(Math.abs(parseInt(matches[i].argument)));
				substitution = sprintfWrapper.convert(matches[i]);
			}
			else if (matches[i].code == 'f') {
				matches[i].argument = String(Math.abs(parseFloat(matches[i].argument)).toFixed(matches[i].precision ? matches[i].precision : 6));
				substitution = sprintfWrapper.convert(matches[i]);
			}
			else if (matches[i].code == 'o') {
				matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(8));
				substitution = sprintfWrapper.convert(matches[i]);
			}
			else if (matches[i].code == 's') {
				matches[i].argument = matches[i].argument.substring(0, matches[i].precision ? matches[i].precision : matches[i].argument.length)
				substitution = sprintfWrapper.convert(matches[i], true);
			}
			else if (matches[i].code == 'x') {
				matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
				substitution = sprintfWrapper.convert(matches[i]);
			}
			else if (matches[i].code == 'X') {
				matches[i].argument = String(Math.abs(parseInt(matches[i].argument)).toString(16));
				substitution = sprintfWrapper.convert(matches[i]).toUpperCase();
			}
			else {
				substitution = matches[i].match;
			}

			newString += strings[i];
			newString += substitution;

		}
		newString += strings[i];

		return newString;

	},

	convert: function (match, nosign) {
		if (nosign) { match.sign = ''; }
		else { match.sign = match.negative ? '-' : match.sign; }
		var l = match.min - match.argument.length + 1 - match.sign.length;
		var pad = new Array(l < 0 ? 0 : l).join(match.pad);
		if (!match.left) {
			if (match.pad == "0" || nosign) { return match.sign + pad + match.argument; }
			else { return pad + match.sign + match.argument; }
		} else {
			if (match.pad == "0" || nosign) { return match.sign + match.argument + pad.replace(/0/g, ' '); }
			else { return match.sign + match.argument + pad; }
		}
	}
};

String.sprintf = sprintfWrapper.init;

function getElement(doc, vel) {
	return FD.get(vel, doc);
}
FD.get = function (id, doc, nameonly) {
	if (Object.is(id) || Array.is(id)) return id;
	doc = doc || document;
	if (doc instanceof jQuery) doc = doc[0];
	var el = null;
	if (typeof doc.getElementsByName != 'undefined') {
		el = doc.getElementsByName(id);
		if (el && (FD.Browser.ie || FD.Browser.opera)) { // there is a terrible bug in IE8 also returning elements with a matching ID without a matching Name. Because of the browser compatibility feature of IE8 this is also applicable for the IE7 useragent string
			el = FD.get.correct(el, id);
		}
	}
	if (!el || el.length == 0)
		el = ((!Boolean.is(nameonly) || !nameonly) && doc.getElementById ? doc.getElementById(id) : null);
	else if (el && !el.tagName && el.length == 1)
		el = el[0];
	return el;
};
FD.get.correct = function (arr, id) {
	arr = $A(arr);
	for (var i = arr.length - 1; i >= 0; i--) {
		if (typeof arr[i].name == 'undefined' || arr[i].name != id) {
			arr.splice(i, 1);
		}
	}
	return (arr.length > 0 ? arr : null);
};
if (typeof jQuery == 'undefined' && typeof MooTools == 'undefined') {
	var $ = FD.get;
}

function getElementByIndex(from, index) {
	var el = null;
	if (from.all)
		el = from.all[index];
	else if (from.elements)
		el = from.elements[index];
	return el;
}

function focusElement(from, vel) {
	try {
		if (from.forms && from.forms.length == 0) return;
	} catch (e) { return; }
	var el, i, lFocus = false;
	if (typeof vel == 'string')
		el = FD.get(vel, from);
	else if (typeof vel == 'number') {
		var nel = (vel < 0 ? 0 : vel), l;
		el = getElementByIndex(from, nel);
		while (Object.is(el)) {
			//alert(oEl.name);
			if (typeof el[0] != 'undefined' && (typeof el.tagName == 'undefined' || el.tagName != 'SELECT')) {
				while (i < el.length && !l)
					l = checkFocus(el[i], vel);
				if (l) break;
			} else {
				if (checkFocus(el, vel)) break;
			}
			nel++;
			el = getElementByIndex(from, nel);
		}
	} else
		el = vel;
	if (Object.is(el)) {
		if (typeof el[0] != 'undefined' && (typeof el.tagName == 'undefined' || el.tagName != 'SELECT')) {
			while (i < el.length && !(lFocus = focusElement(from, el[i]))) i++;
		} else if (typeof el.focus != 'undefined') {
			l = !el.disabled && (!el.style || (el.style.display != 'hide' && el.style.visibility != 'hidden'));
			if (l) {
				if (Browser.ns && Browser.version < 5) {
					el.focus();
					lFocus = true;
				} else {
					eval(
						"try{" +
							"el.focus(); lFocus = true;" +
						"}catch(e){ lFocus = false; }"
					);
				}
			}
		}
	}
	return (lFocus);
}
function checkFocus(el, nel) {
	var l = !el.disabled && (!el.style || (el.style.display != 'hide' && el.style.visibility != 'hidden'));
	if (nel < 0 && (typeof el.value != 'undefined' || typeof el.checked != 'undefined') && l) return true;
	if (nel >= 0 && typeof el.focus != 'undefined' && l) return true;
	return false;
}

function setDisabled(doc, vpObject, lpDisabled, lpAdvanced, lpDontEmptyValue, cpBgColor, lpNoEvents) {
	doc = doc || document;
	if (typeof cpBgColor != 'string') cpBgColor = '#E1E1E1';
	if (Array.is(vpObject)) {
		for (var i = 0; i < vpObject.length; i++)
			setDisabled(doc, vpObject[i], lpDisabled, lpAdvanced, lpDontEmptyValue, cpBgColor);
		return;
	}
	var oEl = FD.get(vpObject, doc), lArray = (oEl && typeof oEl[0] != 'undefined');
	if (String.is(vpObject) && oEl && String.is(oEl.id) && (!oEl.name || oEl.name != vpObject) && oEl.getAttribute('fd:type')) oEl = null;
	if (Object.is(oEl) || Array.is(oEl)) {
		if (lArray && (typeof oEl.tagName == 'undefined' || oEl.tagName != 'SELECT')) {
			for (var i = 0; i < oEl.length; i++) {
				if (typeof oEl[i].disabled != 'undefined' && oEl[i].disabled != lpDisabled) {
					oEl[i].disabled = lpDisabled;
					if (typeof oEl[i].type != 'undefined' && (oEl[i].type == 'checkbox' || oEl[i].type == 'radio')) {
						if (!lpDontEmptyValue) {
							if (lpDisabled) {
								oEl[i].oldValue = oEl[i].checked;
								lpNoEvents = lpNoEvents || !oEl[i].checked;
								oEl[i].checked = false;
							} else {
								lpNoEvents = lpNoEvents || oEl[i].checked == oEl[i].oldValue;
								oEl[i].checked = oEl[i].oldValue;
							}
							if (oEl[i].onclick && !lpNoEvents)
								fireEvent(oEl[i], 'onclick');

						}
						if (i == oEl.length - 1)
							setDisabled(document, 'alt' + oEl[i].name, lpDisabled || !oEl[i].checked, true);
					}
					//if( lpAdvanced )
					//	setDisabledStyle( oEl[ i ], lpDisabled, cpBgColor );
				}
			}
		} else {
			if ((oEl.disabled != lpDisabled || typeof oEl.disabled == 'undefined') && (typeof oEl.disabled != 'undefined' || lpDisabled)) {
				oEl.disabled = lpDisabled;
				if (typeof oEl.tagName != 'undefined') {
					if (oEl.tagName.toUpperCase().list('IMG', 'TD', 'A')) {
						var cClass = oEl.getAttribute('fdClassD');
						if (cClass) {
							try {
								if (lpDisabled) {
									oEl.oldClass = oEl.className;
									var match = oEl.className.match(new RegExp(" ?" + cClass + "([ ]{1,}|$)", "g"));
									if (!match || match.length == 0) oEl.className = oEl.className.append(cClass, ' ');
									oEl.focus = '0';
								} else {
									if (oEl.getAttribute('fdClass'))
										oEl.className = oEl.getAttribute('fdClass');
									else
										oEl.className = oEl.className.replace(new RegExp(" ?" + cClass + "([ ]{1,}|$)", "g"), '$1').trim(); //  oEl.oldClass;
								}
							} catch (e) { alert('setDisabled: ' + e); }
						} else {
							var oDiv = FD.get('__div_' + oEl.id, doc || document);
							if (!oDiv) {
								oDiv = doc.createElement('DIV');
								oDiv.style.cssText = 'background:white;filter:gray() alpha(opacity=10);opacity:.4;-moz-opacity:.4;';
								oDiv.id = '__div_' + oEl.id; oDiv.style.display = 'none'; oDiv.style.position = 'absolute';
								//oDiv.style.backgroundColor = 'red';
								doc.body.insertBefore(oDiv, doc.body.firstChild); //.appendChild( oDiv );
							}
							oDiv.style.top = getY(oEl) + 1; oDiv.style.left = getX(oEl) + 1;
							if (oEl.offsetWidth > 2) {
								oDiv.style.width = oEl.offsetWidth - 2; oDiv.style.height = oEl.offsetHeight - 2;
							}
							oDiv.style.zIndex = 999;
							oDiv.style.display = (lpDisabled ? '' : 'none');
						}
						if (lpDisabled) {
							oEl.oldClick = oEl.onclick; oEl.oldMouseOver = oEl.onmouseover; oEl.oldMouseOut = oEl.onmouseout;
							oEl.onclick = null; oEl.onmouseover = null, oEl.onmouseout = null;
						} else {
							oEl.onclick = oEl.oldClick; oEl.onmouseover = oEl.oldMouseOver; oEl.onmouseout = oEl.oldMouseOut;
							oEl.oldClick = null; oEl.oldMouseOver = null; oEl.oldMouseOut = null;
						}
					} else if (!lpDontEmptyValue) {
						if (oEl.tagName == 'SELECT') {
							if (lpDisabled) {
								lpNoEvents = lpNoEvents || oEl.selectedIndex == -1;
								oEl.oldValue = oEl.selectedIndex;
								oEl.selectedIndex = -1;
							} else if (typeof oEl.oldValue != 'undefined') {
								lpNoEvents = lpNoEvents || oEl.selectedIndex == oEl.oldValue;
								oEl.selectedIndex = oEl.oldValue;
							}
							if (lpNoEvents) fireEvent(oEl, 'onchange');
						} else if ((oEl.tagName == 'INPUT' && oEl.type == 'text') || oEl.tagName == 'TEXTAREA') {
							if (lpDisabled) {
								lpNoEvents = lpNoEvents || oEl.value == '';
								oEl.oldValue = oEl.value;
								oEl.value = '';
							} else if (typeof oEl.oldValue != 'undefined') {
								lpNoEvents = lpNoEvents || oEl.value == oEl.oldValue;
								oEl.value = oEl.oldValue;
							}
							if (!lpNoEvents) fireEvent(oEl, 'onchange');
						} else if (oEl.tagName == 'INPUT' && (oEl.type == 'checkbox' || oEl.type == 'radio')) {
							if (lpDisabled) {
								lpNoEvents = lpNoEvents || !oEl.checked;
								oEl.oldValue = oEl.checked;
								oEl.checked = false;
							} else if (typeof oEl.oldValue != 'undefined') {
								lpNoEvents = lpNoEvents || oEl.checked == oEl.oldValue;
								oEl.checked = oEl.oldValue;
							}
							if (!lpNoEvents) fireEvent(oEl, 'onclick');
						}
					}
				}
				if (lpAdvanced)
					setDisabledStyle(oEl, lpDisabled, cpBgColor);
				if (oEl.tagName && oEl.tagName == 'INPUT' && oEl.type == 'file')
					FD.Upload.set(oEl.id, (lpDisabled ? 1 : 3), true);
//					FD.Utils.doFile(oEl.id, (lpDisabled ? 1 : 3), true);
			}
		}
	}
}
function setDisabledStyle(el, disabled, bgcolor) {
	if (!el.style) return;
	if (typeof el.styleInit == 'undefined' && el.style.cssText != null)
		el.styleInit = el.style.cssText.replace(/visibility:[^;]*;{0,1}/i, "");
	if (!disabled && String.is(el.styleReadonly))
		el.style.cssText = el.styleReadonly;
	else if (!FD.Browser.opera && !disabled && String.is(el.styleInit)) {
		el.style.cssText = el.styleInit;
		if (el.style.display == 'none') el.style.display = '';
	} else {
		if (!FD.Browser.gecko || typeof el.tagName == 'undefined' || el.tagName != 'SELECT') {
			var $el = $(el),
				borderWidth = FD.Element.Dimensions.getBorder($el, 'top'), 
				paddings = FD.Element.Dimensions.getPaddings($el),
				css = {
					border: (disabled ? borderWidth + 'px solid silver' : ''),
					backgroundColor: (disabled ? bgcolor : '')
				},
				ie = FD.Browser.ie;
			
			if (paddings) {
				$.each(paddings, function (key, value) {
					css[key] = (disabled && ie ? value + 1 : value) + 'px';
				});
			}
			String.log(['setDisabledStyle', css]);
			$el.css(css);

			/*if (window.getComputedStyle) {
				var style = window.getComputedStyle(el, null);
				borderWidth = style.getPropertyValue('border-top-width');
				paddingLeft = Number.float(style.getPropertyValue('padding-left'));
				paddingTop = Number.float(style.getPropertyValue('padding-top'));
				paddingBottom = Number.float(style.getPropertyValue('padding-bottom'));
			}
			el.style.border = (disabled ? (borderWidth ? borderWidth : '2px') + ' solid silver' : '')
			el.style.backgroundColor = (disabled ? bgcolor : '');
			if (paddingLeft) el.style.paddingLeft = el.style.paddingRight = (disabled && FD.Browser.ie ? paddingLeft + 1 : paddingLeft) + 'px';
			if (paddingTop) el.style.paddingTop = (disabled && FD.Browser.ie ? paddingTop + 1 : paddingTop) + 'px';
			if (paddingBottom) el.style.paddingBottom = (disabled && FD.Browser.ie ? paddingBottom + 1 : paddingBottom) + 'px';*/
		}
	}
	el.styleDisabled = (disabled ? el.style.cssText : null);
}

function setReadonly(opDoc, vpObject, lpReadonly, lpAdvanced, cpBgColor, lpKeepSize) {
	var oEl = FD.get(vpObject, opDoc);
	if (!Object.is(oEl) && !Array.is(oEl)) return;
	var lArray = typeof oEl[0] != 'undefined';
	if ((Object.is(oEl) || Array.is(oEl)) && (lArray || typeof oEl.readOnly != 'undefined')) {
		if (lArray && (typeof oEl.tagName == 'undefined' || oEl.tagName != 'SELECT')) {
			var i, lRadio, nChk = -1;
			lRadio = typeof oEl[0].type != 'undefined' && oEl[0].type == 'radio';
			if (lRadio) {
				for (i = 0; i < oEl.length; i++) {
					if (oEl[i].checked) {
						nChk = i; break;
					}
				}
			}
			for (i = 0; i < oEl.length; i++) {
				if (oEl[i].readOnly != lpReadonly) {
					if (lpReadonly) {
						oEl[i].oldClick = oEl[i].onclick;
						oEl[i].oldValue = (lRadio ? nChk : oEl[i].checked);
						if (lRadio)
							oEl[i].onclick = function () {
								if (this.oldValue > -1) FD.get(this.name)[this.oldValue].checked = true;
								else this.checked = false;
							}
						else
							oEl[i].onclick = function () { this.checked = this.oldValue; }
					} else {
						oEl[i].onclick = oEl[i].oldClick;
						oEl[i].oldClick = null;
					}
				}
				oEl[i].oldValue = (lRadio ? nChk : oEl[i].checked);
				oEl[i].readOnly = lpReadonly;
				oEl[i].unselectable = (lpReadonly ? 'on' : 'off');
				if (lpAdvanced)
					setReadonlyStyle(oEl, lpReadonly, cpBgColor);
				if (i == oEl.length - 1 && oEl[i].checked)
					setReadonly(opDoc, 'alt' + oEl[i].name, lpReadonly, true);
			}
		} else {
			if (oEl.readOnly != lpReadonly && typeof oEl.tagName != 'undefined') {
				if (oEl.tagName == 'INPUT' && oEl.type == 'checkbox') {
					oEl.oldValue = oEl.checked;
					if (lpReadonly) {
						oEl.oldClick = oEl.onclick;
						oEl.onclick = function () { this.checked = this.oldValue; }
					} else {
						oEl.onclick = oEl.oldClick;
						oEl.oldClick = null;
					}
				} else if (oEl.tagName == 'SELECT') {
					oEl.oldValue = oEl.value;
					if (lpReadonly) {
						oEl.oldChange = oEl.onchange;
						oEl.onchange = function () { this.value = this.oldValue; }
					} else if (oEl.oldChange) {
						oEl.onchange = oEl.oldChange;
						oEl.oldChange = null;
					}
				}
			}
			oEl.readOnly = lpReadonly;
			if (lpAdvanced) {
				if (lpKeepSize) {
					oReadonlyElements[oEl.id] = (lpReadonly ? oEl : null);
					oEl.orgValue = oEl.value;
					oEl.value = '';
				}
				setReadonlyStyle(oEl, lpReadonly, cpBgColor);
				if (lpKeepSize)
					window.setTimeout('resetReadonlyVal( "' + oEl.id + '" )', 0);
			}
		}
	}
}
var oReadonlyElements = { afterload: false };
function resetReadonlyVal(cpId) {
	oReadonlyElements[cpId].value = oReadonlyElements[cpId].orgValue;
	fireEvent(oReadonlyElements[cpId], 'onchange');
	oReadonlyElements[cpId] = null;
}
function setReadonlyStyle(el, readonly, bgcolor) {
	if (!el.style) return;
	if (typeof el.styleInit == 'undefined')
		el.styleInit = el.style.cssText;
	if (!readonly && String.is(el.styleDisabled))
		el.style.cssText = el.styleDisabled;
	else if (!readonly && String.is(el.styleInit))
		el.style.cssText = el.styleInit;
	else if (readonly) {
		var $el = $(el), borders = FD.Element.Dimensions.getBorders($el), paddings = FD.Element.Dimensions.getPaddings($el);

		if (window.getComputedStyle) {
			var style = window.getComputedStyle(el, null),
				borderColor = (typeof bgcolor == 'string' ? bgcolor : $el.css('background-color'));

			if (readonly) el.prevStyleBorder = el.style.border;

			$el.css({
				paddingTop: paddings.top + (readonly ? 1 : -1),
				paddingRight: paddings.right + (readonly ? 1 : -1),
				paddingBottom: paddings.bottom + (readonly ? 1 : -1),
				paddingLeft: paddings.left + (readonly ? 1 : -1)
			});

			/*el.style.paddingLeft = (Number.create(style.getPropertyValue('padding-left')) + (readonly ? 1 : -1)) + 'px';
			el.style.paddingRight = (Number.create(style.getPropertyValue('padding-right')) + (readonly ? 1 : -1)) + 'px';
			el.style.paddingTop = (Number.create(style.getPropertyValue('padding-top')) + (readonly ? 1 : -1)) + 'px';
			el.style.paddingBottom = (Number.create(style.getPropertyValue('padding-bottom')) + (readonly ? 1 : -1)) + 'px';*/
			
		} else {
			if (FD.Browser.gecko) el.style.paddingLeft = (readonly ? '2px' : '');
			el.style.paddingBottom = (readonly ? (FD.Browser.ie ? '3px' : '2px') : '');
			el.style.borderStyle = (readonly ? 'none' : '');
		}

		$el.css({
			borderTop: borders.top + 'px silver dotted',
			borderRight: borders.right + 'px silver dotted',
			borderBottom: borders.bottom + 'px silver dotted',
			borderLeft: borders.left + 'px silver dotted'
		});
		//el.style.border = (readonly ? '1px silver dotted' : '');

		if (typeof bgcolor == 'string') {
			if ($el.data('prev-background-color') == null) {
				$el.data('prev-background-color', $el.css('background-color'));
			}
			$el.css('background-color', bgcolor);
		} else if ($el.data('prev-background-color')) {
			$el.css('background-color', $el.data('prev-background-color')).data('prev-background-color', null);
		}
		//if (typeof bgcolor == 'string') el.style.backgroundColor = (readonly ? bgcolor : '');
	}
	el.styleReadonly = (readonly ? el.style.cssText : null);
}


FD.selected = function () { // el, type, option, doc, ignoreDisabled
	/// <summary>
	///		A versatile function to check if an option is selected/checked or to get a selected or checked option or multiple options as reference(s), index(es), value(s) and so on,
	///		Operates on elements of type: select, input[type=checkbox] and input[type=radio]. 
	/// </summary>
	/// <param name="el">Element object or elements name attribute.</param>
	/// <param name="type" optional="true">
	///		Specifies what to return and/or what to check.
	///		- index: returns the index of the selected option.
	///		- value: returns the value or comma-separated values as string, true/false in combination with the option param.
	///		- text: returns the text or comma-separated texts as string, true/false in combination with the option param.
	///		- checked: returns true or false when the passed option is selected/checked. for a single checkbox the option param is not applicable.
	///		- sum: returns the sum of all selected options.
	/// </param>
	/// <param name="option" optional="true">The index, value or option text to check if selected.</param>
	/// <param name="doc" optional="true" type="Document">HTMLDocument element from which to select the el(ement).</param>
	/// <param name="ignoreDisabled" optional="true" type="Boolean">Specifies to ignore disabled options. So, disabled options will be skipped.</param>
	/// <returns>
	///		- when no type is passed the object reference(s) is/are returned or null
	///		- when type is 'index' the selected/checked index is returned or -1
	///		- when type is 'value' or 'text' a (comma-separated) string is returned
	///		- when an option is passed or type is 'checked' true or false is returned
	///		- when type is 'sum' the sum of the selected options, including the alternate option if applicable, is returned
	/// </returns>
	var args = $A(arguments), el = args.shift(), type = args.shift(), option, doc = null, ignoreDisabled = false, params = 0, optionType;
	while (args.length > 0 && params < 6) {
		params++;
		if (args[0] == null) args.shift();
		else if (Object.is(args[0])) doc = args.shift();
		else if (String.is(args[0])) {
			option = args.shift();
			if (type == 'index') option = option.int();
			else option = option.toLowerCase();
		} else if (Boolean.is(args[0])) ignoreDisabled = args.shift();
	}
	if (typeof el == 'string') el = FD.get(el, doc);
	var selected = [], retval = null, i = -1, index = -1;
	if (!option && (optionType = /([^\[\]]+)\[([^\]]+)\]/.exec(type))) {
		type = optionType[1];
		option = (type == 'index' || (type == 'checked' && /^[\d]+$/.test(optionType[2])) ? optionType[2].int() : optionType[2].urldecode().toLowerCase());
	}
	if (el) {
		if (el.tagName && el.tagName.toLowerCase() == 'select') {
			if ((index = el.selectedIndex) > -1 && (!ignoreDisabled || !el.disabled) && (!(String.is(option) || Number.is(option)) || (type == 'index' ? index == option : (type == 'text' ? el.options[index].text : el.options[index].value).toLowerCase() == option))) {
				selected.push(el.options[index]);
			}
		} else if (typeof el[0] != 'undefined') {
			for (i = 0; i < el.length; i++) {
				if (el[i].checked && (!ignoreDisabled || !el[i].disabled) && (/* no option passed */!(String.is(option) || Number.is(option)) || /* option passed */(type == 'index' || Number.is(option) ? i == option : (type == 'text' ? el[i].text : el[i].value).toLowerCase() == option))) {
					index = i;
					selected.push(el[i]);
				}
			}
		}
		// a single checkbox OR a multiple checkbox-/radiogroup with just one option
		else if (el.checked && (!ignoreDisabled || !el.disabled) && (/* no option passed */!(String.is(option) || Number.is(option)) || /* option passed */(type == 'index' || Number.is(option) ? 0 == option : (type == 'text' ? el.text : el.value).toLowerCase() == option))) {
			selected.push(el); retval = el; i = 0; index = 0; el = [el];
		}
	}
	if (arguments.length >= 2) {
		if (type == 'index') retval = (selected.length > 0 ? index : -1);
		else if (option || type == 'checked') retval = selected.length > 0; // just want to know if the given option is selected/checked
		else if (type == 'value') {
			retval = ''; // checked.join(',');
			for (i = 0; i < selected.length; i++) {
				retval = retval.append(selected[i].value, ',');
			}
		} else if (type == 'text') {
			retval = '';
			for (i = 0; i < selected.length; i++) {
				retval = retval.append(selected[i].text, ',');
			}
		} else if (type == 'sum') {
			retval = 0;
			var alt;
			for (i = 0; i < selected.length; i++) {
				if (i == selected.length - 1 && (alt = FD.get('alt' + selected[i].id))) {
					String.log('alt.value=' + alt.value);
					retval += alt.value.float(true);
				} else {
					retval += selected[i].value.float(true);
				}
			}
		} else {
			retval = (selected.length == 0 ? null : (selected.length == 1 ? selected[0] : selected));
		}
	} else {
		retval = (selected.length == 0 ? null : (selected.length == 1 ? selected[0] : selected));
	}
	return retval;
};
var $selected = FD.selected;

function isSelectedOption() { // [doc, ]el, option, ignoreDisabled
	var args = $A(arguments), doc = (typeof args[0].doctype != 'undefined' ? args.shift() : document), el = FD.get(args[0], doc), option = args[1], ignoreDisabled = args[2] || false, selected = false, i;
	if (el) {
		if (isCollection(el)) {
			if (Number.is(option))
				selected = option.between(0, el.length - 1) && el[option].checked && (!ignoreDisabled || !el[option].disabled);
			else {
				option = option.toLowerCase();
				for (i = 0; i < el.length; i++) {
					if (el[i].value.toLowerCase() == option) {
						selected = el[i].checked && (!ignoreDisabled || !el[i].disabled);
						break;
					}
				}
			}
		} else if (typeof (el.tagName) != 'undefined' && el.tagName.toUpperCase() == 'INPUT' && typeof (el.checked) != 'undefined' && (!ignoreDisabled || !el.disabled)) {
			if (Number.is(option)) selected = (option == 0 && el.checked);
			else selected = (el.value.toLowerCase() == option.toLowerCase() && el.checked);
		}
	}
	return selected;
}

function setSelectedOption() { // [doc, ]el, val
	var args = $A(arguments), doc = (args.length == 3 ? args.shift() : document), el = FD.get(args[0], doc), val = args[1];
	if (el) {
		for (var i = 0; i < el.length; i++) {
			el[i].checked = el[i].value == val;
		}
	}
}

function removeOptions(doc, el) {
	var el = FD.get(el, doc), i = 0;
	for (i = el.options.length - 1; i >= 0; i--) {
		if (Browser.ie || Browser.W3C) el.remove(i);
		else {
			el.options[i].value = '';
			el.options[i].text = '';
		}
	}
}
function removeOption(doc, el, npIndex) {
	var el = FD.get(el, doc);
	if (Browser.ie || Browser.W3C) {
		el.remove(npIndex);
		/* Mozilla workaround
		Remove an option before the selected option.
		The value and selectedIndex do change.
		Firefox probably keeps track of the previous value to see if a change has occured.
		Presumably this tracking value does not change automatically. Below the workaround.
		*/
		var i = el.selectedIndex;
		el.selectedIndex = -1, el.selectedIndex = i;
	} else {
		el.options[i].value = '';
		el.options[i].text = '';
	}
}

function copyOptions(from, to, empty, value) {
	if (empty) to.length = 0;
	for (var i = 0; i < from.options.length; i++) {
		if (from.options[i].value != '##') {
			addOption(null, to, from.options[i].value, from.options[i].text);
		}
	}
	if (arguments.length >= 4) to.value = (Array.is(value) ? String.create(value[0]) : value);
	else to.selectedIndex = 0;
}

function addOptions(from, to, is2D) {
	var cnt = (is2D ? 2 : 1);
	for (var i = 0; i < from.length; i += cnt)
		addOption(null, to, unescape(from[i]), unescape(from[i + (cnt - 1)]));
}

function addOption(doc, el, value, text) {
	doc = doc || document;
	var el = FD.get(el, doc), option = null
	option = doc.createElement('OPTION');
	option.value = value;
	option.text = text;
	if (FD.Browser.ie)
		el.add(option);
	else
		el.add(option, null);
	return option;
}

function searchOption(doc, el, value, text) {
	var el = FD.get(el, doc);
	var lValue = typeof value != 'boolean', lText = typeof text != 'undefined';
	var lFoundV = false, lFoundT = false;
	if (el.options) {
		for (var i = 0; i < el.options.length; i++) {
			lFoundV = (lValue && el.options[i].value == value);
			lFoundT = (lText && el.options[i].text == text);
			if ((lValue && lFoundV && !lText) || (lText && lFoundT && !lValue) || (lValue && lText && lFoundV && lFoundT))
				return i;
		}
	} else {
		var len = el.length;
		for (var i = 0; i < (len ? el.length : 1); i++) {
			if ((len ? el[i] : el).value.toLowerCase() == value.toLowerCase())
				return i;
		}
	}
	return -1;
}

function sortOptions(doc, el) {
	var el = FD.get(el, doc), value = el.value;
	var len = el.options.length, i, index = 0;
	var sort = [], values = [];
	for (i = 0; i < len; i++) {
		sort[i] = el.options[i].text.toLowerCase();
		values[index] = el.options[i].text;
		values[index + 1] = el.options[i].value;
		index = index + 2;
	}
	sort.sort();
	index = 0;
	for (i = 0; i < len; i++) {
		for (j = 0; j < len * 2; j = j + 2) {
			if (values[j] != null && values[j].toLowerCase() == sort[i]) {
				el.options[index].text = values[j];
				el.options[index].value = values[j + 1];
				values[j] = null;
				break;
			}
		}
		index++;
	}
	sort = null; values = null;
	el.value = value;
}

function setVisibility(doc, el, visible) {
	var el = FD.get(el, doc);
	if (Object.is(el) && typeof el.style != 'undefined') {
		el.style.visibility = (visible ? 'visible' : 'hidden');
	}
}

function setDisplay(doc, el, display) {
	var el = FD.get(el, doc);
	if (Object.is(el) && typeof el.style != 'undefined') {
		el.style.display = (String.is(display) ? display : (display ? '' : 'none'));
	}
	return (el);
}

function setOpacity(doc, el, opacity) {
	opacity = (opacity == 100) ? 99.999 : opacity;
	var el = FD.get(el, doc);
	if (!el || typeof el.style == 'undefined') return;
	if (typeof el.style.opacity != 'undefined') // Safari 1.2, newer Firefox and Mozilla, CSS3
		el.style.opacity = opacity / 100;
	else if (typeof el.style.filter != 'undefined') // IE/Win
		el.style.filter = (opacity == 99.999 ? "" : "alpha(opacity:" + opacity + ")");
	else if (typeof el.style.MozOpacity != 'undefined')// Older Mozilla and Firefox
		el.style.MozOpacity = opacity / 100;
	else if (typeof el.style.KHTMLOpacity != 'undefined') // Safari&lt;1.2, Konqueror
		el.style.KHTMLOpacity = opacity / 100;
}
function getOpacity(doc, el) {
	var el = FD.get(el, doc), opacity = 100;
	if (typeof el.style == 'undefined') return (opacity);
	if (el.style.opacity)
		opacity = el.style.opacity * 100;
	else if (el.style.filter) {
		var filter = el.style.filter, pos = filter.search(/opacity:/);
		if (pos > -1) {
			filter = filter.substr(pos + 8);
			opacity = Number.float(filter.substr(0, filter.search(/\)/)));
		}
	} else if (el.style.MozOpacity)
		opacity = el.style.MozOpacity * 100;
	else if (el.style.KHTMLOpacity)
		opacity = el.style.KHTMLOpacity * 100;
	if (opacity.between(99, 100)) opacity = 100;

	//String.log('getOpacity, value=' + opacity, 'info');

	return opacity;
}


function maxLength(e, npMax, lpChk) {
	try {
		var el = null;
		if (lpChk) el = e;
		else el = checkEvent(e);
		if (!Object.is(el)) return;
		if (el.value.length >= npMax && (lpChk || !e.keyCode.list(8, 9, 16, 17, 18, 35, 36, 37, 38, 39, 40, 46))) {
			if (!lpChk) {
				if (Browser.ie) e.returnValue = false;
				else if (typeof e.preventDefault != 'undefined') e.preventDefault();
				else el.value = el.value.substr(0, npMax - 1);
			} else if (el.value.length > npMax) {
				el.value = el.value.substr(0, npMax - 1).rtrim();
				fireEvent(el, 'onkeyup');
			}
		}
	} catch (e) {
		alert('maxlength: ' + e);
	}
}

function onPaste(npCurr, npMax) {
	var cClip, nClipLength, nAvailLength, lReturn;

	lReturn = true;
	cClip = window.clipboardData.getData("Text");
	nClipLength = cClip.length;
	nAvailLength = npMax - npCurr;

	if (nAvailLength > 0) {
		if (nAvailLength > nClipLength) {
			cClip = cClip.substr(0, nAvailLength);
			window.clipboardData.setData("Text", cClip);
		}
	} else
		lReturn = false;

	return lReturn;
}


//var aCharCodes = new Array(32, 33, 35, 36, 37, 38, 40, 41, 43, 45, 46, 64, 94, 95, 255);
//32 = ' '
function FillArray(apCharCodes, npStart, npEnd) {
	var aRestCodes = new Array(npEnd - npStart + 1), i = 0, j = 0;
	for (i = npStart; i <= npEnd; i++) { aRestCodes[j] = i; j++; }
	return (apCharCodes = apCharCodes.concat(aRestCodes));
}

var FDChar = new Class({

	Extends: FDBaseClass,
	_class: 'FDChar',

	validRanges: null,

	initialize: function (options) {
		this.parent(options);

		if (String.is(this.validRanges)) this.validRanges = this.validRanges.split(',').walk(function (value, index) { this[index] = value.int(); });
		if (!Array.is(this.validRanges)) this.validRanges = FDChar.validRanges.clone();
	},
	validate: function (str, options, chars) {
		var found = false, i, j, k = '', char, charc;
		str = str.toLowerCase();
		options = options || 0;

		if (String.is(chars)) {
			chars = chars.split(',').walk(function (value, index) { this[index] = value.int(); });
		}
		if (!Array.is(chars)) {
			chars = this.validRanges;
		}
		for (i = 0; i < str.length; i++) {
			char = str.charAt(i);
			charc = str.charCodeAt(i);
			if (i == 0 && ((options & FDChar.VALIDATE_FIRSTCHAR_EMPTY && char == ' ') || (options & FDChar.VALIDATE_FIRSTCHAR_NAN && !isNaN(char)))) return 0;
			if (!chars.seek(charc)) return i;
		}
		return -1;
	}

}).extend({
	validRanges: [32, 33, 35, 36, 37, 38, 40, 41, 43, 45, 46, 64, 94, 95, 254]
			.concat(Number.range(48, 57))
			.concat(Number.range(97, 122))
			.concat(Number.range(224, 229))
			.concat(Number.range(231, 246))
			.concat(Number.range(248, 253)),
	VALIDATE_FIRSTCHAR_EMPTY: 1,
	VALIDATE_FIRSTCHAR_NAN: 2,

	validate: function () {
		return this.instance.validate.apply(this.instance, arguments);
	},
	dump: function () {
		var dump = '';
		$(FDChar.validRanges).each(function () {
			dump += this + '=' + String.fromCharCode(this) + '<br>';
		});
		return '<pre>' + dump + '</pre>';
	},

	KEYCODE_ENTER: 13,
	KEYCODE_TAB: 32,
	KEYCODE_UP: 38,
	KEYCODE_DOWN: 40

});
FDChar.instance = new FDChar();

FDVisibilityChange = new Class({

	Extends: FDBaseClass,
	Implements: Events,
	_class: 'FDVisibilityChange',

	_trace: false,
	_initialized: false,

	browserPrefixes: ['moz', 'ms', 'o', 'webkit'],
	hiddenPropertyName: '',
	visibilityEventName: '',

	isVisible: true,
	isEnabled: true,

	initialize: function () {

		this.name = (FD.isBackend() ? 'Backend' : 'Frontend');

		this.parent();

		var prefix = this.getBrowserPrefix();
		this.hiddenPropertyName = (prefix ? prefix + 'Hidden' : 'hidden');
		this.visibilityEventName = (prefix ? prefix : '') + 'visibilitychange';
	},

	// get current browser vendor prefix
	getBrowserPrefix: function () {
		for (var i = 0; i < this.browserPrefixes.length; i++) {
			if ((this.browserPrefixes[i] + 'Hidden') in document) {
				// return vendor prefix
				return this.browserPrefixes[i];
			}
		}

		// no vendor prefix needed
		return null;
	},

	addEvent: function(type, fn, internal) {
		
		type = String.removeOn(type);
		this.$events[type] = (this.$events[type] || []).include(fn);
		if (internal) fn.internal = true;

		if (!this._initialized) this._setEvents();

		return this;
	},

	onVisible: function () {
		if (this.isVisible) {
			return;
		}

		this.log('.onVisible');

		this.isVisible = true;
		this.fireEvent('onChange', 'visible');
		this.fireEvent('onVisible');
	},

	onHidden: function () {
		if (!this.isVisible){
			return;
		}

		this.log('.onHidden');

		this.isVisible = false;
		this.fireEvent('onChange', 'hidden');
		this.fireEvent('onHidden');
	},

	_setEvents: function () {
		
		this._initialized = true;

		var focus = (function () { this.handleVisibilityChange(true); }).bind(this),
			blur = (function (evt) { this.handleVisibilityChange(false); }).bind(this);

		String.log(this.visibilityEventName + ', ' + (this.visibilityEventName in document) + ', propertyName=' + this.hiddenPropertyName + '/' + (this.hiddenPropertyName in document));

		if (this.hiddenPropertyName in document) {
			document.addEventListener(this.visibilityEventName, this.handleVisibilityChange.bind(this), false);
		} else if ("onfocusin" in document) { // IE 9 and lower:
			document.onfocusin = focus;
			document.onfocusout = blur;
		} else { // All others:
			window.onpageshow = focus;
			window.onpagehide = blur;
		}

		// extra event listeners for better behaviour
		document.addEventListener('focus', focus, false);
		document.addEventListener('blur', blur, false);

		window.addEventListener('focus', focus, false);
		window.addEventListener('blur', blur, false);

		var errorHandler = FD.Error;

		$('iframe').each(function () {
			var frame = $(this);
			frame.load(function () { 

				try {
					this.contentWindow.document.addEventListener('focus', focus, false);
					this.contentWindow.document.addEventListener('blur', blur, false);

					this.contentWindow.addEventListener('focus', focus, false);
					this.contentWindow.addEventListener('blur', blur, false);
				} catch (e) {
					// Probably a cross origin exception. There can be iframes used on forms. Even added by extensions or possible mallware.
					try {
						// message, url, line, source, custom1, custom2, ....
						errorHandler.Send((e.message || e), '', 8766, 'FDVisibilityChange._setEvents.iframe.load', 'iframe source=' + frame.prop('src'));
						//frame.remove();
					} catch (e) {}
				}

			});
		});

	},

	handleVisibilityChange: function (forcedFlag) {

		this.log('.handleVisibilityChange, isEnabled=' + this.isEnabled + ', forcedFlag=' + forcedFlag);

		if (!this.isEnabled) return;

		if (typeof forcedFlag === "boolean") {
			if (forcedFlag) {
				return this.onVisible();
			}

			return this.onHidden();
		}

		if (document[this.hiddenPropertyName]) {
			return this.onHidden();
		}

		return this.onVisible();
	},

	toggle: function (enable) {
		this.isEnabled = enable;
	}

}).extend({

	instance: null,
	addEvent: function (fn) {

		if (this.instance == null) this.instance = new FDVisibilityChange();
		this.instance.addEvent('onChange', fn);

	},
	toggle: function (enable) {
		if (this.instance) {
			this.instance.toggle(enable);
		}
	},
	isEnabled: function () {
		return (this.instance ? this.instance.isEnabled : true);
	}

});

var aCharCodes = FDChar.validRanges;
Function.depricated('CheckChars', function (cpString, npOptions, apCharCodes) {
	var cString = cpString.toLowerCase(), lFound = false, i, j, k = '', nCharCode;
	if (typeof apCharCodes == 'string') {
		apCharCodes = apCharCodes.split(',');
		for (i = 0; i < apCharCodes.length; i++) {
			apCharCodes[i] = parseInt(apCharCodes[i]);
		}
	}
	if (typeof apCharCodes == 'undefined' || !Array.is(apCharCodes)) apCharCodes = aCharCodes;
	for (i = 0; i < cString.length; i++) {

		if (i == 0 && ((npOptions & 1 && cString.charAt(0) == ' ') || (npOptions & 2 && !isNaN(cString.charAt(0)))))
			return 0;

		nCharCode = cString.charCodeAt(i); lFound = false;
		for (j = 0; j < apCharCodes.length; j++) {
			if (apCharCodes[j] == nCharCode) { lFound = true; break; }
		}
		if (!lFound) { return i; }
	}
	return -1;
}, 'FDChar.validate');

Function.depricated('isValidDate', function (vpDates, cpFormat, npRange) {
	//FD.Debug.deprecated(isValidDate, 'deprecated! use FD.Date.Validate instead');
	FD.Debug.trace('isValidDate', vpDates + ', ' + cpFormat + ', ' + npRange);
	return FD.Date.Validate(vpDates, cpFormat, npRange);
}, 'FDDate.validate');

var FDDate = new Class({

	Extends: FDBaseClass,
	_class: 'FDDate',

	_input: '',

	date: null,
	format: [],
	separator: '',

	hasTime: false,
	hasSeconds: false,

	day: 0,
	month: 0,
	year: 0,
	hours: 0,
	minutes: 0,
	seconds: 0,
	julian: 0,

	error: false,

	initialize: function (date, options) {
		this.parent();
		if (arguments.length > 0) {
			this.parse.apply(this, arguments);
		}
	},

	$family: function (type) {
		if (type && type == Object.PSEUDOTYPE) {
			if (this.hasTime) {
				return 'datetime';
			} else {
				return 'date';
			}
		}
		return this.parent();
	},

	parse: function (date, options) {

		this.log('.parse, date=' + date, 'group');

		if (!Object.is(options)) {
			options = { };
		}

		this._input = date;

		var is_date = Date.is(date), format, strict = options.strict || false, rg = '', i, len;

		if (!options.format) format = FD.Texts.get('DATE_FORMAT');
		else format = options.format;

		if (!FDDateFormat.is(format)) {
			format = new FDDateFormat(format);
		}
		this.format = format;
		this.separator = format.separator;
		this.hasTime = ((is_date ? format.hasTime() : date.search(' ') > 0) && (typeof options.includeTime == 'undefined' || options.includeTime));

		//this.log('.parse, format=' + this.format + ', separator=' + this.separator + ', hasTime=' + this.hasTime + ', is_date=' + is_date);

		if (!is_date) {
			var sep = FDDate.getSeparator(date);
			if (sep != '' && sep != this.separator) {
				date = date.replace(new RegExp((sep == '.' ? '\\.' : sep), 'g'), this.separator);
			}

			for (i = 0; i < format.length; i++) {
				rg += (format[i] == format.year ? '(\\d{2,4})' : '(\\d{1,2})') + (i < 2 ? this.separator + (!strict ? '?' : '') : '');
			}
			var match = new RegExp(rg + ' ?(\\d{1,2})?:?(\\d{2})?:?(\\d{2})?').exec(date), fchar;

			//this.log(['.parse, match', match]);

			if (!(this.error = match == null)) {
				for (i = 0, len = Math.min(this.format.length, 3); i < len; i++) { // only walk the date format
					fchar = this.format[i].left(1);
					if (format[i] == format.day) {
						this.day = Number.float(match[i + 1]);
					} else if (format[i] == format.month) {
						this.month = Number.float(match[i + 1]);
					} else {
						this.year = Number.float((match[i + 1].length == 2 && !strict ? FDDate.getCentury(match[i + 1]) : '') + match[i + 1]);
					}
					if (!strict && this.month > 12 && this.day <= 12) { // day and month are switched
						var tmp = this.day;
						this.day = this.month;
						this.month = tmp;
					}
					this.error = this.day <= 0 || this.month <= 0 || this.year <= 0 || String(this.year).length < 4;
				}
				if (this.hasTime) {
					this.hours = Number.float(match[4]);
					this.minutes = Number.float(match[5]);
					this.hasSeconds = typeof match[6] != 'undefined' && match[6] != '';
					this.seconds = Number.float(match[6]);

					if (!format.hasTime()) {
						format.addTimeFormat('hh:mm' + (this.hasSeconds ? ':ss' : ''));
					}
				}
			}
			if (!this.error) {
				this.date = this.getDate();
				this.error = this.date == null;
			}
		} else {
			this.date = this.Date = date;
		}

		if (is_date || (!this.error && !strict)) {
			this.day = this.date.getDate();
			this.month = this.date.getMonth() + 1;
			this.year = this.date.getFullYear();
			this.hours = this.date.getHours();
			this.minutes = this.date.getMinutes();
			this.seconds = this.date.getSeconds();
		}
		if (this.date) {
			this.julian = FDDate.toJulian(this.date);
		}

		this.log('.parse, ' + Object.inspect(this, ['date', 'day', 'month', 'year', 'hours', 'minutes', 'seconds', 'separator', 'format', 'hasTime', 'hasSeconds']));

		this.log('', 'groupEnd');

		this._deprications();

	},

	getDate: function () {
		if (this.hasTime) {
			return new Date(this.year, this.month - 1, this.day, this.hours, this.minutes, this.seconds);
		} else {
			return new Date(this.year, this.month - 1, this.day);
		}
	},

	_deprications: function () {
		this.Date = this.date;
		this.Day = this.day;
		this.Month = this.month;
		this.Year = this.year;
		this.Hours = this.hours;
		this.Minutes = this.minutes;
		this.Seconds = this.seconds;
		this.Julian = this.julian;
		this.Error = this.error;
		this.Separator = this.separator;
	},

	toString: function () {
		var str = '';
		if (this.error) return str;
		return this.format.formatDate(this.getDate());
	}

}).extend({
	is: function (d) { return d != null && d instanceof this; },
	parse: function (date, format, strict) {
		if (typeof format != 'object' || !format.format) {
			return new FDDate(date, { format: format || '', strict: strict || false });
		} else {
			return new FDDate(date, format);
		}
	},
	Parse: function () { return this.parse.apply(this, arguments); },
	parseFormat: function (format) {
		if (!format) format = FD.Texts.get('DATE_FORMAT');

		return new FDDateFormat(format);

		format = format.split(' ');
		var sep = this.getSeparator(format[0]), fchar;
		retval = format[0].split(sep);
		retval.separator = sep;
		retval.month = 'm';
		for (var i = 0; i < retval.length; i++) {
			fchar = retval[i].left(1);
			if (/[d|t|g]/.test(fchar) || (fchar == 'j' && /[a]/.test(format[0]))) {
				retval.day = fchar;
				retval.dayIndex = i;
			} else if (fchar != 'm') {
				retval.year = fchar;
				retval.yearIndex = i;
			} else {
				retval.monthIndex = i;
			}
			retval[fchar + 'Index'] = i;
		}
		if ((retval.hasTime = format.length > 1)) {
			var time = retval.time = format[1].split(':');
			retval.time.separator = ':';
			retval.time.hours = time[0].left(1);
			retval.time.minutes = (time[1] || '').left(1);
			retval.time.seconds = (time[2] || '').left(1);
		}

		return retval;
	},
	ParseFormat: function () { return this.parseFormat.apply(this, arguments); },
	getSeparator: function (format) {
		var sep = '-/.';
		for (var i = 0; i < format.length; i++) {
			if (sep.search(format.charAt(i)) > -1)
				return format.charAt(i);
		}
		return '';
	},
	toJulian: function () {

		var y, m, d, h, mn, s;

		if (arguments.length == 0 || arguments[0] == null) return 0;
		if (typeof arguments[0] == 'object' && !Date.is(arguments[0])) arguments = arguments[0]; // called from deprecated function
		if (Date.is(arguments[0])) {
			y = arguments[0].getFullYear();
			m = arguments[0].getMonth() + 1;
			d = arguments[0].getDate() + 1;
			h = arguments[0].getHours();
			mn = arguments[0].getMinutes();
			s = arguments[0].getSeconds();
		} else {
			y = arguments[0];
			m = arguments[1];
			d = arguments[2];
			h = arguments[3];
			mn = arguments[4];
			s = arguments[5];
		}

		var jy, ja, jm, era; 		//scratch

		if (y < 0) {
			era = "BCE";
			y = -y;
		}

		if (y == 0) {
			return 0;
		}
		if (y == 1582 && m == 10 && d > 4 && d < 15) {
			// "The dates 5 through 14 October, 1582, do not exist in the Gregorian system!";
			return 0;
		}

		//	if( y < 0 )  ++y;
		if (era == "BCE") y = -y + 1;
		if (m > 2) {
			jy = y;
			jm = m + 1;
		} else {
			jy = y - 1;
			jm = m + 13;
		}

		var intgr = Math.floor(Math.floor(365.25 * jy) + Math.floor(30.6001 * jm) + d + 1720995);

		//check for switch to Gregorian calendar
		var gregcal = 15 + 31 * (10 + 12 * 1582);
		if (d + 31 * (m + 12 * y) >= gregcal) {
			ja = Math.floor(0.01 * jy);
			intgr += 2 - ja + Math.floor(0.25 * ja);
		}

		//correct for half-day offset
		var dayfrac = h / 24.0 - 0.5;
		if (dayfrac < 0.0) {
			dayfrac += 1.0;
			--intgr;
		}

		//now set the fraction of a day
		var frac = dayfrac + (mn + s / 60.0) / 60.0 / 24.0;

		//round to nearest second
		var jd0 = (intgr + frac) * 100000;
		var jd = Math.floor(jd0);
		if (jd0 - jd > 0.5) ++jd;

		return jd / 100000;
	},
	fromJulian: function (jd) {

		var j1, j2, j3, j4, j5; 		//scratch

		//
		// get the date from the Julian day number
		//
		var intgr = Math.floor(jd);
		var frac = jd - intgr;
		var gregjd = 2299161;
		if (intgr >= gregjd) {				//Gregorian calendar correction
			var tmp = Math.floor(((intgr - 1867216) - 0.25) / 36524.25);
			j1 = intgr + 1 + tmp - Math.floor(0.25 * tmp);
		} else
			j1 = intgr;

		//correction for half day offset
		var dayfrac = frac + 0.5;
		if (dayfrac >= 1.0) {
			dayfrac -= 1.0;
			++j1;
		}

		j2 = j1 + 1524;
		j3 = Math.floor(6680.0 + ((j2 - 2439870) - 122.1) / 365.25);
		j4 = Math.floor(j3 * 365.25);
		j5 = Math.floor((j2 - j4) / 30.6001);

		var d = Math.floor(j2 - j4 - Math.floor(j5 * 30.6001));
		var m = Math.floor(j5 - 1);
		if (m > 12) m -= 12;
		var y = Math.floor(j3 - 4715);
		if (m > 2) --y;
		if (y <= 0) --y;

		//
		// get time of day from day fraction
		//
		var hr = Math.floor(dayfrac * 24.0);
		var mn = Math.floor((dayfrac * 24.0 - hr) * 60.0);
		f = ((dayfrac * 24.0 - hr) * 60.0 - mn) * 60.0;
		var sc = Math.floor(f);
		f -= sc;
		if (f > 0.5) ++sc;

		if (y < 0) { // BCE
			y = -y;
		}

		return (new Date(y, m - 1, d - 1, hr, mn, sc));

	},

	_y2k: function (number) { return (number < 1000) ? number + 1900 : number; },
	_when: function () {
		var when;
		if (Date.is(arguments[0])) {
			when = arguments[0];
		} else if (arguments.length > 2 && Number.is(arguments[1]) && Number.is(arguments[2])) {
			when = new Date(arguments[0], arguments[1], arguments[2]);
		} else if (Number.is(arguments[0])) { // julian date
			when = (arguments[0] > 0 ? this.fromJulian(arguments[0]) : null);
		} else if (String.is(arguments[0])) {
			when = this.parse(arguments[0], (arguments[1] || ''), true);
			if (when.date) when = when.date;
			else when = null;
		} else {
			when = new Date();
		}
		return when;
	},

	getYear: function () {
		var when = this._when.apply(this, arguments);
		return (when ? when.getFullYear() : 0);
	},
	getMonth: function () {
		var when = this._when.apply(this, arguments);
		return (when ? when.getMonth() + 1 : 0); // getMonth is zero bases, so count one up
	},
	getDay: function () {
		var when = this._when.apply(this, arguments);
		return (when ? when.getDate() : 0); // getDay gives the dow, we have to use the getDate
	},
	getLastDayOfMonth: function (date) {
		if (!Date.is(date)) date = new Date();
		date.setMonth(date.getMonth() + 1);
		date.setDate(1);
		date.setDate(date.getDate() - 1);
		return date.getDate();
	},
	getWeek: function () { // year, month, day, firstDay, iso
		var when = this._when.apply(this, arguments);
		var args = $A(arguments),
			last = args.length - 1, iso = Boolean.is(args[last]) && args.pop() && --last > -1,
			firstDay = (last >= 0 && Number.is(args[last]) && args[last].between(0, 6) ? args.pop() : null);

		String.log('FDData.getWeek, firstDay=' + firstDay + ', iso=' + iso);

		return (when ? when.getWeek((firstDay ? firstDay : (iso ? 1 : (arguments.length == 0 ? 1 : null)))) : 0);
	},

	goDay: function () {
		var date, days;
		if (arguments.length == 3) { // date, format, days
			date = this.parse(arguments[0], arguments[1]).date;
			days = arguments[2];
		} else { // date, days
			date = (this.is(arguments[0]) ? arguments[0].date : arguments[0]);
			days = arguments[1];
		}
		if (!Date.is(date)) date = new Date();
		date.setDate(date.getDate() + days);
		return date;
	},
	goMonth: function () {
		var date, months;
		if (arguments.length == 3) { // date, format, months
			date = this.parse(arguments[0], arguments[1]).date;
			months = arguments[2];
		} else { // date, months
			date = (this.is(arguments[0]) ? arguments[0].date : arguments[0]);
			months = arguments[1];
		}
		if (!Date.is(date)) date = new Date();
		var prev_month = date.getMonth();
		date.setMonth(prev_month + months);
		// for instance: 31-01-2009 + 1 month = 03-03-2009
		if (date.getMonth() > Number.bounds(prev_month + months, 1, 12)) {
			// set the date back to the last day of the previous month
			date.setDate(0);
		}
		return date;
	},
	goWeek: function () {
		var date, weeks;
		if (arguments.length == 3) { // date, format, week
			date = this.parse(arguments[0], arguments[1]).date;
			weeks = arguments[2];
		} else { // date, weeks
			date = (this.is(arguments[0]) ? arguments[0].date : arguments[0]);
			weeks = arguments[1];
		}
		if (!Date.is(date)) date = new Date();
		date.setDate(date.getDate() + (7 * (weeks || 1)));
		return date;
	},

	isInMonth: function (date, month) {
		if (this.is(date)) date = date.date;
		if (!Date.is(date)) return false;
		if (Number.is(month)) month = new Date(date.getFullYear(), month - 1 /*zero based*/, 1);
		else if (!Date.is(month)) month = new Date();
		month.setDate(1); // set the date to the first day of the month
		var lastday = new Date(month.getFullYear(), month.getMonth() + 1, 1); // first day of the next month
		lastday.setDate(0); // skip back to the last day of the month
		return Date.between(date, month, lastday);
	},
	isInYear: function (date, year) {
		if (this.is(date)) date = date.date;
		if (!Date.is(date)) return false;
		if (Date.is(year)) year = year.getFullYear();
		else if (!Number.is(year)) year = (new Date()).getFullYear();
		return date.getFullYear() == year;
	},
	isInWeek: function (date, week) {
		if (this.is(date)) date = date.date;
		if (!date) return false;
		if (Number.is(week)) week = this.fromWeek(week, 0 /*days are zero based*/);
		else if (!Date.is(week)) week = new Date();
		return Date.between(date, this.getFirstDayOfWeek(week), this.getLastDayOfWeek(week));
	},

	toWeek: function (date) { // [, firstDay][, iso]
		date = date || new Date();
		return this.getWeek.apply(this, arguments); // firstDay and iso are not used (yet)
	},
	fromWeek: function (week, dow /* zero based */, year) {
		dow = dow || 0;
		year = year || (new Date()).getFullYear();
		var DOb = new Date(year, 0, 4);
		var D = DOb.getDay(); if (D == 0) D = 7;
		var Off = -(D - dow);
		DOb.setDate(DOb.getDate() + Off + 7 * (week - 1))
		return DOb;
	},
	getFirstDayOfWeek: function (date, firstday /* one based, not zero! */) {
		date = date || new Date();
		if (!Number.is(firstday)) firstday = 1; //1=sunday
		date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		date.setDate(date.getDate() - ((date.getDay() + firstday) - 2));
		return date;
	},
	getLastDayOfWeek: function (date, firstday /* one based, not zero! */) {
		date = date || new Date();
		if (!Number.is(firstday)) firstday = 1; //1=sunday
		date = new Date(date.getFullYear(), date.getMonth(), date.getDate())
		date.setDate(date.getDate() + (7 - (date.getDay() + firstday) + 2));
		return date;
	},

	_regexpTime: / ([hHmMsS]{1,2})?:?([hHmMsS]{1,2})?:?([hHmMsS]{1,2})?/,
	Format: function () { return this.format.apply(this, arguments); },
	format: function (date, options) {
		if (!Date.is(date)) return '';

		//String.log('FDDate.format', 'group');

		options = (Object.is(options) || FDOptions.is(options) ? options : { format: options || '' });
		if (!options.format) options.format = FD.Texts.get('DATE_FORMAT');

		var format = options.format;
		if (!FDDateFormat.is(format)) {
			format = new FDDateFormat(format);
		}
		
		if (options.time && !format.hasTime()) format.addTimeFormat('hh:mm' + (options.seconds ? ':ss' : ''));
		
		var cdate = format.format(date);

		//String.log('', 'groupEnd');

		return cdate;
	},

	isWeekDay: function () {
		if (arguments.length <= 1 || arguments[0] == '') return true;
		var parsed = this.parse(arguments[0]);
		if (parsed.error || !parsed.date) return false;
		var day = parsed.date.getDay();
		for (var i = 1; i < arguments.length; i++) {
			if (day == arguments[i]) return true;
		}
		return false;
	},
	timeBetween: function (date1, date2) {
		if (!this.is(date1)) parsed1 = this.parse(date1);
		if (!this.is(date2)) parsed2 = this.parse(date2);
		if (parsed1.error || parsed2.error) return null;
		var diff = Math.abs(parsed1.date - parsed2.date);
		
		//String.log('.timeBetween, date1=' + date1 + '/' + parsed1.date + ', date2=' + date2 + '/' + parsed2.date + ', diff=' + diff);
		
		return FDTime.parse(diff, { includeSeconds: true });
	},

	_rollover: 35,
	getCentury: function (year) {
		year = Number.float(year);
		var date = new Date(), rollover = parseInt(String(date.getFullYear() + this._rollover).substr(2, 2));
		var current = parseInt(String(date.getFullYear()).substr(0, 2));
		if (year >= rollover) return (current - 1);
		return current;
	},

	Validate: function () { return this.validate.apply(this, arguments); },
	validate: function (dates, format, range) {
		// dates can be: FDDate, Date, String (one or two dates comma separated), Array (one or two dates)
		var date_stripped, date, date_compare, arr = [], has_time = true;
		if (this.is(dates)) {
			date_stripped = dates;
		} else if (Date.is(dates)) {
			date = dates;
		} else if (String.is(dates)) {
			if (dates.length == 0) return 0;
			arr = dates.split(',');
		} else if (Array.is(dates)) {
			arr = dates;
		}

		if (arr.length > 0) {
			if (String.is(arr[0])) date_stripped = this.parse(arr[0], format, true /*strict parsing*/);
			else if (this.is(arr[0])) date_stripped = arr[0];
			else if (Date.is(arr[0])) {
				date = arr[0];
				has_time = date.getHours() > 0 || date.getMinutes() > 0 || date.getSeconds() > 0;
			}
		}

		if (date_stripped) {
			if (date_stripped.error) return -1
			date = date_stripped.date;
			has_time = date_stripped.hasTime;
		}

		if (!date) return this.INVALID_DATE;

		date_stripped = null;
		if (arr.length > 1) {
			if (arr[1] == null) return this.VALID; // nothing to compare with
			if (String.is(arr[1])) date_stripped = this.parse(arr[1], format, true);
			else if (this.is(arr[1])) date_stripped = arr[1];
			else if (Date.is(arr[1])) {
				date_compare = arr[1];
				if (!has_time) date_compare = new Date(date_compare.getFullYear(), date_compare.getMonth(), date_compare.getDate()); // make sure we compare without time
			}
			if (date_stripped) {
				if (date_stripped.error) return this.INVALID_DATE
				date_compare = date_stripped.date;
			}
		} else {
			date_compare = new Date();
			if (!has_time) date_compare = new Date(date_compare.getFullYear(), date_compare.getMonth(), date_compare.getDate());
		}

		if (range == this.VALIDATE_PAST_PRESENT && date > date_compare) return this.INVALID_GREATER;
		if (range == this.VALIDATE_FUTURE_PRESENT && date < date_compare) return this.INVALID_SMALLER;
		if (range == this.VALIDATE_PAST && date >= date_compare) return this.INVALID_GREATEREQUAL;
		if (range == this.VALIDATE_FUTURE && date <= date_compare) return this.INVALID_SMALLEREQUAL;
		if (range == this.VALIDATE_PRESENT && date <= date_compare && date >= date_compare) return this.INVALID_NOTEQUAL;

		return this.VALID;
	},
	VALID: 0, INVALID_DATE: -1,
	INVALID_GREATER: -2, INVALID_SMALLER: -3, INVALID_GREATEREQUAL: -4, INVALID_SMALLEREQUAL: -5, INVALID_NOTEQUAL: -6,
	INVALID_FUTURE: -2, INVALID_PAST: -3, INVALID_FUTURE_PRESENT: -4, INVALID_PAST_PRESENT: -5, INVALID_NOTPRESENT: -6,
	NOT_PAST_PRESENT: -2, NOT_FUTURE_PRESENT: -3, NOT_PAST: -4, NOT_FUTURE: -5, NOT_PRESENT: -6,
	VALIDATE_SMALLEREQUAL: 1, VALIDATE_GREATEREQUAL: 2, VALIDATE_SMALLER: 3, VALIDATE_GREATER: 4, VALIDATE_EQUAL: 5,
	VALIDATE_PAST_PRESENT: 1, VALIDATE_FUTURE_PRESENT: 2, VALIDATE_PAST: 3, VALIDATE_FUTURE: 4, VALIDATE_PRESENT: 5,
	mapping: {
		validate: {
			pastpresent: 1,
			futurepresent: 2,
			past: 3,
			future: 4,
			present: 5
		}
	}
});

FD.Date = FDDate.instance = FDDate;

var FDDateFormat = new Class({

	Extends: FDArray,
	_class: 'FDDateFormat',

	format: '',
	separator: '',

	day: '',
	month: '',
	year: '',

	dayIndex: -1,
	monthIndex: -1,
	yearIndex: -1,

	timeFormat: null,

	initialize: function (format) {
		
		if (format && FDDateFormat.is(format)) {

			for (var i = 0, len = format.length; i < len; i++) {
				this.push(format[i]);
			}
			Object.extend(this, format);

		} else {
			this.parse(format);
		}


	},

	parse: function (format) {

		if (!format || format == 'date') format = FD.Texts.get('DATE_FORMAT');
		else if (format == 'datetime') format = FD.Texts.get('DATE_FORMAT') + ' hh:mm';

		//this.log('.parse, format=' + format + ', type=' + typeof format + '/' + FDDateFormat.is(format) + ', typeof contains=' + typeof format.contains, 'group');

		var type = '';
		if (format.contains(['date-', 'datetime-'])) {
			type = format.split('-').shift();
			format = format.replace(/date-|datetime-/, '');

			//this.log('.parse, plain format=' + format);
		}
		format = format.split(' ');

		this.separator = FDDate.getSeparator(format[0]);

		var date = format[0].split(this.separator), fchar;
		for (var i = 0; i < date.length; i++) {
			fchar = date[i].left(1);
			if (/[d|t|g]/.test(fchar) || (fchar == 'j' && /[a]/.test(format[0]))) {
				this.day = date[i];
				this.dayIndex = i;
			} else if (fchar != 'm') {
				this.year = date[i];
				this.yearIndex = i;
			} else {
				this.month = date[i];
				this.monthIndex = i;
			}
			this[fchar + 'Index'] = i;
			this.push(date[i]);
		}
		if (format.length > 1) {

			this.timeFormat = new FDTimeFormat(format[1]);
			
		} else if (type == 'datetime') {

			this.timeFormat = new FDTimeFormat();

		}

		//this.log('.parse, day=' + this.day + ', month=' + this.month + ', year=' + this.year + ', timeFormat=' + this.timeFormat, 'groupEnd');

		return this;

	},

	format: function (date) {

		//this.log(['.format', this, date]);

		var adate = [];
		for (var i = 0; i < 3; i++) {
			//String.log(this[i] + ', ' + this.day + ', ' + this.month + ', ' + this.year);
			if (this[i] == this.day) {
				adate.push(String.create(date.getDate()).padl(2, '0'));
			} else if (this[i] == this.month) {
				adate.push(String.create(date.getMonth() - 0 + 1).padl(2, '0'));
			} else if (this[i] == this.year) {
				adate.push(date.getFullYear());
			}
		}
		var cdate = adate.join(this.separator), ctime = '';
		if (this.hasTime()) {
			cdate = cdate.append(this.timeFormat.format(date), ' ');
		}

		//this.log('.format, formatted=' + cdate);

		return cdate;
	},
	formatDate: function() {
		return this.format.apply(this, arguments);
	},

	hasTime: function () {
		return this.timeFormat != null;
	},

	addTimeFormat: function (format) {
		this.timeFormat = FDTimeFormat.create(format);
	},
	removeTimeFormat: function () {
		this.timeFormat = null;
	},

	toString: function () {
		var format = this.join(this.separator);
		if (this.hasTime()) {
			format = format.append(this.timeFormat.toString(), ' ');
		}
		return format;
	},

	clone: function (options) {
		var clone = this.parent();
		Object.extend(clone, this);

		if (options && typeof options.includeTime != 'undefined') {
			if (String.is(options.includeTime)) {
				clone.addTimeFormat(options.includeTime);
			} if (options.includeTime && !clone.hasTime()) {
				clone.addTimeFormat();
			} else if (!options.includeTime && clone.hasTime()) {
				clone.removeTimeFormat();
			}
		}
		if (options && typeof options.timeFormat != 'undefined') {
			clone.addTimeFormat(options.timeFormat);
		}

		return clone;
	}

}).extend({

	create: function (format) {
		if (!this.is(format)) {
			return new FDDateFormat(format);
		}
		return format;
	},

	_regexpTime: / ([hHmMsS]{1,2})?:?([hHmMsS]{1,2})?:?([hHmMsS]{1,2})?/,
	hasTime: function (format) {
		return this._regexpTime.test(format);
	}
});

/*
	Little bit based on https://github.com/moment/moment/. Moment is a great date and time script, but a bit overkill for the moment.
	firstDayOfWeek:
		0=dow starts on sunday (default)
		1=dow starts on monday (ISO-8601)
	firstDayOfWeekOfYear:
		1=First week contains January 1st. This is the default when you omit firstWeek.
		2=The larger half (four days) of the first week is in the current year.
		3=First week has seven days.
*/
Date.implement({
	getWeek: function (firstDayOfWeek, firstDayOfWeekOfYear) {

		firstDayOfWeek = firstDayOfWeek || 0;
		firstDayOfWeekOfYear = firstDayOfWeekOfYear || 4;

		var thisDate = new Date(this.valueOf()), newYear = new Date(this.getFullYear(), 0, 1);
		var end = firstDayOfWeekOfYear - firstDayOfWeek,
				daysToDayOfWeek = firstDayOfWeekOfYear - this.getDay(),
				adjustedMoment;

		if (daysToDayOfWeek > end) {
			daysToDayOfWeek -= 7;
		}

		if (daysToDayOfWeek < end - 7) {
			daysToDayOfWeek += 7;
		}

		thisDate.setDate(thisDate.getDate() + daysToDayOfWeek);
		//alert(thisDate);
		var daynum = ((Date.UTC(this._y2k(thisDate.getFullYear()), thisDate.getMonth(), thisDate.getDate(), 0, 0, 0) -
						Date.UTC(this._y2k(thisDate.getFullYear()), 0, 1, 0, 0, 0)) / 1000 / 60 / 60 / 24) + 1;

		return Math.ceil(daynum / 7);

	},
	isoWeek: function () {
		return this.getWeek(1, 4);
	},
	_y2k: FDDate._y2k
});

/* depricated functions */
function getDateSeparator(cpFormat) {
	FD.Debug.deprecated(getDateSeparator, 'deprecated! use FD.Date.getSeparator instead');
	return FDDate.getSeparator(cpFormat);
}
function stripDate(cpDate, cpFormat) {
	FD.Debug.deprecated(stripDate, 'deprecated! use FD.Date.Parse instead');
	var obj = FD.Date.Parse(cpDate, cpFormat);
	for (var prop in obj) this[prop] = obj[prop];
}


FDTime = new Class({

	Extends: FDBaseClass,
	_class: 'FDTime',
	
	_trace: true,

	error: false,
	hours: 0,
	minutes: 0,
	seconds: 0,

	format: null,
	hasSeconds: false,
	includeSeconds: false,
	isTimestamp: false,
	separator: ':',

	initialize: function (time, options) {

		this.parent();
		if (arguments.length > 0) {
			this.parse.apply(this, arguments);
		}
	},

	fromDate: function (date) {
		if (!date) date = new Date();
		this.hours = date.getHours();
		this.minutes = date.getMinutes();
		this.seconds = date.getSeconds();
		return this;
	},

	now: function () {
		return this.fromDate();
	},

	parse: function (time, options) {

		var format = '';
		if (options) {
			$.extend(this, options);
			if (options.format) format = options.format;
		}

		if (!FDTimeFormat.is(format)) {
			format = new FDTimeFormat(format, this.includeSeconds);
		}
		this.format = format;
		this.includeSeconds = (format.seconds ? true : false);
		this.separator = this.format.separator;

		this.isTimestamp = Number.is(time);

		this.log(['.parse, includeSeconds=' + this.includeSeconds + ', isTimestamp=' + this.isTimestamp, time, this.format]);

		if (Date.is(time)) {
			this.fromDate(time);
		} else if (this.isTimestamp) {
			time = time / 1000; // timestamp is in milliseconds
			this.hours = parseInt((time / 3600));
			time = time % 3600;
			this.minutes = parseInt((time / 60));
			this.seconds = time % 60;
		} else if (!FDTime.hasSeparator(time)) {

			if (time.length >= 5) { // seconds included
				this.hasSeconds = true;
				this.seconds = Number.float(time.right(2));
				time = time.left(time.length - 2);
			}
			this.minutes = Number.float(time.right(2));
			time = time.left(time.length - 2);
			this.hours = Number.float(time);

		} else {

			time = new RegExp('^(\\d{1,2})+' + this.format.separator + '?(\\d{1,2})?' + this.format.separator + '?(\\d{1,2})? ?([ap]m)?').exec(time.toLowerCase());

			if (!(this.error = time == null)) {
				this.hours = Number.float(time[1]);
				if (time[4] == 'pm') this.hours = this.hours + 12;
				this.minutes = Number.float(time[2]);
				//this.log('.parse, time[3]=' + time);
				this.hasSeconds = String.create(time[3]) != '';
				this.seconds = Number.float(time[3]);
			}
		}
		this.error = this.error || (!this.isTimestamp && !this.hours.between(0, 23)) || !this.minutes.between(0, 59) || !this.seconds.between(0, 59);

		//this.log('.parse, ' + Object.inspect(this, ['hours', 'minutes', 'seconds', 'isTimestamp', 'hasSeconds', 'includeSeconds', 'separator', 'error']));

		this._deprications();
	},

	_deprications: function () {
		this.Hours = this.hours;
		this.Minutes = this.minutes;
		this.Seconds = this.seconds;
		this.Error = this.error;
	},

	//--> to be compliant with the Date object
	getHours: function () {
		return this.hours || 0;
	},
	getMinutes: function (roundSeconds) {
		var minutes = this.minutes || 0;
		if (roundSeconds && this.getSeconds() > 0) {
			minutes++;
		}
		return minutes;
	},
	getSeconds: function () {
		return this.seconds || 0;
	},
	//<--

	toString: function (includeSeconds) {
		var str = '';
		if (this.error) return str;

		return this.format.formatTime(this);

		str += String.create(this.hours).padl(2, '0');
		str += ':' + String.create(this.minutes).padl(2, '0');
		if (this.includeSeconds || (arguments.length > 0 && includeSeconds)) {
			str += ':' + String.create(this.seconds).padl(2, '0');
		}
		return str;
	},
	toTimestamp: function () {
		return (this.error ? 0 : ((this.hours * 3600) + (this.minutes * 60) + this.seconds) * 1000);
	},
	toMinutes: function () {
		return (this.error ? 0 : (this.hours * 60) + this.minutes);
	},
	toSeconds: function () {
		return (this.error ? 0 : (this.hours * 3600) + (this.minutes * 60) + this.seconds);
	}
}).extend({
	is: function (time) { return time != null && time instanceof this; },
	now: function (includeSeconds) {
		var time = new FDTime();
		return time.now().toString(includeSeconds || false);
	},
	Parse: function (time, includeSeconds) { return this.parse(time, { includeSeconds: includeSeconds }); },
	parse: function () {
		var time = new FDTime();
		time.parse.apply(time, arguments);
		return time;
	},
	getSeparator: function (time) {
		var sep = ':-/.';
		for (var i = 0; i < time.length; i++) {
			if (sep.search(time.charAt(i)) > -1)
				return time.charAt(i);
		}
		return '';
	},
	hasSeparator: function (time) {
		return /:|-|\/|\./.test(time);
	},
	_regexpTime: /([hHmMsS]{1,2})?:?([hHmMsS]{1,2})?:?([hHmMsS]{1,2})?/
});

FD.Time = FDTime;

var FDTimeFormat = new Class({

	Extends: FDArray,
	_class: 'FDTimeFormat',

	format: '',
	separator: ':',
	hours: 'hh',
	minutes: 'mm',
	seconds: 'ss',

	initialize: function (format, includeSeconds) {

		if (format) {
			this.parse.apply(this, arguments);
		} else {
			this._default(arguments.length < 2 || includeSeconds);
		}

	},

	_default: function (includeSeconds) {
		this.push(this.hours);
		this.push(this.minutes);
		if (includeSeconds) this.push(this.seconds);
		else this.seconds = '';

		return this;
	},

	parse: function (format, includeSeconds) {

		this.length = 0;

		if (!format) {

			this._default(includeSeconds);

		} else if (format == 'time') {

			return this._default(false); // no seconds

		} else if (format.contains(['time-', 'datetime-'])) {

			type = format.split('-').shift();
			format = format.replace(/time-|datetime-/, '');

			if (type == 'datetime') {
				format = format.split(' ');
				if (format < 2) {
					return this._default();
				} else {
					format = format[1];
				}
			}
			//this.log('.parse, plain format=' + format);
		}

		this.separator = FDTime.getSeparator(format);
		if (this.separator == '') {
			this.seconds = (format.length > 5 ? format.substr(4, 2) : '');
			this.minutes = (format.length > 3 ? format.substr(2, 2) : '');
			this.hours = format.substr(0, 2);
		} else {
			format = format.split(this.separator);
			this.hours = format[0];
			this.minutes = (format[1] || '');
			this.seconds = (format[2] || '');
		}

		if (arguments.length > 1 && !includeSeconds) {
			this.seconds = '';
		}

		if (this.hours) this.push(this.hours);
		if (this.minutes) this.push(this.minutes);
		if (this.seconds) this.push(this.seconds);

		return this;
	},

	format: function (date, includeSeconds) {
		var time = [];
		if (this.hours) time.push(String.create(date.getHours()).padl(this.hours.length, '0'));
		if (this.minutes) time.push(String.create(date.getMinutes()).padl(2, '0'));
		if (this.seconds && (arguments.length < 2 || includeSeconds)) time.push(String.create(date.getSeconds()).padl(2, '0'))
		return time.join(this.separator);
	},
	formatTime: function () {
		return this.format.apply(this, arguments);
	},

	toString: function () {
		return this.join(this.separator);
	}
}).extend({

	create: function (format) {
		if (!this.is(format)) {
			format = new FDTimeFormat(format);
		}
		return format;
	}

});

var FDCalendar = new Class({

	Extends: FDBaseClass,
	Implements: Events,

	_class: 'FDCalendar',

	_element: null,
	_lang: 0, 
	_time: false, 
	_window: null, 
	_prevent: false,

	Param: null, 
	format: '',

	initialize: function () {

		FD.Resource.load('fd_calendar.js');
		//alert('load calendar.css');
		FD.Resource.load('/label/system/calendar.css');

		$(document).ready((function () {
			var cals = $('.calendar-button');

			if (cals.length > 0) {

				var _showCal = (function (e) {
					var fld = $(e.target);
					if (!fld.hasClass('.calendar-button')) {
						fld = fld.closest('.calendar-button');
					}
					fld = fld.parent().find('input');
					if (fld.length > 0 && !fld.isDisabled()) {
						fld.showCalendar(e);
//						this.show(fld, e, null, fld.attr('fd:format'));
					}
				}).bind(this);

				cals.off('click keyup').on({
					'keyup': function (e) {
						if (e.keyCode.list(13, 32)) _showCal(e);
					},
					'click': _showCal
				});
			}
		}).bind(this));
	},

	setProp: function (prop) {
		if (prop.format) this._format = prop.format;
		if (prop.lang) this._lang = prop.lang;
		if (prop.time) this._time = prop.time;
	},

	Set: function (param) {
		var param = param || this.Param, el = param.element;
		this._prevent = true;
		this.Dialog.Hide();
		if (!el.prop('disabled') && (!el.prop('readOnly') || Boolean.create(el.attr('selectOnly')))) {
			var pvalue = el.val(), nvalue;
			if (param.hasTime) {
				nvalue = new Date(param.year, param.month, param.day, param.hours, param.minutes);
			} else {
				nvalue = new Date(param.year, param.month, param.day);
			}
			el.setDate(nvalue, param.format);
			el.select().focus();
			(function (el, pval) { el[0].prevValue = pval; }).delay(100, el, pvalue); // see fd_form.js FDEvents.exec method
			if (FD.Form && FD.Form.State) FD.Form.State.Change();
		}
		//	param.window.close();
		param = param.window = this.Param = null;
	},

	show: function (el, e, type, format) {
		
		if (typeof FD.Validate != 'undefined' && FD.Validate.isAlerting()) return;
		if (String.is(el)) el = $(FD.get(el));
		if (!(el instanceof jQuery)) el = $(el);
		if (this._lang == 0 && typeof FD != 'undefined') {
			this._lang = FD.getLang();
			this._format = FD.Texts.get('DATE_FORMAT');
		}

		if (String.is(type) && type.length > 1 && !format) { // parameter shift
			format = type;
			type = null;
		}
		format = format || this._format;

		var today = new Date(), param = this.Param = { element: el, format: format, parent: window }, val = el.val();
		el.data('origValue', val);

		this._time = (type && type == 'T')
		if (val.length > 0) {
			var parsed = FDDate.parse(val, param.format);
			if (!parsed.error) {
				param.day = param.orgday = parsed.day; param.month = param.orgmonth = (parsed.month > 0 ? parsed.Month - 1 : today.getMonth()); param.year = param.orgyear = (parsed.year >= 1900 ? parsed.year : today.getFullYear());
				param.hasTime = parsed.hasTime, param.time = this._time;
				if (this._time) {
					param.hours = parsed.hours || 0;
					param.minutes = parsed.minutes || 0;
				}
			} else {
				param = this._createToday(param);
			}
		} else {
			param = this._createToday(param);
		}

		FD.Calendar.Dialog.Show(param, e);
		this._prevent = false;

		return;
	},

	_createToday: function (param) {
		var today = new Date();
		param.day = today.getDate(); param.month = today.getMonth(); param.year = today.getFullYear();
		param.hasTime = false, param.time = this._time;
		if (this._time) {
			param.hours = 0; param.minutes = 0;
		}
		return param;
	},

	Close: function () {
		if (this.Param) {
			this._prevent = true;
			try { this.Window.Hide(); } catch (e) { }
		}
	},

	OnClose: function (param) {
		param.element.select().focus();
	}

})

FD.Calendar = new FDCalendar();



Function.depricated('getDate', function (vpElement, cpType, cpFormat) {
	FD.Debug.deprecated(getDate, 'deprecated! FD.Calendar.Get instead');
	FD.Calendar.Get(vpElement, cpType, cpFormat);
}, 'FD.Calendar.Get');

Function.depricated('getDate_event', function (e) {
	FD.Debug.deprecated(getDate_event, 'deprecated! FD.Calendar.Get instead');
	var el = checkEvent(e);
	FD.Calendar.Get(el);
}, 'FD.Calendar.Get');

function padOut(npNumber) { return (npNumber < 10) ? '0' + npNumber : npNumber; }

function splitChar(cpString, lpEscaped) {
	return (
		(
			cpString.search((!lpEscaped ? unescape('%0D%0A') : '%0D%0A')) >= 0 ?
			'%0D%0A' :
			(
				cpString.search((!lpEscaped ? unescape('%0D') : '%0D')) >= 0 ?
				'%0D' :
				'%0A'
			)
		)
	);
}

var FDColorMap = new Class({
	
	Extends: FDBaseClass,
	_class: 'FDColorMap',

	_colors: {
		"aliceblue": "#f0f8ff", "antiquewhite": "#faebd7", "aqua": "#00ffff", "aquamarine": "#7fffd4", "azure": "#f0ffff",
		"beige": "#f5f5dc", "bisque": "#ffe4c4", "black": "#000000", "blanchedalmond": "#ffebcd", "blue": "#0000ff", "blueviolet": "#8a2be2", "brown": "#a52a2a", "burlywood": "#deb887",
		"cadetblue": "#5f9ea0", "chartreuse": "#7fff00", "chocolate": "#d2691e", "coral": "#ff7f50", "cornflowerblue": "#6495ed", "cornsilk": "#fff8dc", "crimson": "#dc143c", "cyan": "#00ffff",
		"darkblue": "#00008b", "darkcyan": "#008b8b", "darkgoldenrod": "#b8860b", "darkgray": "#a9a9a9", "darkgreen": "#006400", "darkkhaki": "#bdb76b", "darkmagenta": "#8b008b", "darkolivegreen": "#556b2f",
		"darkorange": "#ff8c00", "darkorchid": "#9932cc", "darkred": "#8b0000", "darksalmon": "#e9967a", "darkseagreen": "#8fbc8f", "darkslateblue": "#483d8b", "darkslategray": "#2f4f4f", "darkturquoise": "#00ced1",
		"darkviolet": "#9400d3", "deeppink": "#ff1493", "deepskyblue": "#00bfff", "dimgray": "#696969", "dodgerblue": "#1e90ff",
		"firebrick": "#b22222", "floralwhite": "#fffaf0", "forestgreen": "#228b22", "fuchsia": "#ff00ff",
		"gainsboro": "#dcdcdc", "ghostwhite": "#f8f8ff", "gold": "#ffd700", "goldenrod": "#daa520", "gray": "#808080", "green": "#008000", "greenyellow": "#adff2f",
		"honeydew": "#f0fff0", "hotpink": "#ff69b4",
		"indianred ": "#cd5c5c", "indigo ": "#4b0082", "ivory": "#fffff0", "khaki": "#f0e68c",
		"lavender": "#e6e6fa", "lavenderblush": "#fff0f5", "lawngreen": "#7cfc00", "lemonchiffon": "#fffacd", "lightblue": "#add8e6", "lightcoral": "#f08080", "lightcyan": "#e0ffff", "lightgoldenrodyellow": "#fafad2",
		"lightgrey": "#d3d3d3", "lightgreen": "#90ee90", "lightpink": "#ffb6c1", "lightsalmon": "#ffa07a", "lightseagreen": "#20b2aa", "lightskyblue": "#87cefa", "lightslategray": "#778899", "lightsteelblue": "#b0c4de",
		"lightyellow": "#ffffe0", "lime": "#00ff00", "limegreen": "#32cd32", "linen": "#faf0e6",
		"magenta": "#ff00ff", "maroon": "#800000", "mediumaquamarine": "#66cdaa", "mediumblue": "#0000cd", "mediumorchid": "#ba55d3", "mediumpurple": "#9370d8", "mediumseagreen": "#3cb371", "mediumslateblue": "#7b68ee",
		"mediumspringgreen": "#00fa9a", "mediumturquoise": "#48d1cc", "mediumvioletred": "#c71585", "midnightblue": "#191970", "mintcream": "#f5fffa", "mistyrose": "#ffe4e1", "moccasin": "#ffe4b5",
		"navajowhite": "#ffdead", "navy": "#000080",
		"oldlace": "#fdf5e6", "olive": "#808000", "olivedrab": "#6b8e23", "orange": "#ffa500", "orangered": "#ff4500", "orchid": "#da70d6",
		"palegoldenrod": "#eee8aa", "palegreen": "#98fb98", "paleturquoise": "#afeeee", "palevioletred": "#d87093", "papayawhip": "#ffefd5", "peachpuff": "#ffdab9", "peru": "#cd853f", "pink": "#ffc0cb", "plum": "#dda0dd", "powderblue": "#b0e0e6", "purple": "#800080",
		"red": "#ff0000", "rosybrown": "#bc8f8f", "royalblue": "#4169e1",
		"saddlebrown": "#8b4513", "salmon": "#fa8072", "sandybrown": "#f4a460", "seagreen": "#2e8b57", "seashell": "#fff5ee", "sienna": "#a0522d", "silver": "#c0c0c0", "skyblue": "#87ceeb", "slateblue": "#6a5acd", "slategray": "#708090", "snow": "#fffafa", "springgreen": "#00ff7f", "steelblue": "#4682b4",
		"tan": "#d2b48c", "teal": "#008080", "thistle": "#d8bfd8", "tomato": "#ff6347", "turquoise": "#40e0d0",
		"violet": "#ee82ee",
		"wheat": "#f5deb3", "white": "#ffffff", "whitesmoke": "#f5f5f5",
		"yellow": "#ffff00", "yellowgreen": "#9acd32",
		"transparent": "rgba(0,0,0,0)"
	},

	get: function (name) {
		if (this._colors[name]) return this._colors[name];
		return '';
	},
	name: function (color) {
		var colors = this._colors, item, hex;
		if (!FDColor.is(color)) {
			color = new FDColor(color);
		}
		hex = color.toHex({ fullString: true, allowShort: false });
		for (item in colors) {
			if (colors[item] == hex) {
				return item;
			}
		}
		return '';
	}

});
var FDColor = new Class({

	Extends: FDArray,
	_class: 'FDColor',

	_trace: false,

	_color: '',
	r: -1,
	g: -1,
	b: -1,
	a: -1,

	isNamed: false,
	isRgb: false,
	isRgba: false,
	isHex: false,
	isHexShort: false,

	valid: false,
	corrected: false,

	initialize: function (color, options) {

		if (this._guid == '') this._guid = this.getUniqueID();

		this.r = this.g = this.b = this.a = -1;
		this.length = 0;
		this.setOptions($.extend({}, FDColor.defaults, options));
		if (color) {
			this.set(color);
		}
	},
	clone: function (options) {
		var clone = this.parent();
		if (arguments.length > 0) {
			clone.options = FDOptions.create(options);
		}
		return clone;
	},
	parse: function (color) {

		if (FDColor.named.get(color)) {
			color = FDColor.named.get(color);
			this.isNamed = true;
		}

		var rgb = /(\d{1,3}),(\d{1,3}),(\d{1,3})(?:,([\d\.]{1,}))?/,
			rgbFull = /^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,([\d\.]{1,}))?\)$/,
			hexFull = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i,
			hexShort = /^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i;

		var c = ['r', 'g', 'b', 'a'];
		this.length = 0;
		this.r = this.g = this.b = this.a = -1;

		color = color.replace(/[^\w,\.\(\)]/ig, '');
		this.isRgb = rgb.test(color);
		this.isHex = hexFull.test(color) || (this.isHexShort = hexShort.test(color));

		if (this.isHex && color.left(1) != '#') {
			this.corrected = true;
			color = '#' + color;
		}

		if (this.isRgb) {
			if (color.search('rgb') > -1) {
				var result = rgbFull.exec(color);
				if (result) result.slice(1).walk(function (el, i) { this.push(el); this[c[i]] = this._parse(c[i], el); }, this);
			} else {
				rgb.exec(color).slice(1).walk(function (el, i) { this.push(el); this[c[i]] = this._parse(c[i], el); }, this);
			}
		} else if (this.isHexShort) {
			hexShort.exec(color).slice(1).walk(function (el, i) { if (typeof el != 'undefined') { this.push(el); this[c[i]] = parseInt(el + el, 16); } }, this);
		} else if (this.isHex) {
			hexFull.exec(color).slice(1).walk(function (el, i) { if (typeof el != 'undefined') { this.push(el); this[c[i]] = parseInt(el, 16); } }, this);
		}
		this._color = color;

		this.isRgba = this.a > -1;
		if (this.isRgba) {
			this.options.supportAlpha = true;
		}

		this.isValid(); // this.isRgb || this.isHex;

		//this.log(['.parse', this]);

		return color;
	},
	_parse: function (prop, val) {
		return (val == undefined ? -1 : (prop == 'a' ? Number.round(Number.float(val), 2) : Number.int(val)));
	},

	isValid: function () {
		if (this.a > 1) this.a = this.a / 100;
		return (this.valid = this.r.between(0, 255) && this.g.between(0, 255) && this.b.between(0, 255) && (this.a < 0 || this.a.between(0, 1)));
	},

	set: function () {
		
		var arr = arguments, len = arr.length;

		if (len == 0) {
			this.length = 0;
			this.r = this.g = this.b = this.a = -1;
		} else if (len == 1 && (Object.is(arr[0]) || FDColor.is(arr[0]))) {
			var color = arr[0];
			if (typeof color.r != 'undefined') this.r = this[0] = color.r;
			if (typeof color.g != 'undefined') this.g = this[1] = color.g;
			if (typeof color.b != 'undefined') this.b = this[2] = color.b;
			if (typeof color.a != 'undefined') this.a = this[3] = color.a;

			this.isHex	= this.isHexShort = false;
			this.isRgb	= this.isValid();
			this.isRgba = this.isRgb && this.a > -1;

			if (typeof color.hex != 'undefined') this.parse(color.hex);
			if (typeof color.ahex != 'undefined') this.parse(color.ahex);

		} else if (len == 1 && String.is(arr[0])) {

			this.parse(arr[0]);

		} else if (len == 2 && String.is(arr[0]) && arr[0].list('r', 'g', 'b', 'a')) {

			this[arr[0]] = (String.is(arr[1]) && arr[1] == '' ? -1 : this._range(arr[0], Number.float(arr[1])));

			this.isHex = this.isHexShort = false;
			this.isRgb = this.isValid();
			this.isRgba = this.isRgb && this.a > -1;

		} else if (len == 2 && String.is(arr[0]) && arr[0] == 'hex') {

			this.parse(arr[1]);

		} else {

			if (len == 1 && Array.is(arr[0])) {
				arr = arr[0];
				len = arr.length;
			}

			this.r = this[0] = (len > 0 ? this._range('r', Number.float(arr[0])) : -1);
			this.g = this[1] = (len > 1 ? this._range('g', Number.float(arr[1])) : -1);
			this.b = this[2] = (len > 2 ? this._range('b', Number.float(arr[2])) : -1);
			this.a = this[3] = (len > 3 ? this._range('a', Number.float(arr[3])) : -1);

			this.isHex = this.isHexShort = false;
			this.isRgb = this.isValid();
			this.isRgba = this.isRgb && this.a > -1;

			//this.log(['.set', this]);
		}

		return this;
	},

	toString: function () {
		if (this.isValid()) {

			var options = $.extend({}, (arguments.length > 0 ? arguments[0] : {}), { fullString: true });

			if (this.isNamed) {
				var color = FDColor.named.name(this);
				if (color != '') return color;
			}
			if (this.isHex) return this.toHex(options);
			else return this.toRgb(options);
		}
		return '';
	},
	toRgb: function (options) {

		options = (options ? $.extend({}, this.options, options) : this.options);

		if ((options.supportAlpha || options.supportTransparency) && this.a == 0) return 'transparent';

		var retval = (this.r > -1 ? this.r + ',' + this.g + ',' + this.b + (options.supportAlpha && this.a.between(0, 0.99) ? ',' + this.a : '') : '');
		if (retval && options.fullString) {
			retval = 'rgb' + (options.supportAlpha && this.a.between(0, 0.99) ? 'a' : '') + '(' + retval + ')';
		}
		return retval;
	},
	toHex: function (options) {
		if (this.r < 0) return '';

		options = (options ? $.extend({}, this.options, options) : this.options);

		if ((options.supportAlpha || options.supportTransparency) && this.a == 0) return 'transparent';

		var short = true, comp = [this._compToHex(this.r), this._compToHex(this.g), this._compToHex(this.b)], compShort = [];
		if (options.allowShort) comp.walk(function (el, i) { short = short && el.substr(0, 1) == el.substr(1, 1); compShort.push(el.substr(0, 1)); });

		return (options.fullString ? '#' : '') + (options.allowShort && short ? compShort.join('') : comp.join(''));
	},
	toArray: function (alpha) {
		var ret = [this.r, this.g, this.b];
		if (alpha || (arguments.length == 0 && this.options.supportAlpha && this.a > -1)) {
			ret.push((this.a > -1 ? this.a : 0));
		}
		return ret;
	},

	_compToHex: function (c) {
		var hex = c.toString(16);
		return hex.length == 1 ? '0' + hex : hex;
	},
	_range: function (type, val) {
		var max = (type == 'a' ? 100 : 255);
		if (val > max) return max;
		else if (val < 0) return 0;
		return val;
	},

	/**
	 * http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
	 */
	shade: function (percent, returnNew) { // percent < 0 = darken, percent > 0 = lighten
		var t = percent < 0 ? 0 : 255, p = percent < 0 ? percent * -1 : percent,
			R = this.r, G = this.g, B = this.b,
			arr = [Math.round((t - R) * p) + R, Math.round((t - G) * p) + G, Math.round((t - B) * p) + B];

		if (returnNew) {
			return new FDColor(arr);
		} else {
			return this.set(arr);
		}
	},
	darken: function (percent, returnNew) {
		return this.shade.call(this, (percent > 0 ? percent * -1 : percent), returnNew);
	},
	lighten: function (percent, returnNew) {
		return this.shade.call(this, (percent < 0 ? percent * -1 : percent), returnNew);
	},
	blend: function (color2, percent, returnNew) {
		if (!FDColor.is(color2)) {
			FDColor.debug = true;
			color2 = new FDColor(color2);
			FDColor.debug = false;
		}
		var R1 = this.r, G1 = this.g, B1 = this.b,
			R2 = color2.r, G2 = color2.g, B2 = color2.b,
			arr = [Math.round((R2 - R1) * percent) + R1, Math.round((G2 - G1) * percent) + G1, Math.round((B2 - B1) * percent) + B1];

		if (returnNew) {
			return new FDColor(arr);
		} else {
			return this.set(arr);
		}
	},

	palette: function (n, rtype) {
		n = n || 5;
		rtype = rtype || 'objects';

		var start = this, end = start.blend([200, 200, 200], 0.80, true).lighten(0.3);

		end.b += 16;
		if (end.b > 255) {
			end.b = end.b - 255;
		}
		
		var perc = 1 / n /*1 - ((Math.abs(end.r - start.r) * (start.r / 100)) / 5) / 10*/,
			i, j, move = 0, palette = [], color, row,
			base = FDColor.sequence(start, end, n);

		for (i = 0; i < n; i++) {

			color = base[i].clone();
			row = [];

			for (j = move; j > 0; j--) {
				color.lighten(perc);
				switch (rtype) {
					case 'hex':
						row.unshift(color.toHex());
						break;
					case 'rgb':
						row.unshift(color.toRgb({ fullString: true }));
						break;
					default:
						row.unshift(color.clone());
						break;

				}
			}

			color = base[i].clone();
			for (j = move; j < n; j++) {
				switch (rtype) {
					case 'hex':
						row.push(color.toHex());
						break;
					case 'rgb':
						row.push(color.toRgb({ fullString: true }));
						break;
					default:
						row.push(color.clone());
						break;

				}
				color.darken(perc);
			}
			move++;
			perc += (0.02 + ((i + 1) / 100 ));

			palette.push(row);
		}

		return palette;

	}

}).extend({
	defaults: {
		allowShort: true,
		supportAlpha: false,
		supportTransparency: true
	},

	transparent: 'rgba(0,0,0,0)',

	create: function (color, options) {
		if (!FDColor.is(color)) {
			color = new FDColor(color, options);
		}
		return color;
	},
	toHex: function (color, options) {
		return (new FDColor(color, options)).toHex();
	},
	toRgb: function (color, options) {
		return (new FDColor(color, options)).toRgb();
	},
	toArray: function (color, options, alpha) {
		return (new FDColor(color, options)).toArray(alpha);
	},
	validate: function (color) {
		return (new FDColor(color)).isValid();
	},
	parse: function (color, options) {
		return new FDColor(color, options);
	},
	
	_interpolation: function (a, b, factor) {
		var ret = [];

		for (var i = 0; i < Math.min(a.length, b.length) ; i++) {
			ret[i] = Math.round(a[i] * (1 - factor) + b[i] * factor);
		}

		return ret;
	},
	/**
	 * Generate colors sequence.
	 *
	 * @param {String, Object} start Start color (any CSS format should work - both hex and names should be fine).
	 * @param {String, Object} end End colot.
	 * @param {type} n Number of colors to generate.
	 * @returns {Array} Array of generated colors.
	 */
	sequence: function (start, end, n) {
		var ret = [];

		var a = (FDColor.is(start) ? start : new FDColor(start));
		//a.log('.toArray, ' + a.toArray(false));
		var b = (FDColor.is(end) ? end : new FDColor(end));
		//b.log('.toArray, ' + b.toArray(false));

		for (var i = 0; i < n; i++) {
			var color = new FDColor();
			var rgb = this._interpolation(a.toArray(false), b.toArray(false), i / (n - 1));
			//color.log('.set, ' + rgb);
			color.set(rgb);
			ret.push(color);
			//color.log(['.test, ' + ret[i], color]);
		}

		return ret;
	},

	mapToRgbArray: function (colors) {
		return $.map(colors, function (color) {

			if (String.is(color)) return FDColor.toArray(color, null, false);
			else if (FDColor.is(color)) return color.toArray(false);
			return null;

		});
	},

	colorDistance: function(color1, color2) {
		// This is actually the square of the distance but
		// this doesn't matter for sorting.
		var result = 0;
		for (var i = 0; i < color1.length; i++)
			result += (color1[i] - color2[i]) * (color1[i] - color2[i]);
		return result;
	},

	

	sortColors: function (colors) {

		if (colors.length < 2) {

			return colors;

		}

		// First sort the array based on the Luminance from dark to light
		var sumColor = function (rgb) {
			// To calculate relative luminance under sRGB and RGB colorspaces that use Rec. 709:
			return 0.2126*rgb[0] + 0.7152*rgb[1] + 0.0722*rgb[2];
		}
		colors.sort(function (a, b) {
			return sumColor(a.toArray(false)) > sumColor(b.toArray(false));
		});

		// Calculate distance between each color
		var distances = [];
		for (var i = 0; i < colors.length; i++) {
			//colors[i]._guid = colors[i].toHex();
			for (var j = 0; j < i; j++)
				distances.push([colors[i], colors[j], this.colorDistance(colors[i].toArray(false), colors[j].toArray(false))]);
		}

		distances.sort(function(a, b) {
			return a[2] - b[2];
		});

		// Put each color into separate cluster initially
		var colorToCluster = {};
		for (var i = 0; i < colors.length; i++)
			colorToCluster[colors[i]._guid] = [colors[i]];
		
		// Merge clusters, starting with lowest distances
		var lastCluster;

		for (var i = 0; i < distances.length; i++) {
			var color1 = distances[i][0];
			var color2 = distances[i][1];

			var cluster1 = colorToCluster[color1._guid];
			var cluster2 = colorToCluster[color2._guid];
			if (!cluster1 || !cluster2 || cluster1 == cluster2)
				continue;

			// Make sure color1 is at the end of its cluster and
			// color2 at the beginning.
			if (color1._guid != cluster1[cluster1.length - 1]._guid)
				cluster1.reverse();
			if (color2._guid != cluster2[0]._guid)
				cluster2.reverse();
 
			// Merge cluster2 into cluster1
			cluster1.push.apply(cluster1, cluster2);
			delete colorToCluster[color1._guid];
			delete colorToCluster[color2._guid];
			colorToCluster[cluster1[0]._guid] = cluster1;
			colorToCluster[cluster1[cluster1.length - 1]._guid] = cluster1;
			lastCluster = cluster1;
		}

		// By now all colors should be in one cluster
		return lastCluster;
	},

	named: new FDColorMap()

});

var FDBoxShadow = new Class({

	Extends: FDBaseClass,
	_class: 'FDBoxShadow',
	_trace: false,

	valid: false,

	offsetX: '',
	offsetY: '',
	blur: '',
	spread: '',
	color: '',
	style: '',

	multiple: [],

	initialize: function (value, options) {

		this.parent(options);
		if (value) {
			this.parse(value);
		}

	},

	parse: function (value) {

		this.log('.parse, value=' + value, 'group');

		// can have multiple shadows
		var bshadows = (Array.is(value) ? value : value.split(/,(?![^\(]*\))/)), bshadow = bshadows.shift();
		var parts = bshadow.split(/ (?![^\(]*\))/);

		var part, count = 0, i, keys = ['offsetX', 'offsetY', 'blur', 'spread'];
		for (i = 0; i < parts.length; i++) {

			part = parts[i];

			this.log('.parse, part=' + part + ', count=' + count);

			if (/inset|inherit|initial|unset/.test(part)) {

				this.style = part;

			} else if (/rgb|#|^[^\d]+$/.test(part)) { // consider to be the color (rgb(a) | hex | named-color)

				this.color = new FDColor(part);

			} else if (part == '0' || /(-?\d+(px|em|%))/.test(part) && count < 4) {

				this[keys[count++]] = part;
				
			} else {

				this.log('.parse, could not determine part ' + part);
			}

		}

		if (bshadows.length > 0) {
			
			this.log('.parse, multiple values', 'group');

			for (i = 0; i < bshadows.length; i++) {
				this.multiple.push(new FDBoxShadow(bshadows[i], this.options));
			}
			
			this.log('', 'groupEnd');
		}

		this.isValid();

		this.log(['.parse', this]);

		this.log('', 'groupEnd');

	},

	toString: function () {

		if (!this._check()) {
			return '';
		}

		var bshadow = '';
		if (this.style != '') {

			bshadow += this.style;
			
			if (/inherit|initial|unset/.test(this.style)) {
				return bshadow;
			}

		}
		if (this.offsetX != '') {
			bshadow = bshadow.append(this.offsetX, ' ');
		}
		if (this.offsetY != '') {
			bshadow = bshadow.append(this.offsetY, ' ');
		}
		if (this.blur != '') {
			bshadow = bshadow.append(this.blur, ' ');
		}
		if (this.spread != '') {
			bshadow = bshadow.append(this.spread, ' ');
		}
		if (FDColor.is(this.color) || !String.empty(this.color)) {
			bshadow = bshadow.append(this.color.toString(), ' ');
		}

		return bshadow;

	},

	_check: function () {

		if (/inherit|initial|unset/.test(this.style)) {
			this.valid = true;
			this.offsetX = this.offsetY = this.blur = this.spread = this.color = '';
		} else {

			var keys = ['spread', 'blur', 'offsetY', 'offsetX'], key, i;
			while (keys.length > 0) {
				key = keys.shift();
				if (this[key] != '') {
					for (i = 0; i < keys.length; i++) {
						if (this[keys[i]] == '') this[keys[i]] = '0';
					}
				}
			}

		}

		return this.isValid();
	},

	isValid: function () {

		this.valid = /inherit|initial|unset/.test(this.style) ||
			(this.offsetX != '' && this.offsetY != '' && ((FDColor.is(this.color) && this.color.isValid()) || !String.empty(this.color)));

		return this.valid;
	}

}).extend({

	parse: function (value, options) {

		return new FDBoxShadow(value, options);

	}

})


// deprecated

function checkUrl(cpUrl) {
	var cUrl = cpUrl.toLowerCase()
	if (cUrl.search('http://') == -1 && cUrl.search('https://') == -1 && cUrl.substr(0, 1) != '#')
		cpUrl = 'http://' + cpUrl;
	return cpUrl;
}

function checkCSS(cpUrl, lpRetVal) {
	var cUrl = cpUrl.toLowerCase(), lRetVal = cUrl.match(/(.+\/){1}.+(\.css|\.asp|\.php)/) != null;
	return (lpRetVal ? (lRetVal ? cpUrl : '') : lRetVal);
}

var FDNumber = new Class({

	Extends: FDBaseClass,
	_class: 'FDNumber',

	_original: '',
	empty: true,
	error: false,
	errorNumber: 0,

	integer: 0,
	decimals: 0,
	hasDecimals: false,

	integerString: '',
	decimalsString: '',
	decimalCount: 0,

	initialize: function (number, options) {
		this.parent(options);
		if (Number.is(number) || String.is(number)) this.parse(number);
	},
	parse: function (number, options) {

		if (options) this.setOptions(options);
		var allowEmpty = this.options.allowEmpty || false, range = this.options.range || 0;

		this.log('.parse, number=' + number, 'group');

		var self = this, end = function (retval, error, message) {
			if (message) self.log('.parse, error=' + message, 'error');
			if (error) self.errorNumber = error;

			self.log(self);
			self.log('', 'groupEnd');
			return retval;
		};

		this._clear();
		this._original = number;

		//if (!Number.is(number)) number = Number.float(number);

		if (Number.is(number)) {
			
			this.log('.parse, is a number');

			if (range > 0) number = Math.round(number * Math.pow(10, range)) / Math.pow(10, range);

			this.integer = (number > 0 ? Math.floor(number) : Math.ceil(number));
			this.hasDecimals = (number + '').search('.') > -1;
			this.decimals = (this.hasDecimals ? number - this.integer : 0);

			this.empty = false;
		
		} else if (!String.is(number)) {
			
			return !(this.error = true);

		} else {
			
			if (((new RegExp("[\\d]+" + Number.tsep.toRegExp() + "[\\d]{3}" + Number.dsep.toRegExp() + "[\\d]+")).test(number) || (new RegExp("[\\d]+" + Number.dsep.toRegExp() + "[\\d]{3}" + Number.tsep.toRegExp() + "[\\d]+")).test(number) /* number has reversed notation */ || ((new RegExp("[\\d]+" + Number.tsep.toRegExp() + "[\\d]{3}(" + Number.dsep.toRegExp() + "|" + Number.tsep.toRegExp() + ")")).test(number) && (number.occurs(Number.tsep) > 1 || !(new RegExp("^[\\d]+\\.[\\d]{1,}$")).test(number))))) {
				// deformat the number
				this.log('.parse, deformating the number');
				number = String.format('number', number, true);
				this.log('.parse, deformatted=' + number);
			}

			number = String.create(number).trim().substr(0, 20).replace(/,/g, '.');

			this.log('.parse, stripped=' + number);

			if ((this.empty = number.length == 0) && !allowEmpty) {
				return end(!(this.error = true), FDNumber.ERROR_EMPTY_STRING, 'empty string not allowed');
			} else if (number.match(/[^0-9.-]/)) {
				return end(!(this.error = true), FDNumber.ERROR_INVALID_CHARACTERS, 'invalid characters found');
			}
			if (range > 0) number = String.create(Math.round(parseFloat(number) * Math.pow(10, range)) / Math.pow(10, range));

			var num = number.split('.');

			if ((this.error = num.length > 2)) return end(false, FDNumber.ERROR_TOMANY_PARTS, 'to many parts');
			if ((this.error = (/-/.test(num[0]) && !/^-[\d]{1,}$/.test(num[0])))) return end(false, FDNumber.ERROR_NEGATIVE_NOTATION, 'wrong negative notation'); // when negative then the - sign must be the first character
			if (num.length > 1 && num[1].match(/[^\d]/)) return end(!(this.error = true), FDNumber.ERROR_DECIMAL_NOTATION, 'wrong decimal notation');

			this.integer = Number.int(num[0].trim());
			this.hasDecimals = num.length > 1 && !num[1].trim().empty();
			this.decimals = (this.hasDecimals ? Number.create('0.' + num[1]) * (this.integer < 0 ? -1 : 1) : 0);

		}

		this._toString();

		return end(true);
	},

	_clear: function () {
		this.integer = this.decimals = this.decimalCount = this.errorNumber = 0;
		this.integerString = this.decimalsString = '';
		this.hasDecimals = this.error = false;
		this.empty = true;
	},

	_toString: function () {
			
		this.integerString = String.create(this.integer);
		this.decimalsString = (this.hasDecimals ? (this.decimals + '').split('.')[1] || '' : '');
		this.decimalCount = this.decimalsString.length;

	},

	toString: function (options) {
		options = options || {};

		if (this.empty || this.error) return '';
		var number = this.integerString, dec = this.decimalsString;
		if (Number.is(options.decimals)) {
			if (options.decimals == 0) dec = '';
			else if (options.decimals > dec.length) dec = dec.padr(options.decimals, '0');
			else {
				dec = Math.round(parseInt(dec) / Math.pow(10, dec.length - options.decimals)) + '';
			}
		}
		if (dec) number = number.append(dec, '.');
		if (options.format) number = String.format('number', number);

		return number;
	}

}).extend({
	defaults: {
		allowEmpty: true
	},
	ERROR_EMPTY_STRING: 1,
	ERROR_INVALID_CHARACTERS: 2,
	ERROR_TOMANY_PARTS: 3,
	ERROR_NEGATIVE_NOTATION: 4,
	ERROR_DECIMAL_NOTATION: 5,
	create: function (number, options) {
		return new FDNumber(number, options);
	}
});


/* 
	NOTE that parseFloat has a limitation of 15 digits
*/
function correctNumber(number, range, decimals, min, max, allowEmpty, onchange) {
	number = String.create(number).trim().substr(0, 20).replaceAll(',', '.');

	if (number.match(/[^0-9.-]/) || (allowEmpty && number.length == 0)) {
		return ['', '', '', true];
	}

	var num = number.split('.');
	if (typeof range == 'number' && range >= 0 && decimals && (num.length > 1 && num[1].length > 0)) {
		number = String.create(Math.round(parseFloat(number) * Math.pow(10, range)) / Math.pow(10, range));
		num = number.split('.');
	}

	num[0] = String.create(num[0]).trim();
	num[2] = isNaN(num[0]) && num[0] != '-'; // it could be empty or it contains text; something is wrong!
	num[3] = (num[0].length > 0 && num[2]); // it clearly contains text
	var min = num[0].charAt(0) == '-', int = (num[2] || num[0].length == 0 ? 0 : Number.create(num[0]));
	num[0] = String.create(int); // make sure it contains something of a number
	num[1] = (num.length > 1 && !String.create(num[1]).empty()) ? String.create(num[1]).trim() : ''; // make sure the decimal array index is a string
	num[2] = (num[2] || isNaN(num[1]) || (range <= 0 && num[1].length > 0)); // something is wrong with the decimals
	num[3] = (num[3] || (num[1].length > 0 && isNaN(num[1]))); // the decimals part contains text; that's wrong!
	num[1] = (isNaN(num[1]) ? '0' : num[1]); // make sure again the decimal part contains a number string

	if (typeof range == 'number' && range > 0) {
		var index = (decimals ? 1 : 0);
		num[2] = (num[2] || num[index].length > range);
		if (num[1].length > range) {
			num[1] = num[1].substr(0, range);
		}

		if (!onchange) {
			if (decimals) num[index] = num[index].padr(range, '0');
			else num[index] = num[index].padl(range, '0');
		}
	}
	if (min && int == 0 && ((decimals && num[1].length > 0) || (onchange && decimals && number.search(/\./) >= 0))) {
		num[0] = '-' + num[0];
	}

	corrected = new Array('' /* complete corrected string */, num[0] /* absolute part */, num[1] /* decimal part */, num[2] /* error flag */);
	corrected[0] = (num[3] ? '' : (num[0] + ((decimals && num[1].length > 0) || (onchange && decimals && number.search(/\./) >= 0) ? ('.' + num[1]) : '')));
	if (corrected[0].length > 20) {
		corrected[3] = true;
		corrected[0] = '';
	}
	if (typeof min == 'number' && parseFloat(corrected[0]) < min)
		corrected[0] = (allowEmpty ? '' : min);
	if (typeof max == 'number' && parseFloat(corrected[0]) > max)
		corrected[0] = (allowEmpty ? '' : max);

	return corrected;
}
/*
function correctNumber(number, range || 0, decimals, min, max, allowEmpty, onchange) {
	return FDNumber.correct(number, { range: range , decimals: decimals || false, min: min || null, max: max || null, allowEmpty: allowEmpty || false, onchange: onchange: false });
}*/
function checkNumber(e, type, etype) {
	var lSpecChars = (arguments.length == 0 || (type & 2) == 2), kc = (etype != 'onkeypress' ? e.keyCode : (Browser.ie ? e.keyCode : e.charCode));
	//$('desc').value = kc;
	if (kc > 0 && (!lSpecChars || checkDecimalMark(e, etype)) && !keyCodeIsNumChar(kc, (arguments.length == 0 || (type & 1) == 1), lSpecChars, etype)) {
		if (Browser.ie) e.returnValue = false;
		else if (typeof e.preventDefault != 'undefined')
			e.preventDefault();
		else if (typeof e.target != 'undefined')
			e.target.value = correctNumber(e.target.value, 0, true);
		return false;
	}
	return true;
}
function keyCodeIsNumChar(keyCode, lpControlChars, lpSpecChars, etype) {
	//$('desc').value = keyCode;
	if (etype == 'onkeypress') return (keyCode.between(48, 57) || (lpSpecChars && keyCode.between(44, 46 /* ,.- */)));
	else return ((keyCode.between(48, 57) || keyCode.between(96, 105) || (lpSpecChars && keyCode.list(188, 189, 190, 110 /* ,.- */))) || (lpControlChars && keyCode.list(8, 9, 16, 17, 18, 35, 36, 37, 38, 39, 40, 46)));
}
function keyCodeIsControlChar(e, exclDel) {
	return (e.keyCode.list(9, 16, 17, 18, 35, 36, 37, 38, 39, 40) || (!exclDel && e.keyCode.list(8, 46)));
}
function checkDecimalMark(e, etype) {
	var dot = (etype == 'onkeypress' ? 46 : 190), comma = dot - 2;
	var el = checkEvent(e), val = el.value.split(Number.dsep), dec = el.getAttribute('fd:decimals'), prevent = (val.length > 1 && dec != null && FD.Selection.getCaretPos(el, true) <= Number.int(dec) && val[1].length >= Number.int(dec));
	if (prevent || (((Browser.ie && e.keyCode.list(dot, comma)) || (e.charCode && e.charCode.list(dot, comma))) && typeof e.shiftKey != 'undefined' && !e.shiftKey)) {
		prevent = prevent || (dec != null && Number.int(dec) == 0) || val.length >= 2; //el.value.occurs(Number.dsep.toRegExp()) >= 1;
		if (!prevent) FD.Selection.charAtCaretPos(el, Number.dsep);
		if (Browser.ie) {
			e.returnValue = false;
		} else if (el.selectionStart || el.selectionStart == '0') {
			e.preventDefault();
		} else if (typeof e.preventDefault != 'undefined')
			e.preventDefault();

		return false;
	}
	return true;
}

/* elements events */
function ev_kpn(e) { checkNumber(e, 2, 'onkeypress'); } //onKeypress Number
function ev_fn(el, e) { // onFocus Number
	var val = el.value, pos = 0, occurs, moved, start;
	if (FD.Browser.ie && document.selection) {
		moved = document.selection.createRange().moveEnd('character', 200);
		start = val.left(val.length - moved);
		pos = val.length - moved - start.occurs(Number.tsep);
	} else {
		moved = el.selectionStart;
		start = val.left(moved);
		pos = moved - start.occurs(Number.tsep);
	}
	//$('wrange').value = 'start=' + start + '; ' + moved + '; pos=' + pos;
	el.value = String.format('number', el.value, true, true);
	FD.Selection.setCaretToPos(el, pos);
}

FD.Selection = {
	_el: null,
	charAtCaretPos: function () {
		var el = (arguments.length > 1 ? arguments[0] : this._el), chr = (arguments.length > 1 ? arguments[1] : arguments[0]);
		this._el = el;
		if (FD.Browser.ie && document.selection) {
			document.selection.createRange().text = chr;
		} else {
			var startPos = el.selectionStart, endPos = el.selectionEnd;
			el.value = el.value.substring(0, startPos) + chr + el.value.substring(endPos, el.value.length);
			this.setCaretToPos(el, startPos + chr.length);
		}
		return this;
	},
	getCaretPos: function () {
		var el = (arguments.length > 0 && Object.is(arguments[0]) ? arguments[0] : this._el), fromRight = (arguments.length > 1 ? arguments[1] : (Boolean.is(arguments[0]) ? arguments[0] : false));
		this._el = el;
		var moved, pos = 0;
		if (FD.Browser.ie && document.selection) {
			var range = document.selection.createRange();
			moved = range.moveEnd('character', 200);
			pos = el.value.length - moved;
			range.collapse(true);
		} else {
			try { pos = el.selectionStart; } catch (e) { pos = 0; }
		}
		if (fromRight) pos = el.value.length - pos;
		return pos;
	},
	getSelection: function (el) {
		if ('selectionStart' in el) {
			var l = el.selectionEnd - el.selectionStart;
			return { start: el.selectionStart, end: el.selectionEnd, length: l, text: el.value.substr(el.selectionStart, l) };
		} else if (document.selection) {
			var r = document.selection.createRange();
			if (r === null) {
				return { start: 0, end: e.value.length, length: 0, text: '' }
			}

			var re = el.createTextRange();
			var rc = re.duplicate();
			re.moveToBookmark(r.getBookmark());
			rc.setEndPoint('EndToStart', re);

			return { start: rc.text.length, end: rc.text.length + r.text.length, length: r.text.length, text: r.text };
		} else {
			return { start: 0, end: e.value.length, length: 0, text: '' }
		}
	},
	setRange: function (el, selectionStart, selectionEnd) {
		var i = (arguments.length > 2 ? 1 : 0), el = (i > 0 ? arguments[0] : this._el), selectionStart = arguments[i], selectionEnd = arguments[i + 1];
		this._el = el;
		if (el.setSelectionRange) {
			el.focus();
			try { el.setSelectionRange(selectionStart, selectionEnd); } catch (e) { };
		} else if (el.createTextRange) {
			var range = el.createTextRange();
			range.collapse(true);
			range.moveEnd('character', selectionEnd);
			range.moveStart('character', selectionStart);
			range.select();
		}
		return this;
	},
	setCaretToEnd: function (el) {
		el = el || this._el;
		return this.setRange(el, el.value.length, el.value.length);
	},
	setCaretToBegin: function () {
		return this.setRange((arguments.length > 0 ? arguments[0] : this._el), 0, 0);
	},
	setCaretToPos: function () {
		var pos = (arguments.length > 1 ? arguments[1] : arguments[0])
		return this.setRange((arguments.length > 1 ? arguments[0] : this._el), pos, pos);
	},
	selectString: function () {
		var el = (arguments.length > 1 ? arguments[0] : this._el), string = (arguments.length > 1 ? arguments[1] : arguments[0]);
		this._el = el;
		var match = new RegExp(string.toRegExp(), "i").exec(el.value);
		if (match) {
			this.setRange(el, match.index, match.index + match[0].length);
		}
		return this;
	},
	emptySelection: function (el) {
		var el = (arguments.length > 0 ? arguments[0] : this._el);
		this._el = el;
		if (FD.Browser.ie && document.selection) {
			if (document.selection.type == 'Text') {
				document.selection.clear();
			}
		} else if (el.selectionStart != el.selectionEnd) {
			var start = el.selectionStart;
			el.value = el.value.left(el.selectionStart) + el.value.substr(el.selectionEnd);
			this.setRange(el, start, start); //this.setCaretToPos(el, start);
		}
		return this;
	},
	empty: function () {
		if (window.getSelection) {
			try {
				if (!window.getSelection().isCollapsed) {
					if (window.getSelection().removeAllRanges) {  // Firefox, IE >= 11
						window.getSelection().removeAllRanges();
					} else if (window.getSelection().empty) {  // Chrome
						window.getSelection().empty();
					}
				}
			} catch (e) { }
		} else if (document.selection) {  // IE?
			try { document.selection.empty(); } catch (e) { }
		}
	}
};
//<--

var FDRange = FD.Range = {
	Init: function (el, e) {
		if (!(el instanceof jQuery)) el = $(el);
		if (el.data('initRange') === true) return;
		el.data('initRange', true);

		el.on('keyup.range focus.range click.range', FDRange.Set);
		if (arguments.length > 1) FD.Range.Set(e);

		/*if (el instanceof jQuery) el = el[0];
		if (el.initRange) return;
		el.initRange = true;
		addEventHandler(el, 'onkeyup', FDRange.Set);
		addEventHandler(el, 'onfocus', FDRange.Set);
		addEventHandler(el, 'onclick', FDRange.Set);
		if (arguments.length > 1) FD.Range.Set(e);*/
	},
	Set: function (e) {
		var el = checkEvent(e || window.event);
		if (FD.Browser.ie && document.selection) {
			el.range = null;
			el.range = document.selection.createRange();;
		} else if (el.setSelectionRange) {
			$(el).data('caretPos', el.selectionStart);
		}
	},
	Paste: function (el, text) {
		var self = $(el);
		//String.log('caretPos=' + self.data('caretPos'));

		if (FD.Browser.ie && el.range) {
			el.range.text = text;
		} else if (el.setSelectionRange && typeof self.data('caretPos') != 'undefined') {
			var pos = self.data('caretPos');
			el.value = el.value.substr(0, pos) + text + el.value.substr(pos);
			self.data('caretPos', pos + text.length);
		} else {
			el.value = el.value + text;
		}
	}
};

var FDItemType = {

	TEXT: 1,
	NUMERIC: 2,
	DATE: 3,
	CHECKBOX: 4,
	CHECKBOXGROUP: 5,
	RADIOGROUP: 6,
	SELECT: 7,
	LINE: 8,
	COMMENT: 9,
	TEXTAREA: 11,
	SPACE: 12,
	EMAIL: 13,
	URL: 13,
	IMAGE: 14,
	CALCULATION: 15,
	PAGE: 16,
	FILE: 17,
	OTHER: 19,
	USERLIST: 20,

	toNumber: function (type) {
		switch (type) {
			case 'text':
				return this.TEXT;
			case 'number':
			case 'numeric':
			case 'int':
			case 'float':
				return this.NUMERIC;
			case 'checkbox':
				return this.CHECKBOXGROUP; // or this.CHECKBOX
			case 'radio':
				return this.RADIOGROUP;
		}
		return -1;
	}

};

var FDItem = new Class({

	Extends: FDBaseClass,
	Implements: Events,
	_class: 'FDItem',

	_org: null,
	_hidden: false,
	_disabled: false,
	_readOnly: false,
	_featureCache: [],
	_trace: true,

	_properties: {
		id: 0,
		name: '',
		type: 0,
		input: false,
		required: false,
		disp: 0,
		align: 0,
		ntpi: false,
		stpi: false,
		nas: false,
		page: 0,
		features: 0,
		inv: []
	},
	_mappings: {
		identifier: 'name',
		id_itemtype: 'type',
	},

	initialize: function (item) {
		this.parent();
		this._org = item;
		this.reset(item);
		//		Object.extend(this, item);
	},

	reset: function (item) {
		var props = this._properties, prop;
		for (var prop in props) {
			if (prop != 'page') { // exclude the page property from resetting. resetting an item does not affect the position.
				this[prop] = props[prop];
			}
		}
		if (item) {
			var mapping;
			for (var prop in item) {

				if (this._mappings[prop]) mapping = this._mappings[prop];
				else mapping = prop;

				this[mapping] = item[prop];
			}
		}

		this._featureCache = [];
		this._trace = true;

		//this.log(['.reset', item, this]);
		return this;
	}

}).extend({
	TEXT: 1,
	NUMERIC: 2,
	DATE: 3,
	CHECKBOX: 4,
	CHECKBOXGROUP: 5,
	RADIOGROUP: 6,
	SELECT: 7,
	LINE: 8,
	COMMENT: 9,
	TEXTAREA: 11,
	SPACE: 12,
	EMAIL: 13,
	URL: 13,
	IMAGE: 14,
	CALCULATION: 15,
	PAGE: 16,
	FILE: 17,
	OTHER: 19,
	USERLIST: 20,
	DEFORMATTED: 1, TYPED: 2, NODE: 4, READDISABLED: 8,
	DISPLAY_HIDDEN: true, DISPLAY_VISIBLE: false,
	features: {
		ALL: -1,
		CALCULATION: 1,
		DEPENDENCY: 2,
		VALIDATION: 4,
		LOOKUP: 8,
		WORKFLOW: 16,
		has: function (feature, features) {
			return features == this.ALL || (features & this[feature.toUpperCase()]) != 0;
		}
	},
	isInput: function (type) {
		return !type.list(FDItem.COMMENT, FDItem.SPACE, FDItem.LINE, FDItem.IMAGE, FDItem.PAGE);
	}
});

var FDItemsMap = new Class({

	Extends: FDObjectsMap,
	_class: 'FDItemsMap',

});

var FDItems = new Class({

	Extends: FDObjects,
	_class: 'FDItems',

	_itemClass: FDItem,
	_itemsMapClass: FDItemsMap,

	search: function () {
		var args = $A(arguments), index = (args.length > 1 ? 1 : 0), search = args[index];
		if (String.is(search) && /\//.test(search)) args[index] = search.match(/[^\/]*/)[0];
		return this.parent.apply(this, args);
	},
	get: function () {
		var item = this.search(arguments[0]);
		//var prop = (typeof arguments[0] == 'string' ? 'name' : 'id'), search = arguments[0];
		var ret = (arguments.length > 1 ? arguments[1] : (typeof arguments[0] == 'string' ? 'id' : 'name'));
		return (item ? item[ret] : (ret == 'id' ? 0 : (ret == 'name' ? '' : null)));
	},
	getId: function (search) {
		return this.get(search, 'id');
	},
	getName: function (search) {
		return this.get(search, 'name');
	},

	selectByType: function (type) {
		var args = $A(arguments), map = new FDItemsMap();
		for (var i = 0, len = this.length; i < len; i++) {
			if (args.seek(this[i].type)) {
				map.push(this[i]);
			}
		}
		return map;
	}

}).extend({

	create: function () {
		this.instance = new FDItems();
		if (arguments.length == 1 && Array.is(arguments[0])) {
			this.instance.push.apply(this.instance, arguments[0]);
		} else {
			this.instance.push.apply(this.instance, arguments);
		}
		return this.instance;
	},
	search: function (item) {
		return this.instance.search(item);
	},
	get: function () {
		return this.instance.get.apply(this.instance, arguments);
	}

});

function preloadImage(img, arr) {
	var oImg;
	try { oImg = new Image(); } catch (e) { oImg = document.createElement('IMG'); }
	oImg.src = img;
	if (typeof arr == 'undefined') {
		if (typeof window.preloadImg == 'undefined') window.preloadImg = new Array(oImg);
		else window.preloadImg.push(oImg);
	} else
		arr.push(oImg);

	return oImg;
}

function getIDoc() {
	var idoc = null, args = $A(arguments), doc, frm;
	doc = (arguments.length > 1 ? args.shift() || document : document);
	//if (FD.Browser.ie) idoc = doc.frames[args[0]].document;
	idoc = FD.get(args[0], doc).contentDocument;
	return idoc;
}

function hideControl(cpTagName, opTopControl) {
	if (FD.Browser.gecko || (FD.Browser.ie && FD.Browser.version >= 7) || FD.Browser.WebKit) return;
	var x = getX(opTopControl), y = getY(opTopControl), w = opTopControl.offsetWidth, h = opTopControl.offsetHeight, i, obj;
	var list = (opTopControl.ownerDocument ? opTopControl.ownerDocument : document).getElementsByTagName(cpTagName);
	for (i = 0; i < list.length; i++) {
		obj = list[i];
		if (!obj || !obj.offsetParent) continue;
		var ox = getX(obj), oy = getY(obj), ow = obj.offsetWidth, oh = obj.offsetHeight;
		if (ox > (x + w) || (ox + ow) < x) continue;
		if (oy > (y + h) || (oy + oh) < y) continue;
		if (obj.style.visibility == "hidden") continue;
		if (!opTopControl.fdOverlap) opTopControl.fdOverlap = new Array();
		opTopControl.fdOverlap.push(obj);
		obj.style.visibility = "hidden";
	}
	return (opTopControl.fdOverlap ? opTopControl.fdOverlap.length : 0);
}
function showControl(opTopControl) {
	if (opTopControl.fdOverlap) {
		var i;
		for (i = 0; i < opTopControl.fdOverlap.length; i++)
			opTopControl.fdOverlap[i].style.visibility = "";
	}
	opTopControl.fdOverlap = null;
}
function getX(obj, excl) {
	var x = 0;
	do {
		x += obj.offsetLeft;
		if (!FD.Browser.ie) {
			if (!excl && obj.parentNode && obj.parentNode.scrollLeft) x -= obj.parentNode.scrollLeft;
		} else {
			if (obj.parentNode && obj.parentNode.currentStyle && obj.parentNode.currentStyle.borderWidth) x += String.create(obj.parentNode.currentStyle.borderWidth).float();
		}
		if (!excl && obj.scrollLeft) x -= obj.scrollLeft;
		if (!FD.Browser.ie && obj.nodeType == 1 /* NODE_ELEMENT */ && window.getComputedStyle(obj, null).getPropertyValue('position') == 'absolute') break;
		obj = obj.offsetParent;
	} while (obj && obj.nodeType == 1 /* NODE_ELEMENT */);
	return x;
}
function getY(obj, excl) {
	try {
		var y = 0, trans = (document.doctype && /transitional/ig.test(document.doctype.publicId));
		do {
			y += obj.offsetTop;
			if (!Browser.ie) {
				if (!excl && (!Browser.gecko || Browser.version >= 2) && obj.parentNode && obj.parentNode.scrollTop) y -= obj.parentNode.scrollTop;
				if (trans) y -= (parseInt(window.getComputedStyle(obj, null).getPropertyValue('padding-top')) + parseInt(window.getComputedStyle(obj, null).getPropertyValue('margin-top')));
			} else {
				if (obj.parentNode && obj.parentNode.currentStyle && obj.parentNode.currentStyle.borderWidth) y += String.create(obj.parentNode.currentStyle.borderWidth).float();
			}
			if (!excl && obj.scrollTop) y -= obj.scrollTop;
			if (!Browser.ie && obj.nodeType == 1 /* NODE_ELEMENT */ && window.getComputedStyle(obj, null).getPropertyValue('position') == 'absolute') break;
			obj = obj.offsetParent;
		} while (obj && obj.nodeType == 1 /* NODE_ELEMENT */);
	} catch (e) {
		String.log(["getY Error, message=" + (e.message || e), obj], "error");
	}
	return y;
}

function fireEvent(el, cpName, opEvent, lpCreate) {
	if (cpName == 'onresize') {
		try { window.resizeBy(0, 1); window.resizeBy(0, -1); } catch (e) { }
	} else {
		if (String.is(el)) el = FD.get(el);
		if (FD.Browser.ie && FD.Browser.version < 11) {
			//top.DEBUG.log('fireevent');
			if (FD.Browser.version >= 5.5) {
				if (lpCreate) {
					opEvent = document.createEventObject();
					opEvent.fdElement = el;
					opEvent.type = cpName.substr(2);
				} else {
					//top.DEBUG.log('fireevent');
					try {
						el.fireEvent(cpName, (opEvent ? opEvent : null));
					} catch (e) { top.DEBUG.log(e.message); }
				}
			} else
				opEvent = fireEventFD(el, cpName, opEvent, lpCreate);
		} else if (FD.Browser.W3C) {
			try {
				if (!opEvent) {
					var doc = (el.ownerDocument ? el.ownerDocument : (el.document ? el.document : el));
					if (doc.createEvent) {
						opEvent = doc.createEvent((FD.Browser.safari ? "UIEvents" : "Events"));
					} else if (doc.createEventObject) {
						opEvent = document.createEventObject();
						opEvent.fdElement = el;
						opEvent.type = cpName.substr(2);
					}
				}
				opEvent.initEvent(cpName.substr(2), true, false);
				if (lpCreate)
					opEvent.fdElement = el;
				else
					el.dispatchEvent(opEvent);

			} catch (e) {
				String.log('name=' + cpName, 'error');
				alert('oei, ' + e.message);
			}
		} else
			opEvent = fireEventFD(el, cpName, opEvent, lpCreate);
	}
	return (opEvent);
}
function cloneEvent(e) {
	if (!e) e = window.fdEvent || window.event;
	if (typeof e.fdElement != 'undefined') return e;
	var clone = Object.clone(e);
	clone.fdElement = clone.srcElement = clone.target = (e.srcElement || e.target);
	return (clone);
}
function checkEvent(e) {
	if (!e) e = window.fdEvent || window.event;
	window.fdEvent = null;
	var el = null;
	if (e) {
		if (e.fdElement)
			el = e.fdElement;
		else if (e.srcElement) {
			el = e.srcElement;
		} else
			el = e.target;
	}
	return (el);
}
function cancelEvent(e) {
	if (!e) return;
	stopEvent(e);
	if (e.preventDefault)
		e.preventDefault();
	e.returnValue = false;
}
function stopEvent(e) {
	if (!e) return;
	try {
		if (e.stopPropagation)
			e.stopPropagation();
		e.cancelBubble = true;
	} catch (e) { };
}



/* depricated functions */

//--> 20-07-2015

Function.depricated('layerMove', function (opDoc, vpEl, npX, npY) {
	var oEl = FD.get(vpEl, opDoc);
	if (!Object.is(oEl)) return;
	if (FD.Browser.ie || FD.Browser.W3C)
		oEl = oEl.style;
	oEl.left = npX + 'px';
	oEl.top = npY + 'px';
}, 'use jQuery instead');
// deprecated; use layerMove instead
Function.depricated('moveLayer', function (opDoc, vpEl, npX, npY) {
	top.status = 'Function moveLayer is deprecated. Please, use layerMove instead.';
	layerMove(opDoc, vpEl, npX, npY);
}, 'use jQuery instead');

Function.depricated('layerWrite', function (doc, el, html) {
	try {
		el = FD.get(el, doc);
		if (!Object.is(el)) return;
		if (typeof el[0] == 'object') {
			for (var i = 0; i < el.length; i++)
				layerWrite(null, el[i], html);
		} else {
			if (typeof el.innerHTML != 'undefined')
				el.innerHTML = html;
		}
	} catch (e) { alert('layerWrite:\r\n' + (e.message ? e.message : e)); }
}, 'use jQuery instead');
// deprecated; use layerWrite instead
Function.depricated('WriteToLayer', function (opDocument, vpElement, cpHTML) {
	top.status = 'Function WriteToLayer is deprecated. Please, use layerWrite instead.';
	layerWrite(opDocument, vpElement, cpHTML);
}, 'use jQuery instead');

Function.depricated('getCookies', function (cookies) {
	FD.Debug.deprecated(getCookies, 'deprecated! use FD.Cookie.getAll instead');
	return FD.Cookie.getAll((arguments.length > 0 ? cookies : null));
}, 'use FDCookieHandler instead');
Function.depricated('getCookie', function (cookies, cookie) {
	FD.Debug.deprecated(getCookie, 'deprecated! use FD.Cookie.Get instead');
	return FD.Cookie.Get(cookie, cookies);
}, 'use FDCookieHandler instead');

//Function.depricated('arraySearch', 
function arraySearch(apArray, vpSearchFor, npColumn, npColumns, npStart) {

	if (apArray.length == 0) return -1;
	npColumn = (typeof npColumn == 'undefined') ? 0 : npColumn;
	npColumns = (typeof npColumns == 'undefined') ? 1 : npColumns;
	npStart = (typeof npStart == 'undefined') ? 0 : npStart;
	var i = 0, l2d = (Object.is(apArray[0]) && typeof apArray[0][0] != 'undefined');
	if (l2d) {
		for (i = npStart; i < apArray.length; i++) {
			if ((typeof apArray[i][npColumn] == 'string' && apArray[i][npColumn].toUpperCase() == String(vpSearchFor).toUpperCase()) || apArray[i][npColumn] == vpSearchFor)
				return i;
		}
	} else {
		for (i = npStart + npColumn; i < apArray.length; i = i + npColumns) {
			if ((typeof apArray[i] == 'string' && apArray[i].toUpperCase() == String(vpSearchFor).toUpperCase()) || apArray[i] == vpSearchFor)
				return i;
		}
	}
	return -1;
}//, 'use array prototypes instead');

Function.depricated('arrayDelete', function (apArray, npIndexFrom, npIndexTo) {
	if (npIndexFrom < 0) return apArray;
	npIndexTo = npIndexFrom + (typeof npIndexTo == 'undefined' ? 1 : npIndexTo);
	var aTemp = null;
	if (apArray.length == 1 && npIndexFrom == 0)
		aTemp = new Array();
	else {
		if (npIndexFrom > 0)
			aTemp = apArray.slice(0, npIndexFrom);
		if (npIndexFrom >= 0 && npIndexFrom < apArray.length - 1)
			aTemp = (aTemp != null ? aTemp.concat(apArray.slice(npIndexTo)) : apArray.slice(npIndexTo));
	}

	return (aTemp);
}, 'use array prototypes instead');

Function.depricated('arrayMove', function (apArray, npFrom, npTo) {
	if (npFrom == npTo) return apArray;

	var vElement = apArray[npFrom], i = 0;
	if (npFrom < npTo) {
		for (i = npFrom; i < npTo; i++)
			apArray[i] = apArray[i + 1];
	} else {
		for (i = npFrom; i > npTo; i--)
			apArray[i] = apArray[i - 1];
	}
	apArray[npTo] = vElement;

	return apArray;
}, 'use array prototypes instead');

Function.depricated('arraySort', function (apArray, npColl) {
	var i = 0, j = 0, nIndex = 0, lColl = typeof (npColl) == 'number';
	for (i = 0; i < apArray.length; i++) {
		nIndex = i;
		for (j = i; j < apArray.length - 1; j++) {
			if (lColl) {
				if (apArray[j + 1][npColl] < apArray[nIndex][npColl]) nIndex = j + 1;
			} else if (apArray[j + 1] < apArray[nIndex]) nIndex = j + 1;
		}
		arrayMove(apArray, nIndex, i);
	}

	return apArray;
}, 'use array prototypes instead');

//-- This script and many more are available free online at -->
//-- The JavaScript Source!! http://javascript.internet.com -->
Function.depricated('emailCheck', function (emailStr) {
	if (emailStr.length == 0) return 0;
	emailStr = String.create(emailStr).rtrim();
	var nPos = CheckChars(emailStr, 1, new String(aCharCodes) + ',39');
	if (nPos >= 0) return nPos + 1;

	var emailPat = /^(.+)@(.+)$/, specialChars = "\\(\\)<>@,;:\\\\\\\"\\.\\[\\]", validChars = "\[^\\s" + specialChars + "\]", quotedUser = "(\"[^\"]*\")", ipDomainPat = /^\[(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\]$/;
	var atom = validChars + '+', word = "(" + atom + "|" + quotedUser + ")", userPat = new RegExp("^" + word + "(\\." + word + ")*$"), domainPat = new RegExp("^" + atom + "(\\." + atom + ")*$");
	var matchArray = emailStr.match(emailPat)
	if (matchArray == null)
		return -1

	var user = matchArray[1], domain = matchArray[2];
	// See if "user" is valid 
	if (user.match(userPat) == null)
		return -2

	var IPArray = domain.match(ipDomainPat)
	if (IPArray != null) {
		for (var i = 1; i <= 4; i++) { if (IPArray[i] > 255) { return -3 } }
		return 0
	}

	// Domain is symbolic name
	var domainArray = domain.match(domainPat)
	if (domainArray == null)
		return -4

	var atomPat = new RegExp(atom, "g"), domArr = domain.match(atomPat), len = domArr.length;
	if (!domArr[domArr.length - 1].length.between(2, 6))
		return -5

	// Make sure there's a host name preceding the domain.
	if (len < 2)
		return -6

	// If we've gotten this far, everything's valid!
	return 0;
}, 'FDEmailAddress.validate');

Function.depricated('getLocationVars', function (location, decode) {
	// de pagina en de parameters scheiden
	var loc = location.split('?'), bookmark = '';
	decode = decode || false;
	// de parameters scheiden
	if (loc.length > 1) {
		var bm = loc[1].search('#');
		if (bm >= 0) {
			bookmark = loc[1].substr(bm);
			loc[1] = loc[1].substr(0, bm);
		}
		loc[1] = new FDKeys(loc[1].split('&'), { decode: decode });
	} else
		loc[1] = new FDKeys();

	if (bookmark.length > 0)
		loc[1][loc[1].length] = new Array(bookmark);

	loc.get = function (name, alt, type) {
		return this[1].get(name, alt, type);
	}
	loc.exist = function (name) {
		return this[1].exist(name);
	}
	loc.set = function (name, value) {
		return this[1].set(name, value);
	}
	loc.remove = function (name) {
		this[1].remove(name);
	}
	loc.setVersion = function (version) {
		this.removeVersion();
		this[1].set(version, '');
	}
	loc.removeVersion = function () {
		var params = this[1];
		for (var i = 0; i < params.length; i++) {
			if (/([\d]+)v([\d]+)\.([\d]+)\.([\d]+)/.test(params[i][0])) params.remove(i);
		}
	}
	loc.merge = function (vars) {
		this[1].merge(vars);
		return this;
	}
	loc.toString = function (nobookmark) {
		return this[0].append(this[1].toString(!nobookmark), '?');
	}
	return loc;
}, 'use FDUri instead');

Function.depricated('getURI', function (url) {
	return getLocationVars(url, true);
}, 'use FDUri instead');

Function.depricated('getLocationVar', function (location, qvar) {
	var vars = (Array.is(location) ? location : getLocationVars(location, true));
	return vars.get(qvar, false);
}, 'use FDUri instead');

Function.depricated('setLocationVars', function (location, vars, nobookmark) {
	// de pagina en de parameters scheiden
	var loc = (Array.is(location) ? location : getLocationVars(location, true));

	// zoeken en vervangen/toevoegen van de meegegeven parameter/waarde array
	if (vars) loc[1].merge(vars);

	// de locatiestring weer opbouwen
	location = loc[0] + '?' + loc[1].toString(!nobookmark);

	return (location);
}, 'use FDUri instead');

Function.depricated('delLocationVars', function (location, vars) {
	// de pagina en de parameters scheiden; de parameters scheiden
	var loc = location.split('?'), qvars = (loc.length > 1) ? loc[1].split('&') : new Array();

	// de parameters en de waarden scheiden
	var i, nIndex = -1;
	for (i = 0; i < qvars.length; i++)
		qvars[i] = qvars[i].split('=');

	// de locatiestring weer opbouwen
	location = loc[0] + '?';
	for (i = 0; i < qvars.length; i++) {
		if (arraySearch(vars, qvars[i][0], 0) == -1) {
			location = location + ((i > 0) ? '&' : '') +
				qvars[i][0] + ((qvars[i][0].length > 0) ? '=' : '') + qvars[i][1];
		}
	}
	return location;
}, 'use FDUri instead');

Function.depricated('checkMain', function (params) {
	if (document.location.search.search('newwindow') == -1) {
		try {
			if (self.name != 'frmMain') {
				var loc = '/?', href = document.location.href, vars = getLocationVars(href);
				var lang = (vars.get('lang') || params.lang);
				if (lang) loc += 'lang=' + lang + '&';
				var id_aff = (Number.int(vars.get('id_aff')) || params.id_aff);
				if (id_aff) loc += 'id_aff=' + id_aff + '&';
				var kw = (vars.get('keyword') || params.keyword);
				if (kw) loc += 'keyword=' + kw + '&';
				if (params.url_params) href = setLocationVars(href, params.url_params);
				top.location = loc + 'frmMain=' + URLEncode(href);
			} else {
				switch (params.type) {
					case 'menu':
						this.menuItem = params.item;
						if (parent.frames[1].menuSelect)
							parent.frames[1].menuSelect(this.menuItem);
						break;
					case 'landing':
						top.setLandingOption(document.location.href, params.text);
						break;
				}
			}
		} catch (e) { }
	}
}, 'Remove function');
Function.depricated('Register', function (lang, id_aff) {
	document.location = '/?action=2&nextstep=1&lang=' + (lang || getLang()) + (id_aff ? '&id_aff=' + id_aff : '');
}, 'Remove function');
Function.depricated('getLang', function () {
	var nLang = Number.int(getLocationVar(document.location.href, 'lang'));
	if (nLang == 0) {
		var aHost = document.location.hostname.split('.');
		switch (aHost[aHost.length - 1]) {
			case 'nl': nLang = 1; break;
			case 'com': nLang = 2; break;
			case 'co.uk': nLang = 2; break;
			case 'de': nLang = 4; break;
			case 'net': nLang = 1; break;
		}
	}
	return nLang;
}, 'Remove function');

/*
Function.depricated('setStatus', function (cpStatus, opWnd) {
	var lGlobal = false;
	try { lGlobal = (Object.is(top.Global)); } catch (e) { }
	opWnd = opWnd || window;
	opWnd.status = ((lGlobal) ? top.Global.Status : '') + ((typeof cpStatus == 'string' && cpStatus != '') ? ((lGlobal) ? ': ' : '') + cpStatus : '');
	return true;
}, 'Remove function');
*/
function setStatus() {; } // just an empty function for the WK which uses this function in the wkamer.dll

Function.depricated('addActionVar', function (opForm, cpVar, lpReplace) {
	var aAction = opForm.action.split('?');
	var cAction = aAction[0] + ((lpReplace || aAction.length == 1) ? '?' : aAction[1] + '&') + cpVar;
	opForm.action = cAction;
}, 'Remove function');

//<-- 20-07-2015

Function.depricated('rgb2Hex', function (rgb) {
	var aRGB = rgb.split(','), num, hex = '#', base, rem, val;
	if (aRGB.length != 3) return '';
	for (var i = 0; i < 3; i++) {
		num = parseInt(aRGB[i]);
		if (isNaN(num) || num < 0 || num > 255) return '';
		base = num / 16;
		rem = num % 16;
		val = (makeHex(base - (rem / 16)) + makeHex(rem)).toString();
		if (val.length < 2) val = '0' + val;
		hex += val;
	}
	return (hex);
}, 'FDColor.toHex');

Function.depricated('makeHex', function (x) {
	if ((x >= 0) && (x <= 9))
		return x;
	else {
		switch (x) {
			case 10: return "A";
			case 11: return "B";
			case 12: return "C";
			case 13: return "D";
			case 14: return "E";
			case 15: return "F";
		}
	}
}, 'FDColor.toHex');

Function.depricated('checkColor', function (color) {
	return FDColor.validate(color);
}, 'FDColor.validate');

Function.depricated('colorCheck', function (color) {
	return FDColor.validate(color);
}, 'FDColor.validate');

//-------
// convert calendar to Julian date
// (Julian day number algorithm adopted from Press et al.)
//-------
Function.depricated('getDateToJulian', function () {
	FD.Debug.deprecated(getDateToJulian, 'deprecated! use FD.Date.toJulian instead');
	return FD.Date.toJulian(arguments);
}, 'FD.Date.toJulian');
//-------
// convert Julian date to calendar date
// (algorithm adopted from Press et al.)
//-------
Function.depricated('getJulianToDate', function (jd) {
	FD.Debug.deprecated(getJulianToDate, 'deprecated! use FD.Date.fromJulian instead');
	return FD.Date.fromJulian(jd);
}, 'FD.Date.fromJulian');
Function.depricated('getLastDayOfMonth', function (dpDate) {
	FD.Debug.deprecated(getLastDayOfMonth, 'deprecated! use FD.Date.getLastDayOfMonth instead');
	return FD.Date.getLastDayOfMonth(dpDate);
}, 'FD.Date.getLastDayOfMonth');
Function.depricated('getWeek', function (year, month, day, firstDay) {
	FD.Debug.deprecated(getWeek, 'deprecated! use FD.Date.getWeek instead');
	return FD.Date.getWeek(year, month, day, firstDay);
}, 'FD.Date.getWeek');
Function.depricated('getDateToWeek', function (dpDate, iso) {
	FD.Debug.deprecated(getDateToWeek, 'deprecated! use FD.Date.toWeek instead');
	return FD.Date.toWeek(dpDate, iso);
}, 'FD.Date.toWeek');
Function.depricated('getWeekToDate', function (npWeek, npDOW, npYear) {
	FD.Debug.deprecated(getWeekToDate, 'deprecated! use FD.Date.fromWeek instead');
	return FD.Date.fromWeek(npWeek, npDOW, npYear);
}, 'FD.Date.fromWeek');
Function.depricated('formatDate', function (dpDate, cpFormat) {
	FD.Debug.deprecated(formatDate, 'deprecated! use FD.Date.Format instead');
	return FD.Date.Format(dpDate, cpFormat);
}, 'FD.Date.Format');

Function.depricated('setBorderStyle', function (el, style) {
	if (Object.is(el) && typeof el.style != 'undefined') {
		el.style.borderStyle = style;
	}
});
Function.depricated('setBorder', function (el, border) {
	if (Object.is(el) && typeof el.style != 'undefined') {
		el.style.border = border;
	}
});
Function.depricated('setBorderColor', function (el, color) {
	if (Object.is(el) && typeof el.style != 'undefined') {
		el.style.borderColor = color;
	}
});
Function.depricated('setBackgroundColor', function (el, color) {
	if (Object.is(el) && typeof el.style != 'undefined') {
		el.style.backgroundColor = color;
	}
});
Function.depricated('setBorderWidth', function (el, width) {
	if (Object.is(el) && typeof el.style != 'undefined') {
		el.style.borderWidth = (width + (Number.is(width) ? 'px' : ''));
	}
});

Function.depricated('setCheckedRadio', function (doc, el, val) {
	FD.Debug.deprecated(setCheckedRadio, 'deprecated! use setSelectedOption instead');
	setSelectedOption(doc, el, val);
}, 'setSelectedOption');
Function.depricated('getCheckedRadio', function (opDoc, vpObject, vpExpr) {
	return getSelectedOption(opDoc, vpObject, vpExpr);
}, 'FD.selected');

Function.depricated('getSelectedOption', function (opDoc, vpObject, vpExpr) {
	FD.Debug.deprecated(getSelectedOption, '(vpExpr=' + vpExpr + ') deprecated! use FD.selected(el, \'' + (vpExpr == 2 ? 'index' : (vpExpr ? 'value' : 'option')) + '\') instead');
	var oEl = FD.get(vpObject, opDoc);
	return FD.selected(oEl, (vpExpr == 2 ? 'index' : (vpExpr ? 'value' : 'option')));
}, 'FD.selected');

Function.depricated('charAtCaretPos', function (el, chr) { FD.Selection.charAtCaretPos(el, chr); }, 'FD.Selection.charAtCaretPos');
Function.depricated('getCaretPos', function (el, fromRight) { return FD.Selection.getCaretPos(el, fromRight); }, 'FD.Selection.getCatetPos');
Function.depricated('setSelectionRange', function (el, selectionStart, selectionEnd) { FD.Selection.setRange(el, selectionStart, selectionEnd); }, 'FD.Selection.setRange');
Function.depricated('setCaretToEnd', function (el) { FD.Selection.setCaretToEnd(el); }, 'FD.Selection.setCaretToEnd');
Function.depricated('setCaretToBegin', function (el) { FD.Selection.setCaretToBegin(el); }, 'FD.Selection.setCaretToBegin');
Function.depricated('setCaretToPos', function (el, pos) { FD.Selection.setCaretToPos(el, pos); }, 'FD.Selection.setCaretToPos');
Function.depricated('selectString', function (el, string) { FD.Selection.selectString(el, string); }, 'FD.Selection.selectString');
Function.depricated('emptySelection', function (el) { FD.Selection.emptySelection(el); }, 'FD.Selection.emptySelection');

Function.depricated('emptyStr', function (str) {
	return String.create(str).empty();
}, 'String.empty');

Function.depricated('emptyNum', function (npNumber) {
	return parseFloat(npNumber) == 0;
});

Function.depricated('allTrim', function (str, lpCRLF) {
	return String.create(str).trim();
}, 'String.trim');

Function.depricated('rTrim', function (str, lpCRLF) {
	return String.create(str).rtrim();
}, 'String.rtrim');

Function.depricated('lTrim', function (str, lpCRLF) {
	return String.create(str).ltrim();
}, 'String.ltrim');

Function.depricated('padL', function (str, len, chr) {
	FD.Debug.deprecated(padL, 'deprecated! use String.padl instead');
	return String.create(str).padl(len, chr);
}, 'String.padl');

Function.depricated('padR', function (str, len, chr) {
	return String.create(str).padr(len, chr);
}, 'String.padr');

Function.depricated('parseIntEx', function (str) {
	return String.create(str).int();
}, 'Number.int or String.int');

Function.depricated('parseFloatEx', function (str) {
	return String.create(str).float();
}, 'Number.float or String.float');


String.log('SCRIPT LOADED: fd_general.js');

var __FD_GENERAL = true;
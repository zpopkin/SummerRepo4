
var FDAjaxUtils = new Class({

	Extends: FDBaseClass,
	_class: 'FDAjaxUtils',

	encodeEntities: function (str) {
		if (str) {
			str = str.replace(/&/g, "&amp;");
			str = str.replace(/</g, "&lt;");
			str = str.replace(/>/g, "&gt;");
			str = str.replace(/"/g, "&quot;");
		}
		return str
	},

	toXML: function (node) {
		if (node.innerXML) {
			return node.innerXML;
		} else if (node.xml) {
			return node.xml;
		} else if (typeof XMLSerializer != "undefined") {
			return (new XMLSerializer()).serializeToString(node);
		} else
			return '';
	},

	toObject: function (node, obj_to) {
		var obj = obj_to || null, child, i, len, type, dt, cnt = 0;

		//this.log('.toObject, childNodes=' + (node.childNodes ? node.childNodes.length : 0), 'group');

		if (node.childNodes) {
			for (i = 0, len = node.childNodes.length; i < len; i++) {
				if (node.childNodes[i].nodeType == 1 /* ELEMENT_NODE */) {
					if (obj == null) obj = {};
					cnt++;
					child = node.childNodes[i];
					dt = child.getAttribute('datatype');
					if (!dt) dt = child.getAttribute('fd:dt');

					//this.log('.toObject, cnt=' + cnt + ', name=' + child.nodeName + ', dt=' + dt);

					//alert(child.nodeName + ', ' + child.childNodes.length + ', ' + child.selectNodes('text()').length);
					if (typeof child.childNodes != 'undefined' && child.childNodes.length > child.selectNodes('text()').length) {
						obj[child.nodeName] = this.toObjectArray(child);
					} else obj[child.nodeName] = AJAX.getNodeValue(child, '', '', dt || '');
				}
			}
		}
		if (cnt == 0) { // no element nodes found
			dt = node.getAttribute('datatype');
			if (!dt) dt = node.getAttribute('fd:dt');

			//this.log('.toObject, name=' + node.nodeName + ', dt=' + dt);
			//this.log('', 'groupEnd');

			return AJAX.getNodeValue(node, '', '', dt || '');
		}

		//this.log('', 'groupEnd');

		return obj;
	},

	toObjectArray: function (node, arr) {
		arr = arr || [];
		if (typeof node.childNodes != 'undefined') {
			for (var i = 0; i < node.childNodes.length; i++) {
				if (node.childNodes[i].nodeType == 1 /* ELEMENT_NODE */) {
					val = this.toObject(node.childNodes[i]);
					if (Object.is(val)) arr.push(val);
					else arr[node.childNodes[i].nodeName] = val;
				}
			}
		} else {
			for (var i = 0; i < node.length; i++) {
				arr.push(this.toObject(node.item(i)));
			}
		}
		return arr;
	},

	NodelistToArray: function (nodelist, type) {
		var arr = [], i, node, childs;
		type = type || 1;
		for (i = 0; i < nodelist.length; i++) {
			node = nodelist[i];
			if (node.hasChildNodes()) {
				childs = node.selectNodes('./*');
				if (childs.length > 1) {
					arr.push(this.NodelistToArray(childs));
				} else {
					arr.push(AJAX.getNodeValue(node, '', '', type));
				}
			} else {
				arr.push(AJAX.getNodeValue(node, '', '', type));
			}
		}
		return arr;
	},

	decodeEntities: function (str) {
		var d = FDAjax.Utils.decodeEntities.div;
		if (!d) {
			d = document.createElement('div');
			FDAjax.Utils.decodeEntities.div = d;
			if (!d) return str;
		}
		d.innerHTML = str;
		if (d.childNodes.length == 1 && d.firstChild.nodeType == 3 /* Node.TEXT_NODE */ && d.firstChild.nextSibling == null)
			str = d.firstChild.data;
		else {
			// Hmmm, innerHTML processing of str produced content
			// we weren't expecting, so just replace entities we
			// expect folks will use in node attributes that contain
			// JavaScript.
			str = str.replace(/&lt;/, "<");
			str = str.replace(/&gt;/, ">");
			str = str.replace(/&quot;/, "\"");
			str = str.replace(/&amp;/, "&");
		}
		return str;
	},

	/** collectFormData - Compiles a string of form data. - brad@xkr.us - 2004-10-20 **/
	collectFormData: function (form, full_checkbox, utf8) {

		var data = new FDKeys(), name, type, elts = [], curr, temp, i, len;

		for (i = form.elements.length - 1; i >= 0; i--) {
			curr = form.elements[i];
			/* successful elements must have a name and must not be disabled */
			if ((curr.name || curr.id) && !curr.disabled) elts.push(curr);
		}

		/* sort elements so same names will be adjacent to each other */
		elts.sort(function (a, b) { return ((a.name < b.name) ? 1 : (a.name == b.name) ? 0 : -1); });

		while (curr = elts.pop()) {

			name = curr.tagName.toLowerCase();
			type = (curr.type ? curr.type.toLowerCase() : '');

			/* handle input[type="radio|checkbox"] */
			if (name == "input" && /^(radio|checkbox)$/.test(type)) {
				do {
					if (curr.checked || curr.selected)
						data.set(curr.name, curr.value);
					else if (full_checkbox && type == 'checkbox')
						data.set(curr.name, 'off');
				} while (elts.length > 0 && elts[elts.length - 1].name == curr.name && (curr = elts.pop()));
			}

			/* handle select[multiple] */
			if (name == "select" && curr.multiple && curr.options) {
				for (i = 0, len = curr.options.length, temp = ''; i < len; i++) {
					if (curr.options[i].selected)
						temp = temp.append(curr.options[i].value, ',');
				}
				data.set(curr.name, temp);
			}
			/* any other element (no file types) */
			else if ((name == "input" && /^(text|password|hidden|number|date)$/.test(type)) || /^(select|textarea)$/.test(name)) {
				data.set(curr.name, curr.value);
			}

			else if (name == 'div' && curr.id) {
				data.set(curr.id, curr.innerHTML);
			}

		}

		return data;

	},

	/**
	Creates an object to emulate a form from the elements string.
	Elements can be a comma delimited string. You can optionally assign name-mappings using the syntax: <element-name>|<mapping-name>.
	This mapping is used when this object is part of a AJAX.Form lookup to map a form-element with a node-name in the xml result.
	**/
	createForm: function (elements) {
		var form = { elements: new Array(), mapping: new Object() }, aEl = (arguments.length > 0 ? elements.split(',') : new Array()), el;
		for (var i = 0; i < aEl.length; i++) {
			aEl[i] = aEl[i].split('|');
			el = document.getElementsByName(aEl[i][0]);
			if (el.length > 0) {
				if (aEl[i].length == 2) form.mapping[aEl[i][0]] = aEl[i][1];
				for (var j = 0; j < el.length; j++) {
					if (el[j].tagName.toLowerCase().list('input', 'select', 'textarea'))
						form.elements.push(el[j]);
				}
			}
		}
		return form;
	},

	/** fillFormData - fills a form with the values of node.childNodes **/
	fillFormData: function (node) {
		var child, el, val, i, tagname;
		child = node.firstChild;
		while (child) {
			if (child.nodeType == FDAjax.Constants.nodeTypes.ELEMENT_NODE) {
				el = document.getElementsByName(child.getAttribute('prefix') + child.nodeName);
				if (!el || el.length == 0) {
					el = document.getElementById(child.getAttribute('prefix') + child.nodeName);
				}
				if (el) {
					val = child.firstChild ? child.firstChild.nodeValue : '';
					if (el.length == 1) {
						tagname = el[0].tagName.toLowerCase();
						if (tagname == 'select') {
							el[0].selectedIndex = -1;
							for (var i = 0; i < el[0].length; i++) {
								if (el[0].options[i].value == val || el[0].options[i].text.toLowerCase() == val.toLowerCase()) {
									el[0].selectedIndex = i;
									break;
								}
							}
						} else if (tagname == 'input' && /^(radio|checkbox)$/.test((el[0].type ? el[0].type.toLowerCase() : ''))) {
							el[0].checked = val == 1 || FDAjax.Utils.stringToXMLValue(val, 'boolean');
						} else {
							el[0].value = val;
						}
					} else { // it's an checkbox- or radiogroup
						var dt = (child.getAttribute('datatype') || child.getAttribute('dt') || '');
						if (dt == 'boolean') {
							val = val.toType('boolean');
							for (i = 0; i < el.length; i++) {
								el[i].checked = el[i].value.toType('boolean') == val; //new RegExp(',' + FDAjax.Utils.stringToXMLValue(el[i].value, child.getAttribute('datatype')) + ',').test(val);
							}
						} else {
							val = ',' + val + ',';
							for (i = 0; i < el.length; i++) {
								el[i].checked = new RegExp(',' + FDAjax.Utils.stringToXMLValue(el[i].value, child.getAttribute('datatype')) + ',').test(val);
							}
						}
					}
					$(el).change();
				}
			}
			child = child.nextSibling;
		}
	},

	stringToXMLValue: function (str, datatype) {
		switch (datatype) {
			case 'string': return str; break;
			case 'bool': ;
			case 'boolean': return (str == '1' || str.toLowerCase().list('on', 'true', '.t.') ? true : false); break;
			case 'float': ;
			case 'number': return String.create(str).float(); break;
			case 'int': ;
			case 'integer': return Number.int(str); break;
			case 'date':
				{
					if (!str) return null;
					var date = str.match(/(\d{4})-(\d{2})-(\d{2})/);
					if (!date) return null;
					return new Date(date[1], Number.int(date[2]) - 1, date[3]); break;
				}
			case 'datetime':
				{
					if (!str) return null;
					var date = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(str);
					if (!date) return null;
					return new Date(date[1], Number.int(date[2]) - 1, date[3], date[4], date[5], date[6]); break;
				}
		}
		return str;
	},

	stringToRegExp: function (str) {
		// see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
		return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

		/*var re = new RegExp('([\\\(\\\[\\\{\\\/])', 'gm');
		str = str.replace(re, '\\\$1');
		re = new RegExp('([\\\)\\\]\\\}\\\?])', 'gm');
		return str.replace(re, '\\\$1');*/
	}

});

var FDAjax = new Class({

	Extends: FDBaseClass,
	Implements: Events,
	_class: 'FDAjax',

	_trace: true,

	Utils: null,
	Form: null,
	Job: null,
	Texts: null,

	busy: false,
	_busy: { enabled: false, tmr: 0, queue: [], func: null, count: 0 },

	silent: false,
	isActiveX: false,
	showLoad: true,
	error: null,

	initialize: function () {
		this.parent();
		this._busy.enabled = (top != window);

		this.Constants = FDAjax.Constants;
		this.Utils = FDAjax.Utils;

		//this.Utils = new FDAjaxUtils(this);
		this.Form = new FDAjaxForm(this);
		this.Job = new FDAjaxJob(this);
		this.Texts = new FDAjaxTexts(this);

		this.log('.initialize');
	},

	getErrorMessage: function (encoded) {
		if (!this.error) return '';
		return (this.error.source + ',' + this.error.line + ',' + (encoded ? URLEncode(this.error.message) : this.error.message));
	},
	setError: function (source, msg, line, fatal) {
		if (arguments.length == 0) this.error = null;
		else {
			this.error = { source: source, message: msg, line: line || 0, fatal: fatal };
			this.log('.setError, source=' + source + ', message=' + msg + ', line=' + line + ', fatal=' + fatal, 'error');
		}
	},

	checkEnabled: function () {
		this.isEnabled = false;

		var req = this.createRequest(true); // silently create an request object
		this.isEnabled = typeof req == 'object';

		if (FD.Browser.greater('ie', 10, true)) {

			// IE >= 10 uses MSXML internally when an ajax response is loaded in the XmlHttpRequest object
			// When the right to create/run ActiveX objects is disabled this also fails, but in a later stage.
			// Therefor we no try to create such an object ourselfs to find out if it is allowed.

			try { req = new ActiveXObject("Msxml2.XMLHTTP"); }
			catch (e) {
				try { req = new ActiveXObject("Microsoft.XMLHTTP"); }
				catch (e) {
					this.isEnabled = false;
				}
			}
		}

		return this.isEnabled;
	},

	enableBusy: function () {
		this._busy.enabled = true;
	},
	setBusy: function (busy, data) {
		if (!this._busy.enabled) return;
		this.log('.setBusy, ' + (Object.is(data) ? 'guid=' + data._guid : (String.is(data) ? 'source=' + data : '')) + ', setBusy=' + busy + ', isBusy=' + this.busy + ', current=' + this._busy.count);
		if (busy) {
			if (this._busy.count == 0) {
				try { top.FD.Lock.Set(); } catch (e) { }
			}
			this._busy.count++;
		} else {
			this._busy.count--;
			if (this._busy.count == 0) {
				try { top.FD.Lock.Release(); } catch (e) { }
			}
		}
		if (this._busy.count < 0) this._busy.count = 0;
		this.busy = this._busy.count > 0;
	},
	checkBusy: function (func) {
		if (!this._busy.enabled) return false;
		window.clearTimeout(this._busy.tmr);
		if (!this.busy) {
			if (arguments.length == 0 && this._busy.queue.length > 0) {
				func = this._busy.queue.pop();
				if (typeof func == 'string') eval(func);
				else func();
				if (this._busy.queue.length > 0) {
					this._busy.tmr = window.setTimeout('AJAX.checkBusy()', 200);
				}
			}
			return !this.busy;
		}
		if (func) this._busy.queue.push(func);
		//alert('busy: ' + AJAX.busy);
		this._busy.tmr = window.setTimeout('AJAX.checkBusy()', 500);
		return false;
	},
	cancelBusy: function (func) {
		if (!this._busy.enabled) return;
		window.clearTimeout(this._busy.tmr);
		this.busy = false;
		this._busy.count = 0;
		try { top.FD.Lock.Cancel(); } catch (e) { }
		if (arguments.length > 0) {
			if (typeof func == 'string') eval(func);
			else func();
		}
	},

	createRequest: function (silent) {
		var req = null;

		//this.log('.createRequest', 'group');

		try {
			if (window.XMLHttpRequest) {
				//this.log('.createRequest, create XMLHttpRequest');
				try { req = new window.XMLHttpRequest(); }
				catch (e) {
					throw "Failed to create an XMLHttpRequest object! (" + (e.message || e) + ")";
				}
			}
			else if (window.ActiveXObject) {
				//this.log('.createRequest, create Msxml2.XMLHTTP');
				try { req = new ActiveXObject("Msxml2.XMLHTTP"); }
				catch (e) {
					this.log('.createRequest, create Microsoft.XMLHTTP');
					try { req = new ActiveXObject("Microsoft.XMLHTTP"); }
					catch (e) {
						throw "Failed to invoke an MS XMLHTTP ActiveXObject! (" + (e.message || e) + ")";
					}
				}
				this.isActiveX = true;
			} else {
				this.log(".createRequest, Browser does not support the XMLHttpRequest object!");
			}
		} catch (e) {
			//if (!silent) FD.Error.Alert(true, e, 'fd_ajax.js', 965, 'FDAjax.createRequest');
			this.log('.createRequest, error=' + (e.message || e), 'error');
		}

		//this.log(['.createRequest', req]);
		//this.log('', 'groupEnd');

		return req;
	},

	sendRequest: function (data, xhr, recursive) { // url, data, async, callback ) {

		var end = (function (retval) { this.log('', 'groupEnd'); return retval; }).bind(this), guid = (FDAjaxData.is(data) ? data._guid : this.getUniqueID());

		this.log('.sendRequest, guid=' + guid, 'group');
		this.log(data);

		this.setError();

		if (data && !recursive) {
			// check if it is not an 'old' plain object. if so, wrap it in a FDAjaxData object
			if (!FDAjaxData.is(data)) data = new FDAjaxData(data, guid);

			// create a new Deferred object and make this object a promise one
			data.makeDeferred();
		}

		// prepare the data object and get the url
		var url = (data ? data.prepare(this) : null);

		if (!data || !data.url) {

			data.error = true;
			data.message = "Not enough parameters to send the request!"
			data.deferred.reject(data);

			this.setError("sendRequest", "Not enough parameters!", 439, true);

			return end(null);
		}

		this.log(['.sendRequest, guid=' + data._guid + ', count=' + data.count + ', async=' + data.async + ', verb=' + data.verb + ', charset=' + data.charset + ', url=' + url, data]);

		xhr = xhr || this.createRequest();
		data.xhr = xhr;

		if (!xhr) {
			this.setError("sendRequest", "Could not create the request object!");
			return end(null);
		}

		data.addLog('sendRequest', 'setBusy to true');
		this.setBusy(true, data);

		data.addLog('sendRequest', 'isActiveX=' + this.isActiveX);
		if (!this.isActiveX) {
			data.addLog('sendRequest', 'set timeout function');
			xhr.timedout = false;
			xhr.ontimeout = function () {
				if (xhr._tmr) window.clearTimeout(xhr._tmr);
				xhr.timedout = true;
				if (data.ontimeout) data.ontimeout(xhr, data);
			};
		}
		try {

			data.addLog('sendRequest', 'open request (verb=' + data.verb + ', async=' + data.async + ', url=' + url + ')');

			xhr.open(data.verb, url, data.async);
			try {
				if (data.type == 'xml' && FD.Browser.greater('ie', 10, true)) xhr.responseType = 'msxml-document';
			} catch (e) { }

		} catch (e) { this.setError('AJAX.sendRequest', (e.message || e), 430); if (!this.silent) FD.Error.Alert(false, e, 'fd_ajax.js', 167, 'AJAX.sendRequest', (data ? data.reqLog.join('\n') : '')); }

		if (data.timeout && !this.isActiveX && typeof xhr.timeout != 'undefined') {
			data.addLog('sendRequest', 'set timeout value');
			xhr.timeout = data.timeout;
		}

		if (data.async) {

			data.addLog('sendRequest', 'set onreadystatechange event');

			// if the call is asynchronous then set the callback function
			xhr.onreadystatechange = (function () {
				var ts = data.ts.getTimeStamp(), ready = xhr.readyState == FDAjax.Constants.readyState.COMPLETED;
				data.addLog('sendRequest.onreadystatechange', 'ts=' + ts + ', readyState=' + xhr.readyState + ((!this.isActiveX && xhr.timedout) ? ', timedout' : ''));
				try {
					//this.log('.sendRequest.onreadystatechange, guid=' + data._guid + ', readyState=' + req.readyState + ', isReady=' + (req.readyState == FDAjax.Constants.readyState.COMPLETED));
					if (xhr.readyState == FDAjax.Constants.readyState.COMPLETED || (!this.isActiveX && req.timedout) /*&& req.status == AJAX.Constants.Status.READY*/) {
						if (!this.isActiveX && !xhr.timedout && xhr.status == 0) xhr.timedout = true; // consider to be timedout (in FF the timeout event occurs after this event)
						this.setBusy(false, data);
						if (!this.isActiveX && xhr._tmr) window.clearTimeout(xhr._tmr);
					}
				} catch (e) {
					return;
				}
				if ((this.isActiveX || !xhr.timedout) && xhr.readyState == FDAjax.Constants.readyState.COMPLETED && xhr.status == 12031 && data.count < 2) {

					this.sendRequest(data, null, true);

				} else {

					if (ready) {
						this.log('.sendRequest, guid=' + data._guid + ' finished, hasCallback=' + (data.callback ? 'yes' : 'no'), 'group');
						if (data.callback) data.logTime();
					}
					try {
						if ((this.isActiveX || !xhr.timedout) && FD.Browser.ie && ready && xhr.responseXML) {
							// make sure we can use the XPath selection language
							xhr.responseXML.setProperty("SelectionLanguage", "XPath");
						}
					} catch (e) { this.setError('sendRequest.onreadystatechange', 'Error setting SelectionLanguage: ' + (e.message ? e.message : e), 460); }


					if (ready) {

						data.populateFromRequest();

						if (data.callback) {

							// the callback function should resolve the deferred object
							data.callback(xhr, data);

						} else if (xhr.status > 0) {

							data.fireEvent('onReady', [xhr, data]);
							data.deferred.resolve(data);

						} else { // the request has been aborted

							data.fireEvent('onAbort', [xhr, data]);
							data.deferred.reject(data);

						}

						data.finish();

						this.log('', 'groupEnd');

					} else {

						if (data.callback) {
							data.callback(xhr, data);
						}
						data.deferred.notify(data, xhr);

					}

				}
			}).bind(this);
		}

		if (!this.isActiveX && data.timeout) {
			data.addLog('sendRequest', 'set timeout timer');
			xhr._tmr = (function () {
				data.addLog('sendRequest.timeout', 'timeout timer fired');
				xhr.ontimeout();
				try {
					xhr.onreadystatechange();
					xhr.onreadystatechange = null;
				} catch (e) {
					this.setError('AJAX.sendRequest (timeout)', (e.message || e), 476);
					try { xhr.abort(); } catch (e) { }
				}
			}).delay(this, data.timeout + 500);
		}

		var content = data.prepareSend();

		if (Boolean.is(content))
			return end(xhr);

		this.log('.sendRequest, content=' + content);
		xhr.send(content);

		if (!data.async) {

			this.log('.sendRequest, guid=' + data._guid + ' finished, hasCallback=' + (data.callback ? 'yes' : 'no'), 'group');
			if (FD.Browser.ie && xhr.responseXML) xhr.responseXML.setProperty("SelectionLanguage", "XPath");

			data.populateFromRequest();

			if (data.callback) {

				data.addLog('sendRequest', 'ts=' + data.ts.getTimeStamp() + ', callback');
				try {
					data.callback(xhr, data);
				} catch (e) {
					this.setError('AJAX.sendRequest', (e.message || e), 516);
					if (!this.silent) FD.Error.reportPlain("Error calling callback.\n" + (e.message || e), '', 517);
				}

			} else {

				data.fireEvent('onReady', [xhr, data]);
				data.deferred.resolve(data);

			}

			data.addLog('sendRequest', 'ts=' + data.ts.getTimeStamp() + ', setBusy to false');
			this.setBusy(false, data);
			data.finish();
			this.log('', 'groupEnd');
		}

		data.addLog('sendRequest', 'ts=' + (new Date() - data.ts) + ', return request object');
		return end(xhr || null);
	},

	stringToXMLDoc: function (str) {
		var xmlDoc = null, ax = false;

		try { ax = (window.ActiveXObject !== undefined); } catch (e) { }

		if (ax) {

			this.log('.stringToXMLDoc, try using ActiveXObject');

			// Attempt to parse the string using the IE method.
			try {

				var xmlDOMObj = new ActiveXObject("Msxml2.DOMDocument.3.0"); //"Microsoft.XMLDOM");
				xmlDOMObj.async = false;
				xmlDOMObj.loadXML(str);
				xmlDoc = xmlDOMObj;

			} catch (e) {

				this.log('.stringToXMLDoc, error using ActiveXObject (' + (e.message || e) + '), try using XMLHttpRequest');

				if (window.XMLHttpRequest) {
					try {
						if (!FD.Cookie.Exist('XMLDOM_failed')) {
							FD.Cookie.Set('XMLDOM_failed', 'true', 60);
							if (!this.silent) FD.Error.Send(true /*alert*/, e, 'fd_ajax.js', 553, 'FDAjax.stringToXMLDoc');
						}

						var xhr = null;
						try { xhr = this.sendRequest({ url: '/string2xml.asp', content: 'data=' + encodeURIComponent(str), verb: 'POST' }); } catch (e1) { alert('opening request failed'); throw e1; }
						xmlDoc = xhr.responseXML;
						e = null;
					} catch (e1) { e = e1; }
				}
				if (e) {
					this.log(".stringToXMLDoc, Exception caught: " + (e.message || e));
					//this.Debug.reportError("stringToXMLDoc", "Exception caught: " + (typeof e.message != 'undefined' ? e.message : e) + '\r\n\r\nString:\r\n' + str);
					xmlDoc = null;
				}
			}

			// when IE then set the selection language to xpath
			if (FD.Browser.ie && xmlDoc) xmlDoc.setProperty("SelectionLanguage", "XPath");
			
		} else if (window.DOMParser) {

			this.log('.stringToXMLDoc, try using DOMParser');

			try {
				var domParser = new DOMParser();
				xmlDoc = domParser.parseFromString(str, 'text/xml');
				this.log(xmlDoc);
				// when IE then set the selection language to xpath
				//if (FD.Browser.ie) xmlDoc.setProperty("SelectionLanguage", "XPath");
			}
			catch (e) {
				this.log(".stringToXMLDoc, error using DOMParser (" + (e.message || e) + ")", 'error');
				xmlDoc = null;
			}

		} else {
			this.log(".stringToXMLDoc, Browser does not support the DOMParser object!");
		}

		this.log('.stringToXmlDoc, xmlDoc=' + typeof xmlDoc);

		return xmlDoc;
	},

	xmlDocToString: function (xmlDoc) {

		this.log('.xmlDocToString');

		var ax = false;
		try { ax = (window.ActiveXObject !== undefined); } catch (e) { }

		if (ax) {

			return String.formatXml2(xmlDoc.xml);

		} else {

			return String.formatXml2((new XMLSerializer()).serializeToString(xmlDoc));
		}
	},

	getNodesByFunc: function (root, func) {
		var nodeStack = new Array;
		var resultArr = new XMLNodeList;
		var node = root;

		while (node) {
			if (func(node))
				resultArr.push(node);

			if (node.hasChildNodes()) {
				nodeStack.push(node);
				node = node.firstChild;
			} else {
				if (node == root)
					node = null;
				else
					try { node = node.nextSibling; } catch (e) { node = null; };
			}

			while (!node && nodeStack.length > 0) {
				node = nodeStack.pop();
				if (node == root)
					node = null;
				else
					try { node = node.nextSibling; } catch (e) { node = null; }
			}
		}

		if (nodeStack && nodeStack.length > 0)
			this.Debug.trace("getNodesByFunc", "WARNING: Failed to traverse all nodes!");

		return resultArr;
	},

	getNodeValue: function (node, nodeName, alt, type) {
		if (!node) alert('Node is not an object. (' + node + ', ' + nodeName + ', ' + alt + ', ' + type + ')(stack: ' + FD.Stack.Format(',') + ')');
		var sel, dt, val;
		try {
			var path = (nodeName ? (/\//.test(nodeName) ? nodeName : './/*[translate(name(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")="' + nodeName.toLowerCase() + '"]') : '');
			sel = (nodeName ? node.selectSingleNode(path) : node);
		} catch (e) {
			throw (new FDError("Could not select value from node (" + node + ") with nodeName '" + nodeName + "'!, " + (e.message || e), 'fd_ajax.js', 628, 'FDAjax.getNodeValue'));
		}
		val = (alt || '');
		if (sel && sel.firstChild) {
			val = '';
			if (sel.childNodes && sel.childNodes.length > 0) {
				for (var i = 0; i < sel.childNodes.length; i++) {
					if (sel.childNodes[i].nodeType.list(AJAX.Constants.nodeTypes.TEXT_NODE, AJAX.Constants.nodeTypes.CDATA_SECTION_NODE)) {
						val += sel.childNodes[i].nodeValue;
					}
				}
			} else {
				val = sel.nodeValue;
			}
		}
		if (type) {
			if (String.is(type)) { return String.create(val).toType(type); }
			else if (sel) {

				dt = sel.getAttribute('fd:dt');
				if (!dt) dt = sel.getAttribute('dt');

				//this.log('.getNodeValue, dt=' + dt + ', type=' + type, 'info');
				
				if (dt) {
					// only convert the value when type = 1 or when the datatype = date, in the last case the value can be properly formatted from a date object
					val = (type < 2 || dt.list('date', 'datetime') ? String.create(val).toType(dt) /*this.Utils.stringToXMLValue(val, dt)*/ : val);
					if (type == 2) {
						if (dt.list('date', 'datetime')) {
							val = FD.Date.Format(val, dt);
						} else if (dt.list('bool', 'boolean', 'logical')) {
							val = val.toType(dt);
						} else val = String.format(dt, val);
					}
				}
			}
			return val;
		} else return val;
	},

	selectSingleNode: function (node, nodeName) {
		try {
			var sel = (nodeName ? node.selectSingleNode('.//*[translate(name(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")="' + nodeName.toLowerCase() + '"]') : node);
		} catch (e) {
			alert("Could not selectSingleNode (nodeName=" + nodeName + ", node=" + node + ")");
		}
		return sel;
	},
	selectNodes: function (node, nodeName) {
		var sel = (nodeName ? node.selectNodes('.//*[translate(name(),"ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")="' + nodeName.toLowerCase() + '"]') : node);
		return sel;
	}

});

Object.extend(FDAjax, {
	Constants: {
		readyState: {
			UNINITIALIZED: 0,
			LOADING: 1,
			LOADED: 2,
			INTERACTIVE: 3,
			COMPLETED: 4,
			DONE: 4,
			READY: 4
		},
		contentTypes: {
			FORM_URLENCODED: 'application/x-www-form-urlencoded',
			FORM_MULTIPART: '',
			XML: 'text/xml',
			JSON: 'application/json'
		},
		Status: {
			READY: 200
		},
		nodeTypes: {
			ELEMENT_NODE: 1,
			ATTRIBUTE_NODE: 2,
			TEXT_NODE: 3,
			CDATA_SECTION_NODE: 4,
			ENTITY_REFERENCE_NODE: 5,
			ENTITY_NODE: 6,
			PROCESSING_INSTRUCTION_NODE: 7,
			COMMENT_NODE: 8,
			DOCUMENT_NODE: 9,
			DOCUMENT_TYPE_NODE: 10,
			DOCUMENT_FRAGMENT_NODE: 11,
			NOTATION_NODE: 12
		},
		errorCodes: {
			TASK_SAVE_CONDITION: -1
		}
	},
	Utils: new FDAjaxUtils()
});

var FDAjaxData = new Class({

	Extends: FDBaseClass,
	Implements: [Events, FDDeferred],
	_class: 'FDAjaxData',

	_trace: true,
	_ajax: null,

	reqLog: null, // can not use log because it is a method on the baseclass

	xhr: null,
	url: '',
	uri: null,

	ts: null, // timestamp
	count: 0,
	ready: false,
	error: false,
	errorCode: 0,

	contentType: 'application/x-www-form-urlencoded', // default contentType for sending data
	responseType: 'xml', // same as type

	type: 'xml', // xml, json
	timeout: 0, // 0 = use default timeout
	async: false,
	charset: '',
	verb: '',
	content: '',
	hasContent: false,
	cache: false,
	getonly: false,

	silent: false,
	progress: null,

	initialize: function (options, guid) {
		if (arguments.length > 1) this._guid = guid;
		this.parent();
		this.name = this._guid;
		this.reqLog = new FDLog();
		this.deferred = $.Deferred(); //new 

		if (arguments.length > 0) this.set.apply(this, arguments);
	},

	addLog: function () {
		try {
			this.reqLog.add.apply(this.reqLog, arguments);
		} catch (e) {
			this.log('.addLog, error=' + (e.message || e), 'error');
		}
	},

	set: function (options) {

		this.progress = typeof oProgress != 'undefined'; // if the progressbar is available then use it

		this.addEventsFromOptions(options);

		if (options.content && this.content) {
			// prevent the content to be merged
			this.content = null;
		}

		Object.extend(this, options);

		if (String.is(this.url) && this.url) this.url = new FDUri(this.url);

		return this;
	},

	prepare: function (ajax) {

		this._ajax = ajax;
		this.reqLog.clear();
		this.ts = new Date();
		this.xhr = null;

		this.hasContent = !String.empty(this.content) || Object.is(this.content) || FDKeys.is(this.content);

		if (!this.verb) this.verb = (this.hasContent ? 'POST' : 'GET');
		this.async = this.async || false; // be sure it is a boolean
		this.count++;

		return this.getUrl();
	},

	logTime: function () {
		this.log(['%c.finish, time=' + this.ts.getTimeStamp(), 'background:yellow'], 'info');
	},
	finish: function () {
		this.logTime();
		this.log(['.finish', this.reqLog]);
	},

	getUrl: function () {

		var url = this.url.clone();
		//this.log(['.getUrl, clone=', url]);

		if (typeof RequestId != 'undefined') url.querySet('rid', RequestId);
		if (url.query.get('sidn').empty()) {
			var sidn = FD.getAuth().sidn;
			if (sidn) url.querySet('sidn', sidn);
		}
		var rvt = FD.getAuth().rvtoken;
		if (!this.cache) url.randomize();
		else url.querySet('cache', true).addVersion();

		this.log('.getUrl, url=' + url.toString());

		return url.toString();
	},

	reset: function () {
		this.ready = this.error = false; this.errorCode = 0;
		return this;
	},

	clone: function (extend) {

		var clone = new (eval(this._class))();
		Object.extend(true, clone, this); // only clone the own properties
		clone.name = clone._guid;
		clone.$events = this.$events;

		if (extend) Object.extend(clone, extend);
		return clone;
	},

	setOptions: function (options) {
		if (options && options.onReady) this.removeEvent('onReady', options.onReady.toString());
		return this.parent(options);
	},

	getLog: function (encode, sep) {
		return this.reqLog.toString(encode || false, sep || '\r\n');
	},

	setContentType: function (contentType) {
		if (this.xhr)
			this.xhr.setRequestHeader("Content-Type", contentType + (this.charset || document.characterSet ? ";charset=" + (this.charset ? this.charset.toUpperCase() : document.characterSet) : ''));
	},
	setAccept: function (accept) {
		if (this.xhr) {

			if (accept == 'xml')
				accept = 'text/xml';
			else if (accept == 'json')
				accept = 'text/json';

			this.xhr.setRequestHeader("Accept", accept);
			//if (this.charset || document.characterSet) {
				// Chrome does not allow to change this header
				//this.xhr.setRequestHeader("Accept-Charset", (this.charset ? this.charset.toUpperCase() : document.characterSet));
			//}
		}
			
	},

	prepareSend: function () {

		this.log('.prepareSend', 'group');
		this.log('.prepareSend, contentType=' + this.contentType + ', hasContent=' + this.hasContent);

		if (this.verb != 'GET')
			this.setContentType(this.contentType);

		this.setAccept(this.accept || this.type);

		if (this.hasContent) {

			this.addLog('sendRequest', 'set request headers');

			if (!FD.Browser.WebKit) {
				this.xhr.setRequestHeader("Content-Length", this.content.length);
				this.xhr.setRequestHeader("Connection", "close");
			}

			this.addLog('sendRequest', 'ts=' + (new Date() - this.ts) + ', send request');

			var rvtoken = FD.getAuth().rvtoken, rvtokenid = FD.getAuth().rvtokenid;
			if (rvtoken) {
				this.xhr.setRequestHeader("RVToken", rvtoken);
			}
			if (rvtokenid) {
				this.xhr.setRequestHeader("RVTokenId", rvtokenid);
			}

			if (rvtoken) {

				if (String.is(this.content)) {
					this.content = FDKeys.fromQueryString(this.content);
				}
				if (FDKeys.is(this.content)) {
					this.content.set('__rvtoken', rvtoken);
				}

			}

			this.log('', 'groupEnd');

			return this.content.toString() || '';

		} else {

			if (this.xhr.readyState > FDAjax.Constants.readyState.LOADING) {
				var state = this.xhr.readyState;
				try { this.xhr.abort(); } catch (e) { }
				this.xhr = null;

				this.log('', 'groupEnd');
				return false; //end(xhr);
			}

			this.addLog('sendRequest', 'ts=' + (new Date() - this.ts) + ', send request');

			this.log('', 'groupEnd');

			return null;

		}

	},

	populateFromRequest: function () {

		var xhr = this.xhr /* short reference */,
			ajax = this._ajax || FD.Ajax;

		this.log('.populateFromRequest, readyState=' + xhr.readyState + ', status=' + xhr.status, 'group');

		if (xhr.readyState == ajax.Constants.readyState.READY && xhr.status > 0) { // readyState=4 and status=0 means the request has been aborted

			var contentType = xhr.getResponseHeader('Content-Type');
			
			this.log('populateFromRequest , contentType=' + contentType);

			if (contentType) {
				contentType = contentType.split(';')[0].split('/')[1];
			}

			this.type = this.responseType = contentType;
			this.text = xhr.responseText;

			this.log(['.populateFromRequest, contentType=' + contentType + ', isSuccess=' + this.isSuccess(), this]);

			if (this.isSuccess()) {

				if (xhr.status == 204) {

					// no content

				} else if (contentType == 'xml') {

					this.results = xhr.responseXML; // store the xml results in the data object
					if (this.results == null && /<\?xml/.test(xhr.responseText)) {
						this.results = ajax.stringToXMLDoc(xhr.responseText);
					}

					var str = '';
					if (xhr.responseXML && ((xhr.responseXML.parseError && xhr.responseXML.parseError.errorCode != 0) || xhr.responseXML.getElementsByTagName('parsererror').length > 0)) {
						str = xhr.responseText.replace(/&/g, '&amp;');
						var enc = str.match(/<\?xml(.*)\?>/gm);
						if (/<Recordset/.test(str)) {
							str = String.create(str.match(/<Recordset([^><]*)>([\s\S]*)<\/Recordset>/gm));
							if (enc) str = enc + '\r\n' + str;
						} else if (/<result/.test(str)) {
							str = String.create(str.match(/<result([^><]*)>([\s\S]*)<\/result>/gm));
							if (enc) str = enc + '\r\n' + str;
						}
						try {
							this.results = ajax.stringToXMLDoc(str);
							if ((this.results.parseError && this.results.parseError.errorCode != 0) || this.results.getElementsByTagName('parsererror').length > 0) {
								this.error = true;
								if (this.results.parseError)
									alert('XML Parse Error: ' + this.results.parseError.reason);
								else {
									try {
										alert(this.results.getElementsByTagName('parsererror').item(0).childNodes.item(0).nodeValue);
									} catch (e) {
										alert(this.results.getElementsByTagName('parsererror')[0].childNodes[0].nodeValue);
									}
								}
							}
						} catch (e) { alert('FDAjaxData.populateFromRequest:\r\n' + (e.message || e) + '\r\n\r\nResponse:\r\n' + this.text + '\r\nStr:\r\n' + str); }
					}

					// when IE then set the selection language to xpath
					if (FD.Browser.ie) this.results.setProperty("SelectionLanguage", "XPath");
					// select the Recordset node from the xml
					var root = this.root = this.results.selectSingleNode('//Recordset|//Records|//result');

					//this.log(['.populateFromRequest, root=' + typeof root, root]);

					//if (!root) root = data.root = data.results.selectSingleNode('//result');
					this.recordset = (root ? root : this.results).selectNodes('//Record'); //.item( 0 ) ;
					if (!this.recordset || this.recordset.length == 0) {
						var tmp = this.results.selectNodes('//result/value');
						if (tmp.length > 0) this.recordset = tmp;
					}

					if (typeof (root) == 'object' && root.nodeName == 'result' && (this.errorCode = Number.int(ajax.getNodeValue(root, 'code'))) != 0) {
						this.error = true;
						this.recordset = null;
						this.message = ajax.getNodeValue(root, 'error_message_extended');
						if (!this.message) this.message = ajax.getNodeValue(root, 'error_message');
					}

				} else if (contentType == 'json') {

					var root = this.results = this.root = null;
					this.log('.populateFromRequest, typeof=' + typeof xhr.responseText);
					try {

						root = this.results = this.root = window.JSON.parse(xhr.responseText);

					} catch (e) {
						this.log('.populateFromRequest, error=' + (e.message || e), 'error');
						throw "parseJSON error: " + (e.message || e);
					}

					this.recordset = (Array.is(root) ? root : (typeof root != 'undefined' ? [root] : null));

					if (typeof (root) == 'object' && typeof root['code'] != 'undefined' && typeof root['error_message'] != 'undefined') {
						this.error = true;
						this.recordset = this.root = null;
						this.message = root['error_message_extended'] || root['error_message'];
					}
				}

				// call the promise methods
				/*if (this.error) {

					this.deferred.reject(this);

				} else {

					this.deferred.resolve(this);

				}*/

			} else { 

				this.error = true;

				/*
				the request is ready but there something wrong with the status
				*/

				var msg = this.message = ajax.Texts.get('error_request', 'Error requesting data!') + ' (' + (xhr.status + '').append((xhr.statusText ? xhr.statusText : ''), ', ') + ', ' + this.url + ')';
				this.errorCode = xhr.status;
				// alert the user

				if (contentType == 'xml' && xhr.responseXML) {
					var root = xhr.responseXML.selectSingleNode('//result');
					if (root && (this.errorCode = Number.int(ajax.getNodeValue(root, 'code'))) != 0) {
						this.error = true;
						this.recordset = null;
						msg = this.message = ajax.getNodeValue(root, 'error_message_extended');
						if (!this.message) msg = this.message = ajax.Texts.get('error_request', 'Error requesting data!') + ' (' + (this.errorCode + '').append((xhr.statusText ? xhr.statusText : ''), ', ') + ', ' + ajax.getNodeValue(root, 'error_message') + ')';
					}
				} else if (contentType == 'json' && xhr.responseText) {
					var root = null;
					try { root = jQuery.parseJSON(xhr.responseText); } catch (e) { }
					if (typeof (root) == 'object' && typeof root['code'] != 'undefined' && typeof root['error_message'] != 'undefined') {
						this.error = true;
						this.recordset = null;
						this.message = msg = root['error_message_extended'];
						if (!this.message) this.message = msg = ajax.Texts.get('error_request', 'Error requesting data!') + ' (' + (this.errorCode + '').append((xhr.statusText ? xhr.statusText : ''), ', ') + ', ' + root['error_message'] + ')';
					}
				}
				if (this.errorCode && this.errorCode == 401) {

					this.fatal = true;
					ajax.setError('FDAjaxData.populateFromRequest', msg, 1277, true); // source, msg, line, fatal

					var url = FDUri.create(top.location.href);

					if (FD.isBackend()) {
						FD.Backend.setMessage(msg);
						window.setTimeout(function () { top.location.replace(url.randomize().toString()); }, 0);
					} else {
						url.querySet('msg', msg);
						FD.Window.alert(msg);
					}
					
					//data.silent = false;
				}

				this.log('.populateFromRequest, msg=' + msg, (this.error ? 'error' : ''));

				//this.deferred.reject(this);

				if (!this.silent) alert(msg);

			}

		}

		this.log('', 'groupEnd');

	},

	send: function () {

		var xhr = FD.Ajax.sendRequest(this);
		return this;

	},
	sendAsync: function () {
		this.async = true;
		return this.send();
	},

	abort: function () {

		if (this.xhr) {
			try {
				this.xhr.abort();
			} catch (e) { }
			this.xhr = null;
		}
		return this;
	},

	isReady: function () {
		return (this.xhr && this.xhr.readyState == FDAjax.Constants.readyState.READY);
	},
	isSuccess: function () {
		return (this.xhr && this.xhr.readyState == FDAjax.Constants.readyState.READY && this.xhr.status.between(200, 299));
	}

});

var FDAjaxDataForm = new Class({

	Extends: FDAjaxData,
	_class: 'FDAjaxDataForm',

	identifier: '',
	action: '',
	url_part: '',
	search: '',
	form: null,
	selector: null,

	set: function (options) {

		this.parent(options);

		if (!this.identifier) this.identifier = this.action;
		else if (!this.action) this.action = this.identifier;

		if (options.form_element_list) this.setElementList(options.form_element_list);
		if (options.selector) this.setSelector(options.selector);

		if (!this.url) {
			if (this.url_part) this.url = new FDUri(this.url_part);
			else {
				// create the default formdesk url to request data
				this.url = FDAjaxDataForm.createDefaultUrl(this.action || this.identifier);
				this.async = this.lock = this.silent = true /* don't empty the fields */;
			}
		}

		return this;
	},

	getUrl: function () {

		if (!this.url) this.url = new FDUri(this.url_part || '');
		if (this.search) this.url.queryMerge(this.search);

		return this.parent();
	},

	setElementList: function (form_element_list) {
		this.form = FDAjax.Utils.createForm(form_element_list);
	},

	setSelector: function (selector) {
		if (typeof selector == 'object') this.selector = selector;
		else {
			el = selector.split('|');
			this.selector = { element: FD.get(el[0]) };
			if (el.length > 1) this.selector.mapping = el[1];
			if (el.length > 2) this.selector.empty_option = el[2] == 'true'
		}
	}
}).extend({
	createDefaultUrl: function (action) {

		var formid = 0, prefix = '/' + FD.getInfo().domain + '/';
		prefix = prefix.append(FDUri.current.getForm(), '/');

		if (String.is(action)) action = action.split('|');
		if (action.length == 1) action.push(action[0]);

		formid = FDUri.current.queryGet('id_form', 0, 'int');
		if (!formid) {
			try {
				formid = FD.Form.Info.id;
				//prefix = (typeof WYSIWYG == 'undefined' ? '/' + FD.getInfo().domain + '/' : '');
			} catch (e) { }
		}
		if (!formid) {
			try {
				formid = FD.Backend.Context.get('id_form', 0, 'int');
				//prefix = '';
			} catch (e) { }
		}
		return FDUri.base('account').addPath('data/' + action[1] + '/' + formid + '/'); // new FDUri(prefix + 'data/' + action[1] + '/' + formid + '/');
	},
	createJSONUrl: function (action, query) {
		query = (!Object.is(query) ? { task: query || 'get' } : query);
		query.format = 'JSON';
		query.task = query.task || 'get';
		return this.createDefaultUrl(action).querySet(query).addLang().makeSession().addVersion();
	},
	createJSON: function (fdSettings, jqSettings) {
		if (String.is(fdSettings)) fdSettings = { action: fdSettings };
		jqSettings = jqSettings || { async: true };
		jqSettings.dataType = 'JSON';
		jqSettings.url = FDUri.create(fdSettings.url || FDAjaxDataForm.createJSONUrl(fdSettings.action, fdSettings.task || fdSettings.query));
		if (fdSettings.query) jqSettings.url.querySet(fdSettings.query);
		return jqSettings;
	}
});

var FDAjaxDataRest = new Class({

	Extends: FDAjaxData,
	_class: 'FDAjaxDataRest',

	version: 'v1',
	type: 'json',
	contentType: 'application/json',
	resource: '',
	query: null,

	getUrl: function () {

		if (!this.url) this.url = FDAjaxDataRest.createResourceUrl(this.version, this.resource || '', this.query);
		if (this.search) this.url.queryMerge(this.search);

		return this.parent();
	}

}).extend({

	create: function () {
		var args = $A(arguments);
		if (args.length == 1 && typeof args[0] == 'object') {

			return new FDAjaxDataRest(args[0]);

		} else if (args.length > 0 && String.is(args[0])) {

			var options = { resource: args.shift() };
			if (args.length > 0) {
				options.query = args.shift();
			}
			return new FDAjaxDataRest(options);

		}

		return new FDAjaxDataRest();
	},
	createResourceUrl: function (version, resource, query) {
		return (new FDUri('/' + FD.getInfo().domain + '/' + FD.getRouteInfo().identifier + 'api/rest/' + version + (resource ? '/' + resource : '')))
			.querySet(query)
			.addLang()
			.makeSession()
			.addVersion();
	}

});

var FDAjaxForm = new Class({

	Extends: FDBaseClass,
	_class: 'FDAjaxForm',

	_trace: true,
	_ajax: null,

	// AJAX Form methods specific for Formdesk form customization
	Task: null,
	Lookup: null,

	progress: false,
	_progress_counter: 0,
	_selectordata: [], // array to hold the selector lookup recordsets

	initialize: function (ajax) {
		this.parent();
		this._ajax = ajax;

		// specialized Formdesk object for backend tasks
		this.Task = new FDAjaxFormTask(ajax);
	},

	/**
	Creates a data object to hold the information needed for a specific lookup block.
	This object or it's identifier is passed to the AJAX.Form.getData function.
	**/
	create: function () {
		var identifier, url_part, form_element_list, selector, options;

		if (Object.is(arguments[0])) {
			identifier = arguments[0].action.split('|');
			url_part = arguments[0].urlPart || '';
			form_element_list = arguments[0].formElementList || '';
			selector = arguments[0].selector || '';
			options = arguments[1] || {};
		} else {
			identifier = arguments[0].split('|');
			if (Object.is(arguments[1])) {
				options = arguments[1];
				url_part = options.urlPart || '';
				form_element_list = options.formElementList || '';
				selector = options.selector || '';
			} else {
				url_part = arguments[1] || '';
				form_element_list = arguments[2] || '';
				selector = arguments[3] || '';
			}
		}
		if (identifier.length == 1) identifier[1] = identifier[0];

		var data = this[identifier[0]];

		options = $.extend(options, { identifier: identifier[0], action: identifier[1], url_part: url_part || '', url: null });
		if (form_element_list) options.form_element_list = form_element_list;
		if (selector) options.selector = selector;

		if (!data) {
			data = new FDAjaxDataForm(options);
			this[identifier[0]] = data;
		} else {
			data.clearEvents();
			data.set(options);
		}

		this.log(['.create', options, data]);

		return data;
	},

	getData: function (data, search, initValue) {

		if (typeof data == 'string') {
			// data parameter contains the name, so get the object
			data = this[data];
		}

		data.reset();

		this.log(['.getData', data]);

		if (typeof initValue == 'boolean' && initValue) {
			data.lock = true;
			initValue = null;
		}

		data.initValue = (arguments.length >= 3 ? (Array.is(initValue) ? String.create(initValue[0]) : initValue) : null);
		if (data.initValue && data.initValue.match(/^\[[^\[\]]*\]$/))
			data.initValue = null;

		if ((this.progress && (typeof data.progress == 'undefined' || data.progress)) && (search || search == null)) {
			// progressbar is defined and there is something to lookup
			// initialize and show the progressbar
			oProgress.wait(this._ajax.Texts.get('progress', 'Requesting data . . .'));
			this._progress_counter++;
		} else if (data.showLoad && this._ajax.showLoad) { data.showLoad(); }

		if (data.selector) { // there is listbox selection element defined
			// set the listbox to zero length
			data.selector.element.length = 0;
			if (typeof data.selector.empty_option == 'undefined' || data.selector.empty_option) {
				// add a first option
				addOption(document, data.selector.element, '', this._ajax.Texts.get('selector_option', '-> Select an option <-'));
			}
		}

		if (!data.lock && data.initValue == null) {
			// empty the fields which will be populated with data
			this.fillData(data.form, null);
		}

		data.recordset = null; // clear previous recordset
		data.results = null; // clear previous results
		if (search != null) {
			data.search = (Array.is(search) || Object.is(search) ? search : URLEncode(search || '')); // save the search string/array
			if (String.is(data.search) && !/[=&]/.test(data.search) && data.url && data.url_part) {
				data.url.queryRemove(['sidn', 'random']).querySet('#last', data.search);
				data.search = null;
			}
		}

		// call the registerd events with which you can do some more preparing work
		if (data.fireEvent) data.fireEvent('onBeforeRequest');
		this._ajax.fireEvent('onBeforeRequest', [data]);
		if (FD.Events) FD.Events.FireEvent('AJAXBeforeRequest', { data: data });

		var req = null;
		if (search || search == null) {

			//		data.url += (data.url.search(/\?/) >= 0 ? '&' : '?') + (!data.cache ? 'v' + FD.Utils.Random() : FD.getAssets().all + '&cache=true') + (typeof RequestId != 'undefined' ? '&rid=' + RequestId : '');
			if (!data.callback) { // if the callback function is not yet set
				data.async = true; // the call will be asynchrone (something else can be done in meanwhile)
				data.callback = this.setData.bind(this); // set the callback function
			}
			//alert(data.url);

			try { this._ajax.sendRequest(data); /* send the request */ } catch (e) { String.log('Error sending data, message=' + (e.message ||e), 'error'); alert('Error sending data: ' + (e.message ? e.message : e) + ', ' + data.reqLog.toString()); };

			if (!data.xhr) { // the request is unsuccessful
				data.error = true;
				if (this.progress && (typeof data.progress == 'undefined' || data.progress)) {
					this._progress_counter--;
					oProgress.finish(0); // clear the progressbar
				} else if (data.showLoad) { data.showLoad(true); }

				// call the promise fail method
				data.deferred.rejectWith(data, { message: "Error sending request!", method: "getData", source: "fd_ajax.js" });

				// alert the user
				alert(this._ajax.Texts.get('error_send_request', 'Error sending request!'));
			}

		}

		var ts = -1;
		try { ts = data.ts.getTimeStamp(); } catch (e) { }
		try { data.addLog('AJAX.Form.getData', 'ts=' + ts + ', return req object'); } catch (e) { }

		return req;

	},

	/**
	Callback funtion.
	This function is called when the request status changes.
	**/
	setData: function (xhr, data) {

		this.log('.setData', 'group');

		if (data.isReady()) {

			data.ready = data.isSuccess();

			if (data.ready) {

				this.log(['.setData', data]);

				if (typeof FD.Form != 'undefined') {
					var prevLoading = FD.Form.isLoading;
					FD.Form.isLoading = false;
				}

				try {
					if (FD.isBackend()) {
						var info = xhr.getResponseHeader('application-info');
						if (info) FD.setInfo(info);
						//setVersions(info);
						if (/*!data.cache && */xhr.getResponseHeader('application-message')) top.FD.Backend.showMessage(true);
					}
				} catch (e) { }

				//data.populateFromRequest(req);

				var contentType = data.type,
					recordset = data.recordset;

				if (data.error) {
					if (!data.silent) {
						if (typeof FD.Window != 'undefined') FD.Window.alert(data.message);
						else alert(data.message);
					}
					// do nothing
				} else if (!recordset || (contentType == 'xml' && !recordset.length) || (contentType == 'json' && (!Array.is(recordset) || Object.empty(recordset)))) { // there is no data; .hasChildNodes()

					data.recordset = null;
					if (data.selector) {
						// disable the selection listbox
						setDisabled(null, data.selector.element, true, true, true);
					}
					if (!data.silent) {
						// alert the user
						alert(this._ajax.Texts.get('alert_nodata', 'No data found!'));
					}

				} else if (data.selector) { // there is a data selection listbox
					// not yet edited to handle json

					/*
					This data selection listbox will be populated first.
					After the user selects an option from the listbox the AJAX.Form.selectData function will populate the given fields.
					*/

					// enable the listbox
					setDisabled(null, data.selector.element, false, true, true);

					// use the mapping field-name if defined. the elements name will be used otherwise.
					var field = (data.selector.mapping ? data.selector.mapping : data.selector.element.name);
					this.fillSelector(data.selector.element, recordset, field);

					/* add a clone of the data object to the listbox */
					var clone = Object.extend({}, data), index = data.selector.element.getAttribute('selectordata');
					if (index && Number.int(index) >= 0) {
						this._selectordata[Number.int(index)] = clone;
					} else {
						this._selectordata.push(clone);
						data.selector.element.setAttribute('selectordata', this._selectordata.length - 1);
					}
					if (data.selector.element.onchange && !data.selector.element.prevOnchange) {
						// save the already defined onchange event
						data.selector.element.prevOnchange = data.selector.element.onchange;
					}

					// set the onchange event to call the AJAX.Form.selectData funtion
					var _ajaxForm = this;
					data.selector.element.onchange = function () { _ajaxForm.selectData(this); };

					if (data.initValue != null && data.initValue) {

						data.selector.element.value = data.initValue;
						if (data.selector.element.selectedIndex == -1) data.selector.element.selectedIndex = 0;

					} else if (data.selector.element.length == 2 || (typeof data.selector.empty_option != 'undefined' && !data.selector.empty_option)) {
						/*
						if there is one result (first option + one result option)
						then select this option in the listbox and populate the fields right away
						*/
						data.selector.element.selectedIndex = (typeof data.selector.empty_option == 'undefined' || data.selector.empty_option ? 1 : 0);
						this.selectData(data.selector.element);
					}

				} else if (!data.getonly) {

					this.log('.setData, fillData', 'group');
					// no selection listbox, so populate the fields
					if (contentType == 'json') {
						this.fillDataJSon(data.form, recordset.item(0), data.prefix || '', data.applyState || false);
					} else {
						this.fillData(data.form, recordset.item(0), data.prefix || '', data.applyState || false); //.firstChild
					}

					if (!data.silent && (contentType == 'xml' && Number.int(recordset.item(0).getAttribute('empty')) > 0) || (contentType == 'json' && Object.empty(recordset[0]))) {
						// alert the user
						alert(this._ajax.Texts.get('alert_nodata', 'No data found!'));
					}

					this.log('', 'groupEnd');
				}

				if (this.progress && (typeof data.progress == 'undefined' || data.progress)) {
					this._progress_counter--;
					oProgress.finish(0); // clear the progressbar
				} else if (data.showLoad /*&& this._ajax.showLoad*/) {
					this.log('.setData, hide loader');
					data.showLoad(true);
				}

				this.log('.setData, fireing events', 'group');

				if (data.fireEvent) data.fireEvent('onAfterSetData', [xhr]);
				this._ajax.fireEvent('onAfterSetData', [data, xhr]);
				if (FD.Events) FD.Events.FireEvent('AJAXAfterSetData', { data: data, req: xhr });

				this.log('.setData, resolve', 'group');
				data.deferred.resolve(data);
				this.log('', 'groupEnd');

				this.log('', 'groupEnd');

				//TODO: show the message an other way
				if (contentType == 'xml' && data.root && Number.int(data.root.getAttribute('hasmsg')) > 0 && FD.isBackend()) {
					top.FD.Backend.showMessage(true);
				}

				if (typeof FD.Form != 'undefined') FD.Form.isLoading = prevLoading;


			} else {

				/*
				the request is ready but there something wrong with the status
				*/

				if (this.progress && (typeof data.progress == 'undefined' || data.progress)) {
					//DEBUG.trace('AJAX.setData', '2');
					this._progress_counter--;
					oProgress.finish(0); // clear the progressbar
				} else if (data.showLoad /*&& this._ajax.showLoad*/) { data.showLoad(true); }

				if (!data.fatal) {
					if (data.fireEvent) data.fireEvent('onAfterSetData', [xhr]);
					this._ajax.fireEvent('onAfterSetData', [data, xhr]);
					if (FD.Events) FD.Events.FireEvent('AJAXAfterSetData', { data: data, req: xhr });
				}

				data.deferred.reject(data);

			}

		}

		data.init = false;

		this.log('', 'groupEnd');

	},

	/**
	This function populates a listbox with values from xml records
	**/
	fillSelector: function (selector, recordset, field, empty, first_option, value) {

		selector = FD.get(selector);
		if (empty) selector.length = 0;
		if (first_option) addOption(document, selector, '', this._ajax.Texts.get('selector_option', FD.Texts.get('EMPTY_OPTION_SELECT', '-> Select an option <-')));
		if (!recordset) return;
		try {
			var val, text, fields = field.split('|');
			for (var i = 0, recordset; i < recordset.length; i++) { // skip through the records (nodes)

				val = this._ajax.getNodeValue(recordset.item(i), fields[0]); // get the value from the record
				text = (fields.length > 1 ? this._ajax.getNodeValue(recordset.item(i), fields[1]) : val);
				if (!text && fields.length > 2) { // alternate field when the first is empty or not present
					text = this._ajax.getNodeValue(recordset.item(i), fields[2]);
				}
				// add an option the the listbox with this value
				addOption(document, selector, val, text);

			}
		} catch (e) { FD.Error.Alert(true, e, 'fd_ajax.js', 1498, 'AJAX.Form.fillSelector'); }

		if (arguments.length >= 6 && value) {
			selector.value = value;
			if (selector.selectedIndex == -1) selector.selectedIndex = 0;
		} else selector.selectedIndex = 0;

	},

	/**
	This function populate the fields corresponding to the selected option from the listbox
	Selector parameter is the listbox itself
	**/
	selectData: function (selector) {
		var ident = selector.getAttribute('identifier'), data = this._selectordata[Number.int(selector.getAttribute('selectordata'))]; // data object
		if (data && data.recordset != null) {
			// get the recordset
			//var recordset = data.results.selectNodes('//Recordset/Record'); //.item( 0 ) ;
			try {
				// try to populate the fields
				this.fillData(data.form, data.recordset.item(selector.selectedIndex - (typeof data.selector.empty_option == 'undefined' || data.selector.empty_option ? 1 : 0)));
			} catch (e) {
				// TODO: replace with the FD.Error function to send the error to formdesk
				//				AJAX.Debug.sendError('AJAX.Form.selectData', '(1,' + ident + ',value=' + (selector ? selector.value : '<no selector>') + ') ' + (typeof e.message != 'undefined' ? e.message : e));
				// alert the user
				alert(this._ajax.Texts.get('error_selector', 'Error selecting data!\nData not found.') + '\n\n' + (e.message || e));
			}
			// call the registered events
			this._ajax.fireEvent('onAfterSelectorChange', [data, selector]);
			if (FD.Events) FD.Events.FireEvent('AJAXAfterSelectorChange', { data: data, selector: selector });
		} else {
			FD.Error.Send(
				'(ident=' + ident + ', value=' + (selector ? selector.value : '<no selector>') + ') data: ' + typeof (data) + ', form: ' + (typeof (data) != 'undefined' ? typeof (data.form) : '<none>') + ', rec: ' + (typeof (data) != 'undefined' ? typeof (data.recordset) + '(isnull:' + (data.recordset == null) + ')' : '<none>'),
				'fd_ajax.js', 1527, 'AJAX.Form.selectData'
			);
		}
		if (selector.prevOnchange) {
			// call the saved previous onchange event
			selector.prevOnchange();
		}
	},

	/**
	These functions populate the fields
	**/
	fillData: function (form, node, prefix, apply_state) {
		var fld, el, child;
		if (!form || !form.elements) { // fills the data based on the childNodes collection
			if (!node) return;
			for (var i = 0; i < node.childNodes.length; i++) {
				if (node.childNodes[i].nodeType == 1 /* ELEMENT_NODE */) {
					child = node.childNodes[i];
					this.traverseData(node, child, '', prefix, apply_state);
				}
			}
		} else { // fills the data based on the form parameter object (AJAX.Form.create)
			for (var i = 0; i < form.elements.length; i++) {
				//			alert(form.elements[i].name + ', ' + form.mapping[ form.elements[i].name ] ) ;
				fld = (typeof form.mapping[form.elements[i].name] != 'undefined' ? form.mapping[form.elements[i].name] : form.elements[i].name).toLowerCase();
				this.fillField(form.elements[i], node, fld, apply_state);
			}
		}
	},
	fillDataJSon: function (form, data, prefix, apply_state) {

		this.log('.fillDataJSon', 'group');

		var fld, el, child;
		if (!form || !form.elements) { // fills the data based on the childNodes collection
			if (!data) return;
			for (fld in data) {
				el = (FD.Form.Items ? FD.Form.Items.search(fld) : FD.get(fld));

				this.log('.fillDataJSon, fld=' + fld + ', el=' + el);

				if (el) this.fillField(el, data[fld], '', apply_state);
				else if (String.is(data[fld]) && FDKeys.possible(data[fld])) {

					this.log('.fillDataJSon, possible=' + (/([^=]*)=(.*)?/.test(data[fld])));

					var keys = FDKeys.fromString(data[fld]);
					keys.fillFields(fld);
				}
			}
		} else { // fills the data based on the form parameter object (AJAX.Form.create)
			for (var i = 0; i < form.elements.length; i++) {
				//			alert(form.elements[i].name + ', ' + form.mapping[ form.elements[i].name ] ) ;
				fld = (typeof form.mapping[form.elements[i].name] != 'undefined' ? form.mapping[form.elements[i].name] : form.elements[i].name).toLowerCase();
				el = (FD.Form.Items ? FD.Form.Items.search(form.elements[i]) : FD.get(form.elements[i]));
				if (el) this.fillField(el, data[fld], '', apply_state);
			}
		}

		this.log('', 'groupEnd');

	},

	traverseData: function (parent, node, nodeName, prefix, apply_state) {
		nodeName = nodeName + (nodeName != '' ? '/' : '') + node.nodeName;
		prefix = prefix || '';
		//alert(nodeName);
		try {
			var items = node.selectNodes('./*'), name, els, el;

			// first try to get the element(s)
			if (node.getAttribute('prefix')) {
				name = node.getAttribute('prefix') + node.nodeName.charAt(0).toUpperCase() + node.nodeName.substr(1);
			} else {
				name = prefix + nodeName;
			}
			els = document.getElementsByName(name); // returns a collection/array with element(s)
			if (els.length == 0) {
				name = node.nodeName;
				if (typeof aFields != 'undefined') {
					name = aFields.get(node.nodeName, 'name') || node.nodeName;
				}
				els = document.getElementsByName(name);
			}

			if (els.length == 0 && items.length > 0) { // there is no element and the node has childnodes we can traverse
				for (var i = 0; i < items.length; i++) {
					this.traverseData(node, items[i], nodeName, prefix, apply_state);
				}
			} else { // there are elements
				el = [];
				if (els) {
					for (var j = 0; j < els.length; j++) {
						if (els[j].tagName.toLowerCase().list('input', 'textarea', 'select')) {
							el.push(els[j]);
						}
					}
					els = null;
				}

				//this.log(['.traverseData, name=' + name, el]);

				if (el.length == 1) {
					this.fillField(el[0], parent, node.nodeName, apply_state);
				} else if (el.length > 0) { // checkbox-/radiogroup
					this.fillField(el, parent, node.nodeName, apply_state);
				} else {
					var value = this._ajax.getNodeValue(node);
					if (String.is(value) && FDKeys.possible(value)) {
						var keys = FDKeys.fromString(value);
						keys.fillFields(node.nodeName);
					}
				}
			}
		} catch (e) { FD.Error.Alert(true, e, 'fd_ajax.js', 1642, 'AJAX.Form.traverseData'); }
	},

	fillField: function (el, node, fld, apply_state, thread) {
		var org = el;
		if (String.is(el)) el = FD.get(el);
		if (!el) {
			try { FD.Error.Send("el (" + org + ") does not result into an object", 'fd_ajax.js', 1201, 'AJAX.Form.fillField'); } catch (e) { }
			throw "el (" + org + ") does not result into an object";
		}
		if (typeof node == 'undefined') node = '';
		var type = (typeof el.type != 'undefined' ? el.type.toLowerCase() : ''), value = '', changed = false, prev_value;
		try {
			if ((typeof el.tagName == 'undefined' || el.tagName.toLowerCase() != 'select') && el.length > 0 && typeof el[0] != 'undefined') { // multiple radio/checkbox
				var values = (Object.is(node) ? this._ajax.getNodeValue(node, fld, '', 2 /*format the value according to the xml fd:dt attribute*/) : node), el_values = [];

				this.log('.fillField, values=' + values + ', typeof=' + typeof values, 'info');

				var alt = FD.get('alt' + el[el.length - 1].id);
				if (/\n/.test(values)) {
					values = values.replaceAll('\r', '').split('\n');
				}
				if (Boolean.is(values)) {
					for (var i = 0, index = 0; i < el.length - (alt ? 1 : 0) ; i++) {
						if (Boolean.create(el[i].value) == values) {
							el[i].checked = true;
						}
					}
				} else if (Array.is(values)) {
					for (var i = 0, index = 0; i < el.length - (alt ? 1 : 0); i++) {
						if ((index = values.search(el[i].value)) > -1) values.remove(index);
						prev_value = el[i].checked;
						el[i].checked = index > -1;
						changed = changed || prev_value != el[i].checked;
						if (apply_state && el[i].getAttribute('fd:state')) { FD.State.Apply(el[i], el[i].getAttribute('fd:state')); }
					}
					values = (values.length > 0 ? values.join(', ') : '');
				} else {

					values = ',' + values.replaceAll('<=>', ',') + ',';
					//FD.Debug.trace('fillField', 'el=' + el[0].id + ', values=' + values);
					for (var i = 0; i < el.length - (alt ? 1 : 0); i++) {
						value = FDAjax.Utils.stringToRegExp(el[i].value);
						el_values.push(el[i].value);
						prev_value = el[i].checked;
						el[i].checked = values.search(',' + value + ',') > -1 || (el[i].value == 'true' && values == ',.T.,') || (el[i].value == 'false' && values == ',.F.,');
						changed = changed || prev_value != el[i].checked;
						if (apply_state && el[i].getAttribute('fd:state')) { FD.State.Apply(el[i], el[i].getAttribute('fd:state')); }
						if (el[i].checked) values = values.replace(',' + el[i].value, '');
					}
					values = values.substr(1, values.length - 2);
				}
				$(el).each(function () {
					$(this).data('origValue', (this.type == 'radio' ? $('[name="' + this.name + '"]:checked') : this.checked));
				});
				if (alt) {
					// an alternative option is available. check if there is a value which belongs to this option
					prev_value = el[el.length - 1].checked;
					el[el.length - 1].checked = values;
					changed = changed || prev_value != el[el.length - 1].checked;
					setDisabled(null, alt, !values, true);
					prev_value = alt.value;
					alt.value = values;
					changed = changed || prev_value != alt.value;
					if (apply_state && alt.getAttribute('fd:state')) FD.State.Apply(alt, alt.getAttribute('fd:state'));
				}
			} else if (el.tagName.toLowerCase() == "input" && /^(radio|checkbox)$/.test(type)) { // single radio/checkbox
				/*
				in case of all browsers except Safari a checkbox without a value attribute has a value of 'on' by default
				*/
				prev_value = el.checked;
				el.checked = (
					(!String.create(el.value).empty() && el.value == (Object.is(node) ? this._ajax.getNodeValue(node, fld) : node)) ||
					((String.create(el.value).empty() || el.value.toLowerCase().list('on', '.t.', '.f.', 'true', 'false')) && (Object.is(node) ? this._ajax.getNodeValue(node, fld, '', 'boolean') : (String.is(node) ? FDAjax.Utils.stringToXMLValue(node, 'boolean') : node)))
				);
				changed = changed || prev_value != el.checked;
				if (apply_state && el.getAttribute('fd:state')) {
					FD.State.Apply(el, el.getAttribute('fd:state'));
				}

			} else if (el.tagName.toLowerCase() == 'select') { // (dropdown)listbox

				this.log('.fillField, SELECT, fld=' + fld, 'group');

				value = (Object.is(node) ? this._ajax.getNodeValue(node, fld, '', 2 /*format the value according to the xml fd:dt attribute*/) : String.create(node));
				prev_value = el.value;
				el.selectedIndex = -1;

				var value_type = typeof value, val, text, lc_value = value;
				if (value_type == 'string') {
					lc_value = value.toLowerCase();
				}

				this.log('.fillField, value=' + value + ', value_type=' + value_type);

				for (var j = 0; j < el.length; j++) {
					
					val = el.options[j].value;
					text = el.options[j].text.toLowerCase();
					if (value_type != 'string') {
						// the xml value is not of type string, so convert the option value and text to the value type
						val = val.toType(value_type);
						text = null; //text.toType(value_type);
					}

					this.log('.fillField, value=' + el.options[j].value + ', val=' + val + ', text=' + text);

					if (val == value || (text != null && text == lc_value)) {
						el.selectedIndex = j;
						break;
					}

				}
				changed = changed || prev_value != el.value;
				el.prevValue = el.value;
				$(el).data('origValue', el.value);
				if (apply_state && el.getAttribute('fd:state')) FD.State.Apply(el, el.getAttribute('fd:state'));

				this.log('', 'groupEnd');

			} else if (el.tagName.toLowerCase() == 'img') {

				value = (Object.is(node) ? this._ajax.getNodeValue(node, fld, '', 2 /*format the value according to the xml fd:dt attribute*/) : String.create(node));
				el.src = /*'/' + FD.getInfo().domain + '/' +*/value;
				$(el).setVisible(value != '');
				//$(el).prop('width', '').prop('height', '').css('width', 'auto').css('height', 'auto');

			} else {
				// format the xml value to the format specified on the element
				if (Object.is(node)) node = this._ajax.selectSingleNode(node, fld);
				prev_value = el.value;
				value = FD.Input.Format(el, (Object.is(node) ? this._ajax.getNodeValue(node, null, '', 2 /*only convert a date value to it's native type (according to the xml fd:dt attribute if exists) for proper formatting*/) : node), false, null, (!Object.is(node) || !node.getAttribute('fd:dt')) && !Date.is(node));
				//FD.Debug.trace('fillField', 'el=' + el.id + ', value=' + value);
				el.value = el.prevValue = value;
				$(el).data('origValue', el.value);
				//String.log('AJAX.Form.fillField, id=' + el.id + ', value=' + value);

				changed = changed || prev_value != el.value;
				if (apply_state && el.getAttribute('fd:state')) FD.State.Apply(el, el.getAttribute('fd:state'));
			}
		} catch (e) {

			this.log(['.fillField', node, fld, el, value], 'error');

			FD.Error.Alert(true, e, 'fd_ajax.js', 1730, 'AJAX.Form.fillField', 'node=' + node + '/typeof=' + typeof node + '/object.is=' + Object.is(node) + '/' + Object.inspect(node, null, 1) + ', el=' + Object.inspect(el) + ', type=' + type + ', value=' + value);
		}
		try {
			if (/*changed && */typeof aEvents != 'undefined') { aEvents.exec((typeof el.tagName == 'undefined' ? el[0].name : el.name), null, el, 'AJAX.Form.fillField', false, null, thread); }
			else if (typeof jQuery != 'undefined') {
				(function () {
					//String.log('Trigger the change event', 'info');
					jQuery(el).trigger('change', [true /*interactive/custom*/]).trigger('ajax-change');
				}).delay(0);
			}
		} catch (e) {
			FD.Error.Alert(true, e, 'fd_ajax.js', 1736, 'AJAX.Form.fillField', 'node=' + node + '/typeof=' + typeof node + '/object.is=' + Object.is(node) + ', el=' + Object.inspect(el) + ', type=' + type + ', value=' + value);
		}
	},

	fillList: function (el, rs, fld, options, thread) {

		var f = aFields.search(el), arr = [], prev_value = aFields.value(el), org = el, force = false;
		el = FD.get(el, document);

		// backwards compatibility
		if (arguments.length >= 6) {
			options = { sortfield: options, sortorder: thread }
			thread = arguments[5];
		}

		options = options || {};
		var sortfld = options['sortfield'] || '',
			sortorder = options['sortorder'] || '',
			selectsingle = options['selectsingle'] || false;

		try {

			if (rs) {
				var val, sort, i, j;
				// fill the array with the options in the first column and the sort values in the second column
				for (i = 0; i < rs.length; i++) {
					val = this._ajax.getNodeValue(rs[i], fld, '', 2 /*format the value according to the xml fd:dt attribute*/);
					sort = this._ajax.getNodeValue(rs[i], sortfld, '', 1 /*convert to it's native type according to the xml fd:dt attribute (if exists)*/);
					//					alert(val + ', ' + typeof sort);
					if (String.is(val) && /\n/.test(val)) { // it's a value from a multiple-choice, select many
						val = val.replace(/\r/g, '').split('\n');
						for (j = 0; j < val.length; j++) { arr.push([val[j], (String.is(sort) ? sort.toLowerCase() : sort)]); }
					} else {
						arr.push([val, (String.is(sort) ? sort.toLowerCase() : sort)]);
					}
				}
				arr = arr.sort_multi(1); // sort based on the values in the second column (ascending)
				arr = arr.distinct(0); // distinct values based on the first column
				if (sortorder == 2) arr = arr.reverse(); // descending

				// create a one dimensional array again
				for (i = 0; i < arr.length; i++) {
					arr[i] = arr[i][0];
				}

				//String.log(['.fillList', arr]);

			}
			if (f.type == 7 /*dropdown listbox*/) {
				el.length = 0;
				addOption(document, el, '', '');
				for (var i = 0; i < arr.length; i++) {
					if (!arr[i].trim().empty()) {
						addOption(document, el, arr[i], arr[i]);
					}
				}
				if (el.options.length == 2 && selectsingle) { el.selectedIndex = 1; force = (prev_value != el.value); prev_value = el.value; }
			
			} else if (f.type.list(5, 6)) {

				FDItems.createOptions(f, arr, options);
				el = (arr.length > 0 ? FD.get(f.name + 'opt1') : null);

			}
			if (prev_value) {
				aFields.setvalue(f.name, prev_value, true);
			}

			if ((aFields.value(org) != prev_value || force) && typeof aEvents != 'undefined') {
				/* per 16-12-2013 bovenstaande controle of de waarde is veranderd weer ingeschakeld (was uitgeschakeld/uitgesterd)
				het bleek dat bij initialisatie een waardelookup van een veld dat op dit veld is gebaseerd werd uitgevoerd
				en dus de opgeslagen waarde veranderde. dat was niet wenselijk.
				*/
				/* per 15-06-2015 de thread uitgeschakeld. Wanneer er lookups zijn op basis van deze keuzelijst dan worden deze lookups in een nieuwe thread uitgevoerd.
				Situatie was: keuzelijst 1, 2, 3 waarbij 2 afhankelijk van 1, 3 afhankelijk van 1 en 2 en daarna nog andere lookups afhankelijk van 1, 2 en 3. 
				Wanneer dan keuzelijst 1 veranderd, dan worden alle lookups getriggerd. Komt keuzelijst 2 terug met andere opties worden de lookups wederom getriggerd.
				Komt keuzelijst 3 terug worden weer alle lookups daaronder getriggerd. Dit gebeurde allemaal in één thread waardoor Formdesk stopte bij 10 lookups.
				Er is nu gekozen om bij het veranderen van de waarde van een keuzelijst een nieuwe thread te starten. Dit is hetzelfde als wanneer de gebruiker een keuze maakt.
				*/
				aEvents.exec(f.name, null, el, 'AJAX.Form.fillList', false, null/*, thread*/);
			}
		} catch (e) {
			FD.Error.Alert(true, e, 'fd_ajax.js', 2195, 'AJAX.Form.fillList', 'org=' + org + ', el=' + el + ', f=' + f + ', f.type=' + (f ? f.type : '<invalid>') + ', arr=' + arr);
		}
	},

	getList: function (list, url_part, initValue) {
		aEl = list.split('|');
		var data = this.create(aEl[0]);
		data.url_part = url_part;
		data.search = '';
		data.selector = { element: FD.get(aEl[0]) };
		if (aEl.length > 1) data.selector.mapping = aEl[1];
		this.getData(data, null, initValue);
	}

});

var FDAjaxFormTask = new Class({

	Extends: FDBaseClass,
	_class: 'FDAjaxFormTask',

	_trace: true,
	_ajax: null,

	timerID: 0,
	data: null,
	req: null,
	ready: false,

	initialize: function (ajax) {
		this.parent();
		this._ajax = ajax;

		var _self = this;
		this.calls = (typeof FDReferences != 'undefined' ? new FDReferences('Lookup', { onRemove: function () { if (this._count <= 0) { ajax.silent = false; _self._sync = false; } } }, FD.Form.References) : null);
	},

	create: function () {
		return this._ajax.Form.create.apply(this._ajax.Form, arguments);
	},
	url: function (action, id_item, format, task) {
		var url = FDAjaxDataForm.createDefaultUrl(action);
		url.querySet('task', task || 'get');
		if (id_item) url.querySet('id_item', id_item);
		if (format) url.querySet('format', format);
		if (url.queryGet('sidn').empty()) {
			var sidn = FD.getAuth().sidn;
			if (sidn) url.querySet('sidn', sidn);
		}
		return url.toString();
	},
	clearTimer: function () {
		if (this.timerID > 0) {
			window.clearTimeout(this.timerID);
			this.timerID = 0;
		}
	},
	call: function (data) {
		data = data || this.data;
		this.req = null;
		if (data) {
			this.log(['.call', data]);
			this.req = this._ajax.Form.getData(data, null);
		}
		return data;
	},
	save: function (data, async, form, single, compare) {
		var options = arguments[1];
		if (!Object.is(options)) {
			options = { async: arguments[1] || false, form: arguments[2] || null, single: arguments[3] || false, compare: arguments[4] || null };
		}
		options = FDOptions.create(options);
		if (!options.form) options.form = document.builder;

		return this.exec('save', data, options.setValue('verb', 'POST'));

	},
	single: function (data, el) {
		return this.save(data, { async: true, form: { elements: new Array(el) }, single: true, noload: true });
	},
	get: function (data) { //, async, url_params, getonly

		var options = arguments[1];
		if (!Object.is(options) && !FDOptions.is(options)) {
			options = { async: arguments.length == 1 || arguments[1], query: arguments[2] || null, getonly: arguments[3] || data.getonly };
		}
		options = FDOptions.create(options);

		return this.exec('get', data, options.setValue('verb', 'get'));

	},
	remove: function (data, options) {
		if (!options.verb) options.verb = 'get';
		return this.exec('remove', data, options);
	},
	exec: function (task, data, options) {

		if (typeof data == 'string') {
			// data parameter contains the name, so get the object
			var str = data;
			data = this._ajax.Form[data.split('|')[0]];
			if (!data) data = this.create(str);
		}

		//		if (!FDOptions.is(options)) options = FDOptions.create(options);
		options = FDOptions.create({
			async: true,
			ready: false,
			verb: 'GET',
			charset: 'utf-8',
			getonly: false,
			content: (options && options.form ? (String.is(options.form) ? FDKeys.fromQueryString(options.form) : (FDKeys.is(options.form) ? options.form : FDAjax.Utils.collectFormData(options.form, true, true))) : null)
		}, options);
		
		
		var clone = (options.async ? data.clone() : data); // when async, clone the object to avoid simultaneous use of the same object
		clone.set(options); //.setOptions(options);
		clone.url.query.clear().set({ task: task, single: options.single || false, silent: (FD.Backend && FD.Backend.Context.get('silent', false, 'boolean') ? true : false), lang: FD.getInfo().lang });
		if (options.query) clone.url.queryMerge(options.query); //clone.search += ('?' + url_params);
		if (clone.content) data.content = clone.content;

		this.log(['.exec, task=' + task/*, Object.inspect(options)*/, Object.inspect(clone)]);

		if (options.compare) {
			
			var equal = false, item, compare = clone.compare, content = clone.content;

			if (String.is(compare) && String.is(content) && content == compare) {
				equal = true;
			} else if (FDKeys.is(compare) && FDKeys.is(content)) {
				equal = true;
				for (var i = 0, len = compare.length; i < len; i++) {
					item = compare[i];
					equal = equal && content.get(item.key) == item.value;
					if (!equal) break;
				}
			}
			
			if (equal) {

				this.log('.exec, EQUAL!', 'info');
				clone.makeDeferred(); // we return prematuraly. so, make a deferred object here

				//if (options.async) {

					this._ajax.Form.Task.ready = true;
					clone.fireEvent('onReady', [null, clone]);
					this._ajax.fireEvent('onAfterTask' + task.proper(), [null, clone]);
					if (FD.Events) FD.Events.FireEvent('AJAXAfterTask' + task.proper(), { req: null, data: clone });
					if (clone.complete) clone.complete();

				//}

				clone.deferred.resolve(clone);
				return clone;
			}

		}

		if (!clone.callback) {
			clone.callback = (function (req, data) {
				try { this.Form.setData(req, data); } catch (e) { FD.Error.reportPlain("Error setting data.\r\n" + (typeof e.message != 'undefined' ? e.message : e) + '\r\n' + (data ? data.text : ''), '', 850); }
				if ((data.ready || data.error)) {
					if (!data.fatal || (!data.hasEvent('onFatal') && !this.hasEvent('onFatal'))) {
						this.Form.Task.ready = true;
						data.fireEvent('onReady', [req, data]);
						this.fireEvent('onAfterTask' + task.proper(), [req, data]);
						if (FD.Events) FD.Events.FireEvent('AJAXAfterTask' + task.proper(), { req: req, data: data });
						if (data.complete) data.complete();
						try { if (data.error && !data.noload && this.showLoad) { top.showLoad(true); } } catch (e) { alert('AJAX callback: ' + (e.message || e)); };
					} else {
						data.fireEvent('onFatal', [req, data]);
						this.fireEvent('onFatal', [req, data]);
					}
					data.fireEvent('onComplete', [req, data]);
					this.fireEvent('onComplete', [req, data]);
				}
			}).bind(this._ajax);
		}
		this.data = clone;
		this.ready = false;
		try { if (!clone.noload) { clone.showLoad = top.showLoad; } } catch (e) { };
		if (clone.async) {
			this.call(clone); //.delay(this, 0, clone);
			return clone;
		} else {
			this.log('NOT ASYNC', 'info');
			return this.call();
		}
	},
	getvalue: function (data, url_params, return_type, return_field, cache) {
		this._ajax.setBusy(true, 'FDAjaxForm.getvalue');

		if (typeof data == 'string') {
			// data parameter contains the name, so get the object
			var str = data;
			data = this._ajax.Form[data];
			if (!data) data = this.create(str);
		}
		this.clearTimer();
		data.ready = this.ready = false;
		data.verb = 'GET';
		data.async = false;
		if (arguments.length >= 5) data.cache = cache;
		data.callback = this._ajax.Form.setData.bind(this._ajax.Form);

		data.url.query.clear().set({ 'task': 'get', 'lang': FD.getInfo().lang });
		if (url_params) data.url.queryMerge(url_params);

		data.getonly = true;
		this.data = data;
		this.call();
		if (data.ready && data.recordset.length == 1) {
			this._ajax.setBusy(false, 'FDAjaxForm.getvalue');
			return this._ajax.getNodeValue(data.recordset.item(0), return_field || 'value', '', return_type || 'boolean');
		}
		this._ajax.setBusy(false, 'FDAjaxForm.getvalue');

		return true;
	},
	check: function (data, value, url_params, return_type, method) {

		this._ajax.setBusy(true, 'FDAjaxForm.check');

		if (typeof data == 'string') {
			// data parameter contains the name, so get the object
			var str = data;
			data = this._ajax.Form[data];
			if (!data) data = this.create(str);
		}
		this.clearTimer();

		var options = arguments[1];

		if (!Object.is(options) && !FDOptions.is(options)) {
			options = { value: arguments[1], query: arguments[2] || null, returnType: arguments[3], verb: arguments[4] || 'GET' };
		}
		options = FDOptions.create({ async: false, verb: 'GET', getonly: true, noload: true }, options);
		
		if (!options.query) {
			options.query = new FDKeys();
		} else if (!FDKeys.is(options.query)) {
			options.query = new FDKeys(options.query);
		}
		
		data.clearEvents();

		data.ready = this.ready = false;
		data.callback = (function (req, data) {
			try { this.Form.setData(req, data); } catch (e) { FD.Error.reportPlain("Error setting data.\r\n" + (typeof e.message != 'undefined' ? e.message : e) + '\r\n' + (data ? data.text : ''), '', 850); }
			if ((data.ready || data.error)) {

				var retval = null;
				if (data.ready && data.recordset.length == 1) {

					if (data.type == 'xml') {
						retval = this.getNodeValue(data.recordset.item(0), 'value', '', options.returnType || 'boolean');
					} else if (data.type == 'json') {
						retval = data.recordset.item(0).success;
					}
					
				}

				if (!data.fatal || (!data.hasEvent('onFatal') && !this.hasEvent('onFatal'))) {
					this.Form.Task.ready = true;
					data.fireEvent('onReady', [retval, req, data]);
					if (data.complete) data.complete();
					try { if (data.error && !data.noload && this.showLoad) { top.showLoad(true); } } catch (e) { alert('AJAX callback: ' + (e.message || e)); };
				} else {
					data.fireEvent('onFatal', [req, data]);
				}
				data.fireEvent('onComplete', [retval, req, data]);
			}

		}).bind(this._ajax);

		if (options.verb == 'GET') {
			if (Object.is(options.value)) options.query.merge(options.value);
			else {
				options.query.merge({ value: options.value });
			}
		} else if (options.verb == 'POST') {
			if (FDKeys.is(options.value)) options.form = options.value;
			else if (options.value) options.form = new FDKeys({ value: options.value });
		}

		data = this.exec('check', data, options);

		if (!data.async && data.ready && data.recordset.length == 1) {

			this._ajax.setBusy(false, 'FDAjaxForm.check');

			if (data.type == 'xml') {
				return this._ajax.getNodeValue(data.recordset.item(0), 'value', '', options.returnType || 'boolean');
			} else if (data.type == 'json') {
				return data.recordset.item(0).success;
			}

		}

		this._ajax.setBusy(false, 'FDAjaxForm.check');

		return true;
	},
	toggle: function (data, task, id, url_params, async) {

		if (typeof data == 'string') {
			// data parameter contains the name, so get the object
			var str = data;
			data = this._ajax.Form[data];
			if (!data) data = this.create(str);
		}
		this.clearTimer();

		var clone = (async ? data.clone() : data);
		Object.extend(clone, {
			ready: false,
			verb: clone.verb || 'GET',
			async: (arguments.length == 5 ? async : false),
			silent: false,
			getonly: true
		});

		clone.url.query.clear().set({ task: 'toggle', item: task, id: id, lang: FD.getInfo().lang });
		if (url_params) clone.url.queryMerge(url_params);

		clone.task = task;
		if (clone.async) {
			clone.callback = (function (req, data) {
				this.Form.setData(req, data);
				if ((data.ready || data.error) && !data.fatal) {
					this.Form.Task.ready = true;
					var values = (data.type == 'xml' ? (data.recordset && data.recordset.length == 1 ? data.recordset.item(0).selectNodes('//value') : null) : data.recordset);
					data.fireEvent('onReady', [req, values]);
					this.fireEvent('onAfterTaskToggle', [req, data, values]);
					if (FD.Events) FD.Events.FireEvent('AJAXAfterTaskToggle', { req: req, data: data, values: values });
					//try { top.showLoad(true); } catch (e) { };
				}
			}).bind(this._ajax);
		} else {
			clone.callback = this._ajax.Form.setData.bind(this._ajax.Form);
			this._ajax.setBusy(true, 'FDAjaxForm.toggle');
		}
		this.data = clone;
		if (clone.async) {
			this.call(clone);
			return clone;
		} else {
			this.call();
			if (clone.ready && clone.recordset.length == 1) {
				this._ajax.setBusy(false, 'FDAjaxForm.toggle');
				return clone.recordset.item(0).selectNodes('//value');
				//            return AJAX.getNodeValue(data.recordset.item(0), 'value', '', return_type || 'string');
			}
			this._ajax.setBusy(false, 'FDAjaxForm.toggle');
		}

		return true;
	},

	json: function (fdSettings, jqSettings) {
		var data = {};
		jqSettings = FDAjaxDataForm.createJSON(fdSettings, jqSettings); // create a settings object for the jQuery call
		// add our own error handler when there is none defined
		jqSettings.error = Array.create(jqSettings.error).add((function (jqXHR, textStatus, errorThrown) {
			this.log('.json, ERROR, text=' + (textStatus || '') + ', error=' + (errorThrown || ''));
		}).bind(this));
		if (!jqSettings.async) {
			// add a success handler to capture the data when called synchronous
			jqSettings.success = Array.create(jqSettings.success).add(function (p) { data = p; });
		}
		this.log('.json, url=' + jqSettings.url.toString());
		$.ajax(jqSettings);
		return data;
	}
});

var FDAjaxJob = new Class({

	Extends: FDBaseClass,
	_class: 'FDAjaxJob',

	_trace: true,
	_ajax: null,

	_jobs: null,

	initialize: function (ajax) {
		this.parent();
		this._ajax = ajax;
		this._jobs = new FDObjects();
	},
	start: function (action, url_params, count, func, delay) {
		var action = action.split('|');
		var jid = this._ajax.Form.Task.getvalue('job', { job: action[0] }, 'string');
		var job = { name: jid, action: action, count: count || 0, cnt: 0, timeout: false, func: func, tmr: 0, delay: delay || 300 };
		if (jid) {
			this._jobs.push(job);
			var data = this._ajax.Form.create((action.length > 1 ? action[1] : action[0]));
			data.noload = true;
			FD.Window.showLoader();
			job.tmr = this.check.delay(this, job.delay, job);
			this._ajax.Form.Task.get(data, true, (new FDKeys(url_params)).set('job', job.name));
		}
		return job;
	},
	check: function (job) {
		job.cnt++;
		job.timeout = (job.count > 0 && job.cnt > job.count)
		var val = this._ajax.Form.Task.check('job', job.name, (job.count ? { count: job.count } : ''), 'string');
		if (job.func && job.func(job, val)) {
			job.tmr = this.check.delay(this, job.delay, job);
		} else {
			FD.Window.hideLoader();
			this._jobs.remove(job.index);
		}
	},
	stop: function (job) {
		if (job.tmr > 0) window.clearTimeout(job.tmr);
		this._jobs.remove(job.index);
	}
});

var FDAjaxTexts = new Class({

	Extends: FDBaseClass,
	_class: 'FDAjaxTexts',

	_ajax: null,

	texts: {},
	defaults: {},

	initialize: function (ajax) {
		this.parent();
		this._ajax = ajax;

		this.defaults['NL'] = {
			progress: 'Ophalen gegevens. . .',
			selector_option: '-> Maak een keuze <-',
			error_send_request: 'Er is een fout opgetreden bij het opvragen van de gegevens!',
			error_request: 'Er kunnen geen gegevens opgehaalt worden!',
			alert_nodata: 'Er zijn geen gegevens gevonden!',
			error_selector: 'Er is een fout opgetreden bij het selecteren van de gegevens!\nDe gegevens kunnen niet worden gevonden.'
		}
	},
	set: function (texts) {
		for (key in texts) {
			this.texts[key] = texts[key];
		}
	},
	get: function (key, alt) {
		return (this.texts[key] ? this.texts[key] : (alt ? alt : ''));
	}
});

var AJAX = FD.Ajax = new FDAjax();

// jQuery
if (typeof jQuery != 'undefined') {

	$.formdesk.ajax = {};
	$.formdesk.ajax.rest = function () {
		return FDAjaxDataRest.create.apply(FDAjaxDataRest, arguments);
	}

}

function XMLDummyNode(value) {
	this.value = value;
}
XMLDummyNode.prototype.selectSingleNode = function(name) { return { firstChild: { nodeValue: this.value } }; }

/* XMLNodeList; emulates a collection object */

function XMLNodeList(i) {
	this.length = i;
}
XMLNodeList.prototype = new Array(0);
/** Inherit the Array constructor */
XMLNodeList.prototype.constructor = Array;
/**
* Returns the node at the specified index or null if the given index
* is greater than the list size or less than zero
* Note that in ECMAScript you can also use the square-bracket
* array notation instead of calling <code>item</code>
* @argument i the index of the member to return
* @returns the member corresponding to the given index
*/
XMLNodeList.prototype.item = function(i) {
	return (i < 0 || i >= this.length) ? null : this[i];
};
/**
* Emulate IE's expr property
* (Here the XMLNodeList object is given as the result of selectNodes).</p>
* @returns the XPath expression passed to selectNodes that resulted in
* this XMLNodeList
*/
XMLNodeList.prototype.expr = "";

/* XPath IE emulation */
if (document.implementation && document.implementation.hasFeature("XPath", "3.0")) {


	/** dummy, used to accept IE's stuff without throwing errors */
	if (window.XMLDocument && (!XMLDocument.prototype.setProperty)) {
		XMLDocument.prototype.setProperty = function(x, y) { };
	};

	XMLDocument.prototype.selectNodes = function(cXPathString, xNode) {
		if (!xNode) { xNode = this; }

		var oNSResolver = this.createNSResolver(this.documentElement);
		var aItems = this.evaluate(cXPathString, xNode, oNSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
		var oNodeList = new XMLNodeList(aItems.snapshotLength);
		for (var i = 0; i < aItems.snapshotLength; i++) {
			oNodeList[i] = aItems.snapshotItem(i);
		}

		return oNodeList;
	}
	XMLDocument.prototype.selectSingleNode = function(cXPathString, xNode) {
		if (!xNode) { xNode = this; }

		var oNodeList = this.selectNodes(cXPathString, xNode);
		if (oNodeList.length > 0) {
			return oNodeList.item(0);
		} else {
			return null;
		}
	}
	
	if (FD.Browser.chrome && FD.Browser.version_chrome[0] == 34) {
		Document.prototype.selectNodes = function (cXPathString, xNode) {
			if (!xNode) { xNode = this; }

			var oNSResolver = this.createNSResolver(this.documentElement);
			var aItems = this.evaluate(cXPathString, xNode, oNSResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
			var oNodeList = new XMLNodeList(aItems.snapshotLength);
			for (var i = 0; i < aItems.snapshotLength; i++) {
				oNodeList[i] = aItems.snapshotItem(i);
			}

			return oNodeList;
		}
		Document.prototype.selectSingleNode = function (cXPathString, xNode) {
			if (!xNode) { xNode = this; }

			var oNodeList = this.selectNodes(cXPathString, xNode);
			if (oNodeList.length > 0) {
				return oNodeList.item(0);
			} else {
				return null;
			}
		}
	}

	Element.prototype.selectNodes = function(cXPathString) {
		if (this.ownerDocument.selectNodes) {
			return this.ownerDocument.selectNodes(cXPathString, this);
		} else { throw "For XML Elements Only"; }
	}

	Element.prototype.selectSingleNode = function(cXPathString) {
		if (this.ownerDocument.selectSingleNode) {
			return this.ownerDocument.selectSingleNode(cXPathString, this);
		} else { throw "For XML Elements Only"; }
	}

}

String.log('SCRIPT LOADED: fd_ajax.js');

var __FD_AJAX = true;
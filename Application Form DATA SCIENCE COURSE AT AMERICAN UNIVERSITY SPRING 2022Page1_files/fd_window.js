
/*
	Dependencies: jquery, fd_general.js, fd_general.extensions.js
*/

// have to find out yet if this is used somewhere
window.WND = FD.WND = {
	Defaults: {
		Titles: {
			STOP: 'Stop!',
			QUESTION: 'Question',
			EXCLAMATION: 'Alert!',
			INFORMATION: 'Infomation'
		}
	}
};

(function ($) {

	window.FDWindowManager = new Class({

		Extends: FDBaseClass,
		Implements: [Options, Events],
		_class: 'FDWindowManager',

		_trace: false,

		options: { contextWindow: null, baseZIndex: 20000 },
		defaults: {},
		windows: [],

		// context properties
		currentContext: null,
		isGlobal: false,
		baseZIndex: 0,

		_queue: null,
		_tmrHideLoader: 0,

		initialize: function (options, defaults) {

			this.parent();
			this.setOptions(options);
			this.defaults = $.extend({}, FDWindowManager.defaults, defaults);
			this._queue = new FDQueue();

			this.log('.initialize');

			FD.Resource.load('window.css');

		},

		getTop: function () {
			var tw = window;
			try {
				if (typeof top.FD.Window != 'undefined') {
					tw = top;
				}
			} catch (e) { }

			return tw;
		},
		
		getBaseZIndex: function (recursive) {

			var start = (recursive ? window : this.getTop());

			//this.log('.getBaseZIndex, recursive=' + recursive + ', start=' + start);

			var wm = start.FD.Window, base = wm.baseZIndex || wm.options.baseZIndex;
			var ifs = start.document.getElementsByTagName('iframe');
			$(ifs).each(function () {
				try {
					var cw = this.contentWindow ? this.contentWindow : this.contentDocument.defaultView;
					if (cw.FD && typeof cw.FD.Window != 'undefined') {
						var compare = cw.FD.Window.getBaseZIndex(true);
						if (compare > base) {
							base = compare;
						}
					}
				} catch (e) { String.log('.getBaseZIndex, src=' + this.src); String.log(e, 'error'); }
			});

			this.log('.getBaseZIndex, base=' + base);

			return base;
		},

		getContextWindow: function () {

			//this.log('.getContextWindow');
			var contextWindow;
			// for the time being that Formdesk uses frames
			try {
				this.isGlobal = typeof (top.Global) != 'undefined' && typeof (top.Private) == 'undefined';
			} catch (e) { };
			if (this.isGlobal) {
				try {
					switch (top.Global.Props.Prop.Action) {
						case 6: contextWindow = top.Global.Content.frames[0]; break;
						case 8: contextWindow = top.Global.Content.frames[1]; break;
						default: contextWindow = top.Global.Content; break;
					}
				} catch (e) { contextWindow = top.Global.Content; }
			} else {
				try {
					if (typeof top.Private != 'undefined') contextWindow = top;
					else contextWindow = window;
				} catch (e) { contextWindow = window; }
			}

			if (!contextWindow.FDWindowManager) contextWindow.FDWindowManager = new FDWindowManager(this.options);

			return contextWindow;
		},

		getContext: function (options) {
			//this.log('.getContext');
			var contextWindow = (options ? (options.standalone ? window : (options.contextWindow || this.getContextWindow())) : this.getContextWindow());
			this.currentContext = { window: contextWindow, document: contextWindow.document, original: window, same: contextWindow === window };
			return this.currentContext;
		},

		getInstance: function (name) {
			return (this.windows[name] || null);
		},
		addInstance: function (cwindow) {
			if (this.windows.seek(cwindow.name)) return this;
			this.windows[cwindow.name] = cwindow;
			this.windows.push(cwindow.name);
			return this;
		},
		removeInstance: function (cwindow) {
			var name = cwindow.name, index = this.windows.search(name);
			cwindow = null;
			this.windows.remove(index);
			//delete this.windows[name];
			this.windows[name] = null;
			return this;
		},
		onTop: function (cwindow) {
			this.log('.onTop', 'group');
			this.removeInstance(cwindow).addInstance(cwindow);
			var base = this.getBaseZIndex(), wnd, sot = null /* stickontop */;
			$(this.windows).each($.proxy(function (index, el) {
				wnd = this.windows[el];
				wnd._isOnTop = false;
				if (wnd.options.stickOnTop) sot = wnd;
				/*if (wnd.visible && wnd.type != 'classic' && !wnd.options.stickOnTop && !wnd.options.element) {
					this.log('.onTop, window=' + wnd.name + ', base=' + base);
					if (wnd._blind) wnd._blind._window.css({ zIndex: base++ });
					try { wnd._window.css({ zIndex: base }); } catch (e) { }
					base++;
				}*/
			}, this));

			if (cwindow.visible && cwindow.type != 'classic' && !cwindow.options.stickOnTop && !cwindow.options.element) {
				this.log('.onTop, window=' + cwindow.name + ', base=' + base);
				if (cwindow._blind) cwindow._blind._window.css({ zIndex: base++ });
				try { cwindow._window.css({ zIndex: base }); } catch (e) { }
				base++;
			}

			this.baseZIndex = base;

			if (sot) {
				if (sot._blind) sot._blind._window.css({ zIndex: base++ });
				try { sot._window.css({ zIndex: base }); } catch (e) { }
				sot._isOnTop = true;
			} else {
				cwindow._isOnTop = true;
			}

			this.log('', 'groupEnd');
		},
		getTopWindow: function () {
			var wnd = null;
			$(this.windows).each($.proxy(function (index, el) {
				if (this.windows[el]._isOnTop) wnd = this.windows[el];
			}, this));
			return wnd;
		},

		isOpen: function (f, options, any) { // f, name, types
			var is_open = false, cwindow;
			if (String.is(options)) {
				options = { name: options };
			} else if (!options) {
				options = { types: ['dialog'] };
			}
			if (!options.types) {
				options.types = ['dialog'];
			} else if (String.is(options.types)) {
				options.types = options.types.split(',');
			}
			
			this.log(['.isOpen, any=' + any, options]);

			if (options.name && !any) {
				cwindow = this.getInstance(options.name);
				is_open = (cwindow && cwindow.visible);
			} else {
				if (!options.types) {
					options.types = ['dialog'];
				} else if (String.is(options.types)) {
					options.types = options.types.split(',');
				}
				$(this.windows).each(
					$.proxy(function (index, el) {
						is_open = options.types.seek(this.windows[el].type) && this.windows[el].visible && (!options.role || any || (this.windows[el].options.role || '') == options.role);
						if (is_open) {
							cwindow = this.windows[el];
							return false;
						}
					}, this));
				if (!is_open) {
					try {
						if (typeof top.FD.Window != 'undefined') {
							$(top.FD.Window.windows).each(
								$.proxy(function (index, el) {
									is_open = options.types.seek(this.windows[el].type) && this.windows[el].visible && (!options.role || any || (this.windows[el].options.role || '') == options.role);
									if (is_open) {
										cwindow = this.windows[el];
										return false;
									}
								}, top.FD.Window));
						}
					} catch (e) { }
				}
			}
			if (f) {
				this.log('.isOpen, is_open=' + is_open);
				if (is_open) {
					this._queue.push(f);
//					cwindow.add2Queue(f);
				} else f();
			}
			return is_open;
		},

		getName: function (type, options) {
			var suffix = type.proper();
			if (options) {
				var key = [];
				if (options.type) suffix = suffix + options.type.proper();
				if (options.windowType) key.push(options.windowType);
				if (options.closable) key.push('closable');
				if (options.title) key.push('title');
				if (options.icon) key.push('icon');
				if (options.noButtons) key.push('nobuttons');
				if (options.texts) key.push('lang=' + options.texts.lang);
				key = key.join('-');
				$.each((options.theme || this.defaults.theme).split(","), function (i, n) { suffix += n.proper(); });
			} else {
				var key = '';
			}
			return ('fdWindow' + suffix + '[' + (!options || !options.name ? this.getUniqueID() : options.name)).append(key, '-') + ']';
		},

		create: function (type, options, name) {

			//this.log('.create (type=' + type + ', name=' + name + ')');

			if (options && options.preset) options = this.preset(options.preset, options, options.cancable || false);

			if (!name) name = this.getName(type, options);

			var cwindow = this.getInstance(name);
			if (!cwindow) {
				this.log('.create (new instance, type=' + type + ', name=' + name + ')');
				cwindow = new FDWindowManager.classes[type]($.extend(options, { windowManager: this }), name);
				//this.addInstance(cwindow);
			} else if (options) {
				this.log('.create (existing instance, type=' + type + ', name=' + name + ')');
				cwindow.setOptions(options);
			}

			return cwindow;
		},

		show: function (type, options) {

			this.log('.show (type=' + type + ')');
			
			if (typeof window.cwindow != 'undefined' && window.cwindow.type != 'classic') {
				this.log('.show, defer call to other WindowHandler');
				// called from within an dialog
				return window.cwindow.WM.show.apply(window.cwindow.WM, arguments);
				//return;
			}
			if (options && options.preset) options = this.preset(options.preset, options, options.cancable || false);
			
			var name = this.getName(type, options), cwindow = this.getInstance(name);
			if (!cwindow) {

				cwindow = this.create(type, options, name);

				this.log('.show, fireEvent');
				this.fireEvent('onBeforeShow', [type, cwindow, options]);
				cwindow.show();

			} else {

				this.log('.show (existed)');
				cwindow.existed = true;

				this.log('.show, fireEvent');
				this.fireEvent('onBeforeShow', [type, cwindow, options]);

				cwindow.show(options);
			}
			
			return cwindow;
		},
		queue: function (type, options, any) {
			this.log('.queue (type=' + type + ')');

			if (typeof window.cwindow != 'undefined' && window.cwindow.type != 'classic') {
				// called from within an dialog
				return window.cwindow.WM.show.apply(window.cwindow.WM, arguments);
				//return;
			}
			if (options && options.preset) options = this.preset(options.preset, options, options.cancable || false);

			var name = this.getName(type, options), cwindow = this.getInstance(name), f, _wm = this;
			if (!cwindow) {

				cwindow = this.create(type, options, name);
				f = function () {
					_wm.fireEvent('onBeforeShow', [type, cwindow, options]);
					cwindow.show();
				}

			} else {

				this.log('.show (existed)');
				cwindow.existed = true;

				f = function () {
					_wm.fireEvent('onBeforeShow', [type, cwindow, options]);
					cwindow.show(options);
				}

			}

			this.isOpen(f, { role: options.role || 'dialog' }, any);

			return cwindow;
		},

		showDialog: function (options) {
			this.log('.showDialog');
			return this.show((options.classic ? 'classic' : 'dialog'), options);
		},
		hideDialogs: function () {
			this.log('.hideDialogs');
			var cw = this.getContextWindow(), name;
			if (cw != window && typeof cw.FD != 'undefined') cw.FD.Window.hideDialogs();
			else {
				for (var i = 0; i < this.windows.length; i++) {
					name = this.windows[i];
					if (this.windows[name].type == 'dialog') {
						this.windows[name].hide();
					}
				}
			}
		},

		showClassic: function (options) {
			this.log('.showClassic');
			return this.show('classic', options);
		},

		showBlind: function (options) {
			this.log('.showBlind');
			if (this._blind) {
				this._blind.show(options);
			} else {
				this._blind = this.show('blind', options);
			}
			return this;
		},
		hideBlind: function () {
			this.log('.hideBlind');
			if (this._blind) this._blind.hide();
			return this;
		},

		showLoader: function (options) {
			this.log('.showLoader');
			window.clearTimeout(this._tmrHideLoader);
			if (this._loader) {
				this._loader.show(options);
				this.log('.showLoader, count=' + this._loader._count);
			} else {
				this._loader = this.show('loader', options);
				/*if (!this._loader._created) {
					this._loader = null;
				}*/
			}
			return this;
		},
		updateLoader: function (options) {
			window.clearTimeout(this._tmrHideLoader);
			if (this._loader) {
				this._loader.update(options);
			} else {
				this.showLoader(options);
			}
			return this;
		},
		hideLoader: function (options) {
			if (this._loader) {
				this.log('.hideLoader, ' + this._loader._count);
				this._loader.delayHide(options);
			} else {
				this.log('.hideLoader, loader is not an object', 'error');
			}
			return this;
		},
		pingLoader: function () {
			if (this._loader) {
				this._loader.ping();
			}
			return this;
		},
		getLoader: function (dontCreate) {
			if (!this._loader && !dontCreate) this._loader = this.create('loader', {});
			return this._loader;
		},

		search: function (wnd) {
			this.log('.search');
			var cwindow = null, wm = this;
			$('iframe').each(function () {
				if (this.contentWindow == wnd) { cwindow = $(this).data('cwindow') || top.$(this).data('cwindow'); return false; } //wm.getInstance(/[^\[\]]*/.exec(this.name)); 
			});
			if (!cwindow) {
				$(this.windows).each($.proxy(function (index, el) { if (this.windows[el].type == 'classic' && this.windows[el]._window == wnd) { cwindow = this.windows[el]; return false; } }, this));
			}
			this.log('.search, found=' + (cwindow ? 'yes' : 'no'));
			return cwindow;
		},

		// preset functions
		frame: function (options) {
			return this.showDialog(this.preset('frame', options));
		},
		confirm: function (options, cancable) {
			return this.queue('dialog', this.preset('confirm', options, cancable));
		},
		alert: function (options, cancable) {
			return this.queue('dialog', this.preset('alert', options, cancable));
		},
		stop: function (options, cancable) {
			return this.queue('dialog', this.preset('stop', options, cancable));
		},
		info: function (options) {
			return this.queue('dialog', this.preset('info', options));
		},
		progress: function (options) {
			return this.showDialog(this.preset('progress', options));
		},
		calendar: function (options) {
			return this.showDialog(this.preset('calendar', options));
		},

		preset: function (preset, options, cancable) {
			if (String.is(options)) options = { content: options, onclick: null };
			//if (typeof options.closable == 'undefined') options.closable = true;
			options.preset = '';

			var iconset = ((FD.isFrontend() && typeof options.frontend == 'undefined') || options.frontend ? WND.Constants.iconImages : WND.Constants.iconImages.BACKEND);

			switch (preset) {
				case 'confirm':
					if (!options.title && !options.noTitle) options.title = this.getText({ texts: options.texts, text: 'TITLE_CONFIRM', key: 'Window' });
					options = $.extend({
						name: 'confirm',
						role: 'alertdialog',
						buttonType: (!cancable ? WND.Constants.buttonTypes.YESNO : WND.Constants.buttonTypes.OKCANCEL),
						icon: iconset.INFORMATION,
						width: options.width || (FD.Browser.mobile && !FD.Browser.tablet ? 300 : 400),
						closable: false
					}, options);
					if (!options.title) options.title = '';
					break;

				case 'alert':
					if (!options.title && !options.noTitle) options.title = this.getText({ texts: options.texts, text: 'TITLE_ALERT', key: 'Window' });
					options = $.extend({
						name: 'alert',
						role: 'alertdialog',
						buttonType: (!cancable ? WND.Constants.buttonTypes.OK : WND.Constants.buttonTypes.OKCANCEL),
						icon: iconset.EXCLAMATION,
						width: options.width || (FD.Browser.mobile && !FD.Browser.tablet ? 300 : 400),
						closable: false
					}, options);
					if (!options.title) options.title = '';
					break;

				case 'stop':
					if (!options.title && !options.noTitle) options.title = this.getText({ texts: options.texts, text: 'TITLE_STOP', key: 'Window' });
					options = $.extend({
						name: 'stop',
						role: 'alertdialog',
						buttonType: (!cancable ? WND.Constants.buttonTypes.OK : WND.Constants.buttonTypes.OKCANCEL),
						icon: iconset.STOP,
						width: options.width || (FD.Browser.mobile && !FD.Browser.tablet ? 300 : 400),
						closable: false
					}, options);
					if (!options.title) options.title = '';
					break;

				case 'info':
					if (!options.title && !options.noTitle) options.title = this.getText({ texts: options.texts, text: 'TITLE_INFO', key: 'Window' });
					options = $.extend({
						name: 'info',
						role: 'alertdialog',
						buttonType: WND.Constants.buttonTypes.CLOSE,
						icon: iconset.INFORMATION,
						width: options.width || (FD.Browser.mobile && !FD.Browser.tablet ? 300 : 400),
						closable: true
					}, options);
					break;

				case 'progress':
					options = $.extend({
						name: 'progress',
						role: 'status',
						width: 300,
						buttonType: WND.Constants.buttonTypes.STOP,
						icon: iconset.PROGRESS,
						title: this.getText({ texts: options.texts, text: 'TITLE_PROGRESS', key: 'Window' }),
						closable: false
					}, options);
					break;

				case 'date':
				case 'calendar':
					options = $.extend({
						name: 'calendar',
						buttonType: WND.Constants.buttonTypes.OKCANCEL,
						noTitle: true,
						theme: (options.theme || this.defaults.theme).append('calendar', ','),
						closable: true
					}, options);
					break;

				case 'frame':
					options = $.extend({
						name: options.name || 'frame',
						windowType: WND.Constants.windowTypes.FRAME,
						buttonType: WND.Constants.buttonTypes.NONE,
						closable: true
					}, options);
					break;
			}

			return options;
		},

		open: function () {
			var wnd = window.open.apply(window, arguments);
			wnd.opener = null;
		}

	});

	/* Base class for a window */
	var FDWindowBase = new Class({

		Extends: FDBaseClass,
		Implements: [Events, FDThemeBase],
		_class: 'FDWindowBase',

		_trace: false,

		type: 'base',
		name: '',
		options: {},
		params: null,

		WM: null, // Window Manager
		context: null,

		visible: false,

		_window: null, // this is the internal reference to the main window
		_created: false,
		_tmr: 0,
		_isOnTop: false,

		_proxy: {},

		IEFix: FD.Browser.ie && FD.Browser.version < 7,

		setOptions: function (options) {
			var cw = this.options.contextWindow;
			if (options) {
				if (options.params) this.setParams(options.params);
				if (options.contextWindow) {
					cw = options.contextWindow;
					delete options.contextWindow;
				}
				if (options.onclick) this.options.onclick = null;
				this.parent(options);
				// the contextWindow gets cloned by the setOptions method of MooTools, so place the original window object back
				if (cw) this.options.contextWindow = cw;
				if (Object.is(options.url)) options.url = options.url.toString();
			}
		},

		initialize: function (options, name) {

			this._class = 'FDWindow' + this.type.proper();

			this.parent();

			this.WM = options.windowManager || $.fdWindow;
			this.params = new FDKeys();

			//if (options && options.params) { this.setParams(options.params); }
			this.setOptions(Object.extend({}, this.options, this.WM.defaults, options));
			this.name = name || this.WM.getName(this.type, this.options);
			this.WM.addInstance(this);

			this.log('.initialize, contextWindow=' + options.contextWindow);
			this.context = Object.extend({}, this.WM.getContext(this.options));

			/*	add interal events
			these events must be fired from within the corresponding methods
			*/
			this.addEvent('onBeforeCreate', function () {
				this.log('.create.onBeforeCreate');
				// compose the theme classname which will be the first class of all elements
				this.getTheme();
			});
			this.addEvent('onAfterCreate', function () {
				this.log('.create.onAfterCreate');
				this._created = true;
				this.WM.addInstance(this);
				// when the context window unloads then remove this instance from the window manager
				this.context.window.$(this.context.window).unload(this._proxy.unload);
			});
			this.addEvent('onBeforeShow', function (options) {
				this.log('.show.onBeforeShow (created=' + this._created + ')');

				if (options) {
					this.setOptions(options);
				}

				if (!this._created) {
					this.context = this.WM.getContext((options ? Object.extend({}, this.options, options) : this.options));
					try { this.create(); } catch (e) { }
				}

				try { if (this._window instanceof jQuery) this._window.stop(false, true); } catch (e) { }
				//this.log('.show.onBeforeShow (instanceof=' + (this._window instanceof jQuery) + ')');
				this.visible = this._created;

				return this.visible;

			}, true);
			this.addEvent('onAfterShow', function () {
				this.existed = true;
				if (this.context && this.context.window) $(this.context.window).on('scroll resize', this._proxy.repos);
				this.log('.show.onAfterShow');
			}, true);
			this.addEvent('onBeforeHide', function () {
				this.log('.hide.onBeforeHide');
				$(this.context.window).off('scroll resize', this._proxy.repos);
				this.visible = false;
			}, true);
			this.addEvent('onAfterHide', function () {
				this.log('.hide.onAfterHide');
				//if (this.options.element && typeof __resize_window != 'undefined') __resize_window.removeEvent('onAfterResize', this._proxy.repos);
			}, true);

			this.context = this.WM.getContext((options ? Object.extend({}, this.options, options) : this.options));
			try { this.create(); } catch (e) { }

		},

		setParams: function (params) {
			this.log(['.setParams', params]);

			if (!FDKeys.is(params)) {
				this.params = new FDKeys(params);
			} else {
				this.log('.setParams, merge keys', 'info', true);
				this.params.merge(params);
			}
			this.log(['.setParams, end', this.params]);
		},

		createProxies: function (proxies) {
			this.parent($.extend({}, {
				repos: $.proxy(this.repos, this),
				unload: $.proxy(this.destroy, this)
			}, proxies || {}));
		},

		getDimensions: function (wnd) { // get the window or screen dimensions
			
			return FD.ViewPort.getWindowDimensions(wnd);

			var dim = { width: wnd.innerWidth(), height: wnd.innerHeight(), zoom: 1 };
			if (FD.Browser.mobile) {
				// still have to find a way how to get the right dimension on a tablet
				var viewport = Object.extend(dim, FD.ViewPort.getDimensions(wnd[0]));
				dim.centerX = (viewport.width / 2) + viewport.scrollLeft;
				dim.centerY = (100 / viewport.zoom) + viewport.scrollTop;

				//alert(Object.inspect(dim));
			} else {
				dim.centerX = (dim.width / 2) + $(wnd[0].document).scrollLeft();
				dim.centerY = (dim.height / 2) + $(wnd[0].document).scrollTop();
			}
			return dim;
		},

		getWindow: function () {
			return this._window || null;
		},
		getContext: function () {
			return this.context;
		},
		getContent: function () {
			return this._content || null;
		},
		create: function () { },
		show: function () { },
		hide: function () { },
		position: function (e) {
			if (!this.visible) return false;

			try { // can throw an access denied
				var contextWindow = this.context.window, contextDocument = contextWindow.document;
				window.clearTimeout(this._tmr);
			} catch (e) {
				this.log('.position, e=' + (e.message || e), 'error');
				return false;
			}

			return true;
		},
		destroy: function () {
			this.log('.destroy');
			if (this.options.preventDestroy) return;
			try {
				this.context.window.$(this.context.window).unbind('scroll', this._proxy.repos).unbind('resize', this._proxy.repos);
				this.context.window.$(this.context.window).unbind('unload', this._proxy.unload);
			} catch (e) { }

			this.WM.removeInstance(this);
			if (this._window) this._window.remove();
		},
		repos: function (e) {
			if (!this.visible) return;
			window.clearTimeout(this._tmr);
			this.position(e);
			//this._tmr = this.position.delay(this, 100);
		}
	});

	var FDWindowLoader = new Class({

		Extends: FDWindowBase,

		type: 'loader',

		_trace: false,

		_lock: false,
		_count: 0,
		_blind: null,
		_tmrDelay: 0,

		createProxies: function () {
			this.parent({
				fadeIn: $.proxy(function () {
					var span = this._window.find('span');
					span.css('top', (span.parent().height() / 2) - (span.height() / 2));

				}, this),
				fadeOut: $.proxy(function () { this._window.css({ top: '0px', left: '0px' }).removeClass('expanded'); }, this)
			});
		},

		create: function () {

			this.fireEvent('onBeforeCreate');

			this.log('.create');

			// we have to use the jQuery instance of the context window itself. otherwise IE will give an access denied.
			var jQ = this.context.window.$, options = this.options, text = options.text, image = options.image || (options.label.cdn + options.label.path + 'images/loader.gif?v' + options.label.version);
			if (!text) {
				try { text = top.FD.Texts.get('LOADING'); } catch (e) { text = FD.Texts.get('LOADING'); }
			}
			this._window = jQ('<div id="' + this.name + '" class="' + options.className.append(options.loaderClassName, ' ') + '" role="status" style="display:none;position:absolute;left:0px;top:0px"><div><img role="none presentation" src="' + image + '"></div><div><table cellpadding="0" cellspacing="0"><tr><td valign="middle"><div class="main">' + text + '</div><div class="sub" style="display:none"></div></td></tr></table></div>');
			//this.log('.create, append div');
			
			if (jQ('body').length > 0) {

				jQ('body').append(this._window);

				//this.log('.create, create blind');
				this._blind = new FDWindowManager.classes.blind($.extend({}, options, { type: 'light', className: '', preventDestroy: true, onclick: $.proxy(function () { if (this.options.onclick) this.options.onclick(); this.hide(); }, this) }));
				this._blind.create();

				this.fireEvent('onAfterCreate');
			}

		},

		ping: function () {
			if (this._tmrDelay) {
				window.clearTimeout(this._tmrDelay);
				this._tmrDelay = 0;
				if (this._count > 0) this._count--;
			}
		},

		show: function (options) {
			
			if (this._tmrDelay) {
				//window.clearTimeout(this._tmrDelay);
				//this._tmrDelay = 0;
				//if (this._count > 0) this._count--;
				this.log('.show, hiding cancelled, count=' + this._count);
			}

			if (this.visible) {
				if (options && String.is(options.text)) {
					var span = this._window.find('span');
					span.html(options.text);
					span.css('top', (span.parent().height() / 2) - (span.height() / 2));
				}

				this._count++;
				if (options && options.lock) this._lock = true;
				this.log('.show, count=' + this._count + ', lock=' + this._lock + ', return');

				return this;
			} else {
				//this._count = 0;
			}

			if (options) {
				if (options.lock) this._lock = true;
				if (options.expanded) this._window.addClass('expanded');
			}
			if (this.options.contextWindow) delete this.options.contextWindow;

			this.fireEvent('onBeforeShow', options);

			if (!this._created) {
				this._count++;
				this.log('.show, could not create loader window (count=' + this._count + ')');
				return;
			}

			if (options && String.is(options.text)) {
				this._window.find('.main').html(options.text);
			} else {
				var text = '';
				try { text = top.FD.Texts.get('LOADING'); } catch (e) { text = FD.Texts.get('LOADING'); }
				this._window.find('.main').html(text);
			}


			// set this window on top
			this.WM.onTop(this);
			this._blind.show();

			this.position();
			//				this._window.show();
			this._window.fadeIn.delay(this._window, 10, this.options.fadeIn, this._proxy.fadeIn);

			this._count++;

			this.log('.show, count=' + this._count + ', visible=' + this.visible);

			this.fireEvent('onAfterShow');

			return this;
		},

		update: function (options) {

			if (this._tmrDelay) {
				window.clearTimeout(this._tmrDelay);
				this._tmrDelay = 0;
				if (this._count > 0) this._count--;
			}

			if (this._window && options) {
				if (String.is(options.text)) {
					this._window.find('.main').html(options.text);
					//span.css('top', (span.parent().height() / 2) - (span.height() / 2));
				}
				if (String.is(options.subtext)) {
					this._window.find('.sub').html(options.subtext).toggle(options.subtext != '');
					//span.css('top', (span.parent().height() / 2) - (span.height() / 2));
				}
			}
			return this;
		},

		hide: function (options) {

			if (this._tmrDelay) {
				//window.clearTimeout(this._tmrDelay);
				//this._tmrDelay = 0;
				if (this._count > 0) {
					//this._count--;
					this.log('.hide (delayed), count=' + this._count);
				}
			}

			if (!this.visible) {
				this._count = 0;
				return;
			}
			
			if (this._count > 0) this._count--;
			if (options && options.unlock) this._lock = false;

			this.log('.hide, count=' + this._count);
			if (this._count > 0 || this._lock) return;

			this.fireEvent('onBeforeHide');

			this._blind.hide();
			this._window.fadeOut(this.options.fadeOut, this._proxy.fadeOut);

			this.fireEvent('onAfterHide');

			return this;
		},

		delayHide: function (options) {
			this.log('.delayHide, count=' + this._count);
			this._tmrDelay = this.hide.delay(this, 100, options);
		},

		position: function () {

			if (!this.parent()) return false;

			var jQ = this.context.window.$, $contextWindow = jQ(this.context.window), $contextDocument = jQ(this.context.document), dim = this.getDimensions($contextWindow);
			var top = (dim.centerY - (this._window.height() / 2));
			var left = (dim.centerX - (this._window.width() / 2) - (FD.Browser.safari ? 8 : 10));
			this._window.css({ top: top + 'px', left: left + 'px' });
		},

		destroy: function () {
			return;
			this.log('.destroy, count=' + this._count);
			this._count = 0; this._created = this._blind._created = this.visible = this._blind.visible = false;
			this._blind.destroy();
			this.parent();
		}
	});

	var FDWindowDialog = new Class({

		Extends: FDWindowBase,
		Implements: [FDButtonBase, FDDeferred],

		_trace: true,
		type: 'dialog',

		_queue: [], // holds subsequent calls
		_contentOrgWidth: 0,
		_buttonsCreated: false,

		// internal object references
		_title: null,
		_closebox: null,
		_icon: null,
		_content: null,
		_frame: null,
		_buttonbar: null,
		_framewindow: null,
		_frameblind: null,
		_frameloader: null,

		_blind: null, // reference to a FDWindowBlind class

		// window movement properties
		_dragging: false,
		_dragged: false,

		_lastFocus: null,

		createProxies: function () {
			// create proxy functions to be used with events.
			// when the event is triggered, the function runs in this context
			this.parent({
				fadeIn: $.proxy(function () { if (this._frame && this._frameloader.css('display') != 'none') this.showFrameBlind(); this.fireEvent('onAfterShow'); }, this),
				fadeOut: $.proxy(this.afterHide, this),
				blindHide: $.proxy(function () {
					this.fireEvent('onAfterHide');
					if (this._queue.length > 0) {
						this.log('.afterHide (from queue)');
						var f = this._queue.shift();
						f();
					}
					if (this.WM) {
						this.WM._queue.next();
					}
				}, this),
				focusButton: $.proxy(this.focusButton, this),
				buttonClick: $.proxy(this.onButtonClick, this),
				keyDown: $.proxy(function (e) { if (e.keyCode.list(13, 32)) { this.onButtonClick.apply(this, arguments); } }, this),
				moveBarMouseDown: $.proxy(this.moveBarMouseDown, this),
				documentMouseMove: $.proxy(this.documentMouseMove, this),
				documentMouseUp: $.proxy(this.documentMouseUp, this),
				preventFocus: $.proxy(this._preventFocus, this),
				preventTopFocus: $.proxy(this._preventTopFocus, this)
			});
		},

		_preventFocus: function (e) {
			//return true;
			try {
				//String.log('_preventFocus, isontop=' + this._isOnTop + ', visible=' + this.visible + ', contains=' + this._window[0].contains(e.target), 'info');
				if (this._isOnTop && this.visible) {
					var contains = this._window[0].contains(e.target);
					if (!contains) {
						$(this._window.find('iframe')).each(function () {
							if ((contains = this.contentWindow.document.contains(e.target))) return false;
						});
					}
					if (!contains) {
						e.stopPropagation();
						this._window.focus();
						return false;
					} else {
						e.stopImmediatePropagation();
					}
				} else if (!this._isOnTop){
					var wnd = this.WM.getTopWindow();
					if (wnd && wnd.visible && !wnd._window[0].contains(e.target)) wnd._window.focus();
				}
			} catch (e) { this.log('.document.focus, error=' + (e.message || e), 'error'); }
		},
		_preventTopFocus: function (e) {
			//return true;
			try {
				//String.log('_preventTopFocus, indialog=' + $(e.target).closest("div[role='dialog'],div[role='alertdialog']").length);
				//return;
				String.log('_preventTopFocus, isontop=' + this._isOnTop + ', visible=' + this.visible, 'info');
				if (this._isOnTop && this.visible) {
					e.stopPropagation();
					this._window.focus();
					return false;
				} else if (!this._isOnTop) {
					var wnd = this.WM.getTopWindow();
					if (wnd && wnd.visible && !wnd._window[0].contains(e.target)) wnd._window.focus();
				}
			} catch (e) { this.log('.top.document.focus, error=' + (e.message || e), 'error'); }
		},

		create: function () {
		
			//window.console.log('FDWindow.create (name=' + this.name + ')');
			var cwindow = this, options = this.options;

			this.fireEvent('onBeforeCreate');
			
			var contextWindow = this.context.window, contextDocument = this.context.document, jQ = contextWindow.$;
			
			var div = this._window = jQ('<div id="' + this.name + '" class="' + options.className.append(options.windowClassName, ' ') + '" aria-model="true" tabindex="-1" aria-labelledby="title-' + this._guid + '" style="position:absolute;display:none;' + (options.dialogHeight ? 'height:' + options.dialogHeight + 'px;' : '') + '"></div>');
			div.offset({ top: 0, left: 0 }); //{ top: -500, left: -500 }
			jQ('body').append(div);

			if (options.closable) {
				this._closebox = jQ('<img src="/images/system/' + FDWindowConstants.iconImages.CLOSEBOX + '" class="' + options.closeboxClassName + '" tabindex="0" role="button" aria-label="' + FD.Texts.get('Window.BUTTON_CLOSE', 'Close') + '">').on({
					click: this._proxy.buttonClick,
					keydown: this._proxy.keyDown
				});
				div.append(this._closebox);
			}

			this._title = jQ('<div class="' + options.titleClassName + '" style="display:none" id="title-' + this._guid + '" role="heading"></div>').bind('mousedown', this._proxy.moveBarMouseDown);
			div.append(this._title);

			this._content = jQ('<div style="' + (options.height || options.maxheight ? (options.height ? 'height:' + options.height + 'px;' : '') + (options.maxheight ? ';max-height:' + options.maxheight + 'px;' : '') : '') + '"></div>');
			if (options.windowType && options.windowType == FDWindowConstants.windowTypes.FRAME) {
				this._frame = jQ('<iframe name="' + this.name + '[iframe]" id="' + this.name + '-iframe" frameborder="0" style="width:100%;height:100%" src="" allowTransparency="true"></iframe>');
				this._frame.data('cwindow', this);
				this._frame.load(function () {
					var cw = this.contentWindow;
					cwindow.log('.frame.load, typeof=' + typeof cw.initDialogWindow);
					cw.cwindow = cwindow;
					cw.parentWindow = cwindow.context.original;
					cw.context = cw.parentWindow.document;
					if (cwindow._frameblind) cwindow._frameblind.fadeOut(100);
					if (cwindow._frameloader) cwindow._frameloader.fadeOut(100);
					if (typeof cw.initDialogWindow != 'undefined') {
						cw.initDialogWindow(cwindow);
						cwindow.fireEvent('onAfterShow');
						//cwindow.focusButton();
					}
					cwindow._window.attr('aria-busy', false);

					if (cw.$) {
						/*$(cw.document.body)
							.off('keyup.' + cwindow._quid)
							.on('keyup.' + cwindow._quid, function (e) {
								if (e.keyCode == 27) cwindow.cancel();
							});*/
						cw.$('body').on('afterShow', function () {
							setTimeout(function () {
								$('input[type!="hidden"]:visible,textarea:visible,select:visible', cw.document.body).eq(0).focus();
							}, 400);
						});
					}
				});
				div.append(this._content.append(jQ('<div class="' + options.frameClassName + '" style="' + (options.height || options.maxheight ? (options.height ? 'height:' + options.height + 'px;' : '') + (options.maxheight ? ';max-height:' + options.maxheight + 'px;' : '') : '') + '"><div class="' + options.frameClassName.append('blind', '-') + '" style="display:none;position:absolute;"></div><img class="' + options.frameClassName.append('loader', '-') + '" src="/label/system/images/loader_gray.gif?' + options.label.version + '" style="position:absolute"></div>').append(this._frame)));
				this._framewindow = div.find('.' + options.frameClassName);
				this._frameblind = div.find('.' + options.frameClassName.append('blind', '-'));
				this._frameloader = div.find('.' + options.frameClassName.append('loader', '-'));
				
				/*this._window.on('afterShow', function () {
					var cw = null;
					try { cw = cwindow._frame[0].contentWindow; } catch (e) { String.log(e, 'error'); return; }
					String.log('afterShow, ' + $(cw.document.body).length + ', ' + $(cw.document.body).css('visibility'), 'error');
					if ($(cw.document.body).css('visibility') != 'hidden') {
						String.log('window[frame].afterShow'); 
						setTimeout(function() { String.log('frame; setting focus', 'error'); $('input[type!="hidden"]:visible,textarea:visible,select:visible',cw.document.body).eq(0).focus(); }, 0);
					}
				});*/
				
				this.addEvent('onAfterShow', function () { this._frame.resize(); }, true);

			} else {
				this._content.addClass(options.contentClassName);
				if (options.icon) {
					this._icon = jQ('<img src="' + options.label.cdn + options.label.path + 'images/' + options.icon + '" role="none presentation">');
					var tr = jQ('<tr></tr>');
					div.append(
						jQ('<table role="none presentation" cellpadding="0" cellspacing="0" class="' + options.contentClassName + '" style="width:100%"></table>')
							.append(tr.append(jQ('<td class="' + options.iconClassName + '" style="vertical-align:top"></td>').append(this._icon)))
					);
					tr.append(jQ('<td></td>').append(this._content));
				} else {
					div.append(this._content);
				}
				this._window.on('afterShow', function () {
					/*cwindow._window.parents('body')
						.off('keyup.' + cwindow._quid)
						.on('keyup.' + cwindow._quid, function (e) {
							if (e.keyCode == 27) cwindow.cancel();
							return true;
						});*/
					setTimeout(function () {
						var el = cwindow._window.find('input[type!="hidden"]:visible,textarea:visible,select:visible').eq(0);
						if (el.length == 0) el = cwindow._window.find('.button-focus');
						el.focus();
					}, 200);
				});
			}

			this._window.on('afterShow', function () {
				if (cwindow._isOnTop && typeof document.addEventListener != 'undefined') {
					$(cwindow.context.document).on('focus.' + cwindow._guid, cwindow._proxy.preventFocus); //.addEventListener('focus', cwindow._proxy.preventFocus, true);
					try {
						if (top.document != cwindow.context.document) {
							$(top.document).on('focus.' + cwindow._guid, cwindow._proxy.preventTopFocus); //.addEventListener('focus', cwindow._proxy.preventTopFocus, true);
						}
					} catch (e) { String.log('.afterShow, error=' + (e.message||e), 'error'); }
					try {
						var frm = cwindow.context.window.$('iframe');
						frm.each(function () {
							$(this.contentWindow.document).on('focus.' + cwindow._guid, cwindow._proxy.preventFocus); // .addEventListener('focus', cwindow._proxy.preventFocus, true);
						});
					} catch (e) { String.log('.afterShow, error=' + (e.message||e), 'error'); }
				}

				cwindow._window.trapFocus();

			});

			if (!options.noButtons) {
				this._buttonbar = jQ('<div style="text-align:center"></div>')
				div.append(jQ('<div class="' + options.buttonbarClassName + '" role="group"></div>').append(this._buttonbar));
			} else {
				this._content.addClass('no-buttons');
			}

			if (this._frame) {
				//alert($('#' + this.name + '-iframe', contextDocument).data('cwindow'));
				jQ('#' + this.name + '-iframe').data('cwindow', this);
			}

			this._blind = new FDWindowManager.classes.blind($.extend({}, options, {
				className: '',
				onclick: null,
				/*onclick: (((options.buttonType && options.buttonType.list(WND.Constants.buttonTypes.OK, WND.Constants.buttonTypes.CLOSE)) || options.closable || options.noButtons) ? this._proxy.buttonClick : null),*/
				onAfterHide: this._proxy.blindHide
			}));
			this._blind.create();

			var wnd = this._blind.getWindow();
			wnd.on('click', function () {
				cwindow._window.firstFocus();
			});

			//contextWindow.$(contextWindow).unload(function () { cwindow.hide(); });

			this.fireEvent('onAfterCreate');
			
			return this;
		},

		show: function (options, e) {
		
			if (this.visible) {
				this.log('.show (add to queue)');
				this.WM._queue.push(this.show.bind(this, options));
				return this;
			}

			this.log('.show', 'group');

			this._window.setVisible(false);
			this._window.show();

			this.log('.show, options=' + Object.inspect(options, null, 1, ['string', 'number', 'boolean']));
			this.log('.show, this.options=' + Object.inspect(this.options, null, 1, ['string', 'number', 'boolean']));

			// check and reset the buttonsCreated property before the options are merged
			if (options && typeof options.buttonType != 'undefined' && options.buttonType != this.options.buttonType) {
				this.__buttonsCreated = false;
			}

			this.fireEvent('onBeforeShow', options);
			
			options = this.options;
			this._lastFocus = (typeof options.focusOnClose != 'undefined' ? options.focusOnClose : this.context.document.activeElement);

			this._window.attr('role', (options.role ? options.role : 'dialog'));

			// set this window on top
			this.WM.onTop(this);

			if (Number.is(options.page) && options.page > 0) {
				if (typeof this.context.window.FD.Pages != 'undefined') this.context.window.FD.Pages.GoTo(options.page, true);
				else if (typeof this.context.window.switchPanel != 'undefined') this.context.window.switchPanel(options.page, true);
				else if (typeof this.context.window.switchTab != 'undefined') this.context.window.switchTab(options.page, false, true);
				else if (typeof this.context.window.FD.Backend.Pages != 'undefined') this.context.window.FD.Backend.Pages.GoTo(options.page);
			}

			if (!this._dragged && !e) {
				this._window.css({ width: this.options.width || 'auto', top: '0px', left: '0px' });
				this._content.css('width', 'auto');
			}
			
			if (this._title) {
				this.setTitle(options.title || '');
				this._title.toggle(!options.hideTitle && !options.noTitle);
				//this.log('.show, hideTitle=' + options.hideTitle + ', noTitle=' + options.noTitle + ', ' + (options.hideTitle || options.noTitle));
				if (this._closebox) this._closebox.toggleClass('no-title', Boolean.create(options.hideTitle || options.noTitle));
				this._content.toggleClass('no-title', Boolean.create(options.hideTitle || options.noTitle));
			}
			
			if (this._icon) {
				this._icon.prop('src', options.label.cdn + options.label.path + 'images/' + options.icon);
				this._icon.toggleClass('svg', options.icon.search('.svg') > -1);
			}
			if (this._frame) {
				if (!options.url) throw "Expecting an Url";
				if (FDUri.is(options.url)) options.url = options.url.toString();
				if (options.url != this._frame.data('url') || options.reload) {
					this.log('.show (reload frame, url=' + this._frame.data('url') + ', url_new=' + options.url + ', reload=' + options.reload + ')');
					this._window.attr('aria-busy', true);
					this._frameloader.show();
					this._frame.prop('src', options.url);
					this._frame.data('url', options.url);
				} else {
					var cw = this._frame[0].contentWindow;
					cw.cwindow = this; cw.parentWindow = this.context.original; cw.context = cw.parentWindow.document;
					if (typeof cw.initDialogWindow != 'undefined') cw.initDialogWindow(this);
					setTimeout(function () {
						$('input[type!="hidden"]:visible,textarea:visible,select:visible', cw.document.body).eq(0).focus();
					}, 100);
				}
			} else {
				
				//String.log(['window.show', options]);
				if (String.is(options.content)) {
					if (/\n/.test(options.content) && !/<br( \/)?>/.test(options.content)) options.content = options.content.replace(/\r/g, '').replace(/\n/g, '<br>');
					this._content.html(unescape(options.content.replaceAll('%0A', '<br>')));
				} else if (Object.is(options.content)) {
					this._content.empty().append(options.content)
				}
			}
			
			if (!options.height) this._content.css('height', '');
			
			if (this._buttonbar && options.buttonType != WND.Constants.buttonTypes.NONE && !this.__buttonsCreated) {
				this.createButtons();
			}
			
			try {
				this._window.find('img.svg').svg().done(this.position.bind(this, e));
			} catch (e) { this.log('.show, e=' + (e.message || e), 'error'); }
			
			this._blind.show();

			this.setDimensions();

			this._window.hide();
			this._window.setVisible(true);

			if (this.existed) {
				this._window.fadeIn(options.fadeIn, this._proxy.fadeIn);
			} else {
				this._window.show();
				//this.focusButton();
				this.fireEvent('onAfterShow');
			}
			
			this._contentOrgWidth = this._content.getWidth();
			if (!this._windowOrgHeight) this._windowOrgHeight = this._window.getHeight();
			
			this.position(e,function () { this.focusButton(); });
			//this.position(e);
			
			this.makeDeferred();
			
			this.log('', 'groupEnd');

			return this;
		},

		hide: function () {

			this.fireEvent('onBeforeHide');

			this._window.parents('body').off('.' + this._quid);
			try {
				$(this.context.document).off('.' + this._guid);
				$(top.document).off('.' + this._guid);
				this.context.document.removeEventListener('focus', this._proxy._preventFocus);
				top.document.removeEventListener('focus', this._proxy._preventTopFocus);
			} catch (e) {}
			try {
				var frm = this.context.window.$('iframe'), cwindow = this;
				frm.each(function () {
					$(this.contentWindow.document).off('.' + cwindow._guid);
					//this.contentWindow.document.removeEventListener('focus', cwindow._proxy._preventFocus);
				});
			} catch (e) {}
			
			this.log(['.hide, lastFocus', this._lastFocus]);
			if (this._lastFocus) $(this._lastFocus).focus();
			this._lastFocus = null;

			this._window.fadeOut(this.options.fadeOut, this._proxy.fadeOut);
			this._blind.hide();

		},
		afterHide: function () {

		},

		invalidate: function () {

			this.log('.invalidate');
			this._blind.addEvent('onAfterHide', $.proxy(this.destroy, this));
			if (this.visible) this.hide();
			else this.destroy();
			//				if (this._frame) this._frame.data('url', '');

		},

		destroy: function () {
			this.log('.destroy');
			this._created = this._blind._created = this.visible = this._blind.visible = false;
			this._blind.destroy();
			this.parent();
		},

		setTitle: function (title) {
			if (this._title) this._title.html('<div class="' + this.options.titleClassName + '-inner">' + title + '</div>');
		},

		/*
		resize: function (prop) {
		if (!this.shown) return;

		if (prop.height) {
		var h = prop.height;
		if (String.is(h)) {
		if (h.left(1) == '+') h = WND._prop.height + Number.create(h.substr(1));
		else if (h.left(1) == '-') h = WND._prop.height - Number.create(h.substr(1));
		}
		this.height = h;
		this.text.height(h);
		}
		if (prop.width) {
		this.width = prop.width;
		}
		this.position();
		},
		*/

		position: function (e, f) {
		
			this.log(['.position, visible=' + this.visible + ', dragging=' + this._dragging, e]);

			if (!this.visible || this._dragging) return;

			if (!this.parent()) {
				this.log('.position, parent returned false');
				return false;
			}

			var contextWindow = this.context.window, contextDocument = contextWindow.document;
			var $contextWindow = $(contextWindow), $contextDocument = $(contextDocument);

			if (false && e && !FD.Browser.mobile && e.type == 'resize') {
				this._blind.hide();
				this._tmr = this.position.delay(this, 10);
				return;
			}

			var wnd = this._window, content = this._content, dim = this.getDimensions($contextWindow);

			var width = Math.max(Math.max(this.options.width || 0, this._contentOrgWidth + (this._icon ? 64 : 0)), wnd[0].scrollWidth);
			var vp_width = dim.width, vp_height = dim.height;

			//this.log('width=' + width + ', vp_width=' + vp_width + ', vp_height=' + vp_height + ', orgwidth=' + (this._contentOrgWidth + (this._icon ? 64 : 0)) + ', scrollWidth=' + wnd[0].scrollWidth);

			if (!e || e.type == 'resize') {

				this.setDimensions(dim)

			}

			// if a loader div on top of the iframe is visible then position the loader div
			if (this._frameloader && this._frameloader.css('display') != 'none') {
				this._frameloader.css({
					top: (content.getHeight() / 2) - (this._frameloader.getHeight() / 2),
					left: (content.getWidth() / 2) - (this._frameloader.getWidth() / 2)
				});
			}

			if (e && e.type == 'click') {
				this._dragged = false;
				this.options.top = this.correctY(e);
				this.options.left = this.correctX(e);
			}


			// POSITIONING
			// vp_height and vp_width come from the method this.getDimensions() on the FDWindowBase class

			var pos = wnd.offset(); // dialog window offset

			// position vertically only when not dragged yet or the dialog window is (partly) out of the screen
			if (!this._dragged || pos.top + wnd.getHeight(true /*include margins*/) + 10 > vp_height) {
				if (pos.top <= 0 || wnd.getHeight() < vp_height /* viewport height */) {
					this._dragged = false;
					pos.top = (this.options.top ? this.options.top : (dim.centerY - (FD.Browser.mobile ? 0 : (wnd.getHeight() / 2))));
				}
			}
			// position horizontally only when not dragged yet or the dialog window is (partly) out of the screen

			if (!this._dragged || pos.left + wnd.getWidth(true) + 10 > vp_width) {
				if (pos.left <= 0 || wnd.getWidth() < vp_width) {
					this._dragged = false;
					var scrolling = contextWindow.scrollHeight > $contextWindow.height();
					pos.left = (this.options.left ? this.options.left : (dim.centerX - (wnd.getWidth() / 2) - (scrolling ? (FD.Browser.safari ? 8 : 10) : (FD.Browser.safari ? 4 : 2))));
				}
			}

			//alert(pos.top + ', ' + pos.left)
			wnd.offset(pos); // set new offset

			if (f) f.apply(this);
		},

		setDimensions: function (dim_or_position) {

			this.log('.setDimensions');

			var contextWindow = this.context.window, contextDocument = contextWindow.document;
			var $contextWindow = $(contextWindow), $contextDocument = $(contextDocument);

			var wnd = this._window, content = this._content;
			var dim = (!Boolean.is(dim_or_position) ? dim : null) || this.getDimensions($contextWindow);

			var vp_width = dim.width, vp_height = dim.height;
			var width = (this.options.width ? this.options.width : Math.max(Math.max(this.options.width || 0, this._contentOrgWidth + (this._icon ? 64 : 0)), wnd[0].scrollWidth));

			if (wnd[0].scrollWidth > vp_width - 30 || wnd[0].scrollWidth < width) {
				wnd.setWidth((vp_width - 30 > width ? width : Math.max((vp_width - 30), 240)), true);
			} else if (vp_width - 30 > width) {
				wnd.setWidth(width, true);
			}

			var selector = 'table.window-content' + (FD.Browser.is('ie', 9) ? ' tr' : ''),
				content_width = wnd.getContentWidth() - (Object.is(this._icon) ? wnd.find('td.window-icon').getWidth() + wnd.find(selector).getWidthOuterSpace(true) : 0),
				resize = false;

			this.log('.setDimensions, scrollHeight=' + wnd[0].scrollHeight + ', vp_height=' + vp_height + ', content_width=' + content_width + ', icon width=' + wnd.find('td.window-icon').getWidth());
			content.setWidth(content_width, true);

			if (!this.options.hideTitle && !this.options.noTitle) {
				if (wnd[0].scrollHeight > vp_height - 30) { // window height more than the clientheight of the context window
					var diff = (wnd[0].scrollHeight - vp_height) + 30, height = vp_height - 30;

					wnd.setHeight(height);

					var tbl = wnd.find('table.window-content');
					height = height - tbl.getHeightOuterSpace(true) - (this._title ? this._title.getHeight(true) : 0) - (this._buttonbar ? this._buttonbar.parent().getHeight(true) : 0);
					content.setHeight(height, true);

					content.css('overflow', 'auto');
					if (this._framewindow) this._framewindow.setHeight(content.getHeight()); // this._framewindow.getHeight() - diff);
					//this.log('.position, resizeTo=' + (vp_height - 30) + ', resized=' + wnd.height());
				} else {

					var height = 0;
					if (!this._framewindow) {

						if (this.options.height) {
							height = this.options.height;
						} else {
							height = wnd.getChildrensHeight(true);
							wnd.find('.resize-overflow').each(function () {

								resize = true;

								var diff = this.scrollHeight - $(this).getHeight(true);
								this.setAttribute('test', diff);
								if (diff == 0) {
									var cw = $(this).getChildrensHeight();
									if (cw < this.scrollHeight) {
										diff = cw - this.scrollHeight;
									}
								}
								height += diff;
							});
						}
						wnd[0].setAttribute('childsHeight', height + '/content=' + content.getHeight(true));

						var tbl = wnd.find('table.window-content'), tbl_height = 0, diff = 0, rest_height = 0;
						if (tbl.length > 0) {
							tbl_height = tbl.getContentHeight();
							diff = tbl.getContentHeight() - content.getHeight(true);
							rest_height = height - tbl_height;
						} else {
							rest_height = height - content.getHeight(true);
						}

						wnd[0].setAttribute('tbl_height', tbl_height);
						wnd[0].setAttribute('diff', diff);
						wnd[0].setAttribute('rest_height', rest_height);

						this.log('.setDimensions, height=' + height + ', tbl_height=' + tbl_height + ', diff=' + diff + ', rest_height=' + rest_height);

						content.css('overflow', 'hidden');
						content.height(1);

						content[0].setAttribute('posScrollHeight', content[0].scrollHeight);

						var cont_height = content[0].scrollHeight + content.getMargin('top,bottom') + (diff <= 0 ? content.getPadding('bottom') : 0);

						this.log('.setDimensions, cont_height=' + cont_height);

						wnd[0].setAttribute('contentHeight', cont_height);

						if (diff > 0 && cont_height > tbl_height) cont_height += diff;
						//else if (tbl.getContentHeight() > cont_height) cont_height = tbl.getContentHeight();
						height = Math.min(rest_height + Math.max(tbl.getContentHeight(), cont_height), vp_height - 30);

						this.log('.setDimensions, tblheight=' + tbl.getContentHeight() + ', height=' + height);
						content[0].setAttribute('wndContentHeight', rest_height + '/' + tbl.getContentHeight() + '/' + cont_height + '/' + height);

						wnd.setHeight(height);

						var style = window.getComputedStyle(wnd[0])

						this.log('.setDimensions, height=' + height + ', titleheight=' + this._title.getHeight(true) + ',  buttonbarheight=' + this._buttonbar.parent().getHeight(true));

						height = height - tbl.getHeightOuterSpace(true) - (this._title ? this._title.getHeight(true) : 0) - (this._buttonbar ? this._buttonbar.parent().getHeight(true) : 0);
						content.setHeight(height, true); //height - rest_height, true);
						content[0].setAttribute('setHeight', height);

						content.css('overflow', 'auto');

					} else {
						var diff = Math.min(this._windowOrgHeight, vp_height - 30) - wnd.getHeight(); // wnd.height();

						content.setHeight(content.getHeight() + diff);
						if (this._framewindow) this._framewindow.setHeight(this._framewindow.getHeight() + diff); //this._framewindow.height(this._framewindow.height() + diff);
						wnd.children().each(
							(function (index, el) {
								var _self = $(el);
								if (_self.css('position') != 'absolute') {
									_self[0].setAttribute('childHeight', _self.getHeight(true));
									height += _self.getHeight(true);
								}
							}).bind(this)
						);
						wnd[0].setAttribute('childsHeight', height);
						wnd.setHeight(height);
					}

					if (resize) {
						FDWindowResize.resizeFromElement(wnd);
					}
				}
			}

			if (this.options.maxheight && FD.Browser.ie) {
				if (content[0].scrollHeight > this.options.maxheight) {
					if (this._framewindow) this._framewindow.setHeight(this.options.maxheight, true); // this._framewindow.height(this.options.maxheight);
					content.setHeight(this.options.maxheight, true);
					//content.height(this.options.maxheight);
					content.css('overflow', 'auto');
				}
			}

			if (Boolean.is(dim_or_position) && !this._dragged) {
				this.position($.Event('dimension', { target: wnd[0] }));
			}

		},

		correctX: function (e, offset) {
			offset = offset || 0;
			var w = $(this.context.window), scrollLeft = w.scrollLeft(), x = scrollLeft + e.pageX + offset;
			if (x + this._window.outerWidth() > w.width() + scrollLeft - 26) {
				x = Math.max((e.pageX - offset - this._window.outerWidth()) + scrollLeft, 0);
			}
			return x;
		},
		correctY: function (e, offset) {
			offset = offset || 0;
			var w = $(this.context.window), scrollTop = w.scrollTop(), y = scrollTop + e.pageY + offset;
			var swapped = (y + this._window.outerHeight() > w.height() + scrollTop - 16);
			if (swapped) {
				y = Math.max((w.height() + scrollTop) - this._window.outerHeight() - 18, 0);
			}
			return y;
		},

		update: function (content) {
			if (String.is(content)) {
				this._content.html(content);
			} else if (Object.is(content)) {
				this._content.empty().append(content);
			}
		},

		createButtons: function () {

			this.log('.createButtons', 'group');

			this.__buttonsCreated = true;
			this.__fromCreateButtons = true;

			var options = this.options;
			this._buttonbar.html('');
			
			switch (this.options.buttonType) {
				case WND.Constants.buttonTypes.OKCANCEL:
					this._createButton('OK', options.OK || null, null, WND.Constants.returnTypes.OK);
					this._createButton('CANCEL', options.CANCEL || null, null, WND.Constants.returnTypes.CANCEL, true);
					break;
				case WND.Constants.buttonTypes.YESNO:
					this._createButton('YES', options.YES || null, null, WND.Constants.returnTypes.YES);
					this._createButton('NO', options.NO || null, null, WND.Constants.returnTypes.NO, true);
					break;
				case WND.Constants.buttonTypes.YESNOCANCEL:
					this._createButton('YES', options.YES || null, null, WND.Constants.returnTypes.YES);
					this._createButton('NO', options.NO || null, null, WND.Constants.returnTypes.NO);
					this._createButton('CANCEL', options.CANCEL || null, null, WND.Constants.returnTypes.CANCEL, true);
					break;
				case WND.Constants.buttonTypes.CLOSE:
					this._createButton('CLOSE', options.CLOSE || null, null, WND.Constants.returnTypes.CLOSE, true);
					break;
				case WND.Constants.buttonTypes.STOP:
					this._createButton('STOP', options.STOP || null, null, WND.Constants.returnTypes.STOP, true);
					break;
				case WND.Constants.buttonTypes.NONE:
					break;
				case WND.Constants.buttonTypes.ACCEPTCORRECT:
					this._createButton('ACCEPT', options.ACCEPT || null, null, WND.Constants.returnTypes.ACCEPT);
					this._createButton('CORRECT', options.CORRECT || null, null, WND.Constants.returnTypes.CORRECT, true);
					break;
				case WND.Constants.buttonTypes.CORRECTCONTINUE:
					this._createButton('CORRECT', options.CORRECT || null, null, WND.Constants.returnTypes.CORRECT, true);
					this._createButton('CONTINUE', options.CONTINUE || null, null, WND.Constants.returnTypes.CONTINUE);
					break;
				default:
					this._createButton('OK', options.OK || null, null, WND.Constants.returnTypes.OK, true);
					break;
			}

			this.__fromCreateButtons = false;

			this.log('', 'groupEnd');

		},

		_createButton: function (img, label, onclick, rtype, focus) {
			var dir = this.options.label.cdn + this.options.label.path.append('images/', '/'), version = this.options.label.version;
			if (!label) label = this.getText({ text: 'BUTTON_' + img.toUpperCase(), key: 'Window' });
			if (!Number.is(rtype)) {
				rtype = WND.Constants.returnTypes[img.toUpperCase()];
			}
			if ((FD.isFrontend() && typeof this.options.frontend == 'undefined') || this.options.frontend) {

				this.log('._createButton 1, version=' + typeof version + ', dir=' + dir + ', img=' + img + ', dir=' + dir + (FD.Window.Constants.buttonImages[img] || img));
				var button = this.createButton({
					suffix: 'svg',
					className: (WND.Constants.buttonClasses[img.toUpperCase()] || img),
					buttonClassName: 'button-' + (WND.Constants.buttonClasses[img.toUpperCase()] || img).toLowerCase(),
					image: (dir + (WND.Constants.buttonImages[img] || img)).append(version + '', '?'),
					label: label,
					onclick: onclick || null,
					rtype: rtype,
					focus: focus || false
				});

				if (!this.__fromCreateButtons) {
					button.find('img.svg').svg();
				}

			} else {
				var button = this.createButton({
					suffix: 'icon',
					className: (WND.Constants.buttonClasses[img.toUpperCase()] || img),
					label: label,
					onclick: onclick || null,
					rtype: rtype,
					focus: focus || false
				});

				/*
				button.addClass('button ' + (WND.Constants.buttonClasses[img.toUpperCase()] || img));
				button.bind({ focus: function () { $(this).addClass('button-focus'); }, blur: function () { $(this).removeClass('button-focus'); } });
				button.html(String.stripHTML(unescape(label)));
				*/
			}

			this._buttonbar.append(button);
		},

		clearButtons: function () {
			this._buttonbar.html('');
		},

		focusButton: function () {
			$(this._window).find('.button-focus').focus();
		},

		add2Queue: function (f) {
			if (Function.is(f)) this._queue.push(f);
		},

		onButtonClick: function (e) {
			
			this.log('.onButtenClick');

			cancelEvent(e);
			var el = $(checkEvent(e || window.event)).closest("[role='button']");
			//if (!el[0].tagName.list('A', 'IMG')) el = el.parents('A');
			var rtype = Number.int(el.data('rtype')), func, retval, resolve = true;
			if (el[0] && el[0].disabled) return;
			if (rtype == FDWindowConstants.returnTypes.OK && this.options.onok) {
				func = this.options.onok;
			} else if (rtype == FDWindowConstants.returnTypes.CANCEL && this.options.oncancel) {
				func = this.options.oncancel;
				resolve = false;
			} else if (rtype == FDWindowConstants.returnTypes.YES && this.options.onyes) {
				func = this.options.onyes;
			} else if (rtype == FDWindowConstants.returnTypes.NO && this.options.onno) {
				func = this.options.onno;
				resolve = false;
			} else if (rtype == FDWindowConstants.returnTypes.CLOSE && this.options.onclose) {
				func = this.options.onclose;
			} else if (rtype == FDWindowConstants.returnTypes.STOP && this.options.onstop) {
				func = this.options.onstop;
				resolve = false;
			} else if (rtype == FDWindowConstants.returnTypes.SAVE && this.options.onsave) {
				func = this.options.onsave;
			} else {
				func = this.options.onclick;
			}
			
			if (resolve && rtype.list(FDWindowConstants.returnTypes.CANCEL, FDWindowConstants.returnTypes.NO, FDWindowConstants.returnTypes.STOP)) {
				resolve = false;
			}
			
			switch (typeof func) {
				case 'function': retval = func(rtype, this); break;
				case 'string': eval('retval=' + func + '(' + rtype + ', this)'); break;
			}
			
			if (resolve) this.deferred.resolve(this, rtype);
			else this.deferred.reject(this, rtype);
			
			if (!Boolean.is(retval) || retval) this.hide();
		},

		cancel: function () {
			var retval = null;
			if (this.options.oncancel) retval = this.options.oncancel(FDWindowConstants.returnTypes.CANCEL, this);
			else if (this.options.onclose) retval = this.options.onclose(FDWindowConstants.returnTypes.CLOSE, this);
			else if (this.options.onclick) retval = this.options.onclick(FDWindowConstants.returnTypes.CANCEL, this);

			this.deferred.reject(this, FDWindowConstants.returnTypes.CANCEL);

			if (!Boolean.is(retval) || retval) this.hide();
		},

		// checks if a window is visible and queues or calls a given function
		isOpen: function (f, name) {

			return this.WM.isOpen.apply(this.WM, arguments);

			var is_open = false, cwindow = this;
			if (name) {
				cwindow = this.WM.getInstance(name);
				is_open = (cwindow && cwindow.visible);
			} else {
				is_open = this.visible;
			}
			if (f) {
				if (is_open) cwindow.add2Queue(f);
				else f();
			}
			return is_open;
		},

		showFrameBlind: function () {
			this._frameblind.setWidth(this._frameblind.parent().getWidth());
			this._frameblind.setHeight(this._frameblind.parent().getHeight());
			//				this._frameblind.css(this._frameblind.parent().css(['width', 'height']));
			this._frameblind.show();
		},

		// window move functions
		moveBarMouseDown: function (e) {
			var cwindow = this;
			cwindow._dragging = true;
			if (cwindow._frame) {
				this.showFrameBlind();
			}

			cwindow._elementStartX = parseInt(cwindow._window.css('left'));
			cwindow._elementStartY = parseInt(cwindow._window.css('top'));
			cwindow._pageStartX = e.pageX;
			cwindow._pageStartY = e.pageY;
			// bind events to document to move window - we will unbind these on mouseup
			$(cwindow.context.document).bind('mousemove', cwindow._proxy.documentMouseMove).bind('mouseup', cwindow._proxy.documentMouseUp);
			e.preventDefault(); // prevent attempted dragging of the column
		},
		documentMouseMove: function (e) {
			var cwindow = this,
				jQ = this.context.window.$,
				$contextWindow = jQ(this.context.window),
				dim = this.getDimensions($contextWindow),
				minLeft = -(this._window.width() - 40),
				maxRight = dim.width - 40,
				minTop = 0,
				maxBottom = (dim.height + $(document).scrollTop()) - 40;
			String.log('scrollTop=' + $(document).scrollTop());
			cwindow._dragging = cwindow._dragged = true;
			cwindow._window.css({
				left: Math.min(maxRight, Math.max(minLeft, cwindow._elementStartX - (cwindow._pageStartX - e.pageX))) + 'px',
				top: Math.min(maxBottom, Math.max(minTop, (cwindow._elementStartY - (cwindow._pageStartY - e.pageY))/* + $(document).scrollTop()*/)) + 'px'
			});
			e.stopPropagation();
			e.preventDefault();
			return false;
		},
		documentMouseUp: function (e) {
			var cwindow = this;
			cwindow._dragging = false;
			if (cwindow._frame) cwindow._frameblind.hide();
			$(cwindow.context.document).unbind('mousemove', cwindow._proxy.documentMouseMove).unbind('mouseup', cwindow._proxy.documentMouseUp);
			e.stopPropagation();
			e.preventDefault();
			return false;
		}

	});

	var FDWindowClassic = new Class({

		Extends: FDWindowBase,

		type: 'classic',
		_trace: true,

		_window: null,
		_tmr: 0,

		create: function () {
			
			this.log('.create', 'group');

			this.fireEvent('onBeforeCreate');

			var zoom = FD.ViewPort.getDimensions().zoom;
			var contextWindow = this.context.window, $top = $(contextWindow.top), options = this.options;
			var width = options.width || ($top.outerWidth() - 40), height = options.height || ($top.outerHeight() - 46 - (options.status ? 36 : 0));

			var parent = (typeof options.width == 'undefined' || !options.width) && (typeof options.height == 'undefined' || !options.height);
			var availWidth = window.screen.availWidth, availHeight = window.screen.availHeight - (FD.Browser.ie ? 60 : 56), left, top;

			//this.log('.create, zoom=' + zoom + ', width=' + width + ', height=' + height + ', ' + $(contextWindow).outerWidth() + ', ' + contextWindow.document.documentElement.clientWidth + ', ' + contextWindow.outerWidth + ', ' + (contextWindow.outerWidth/$(contextWindow).outerWidth()));

			if (!FD.Browser.mobile && FD.Browser.WebKit && parent) {
				// when zoomed webkit also scales the height and width of the windows. so, first we scale back the height and width to the real wanted size
				width = width * zoom;
				height = height * zoom;
				this.log('.create, zoom correction, zoom=' + zoom + ', width=' + width + ', height=' + height);
			}
			// now scale the height and width to fit the zoomed-in content
			if (options.width) width = width * zoom;
			if (options.height) height = height * zoom;

			if (parent) {
				if (FD.Browser.ie) {
					left = contextWindow.top.screenLeft;
					top = contextWindow.top.screenTop - 20;
				} else {
					left = contextWindow.top.screenX;
					top = contextWindow.top.screenY + 10;
				}
				left += 10;
			} else {
				left = (availWidth / 2) - (width / 2) - 8; // (options.scroll ? 8 : 0);
				top = (availHeight / 2) - (height / 2) - 25;
			}
			width = Math.min(width, availWidth);
			height = Math.min(height, availHeight);

			options.width = width;
			options.height = height;
			options.zoom = zoom;
			
			var windowName = options.name || this._guid;
			if (FD.Browser.ie) { // this workaround causes problems in IE with the setting to open popups in tabs. Not use why because no issues with me, but it gives problems with a client
				// IE has the nasty issue of not sending the referrer along with the request to the server
				// to workaround this issue we first open the window and then target that window with a trick
				this._window = window.open('', windowName, 'toolbar=' + (options.toolbar ? 'yes' : 'no') + ',directories=no,menubar=no,status=' + (typeof options.status == 'undefined' || options.status ? 'yes' : 'no') + ',resizable=yes,scrollbars=' + (typeof options.scroll == 'undefined' || options.scroll ? 'yes' : 'no') + ',top=' + top + ',left=' + left + ',width=' + width + ',height=' + height);
				FDUri.goto(options.url, { document: this._window.document, target: '_self' });
			} else {
				this._window = window.open(options.url, windowName, 'toolbar=' + (options.toolbar ? 'yes' : 'no') + ',directories=no,menubar=no,status=' + (typeof options.status == 'undefined' || options.status ? 'yes' : 'no') + ',resizable=yes,scrollbars=' + (typeof options.scroll == 'undefined' || options.scroll ? 'yes' : 'no') + ',top=' + top + ',left=' + left + ',width=' + width + ',height=' + height);
			}

			this.bind();

			this.fireEvent('onAfterCreate');

			this.log('', 'groupEnd');

			return this;
		},

		bind: function (timer) {
			if (timer) { // set a timer event from the unload
				this._tmr = this.bind.delay(this, 100);
				return;
			}
			var cwindow = this, wnd = this._window;
			if (!wnd || typeof wnd.document != 'object') return; // might already have been destroyed
			if (!wnd.$) {
				this.bind.delay(this, 10);
				return;
			}
			this.log('.bind');

			$(wnd).unload((function () { cwindow.unload(); cwindow.bind(true); }).bind(wnd));
			this._bind();
		},
		_bind: function (lvl) {
			var cwindow = this, wnd = this._window;
			try {
				wnd.$(wnd.document).ready(function () { 
					cwindow.log('.ready'); 
					wnd.cwindow = cwindow;
					if (typeof wnd.initDialogWindow != 'undefined') {
						wnd.initDialogWindow(cwindow);
					}
				});
				/*wnd.onload = function () {
					cwindow.log('.load');
					wnd.cwindow = cwindow;
					if (typeof wnd.initDialogWindow != 'undefined') {
						wnd.initDialogWindow(cwindow);
					}
				};*/
			} catch (e) {
				this.log('._bind, lvl=' + lvl + ', error=' + (e.message||e));
				if (!lvl) lvl = 1;
				if (lvl < 10) {
					this._bind.delay(this, 50, ++lvl);
				}
			}
		},
		unbind: function () {
			this.log('.unbind');
			var wnd = this._window;
			try { $(wnd).unbind('unload'); } catch (e) { }
		},

		unload: function (timeout) {
			this.log('.unload, timeout=' + (timeout || false) + ', closed=' + (this._window ? this._window.closed : true));
			if (timeout) {
				if (!this._window || this._window.closed || typeof this._window.document != 'object') this.destroy();
			} else {
				this.unload.delay(this, 100, true);
			}
		},

		show: function (options) {

			this.created = false;

			this.fireEvent('onBeforeShow', options);

			this.fireEvent('onAfterShow');

			return this;
		},

		hide: function () {

			this.fireEvent('onBeforeHide');

			this.unbind();
			this.destroy();

			this.fireEvent('onAfterHide');
		},

		destroy: function () {
			window.clearTimeout(this._tmr);
			try {
				if (this._window && !this.options.standalone) {
					this._window.close();
				}
			} catch (e) { }
			this._window = null;
			this.parent();
		}

	});

	var FDWindowBlind = new Class({

		Extends: FDWindowBase,

		type: 'blind',
		options: { type: 'dark', onclick: null },

		_loader: null,
		_selects: 0,

		initialize: function () {
			this.log('.initialize!!, options=' + Object.inspect(this.options));
			this.parent.apply(this, arguments);
		},

		createProxies: function () {
			this.parent({
				fadeIn: $.proxy(function () { this._selects = hideControl('SELECT', this._window.get(0)); this.fireEvent('onAfterShow'); }, this),
				fadeOut: $.proxy(function () { this.log('.fadeOut'); this.fireEvent('onAfterHide'); }, this)
			});
		},

		create: function () {

			if (this._created) return this;

			this.log('.create');

			this.fireEvent('onBeforeCreate');

			var jQ = this.context.window.$, options = this.options;
			try { this._window = jQ('<div class="' + options.className.append(options.blindClassName, ' ').append(options.type, '-') + (this.IEFix ? ' IEFix' : '') + '" style="display:none;height:0px;width:0px">&nbsp;</div>'); } catch (e) { alert('error=' + (e.message||e)); }
			if (options.loader) {
				this._loader = jQ('<img class="' + options.frameClassName.append('loader', '-') + '" src="' + options.label.cdn + options.label.path + 'images/loader.gif?' + options.label.version + '" style="position:relative">');
				this._window.append(this._loader);
			}
			if (options.onclick) {
				this._window.click($.proxy(function (e) { this.options.onclick(e); }, this));
			}

			jQ('body').append(this._window);

			this.fireEvent('onAfterCreate');

			return this;
		},

		show: function (options) {

			if (this.visible) return this;

			this.fireEvent('onBeforeShow', options);

			if (this.options.zIndex) {
				this._window.css('zIndex', this.options.zIndex);
			}
			this.position();
			this._window.fadeIn(this.options.fadeIn, this._proxy.fadeIn);

			//hideControl('SELECT', this._window.get(0));

			//this.fireEvent('onAfterShow');

			return this;
		},

		position: function () {

			if (!this.parent()) return false;

			this.log('.position');
			var jQ = this.context.window.$, $context = jQ(this.options.element || this.context.window.document.body), height;

			if (!$context[0]) {
				this.log(['.position', this.options, this.context, this.options.element, this.context.window.document.body]);
				return;
			}

			if (this.options.element) {
				height = $context.getHeight();
				this._window
					.setHeight(height, true)
					.setWidth($context.getWidth(), true);
			} else {
				var $window = $(this.context.window), scrollV = ($context[0].scrollHeight > $context[0].offsetHeight + 2), dim = this.getDimensions($window);
				var zoom = dim.zoom, 
					h = dim.height /*$context.innerHeight()*/ + (FD.Browser.greater('ie', 6, false, true) ? $window.scrollTop() : 0), 
					w = dim.width /*$context.innerWidth()*/ + (FD.Browser.greater('ie', 6, false, true) ? $window.scrollLeft() : 0);
				
				//alert(h + ', ' + $context.innerHeight() + ', ' + $context.height() + ', ' + $window.height() + '; ' + dim.height);

				//this.log('.position, ' + $context.width() + ', ' + $context[0].clientWidth + ', ' + $context[0].scrollWidth + ', ' + $context[0].body.offsetWidth + ', ' + scrollV + ', zoom=' + FD.ViewPort.getDimensions().zoom);
				/*if (false && FD.Browser.WebKit && zoom != 1) {
					h = h / zoom;
					w = w / zoom;
				}*/

				// TODO: cleanup the code below
				this._window
					.height(h - (FD.Browser.WebKit && !FD.Browser.mobile && zoom > 1.1 ? 0.5 : 0))
					.width(w - (FD.Browser.WebKit && !FD.Browser.mobile && zoom > 1.1 ? 0.5 : (false && FD.Browser.is('ie', 8) ? 4 : 0)));
			}

			if (this.options.element) {
				var offset = $context.offset();
				this._window.css({ top: offset.top + 'px', left: offset.left + 'px' });
				if (this.options.loader) {
					this._loader.css({
						top: (height / 2) - 16, //(this._loader.height() / 2),
						left: (this._window.getWidth() / 2) - 16 //(this._loader.width() / 2)
					});
				}
			}
		},

		hide: function (after) {

			this.fireEvent('onBeforeHide');

			// show all combo/listboxen
			if (this._selects > 0) showControl(this._window.get(0));
			this._window.fadeOut({ complete: this._proxy.fadeOut }); //

		},

		toggle: function (toggle) {
			if (typeof toggle == 'undefined') toggle = !this.visible;
			if (toggle && !this.visible) this.show();
			else if (!toggle && this.visible) this.hide();
			return this;
		}

	});


	/* jQuery extensions */

	// This actually adds the .fdWindow() function to the jQuery namespace
	$.fn.showDialog = function (options, cancable) {
		if (String.is(options)) options = { preset: options, cancable: cancable };
		return this.each(function () {
			if (this.tagName && this.tagName.toLowerCase().list('input', 'select', 'textarea')) {
				// it's an input type of element. show a dialog with the element as a source parameter.
				if (!options.name) options.name = this.id;
				$.fdWindow.showDialog(Object.extend(options, { params: { source: $(this)} }));
			} else {
				var cwindow = $.fdWindow.create('dialog', options);
				$(this).bind('click', function (e) { cwindow.show(null, e); return false; });
			}
		});
	};

	$.fn.fdBlind = function (toggle, options) {
		return this.each(function () {
			var _self = $(this);
			var blind = _self.data('fd-blind') || new FDWindowBlind($.extend({}, { type: 'light', element: this, loader: true }, options));
			_self.data('fd-blind', blind);
			blind.create().toggle(toggle);
		});
	};

	$.extend(FDWindowManager, {
		classes: {
			dialog: FDWindowDialog,
			classic: FDWindowClassic,
			blind: FDWindowBlind,
			loader: FDWindowLoader
		},
		defaults: $.extend({}, FDThemeBase.defaults, {
			// style defaults
			windowClassName: 'window-dialog',
			closeboxClassName: 'window-closebox',
			titleClassName: 'window-title',
			frameClassName: 'window-frame',
			iconClassName: 'window-icon',
			contentClassName: 'window-content',
			buttonbarClassName: 'window-buttonbar',
			buttonClassName: 'window-button',
			blindClassName: 'window-blind',
			loaderClassName: 'window-loader',
			themePrefix: 'window-theme-',
			// property defaults
			title: '',
			icon: '',
			content: '',
			url: '',
			buttonType: 0 /* FDWindowConstants.buttonTypes.OK */
		})
	});

	if (typeof FD.Window == 'undefined') {
		// create an instance of the Window Manager on the FD and jQuery namespace. Window as a shortcut property name.
		FD.Window = $.fdWindow = new FDWindowManager();
	}

})(jQuery);

var FDWindowConstants = FD.Window.Constants = WND.Constants = {
	mainTypes: {
		DIALOG: 'dialog',
		CLASSIC: 'classic',
		LOADER: 'loader',
		BLIND: 'blind'
	},
	windowTypes: {
		DEFAULT: 'INFORMATION',
		STOP: 'STOP',
		QUESTION: 'QUESTION',
		EXCLAMATION: 'EXCLAMATION',
		INFORMATION: 'INFORMATION',
		PROGRESS: 'PROGRESS',
		FRAME: 'FRAME'
	},
	buttonTypes: {
		NONE: -1,
		OK: 0,
		OKCANCEL: 1,
		YESNO: 2,
		YESNOCANCEL: 3,
		CLOSE: 4,
		STOP: 5,
		ACCEPTCORRECT: 6,
		CORRECTCONTINUE: 7
	},
	buttonImages: {
		OK: 'ok.gif',
		CANCEL: 'undo.gif',
		YES: 'ok.gif',
		NO: 'delete_simple.gif',
		CLOSE: 'close.gif',
		STOP: 'stop.gif',
		NEXT: 'next_gr.gif',
		SAVE: 'save.gif',
		ACCEPT: 'ok.gif',
		CONTINUE: 'ok.gif',
		CORRECT: 'undo.gif'
	},
	buttonClasses: {
		OK: 'save',
		CANCEL: 'cancel',
		YES: 'save',
		NO: 'cancel',
		CLOSE: 'close',
		STOP: 'stop',
		NEXT: 'next',
		PREVIOUS: 'previous',
		SAVE: 'save'
	},
	iconImages: {
		STOP: 'msg_stop.png',
		QUESTION: 'msg_help.gif',
		EXCLAMATION: 'msg_alert.png',
		INFORMATION: 'msg_info.png',
		BACKEND: {
			STOP: 'dialog_stop.png',
			QUESTION: 'dialog_help.png',
			EXCLAMATION: 'dialog_alert.png',
			INFORMATION: 'dialog_info.png'
		},
		PROGRESS: 'loader.gif',
		CLOSEBOX: 'closebox.png'
	},
	returnTypes: {
		OK: 1,
		CANCEL: 2,
		YES: 3,
		NO: 4,
		STOP: 5,
		SAVE: 6,
		CLOSE: 7,
		CORRECT: 1,
		ACCEPT: 2,
		CONTINUE: 2
	}
};

(function () {
	if (FD.isBackend()) {
		var info = FD.Label.getInfo('img');
		//alert(info.cdn);
		//String.log("CDN=" + info.cdn);
		preloadImage(info.cdn + info.path + 'images/loader.gif?v' + info.version);
	}
})()

String.log('SCRIPT LOADED: fd_window.js');

var __FD_WINDOW = true;

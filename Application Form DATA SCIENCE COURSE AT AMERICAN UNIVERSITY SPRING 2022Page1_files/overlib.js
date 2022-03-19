
var FDTooltip = new Class({

	Extends: FDBaseClass,
	Implements: [Events, FDThemeBase],
	_class: 'FDTooltip',

	_trace: false,

	visible: false,

	_tooltip: null,
	_tooltipDefault: null,
	_current: '',
	_stickyTarget: null,

	_tmr: 0,
	_tmrMove: 0,
	_show: false,
	_inShowing: false,

	_prevPageX: 0,
	_prevPageY: 0,

	initialize: function (options) {
		this.parent($.extend({}, FDTooltip.defaults.general, options));
		if (options && options.name) this.name = options.name;
		this.namespace = (options && options.namespace ? options.namespace : this._guid);
		this.getTheme();
		$(document).ready(this.init.bind(this));
	},

	createProxies: function () {
		// create proxy functions to be used with events.
		// when the event is triggered, the function runs in this context
		this.parent({
			fadeOut: $.proxy(this.afterHide, this)
		});
	},

	setOptions: function () {
		this.parent.apply(this, arguments);
		if (this._tooltip) this._tooltip.removeClass().addClass(this.options.className.append(this.options.tooltipClassName, ' '));
		return this;
	},

	init: function () {
		this._create();
		this.setEvents();
	},

	_create: function () {
		var options = this.options;
		this._tooltipDefault = $('<div id="tooltip' + this.namespace + '" class="' + options.className.append(options.tooltipClassName, ' ') + '" style="display:none;position:absolute;left:0px;top:0px"></div>');
		$('body').append(this._tooltipDefault);
	},

	setEvents: function (selector, options, delegate) {

		this.log('.setEvents', 'group');

		var self = this;
		selector = (String.is(selector) ? selector : (selector instanceof jQuery || (typeof selector != 'undefined' && typeof selector.jquery == 'string') ? selector : '.has-tooltip'));
		if (Object.is(delegate)) {

			$(delegate)
				.on('mouseenter.' + self.namespace, selector, self.show.bind(self, options))
				.on('mouseleave.' + self.namespace, selector, self.hide.bind(self));

		} else {
			$(selector).each(function () {
				var _options = options || null, title, content, _self = $(this);

				self.log('.setEvents, title=' + this.title, 'group');

				if (this.title) {

					_self.data('title', this.title);
					_options = $.extend({}, _options);
					var arr = this.title.split('::');
					content = arr.shift();
					title = (arr.length > 0 ? arr.shift() : '');
					if (arr.length > 0) $.extend(_options, jQuery.parseJSON(arr.shift().replace(/'/g, '"')));
					_options.title = title || '';
					_options.content = content || '';

				} else if (_self.hasClass('info-tooltip') || (tooltip = _self.find("div[role='tooltip']")).length > 0 || _self.attr('role') == 'tooltip') {

					_options = $.extend({}, _options);

					var tooltip = _self.find("div[role='tooltip']");
					if (tooltip.length == 0) {
						tooltip = $('#' + _self.prop('id') + '-tooltip');
					}
					if (tooltip.length == 0 && _self.attr('role') == 'tooltip') {

						tooltip = _self; //$('<div role="tooltip" />').html(_self.html()).prop('id', 'info-' + String.uniqueID());

						tooltip.wrap($('<div />').addClass(tooltip.attr('class'))).removeClass();
						_self = tooltip.parent();
					}
					if (!tooltip.prop('id')) {
						tooltip.prop('id', 'tooltip-' + String.uniqueID());
					}

					if (!tooltip.attr('aria-labelledby')) {

						self.log('.setEvents, finding label by its sibling span');

						var closest = _self.prev('span'), inputs = null;
						if (closest.length == 0) {

							self.log('.setEvents, finding label by its parent .info');

							var info = _self.closest('.info');

							inputs = info.next('.value').find('input:not([type=hidden]),textarea,select');
							closest = info.prev('.key');

						}
						if (closest.length > 0) {

							self.log('.setEvents, label found');

							if (!closest.prop('id')) {
								closest.prop('id', 'question-' + String.uniqueID());
							}
							tooltip.attr('aria-labelledby', closest.prop('id'));

							if (inputs && inputs.length > 0) {
								inputs.each(function () {

									var $self = $(this), label;
									$self.attr('aria-describedby', tooltip.prop('id'));

									var lblby = $self.attr('aria-labelledby') || '';
									if (lblby.search(closest.prop('id')) == -1) {
										lblby = lblby.prepend(closest.prop('id'), ' ');
										$self.attr('aria-labelledby', lblby);
									}
									if (/checkbox|radio/.test($self.prop('type') || '') && (label = $self.next('label')).length > 0) {
										if (!label.prop('id')) {
											label.prop('id', 'label-' + String.uniqueID());
										}
										if (lblby.search(label.prop('id')) == -1) {
											lblby = lblby.append(label.prop('id'), ' ');
											$self.attr('aria-labelledby', lblby);
										}
									} else if ((label = $self.prev('label')).length > 0) {
										if (!label.prop('id')) {
											label.prop('id', 'label-' + String.uniqueID());
										}
										if (lblby.search(label.prop('id')) == -1) {
											lblby = lblby.append(label.prop('id'), ' ');
											$self.attr('aria-labelledby', lblby);
										}
									}

								})
								inputs.attr('aria-describedby', tooltip.prop('id'));
							}
						}
					}
					if (tooltip.attr('aria-labelledby')) {
						var labelledby = $('#' + tooltip.attr('aria-labelledby'));
						if (labelledby.length > 0 && !labelledby.attr('aria-describedby')) {
							//labelledby.attr('aria-describedby', tooltip.prop('id'));
						}
					}

					if (!_self.prop('id')) _self.prop('id', 'info-' + String.uniqueID());
					_options.element = tooltip; // tooltip.attr('aria-owns', _self.prop('id'));

					/*} else {
							_options.title = $('#' + (_self.attr('aria-describedby') ? _self.attr('aria-describedby') : _self.attr('aria-labelledby'))).html();
							_options.content = _self.html();
						}*/
				}

				this.title = '';

				_self
					.off('.' + self.namespace)
					.on('mouseenter.' + self.namespace, self.show.bind(self, $.extend({}, options, _options)))
					.on('mouseleave.' + self.namespace, self.delayHide.bind(self))
					.on('focus.' + self.namespace, function (e) { self.log(['.focus', e]); self.show($.extend({}, options, _options, { dismissWhenMoving: true, sticky: true }), e); /*self.show.bind(self, $.extend({}, options, _options)*/ })
					.on('blur.' + self.namespace, function (e) { self.log(['.blur', e]); self.hide(); })
					.on('keydown.' + self.namespace, function (e) {
						if (e.keyCode == 27 /*ESC*/) self.hide();
						else if (e.keyCode == 32 /*SPACE*/) {
							e.stopImmediatePropagation();
							e.preventDefault();
							self.show($.extend({}, options, _options), e);
						}
					})
					.on('keyup.' + self.namespace, function (e) {
						if (e.keyCode == 32 /*SPACE*/) {
							e.stopImmediatePropagation();
							e.preventDefault();
						}
					})
					.addClass('tooltip-set')
					.prop('tabindex', 0);

				self.log('', 'groupEnd');

			});
		}
		if (!$('body').hasClass(this.namespace + '-capture-mousemove')) {
			$(document)
				.on('mousemove.' + this.namespace, (function (e) { if (this.visible && this._isMoved(e) /*&& !this._tooltip.hasClass('sticky-tooltip')*/) { this.mouseMove(e); } }).bind(this));
			$('body').addClass(this.namespace + '-capture-mousemove');
		}

		this.log('', 'groupEnd');
	},

	_isMoved: function (e) {
		var moved = (this._prevPageX != e.pageX || this._prevPageY != e.pageY);
		if (moved) {
			this._prevPageX = e.pageX;
			this._prevPageY = e.pageY;
		}
		return moved;
	},

	clearEvents: function (selector) {
		selector = (String.is(selector) ? selector : (selector instanceof jQuery ? selector : '.has-tooltip'));
		$(selector)
			.off('.' + this.namespace)
			.each(function () {
				this.title = $(this).data('title') || '';
			})
			.removeClass('tooltip-set');
	},

	mouseMove: function (e, recur) {

		//if (e.type != 'focus' && this._tooltip.hasClass('sticky-tooltip')) return;

		//this.log(['.mouseMove, e=' + e + ', type=' + (e ? e.type : 'none') + ', recur=' + recur + ', left=' + this._tooltip.css('left') + ', top=' + this._tooltip.css('top'),
		//e.target, e.currentTarget, (this._tooltip ? this._tooltip.html() : '<no tooltip>'), this.options]);

		clearTimeout(this._tmrMove);

		if (this.options.dismissWhenMoving && !recur) {

			//this.log('.mouseMove, dismissWhenMoving');
			this.hide();
			return;

		}
		if (this.options.hideWhenMoving && !recur) {

			this._tooltip.hide();
			this.visible = true;

			//this.log(['.mouseMove, hideWhenMoving, delaying mouseMove', (this._tooltip ? this._tooltip.html() : '<no tooltip>')]);

			this._tmrMove = this.mouseMove.delay(this, 700, e, true);
			return;
		}

		var wnd = $(window), options = this.options, sl = wnd.scrollLeft(), st = wnd.scrollTop(), el = $(e.target), offset = el.offset(),
			prop = {
				scrollLeft: sl,
				scrollTop: st,
				clientWidth: wnd.width() + sl,
				clientHeight: wnd.height() + st,
				correctX: 0,
				correctY: 0
			};

		if (e.type == 'focus' || this.options.sticky || this._tooltip.hasClass('sticky-tooltip')) {

			if (this._stickyTarget) {
				el = prop.el = this._stickyTarget;
				offset = el.offset();
			}

			//this.log(['.mouseMove, focus or sticky, offset=' + offset.left + ',' + offset.top, el, e.target]);

			var x, y;
			switch (this.options.dirX) {
				case FDTooltip.CENTER:
					x = offset.left + (el.width() / 2);
					break;
				case FDTooltip.RIGHT:
					x = offset.left;
					break;
				default:
					x = offset.left + el.width();
					break;
			}
			switch (this.options.dirY) {
				case FDTooltip.TOP:
					y = offset.top;
					break;
				case FDTooltip.MIDDLE:
					y = offset.top + (el.height() / 2);
					break;
				default:
					y = offset.top + el.height();
					break;
			}
			prop.x = prop.pageX = x;
			prop.y = prop.pageY = y;
		} else {
			prop.x = prop.pageX = e.pageX;
			prop.y = prop.pageY = e.pageY;
		}

		//this.log(['.mouseMove, type=' + e.type + ', width=' + el.width() + ', heidht=' + el.height(), prop, offset]);
		this._correctXY(prop);

		var visible = this.visible && this._tooltip.css('display') != 'none';
		if ((!options.sticky && !this._tooltip.hasClass('sticky-tooltip')) || !visible) {
			if (Number.create(this._tooltip.css('left')) != prop.x || Number.create(this._tooltip.css('top')) != prop.y) {
				//this.log('.move, diff');
				this._tooltip.css({ left: prop.x, top: prop.y });
			}
			if (!visible) {
				if (this._tooltip.css('visibility') == 'hidden' || this._tooltip.css('display') == 'none') {
					this._tooltip.css('display', 'none').css('visibility', '');
					this._tooltip.stop(true).fadeIn(options.fadeDuration);
				}
				this.visible = true;
			}
		}

	},
	_correctXY: function (prop) {

		var options = this.options, width = prop.divWidth = FD.Element.Dimensions.getWidth(this._tooltip, true), height = prop.divHeight = FD.Element.Dimensions.getHeight(this._tooltip), correctOffsetX = options.offsetX;

		this.log(['._correctXY, begin', Object.inspect(prop)]);

		if (options.swap) {
			if (this.dirX == FDTooltip.RIGHT && (prop.x - prop.scrollLeft) > ($(window).width() - width - 16)) this.dirX = FDTooltip.LEFT;
			else if (this.dirX == FDTooltip.LEFT && (prop.x + prop.scrollLeft - width) < 0) prop.dirX = FDTooltip.RIGHT;

			//if (!options.swapBottom) options.offsetY = height / 2;

			prop.correctY = (prop.y + this.options.offsetY) - wnd.height() - st;
		}

		switch (options.dirX) {
			case FDTooltip.CENTER:
				prop.x = prop.x + options.offsetX - (width / 2);
				break;
			case FDTooltip.RIGHT:
				correctOffsetX = (options.offsetX * 2);
				prop.x = prop.x + correctOffsetX;
				break;
			case FDTooltip.LEFT:
				correctOffsetX = (options.offsetX / 2);
				prop.x = prop.x - correctOffsetX - width;
				break;
		}

		switch (options.dirY) {
			case FDTooltip.TOP:
				prop.y = prop.y - height - (options.offsetY / 2); // when the tooltip is to show above the cursor, then take a lower offset value
				break;
			case FDTooltip.MIDDLE:
				prop.y = prop.y + (height / 2);
				break;
			case FDTooltip.BOTTOM:
				prop.y = prop.y + options.offsetY;
				break;
		}

		//this.log(['._correctXY, before swap', Object.inspect(prop)]);

		if (!options.swap) {

			// correct X-axis
			prop.correctX = (prop.x + width + correctOffsetX) - prop.clientWidth;
			if (prop.correctX > 0) prop.x -= prop.correctX;
			if (prop.x < prop.scrollLeft) prop.x = prop.scrollLeft;

			prop.x = Math.max(prop.x, options.offsetX);

			// correct Y-axis
			if ((prop.y + height + options.offsetY /*- options.offsetY*/) > prop.clientHeight) {
				if (prop.el) { // it's a sticky one
					prop.y = prop.y - height - prop.el.height() - options.offsetY;
				} else {
					prop.y = prop.y - ((prop.y + height + options.offsetY) - prop.clientHeight); // height - options.offsetY - (options.offsetY / 2); // swap the tooltip to above the cursor
					if (prop.pageX.between(prop.x, prop.x + width) && prop.pageY.between(prop.y, prop.y + height)) {
						prop.y = prop.pageY - height - options.offsetY;
					}
				}
			}

		} else {

			if (!options.swapBottom) {
				if (prop.correctY > 0) {
					prop.y -= prop.correctY;
				}
				if ((prop.correctY = options.offsetY - prop.y) > 0) {
					prop.y += prop.correctY;
				}
			} else if (prop.y + height - options.offsetY > prop.clientHeight) {
				prop.y = prop.y - height + (prop.el ? -(prop.el.height() + options.offsetY) : (options.offsetY + 6));
			}
		}

		//this.log(['._correctXY', options, prop]);

		return prop;
	},

	delayHide: function (e) {
		clearTimeout(this._tmrHide);
		this._tmrHide = this.hide.delay(this, 100, e);
	},

	hide: function (e) {

		clearTimeout(this._tmr);
		clearTimeout(this._tmrMove);

		if (this._inShowing) {

			this.log(['.hide, inShowing, returning', this._tooltip.html()]);

			//this._tmr = this.hide.delay(this, 200);
			return;
		}

		var el;
		if (e && !Boolean.is(e)) {
			el = $(checkEvent(e));
			if (!el.hasClass('tooltip-set')) {
				var closest = el.closest('.tooltip-set');
				if (closest.length > 0)
					el = closest;
			}
		} else {
			el = $('.show-tooltip-' + this.namespace/* + ',.sticky-tooltip'*/);
		}

		this.log(['.hide[' + this.namespace + '], e=' + e + ', el=' + el + '/length=' + el.length + ', id=' + el.data(this.namespace) + ', current=' + this._current, e, el]);

		if (el.data(this.namespace) == this._current) this._current = '';

		el.removeClass('show-tooltip-' + this.namespace);
		if (this._tooltip) {
			this._tooltip.removeClass('sticky-tooltip');
			this._stickyTarget = null;
			if (Boolean.is(e)) {
				if (e) {
					this._tooltip.hide();
				}
				this.afterHide();
			} else {
				this.visible = false;
				this._tooltip.fadeOut(this.options.fadeDuration, this._proxy.fadeOut);
			}
			this._current = '';
		}

	},
	afterHide: function () {
		this._tooltip/*.html('')*/.css({ width: '', height: '' });
		//if (this._tooltip.attr('aria-owns')) this._tooltip.detach().appendTo($('#' + this._tooltip.attr('aria-owns')));
		this.visible = false;
	},

	show: function (options, e, recur) {

		clearTimeout(this._tmr);
		clearTimeout(this._tmrHide);

		this.log(['.show', e, checkEvent(e), options]);

		var el = $((typeof e.tagName != 'undefined' ? e : checkEvent(e)));
		if (!el.hasClass('tooltip-set')) {
			var closest = el.closest('.tooltip-set');
			if (closest.length > 0) {
				el = closest;
			}
		}
		this.log(['.show, id=' + el.prop('id')/*, el.html()*/]);

		if (!el.data(this.namespace) || typeof el.data(this.namespace) == 'undefined') el.data(this.namespace, this.getUniqueID());
		if (this._current == el.data(this.namespace)) {
			this.log('.show, elements the same')
			return;
		}
		//this.log(['.show', e]);

		this.log('.show, namespace=' + this.namespace + ', id=' + el.data(this.namespace) + ', el=' + el.length + ', typeof=' + typeof el.data(this.namespace));
		if (!recur && this._tooltip) {
			this._tooltip.finish();
			this._tmr = this.show.delay(this, 0, options, e, true);
			this.log(['.show, delay', el.html()]);
			return;
		}

		this._current = el.data(this.namespace);
		this.setOptions($.extend({}, FDTooltip.defaults.tooltip, options));

		if (options.element && (!this._tooltip || this._tooltip != options.element)) {

			this.log('.show, this._tooltip=' + this._tooltip + ', apparently not the same');

			//if (this._tooltip) this._tooltip.hide();
			//this._tooltip = null;
			this.hide(true);
			this._tooltip = options.element;

		} else if (!options.element) {

			this.hide(this._tooltip != this._tooltipDefault);
			this._tooltip = this._tooltipDefault;

		}

		//this.log(['.show 2', el.html(), (options.element ? options.element.html() : '<no element>')]);

		this._inShowing = true;

		if (!this.visible) {
			this._tooltip.css('min-width', '');

			if (this._tooltip.css('display') == 'none') {
				this._tooltip.css('visibility', 'hidden').css({ top: 0, left: 0, display: '' });
			}
			/*if (e.type != 'focus')*/ el.addClass('show-tooltip-' + this.namespace);
			if (e.type == 'focus' || this.options.sticky) {
				this._tooltip.addClass('sticky-tooltip');
				this._stickyTarget = el;
			} else {
				this._stickyTarget = null;
			}
		}

		this.log('.show, has element=' + (options.element ? 'true' : 'false') + ', visible=' + this.visible);

		var content;
		if (!options.element) {

			this.log('no element, create content');

			this._tooltip.html('');

			if (this.options.title) {
				this._tooltip.append($('<div class="' + this.options.titleClassName + '">' + unescape(this.options.title) + '</div>'));
			}
			content = $('<div class="' + this.options.contentClassName + '"></div>').appendTo(this._tooltip);
			content.html((Function.is(this.options.content) ? this.options.content(el) : this.options.content || ''));

		} else {

			if (!this._tooltip.hasClass(this.options.className)) {
				this.log('.show, init tooltip');
				// initialize the tooltip
				this._tooltip.addClass(this.options.className.append(this.options.tooltipClassName, ' ')).css({
					position: 'absolute',
					left: '0px',
					top: '0px'
				});
				content = $('<div class="' + this.options.contentClassName + '"></div>').html(this._tooltip.html()).appendTo(this._tooltip.empty());

				var title = '';
				if (this._tooltip.attr('aria-labelledby')) {
					this._tooltip.attr('aria-labelledby').split(' ').forEach(function (el) {
						el = $('#' + el);
						if (el.find('label').length > 0) el = el.find('label').first();
						title = title.append(el.contents().filter(function (index, el) { return !$(el).hasClass('has-tooltip'); }).text(), ' | ');
					});
				} else if (this._tooltip.attr('aria-label')) {
					title = this._tooltip.attr('aria-label');
				}
				if (title && !this.options.noTitle) {
					this._tooltip.prepend($('<div role="none presentation" class="' + this.options.titleClassName + '"></div>').html(title));
				}
			} else {

				this.log('.show, find content (' + this.options.contentClassName + ')');
				content = this._tooltip.find('.' + this.options.contentClassName);
			}

			//this.log(['.show, detach and attach to body', el.html(), this._tooltip.html()]);
			this._tooltip.detach().appendTo('body');
		}

		if (options.width) FD.Element.Dimensions.setWidth(this._tooltip, options.width, true); // this._tooltip.width(options.width);
		if (options.height) this._tooltip.height(options.height);

		if (options.readmore && content.height() < content[0].scrollHeight) this._tooltip.append($('<div class="' + this.options.moreClassName + '">' + this.getText('READMORE') + '</div>'));
		if (options.footer) this._tooltip.append($('<div class="' + this.options.footerClassName + '">' + (Function.is(options.footer) ? options.footer(el) : options.footer) + '</div>'));

		this._tooltip
			.off('mouseleave.' + self.namespace).on('mouseleave.' + self.namespace, this.hide.bind(this))
			.off('mouseenter.' + self.namespace).on('mouseenter.' + self.namespace, (function () { clearTimeout(this._tmrHide); }).bind(this));

		this._tooltip.css('min-width', this._tooltip.width());

		this.mouseMove(e, true);

		this._inShowing = false;

	},

	setContent: function (str) {

		if (!this.visible || !this._tooltip) {
			return;
		}

		//alert(this.options.content);

		var content = this._tooltip.find('.' + this.options.contentClassName), el = $('.show-tooltip-' + this.namespace);
		if (arguments.length > 0) {
			content.html(str);
		} else if (Function.is(this.options.content)) {
			content.html(this.options.content(el));
		} else {
			content.html(this.options.content || '');
		}

	}

}).extend({
	defaults: {
		general: $.extend({}, FDThemeBase.defaults, {
			themePrefix: 'tooltip-theme-',
			tooltipClassName: '',
			titleClassName: 'tooltip-title',
			contentClassName: 'tooltip-content',
			moreClassName: 'tooltip-readmore',
			footerClassName: 'tooltip-footer',
			fadeDuration: 200,
			offsetX: 10,
			offsetY: 10
		}),
		tooltip: {
			dirX: 1,
			dirY: 32,
			sticky: false,
			swap: false,
			swapBottom: false,
			title: '',
			text: '',
			hideWhenMoving: false,
			dismissWhenMoving: false
		}
	},
	LEFT: 1,
	RIGHT: 2,
	CENTER: 4,
	TOP: 8,
	MIDDLE: 16,
	BOTTOM: 32
});

FD.Tooltip = new FDTooltip();

$.fn.tooltip = function (options) {
	return this.each(function () {
		FD.Tooltip.setEvents($(this), options);
	});
}


window.FDOverlib = new Object();

////////////////////////////////////////////////////////////////////////////////////
// CONFIGURATION
////////////////////////////////////////////////////////////////////////////////////

FDOverlib.Config = new Object();

FDOverlib.Config.ForeColor = "#fafad2";
FDOverlib.Config.BackColor = "#b4b4b4";
FDOverlib.Config.TextColor = "#000000";
FDOverlib.Config.CaptionColor = "#FFFFFF";
FDOverlib.Config.CloseColor = "#9999FF";

FDOverlib.Config.TableWidth = '';
FDOverlib.Config.DefTableWidth = FDOverlib.Config.TableWidth;
FDOverlib.Config.DivWidth = (FDOverlib.Config.TableWidth ? parseInt(FDOverlib.Config.TableWidth) : 0);
FDOverlib.Config.DivHeight = 0;

FDOverlib.Config.Border = "1";
FDOverlib.Config.DefOffsetX = 12;
FDOverlib.Config.DefOffsetY = 14;

FDOverlib.Config.CSS = new Object();
FDOverlib.Config.CSS.Inited = false;
FDOverlib.Config.CSS.gotCSS = false;
FDOverlib.Config.CSS.Use = false;
FDOverlib.Config.CSS.Table = '';
FDOverlib.Config.CSS.Caption = '';
FDOverlib.Config.CSS.Text = '';
FDOverlib.Config.CSS.Init = function () {
	this.Inited = true;
	var css = null;
	try {
		css = (typeof window.ol_css != 'undefined' ? window.ol_css : (FD.Form.Info.action < 100 && FD.Backend ? FD.Backend.olCSS : null));
	} catch (e) { };
	if (css) {
		this.gotCSS = true;
		this.Table = css.table;
		this.Caption = css.cap;
		this.Text = css.text;
	}
};

////////////////////////////////////////////////////////////////////////////////////
// END CONFIGURATION
////////////////////////////////////////////////////////////////////////////////////

FDOverlib.Delay = 0;
FDOverlib.tmrDelay = 0;
FDOverlib.Style = '';
FDOverlib.Text = '';
FDOverlib.Title = '';
FDOverlib.Dir = 1;
FDOverlib.Move = true;
FDOverlib.Bottom = false;
FDOverlib.Count = 0;
FDOverlib.Display = false;
FDOverlib.Show = false;
FDOverlib.Swap = true;
FDOverlib.Status = '';
FDOverlib.PrevStatus = '';
FDOverlib.srcElement = false;

FDOverlib.Window = null;
FDOverlib.Document = null;
FDOverlib.Div = null;

FDOverlib.PageOffsetX = 0;
FDOverlib.OffsetX = 0;
FDOverlib.OffsetY = 0;
FDOverlib.CorrectX = 0;
FDOverlib.CorrectY = 0;
FDOverlib.ClientWidth = 0;
FDOverlib.ClientHeight = 0;
FDOverlib.X = 0;
FDOverlib.Y = 0;

FDOverlib.initialize = function () {
	$('.has-tooltip').each(function () {
		if (!this.title) return;
		var arr = this.title.split('::'), content = arr[0] || this.title, title = arr[1] || '';
		this.title = '';
		$(this)
			.mouseover(function (e) { drb(window, this, content, title, true, 800, e); })
			.mouseout(nd)
			.toggleClass('has-tooltip');
	});
};

FDOverlib.CheckParams = function (opWindow, vpElement, cpText, cpTitle, npDir, lpUseCSS, npDelay, e) {

	if (typeof cpText != 'string' || cpText.length == 0) return false;

	this.stamp = '';
	this.Delay = npDelay || 0;
	if (this.Delay > 0) {
		nd();
		FDOverlib.Events.mouseMoveEvent = cloneEvent(e);
		this.tmrDelay = window.setTimeout('FDOverlib.Utils.execDelay()', this.Delay);
	}

	this.Text = unescape(cpText);
	this.Title = (cpTitle ? unescape(cpTitle) : '');
	if (this.Title.length > 50) {
		this.Title = this.Title.substr(0, 47) + '...';
	}
	this.Dir = npDir;
	this.Display = false;
	this.Swap = true;
	this.Status = ((typeof cpTitle == 'string' && cpTitle != '') ? cpTitle : cpText).stripHTML();
	if (this.Status.length > 50) {
		this.Status = this.Status.substr(0, 47) + '...';
	}
	this.Status = 'help: ' + this.Status;
	this.Window = opWindow || null;
	this.Document = (this.Window ? this.Window.document : null);

	this.srcElement = (typeof vpElement == 'object');
	var el = vpElement;
	if (this.srcElement) {
		el = FD.get(vpElement, this.Document);
		el.Overlib = true;
	}
	this.Div = FD.get('overDiv', this.Document);
	var lOk = (Object.is(this.Div) && Object.is(this.Window) && Object.is(this.Document));
	if (!lOk && this.Window) this.Window.status = 'overlib: bad params';
	else {
		if (!this.Config.CSS.Inited) this.Config.CSS.Init();
		this.Config.CSS.Use = this.Config.CSS.gotCSS && (typeof window.ol_css_no == 'undefined' || !window.ol_css_no || lpUseCSS);
		this.Events.Set(el);
	}

	return lOk;
}


// Common calls
FDOverlib.Prepare = function () {
	if (!this.Div) return;
	FDOverlib.OffsetX = this.Config.DefOffsetX;
	FDOverlib.OffsetY = this.Config.DefOffsetY;
	if (window.Browser.ie || window.Browser.W3C) {
		this.Div.style.zIndex = 1002;
		this.Div.style.width = '';
		this.Div.style.height = '';

		if (window.Browser.ie) {
			this.Config.DivWidth = this.Div.scrollWidth;
			this.Config.DivHeight = this.Div.scrollHeight;
			this.Div.style.width = this.Config.DivWidth;
			this.Div.style.height = this.Config.DivHeight;
		} else {
			this.Config.DivWidth = this.Div.offsetWidth;
			this.Config.DivHeight = this.Div.offsetHeight;
		}

		if (this.Swap && !this.Bottom) //lSwap
			FDOverlib.OffsetY = this.Config.DivHeight / 2;
		else
			FDOverlib.OffsetY = -this.Config.DefOffsetY;

	}
	if (window.Browser.ns4) {
		this.Config.DivWidth = this.Div.document.width;
		if (this.Swap && !this.Bottom)
			FDOverlib.OffsetY = this.Div.document.height / 2;
		else
			FDOverlib.OffsetY = -this.Config.DefOffsetY;
	}

	this.PrevStatus = this.Window.status;
	this.Window.status = this.Status;
}

FDOverlib.Hide = function (lpNoDiv) {

	FDOverlib.Utils.clearDelay();

	if ((typeof lpNoDiv == 'undefined' || !lpNoDiv) && this.Div) {
		try {
			$(this.Div).hide().css({ top: 0, left: 0, visibility: 'hidden' });
			//setDisplay('', this.Div, false);
			//			layerMove('', this.Div, 0, 0);
			//setVisibility('', this.Div, false);
			FDOverlib.Utils.layerWrite('', this.Div, '');
			this.ResetDimensions();
			showControl(this.Div);
		} catch (e) { };
	}
	FDOverlib.X = 0;
	FDOverlib.Y = 0;
	this.Move = true;
	this.Display = false;
	this.Events.Release();
	try {
		if (this.Window)
			this.Window.status = this.PrevStatus;
	} catch (e) { };
	this.Window = null;
	this.Document = null;
	this.Div = null;
}

FDOverlib.ResetDimensions = function () {
	if (window.Browser.ie || window.Browser.W3C) {
		this.Div.style.width = '';
		this.Div.style.height = '';
	}
}


FDOverlib.Events = new Object();
FDOverlib.Events.pOnMouseMove = null;
FDOverlib.Events.mouseMoveEvent = null;

FDOverlib.Events.Set = function () {

	if (window.Browser.ns4 || window.Browser.ie4 || window.Browser.W3C) {
		this.pOnMouseMove = FDOverlib.Document.onmousemove;
		FDOverlib.Document.onmousemove = FDOverlib.Events.mouseMove;
		FDOverlib.Div.onmouseout = nd;
		if (window.Browser.ns) {
			if (window.Browser.ns4) {
				FDOverlib.Document.captureEvents(Event.MOUSEMOVE);
				FDOverlib.Div.captureEvents(Event.MOUSEOUT);
			} else {
				FDOverlib.Document.addEventListener('mousemove', FDOverlib.Events.mouseMove, false);
				FDOverlib.Div.addEventListener('mouseout', nd, false);
			}
		}
	}

}

FDOverlib.Events.Release = function () {

	if (window.Browser.ns4 || window.Browser.ie4 || window.Browser.W3C) {
		var lDoc = isObject(FDOverlib.Document, 'location');
		var lDiv = isObject(FDOverlib.Div, 'onmouseout');
		try {
			if (lDoc) FDOverlib.Document.onmousemove = this.pOnMouseMove;
			if (lDiv) FDOverlib.Div.onmouseout = null;
		} catch (e) { };
		this.pOnMouseMove = null;
		if (window.Browser.ns) {
			if (window.Browser.ns4) {
				if (lDoc) FDOverlib.Document.releaseEvents(Event.MOUSEMOVE);
				if (lDiv) FDOverlib.Div.releaseEvents(Event.MOUSEOUT);
			} else {
				if (lDoc) FDOverlib.Document.removeEventListener('mousemove', mouseMove, false);
				if (lDiv) FDOverlib.Div.removeEventListener('mouseout', nd, false);
			}
		}
	}

}


// The Close onMouseOver function for Sticky
FDOverlib.Events.Click = function () {
	setDisplay('', FDOverlib.Div, false);
	setVisibility('', FDOverlib.Div, false);
	FDOverlib.Show = false;
}

// Moves the layer
FDOverlib.Events.mouseMove = function (e) {

	if (!Object.is(FDOverlib.Window) || (!Object.is(e) && !Object.is(FDOverlib.Window.event))) {
		return;
	}


	e = e || FDOverlib.Window.event;

	if (FDOverlib.tmrDelay > 0) {
		FDOverlib.Events.mouseMoveEvent = cloneEvent(e);
		return;
	}

	if (!FDOverlib.Display) {
		setDisplay('', FDOverlib.Div, true);
		FDOverlib.Utils.setStyle();
	}

	var w = $(FDOverlib.Window);
	FDOverlib.PageOffsetX = w.scrollLeft();
	FDOverlib.PageOffsetY = w.scrollTop();
	FDOverlib.X = e.clientX + FDOverlib.PageOffsetX;
	FDOverlib.Y = e.clientY + w.scrollTop();
	FDOverlib.ClientWidth = w.width() + FDOverlib.PageOffsetX;
	FDOverlib.ClientHeight = w.height() + FDOverlib.PageOffsetY;
	if (FDOverlib.Swap)
		FDOverlib.CorrectY = (FDOverlib.Y + FDOverlib.OffsetY) - w.height() - FDOverlib.PageOffsetY;

	if (e.cancelBubble) e.cancelBubble = true;

	FDOverlib.Utils.CorrectXY();
	FDOverlib.Utils.moveTo();
}

FDOverlib.Utils = new Object();

FDOverlib.Utils.CorrectXY = function () {

	if ((window.Browser.ie) && FDOverlib.Swap) {
		if ((FDOverlib.X - FDOverlib.PageOffsetX) > (FDOverlib.Document.body.clientWidth - FDOverlib.Config.DivWidth - 16)) FDOverlib.Dir = 0;
		else FDOverlib.Dir = 1;
	}
	if ((window.Browser.gecko || Browser.WebKit || window.Browser.ns) && FDOverlib.Swap) {
		if ((FDOverlib.X - FDOverlib.PageOffsetX) > (FDOverlib.Window.innerWidth - FDOverlib.Config.DivWidth - 20)) FDOverlib.Dir = 0;
		else FDOverlib.Dir = 1;
	}

	if (FDOverlib.Dir == 2) { // Center
		FDOverlib.X = FDOverlib.X + FDOverlib.OffsetX - (FDOverlib.Config.DivWidth / 2);
		FDOverlib.Y = FDOverlib.Y - FDOverlib.OffsetY;
	}
	if (FDOverlib.Dir == 1) { // Right
		FDOverlib.X = FDOverlib.X + FDOverlib.OffsetX;
		FDOverlib.Y = FDOverlib.Y - FDOverlib.OffsetY;
	}
	if (FDOverlib.Dir == 0) { // Left
		FDOverlib.X = FDOverlib.X - (FDOverlib.OffsetX / 2) - (FDOverlib.Config.DivWidth);
		FDOverlib.Y = FDOverlib.Y - FDOverlib.OffsetY;
	}
	if (!FDOverlib.Swap) {
		//--> Correction X-as
		var tmp = FDOverlib.X;
		FDOverlib.CorrectX = ((FDOverlib.X + FDOverlib.Config.DivWidth + FDOverlib.OffsetX) - FDOverlib.ClientWidth);
		if (FDOverlib.CorrectX > 0)
			FDOverlib.X -= FDOverlib.CorrectX;
		if (FDOverlib.X < FDOverlib.PageOffsetX)
			FDOverlib.X = FDOverlib.PageOffsetX;

		FDOverlib.X = Math.max(FDOverlib.X, 20);

		//--> Correction Y-as
		if ((FDOverlib.Y + FDOverlib.Config.DivHeight - FDOverlib.OffsetY) > FDOverlib.ClientHeight)
			FDOverlib.Y = FDOverlib.Y - FDOverlib.Config.DivHeight + (FDOverlib.OffsetY - 10);
	} else {
		//--> Correction Y-as
		if (!FDOverlib.Bottom) {
			if (FDOverlib.CorrectY > 0)
				FDOverlib.Y -= (FDOverlib.CorrectY);
			FDOverlib.CorrectY = (FDOverlib.OffsetY - FDOverlib.Y)
			if (FDOverlib.CorrectY > 0)
				FDOverlib.Y += FDOverlib.CorrectY;
		} else {
			if ((FDOverlib.Y + FDOverlib.Config.DivHeight - FDOverlib.OffsetY) > FDOverlib.ClientHeight)
				FDOverlib.Y = FDOverlib.Y - FDOverlib.Config.DivHeight + (FDOverlib.OffsetY + 6);
		}
	}
}

// Move a layer
FDOverlib.Utils.moveTo = function () {
	var div = $(FDOverlib.Div);
	if (FDOverlib.Move) {
		div.css({ left: FDOverlib.X, top: FDOverlib.Y });
		/*if (FDOverlib.Dir == 2) { // Center
		layerMove('', FDOverlib.Div, FDOverlib.X, FDOverlib.Y);
		}
		if (FDOverlib.Dir == 1) { // Right
		layerMove('', FDOverlib.Div, FDOverlib.X, FDOverlib.Y);
		}
		if (FDOverlib.Dir == 0) { // Left
		layerMove('', FDOverlib.Div, FDOverlib.X, FDOverlib.Y);
		}*/
	}
	if (!FDOverlib.Display) {
		FDOverlib.Display = true;
		div.show().css('visibility', '');
		//		setDisplay('', FDOverlib.Div, true);
		//		setVisibility('', FDOverlib.Div, true);
	}
	if (window.Browser.ie && window.Browser.VersionNr < 7) {
		hideControl('SELECT', FDOverlib.Div);
	}
}

// Writes to the layer
FDOverlib.Utils.layerWrite = function (text) {
	$(FDOverlib.Div).html(text);
	//	layerWrite('', FDOverlib.Div, text);
}

FDOverlib.Utils.execDelay = function () {
	this.clearDelay();
	FDOverlib.Events.mouseMove(FDOverlib.Events.mouseMoveEvent);
}

FDOverlib.Utils.clearDelay = function () {
	if (FDOverlib.tmrDelay > 0) {
		window.clearTimeout(FDOverlib.tmrDelay);
		FDOverlib.tmrDelay = 0;
	}
}

FDOverlib.Utils.setStyle = function () {
	if (FDOverlib.Style) {
		if (Function.is(FDOverlib.Style)) FDOverlib.Style();
		else eval(FDOverlib.Style);
	}
	FDOverlib.Style = '';
}

// Public functions to be used on pages.

// Simple popup right
function drs(opWindow, cpElement, cpText, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 1, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'dts()';
}

// Caption popup right
function drc(opWindow, cpElement, cpText, cpTitle, npWidth, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 1, lpUseCSS, npDelay, e))
		return;
	FDOverlib.Style = 'dtt()'; //'dtc()';
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	if (typeof npWidth != 'undefined')
		FDOverlib.Config.TableWidth = npWidth;
	else
		FDOverlib.Config.TableWidth = FDOverlib.Config.DefTableWidth;
}

// Caption popup right
function drt(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 1, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'dtt()';
}

// Caption popup right/bottom
function drb(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 1, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true, FDOverlib.Bottom = true;
	FDOverlib.Style = 'dtt()';
}

// Sticky caption right
function src(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 1, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'stc()';
}

// Simple popup left
function dls(opWindow, cpElement, cpText, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 0, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'dts()';
}

// Caption popup left/center
function dlc(opWindow, cpElement, cpText, cpTitle, lpDontSwap, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 0, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = !lpDontSwap; FDOverlib.Bottom = false;
	FDOverlib.Style = 'dtc()';
}

// Caption popup left/bottom
function dlb(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 0, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = false, FDOverlib.Bottom = true;
	FDOverlib.Style = 'dtc()';
}

// Sticky caption left
function slc(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 0, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'stc()';
}

// Simple popup center
function dcs(opWindow, cpElement, cpText, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 2, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'dts()';
}

// Caption popup center
function dcc(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 2, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'dtc()';
}

// Sticky caption center
function scc(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 2, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = true; FDOverlib.Bottom = false;
	FDOverlib.Style = 'stc()';
}


// Caption popup left/bottom
function df(opWindow, cpElement, cpText, cpTitle, lpUseCSS, npDelay, e) {
	if (!FDOverlib.CheckParams(opWindow, cpElement, cpText, cpTitle, 0, lpUseCSS, npDelay, e)) return;
	FDOverlib.Swap = false, FDOverlib.Bottom = true;
	FDOverlib.Style = olform;
}
function dwysiwyg(el, text, title, e) {
	if (!FDOverlib.CheckParams(window, el, text, title, 0, true, 800, e)) return;
	FDOverlib.Swap = false, FDOverlib.Bottom = true;
	FDOverlib.Style = olwysiwyg;
}

// Clears popups if appropriate
function nd() {
	FDOverlib.Utils.clearDelay();
	if (FDOverlib.Window == null) return false;
	FDOverlib.Show = false;
	if (window.Browser.ns4 || window.Browser.ie4 || window.Browser.W3C) {
		if (!FDOverlib.Show) {
			FDOverlib.Hide();
		} else
			FDOverlib.Count++;
	}
}

// Non public functions. These are called by other functions etc.

// Simple popup
function dts() {
	cTxt = '<table style="' + (FDOverlib.Config.TableWidth ? "width:" + FDOverlib.Config.TableWidth + "px;" : "") + (FDOverlib.Config.BackColor ? "background-color:" + FDOverlib.Config.BackColor + ";" : "") + '" border="0" cellpadding="' + FDOverlib.Config.Border + '" cellspacing="0"><tr><td><table style="width:100%;' + (FDOverlib.Config.ForeColor ? "background-color:" + FDOverlib.Config.ForeColor : "") + '" border="0" cellpadding="2" cellspacing="0"><tr><td><font face="Arial,Helvetica" color="' + FDOverlib.Config.TextColor + '" size="-1">' + FDOverlib.Text + '</font></td></tr></table></td></tr></table>'
	FDOverlib.Utils.layerWrite(cTxt);
	FDOverlib.Prepare();
}

// Caption popup
function dtc() { //
	if (FDOverlib.Config.CSS.Use)
		cTxt = '<table class="' + FDOverlib.Config.CSS.Table + '" cellpadding="0" cellspacing="0"><tr><td>' + (FDOverlib.Title ? '<table width="100%" border="0" cellpadding="0" cellspacing="1"><tr><td class="' + FDOverlib.Config.CSS.Caption + '">' + FDOverlib.Title + '</td></tr></table>' : '') + '<table width="100%" cellpadding="0" cellspacing="1"><tr><td class="' + FDOverlib.Config.CSS.Text + '">' + FDOverlib.Text + '</td></tr></table></td></tr></table>'
	else
		cTxt = "<table id=test name=test" + ((FDOverlib.Config.TableWidth != "") ? " width=" + FDOverlib.Config.TableWidth : "") + " border=0 cellpadding=" + FDOverlib.Config.Border + " cellspacing=0 bgcolor=\"" + FDOverlib.Config.BackColor + "\"><tr><td><table width=100% border=0 cellpadding=0 cellspacing=0><tr><td><span id=\"PTT\"><font face=\"Arial,Helvetica\" color=\"" + FDOverlib.Config.CaptionColor + "\" size=\"2\"><b>" + FDOverlib.Title + "</b></font></span></td></tr></table><table style=\"width:100%;" + (FDOverlib.Config.ForeColor ? "background-color:" + FDOverlib.Config.ForeColor : "") + "\" border=0 cellpadding=2 cellspacing=0><tr><td><span id=\"PST\"><font face=\"Arial,Helvetica\" color=\"" + FDOverlib.Config.TextColor + "\" size=\"2\">" + FDOverlib.Text + "</font><span></td></tr></table></td></tr></table>"
	FDOverlib.Utils.layerWrite(cTxt);
	FDOverlib.Prepare();
}

// Tooltip popup
function dtt() {
	if (FDOverlib.Config.CSS.Use)
		cTxt = "<table class=\"" + FDOverlib.Config.CSS.Table + "\" cellpadding=0 cellspacing=0><tr><td>" + (FDOverlib.Title.length > 0 ? "<table style=\"width:100%\" border=0 cellpadding=0 cellspacing=1><tr><td class=\"" + FDOverlib.Config.CSS.Caption + "\">" + FDOverlib.Title + "</td></tr></table>" : "") + "<table width=100% border=0 cellpadding=0 cellspacing=1><tr><td class=\"" + FDOverlib.Config.CSS.Text + "\">" + FDOverlib.Text + "</td></tr></table></td></tr></table>"
	else
		cTxt = "<table border=0 cellpadding=" + FDOverlib.Config.Border + " cellspacing=0 style=\"background-color:" + FDOverlib.Config.BackColor + "\"><tr><td><table style=\"width:100%\" border=0 cellpadding=0 cellspacing=0><tr><td><span id=\"PTT\"><b><font face=\"Arial,Helvetica\" color=\"" + FDOverlib.Config.CaptionColor + "\" size=\"2\">" + FDOverlib.Title + "</font></b></span></td></tr></table><table style=\"width:100%;" + (FDOverlib.Config.ForeColor ? "background-color:" + FDOverlib.Config.ForeColor : "") + "\" border=0 cellpadding=2 cellspacing=0><tr><td><span id=\"PST\"><font face=\"Arial,Helvetica\" color=\"" + FDOverlib.Config.TextColor + "\" size=\"2\">" + FDOverlib.Text + "</font><span></td></tr></table></td></tr></table>"
	FDOverlib.Utils.layerWrite(cTxt);
	FDOverlib.Prepare();
}

// Sticky
function stc() {
	FDOverlib.Show = true;
	FDOverlib.Count = 0;
	cTxt = "<table style=\"" + (FDOverlib.Config.TableWidth ? "width:" + FDOverlib.Config.TableWidth + "px;" : "") + (FDOverlib.Config.BackColor ? "background-color:" + FDOverlib.Config.BackColor + ";" : "") + "\" border=0 cellpadding=" + FDOverlib.Config.Border + " cellspacing=0><tr><td><table style=\"width:100%\" border=0 cellpadding=0 cellspacing=0><tr><td><span id=\"PTT\"><b><font color=\"" + FDOverlib.Config.CaptionColor + "\" color=\"" + FDOverlib.Config.CaptionColor + "\" size=\"2\">" + FDOverlib.Title + "</font></b></span></td><td align=RIGHT><a href=\"/\" onmouseover=\"FDOverlib.Events.Click();\" id=\"PCL\"><font color=\"" + FDOverlib.Config.CloseColor + "\">Close</font></a></td></tr></table><table style=\"width:100%;" + (FDOverlib.Config.ForeColor ? "background-color:" + FDOverlib.Config.ForeColor : "") + "\" border=0 cellpadding=2 cellspacing=0><tr><td><span id=\"PST\"><font color=\"" + FDOverlib.Config.TextColor + "\">" + FDOverlib.Text + "</font><span></td></tr></table></td></tr></table>"
	FDOverlib.Utils.layerWrite(cTxt);
	FDOverlib.Prepare();
	FDOverlib.Move = false;
}

function olform() {
	cTxt = '<div class="' + FDOverlib.Config.CSS.Text + '">' + FDOverlib.Text + '</div>';
	FDOverlib.Utils.layerWrite(cTxt);
	FDOverlib.Prepare();
}
// Tooltip popup
function olwysiwyg() {
	cTxt = "<table class=\"fdoltable\" cellpadding=0 cellspacing=0><tr><td>" + (FDOverlib.Title.length > 0 ? "<table style=\"width:100%\" border=0 cellpadding=0 cellspacing=1><tr><td class=\"fdolcap\">" + FDOverlib.Title + "</td></tr></table>" : "") + "<table width=100% border=0 cellpadding=0 cellspacing=1><tr><td class=\"fdoltext\">" + FDOverlib.Text + "</td></tr></table></td></tr></table>"
	FDOverlib.Utils.layerWrite(cTxt);
	FDOverlib.Prepare();
}

var __FD_OVERLIB = true;
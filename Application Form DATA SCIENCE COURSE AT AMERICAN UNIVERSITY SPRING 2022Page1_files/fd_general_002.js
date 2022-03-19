if (typeof jQuery != 'undefined') {

	(function ($) {

		$.fn.absoluteParent = function () {
			var node = this.get(0), parent = null;
			if (node) {
				node = $(node);
				while ((parent = node.offsetParent()) && parent.length > 0 && parent.css('position') != 'absolute') {
					if (parent.prop('tagName') && parent.prop('tagName').toLowerCase() == 'html') return null;
					node = parent;
				}
			}
			if (parent.length > 0) {
				//String.log(['absoluteParent, found!', parent]);
				return parent;
			}
			return null;
		};

		$.fn.show = _newFunction($.fn.show, 'Show', 'show');
		$.fn.fadeIn = _newFunction($.fn.fadeIn, 'Show', 'fadeIn');

		$.fn.hide = _newFunction($.fn.hide, 'Hide', 'hide');
		$.fn.fadeOut = _newFunction($.fn.fadeOut, 'Hide', 'fadeOut');

		$.fn.toggle = _newToggle($.fn.toggle);

		function _aria(obj, name) {
			if (obj.attr('role') != 'tooltip') {
				if (name.list('show', 'fadeIn')) obj.attr('aria-hidden', false);
				else if (name.list('hide', 'fadeOut')) obj.attr('aria-hidden', true);
				else if (name == 'toggle') obj.attr('aria-hidden', obj.css('display') == 'none')
			}
		}

		function _newToggle(oldFunc) {
			var tmrTrigger = 0, tmrResize = 0;
			return function () {

				var args = $A(arguments);
				window.clearTimeout(tmrResize);

				var isResizing = (typeof __isResizing != 'undefined' && __isResizing), changed = isResizing /* initial value depends on if we are currently resizing */,
					hasToggleArg = (args.length > 0 && Boolean.is(args[0])), toggleArg = (hasToggleArg ? args[0] : false), trigger = false, retval = this;

				if (!isResizing) {
					$(this).each(function () {
						var obj = $(this), current = obj.css('display'), toggle = (hasToggleArg ? toggleArg : current == 'none');

						changed = changed || ((toggle && current == 'none') || (!toggle && current != 'none'));
						trigger = ((toggle && current == 'none') || (!toggle && current != 'none')) && obj.css('position') != 'absolute' && (!obj.parent() || obj.parent().is(':visible')) && !obj.absoluteParent()
						if (trigger) {
							return false; // exit loop
						}
					})

					if (trigger) {
						$(window).triggerHandler('beforeToggle');
					}
				}

				if (changed) {
					retval = $(this).each(function () {
						var obj = $(this);
						oldFunc.apply(obj, args);
						_aria(obj, 'toggle');
					});
				}

				if (trigger && !isResizing) {
					tmrResize = window.setTimeout(function () { $(window).triggerHandler('resize'); }, 200);
				}

				return retval;
			}
		};

		function _newFunction(oldFunc, trigger, name) {
			return function () { /*options or [duration][, easing][, callback]*/
				var argsArray = Array.prototype.slice.call(arguments),
					options = null,
					callback,
					lc_trigger = trigger.toLowerCase();

				//String.log('newFunc name=' + name);

				// jQuery recursively calls show sometimes; we shouldn't
				//  handle such situations. Pass it to original show method.
				if ((typeof __isResizing != 'undefined' && __isResizing && !$(this).is('body'))) {
					return $(this).each(function () {
						var obj = $(this);
						//String.log('after' + trigger + ' RECURSIVE, trigger=' + trigger + ', id=' + obj[0].tagName + ', name=' + name + ', selector=' + this.selector, 'info');
						oldFunc.apply(obj, argsArray);
						_aria(obj, name);
					});
					//return this;
				}

				if (argsArray.length == 1 && Object.is(argsArray[0])) {
					options = argsArray[0];
					callback = options.complete || null;
				} else if (argsArray.length === 2) {
					options = { duration: argsArray[0] };
					if ($.isFunction(argsArray[1])) {
						callback = argsArray[1];
					} else {
						options['easing'] = argsArray[1];
					}
				} else if (argsArray.length === 3) {
					options = { duration: argsArray[0] };
					options['easing'] = argsArray[1];
					callback = argsArray[2];
				}

				var _tmr = 0, _func = function () {

					window.clearTimeout(_tmr);

					var obj = $(this),
						oldCallback = callback,
						newCallback = function () {
							
							window.clearTimeout(_tmr);

							if ($.isFunction(oldCallback)) {
								oldCallback.apply(obj);
							}
							_aria(obj, name);

							obj.triggerHandler('after' + trigger);

							//String.log(['after' + trigger + ', trigger=' + trigger + ', id=' + obj[0].tagName + ', name=' + name + ', count=' + obj.find('.trigger-after-' + lc_trigger).length, obj], 'info');
							obj.find('.trigger-after-' + lc_trigger).each(function () {
								$(this).triggerHandler('after' + trigger);
							});

							// set a time which can be cleared on subsequent calls (collection iteration)
							//_tmr = window.setTimeout(function () { $(window).triggerHandler('resize'); }, 200);

						};

					if (options) {
						options.complete = newCallback;
					}

					obj.triggerHandler('before' + trigger);
					obj.find('.trigger-before-' + lc_trigger).each(function () {
						$(this).triggerHandler('before' + trigger);
					});

					if (options) {
						oldFunc.call(obj, options);
					} else {
						oldFunc.call(obj);
						newCallback();
					}
				};
				if (!this.selector) { // it's not a collection but a dom element itself
					_func.call(this);
					return this;
				} else {
					return $(this).each(_func); // itterate the collection of elements
				}
			};
		}

		$.fn.val = (function (prev) {
			return function (val) {
				//String.log('.val, value=' + val);
				if (typeof val != 'undefined') {

					if (val === null) return this;

					var retval = prev.call(this, val);
					$(this).each(function () { $(this).triggerHandler('afterValueSet'); });

					return retval;
				}
				return prev.call(this);

			}

		})($.fn.val);

		/*$.fn.reset = (function (pref) {
			return function () {

				String.log('.reset', 'group');

				prev.call(this);

				var els = [];
				if (this.tagName.toLowerCase() == 'select') {
					els.push(this);
				} else {
					els = $(this).find('select');
				}
				String.log(els);

				$(els).each(function () {
					var self = $(this), placeholder = self.find('.placeholder');
					if (placeholder.length > 0) placeholder.prop('selected', true);
				});

				String.log('', 'groupEnd');

			}

		})($.fn.reset);*/

		$.fn.int = function () {
			var val = 0;
			this.each(function () {
				val += Number.create($(this).val());
			})
			return Number.int(val);
		}

		$.fn.float = function () {
			var val = 0;
			this.each(function () {
				val += Number.create($(this).val());
			})
			return val;
		}

		$.fn.values = function () {
			var values = [];
			this.each(function () {
				if (this.tagName.toLowerCase() == 'input' && this.type && /checkbox|radio/.test(this.type)) {
					if (this.checked) {
						values.push(this.value || 'on');
					}
				} else if (this.value) {
					values.push(this.value);
				}
			})

			return (values.length > 0 ? values.join(', ') : '');
		}

		$.fn.checked = function (val) {

			if (typeof val == 'undefined') {

				if (this.length == 0) return false;
				return this[0].checked;

			} else {

				if (val === null) return this;

				var multiple = (String.is(val) && val.search(',') > -1);

				this.each(function () {

					if (Boolean.is(val)) {
						this.checked = val;
					} else if (String.is(val)) {
						this.checked = ((!multiple && val == this.value) || (multiple && (', ' + val + ',').search(', ' + this.value + ',') > -1));;
					} else if (Number.is(val)) {
						this.checked = val == Number.int(this.value);
					}

				});

				return this;

			}

		}

	})(jQuery);

	$.fn.attention = function () {
		this.each(function () {
			var $this = $(this), __a = function (i, f) { $this.animate({ boxShadow: "rgb(136,136,136) 0 0 " + i + "px" }, f); };
			setTimeout(function () {
				__a(6, __a.bind(this, 2, __a.bind(this, 12, __a.bind(this, 0))));
			}, 800);
		});
	};

	// inserted into this script file. see below; FD.Resource.loadFile('jquery.scrollintoview.js');
	//FD.Resource.loadFile('jquery.animate-shadow.min.js');
	if (FD.Browser.mobile) {
		//FD.Resource.load('jquery-migrate-3.0.0.js');
		//FD.Resource.load('jquery.mobile.min.js');
	}

	// Formdesk jQuery extensions/plugins
	(function ($) {
		if (!$.formdesk) $.formdesk = {};
		$.formdesk._proxy = {
			stopClick: function (e) {
				String.log("stopClick", 'info');
				stopEvent(e);
				cancelEvent(e);
				if (this.type == 'radio') {
					this.checked = false;
					$(this).data('origValue').prop('checked', true);
				}
				return false;
			},
			stopChange: function (e) {
				String.log('stopChange', 'info');
				if (this.tagName.toLowerCase() == 'select') {
					this.value = $(this).data('origValue');
				} else if (this.type && this.type == 'radio') {
					this.checked = false;
					$(this).data('origValue').prop('checked', true);
				} else if (this.type && this.type == 'checkbox') {
					this.checked = $(this).data('origValue');
				}
			}
		}

		$.fn.setReadonly = function (toggle, options) {
			var length = this.length;
			options = options || { className: 'element-readonly' };
			this.each(function (index) {
				var _self = $(this);

				if (Number.int(_self.attr('fd:type')) == 17 && (!options || !options.force)) {
					FD.Upload.setEnabled(this.id, !toggle, Object.extend(options || {}, { no_events: true }));
					return;
				}
				if ((typeof this.readOnly != 'undefined' && this.readOnly == toggle) || !/input|select|textarea/i.test(this.tagName) || (!toggle && this.lockReadonly)) return;

				if (this.type && /^(radio|checkbox)$/.test(this.type)) {
					_self.data('origValue', (this.type == 'radio' ? $('[name="' + this.name + '"]:checked') : this.checked));
					if (toggle) {
						var hasOnClick = typeof this.onclick != 'undefined' && this.onclick != null;
						//if (this.onclick || FD.Browser.ie) {
							if (!this.orgClick) this.orgClick = this.onclick;
							this.onclick = $.formdesk._proxy.stopClick;
						//}
						if (!hasOnClick) {
							if (!this.orgChange) this.orgChange = this.onchange;
							this.onchange = $.formdesk._proxy.stopChange;
						}
					} else {
						if (this.onclick) {
							this.onclick = this.orgClick || null;
							this.orgClick = null;
						}
						//else {
							this.onchange = this.orgChange || null;
							this.orgChange = null;
						//}
					}
					if (index == length - 1 && this.checked) {
						$('input[name=alt' + this.name + ']').setReadonly(toggle);
					}
				} else if (this.tagName.toLowerCase() == 'select') {
					_self.data('origValue', this.value);
					if (toggle) {
						this.origChange = this.onchange;
						this.onchange = $.formdesk._proxy.stopChange;
					} else {
						if (typeof this.origChange != 'undefined') {
							this.onchange = (typeof this.origChange != 'undefined' ? this.origChange : null);
							this.origChange = null;
						}
					}
					if (FD.isFrontend())
						setReadonlyStyle(_self[0], toggle, options.bgcolor || null);
				} else if (FD.isFrontend()) {
					setReadonlyStyle(_self[0], toggle, options.bgcolor || null);
				}
				this.readOnly = toggle;

				if (_self.hasClass('slider')) {
					var slider = _self.prev();
					if (slider.prop('type') == 'range') {
						slider.prop('disabled', toggle);
					}
					_self.keyup();
				}

				if (this.type && this.type == 'file') {
					$('#file_btn_' + this.id).toggle(!toggle);
				}

				if (options && typeof options.lock != 'undefined') this.lockReadonly = options.lock;

				_self
					.toggleClass('is-readonly', toggle)
					.parent('.item-container')
						.toggleClass('is-readonly', toggle);

				/*if (options.className) {
				_self.toggleClass(options.className, toggle);
				}*/
			});
			return this;
		};
		$.fn.setDisabled = function (toggle, options) {
			var length = this.length, map = [], map_items = {}, changed = [];
			toggle = toggle || false;
			options = options || { className: 'element-disabled' };
			this.each(function (index) {

				var _self = $(this), is_button = _self.hasClass('button-icon') || _self.hasClass('button') || _self.hasClass('window-button') || _self.hasClass('oidc-button') || _self.hasClass('Button');

				if ((typeof this.disabled != 'undefined' && this.disabled == toggle) || (!is_button && !/input|select|textarea|a|button/i.test(this.tagName))) {
					return;
				}
				if (this.tagName.toLowerCase() == 'a' || (this.type && /^(radio|checkbox)$/.test(this.type))) {
					if (this.tagName.toLowerCase() == 'a') {
						if (toggle) {
							if (!this.orgClick) this.orgClick = this.onclick;
							this.onclick = $.formdesk._proxy.stopClick;
						} else if (!this.readOnly && this.onclick == $.formdesk._proxy.stopClick) {
							this.onclick = this.orgClick || null;
							this.orgClick = null;
						}
					} else if (this.checked && this.name && !changed.seek(this.name)) {
						// this item was checked, so consider it's state changed and execute the event function (only one mapping per group of check-/radiogroups)
						changed.push(this.name);
					}
					if (index == length - 1 && this.checked) {
						$('#alt' + this.id).setDisabled(toggle);
					}
				} else if (this.name && typeof this.value != 'undefined' && !this.value.empty() && !changed.seek(this.name)) {
					// this item has a value, so consider it's state changed and execute the event function
					// when an item is disabled, the lookup and other functions consider the value like empty, also when its not
					changed.push(this.name);
				}

				map.push(this.name || this.id);
				if (typeof map_items[this.name] == 'undefined') {
					map_items[this.name] = this;
				}
				if (toggle && Number.int(_self.attr('fd:type')) == 17) {
					_self.setReadonly(false, { force: true });
				}

				this.disabled = toggle;
				$(this).attr('aria-disabled', toggle);
				if (is_button) {
					_self.toggleClass('button-disabled', toggle);
					if (_self.hasClass('is-over')) BTN.MouseOut(_self[0]);
				} else if (!this.type || !/^(radio|checkbox|button)$/.test(this.type)) {
					if (!this.disabled && options.resetStyle) {
						_self.css({ border: '', backgroundColor: '' });
					} else {
						setDisabledStyle(_self[0], toggle, '#E1E1E1');
					}
				}
				if (!is_button)
					_self.toggleClass('is-disabled', toggle);

				if (Number.int(_self.attr('fd:type')) == 17 /* this.type && this.type == 'file'*/) {
					if (!toggle) _self.setReadonly(true, { force: true });
					FD.Upload.set(this.id, (toggle ? FDUpload.SET_INPUT : FDUpload.SET_DETERMINE), Object.extend(options || {}, { no_events: true }));
				}

			});
			//String.log(['$.setDisabled', map]);

			if (!options.ignoreEvents && typeof aEvents != 'undefined' && map.length > 0) {
				var events = FD.Form.Events, lookups = FD.Form.Features.get('lookups');
				//String.log(['$.setDisabled, toggle=' + toggle, map.distinct(), changed, lookups]);
				if (changed.length > 0) {
					var e;
					for (var i = 0; i < map.length; i++) {
						e = $.Event('set_disabled', { target: map_items[map[i]] });
						events.exec(map[i], e, map_items[map[i]], map[i] + '.setDisabled', false, true, (options && options.thread ? options.thread : ''));
					}
				}

				if (!toggle && lookups) {
					lookups.processDeferred(map.distinct(), 'setDisabled');
				}
			}
			return this;
		};
		$.fn.isDisabled = function () {
			var length = this.length, enabled = true;
			this.each(function (index) {
				if (/input|select|textarea|a/i.test(this.tagName)) {
					enabled = enabled && (typeof this.disabled == 'undefined' || !this.disabled);
				}
			});
			return !enabled;
		};
		$.fn.isReadonly = function () {
			var length = this.length, not_readonly = true;
			this.each(function (index) {
				if (/input|select|textarea|a/i.test(this.tagName)) {
					not_readonly = not_readonly && (typeof this.readOnly == 'undefined' || !this.readOnly);
				}
			});
			return !not_readonly;
		};
		$.fn.isApplicable = function (options) {
			var length = this.length, applicable = true;
			this.each(function (index) {
				if (/input|select|textarea|a/i.test(this.tagName)) {
					applicable = applicable && (typeof this.disabled == 'undefined' || !this.disabled) && (typeof this.readOnly == 'undefined' || (!this.readOnly || (options && options.selectOnly)));
				}
			});
			return applicable;
		}
		$.fn.disable = function (options) {
			return this.setDisabled(true, options);
		};
		$.fn.enable = function (options) {
			return this.setDisabled(false, options);
		};
		$.fn.setVisible = function (toggle) {
			this.each(function () { $(this).css('visibility', (toggle ? 'visible' : 'hidden')); });
			return this;
		};
		$.fn.isDisplayed = function () {
			var node = this.get(0);
			return (node && $(node).css('display') != 'none');
		}

		function getToggleValue(el, value) {

			var multiple = (String.is(value) && value.search(',') > -1), hasValue = typeof el.value != 'undefined' && el.value != 'on' /* consider the default 'on' as not defined */,
				toggle =
					(Boolean.is(value) && ((hasValue && value == Boolean.create(el.value)) || (!hasValue && value))) ||
					(String.is(value) && ((!multiple && value == el.value) || (multiple && (', ' + value + ',').search(', ' + el.value + ',') > -1))) ||
					(Number.is(value) && value == Number.int(el.value));
			
			return toggle;

		}

		$.fn.placeholder = function (value, options) {

			var def = null, returnDef = arguments.length == 0;

			//String.log('$.fn.default, value=' + value + ', length=' + this.length, 'group');

			this.each(function () {

				var self = $(this), tagname = this.tagName.toLowerCase(), setval = true;

				//String.log('tagName=' + tagname + ', name=' + (this.name || ''));

				if (returnDef) {
					def = self.data('defaultValue') || null;
					return false;
				}

				self
					.data('defaultValue', value + '')
					.addClass('has-default');


				if (tagname == 'select') {

					if (options && options.reset) {

						setval = self.find('.placeholder').val() == self.val();

						self
							.find('.placeholder').removeClass('placeholder').end()
							.removeClass('placeholder')
							.off('afterValueSet.default')
					}

					if (value == null) {
						return;
					}

					var color = self.css('color'), def_option = self.find('option[value="' + value + '"]');
					var f = function () {
						var self = $(this);
						if (self.find(':selected').hasClass('placeholder')) {
							self.addClass('placeholder');
						} else {
							self.removeClass('placeholder');
						}
					}

					//String.log('def_option=' + def_option.length);

					self
						.find('.placeholder').removeClass('placeholder').end()
						.find('option[value="' + value + '"]').addClass('placeholder').end()
						/*.find('option:not(.placeholder)').css('color', color).end()*/
						/*.on('change', f)*/
						.off('afterValueSet.default') // prevent multiple triggers
						.on('afterValueSet.default', f);
					
					if (setval) {
						self.val(value + '');
					}

					//f.call(this);

				} else if (tagname == 'input' && this.type && /checkbox|radio/.test(this.type)) {

					if (options && options.reset) {

						setval = (self.hasClass('placeholder') && self.prop('checked')) || $('input[name=' + self.prop('name') + ']:checked').length == 0;

						self.removeClass('placeholder');
						$('label[for="' + this.id + '"]').removeClass('placeholder');
					}

					if (value == null) {
						return;
					}

					var toggle = getToggleValue(this, value);
					//alert(value + ', ' + this.id + ', toggle=' + toggle + ', value=' + this.value + ', ' + typeof(value));

					self.toggleClass('placeholder', toggle);

					if (setval) {
						self.prop('checked', toggle);
					}

					$('label[for="' + this.id + '"]').toggleClass('placeholder', toggle);

				} else {

					self.prop('placeholder', (value + '') || '').triggerHandler('afterPlaceholderSet');

				}
			});

			//String.log('OK!');
			//String.log('', 'groupEnd');

			if (returnDef) {
				return def;
			} else {
				return this;
			}

		}

		$.fn.link = function (options) {

			options = $.extend({ mode: 'readonly' }, options);

			this.each(function () {

				var self = $(this), container = $('<div class="item-container item-link"></div>');
				if (options.mode == 'readonly') {
					container.addClass('item-link-readonly');
				}
				self.wrap(container);
				self.after(
					$('<i class="fa fa-external-link right-icon" style="cursor:pointer"></i>')
						.on('click',
							function () {
								var val = self.val();
								if (self.hasClass('type-email')) {
									//document.location = 'mailto:' + val;
									var wnd = window.open('mailto:' + val, '_new', 'toolbar=no,directories=no,status=no,width=200,height=200');
									setTimeout(function () { try { wnd.close(); } catch (e) { } }, 400);
								} else if (val.left(4) != 'http') {
									window.open('http://' + val);
								}
							})
				);

			});

		}

		if (!FD.Browser.ie || FD.Browser.greater('ie', 7)) {
			$.fn['default'] = $.fn.placeholder;
		}

		// $(el).is(":default()") or $("input:default()") or $("input:default(equals)") or $(":default(has)") 
		// You must use the parens, else :default does not result in a call to this extension method
		$.extend($.expr[":"], {
			'default': function (el, idx, meta) { // meta = [full, selector, from : to (, between ()]

				var type = meta[3] || 'equals', def = $(el).data('defaultValue') || null;
				
				if (type == 'has') {
					return def != null;
				} else if (def == null) {
					return false;
				}

				if (el.type && /checkbox|radio/.test(el.type)) {

					var toggle = getToggleValue(el, def);
					return el.checked && toggle;

				} else {

					return (String.is(def) && el.value == def + '');

				}

			}
		});

		$.fn.valordef = function () {

			var val = this.val();
			if (!val) {
				val = this['default']();
			}
			//String.log('.valordef, val=' + val);
			return val || '';

		}

		$.fn.reset = function (options) {

			this.each(function () {

				var self = $(this), tagname = this.tagName.toLowerCase(), def = self.data('defaultValue');

				if (def == null) return;

				if (this.type && /radio|checkbox/.test(this.type)) {
					self.checked(def)
				} else {
					self.val(((options && options.resetToValue) || tagname == 'select' ? def : ''));
				}

				//String.log('.reset, tagname=' + tagname + ', def=' + def + ', value=' + self.val() + ', value set=' + ((options && options.resetToValue) || tagname == 'select' ? def : ''));

				if (!options || !options.ignoreChange) {
					self.change();
				}

			});
			
		}

		$(document).ready(function () {
			$('select').on('change', function () {
				var self = $(this);
				if (self.find(':selected').hasClass('placeholder')) {
					var color = self.css('color');
					self.addClass('placeholder');
					//self.find('option:not(.placeholder)').css('color', color);
					self.data('placeholder-feature', 1);
				} else {
					self.removeClass('placeholder');
				}
			})
		})

		$.fn.format = function () {
			var l = arguments.length, value = (l > 1 || !Boolean.is(arguments[0]) ? arguments[0] : null), reverse = (l == 1 && Boolean.is(arguments[0]) ? arguments[0] : (l > 1 ? arguments[1] : false));
			this.each(function () {
				//String.log('$.format, value=' + value + ', reverse=' + reverse + ', formated=' + FD.Input.Format(this, value, reverse));
				this.value = FD.Input.Format(this, value, reverse);
			});
		};
		$.fn.formatted = function () {
			if (this.size() == 0) return 0;
			return FD.Input.Format(this[0], null, false);
		};
		$.fn.reversed = function () {
			if (this.size() == 0) return 0;
			return FD.Input.Format(this[0], null, true);
		};

		$.fn.setDate = function (date, format, options) {
			if (!date) date = new Date();
			this.each(function () {

				var $self = $(this), own_format = $self.data('format'), real_date = date;

				String.log('setDate', 'group');
				//String.log(['setDate', date, format, options]);

				if (($self.prop('disabled') || ($self.prop('readOnly') && !Boolean.create($self.attr('selectOnly')))) && (!options || !options.force)) {
					return;
				}

				if (!own_format) {
					own_format = new FDDateFormat($self.attr('fd:format'));
					$self.data('format', own_format);
				}
				format = format || own_format;

				if (String.is(real_date)) {


					// parse the string to a FDDate object
					real_date = FDDate.parse(real_date, { format: format, includeTime: format.hasTime() });
					if (real_date.error) { // error parsing the string
						real_date = null;
					} else {
						real_date = real_date.getDate(); // get the date object from the FDDate object
					}
				}

				// format the date accoording to the format attribute
				$self.val((real_date ? format.formatDate(real_date) : ''));

				if (!options || !options.ignoreEvents) {
					$self.blur().change().keyup();
				}

				String.log('', 'groupEnd');

			});
			return this;
		};
		$.fn.getDate = function (format) {
			var node = this[0] || null;
			if (node) {
				var $self = $(this), own_format = $self.getFormat();
				format = format || own_format;

				if ($self.val() != '') {
					var date = FDDate.parse($self.val(), { format: format, includeTime: format.hasTime() });
					if (!date.error) {
						return date.getDate();
					}
				}
			}
			return null;
		};

		$.fn.setTime = function (time, format, options) {
			if (!time) time = new Date();
			this.each(function () {

				var $self = $(this), own_format = $self.data('format'), real_time = time;

				if ($self.prop('disabled') && (!options || !options.force)) {
					return;
				}

				if (!own_format) {
					own_format = new FDTimeFormat($self.attr('fd:format'));
					$self.data('format', own_format);
				}
				format = format || own_format;

				// parse the string to a FDTime object
				time = FDTime.parse(time, { format: format });
				if (time.error) { // error parsing the string
					time = '';
				} else {
					time = time.toString(); // get the date object from the FDDate object
				}

				// format the date accoording to the format attribute
				$self.val(time);
				
				if (!options || !options.ignoreEvents) {
					$self.blur().change().keyup();
				}

			});
			return this;
		};

		$.fn.getFormat = function () {
			var node = this[0] || null;
			if (node) {
				var $self = $(this), format = $self.data('format');
				if (!format) {
					
					format = $self.attr('fd:format');
					
					// TODO: add other formats
					if (/date|datetime/.test(format)) {
						format = new FDDateFormat(format);
					} else if (/time/.test(format)) {
						format = new FDTimeFormat(format);
					} else {
						format = null;
					}
					$self.data('format', format);
				}
				return format;
			}
		}
		$.fn.showCalendar = function (e) {
			var node = this[0] || null;
			if (node) {
				var $self = $(this), calendar = $self.data('calendar');
				if (typeof FD.Validate != 'undefined' && FD.Validate.isAlerting()) return this;
				if (!$self.isApplicable({ selectOnly: Boolean.create($self.attr('selectOnly')) })) return this;

				if (!calendar) {
					calendar = new FDCalendarDialog();
					$self.data('calendar', calendar);
				}
				calendar.show($self, $self.getFormat(), e);
			}
			return this;
		}
		
		$.fn.uncheckableRadio = function () {
			var $root = this,
				f = function (e) {
					var $this = $(this);
					if ($this.data('checked')) {
						$this.prop('checked', false);
						$this.data('checked', false);
						$this.trigger('change');
					} else {
						$this.data('checked', true);
						$this.closest('form').find('[name="' + $this.prop('name') + '"]').not($this).data('checked', false);
					}
				};
			$root.off('.uncheckable').each(function () {
				var $radio = $(this);
				if ($radio.prop('checked')) {
					$radio.data('checked', true);
				} else {
					$radio.data('checked', false);
				}
				$radio.on('click.uncheckable', f).on('keyup.uncheckable', function (e) {
					if (e.which == 32 && $(this).checked()) f.delay(this, 10, e);
				});
			});
			return $root;
		}

		$.fn.page = function (goto) {
			var front = FD.isFrontend(), cn = (front ? '.PageContainer' : '.content-page'), _page = 0, type;
			this.each(function () {
				var _self = $(this), container = _self.parents(cn), page, current = false;
				if (container.size() > 0) {
					current = container.hasClass('current-page') || container.hasClass('current-panel');

					page = /\w+([\d]+)$/.exec(container[0].id);
					if (page) page = Number.create(page[1]);
					else page = 0;
					
					type = /(\w+)[\d]+$/.exec(container[0].id);
					if (type) type = type[1].toLowerCase();
					else type = 'page';
				} else {
					page = 0;
				}
				//String.log('$.page, page=' + page + ', type=' + type + ', front=' + front + ', current=' + current + ', classes=' + container[0].className);
				if (page > 0 && goto && !current) {
					if (front) FD.Pages.GoTo(page, true);
					else {
						if (type == 'page') FD.Backend.Pages.GoTo(page);
						else if (type = 'panel') FDPanels.GoTo(page, true);
					}
				}
				_page = page;
			});
			//String.log('$.page, return=' + _page);
			return _page;
		};

		$.fn.svg = function (options) {

			var deferred = new $.Deferred();

			if (this.length == 0) return deferred.promise();

			options = options || {};
			options.selector = this;

			(function () {

				FDSvg.process(options);
				(function () { deferred.resolve(); }).delay(100);

			}).delay(0);

			return deferred.promise();
		};

		$.fn.loadImages = function () {

			var loaded_images = 0, length = this.length, deferred = new $.Deferred();

			this.each(function () {

				var image = new Image();

				var src = $(this).attr("src");
				var backgroundImage = $(this).css("backgroundImage");

				// Search for css background style
				if (src == undefined && backgroundImage != "none") {
					var pattern = /url\("{0,1}([^"]*)"{0,1}\)/;                
					src = pattern.exec(backgroundImage)[1];                
				} else {
					length--;
				}

				// Load images
				$(image)
					.load(function () {
						loaded_images++;                
						if (loaded_images == length) {
							deferred.resolve();
						}
					})
					.error(function () {
						loaded_images++;
						if (loaded_images == length) {
							deferred.resolve();
						}
					})
					.attr("src", src);

			});

			return deferred.promise();
		}

		$.fn.blink = function (options, deferred) {

			options = $.extend({ limit: 4, set_focus: false, focus_element: null }, options);

			var delayed = typeof deferred != 'undefined';
			if (!delayed) {
				deferred = new $.Deferred();
			}

			//String.log(['blink', this, options]);

//			if (!options) options = { limit: 5, set_focus: false };
			if (typeof options._count == 'undefined') {
				$.extend(options, { id: String.uniqueID(), _count: 0, _hide: false, _tmr: 0, _stop: false, _attached: false });

				this.page(true);
			}

			if (options.delay) {
				this.blink.delay(this, (Number.is(options.delay) ? options.delay : 500), options, deferred);
				options.delay = false;
				return deferred.promise();
			}

			var hide = (options._hide = !options._hide);
			if (options._stop) hide = false;
			if (hide) {
				options._count++;
			}

			//String.log(['$.blink, hide=' + hide + ', count=' + options._count + ', limit=' + options.limit, options]);
			this.each(function () {
				var _self = $(this);

				_self.data('blink-options', options);

				if (options._stop) {
					_self.off('.blink');
				} else if (!options._attached) {
					_self.on('mousemove.blink click.blink change.blink', function () {
						var options = $(this).data('blink-options');
						options._stop = true;
						//String.log(['HELLO INPUT!!!!', options]);
					});
				}

				if (Number.create(_self.attr('fd:type')) == 17 /* file */) _self = _self.parents('.upload-container');
				_self.css('visibility', (hide ? 'hidden' : ''));

				if (this.id && this.type && /checkbox|radio/.test(this.type)) {
					var lbls = $('label[for="' + this.id + '"]');

					lbls.data('blink-options', options);

					if (options._stop) {
						lbls.off('.blink');
					} else if (!options._attached) {
						lbls.on('mousemove.blink click.blink', function () {
							var options = $(this).data('blink-options');
							options._stop = true;
							//String.log(['HELLO LABEL!!!!', options]);
						});
					}

					lbls.css('visibility', (hide ? 'hidden' : ''));
				}

			});

			options._attached = true;
			var resolve = true;

			if ((hide || options.limit == -1 || options._count < options.limit) && !options._stop) {
				resolve = false;
				options._tmr = this.blink.delay(this, 300, options, deferred);
			}
			if ((!hide && options._count == options.limit) || options._stop) {
				if (options.set_focus || !options.focus_element) {
					if (options.focus_element) {
						$(options.focus_element).eq(0).focus();
					} else {
						$(this).eq(0).focus();
					}
				}
				if (options.fireEvent) {
					options.fireEvent('onReady');
				}
			}

			if (resolve) {
				deferred.resolve.delay(deferred, 0);
			}

			if (!delayed) {
				return deferred.promise();
			}

		};

		$.fn.setHeight = function (height, exclude_outerspace) {
			FD.Element.Dimensions.setHeight($(this), height, exclude_outerspace);
			return $(this);
		};
		$.fn.getHeight = function (include_margin) {
			return FD.Element.Dimensions.getHeight($(this), include_margin);
		};
		$.fn.getContentHeight = function () {
			return FD.Element.Dimensions.getContentHeight($(this));
		};
		$.fn.getHeightOuterSpace = function (include_margin, exclude_padding) {
			return FD.Element.Dimensions.getHeightOuterSpace($(this), include_margin, exclude_padding);
		};


		$.fn.setWidth = function (width, exclude_outerspace) {
			FD.Element.Dimensions.setWidth($(this), width, exclude_outerspace);
			return $(this);
		};
		$.fn.getWidth = function (include_margin) {
			return FD.Element.Dimensions.getWidth($(this), include_margin);
		};
		$.fn.getContentWidth = function () {
			return FD.Element.Dimensions.getContentWidth($(this));
		};
		$.fn.getWidthOuterSpace = function (include_margin, exclude_padding) {
			return FD.Element.Dimensions.getWidthOuterSpace($(this), include_margin, exclude_padding);
		};
		$.fn.getBorders = function () {
			return FD.Element.Dimensions.getBorders($(this));
		}

		$.fn.getMargin = function (side) {
			return FD.Element.Dimensions.getMargin($(this), side);
		};
		$.fn.getPadding = function (side) {
			return FD.Element.Dimensions.getPadding($(this), side);
		};
		$.fn.getChildrensHeight = function (scrollHeight) {
			var height = 0;
			this.each(function () {
				$(this).children().each(
					function () {
						var self = $(this);
						if (self.css('position') != 'absolute') {
							if (self.hasClass('resize-overflow')) height += this.scrollHeight;
							else height += self.getHeight(true);
						}
					}
				);
			});
			return height;
		};

		$.fn.getItem = function () {
			if (typeof this.name != 'undefined' && typeof FD.Form != 'undefined' && typeof FD.Form.Items != 'undefined') {
				return FD.Form.Items.search(this.name);
			}
			return null;
		};

		$.fn.wait = function (toggle, options) {

			options = $.extend({ className: 'item-wait' }, options);

			this.each(function () {

				var self = $(this);

				if (!toggle) {
					var div = self.data('fd-wait');
					if (div) div.remove();
					self.data('fd-wait', null);
//					self.find('.' + options.className).remove();
				} else {
					
					if (!self.css('position') || self.css('position') == 'static') {
						self.css('position', 'relative');
					}

					var div = $('<div class="' + options.className + '" style="display:none" tabindex="-1">'), lbl = '';
					self.data('fd-wait', div);

					if (self.prop('tagName').toLowerCase() == 'input' || options.appendToBody) {
						$('body').after(div);
						div.css('position', 'absolute').offset(self.offset());
					} else {
						div.appendTo(self);
					}
					
					try { lbl = FD.getLabel().path; } catch (e) { lbl = FD.Form.Info.label; }
					div.html('<table cellpadding="0" cellspacing="0" style="height:100%;width:100%"><tr><td valign="middle" align="center" style="vertical-align:middle;text-align:center"><img src="' + lbl + 'images/loading_lookup.gif" border="0"></td></tr></table>');
				
					var offset = self.offset(), borders = div.getBorders();
					
					div.setWidth(Math.max(self.getWidth(), 20));
					div.setHeight(Math.max(self.getHeight(), 18));

					div.show();
					if (self.is(':focus'))
						div.focus();
				}
			});

			return this;

		};

		function isNormalizeBuggy() {
			var testDiv = $('<div style="display:none"></div>'); // document.createElement('div');
			$('body').append(testDiv);
			testDiv.append('0-').append('2');
			testDiv[0].normalize();
			var buggy = testDiv[0].firstChild.length <= 2;
			testDiv.remove();
			return buggy;
		}
		$(document).ready(function () {
			if (isNormalizeBuggy()) {
				Element.prototype.normalize = function () {
					// If the normalize function doesn't have the bug relating to minuses,
					// we use the native normalize function. Otherwise we use our custom one.
					function getNextNode(node, ancestor, isOpenTag) {
						if (typeof isOpenTag === 'undefined') {
							isOpenTag = true;
						}
						var next;
						if (isOpenTag) {
							next = node.firstChild;
						}
						next = next || node.nextSibling;
						if (!next && node.parentNode && node.parentNode !== ancestor) {
							return getNextNode(node.parentNode, ancestor, false);
						}
						return next;
					}
					var adjTextNodes = [], nodes, node = this;
					while ((node = getNextNode(node, this))) {
						if (node.nodeType === 3 && node.previousSibling && node.previousSibling.nodeType === 3) {
							if (!nodes) {
								nodes = [node.previousSibling];
							}
							nodes.push(node);
						} else if (nodes) {
							adjTextNodes.push(nodes);
							nodes = null;
						}
					}
					if (nodes) {
						adjTextNodes.push(nodes);
						nodes = null;
					}

					adjTextNodes.forEach(function (nodes) {
						var first;
						nodes.forEach(function (node, i) {
							if (i > 0) {
								first.nodeValue += node.nodeValue;
								node.parentNode.removeChild(node);
							} else {
								first = node;
							}
						});
					});
				};
			}
		});



		// thirdparty plugins

		/*!
		* jQuery scrollintoview() plugin and :scrollable selector filter
		*
		* Version 1.8 (14 Jul 2011)
		* Requires jQuery 1.4 or newer
		*
		* Copyright (c) 2011 Robert Koritnik
		* Licensed under the terms of the MIT license
		* http://www.opensource.org/licenses/mit-license.php
		*/

		(function ($) {
			var converter = {
				vertical: { x: false, y: true },
				horizontal: { x: true, y: false },
				both: { x: true, y: true },
				x: { x: true, y: false },
				y: { x: false, y: true }
			};

			var settings = {
				duration: "fast",
				direction: "both",
				offset: 0,
				partial: true,
				hidden: false
			};

			var rootrx = /^(?:html)$/i;

			// gets border dimensions
			var borders = function (domElement, styles) {
				styles = styles || (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(domElement, null) : domElement.currentStyle);
				var px = document.defaultView && document.defaultView.getComputedStyle ? true : false;
				var b = {
					top: (parseFloat(px ? styles.borderTopWidth : $.css(domElement, "borderTopWidth")) || 0),
					left: (parseFloat(px ? styles.borderLeftWidth : $.css(domElement, "borderLeftWidth")) || 0),
					bottom: (parseFloat(px ? styles.borderBottomWidth : $.css(domElement, "borderBottomWidth")) || 0),
					right: (parseFloat(px ? styles.borderRightWidth : $.css(domElement, "borderRightWidth")) || 0)
				};
				return {
					top: b.top,
					left: b.left,
					bottom: b.bottom,
					right: b.right,
					vertical: b.top + b.bottom,
					horizontal: b.left + b.right
				};
			};

			var dimensions = function ($element) {
				var win = $(window);
				var isRoot = rootrx.test($element[0].nodeName);
				return {
					border: isRoot ? { top: 0, left: 0, bottom: 0, right: 0} : borders($element[0]),
					width: $element.width(),
					height: $element.height(),
					scroll: {
						top: (isRoot ? win : $element).scrollTop(),
						left: (isRoot ? win : $element).scrollLeft()
					},
					scrollbar: {
						right: isRoot ? 0 : $element.innerWidth() - $element[0].clientWidth,
						bottom: isRoot ? 0 : $element.innerHeight() - $element[0].clientHeight
					},
					rect: (function () {
						var r = $element[0].getBoundingClientRect();
						return {
							top: isRoot ? 0 : r.top,
							left: isRoot ? 0 : r.left,
							bottom: isRoot ? $element[0].clientHeight : r.bottom,
							right: isRoot ? $element[0].clientWidth : r.right
						};
					})()
				};
			};

			$.fn.extend({
				scrollIntoView: function (options) {
					/// <summary>Scrolls the first element in the set into view by scrolling its closest scrollable parent.</summary>
					/// <param name="options" type="Object">Additional options that can configure scrolling:
					///        duration (default: "fast") - jQuery animation speed (can be a duration string or number of milliseconds)
					///        direction (default: "both") - select possible scrollings ("vertical" or "y", "horizontal" or "x", "both")
					///        complete (default: none) - a function to call when scrolling completes (called in context of the DOM element being scrolled)
					/// </param>
					/// <return type="jQuery">Returns the same jQuery set that this function was run on.</return>

					options = $.extend({}, settings, options);
					options.direction = converter[typeof (options.direction) === "string" && options.direction.toLowerCase()] || converter.both;

					var dirStr = "";
					if (options.direction.x === true) dirStr = "horizontal";
					if (options.direction.y === true) dirStr = dirStr ? "both" : "vertical";

					var el = this.eq(0);
					var scroller = el.closest(":scrollable(" + dirStr + ")");

					// check if there's anything to scroll in the first place
					if (scroller.length > 0) {
						scroller = scroller.eq(0);

						var dim = {
							e: dimensions(el),
							s: dimensions(scroller)
						};

						var rel = {
							top: dim.e.rect.top - (dim.s.rect.top + dim.s.border.top),
							bottom: dim.s.rect.bottom - dim.s.border.bottom - dim.s.scrollbar.bottom - dim.e.rect.bottom,
							left: dim.e.rect.left - (dim.s.rect.left + dim.s.border.left),
							right: dim.s.rect.right - dim.s.border.right - dim.s.scrollbar.right - dim.e.rect.right
						};

						var animOptions = {};
						//String.log(['scrollIntoView', dim, rel]);
						// vertical scroll
						if (options.direction.y === true) {
							if (rel.top < 0) {
								animOptions.scrollTop = dim.s.scroll.top + rel.top - options.offset;
							}
							else if (rel.top > 0 && rel.bottom < 0) {
								animOptions.scrollTop = (dim.s.scroll.top - rel.bottom) + options.offset; // dim.s.scroll.top + Math.min(rel.top, ((-rel.bottom) + ((dim.s.rect.bottom - dim.s.scroll.top) - (dim.e.rect.bottom - dim.e.rect.top)))) - options.offset;
								//String.log(['animOptions', animOptions]);
							}
						}

						// horizontal scroll
						if (options.direction.x === true) {
							if (rel.left < 0) {
								animOptions.scrollLeft = dim.s.scroll.left + rel.left;
							}
							else if (rel.left > 0 && rel.right < 0) {
								animOptions.scrollLeft = dim.s.scroll.left + Math.min(rel.left, -rel.right);
							}
						}

						// scroll if needed
						if (!$.isEmptyObject(animOptions)) {
							if (rootrx.test(scroller[0].nodeName)) {
								scroller = $("html,body");
							}
							scroller
								.animate(animOptions, options.duration)
								.eq(0) // we want function to be called just once (ref. "html,body")
								.queue(function (next) {
									$.isFunction(options.complete) && options.complete.call(scroller[0]);
									next();
								});
						}
						else {
							// when there's nothing to scroll, just call the "complete" function
							$.isFunction(options.complete) && options.complete.call(scroller[0]);
						}
					}

					// return set back
					return this;
				},

				isElementInViewport: function (options) {
					/// <summary>
					///		Checks the first element in the set if it is in the viewport of the closest scrollable parent of itself or of a given element (viewport option).
					///		Also partially taken from https://github.com/customd/jquery-visible/blob/master/jquery.visible.js
					/// </summary>
					/// <param name="options" type="Object">Additional options that can configure scrolling:
					///        direction (default: "both") - select possible scrollings ("vertical" or "y", "horizontal" or "x", "both")
					///        partial (default: true) - if the element is partial (true) or completely (false) in the viewport
					///        viewport (default: closest scrollable parent of itself or the window when none found)
					/// </param>
					/// <return type="boolean">Returns true or false.</return>

					options = $.extend({}, settings, options);
					options.direction = converter[typeof (options.direction) === "string" && options.direction.toLowerCase()] || converter.both;

					var dirStr = "";
					if (options.direction.x === true) dirStr = "horizontal";
					if (options.direction.y === true) dirStr = dirStr ? "both" : "vertical";

					var el = this.eq(0),
						viewport = options.viewport || el.closest(":scrollable(both)") || $(window),
						clientSize = options.hidden === true ? el.offsetwidth * el.offsetHeight : true;

					// check if there's anything to scroll in the first place
					if (viewport.length > 0) {
						viewport = viewport.eq(0);

						var dim = {
							e: dimensions(el),
							s: dimensions(viewport)
						}, e_rect = dim.e.rect, s_rect = dim.s.rect;

						//String.log(dim);

						var vp_height = dim.s.rect.bottom - dim.s.rect.top,
							vp_width = dim.s.rect.right - dim.s.rect.left,
							tVisible = e_rect.top >= 0 && e_rect.top >= s_rect.top && e_rect.top < s_rect.bottom,
							bVisible = e_rect.bottom > 0 && e_rect.bottom <= s_rect.bottom && e_rect.bottom > s_rect.top,
							lVisible = e_rect.left >= 0 && e_rect.left >= s_rect.left && e_rect.left < s_rect.right,
							rVisible = e_rect.right > 0 && e_rect.right <= s_rect.right && e_rect.right > s_rect.left,
							vVisible = options.partial ? tVisible || bVisible : tVisible && bVisible,
							hVisible = options.partial ? lVisible || rVisible : lVisible && rVisible;

						//String.log('tVis=' + tVisible + ', bVis=' + bVisible + ', e.bottom=' + e_rect.bottom + ', s.bottom=' + s_rect.bottom + ', vVisible=' + vVisible);

						if (dirStr == "both")
							return clientSize && vVisible && hVisible;
						else if (dirStr == "vertical")
							return clientSize && vVisible;
						else if (dirStr == "horizontal")
							return clientSize && hVisible;

					} else {
						String.log('jQuery.isElementInViewport, no viewport', 'error');
					}

					return true; // return true by default
				}
			});

			var scrollValue = {
				auto: true,
				scroll: true,
				visible: false,
				hidden: false
			};

			$.extend($.expr[":"], {
				scrollable: function (element, index, meta, stack) {
					var direction = converter[typeof (meta[3]) === "string" && meta[3].toLowerCase()] || converter.both;
					var styles = (document.defaultView && document.defaultView.getComputedStyle ? document.defaultView.getComputedStyle(element, null) : element.currentStyle);
					var overflow = {
						x: scrollValue[styles.overflowX.toLowerCase()] || false,
						y: scrollValue[styles.overflowY.toLowerCase()] || false,
						isRoot: rootrx.test(element.nodeName)
					};

					// check if completely unscrollable (exclude HTML element because it's special)
					if (!overflow.x && !overflow.y && !overflow.isRoot) {
						return false;
					}

					var size = {
						height: {
							scroll: element.scrollHeight,
							client: element.clientHeight
						},
						width: {
							scroll: element.scrollWidth,
							client: element.clientWidth
						},
						// check overflow.x/y because iPad (and possibly other tablets) don't dislay scrollbars
						scrollableX: function () {
							return (overflow.x || overflow.isRoot) && this.width.scroll > this.width.client;
						},
						scrollableY: function () {
							return (overflow.y || overflow.isRoot) && this.height.scroll > this.height.client;
						}
					};
					return direction.y && size.scrollableY() || direction.x && size.scrollableX();
				}
			});
		})(jQuery);

		(function ($) {

			var focusableElementsList = [
				'a[href]',
				'button:not([disabled])',
				'area[href]',
				'input:not([disabled])',
				'select:not([disabled])',
				'textarea:not([disabled])',
				'iframe',
				'object',
				'embed',
				'*[tabindex]',
				'*[contenteditable]',
				'*[role="button"]'
			];

			var focusableElementsSelector = focusableElementsList.join();

			$.extend($.expr[":"], {
				focusable: function (el, index, selector) {
					return $(el).is(focusableElementsSelector);
				}
			});

			$.fn.trapFocus = function () {

				this.each(function () {

					var _self = $(this), focusableEls = _self.find(':focusable'),
						firstFocusableEl = focusableEls[0],
						lastFocusableEl = focusableEls[focusableEls.length - 1],
						KEYCODE_TAB = 9;

					//String.log(['.trapFocus', focusableEls]);

					$(this).off('keydown.trap').on('keydown.trap', function (e) {

						if (focusableEls.length == 0) focusableEls = _self.find(':focusable');

						var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);

						if (!isTabPressed) {
							return;
						}

						//var isOutside = $.inArray(document.activeElement, focusableEls) == -1;

						String.log(['.trapFocus, key=' + e.keyCode + ', isTabPressed=' + isTabPressed, document.activeElement]);

						if (e.shiftKey) /* shift + tab */ {
							if (document.activeElement === firstFocusableEl) {
								lastFocusableEl.focus();
								e.preventDefault();
							}
						} else /* tab */ {
							if (document.activeElement === lastFocusableEl) {
								firstFocusableEl.focus();
								e.preventDefault();
							}
						}

					});

				});

			}

			$.fn.firstFocus = function () {

				this.each(function () {

					var focusableEls = $(this).find(':focusable');
					if (focusableEls.length > 0) {
						if (focusableEls[0].tagName.toLowerCase() == 'iframe') {
							try {
								var doc = focusableEls[0].contentDocument ? focusableEls[0].contentDocument : focusableEls[0].contentWindow.document;
								$(doc).firstFocus();
								return;
							} catch (e) {
								//alert(e);
							}
						}
						focusableEls[0].focus();

					}

				});

			}

		})(jQuery);


		/**
		* jQuery.fn.sortElements
		* --------------
		* @author James Padolsey (http://james.padolsey.com)
		* @version 0.11
		* @updated 18-MAR-2010
		* --------------
		* @param Function comparator:
		*   Exactly the same behaviour as [1,2,3].sort(comparator)
		*   
		* @param Function getSortable
		*   A function that should return the element that is
		*   to be sorted. The comparator will run on the
		*   current collection, but you may want the actual
		*   resulting sort to occur on a parent or another
		*   associated element.
		*   
		*   E.g. $('td').sortElements(comparator, function(){
		*      return this.parentNode; 
		*   })
		*   
		*   The <td>'s parent (<tr>) will be sorted instead
		*   of the <td> itself.
		*/
		jQuery.fn.sortElements = (function () {

			var sort = [].sort;

			return function (comparator, getSortable) {

				getSortable = getSortable || function () { return this; };

				var placements = this.map(function () {

					var sortElement = getSortable.call(this),
						parentNode = sortElement.parentNode,

					// Since the element itself will change position, we have
					// to have some way of storing it's original position in
					// the DOM. The easiest way is to have a 'flag' node:
						nextSibling = parentNode.insertBefore(
							document.createTextNode(''),
							sortElement.nextSibling
						);

					return function () {

						if (parentNode === this) {
							throw new Error(
								"You can't sort elements if any one is a descendant of another."
							);
						}

						// Insert before flag:
						parentNode.insertBefore(this, nextSibling);
						// Remove flag:
						parentNode.removeChild(nextSibling);

					};

				});

				return sort.call(this, comparator).each(function (i) {
					placements[i].call(getSortable.call(this));
				});

			};

		})();

	})(jQuery);

	/*!
	* jQuery-ajaxTransport-XDomainRequest - v1.0.0 - 2013-06-11
	* https://github.com/MoonScript/jQuery-ajaxTransport-XDomainRequest
	* Copyright (c) 2013 Jason Moon (@JSONMOON)
	* Licensed MIT (/blob/master/LICENSE.txt)
	*/
	if (!jQuery.support.cors && jQuery.ajaxTransport && window.XDomainRequest) { var httpRegEx = /^https?:\/\//i; var getOrPostRegEx = /^get|post$/i; var sameSchemeRegEx = new RegExp('^' + location.protocol, 'i'); var htmlRegEx = /text\/html/i; var jsonRegEx = /\/json/i; var xmlRegEx = /\/xml/i; jQuery.ajaxTransport('text html xml json', function (i, j, k) { if (i.crossDomain && i.async && getOrPostRegEx.test(i.type) && httpRegEx.test(i.url) && sameSchemeRegEx.test(i.url)) { var l = null; var m = (j.dataType || '').toLowerCase(); return { send: function (f, g) { l = new XDomainRequest(); if (/^\d+$/.test(j.timeout)) { l.timeout = j.timeout } l.ontimeout = function () { g(500, 'timeout') }; l.onload = function () { var a = 'Content-Length: ' + l.responseText.length + '\r\nContent-Type: ' + l.contentType; var b = { code: 200, message: 'success' }; var c = { text: l.responseText }; try { if (m === 'html' || htmlRegEx.test(l.contentType)) { c.html = l.responseText } else if (m === 'json' || (m !== 'text' && jsonRegEx.test(l.contentType))) { try { c.json = jQuery.parseJSON(l.responseText) } catch (e) { b.code = 500; b.message = 'parseerror' } } else if (m === 'xml' || (m !== 'text' && xmlRegEx.test(l.contentType))) { var d = new ActiveXObject('Microsoft.XMLDOM'); d.async = false; try { d.loadXML(l.responseText) } catch (e) { d = undefined } if (!d || !d.documentElement || d.getElementsByTagName('parsererror').length) { b.code = 500; b.message = 'parseerror'; throw 'Invalid XML: ' + l.responseText; } c.xml = d } } catch (parseMessage) { throw parseMessage; } finally { g(b.code, b.message, c, a) } }; l.onprogress = function () { }; l.onerror = function () { g(500, 'error', { text: l.responseText }) }; var h = ''; if (j.data) { h = (jQuery.type(j.data) === 'string') ? j.data : jQuery.param(j.data) } l.open(i.type, i.url); l.send(h) }, abort: function () { if (l) { l.abort() } } } } }) }


	/// <reference path="jquery.js" />
	/*
	jquery-watcher 
	Version 1.13 - 11/17/2014
	(c) 2014 Rick Strahl, West Wind Technologies 
	www.west-wind.com

	Licensed under MIT License
	http://en.wikipedia.org/wiki/MIT_License
	*/
	(function ($, undefined) {
		$.fn.watch = function (options) {
			/// <summary>
			/// Allows you to monitor changes in a specific
			/// CSS property of an element by polling the value.
			/// when the value changes a function is called.
			/// The function called is called in the context
			/// of the selected element (ie. this)
			///
			/// Uses the MutationObserver API of the DOM and
			/// falls back to setInterval to poll for changes
			/// for non-compliant browsers (pre IE 11)
			/// </summary>            
			/// <param name="options" type="Object">
			/// Option to set - see comments in code below.
			/// </param>        
			/// <returns type="jQuery" /> 

			var opt = $.extend({
				// CSS styles or Attributes to monitor as comma delimited list
				// For attributes use a attr_ prefix
				// Example: "top,left,opacity,attr_class"
				properties: null,

				// interval for 'manual polling' (IE 10 and older)            
				interval: 100,

				// a unique id for this watcher instance
				id: "_watcher",

				// flag to determine whether child elements are watched            
				watchChildren: false,

				// Callback function if not passed in callback parameter   
				callback: null
			}, options);

			return this.each(function () {
				var el = this;
				var el$ = $(this);
				var fnc = function (mRec, mObs) {
					__watcher.call(el, opt.id, mRec, mObs);
				};

				var data = {
					id: opt.id,
					props: opt.properties.split(','),
					vals: [opt.properties.split(',').length],
					func: opt.callback, // user function
					fnc: fnc, // __watcher internal
					origProps: opt.properties,
					interval: opt.interval,
					intervalId: null
				};
				// store initial props and values
				$.each(data.props, function (i) {
					if (data.props[i].startsWith('attr_'))
						data.vals[i] = el$.attr(data.props[i].replace('attr_', ''));
					else if (data.props[i].startsWith('prop_'))
						data.vals[i] = el$.prop(data.props[i].replace('prop_', ''));
					else
						data.vals[i] = el$.css(data.props[i]);
				});

				el$.data(opt.id, data);

				hookChange(el$, opt.id, data);
			});

			function hookChange(element$, id, data) {
				element$.each(function () {
					var el$ = $(this);

					if (window.MutationObserver) {
						var observer = el$.data('__watcherObserver');
						if (observer == null) {
							observer = new MutationObserver(data.fnc);
							el$.data('__watcherObserver', observer);
						}
						observer.observe(this, {
							attributes: true,
							subtree: opt.watchChildren,
							childList: opt.watchChildren,
							characterData: true
						});
					} else
						data.intervalId = setInterval(data.fnc, opt.interval);
				});
			}

			function __watcher(id, mRec, mObs) {
				var el$ = $(this);
				var w = el$.data(id);
				if (!w) return;
				var el = this;

				if (!w.func)
					return;

				var changed = false;
				var i = 0;
				for (i; i < w.props.length; i++) {
					var key = w.props[i];

					var newVal = "";
					if (key.startsWith('attr_'))
						newVal = el$.attr(key.replace('attr_', ''));
					else if (key.startsWith('prop_'))
						newVal = el$.prop(key.replace('prop_', ''));
					else
						newVal = el$.css(key);

					if (newVal == undefined)
						continue;

					if (w.vals[i] != newVal) {
						w.vals[i] = newVal;

						if (!changed) {
							// first time a change is detected, unbind to avoid recursive events
							el$.unwatch(id);
						}
						changed = true;

						// call the user handler
						w.func.call(el, w, i, mRec, mObs);
					}

				}

				if (changed) {
					// rebind the events
					hookChange(el$, id, w);
				}
			}
		}
		$.fn.unwatch = function (id) {
			this.each(function () {
				var el = $(this);
				var data = el.data(id);
				try {
					if (window.MutationObserver) {
						var observer = el.data("__watcherObserver");
						if (observer) {
							observer.disconnect();
							el.removeData("__watcherObserver");
						}
					} else
						clearInterval(data.intervalId);
				}
				// ignore if element was already unbound
				catch (e) {
				}
			});
			return this;
		}
		String.prototype.startsWith = function (sub) {
			if (sub === null || sub === undefined) return false;
			return sub == this.substr(0, sub.length);
		}
	})(jQuery, undefined);

	(function ($) {
		if ($.fn.style || FD.Browser.less('ie', 7, true)) {
			return;
		}

		// Escape regex chars with \
		var escape = function (text) {
			return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		};

		// For those who need them (< IE 9), add support for CSS functions
		var isStyleFuncSupported = !!CSSStyleDeclaration.prototype.getPropertyValue;
		if (!isStyleFuncSupported) {
			CSSStyleDeclaration.prototype.getPropertyValue = function (a) {
				return this.getAttribute(a);
			};
			CSSStyleDeclaration.prototype.setProperty = function (styleName, value, priority) {
				this.setAttribute(styleName, value);
				var priority = typeof priority != 'undefined' ? priority : '';
				if (priority != '') {
					// Add priority manually
					var rule = new RegExp(escape(styleName) + '\\s*:\\s*' + escape(value) +
						'(\\s*;)?', 'gmi');
					this.cssText =
						this.cssText.replace(rule, styleName + ': ' + value + ' !' + priority + ';');
				}
			};
			CSSStyleDeclaration.prototype.removeProperty = function (a) {
				return this.removeAttribute(a);
			};
			CSSStyleDeclaration.prototype.getPropertyPriority = function (styleName) {
				var rule = new RegExp(escape(styleName) + '\\s*:\\s*[^\\s]*\\s*!important(\\s*;)?',
					'gmi');
				return rule.test(this.cssText) ? 'important' : '';
			}
		}

		// The style function
		$.fn.style = function (styleName, value, priority) {

			var retval = this;

			this.each(function () {
				// DOM node
				var node = this;

				// Ensure we have a DOM node
				if (typeof node == 'undefined') {
					return this;
				}
				// CSSStyleDeclaration
				var style = node.style;
				// Getter/Setter
				if (typeof styleName != 'undefined') {
					if (typeof value != 'undefined') {
						// Set style property
						priority = typeof priority != 'undefined' ? priority : '';
						if (value == null) {
							style.removeProperty(styleName);
						} else {
							style.setProperty(styleName, value, priority);
						}
					} else {
						// Get style property
						retval = style.getPropertyValue(styleName);
					}
				} else {
					// Get CSSStyleDeclaration
					retval = style;
				}
			});

			return retval;
		};
		$.fn.stylePriority = function (styleName) {
			
			var node = this.get(0);
			if (typeof node == 'undefined' || !node.style) {
				return '';
			}
			return node.style.getPropertyPriority(styleName);

		}
	})(jQuery);
}



var __FD_GENERAL_EXTENSIONS = true;
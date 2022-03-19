
/* Below a list of relevant FD.Form namespace objects
	- FD.Form.Info [relevant form info]
	- FD.Form.Items [a collection of all form items]
	- FD.Form.Data [handles stored form entries]
	- FD.Form.Result [maintained in the fd_general.js, handles formresult relevant information like id and status]
	- FD.Form.Features [handels form feature checking and stuff]
		- FD.Form.Workflow [handles the workflow feature]
		- FD.Form.Lookups [handles the lookup feature]
		- FD.Form.Calculations [handles the calculations]
		- FD.Form.Dependencies [handles the dependencies]
		- FD.Form.Validations [handles the validations in combination with FD.Validate from fd_validate.js]
	- FD.Form.Events [handles the form items events, not to confuse with the FD.Events object]

*/

$(document).ready(function () {
	var form = document.builder, removeParams = typeof preventParams != 'undefined' && preventParams;
	if (!form) return;
	var url = new FDUri(form.action);
	sidn = url.queryGet('sidn', '', 'string');
	if (!removeParams && !sidn) {
		sidn = FD.getAuth().sidn;
		if (sidn) {
			form.action = url.querySet('sidn', sidn).toString();
		}
	} else if (removeParams) { form.action = url.queryRemove(['test']).toString(); } // removed the sidn from the parameter removal
	if (typeof WYSIWYG == 'undefined' && typeof FD.Window != 'undefined') Object.extend(FD.Window.defaults, { theme: 'form' });
});

FD.Resource.load('/label/system/form.css');

FDItem.implement({

	getName: function () {
		if (this.name) return this.name;
		if (this.type == FDItem.IMAGE) return 'img' + this.id;
		if (this.type.list(FDItem.COMMENT, FDItem.SPACE)) return 'tdA' + this.id;
		this.log('Could not get the name of this item, type=' + this.type + ', id=' + this.id, 'error');
	},
	$: function () {
		var $el;
		if (this.type == FDItem.COMMENT)
			$el = $('#tdA' + this.id);
		else if (this.type == FDItem.IMAGE)
			$el = $('#img' + this.id);
		else if (this.type == FDItem.LINE)
			$el = $('#tdA' + this.id + ' hr');
		else if (this.type == FDItem.SPACE)
			$el = $('tblA' + this.id);
		else if (this.name.empty())
			return null;
		else if (this.type.list(5, 6))
			$el = $('input[name=' + this.name + ']');
		else
			$el = $('#' + this.name);
		
		if (arguments.length > 0) {
			return $el.find(arguments[0]);
		} else {
			return $el;
		}
	},
	element: function () {
		if (this.type == FDItem.FILE) {
			var upl = FD.Upload.get(this.name);
			return upl.element();
		}
		return FD.get(this.name, null, true);
	},

	// shortcut functions, the code resides on the FDItems class
	value: function () {
		return this._owner.value.apply(this._owner, [this].add(arguments));
	},
	setvalue: function () {
		return this._owner.setvalue.apply(this._owner, [this].add(arguments));
	},
	selected: function () {
		return this._owner.selected.apply(this._owner, [this].add(arguments));
	},
	option: function () {
		return this._owner.option.apply(this._owner, [this].add(arguments));
	},
	fire: function () {
		if (typeof FD.Form.Events != 'undefined') FD.Form.Events.exec(this.id);
	},
	trigger: function () { // e, feature
		var args = $A(arguments), e = (Object.is(args[0]) ? args.shift() : null), feature = args.shift();
		String.log('.trigger, feature=' + feature);
		FD.Form.Features.trigger(this, e, feature);
	},

	isHidden: function () { return this._hidden; },
	isDisabled: function (fromProperty) {
		var el = this.element();
		if (!el || fromProperty) return this._disabled;
		if (Array.is(el)) return (el.length > 0 ? el[0].disabled || false : false); // with checkbox- and radiogroups all options are disabled or not. so, just check the first one.
		return el.disabled || false;
	},
	isReadonly: function () {
		return this._readOnly;
	},
	/// <summary>
	///		Checks if the item is applicable for validation.
	/// </summary>
	/// <returns type="boolean">true or false</returns>
	isApplicable: function () {
		var feature;
		if (this.isHidden() || this.isDisabled()) return false; // is the item hidden by the specific advanced setting or is the item disabled disabled by a dependency
		else if ((feature = FD.Form.Features.get('workflow')) && feature.disallowed(this.id, true)) return false; // is the item disalowed by the workflow feature
		else if ((feature = FD.Form.Features.get('dependencies'))) return !feature.isHidden(this); // is the item hidden by a dependency. this could also be a dependency at page level
		return true;
	},
    setDisabled: function () {
       // this.log(['.setDisabled, type=' + this.type, this]);
        if (!FDItem.isInput(this.type)) return this;

		this._disabled = arguments.length > 0 && arguments[0];

		var $self = this.$();
		$self.setDisabled.apply($self, arguments);

		if (!this._disabled) {
			var lookups = FD.Form.Features.get('lookups');
			if (lookups)
				lookups.processDeferred(this.id, 'setDisabled');
		}

		this.fireEvent('onDisabled', arguments);

		return this;
	},
	disable: function (options) {
		return this.setDisabled(true, options);
	},
	enable: function (options) {
		return this.setDisabled(false, options);
	},
	setReadonly: function () {
        if (!FDItem.isInput(this.type)) return this;

		this._readOnly = arguments.length > 0 && arguments[0];

        var $self = this.$();
		$self.setReadonly.apply($self, arguments);
		this.fireEvent('onReadonly', arguments);
		return this;
	},
	setDisplay: function (hidden, force) { // in case of a dependency rule: when the rule evaluates to 'true' then hidden should also be 'true'

		var wysiwyg = typeof WYSIWYG != 'undefined';
		if (((!Boolean.is(force) || !force) && (this.hidden && this._owner._hidden) && this._hidden)) return;

		this._hidden = hidden;

		var id = this.id, type = this.disp, name = 'tdA' + id, el = FD.get(name), matrix = false;
		if (!el) {
			// it's probably a matrix
			name = 'tdA' + id + 'cell1';
			el = FD.get(name);
			matrix = true;
		}
		var $el = $(el), opt = 1, currentHidden = $el.css('display') == 'none' || (wysiwyg && $el.css('opacity') < 1);

		if (hidden == currentHidden) {
			return;
		}

		if (!matrix && el) {
			if (wysiwyg) setFilter(name, hidden, this.page);
			else $el.toggle(!hidden);
		} else {
			while ((el = FD.get('tdA' + id + 'cell' + opt))) {
				name = 'tdA' + id + 'cell' + opt;
				if (wysiwyg) setFilter(name, hidden, this.page);
				else $(el).toggle(!hidden);
				opt++;
			}
		}

		if ((type == 1 || type == 2) && !this.hq) {
			name = 'tdQ' + id;
			if (wysiwyg) setFilter(name, hidden, this.page);
			else $('#' + name).toggle(!hidden);
		}
		if (type == 2) {
			name = 'tdQA' + id;
			if (!wysiwyg) $('#' + name).toggle(!hidden);
		}
		if (FD.Form.Info.qno && type < 3) {
			if (wysiwyg) setFilter('tdN' + id, hidden, this.page);
			else $('#tdN' + id).toggle(!hidden);
		}
		FD.Form.checkRowDisplay(name); // check if the row has to be hidden or displayed
		if (this._hidden) this.setLoading(false);
		this._owner.checkLoaders(); // check the position of the loaders

		// if type = FILE then refresh the plupload instance to reposition it's browse button
		if (this.type == FDItem.FILE) FD.Upload.get(this.name).refresh();

		this.fireEvent('onDisplay', [{ state: (hidden ? 'hidden' : 'show'), wysiwyg: wysiwyg, hidden: hidden }]);

		return this;
	},
	setActive: function (toggle) { // in case of a dependency rule: when the rule evaluates to 'true' then hidden should also be 'true'

		//this.log('.setActive, toggle=' + toggle);

		this._active = false;
		$('.ActiveItem').removeClass('ActiveItem');

		if (toggle) {
			var id = this.id, type = this.disp, name = 'tdA' + id, el = FD.get(name), opt = 1;
			if (el) {
				$(el).addClass('ActiveItem');
			} else {
				while ((el = FD.get('tdA' + id + 'cell' + opt))) {
					$(el).addClass('ActiveItem');
					opt++;
				}
			}
			if (type == 1 || type == 2) { // Question & Answer
				$('#tdQ' + id).addClass('ActiveItem');
			}
			if (FD.Form.Info.qno && type < 3) {
				$('#tdN' + id).addClass('ActiveItem');
			}

			this._active = true;
		}

		return this;
	},
	setLoading: function (display) {
		this._owner.setLoading(this, display);
		return this;
	},

	setAlt: function () {
		this.alt = true;
		this.$()
			.on('click.alt', this.checkAlt.bind(this, false))
			.parent().find('.option-alt').on('click.alt', function (e) { e.stopPropagation(); return false; });
		
		if (!FD.Form._inited) FD.Form.addEvent('onAfterLoad', this.checkAlt.bind(this, true));
		else this.checkAlt(true);
		
		return this;
	},
	checkAlt: function (force) {
		var el = this.element(), disable = !(typeof el[0] != 'undefined' ? el[el.length - 1].checked : el.checked);
		if ((disable && force) || this.isApplicable()) $('input[name=alt' + this.name + ']').setDisabled(disable);
	},

	blink: function (options) {
		this.$().blink(options);
	},

	getPage: function () {
		this.log('.getPage');
		var page = this.$().page(), item = null;
		this.log(['.getPage', page, item]);
		if (page > 0 && (page = FD.Pages.getPage(page))) {
			item = FDItems.search(page.id);
		}
		this.log(['.getPage', page, item]);
		return item;
	},

	getFeature: function (feature) {
		var f = null;
		if (!this._featureCache[feature] && (f = FD.Form.Features.get(feature))) {
			this._featureCache[feature] = f.search(this.id);
			this.log(['.getFeature, feature=' + feature, this._featureCache[feature]]);
		}
		return this._featureCache[feature] || null;
	},

	getInvolvedItems: function (features) {
		if (this.inv) {
			var items = new FDItemsMap();
			for (var i = 0; i < this.inv.length; i += 2) {
				if (features) {
					for (var j = 0; j < features.length; j++) {
						if (FDItem.features.has(features[j], this.inv[i + 1])) {
							items.push(FDItems.search(this.inv[i]));
						}
					}
				} else {
					items.push(FDItems.search(this.inv[i]));
				}
			}
			
			return items;
		}
		return null;
	}

});

FDItemsMap.implement({
	hasInput: function () {
		for (var i = 0, len = this.length; i < len; i++) {
			if (FDItem.isInput(this[i].type)) return true;
		}
		return false;
	},
	$: function () {
		var arr = [], el;
		for (var i = 0, len = this.length; i < len; i++) {
			el = this[i].element();
			if (Array.is(el)) {
				arr.concat(el);
			} else {
				arr.push(el);
			}
		}
		return $(arr);
	}
});

FDItems.implement({

	_hidden: false,

	/// <summary>
	///		Hides the items with the hidden property set. Called from the FDForm.Init function when applicable.
	/// </summary>
	/// <param name="val">The hidden state</param>
	setHidden: function (val) {
		if (arguments.length == 0) val = !this._hidden; // toggle
		this._hidden = val;
		this.log('.setHidden, hide=' + this._hidden, 'group');
		for (var i = 0, len = this.length; i < len; i++) {
			if (this[i].hidden) this[i].setDisplay(this._hidden, true);
		}
		this.log('', 'groupEnd');
	},

	fromEvent: function (e) {
		return this.fromElement(e.target);
	},
	fromElement: function (el) {
		var $el, id, name, item = null;
		if (el && (typeof el.length == 'undefined' || el.length > 0)) {
			if (el instanceof jQuery) {
				$el = el;
				el = $el.get(0);
			} else {
				$el = $(el);
			}
			//this.log(['.fromElement', el, $el]);

			if ($el.hasClass('info-tooltip')) {
				id = /[\d]+/.exec($el.find('img').prop('id'));
				if (id) item = this.search(Number.int(id));
			} else if ($el.hasClass('calendar-button')) {
				name = $el.prop('id').split('-')[0];
				if (name) item = this.search(name);
			} else if (el.name) {
				if ($el.hasClass('option-alt')) {
					item = this.search(el.name.substr(3));
				} else {
					item = this.search(el.name);
				}
			} else if (el.id) {
				var match = /[\d]+/.exec(el.id);
				if (match) {
					item = this.search(Number.int(match));
				}
			} else if ($el.hasClass('upload-button')) {
				name = $el.siblings('input[type="text"]').prop('name');
				if (name) item = this.search(name);
			}
		}
		return item;
	},

	/// <summary>
	///		Gets a jQuery reference of the specified item.
	/// </summary>
	/// <param name="item">Name (String) or ID (Number)</param>
	/// <returns type="jQuery"></returns>
	$: function () {
		var item = this.search.apply(this, arguments);
		if (!item) return null;
		return item.$();
	},

	value: function () { // identifier/item, constants
		var item = (FDItem.is(arguments[0]) ? arguments[0] : this.search(arguments[0])), retval = '', format, el,
			has_const = (arguments.length > 1 && Number.is(arguments[1]) && arguments[1] > 0),
			readDisabled = (has_const && (arguments[1] & FDItems.READDISABLED) ? true : false), feature;

		if (!item) return (arguments.length > 2 ? arguments[2] : retval);
		if (!(el = item.element())) return retval;

		if ((feature = FD.Form.Features.get('workflow')) && (feature.isApprover || feature.isAdmin) && feature.disallowed(item.id, true)) {
			/* 
				When an workflow approver and the item is not within his/here questions to be answered, 
				then the value should be read also when the item has been disabled.


			*/
			readDisabled = true;
		}

		if (item.type.list(FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) { // typeof el.tagName == 'undefined' && typeof el[0] != 'undefined') { // radio/checkbox list

			var single = !Array.is(el), array = (!single && (!el[0].type || el[0].type.toLowerCase() == 'checkbox')), alt = FD.get('alt' + item.name), altVal = '';
			retval = (array ? [] : '');

			if (!single) {

				for (var i = 0, len = el.length; i < len; i++) {
					if (el[i].checked && (!el[i].disabled || readDisabled)) {
						if (array) retval.push(el[i].value);
						else { retval = el[i].value; break; }
					}
				}

			} else {

				retval = (el.checked && (!el.disabled || readDisabled) ? el.value : '');

			}

			if (alt && ((single && el.checked && (!el.disabled || readDisabled)) || (!single && el[el.length - 1].checked && (!el[el.length - 1].disabled || readDisabled)))) {
				altVal = alt.value;
				if (array) retval[Math.max(retval.length - 1, 0)] = altVal;
				else retval = altVal;
			}

		} else if (item.type == FDItem.CHECKBOX) { //el.tagName.toLowerCase() == 'input' && /^(radio|checkbox)$/.test((el.type ? el.type.toLowerCase() : '')) && !item.type.list(FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) { // single checkbox/radio and not meant to be a checkbox-/radiogroup

			retval = el.checked && (!el.disabled || readDisabled);

		} else if (item.type == FDItem.USERLIST && (has_const && (arguments[1] & FDItems.DESCRIPTION))) {

			retval = (!el.disabled || readDisabled ? item.$(':selected').text() : '');

		} else if (typeof el.value != 'undefined') {

			retval = (!el.disabled || readDisabled ? el.value : '');

		}
		if (has_const) {
			if (arguments[1] & FDItems.DEFORMATTED || arguments[1] & FDItems.TYPED || arguments[1] & FDItems.NODE) {
				if (Boolean.is(retval)) retval = (retval ? 'on' : '');
				else if (Array.is(retval)) {
					retval = retval.join(',' + (!(arguments[1] & FDItems.NODE) ? ' ' : ''));
					if (arguments[1] & FDItems.NODE) {
						retval = { values: retval, alt: (alt && el[el.length - 1].checked ? alt.value : '') };
					}
				} else if (el.getAttribute) retval = FD.Input.Format(el, retval, true, false);
			}
			if (arguments[1] & FDItems.TYPED) {

				switch (item.type) {
					case FDItem.CALCULATION /*15*/:
					case FDItem.NUMERIC /*2*/:
						retval = Number.float(retval);
						break;
					case FDItem.DATE /*3*/:
						if (retval == '') retval = null;
						else {
							retval = FD.Date.Parse(retval, '', true).Date; // null if the date could not be parsed
						}
						break;
					case FDItem.CHECKBOX /*4*/:
						retval = retval == 'on';
						break;
					case FDItem.OTHER /*19*/:
						if (el.getAttribute('fd:format')) {
							switch (el.getAttribute('fd:format')) {
								case 'digit':
									retval = Number.float(retval); break;
								case 'time':
									retval = FDTime.parse(retval).toMinutes(); break; 
							}
						}
						break;
				}

			} else if (arguments[1] & FDItems.NODE) {

				var newval = arguments[2].createElement('value');
				if (Array.is(retval)) {
					var values = arguments[2].createElement('values'), altvalue = arguments[2].createElement('alt');
					values.nodeValue = retval;
					altvalue.nodeValue = (alt && el[el.length - 1].checked ? alt.value : '');
					newval.appendChild(values);
					newval.appendChild(altvalue);
				} else {
					newval.nodeValue = retval;
				}
				retval = newval;
			}
		}

		return retval;
	},
	setValue: function (item, value, exclude_alt) {
		item = (FDItem.is(item) ? item : this.search(item));
		if (!item) return;
		var el = item.element();
		if (!el) return;
		if (item.type.list(FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) { // radio/checkbox list
			value = (!Array.is(value) ? [value] : value);
			var single = !Array.is(el), alt = FD.get('alt' + item.name), val, i, len, found, chk;
			while (value.length > 0) {
				val = value.shift();
				found = false;
				if (!single) {
					for (i = 0, len = el.length; i < len; i++) {
						if (el[i].value == val) {
							found = true;
							el[i].checked = true;
						} else if (el[i].type.toLowerCase() == 'radio') {
							el[i].checked = false;
						}
						$(el[i]).data('origValue', el[i].checked);
					}
				} else {
					if (el.value == val) {
						el.checked = found = true;
					}
					$(el).data('origValue', el.checked);
				}
				if (!found && !exclude_alt && alt) {
					(single ? el : el[el.length - 1]).checked = true;
					$((single ? el : el[el.length - 1])).data('origValue', true);
					alt.value = val;
				}
				if (this.type == FDItems.RADIOGROUP) {
					chk = $('[name="' + this.name + '"]:checked');
					for (i = 0, len = el.length; i < len; i++) {
						$(el[i]).data('origValue', chk);
					}
				}
			}
		} else if (el.tagName.toLowerCase() == 'input' && /^(radio|checkbox)$/.test((el.type ? el.type.toLowerCase() : ''))) { // single checkbox/radio
			if (!Boolean.is(value) && item.type.list(FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) {
				el.checked = (value == el.value);
			} else {
				el.checked = value;
			}
		} else if (typeof el.value != 'undefined') {
			el.value = value;
			/*if (item.type == 20) {
			retval = el.options[el.selectedIndex].text;
			}*/
		}
		return item;
	},
	setvalue: function () { return this.setValue.apply(this, arguments); },
	selected: function () { // identifier, type [index|value|sum], constants
		/// <summary>
		///		
		/// </summary>
		/// <param name="item">An FDItem instance (Object) or an items name (String) or db id (Integer)</param>
		/// <param name="type" type="String">What to return or what to compare. Can be: index, value or sum.</param>
		/// <param name="option" optional="true">Option index, text or value to check</param>
		/// <param name="constants" type="Number" optional="true">For this function only the FDItems.READDISABLED constant is applicable. Specifies to include disabled options when checking or summing.</param>
		/// <returns>Depends on the parameter type and option. Can be String or Integer.</returns>
		var item = (FDItem.is(arguments[0]) ? arguments[0] : this.search(arguments[0]));
		var const_index = (arguments.length > 2 && Number.is(arguments[2]) && arguments[2] > 0 ? 2 : (arguments.length > 3 && Number.is(arguments[3]) && arguments[3] > 0 ? 3 : 0)), has_const = const_index > 0;
		var readDisabled = (has_const && arguments[const_index] & FDItems.READDISABLED ? true : false);
		var el = item.element();
		// params: el, type, option, doc, ignoreDisabled
		return FD.selected(el, arguments[1], (String.is(arguments[2]) ? arguments[2] : null), !readDisabled /* the reverse of the ignoreDisabled param */);
	},
	option: function () { // identifier, option [string|number], constants
		/// <summary>
		/// 
		/// </summary>
		/// <param name="item">An FDItem instance (Object) or an items name (String) or db id (Integer)</param>
		/// <param name="option" optional="true">Option text or value to check</param>
		/// <param name="constants" type="Number" optional="true">For this function only the FDItems.READDISABLED constant is applicable. Specifies to include disabled options when checking.</param>
		/// <returns type=""></returns>
		var item = (FDItem.is(arguments[0]) ? arguments[0] : this.search(arguments[0])), has_const = (arguments.length > 2 && Number.is(arguments[2]) && arguments[2] > 0), readDisabled = (has_const && arguments[2] & FDItems.READDISABLED ? true : false); ;
		var el = item.element();
		return isSelectedOption(el, arguments[1], !readDisabled /* the reverse of the ignoreDisabled param */) // [doc, ]el, option, ignoreDisabled
	},

	_loaders: [],
	setLoading: function (item, display) {
		item = (FDItem.is(item) ? item : this.search(item));
		if (!item) return;
		var name = item.getName(), ldr = this._loaders['ldr_' + name];
		//this.log('.setLoading, name=' + name);
		if (!ldr) { // not yet created
			if (!display) return; // the loader is meant to be set invisible, in this case just return
			ldr = new FDItemLoader(item); // create the loader object
			this._loaders['ldr_' + name] = ldr; // and cache it
			this._loaders.push(name);
		}
		this.log(['.setLoading, display=' + display, item, ldr]);
		ldr.set(display);
	},
	checkLoaders: function () {
		for (var i = 0; i < this._loaders.length; i++) {
			this._loaders['ldr_' + this._loaders[i]].set();
		}
	},

	setDisplay: function () {
		var args = $A(arguments), item = args.shift();
		if (!FDItem.is(item)) item = this.search(item);
		if (!item) return;
		return item.setDisplay.apply(item, args);
	},

	blink: function (item, options) {
		var item = this.search(item);
		if (item) item.blink(options);
	}

}).extend({

	DEFORMATTED: 1, TYPED: 2, NODE: 4, READDISABLED: 8, DESCRIPTION: 16,
	createOptions: function (item, arr, options) {
		options = options || {};
		var el = document.getElementById(item.name); // be sure to get the table reference
		// remove all rows
		if (el.rows.length > 0) {
			for (var i = el.rows.length - 1; i >= 0; i--)
				el.deleteRow(i);
		}
		var className = el.className.replace('options-table').trim(), cols = Number.create(el.getAttribute('fd:cols')), col = cols + 1, tr, td, div, elem, id, label, j = 0;
		for (var i = 0; i < arr.length; i++) {
			if (!arr[i].trim().empty()) {
				j++
				if (col > cols) {
					tr = el.insertRow(el.rows.length);
					col = 1;
				}
				td = tr.insertCell(tr.cells.length);
				td.vAlign = 'middle';

				id = item.name + 'opt' + j;
				div = '<div class="item-container" role="group">'

				elem = '<input type="' + (item.type == 5 ? 'checkbox' : 'radio') + '" name="' + item.name + '"';
				elem += ' id="' + id + '" value="' + arr[i] + '" fdId="' + item.id + '"';
				if (arr.length == 1 && (options['selectsingle'] || false)) elem += ' checked';
				elem += ' onclick="ev(' + item.id + ',event,this)" class="' + className + '" aria-labelledby="tdQ' + item.id + ' ' + id + '">';

				label = '<label id="' + id + '-label" for="' + id + '"><i></i><span>' + FDAjax.Utils.encodeEntities(arr[i]) + '&nbsp;</span></label>';
				elem += label;

				td.innerHTML = div + elem + '</div>';

				//td = tr.insertCell(tr.cells.length);
				/*td.innerHTML = '&nbsp;';
				td = tr.insertCell(tr.cells.length);
				td.innerHTML = '<label for="' + f.name + 'opt' + j + '">' + FDAjax.Utils.encodeEntities(arr[i][0]) + '&nbsp;</label>';*/
				if (col < cols) {
					td = tr.insertCell(tr.cells.length);
					td.innerHTML = '&nbsp;&nbsp;';
				}
				col++;
			}
		}
		if (arr.length == 0) {
			tr = el.insertRow(el.rows.length);
			td = tr.insertCell(tr.cells.length);
			td.innerHTML = '&nbsp;';
		}
		FD.get('tdQ' + item.id).style.verticalAlign = (el.rows.length > 1 ? 'top' : 'middle');

		if (item.isReadonly()) item.setReadonly(true);
		if (item.isDisabled(true)) item.setDisabled(true);
	}

});

var FDItemLoader = new Class({

	Extends: FDBaseClass,
	_class: 'FDItemLoader',

	_name: '',
	_display: false,
	_div: null,
	_el: null,
	_elr: null,

	initialize: function (item) {
		this.parent();
		this._name = item.getName();
		
		// cache the element(s)
		var el = $('#' + this._name), elr = null;
		if (!el || el.length == 0 || el[0].id != this._name) {
			// it's a multiple choice item
			el = item.element();
			elr = $(el[el.length - 1]); // get the last option for the bottom right coordinate
			el = $(el[0]); // the first is for the top left coordinate
		}
		this._el = el;
		this._elr = elr;

		this._create();
	},

	_create: function () {
		this._div = $('<div id="wait_' + this._name + '" class="item-wait" style="display:none">');
		$('body').append(this._div);

		var lbl = '';
		try { lbl = FD.getLabel().path; } catch (e) { lbl = FD.Form.Info.label; }
		this.log('._create, lbl=' + lbl);
		this._div.html('<table cellpadding="0" cellspacing="0" style="height:100%;width:100%"><tr><td valign="middle" align="center" style="vertical-align:middle;text-align:center"><img src="' + lbl + 'images/loading_lookup.gif" border="0"></td></tr></table>');
	},

	set: function (display) {

		if (arguments.length > 0) this._display = display && this._el[0].offsetWidth > 2;
		else if (!this._display) return;

		if (this._display) {
			var offset = this._el.offset();
			this._div.css({ left: offset.left + 'px', top: offset.top + 'px' });
			if (this._elr && this._elr.length > 0) {
				this._div.width((this._elr.offset().left + this._elr.getWidth()) - Number.float(this._div.css('left')));
			} else {
				this._div.width(Math.max(this._el.getWidth(), 20));
			}
			this._div.height(Math.max(this._el.getHeight(), 18));
		}
		this._div.toggle(this._display);
	}
});

/* depricated */
function FDFieldArray() {
	var items = new FDItems();
	if (arguments.length > 0) items.add(arguments);
	return items;
}
FDFieldArray.Constants = { DEFORMATTED: 1, TYPED: 2, NODE: 4, READDISABLED: 8 };

// An executable is for instance a calculation, validation or an event. It is a specialized (feature) function callable by a name (mostly the fieldname/identifier)
var FDExecutable = new Class({

	Extends: FDBaseClass,
	_class: 'FDExecutable',

	name: '',
	id: 0,
	page: 0,

	error: false,
	errorSeverity: 0,

	_deferred: null,

	initialize: function (options) {
		this.parent();
		if (options) Object.extend(this, options);
	},

	item: function () {
		var item = FDItems.search(this.name.match(/[^\/]*/)[0]);
		if (!item && this.id_item) item = FDItems.search(this.id_item);
		if (!item && this.id) item = FDItems.search(this.id);
		return item;
	},

	exec: function () { /* overwritten when extending the object with the options initialization parameter */ }

}).extend({
	is: function (exec) {
		return exec != null && exec instanceof this;
	}
}).implement(FDError.implementClass);

// The FDExecutableWrapper wraps multiple FDExecutable objects with the same name. See the FDExecutables.attach method how this class is used.
var FDExecutableWrapper = new Class({

	Extends: FDExecutable,
	_class: 'FDExecutableWrapper',

	_owner: null, // items added to FDObject classes will get a _owner reference to the owning collection
	objects: [],

	error: false,
	errorSeverity: 0,

	initialize: function (obj) {
		this.exec.lock();
		this.parent(obj);
		this.objects.push(obj);
	},
	exec: (function () {
		var retval;
		for (var i = 0; i < this.objects.length; i++) {
			retval = this.objects[i].exec.apply(this.objects[i], arguments);
			if (Boolean.is(retval) && !retval) return retval;
		}
		return true;
	}).lock(),

	_setOwner: function (obj) {
		if (Array.is(obj)) {
			for (var i = 0; i < obj.length; i++) obj[i]._owner = this._owner;
		} else {
			obj._owner = this._owner;
		}
	},
	insert: function (index, obj) {
		this._setOwner(obj);
		this.objects.insert(index, obj);
	},
	add: function (obj) {
		this._setOwner(obj);
		this.objects.add(obj);
	}
}).extend({
	is: function (wrapper) {
		return wrapper != null && wrapper instanceof this;
	}
}).implement(FDError.implementClass);

/*
	A specialized sub class of FDObjects which manages a collection of executable objects.
	Used as baseclass for the FDEvents, FDLookups ... see the FDExecutablesFeature class
*/
var FDExecutables = new Class({

	Extends: FDObjects,
	Implements: Events,
	_class: 'FDExecutables',

	_itemClass: FDExecutable,
	_initing: false,

	initialize: function () {
		this.parent.apply(this, arguments);
		this.queue._parent = this;
	},

	exec: function (l, e, el, src) {
		var obj = (Object.is(l) ? l : this.search(l));
		if (obj) {
			el = el || (e ? checkEvent(e) : null);
			obj.exec(e, el);
		} else {
			this.log(['.exec, obj not an object, l=' + l, this], 'error');
		}
	},
	execute: function () { this.exec.apply(this, arguments); },
	init: function () {
		this._initing = true;
		for (var i = 0, len = this.length; i < len; i++) {
			this[i].exec();
		}
		this._initing = false;
	},
	push: function () {
		if (arguments.length == 2 && Boolean.is(arguments[1]) && arguments[1]) {
			return this.parent(arguments[0]);
		} else {
			return this.attach.apply(this, arguments);
		}
	},
	attach: function () {
		var is_object = Object.is(arguments[0]), is_item = FDItem.is(arguments[0]) /*(is_object && arguments[0].id && arguments[0].name && arguments[0].type)*/, wrapper, pindex = (is_object ? 1 : 2);
		// search the executable object by name
		var obj = this.search((is_object ? arguments[0].name || arguments[0].id : arguments[0]));
		if (!obj) {
			// executable object does not exist yet. lets create one and add it to the collection
			if (!is_object || is_item) { obj = this.create(arguments[0], arguments[1]); }
			else { obj = this.create(arguments[0]); }
			obj.index = this.length;
			this.push(obj, true);
		} else {
			// an executable objecxt already exists
			try {
				if (!FDExecutableWrapper.is(obj)) { // it's not already a wrapper
					wrapper = new FDExecutableWrapper(obj); // Object.extend({ objects: [obj] }, obj);
					wrapper._owner = this;
					this[obj.index] = wrapper;
				} else {
					wrapper = obj;
				}
				// now create a new executable object of the given parameters
				obj = (!is_object ? this.create(arguments[0], arguments[1]) : this.create(arguments[0]));
				if (FDExecutableWrapper.is(obj) || obj.objects) obj = obj.objects; // the object to add is also a wrapper object, in that case add the objects of this wrapper and discard the wrapper object
				if (wrapper.objects.length > 0 && arguments.length > pindex && (arguments[pindex] || Number.is(arguments[pindex]))) { // insert
					wrapper.insert((Number.is(arguments[pindex]) ? arguments[pindex] : 0), obj);
				} else {
					wrapper.add(obj);
				}
			} catch (e) { FD.Error.Alert(true, e, 'fd_form.js', 965, this._class + '.attach'); }
		}
	},
	contains: function () {
		var is_object = Object.is(arguments[0]), wrapper, pindex = (is_object ? 1 : 2);
		var obj = this.search((is_object ? arguments[0].name : arguments[0]));
		if (!obj) return false;
		var reg = new RegExp(arguments[1].toRegExp(), "g");
		if (obj.objects) { // it's a wrapper
			for (var i = 0; i < obj.objects.length; i++) {
				if (reg.test(obj.objects[i].exec.toString())) return true;
			}
		} else {
			return reg.test(obj.exec.toString());
		}
	},
	create: function () {
		if (this._itemClass.is(arguments[0]) || FDExecutableWrapper.is(arguments[0])) return arguments[0];
		else if (!FDItem.is(arguments[0]) && Object.is(arguments[0])) return new this._itemClass(arguments[0]);

		var item = (FDItem.is(arguments[0]) ? arguments[0] : FDItems.search(arguments[0]));
		if (!item) throw this._class + ".create, item " + arguments[0] + " not found in Items array";
		var obj = new this._itemClass({ exec: (arguments.length > 1 ? arguments[1] : function () { }), name: item.name, id: item.id, page: item.page });
		return obj;
	},
	merge: function (arr, index) {
		for (var i = 0; i < arr.length; i++) {
			this.attach(arr[i], index);
		}
	},
	queue: {
		length: 0,
		_parent: null,
		_items: [],
		_functions: {},
		_executing: false,
		add: function (name, func) {
			this._parent.log('.queue.add, name=' + name + ', seek=' + this._items.seek(name));
			if (!this._items.seek(name)) {
				this._items.push(name); this._functions[name] = func; this.length = this._items.length;
			}
		},
		exec: function () {
			if (this._executing) return;
			this._executing = true;
			this._parent.log('.queue.exec, length=' + this._items.length, 'group');
			var items = this._items.clone(), funcs = $.extend({}, this._functions);
			this.clear();
			for (var i = 0, len = items.length; i < len; i++) {
				this._parent.log('.queue.exec, i=' + i + ', name=' + items[i], 'group');
				funcs[items[i]]();
				this._parent.log('', 'groupEnd');
			}
			this._parent.log('', 'groupEnd');
			this._executing = false;
		},
		clear: function () {
			this._items = []; this._functions = {}; this.length = 0;
		}
	}
}).implement(FDError.implementClass);

/* depricated */
Function.depricated('FDExecArray', function () {
	var execs = new FDExecutables();
	if (arguments.length > 0) execs.add(arguments);
	return execs;
}, 'FDExecutables');

// a simple baseclass for feature classes like FDWorkflow and FDProgress
var FDBaseFeature = new Class({

	Extends: FDBaseClass,
	_class: 'FDBaseFeature',

	name: 'Undefined',
	plural: '',
	singular: '',

	initialize: function (options) {
		if (this._class != 'FDBaseFeature') this.name = this._class.substr(2);
		if (!this.plural) this.plural = this.name.toLowerCase();
		if (!this.singular) this.singular = this.plural.left(this.plural.length - 1);

		this.parent();
		if (options) Object.extend(this, options);

		this.log('.initialize, plural=' + this.plural + ', singular=' + this.singular);
	}


});

// a more specialized baseclass for features which are collections of elements
var FDObjectsFeature = new Class({
	
	Extends: FDObjects,
	_class: 'FDObjectsFeature',

	name: 'Undefined',
	plural: '',
	singular: '',

	initialize: function (options) {
		if (this._class != 'FDObjectsFeature') this.name = this._class.substr(2);
		if (!this.plural) this.plural = this.name.toLowerCase();
		if (!this.singular) this.singular = this.plural.left(this.plural.length - 1);

		this.parent();
		if (options) Object.extend(this, options);

		this.log('.initialize, plural=' + this.plural + ', singular=' + this.singular);
	}

});

// a specialized baseclass for the feature arrays: FDEvents, FDCalculations, FDDependencies, FDValidations, FDLookups
// sets up some properties used by the FD.Form.Features object.
var FDExecutablesFeature = new Class({

	Extends: FDExecutables,
	_class: 'FDExecutablesFeature',

	name: 'Undefined',
	plural: '',
	singular: '',

	initialize: function (options) {
		if (this._class != 'FDExecutablesFeature') this.name = this._class.substr(2);
		if (!this.plural) this.plural = this.name.toLowerCase();
		if (!this.singular) this.singular = this.plural.left(this.plural.length - 1);

		this.parent();
		if (options) Object.extend(this, options);

		this.log('.initialize, plural=' + this.plural + ', singular=' + this.singular);
	},

	init: function (index) {
		if (String.is(index)) {
			this.src = true;
			FD.Form.Stack.Push('init', 0, this.name + '.init', index);
		}
		if (!Number.is(index)) {
			index = 0;
			this._initing = true;
			FD.Form.setLoading(true);
		}
		//this.log('.init, index=' + index + ', length=' + this.length);
		if (index < this.length) {
			this.exec(this[index], null, this.name + '.init');
			FD.Form.Progress.set(/*this.name*/);
			if (index % 10 == 0) {
				this.init.delay(this, 0, (index + 1));
			} else {
				this.init(index + 1);
			}
		} else {
			if (this.src) {
				this.src = false;
				FD.Form.Stack.Pop();
			}
			this._initing = false;
			FD.Form.setLoading(false);
			FD.Form.Features.next(this, true);
		}
	},
	/* 
	Returns the input array of the passed item. When the item has a parent (for now only the lookups)
	the input array of the parent is returned.
	*/
	getInput: function (item) { // mainly meant for the lookups which can have a parent
		var input;
		if (item.id_parent) {
			input = this.getInput(this.search(item.id_parent));
		} else {
			input = item.input || [];
		}
		return input;
	},

	finish: function () { }

});

var FDEvents = new Class({

	Extends: FDExecutablesFeature,
	_class: 'FDEvents',

	_trace: false,

	errors: 0,

	event: null,
	focus: null,

	initialize: function () {
		this.parent.apply(this, arguments);

		var self = this;
		$(document).ready((function () { 
			$('input,textarea,select').on('input', function (e) {
				var el = checkEvent(e);
				if (this != document.activeElement) {
					self.log('.checkInput, item=' + el.name + ', current=' + (document.activeElement ? document.activeElement.name || document.activeElement.tagName : 'n/a'), 'group');
					self.exec(el.name || el.id);
					self.log('', 'groupEnd');
				}
			});
		}).bind(this));
	},

	reset: function () {
		this.errors = 0;
	},

	/// <summary>
	///		Executes the event function of a specific item.
	/// </summary>
	/// <param name="l">Name (String) or ID (Number) of the event object</param>
	/// <param name="e">DOM Event object</param>
	/// <param name="el">DOM Element</param>
	/// <param name="src">Source description which triggered the event</param>
	/// <param name="skip">Specifies to skip the validations</param>
	/// <param name="changed">Specifies the value has changed</param>
	/// <param name="thread">The thread id which identifies the chain of executions</param>
	exec: function (l, e, el, src, skip, changed, thread) {
		if (FD.Form.Stack.Overflowed) { return; }
		if (this.skip) { this.skip = false; return; };
		if (this.focus) { this.focus = null; return; }
		el = el || (e ? checkEvent(e) : null);

		var ev = this.search(l), has_changed = true,
			item = (ev || el ? FDItems.search(ev ? ev.id : el.name) : null), validation = null;

		this.log(['.exec, has_changed=' + has_changed, e, ev, item]);

		// first we run the validation (this is the standard and not the custom advanced validation)
		if (!skip && !FD.Form.isLoading && (!e || (e.type != 'keyup')) && (ev || item) && FD.Form.Features.has('validations')) {
			validation = FD.Form.Validations.search(item.name);
			if (validation && !validation.interactive) validation = null;
		}

		if (ev || validation) {
			if (!thread) thread = 'th' + String.random();
			if (e) { // it's the first of the event chain
				if (/keyup|keydown/.test(e.type) && e.keyCode == 9) return; // don't execute on a tab keypress
				has_changed = (arguments.length >= 6 && Boolean.is(changed) ? changed : (!/blur|click|beforedeactivate/.test(e.type) || !el || (/blur|beforedeactivate/.test(e.type) && el.prevValue != el.value) || (e.type == 'click' && FD.selected(el.name, 'value') != el.prevValue)));
				this.event = e; this.reset();
				//nECalls = 1;
			} // else nECalls++;
			FD.Form.Stack.Push('event', item.id, item.name, (src ? src : (el ? el.id : '')).append(e ? e.type : '', '.').append((has_changed ? 'changed' : ''), '.'), thread);

			if (validation && !FD.Validate.isAlerting()) FD.Form.Validations.exec(item.name, changed, e, 'FDEvents.exec(' + item.id + '/' + item.name + ')', '', true);

			if (ev) {
				try { ev.exec(has_changed, e, el, 'FDEvents.exec(' + ev.id + '/' + ev.name + ')', skip, thread); } catch (e) { FD.Error.reportPlain('event=' + ev + ', id: ' + ev.id + ', name: ' + ev.name + '\r\n' + (e.message || e)); }
				if (e && typeof FD.Pages != 'undefined' && typeof WYSIWYG == 'undefined') FD.Pages.Delay(FD.Pages.Current, true, true);
			}

			this.fireEvent('onAfterExecute', ev);
			FD.Form.Stack.Pop();
		}
	},

	/// <summary>
	///		Called from the postAlert method of the FDValidate object. 
	/// </summary>
	/// <param name="focus">See the FDValidate el_focus variable for more info. Not relevant here.</param>
	setFocus: function (focus) {
		this.focus = focus;
	},
	/// <summary>
	///		Called from the onfocus event of a DOM Element. 
	/// </summary>
	checkFocus: function (el) {
		if (this.focus) { // a validation has occured, select the specified element and check if a focus change occurs.
			var same = this.focus.el == el;
			FD.Validate.Select(this.focus);
			this.log('.checkFocus, same=' + same);
			if (!same) { /* the focus has been changed to the selected element */ return; } else this.focus = null;
		}
		if (el.tagName.toLowerCase() == 'input' && /radio|checkbox/.test(el.type)) {
			// set the previous value of this single element to the selected elements of the whole group
			el.prevValue = window.FD.selected(el.name, 'value');
		} else el.prevValue = el.value;
		if (typeof FD.Validate != 'undefined' && FD.Validate.isAlerting()) FD.Validate.focus = el;
		this.log('.checkFocus, prevValue=' + el.prevValue);
	},

	checkInput: function (e) {
		var el = checkEvent(e);
		if (el != this.focus) {
			this.log('.checkInput, item=' + el.name + ', focus=' + (this.focus ? this.focus.name : 'n/a'), 'group');
			this.exec(el.name || el.id);
			this.log('', 'groupEnd');
		}
	}

});
// below a temporary function of the FDEvents class to redirect old function calls to the right place
FDEvents.AttachEvent = function () { FD.Events.AttachEvent.apply(FD.Events, arguments); }

// the FDParsers feature is a simple subclass with a small footprint
var FDParsers = new Class({

	Extends: FDExecutablesFeature,
	_class: 'FDParsers'

});

/* the FDCalculations and FDDependencies features are frequently used and not that fat, so just keep them here */
var FDCalculations = new Class({

	Extends: FDExecutablesFeature,
	_class: 'FDCalculations',

	init: function (index) {
		if (String.is(index)) { 
			this.src = true;
			FD.Form.Stack.Push('init', 0, this.name + '.init', index);
		}
		if (!Number.is(index)) {
			FD.Form.setLoading(true);
			index = 0;
			this.thread = 'th' + String.random();
			this.forEach(function (el) { el.inited = false; }, this);
		}
		if (index < this.length) {
			this.exec(this[index], null, this.name + '.init', true, this.thread);
			this[index].inited = true;
			FD.Form.Progress.set(/*this.name*/);
			if (index % 10 == 0) this.init.delay(this, 0, (index + 1));
			else this.init(index + 1);
		} else {
			if (this.src) {
				this.src = false;
				FD.Form.Stack.Pop();
			}
			FD.Form.setLoading(false);
			FD.Form.Features.next(this, true);
		}
	},

	execAll: function (page) { var l; for (l = 0; l < this.length; l++) { if (!page || page == this[l].page) this[l].exec(); } },
	exec: function (l, e, src, init, thread) {
		var calc = (Object.is(l) ? l : this.search(l)), el = (e ? checkEvent(e) : null);
		if (calc && (init || calc.inited || !FD.Form.isLoading)) {
			if (!thread) thread = 'th' + String.random();
			FD.Form.Stack.Push('calculation', calc.id, calc.name, (src ? src : (el ? el.id : '').append(e ? e.type : '', '.')), thread);
			calc.exec(e, null, thread);
			FD.Form.Stack.Pop();
		}
	}

});

var FDDependencies = new Class({

	Extends: FDExecutablesFeature,
	_class: 'FDDependencies',

	singular: 'dependency',

	limit: 0,
	trial: false,

	_pages: {},

	push: function (dep) {
		if (dep.isPage) this._pages['page' + dep.page] = dep;
		return this.parent.apply(this, arguments);
	},
	execAll: function (page) { var dep; for (dep = 0; dep < this.length; dep++) { if (!page || (!this[dep].isPage && page == this[dep].page)) this[dep].exec(null); } },
	exec: function (l, e, src, thread) {
		var dep = (Object.is(l) ? l : this.search(l)), el = (e ? checkEvent(e) : null);
		if (dep) {
			if (!thread) thread = 'th' + String.random();
			if (!dep.isPage && dep.page > 0 && (!this._pages['page' + dep.page] || !this._pages['page' + dep.page].readonly) && !FD.Form.Pages.checkDisplay(dep.page)) return;
			FD.Form.Stack.Push('dependency', dep.id, dep.name, (src ? src : (el ? el.id : '').append(e ? e.type : '', '.')), thread);
			try { dep.exec(e, null, thread); } catch (e) { FD.Error.reportPlain('id: ' + dep.id + ', name: ' + dep.name + '\r\n' + (e.message || e)); }

			this.log('.exec, rule=' + dep.rule);

			FD.Form.Stack.Pop();
			var lookups = FD.Form.Features.get('lookups');
			if (lookups && lookups.count > 0) lookups.checkLoaders();
		}
	},

	hidden: function (item) {
		if (!FDItem.is(item)) item = FDItems.search(item);
		var dep = this.search(item.id);
		if (dep && dep.rule) return true;
		if (item.page > 0 && !FD.Form.Pages.checkDisplay(item.page)) return true;
		return false;
	},
	isHidden: function () { return this.hidden.apply(this, arguments); }

});

var FDValidation = new Class({

	Extends: FDExecutable,
	_class: 'FDValidation',

	_item: null,

	name: '',
	label: '',
	page: 0,
	accept: true,
	interactive: false,
	soft: true,
	input: [],
	valid: true,
	skip: false,

	initialize: function (options) {
		this.parent(options);
		this.identifier = String.create(this.name.match(/[^\/]*/));
	},

	pre: function (empty) {
		if (!this._item) this._item = FDItems.search(this.identifier);
		return this._owner.pre(this._item, empty);
	},
	check: function () { // type, range or object
		return this._owner.check.apply(this._owner, [this].add(arguments));
	},
	alert: function () {
		return this._owner.alert.apply(this._owner, [this].add(arguments));
	}
});

/* the FDValidations feature is very common, so keep it here */
var FDValidations = new Class({

	Extends: FDExecutablesFeature,
	_class: 'FDValidations',

	_itemClass: FDValidation,

	_trace: true,

	_searchMatch: true,
	isValidating: false,
	advanced: 0,
	limit: 0,
	trial: false,

	_deferred: null,
	funcFinish: '',
	skipped: 0,
	_currentElement: null,

	_thread: '',
	_index: -1,
	_page: -1,
	_base: -1,

	initialize: function (options) {
		this.parent(options);
		if (typeof FD.Form.Pages != 'undefined') {
			FD.Form.addEvent('onBeforeLoad', this.setPageChecks.bind(this));
		}

		var _self = this;
		FD.Form.References.addEvent('onRemove', function () {
			if (this._count <= 0 && _self.queue.length > 0) {
				this.log('.onRemove, calling FD.Form.Validations.queue.exec');
				//try {
					_self.queue.exec();
				//} catch (e) { alert('FD.Form.Validations.queue.exec error=' + (e.message || e)); }
			}
		});
		this.addEvent('onFinish', function (retval) {
			this.log('.onFinish, retval=' + retval);
			if (retval && this.queue.length > 0) this.queue.exec(); else this.queue.clear();
			this._currentElement = null;
		});
	},
	push: function () {
		if (arguments.length == 2 && Boolean.is(arguments[1]) && arguments[1]) {
			if (/\/\d+/.test(arguments[0].name)) this.advanced++;
		}
		return this.parent.apply(this, arguments);
	},
	remove: function (item) {
		if (Number.is(item)) item = this[item];
		if (item && /\/\d+/.test(item.name)) this.advanced--;
		return this.parent(item);
	},
	/*
		l			[object, string, int]	: A validation object or name/id of the validation item
		reset		[boolean]				: Specifies to reset the 'accept' property of the validation item. When 'accept' = true, the invalid input has already been accepted.
		e			[object]				: Event object.
		src			[string]				: Identifies from where this function has been called.
		interactive	[boolean]				: Specifies if the validation is fired from a blur event (users interactivity with the form).
		fromQueue	[boolean]				: Specifies if the validation is fired from the queue.
	*/
	exec: function (l, reset, e, src, thread, interactive, fromQueue) {

		this.log(['.exec, l=' + l + ', src=' + src + ', thread=' + thread, e], 'group');

		var obj = (this._itemClass.is(l) || FDExecutableWrapper.is(l) ? l : this.search(l));
		if (!FD.Validate._skip && obj /*&& !FD.Validate.alerting*/) {
			if (!thread) thread = 'th' + String.random();
			var el = (e ? checkEvent(e) : null);

			if (el && el.readOnly) return this.logEnd(true);
			if (el && FD.Validate.isAlerting() && this._currentElement != el) return this.logEnd(true);
			if (Number.int($(el).attr('fd:type')) == FDItem.DATE && e.relatedTarget && e.relatedTarget.id == el.id + '-button') return this.logEnd(true);

			if (reset) obj.accept = false;
			else if (obj.accept) return this.logEnd(true);

			if ((!fromQueue && FD.Form.References.Count() > 0) || FD.Validate.isAlerting()) {
				e = (e ? cloneEvent(e) : null);
				this.log('.exec, l=' + (l.name || l) + ', src=' + src + ', thread=' + thread + ', QUEUE, ReferenceCount=' + FD.Form.References.Count() + ', isAlerting=' + FD.Validate.isAlerting());
				this.queue.add(obj.name, this.exec.bind(this, obj, reset, e, src, thread, interactive, true));
				return this.logEnd(true);
			}
			
			FD.Form.Stack.Push('validation', 0, obj.name, (src ? src : (el ? el.id : '').append(e ? e.type : '', '.')), thread);
			//try {

				FD.Validate.setInteractive(interactive);
				
				var retval = obj.exec(e, el, thread);
				
				FD.Validate.setInteractive(false);

			//} catch (e) { alert('error validation: ' + (e.message || e) + '\n' + typeof obj.exec + ', ' + (obj instanceof FDExecutableWrapper)); }

			FD.Form.Stack.Pop();

			return this.logEnd(retval);
		}
		return this.logEnd(true);
	},
	setSkip: function (item, skip) {
		if (!String.is(item)) item = FDItems.get(item);
		item = this.search(item);
		if (item) {
			item.skip = skip;
			this.skipped += (skip ? 1 : -1);
		}
	},
	pre: function (item, empty) {
		item = (!FDItem.is(item) ? FDItems.search(item) : item);
		var el = item.element() /*FD.get(item.name)*/, feature;
		if (empty && typeof el.value != 'undefined' && el.value.empty()) return true;
		if ((feature = FD.Form.Features.get('workflow')) && feature.check(item.id, true)) return true;
		if ((feature = FD.Form.Features.get('dependencies'))) return feature.hidden(item);
		return false;
	},
	setPageChecks: function () {
		var i;
		for (i = 0; i < FD.Form.Pages.length; i++) FD.Form.Pages[i].checks = 0;
		for (i = 0; i < this.length; i++) {
			if (this[i]) FD.Form.Pages[this[i].page].checks++;
		}
	},
	check: function (validation, options) {
		if (Number.is(options)) { options = { type: options }; }
		if (arguments.length > 2) options.range = arguments[2];
		return (validation.valid = FD.Validate.CheckValue(validation.name, $.extend(options, { label: validation.label, page: validation.page })));
	},
	alert: function (validation, msg, el, e) {
		if (String.is(validation)) { var name = validation; validation = this.search(validation) || { name: name, label: '' }; }
		var retval = FD.Validate.alert(FDOptions.create({
			event: e || null,
			final: (function (retval) {
				if (retval) {
					if (validation.soft) validation.accept = true;

					/* 14-03-2018
						The code below caused a validation loop in the following situation:
						- text element A
						- numeric element B with a lookup which gets (e.g.) a count of results based on the answer given in element A
						- element A has a validation which checks the answer of element B
							- typing something in element A and leaving the element triggers the lookup
							- after the lookup of element B has finished, the validation of element A gets triggered 
							- when the validation is accepted (retval param = true) the code below called the event function of element A
							- this caused the lookup to get triggered again, then the validation ....

						The reason of the code below is uncertain/unknown. Disabling it solves the problem and seems to have no negative effect.
					*/
					//if (validation.interactive) {
					//	FD.Form.Events.exec(String.create(validation.name.match(/[^\/]*/)), null, el, this._class + '.alert', true);
					//}
				}
			}).bind(this),
			label: (!/\/[\d]/.test(validation.name) ? validation.label : false),
			message: msg || '',
			el_focus: el || String.create(validation.name.match(/[^\/]*/)),
			window: window,
			page: validation.page,
			resetValue: false,
			soft: validation.soft,
			blink: (validation.interactive && e ? 0 : null),
			isFinal: arguments.length <= 2
		}));
		return retval;
	},

	run: function (index, page, base, thread) {

		var init = false, check_page = (Number.is(page) && page > 0), count = (!check_page ? this.length - Number.create(this.skipped) : FD.Form.Pages.getPage(page).checks), progress = FD.Form.Features.get('progress');
		if (arguments.length <= 1 || index < 0) {

			this._deferred = $.Deferred();

			if (FDUri.current.queryExists('noValidations') || this.length == 0) { 
				this.finish(true);
				return this._deferred.promise();
			}

			init = true; this._index = index = 0; this._base = base = 0; this._page = (check_page ? page : -1);
			this._thread = thread = String.threadID();

			this.log('.run, thread=' + thread, 'group');
			
			FD.Validate.setParams({ checkingPage: check_page, final: true });
			if (progress /*&& count >= 4*/) progress.init(count, '', '', FD.Texts.get('Validate.FORM_VALIDATING'), '', true, -1);

			FD.Validate.addEvent('onFinal', (function (retval) {
				String.log('FDValidate.onFinal, retval=' + retval, 'error');
				if (retval == FDValidate.SUCCESS) {
					this.run.delay(this, 0, this._index + 1, (check_page ? this._page : 0), this._base, thread);
				} else {
					// We don't continue running
					FD.Validate.setParams({ reset: true });
					this.finish(retval);
				}
			}).bind(this));

			this.isValidating = true;
		}

		if (init && !FD.Events.FireEvent('BeforeCheckForm', { page: page || 0 }, true /* stop on false return */)) {
			this.finish(false);
			return this._deferred.promise();
		}

		if (init && check_page) {
			while (base < this.length && this[base].page != page) base++;
		}
		this._base = base;
		this._index = index;

		this.log('.run, thread=' + thread + '/' + this._thread + ', base=' + base + '/' + this._base + ', index=' + index + '/' + this._index + ', init=' + init + ', count=' + count + ', page=' + page);

		var check = base + index;
		if (check < this.length) {

			var validation = this[check];
			this.log('.run, name=' + validation.name + ', skip=' + validation.skip + ', page=' + validation.page);
			if (!init && validation.skip) {
				this.log('.run, skip ' + validation.name);
				this.run((index + 1), (check_page ? page : 0), base, thread);
				return this._deferred.promise();
			}
			if (progress && (init || !check_page || validation.page == page)) progress.set();
			if (!init) {
				if (validation && !validation.skip && (validation.page == 0 || (FD.Form.Pages.checkDisplay(validation.page) && (!check_page || validation.page == page))) && !this.exec(validation, false, null, 'FDValidates.run', thread)) return this.finish(false);
				while (!check_page && check < this.length - 1 && this[check + 1].page > 0 && !FD.Form.Pages.checkDisplay(this[check + 1].page)) {
					if (progress) progress.set();
					index++; check++;
					this._index++;
				}
			}
			if (!init && check_page && check < this.length - 1 && this[check + 1].page != page) {
				this.run((index + (init ? 0 : 1)), (check_page ? page : 0), base, thread);
			} else {
				this.run.delay(this, 0, (index + (init ? 0 : 1)), (check_page ? page : 0), base, thread);
			}

		} else {

			if (typeof CustomCheck != 'undefined' && !CustomCheck(page)) {
				this.finish(false);
				return this._deferred.promise();
			}
			if (!FD.Events.FireEvent('AfterCheckForm', { page: page || 0 }, true /* stop on false return */) || !FD.Events.FireEvent('AfterValidateForm', { page: page || 0 }, true)) {
				this.finish(false);
				return this._deferred.promise();
			}
			
			this.log('', 'groupEnd');

			//if (progress) progress.finish();
			this.finish(true);
		}

		return this._deferred.promise();

	},

	// depricating
	finishProgress: function (retval) {
		var progress = FD.Form.Features.get('progress');
		if (progress) progress.finish();

		if (!retval) FD.Form.Submit.Message.Hide();

		return retval;
	},

	finish: function (retval, force) {

		this.log('.finish, retval=' + retval + ', force=' + force + ', isAlerting=' + FD.Validate.isAlerting() + ', hasDeferred=' + this._deferred);

		if (arguments.length == 0) {
			retval = true;
		}
		/*if (retval)*/ this.isValidating = false;

		if (!retval) FD.Form.Submit.Message.Hide();

		/* 
			When the run method finishes it is possible that the validation message waits for user input. 
			In that case the finish function should not be called. This will be done after the user closes the validation message. 
		*/
		if (!FD.Validate.isAlerting() || force) {

			var progress = FD.Form.Features.get('progress');
			if (progress) progress.finish();

			// old way, only when retval = true
			if (retval && this.funcFinish) Function.eval(this.funcFinish);
			/*if (retval)*/ FD.Validate.clearEvents('onFinal');

			if (arguments.length > 0) {
				this.fireEvent('onFinish', [retval]);
			} else {
				this.fireEvent('onFinish');
			}

			if (this._deferred) {
				if (arguments.length == 0 || retval) {
					this.log('.finish, resolving the deferred object');
					this._deferred.resolve(retval);
				} else {
					this.log('.finish, rejecting the deferred object');
					this._deferred.reject();
				}
			}
		}
		// moved to the if statement above; this.fireEvent('onFinish');

		return retval;
	}

});

/* shortcut function to run the validations */
FD.Form.Validate = function () {
	return this.Validations.run.apply(this.Validations, arguments);
};
FD.Form.Validate.finish = function () {
	return this.Validations.finish.apply(this.Validations, arguments);
};

/*	FDXml mimics the behaviour of an Xml document object
	This object is meant to keep the ability to get the form data using ajax
*/
var FDXml = new Class({

	Extends: FDObjects,
	_class: 'FDXml',

	_adding: false,

	firstChild: null,
	push: function () {
		for (var i = 0; i < arguments.length; i++) {
			this.parent(arguments[i]);
		}
		if (!this._adding) this.reindex();
		return this.length;
	},
	add: function (start, items) {
		this._adding = true;
		this.parent(start, items);
		this.reindex();
		this._adding = false;
		return this;
	},
	remove: function (index) {
		this.firstChild = null;
		this[index].nextSibling = null;
		this.splice(index, 1);
		this.reindex(index);
		return this;
	},
	reindex: function (start) {
		this.firstChild = (this.length > 0 ? this[0] : null);
		var node;
		for (var i = start || 0; i < this.length; i++) {
			node = this[i];
			// our own Object.extend uses a to deep cloning of objects which will clone this (ownerDocument)
			// so, just use the jQuery extend
			$.extend(node, FDXml.extended, {
				index: i,
				ownerDocument: this
			});
			if (i > 0) this[i - 1].nextSibling = this[i];
		}
	},
	selectSingleNode: function (nodeName) {
		return this.search('nodeName', nodeName);
	},
	createElement: function (nodeName) {
		return FDXml.extended.createElement(0, 0, nodeName, null);
	}
}).extend({
	extended: {
		index: -1,
		nodeType: 1 /* ELEMENT_NODE */,
		nextSibling: null,
		ownerDocument: null,
		createElement: function (id, type, name, value) {
			return Object.extend({}, this, { id: id, type: type, nodeName: name, firstChild: { nodeValue: value} });
		},
		selectSingleNode: function (nodeName) {
			nodeName = nodeName.replace(/[\/\.]/g, '');
			return (this.firstChild && this.firstChild.nodeName == nodeName ? this.firstChild : (typeof this[name] != 'undefined' && Object.is(this[name]) ? this[name] : null));
		},
		replaceChild: function (newNode, node) {
			if (node.nodeName == 'value') this.firstChild = newNode;
			else this[node.nodeName] = newNode;
		},
		appendChild: function (newNode) {
			if (newNode.nodeName == 'value') this.firstChild = newNode;
			else this[newNode.nodeName] = newNode;
		},
		setAttribute: function (name, value) {
			this[name] = value;
		},
		getAttribute: function (name) {
			return (typeof this[name] != 'undefined' ? this[name] : null);
		}
	}
});

/* depricated */
function FDAjaxArray() {
	var xml = new FDXml();
	if (arguments.length > 0) xml.add(arguments);
	return xml;
}

(function () {
	
	var FDInfo = new Class({
		
		Extends: FDBaseClass,
		Implements: Events,
		_class: 'FDInfo',
		
		id: 0, id_form_visitor: 0, id_form_result: 0, id_visitor: 0,
		action: 0, lang: 0,
		qno: false /* question numbers */, vpp: false /* validate per page */, editable: false, declare_ready: false, editform: false, confirm: false, emailcheck: false, soc: false /* save on close */,
		isReady: false, isAdmin: false /* action = 101 || 102 */, isTesting: false /* querystring param test exists */,
		domain: '', /*label: '/label/formdesk/',*/
		last_page: 0, init_lookup: false,
		
		set: function (info) {
			if (info.id_form_visitor) info.id_form_result = info.id_form_visitor;
			else if (info.id_form_result) info.id_form_visitor = info.id_form_result;
			Object.extend(this, info);

			this.FormResult = new FDFormResult()

			this.fireEvent('onSet');
		},
		Set: function () { this.set.apply(this, arguments); }


	});
	
	// Form will have already been created on the FD namespace. So, just extend this Form instance.
	$.extend(FD.Form, {
		InPdfConverter: false,
		__eventsRecorded: [],
		Info: new FDInfo(),
		init: function () {
			var args = $A(arguments),
				context = (args.length > 0 ? args.shift() : 'general'),
				init = (this['init' + context.proper()] || this.initGeneral);

			init.apply(this, args);

		},
		initForm: function () {

			if (!this._inited) {

				this.log('.initForm, characterSet=' + document.characterSet);

				this.InPdfConverter = typeof hiqPdfConverter != 'undefined';
				if (this.InPdfConverter) {
					$('body').addClass('hiqPdfConverter');
				}

				window.focus();

				this.State.Enable(true);

				addEventHandler(window, 'onbeforeunload', this.OnClose.bind(this));

				var backend = false;
				try { backend = top.FD.isBackend(); } catch (e) { }

				var f = (function (e) {
					var arr = this.__eventsRecorded;
					if (!arr.seek(e.type)) arr.push(e.type);
					$(document).off(e.type + '.record');
				}).bind(this);

				$(document).on('keypress.record', f).on('mousemove.record', f).on('click.record', f);


				FD.Events.attachEvent('AfterSubmitForm', function () {

					if (typeof __ASC__ != 'undefined') $('input[name=txtASC],input[name=_fd_asc]').val(__ASC__);
					var el = $('input[name="__rvtoken__"]');
					if (el.size() > 0) {
						el.prop("name", "__rvtoken");
					}

					try {
						FD.Form.AppendElement('input[type="hidden"]', '_fd_charset', document.charset, false);
						FD.Form.AppendElement('input[type="hidden"]', '_fd_started', FD.Form.getStarted(), false);
						FD.Form.AppendElement('input[type="hidden"]', '_fd_duration', FD.Form.getDuration(), false);
						FD.Form.AppendElement('input[type="hidden"]', '_fd_events', FD.Form.__eventsRecorded.join(', '), false);
					} catch (e) { }

				});

				if (false && !backend) { // disabled yet

					// When a form is loaded within an iFrame and the visitor clicks a (menu)link on the parent page, then the change event is fired. 
					// In Chrome and FF this is unnoticable, but IE will show the alert.

					FDVisibilityChange.addEvent(function (type) {

						this.log('.onChange, type=' + type);

						var eventName = 'beforeunload.visibilitychange' + this.name;

						var f = (function (evt) {

							this.log('.VisibilityChange, isEnabled=' + this.isEnabled);

							if (!this.isEnabled) return;

							var msg = FD.Texts.get('ALERT_CLOSE_FORM');
							evt.returnValue = msg;

							this.log('.VisibilityChange, type=' + type);

							window.setTimeout(function () { FD.Form.Submit.Message.Hide(); }, 1000);

							return msg;

						}).bind(this);

						if (type == 'hidden') {
							$(window).on(eventName, f);
						} else {
							$(window).off(eventName);
						}

					});
				}

				this.addEvent('onBeforeUnload', function () { FD.Form.Submit.Message.Display((window.SendText ? window.SendText : '')); });
				//addEventHandler(window, 'onbeforeunload', function () { FD.Form.Submit.Message.Display((window.SendText ? window.SendText : '')); });
				addEventHandler(FD.get('builder'), 'onreset', function () { FD.Form.Reset.delay(FD.Form, 200); return true; });

				if (FD.Browser.mobile) {
					//FD.Events.AttachEvent('AfterPageChange', function () { var el = FD.get('builder'); alert(FD.Utils.isElementInView(el));  if (!FD.Utils.isElementInView(el)) el.scrollIntoView(true); });
					FD.Events.AttachEvent('AfterLoad', function () { if (typeof FD.Pages != 'undefined') FD.ViewPort.Set(null, FD.Pages.getViewportWidth(), true); else FD.ViewPort.Set(); });
				}


				if (typeof FD.Validate != 'undefined') FD.Validate.Init(false);
				if (typeof __ASC__ != 'undefined') $('input[name=txtASC],input[name=_fd_asc]').val(__ASC__);

				if (this.Params.exists('noinputnote')) $('#trInputNote').hide();
				if (this.Params.exists('nobutton')) $('#trButtons').hide();

				//this.initGeneral();

				this.Data.Fill();
				if ((this.Info.action <= 100 || this.Params.get('r') == '') || this.Params.exists('test') || this.isWorkflowApprover()) { this.Items.setHidden(true); }

				if (typeof CustomOnLoad != 'undefined') FD.Events.AttachEvent('AfterLoad', CustomOnLoad);
				if (this.InPdfConverter) {
					FD.Events.addEvent('AfterLoad', function () {
						window.setTimeout(function () { try { hiqPdfConverter.startConversion(); } catch (e) { } }, 4000);
					});
				}

				if (this.InPdfConverter) {
					//try { hiqPdfConverter.startConversion(); } catch (e) { }
				}

				if (this.Params.get('submit').toLowerCase() == 'auto') {

					var detected = false;
					if (this.Params.get('submitConfirm', false, 'boolean')) {
						$(document).on('mousemove.autosubmit keyup.autosubmit', function () {
							$(document).off('.autosubmit');
							detected = true;
						});
					}

					this.addEvent('onAfterLoad', function () {
						if (this.Params.get('submitConfirm', false, 'boolean') && !detected) {

							$(document).off('.autosubmit');

							FD.Form.Submit.Message.Display(FD.Texts.get('Progress.TITLE_SUBMIT_FORM_SUBMITCONFIRM'));
							$(document).on('mousemove.autosubmit keyup.autosubmit', function () {
								$(document).off('.autosubmit');
								SubmitForm(3);
							});

						} else {

							var arr = FD.Form.__eventsRecorded;
							if (arr.length == 0) arr.push('autosubmit');

							var text = FD.Texts.Progress.get('TITLE_SUBMIT_FORM' + (FD.Form.Info.confirm ? '_CONFIRM' : ''));
							FD.Form.Submit.Message.Display(text);

							SubmitForm(3);

						}
					});
				}

				if (this.Info.editform) {
					this.addEvent(
						'onFinalSubmitForm',
						(function () {
							var submit = FD.Form.Submit;
							if (submit.action == submit.ACTION_SAVE) {
								var index_current = FD.Form.Result.Status.Current().index, index_wfs = FD.Form.Result.Status.Current(FDFormResultStatus.WORKFLOW_STARTED).index
								if (FD.Form.Result.Status.Compare('less-equal', FDFormResultStatus.SAVED) ||
									(FD.Form.isWorkflowApprover() && FD.Form.Result.Status.Compare('equal', FDFormResultStatus.WORKFLOW_STARTED))) {

									$('input:disabled,textarea:disabled,select:disabled').enable({ ignoreEvents: true });

								}
							}
						}).bind(this)
					);
				}

				if (FD.Browser.ie) { //FD.Browser.less('ie', 8, true)) {
					$('input[type="checkbox"],input[type="radio"]').on('mousedown', function (e) { evf(this); });
					$('input[type="checkbox"],input[type="radio"]').each(function () {
						var $el = $(this), onchange = this.onchange, f = function (e) { if (!this.disabled && !this.readOnly) onchange.call(this, e); };
						this.onchange = null;
						$el.on('click.onchange', f).on('keyup.onchange', function (e) { f.delay(this, 10, e); });
						var $label = $('label[for="' + this.id + '"]');
						if ($label.length > 0) $label[0].onmousedown = function (e) { $el.mousedown(); }; //.on('onmousedown', function (e) { $el.mousedown(); });
					});
				}

			} else {
				this.Data.Fill();
				if ((this.Info.action <= 100 || this.Params.get('r') == '') || this.Params.exists('test')) this.Items.setHidden(true);
			}
			this._inited = true;
		},

		Init: function () {
			this.initForm.apply(this, arguments);
		},

		initGeneral: function () {

			this.log('.initGeneral');

			if (typeof WYSIWYG != 'undefined')
				this._inited = true;

			if (this.Params.exists('logout')) {
				window.noForce = this.Params.get('logout', 'true') == 'false';
			}

			var extend = (function (context) {
				Object.extend(context.defaults, { theme: 'form', standalone: true, frontend: true, label: FD.Label.getInfo('all', { path: '/label/system/' }) });
				Object.extend(context.Constants, {
					'iconImages': { STOP: 'warning.svg', EXCLAMATION: 'warning.svg', INFORMATION: 'info.svg' },
					'buttonClasses': { OK: 'ok', YES: 'yes' },
					'buttonImages': { OK: 'checkmark.svg', YES: 'checkmark.svg', ACCEPT: 'checkmark.svg', CONTINUE: 'later.svg', CORRECT: 'pencil2.svg', CLOSE: 'cross.svg', NO: 'cross.svg', CANCEL: 'cross.svg', NEXT: 'checkmark.svg' }
				});

				this.log(['.initGeneral, Window Constants', context.Constants]);

			}).bind(this);
			extend(FD.Window);

			$('[type=radio]').uncheckableRadio();

			/*(function () {
				var f = function (el) {
					if (!el.disabled && !el.readOnly && el.checked) {
						String.log('uncheck'); el.checked = false; $(el).change();
						return true;
					}
					return false;
				};
				$('input[type="radio"]').each(function () {
					var $el = $(this);
					$el.on('click', function (e) { String.log(e); if (f(this)) e.preventDefault(); }).on('keydown', function (e) { if (e.which == 32 && f(this)) e.preventDefault(); }).on('change', function (e) {
						String.log(e.type);
					});
					var $label = $('label[for="' + this.id + '"]');
					if ($label.length > 0) $label.click(function (e) { var $el = $('#' + $(this).attr('for')); if (f($el[0])) e.preventDefault(); String.log('Label, ' +e.type + ', ischecked=' + $el.checked()); }); //$('#' + $(this).attr('for')).click(); });
				});
			})();*/


			/*try {
				if (typeof top.FD.Window != 'undefined') {
					extend(top.FD.Window);
				}
			} catch (e) { alert(e); }*/

			$('html').css('-webkit-text-size-adjust', 'none');
			FDSvg.process();

		},

		initActiveItems: function () {

			this.log('.initActiveItems');

			$('input,textarea,select,.info-tooltip,.calendar-button,.upload-button').on({
				'focus': function (e) {
					var current = FD.Form.Items.fromElement($('.ActiveItem').eq(0));
					if (current) {
						current.setActive(false);
					}
					var item = FD.Form.Items.fromEvent(e);
					if (item) {
						item.setActive(true);
					}
				}/*,
					'blur': function (e) {
						String.log(['blur', e]);
						var item = FD.Form.Items.fromEvent(e);
						if (item) {
							item.setActive(false);
						}
					}*/
			});
			$('input[type="button"]').not('.upload-button').on({
				'focus': function (e) {
					var current = FD.Form.Items.fromElement($('.ActiveItem').eq(0));
					//alert($('.ActiveField').eq(0).length);
					if (current) {
						current.setActive(false);
					}
				}
			})
		},
		Items: null,
		Reset: function () {
			var feature = this.Features.first();
			FD.Form.setLoading(true);
			FD.Events.FireEvent('BeforeLoad');
			if (feature) {
				oProgress.init(nProgressCount, feature.init.bind(feature), 'FD.Events.FireEvent("AfterLoad");FD.Form.setLoading(false);');
			} else {
				FD.Events.FireEvent("AfterLoad");
				FD.Form.setLoading(false);
			}
		},

		show: function () {
			//alert('before show');
			$('#tblForm').fadeIn({ duration: 200, easing: 'swing' });
		},

		OnClose: function (e) {
			var self = FD.Form;
			self.log('.OnClose', 'group');
			if (FD.Events.FireEvent('OnClose')) {
				var msg = self.State.Check(e);
				if (msg != '') {
					self.log('msg=' + msg);
					self.log('.OnClose', 'groupEnd');
					return msg;
				}
			}
			self.fireEvent('onBeforeUnload');
			self.log('.OnClose', 'groupEnd');
		},

		CSS: {
			_keys: {},
			_empty: { css: false, name: '', tag: false },
			Set: function (key, value) {
				var keys = key.split('.');
				if (keys[0] == 'label') keys[0] = 'text';
				if (Object.is(value)) this._keys[keys[0]] = value;
				else {
					if (!this._keys[keys[0]]) this._keys[keys[0]] = $.extend({}, this._empty); //className: '', tag: '' };
					this._keys[keys[0]][keys[1]] = value;
				}
			},
			Get: function (key) {
				var keys = key.split('.'), item = this._keys[keys[0]];
				if (!item) item = this._empty; //return (keys[1].list('css', 'tag') ? false : '');
				return (keys.length > 1 ? item[keys[1]] : item);
			},
			Start: function (key) {
				var item = this.Get(key.split('.')[0]);
				if (!item.css || !item.tag) return '';
				return '<' + item.name + '>';
			},
			End: function (key) {
				var item = this.Get(key.split('.')[0]);
				if (!item.css || !item.tag) return '';
				return '</' + item.name + '>';
			},
			Class: function (key) {
				var item = this.Get(key.split('.')[0]);
				if (item.css && item.tag) return '';
				return ' class="' + item.name + '"';
			}
		},

		Hidden: {
			_items: [],
			_current: false,
			_exec: false,

			Add: function () {
				this._items.push.apply(this._items, arguments);
			},
			Set: function (val) {
				FD.Form.Items.setHidden(val);
				return;
				/*
				FD.Form.log('.Hidden.Set, val=' + val + ', items=' + this._items);
				var item, i, len, el;
				this._exec = true;
				this._current = val;
				for (i = 0, len = this._items.length; i < len; i++) {
					item = FDItems.search(this._items[i]);
					item.setDisplay(val); //FD.Form.setDisp(item.id, item.disp, val);
				}
				this._exec = false;
				*/
			},
			Check: function (id) { return FDItems.search(id).isHidden(); /*return (!this._exec && this._current && this._items.search(id) >= 0);*/ },
			Show: function () { FD.Form.Items.setHidden(false); /*this.Set(false);*/ },
			Hide: function () { FD.Form.Items.setHidden(true); /*this.Set(true);*/ },
			Toggle: function () { FD.Form.Items.setHidden(); /*this.Set(!this._current);*/ }
		},

		getProgressCount: function () {
			this.log('.getProgressCount', 'group');
			for (var count = 0, cnt = 0, i = 0; i < this.Features.order.length; i++) {
				if (typeof this[this.Features.order[i]] != 'undefined') {
					cnt = this[this.Features.order[i]].count();
					this.log('feature=' + this.Features.order[i] + ', count=' + cnt);
					count += cnt;
				}
			}
			this.log('.getProgressCount, count=' + count, 'groupEnd');
			return count;
		},

		Features: {
			mapping: {
				plural: {},
				singular: {}
			},
			order: ['Workflow', 'Lookups', 'Calculations', 'Dependencies', 'Parsers'], // load order
			add: function (feature) {
				FD.Form[feature.name] = feature;
				this.mapping.plural[feature.singular] = feature.plural;
				this.mapping.singular[feature.plural] = feature.singular;
				return feature;
			},
			has: function (feature) {
				if (arguments.length > 0) {
					return (typeof FD.Form[feature.proper()] != 'undefined');
				} else {
					for (var i = 0; i < this.order.length; i++) {
						if (typeof FD.Form[this.order[i]] != 'undefined') return true;
					}
				}
				return false;
			},
			get: function (feature) {
				feature = (this.mapping.plural[feature] || feature).proper(); // make sure the feature name is plural (if applicable) en proper
				return FD.Form[feature] || null;
			},
			first: function (init, src) {
				for (var i = 0, first; i < this.order.length; i++) {
					FD.Form.log('.Features.first, ' + this.order[i] + ', ' + (typeof FD.Form[this.order[i]] != 'undefined'));
					if (typeof FD.Form[this.order[i]] != 'undefined') {
						first = FD.Form[this.order[i]];
						FD.Form.log('.Features.first, first=' + first.name);
						if (init) first.init.delay(first, 0, src || 'FDForm.Features.first');
						return first;
					}
				}
				return ((!init ? new FDExecutablesFeature() : null)); // return an empty feature object
			},
			next: function (current, init) {
				FD.Form.log(['.Features.next, init=' + init + ', current=' + current, current, this.mapping.plural, Object.is(current)]);
				if (Object.is(current) || Array.is(current)) current = current.name;
				else current = (this.mapping.plural[current.toLowerCase()] || current.toLowerCase()).proper();
				for (var i = this.order.search(current) + 1, next; i < this.order.length; i++) {
					if (typeof FD.Form[this.order[i]] != 'undefined') {
						next = FD.Form[this.order[i]];
						FD.Form.log('.Features.next, current=' + current + ', next=' + next.name);
						if (init) next.init.delay(next, 0, current + '.init');
						return next;
					}
				}
				FD.Form.log('.Features.next, current=' + current + ', finished, init=' + init + ', progress=' + typeof FD.Form.Progress);
				if (init && typeof FD.Form.Progress != 'undefined') FD.Form.Progress.finish(true);
				//FD.ViewPort.Set();
				return ((!init ? new FDExecutablesFeature() : null)); // return an empty feature object
			},
			trigger: function (item, e, feature, src) {
				if (feature) feature = (this.mapping.plural[feature] || feature).proper();
				FD.Form.log('.Features.trigger, feature=' + feature);
				for (var i = 0, f; i < this.order.length; i++) {
					FD.Form.log('.Features.trigger, ' + this.order[i] + ', ' + (typeof FD.Form[this.order[i]] != 'undefined'));
					if ((!feature || feature == this.order[i]) && typeof FD.Form[this.order[i]] != 'undefined') {
						f = FD.Form[this.order[i]];
						if (typeof f.exec != 'undefined') {
							f.exec(item.id, e, src || 'FDForm.Features.trigger');
						}
					}
				}
			}
		},

		isWorkflowApprover: function () {
			var feature = this.Features.get('workflow');
			return (feature && feature.isApprover);
		},

		GoTo: function (form, options) {

			FDFormUri.goto(form, options);

		}

	});

	FD.Form.addEvent('onReady', function () { this.init(); }, 0);

	// function to resize the parent iframe
	var f = function () {
		var el = $('#hAlignment');
		if (el.length == 0) el = $('form');
		var width = el.first().width();
		var height = el.first().height();
		try { window.parent.postMessage({ width: width, height: height }, "*"); } catch (e) { }
	};
	$(document).ready(f);
	FD.Events.AttachEvent("AfterProgressVisible", f);
	FD.Events.AttachEvent("AfterPageChange", f);
	FD.Form.addEvent('onAfterLoad', function () {
		f();
		this.log('.onAfterLoad, exists=' + (FD.Form.Events ? 'true' : 'false'));
		if (FD.Form.Events) FD.Form.Events.addEvent('onAfterExecute', f); // form specific FDEvents object

		this.initActiveItems();
	});
	FD.Form.addEvent('onAfterLookup', f);

	var reposition = function () {
		var $table = $('#grid2'), $parent = $table.parent();
		$parent.attr('align', '');
		$table.attr('align', '');

		var marginLeft = ($parent.width() / 2) - ($table.width() / 2);
		var hasI = $('i').length > 0;
		/*if (hasI) {
			String.log('reposition, marginLeft=' + marginLeft + ', ' + $('i').offset().left + ', ' + ($('i').offset().left % 1));
		}*/

		$table.css('marginLeft', Math.round(marginLeft));
		$table.css('marginLeft', Math.round(marginLeft) - (hasI ? $('i').offset().left % 1 : 0));

		this.previousMargin = marginLeft;

	}
	var pre_reposition = function () {
		$('#grid2').parent().attr('align', 'center').end().attr('align', 'center').css('marginLeft', '');
	}

	FD.Form.addEvent('onAfterLoad', function () {

		if (/*FD.Browser.WebKit &&*/ $('#grid2').parent().attr('align') == 'center' && $('i').length > 0) {

			var tmr_resize = 0;
			$(window).resize(function () {
				//String.log('resize');
				//pre_reposition()
				reposition.delay(0);
			});
			reposition();

			$(window).on('beforeToggle', pre_reposition);

		}

	});

})();

var FDFormUri = new Class({

	Extends: FDUri,
	_class: 'FDFormUri',

	initialize: function (form, options) {

		if (!form) {
			form = FDUri.current;
		} else if (FD.Form.Info && FD.Form.Info.domain) {
			form = FD.Form.Info.domain.append(form, '/');
			form = FD.Form.Info.domain.append(form, '/');
		} else {
			form = '/' + FD.getInfo().domain + '/' + form;
		}

		this.parent.appy(this, form, options);

	},
	goto: function (options) {

		if (options && (options.login || (typeof options.logout != 'undefined' && !options.logout))) {
			options.makeSession = true;
			this.querySet('step', 2);
		}
		this.parent.apply(this, options);

	}

}).extend({
	create: function (form, options) {
		return new FDFormUri(form, options);
	},
	goto: function (form, options) {
		this.create(form, options).goto(options);
	}
});

FDUri.extend({
	challenge: function (area, next) {
		return FDUri.getFormUri().setRoute('challenge', { omitFrom: true }).querySet({ area: area, next: next.toString() });
	}
});

var FDReferences = new Class({

	Extends: FDBaseClass,
	Implements: Events,

	_class: 'FDReferences',

	Name: '',
	Items: null,

	_ts: null,
	_count: 0,
	_parent: null,
	_add: null,
	_remove: null,
	_queue: { _keys: [] },
	_trace: false,

	initialize: function (name, events, parent) {

		this.parent();

		this.Name = this.name = name;
		this._parent = parent || null;
		if (events) {
			this.addEvents(events);
		}

		this.Items = new FDKeys();
	},
	Add: function (key) {
		if (this.Items.length == 0) this._ts = new Date();
		var item = this.Items.get(key);
		if (!item) {
			item = { count: 0, ts: new Date() };
			this.Items.set(key, item);
		}
		item.count++; this._count++;
		if (this.Items.length == 0) this._ts = new Date();

		if (this._trace) {
			this.log('.Add, key=' + key + ', count=' + item.count + ', total=' + this._count);
			FD.Debug.trace('FDReferences[' + this.Name + '].Add', 'key=' + key + ', item_count=' + item.count + ', total_count=' + this._count);
		}

		this.fireEvent('onAdd', key);
		if (this._parent) this._parent.Add(key);
	},
	Remove: function (key) {
		try {
			var item = this.Items.get(key);
			if (!item) { this.log('.Remove, key' + key + ' not found!'); FD.Debug.trace('FDReferences[' + this.Name + '].Remove', 'key=' + key + ' not found'); return; }
			item.count--; this._count--;
			var ts = (new Date() - item.ts), total = (this._ts ? (new Date() - this._ts) : 0);
			if (item.count <= 0) this.Items.remove(key);
		} catch (e) { alert('remove 1'); }

		if (this._trace) {
			this.log('.Remove, key=' + key + ', count=' + item.count + ', total=' + this._count + ', time=' + ts + ', total_time=' + total);
			FD.Debug.trace('FDReferences[' + this.Name + '].Remove', 'key=' + key + ', item_count=' + item.count + ', total_count=' + this._count + ', item_time=' + ts + ', total_time=' + total, (total / 1000 > 3 ? 'red' : (ts > 8 ? 'orange' : '')));
		}

		this.fireEvent('onRemove', key);

		if (this._parent) this._parent.Remove(key);
		if (this._count <= 0) {
			while (this._queue._keys.length > 0) {
				key = this._queue._keys.shift();
				this._queue[key]();
				this._queue[key] = null;
			}
			this.Clear();
		}
	},
	Count: function (key) {
		if (!key) return this._count;
		var item = this.Items.get(key);
		return (item ? item.count : 0);
	},
	Clear: function () { this.Items.zap(); this._count = 0; this._ts = null; this._queue = { _keys: []} },
	Queue: function (key, func) {
		if (typeof this._queue[key] == 'undefined' || this._queue[key] == null) {
			this._queue[key] = func;
			this._queue._keys.push(key);
		}
	},
	Format: function (char) {
		var dump = '', i, item;
		char = char || '\n';
		for (i = 0; i < this.Items.length; i++) {
			dump = dump.append(this.Items[i][0] + ': ' + Object.inspect(this.Items[i][1]), char);
		}
		return dump;
	},
	Trace: function (toggle) {
		this._trace = toggle;
	}
});

/*
	http://en.wikipedia.org/wiki/Stack_(abstract_data_type)
	Formdesk uses also a specialized stack to keep track of it's events execution chain. The main function of the stack is to prevents recursive loops and provide detailed information about the execution chain.
	The stack instance created works together with the references object to bridge the synchronous and asynchronous methodologies. Namely, a lookup event can cause an asynchronous ajax after which the lookup steps out of the synchronous execution chain and finishes at a later time.
	Because of it's asynchronous nature the lookup feature itself doen't use the stack, but uses the reference object instead to keep track of it's beginning and ending. Therefor the references object is used to keep track of the beginning and ending of the execution chain independently of synchonous or asynchronous ways.
*/
FDStack = new Class({

	Extends: FDBaseClass,
	Implements: Events,

	_class: 'FDStack',

	_trace: true,
	_traceEvents: false,
	_traceEventsExclude: ['push', 'pop'],

	Name: '',
	Items: null,
	Calls: 0,
	Counter: 0,
	Limit: 400,
	CallLimit: 6000,
	Overflowed: false,

	_items: { _keys: [] },
	_threads: [],
	_ts: null,
	_alerted: false,
	_record: false,

	initialize: function (name, options) {
		this.parent();

		this.Name = this.name = (name || 'default');
		if (options) this.setOptions(options);
		this.Items = new FDObjects();
	},

	Push: function (type, id, name, source, thread) {
		if (this.Overflowed) return;
		var item = { type: type, id: id, name: name, source: source, thread: thread || '', ts: new Date() };
		if (this.Items.length == 0) this._ts = new Date();
		this.Items.push(item);
		var key = name + '.' + type;
		if (!this._items[key]) { this._items[key] = 0; this._items._keys.push(key); }
		this._items[key]++;
		if (this._record) { this.Record.Add(name, type, item); }
		this.Calls++;
		this.Overflowed = this.Overflowed || this.Items.length > this.Limit || this.Calls > this.CallLimit;

		if (this._trace) {
			this.log('.Push, item=' + Object.inspect(item, 'type,id,name,source,thread') + (this.Overflowed ? ', overflowed' : '') + ', items=' + this.Items.length + ', calls=' + this.Calls);
			FD.Debug.trace('FD.Form.Stack.Push', 'index=' + item.index + ', type=' + item.type + ', id=' + item.id + ', name=' + item.name + ', thread=' + thread + ', source=' + item.source + (this.Overflowed ? ', overflowed' : ''));
		}

		this.fireEvent('onPush', item);

		if (this.Overflowed && !this._alerted) {
			var report = this.Report();
			this._alerted = true; /*FD.Debug.trace('FD.Form.Stack.Push', 'ALERT');*/FD.Window.alert.delay(FD.Window, 1000, FD.Texts.sprintf('Stack.MESSAGE', report));
			this.log('.Push, STACK OVERFLOW, Calls=' + this.Calls);
			//message, url, line, source, custom1, custom2, ....
			FD.Error.Send('Stack Overflow!', 'fd_general.js', 1836, 'FD.Form.Stack.Push', report, 'Items=' + this.Items.length, 'Calls=' + this.Calls);
		}
	},
	Pop: function () {
		var item = (this.Items.length > 0 ? item = this.Items.pop() : null), ts = (item ? (new Date() - item.ts) : 0), total = (this._ts ? (new Date() - this._ts) : 0);

		if (this._trace) {
			this.log('.Pop, item=' + (item ? Object.inspect(item, 'type,id,name,source,thread') : 'null') + ', time=' + ts + ', total=' + total + ', items=' + this.Items.length + ', calls=' + this.Calls);
			FD.Debug.trace('FD.Form.Stack.Pop', 'length=' + this.Items.length + (item ? ', type=' + item.type + ', id=' + item.id + ', name=' + item.name + ', thread=' + item.thread + ', source=' + item.source + ', time=' + ts + ', total=' + total + ', index=' + item.index : '(no item)'), (total / 1000 > 3 ? 'red' : (ts > 8 ? 'orange' : '')));
		}

		if (item) this.fireEvent('onPop', item);

		if (this.Items.length == 0 && typeof FD.Form.Events != 'undefined' && (!this.options || !this.options.referenced)) {
			this.Reset();
		}
		return item;
	},
	Trace: function (toggle) {
		this._trace = toggle;
		//FD.Debug.trace('FD.Form.Stack.Trace', 'val=' + val + ', length=' + this.Items.length);
	},
	Count: function (key) { return (!key ? this.Items.length : this._items[key] || 0) },
	Zap: function () { this.Overflowed = false; this.Items.zap(); this.Calls = 0; this._items = { _keys: [] }; },
	Clear: function () { this.Zap(); },
	Reset: function () {
		if (typeof FD.Form.Events != 'undefined') FD.Form.Events.event = null;
		if (!this._record) { this.log('.Reset, reset Calls to zero (' + this.Calls + ')'); this.Calls = 0; }
		else this.Record.Report();
		this._items = { _keys: [] };
		this.fireEvent('onAfterReset');
		this.fireEvent('onReset');
	},
	Format: function (char) {
		var dump = '', i, item;
		char = char || '\n';
		for (i = 0; i < this.Items.length; i++) {
			item = this.Items[i];
			dump = dump.append((i + 1) + ': ' + Object.inspect(item), char);
		}
		return dump;
	},
	Report: function () {
		var report = '<br><style type="text\/css">.fdstack td, .fdstack th { font-family: arial; font-size: 9pt; color: Black; text-align: left; padding: 4px; } .fdstack th, .fdstack td { border-bottom: 1px dotted silver; border-left: 1px dotted silver; } .fdstack .fdfirst { border-left: none !important; } .fdstack .fdlast td { border-bottom: none !important; }<\/style><table class="fdstack" cellpadding="0" cellspacing="0"><tr><th class="fdfirst">' + FD.Texts.get('Stack.IDENTIFIER') + '<\/th><th>' + FD.Texts.get('Stack.POSITION') + '<\/th><th>' + FD.Texts.get('Stack.TYPES') + '<\/th><\/tr>\n';
		var items = [], fld, i, index, type;
		for (i = 0; i < this.Items.length; i++) {
			fld = aFields.search(this.Items[i].id);
			//FD.Debug.trace('Stack.Report', 'i=' + i + ', type=' + this.Items[i].type + ', fld=' + fld);
			if (this.Items[i].type != 'event' && fld && fld.name) {
				index = items.search(fld.name, true, 0);
				type = FD.Texts.get('Stack.' + this.Items[i].type.toUpperCase());
				//FD.Debug.trace('Stack.Report', 'index=' + index + ', type=' + type + ', fld=' + fld.name + ', fdl.index=' + fld.index);
				if (index > -1) { if (!items[index][2].seek(type)) items[index][2].push(type); }
				else {
					items.push([fld.name, String.create(fld.index), [type]]);
					//FD.Debug.trace('Stack.Report', 'pushed: ' + items[items.length-1]);
				}
			}
		}
		for (i = 0; i < Math.min(items.length, 10); i++) {
			report += '<tr ' + (i == items.length - 1 ? ' class="fdlast"' : '') + '><td class="fdfirst">' + items[i][0] + '<\/td><td>' + items[i][1] + '<\/td><td>' + items[i][2].join(', ') + '<\/td><\/tr>\n';
		}
		if (i < items.length) {
			report += '<tr class="fdlast"><td class="fdfirst" colspan="3">...<\/td><\/tr>\n';
		}
		return report + '<\/table>';
	},
	Record: {
		_stack: [], _items: { _keys: [] }, _types: { _keys: [] },
		Start: function () {
			FD.Form.Stack.Zap();
			FD.Form.Stack._record = true;
		},
		Stop: function () {
			this._stack = [];
			this._items = { _keys: [] };
			this._types = { _keys: [] };
			FD.Form.Stack._record = false;
			FD.Form.Stack.Zap();
		},
		Add: function (name, type, item) {
			if (this._stack.length > 6000) return;
			var key = name + '.' + type;
			if (!this._types[type]) { this._types[type] = 0; this._types._keys.push(type); }
			this._types[type]++;
			if (!this._items[key]) { this._items[key] = 0; this._items._keys.push(key); }
			this._items[key]++;
			item.level = item.index;
			this._stack.push(item);
		},
		Exec: function (fld, value) {
			this.Start();
			var e = { type: 'blur' }, el = FD.get(fld);
			if (typeof value != 'undefined') el.value = value;
			el = e.srcElement = e.target = (typeof el[0] != 'undefined' ? el[0] : el);
			aEvents.exec(el.name, e);
		},
		Report: function () {
			var record = '', i, k = 1, self = FD.Form.Stack, item;
			record = '<h2>Statistics<\/h2><h3>Event Types<\/h3><table cellspacing="0"><colgroup><col style="background-color:#e6e6e6"><col><\/colgroup>\n<tr><th>Type<\/th><th>Callcount<\/th><\/tr>\n';
			for (i = 0; i < this._types._keys.length; i++) {
				record += '<tr><td>' + this._types._keys[i] + '<\/td><td>' + this._types[this._types._keys[i]] + '<\/td><\/tr>\n';
			}
			record += '<\/table>\n';
			record += '<h3>Item Events<\/h3><table cellspacing="0"><colgroup><col style="background-color:#e6e6e6"><col><\/colgroup>\n<tr><th>Identfifier / Type<\/th><th>Callcount<\/th><\/tr>\n';
			for (i = 0; i < this._items._keys.length; i++) {
				record += '<tr><td>' + this._items._keys[i] + '<\/td><td>' + this._items[this._items._keys[i]] + '<\/td><\/tr>\n';
			}
			record += '<\/table>\n';
			record += '<h2>Call Stack<\/h2><table cellspacing="0"><tr><th>#<\/th><th>Call<\/th><th>Level<\/th><\/tr>\n';
			for (i = 0; i < this._stack.length; i++) {
				item = this._stack[i];
				record += '<tr' + (k == 1 ? ' style="background-color:#e6e6e6"' : '') + '><td>' + i + '<\/td><td class="stack">' + (item.level > 0 ? '|'.times(item.level - 1) + '-' : '-') + item.name + '.' + item.type + '<\/td><td>' + item.level + '<\/td><\/tr>\n';
				k *= -1;
			}
			record += '<\/table>\n';
			this.Stop();
			var wnd = window.open('/empty.htm');
			wnd.document.write('<html><style type="text\/css">td, th { font-size: 10pt; font-family: arial; padding: 4px; text-align: left } .stack { font-family:courier new; letter-spacing: 1px; }<\/style><head><\/head><body>' + record + '<\/body><\/html>');
		}
	}
});

$.extend(FD.Form, {
	Stack: new FDStack('Form', { referenced: true, onPush: function (item) { FD.Form.References.Add('STACK/' + item.type); }, onPop: function (item) { FD.Form.References.Remove('STACK/' + item.type); } }),
	References: new FDReferences(
		'Form', {
			onRemove: function () {
				if (this._count <= 0) {
					FD.Form.Stack.Reset();
				}
			}
		}
	)
});

var FDData = new Class({

	Extends: FDBaseClass,
	Implements: Events,
	_class: 'FDData',

	_mode: 0, // 0 = array, 1 = ajax, not used at the moment
	_values: null,

	initialize: function () {
		this.parent();
		this._values = new FDXml();
	},

	Add: function () {
		this._values.push.apply(this._values, arguments);
	},
	Fill: function (node) {

		this.log('.Fill');

		this.fireEvent('onBeforeFill');
		FD.Events.FireEvent('BeforeDataFill');

		FD.Input.Log.Add('FD.Form.Data.Fill: tsep=' + Number.tsep + ', dsep=' + Number.dsep);

		var child = (node ? node.firstChild : this._values.firstChild), els, el, val, vals, type, i, option, alt;
		while (child) {
			if (child.nodeType == 1 /* ELEMENT_NODE */) {
				this.setValue(child);
			}
			child = child.nextSibling;
		}

		this.fireEvent('onAfterFill');
		FD.Events.FireEvent('AfterDataFill');
	},

	///-------------------------------------------------------------------------------------------------
	/// <summary> Sets the value of the form item/element from a data structure node. </summary>
	/// <param name="node">
	///		The Xml like node (Object) or 
	///		the name (String) of the specific node which is the name/identifier of the form item/element. 
	/// </param>
	///-------------------------------------------------------------------------------------------------
	setValue: function (node) {
		if (String.is(node)) node = this._values.selectSingleNode(node);
		else if (FDItem.is(node)) node = this._values.selectSingleNode(node.name);
		if (!node) return;

		var item = FDItems.search(node.nodeName), el = item.$(), type = item.type;
		if (type == FDItems.FILE && el.length == 0 && FD.get('hd' + item.name)) {
			el.push(FD.get('hd' + item.name));
		}
		if (el.length > 0) {
			var val = node.firstChild ? node.firstChild.nodeValue || node.firstChild.firstChild || '' : '', i, len = el.length;
			if (type.list(FDItem.SELECT, FDItem.USERLIST)) { // select
				el[0].selectedIndex = -1;
				if (type == FDItem.USERLIST) {
					el[0].length = 0;
					for (i = 0; i < val.length; i++) {
						option = addOption(null, el[0], unescape(val[i][0]), unescape(val[i][1]));
						if (val[i][2]) option.selected = true;
					}
				} else {
					val = unescape((Object.is(val) ? this.getNodeValue(val, 'values') : val));
					for (i = 0; i < el[0].length; i++) {
						if (el[0].options[i].value == val || el[0].options[i].text.toLowerCase() == val.toLowerCase()) {
							el[0].selectedIndex = i;
							break;
						}
					}
					if (el[0].length == 0) {
						option = addOption(null, el[0], val, val);
						option.selected = true;
					}
				}
				$(el[0]).data('origValue', el[0].value);
			
			} else if (type == FDItem.CHECKBOX) { // a single checkbox //tagname == 'input' && /^(radio|checkbox)$/.test((el[0].type ? el[0].type.toLowerCase() : ''))) { 
				if (typeof val == 'object') {
					val = this.getNodeValue(val, 'values');
					el[0].checked = el[0].value == unescape(val);
				} else {
					el[0].checked = (Number.int(val) == 1 || val.toType('boolean'));
				}
				$(el[0]).data('origValue', el[0].checked);
			
			} else if (type == FDItem.FILE) { // file
				//el = FD.get('upl_' + item.name + '_readonly_content');
				//el.innerHTML = unescape(val);
				FD.Upload.setValue(item.name, unescape(val));
//				FD.Utils.doFile(item.name, (val.empty() ? 0 : 2));
			
			} else if (type == FDItem.TEXTAREA && FD.Browser.safari && FD.Browser.version < 522 && typeof el[0].innerHTML != 'undefined') { // textarea, lower versions of safari
				el[0].innerHTML = unescape(val);
			
			} else if (type.list(FDItem.NUMERIC, FDItem.CALCULATION)) { // numeric and calculation
				el[0].fillInput = true;
				el[0].value = FD.Input.Format(el[0], unescape(val), false, null, true);
				$(el[0]).data('origValue', el[0].value);
			
			} else if (type.list(FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) { // it's an checkbox- or radiogroup
				var vals = unescape(this.getNodeValue(val, 'values', '')).split('<=>'), chk, cnt = 0;

				for (i = 0; i < el.length; i++) {
					if (typeof el[i].value == 'undefined') continue;
					if (vals.seek(el[i].value)) {
						el[i].checked = true;
						cnt++;
					} else {
						el[i].checked = false;
					}
					$(el[i]).data('origValue', el[i].checked);
				}
				
				var alt = unescape(this.getNodeValue(val, 'alt', ''));
				if (alt) {
					FD.get('alt' + item.name).value = alt;
					el[el.length - 1].checked = true;
					$(el[el.length - 1]).data('origValue', true);
					FD.Alt.Check(item.name);
				}
				if (type == FDItem.RADIOGROUP) {
					chk = $('[name="' + item.name + '"]:checked');
					for (i = 0; i < len; i++) {
						$(el[i]).data('origValue', chk);
					}
				}
			} else {
				el[0].value = unescape(val);
				$(el[0]).data('origValue', el[0].value);
			}
			/*} else if ( type == 22 fckeditor  ) {
			val = node.firstChild ? node.firstChild.nodeValue : '' ;
			fdEdts[ node.nodeName ].SetData( val ) ; */

		} else if (type.list(FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) { // options from a lookup where the lookup has not been initialized yet
			var val = node.firstChild ? node.firstChild.nodeValue || node.firstChild.firstChild || '' : '', 
				vals = unescape(this.getNodeValue(val, 'values', '')).split('<=>'), 
				name = node.nodeName, 
				id = node.getAttribute('id'), tr, td, elem;
			
			FDItems.createOptions(item, vals);
			
			/*el = document.getElementById(node.nodeName); // be sure to get the table reference
			for (var i = 0, j = 1; i < vals.length; i++, j++) {
				tr = el.insertRow(el.rows.length);
				td = tr.insertCell(tr.cells.length);
				td.vAlign = 'middle';
				elem = '<input type="' + (type == 5 ? 'checkbox' : 'radio') + '" name="' + name + '"';
				elem += ' id="' + name + 'opt' + j + '" value="' + vals[i].encodeEntities() + '" fdId="' + id + '"';
				elem += ' onclick="ev(' + id + ',event,this)" checked="true">';
				td.innerHTML = elem;
				td = tr.insertCell(tr.cells.length);
				td.innerHTML = '&nbsp;';
				td = tr.insertCell(tr.cells.length);
				td.innerHTML = '<label for="' + name + 'opt' + j + '">' + vals[i].encodeEntities() + '&nbsp;</label>';
			}*/
		}
	},

	///-------------------------------------------------------------------------------------------------
	/// <summary> Gets a value of the data structure. </summary>
	///
	/// <param name="item">	FDItem (Object), the item name (String) or item id (Number). </param>
	/// <param name="org">
	///		Specifies to get the original stored value.
	///		When a value is passed using a def_... url parameter the passed value is used instead of the stored value. The original stored value is placed into an orgValue attribute of the specific node.
	/// </param>
	///
	/// <returns> String or Array </returns>
	///-------------------------------------------------------------------------------------------------

	getValue: function (item, org) {
		var item_org = item;
		if (!FDItem.is(item)) item = FDItems.search(item);
		if (!item) {
			this.log('.getValue, item "' + item_org + '" not found!', 'error');
			return '';
		}
		var value = '', el = item.$(), type = item.type;

		if (el.length > 0) {
			var node = this._values.selectSingleNode(item.name) /*, type = (node ? Number.int(node.getAttribute('type')) : 0) */, val = null;
			if (node) {
				if (!org) val = (node.firstChild ? node.firstChild.nodeValue || node.firstChild.firstChild : '');
				else {
					val = node.selectSingleNode('orgValue');
					val = (val ? val.nodeValue || val.firstChild : null);
				}
			}
			if (type.list(FDItem.SELECT, FDItem.USERLIST)) { // tagname == 'select'
				if (!node || value == null) {
					value = '';
				} else if (type == FDItem.USERLIST) {
					for (i = 0; i < val.length; i++) {
						if (val[i][2]) {
							value = unescape(val[i][0]);
							break;
						}
					}
				} else {
					value = unescape(this.getNodeValue(val, 'values'));
				}
			} else if (el.length == 1 && type.list(FDItem.CHECKBOX, FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) { // in case the group has only one option defined
				if (!node || value == null) {
					value = false;
				} else if (typeof val == 'object') {
					val = this.getNodeValue(val, 'values');
					value = el[0].value == unescape(val);
				} else {
					value = (val == 1 || val.toType('boolean'));
				}
			} else if (type.list(FDItem.CHECKBOXGROUP, FDItem.RADIOGROUP)) {
				value = [];
				if (node && val) {
					value = unescape(this.getNodeValue(val, 'values', '')).split('<=>'); // ',' + unescape(this.getNodeValue(val, 'values', '')) + ',';
					alt = unescape(this.getNodeValue(val, 'alt', ''));
					if (alt) {
						value.push(alt);
					}
				}
			} else {
				value = (val !== null ? unescape(val) : '');
			}
		} else {
			alert('Error el=' + el);
		}

		return value;
	},
	getValueFrom: function (nodeName) {
		var node = this._values.selectSingleNode(nodeName);
		return (node ? Number.create(node.getAttribute('valueFrom')) : 0);
	},
	getNodeValue: function (node, nodeName, alt) {
		if (this._mode) return FD.Ajax.getNodeValue(node, nodeName, alt);
		return (node && typeof node[nodeName] != 'undefined' ? (Object.is(node[nodeName]) ? node[nodeName].nodeValue : node[nodeName]) : (alt ? alt : ''));
	},
	setNodeValue: function (nodeName) {
		var fld = FDItems.search(nodeName), node = this._values.selectSingleNode(nodeName);
		if (!fld) return;
		var newval = FD.Form.Items.value(nodeName, FDItems.NODE, this._values);
		if (!node) { // add a new node to the value structure
			node = this._values.createElement(fld.name);
			node.setAttribute('id', fld.id);
			node.setAttribute('type', fld.type);
		}
		var value = node.selectSingleNode('.//value');
		if (value) node.replaceChild(newval, value);
		node.appendChild(newval);
	}
});
FD.Form.Data = new FDData();


var FDState = new Class({

	Extends: FDBaseClass,

	_class: 'FDState',

	isChanged: false,
	isStatic: false,
	Active: true,
	_text: '',

	createProxies: function () {
		this.parent({
			change: this.Change.bind(this)
		});
	},

	setText: function (text) {
		this._text = text;
	},
	Enable: function (init) {
		window.isChanged = this.isChanged;
		//alert(window.noState);
		if (/*!init || */typeof window.noState == 'undefined') {
			window.noState = !(this.Active = true);
		}
		if (!this.isStatic) {
			addEventHandler(document, 'onkeydown', this._proxy.change);
			addEventHandler(document, 'onclick', this._proxy.change);
		}
		this.log('.Enable');
	},
	Static: function () {
		this.isStatic = true;
		this.Enable();
	},
	Disable: function () {
		window.noState = !(this.Active = false);
		this.log('.Disable');
		this.Stop();
	},
	Change: function (e, lpForce) {
		e = e || window.event;
		if (e && e.keyCode == 116) this.Disable();
		if (this.isChanged) return;
		if (e) {
			var el = checkEvent(e);
			if (!el || typeof el.tagName == 'undefined') return;
			if (e.type == 'click') {
				if (el.tagName.toUpperCase() == 'SELECT') {
					if (typeof el.oldValue == 'undefined') {
						el.oldValue = el.value;
						return;
					} else if (el.oldValue == el.value) return;
					el.oldValue = el.value;
				} else {
					var el_org = el;
					try {
						el = FD.Utils.checkLabel(el);
						if (!el || typeof el.tagName == 'undefined' || el.tagName.toUpperCase() != 'INPUT' || !el.type.list('checkbox', 'radio')) return;
					} catch (e) {
						// message, url, line, source, custom1, custom2, ....
						FD.Error.Send(e, 'fd_general.js', 2559, 'FD.Form.State.Change', 'el_org=' + Object.inspect(el_org, ['name', 'tagName', 'type', 'htmlFor']) + ', el=' + Object.inspect(el));
						return;
					}
				}
			}
			try {
				if (e.type == 'keydown' && (!el.tagName.list('INPUT', 'TEXTAREA', 'SELECT') || (typeof e.keyCode != 'undefined' && (e.keyCode.list(9, 16, 17, 18, 33, 34, 35, 36, 37, 39) || e.keyCode.between(112, 123))))) return;
			} catch (e) {
				// message, url, line, source, custom1, custom2, ....
				FD.Error.Send(e, 'fd_general.js', 2560, 'FD.Form.State.Change', 'el_org=' + Object.inspect(el_org, ['name', 'tagName', 'type', 'htmlFor']) + ', el=' + Object.inspect(el));
				return;
			}
		}
		if (FD.Events.FireEvent('OnStateChange', e)) {
			this.log('.Change');
			this.isChanged = window.isChanged = true;
			this.Stop();
		}
	},
	Stop: function () {
		removeEventHandler(document, 'onkeydown', this._proxy.change);
		removeEventHandler(document, 'onclick', this._proxy.change);
		this.log('.Stop');
	},
	Check: function (e) {
		if (!window.Submitted && (this.isChanged || window.isChanged || this.isStatic)) {
			if (!FD.Form.Info.soc /*save on close*/) {
				if (this.Active && !window.noState) {
					this.log('.Check, alert!');
					e.returnValue = e.message = (this._text ? this._text : this.getText('ALERT_CANCEL_FORM'));
				}
				return e.message || '';
			} else {
				this.log('.Check, silentSubmit');
				FD.Form.silentSubmit(true);
			}
		}
		return '';
	}
});
FD.Form.State = new FDState();

FD.Form.Submit = function (action, text, wait, elform, elmsg) {
	var self = FD.Form.Submit;

	self.action = action;
	self._uri = null;

	self._ignored = self._rolledback = false;
	self.setError();
	self._dt = new Date();

	if (!this.fireDecision('onSubmit', [action || 0])) return false;

	FD.Events.FireEvent('AfterSubmitForm', { action: action || 0 });

	//window.onerror = null;
	if (text) self.Message.setText(unescape(text));
	self.Message.Display(text, elform, elmsg);
	self._delay = FD.Form.Submit.Message.Display.delay(FD.Form.Submit.Message, 2000, (FD.Texts.Progress.get('WAIT_CONNECTION') + ' (' + FD.Form.Submit.Ping.GetLinks() + ')'));

	if (!Boolean.is(wait)) wait = true;
	try {
		if (typeof AJAX == 'undefined' || !FD.Ajax.checkEnabled()) wait = false;
	} catch (e) { wait = false; }
	if (wait) {
		try { self.Ping.Init.delay(100, wait); } catch (e) { self.Final(); }
	} else {
		self.Final();
	}
};
Object.extend(FD.Form.Submit, {
	errors: null,
	_dt: null,
	_delay: 0,
	_uri: null,

	ACTION_SAVE: 1,
	ACTION_CANCEL: 2,
	ACTION_READY: 3,

	getErrorMessages: function (encoded) {
		return (this.errors ? this.errors.toString(encoded, '\r\n') : '');
	},
	setError: function (source, error, line) {
		if (arguments.length == 0) this.errors = new FDLog();
		else {
			this.errors.add(source, error, line);
		}
	},
	Go: function (uri, text, wait, elform, elmsg) {
		
		var self = FD.Form.Submit;
		self._uri = uri;

		self._ignored = self._rolledback = false;
		self.setError();
		self._dt = new Date();

		if (!FD.Form.fireDecision('onGo', [uri])) return false;

		//window.onerror = null;
		if (text) self.Message.setText(unescape(text));
		self.Message.Display(text, elform, elmsg);
		self._delay = FD.Form.Submit.Message.Display.delay(FD.Form.Submit.Message, 2000, (FD.Texts.Progress.get('WAIT_CONNECTION') + ' (' + FD.Form.Submit.Ping.GetLinks() + ')'));

		if (!Boolean.is(wait)) wait = true;
		try {
			if (typeof AJAX == 'undefined' || !FD.Ajax.checkEnabled()) wait = false;
		} catch (e) { wait = false; }
		if (wait) {
			try { self.Ping.Init.delay(100, wait, { final: self.FinalGo, ignore: self.FinalGo }); } catch (e) { self.FinalGo(); }
		} else {
			self.FinalGo();
		}
	},
	CancelDelay: function () {
		if (this._delay > 0) {
			window.clearTimeout(this._delay);
			this._delay = 0;
		}
	},
	Ping: function () {
		try {
			var submit = FD.Form.Submit, self = submit.Ping;
			if (!self._cnt) self._cnt = 1; else self._cnt++;
			if (!self._calls) self._calls = 1; else self._calls++;
			if (self._cnt > self._max) {
				submit.Rollback(FD.Texts.Error.sprintf('ERROR_FORM_CONNECTION', FD.Form.Ping._statusText));
			} else {
				submit.Message.Display(FD.Texts.Progress.get('WAIT_CONNECTION') + submit.Ping.GetCounter());
				self._tmr = window.setTimeout(FD.Form.Ping, self._wait);
			}
		} catch (e) {
			submit.setError('FD.Form.Submit.Ping', e, 1688);
			if (submit._uri) {
				submit.FinalGo();
			} else {
				submit.Ignore();
			}
		}
	},
	Final: function () {
		FD.Form.Submit.Ping.Clear();
		try {
			FD.Form.Submit.Message.Display();
			if (FD.Form.Ping._cnt > 0) {
				FD.Form.Action.Set({ 'spc' /*submit ping count*/: FD.Form.Ping._cnt }); // this is not the FD.Form.Submit.Ping._cnt but the total count of pings from the FD.Form.Ping
			}
			try {
				log = FD.Form.Submit.getErrorMessages().append(FD.Ajax.getErrorMessage(), '\r\n');
				if (log && (FD.Form.Ping._cnt > 0 || FD.Ajax.error)) {
					FD.Form.AppendElement('input[type="hidden"]', '_fd_submit_log', log);
					FD.Form.Action.Set({ 'perrors': true });
				}
			} catch (e) { FD.Form.Action.Set(['ferror', (e.message || e)]); }
			window.Submitted = true;

			// log the method/verb in the querystring for debugging
			//FD.Form.Action.Set({ '__method': document.builder.method });

			FD.Form.fireEvent('onFinalSubmitForm');
			FD.Events.FireEvent('FinalSubmitForm');

			document.builder.submit();

		} catch (e) {
			FD.Form.Submit.Rollback(FD.Texts.Error.get('ERROR_FORM_SUBMIT') + "\r\n\r\n" + (e && typeof e.message != 'undefined' ? e.message : e));
		}
	},
	FinalGo: function () {
		window.Submitted = true;
		FD.Form.Submit.Ping.Clear();
		FD.Form.Submit.Message.Display();
		document.location = FD.Form.Submit._uri.toString();
	},
	Rollback: function (msg) {

		var submit = FD.Form.Submit, log = '', s = -1;
		if (submit._ignored) return;

		submit._rolledback = true;
		submit.Message.Hide(); /* hide the submit message and show the form again */

		FD.Input.Reverse(null, true); /* reverse the input formating back to be representive */

		/* submit rollback count */
		if (submit._src) submit._src++
		else submit._src = 1;

		try { s = (new Date()) - FD.Form.Submit._dt } catch (e) { }
		try {
			FD.Form.Submit.setError('FD.Form.Submit.Rollback', 'time=' + s + ', pingcount=' + FD.Form.Ping._cnt + ', readyState=' + FD.Form.Ping._readyState + ', statusCode=' + FD.Form.Ping._status + ', statusText=' + FD.Form.Ping._statusText, 2062);
			log = FD.Form.Submit.getErrorMessages().append(FD.Ajax.getErrorMessage(), '\r\n');
			FD.Form.AppendElement('input[type="hidden"]', '_fd_submit_log', log);
		} catch (e) { }

		FD.Form.Action.Set({ 'src' /*submit rollback count*/: submit._src, 'prcnt': FD.Form.Ping._cnt, 'prstate': FD.Form.Ping._readyState, 'prcode': FD.Form.Ping._status, 'prtext': FD.Form.Ping._statusText, 'prerrors': log.length > 0 });
		submit.Ping.Clear();
		window.Submitted = false;

		if (String.is(msg)) alert(msg);

	},
	Ignore: function (manual) {
		var submit = FD.Form.Submit, s = -1, log = '';
		if (submit._rolledback) return;
		submit._ignored = true;

		/* submit ignore count */
		if (submit._sic) submit._sic++
		else submit._sic = 1;

		try { s = (new Date()) - FD.Form.Submit._dt } catch (e) { }
		try {
			FD.Form.Submit.setError('FD.Form.Submit.Ignore', 'manual=' + (manual || false) + ', time=' + s + ', pingcount=' + FD.Form.Ping._cnt + ', readyState=' + FD.Form.Ping._readyState + ', statusCode=' + FD.Form.Ping._status + ', statusText=' + FD.Form.Ping._statusText, 2062);
			FD.Form.AppendElement('input[type="hidden"]', '_fd_ajax_log', (FD.Form.Ping._data ? FD.Form.Ping._data.getLog() : '<no data object>'));
		} catch (e) { }

		FD.Form.Action.Set({ 'sim' /* submit ignore manual */: manual || false, 'sic' /*submit ignore count*/: submit._sic, 'pcnt': FD.Form.Ping._cnt, 'pstate': FD.Form.Ping._readyState, 'pcode': FD.Form.Ping._status, 'ptext': FD.Form.Ping._statusText, 'preq': typeof (FD.Form.Ping._req) != 'undefined', 'stime': s });
		submit.Final();
	},
	Message: {
		_displayText: '', _form: null, _msg: null, _text: null, _hidden: true, _progress: null,
		setText: function (text) { this._displayText = text; },
		Set: function (text) {
			
			var waitText = FD.Texts.get('Progress.WAIT');
			if (!/\<strong\>/.test(waitText)) waitText = '<strong>' + waitText + '</strong>';
			
			htmlText = FD.Form.CSS.Start('text.tag') + (text || this._displayText) + '<br>' + waitText + FD.Form.CSS.End('text.tag');
			
			if (this._text) {
				this._text.html(htmlText);
			} else {
				FD.Window.showLoader({ theme: 'form', text: htmlText, image: '/label/system/images/loader_gray.gif?v' + FD.getAssets().img, onclick: FD.Form.Submit.Rollback.bind(FD.Form.Submit) });
			}
			
			//$('body').attr('aria-label', (text || this._displayText) + ' - ' + FD.Texts.get('Progress.WAIT'));
				
		},
		Display: function (text, elform, elmsg) {
			
			FD.Form.Submit.CancelDelay();
			
			text = text || this._displayText || window.SendText; // || FD.Texts.get('Progress.TITLE_LOAD_FORM');
			
			if (elform || !this._form) {
				this._form = $('#' + (elform || 'tblForm'));
				if (!this._form || this._form.length == 0) this._form = $('#tblBody');
			}
			
			if (elmsg || !this._msg) {
				
				this._msg = $('#' + (elmsg || 'tblSend'));
				if (!this._msg || this._msg.length == 0) this.Create();
				
				this._text = this._msg.find('.progress-message-text,#tdSend').attr('role', 'status');
				
			}
			if (true /*text*/) {
				
				this.Set(text);
				
				if (this._form && this._msg) {
					this._form.hide();
					this._msg.show();
					$(window).triggerHandler('resize');
				}
				this._hidden = false;
			}
			if (this._msg) {
				var el = this._msg.get(0);
				if (!FD.Utils.isElementInView(el) && el.scrollIntoView) el.scrollIntoView(true);
			}
		},
		Hide: function () {
			
			FD.Form.Submit.CancelDelay();
			
			this.setText('');

			if (this._form && this._msg) {
				this._form.show();
				this._msg.hide();
			}
			
			$('body')
				.attr('aria-busy', false)
				.attr('aria-label', null);
			
			if (!this._msg && FD.Window) {
				var loader = FD.Window.getLoader(true); // dont create if not present
				if (loader) loader.update({ text: '' }).hide();
			}
			$(window).triggerHandler('resize');
			this._hidden = true;
		},
		Create: function () {
			$(this._form).after(
				'<table id="tblSend" style="width:100%;height:98%;display:none" class="progress-theme-form progress-message" role="presentation none"><tr><td align="center" valign="middle"><table role="presentation none"><tr><td id="tdSend" align="center" style="text-align:center"' + FD.Form.CSS.Class('text') + '></td></tr></table></td></tr></table>'
			);
			this._msg = $('#tblSend');
		}
	}
});
Object.extend(FD.Form.Submit.Ping, {
	_wait: 4000,
	_cnt: 0,
	_calls: 0,
	_max: 15,
	Init: function (wait, options) {
		options = $.extend({}, { ping: FD.Form.Submit.Ping, final: FD.Form.Submit.Final, ignore: FD.Form.Submit.Ignore }, options);
		try {
			if (wait && Number.is(wait)) FD.Form.Submit.Ping._wait = wait;
			FD.Form.Submit.Ping._cnt = 0;
			FD.Form.Ping(options.ping, options.final)
		} catch (e) {
			FD.Form.Submit.setError('FD.Form.Submit.Ping.Init', e, 861);
			options.ignore();
		}
	},
	GetCounter: function () {
		var links = FD.Form.Submit.Ping.GetLinks();
		return String.sprintf(
			FD.Texts.Progress.get('CONNECTION_ATTEMPTS', '<br>(attempt %s of %s%s, %s)'),
			(FD.Form.Submit.Ping._cnt > 0 ? FD.Form.Submit.Ping._cnt : 1),
			FD.Form.Submit.Ping._max,
			(FD.Form.Ping._statusText ? ', ' + FD.Form.Ping._statusText : ''),
			links
		);
	},
	GetLinks: function () {
		return String.sprintf(
			FD.Texts.get('Progress.CONNECTION_LINKS', '%sback%s'),
			'<a href="javascript:void(0)" onclick="FD.Form.Submit.Rollback()">',
			'</a>'
		);
	},
	Clear: function () {
		if (this._tmr) window.clearTimeout(this._tmr);
		FD.Form.Ping._data = FD.Form.Ping._req = null;
		FD.Form.Ping._status = -1;
		FD.Form.Ping._statusText = '';
		FD.Ajax.silent = false;
	}
});


FD.Form.Ping = function (onerror, onsuccess) {
	var self = FD.Form.Ping;
	try {
		FD.Ajax.silent = true;
		if (self._data == null && arguments.length == 2) {
			self._status = -1;
			self._statusText = '';
			self._data = new FDAjaxData({
				silent: true,
				async: true, verb: 'GET', timeout: 10000, content: '', onerror: onerror, onsuccess: onsuccess, callback: function (req, data) {
					try {
						FD.Form.Ping._readyState = req.readyState;
						if (FD.Form.Ping._data && data.async && (req.readyState == FD.Ajax.Constants.readyState.COMPLETED || req.timedout)) { FD.Form.Ping.Check(req, data); }
						else if (req.readyState == FD.Ajax.Constants.readyState.COMPLETED) {
							FD.Form.Submit.setError('FD.Form.Ping (callback)', 'readyState=4, ping._data=' + FD.Form.Ping._data + ', async=' + data.async, 907);
						}
					} catch (e) { FD.Form.Submit.setError('FD.Form.Ping (callback)', e, 909); }
				}
			});
		}
		var data = self._data;
		data.url = (new FDUri('/data/ping/' + self._cnt + '/get')).randomize();
		if (self._cnt > 0) data.url.querySet('reghit', true);
	} catch (e) {
		FD.Form.Submit.setError('FD.Form.Ping', e, 1818);
		FD.Form.Submit.Ignore();
		return true;
	}

	self._req = FD.Ajax.sendRequest(data, self._req);
	if (FD.Ajax.error && FD.Ajax.error.fatal) {
		FD.Form.Submit.Ignore();
		return true;
	} else if (!self._req) {
		FD.Form.Submit.setError('FD.Form.Ping', 'Missing Ajax request object', 926);
		FD.Form.Submit.Ignore();
		return true;
	}

	//FD.Ajax.silent = false;
	/* if (FD.Ajax.error) {
	FD.Form.Submit.Ignore();
	return true;
	}*/

	if (!data.async) return FD.Form.Ping.Check(self._req, data);
	return true;
};
Object.extend(FD.Form.Ping, {
	_cnt: 0,
	_data: null,
	_readyState: -1,
	_status: -2,
	_statusText: '',

	Check: function (req, data) {
		var self = FD.Form.Ping, retval = true, timedout = false, s = -1;
		if (req) {
			try { s = (new Date()) - FD.Form.Submit._dt } catch (e) { }
			try {
				self._readyState = req.readyState;
				if (req.readyState == FD.Ajax.Constants.readyState.COMPLETED && (FD.Ajax.isActiveX || !req.timedout)) {
					self._status = req.status;
					self._statusText = FD.Texts.Status.get('STATUS_' + req.status, (req.status == 506 ? 'Formdesk is being updated' : (req.statusText ? req.statusText : '')));
					FD.Form.Submit.setError('FD.Form.Ping.Check', 'status=' + self._status + ', statusText=' + self._statusText + ', time=' + s, 957);
					/*
					When the status >= 500 then Chrome gets a 101 Network error after some calls. With the same url dit error is continuous with sometimes a successfull call.
					Changing the url (not the querystring) solves the network error.
					*/
					timedout = (!FD.Ajax.isActiveX && req.timedout) || req.status.list(0, 504 /*gateway timeout*/, 12029 /*IE status Unknown*/);
					if (req.status != 200) retval = false;
				} else {
					self._statusText = FD.Texts.Status.get('STATUS_TIMEOUT', 'Timeout / Network error');
					FD.Form.Submit.setError('FD.Form.Ping.Check', self._statusText + ', time=' + s, 966);
					retval = false; timedout = true;
				}
			} catch (e) {
				FD.Form.Ping._cnt++;
				FD.Form.Submit.setError('FD.Form.Ping.Check', e, 971);
				FD.Form.Submit.Ignore();
				return false;
			}
		}
		if (!retval || timedout) FD.Form.Ping._cnt++;
		if (timedout) { // abort
			FD.Form.Submit.Rollback(FD.Texts.Error.sprintf('ERROR_FORM_CONNECTION', FD.Texts.Status.get('STATUS_TIMEOUT', 'Timeout / Network error')));
			return false;
		}
		if (retval) {
			//self._data = self._req = null;
			if (data.onsuccess) return data.onsuccess();
			return true;
		}
		if (data.onerror) return data.onerror();
		return false;
	}
});

var FDAlt = new Class({

	Extends: FDBaseClass,
	_class: 'FDAlt',

	_items: [],
	_set: false,

	Add: function (name) {
		this._items.push(name);
		var item = FDItems.search(name);
		item.setAlt();
		/*item.$().on('click.alt', this.Check.bind(this, item, false));

		if (!this._set) {
			this._set = true;
			FD.Form.addEvent('onAfterLoad', this.Init.bind(this));
			//			FD.Events.AttachEvent('AfterLoad', function () { FD.Alt.Init(); });
		}*/
	},
	Check: function (item, force) {
		if (String.is(item)) item = FDItems.search(item);
		if (!item) return;

		var el = item.element(), disable = !(typeof el[0] != 'undefined' ? el[el.length - 1].checked : el.checked);
		if (force || item.isApplicable()) $('input[name=alt' + item.name + ']').setDisabled(disable);
	},
	Init: function () {
		this.log('.Init, initializing alternative fields, count=' + this._items.length);
		for (var i = 0; i < this._items.length; i++) {
			this.Check(this._items[i], true);
		}
	}
});
FD.Alt = new FDAlt();

FDMergeCodeParser = new Class({

	Extends: FDBaseClass,
	_class: 'FDMergeCodeParser',

	_trace: true,
	_org: {},
	_cache: [],

	getMatches: function (text) {
		if (text.empty()) return [];
		var matches = text.match(/\[([^\[\]]{1,})\]/g);

		this.log('.getMatches, matches=' + matches);

		if (!matches) return [];
		return matches.distinct();
	},
	Parse: function () {
		try {
			var text, matches, ident, val, items = FD.Form.Items;
			if (String.is(arguments[0])) {
				text = arguments[0];
				matches = (arguments.length > 1 ? arguments[1] : this.getMatches(text));
			} else {
				text = arguments[0].text;
				matches = arguments[0].matches;
			}
			if (!items || text.empty() || matches.length == 0) return text;

			this.log('.Parse, matches=' + matches);

			for (var i = 0; i < matches.length; i++) {

				ident = matches[i].substr(1, matches[i].length - 2);
				val = items.value(ident, FDItems.DESCRIPTION, ident);

				this.log('.Parse, i=' + i + ', ident=' + ident + ', value=' + val);

				if (Array.is(val)) val = val.join(', ');
				if (val != ident) {
					text = text.replaceAll('[' + ident + ']', (val+'').htmlencode());
				}
			}
		} catch (e) { alert('Parse, ' + (e.message || e)); }
		return text;
	},
	Element: function (el) {

		this.log('.Element, ' + el, 'group');

		el = FD.get(el);
		var obj, tooltip;

		if (this._org[el.id]) obj = this._org[el.id];
		else {
			this._org[el.id] = { text: el.innerHTML, matches: this.getMatches(el.innerHTML) };
			obj = this._org[el.id];

			var tooltipId = $(el).attr('aria-describedby') || $(el).find('label').attr('aria-describedby');
			if (tooltipId) {
				obj['tooltip_id'] = tooltipId;
				obj['tooltip_text'] = FD.get(tooltipId).innerHTML;
				obj['tooltip_matches'] = this.getMatches(obj['tooltip_text']);
			}
		}

		this.log(obj);

		if (!obj.text && !el.innerHTML && !obj['tooltip_text']) { this.log('', 'groupEnd'); return; }

		el.innerHTML = this.Parse(obj);
		if (obj['tooltip_id']) {
			FD.get(obj['tooltip_id']).innerHTML = this.Parse(obj['tooltip_text'], obj['tooltip_matches']);
		}

		this.log('.Element, parsed=' + el.innerHTML);

		var matches = this.getMatches(el.innerHTML), $el;
		if (matches.length > 0) {
			el.innerHTML = this.Parse({ text: el.innerHTML, matches: matches });
			for (var i = 0, ident = '', item = null; i < matches.length; i++) {
				ident = matches[i].substr(1, matches[i].length - 2);
				if (!this._cache.seek(ident) && (item = FDItems.search(ident))) {
					this._cache.push(ident);
					aEvents.attach(item, (function () { this.Element(el); }).bind(this));
				}
			}
		}

		this.log('.Element, has-info=' + $(el).find('.has-info').length);

		if (($el = $(el).find('.has-info')).length > 0) FD.Help.setEvents($el);

		this.log('', 'groupEnd');
	},
	Reset: function (el, text) {
		if (arguments.length == 0) this._org = {};
		else if ((el = FD.get(el)) && this._org[el.id]) {
			text = (arguments.length > 1 ? text : el.innerHTML);
			this._org[el.id] = { text: text, matches: this.getMatches(text) };
		}
	}
});

FD.Parser = {
	mergecode: new FDMergeCodeParser()
};

FD.Form.setDisp = function (id, type, rule, page, options) {
	var item = this.Items.search(id);
	item.setDisplay(rule);
	return;
/*
	if (type == 0) {
		type = item.disp;
	}
	if (this.Hidden.Check(id)) return;
	var name = 'tdA' + id, el = FD.get(name), opt = 1;
	if (el) {
		$(el).toggle(!rule);
//		setDisplay(null, el, !rule);
	} else {
		while ((el = FD.get('tdA' + id + 'cell' + opt))) {
			name = 'tdA' + id + 'cell' + opt;
			$(el).toggle(!rule);
			//setDisplay(null, el, !rule);
			opt++;
		}
	}
	if (type == 1 || type == 2) {
		$('#tdQ' + id).toggle(!rule);
		//		setDisplay(document, 'tdQ' + id, !rule);
		name = 'tdQ' + id;
	}
	if (type == 2) {
		$('#tdA' + id).toggle(!rule);
		//		setDisplay(document, 'tdQA' + id, !rule);
		name = 'tdQA' + id;
	}
	if (this.Info.qno && type < 3) {
		$('#tdN' + id).toggle(!rule);
		//		setDisplay(document, 'tdN' + id, !rule);
	}
	this.checkRowDisplay(name);
*/
};

(function () {

	FD.Form.checkRowDisplay = function (el) {
		if (!Object.is(el)) el = FD.get(el);
		if (el) {
			var lvl = Number.int(el.getAttribute('fd:lvl'));
			el = el.parentNode;
			while (lvl > 0 && el && el.parentNode) {
				el = el.parentNode;
				if (el.tagName && el.tagName == 'TR') lvl--;
			}
			if (el) setRowDisplay(el);
			$(el).parentsUntil('#tblForm', 'TABLE').each(checkTableDisplay);
		}
	};

	var checkTableDisplay = function () {
		for (var i = 0; i < this.rows.length; i++) {
			if (this.rows[i].style.display != 'none') { $(this).show(); /*this.style.display = ''*/; return; }
		}
		$(this).hide(); //this.style.display = 'none';
	};

})();

function setRowDisplay(el, rec) {
	if (!Object.is(el) || typeof el.tagName == 'undefined' || !el.tagName.list('TABLE', 'TR')) return;
	var i, disp = true, cell, index = (FD.Browser.ie ? 0 : 1);
	if (el.tagName == 'TABLE') {
		for (i = 0; i < el.rows.length; i++) {
			disp = setRowDisplay(el.rows[i], true);
			if (disp) break;
		}
	} else {
		for (i = 0; i < el.cells.length; i++) {
			cell = el.cells[i];
			disp = cell.style.display != 'none';
			if (disp && cell.childNodes.length > index && cell.childNodes[index].nodeType == 1 && cell.childNodes[index].tagName == 'TABLE')
				disp = setRowDisplay(cell.childNodes[index], true);
			if (disp) break;
		}
		if (!rec) {
			$(el).toggle(disp);
//			el.style.display = (disp ? '' : 'none');
		}
	}
	return disp;
}

String.log('SCRIPT LOADED: fd_form.js');

var __FD_FORM = true;
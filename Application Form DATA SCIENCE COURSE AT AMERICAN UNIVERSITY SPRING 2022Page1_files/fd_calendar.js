var FDCalendar;

(function ($) {
	FDCalendarDialog = new Class({

		Extends: FDBaseClass,

		_class: 'FDCalendarDialog',

		_width: 294,
		_height: 195,
		_window: null, // reference to the FDWindowDialog instance

		_title: null,
		_content: null,
		_time: null,
		_hours: null,
		_minutes: null,

		org: { year: 0, month: 0, day: 0 },
		param: { year: 0, month: 0, day: 0, hasTime: false, time: false, hour: 0, minute: 0 },
		cal: { year: 0, month: 0, day: 0 },
		_ts: new Date(),
		_element: null,
		label: '',

		createProxies: function () {
			// create proxy functions to be used with events.
			// whten the event is triggered, the function runs in this context
			this.parent();
		},
		
		initialize: function () {
			this.parent.apply(this, arguments);
			this.label = FD.Label.getInfo('img');
		},

		getCell: function (el) {
			var lvl = 0;
			while (el && (!el.tagName || el.tagName != 'TD') && el.parentNode && lvl < 10) { el = el.parentNode; lvl++; }
			return el;
		},
		eventMouse: function (e) {
			var el = $(checkEvent(e));
			el = el.closest('td'); //(el.prop('tagName') != 'TD' ? el.parents('td') : el);  // this.getCell(el);
			if (el.attr('day')) {
				el.toggleClass('cal_dayover', e.type == 'mouseover');
			}
		},
		eventClick: function (e) {
			var el = $(checkEvent(e));
			el = el.closest('td'); //(el.prop('tagName') != 'TD' ? el.parents('td') : el);  // this.getCell(el);
			if (el.attr('day'))
				this.changeDay(el.attr('day'));
		},
		eventKeyup: function (e) {
			if (e.keyCode.list(13, 32)) this.eventClick(e);
		},

		show: function (el, format, e) {

			if (String.is(el)) el = $(FD.get(el));
			if (!(el instanceof jQuery)) el = $(el);

			el.data('origValue', el.val());
			this._element = el;

			format = format || el.getFormat();
			if (!FDDateFormat.is(format)) {
				format = new FDDateFormat(format);
			}

			var val = el.val(), parsed = null;
			if (val.length > 0) {
				parsed = FDDate.parse(val, format);
				this._ts = (!parsed.error ? parsed.getDate() : new Date());
			} else {
				this._ts = new Date();
			}

			this.param = {
				day: this._ts.getDate(),
				month: this._ts.getMonth(),
				year: this._ts.getFullYear(),
				hasTime: (parsed && parsed.hasTime),
				time: format.hasTime(),
				hours: (parsed ? parsed.hours : this._ts.getHours()),
				minutes: (parsed ? parsed.minutes : this._ts.getMinutes())
			};

			this.Show(this.param, e);

		},

		Show: function (param, e) {

			var calendar = this;

			this.param = param;
			this.org = $.extend({}, param);
			this.cal = $.extend({}, param);

			this._days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
			if (!this._month_names) {
				this._month_names = FD.Texts.get('Calendar.MONTH_NAMES');
				if (String.is(this._month_names)) this._month_names = this._month_names.split(',');
			}
			if (!this._dow) {
				this._dow = FD.Texts.get('Calendar.DOW_NAMES');
				if (String.is(this._dow)) this._dow = this._dow.split(',');
			}

			if (!Array.is(this._month_names) || !Array.is(this._dow)) {
				var dump = FD.Texts.dump();
				FD.Error.Send('Months=' + this._month_names + '/type=' + Object.toType(this._month_names) + '/' + typeof this._month_names + ', dow=' + this._dow + '/type=' + Object.toType(this._dow) + '/' + typeof this._dow, 'fd_calendar.js', 51, 'FD.Calendar.Window.Show', dump);
			}

			var output = $('<div></div>');
			var table = $('<table border="0" cellspacing="0" cellpadding="2" style="width:100%" class="cal_title" role="none presentation"></table>').appendTo(output);
			var tr = $('<tr></tr>').appendTo(table);

			var title = this._title = $('<td align="left" class="calendar-title" style="cursor:pointer">' + String.create(this._month_names[this.param.month]).proper() + ' ' + this.param.year + '<\/td>').appendTo(tr);
			title.click($.proxy(FD.Calendar.Window.thatDay, this));

			var months = this._months = $('<select class="calendar-months" id="month-' + this._guid + '"></select>'), years = this._years = $('<select class="calendar-years" id="year-' + this._guid + '"></select>');
			months.change(function () { calendar.changeMonth(this.value); });
			years.change(function () { calendar.changeYear(this.value); });

			tr.append($('<td style="text-align:right"></td>').append(months).append('&nbsp;').append(years));

			for (var month = 0; month < 12; month++) {
				if (month == this.param.month)
					months.append('<option value="' + month + '" selected>' + this._month_names[month] + '<\/option>');
				else
					months.append('<option value="' + month + '">' + this._month_names[month] + '<\/option>');
			}

			for (var year = 1900; year < 2101; year++) {
				if (year == this.param.year)
					years.append('<option value="' + year + '" selected>' + year + '<\/option>');
				else
					years.append('<option value="' + year + '">' + year + '<\/option>');
			}


			this._content = $('<div class="calendar-content"><\/div>');
			output.append(this._content);

			this._height = 195;

			if (this.param.time) {

				this._height = 276;
				var proxyHours = function (e) { if (e.type == 'keyup' && keyCodeIsControlChar(e)) return; calendar.setHours(e); }, proxyMinutes = function (e) { if (e.type == 'keyup' && keyCodeIsControlChar(e)) return; calendar.setMinutes(e); };

				table = $('<table border="0" cellpadding="0" cellspacing="0"></table>').appendTo(output);
				tr = $('<tr></tr>').appendTo(table);

				var td = $('<td></td>').appendTo(tr);
				this._hours = $('<input type="text" size="2" style="text-align:right;width:22px;padding:2px" value="' + this.param.hours + '">').bind({ keyup: proxyHours, change: proxyHours });
				td.append(this._hours);

				var spin = $('<table cellspacing="0" cellpadding="0"><tr><td><img class="calendar-spinup" src="' + this.label.path + 'images/spinup.gif?' + this.label.version + '" style="cursor:pointer"><\/td><\/tr><tr><td><img class="calendar-spindown" src="' + this.label.path + 'images/spindown.gif?' + this.label.version + '" style="cursor:pointer"><\/td><\/tr><\/table>');
				spin.find('.calendar-spinup').click(function (e) { calendar.setHours(e, 1); });
				spin.find('.calendar-spindown').click(function (e) { calendar.setHours(e, -1); });

				tr.append($('<td></td>').append(spin)).append('<td>&nbsp;&nbsp;' + FD.Texts.get('Calendar.HOUR') + '<\/td><td>&nbsp;&nbsp;:&nbsp;&nbsp;<\/td>');

				td = $('<td></td>').appendTo(tr);
				this._minutes = $('<input type="text" size="2" style="text-align:right;width:22px;padding:2px" value="' + this.param.minutes + '">').bind({ keyup: proxyMinutes, change: proxyMinutes });
				td.append(this._minutes);

				spin = $('<table cellspacing="0" cellpadding="0"><tr><td><img class="calendar-spinup" src="' + this.label.path + 'images/spinup.gif?' + this.label.version + '" style="cursor:pointer"><\/td><\/tr><tr><td><img class="calendar-spindown" src="' + this.label.path + 'images/spindown.gif?' + this.label.version + '" style="cursor:pointer"><\/td><\/tr><\/table>');
				spin.find('.calendar-spinup').click(function (e) { calendar.setMinutes(e, 1); });
				spin.find('.calendar-spindown').click(function (e) { calendar.setMinutes(e, -1); });

				tr.append($('<td></td>').append(spin)).append('<td>&nbsp;&nbsp;' + FD.Texts.get('Calendar.MINUTES') + '&nbsp;<\/td>');

				var time = $('<table border="0" cellpadding="2" cellspacing="0" style="width:100%" class="cal_time"></table>'), uid = this.getUniqueID();

				td = $('<td style="width:20px"><input type="checkbox" class="checkbox-time" id="' + uid + '"' + (this.param.hasTime ? ' checked' : '') + '><\/td><td><label for="' + uid + '">' + FD.Texts.get('Calendar.TIME') + '<\/label><\/td>');
				this._time = td.find('input')
				this._time.click(function () { calendar.setTime(); });

				time.append($('<tr></tr>').append(td).append($('<td style="text-align:right"></td>').append(table)));

				output.append(time);

			}

			var contextWindow = window;
			try {
				if (top.FD && typeof top.FD.Window != 'undefined') {
					contextWindow = top;
				}
			} catch (e) { }

			var topPos = 0, leftPos = 0;
			if (e) {
				topPos = this.correctY(e);
				leftPos = this.correctX(e)
			} else if (this._element) {
				topPos = this.correctY($.Event('show', { target: this._element }));
				leftPos = this.correctX($.Event('show', { target: this._element }));
			}

			var options = {
				contextWindow: contextWindow,
				content: output,
				top: topPos,
				left: leftPos,
				width: this._width + 'px',
				height: this._height + 'px',
				noButtons: !this.param.time,
				onclick: $.proxy(this.Set, this)
			};
				
			if (!this._window) {
				this.log('.Show, create lightbox');
				this._window = FD.Window.calendar(options);
				this._window.getWindow().on('keyup', (function (e) { if (e.keyCode == 27) { this._window.hide(); } }).bind(this));
			} else if (!this._window.visible) {
				this.log('.Show, show lightbox');
				this._window.show(options);
			} else {
				this.log('.Show, update lightbox');
				this._window.update(output);
			}

			this._CreateCal();
			this.setTitle();
			if (this.param.time) this.setTime();

		},
		_CreateCal: function () {
			var dDate = new Date(), output = '', calendar = this;

			var firstDay = new Date(this.cal.year, this.cal.month, 1), startDay = firstDay.getDay();
			firstDay.setDate(2);
			var week = firstDay.getWeek(); ///*, true*/);

			if (((this.cal.year % 4 == 0) && (this.cal.year % 100 != 0)) || (this.cal.year % 400 == 0))
				this._days[1] = 29;
			else
				this._days[1] = 28;

			var table = $('<table cellspacing="0" cellpadding="0" class="cal_days" style="width:100%" role="grid"></table>');
			table.bind({
				mouseover: $.proxy(calendar.eventMouse, this),
				mouseout: $.proxy(calendar.eventMouse, this),
				click: $.proxy(calendar.eventClick, this),
				keyup: $.proxy(calendar.eventKeyup, this)
			});

			var thead = $('<thead />').appendTo(table), nav = $('<tr class="cal_nav"></tr>');
			//nav.append('<td class="cal_week"><\/td>');
			nav.append($('<th></th>').append($('<div role="button" tabindex="0" aria-label="' + FD.Texts.get('Calendar.BACKYEAR', 'Go Back One Year') + '"><span aria-hidden="true">&#171;</span></div>').bind({
				click: function () { calendar.changeYear(-1, true); },
				keyup: function (e) { if (e.keyCode.list(13, 32)) calendar.changeYear(-1, true); }
			})));
			nav.append($('<th></th>').append($('<div role="button" tabindex="0" aria-label="' + FD.Texts.get('Calendar.BACKMONTH', 'Go Back One Month') + '"><span aria-hidden="true">&#139;</span></div>').bind({
				click: function () { calendar.changeMonth(-1, true); },
				keyup: function (e) { if (e.keyCode.list(13, 32)) calendar.changeMonth(-1, true); }
			})));
			nav.append($('<th colspan="3"></th>').append($('<div role="button" tabindex="0" aria-label="' + FD.Texts.get('Calendar.TODAY', 'Go Today') + '"><span aria-hidden="true">' + FD.Texts.get('Calendar.TODAY', 'Today') + '</span></div>').bind({
				click: function () { calendar.toDay(); },
				keyup: function (e) { if (e.keyCode.list(13, 32)) calendar.toDay(); }
			})));
			nav.append($('<th></th>').append($('<div role="button" tabindex="0" aria-label="' + FD.Texts.get('Calendar.NEXTMONTH', 'Go Forward One Month') + '"><span aria-hidden="true">&#155;</span></div>').bind({
				click: function () { calendar.changeMonth(1, true); },
				keyup: function (e) { if (e.keyCode.list(13, 32)) calendar.changeMonth(1, true); }
			})));
			nav.append($('<th></th>').append($('<div role="button" tabindex="0" aria-label="' + FD.Texts.get('Calendar.NEXTYEAR', 'Go Forward One Year') + '"><span aria-hidden="true">&#187;</span></div>').bind({
				click: function () { calendar.changeYear(1, true); },
				keyup: function (e) { if (e.keyCode.list(13, 32)) calendar.changeYear(1, true); }
			})));
			thead.append(nav);

			var dow = $('<tr class="cal_dow"></tr>');
			for (var i = 0; i < 7; i++)
				dow.append('<th class="cal_dow_week' + (i == 0 || i == 6 ? 'end' : '') + '" id="dow' + i + '-' + this._guid + '">' + this._dow[i] + '<\/th>');
			thead.append(dow);

			var column = 0, rows = 0, thisday = false, today = false;
			var lastMonth = this.cal.month - 1;
			if (lastMonth == -1) lastMonth = 11;

			var row = $('<tr></tr>');
			table.append(row);
			for (i = 0; i < startDay; i++, column++)
				row.append('<td class="cal_dayoff cal_top' + (i == startDay - 1 ? ' cal_first' : '') + '">' + (this._days[lastMonth] - startDay + i + 1) + '<\/td>');

			for (i = 1; i <= this._days[this.cal.month]; i++, column++) {
				thisday = (this.cal.month == this.param.month && this.cal.year == this.param.year && i == this.param.day);
				today = (firstDay.getFullYear() == dDate.getFullYear() && firstDay.getMonth() == dDate.getMonth() && i == dDate.getDate());
				row.append('<td day="' + i + '" class="day_' + i + ' cal_' + (thisday ? 'thisday' : 'day') + (today ? ' cal_today' : '') + (column == 6 ? ' cal_last' : '') + (rows == 5 ? ' cal_bottom' : '') + '"' + (thisday ? ' thisday="true"' : '') + (today ? ' today="true"' : '') + ' aria-labelledby="day' + i + '-' + this._guid + ' month-' + this._guid + ' year-' + this._guid + '" id="day' + i + '-' + this._guid + '" tabindex="0">' + i + '<\/td>');
				if (column == 6) {
					row = $('<tr></tr>');
					table.append(row);
					firstDay.setDate(i + 2);
					rows++;
					column = -1;
				}
			}
			i = 1;
			if (column > 0) {
				for (i = 1; column < 7; i++, column++)
					row.append('<td class="cal_dayoff">' + i + '<\/td>');
				rows++;
			}
			while (rows < 6) {
				if (column > 0) {
					firstDay.setMonth(firstDay.getMonth() + 1);
					firstDay.setDate(i + 2);
					row = $('<tr></tr>');
					table.append(row);
				}
				for (j = 0; j < 7; i++, j++, column++)
					row.append('<td class="cal_dayoff">' + i + '<\/td>');
				rows++;
			}

			this._content.empty();
			this._content.append(table);

			setTimeout((function () {
				var day = table.find('.cal_thisday');
				if (day.length == 0) day = table.find('#day1-' + this._guid);
				day.focus();
			}).bind(this), 500);

			var wnd = this._window.getWindow();
			wnd.trapFocus();

		},
		Set: function (rtype) {
			if (Number.is(rtype) && rtype.list(0, WND.Constants.returnTypes.CANCEL)) { this.Hide(); return; }

			if (this._element) {
				//if (!this._element.prop('disabled') && (!this._element.prop('readOnly') || Boolean.create(this._element.attr('selectOnly')))) {
					var format = this._element.getFormat();
					if (format.hasTime() && !this.param.hasTime) {
						format = format.clone({ includeTime: false }); // format the datetime without the time portion
					}
					this._element.setDate(this._ts, format);
				//}
				this.Hide();
			} else {
				if (this.param.time) {
					this.param.hasTime = this._time.prop('checked');
					this.param.hours = String.create(this._hours.val().int()).padl(2, '0');
					this.param.minutes = String.create(this._minutes.val().int()).padl(2, '0');
				}
				FD.Calendar.Set(this.param);
			}
			//FD.WND.hideWindow(); // self.close();
		},
		Hide: function () {
			this._window.hide();
		},
		setTitle: function () {
			this._title.html(this.org.day + ' ' + String.create(this._month_names[this.org.month]).proper() + ' ' + this.org.year);
		},
		setHours: function (e, spin) {
			if (!this._time.prop('checked')) return;
			var el = this._hours, hours = Number.create(el.val());
			if (Number.is(spin)) hours += spin;
			this._ts.setHours(hours);
			this.param.hours = this._ts.getHours();
			el.val(this.param.hours);
			if (hours != el.val().int()) el.select();
		},
		setMinutes: function (e, spin) {
			if (!this._time.prop('checked')) return;
			var el = this._minutes, minutes = Number.create(el.val());
			if (Number.is(spin)) minutes += spin;
			this._ts.setMinutes(minutes);
			this.param.minutes = this._ts.getMinutes();
			el.val(this.param.minutes);
			if (minutes != el.val().int() || minutes == 0) el.select();
		},
		setTime: function () {
			var time = this.param.hasTime = this._time.prop('checked');
			this._hours.setDisabled(!time);
			this._minutes.setDisabled(!time);
		},
		changeDay: function (day, rel) {
			this.cal.day = (rel ? this.cal.day + day : day);

			this.param = $.extend(this.param, { year: this.cal.year, month: this.cal.month, day: this.cal.day });

			this._ts = new Date(this.param.year, this.param.month, this.param.day, this.param.hours, this.param.minutes);

			if (!rel && !this.param.time) {
				this.Set();
			} else {
				//this.org = $.extend({}, this.param); //.year = this.param.year; this.org.month = this.param.month; this.org.day = this.param.day;
				this._content.find('.cal_thisday').attr('thisday', false).removeClass('cal_thisday');
				this._content.find('.day_' + this.cal.day).attr('thisday', true).addClass('cal_thisday');
//				this._CreateCal();
			}
		},
		changeMonth: function (month, rel) {
			// NOTE, javascript month is zero based from 0-11
			this.cal.month = (rel ? this.cal.month + month : Number.create(month));
			if (this.cal.month == 12) { this.cal.month = 0; this.changeYear(1, true); return }
			else if (this.cal.month == -1) { this.cal.month = 11; this.changeYear(-1, true); return }
			if (rel) this._months.val(this.cal.month);

			this._CreateCal();
		},
		changeYear: function (year, rel) {
			this.cal.year = (rel ? this.cal.year + year : Number.create(year));
			if (rel) {
				this._months.val(this.cal.month);
				this._years.val(this.cal.year);
			}
			this._CreateCal();
		},
		toDay: function () {
			var today = new Date();
			today.setHours(this._ts.getHours());
			today.setMinutes(this._ts.getMinutes());

			this.cal.year = today.getFullYear();
			this.cal.month = today.getMonth();
			this.cal.day = today.getDate();
			this._months.val(this.cal.month);
			this._years.val(this.cal.year);

			this.param = $.extend(this.param, { year: this.cal.year, month: this.cal.month, day: this.cal.day });
			this._ts = new Date(this.param.year, this.param.month, this.param.day, this.param.hours, this.param.minutes);

			this.setTitle();
			this._CreateCal();
		},
		thatDay: function () {
			this.cal = $.extend(this.cal, this.org); //.year = this.org.year; this.param.month = this.org.month; this.param.day = this.org.day;

			this.param = $.extend(this.param, { year: this.cal.year, month: this.cal.month, day: this.cal.day });
			this._ts = new Date(this.param.year, this.param.month, this.param.day, this.param.hours, this.param.minutes);

			this._months.val(this.cal.month);
			this._years.val(this.cal.year);
			this._CreateCal();
		},
		correctX: function (e, offset) {
			var offsetX, x, w = $(window), el = $(e.target), pageX = (e.type != 'click' ? el.offset().left - w.scrollLeft() : e.pageX);
			this.log('.correctX, pageX=' + pageX);

			offset = offset || 0;
			offsetX = w.scrollLeft();
			x = pageX + offset;
			if (x + this._width > w.width() + offsetX - 20) { //window.innerWidth
				x = Math.max((e.clientX - offset - this._width) + offsetX, 0);
			}

			return x;
		},
		correctY: function (e, offset) {
			var offsetY, y, swapped = false, w = $(window), el = $(e.target), pageY = (e.type != 'click' ? el.offset().top + el.height() : e.pageY);
			this.log('.correctY, pageY=' + pageY);
			offset = offset || 0;

			offsetY = w.scrollTop();
			y = pageY + offset;
			swapped = (y + this._height > w.height() + offsetY - 20); //window.innerHeight
			if (swapped) {
				y = Math.max((w.height() + offsetY) - this._height - 18, 0);
				//				y = Math.max((e.clientY - offset - this._height) + offsetY, 0);
			}
			
			return y;
		}
	});

})(jQuery);

FD.Calendar.Window = FD.Calendar.Dialog = new FDCalendarDialog();

var __FD_CALENDAR = true;
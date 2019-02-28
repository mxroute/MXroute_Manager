/*
* base/frontend/paper_lantern/jetbackup/libraries/utils.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

'use strict';

define(
	[

	], function() {
	var UTILS = function() {};

	UTILS.prototype = {
		_timezone: null,
		_dateformat: { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
		_options: {
			code: "en-US",
			date: {
				short: { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' },
				shorttime: { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' },
				long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
				longtime: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }
			}
		},
		sizeToHumanReadable: function(bytes, si) {
			if(si === undefined) si = false;
			var unit = si ? 1000 : 1024;
			if (bytes < unit) return bytes + " B";
			var exp = parseInt(Math.log(bytes)/Math.log(unit));
			var pre = (si ? "kMGTPE" : "KMGTPE");
			pre = pre[exp-1];// + (si ? "" : "i");
			return (bytes/Math.pow(unit, exp)).toFixed(2) + " " + pre + "B";
		},
		setTimezone: function (timezone) {
			this._timezone = timezone;
		},
		date: function(time, format) {

			if(this._options.date[format] !== undefined) format = this._options.date[format];
			else format = this._dateformat;

			var date = new Date(time);
			if(this._timezone) format.timeZone = this._timezone;
			return date.toLocaleDateString(this._options.code, format);

		}
	};

	return new UTILS();
});
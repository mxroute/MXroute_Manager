/*
* base/frontend/paper_lantern/jetbackup/services/jetapi.js
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
		// Libraries
		"angular",
		"cjt/io/api",
		"cjt/io/uapi-request",
		"cjt/util/locale"
	],
	function(angular, API, APIREQUEST, LOCALE) {

	var app;
	try {
		app = angular.module("cpanel.jetbackup"); // For runtime
	}
	catch (e) {
		app = angular.module("cpanel.jetbackup", []); // Fall-back for unit testing
	}

	app.factory('jetapi', ["$q","APIService", function ($q, APIService) {

		var jetapi = function() {};
		jetapi.prototype = new APIService();

		angular.extend(jetapi.prototype, {
			getSettings: function (apiParams, callback, params) { return this._exec('getSettings', apiParams, callback, params); },
			manageSettings: function (apiParams, callback, params) { return this._exec('manageSettings', apiParams, callback, params); },
			getGDPR: function (apiParams, callback, params) { return this._exec('getGDPR', apiParams, callback, params); },
			manageGDPR: function (apiParams, callback, params) { return this._exec('manageGDPR', apiParams, callback, params); },
			getAccountDetails: function (apiParams, callback, params) { return this._exec('getAccountDetails', apiParams, callback, params); },
			getAccount: function (apiParams, callback, params) { return this._exec('getAccount', apiParams, callback, params); },
			manageAccount: function (apiParams, callback, params) { return this._exec('manageAccount', apiParams, callback, params); },
			getBackup: function (apiParams, callback, params) { return this._exec('getBackup', apiParams, callback, params); },
			listBackups: function (apiParams, callback, params) { return this._exec('listBackups', apiParams, callback, params); },
			manageBackup: function (apiParams, callback, params) { return this._exec('manageBackup', apiParams, callback, params); },
			addQueueRestore: function (apiParams, callback, params) { return this._exec('addQueueRestore', apiParams, callback, params); },
			addQueueSnapshot: function (apiParams, callback, params) { return this._exec('addQueueSnapshot', apiParams, callback, params); },
			calculateBackupSize: function (apiParams, callback, params) { return this._exec('calculateBackupSize', apiParams, callback, params); },
			deleteDownload: function (apiParams, callback, params) { return this._exec('deleteDownload', apiParams, callback, params); },
			getDownload: function (apiParams, callback, params) { return this._exec('getDownload', apiParams, callback, params); },
			getBackupDownloads: function (apiParams, callback, params) { return this._exec('getBackupDownloads', apiParams, callback, params); },
			addQueueDownload: function (apiParams, callback, params) { return this._exec('addQueueDownload', apiParams, callback, params); },
			getQueueItem: function (apiParams, callback, params) { return this._exec('getQueueItem', apiParams, callback, params); },
			listQueueItems: function (apiParams, callback, params) { return this._exec('listQueueItems', apiParams, callback, params); },
			cancelQueueItem: function (apiParams, callback, params) { return this._exec('cancelQueueItem', apiParams, callback, params); },
			fileManager: function (apiParams, callback, params) { return this._exec('fileManager', apiParams, callback, params); },

			_exec: function(cmd, apiParams, callback, params) {
				if (!apiParams) apiParams = {};
				apiParams.function = cmd;

				var apiCall = new APIREQUEST.Class();

				apiCall.initialize("JetBackup", cmd, apiParams);

				var deferred = $q.defer();
				var service = this;

				this.currentGetRequest = new APIService.AngularAPICall(apiCall, {
					done: function(response) {

						service.currentGetRequest = undefined;

						if( response.parsedResponse.error ) {
							deferred.reject(response.parsedResponse.error);
						}
						else {
							var result = response.parsedResponse;
							deferred.resolve(result);
						}
					},
					fail: function(a,b,c) {
						console.log(cmd,a,b,c);

						service.currentGetRequest = undefined;
					}
				});


				deferred.promise.then(function(response) {
					if(callback !== undefined && typeof callback === 'function') callback(response.data, params);
				});

				return deferred.promise;
			}
		});

		return new jetapi();
	}]);
});
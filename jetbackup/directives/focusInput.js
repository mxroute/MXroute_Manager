/*
* base/frontend/paper_lantern/jetbackup/directives/autoFocus.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false */

define(
	[
		// Libraries
		"angular"
	],
	function(angular) {

		var app;
		try {
			app = angular.module("cpanel.jetbackup"); // For runtime
		}
		catch (e) {
			app = angular.module("cpanel.jetbackup", []); // Fall-back for unit testing
		}

		app.directive('focusInput', [
			"$timeout",
			function($timeout) {

				return function(scope, element, attrs) {
					scope.$watch(attrs.focusInput,
						function (newValue) {
							$timeout(function() {
								newValue && element.focus();
							});
						},true);
				};
			}
		]);

	}
);

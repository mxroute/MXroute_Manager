/*
* base/frontend/paper_lantern/jetbackup/index.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global require: false, define: false, PAGE: false */

define(
	[
		"angular",
		"cjt/util/locale",
		"app/libraries/utils",
		"cjt/modules",
		"jquery-chosen",
		"angular-chosen"
		// "ngRoute"
	],
	function(angular, LOCALE, UTILS) {
		return function() {
			// First create the application
			angular.module("cpanel.jetbackup", [
				"angular-growl",
				"cjt2.cpanel",
				"cjt2.services.api",
				"cjt2.views.applicationController",
				"ngAnimate",
				"localytics.directives"
			]);

			// Then load the application dependencies
			return require([
				"cjt/bootstrap",
				"app/controllers/fullBackups",
				"app/controllers/fileBackups",
				"app/controllers/cronBackups",
				"app/controllers/dnsBackups",
				"app/controllers/emailBackups",
				"app/controllers/dbBackups",
				"app/controllers/sslBackups",
				"app/controllers/listBackups",
				"app/controllers/fileManager",
				"app/controllers/snapshots",
				"app/controllers/queues",
				"app/controllers/gdpr",
				"app/controllers/settings",
				"app/filters/backupLocaleString",
				"app/services/jetapi",
				"app/directives/focusInput"
			], function(BOOTSTRAP) {

				angular.module("cpanel.jetbackup").config(["$animateProvider", "$routeProvider", function($animateProvider, $routeProvider) {
					$animateProvider.classNameFilter(/(action-module|disappearing-table-row)/);

					var mustAgree = function($location) {
						var gdpr = window.PAGE.info.gdpr;

						if(gdpr.enabled && !gdpr.termsagreed && $location.path() != '/gdpr') {
							$location.path('/gdpr');
						}
					};

					$routeProvider
					.when("/settings", { templateUrl: "views/settings.ptt", resolve: { mess: mustAgree } })
					.when("/gdpr", { templateUrl: "views/gdpr.ptt", resolve: { mess: mustAgree } })
					.when("/snapshots", { templateUrl: "views/snapshots.ptt", resolve: { mess: mustAgree } })
					.when("/queues", { templateUrl: "views/queues.ptt", resolve: { mess: mustAgree } })
					.when("/fileManager/:id", { templateUrl: "views/fileManager.ptt", resolve: { mess: mustAgree } })
					.when("/dbBackups", { templateUrl: "views/dbBackups.ptt", resolve: { mess: mustAgree } })
					.when("/sslBackups", { templateUrl: "views/sslBackups.ptt", resolve: { mess: mustAgree } })
					.when("/dnsBackups", { templateUrl: "views/dnsBackups.ptt", resolve: { mess: mustAgree } })
					.when("/emailBackups", { templateUrl: "views/emailBackups.ptt", resolve: { mess: mustAgree } })
					.when("/cronBackups", { templateUrl: "views/cronBackups.ptt", resolve: { mess: mustAgree } })
					.when("/fullBackups", { templateUrl: "views/fullBackups.ptt", resolve: { mess: mustAgree } })
					.when("/fileBackups", { templateUrl: "views/fileBackups.ptt", resolve: { mess: mustAgree } })
					.when("/", { templateUrl: "views/index.ptt", resolve: { mess: mustAgree } });


				}]).controller("baseController",
					["$scope", "$location", function($scope, $location) {
						$scope.LOCALE = LOCALE;
						$scope.UTILS = UTILS;
						$scope.PERMS = window.PAGE.permissions;

						$scope.changeView = function(view){
							$location.path(view); // path not hash
						};

						//$scope.pageTabs = [];
						//$scope.loading = true;
						//$scope.activeTab = -1;
						//$scope.backupsCount = PAGE.backupsCount;
					}]
				).animation(".action-module", ["$animateCss", function($animateCss) {
					return {
						enter: function(elem, done) {
							var height = elem[0].offsetHeight;
							return $animateCss(elem, {
								from: { height: "0" },
								to: { height: height + "px" },
								duration: 0.3,
								easing: "ease-out",
								event: "enter",
								structural: true
							})
							.start()
							.done(function() {
								elem[0].style.height = "";
								done();
							});
						},
						leave: function(elem, done) {
							var height = elem[0].offsetHeight;
							return $animateCss(elem, {
								event: "leave",
								structural: true,
								from: { height: height + "px" },
								to: { height: "0" },
								duration: 0.3,
								easing: "ease-out"
							})
							.start()
							.done(function() {
								done();
							});
						}
					};
				}]);

				BOOTSTRAP("#body-content", "cpanel.jetbackup");
			});
		};
	}
);

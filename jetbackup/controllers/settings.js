/*
* base/frontend/paper_lantern/jetbackup/controllers/settings.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define(
    [
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("settings",
            ["$rootScope", "$scope", "$interval", "$timeout", "jetapi", "growl", "$window",
                function($rootScope, $scope, $interval, $timeout, jetapi, growl, $window) {

                    var COMPONENT_NAME = "SettingsTable";

					$scope.saveChangesStatus = undefined;
					$scope.settings = {};
					/*
					if(!PAGE.settings.status)
						for(var i=0;i<PAGE.settings.errors.length;i++)
							growl.error(PAGE.settings.errors[i]);
					$scope.settings=PAGE.settings.data;
					*/


					$scope.clearStatus = function () {
						$scope.saveChangesStatus = undefined;
					};

					$scope.saveChanges = function() {

						var formOrder = ["email"];

						if( $scope.settingsForm.$invalid ) {
							$scope.settingsForm.$setSubmitted();
							var focused = false;

							angular.forEach(formOrder, function(name) {
								if( $scope.settingsForm[name] && $scope.settingsForm[name].$invalid ) {
									$scope.settingsForm[name].$setDirty();
									if( !focused ) {
										angular.element("[name='settingsForm'] [name='" + name + "']").focus();
										focused = true;
									}
								}
							});

							return;
						}

						var apiParams = {
							email: $scope.settings.email
						};

						$scope.savingChanges = true;
						$scope.saveChangesStatus = undefined;

						return jetapi.manageAccount(apiParams).then(
							function(data) {
								$scope.savingChanges = false;

								$scope.saveChangesStatus = {
									message: LOCALE.maketext("Settings saved successfully"),
									type: 'success',
									closeable: true,
									ttl: 10000
								};

								$scope.settingsForm.$setPristine();
								$scope.settingsForm.$setUntouched();
							},
							function(error) {
								$scope.saveChangesStatus = {
									message: error,
									type: 'danger',
									closeable: true,
									ttl: 10000
								};

								$scope.savingChanges = false;
							}
						);
					};

					$scope.fetch = function () {
						return jetapi.getAccountDetails().then(function(response) {

							$scope.settings = response.data;

						}, function(error) {
							$scope.saveChangesStatus = {
								message: error,
								type: "danger",
								closeable: true,
								ttl: 10000
							};
						});

					};

                    $timeout($scope.fetch);
                }]
        );

    }
);
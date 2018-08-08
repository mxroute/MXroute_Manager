/*
# mail/authentication/views/manageController.js   Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

define(
    [
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
    ],
    function(angular, LOCALE) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "manageController", [ "$scope", "$routeParams", "manageService", "growl",
                function($scope, $routeParams, manageService, growl) {

                    $scope.unlink = function(provider, display_name) {
                        var promise = manageService.unlink(provider.provider_id, provider.subject_unique_identifier, $routeParams.username).then(function() {
                            manageService.fetch_links($routeParams.username).then(function() {
                                $scope.providers = manageService.get_links();
                            }, function(error) {
                                growl.error(LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error));
                                provider.disabled = 0;
                            });
                            growl.success(LOCALE.maketext("Successfully unlinked the “[_1]” account “[_2]”", display_name, provider.preferred_username));
                        }, function(error) {
                            growl.error(LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error));
                            provider.disabled = 0;
                        });

                        return promise;
                    };

                    $scope.init = function() {
                        $scope.username = $routeParams.username;
                        $scope.locale = LOCALE;
                        $scope.providers = manageService.get_links();
                    };

                    $scope.init();
                }
            ]
        );

        return controller;
    }
);

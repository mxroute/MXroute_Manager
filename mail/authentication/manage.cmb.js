/*
# mail/authentication/services/manageService.js   Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

define(
    'app/services/manageService',[
        "angular",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
    ],
    function(angular, API, APIREQUEST) {

        var app = angular.module("App");

        function manageServiceFactory($q) {
            var manageService = {};
            var links = [];

            manageService.get_providers = function() {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("ExternalAuthentication", "configured_modules");
                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            manageService.get_links = function() {
                return links;
            };

            manageService.fetch_links = function(username) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("ExternalAuthentication", "get_authn_links");
                if (username) {
                    apiCall.addArgument("username", username);
                }
                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                deferred.promise.then(function(result) {
                    links = result.data;
                });

                return deferred.promise;
            };

            manageService.unlink = function(provider_id, subject_unique_identifier, username) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("ExternalAuthentication", "remove_authn_link");
                apiCall.addArgument("provider_id", provider_id);
                apiCall.addArgument("subject_unique_identifier", subject_unique_identifier);
                apiCall.addArgument("username", username);

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            return manageService;
        }

        manageServiceFactory.$inject = ["$q"];
        return app.factory("manageService", manageServiceFactory);
    });

/*
# mail/authentication/views/manageController.js   Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

define(
    'app/views/manageController',[
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/alertList",
        "cjt/services/alertService"
    ],
    function(angular, LOCALE) {
        "use strict";

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "manageController", [
                "$scope",
                "$routeParams",
                "manageService",
                "alertService",
                function(
                    $scope,
                    $routeParams,
                    manageService,
                    alertService) {

                    $scope.unlink = function(provider, displayName) {
                        var promise = manageService.unlink(provider.provider_id, provider.subject_unique_identifier, $routeParams.username).then(function() {
                            manageService.fetch_links($routeParams.username).then(function() {
                                $scope.providers = manageService.get_links();
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error),
                                    closeable: true,
                                    replace: false,
                                    group: "emailExternalAuth"
                                });
                                provider.disabled = 0;
                            });
                            alertService.add({
                                type: "success",
                                message: LOCALE.maketext("Successfully unlinked the “[_1]” account “[_2]”", displayName, provider.preferred_username),
                                closeable: true,
                                replace: false,
                                autoClose: 10000,
                                group: "emailExternalAuth"
                            });
                        }, function(error) {
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error),
                                closeable: true,
                                replace: false,
                                group: "emailExternalAuth"
                            });
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

/*
# mail/authentication/manage.js                   Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

define(
    'app/manage',[
        "angular",
        "cjt/core",
        "cjt/modules",
        "uiBootstrap",
        "ngRoute",
    ],
    function(angular, CJT) {
        "use strict";
        return function() {

            angular.module("App", ["ui.bootstrap", "cjt2.cpanel"]);

            var app = require(
                [
                    "uiBootstrap",
                    "cjt/directives/alert",
                    "cjt/directives/alertList",
                    "cjt/services/alertService",
                    "app/services/manageService",
                    "app/views/manageController",
                ], function() {

                    var app = angular.module("App");

                    // If using views
                    app.controller("BaseController", [
                        "$rootScope",
                        "$scope",
                        "$route",
                        "$location",
                        "manageService",
                        "alertService",
                        function(
                            $rootScope,
                            $scope,
                            $route,
                            $location,
                            manageService,
                            alertService) {

                            $scope.loading = false;

                            // Convenience functions so we can track changing views for loading purposes
                            $rootScope.$on("$routeChangeStart", function() {
                                $scope.loading = true;
                            });
                            $rootScope.$on("$routeChangeSuccess", function() {
                                $scope.loading = false;
                            });
                            $rootScope.$on("$routeChangeError", function() {
                                $scope.loading = false;
                            });
                            $scope.current_route_matches = function(key) {
                                return $location.path().match(key);
                            };
                            $scope.go = function(path) {
                                $location.path(path);
                            };

                            window.service = manageService;
                        }
                    ]);

                    // viewName

                    app.config(["$routeProvider", "$locationProvider",
                        function($routeProvider, $locationProvider) {
                            function _fetchLinks(IndexService, $route, alertService) {
                                return IndexService.fetch_links($route.current.params.username).then(function(result) {

                                    // providers Loaded
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error),
                                        closeable: true,
                                        replace: false,
                                        group: "emailExternalAuth"
                                    });
                                });
                            }

                            // Setup a route where we just use the username
                            $routeProvider.when("/:username", {
                                controller: "manageController",
                                templateUrl: CJT.buildFullPath("mail/authentication/views/manageView.ptt"),
                                resolve: {
                                    providers: ["manageService", "$route", "alertService", _fetchLinks]
                                }
                            });

                            // default route
                            $routeProvider.otherwise({
                                "redirectTo": "/:username"
                            });

                        }
                    ]);

                    // end of using views

                    app.init = function() {
                        var appContent = angular.element("#content");

                        if (appContent[0] !== null) {
                            angular.bootstrap(appContent[0], ["App"]);
                        }
                        return app;
                    };

                    app.init();

                });

            return app;
        };
    }
);


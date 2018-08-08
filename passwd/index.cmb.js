/*
# passwd/views/ExternalAuthController.js          Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */
/* jshint -W003 */

define(
    'app/views/ExternalAuthController',[
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective"
    ],
    function(angular, LOCALE) {

        var app;
        try {
            app = angular.module("App"); // For runtime
            app.value("PAGE", window.PAGE);
            app.value("LOCALE", LOCALE);
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        ExternalAuthController.$inject = ["$scope", "PAGE", "LOCALE", "ExternalAuthService", "growl"];
        var controller = app.controller("ExternalAuthController", ExternalAuthController);

        return controller;
    }
);

var ExternalAuthController = function($scope, PAGE, LOCALE, ExternalAuthService, growl) {
    var _this = this;

    _this.PAGE = PAGE;
    _this.LOCALE = LOCALE;

    _this.remove_link = function(provider, provider_display_name) {
        var promise = ExternalAuthService.unlink_provider(provider.subject_unique_identifier, provider.provider_id)
            .then(function() {
                return ExternalAuthService.get_authn_links()
                    .then(function(results) {
                        _this.PAGE.configured_providers = results.data;
                        growl.success(LOCALE.maketext("Successfully unlinked the “[_1]” account “[_2]”", provider_display_name, provider.preferred_username));
                    }, function(error) {

                        // If the link was successfully removed but we had an error while fetching the updated list of links
                        growl.error(LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error));
                    });
            }, function(error) {

                // Failure to remove link
                growl.error(error);
            });

        return promise;
    };

    return _this;
};

/*
# passwd/services/ExternalAuthService.js              Copyright(c) 2015 cPanel, Inc.
#                                                               All rights Reserved.
# copyright@cpanel.net                                             http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */
/* jshint -W100 */

// Then load the application dependencies
define(
    'app/services/ExternalAuthService',[
        "angular",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
    ],
    function(angular, API, APIREQUEST) {

        var app = angular.module("App");

        function ExternalAuthServiceFactory($q) {
            var ExternalAuthService = {};

            ExternalAuthService.unlink_provider = function(subject_unique_identifier, provider_id) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("ExternalAuthentication", "remove_authn_link");
                apiCall.addArgument("subject_unique_identifier", subject_unique_identifier);
                apiCall.addArgument("provider_id", provider_id);

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

            ExternalAuthService.get_authn_links = function() {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("ExternalAuthentication", "get_authn_links");
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

            return ExternalAuthService;
        }

        ExternalAuthServiceFactory.$inject = ["$q"];
        return app.factory("ExternalAuthService", ExternalAuthServiceFactory);
    });

/*
# passwd/index.js                                    Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "cjt/modules",
        "uiBootstrap"
    ],
    function(angular, CJT) {
        "use strict";

        return function() {

            // First create the application
            angular.module("App", ["ui.bootstrap", "angular-growl", "cjt2.cpanel"]);

            // Then load the application dependencies
            var app = require(
                [
                    "cjt/bootstrap",
                    "app/views/ExternalAuthController",
                    "app/services/ExternalAuthService",
                ], function(BOOTSTRAP) {

                    angular.module("App");

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);


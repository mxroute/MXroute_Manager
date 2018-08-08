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
    [
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

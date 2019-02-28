/*
# passwd/views/ExternalAuthController.js          Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */
/* jshint -W003 */
define(
    [
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/directives/actionButtonDirective"
    ],
    function(angular, LOCALE) {
        "use strict";
        var app;
        try {
            app = angular.module("App"); // For runtime
            app.value("PAGE", window.PAGE);
            app.value("LOCALE", LOCALE);
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        var ExternalAuthController = function(
            $scope,
            PAGE,
            LOCALE,
            ExternalAuthService,
            alertService) {
            var _this = this;

            _this.PAGE = PAGE;
            _this.LOCALE = LOCALE;

            _this.remove_link = function(provider, providerDisplayName) {
                var promise = ExternalAuthService.unlink_provider(provider.subject_unique_identifier, provider.provider_id)
                    .then(function() {
                        return ExternalAuthService.get_authn_links()
                            .then(function(results) {
                                _this.PAGE.configured_providers = results.data;
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("Successfully unlinked the “[_1]” account “[_2]”", providerDisplayName, provider.preferred_username),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "passwdExternalAuth"
                                });

                            }, function(error) {

                                // If the link was successfully removed but we had an error while fetching the updated list of links
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system encountered an error while it tried to retrieve results, please refresh the interface: [_1]", error),
                                    closeable: true,
                                    replace: false,
                                    group: "passwdExternalAuth"
                                });
                            });
                    }, function(error) {

                        // Failure to remove link
                        alertService.add({
                            type: "danger",
                            message: error,
                            closeable: true,
                            replace: false,
                            group: "passwdExternalAuth"
                        });
                    });

                return promise;
            };

            return _this;
        };

        ExternalAuthController.$inject = ["$scope", "PAGE", "LOCALE", "ExternalAuthService", "alertService"];
        var controller = app.controller("ExternalAuthController", ExternalAuthController);

        return controller;
    }
);

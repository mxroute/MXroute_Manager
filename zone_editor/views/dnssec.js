/*
# zone_editor/views/dnssec.js                     Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/* jshint -W100 */

define(
    [
        "angular",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/decorators/growlDecorator",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/actionButtonDirective",
        "cjt/services/viewNavigationApi",
        "uiBootstrap"
    ],
    function(angular, LOCALE, PARSE) {

        var app = angular.module("cpanel.zoneEditor");

        var controller = app.controller(
            "DnsSecController",
            ["$scope", "$q", "$routeParams", "growl", "viewNavigationApi", "DNSSEC", "Features",
                function($scope, $q, $routeParams, growl, viewNavigationApi, DNSSEC, Features) {
                    var dnssec = this;
                    dnssec.domain = $routeParams.domain;

                    dnssec.is_loading = false;
                    dnssec.loading_error = false;
                    dnssec.loading_error_message = "";
                    dnssec.enabled = false;
                    dnssec.keys = [];

                    dnssec.goToView = function(view) {
                        viewNavigationApi.loadView(view);
                    };

                    function parseDnssecKeys(dnssecKeys) {

                    // we need to do a little massaging of the data to make it easier
                    // to work with in the angular templates and to help with being able to
                    // show a digest for a particular algorithm
                        for (var i = 0, len = dnssecKeys.length; i < len; i++) {
                            var key = dnssecKeys[i];
                            key.active = PARSE.parsePerlBoolean(key.active);

                            // We want to show the SHA-256 keys by default
                            for (var j = 0, digestLen = key.digests.length; j < digestLen; j++) {
                                var item = key.digests[j];
                                if (item.algo_num === "2") {
                                    key.selected_digest = item;
                                }
                            }

                            key.bits_msg = LOCALE.maketext("[quant,_1,bit,bits]", key.bits);

                            // select the first digest, if we don't see a SHA-256 key
                            if (!key.hasOwnProperty("selected_digest")) {
                                key.selected_digest = key.digests[0];
                            }
                        }
                    }

                    dnssec.toggle_status = function() {
                        if (dnssec.enabled) {
                            dnssec.show_disable_warning = true;
                            return;
                        }

                        return DNSSEC.enable(dnssec.domain)
                            .then(function(result) {
                                return DNSSEC.fetch(dnssec.domain)
                                    .then(function(result) {
                                        if (result.length) {
                                            dnssec.enabled = true;
                                            dnssec.keys = result;
                                            parseDnssecKeys(dnssec.keys);
                                        } else {
                                            dnssec.enabled = false;
                                        }
                                    })
                                    .catch(function(error) {
                                        growl.error(error);
                                    });
                            })
                            .catch(function(error) {
                                growl.error(error);
                            });
                    };

                    dnssec.confirm_disable = function() {
                        return DNSSEC.disable(dnssec.domain)
                            .then(function(result) {
                                dnssec.enabled = false;
                            })
                            .catch(function(error) {
                                growl.error(error);
                            })
                            .finally(function() {
                                dnssec.show_disable_warning = false;
                            });
                    };

                    dnssec.cancel_disable = function() {
                        dnssec.show_disable_warning = false;
                    };

                    dnssec.load = function() {
                        dnssec.is_loading = true;
                        return DNSSEC.fetch(dnssec.domain)
                            .then(function(result) {
                                if (result.length) {
                                    dnssec.enabled = true;
                                    dnssec.keys = result;
                                    parseDnssecKeys(dnssec.keys);
                                } else {
                                    dnssec.enabled = false;
                                }
                            })
                            .catch(function(error) {
                                growl.error(error);
                            })
                            .finally(function() {
                                dnssec.is_loading = false;
                            });
                    };

                    dnssec.init = function() {
                        if (Features.dnssec) {
                            dnssec.load();
                        } else {
                            dnssec.loading_error = true;
                            dnssec.loading_error_message = LOCALE.maketext("This feature is not available to your account.");
                        }
                    };

                    dnssec.init();
                }
            ]);

        return controller;
    }
);

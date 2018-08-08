/*
# base/frontend/paper_lantern/security/tls_wizard/directives/identityVerificationDirective.js
#                                                 Copyright(c) 2016 cPanel, Inc.
#                                                           All rights reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale",
    ],
    function(angular, LOCALE) {
        "use strict";

        // Retrieve the current application
        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        var TEMPLATE_PATH = "directives/identityVerification.phtml";

        // Only these “type”s are passed through to HTML.
        var ALLOWED_HTML_INPUT_TYPES = {
            date: true,
            number: true,
            email: true,
            tel: true,
        };

        // Only these return false from use_html_input().
        var NON_HTML_INPUT_TYPES = {
            country_code: true,
            choose_one: true,
        };

        var str = {
            required: LOCALE.maketext("Required"),
            preamble: LOCALE.maketext("To ensure quick service, fill out the form below as completely as possible."),
        };

        function use_html_input(item) {
            return !( item.type in NON_HTML_INPUT_TYPES );
        }

        function get_html_input_type(item) {
            return ( ALLOWED_HTML_INPUT_TYPES[item.type] ? item.type : "text" );
        }

        function get_date_format_description() {
            var now = new Date();
            var today_yyyy_mm_dd = now.toISOString().replace(/T.*/, "");

            return LOCALE.maketext("Use the format “[_1]”. For example, today is “[_2]”.", "YYYY-MM-DD", today_yyyy_mm_dd);
        }

        app.directive("identityVerification", [
            function() {
                return {
                    templateUrl: TEMPLATE_PATH,
                    restrict: "E",
                    scope: {
                        items: "=",
                        models: "=",
                        countries: "=",
                        vhostName: "=",
                    },
                    link: function(scope, element) {
                        angular.extend(
                            scope,
                            {
                                SELF: scope,

                                STR: str,

                                get_html_input_type: get_html_input_type,
                                use_html_input: use_html_input,
                                get_date_format_description: get_date_format_description,
                            }
                        );

                        scope.items.forEach( function(item) {
                            item.is_optional = Boolean(+item.is_optional);
                        } );
                    },
                };
            }
        ]);
    }
);

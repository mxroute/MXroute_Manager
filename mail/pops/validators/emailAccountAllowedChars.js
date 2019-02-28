/*
# base/frontend/paper_lantern/mail/pops/validators/emailAccountAllowedChars.js Copyright(c) 2017 cPanel, Inc.
#                                                                                        All rights Reserved.
# copyright@cpanel.net                                                                      http://cpanel.net
# This code is subject to the cPanel license.                              Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular"
    ],
    function(angular) {

        /**
         * Directive that checks to make sure an input only allows a-z, A-Z, 0-9, ., -, and _
         *
         * @example
         * <input type="text" name="account" email-allowed-chars>
         */

        var module;
        try {
            module = angular.module("cpanel.mail.Pops");
        } catch (e) {
            module = angular.module("cpanel.mail.Pops", []);
        }

        module.directive("emailAllowedChars", function() {
            return {
                require: "ngModel",
                restrict: "A",
                link: function( scope, element, attrs, ngModel ) { // eslint-disable-line no-unused-vars
                    // "You can only enter letters, numbers, periods, hyphens, and underscores."
                    var pattern = /[^a-zA-Z0-9.\-_]/;

                    ngModel.$validators.emailAllowedChars = function(model, view) { // eslint-disable-line no-unused-vars
                        if ( !ngModel.$isEmpty(view) ) {
                            return !pattern.test(view);
                        }
                        return true;
                    };
                }
            };
        });

    }
);

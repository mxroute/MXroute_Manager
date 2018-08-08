/*
# base/frontend/paper_lantern/mail/pops/validators/emailAccountSafePeriods.js Copyright(c) 2017 cPanel, Inc.
#                                                                                       All rights Reserved.
# copyright@cpanel.net                                                                     http://cpanel.net
# This code is subject to the cPanel license.                             Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular"
    ],
    function(angular) {

        /**
         * Directive that makes sure an input doesn't start or end with a period, or contain two consecutive periods
         *
         * @example
         * <input type="text" name="account" email-safe-periods>
         */

        var module;
        try {
            module = angular.module("cpanel.mail.Pops");
        } catch (e) {
            module = angular.module("cpanel.mail.Pops", []);
        }

        module.directive("emailSafePeriods", function() {
            return {
                require: "ngModel",
                restrict: "A",
                link: function( scope, element, attrs, ngModel ) { // eslint-disable-line no-unused-vars
                    ngModel.$validators.emailSafePeriods = function(model, view) { // eslint-disable-line no-unused-vars
                        if ( !ngModel.$isEmpty(view) ) {
                            return view.indexOf(".") !== 0 && view.lastIndexOf(".") !== (view.length - 1) && view.indexOf("..") === -1;
                        }
                        return true;
                    };
                }
            };
        });

    }
);

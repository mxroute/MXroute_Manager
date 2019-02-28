/*
# base/frontend/paper_lantern/mail/pops/filters/emailLocaleString.js Copyright(c) 2017 cPanel, Inc.
#                                                                              All rights Reserved.
# copyright@cpanel.net                                                            http://cpanel.net
# This code is subject to the cPanel license.                    Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale"
    ],
    function(angular, LOCALE) {

        /**
         * Filter that accepts an email address and a locale string and returns the localized text
         * @param {String} email        The email address to inject into the locale string
         * @param {String} localeString The locale string to inject the email address into
         *
         * @example
         * <a class="btn btn-link" title="{{ emailAccount.email | emailLocaleString:'Change password for “[_1]”'">
         *
         * NOTE: The locale string passed to this filter must be defined in a maketext string. ## no extract maketext
         */

        var module;

        try {
            module = angular.module("cpanel.mail.Pops");
        } catch (e) {
            module = angular.module("cpanel.mail.Pops", []);
        }

        module.filter("emailLocaleString", function() {
            return function(email, localeString) {
                return LOCALE.makevar(localeString, email);
            };
        });

    }
);

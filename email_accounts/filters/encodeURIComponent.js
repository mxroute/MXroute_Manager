/*
# email_accounts/filters/encodeURIComponent.js                        Copyright(c) 2018 cPanel, Inc.
#                                                                               All rights Reserved.
# copyright@cpanel.net                                                             http://cpanel.net
# This code is subject to the cPanel license.                     Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
    ],
    function(angular) {

        "use strict";

        /**
         * A filter to provide a wrapper around window.encodeURIComponent for use in Angular markup, mostly useful for building links
         * @param  {string} value The value to provide to encodeURIComponent
         * @returns {string}       Returns the value filtered through window.encodeURIComponent
         *
         * @example
         * <a href="../some/page.html#/{{ someValue | encodeURIComponent }}" target="_blank">
         */

        var module;
        try {
            module = angular.module("cpanel.emailAccounts");
        } catch (e) {
            module = angular.module("cpanel.emailAccounts", []);
        }

        module.filter("encodeURIComponent", function() {
            return window.encodeURIComponent;
        });

    }
);

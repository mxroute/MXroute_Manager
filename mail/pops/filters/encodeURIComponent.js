/*
# base/frontend/paper_lantern/mail/pops/filters/encodeURIComponent.js Copyright(c) 2017 cPanel, Inc.
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

        /**
         * A filter to provide a wrapper around window.encodeURIComponent for use in Angular markup, mostly useful for building links
         * @param  {String} value The value to provide to encodeURIComponent
         * @return {String}       Returns the value filtered through window.encodeURIComponent
         *
         * @example
         * <a href="../some/page.html#/{{ someValue | encodeURIComponent }}" target="_blank">
         */

        var module;
        try {
            module = angular.module("cpanel.mail.Pops");
        } catch (e) {
            module = angular.module("cpanel.mail.Pops", []);
        }

        module.filter("encodeURIComponent", function() {
            return window.encodeURIComponent;
        });

    }
);

/*
# file_and_directory_restoration/filters/fileSizeFilter.js
#                                                    Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "cjt/util/locale"
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

        app.filter("convertedSize", function() {
            return function(size) {
                return LOCALE.format_bytes(size);
            };
        });
    });

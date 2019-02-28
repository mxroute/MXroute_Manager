/*
 * wordpress/filters/removeHomePath.js                Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define([
    "angular",
    "lodash",
], function(
    angular,
    _
) {

    var app;
    try {
        app = angular.module("cpanel.wordpress");
    }
    catch(e) {
        // for unit tests that don't load the index.js
        app = angular.module("cpanel.wordpress", []);
    }

    return app.filter("removeHomePath", [
        "pageState",
        function(pageState) {

            /**
             * Trims the user's home directory off of the beginning of file paths.
             *
             * @param  {String} fullPath   The path that will be processed.
             * @return {String}            The trimmed path.
             */
            return function (fullPath) {
                if (!angular.isString(fullPath)) {
                    throw new Error("Filter: removeHomePath requires you to pass the fullPath as an argument.");
                }

                if (!pageState || !pageState.homeDir) {
                    throw new Error("Filter: removeHomePath depends on the injected pageState.homeDir variable that must be defined.");
                }

                var regex = new RegExp("^" + _.escapeRegExp(pageState.homeDir));
                return fullPath.replace(regex, "").replace(/^\/+/, "/");
            };
        }
    ]);
});
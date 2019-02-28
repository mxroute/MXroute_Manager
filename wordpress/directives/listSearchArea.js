/*
 * wordpress/directives/listSearchArea.js             Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define([
    "angular",
    "cjt/core",
    "cjt/util/locale",
    "app/directives/modelToLowerCase",
], function(
    angular,
    CJT,
    LOCALE
) {

    /**
     * The search area for the instance selection/list view. Provides controls to
     * filter items in the list of installation instances.
     */

    var APP_RELATIVE_PATH = "directives/listSearchArea.ptt";
    var BASE_RELATIVE_PATH = "wordpress/" + APP_RELATIVE_PATH;

    angular.module("cpanel.wordpress").directive("listSearchArea", [
        function() {
            return {
                templateUrl: CJT.config.debug ? CJT.buildFullPath(BASE_RELATIVE_PATH) : BASE_RELATIVE_PATH,
            };
        }
    ]);
});
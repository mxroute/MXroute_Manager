/*
 * wordpress/directives/listInstance.js               Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define([
    "angular",
    "cjt/core",
    "cjt/filters/wrapFilter",
    "app/filters/removeHomePath",
], function(
    angular,
    CJT
) {
    var APP_RELATIVE_PATH = "directives/listInstance.ptt";
    var BASE_RELATIVE_PATH = "wordpress/" + APP_RELATIVE_PATH;

    /**
     * An individual instance in the list of instances on the selction screen.
     */

    angular.module("cpanel.wordpress").directive("listInstance", function() {

        var InstallationInstance = function() {};
        angular.extend(InstallationInstance.prototype, {

            /**
             * Calls the provided onSelect handler.
             *
             * @method select
             */
            select: function() {
                this.onSelect({ instance: this.model });
            }
        });

        return {
            restrict: "A",
            controllerAs: "instance",
            bindToController: true,
            scope: {
                model: "=",
                onSelect: "&",
            },
            controller: InstallationInstance,
            templateUrl: CJT.config.debug ? CJT.buildFullPath(BASE_RELATIVE_PATH) : BASE_RELATIVE_PATH,
        };
    });
});
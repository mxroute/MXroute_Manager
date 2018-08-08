/*
# _assets/views/sidebarController.js              Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular"
    ],
    function(angular) {

        // Retrieve the current application
        var app = angular.module("Master");

        // Setup the controller
        var controller = app.controller(
            "sidebarController", [
                "$scope",
                function($scope) {

                // Placeholder controller for the sidebar to provide sidebar angular foothold

                }
            ]
        );

        return controller;
    }
);

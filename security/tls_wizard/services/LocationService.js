/*
* base/frontend/paper_lantern/security/tls_wizard/services/LocationService.js
*                                                 Copyright(c) 2016 cPanel, Inc.
*                                                           All rights reserved.
* copyright@cpanel.net                                         http://cpanel.net
* This code is subject to the cPanel license. Unauthorized copying is prohibited
*/


/* global define: false */
/* jshint -W100 */
define(
    [
        "angular",
    ],
    function(angular) {
        "use strict";

        return angular.module("App").factory( "LocationService", [
            "$location",
            function the_factory($location) {

                return {
                    go_to_last_create_route: function() {
                        return $location.path(this.last_create_route());
                    },

                    last_create_route: function() {
                        if (!localStorage.getItem("tls_wizard_create_route")) {
                            localStorage.setItem("tls_wizard_create_route", "/create");
                        }

                        return localStorage.getItem("tls_wizard_create_route");
                    },

                    go_to_simple_create_route: function() {
                        localStorage.removeItem("tls_wizard_create_route");
                        return this.go_to_last_create_route();
                    },

                    go_to_advanced_create_route: function() {
                        localStorage.setItem("tls_wizard_create_route", "/create-advanced");
                        return this.go_to_last_create_route();
                    },
                };
            }
        ] );
    }
);

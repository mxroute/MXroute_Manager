/*
* base/frontend/paper_lantern/security/tls_wizard/services/CountriesService.js
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

        return angular.module("App").factory( "CountriesService", [
            function the_factory() {
                return CPANEL.PAGE.countries;
            }
        ] );
    }
);

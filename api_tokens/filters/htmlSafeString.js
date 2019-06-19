/*
# api_tokens/filters/htmlSafeString.js               Copyright 2019 cPanel, L.L.C.
#                                                             All rights Reserved.
# copyright@cpanel.net                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "lodash"
    ],
    function(angular, _) {

        "use strict";

        /**
         * Wrapper for lodash escape
         *
         * @module htmlSafeString
         * @memberof cpanel.apiTokens
         *
         * @example
         * {{ domain.domain | htmlSafeString }}
         *
         */

        var MODULE_NAMESPACE = "cpanel.apiTokens.htmlSafeString.filter";
        var MODULE_REQUIREMENTS = [ ];

        var CONTROLLER_INJECTABLES = [];
        var CONTROLLER = function CopyFieldController() {
            return _.escape;
        };

        var module = angular.module(MODULE_NAMESPACE, MODULE_REQUIREMENTS);
        module.filter("htmlSafeString", CONTROLLER_INJECTABLES.concat(CONTROLLER));

        return {
            "class": CONTROLLER,
            "namespace": MODULE_NAMESPACE
        };
    }
);

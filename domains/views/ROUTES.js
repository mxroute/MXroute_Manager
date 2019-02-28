/*
# domains/views/ROUTES.js                          Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

/** @namespace cpanel.domains.views.ROUTES */

define(
    [
        "cjt/util/locale"
    ],
    function(LOCALE) {

        "use strict";

        var ROUTES = [
            {
                "id": "listDomains",
                "route": "/",
                "hideTitle": false,
                "controller": "listDomains",
                "templateUrl": "views/listDomains.ptt",
                "title": LOCALE.maketext("List Domains"),
                "resolve": {
                    "currentDomains": ["domains", function($service) {
                        return $service.get();
                    }]
                }
            },
            {
                "id": "createDomain",
                "route": "/create",
                "controller": "createDomain",
                "templateUrl": "views/createDomain.ptt",
                "title": LOCALE.maketext("Create a New Domain"),
                "resolve": {
                    "domainTypes": ["domains", function($service) {
                        return $service.getTypes();
                    }],
                    "currentDomains": ["domains", function($service) {
                        return $service.get();
                    }]
                }
            },
            {
                "id": "manageDomain",
                "route": "/manage",
                "controller": "manageDomain",
                "templateUrl": "views/manageDomain.ptt",
                "hideTitle": true,
                "title": LOCALE.maketext("Manage the Domain"),
                "resolve": {
                    "domainTypes": ["domains", function($service) {
                        return $service.getTypes();
                    }],
                    "currentDomains": ["domains", function($service) {
                        return $service.get();
                    }]
                }
            }

        ];

        return ROUTES;
    }
);

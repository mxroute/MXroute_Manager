/*
# email_deliverability/controllers/ROUTES.js         Copyright 2018 cPanel, L.L.C.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define */

define(
    [
        "cjt/util/locale",
        "cjt/core"
    ],
    function(LOCALE, CJT) {

        "use strict";

        /**
         * @module ROUTES
         */

        /** @static */
        var ROUTES = [
            {
                "id": "listDomains",
                "route": "/",
                "hideTitle": true,
                "controller": "ListDomainsController",
                "controllerAs": "listDomains",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/listDomains.ptt"),
                "title": LOCALE.maketext("List Domains"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                }
            },
            {
                "id": "manageDomain",
                "route": "/manage",
                "controller": "ManageDomainController",
                "controllerAs": "manageDomain",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/manageDomain.ptt"),
                "hideTitle": true,
                "title": LOCALE.maketext("Manage the Domain"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                },
                "parentID": "listDomains"
            },
            {
                "id": "manageDomainSPF",
                "route": "/manage/spf",
                "controller": "ManageDomainSPFController",
                "controllerAs": "manageDomainSPF",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/manageDomainSPF.ptt"),
                "hideTitle": true,
                "title": LOCALE.maketext("Customize an [output,abbr,SPF,Sender Policy Framework] Record"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                },
                "parentID": "manageDomain"
            },
            {
                "id": "manageDomainDKIM",
                "route": "/manage/dkim",
                "controller": "ManageDomainDKIMController",
                "controllerAs": "manageDomainDKIM",
                "templateUrl": CJT.buildFullPath("shared/js/email_deliverability/views/manageDomainDKIM.ptt"),
                "hideTitle": true,
                "title": LOCALE.maketext("View a [output,acronym,DKIM,Domain Keys Identified Mail] Private Key"),
                "resolve": {
                    "initialDomains": ["DomainsService", function($service) {
                        return $service.fetchAll();
                    }]
                },
                "parentID": "manageDomain"
            }
        ];

        ROUTES.forEach(function addBreadcrumbs(ROUTE) {
            ROUTE.breadcrumb = {
                id: ROUTE.id,
                name: ROUTE.title,
                path: ROUTE.route,
                parentID: ROUTE.parentID
            };
        });

        return ROUTES;
    }
);

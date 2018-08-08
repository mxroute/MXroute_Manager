/*
* base/frontend/paper_lantern/security/tls_wizard/services/IdVerDefaults.js
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
        "lodash",
        "app/services/CertificatesService",
    ],
    function(angular, _) {
        "use strict";

        return angular.module("App").factory( "IdVerDefaults", [
            "CertificatesService",
            function the_factory(CertificatesService) {
                return {
                    restore_previous: function( id_ver, saved_idver ) {
                        _.assign( id_ver, saved_idver );

                        CertificatesService.get_products().forEach( function(p) {
                            if (!p.x_identity_verification) {
                                return;
                            }

                            p.x_identity_verification.forEach( function(id_v) {
                                if (id_v.type === "date") {

                                    // This was doing an “in” check, but
                                    // there were null values getting put into
                                    // the Date constructor, which yields
                                    // 1 Jan 1970 00:00:00 UTC.
                                    if (id_ver[id_v.name]) {
                                        id_ver[id_v.name] = new Date(id_ver[id_v.name]);
                                    }
                                }
                            } );
                        } );
                    },

                    set_defaults: function set_defaults(id_ver) {

                        // Each Set will store identity verification variable names,
                        // such as “date_of_incorporation”. Those variables then
                        // will receive default values.
                        //
                        // The idea is that, if one provider calls a field
                        // “countryCode”, and another calls it “country_name”, both
                        // will still receive the same reasonable default.
                        //
                        // It is ASSUMED that different providers will use sensible
                        // names that don’t clobber each other’s products, e.g.,
                        // “Hank’s SSL” won’t have a field named “localityName” that
                        // actually takes a “date” or something, which would put in
                        // a nonsensical default for that value in “Sal’s SSL”’s
                        // products.
                        //
                        var type_defaults = {};

                        // We could put date in here, but since the field is
                        // optional let’s let it lie.
                        ["country_code"].forEach( function(t) {
                            type_defaults[t] = new Set();
                        } );

                        CertificatesService.get_products().forEach( function(p) {
                            if (!p.x_identity_verification) {
                                return;
                            }

                            p.x_identity_verification.forEach( function(id_v) {
                                if (id_v.type in type_defaults) {
                                    type_defaults[id_v.type].add(id_v.name);
                                }
                            } );
                        } );

                        type_defaults.country_code.forEach( function(v) {
                            id_ver[v] = CPANEL.PAGE.guessed_country_code;
                        } );
                    },
                };
            }
        ] );
    }
);

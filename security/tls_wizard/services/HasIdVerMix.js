/*
base/frontend/paper_lantern/security/tls_wizard/services/HasIdVerMix.js
                                                  Copyright(c) 2016 cPanel, Inc.
                                                            All rights reserved.
copyright@cpanel.net                                           http://cpanel.net
This code is subject to the cPanel license.  Unauthorized copying is prohibited.
*/


/* global define: false */
/* jshint -W100 */
/* eslint-disable camelcase */

define(
    [
        "angular",
        "lodash",
    ],
    function(_) {
        "use strict";

        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        return app.factory("HasIdVerMix", [
            "$log",
            function the_factory($log) {
                return {
                    set_identity_verification: function(identity_verification) {
                        if (typeof identity_verification !== "object") {
                            $log.error("bad idver", identity_verification);
                            throw new Error();
                        }

                        this.identity_verification = identity_verification;
                    },

                    get_identity_verification: function() {
                        return this.identity_verification;
                    },
                };
            },
        ]);
    }
);

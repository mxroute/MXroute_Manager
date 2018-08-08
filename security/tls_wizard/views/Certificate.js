/*
 * base/frontend/paper_lantern/security/tls_wizard/views/Certificate.js
 *                                                 Copyright(c) 2016 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */


/* global define: false */
/* jshint -W100 */
define(
    [
        "angular",
        "lodash",
        "app/services/HasIdVerMix",
    ],
    function(angular, _) {
        "use strict";

        angular.module("App").factory("Certificate", [
            "HasIdVerMix",
            function(HasIdVerMix) {
                function Certificate(initObj) {
                    this.reset();
                    if (initObj) {
                        this.init(initObj);
                    }
                }

                _.assign(Certificate.prototype, HasIdVerMix);

                _.assign(Certificate.prototype, {
                    get_product: function() {
                        return this.selected_product;
                    },

                    set_product: function(product_obj) {
                        this.selected_product = product_obj;
                    },

                    set_price: function(price) {
                        this.total_price = price;
                    },

                    get_price: function() {
                        return this.total_price;
                    },

                    set_domains: function(domains) {
                        this.domains = domains;
                    },

                    get_domains: function() {
                        return this.domains;
                    },

                    get_subject_names: function() {
                        return this.domains.map(function(domain) {

                            // Prefer DNS-based DCV. (We only would
                            // have done DNS if there was a problem
                            // with HTTP.)
                            return {
                                type: "dNSName",
                                name: domain.domain,
                                dcv_method: domain.dcvPassed.dns ? "dns" : "http",
                            };
                        });
                    },

                    set_virtual_hosts: function(vhost_names) {
                        this.virtual_hosts = vhost_names;
                    },

                    get_virtual_hosts: function() {
                        return this.virtual_hosts;
                    },

                    get_validity_period: function() {
                        return this.selected_product.validity_period || [1, "year"];
                    },

                    reset: function() {
                        this.domains = [];
                        this.total_price = null;
                        this.virtual_hosts = [];
                        this.selected_product = null;
                        this.product_price = 0;
                        this.product_wildcard_price = 0;
                        this.identity_verification = null;
                    },

                    toJSON: function() {
                        return {
                            domains: this.domains,
                            total_price: this.total_price,
                            virtual_hosts: this.virtual_hosts,
                            selected_product: this.selected_product,
                            product_price: this.product_price,
                            product_wildcard_price: this.product_wildcard_price,
                            identity_verification: this.get_identity_verification(),
                        };
                    },

                    init: function(initObj) {
                        _.assign(this, initObj);
                    },
                });

                return Certificate;
            }
        ]);
    }
);

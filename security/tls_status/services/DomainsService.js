/*
# templates/tls_status/services/DomainsService.js               Copyright 2017 cPanel, Inc.
#                                                               All rights Reserved.
# copyright@cpanel.net                                             http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: false */
/* eslint-env es6 */
/* eslint camelcase: 0 */
/* jshint -W100 */
/* jshint -W089 */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/services/APICatcher",
        "cjt/io/uapi-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
    ],
    function(angular, _, LOCALE, api, APIREQUEST) {
        "use strict";

        var AUTOSSL_CAN_WILDCARD = false;

        var app = angular.module("App");

        return app.factory("DomainsService", ["APICatcher", function DomainsService(api) {

            var domains;
            var domain_types;
            var installed_hosts;
            var ssl_domains;
            var auto_ssl_enabled = null;
            var autossl_override_enabled = null;
            var domain_search_options;
            var products = null;
            var autossl_excluded_domains = null;
            var available_product_upgrades = null;
            var upgrades_available = {};
            var validation_ranks = {
                "unsecured": 0,
                "self-signed": 0,
                "dv": 1,
                "autossl": 1,
                "ov": 2,
                "ev": 3
            };

            var validation_type_names = {
                "self-signed": LOCALE.maketext("Self-signed"),
                "unsecured": LOCALE.maketext("Unsecured"),
                "dv": LOCALE.maketext("Domain Validated"),
                "ov": LOCALE.maketext("Organization Validated"),
                "ev": LOCALE.maketext("Extended Validation"),
                "autossl": LOCALE.maketext("[asis,AutoSSL] Domain Validated")
            };

            function get_validation_type_name(validation_type) {
                if (validation_type_names[validation_type]) {
                    return validation_type_names[validation_type];
                }

                return LOCALE.maketext("Unknown Certificate Type");
            }

            /**
             * This is the description
             *
             * @method get_validation_ranks
             *
             * @param  {String} certiface asdflkjasdf
             *
             * return jsdocret maybe?
             *
             */
            function get_validation_ranks() {
                return validation_ranks;
            }


            function make_ssl_type_name(certificate) {
                if (!certificate) {
                    return "";
                }

                return get_validation_type_name(certificate.validation_type, certificate.is_autossl);
            }

            function is_autossl_enabled() {

                if (auto_ssl_enabled !== null) {
                    return auto_ssl_enabled;
                }
                auto_ssl_enabled = PAGE.autossl_enabled.toString() === "1" && PAGE.autossl_provider !== "";

                return is_autossl_enabled();

            }

            function is_autossl_override_enabled() {

                if (autossl_override_enabled !== null) {
                    return autossl_override_enabled;
                }

                autossl_override_enabled = PAGE.autossl_override_enabled.toString() === "1";

                return is_autossl_override_enabled();
            }

            function get_domain_search_options() {
                if (domain_search_options) {
                    return domain_search_options;
                }

                domain_search_options = {
                    domainType: {
                        label: LOCALE.maketext("Domain Types:"),
                        item_key: "type",
                        options: [{
                            "value": "main_domain",
                            "label": LOCALE.maketext("Main"),
                            "description": LOCALE.maketext("Only list Main domains.")
                        }, {
                            "value": "sub_domains",
                            "label": LOCALE.maketext("Subdomain"),
                            "description": LOCALE.maketext("Only list Subdomains.")
                        }, {
                            "value": "addon_domains",
                            "label": LOCALE.maketext("Addon Domains"),
                            "description": LOCALE.maketext("Only list Addon domains.")
                        }, {
                            "value": "parked_domains",
                            "label": LOCALE.maketext("Parked Domains"),
                            "description": LOCALE.maketext("Only list Parked domains.")
                        }, {
                            "value": "www_mail_domains",
                            "label": LOCALE.maketext("[asis,www] and [asis,mail] Domains"),
                            "description": LOCALE.maketext("Only list [asis,www] and [asis,mail] domains.")
                        }, {
                            "value": "proxy_sub_domains",
                            "label": LOCALE.maketext("Proxy Subdomains"),
                            "description": LOCALE.maketext("Only list Proxy Subdomains.")
                        }]
                    },
                    sslType: {
                        label: LOCALE.maketext("[asis,SSL] Types:"),
                        item_key: "certificate_type",
                        options: [{
                            "value": "unsecured",
                            "label": LOCALE.maketext("Unsecured"),
                            "description": LOCALE.maketext("Only list unsecured domains.")
                        }, {
                            "value": "self-signed",
                            "label": LOCALE.maketext("Self-signed"),
                            "description": LOCALE.maketext("Only list self-signed domains.")
                        }, {
                            "value": "autossl",
                            "label": LOCALE.maketext("[asis,AutoSSL DV] Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,AutoSSL DV] Certificates.")
                        }, {
                            "value": "dv",
                            "label": LOCALE.maketext("DV Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,DV] Certificates.")
                        }, {
                            "value": "ov",
                            "label": LOCALE.maketext("OV Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,OV] Certificates.")
                        }, {
                            "value": "ev",
                            "label": LOCALE.maketext("EV Certificate"),
                            "description": LOCALE.maketext("Only list domains with [asis,EV] Certificates.")
                        }]
                    },
                    sslStatus: {
                        label: LOCALE.maketext("[asis,SSL] Statuses:"),
                        item_key: "certificate_status",
                        options: [{
                            "value": "active",
                            "label": LOCALE.maketext("Active"),
                            "description": LOCALE.maketext("Only list the domains with active certificates.")
                        }, {
                            "value": "expired",
                            "label": LOCALE.maketext("Expired"),
                            "description": LOCALE.maketext("Only list domains whose certificate is expiring soon.")
                        }, {
                            "value": "expiring_soon",
                            "label": LOCALE.maketext("Expiring Soon"),
                            "description": LOCALE.maketext("Only list domains whose certificate is expiring soon.")
                        }, {
                            "value": "unsecured",
                            "label": LOCALE.maketext("Unsecured"),
                            "description": LOCALE.maketext("Only list unsecured domains.")
                        }, {
                            "value": "has_autossl_problem",
                            "label": LOCALE.maketext("Has [asis,AutoSSL] Problems"),
                            "description": LOCALE.maketext("Only list the domains with [asis,AutoSSL] problems.")
                        }]
                    }
                };

                // Only want to display this column if autossl is enabled
                if (is_autossl_enabled()) {
                    domain_search_options.autoSSLStatus = {
                        label: LOCALE.maketext("[asis,AutoSSL] Statuses:"),
                        item_key: "domain_autossl_status",
                        options: [{
                            "value": "included",
                            "label": LOCALE.maketext("Included"),
                            "description": LOCALE.maketext("Only list domains that are not explicitly excluded during [asis,AutoSSL].")
                        }, {
                            "value": "excluded",
                            "label": LOCALE.maketext("Excluded"),
                            "description": LOCALE.maketext("Only list domains that will be explicitly excluded from [asis,AutoSSL].")
                        }]
                    };
                }

                return get_domain_search_options();
            }

            function _get_installed_certificate_for_domain_obj(domain_obj) {
                var ssl_domains = get_ssl_domains();
                var certificate = ssl_domains[domain_obj.virtual_host];
                return certificate;
            }

            function get_certificate_status(domain_obj) {
                var certificate_status = "";
                var certificate = _get_installed_certificate_for_domain_obj(domain_obj);

                if (!certificate) {

                    // There is not certificate for the vhost
                    certificate_status = LOCALE.maketext("No certificate available.");

                    if (is_autossl_enabled()) {
                        if (domain_obj.is_wildcard) {
                            certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] does not support explicit wildcard domains.") + " " + LOCALE.maketext("You must purchase a certificate to secure this domain.");
                        } else if (domain_obj.excluded_from_autossl) {
                            certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] will attempt to secure this website, but the domain will be excluded.");
                        } else {
                            if (domain_obj.is_www) {
                                certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] will attempt to secure the domain when the parent domain “[_1]” renews.", domain_obj.www_parent);
                            } else {
                                certificate_status += " " + LOCALE.maketext("[asis,AutoSSL] will attempt to secure the domain the next time it runs.");
                            }
                        }
                    }

                } else {

                    if (!domain_obj.certificate_covers_domain) {
                        certificate_status = LOCALE.maketext("The installed certificate does not cover this domain.");
                    } else if (certificate.is_expired) {
                        certificate_status = LOCALE.maketext("Expired on [datetime,_1].", certificate.not_after);
                    } else {
                        certificate_status = LOCALE.maketext("Expires on [datetime,_1].", certificate.not_after);
                    }

                    if (domain_obj.certificate_will_autossl && domain_obj.excluded_from_autossl) {
                        if (domain_obj.is_www) {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL] when the parent domain “[_1]” renews, but this domain will be excluded.", domain_obj.www_parent);
                        } else {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL], but this domain will be excluded.");
                        }
                    } else if (domain_obj.certificate_will_autossl) {
                        if (domain_obj.is_www) {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL] when the parent domain “[_1]” renews.", domain_obj.www_parent);
                        } else {
                            certificate_status += " " + LOCALE.maketext("The certificate will renew via [asis,AutoSSL].");
                        }
                    } else if (!AUTOSSL_CAN_WILDCARD && domain_obj.is_wildcard) {
                        certificate_status += " " + LOCALE.maketext("This server cannot provision [asis,AutoSSL] certificates that secure wildcard domains.");
                    } else if (!certificate.is_autossl && !is_autossl_override_enabled()) {
                        certificate_status += " " + LOCALE.maketext("The certificate will not renew via [asis,AutoSSL] because it was not issued via [asis,AutoSSL].");
                    }

                }

                return certificate_status;
            }

            function _get_available_upgrades(certificate) {
                var validation_type = certificate ? certificate.validation_type : "unsecured";
                var v_rank = validation_ranks[validation_type] || 0;

                if (upgrades_available[v_rank]) {
                    return upgrades_available[v_rank];
                }

                var products_available = get_available_product_upgrades();
                upgrades_available[v_rank] = products_available.filter(function(upgrade) {
                    if (validation_ranks[upgrade] > v_rank) {
                        return true;
                    }
                    return false;
                });

                return _get_available_upgrades(certificate);
            }

            function _get_upgrade_btn_label(certificate) {

                var buttonLabel = "";

                var upgradesAvailable = _get_available_upgrades();

                if (!certificate || certificate.is_self_signed) {
                    buttonLabel = LOCALE.maketext("Purchase Certificate");
                } else {

                    if (certificate.will_autossl && upgradesAvailable.length) {

                        // Implies DV, Upgrade is possible
                        buttonLabel = LOCALE.maketext("Upgrade Certificate");
                    } else if (certificate.is_expired || certificate.expiring_soon) {

                        // Not auto-ssl, but renewable
                        buttonLabel = LOCALE.maketext("Renew Certificate");
                    } else if (upgradesAvailable.length) {
                        buttonLabel = LOCALE.maketext("Upgrade Certificate");
                    }

                }

                return buttonLabel;
            }

            function get_upgrade_btn_title(domain, certificate) {

                var upgrades_available = get_available_product_upgrades(certificate);

                var btn_label = "";

                if (!certificate || certificate.is_self_signed) {
                    btn_label = LOCALE.maketext("Purchase certificate for “[_1]”.", domain);
                } else {

                    if (certificate.will_autossl && upgrades_available.length) {

                        // Implies DV, Upgrade is possible
                        btn_label = LOCALE.maketext("Upgrade certificate for “[_1]”.", domain);
                    } else if (certificate.is_expired || certificate.expiring_soon) {

                        // Not auto-ssl, but renewable
                        btn_label = LOCALE.maketext("Renew certificate for “[_1]”.", domain);
                    } else if (upgrades_available.length) {
                        btn_label = LOCALE.maketext("Upgrade certificate for “[_1]”.", domain);
                    }

                }

                return btn_label;
            }

            function _check_certificate_autossl(certificate) {

                //If AutoSSL can’t secure wildcards, and if this
                //certificate includes a wildcard, then we won’t
                //replace the certificate.
                if (!AUTOSSL_CAN_WILDCARD) {
                    if (certificate.domains.join().indexOf("*") !== -1) {
                        return false;
                    }
                }

                if (is_autossl_enabled()) {
                    if (certificate.is_autossl) {

                        // If certificate is autossl created Then it's eligible for autossl
                        return true;
                    } else if (validation_ranks[certificate.validation_type] < validation_ranks["dv"]) {

                        // for unsecured and self-signed certificates, they will be renewed
                        return true;
                    } else if (is_autossl_override_enabled()) {

                        // Or the override is set to true
                        return true;
                    }
                }

                return false;

            }

            function autossl_include_domains(domains) {
                var apiCall = new APIREQUEST.Class().initialize(
                    "SSL",
                    "remove_autossl_excluded_domains", {
                        domains: domains.join(",")
                    }
                );

                return api.promise(apiCall);
            }

            function autossl_exclude_domains(domains) {
                var apiCall = new APIREQUEST.Class().initialize(
                    "SSL",
                    "add_autossl_excluded_domains", {
                        domains: domains.join(",")
                    }
                );

                return api.promise(apiCall);
            }

            function get_installed_hosts() {

                if (installed_hosts) {
                    return installed_hosts;
                }

                ssl_domains = {};
                installed_hosts = [];

                var current_date = new Date();

                PAGE.installed_hosts.forEach(function(ihost) {
                    ihost.certificate.is_self_signed = parseInt(ihost.certificate.is_self_signed, 10) === 1;

                    // Ensure this happens before _check_certificate_autossl()
                    ihost.certificate.is_autossl = ihost.certificate.is_autossl.toString() === "1";
                    ihost.certificate.validation_type = ihost.certificate.is_self_signed ? "self-signed" : ihost.certificate.validation_type;
                    ihost.certificate.validation_type = ihost.certificate.validation_type === "dv" && ihost.certificate.is_autossl ? "autossl" : ihost.certificate.validation_type;

                    // Give it a type name (for displaying)
                    ihost.certificate.type_name = make_ssl_type_name(ihost.certificate);

                    // Give it a URL
                    ihost.certificate.view_crt_url = "";
                    ihost.certificate.view_crt_url += "../../ssl/install.html?id=";
                    ihost.certificate.view_crt_url += encodeURIComponent(ihost.certificate.id);

                    ihost.certificate.will_autossl = _check_certificate_autossl(ihost.certificate);
                    ihost.certificate.expiration_date = new Date(ihost.certificate.not_after * 1000);
                    ihost.certificate.is_expired = ihost.certificate.expiration_date < current_date;

                    // Is expiring soon, true but not expired (for sorting).
                    var days_until_expire = (ihost.certificate.expiration_date - current_date) / 1000 / 60 / 60 / 24;
                    ihost.certificate.expiring_soon = days_until_expire < 30 && days_until_expire > 0;

                    // Add to the list
                    installed_hosts.push(ihost);
                    ssl_domains[ihost.servername] = ihost.certificate;
                });

                return get_installed_hosts();

            }

            function get_ssl_domains() {

                if (ssl_domains) {
                    return ssl_domains;
                }

                get_installed_hosts();

                return get_ssl_domains();

            }

            function add_raw_product(raw_product) {
                raw_product.id = raw_product.product_id;
                raw_product.provider = raw_product.provider_name;
                raw_product.provider_display_name = raw_product.provider_display_name || raw_product.provider;
                raw_product.price = Number(raw_product.x_price_per_domain);
                raw_product.wildcard_price = Number(raw_product.x_price_per_wildcard_domain);
                raw_product.wildcard_parent_domain_included = raw_product.x_wildcard_parent_domain_free && raw_product.x_wildcard_parent_domain_free.toString() === "1";
                raw_product.icon_mime_type = raw_product.icon_mime_type ? raw_product.icon_mime_type : "image/png";
                raw_product.is_wildcard = !isNaN(raw_product.wildcard_price) ? true : false;
                raw_product.x_certificate_term = raw_product.x_certificate_term || [1, "year"];
                raw_product.x_certificate_term_key = raw_product.x_certificate_term.join("_");
                raw_product.validity_period = raw_product.x_certificate_term;
                products.push(raw_product);
            }

            function get_available_product_upgrades() {
                if (available_product_upgrades) {
                    return available_product_upgrades;
                }

                available_product_upgrades = [];

                var validation_types = {};
                var products = get_products();
                angular.forEach(products, function(product) {
                    validation_types[product.x_validation_type] = 1;
                });

                angular.forEach(validation_types, function(type, key) {
                    available_product_upgrades.push(key);
                });

                return get_available_product_upgrades();
            }

            function get_products() {
                if (products) {
                    return products;
                }

                products = [];

                if (PAGE.products) {
                    angular.forEach(PAGE.products, function(product) {
                        add_raw_product(product);
                    });
                }

                return get_products();
            }

            function get_domain_types() {
                if (domain_types) {
                    return domain_types;
                }

                domain_types = {};

                angular.forEach(PAGE.domain_types, function(domains, domain_type) {

                    // main domain isn't an array
                    if (domain_type === "main_domain") {
                        domains = [domains];
                    }

                    // domains may be an object this this comes directly from userdata
                    // going to use angular forEach as it will cover object or array equally
                    angular.forEach(domains, function(domain) {
                        domain_types[domain] = domain_type;
                    });
                });

                return get_domain_types();
            }

            function _get_domain_type(domain) {

                var types = get_domain_types();
                var clean_domain = domain.replace(/^www./gi, "");
                return types[clean_domain] ? types[clean_domain] : LOCALE.maketext("Unknown");

            }

            function _make_domain(domain) {

                var domain_obj = {
                    domain: domain.domain,
                    virtual_host: domain.vhost_name,
                    certificate_type: "unsecured",
                    certificate_type_name: LOCALE.maketext("Unsecured"),
                    certificateStatusMessage: "",
                    certificate_is_self_signed: false,
                    certificate_is_autossl: false,
                    certificate_will_autossl: false,
                    certificate_status: "unsecured",
                    can_autossl_include: false,
                    can_autossl_exclude: false,
                    validation_rank: 0,
                    excluded_from_autossl: false,
                    domain_autossl_status: "included",
                    expiring_soon: false,
                    is_autosubdomain: false,
                    is_expired: false,
                    is_proxy: false,
                    is_www: false,
                    type: _get_domain_type(domain.domain)
                };

                var autossl_excludes = get_autossl_excluded_domains();

                if (autossl_excludes[domain_obj.domain]) {
                    domain_obj.excluded_from_autossl = true;
                    domain_obj.domain_autossl_status = "excluded";
                }

                var certificate = _get_installed_certificate_for_domain_obj(domain_obj);

                domain_obj.is_wildcard = domain.domain.indexOf("*.") === 0;
                domain_obj.is_proxy = domain.is_proxy.toString() === "1";
                domain_obj.is_www = domain_obj.domain.match(/^www\./);
                domain_obj.is_mail = domain_obj.domain.match(/^mail\./);
                domain_obj.www_parent = domain_obj.domain.replace(/^www\./, "");

                if (domain_obj.is_www || domain_obj.is_mail) {
                    domain_obj.type = "www_mail_domains";
                } else if (domain_obj.is_proxy) {
                    domain_obj.type = "proxy_sub_domains";
                }

                if (certificate) {

                    // treating unsecured and self-signed the same for sorting
                    domain_obj.certificate = certificate;
                    domain_obj.certificate_type = certificate.validation_type;
                    domain_obj.certificate_is_autossl = certificate.is_autossl;
                    domain_obj.certificate_will_autossl = certificate.will_autossl;
                    domain_obj.certificate_type_name = get_validation_type_name(domain_obj.certificate_type, certificate.is_autossl);
                    domain_obj.certificate_is_self_signed = certificate.is_self_signed;
                    domain_obj.expiring_soon = certificate.expiring_soon;
                    domain_obj.is_expired = certificate.is_expired;
                    domain_obj.view_crt_url = certificate.view_crt_url;
                    domain_obj.validation_rank = validation_ranks[certificate.validation_type];
                    domain_obj.certificate_covers_domain = 0;
                    angular.forEach(certificate.domains, function(domain) {
                        if (domain_obj.domain === domain) {
                            domain_obj.certificate_covers_domain = 1;
                        }

                        var wildcard_domain = domain_obj.domain.replace(/^[^.]+\./, "*.");
                        if (wildcard_domain === domain) {
                            domain_obj.certificate_covers_domain = 1;

                        }
                    });
                    if (!domain_obj.certificate_covers_domain) {
                        domain_obj.certificate_type = "unsecured";
                        domain_obj.certificate_type_name = get_validation_type_name(domain_obj.certificate_type, certificate.is_autossl);
                    }

                    // for sorting purposes does not include expiring_soon
                    domain_obj.is_active = !domain_obj.is_expired && !domain_obj.expiring_soon;
                } else {
                    domain_obj.certificate_will_autossl = is_autossl_enabled() && !domain_obj.is_wildcard;
                }

                domain_obj.can_autossl_exclude = is_autossl_enabled() && domain_obj.certificate_will_autossl && !domain_obj.is_wildcard;

                domain_obj.is_autosubdomain = /^www./.test(domain.domain);

                if (domain_obj.is_active) {
                    domain_obj.certificate_status = "active";
                } else if (domain_obj.is_expired) {
                    domain_obj.certificate_status = "expired";

                    // It's not secured by a valid cert, make the icon reflect that
                    domain_obj.certificate_type = "unsecured";
                    domain_obj.certificate_type_name = get_validation_type_name(domain_obj.certificate_type, certificate.is_autossl);
                } else if (domain_obj.expiring_soon) {
                    domain_obj.certificate_status = "expiring_soon";
                }

                domain_obj.available_upgrades = _get_available_upgrades(certificate);
                domain_obj.certificateStatusMessage = get_certificate_status(domain_obj);
                domain_obj.upgrade_btn_label = _get_upgrade_btn_label(certificate);
                domain_obj.view_certificate_title = LOCALE.maketext("View certificate for the website “[_1]”.", domain_obj.virtual_host, domain_obj.domain);

                domain_obj.exclude_autossl_btn_title = LOCALE.maketext("Exclude “[_1]” from [asis,AutoSSL].", domain_obj.domain);
                domain_obj.include_autossl_btn_title = LOCALE.maketext("Include “[_1]” during [asis,AutoSSL].", domain_obj.domain);

                return domain_obj;
            }

            function get_autossl_excluded_domains() {
                if (autossl_excluded_domains) {
                    return autossl_excluded_domains;
                }

                autossl_excluded_domains = {};

                angular.forEach(PAGE.autossl_excluded_domains, function(domain) {
                    this[domain.excluded_domain] = domain.excluded_domain;
                }, autossl_excluded_domains);

                return get_autossl_excluded_domains();
            }

            function get_domains() {
                if (domains) {
                    return domains;
                }

                var unique_domains = {};
                domains = [];

                PAGE.domains.forEach(function(domain) {

                    var domain_obj = _make_domain(domain);
                    unique_domains[domain_obj.domain] = domain_obj;

                });

                angular.forEach(unique_domains, function(domain) {
                    domains.push(domain);
                });

                return get_domains();
            }

            /**
             * Get a list of AutoSSL Problems
             *
             * @method getAutoSSLStatuses
             *
             * @return {Promise} returns a promise that returns an object with problems and statuses
             *
             * {
             *     problems:
             *         [
             *             {
             *                 "time": "2017-08-31T03:51:18Z",
             *                 "domain": "www.soon.not.on.lock.down",
             *                 "problem": "\u201cwww.soon.not.on.lock.down\u201d does not resolve to any IPv4 addresses on the internet."
             *             }
             *         ],
             *     queue_statuses:
             *         [
             *             {
             *                  "request_time" : "2016-01-01T00:02:03Z",
             *                  "last_poll_time" : "2017-09-01T16:14:09Z",
             *                  "domain" : "addon.lock.down",
             *                  "vhost_name" : "addon.lock.down",
             *                  "order_item_id" : "oiid1"
             *              }
             *         ]
             *  }
             *
             */
            function getAutoSSLStatuses() {
                if ( !is_autossl_enabled() ) {
                    return false;
                }
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Batch", "strict");

                apiCall.addArgument("command", [
                    JSON.stringify(["SSL", "get_autossl_problems"]),
                    JSON.stringify(["SSL", "get_autossl_pending_queue"])
                ]);

                return api.promise(apiCall).then(function(result) {
                    var statuses = {};

                    var problems = result.data[0].data;
                    var queue = result.data[1].data;

                    queue.forEach(function(queueItem) {
                        var domain = queueItem.domain;
                        statuses[domain] = {
                            domain: domain,
                            status: LOCALE.maketext("The [asis,AutoSSL] certificate is pending issuance for this domain."),
                            runTime: new Date(queueItem.last_poll_time)
                        };
                    });

                    problems.forEach(function(problem) {
                        var domain = problem.domain;
                        statuses[domain] = {
                            domain: domain,
                            status: LOCALE.maketext("An error occurred during the last [asis,AutoSSL] run for this domain."),
                            runTime: new Date(problem.time),
                            error: problem.problem
                        };
                    });

                    return Object.keys(statuses).map(function(domain) {
                        return statuses[domain];
                    });
                });

            }

            /**
             * Start an AutoSSL check for the current user
             *
             * @method startUserAutoSSL
             *
             * @return {Promise} returns the api call promise
             *
             */
            function startUserAutoSSL() {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SSL", "start_autossl_check");

                return api.promise(apiCall);
            }

            /**
             * Check to see if AutoSSL is already in progress
             *
             * @method isAutoSSLCheckInProgress
             *
             * param jsdocparam maybe?
             *
             * @return {Boolean} returns the boolean of whether a check is in progress
             *
             */
            function isAutoSSLCheckInProgress() {
                if ( !is_autossl_enabled() ) {
                    return false;
                }
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SSL", "is_autossl_check_in_progress");

                return api.promise(apiCall).then(function(result) {
                    return result.data.toString() === "1";
                });
            }

            return {
                get_domains: get_domains,
                get_products: get_products,
                get_upgrade_btn_title: get_upgrade_btn_title,
                autossl_include_domains: autossl_include_domains,
                autossl_exclude_domains: autossl_exclude_domains,
                get_ssl_domains: get_ssl_domains,
                get_installed_hosts: get_installed_hosts,
                get_domain_search_options: get_domain_search_options,
                is_autossl_enabled: is_autossl_enabled,
                make_ssl_type_name: make_ssl_type_name,
                get_validation_type_name: get_validation_type_name,
                get_validation_ranks: get_validation_ranks,
                get_certificate_status: get_certificate_status,
                getAutoSSLStatuses: getAutoSSLStatuses,
                startUserAutoSSL: startUserAutoSSL,
                isAutoSSLCheckInProgress: isAutoSSLCheckInProgress
            };

        }]);
    }
);

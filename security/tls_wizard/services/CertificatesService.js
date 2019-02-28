/*
 * base/frontend/paper_lantern/security/tls_wizard/services/CertificatesService.js
 *                                                 Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */


/* global define: false */
/* jshint -W100 */
/* eslint-disable camelcase */
define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/html",
        "cjt/util/parse",
        "cjt/io/api",
        "cjt/io/uapi-request",
        "app/views/Certificate",
        "app/services/VirtualHost",
        "cjt/io/uapi", // IMPORTANT: Load the driver so its ready
        "cjt/services/alertService"
    ],
    function(angular, _, LOCALE, cjt2Html, cjt2Parse, API, APIREQUEST) {
        "use strict";

        var ACTION_URL_LABELS = {
            "evClickThroughStatus": LOCALE.maketext("Sign the Agreement"),
            "ovCallbackStatus": LOCALE.maketext("Schedule a Call"),
            DEFAULT: LOCALE.maketext("Complete this Now")
        };

        var ACTION_URL_ICONS = {
            "ovCallbackStatus": "fas fa-phone-square",
            DEFAULT: "fas fa-external-link-alt"
        };

        var STATUS_DETAIL_STRINGS = {
            "csrStatus": {
                label: LOCALE.maketext("[output,abbr,CSR,Certificate Signing Request] Status:"),
                inProgress: LOCALE.maketext("Validating the [output,abbr,CSR,Certificate Signing Request] status …")
            },
            "dcvStatus": {
                label: LOCALE.maketext("[output,abbr,DCV,Domain Control Validation] Status:"),
                inProgress: LOCALE.maketext("Validating the [output,abbr,DCV,Domain Control Validation] status …")
            },
            "evClickThroughStatus": {
                label: LOCALE.maketext("[output,abbr,EV,Extended Validation] Click-Through Status:"),
                inProgress: LOCALE.maketext("Validating the [output,abbr,EV,Extended Validation] click-through status …")
            },
            "freeDVUPStatus": {
                label: LOCALE.maketext("Free [output,abbr,DV,Domain Validated] Up Status:"),
                inProgress: LOCALE.maketext("Validating the free [output,abbr,DV,Domain Validated] up status …")
            },
            "organizationValidationStatus": {
                label: LOCALE.maketext("[output,abbr,OV,Organization Validation] Status:"),
                inProgress: LOCALE.maketext("Validating the [output,abbr,OV,Organization Validation] status …")
            },
            "ovCallbackStatus": {
                label: LOCALE.maketext("[output,abbr,OV,Organization Validation] Callback Status:"),
                inProgress: LOCALE.maketext("Validating the [output,abbr,OV,Organization Validation] callback status …")
            },
            "validationStatus": {
                label: LOCALE.maketext("Validation Status:"),
                inProgress: LOCALE.maketext("Checking the validation status …")
            }
        };

        // Curious that JS doesn’t expose sprintf(). Anyway.
        // http://www.codigomanso.com/en/2010/07/simple-javascript-formatting-zero-padding/
        function _sprintf02D(n) {
            return ("0" + n).slice(-2);
        }

        function productSupportsDnsDcv(p) {
            return p.x_supports_dns_dcv;
        }

        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", ["cjt2.services.alert"]); // Fall-back for unit testing
        }

        function CertificatesServiceFactory(VirtualHost, Certificate, $q, $log, alertService) {
            var CertificatesService = {};
            var virtualHosts = [];
            var allDomains = [];
            var selectedDomains = [];
            var products = [];
            var orders = [];
            var pendingCertificates = [];
            var installedHosts = null;
            var purchasingCerts = [];
            var sslDomains = {};
            var installedHostsMap = {};
            var productsSearchOptions;
            var wildcardMap = {};

            // A lookup of “www.” domains. We don’t display these in the
            // UI, but we want to know about them so we avoid trying to DCV them.
            var wwwDomainsLookup = {};
            var domainSearchOptions;
            var currentDate = new Date();
            var introductionDismissed = false;

            function _apiError(whichAPI, errorMsgHTML) {
                var error = LOCALE.maketext("The “[_1]” [asis,API] failed due to the following error: [_2]", _.escape(whichAPI), errorMsgHTML);
                alertService.add({
                    type: "danger",
                    message: error,
                    group: "tlsWizard"
                });
            }

            CertificatesService.add_new_certificate = function(cert) {
                purchasingCerts.push(cert);
                return purchasingCerts;
            };

            CertificatesService.get_purchasing_certs = function() {
                return purchasingCerts;
            };

            CertificatesService.get_order_by_id = function(orderID) {
                for (var i = 0; i < orders.length; i++) {
                    if (orders[i].order_id === orderID) {
                        return orders[i];
                    }
                }
            };
            CertificatesService.add_order = function(order) {
                var existingOrder = CertificatesService.get_order_by_id(order.order_id);
                if (existingOrder) {

                    // update existing order
                    angular.extend(existingOrder, order);
                } else {

                    // add orer
                    orders.push(order);
                }
                return orders;
            };

            CertificatesService.restore = function() {
                if (CertificatesService.get_virtual_hosts().length) {
                    return false;
                }
                var storedSettings = _getStoredSettingsJSON();
                if (!storedSettings) {
                    return false;
                }
                var storage = JSON.parse(storedSettings);
                angular.forEach(storage.virtual_hosts, function(vhost) {
                    virtualHosts.push(new VirtualHost(vhost));
                });
                angular.forEach(storage.purchasing_certs, function(cert) {
                    CertificatesService.add_new_certificate(new Certificate(cert));
                });
                storage.orders = storage.orders ? storage.orders : [];
                orders = storage.orders;
                return virtualHosts.length === storage.virtual_hosts.length && orders.length === storage.orders.length;
            };

            CertificatesService.add_virtual_host = function(virtualHost, isSSL) {
                var newVHost = new VirtualHost({
                    display_name: virtualHost,
                    is_ssl: isSSL
                });
                var vhostID = virtualHosts.length;
                virtualHosts.push(newVHost);
                return vhostID;
            };

            CertificatesService.get_virtual_hosts = function() {
                return virtualHosts;
            };

            CertificatesService.doesDomainMatchOneOf = function(domain, domains) {
                if (domains === null || domain === null) {
                    return false;
                }

                return domains.some(function(domainOne) {
                    var domainTwo = domain;
                    if (domainOne === domainTwo) {
                        return true;
                    }

                    var possibleWildcard;
                    var domainToMatch;

                    if (/^\*/.test(domainOne)) {
                        possibleWildcard = domainOne;
                        domainToMatch = domainTwo;
                    } else if (/^\*/.test(domainTwo)) {
                        possibleWildcard = domainTwo;
                        domainToMatch = domainOne;
                    } else {
                        return false;
                    }

                    possibleWildcard = possibleWildcard.replace(/^\*\./, "");
                    domainToMatch = domainToMatch.replace(/^[^.]+\./, "");

                    if (possibleWildcard === domainToMatch) {
                        return true;
                    }

                    return false;
                });
            };

            // for testing
            CertificatesService._getWWWDomainsLookup = function() {
                return wwwDomainsLookup;
            };

            CertificatesService.add_raw_domain = function(rawDomain) {
                if (/^www\./.test(rawDomain.domain)) {
                    wwwDomainsLookup[ rawDomain.domain ] = true;
                    return;
                }

                rawDomain.virtual_host = rawDomain.vhost_name;

                rawDomain.order_by_name = rawDomain.domain;


                /* for consistency and ease of filtering */
                rawDomain.is_wildcard = rawDomain.domain.indexOf("*.") === 0;
                rawDomain.is_proxy = rawDomain.is_proxy && rawDomain.is_proxy.toString() === "1";
                rawDomain.stripped_domain = rawDomain.domain;
                CertificatesService.add_domain(rawDomain);

                // Adding this check here, but should probably check to make sure these weren't manually created (in a later version)
                var matchesAutoGenerated = rawDomain.domain.match(/^(mail|ipv6)\./);

                if (!rawDomain.is_wildcard && !rawDomain.is_proxy && !matchesAutoGenerated) {
                    CertificatesService.add_domain(angular.extend({}, rawDomain, {
                        domain: "*." + rawDomain.domain,
                        is_wildcard: true
                    }));
                }

            };

            // for testing
            CertificatesService._getWildcardMap = function() {
                return wildcardMap;
            };

            CertificatesService.domain_covered_by_wildcard = function(domain) {
                return wildcardMap[domain];
            };

            CertificatesService.compare_wildcard_domain = function(wildcardDomain, compareDomain) {
                return wildcardMap[compareDomain] === wildcardDomain.domain;
            };

            /* map these for faster lookup */
            CertificatesService.build_wildcard_map = function() {
                wildcardMap = {};
                var domains = CertificatesService.get_all_domains();
                var re;
                domains.forEach(function(domain) {

                    // only need to map wildcards
                    if (domain.is_wildcard === false) {
                        return false;
                    }

                    // The “stripped_domain” isn’t stripped in the case of
                    // wildcard domains that actually exist in Apache vhosts.
                    re = new RegExp("^[^\\.]+\\." + _.escapeRegExp(domain.stripped_domain.replace(/^\*\./, "")) + "$");

                    domains.forEach(function(matchDomain) {
                        if (domain.domain !== matchDomain.domain && re.test(matchDomain.domain)) {
                            wildcardMap[matchDomain.domain] = domain;
                        }
                    });

                });
            };

            CertificatesService.get_domain_certificate_status = function(domain) {

                var ihost = CertificatesService.get_domain_certificate(domain.domain);

                if (ihost && ihost.certificate) {
                    var expirationDate = new Date(ihost.certificate.not_after * 1000);
                    var daysUntilExpiration = (expirationDate - currentDate) / 1000 / 60 / 60 / 24;
                    if (expirationDate < currentDate) {
                        return "expired";
                    } else if (daysUntilExpiration < 30 && daysUntilExpiration > 0) {
                        return "expiring_soon";
                    } else {
                        return "active";
                    }
                }

                return "unsecured";
            };

            CertificatesService._getSSLDomains = function() {
                return sslDomains;
            };

            CertificatesService._getInstalledHostsMap = function() {
                return installedHostsMap;
            };

            CertificatesService._getInstalledHosts = function() {
                return installedHosts;
            };

            CertificatesService.add_domain = function(domainObject) {
                var vhostID = CertificatesService.get_virtual_host_by_display_name(domainObject.virtual_host);
                if (vhostID !== 0 && !vhostID) {
                    vhostID = CertificatesService.add_virtual_host(domainObject.virtual_host, 1);
                }
                virtualHosts[vhostID].is_ssl = 1;

                /* prevent adding of duplicates */
                if (CertificatesService.get_domain_by_domain(domainObject.domain)) {
                    return;
                }

                // assume installed hosts is there, we will ensure this later

                sslDomains[domainObject.domain] = null;


                // domain certificate finding

                var ihost = installedHostsMap[domainObject.virtual_host];

                if (ihost && ihost.certificate) {

                    // vhost has certificate, but does it cover this domain

                    angular.forEach(ihost.certificate.domains, function(domain) {
                        if (domainObject.domain === domain) {
                            sslDomains[domainObject.domain] = ihost;
                            return;
                        }

                        var wildcardDomain = domainObject.domain.replace(/^[^.]+\./, "*.");
                        if (wildcardDomain === domain) {
                            sslDomains[domainObject.domain] = ihost;
                        }
                    });

                }


                domainObject.type = domainObject.is_wildcard ? "wildcard_domain" : "main_domain";
                domainObject.proxy_type = domainObject.is_proxy ? "proxy_domain" : "main_domain";
                domainObject.certificate_status = CertificatesService.get_domain_certificate_status(domainObject);

                return virtualHosts[vhostID].add_domain(domainObject);
            };


            // This function should potentially be renamed
            // It actually just deselects all the domains in a specific VHost
            CertificatesService.remove_virtual_host = function(displayName) {
                var index = CertificatesService.get_virtual_host_by_display_name(displayName);
                if (!_.isNil(index)) {
                    virtualHosts[index].remove_all_domains();
                }
            };

            CertificatesService.filterProductsByDomainsDcv = function filterProductsByDomainsDcv( products, domainObjs ) {

                // Require DNS DCV if any domain failed HTTP.
                var requireDnsDcvYN = domainObjs.some( function(sd) {
                    return sd.dcvPassed && !sd.dcvPassed.http;
                } );

                if (requireDnsDcvYN) {
                    products = products.filter(productSupportsDnsDcv);
                }

                return products;
            };

            CertificatesService.get_virtual_host_by_display_name = function(displayName) {
                for (var i = 0; i < virtualHosts.length; i++) {
                    if (virtualHosts[i].display_name === "*") {

                        /* There can be only one if we requested an all-vhosts install */
                        return 0;
                    } else if (virtualHosts[i].display_name === displayName) {
                        return i;
                    }
                }
            };

            CertificatesService._runUAPI = function(apiCall) {

                var deferred = $q.defer();

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            function _dnsDcvPromise(dnsDcvDomainObjs) {
                var apiCall = (new APIREQUEST.Class()).initialize(
                    "DCV",
                    "check_domains_via_dns",
                    {
                        domain: dnsDcvDomainObjs.map( function(d) {
                            return d.domain;
                        } ),
                    }
                );

                return CertificatesService._runUAPI(apiCall).then(
                    function(results) {
                        for (var d = 0; d < dnsDcvDomainObjs.length; d++) {
                            var domain = dnsDcvDomainObjs[d];

                            domain.resolving = false;

                            domain.dcvPassed.dns = cjt2Parse.parsePerlBoolean(results.data[d].succeeded);

                            if (domain.dcvPassed.dns) {
                                domain.resolved = 1;
                            } else {

                                // What to do here?? If HTTP passed but
                                // DNS fails, let’s assume that whatever
                                // DCV logic the CA does will fail.
                                domain.resolved = 0;

                                // TODO: Make it so we can inject
                                // the raw HTML.
                                if (domain.resolution_failure_reason) {
                                    domain.resolution_failure_reason += " " + cjt2Html.decode( LOCALE.maketext("[asis,DNS]-based [output,abbr,DCV,Domain Control Validation] also failed.") );
                                } else {
                                    domain.resolution_failure_reason = cjt2Html.decode( LOCALE.maketext("[asis,DNS]-based [output,abbr,DCV,Domain Control Validation] failed.") );
                                }
                            }
                        }
                    },
                    function(error) {
                        _apiError("DCV::check_domains_via_dns", error);
                    }
                );
            }

            CertificatesService.set_confirmed_status_for_ssl_certificates = function(provider, order) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                var orderItemIDs = [];

                angular.forEach(order.certificates, function(item) {
                    orderItemIDs.push(item.order_item_id);
                });

                apiCall.initialize("Market", "set_status_of_pending_queue_items");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("status", "confirmed");
                apiCall.addArgument("order_item_id", orderItemIDs);

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;

                        // This specific case is unusual because we want to
                        // give the error handler the entire object so that it
                        // can check for “data” in the response. See the
                        // documentation for Market::set_status_of_pending_queue_items.
                        var method = response.status ? "resolve" : "reject";

                        deferred[method](response);
                    });

                return deferred.promise;
            };

            // Might return a promise, or it might return a boolean,
            // which indicates that there’s no work to be done.
            // (Could ideally do this with Promise.resolve()?)
            CertificatesService.fetch_domains = function() {

                var ret = CertificatesService.fetch_installed_hosts();

                if (_.isFunction(ret.then) !== false) {
                    return ret.then(function() {
                        return CertificatesService.fetch_domains();
                    });
                }

                if (CPANEL.PAGE.domains) {
                    angular.forEach(CPANEL.PAGE.domains, function(domain) {
                        CertificatesService.add_raw_domain(domain);
                    });
                    if (CertificatesService.get_all_domains().length) {
                        return true;
                    }
                }

                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("WebVhosts", "list_ssl_capable_domains");

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                deferred.promise.then(function(result) {
                    angular.forEach(result.data, function(domain) {
                        CertificatesService.add_raw_domain(domain);
                    });
                }, function(error) {
                    _apiError("WebVHosts::list_ssl_capable_domains", error);
                });

                return deferred.promise;
            };

            CertificatesService.get_store_login_url = function(provider, escapedURL) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "get_login_url");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("url_after_login", escapedURL);

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            function _getStoredSettingsJSON() {
                return localStorage.getItem("tls_wizard_data");
            }

            CertificatesService.store_settings = function(extras) {
                var storableSettings = CertificatesService.get_storable_settings(extras);
                localStorage.setItem("tls_wizard_data", storableSettings);
                var retrievedData = _getStoredSettingsJSON();
                return retrievedData === storableSettings;
            };

            CertificatesService.save = CertificatesService.store_settings;

            // Returns at least an empty object.
            CertificatesService.get_stored_extra_settings = function() {
                var settings = _getStoredSettingsJSON();
                if (settings) {
                    settings = JSON.parse(settings).extras;
                }

                return settings || {};
            };

            CertificatesService.clear_stored_settings = function() {
                return localStorage.removeItem("tls_wizard_data");
            };

            CertificatesService.get_storable_settings = function(extras) {

                // Preserve the “extras”, which contains things like
                // identity verification for OV and EV certs.
                //
                var storage = _getStoredSettingsJSON();
                storage = storage ? JSON.parse(storage) : {};
                if (!storage.extras) {
                    storage.extras = {};
                }

                if (extras) {
                    _.assign(storage.extras, extras);
                }

                // Clobber everything else.
                _.assign(storage, {
                    orders: orders,

                    // Used in the “Advanced” screen
                    // NB: Each one has a .toJSON() method defined.
                    virtual_hosts: virtualHosts,

                    // Used in the “Simple” screen
                    // NB: Each one has a .toJSON() method defined.
                    purchasing_certs: CertificatesService.get_purchasing_certs(),
                });

                return JSON.stringify(storage);
            };

            CertificatesService.get_all_domains = function() {
                allDomains = [];
                angular.forEach(virtualHosts, function(vhost) {
                    allDomains = allDomains.concat(vhost.get_domains());
                });
                return allDomains;
            };

            CertificatesService.get_all_selected_domains = function() {
                selectedDomains = [];
                angular.forEach(virtualHosts, function(vhost) {
                    selectedDomains = selectedDomains.concat(vhost.get_selected_domains());
                });
                return selectedDomains;
            };

            CertificatesService.get_products = function() {
                return products;
            };

            CertificatesService.fetch_products = function() {

                if (CertificatesService.get_products().length) {
                    return true;
                }

                if (CPANEL.PAGE.products) {
                    angular.forEach(CPANEL.PAGE.products, function(product) {
                        CertificatesService.add_raw_product(product);
                    });
                    if (CertificatesService.get_products().length) {
                        return true;
                    }
                }

                products = [];
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "get_all_products");
                apiCall.addFilter("enabled", "eq", "1");
                apiCall.addFilter("product_group", "eq", "ssl_certificate");
                apiCall.addSorting("recommended", "dsc", "numeric");
                apiCall.addSorting("x_price_per_domain", "asc", "numeric");

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                deferred.promise.then(function(results) {
                    angular.forEach(results.data, function(product) {

                        // typecasts
                        product.product_id += "";

                        ["x_warn_after", "x_price_per_domain", "x_max_http_redirects"].forEach(function(attr) {
                            if (product[attr]) {
                                product[attr] = cjt2Parse.parseNumber(product[attr]);
                            }
                        });

                        CertificatesService.add_raw_product(product);
                    });

                }, function(error) {
                    _apiError("Market::get_all_products", error);
                });

                return deferred.promise;
            };

            CertificatesService._make_certificate_term_label = function(termUnit, termValue) {
                var unitStrings = {
                    "year": LOCALE.maketext("[quant,_1,Year,Years]", termValue),
                    "month": LOCALE.maketext("[quant,_1,Month,Months]", termValue),
                    "day": LOCALE.maketext("[quant,_1,Day,Days]", termValue)
                };
                return unitStrings[termUnit] || termValue + " " + termUnit;
            };

            CertificatesService._make_validation_type_label = function(validationType) {
                var validationTypeLabels = {
                    "dv": LOCALE.maketext("[output,abbr,DV,Domain Validated] Certificate"),
                    "ov": LOCALE.maketext("[output,abbr,OV,Organization Validated] Certificate"),
                    "ev": LOCALE.maketext("[output,abbr,EV,Extended Validation] Certificate")
                };

                return validationTypeLabels[validationType] || validationType;
            };

            CertificatesService.add_raw_product = function(rawProduct) {
                rawProduct.id = rawProduct.product_id;
                rawProduct.provider = rawProduct.provider_name;
                rawProduct.provider_display_name = rawProduct.provider_display_name || rawProduct.provider;
                rawProduct.price = Number(rawProduct.x_price_per_domain);
                rawProduct.wildcard_price = Number(rawProduct.x_price_per_wildcard_domain);
                rawProduct.wildcard_parent_domain_included = rawProduct.x_wildcard_parent_domain_free && rawProduct.x_wildcard_parent_domain_free.toString() === "1";
                rawProduct.icon_mime_type = rawProduct.icon_mime_type ? rawProduct.icon_mime_type : "image/png";
                rawProduct.is_wildcard = !isNaN(rawProduct.wildcard_price) ? true : false;
                rawProduct.x_certificate_term = rawProduct.x_certificate_term || [1, "year"];
                rawProduct.x_certificate_term_display_name = CertificatesService._make_certificate_term_label(rawProduct.x_certificate_term[1], rawProduct.x_certificate_term[0]);
                rawProduct.x_certificate_term_key = rawProduct.x_certificate_term.join("_");
                rawProduct.x_validation_type_display_name = CertificatesService._make_validation_type_label(rawProduct.x_validation_type);
                rawProduct.x_supports_dns_dcv = cjt2Parse.parsePerlBoolean(rawProduct.x_supports_dns_dcv);
                rawProduct.validity_period = rawProduct.x_certificate_term;
                products.push(rawProduct);
            };

            CertificatesService.get_domain_search_options = function() {
                if (domainSearchOptions) {
                    return domainSearchOptions;
                }

                domainSearchOptions = {
                    domainType: {
                        label: LOCALE.maketext("Domain Types:"),
                        item_key: "type",
                        options: [{
                            "value": "main_domain",
                            "label": LOCALE.maketext("Non-Wildcard"),
                            "description": LOCALE.maketext("Only list Non-Wildcard domains.")
                        }, {
                            "value": "wildcard_domain",
                            "label": LOCALE.maketext("Wildcard"),
                            "description": LOCALE.maketext("Only list Wildcard domains.")
                        }]
                    },
                    proxyDomainType: {
                        label: LOCALE.maketext("Service Subdomain Types:"),
                        item_key: "proxy_type",
                        options: [{
                            "value": "proxy_domain",
                            "label": LOCALE.maketext("[asis,cPanel] Service Subdomains"),
                            "description": LOCALE.maketext("Only list Service Subdomains.")
                        }, {
                            "value": "main_domain",
                            "label": LOCALE.maketext("Other Domains"),
                            "description": LOCALE.maketext("Only list non-Service Subdomains.")
                        }]
                    },
                    sslType: {
                        label: LOCALE.maketext("[asis,SSL] Types:"),
                        item_key: "certificate_type",
                        options: [{
                            "value": "unsecured",
                            "label": LOCALE.maketext("Unsecured or Self-signed"),
                            "description": LOCALE.maketext("Only list unsecured or self-signed domains.")
                        }, {
                            "value": "dv",
                            "label": CertificatesService._make_validation_type_label("dv"),
                            "description": LOCALE.maketext("Only list domains with [asis,DV] Certificates.")
                        }, {
                            "value": "ov",
                            "label": CertificatesService._make_validation_type_label("ov"),
                            "description": LOCALE.maketext("Only list domains with [asis,OV] Certificates.")
                        }, {
                            "value": "ev",
                            "label": CertificatesService._make_validation_type_label("ev"),
                            "description": LOCALE.maketext("Only list domains with [asis,EV] Certificates.")
                        }]
                    },
                    sslStatus: {
                        label: LOCALE.maketext("[asis,SSL] Statuses:"),
                        item_key: "certificate_status",
                        options: [{
                            "value": "unsecured",
                            "label": LOCALE.maketext("Unsecured"),
                            "description": LOCALE.maketext("Only list unsecured domains.")
                        }, {
                            "value": "active",
                            "label": LOCALE.maketext("Active"),
                            "description": LOCALE.maketext("Only list domains with an active certificate.")
                        }, {
                            "value": "expired",
                            "label": LOCALE.maketext("Expired"),
                            "description": LOCALE.maketext("Only list domains whose certificate is expiring soon.")
                        }, {
                            "value": "expiring_soon",
                            "label": LOCALE.maketext("Expiring Soon"),
                            "description": LOCALE.maketext("Only list domains with certificates that expire soon.")
                        }]
                    }
                };

                return CertificatesService.get_domain_search_options();
            };

            CertificatesService.get_product_search_options = function() {
                if (productsSearchOptions) {
                    return productsSearchOptions;
                }

                productsSearchOptions = {
                    validationType: {
                        label: LOCALE.maketext("[asis,SSL] Validation Types"),
                        item_key: "x_validation_type",
                        options: []
                    },
                    sslProvider: {
                        label: LOCALE.maketext("[asis,SSL] Providers"),
                        item_key: "provider",
                        options: []
                    },
                    certTerms: {
                        label: LOCALE.maketext("Certificate Terms"),
                        item_key: "x_certificate_term_key",
                        options: []
                    }
                };

                var products = CertificatesService.get_products();

                var certTerms = {},
                    providers = {},
                    validationTypes = {};

                angular.forEach(products, function(product) {
                    certTerms[product.x_certificate_term_key] = {
                        "value": product.x_certificate_term_key,
                        "label": product.x_certificate_term_display_name,
                        "description": LOCALE.maketext("Only list products with a term of ([_1]).", product.x_certificate_term_display_name)
                    };
                    providers[product.provider] = {
                        "value": product.provider,
                        "label": product.provider_display_name,
                        "description": LOCALE.maketext("Only list products from the “[_1]” provider.", product.provider_display_name)
                    };
                    validationTypes[product.x_validation_type] = {
                        "value": product.x_validation_type,
                        "label": product.x_validation_type_display_name,
                        "description": LOCALE.maketext("Only list products that use the “[_1]” validation type.", product.x_validation_type_display_name)
                    };
                });

                angular.forEach(certTerms, function(item) {
                    productsSearchOptions.certTerms.options.push(item);
                });
                angular.forEach(providers, function(item) {
                    productsSearchOptions.sslProvider.options.push(item);
                });
                angular.forEach(validationTypes, function(item) {
                    productsSearchOptions.validationType.options.push(item);
                });

                for (var key in productsSearchOptions) {
                    if (productsSearchOptions.hasOwnProperty(key)) {
                        if (productsSearchOptions[key].options.length <= 1) {
                            delete productsSearchOptions[key];
                        }
                    }
                }

                return CertificatesService.get_product_search_options();
            };

            CertificatesService.get_product_by_id = function(providerName, productID) {
                for (var i = 0; i < products.length; i++) {
                    if (products[i].id === productID && products[i].provider === providerName) {
                        return products[i];
                    }
                }

                return;
            };

            var _ensureDomainCanPassDCV = function(domains, dcvConstraints) {

                // A list of domain objects for domains that will be DCVed
                // in this function. (The list will exclude, e.g., domains
                // that are already DCVed.) Do not confuse with
                // dnsDcvDomainObjs, which is specific to DNS DCV.
                var allDcvDomainObjs = [];

                var flatDomains = [];

                angular.forEach(domains, function(domain) {
                    if (domain.resolved === -1) {
                        allDcvDomainObjs.push(domain);
                        flatDomains.push(domain.domain);
                        domain.resolving = true;
                    }
                });

                if (flatDomains.length === 0) {
                    return;
                }

                var productForbidsRedirects = function(p) {

                    // Compare against 0 to accommodate providers that
                    // don’t define this particular product attribute.

                    return 0 === p.x_max_http_redirects;
                };

                var apiCall = (new APIREQUEST.Class()).initialize(
                    "DCV",
                    "check_domains_via_http", {
                        domain: flatDomains,
                        dcv_file_allowed_characters: JSON.stringify(dcvConstraints.dcv_file_allowed_characters),
                        dcv_file_random_character_count: dcvConstraints.dcv_file_random_character_count,
                        dcv_file_extension: dcvConstraints.dcv_file_extension,
                        dcv_file_relative_path: dcvConstraints.dcv_file_relative_path,
                        dcv_user_agent_string: dcvConstraints.dcv_user_agent_string,
                    }
                );


                var prodsThatCanDoDnsDcv = products.filter(productSupportsDnsDcv);

                // TODO: We should be smarter about redirection:
                // if the number of redirects is within every product’s
                // redirection limit, then we shouldn’t fall back to DNS DCV.
                var prodsThatForbidRedirects = products.filter(productForbidsRedirects);

                return CertificatesService._runUAPI(apiCall).then(function(results) {

                    // A list of domain objects for domains that will be DCVed
                    // via DNS in this function. Do not confuse with
                    // allDcvDomainObjs, which includes domains that will not
                    // undergo DNS DCV (e.g., because they passed HTTP DCV).
                    var dnsDcvDomainObjs = [];

                    for (var d = 0; d < allDcvDomainObjs.length; d++) {
                        var domain = allDcvDomainObjs[d];

                        domain.resolution_failure_reason = results.data[d].failure_reason;
                        domain.redirects_count = cjt2Parse.parseNumber(results.data[d].redirects_count);

                        // Success with redirects likely means that even
                        // rebuilding .htaccess didn’t fix the issue,
                        // so the customer will need to investigate manually.
                        if (domain.redirects_count && !domain.resolution_failure_reason) {
                            if (prodsThatForbidRedirects.length) {
                                var message = LOCALE.maketext("“[_1]”’s [output,abbr,DCV,Domain Control Validation] check completed correctly, but the check required an [asis,HTTP] redirection. The system tried to exclude such redirections from this domain by editing the website document root’s “[_2]” file, but the redirection persists. You should investigate further.", _.escape(domain.domain), ".htaccess");

                                alertService.add({
                                    type: "danger",
                                    message: message,
                                    group: "tlsWizard"
                                });

                                // Only fail at this point if DNS DCV isn’t
                                // available.
                                if (!prodsThatCanDoDnsDcv.length && (prodsThatForbidRedirects.length === products.length)) {
                                    domain.resolution_failure_reason = LOCALE.maketext("This domain’s [output,abbr,DCV,Domain Control Validation] check completed correctly, but the check required [asis,HTTP] redirection. Because none of the available certificate products allows [asis,HTTP] redirection for [asis,DCV], you cannot use this interface to purchase an [asis,SSL] certificate for this domain.");
                                }

                            }
                        }

                        domain.dcvPassed = { http: !domain.resolution_failure_reason };

                        // Send this batch of domains to DNS DCV if there is
                        // at least one DNS-DCV-capable certificate product
                        // AND the current domain’s DCV failed or redirected.
                        if (prodsThatCanDoDnsDcv.length && (!domain.dcvPassed.http || domain.redirects_count)) {
                            dnsDcvDomainObjs.push(domain);
                        } else {
                            domain.resolving = false;
                            domain.resolved = domain.dcvPassed.http ? 1 : 0;
                        }
                    }

                    if (dnsDcvDomainObjs.length) {
                        if (prodsThatCanDoDnsDcv.length) {
                            return _dnsDcvPromise(dnsDcvDomainObjs);
                        }
                    }
                }, function(error) {
                    _apiError("DCV::check_domains_via_http", error);
                });
            };

            CertificatesService.get_default_provider_name = function() {

                var product;
                var products = CertificatesService.get_products();

                /* if it's set, use that */

                var cpStoreProducts = products.filter(function(product) {
                    if (product.provider_name === "cPStore") {
                        return true;
                    }
                    return false;
                });

                if (cpStoreProducts.length) {

                    /* if cPStore exists, use that */
                    product = cpStoreProducts[0];
                } else {

                    /* otherwise use first */
                    product = products[0];
                }

                return product.provider_name;

            };

            CertificatesService.get_provider_specific_dcv_constraints = function(providerName) {

                var apiCall = (new APIREQUEST.Class()).initialize(
                    "Market",
                    "get_provider_specific_dcv_constraints", {
                        provider: providerName
                    }
                );

                return CertificatesService._runUAPI(apiCall);
            };


            CertificatesService.ensure_domains_can_pass_dcv = function(domains, providerName) {

                return CertificatesService.get_provider_specific_dcv_constraints(providerName).then(function(results) {

                    return _ensureDomainCanPassDCV(domains, results.data);

                }, function(error) {
                    _apiError("Market::get_provider_specific_dcv_constraints", error);
                });

            };

            CertificatesService.verify_login_token = function(provider, loginToken, urlAfterLogin) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "validate_login_token");
                apiCall.addArgument("login_token", loginToken);
                apiCall.addArgument("url_after_login", urlAfterLogin);
                apiCall.addArgument("provider", provider);

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            CertificatesService.set_url_after_checkout = function(provider, accessToken, orderID, urlAfterCheckout) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "set_url_after_checkout");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("access_token", accessToken);
                apiCall.addArgument("order_id", orderID);
                apiCall.addArgument("url_after_checkout", urlAfterCheckout);

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;

                        // This specific case is unusual because we want to
                        // give the error handler the entire object so that it
                        // can check for “data” in the response. See the
                        // documentation for Market::set_url_after_checkout.
                        var method = response.status ? "resolve" : "reject";

                        deferred[method](response);
                    });

                return deferred.promise;
            };

            // Returns a YYYY-MM-DD string
            //
            // AngularJS sets all date models as Date objects,
            // so we convert those to YYYY-MM-DD for the order.
            // It’s a bit hairy because we can’t use
            // .toISOString() since that date will be UTC, while
            // the numbers we want are the ones the user gave.
            function _dateToYYYYMMDD(theDate) {

                return [
                    theDate.getFullYear(),
                    _sprintf02D(1 + theDate.getMonth()),
                    _sprintf02D(theDate.getDate()),
                ].join("-");
            }

            var _requestCertificates = function(provider, accessToken, certificates, urlAfterCheckout) {

                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "request_ssl_certificates");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("access_token", accessToken);
                apiCall.addArgument("url_after_checkout", urlAfterCheckout);

                var jsonCertificates = certificates.map(function(cert) {

                    var newCertificate = {
                        product_id: cert.get_product().id,
                        subject_names: cert.get_subject_names(),
                        vhost_names: cert.get_virtual_hosts(),
                        price: cert.get_price(),
                        validity_period: cert.get_validity_period()
                    };

                    if (cert.get_product().x_identity_verification) {
                        var identityVerification = cert.get_identity_verification();

                        newCertificate.identity_verification = {};
                        cert.get_product().x_identity_verification.forEach(function(idv) {
                            var k = idv.name;

                            // If the form didn’t give us any data for it,
                            // then don’t submit it.
                            if (!identityVerification[k]) {
                                return;
                            }

                            // “date” items come from AngularJS as Date objects,
                            // but they come from JSON as ISO 8601 strings.
                            if (idv.type === "date") {
                                var dateObject;

                                try {
                                    dateObject = new Date(identityVerification[k]);
                                } catch (e) {
                                    $log.warn("new Date() failed; ignoring", identityVerification[k], e);
                                }

                                if (dateObject) {
                                    newCertificate.identity_verification[k] = _dateToYYYYMMDD(dateObject);
                                }
                            } else {
                                newCertificate.identity_verification[k] = identityVerification[k];
                            }
                        });
                    }

                    // A lookup map of the wildcard subject names.
                    var wildcardDomainMap = {};

                    newCertificate.subject_names.forEach(function(subject_name) {
                        var domain = subject_name.name;
                        if (domain.indexOf("*.") === 0) {
                            wildcardDomainMap[domain] = true;
                        }
                    });

                    // An array of objects that describe subject name
                    // entries to add for www. subdomains.
                    var validWWWDomains = [];

                    newCertificate.subject_names.forEach(function(subject_name) {
                        var domain = subject_name.name;

                        // Don’t add www. if we already have the wildcard
                        // for the domain. For example, if the cert will
                        // secure foo.com and *.foo.com, there’s no need
                        // for www.foo.com, so we leave it off.
                        var addWwwYn = !wildcardDomainMap["*." + domain];

                        // Only add www. if that domain actually exists.
                        addWwwYn = addWwwYn && wwwDomainsLookup["www." + domain];

                        if ( addWwwYn ) {
                            validWWWDomains.push( {
                                type: "dNSName",
                                name: "www." + domain,
                                dcv_method: subject_name.dcv_method,
                            });
                        }
                    });

                    newCertificate.subject_names = newCertificate.subject_names.concat(validWWWDomains);

                    return JSON.stringify(newCertificate);
                });

                apiCall.addArgument("certificate", jsonCertificates);

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                deferred.promise.catch(CertificatesService.reset.bind(CertificatesService));

                return deferred.promise;
            };

            CertificatesService.request_certificates = function(provider, accessToken, certificates, urlAfterCheckout) {

                // This now requires that wwwDomainsLookup be populated.
                // We ensure that by calling fetch_domains().
                var domains_fetch = CertificatesService.fetch_domains();

                var callback = function() {
                    return _requestCertificates(provider, accessToken, certificates, urlAfterCheckout);
                };

                if (domains_fetch.then) {
                    return domains_fetch.then(callback);
                }

                return callback();
            };

            CertificatesService.get_pending_certificates = function() {
                return pendingCertificates;
            };

            var _assignPendingCertificates = function(newPending) {
                pendingCertificates = newPending;
                pendingCertificates.forEach(function(pcert) {

                    // Typecasts
                    pcert.order_id += "";
                    pcert.order_item_id += "";
                    pcert.product_id += "";
                });
            };

            CertificatesService.fetch_pending_certificates = function() {

                if (CPANEL.PAGE.pending_certificates) {
                    _assignPendingCertificates(CPANEL.PAGE.pending_certificates);

                    /* if exists on page load use it, but if view switching, we want to reload, so clear this variable */
                    CPANEL.PAGE.pending_certificates = null;
                    if (pendingCertificates.length) {
                        return true;
                    }
                }

                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "get_pending_ssl_certificates");

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                deferred.promise.then(function(result) {
                    _assignPendingCertificates(result.data);
                }, function(error) {
                    _apiError("Market::pending_certificates", error);
                });

                return deferred.promise;
            };

            CertificatesService.add_raw_installed_host = function(ihost) {
                if (!installedHosts) {
                    installedHosts = [];
                }
                ihost.certificate.is_self_signed = parseInt(ihost.certificate.is_self_signed, 10) === 1;
                installedHosts.push(ihost);
                installedHostsMap[ihost.servername] = ihost;
            };

            CertificatesService.get_domain_certificate = function(domain) {
                return sslDomains[domain];
            };

            CertificatesService.get_domain_by_domain = function(domain) {
                var domains = CertificatesService.get_all_domains();
                for (var i = 0; i < domains.length; i++) {
                    if (domains[i].domain === domain) {
                        return domains[i];
                    }
                }
                return;
            };

            CertificatesService.get_virtual_host_certificate = function(virtualHost) {
                if (!installedHosts) {
                    return;
                }
                for (var i = 0; i < installedHosts.length; i++) {
                    if (installedHosts[i].servername === virtualHost.display_name) {
                        return installedHosts[i];
                    }
                }

                return installedHosts[0] ? installedHosts[0] : undefined;
            };

            CertificatesService.fetch_installed_hosts = function() {
                if (installedHosts) {
                    return true;
                }

                if (CPANEL.PAGE.installed_hosts) {
                    if (!CPANEL.PAGE.installed_hosts.length) {
                        return true; /* Defined, but no installed hosts */
                    }
                    installedHosts = [];
                    installedHostsMap = {};
                    sslDomains = {};
                    angular.forEach(CPANEL.PAGE.installed_hosts, function(ihost) {
                        CertificatesService.add_raw_installed_host(ihost);
                    });
                    if (installedHosts.length) {
                        return true;
                    }
                }

                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("SSL", "installed_hosts");

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                deferred.promise.then(function(result) {
                    installedHosts = [];
                    installedHostsMap = {};
                    sslDomains = {};
                    angular.forEach(result.data, function(ihost) {
                        CertificatesService.add_raw_installed_host(ihost);
                    });
                }, function(error) {
                    _apiError("SSL::installed_hosts", error);
                });

                return deferred.promise;
            };

            var _makeBatch = function(calls) {
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Batch", "strict");

                apiCall.addArgument("command", calls.map(JSON.stringify, JSON));

                return apiCall;
            };

            CertificatesService.install_certificate = function(cert, vhostNames) {
                var apiCall = _makeBatch(vhostNames.map(function(vh) {
                    return [
                        "SSL",
                        "install_ssl", {
                            cert: cert,
                            domain: vh
                        }
                    ];
                }));

                return CertificatesService._runUAPI(apiCall);
            };

            CertificatesService.get_ssl_certificate_if_available = function(provider, orderItemID) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Market", "get_ssl_certificate_if_available");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("order_item_id", orderItemID);

                return CertificatesService._runUAPI(apiCall);
            };

            CertificatesService.get_installed_ssl_for_domain = function(domain) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SSL", "installed_host");
                apiCall.addArgument("domain", domain);

                return CertificatesService._runUAPI(apiCall);
            };

            CertificatesService.cancel_pending_ssl_certificate_and_poll = function(provider, orderItemID) {
                var apiCall = _makeBatch([
                    [
                        "Market",
                        "cancel_pending_ssl_certificate", {
                            provider: provider,
                            order_item_id: orderItemID
                        }
                    ],
                    [
                        "Market",
                        "get_ssl_certificate_if_available", {
                            provider: provider,
                            order_item_id: orderItemID
                        }
                    ],
                ]);

                return CertificatesService._runUAPI(apiCall);
            };

            CertificatesService.cancel_pending_ssl_certificates = function(provider, orderItemIDs) {
                var apiCall = _makeBatch(orderItemIDs.map(function(oiid) {
                    return [
                        "Market",
                        "cancel_pending_ssl_certificate", {
                            provider: provider,
                            order_item_id: oiid
                        }
                    ];
                }));

                return CertificatesService._runUAPI(apiCall);
            };

            CertificatesService.cancel_certificate = function(virtualHost, provider, orderItemID) {
                CertificatesService.cancel_pending_ssl_certificate(provider, orderItemID).then(function() {
                    angular.forEach(virtualHost.get_selected_domains(), function(domain) {
                        domain.selected = false;
                    });
                });
            };

            CertificatesService.process_ssl_pending_queue = function() {

                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "process_ssl_pending_queue");

                API.promise(apiCall.getRunArguments())
                    .done(function(response) {
                        response = response.parsedResponse;
                        if (response.status) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response.error);
                        }
                    });

                return deferred.promise;
            };

            CertificatesService.hard_reset = function() {
                CertificatesService.reset();
                CPANEL.PAGE.domains = null;
            };

            CertificatesService.reset = function() {
                virtualHosts = [];
                allDomains = [];
                products = [];
                installedHosts = null;
                purchasingCerts = [];
                sslDomains = {};
                orders = [];
                wildcardMap = {};
            };

            CertificatesService.reset_purchasing_certificates = function() {
                purchasingCerts = [];
            };

            CertificatesService.dismiss_introduction = function() {
                introductionDismissed = true;
            };

            CertificatesService.show_introduction_block = function() {
                return !introductionDismissed && !alertService.getAlerts().length;
            };

            CertificatesService.parseCertificateDomainDetails = function(rawDomainDetails) {
                var domainDetails = {};

                angular.forEach(rawDomainDetails, function(value) {
                    domainDetails[value.domain] = value.status;
                });

                return domainDetails;
            };

            CertificatesService.parseCertificateStatusDetails = function(rawStatusDetails, rawActionUrls) {

                var statusDetails = [];

                if (!rawStatusDetails) {
                    return statusDetails;
                }

                rawActionUrls = rawActionUrls ? rawActionUrls : {};

                angular.forEach(rawStatusDetails, function(detail, key) {

                    var detailString = STATUS_DETAIL_STRINGS[key];
                    if (!detailString) {
                        detailString = {
                            label: key,
                            inProgress: ""
                        };
                    }

                    if (detail === "not-applicable" || key === "certificateStatus" || key === "csrStatus") {
                        return;
                    }

                    if (detail) {

                        var status;

                        if (detail === "not-completed") {
                            status = detailString.inProgress;
                        } else if (detail === "completed") {
                            status = LOCALE.maketext("Complete.");
                        } else {
                            status = detail;
                        }

                        var detailItem = {
                            label: detailString.label,
                            status: status,
                            rawLabel: key,
                            rawStatus: detail
                        };

                        if (rawActionUrls[key]) {
                            detailItem.actionLabel = ACTION_URL_LABELS[key] || ACTION_URL_LABELS.DEFAULT;
                            detailItem.actionURL = rawActionUrls[key];
                            detailItem.actionIcon = ACTION_URL_ICONS[key] || ACTION_URL_ICONS.DEFAULT;
                        }

                        statusDetails.push(detailItem);
                    }

                });

                return statusDetails;
            };

            CertificatesService.getCertificateStatusDetails = function(provider, orderItemID) {
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "get_certificate_status_details", {
                    "provider": provider,
                    "order_item_id": orderItemID
                });

                return CertificatesService._runUAPI(apiCall).then(function(result) {

                    return {
                        statusDetails: CertificatesService.parseCertificateStatusDetails(result.data.status_details, result.data.action_urls),
                        domainDetails: CertificatesService.parseCertificateDomainDetails(result.data.domain_details)
                    };

                });

            };

            return CertificatesService;
        }

        return app.factory("CertificatesService", ["VirtualHost", "Certificate", "$q", "$log", "alertService", CertificatesServiceFactory]);
    });

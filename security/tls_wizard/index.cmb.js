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
    'app/services/HasIdVerMix',[
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
    'app/views/Certificate',[
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

/*
* base/frontend/paper_lantern/security/tls_wizard/services/VirtualHost.js
*                                                 Copyright(c) 2016 cPanel, Inc.
*                                                           All rights reserved.
* copyright@cpanel.net                                         http://cpanel.net
* This code is subject to the cPanel license. Unauthorized copying is prohibited
*/


/* global define: false */
/* jshint -W100 */
/* eslint-disable camelcase */

define(
    'app/services/VirtualHost',[
        "angular",
        "lodash",
        "app/services/HasIdVerMix",
    ],
    function(angular, _, HasIdVerMix) {
        "use strict";

        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        app.factory("VirtualHost", [
            "HasIdVerMix",
            function(HasIdVerMix) {
                function VirtualHost(vhost_obj) {
                    var self = this;
                    self.display_name = "";
                    self.domains = [];
                    self.selected_domains = [];
                    self.filtered_domains = {};
                    self.show_wildcards = true;
                    self.show_domains = true;
                    self.display_meta = {
                        items_per_page: 10,
                        current_page: 1
                    };
                    self.displayed_domains = [];
                    self.selected_product = null;
                    self.calculated_price = null;
                    self.is_ssl = 0;
                    self.product_price = 0;
                    self.product_wildcard_price = 0;
                    self.added_to_cart = false;
                    self.current_step = "domains";

                    angular.extend(self, vhost_obj);
                }

                angular.extend( VirtualHost.prototype, HasIdVerMix );

                angular.extend( VirtualHost.prototype, {
                    get_display_name: function() {
                        return this.display_name;
                    },

                    reset: function() {
                        this.current_step = "domains";
                        this.set_product(null);
                        this.set_product_price(0);
                        this.calculated_price = null;
                        this.selected_product = null;
                        angular.forEach(this.domains, function(domain) {
                            domain.selected = false;
                        });
                        this.get_selected_domains();
                    },

                    get_step: function() {
                        return this.current_step;
                    },
                    go_step: function(new_step) {
                        this.current_step = new_step;
                        return this.current_step;
                    },
                    get_price: function() {
                        var selected_domains = this.get_selected_domains();
                        var wildcard_domains = selected_domains.filter(function(domain) {
                            if (domain.is_wildcard) {
                                return true;
                            }
                            return false;
                        });
                        this.calculated_price = (this.product_price * (selected_domains.length - wildcard_domains.length)) + (wildcard_domains.length * this.product_wildcard_price);
                        return this.calculated_price;
                    },
                    set_product_price: function(price, wildcard_price) {
                        this.product_price = price || 0;
                        this.product_wildcard_price = wildcard_price || 0;
                    },
                    get_price_string: function() {
                        return "$" + this.get_price().toFixed(2) + " USD";
                    },

                    get_product: function() {
                        return this.selected_product;
                    },
                    set_product: function(product_obj) {
                        this.selected_product = product_obj;
                    },

                    get_domains: function() {
                        return this.domains;
                    },

                    set_displayed_domains: function(domains) {
                        this.displayed_domains = domains;
                    },

                    get_filtered_domains: function() {
                        var domains = this.get_domains();
                        var key;

                        if (this.show_wildcards && this.show_domains) {
                            key = "all";
                        } else if (this.show_wildcards) {
                            key = "wildcards";
                        } else if (this.show_domains) {
                            key = "domains";
                        } else {
                            return [];
                        }

                        if (this.filtered_domains[key]) {
                            return this.filtered_domains[key];
                        }

                        this.filtered_domains[key] = [];

                        var self = this;

                        angular.forEach(domains, function(domain) {
                            if (!self.show_wildcards && domain.is_wildcard) {
                                return false;
                            }
                            if (!self.show_domains && !domain.is_wildcard) {
                                return false;
                            }
                            self.filtered_domains[key].push(domain);
                        });

                        return this.filtered_domains[key];
                    },

                    get_domain_count: function(include_wildcards) {
                        if (include_wildcards) {
                            return this.domains.length;
                        }
                        return this.domains.length / 2;
                    },

                    get_displayed_domains: function() {
                        this.displayed_domains = [];

                        var filtered_domains = this.get_filtered_domains();

                        this.display_meta.start = this.display_meta.items_per_page * (this.display_meta.current_page - 1);
                        this.display_meta.limit = Math.min(filtered_domains.length, this.display_meta.start + this.display_meta.items_per_page);
                        for (var i = this.display_meta.start; i < this.display_meta.limit; i++) {

                            /* don't display wildcards*/
                            /* function is only used in 'advanced' mode */
                            if (filtered_domains[i].is_wildcard) {
                                continue;
                            }
                            this.displayed_domains.push(filtered_domains[i]);
                        }
                        return this.displayed_domains;
                    },

                    add_domain: function(domain) {
                        if (this.get_domain_by_domain(domain.domain)) {
                            return;
                        }
                        domain.resolved = -1; // Tri-state check (-1 = unchecked, 0/false = doesn't resolve, 1/true = resolves locally)
                        domain.resolving = false; // While a resolve is occuring.
                        var domain_id = this.domains.length;
                        this.domains.push(domain);
                        return domain_id;
                    },
                    get_domain_by_domain: function(domain) {
                        var match;
                        angular.forEach(this.domains, function(value) {
                            if (value.domain === domain) {
                                match = value;
                            }
                        });
                        return match;
                    },

                    // This doesn't actually remove a domain, it deselects it
                    remove_domain: function(domain) {
                        domain.selected = 0;
                        this.get_selected_domains();
                    },

                    // This doesn't actually remove domains, it deselects them
                    remove_all_domains: function() {
                        for (var i = 0; i < this.domains.length; i++) {
                            this.remove_domain(this.domains[i]);
                        }
                    },

                    is_ready: function() {
                        if (this.get_domains().length === 0) {
                            return false;
                        }
                        if (!this.get_product()) {
                            return false;
                        }
                        return true;
                    },

                    toJSON: function() {
                        var temp_data = {};
                        temp_data.display_name = this.display_name;
                        temp_data.selected_domains = this.selected_domains;
                        temp_data.selected_product = this.selected_product;
                        temp_data.calculated_price = this.calculated_price;
                        temp_data.product_price = this.product_price;
                        temp_data.domains = this.get_domains();
                        temp_data.identity_verification = this.get_identity_verification();

                        return temp_data;
                    },

                    get_selected_domains: function get_selected_domains() {
                        var selected_domains = _.filter( this.get_domains(), "selected" );
                        this.selected_domains = selected_domains;
                        return selected_domains;
                    },
                    has_selected_domains: function get_selected_domains() {
                        return _.some( this.get_domains(), "selected" );
                    },
                } );

                return VirtualHost;
            }
        ] );
    }
);

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
    'app/services/CertificatesService',[
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
    'app/services/LocationService',[
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
    'app/services/IdVerDefaults',[
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
    'app/services/CountriesService',[
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

/*
 * base/frontend/paper_lantern/security/tls_wizard/views/VirtualHostsController.js
 *                                                    Copyright 2018 cPanel, Inc.
 *                                                           All rights reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */
/* jshint -W100 */
/* eslint-disable camelcase */

// Then load the application dependencies
define(
    'app/views/VirtualHostsController',[
        "angular",
        "cjt/util/locale",
        "jquery",
        "cjt/modules",
        "ngSanitize",
        "app/services/CertificatesService",
        "app/services/IdVerDefaults",
        "cjt/filters/qaSafeIDFilter",
        "cjt/directives/cpanel/searchSettingsPanel",
        "cjt/directives/triStateCheckbox",
        "cjt/directives/spinnerDirective",
        "cjt/decorators/growlDecorator",
        "app/services/CountriesService",
        "app/services/LocationService",
    ],
    function(angular, LOCALE, $) {
        "use strict";

        var app = angular.module("App");

        function VirtualHostsController(
            $rootScope,
            $scope,
            $controller,
            $location,
            $filter,
            $timeout,
            $sce,
            $routeParams,
            $window,
            CertificatesService,
            IdVerDefaults,
            SpinnerAPI,
            growl,
            COUNTRIES,
            LocationService,
            SearchSettingsModel,
            alertService) {

            $scope.show_introduction_block = CertificatesService.show_introduction_block;

            $scope.domains = CertificatesService.get_all_domains();
            $scope.virtual_hosts = CertificatesService.get_virtual_hosts();
            $scope.pending_certificates = CertificatesService.get_pending_certificates();
            $scope.showExistingCertificates = false;
            $scope.working_virtual_host = null;
            $scope.LOCALE = LOCALE;
            $scope.resolution_timeout = 0;
            $scope.cart_items = [];
            $scope.filterValue = null;
            $scope.checkout_mode = false;
            $scope.filteredProducts = [];
            $scope.showAdvancedSettings = true;
            $rootScope.addToCartGrowl = null;

            $scope.COUNTRIES = COUNTRIES;

            var identityVerification = {};
            $scope.identity_verification = identityVerification;

            var savedIDVer = CertificatesService.get_stored_extra_settings().advanced_identity_verification;

            for (var vh = 0; vh < $scope.virtual_hosts.length; vh++) {
                var vHostName = $scope.virtual_hosts[vh].get_display_name();

                identityVerification[vHostName] = {};

                if (savedIDVer && savedIDVer[vHostName]) {
                    IdVerDefaults.restore_previous(identityVerification[vHostName], savedIDVer[vHostName]);
                } else {
                    IdVerDefaults.set_defaults(identityVerification[vHostName]);
                }
            }

            // reset on visit to purchase certs
            angular.forEach($scope.virtual_hosts, function(virtualHost) {
                virtualHost.reset();

                /* don't show wildcards in this interface */
                virtualHost.show_wildcards = false;
            });

            /* to reset after reset */
            $scope.domains = CertificatesService.get_all_domains();
            $scope.domains = $filter("filter")($scope.domains, {
                is_wildcard: false
            });
            $scope.virtual_hosts = CertificatesService.get_virtual_hosts();

            $scope.virtual_hosts = $filter("filter")($scope.virtual_hosts, function(vhost) {
                return !vhost.display_name.match(/^\*\./);
            });

            var defaultSearchValues = {
                "certTerms": {
                    "1_year": true,
                    "2_year": false,
                    "3_year": false
                }
            };

            $scope.searchFilterOptions = new SearchSettingsModel(CertificatesService.get_product_search_options(), defaultSearchValues);

            $scope.filter_products = function() {

                var filteredProducts = CertificatesService.get_products();

                filteredProducts = $scope.searchFilterOptions.filter(filteredProducts);

                $scope.filteredProducts = filteredProducts;
            };

            $scope.slow_scroll_to_top = function() {
                $("body,html").animate({
                    "scrollTop": 0
                }, 2000);
            };

            $scope.go_to_product_filters = function() {
                $scope.showAdvancedSettings = true;
                $scope.slow_scroll_to_top();
            };

            var buildSteps = ["domains", "providers", "cert-info"];
            var qaFilter = $filter("qaSafeID");

            $scope.get_cart_certs_title = function() {
                return LOCALE.maketext("[quant,_1,Certificate,Certificates]", $scope.get_cart_items().length);
            };

            $scope.get_vhost_showing_text = function() {
                var vhosts = $filter("filter")($scope.get_virtual_hosts(), $scope.filterValue);
                return LOCALE.maketext("[output,strong,Showing] [numf,_1] of [quant,_2,website,websites]", vhosts.length, $scope.get_virtual_hosts().length);
            };

            $scope.get_domains_showing_text = function(virtualHost) {
                var numStart = 1 + virtualHost.display_meta.start;
                var numLimit = virtualHost.display_meta.limit;
                var numOf = virtualHost.get_domain_count(true);
                return LOCALE.maketext("[output,strong,Showing] [numf,_1] - [numf,_2] of [quant,_3,domain,domains].", numStart, numLimit, numOf);
            };

            $scope.deselect_unresolved_msg = function(virtualHost) {
                var unresolvedCount = virtualHost.get_selected_domains().filter(function(domain) {
                    return domain.resolved === 0;
                }).length;
                return LOCALE.maketext("Deselect all unresolved domains ([numf,_1]).", unresolvedCount);
            };

            $scope.go_to_pending = function(orderItemID) {
                if (orderItemID) {
                    $location.path("/pending-certificates/").search("orderItemID", orderItemID);
                } else {
                    $location.path("/pending-certificates");
                }
            };

            $scope.pending_certificate = function(virtualHost) {
                var result = false;
                angular.forEach($scope.pending_certificates, function(pcert) {
                    angular.forEach(pcert.vhost_names, function(vhostName) {
                        if (vhostName === virtualHost.display_name) {
                            result = pcert.order_item_id;
                        }
                    });
                });
                return result;
            };

            $scope.get_certpanel_class = function(virtualHost) {
                if (!$scope.pending_certificate(virtualHost)) {
                    return "panel-primary";
                } else {
                    return "panel-default";
                }
            };

            $scope.view_pending_certificate = function(virtualHost) {
                var orderItemID = $scope.pending_certificate(virtualHost);
                $scope.go_to_pending(orderItemID);
            };

            $scope.get_currency_string = function(num, priceUnit) {
                num += 0.001;
                var str = LOCALE.numf(num);
                str = "$" + str.substring(0, str.length - 1);
                if (priceUnit) {
                    str += " " + priceUnit;
                }
                return str;
            };

            $scope.get_virtual_hosts = function() {
                var virtualHosts = $scope.virtual_hosts;
                if ($scope.filterValue) {
                    virtualHosts = $filter("filter")(virtualHosts, $scope.filterValue);
                }
                if ($scope.checkout_mode) {
                    virtualHosts = $filter("filter")(virtualHosts, {
                        added_to_cart: true
                    });
                }
                return virtualHosts;
            };

            $scope.get_virtual_host_classes = function(virtualHost) {
                return {
                    "col-lg-4": $scope.virtual_hosts.length > 2,
                    "col-lg-6": $scope.virtual_hosts.length <= 2,
                    "panel-success": virtualHost.is_ssl
                };
            };

            $scope.get_step_panel_classes = function(virtualHost, current) {
                var classes = ["col-sm-12", "col-xs-12"];

                // add step type specific classes

                if ($scope.working_virtual_host === virtualHost.display_name) {
                    classes.push("col-md-4");
                    classes.push("col-lg-4");
                } else {
                    classes.push("col-md-12");
                    classes.push("col-lg-12");
                }

                if (current) {
                    classes.push("cert-step-panel-current");
                }

                return classes;

            };

            $scope.get_cart_price = function() {
                var price = 0;
                angular.forEach($scope.get_cart_items(), function(virtualHost) {
                    price += virtualHost.get_price();
                });
                return price;
            };

            $scope.get_cart_items = function() {
                $scope.cart_items = $filter("filter")($scope.virtual_hosts, {
                    added_to_cart: true
                });
                return $scope.cart_items;
            };

            $scope.checkout = function() {
                $scope.checkout_mode = true;
            };

            $scope.get_product_form_fields = function() {
                return [];
            };

            $scope.get_step = function(virtualHost) {
                return virtualHost.get_step();
            };

            $scope.go_step = function(virtualHost, step) {
                if ($scope.can_step(virtualHost, step)) {
                    return virtualHost.go_step(step);
                }
            };

            $scope.focus_virtual_host = function() {

                // $scope.working_virtual_host = virtual_host.display_name;
            };

            $scope.check_selected_domains = function(virtualHost) {
                if ($scope.resolution_timeout) {
                    $timeout.cancel($scope.resolution_timeout);
                }
                if (virtualHost && virtualHost.added_to_cart) {
                    var domains = $filter("filter")(virtualHost.get_selected_domains(), function(domain) {
                        if (domain.resolved !== 1) {
                            return true;
                        }
                    });
                    if (domains.length) {
                        alertService.add({
                            type: "danger",
                            message: LOCALE.maketext("You have altered an item in your cart. The system has removed that item. After you make the necessary changes, add that item back to your cart."),
                            group: "tlsWizard"
                        });
                        $scope.remove_from_cart(virtualHost);
                    }
                }
                $scope.resolution_timeout = $timeout(function(domains) {
                    $scope.ensure_dns(domains);
                }, 850, true, CertificatesService.get_all_selected_domains()); // JNK: Lowered wait time since I keep missing it when testing
            };

            $scope.deselect_domains = function(domains) {
                angular.forEach(domains, function(domain) {
                    domain.selected = false;
                });
            };

            $scope.get_current_or_default_provider = function() {
                return CertificatesService.get_default_provider_name();
            };

            $scope.ensure_dns = function(domains) {
                domains = $filter("filter")(domains, {
                    selected: true,
                    resolved: -1
                });
                if (!domains.length) {
                    return false;
                }
                angular.forEach(domains, function(domain) {
                    domain.resolving = true;
                    SpinnerAPI.start($scope.get_spinner_id(domain.domain));
                });
                var providerName = $scope.get_current_or_default_provider();
                return CertificatesService.ensure_domains_can_pass_dcv(domains, providerName).finally(function() {
                    var toFocusElement;
                    angular.forEach(domains, function(domain) {
                        if (domain.resolved === 0 && domain.selected) {

                            /* checked domain doesn't resolve */
                            var vhostIndex = CertificatesService.get_virtual_host_by_display_name(domain.vhost_name);
                            var vhost = $scope.virtual_hosts[vhostIndex];
                            if (vhost && vhost.get_step() === "providers") {

                                /* if we are on the providers section, send them back to the domains section to see errors */
                                $scope.go_step(vhost, "domains");

                                /* set focus to top domain in domains list */
                                var element = $window.document.getElementById($scope.get_domain_id(domain));
                                if (element && !toFocusElement) {

                                    /* only focus first element */
                                    toFocusElement = element;
                                    $timeout(function() {
                                        toFocusElement.focus();
                                    });
                                }
                            }
                        }
                        SpinnerAPI.stop($scope.get_spinner_id(domain.domain));
                    });
                });
            };

            $scope.get_domain_id = function(domainObject) {
                return qaFilter(domainObject.vhost_name + "_" + domainObject.domain);
            };

            $scope.check_product_match = function(productA, productB) {
                if (!productA || !productB) {
                    return false;
                }
                if (productA.id === productB.id && productA.provider === productB.provider) {
                    return true;
                }
            };

            $scope.can_step = function(virtualHost, step) {
                if (step === buildSteps[0]) {
                    return true;
                } else if (step === buildSteps[1]) {

                    // providers
                    /* can progress if domains are selected, after they are resolved they user is kicked back to domains if there is an error */
                    return virtualHost.get_selected_domains().length ? true : false;
                } else if (step === buildSteps[2]) {

                    // cert-info
                    var product = virtualHost.get_product();
                    if (!product) {
                        return false;
                    }
                    product = CertificatesService.get_product_by_id(product.provider, product.id);
                    if (!product) {
                        return false;
                    }
                    if (!$scope.get_product_form_fields(product)) {
                        return false;
                    }
                }
                return false;
            };

            $scope.get_product_by_id = function(providerName, productID) {
                return CertificatesService.get_product_by_id(providerName, productID);
            };

            $scope.can_next_step = function(virtualHost) {
                var currentStep = virtualHost.get_step();
                var nextStep;
                angular.forEach(buildSteps, function(step, index) {
                    if (step === currentStep) {
                        nextStep = buildSteps[index + 1];
                    }
                });

                return $scope.can_step(virtualHost, nextStep);

            };

            $scope.next_step = function(virtualHost) {
                var currentStep = virtualHost.get_step();
                var nextStep;
                angular.forEach(buildSteps, function(step, index) {
                    if (step === currentStep) {
                        nextStep = buildSteps[index + 1];
                    }
                });

                if ($scope.can_step(virtualHost, nextStep)) {
                    $scope.focus_virtual_host(virtualHost);
                    virtualHost.go_step(nextStep);
                }
            };

            $scope.get_spinner_id = function(domain) {
                return qaFilter("dns_resolving_" + domain);
            };

            $scope.get_products = function(virtualHost) {
                return CertificatesService.filterProductsByDomainsDcv(
                    $scope.filteredProducts,
                    virtualHost.get_selected_domains()
                );
            };

            $scope.set_product = function(virtualHost, product) {
                virtualHost.set_product_price(product.price);
                virtualHost.set_product(product);
            };

            $scope.all_domains_resolved = function(virtualHost) {
                var domains = virtualHost.get_selected_domains();

                domains = $filter("filter")(domains, function(domain) {
                    if (domain.resolved !== 1) {
                        return false;
                    }
                    return true;
                });

                if (domains.length === 0) {

                    // No Resolved and Selected Domains
                    return false;
                }

                return true;
            };

            $scope.can_add_to_cart = function(virtualHost) {
                var product = virtualHost.get_product();
                if (!product) {
                    return false;
                }
                product = CertificatesService.get_product_by_id(product.provider, product.id);
                if (!product) {

                    // No Valid Product Selected
                    return false;
                }

                return true;

            };

            $scope.add_to_cart = function(virtualHost) {
                if (!$scope.can_add_to_cart(virtualHost) || !$scope.all_domains_resolved(virtualHost)) {
                    return false;
                }
                virtualHost.added_to_cart = true;
                virtualHost.go_step("added-to-cart");

                virtualHost.set_identity_verification($scope.identity_verification[virtualHost.display_name]);

                $scope.working_virtual_host = null;

                // REFACTOR:: Should find a way to do this with CJT2/alertService and remove
                // growl usage here.
                if ($rootScope.addToCartGrowl) {
                    $rootScope.addToCartGrowl.ttl = 0;
                    $rootScope.addToCartGrowl = null;
                }
                var options = {
                    ttl: -1,
                    variables: {
                        buttonLabel: LOCALE.maketext("Proceed to checkout."),
                        showAction: true,
                        action: function() {
                            $scope.purchase();
                        }
                    }
                };
                $rootScope.addToCartGrowl = growl.success(LOCALE.maketext("Item Successfully Added to Cart."), options);
            };

            $scope.get_domain_certificate = function(domain) {
                return CertificatesService.get_domain_certificate(domain);
            };

            $scope.view_existing_certificate = function() {

            };

            $scope.get_virtual_host_certificate = function(virtualHost) {
                return CertificatesService.get_virtual_host_certificate(virtualHost);
            };

            $scope.build_csr_url = function(virtualHost) {
                var ihost = $scope.get_virtual_host_certificate(virtualHost);
                if (ihost && ihost.certificate) {
                    var url = "";
                    url += "../../ssl/install.html?id=";
                    url += encodeURIComponent(ihost.certificate.id);
                    return url;
                }
            };

            $scope.get_existing_certificate_name = function(virtualHost) {
                var ihost = $scope.get_virtual_host_certificate(virtualHost);

                var name;
                if (ihost && ihost.certificate) {
                    var cert = ihost.certificate;
                    if (cert.validation_type === "dv") {
                        name = LOCALE.maketext("A [output,abbr,DV,Domain Validated] certificate is installed.");
                    } else if (cert.validation_type === "ov") {
                        name = LOCALE.maketext("An [output,abbr,OV,Organization Validated] certificate is installed.");
                    } else if (cert.validation_type === "ev") {
                        name = LOCALE.maketext("An [output,abbr,EV,Extended Validation] certificate is installed.");
                    } else if (cert.is_self_signed) {
                        name = LOCALE.maketext("A self-signed certificate is installed.");
                    }
                }
                if (!name) {
                    name = LOCALE.maketext("A certificate of unknown type is installed.");
                }

                return name;
            };

            $scope.get_domain_lock_classes = function(virtualHost) {
                var ihost = $scope.get_virtual_host_certificate(virtualHost);
                if (ihost && ihost.certificate) {
                    if (ihost.certificate.is_self_signed) {
                        return "grey-padlock";
                    } else {
                        return "green-padlock";
                    }
                }
            };

            $scope.remove_from_cart = function(virtualHost) {
                if ($rootScope.addToCartGrowl) {
                    $rootScope.addToCartGrowl.ttl = 0;
                    $rootScope.addToCartGrowl.destroy();
                    $rootScope.addToCartGrowl = null;
                }
                virtualHost.added_to_cart = false;
            };

            $scope.go_to_simple = function() {
                CertificatesService.hard_reset();
                LocationService.go_to_simple_create_route().search("");
            };

            $scope.purchase = function() {

                /* storing on and removing from rootscope due to scope change */
                if ($rootScope.addToCartGrowl) {
                    $rootScope.addToCartGrowl.ttl = 0;
                    $rootScope.addToCartGrowl.destroy();
                    $rootScope.addToCartGrowl = null;
                }

                var success = CertificatesService.save({
                    advanced_identity_verification: identityVerification,
                });

                if (!success) {
                    alertService.add({
                        type: "danger",
                        message: LOCALE.maketext("Failed to save information to browser cache."),
                        group: "tlsWizard"
                    });
                } else {
                    $location.path("/purchase");
                }

            };

            if ($routeParams["domain"]) {
                angular.forEach($filter("filter")($scope.domains, {
                    domain: $routeParams["domain"]
                }, true), function(domain) {
                    domain.selected = true;
                    $scope.check_selected_domains(domain.vhost_name);
                });

                /* refresh virtual_hosts */
                $scope.virtual_hosts = CertificatesService.get_virtual_hosts();
                $scope.filterValue = $routeParams["domain"];
            }

        }

        app.controller("VirtualHostsController",
            [
                "$rootScope",
                "$scope",
                "$controller",
                "$location",
                "$filter",
                "$timeout",
                "$sce",
                "$routeParams",
                "$window",
                "CertificatesService",
                "IdVerDefaults",
                "spinnerAPI",
                "growl",
                "CountriesService",
                "LocationService",
                "SearchSettingsModel",
                "alertService",
                VirtualHostsController
            ]);


    });

/*
 * base/frontend/paper_lantern/security/tls_wizard/views/PurchaseSimpleController.js
 *                                                    Copyright 2018 cPanel, Inc.
 *                                                           All rights reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */
/* jshint -W100 */
/* eslint-disable camelcase */


// Then load the application dependencies
define(
    'app/views/PurchaseSimpleController',[
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/views/Certificate",
        "app/services/CountriesService",
        "cjt/modules",
        "ngSanitize",
        "app/services/CertificatesService",
        "app/services/LocationService",
        "app/services/IdVerDefaults",
        "cjt/directives/cpanel/searchSettingsPanel",
        "cjt/directives/triStateCheckbox",
        "cjt/filters/qaSafeIDFilter",
        "cjt/directives/spinnerDirective",
        "cjt/directives/quickFiltersDirective"
    ],
    function(angular, _, LOCALE) {
        "use strict";

        var app = angular.module("App");

        app.controller("PurchaseSimpleController", [
            "$rootScope",
            "$scope",
            "$controller",
            "$location",
            "$filter",
            "$timeout",
            "$sce",
            "$routeParams",
            "$window",
            "CertificatesService",
            "IdVerDefaults",
            "CountriesService",
            "Certificate",
            "LocationService",
            "SearchSettingsModel",
            "alertService",
            function($rootScope,
                $scope,
                $controller,
                $location,
                $filter,
                $timeout,
                $sce,
                $routeParams,
                $window,
                CertificatesService,
                IdVerDefaults,
                COUNTRIES,
                Certificate,
                LocationService,
                SearchSettingsModel,
                alertService) {

                $scope.show_introduction_block = CertificatesService.show_introduction_block;

                $scope.domains = CertificatesService.get_all_domains(true);
                $scope.virtual_hosts = CertificatesService.get_virtual_hosts();
                $scope.pending_certificates = CertificatesService.get_pending_certificates();
                $scope.showExistingCertificates = false;
                $scope.selected_domains = [];
                $scope.working_virtual_host = null;
                $scope.LOCALE = LOCALE;
                $scope.resolution_timeout = 0;
                $scope.show_wildcard_domains = true;
                $scope.cart_items = [];
                $scope.checkout_mode = false;
                $scope.missing_base_domains = [];
                $scope.showAdvancedProductSettings = true;
                $scope.panels = {};
                $rootScope.addToCartGrowl = null;

                $scope.COUNTRIES = COUNTRIES;

                $scope.identity_verification = {};

                var savedIDVer = CertificatesService.get_stored_extra_settings().simple_identity_verification;
                if (savedIDVer) {
                    IdVerDefaults.restore_previous($scope.identity_verification, savedIDVer);
                } else {
                    IdVerDefaults.set_defaults($scope.identity_verification);
                }

                // reset on visit to purchase certs
                angular.forEach($scope.virtual_hosts, function(virtualHost) {
                    virtualHost.reset();

                    /*  ensure wildcards are shown in this interface */
                    virtualHost.show_wildcards = true;
                });

                /* build map for lookup later. */
                CertificatesService.build_wildcard_map();

                // meta information
                $scope.meta = {

                    // sort settings
                    sortReverse: false,
                    sortBy: "label",
                    sortDirection: "asc",

                    // pager settings
                    maxPages: 5,
                    totalItems: $scope.domains.length,
                    currentPage: 1,
                    pageSize: 20,
                    pageSizes: [20, 50, 100, 250],
                    start: 0,
                    limit: 20,
                    filterValue: "",
                    productFilterValue: "",
                };

                $scope.cart_price_strings = null;

                var defaultSearchValues = {
                    "certTerms": {
                        "1_year": true,
                        "2_year": false,
                        "3_year": false
                    }
                };

                $scope.searchFilterOptions = new SearchSettingsModel(CertificatesService.get_domain_search_options());
                $scope.productSearchFilterOptions = new SearchSettingsModel(CertificatesService.get_product_search_options(), defaultSearchValues);

                $scope.displayProxySubdomains = true;

                $scope.filter_domains = function(domains) {

                    var filteredDomains = domains;

                    if ($scope.meta.filterValue) {
                        filteredDomains = $filter("filter")(filteredDomains, $scope.meta.filterValue);
                    }

                    filteredDomains = $scope.searchFilterOptions.filter(filteredDomains);

                    return filteredDomains;
                };

                $scope.filter_products = function(products) {

                    var filteredProducts = products;

                    var selectedDomains = $scope.selected_domains;
                    var wildcardDomains = $filter("filter")(selectedDomains, {
                        is_wildcard: true
                    });

                    filteredProducts = $filter("filter")(filteredProducts, function(product) {
                        if (!product.wildcard_price && wildcardDomains.length) {
                            return;
                        } else if (!product.price && selectedDomains.length - wildcardDomains.length > 0) {
                            return;
                        }
                        return true;
                    });

                    if ($scope.meta.productFilterValue) {
                        filteredProducts = $filter("filter")(filteredProducts, $scope.meta.productFilterValue);
                    }

                    filteredProducts = $scope.productSearchFilterOptions.filter(filteredProducts);

                    return filteredProducts;
                };

                $scope.toggle_values = function(items, att, value) {
                    angular.forEach(items, function(item) {
                        item[att] = value;
                    });
                };

                $scope.get_showing_text = function() {
                    return LOCALE.maketext("[output,strong,Showing] [numf,_1] - [numf,_2] of [quant,_3,domain,domains]", $scope.meta.start, $scope.meta.limit, $scope.meta.totalItems);
                };

                // We used to call it “resolution” in the UI, but
                // that’s confusing because it could sound like a
                // DNS “resolution”. So now we say “validate”, which
                // is consistent with the “DCV” initialism.
                $scope.get_resolution_text = function(domain) {
                    if (domain.resolving) {
                        return LOCALE.maketext("Running Domain Control Validation …");
                    } else if (domain.resolved === 0) {
                        return LOCALE.maketext("Domain Control Validation failed: [_1]", domain.resolution_failure_reason);
                    } else if (domain.resolved === 1) {
                        if (domain.dcvPassed.dns) {

                            var whyNotHttp;
                            if (domain.redirects_count) {
                                whyNotHttp = LOCALE.maketext("[asis,HTTP]-based Domain Control Validation required [quant,_1,redirection,redirections].", domain.redirects_count);
                            } else {
                                whyNotHttp = LOCALE.maketext("[asis,HTTP]-based Domain Control Validation failed.");
                            }

                            return LOCALE.maketext("Validated via [asis,DNS]-based Domain Control Validation.") + " (" + whyNotHttp + ")";
                        } else {
                            return LOCALE.maketext("Validated via [asis,HTTP]-based Domain Control Validation.");
                        }
                    }
                };

                $scope.get_domain_badge_color = function(domain) {
                    if (domain.resolving) {
                        return "info";
                    } else if (domain.resolved === 1) {
                        return "success";
                    } else if (domain.resolved === 0) {
                        return "danger";
                    }
                    return "default";
                };

                $scope.get_cert_status_color = function(domain) {

                    var cert = $scope.get_domain_certificate(domain.domain).certificate;

                    if (!cert) {
                        return;
                    }

                    if (domain.certificate_status === "active" && !cert.is_self_signed) {
                        return "label-success";
                    }

                    if (domain.certificate_status === "expired") {
                        return "label-danger";
                    }

                    if (cert.is_self_signed || domain.certificate_status === "expiring_soon") {
                        return "label-warning";
                    }

                };

                $scope.select_domain = function(selectedDomain) {
                    if (selectedDomain.selected && selectedDomain.is_wildcard) {

                        // select domains covered by this wildcard
                        var coveredDomains = $filter("filter")($scope.domains, function(domain) {
                            return CertificatesService.compare_wildcard_domain(selectedDomain, domain.domain);
                        });
                        $scope.toggle_values(coveredDomains, "selected", true);
                    }
                    $scope.update_selected_domains();
                    $scope.check_selected_domains();
                };

                $scope.check_selected_domains = function() {
                    if ($scope.resolution_timeout) {
                        $timeout.cancel($scope.resolution_timeout);
                    }

                    $scope.resolution_timeout = $timeout(function(domains) {
                        $scope.ensure_dns(domains);
                    }, 850, true, CertificatesService.get_all_selected_domains()); // JNK: Lowered wait time since I keep missing it when testing
                };

                $scope.update_selected_domains = function() {
                    $scope.selected_domains = $filter("filter")($scope.domains, function(domain) {
                        if (!domain.selected) {
                            return false;
                        }

                        /* while technically selected, not included in the cert */
                        if ($scope.domain_covered_by_wildcard(domain)) {
                            return false;
                        }
                        return true;
                    });

                    $scope.current_certificate.set_domains($scope.selected_domains);
                    $scope.current_certificate.set_virtual_hosts($scope.get_selected_vhosts());
                    $scope.update_baseless_wildcard_domains();
                    $scope.fetch_products();
                    $scope.update_cart_strings();
                };

                $scope.get_domain_certificate = function(domain) {
                    return CertificatesService.get_domain_certificate(domain);
                };

                $scope.get_domain_certificate_type = function(domain) {
                    if (domain.certificate_type) {
                        return domain.certificate_type;
                    }
                    domain.certificate_type = "unsecured";
                    var ihost = $scope.get_domain_certificate(domain.domain);
                    if (ihost && ihost.certificate) {
                        if (!ihost.certificate.is_self_signed && ihost.certificate.validation_type) {
                            domain.certificate_type = ihost.certificate.validation_type;
                        }
                    }

                    return $scope.get_domain_certificate_type(domain);
                };

                $scope.get_domain_cert_msg = function(domain) {
                    if (domain.certificate_status_msg) {
                        return domain.certificate_status_msg;
                    }

                    var ihost = $scope.get_domain_certificate(domain.domain);

                    var name;
                    if (ihost && ihost.certificate) {
                        var cert = ihost.certificate;
                        if (cert.validation_type === "dv") {
                            name = LOCALE.maketext("A [output,abbr,DV,Domain Validated] certificate already secures this domain.");
                        } else if (cert.validation_type === "ov") {
                            name = LOCALE.maketext("An [output,abbr,OV,Organization Validated] certificate already secures this domain.");
                        } else if (cert.validation_type === "ev") {
                            name = LOCALE.maketext("An [output,abbr,EV,Extended Validation] certificate already secures this domain.");
                        } else if (cert.is_self_signed) {
                            name = LOCALE.maketext("A self-signed certificate already secures this domain.");
                        }
                    }
                    if (!name) {
                        name = LOCALE.maketext("A certificate of unknown type already secures this domain.");
                    }

                    if (domain.certificate_status === "expired") {
                        name += " " + LOCALE.maketext("The certificate has expired.");
                    } else if (domain.certificate_status === "expiring_soon") {
                        name += " " + LOCALE.maketext("It will expire soon.");
                    }

                    domain.certificate_status_msg = name;

                    return $scope.get_domain_cert_msg(domain);
                };

                $scope.pending_certificate = function(domain) {
                    var result = $scope.pendingCertificateObject(domain);
                    return result ? result.order_item_id : false;
                };

                $scope.pendingCertificateObject = function(domain) {
                    var result = false;
                    angular.forEach($scope.pending_certificates, function(pcert) {

                        angular.forEach(pcert.vhost_names, function(vhostName) {
                            if (vhostName === domain.virtual_host) {
                                result = pcert;
                            }
                        });
                    });
                    return result;
                };

                $scope.view_pending_certificate = function(domain) {
                    var orderItemID = $scope.pending_certificate(domain);
                    $scope.go_to_pending(orderItemID);
                };

                $scope.go_to_pending = function(orderItemID) {
                    if (orderItemID) {
                        $location.path("/pending-certificates/").search("orderItemID", orderItemID);
                    } else {
                        $location.path("/pending-certificates");
                    }
                };

                $scope.get_domain_lock_classes = function(domain) {
                    var ihost = $scope.get_domain_certificate(domain.domain);
                    if (ihost && ihost.certificate) {
                        if (ihost.certificate.is_self_signed || domain.certificate_status === "expired") {
                            return "grey-padlock";
                        } else {
                            return "green-padlock";
                        }
                    }
                };

                $scope.build_csr_url = function(domain) {
                    var ihost = $scope.get_virtual_host_certificate(domain);
                    if (ihost && ihost.certificate) {
                        var url = "";
                        url += "../../ssl/install.html?id=";
                        url += encodeURIComponent(ihost.certificate.id);
                        return url;
                    }
                };

                $scope.get_domain_msg_state = function(domain) {

                    var certObj = $scope.pendingCertificateObject(domain);

                    if (certObj) {
                        var domainExistsOnCert = CertificatesService.doesDomainMatchOneOf(domain.domain, certObj.domains);
                        if (domainExistsOnCert) {
                            return "cert-pending";
                        } else {
                            return "cert-pending-other-domains";
                        }
                    } else if ($scope.domain_covered_by_wildcard(domain)) {
                        return "covered-by-wildcard";
                    } else {
                        if ($scope.get_domain_certificate(domain.domain) && domain.resolved === -1 && !domain.resolving) {
                            return "ssl-exists";
                        } else {
                            return "default";
                        }
                    }
                };

                $scope.get_virtual_host_by_display_name = function(vhostName) {
                    var vhostIndex = CertificatesService.get_virtual_host_by_display_name(vhostName);
                    return $scope.virtual_hosts[vhostIndex];
                };

                $scope.get_virtual_host_certificate = function(domain) {
                    return $scope.get_domain_certificate(domain.domain);
                };

                $scope.ensure_dns = function(domains) {
                    domains = $filter("filter")(domains, {
                        selected: true,
                        resolved: -1
                    });
                    if (!domains.length) {
                        return false;
                    }
                    var providerName = $scope.get_current_or_default_provider();
                    return CertificatesService.ensure_domains_can_pass_dcv(domains, providerName);
                };

                $scope.get_current_or_default_provider = function() {

                    var productObject = $scope.get_product();

                    /* if it's set, use that */
                    if (productObject) {
                        var product = $scope.get_product_by_id(productObject.provider, productObject.id);
                        if (product) {
                            return product.provider_name;
                        }
                    }

                    return CertificatesService.get_default_provider_name();

                };

                $scope.get_dcv_class = function(domain) {
                    var classes = [];
                    if (domain.resolving) {
                        classes.push("fa-spinner");
                        classes.push("fa-spin");
                        classes.unshift("fa");
                        classes.push("fa-sm");
                    }
                    return classes;
                };


                $scope.get_other_vhost_domains = function(matchDomain) {
                    return $filter("filter")($scope.domains, function(domain) {
                        if (domain.is_wildcard) {
                            return false;
                        }
                        if (domain.selected) {
                            return false;
                        }
                        if (domain.resolved === 0) {
                            return false;
                        }
                        if (domain.domain === matchDomain.domain) {
                            return false;
                        }
                        if (domain.virtual_host !== matchDomain.virtual_host) {
                            return false;
                        }
                        return true;
                    });
                };

                $scope.get_selected_vhosts = function() {
                    var coveredDomains = $scope.get_covered_domains();
                    var coveredSelectedDomains = _.filter( coveredDomains, { selected: true } );
                    return _.uniq(coveredSelectedDomains.map(function(domain) {
                        return domain.virtual_host;
                    }));
                };

                function _domainIsOnPartialVhost(domain) {
                    if (domain.selected) {
                        return false;
                    }
                    if (domain.is_wildcard) {
                        return false;
                    }
                    if (domain.resolved === 0) {
                        return false;
                    }
                    if ($scope.domain_covered_by_wildcard(domain)) {
                        return false;
                    }

                    /* isn't a selected vhost */
                    if ($scope.get_selected_vhosts().indexOf(domain.virtual_host) === -1) {
                        return false;
                    }
                    return true;
                }

                $scope.has_partial_vhosts = function() {
                    return $scope.domains.some(_domainIsOnPartialVhost);
                };

                $scope.get_partial_vhost_domains = function() {
                    return $scope.domains.filter(_domainIsOnPartialVhost);
                };

                $scope.get_undercovered_vhost_message = function(otherDomains) {
                    var flatDomains = otherDomains.map(function(domain) {
                        return domain.domain;
                    });
                    var msg = "";
                    msg += "<p>" + LOCALE.maketext("The certificate will secure some, but not all, of the domains on websites on which they exist.") + "</p>";
                    msg += "<p>" + LOCALE.maketext("If you choose to continue, the certificate will not secure the following [numerate,_1,domain,domains], and because a certificate will exist on their website, you may have to purchase a new certificate to secure all of these domains later. [list_and_quoted,_2]", flatDomains.length, flatDomains) + "</p>";
                    return msg;
                };

                $scope.add_partial_vhost_domains = function(domains) {
                    $scope.toggle_values(domains, "selected", true);
                    $scope.update_selected_domains();
                    $scope.check_selected_domains();

                    /* send them back to domains to watch for failures */
                    $scope.goto("domains");
                };

                $scope.get_other_domains_msg = function(domain, otherDomains) {
                    var flatDomains = otherDomains.map(function(domain) {
                        return domain.domain;
                    });
                    var msg = "";
                    msg += "<p>" + LOCALE.maketext("This certificate will not secure [quant,_2,other domain,other domains] on the same website as “[_1]”.", domain.domain, flatDomains.length) + "</p>";
                    msg += "<p>" + LOCALE.maketext("Because you cannot secure a single website with multiple certificates, in order to secure any unselected [numerate,_1,domain,domains] in the future, you would need to purchase a new certificate to secure all of these domains.", flatDomains.length) + "</p>";
                    msg += "<p>" + LOCALE.maketext("Would you like to secure the following additional [numerate,_2,domain,domains] with this certificate? [list_and_quoted,_1]", flatDomains, flatDomains.length) + "</p>";
                    return msg;
                };

                $scope.get_covered_domains = function() {
                    return $filter("filter")($scope.domains, function(domain) {
                        if (domain.selected || $scope.domain_covered_by_wildcard(domain)) {
                            return true;
                        }
                    });
                };

                $scope.get_other_wildcard_domains = function(matchDomain) {
                    if (!matchDomain.is_wildcard) {
                        return false;
                    }
                    return $filter("filter")($scope.domains, function(domain) {
                        if (domain.selected) {
                            return false;
                        }
                        if (domain.is_wildcard) {
                            return false;
                        }
                        if (domain.domain === matchDomain.domain) {
                            return false;
                        }
                        if (CertificatesService.compare_wildcard_domain(matchDomain, domain.domain) === false) {
                            return false;
                        }
                        return true;
                    });
                };

                function _isFailedDCVDomain(domain) {
                    return domain.resolved !== 1;
                }

                $scope.has_failed_dcv_domains = function() {
                    return $scope.selected_domains.some(_isFailedDCVDomain);
                };

                $scope.get_failed_dcv_domains = function() {
                    return $scope.selected_domains.filter(_isFailedDCVDomain);
                };

                $scope.get_failed_dcv_message = function(failedDCVDomains) {
                    var flatDomains = failedDCVDomains.map(function(domain) {
                        return domain.domain;
                    });
                    var msg = "";
                    msg += "<p>" + LOCALE.maketext("The following [numerate,_2,domain,domains] failed [numerate,_2,its,their] [output,abbr,DCV,Domain Control Validation] check: [list_and_quoted,_1]", flatDomains, flatDomains.length) + "</p>";
                    return msg;
                };

                $scope.clear_failed_domains = function(domains) {
                    $scope.toggle_values(domains, "selected", false);
                    $scope.update_selected_domains();
                    if ($scope.selected_domains.length === 0) {
                        $scope.goto("domains");
                    } else if ($scope.check_unresolved_issues() === false) {
                        $scope.goto("review");
                    }
                };

                $scope.domain_covered_by_wildcard = function(domain) {
                    if (domain.is_wildcard) {
                        return false;
                    }
                    var coverageDomain = CertificatesService.domain_covered_by_wildcard(domain.domain);
                    if (coverageDomain && coverageDomain.selected) {
                        return coverageDomain;
                    }
                    return false;
                };

                $scope.get_covered_by_wildcard_message = function(domain) {
                    var wildcard = $scope.domain_covered_by_wildcard(domain);
                    if (!wildcard) {
                        return "";
                    }
                    return LOCALE.maketext("The certificate for wildcard domain “[_1]” will secure this domain.", wildcard.domain);
                };

                $scope.is_domain_disabled = function(domain) {
                    if ($scope.pending_certificate(domain)) {
                        return true;
                    }
                    if ($scope.domain_covered_by_wildcard(domain)) {
                        return true;
                    }
                };

                $scope.get_currency_string = function(num, priceUnit) {
                    num += 0.001;
                    var str = LOCALE.numf(num);
                    str = "$" + str.substring(0, str.length - 1);
                    if (priceUnit) {
                        str += " " + priceUnit;
                    }
                    return str;
                };

                $scope.get_products = function() {
                    return CertificatesService.get_products();
                };

                $scope._getProductsForDcv = function _getProductsForDcv() {
                    return CertificatesService.filterProductsByDomainsDcv(
                        this.get_products(),
                        this.selected_domains
                    );
                };

                $scope.cant_checkout_msg = function() {
                    alertService.add({
                        type: "warn",
                        message: LOCALE.maketext("You cannot check out until you resolve all errors (in red)."),
                        closeable: true,
                        replace: false,
                        group: "tlsWizard"
                    });
                };

                $scope.cant_products_msg = function() {
                    alertService.add({
                        type: "warn",
                        message: LOCALE.maketext("You need to select at least one domain before you can select a product."),
                        closeable: true,
                        replace: false,
                        group: "tlsWizard"
                    });
                };

                $scope.clear_cloud_domain = function(domain) {
                    domain.selected = false;
                    $scope.update_selected_domains();

                    /* if no domains remain selected but we are on teh review panel, send them back to the domains panel */
                    if ($scope.selected_domains.length === 0 && $scope.panels.review) {
                        $scope.goto("domains");
                    }
                };

                $scope.goto = function(panel) {

                    /* can't go to review if things are unresolved */
                    if (panel === "review" && $scope.blocker_issues_exist()) {
                        $scope.cant_checkout_msg();
                        return;
                    }

                    /* can't go to products if things are no domains */
                    if (panel === "products" && !$scope.selected_domains.length) {
                        $scope.cant_products_msg();
                        panel = "domains";
                    }

                    angular.forEach($scope.panels, function(value, key) {
                        $scope.panels[key] = false;
                    });


                    $scope.panels[panel] = true;
                };

                $scope.get_product_name = function(product) {
                    if (!product) {
                        return "";
                    }
                    var productObject = $scope.get_product_by_id(product.provider, product.id);
                    if (!productObject) {
                        return "";
                    }
                    return productObject.display_name;
                };

                $scope.get_product_by_id = function(providerName, productID) {
                    return CertificatesService.get_product_by_id(providerName, productID);
                };

                $scope.check_product_match = function(productA) {
                    var productB = $scope.get_product();

                    if (!productA || !productB) {
                        return false;
                    }
                    if (productA.id === productB.id && productA.provider === productB.provider) {
                        return true;
                    }
                };

                $scope.get_per_price_string = function(product) {
                    var prices = [];
                    if (product.price) {
                        prices[prices.length] = LOCALE.maketext("[_1] per domain", $scope.get_currency_string(product.price, product.price_unit));
                    }
                    if (product.wildcard_price) {
                        prices[prices.length] = LOCALE.maketext("[_1] per wildcard domain", $scope.get_currency_string(product.wildcard_price));
                    }
                    return prices.join(", ");
                };

                $scope.get_product_estimate_string = function(product) {
                    var priceString = $scope.get_currency_string($scope.calculate_product_price(product));
                    return "(" + LOCALE.maketext("[_1] total", priceString, product.price_unit) + ")";
                };

                var _calculateProductPrice = function(product, nonwildcards, wildcards) {

                    // No product, possible during transition to other page.
                    if (!product) {
                        return;
                    }

                    var totalPrice = 0;

                    if (wildcards.length && product.wildcard_price) {
                        totalPrice += wildcards.length * product.wildcard_price;
                    }
                    if (nonwildcards.length && product.price) {
                        totalPrice += nonwildcards.length * product.price;
                    }

                    // product includes main domain free
                    if (product.wildcard_parent_domain_included) {

                        // adjust for main domains that are covered by wildcard domains
                        // subtract the price of the main domain for each wildcard domain

                        var nonWildcardKeys = {};
                        nonwildcards.forEach(function(domain) {
                            nonWildcardKeys[domain.domain] = domain;
                        });

                        wildcards.forEach(function(domain) {

                            // for each wildcard domain that is selected
                            // and has its non-wildcard equivelent selected
                            // reduce the price

                            // “stripped_domain” doesn’t strip
                            // the wildcard from a domain that’s actually
                            // installed in Apache. Because there might be
                            // things that depend on that, we’ll leave that
                            // “faux”-strip logic in place and, for here,
                            // manually ensure that we’re matching against
                            // the wildcard’s parent domain.
                            var trulyStripped = domain.domain.replace(/^\*\./, "");

                            if (nonWildcardKeys[trulyStripped]) {
                                totalPrice -= product.price;
                            }
                        });
                    }

                    return totalPrice;
                };

                $scope.calculate_product_price = function(product) {
                    var selectedDomains = $scope.selected_domains;

                    var wildcardDomains = $filter("filter")(selectedDomains, {
                        is_wildcard: true
                    });

                    var nonWildcardDomains = $filter("filter")(selectedDomains, {
                        is_wildcard: false
                    });

                    return _calculateProductPrice(product, nonWildcardDomains, wildcardDomains);
                };


                $scope.set_product = function(product) {
                    $scope.current_certificate.set_product(product);
                };

                $scope.get_product = function() {
                    return $scope.current_certificate.get_product();
                };

                $scope.get_product_prices = function() {
                    var prices = [];
                    var selectedDomains = $scope.selected_domains;
                    var wildcardDomains = selectedDomains.filter(function(domain) {
                        if (domain.is_wildcard) {
                            return true;
                        }
                        return false;
                    });
                    var nonWildcardDomains = selectedDomains.filter(function(domain) {
                        if (!domain.is_wildcard) {
                            return true;
                        }
                        return false;
                    });

                    $scope.filteredProductList.forEach(function(product) {
                        var price = _calculateProductPrice(product, nonWildcardDomains, wildcardDomains);
                        prices.push(price);
                    });
                    return _.sortBy(prices);
                };

                $scope.get_min_price = function() {
                    return $scope.get_product_prices().shift();
                };

                $scope.get_max_price = function() {
                    return $scope.get_product_prices().pop();
                };

                $scope.check_unresolved_issues = function() {
                    if ($scope.has_partial_vhosts()) {
                        return true;
                    }
                    if ($scope.has_failed_dcv_domains()) {
                        return true;
                    }
                    return false;
                };

                $scope.update_baseless_wildcard_domains = function() {
                    $scope.missing_base_domains = [];

                    $scope.selected_domains.forEach(function(domain) {
                        if (domain.is_wildcard === false) {
                            return;
                        }

                        var mainDomain = CertificatesService.get_domain_by_domain(domain.stripped_domain);
                        if (!mainDomain.selected) {
                            $scope.missing_base_domains.push(mainDomain);
                        }

                    });

                    if ($scope.missing_base_domains.length) {
                        var flatDomains = $scope.missing_base_domains.map(function(domain) {
                            return domain.domain;
                        });
                        alertService.add({
                            type: "info",
                            message: LOCALE.maketext("Because wildcard certificates require their parent domains, the system added the following [numerate,_1,domain,domains] for you: [list_and_quoted,_2]", flatDomains.length, flatDomains),
                            closeable: true,
                            replace: false,
                            group: "tlsWizard"
                        });
                        $scope.select_baseless_wildcard_domains($scope.missing_base_domains);
                    }
                };

                $scope.select_baseless_wildcard_domains = function(missingDomains) {
                    $scope.toggle_values(missingDomains, "selected", true);
                    $scope.update_selected_domains();
                };

                $scope.get_resolve_panel_color = function() {
                    var color = "warning";

                    /* keep these in order of danger level! */
                    if ($scope.has_partial_vhosts()) {

                        // stay warning
                        color = "warning";
                    }
                    if ($scope.has_failed_dcv_domains()) {
                        color = "danger";
                    }
                    return color;
                };

                $scope.blocker_issues_exist = function() {
                    return $scope.get_resolve_panel_color() === "danger";
                };

                $scope.get_cart_price = function() {
                    var price = 0;
                    if (!$scope.get_product()) {
                        return price;
                    }

                    var product = $scope.get_product_by_id($scope.get_product().provider, $scope.get_product().id);

                    var totalPrice = $scope.calculate_product_price(product);
                    $scope.current_certificate.set_price(totalPrice);

                    return totalPrice;
                };

                $scope.get_cart_strings = function() {
                    return $scope.cart_price_strings;
                };

                $scope.update_cart_strings = function() {
                    var product = $scope.get_product();
                    var productPrices = $scope.get_product_prices();
                    var selectedDomains = $scope.selected_domains;

                    var cartPrice = {
                        min: 0,
                        max: 0
                    };
                    if (product && selectedDomains.length) {
                        cartPrice.min = $scope.get_currency_string($scope.get_cart_price(), "USD");
                    } else if (selectedDomains.length) {

                        cartPrice.min = $scope.get_currency_string($scope.get_min_price(), "USD");

                        if (productPrices.length > 1) {
                            cartPrice.max = $scope.get_currency_string($scope.get_max_price(), "USD");
                        }

                    } else {

                        // If no other value, ensure that it is not empty so it does not jump when a domain is selected
                        $scope.cart_price_strings = false;
                    }
                    $scope.cart_price_strings = cartPrice;
                };

                $scope.get_cart_items = function() {
                    $scope.cart_items = [$scope.current_certificate];
                    return $scope.cart_items;
                };

                $scope.purchase = function() {

                    /* can't go to review if things are unresolved */
                    if ($scope.blocker_issues_exist()) {
                        $scope.cant_checkout_msg();
                        return;
                    }

                    $scope.current_certificate.set_identity_verification($scope.identity_verification);

                    CertificatesService.add_new_certificate($scope.current_certificate);
                    var success = CertificatesService.save({
                        simple_identity_verification: $scope.identity_verification
                    });
                    if (!success) {
                        alertService.add({
                            type: "danger",
                            message: LOCALE.maketext("Failed to save information to browser cache."),
                            group: "tlsWizard"
                        });
                    } else {
                        $location.path("/purchase");
                    }

                };

                $scope.selectFilterType = function(type) {
                    if (type === "all") {
                        $scope.meta.quickFilterValue = "";
                    } else {
                        $scope.meta.quickFilterValue = type;
                    }
                    $scope.fetch();
                };

                $scope.go_to_advanced = function() {
                    CertificatesService.hard_reset();
                    LocationService.go_to_advanced_create_route().search("");
                };

                $scope.get_wildcard_base_domain_msg = function() {
                    return LOCALE.maketext("This certificate includes the parent domain in the price of the certificate.");
                };


                // update table
                $scope.fetch = function() {
                    var filteredList = [];

                    // filter list based on search text

                    filteredList = $scope.filter_domains($scope.domains);

                    angular.forEach(filteredList, function(domain) {
                        $scope.get_domain_certificate_type(domain);
                    });

                    if ($scope.meta.filterValue !== "") {

                        /* sort by percentage match if a filterValue exists */
                        filteredList = filteredList.sort(function(a, b) {
                            if (a.domain.length === b.domain.length) {
                                return 0;
                            }
                            var aPer = $scope.meta.filterValue.length / a.domain.length;
                            var bPer = $scope.meta.filterValue.length / b.domain.length;

                            return aPer < bPer ? -1 : 1;
                        });
                    } else {
                        filteredList = filteredList.sort(function(a, b) {

                            // Sort <*.foo.com> immediately after <foo.com>.

                            if (a.domain === "*." + b.domain) {
                                return -1;
                            }

                            if ("*." + a.domain === b.domain) {
                                return 1;
                            }

                            return b.stripped_domain.localeCompare(a.stripped_domain);
                        });
                    }

                    // sort the filtered list
                    if ($scope.meta.sortDirection !== "" && $scope.meta.sortBy !== "") {
                        filteredList = $filter("orderBy")(filteredList, $scope.meta.sortBy, $scope.meta.sortDirection === "asc" ? true : false);
                    }

                    // update the total items after search
                    $scope.meta.totalItems = filteredList.length;

                    // filter list based on page size and pagination
                    if ($scope.meta.totalItems > _.min($scope.meta.pageSizes)) {
                        var start = ($scope.meta.currentPage - 1) * $scope.meta.pageSize;
                        var limit = $scope.meta.pageSize;

                        filteredList = $filter("limitTo")($filter("startFrom")(filteredList, start), limit);
                        $scope.showPager = true;

                        // table statistics
                        $scope.meta.start = start + 1;
                        $scope.meta.limit = start + filteredList.length;

                    } else {

                        // hide pager and pagination
                        $scope.showPager = false;

                        if (filteredList.length === 0) {
                            $scope.meta.start = 0;
                        } else {

                            // table statistics
                            $scope.meta.start = 1;
                        }

                        $scope.meta.limit = filteredList.length;
                    }

                    var countNonSelected = 0;

                    // Add rowSelected attribute to each item in the list to track selections.
                    filteredList.forEach(function(item) {

                        // Select the rows if they were previously selected on this page.
                        if ($scope.selected_domains.indexOf(item.id) !== -1) {
                            item.rowSelected = true;
                        } else {
                            item.rowSelected = false;
                            countNonSelected++;
                        }
                    });

                    $scope.filteredList = filteredList;

                    // Clear the 'Select All' checkbox if at least one row is not selected.
                    $scope.allRowsSelected = (filteredList.length > 0) && (countNonSelected === 0);

                    return filteredList;
                };

                $scope.fetch_products = function() {
                    var products = this._getProductsForDcv();

                    $scope.filteredProductList = $scope.filter_products(products);

                    return $scope.filteredProductList;
                };

                $scope.init = function() {

                    // if routeParam domains set it
                    if ($routeParams["domain"]) {
                        var preselectDomains = $routeParams["domain"];
                        if (_.isString(preselectDomains)) {
                            preselectDomains = [preselectDomains];
                        }
                        angular.forEach(preselectDomains, function(domain) {
                            var domainObject = CertificatesService.get_domain_by_domain(domain);
                            if (domainObject) {
                                domainObject.selected = true;
                            }
                        });
                    }

                    var productSearchOptions = CertificatesService.get_product_search_options();

                    var defaultSearchValues = {
                        "certTerms": {
                            "1_year": true,
                            "2_year": false,
                            "3_year": false
                        }
                    };

                    if ($routeParams["certificate_type"]) {
                        var preselectCertificateTypes = $routeParams["certificate_type"];
                        if (_.isString(preselectCertificateTypes)) {
                            preselectCertificateTypes = [preselectCertificateTypes];
                        }

                        var validationType = {};

                        // Assume that if these aren't set in any products (since they are optional, after all) that it is 'all' -- CPANEL-12128.
                        if (typeof productSearchOptions.validationType === "undefined") {
                            validationType["all"] = true;
                        } else {
                            angular.forEach(productSearchOptions.validationType.options, function(option) {
                                validationType[option.value] = preselectCertificateTypes.indexOf(option.value) !== -1;
                            });
                        }
                        defaultSearchValues["validationType"] = validationType;

                    }

                    $scope.searchFilterOptions = new SearchSettingsModel(CertificatesService.get_domain_search_options());
                    $scope.productSearchFilterOptions = new SearchSettingsModel(CertificatesService.get_product_search_options(), defaultSearchValues);

                    $scope.fetch();
                    $scope.fetch_products();
                    $scope.current_certificate = new Certificate();
                    $scope.update_selected_domains();

                    if ($scope.selected_domains.length) {
                        $scope.check_selected_domains();
                        $scope.goto("products");
                    } else {
                        $scope.goto("domains");
                    }

                };

                // first page load
                $scope.init();

            }
        ]);


    });

/*
* base/frontend/paper_lantern/security/tls_wizard/views/CheckoutController.js
*                                                 Copyright(c) 2016 cPanel, Inc.
*                                                           All rights reserved.
* copyright@cpanel.net                                         http://cpanel.net
* This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */
/* jshint -W100 */

// Then load the application dependencies


define(
    'app/views/CheckoutController',[
        "lodash",
        "angular",
        "jquery",
        "cjt/util/locale",
        "cjt/util/query",
        "app/views/Certificate",
        "cjt/modules",
        "app/services/CertificatesService",
        "app/services/LocationService",
        "cjt/directives/spinnerDirective",
        "uiBootstrap",
    ],
    function(_, angular, $, LOCALE, QUERY) {
        "use strict";

        var app = angular.module("App");

        function CheckoutController(
            $scope,
            $controller,
            $location,
            $filter,
            $routeParams,
            $window,
            $timeout,
            CertificatesService,
            spinnerAPI,
            $q,
            $modal,
            $log,
            Certificate,
            LocationService,
            alertService) {

            var steps = {
                "cPStore": ["login", "send_cart_items", "checkout", "payment_callback", "checkout_complete"],
                "default": ["login", "send_cart_items", "checkout", "payment_callback", "checkout_complete"]
            };
            $scope.pending_certificates = CertificatesService.get_pending_certificates();
            $scope.LOCALE = LOCALE;
            $scope.purchase_steps = [];
            $scope.current_step = -1;
            $scope.start_step = null;
            $scope.providers = [];
            $scope.certificates_count = 0;
            $scope.steps = [];

            $scope.html_escape = _.escape.bind(_);

            $scope.get_step_classes = function(provider, step) {
                var steps = $scope.get_steps(provider.name).length;
                var stepIndex = $scope.get_step_index(provider.name, step);
                var cols = Math.floor(12 / steps);
                var classes = ["col-xs-12", "col-sm-12", "col-md-" + cols, "col-lg-" + cols, "checkout-step"];
                if ($scope.current_step_index === stepIndex) {
                    classes.push("checkout-step-current");
                    if ("checkout_complete" === step) {
                        classes.push("checkout-step-completed");
                    }
                } else if ($scope.current_step_index > stepIndex) {
                    classes.push("checkout-step-completed");
                }

                return classes;
            };

            $scope.cert_count_title = function() {
                return LOCALE.maketext("Purchasing [quant,_1,certificate,certificates] …", $scope.certificates_count);
            };

            $scope.get_purchases_title = function(provider) {
                return LOCALE.maketext("Completing [numerate,_2,purchase,purchases] for the “[_1]” provider …", $scope.html_escape(provider.display_name), provider.certificates.length);
            };

            $scope.sending_items_msg = function() {
                return LOCALE.maketext("Sending your [numerate,_1,item,items] to the store cart …", $scope.certificates_count);
            };

            $scope.starting_polling_msg = function() {
                return LOCALE.maketext("Starting background polling for the [numerate,_1,certificate,certificates]. The system will download and install the [numerate,_1,certificate,certificates] when available.", $scope.certificates_count);
            };

            $scope.get_provider_by_name = function(name) {
                for (var i = 0; i < $scope.providers.length; i++) {
                    if ($scope.providers[i].name === name) {
                        return $scope.providers[i];
                    }
                }
            };

            $scope.get_steps = function(providerName) {
                if (steps[providerName]) {
                    return steps[providerName];
                }
                return steps["default"];
            };

            $scope.get_current_step = function() {
                return $scope.steps[$scope.current_step_index];
            };

            $scope.get_step_index = function(providerName, step) {
                for (var i = 0; i < $scope.steps.length; i++) {
                    if ($scope.steps[i].provider === providerName && $scope.steps[i].step === step) {
                        return i;
                    }
                }
                return 0;
            };

            $scope.get_step_url = function(step) {
                return "/" + encodeURIComponent(step.provider) + "/" + encodeURIComponent(step.step);
            };

            $scope.get_next_step = function() {
                if ($scope.current_step_index + 1 < $scope.steps.length) {
                    return $scope.steps[$scope.current_step_index + 1];
                }
            };

            $scope.get_param = function(key) {
                return QUERY.parse_query_string(location.search.replace(/^\?/, ""))[key] || $routeParams[key];
            };

            $scope.require_params = function(keys) {
                var badKeys = [];
                var tooManyKeys = [];
                angular.forEach(keys, function(key) {
                    var value = $scope.get_param(key);
                    if (!value) {
                        badKeys.push(key);
                    } else if (value instanceof Array) {
                        tooManyKeys.push(key);
                    }
                });

                if (badKeys.length) {
                    alertService.add({
                        type: "danger",
                        message: LOCALE.maketext("The following [numerate,_1,parameter is,parameters are] required but [numerate,_1,does,do] not appear in the [asis,URL]: [list_and_quoted,_2]", badKeys.length, badKeys),
                        group: "tlsWizard"
                    });
                }

                if (tooManyKeys.length) {
                    alertService.add({
                        type: "danger",
                        message: LOCALE.maketext("The following [numerate,_1,parameter appears,parameters appear] more than once in the [asis,URL]: [list_and_quoted,_2]", tooManyKeys.length, tooManyKeys),
                        group: "tlsWizard"
                    });
                }

                return badKeys.length || tooManyKeys.length ? false : true;
            };

            $scope.in_debug_mode = false;

            $scope.get_route_url = function() {
                var routeURL = "";
                routeURL += $location.absUrl().replace(/tls_wizard\/.+/, "tls_wizard/#/purchase");
                return routeURL;
            };

            function _pemToBase64(pem) {
                return pem
                    .replace(/^\s*-\S+/, "")
                    .replace(/-\S+\s*$/, "")
                    .replace(/\s+/g, "");
            }

            // $q.all() will reject the “aggregate” promise with the
            // exact same value as the one that failed. That’s not good
            // enough; we also need to know which promise failed in addition
            // to why it failed.
            //
            // This transforms all failure callback payloads into 2-member
            // arrays:   [ <promise_index>, <payload> ]
            //
            // So, if you do:
            //  _qAllWithErrIndex( [ prA, prB, prC ] )
            //
            // ...and “prB” fails with the string "hahaha", the
            // failure callback will receive [ 1, "hahaha" ].
            //
            function _qAllWithErrIndex(promisesArray) {
                if (!(promisesArray instanceof Array)) {
                    throw "Only arrays here!";
                }

                return $q.all(promisesArray.map(function(p, i) {
                    return $q(function(resolve, reject) {
                        p.then(
                            resolve,
                            function(payload) {
                                reject([i, payload]);
                            }
                        );
                    });
                }));
            }

            $scope.dismiss_modal = function() {
                this.modal.dismiss();
            };

            $scope.go_to_purchase_page = LocationService.go_to_last_create_route;

            $scope.go_to_login = function() {
                this.go_step(this.get_current_step().provider, "login");
            };

            $scope.do_current_step = function() {
                var step = $scope.get_current_step();

                if (!step) {

                    // something is severely wrong
                    // maybe they hit the back button a lot for some random reason.
                    // let's send them back somewhere safe.
                    LocationService.go_to_last_create_route();
                    return;
                }

                var nextStep = $scope.get_next_step();
                var orderID = $scope.get_param("order_id");
                var loginCode = $scope.get_param("code");
                var order = CertificatesService.get_order_by_id(orderID);
                var orderStatus = $scope.get_param("order_status");
                var provider = $scope.get_provider_by_name(step.provider);
                var accessToken = $scope.get_param("access_token");
                var returnURL;

                if (step.step === "login") {
                    returnURL = $scope.get_route_url() + $scope.get_step_url(step);
                    if (order) {
                        returnURL += "?order_id=" + order.order_id;
                    }
                    if (loginCode) {

                        /* Back from Login, Verify It */
                        CertificatesService.verify_login_token(step.provider, loginCode, returnURL).then(function(result) {
                            if (order) {

                                /* there's an order, so don't create another one */
                                $scope.go_step(step.provider, "checkout", {
                                    order_id: order.order_id,
                                    access_token: result.data.access_token
                                });
                            } else {

                                /* no order, so create one */
                                $scope.go_step(step.provider, "send_cart_items", {
                                    access_token: result.data.access_token
                                });
                            }
                        }, function(errorHTML) {
                            $scope.return_to_wizard();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system encountered an error as it attempted to verify the login token: [_1]", errorHTML) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                closeable: true,
                                replace: false,
                                group: "tlsWizard"
                            });
                        });
                    } else {

                        /* There's no login code */
                        CertificatesService.get_store_login_url(step.provider, returnURL).then(function(result) {
                            $window.location.href = result.data;
                        }, function(errorHTML) {
                            $scope.return_to_wizard();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system encountered an error as it attempted to get the store login [output,abbr,URL,Uniform Resource Location]: [_1]", errorHTML) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                closeable: true,
                                replace: false,
                                group: "tlsWizard"
                            });
                        });
                    }
                } else if (step.step === "send_cart_items") {

                    /* create order / build cart */
                    if (!$scope.require_params(["access_token"])) {
                        return;
                    }
                    returnURL = $scope.get_route_url() + $scope.get_step_url(nextStep);
                    return CertificatesService.request_certificates(step.provider, accessToken, provider.certificates).then(function(result) {
                        var order = result.data;
                        order.order_id = order.order_id.toString();

                        CertificatesService.add_order(order);
                        CertificatesService.save();

                        $scope.go_step(step.provider, "checkout", {
                            order_id: order.order_id,
                            access_token: accessToken
                        });
                    }, function(errorHTML) {
                        $scope.return_to_wizard();
                        alertService.add({
                            type: "danger",
                            message: LOCALE.maketext("The system encountered an error as it attempted to request the [asis,SSL] [numerate,_2,certificate,certificates]: [_1]", errorHTML, $scope.get_provider_by_name(step.provider).certificates.length) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                            closeable: true,
                            replace: false,
                            group: "tlsWizard"
                        });
                    });
                } else if (step.step === "checkout") {
                    if (!$scope.require_params(["order_id"])) {
                        return;
                    }
                    returnURL = $scope.get_route_url() + $scope.get_step_url(step);
                    if (orderStatus) {

                        /* are we back from checking out? */
                        $scope.go_step(step.provider, "payment_callback", {
                            order_id: order.order_id,
                            order_status: orderStatus
                        });
                    } else {
                        if (!$scope.require_params(["access_token"])) {
                            return;
                        }

                        /* no? let's update the checkout url and head to checkout */
                        CertificatesService.set_url_after_checkout(step.provider, accessToken, order.order_id, returnURL).then(function() {
                            $window.location.href = order.checkout_url;
                        }, function(response) { // NB: the argument is *not* the error!
                            var isOtherUser = response.data && response.data.error_type === "OrderNotFound";

                            if (isOtherUser) {
                                $scope.order_id = order.order_id;
                                $scope.provider = $scope.get_provider_by_name(step.provider);

                                $scope.modal = $modal.open({
                                    template: document.getElementById("user-mismatch-modal").text,
                                    scope: $scope,
                                    backdrop: "static",
                                    animation: false,
                                    size: "sm"
                                });
                            } else {
                                LocationService.go_to_last_create_route();
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system encountered an error as it attempted to set the [asis,URL] after checkout: [_1]", _.escape(response.error)) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                    closeable: true,
                                    replace: false,
                                    group: "tlsWizard"
                                });
                            }

                        });
                    }
                } else if (step.step === "payment_callback") {

                    /* post checkout processing */
                    CPANEL.PAGE.pending_certificates = null;
                    CPANEL.PAGE.installed_hosts = null;
                    if (orderStatus === "success") {
                        alertService.add({
                            type: "success",
                            message: LOCALE.maketext("You have successfully completed your certificate order (order ID “[_1]”). If you need help with this order, use the support [numerate,_2,link,links] below.", _.escape(orderID), order.certificates.length),
                            closeable: true,
                            replace: false,
                            autoClose: 10000,
                            group: "tlsWizard"
                        });
                        CertificatesService.set_confirmed_status_for_ssl_certificates(step.provider, order).then(function() {

                            // successful
                            $scope.go_step(step.provider, nextStep.step);
                        }, function(response) {

                            // This is here to accommodate cases where the certificate
                            // becomes available, and gets installed, prior to the
                            // browser’s being able to set the certificate to “confirmed”.
                            // When that happens, we get back a data structure that
                            // describes which vhosts’ pending queue entries didn’t exist;
                            // we then do what can be done to ensure that the cert(s)
                            // is/are installed where it/they should be.
                            //
                            if (response.data && response.data.error_type === "EntryDoesNotExist") {
                                var notFound = response.data.order_item_ids;

                                var msg = LOCALE.maketext("There are no pending certificates from “[_1]” with the following order item [numerate,_2,ID,IDs]: [join,~, ,_3]. The system will now verify that the [numerate,_2,certificate has,certificates have] been issued and installed.", _.escape(step.provider), notFound.length, notFound.map(_.escape.bind(_)));

                                alertService.add({
                                    type: "info",
                                    message: msg,
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "tlsWizard"
                                });

                                var certificates = provider.certificates;

                                notFound.forEach(function(oiid) {

                                    // Fetch the new SSL cert.
                                    var providerPromise = CertificatesService.get_ssl_certificate_if_available(step.provider, oiid);

                                    // There will only be one vhost
                                    // per certificate for now, but with
                                    // wildcard support that could change.
                                    certificates.forEach(function(cert) {

                                        cert.get_virtual_hosts().forEach(function(vhostName) {
                                            var domain = cert.get_domains().filter(function(domain) {
                                                return domain.virtual_host === vhostName;
                                            }).pop().domain;

                                            var bigP = _qAllWithErrIndex([
                                                CertificatesService.get_installed_ssl_for_domain(),
                                                providerPromise
                                            ]);

                                            bigP.then(function yay(responses) {
                                                var installedPEM = responses[0].data.certificate.text;
                                                var installedB64;

                                                if (installedPEM) {
                                                    installedB64 = _pemToBase64(installedPEM);
                                                }

                                                var providerPEM = responses[1].data.certificate_pem;
                                                var providerB64;
                                                if (providerPEM) {
                                                    providerB64 = _pemToBase64(providerPEM);
                                                } else {
                                                    var statusCode = responses[1].data.status_code;

                                                    // There is ambiguity over the spelling of “canceled”.
                                                    if (/OrderCancell?ed/.test(statusCode)) {
                                                        alertService.add({
                                                            type: "danger",
                                                            message: LOCALE.maketext("“[_1]” indicated that the order with [asis,ID] “[_2]” has been canceled.", _.escape(step.provider), _.escape(orderID)),
                                                            closeable: true,
                                                            replace: false,
                                                            group: "tlsWizard"
                                                        });
                                                    } else if (/OrderItemCancell?ed/.test(statusCode)) {
                                                        alertService.add({
                                                            type: "danger",
                                                            message: LOCALE.maketext("“[_1]” indicated that the certificate with order item [asis,ID] “[_2]” has been canceled.", _.escape(step.provider), _.escape(oiid)),
                                                            closeable: true,
                                                            replace: false,
                                                            group: "tlsWizard"
                                                        });
                                                    } else {
                                                        alertService.add({
                                                            type: "danger",
                                                            message: LOCALE.maketext("“[_1]” has not issued a certificate for order item [asis,ID] “[_2]”. Contact them for further assistance.", _.escape(step.provider), _.escape(oiid)),
                                                            closeable: true,
                                                            replace: false,
                                                            group: "tlsWizard"
                                                        });
                                                    }

                                                    // Since there’s no new certificate,
                                                    // there’s nothing more we can do.
                                                    LocationService.go_to_last_create_route();
                                                    return;
                                                }

                                                if (providerB64 === installedB64) {

                                                    // This is the most optimal outcome:
                                                    // we confirmed that the new cert is
                                                    // installed, as the user wanted.

                                                    alertService.add({
                                                        type: "success",
                                                        message: LOCALE.maketext("The system confirmed that the certificate for the website “[_1]” is installed.", _.escape(vhostName)),
                                                        closeable: true,
                                                        replace: false,
                                                        autoClose: 10000,
                                                        group: "tlsWizard"
                                                    });
                                                    if (installedB64) {
                                                        alertService.add({
                                                            type: "info",
                                                            message: LOCALE.maketext("“[_1]” has an [asis,SSL] certificate installed, but it is not the certificate that you just ordered (order item [asis,ID] “[_2]”). The system will now install this certificate.", _.escape(vhostName), _.escape(oiid)),
                                                            closeable: true,
                                                            replace: false,
                                                            autoClose: 10000,
                                                            group: "tlsWizard"
                                                        });
                                                    } else {
                                                        var noCertMessage;
                                                        noCertMessage = LOCALE.maketext("You do not have an [asis,SSL] certificate installed for the website “[_1]”.", _.escape(vhostName));

                                                        noCertMessage += LOCALE.maketext("The system will now install the new certificate.");

                                                        alertService.add({
                                                            type: "info",
                                                            message: noCertMessage,
                                                            closeable: true,
                                                            replace: false,
                                                            autoClose: 10000,
                                                            group: "tlsWizard"
                                                        });
                                                        CertificatesService.install_certificate(providerPEM, [domain]).then(
                                                            function yay() {
                                                                alertService.add({
                                                                    type: "success",
                                                                    message: LOCALE.maketext("The system installed the certificate onto the website “[_1]”.", _.escape(vhostName)),
                                                                    closeable: true,
                                                                    replace: false,
                                                                    autoClose: 10000,
                                                                    group: "tlsWizard"
                                                                });
                                                            },
                                                            function nay(errorHTML) {
                                                                alertService.add({
                                                                    type: "danger",
                                                                    message: LOCALE.maketext("The system failed to install the certificate onto the website “[_1]” because of the following error: [_2]", _.escape(vhostName), errorHTML),
                                                                    closeable: true,
                                                                    replace: false,
                                                                    group: "tlsWizard"
                                                                });
                                                            }
                                                        ).then(LocationService.go_to_last_create_route);
                                                    }
                                                }

                                            },
                                            function onerror(idxAndResponse) {

                                                // We’re here because we failed either
                                                // to fetch the new cert or to query
                                                // the current SSL state.

                                                var promiseI = idxAndResponse[0];
                                                var errorHTML = idxAndResponse[1];

                                                if (promiseI === 0) {
                                                    alertService.add({
                                                        type: "danger",
                                                        message: LOCALE.maketext("The system failed to locate the installed [asis,SSL] certificate for the website “[_1]” because of the following error: [_2]", _.escape(vhostName), errorHTML),
                                                        closeable: true,
                                                        replace: false,
                                                        group: "tlsWizard"
                                                    });
                                                } else if (promiseI === 1) {
                                                    alertService.add({
                                                        type: "danger",
                                                        message: LOCALE.maketext("The system failed to query “[_1]” for order item [asis,ID] “[_2]” ([_3]) because of the following error: [_4]", _.escape(step.provider), _.escape(oiid), _.escape(vhostName), errorHTML),
                                                        closeable: true,
                                                        replace: false,
                                                        group: "tlsWizard"
                                                    });
                                                } else {

                                                    // should never happen
                                                    alertService.add({
                                                        type: "danger",
                                                        message: "Unknown index: " + promiseI,
                                                        closeable: true,
                                                        replace: false,
                                                        group: "tlsWizard"
                                                    });
                                                }

                                                LocationService.go_to_last_create_route();
                                            }
                                            );
                                        });
                                    });
                                });
                            } else {
                                var errorHTML = response.error;
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to begin polling for [quant,_2,new certificate,new certificates] because of an error: [_1]", errorHTML, $scope.certificates_count) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                    closeable: true,
                                    replace: false,
                                    group: "tlsWizard"
                                });
                            }
                        });

                        // get info from local storage
                    } else {
                        if (orderStatus === "error") {
                            CertificatesService.reset();
                            CertificatesService.save();
                            $scope.return_to_wizard();
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system encountered an error as it attempted to complete your transaction.") + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                closeable: true,
                                replace: false,
                                group: "tlsWizard"
                            });
                        } else if (/^cancel?led$/.test(orderStatus)) { // cPStore gives two l’s
                            var orderItemIDs = [];
                            angular.forEach(order.certificates, function(cert) {
                                orderItemIDs.push(cert.order_item_id);
                            });
                            alertService.add({
                                type: "warn",
                                message: LOCALE.maketext("You seem to have canceled your transaction.") + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                closeable: true,
                                replace: false,
                                group: "tlsWizard"
                            });
                            $location.url($location.path()); // clear out the params so we do not get a cancel on subsequent orders
                            CertificatesService.cancel_pending_ssl_certificates(step.provider, orderItemIDs).then(function() {

                                /* need to clear old unused in page data to get a fresh load */
                                CertificatesService.reset();
                                CertificatesService.save();
                                $scope.return_to_wizard();
                            }, function(errorHTML) {
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system encountered an error as it attempted to cancel your transaction: [_1]", errorHTML) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                    closeable: true,
                                    replace: false,
                                    group: "tlsWizard"
                                });
                            });
                        }
                        return false;
                    }
                } else if (step.step === "checkout_complete") {

                    // go next step or to done page
                    if (!nextStep) {
                        CertificatesService.reset();
                        CertificatesService.save();

                        // done
                        alertService.add({
                            type: "success",
                            message: LOCALE.maketext("The system has completed the [numerate,_1,purchase,purchases] and will begin to poll for your [numerate,_2,certificate,certificates].", $scope.providers.length, $scope.certificates_count),
                            closeable: true,
                            replace: false,
                            autoClose: 10000,
                            group: "tlsWizard"
                        });
                        $timeout($scope.go_to_pending, 1000);
                    }
                }
            };

            $scope.return_to_wizard = function() {
                var curURL = $location.absUrl();

                // force reset for specific cases, use path redirect otherwise;
                // this allows us to not clear growl notifications if we don't have to.
                // could be replaced with replaceState if we ever get to IE11
                if ($scope.get_param("code")) {
                    var newURL = curURL.replace(/([^#?]+\/).*/, "$1#" + LocationService.last_create_route());
                    $window.location.href = newURL;
                } else {
                    LocationService.go_to_last_create_route();
                }
            };

            $scope.check_step_success = function(stepIndex) {
                if (stepIndex < $scope.current_step_index) {
                    return true;
                }
            };

            $scope.go_step = function(provider, step, params) {
                $location.path("/purchase/" + provider + "/" + step + "/");

                if (params) {
                    $location.search(params);
                }
            };

            $scope.get_providers = function() {
                $scope.providers = [];

                var steps;
                $scope.purchasing_certs.forEach(function(cert) {
                    var product = cert.get_product();
                    var provider = $scope.get_provider_by_name(product.provider);
                    if (!provider) {
                        provider = {
                            name: product.provider,
                            display_name: product.provider_display_name || product.provider,
                            certificates: []
                        };
                        $scope.providers.push(provider);
                        steps = $scope.get_steps(provider.name);
                        angular.forEach(steps, function(step) {
                            $scope.steps.push({
                                provider: provider.name,
                                step: step
                            });
                        });
                    }
                    provider.certificates.push(cert);
                    $scope.certificates_count++;
                });

                return $scope.providers;
            };

            $scope.go_to_pending = function(orderItemID) {
                if (orderItemID) {
                    $location.path("/pending-certificates/").search("orderItemID", orderItemID);
                } else {
                    $location.path("/pending-certificates");
                }
            };

            $scope.pending_certificate = function(virtualHost) {
                var result = false;
                angular.forEach($scope.pending_certificates, function(pcert) {
                    angular.forEach(pcert.vhost_names, function(vhostName) {
                        if (vhostName === virtualHost.display_name) {
                            result = pcert.order_item_id;
                        }
                    });
                });
                return result;
            };

            $scope.view_pending_certificate = function(virtualHost) {
                var orderItemID = $scope.pending_certificate(virtualHost);
                $scope.go_to_pending(orderItemID);
            };

            $scope.begin = function() {

                // Only the “Simple” screen populates this.
                $scope.purchasing_certs = CertificatesService.get_purchasing_certs();

                if ($scope.purchasing_certs.length === 0) {

                    // The “Advanced” screen goes here, as does a resumed checkout.
                    CertificatesService.get_virtual_hosts().filter( function(vhost) {
                        if (!vhost.has_selected_domains()) {
                            return false;
                        }
                        var product = vhost.get_product();
                        if (!product) {
                            $log.warn("has selected, but no product?");
                            return false;
                        }
                        if (!CertificatesService.get_product_by_id(product.provider, product.id)) {
                            $log.warn("Unknown product!", product);
                            return false;
                        }
                        return true;
                    }).forEach(function(virtualHost) {
                        var product = virtualHost.get_product();
                        var cert = new Certificate();
                        cert.set_product(product);
                        cert.set_price(virtualHost.get_price());
                        cert.set_domains(virtualHost.get_selected_domains());
                        cert.set_virtual_hosts([virtualHost.display_name]);

                        if (product.x_identity_verification) {
                            var idVer = virtualHost.get_identity_verification();

                            // It’s ok if we don’t have the idver because
                            // that means we’re resuming a checkout, which
                            // means that the idver is already sent in, and
                            // the only reason we’re assembling cert/vhost/etc.
                            // is so that the controller can quantify the
                            // domains propertly in localization.
                            if (idVer) {
                                cert.set_identity_verification(idVer);
                            }
                        }

                        CertificatesService.add_new_certificate(cert);
                    });

                    $scope.purchasing_certs = CertificatesService.get_purchasing_certs();
                }

                $scope.get_providers();
                $scope.current_provider_name = $routeParams.provider;
                $scope.current_step_id = $routeParams.step;
                $scope.current_step_index = $scope.get_step_index($scope.current_provider_name, $scope.current_step_id);

                $scope.do_current_step();
                $timeout(function() {
                    _resizedWindow();
                }, 1);
            };

            $scope.init = function() {
                CertificatesService.restore();
                $scope.begin();
            };

            function _resizedWindow() {
                $(".checkout-step-inner").each(function(index, block) {
                    block = $(block);
                    var wrapper = block.find(".content-wrapper");
                    var padding = (block.height() - wrapper.height()) / 2;
                    wrapper.css("padding-top", padding);
                });
            }

            var window = angular.element($window);
            window.bind("resize", _resizedWindow);

            $scope.init();
        }

        app.controller("CheckoutController", [
            "$scope",
            "$controller",
            "$location",
            "$filter",
            "$routeParams",
            "$window",
            "$timeout",
            "CertificatesService",
            "spinnerAPI",
            "$q",
            "$uibModal",
            "$log",
            "Certificate",
            "LocationService",
            "alertService",
            CheckoutController]);
    }
);

/*
 * base/frontend/paper_lantern/security/tls_wizard/views/PendingCertificatesController.js
 *                                                 Copyright(c) 2015 cPanel, Inc.
 *                                                           All rights reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */
/* jshint -W100 */

// Then load the application dependencies


define(
    'app/views/PendingCertificatesController',[
        "lodash",
        "angular",
        "cjt/util/locale",
        "app/views/Certificate",
        "cjt/modules",
        "cjt/directives/spinnerDirective",
        "app/services/CertificatesService",
        "app/services/LocationService",
        "cjt/directives/actionButtonDirective"
    ],
    function(_, angular, LOCALE) {
        "use strict";

        var app = angular.module("App");

        function PendingCertificatesController(
            $scope,
            $location,
            $routeParams,
            $anchorScroll,
            $timeout,
            $window,
            CertificatesService,
            LocationService,
            Certificate,
            alertService
        ) {

            var providerDisplayName = {};
            CPANEL.PAGE.products.forEach(function(p) {
                providerDisplayName[p.provider] = p.provider_display_name;
            });

            $scope.show_introduction_block = CertificatesService.show_introduction_block;

            $scope.get_provider_display_name = function(provider) {
                return providerDisplayName[provider] || provider;
            };

            $scope.html_escape = _.escape;

            $scope.get_time = function() {
                return parseInt(Date.now() / 1000, 10);
            };

            $scope.LOCALE = LOCALE;

            $scope.checking_pending_queue = false;

            // Needed pending fix of CPANEL-4645
            $scope.cjt1_LOCALE = window.LOCALE;

            $scope.pending_certificates = CertificatesService.get_pending_certificates();
            $scope.expanded_cert = null;

            $scope.get_product_by_id = function(providerName, providerID) {
                return CertificatesService.get_product_by_id(providerName, providerID);
            };

            $scope.get_cert_title = function(cert) {
                var sortedDomains = cert.domains.sort(function(a, b) {
                    if (a.length === b.length) {
                        return 0;
                    }
                    return a.length > b.length ? 1 : -1;
                });

                if (sortedDomains.length === 1) {
                    return sortedDomains[0];
                } else {
                    return LOCALE.maketext("“[_1]” and [quant,_2,other domain,other domains]", sortedDomains[0], sortedDomains.length - 1);
                }

            };

            $scope.check_pending_queue = function() {
                return CertificatesService.process_ssl_pending_queue().then(function(result) {

                    // ----------------------------------------
                    // The intent here is to show at least one notification, always:
                    //
                    //  - notify (info) for each canceled cert
                    //
                    //  - notify (success) for each installed cert
                    //
                    //  - If we canceled nor installed any certificates,
                    //    notify (info) about no-op.
                    // ----------------------------------------

                    var installed = [];
                    var cancelledCount = 0;

                    result.data.forEach(function(oi) {
                        if (oi.installed) {
                            installed.push(oi);
                        } else {
                            /* jshint indent: false */
                            switch (oi.last_status_code) {
                                case "OrderCanceled":
                                case "OrderItemCanceled":
                                    cancelledCount++;

                                    var providerDisplayName = $scope.get_provider_display_name(oi.provider);

                                    var domains = oi.domains;
                                    if (domains.length === 1) {
                                        alertService.add({
                                            type: "info",
                                            message: LOCALE.maketext("“[_1]” reports that the certificate for “[_2]” has been canceled.", _.escape(providerDisplayName), _.escape(domains[0])),
                                            closeable: true,
                                            replace: false,
                                            group: "tlsWizard"
                                        });
                                    } else {
                                        alertService.add({
                                            type: "info",
                                            message: LOCALE.maketext("“[_1]” reports that the certificate for “[_2]” and [quant,_3,other domain,other domains] has been canceled.", _.escape(providerDisplayName), _.escape(domains[0]), domains.length - 1),
                                            closeable: true,
                                            replace: false,
                                            group: "tlsWizard"
                                        });
                                    }

                                    break;
                            }
                            /* jshint indent: 4 */
                        }
                    });

                    if (installed.length) {
                        var vhosts = [];

                        angular.forEach(installed, function(orderItem) {
                            vhosts = vhosts.concat(orderItem.vhost_names);
                        });
                        alertService.add({
                            type: "success",
                            message: LOCALE.maketext("[numerate,_2,A certificate,Certificates] for the following [numerate,_2,website was,websites were] available, and the system has installed [numerate,_2,it,them]: [list_and_quoted,_1]", vhosts, installed.length),
                            closeable: true,
                            replace: false,
                            autoClose: 10000,
                            group: "tlsWizard"
                        });
                    } else if (!cancelledCount) {

                        // We mentioned canceled and installed certificates earlier.
                        alertService.add({
                            type: "info",
                            message: LOCALE.maketext("The system processed the pending certificate queue successfully, but [numerate,_1,your pending certificate was not,none of your pending certificates were] available.", result.data.length),
                            closeable: true,
                            replace: false,
                            group: "tlsWizard"
                        });
                    }

                    return CertificatesService.fetch_pending_certificates().then(function() {
                        $scope.pending_certificates = CertificatesService.get_pending_certificates();
                        if ($scope.pending_certificates.length === 0) {
                            alertService.add({
                                type: "info",
                                message: LOCALE.maketext("You have no more pending [asis,SSL] certificates.") + " " + LOCALE.maketext("You will now return to the beginning of the wizard."),
                                closeable: true,
                                replace: false,
                                group: "tlsWizard"
                            });
                            CertificatesService.reset();

                            /* clear page-loaded domains and installed hosts to ensure we show the latests when we redirect to the purchase wizard */
                            CPANEL.PAGE.installed_hosts = null;
                            CPANEL.PAGE.domains = null;
                            $scope.get_new_certs();
                        } else {
                            $scope.prepare_pending_certificates();
                        }
                    });
                });

            };

            $scope.reset_and_create = function() {
                CertificatesService.hard_reset();
                $scope.get_new_certs();
            };

            $scope.get_new_certs = function() {
                LocationService.go_to_last_create_route().search("");
            };

            $scope.cancel_purchase = function(cert) {
                CertificatesService.cancel_pending_ssl_certificate_and_poll(cert.provider, cert.order_item_id).then(function(response) {
                    var payload = response.data[1].data;

                    var certificatePEM = payload.certificate_pem;

                    var providerHTML = _.escape($scope.get_provider_display_name(cert.provider));

                    if (certificatePEM) {
                        alertService.add({
                            type: "info",
                            message: LOCALE.maketext("You have canceled this order, but “[_1]” already issued the certificate. The system will now install it. ([output,url,_2,Do you need help with this order?])", providerHTML, cert.support_uri),
                            closeable: true,
                            replace: false,
                            group: "tlsWizard"
                        });
                        CertificatesService.install_certificate(
                            certificatePEM,
                            cert.vhost_names
                        ).then(
                            function() {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system has installed the new [asis,SSL] certificate on to the [numerate,_1,website,websites] [list_and_quoted,_2].", cert.vhost_names.length, cert.vhost_names),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "tlsWizard"
                                });
                            },
                            function(errorHTML) {
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system failed to install the new [asis,SSL] certificate because of an error: [_1]", errorHTML),
                                    group: "tlsWizard"
                                });
                            }
                        );
                    } else if (payload.status_code === "RequiresApproval") {
                        alertService.add({
                            type: "info",
                            message: LOCALE.maketext("The system has canceled the request for this certificate; however, “[_1]” was already waiting on approval before processing your order. To ensure that this certificate order is canceled, you must [output,url,_2,contact support directly].", providerHTML, cert.support_uri),
                            closeable: true,
                            replace: false,
                            group: "tlsWizard"
                        });
                    } else if (payload.status_code === "OrderCanceled") {
                        alertService.add({
                            type: "info",
                            message: LOCALE.maketext("This certificate’s order (ID “[_1]”) was already canceled directly via “[_2]”.", _.escape(cert.order_id), providerHTML),
                            closeable: true,
                            replace: false,
                            group: "tlsWizard"
                        });
                    } else if (payload.status_code === "OrderItemCanceled") {
                        alertService.add({
                            type: "info",
                            message: LOCALE.maketext("This certificate (order item ID “[_1]”) was already canceled directly via “[_2]”.", _.escape(cert.order_item_id), providerHTML),
                            closeable: true,
                            replace: false,
                            group: "tlsWizard"
                        });
                    } else {
                        alertService.add({
                            type: "success",
                            message: LOCALE.maketext("The system has canceled this certificate. Your credit card should not be charged for this order."),
                            closeable: true,
                            replace: false,
                            autoClose: 10000,
                            group: "tlsWizard"
                        });
                    }

                    CPANEL.PAGE.pending_certificates = null;
                    return CertificatesService.fetch_pending_certificates().then(function() {

                        /* refresh existing list */
                        $scope.pending_certificates = CertificatesService.get_pending_certificates();
                        if ($scope.pending_certificates.length === 0) {
                            $scope.get_new_certs();
                        } else {
                            $scope.prepare_pending_certificates();
                        }
                    }, function(errorHTML) {
                        alertService.add({
                            type: "danger",
                            message: LOCALE.maketext("The system encountered an error as it attempted to refresh your pending certificates: [_1]", errorHTML),
                            group: "tlsWizard"
                        });
                    });
                }, function(errorHTML) {
                    alertService.add({
                        type: "danger",
                        message: LOCALE.maketext("The system encountered an error as it attempted to cancel your transaction: [_1]", errorHTML),
                        group: "tlsWizard"
                    });
                });
            };

            var _addOrderDetailsToDisplayedDomain = function(certificate, displayedDomain) {
                if (!certificate.domainDetails) {
                    return;
                }
                displayedDomain.orderDetails = certificate.domainDetails[displayedDomain.domain];
            };

            $scope.get_displayed_domains = function(pcert) {
                var domains = pcert.domains;

                var start = pcert.display_meta.items_per_page * (pcert.display_meta.current_page - 1);
                var limit = Math.min(domains.length, start + pcert.display_meta.items_per_page);

                // Domains displayed are the same domains that will be displayed.
                if (pcert.displayed_domains && pcert.display_meta.start === start && pcert.display_meta.limit === limit && pcert.displayed_domains.length) {
                    return pcert.displayed_domains;
                }

                pcert.display_meta.start = start;
                pcert.display_meta.limit = limit;

                var displayDomains = [];
                for (var i = pcert.display_meta.start; i < pcert.display_meta.limit; i++) {
                    var domainObject = {
                        domain: domains[i]
                    };
                    _addOrderDetailsToDisplayedDomain(pcert, domainObject);
                    displayDomains.push(domainObject);
                }

                pcert.displayed_domains = displayDomains;
                return pcert.displayed_domains;
            };

            function _getStringForStatusCode(statusCode, provider) {
                var str;

                if (statusCode === "RequiresApproval") {
                    var providerDisplayName = $scope.get_providerDisplayName(provider);
                    str = LOCALE.maketext("Waiting for “[_1]” to approve your order …", providerDisplayName);
                }

                return str;
            }

            $scope.get_cert_status = function(pendingCertificate) {
                var statusCodeStr = _getStringForStatusCode(pendingCertificate.last_status_code, pendingCertificate.provider);

                if (statusCodeStr) {
                    return statusCodeStr;
                }

                var status = pendingCertificate.status;
                if (status === "unconfirmed") {
                    return LOCALE.maketext("Pending Completion of Payment");
                } else if (status === "confirmed") {
                    if (pendingCertificate.statusDetails && pendingCertificate.statusDetails.loaded) {
                        var incompleteThings = pendingCertificate.statusDetails.details.filter(function(item) {
                            if (item.rawStatus === "not-completed") {
                                return true;
                            }

                            return false;
                        });
                        if (incompleteThings.length === 0) {
                            return LOCALE.maketext("Payment Completed.") + " " + LOCALE.maketext("Awaiting Validation …");
                        } else if (incompleteThings.length === 1) {
                            return LOCALE.maketext("Payment Completed.") + " " + incompleteThings[0].status;
                        } else {
                            return LOCALE.maketext("Payment Completed.") + " " + LOCALE.maketext("Multiple validation items pending …");
                        }
                    } else {
                        return LOCALE.maketext("Payment Completed.") + " " + LOCALE.maketext("Waiting for the provider to issue the certificate …");
                    }
                } else {
                    return LOCALE.maketext("Status Unknown");
                }
            };

            $scope.toggle_cert_collapse = function(cert) {
                if ($scope.expanded_cert === cert.order_item_id) {
                    $scope.collapse_cert(cert);
                } else {
                    $scope.expand_cert(cert);
                }
            };

            $scope.expand_cert = function(cert) {
                $location.search("orderItemID", cert.order_item_id);
                $scope.expanded_cert = cert.order_item_id;
                if (!cert.statusDetails) {
                    $scope.load_certificate_details(cert);
                }
                $anchorScroll($scope.expanded_cert);
            };

            $scope.load_certificate_details = function(certificate) {

                certificate.domainDetails = {};
                certificate.statusDetails = { loaded: false, loading: true, details: [] };

                function _succeed(details) {
                    certificate.statusDetails.loaded = true;
                    certificate.statusDetails.details = details.statusDetails;
                    certificate.domainDetails = {};

                    angular.forEach(certificate.statusDetails.details, function(detail) {
                        if (detail.rawStatus === "completed") {
                            detail.rowStatusClass = "success";

                            // Unset the url for completed things so we don't  get a button
                            delete detail.actionURL;
                        } else {
                            detail.rowStatusClass = "warning";
                        }
                    });

                    angular.forEach(certificate.domains, function(domain) {

                        var status = details.domainDetails[domain];

                        if (status) {
                            certificate.hasDomainDetails = true;
                        }

                        certificate.domainDetails[domain] = {};

                        if (status === "NOTVALIDATED") {
                            certificate.domainDetails[domain].rowStatusClass = "warning";
                            certificate.domainDetails[domain].rowStatusLabel = LOCALE.maketext("Not Validated");
                            certificate.domainDetails[domain].domainDetailDescription = LOCALE.maketext("The [output,abbr,CA,Certificate,Authority] received the request but has not yet performed a [output,abbr,DCV,Domain Control Validation] check.");
                        } else if (status === "VALIDATED") {
                            certificate.domainDetails[domain].rowStatusClass = "success";
                            certificate.domainDetails[domain].rowStatusLabel = LOCALE.maketext("Validated");
                            certificate.domainDetails[domain].domainDetailDescription = LOCALE.maketext("The [output,abbr,CA,Certificate,Authority] validated the certificate.");

                        } else if (status === "AWAITINGBRANDING") {
                            certificate.domainDetails[domain].rowStatusClass = "info";
                            certificate.domainDetails[domain].rowStatusLabel = LOCALE.maketext("Awaiting Branding …");
                            certificate.domainDetails[domain].domainDetailDescription = LOCALE.maketext("The [output,abbr,CA,Certificate,Authority] received the request and must now process the brand verification approval.");
                        } else {
                            certificate.domainDetails[domain].rowStatusClass = "info";
                            certificate.domainDetails[domain].rowStatusLabel = LOCALE.maketext("Unknown");
                            certificate.domainDetails[domain].domainDetailDescription = LOCALE.maketext("Unknown.");
                        }

                    });


                    // Manually add details to currently displayed domain (since it's cached)
                    angular.forEach(certificate.displayed_domains, function(displayedDomain) {
                        _addOrderDetailsToDisplayedDomain(certificate, displayedDomain);
                    });
                }

                function _finally() {
                    certificate.statusDetails.loading = false;
                }

                CertificatesService.getCertificateStatusDetails(certificate.provider, certificate.order_item_id).then(_succeed).finally(_finally);
            };

            $scope.collapse_cert = function() {
                $location.search();
                $scope.expanded_cert = null;
            };

            $scope.continue_purchase = function(pcert) {
                var domains = CertificatesService.get_all_domains();

                // Ensure no other purchasing certs exist
                CertificatesService.reset_purchasing_certificates();

                // rebuild purchasing certificate
                var cert = new Certificate();
                var certificateDomains = [];
                var certificateProduct = CertificatesService.get_product_by_id(pcert.provider, pcert.product_id);
                var totalPrice = 0;

                cert.set_domains(certificateDomains);
                cert.set_virtual_hosts(pcert.vhost_names);
                cert.set_product(certificateProduct);

                angular.forEach(pcert.domains, function(certificateDomain) {
                    angular.forEach(domains, function(domain) {
                        if (domain.domain === certificateDomain) {
                            certificateDomains.push(domain);
                            totalPrice += domain.is_wildcard ? certificateProduct.wildcard_price : certificateProduct.price;
                        }
                    });
                });

                cert.set_price(totalPrice);

                CertificatesService.add_new_certificate(cert);

                // Removes purchasing certificates that might be saved in local storage.
                // These don't reappear until returning from logging in.
                CertificatesService.save();

                //
                $location.path("/purchase/" + pcert.provider + "/login/").search({
                    order_id: pcert.order_id
                });
            };

            $scope.rebuild_local_storage = function() {

                // Repair Orders
                var orders = {};
                var domains = CertificatesService.get_all_domains();
                var virtualHosts = CertificatesService.get_virtual_hosts();

                angular.forEach($scope.pending_certificates, function(orderItem) {

                    // build new order
                    orders[orderItem.order_id] = orders[orderItem.order_id] || {
                        access_token: "",
                        certificates: [],
                        order_id: orderItem.order_id,
                        checkout_url: orderItem.checkout_url
                    };
                    orders[orderItem.order_id].certificates.push(orderItem);

                    // re select the domains
                    angular.forEach(orderItem.domains, function(certificateDomain) {
                        angular.forEach(domains, function(domain) {
                            if (domain.domain === certificateDomain) {
                                domain.selected = true;
                            }
                        });
                    });

                    // re select a product
                    angular.forEach(orderItem.vhost_names, function(vHostName) {
                        var vHostID = CertificatesService.get_virtual_host_by_display_name(vHostName);
                        var vhost = virtualHosts[vHostID];
                        var product = CertificatesService.get_product_by_id(
                            orderItem.provider,
                            orderItem.product_id
                        );

                        /* in case someone deletes the vhost while the certificate is pending */
                        if (vhost) {
                            vhost.set_product(product);
                        }
                    });

                });

                // add each new order
                angular.forEach(orders, function(order) {
                    CertificatesService.add_order(order);
                });

                // Then Save
                CertificatesService.save();
            };

            $scope.restore_orders = function() {

                // Rebuild to prevent doubling up
                CertificatesService.clear_stored_settings();

                /*  add in missing orders
                    we need to always do this in case a
                    localStorage exists that doesn't
                    contain *this* set of orders */
                var fetRet = CertificatesService.fetch_domains();
                if (_.isFunction(fetRet["finally"])) {
                    fetRet.then($scope.rebuild_local_storage);
                } else if (fetRet) {
                    $scope.rebuild_local_storage();
                }
            };

            $scope.prepare_pending_certificates = function() {
                $scope.pending_certificates.forEach(function(cert) {
                    cert.support_uri_is_http = /^http/.test(cert.support_uri);

                    cert.display_meta = cert.display_meta || {
                        items_per_page: 10,
                        current_page: 1
                    };
                });
            };

            $scope.init = function() {
                $scope.restore_orders();
                $scope.prepare_pending_certificates();

                if ($routeParams.orderItemID) {
                    $scope.expanded_cert = $routeParams.orderItemID;
                    angular.forEach($scope.pending_certificates, function(cert) {
                        if (cert.order_item_id === $scope.expanded_cert) {
                            $scope.load_certificate_details(cert);
                        }
                    });
                    $timeout(function() {
                        $anchorScroll($scope.expanded_cert);
                    }, 500);
                }
            };

            $scope.init();
        }

        app.controller(
            "PendingCertificatesController",
            [
                "$scope",
                "$location",
                "$routeParams",
                "$anchorScroll",
                "$timeout",
                "$window",
                "CertificatesService",
                "LocationService",
                "Certificate",
                "alertService",
                PendingCertificatesController
            ]
        );

    }
);

/*
# base/frontend/paper_lantern/security/tls_wizard/directives/identityVerificationDirective.js
#                                                 Copyright(c) 2016 cPanel, Inc.
#                                                           All rights reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/directives/identityVerificationDirective',[
        "angular",
        "cjt/util/locale",
    ],
    function(angular, LOCALE) {
        "use strict";

        // Retrieve the current application
        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        var TEMPLATE_PATH = "directives/identityVerification.phtml";

        // Only these “type”s are passed through to HTML.
        var ALLOWED_HTML_INPUT_TYPES = {
            date: true,
            number: true,
            email: true,
            tel: true,
        };

        // Only these return false from use_html_input().
        var NON_HTML_INPUT_TYPES = {
            country_code: true,
            choose_one: true,
        };

        var str = {
            required: LOCALE.maketext("Required"),
            preamble: LOCALE.maketext("To ensure quick service, fill out the form below as completely as possible."),
        };

        function use_html_input(item) {
            return !( item.type in NON_HTML_INPUT_TYPES );
        }

        function get_html_input_type(item) {
            return ( ALLOWED_HTML_INPUT_TYPES[item.type] ? item.type : "text" );
        }

        function get_date_format_description() {
            var now = new Date();
            var today_yyyy_mm_dd = now.toISOString().replace(/T.*/, "");

            return LOCALE.maketext("Use the format “[_1]”. For example, today is “[_2]”.", "YYYY-MM-DD", today_yyyy_mm_dd);
        }

        app.directive("identityVerification", [
            function() {
                return {
                    templateUrl: TEMPLATE_PATH,
                    restrict: "E",
                    scope: {
                        items: "=",
                        models: "=",
                        countries: "=",
                        vhostName: "=",
                    },
                    link: function(scope, element) {
                        angular.extend(
                            scope,
                            {
                                SELF: scope,

                                STR: str,

                                get_html_input_type: get_html_input_type,
                                use_html_input: use_html_input,
                                get_date_format_description: get_date_format_description,
                            }
                        );

                        scope.items.forEach( function(item) {
                            item.is_optional = Boolean(+item.is_optional);
                        } );
                    },
                };
            }
        ]);
    }
);

/*
 * base/frontend/paper_lantern/security/tls_wizard/index.js
 *                                                    Copyright 2018 cPanel, Inc.
 *                                                           All rights reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, require: false */

define(
    'app/index',[
        "angular",
        "cjt/core",
        "lodash",
        "cjt/modules",
        "uiBootstrap",
        "ngRoute",
        "ngSanitize",
        "ngAnimate",
    ],
    function(angular, CJT, _) {
        "use strict";

        return function() {

            angular.module("App", ["ui.bootstrap", "angular-growl", "cjt2.cpanel", "ngAnimate"]);

            var app = require(
                [
                    "cjt/bootstrap",
                    "cjt/services/alertService",
                    "cjt/directives/alert",
                    "cjt/directives/alertList",
                    "app/services/CertificatesService",
                    "app/services/LocationService",
                    "app/views/VirtualHostsController",
                    "app/views/PurchaseSimpleController",
                    "app/views/CheckoutController",
                    "app/views/PendingCertificatesController",
                    "app/directives/identityVerificationDirective",
                    "cjt/decorators/growlDecorator",
                    "cjt/services/cpanel/componentSettingSaverService"
                ],
                function(BOOTSTRAP) {

                    var app = angular.module("App");

                    app.value("PAGE", CPANEL.PAGE);

                    // If using views
                    app.controller("BaseController", [
                        "componentSettingSaverService",
                        "CertificatesService",
                        "$rootScope",
                        "$scope",
                        "$route",
                        "$location",
                        function(
                            $CSSS,
                            CertificatesService,
                            $rootScope,
                            $scope,
                            $route,
                            $location
                        ) {

                            var INTRODUCTION_BLOCK = "IntroductionBlock";

                            $scope.loading = false;

                            // Convenience functions so we can track changing views for loading purposes
                            $rootScope.$on("$routeChangeStart", function(event, next, current) {
                                if (!current || next.loadedTemplateURL !== current.loadedTemplateURL) {
                                    $scope.loading = true;
                                }
                            });
                            $rootScope.$on("$routeChangeSuccess", function() {
                                $scope.loading = false;
                            });
                            $rootScope.$on("$routeChangeError", function() {
                                $scope.loading = false;
                            });

                            $scope.introduction_dismissed = function() {
                                $CSSS.set(INTRODUCTION_BLOCK, {
                                    hidden: true
                                });
                                CertificatesService.dismiss_introduction();
                            };

                            $scope.current_route_matches = function(key) {
                                return $location.path().match(key);
                            };
                            $scope.go = function(path) {
                                $location.path(path);
                            };

                            var registering = $CSSS.register(INTRODUCTION_BLOCK);
                            if (registering) {
                                registering.then(function(result) {
                                    if (result && result.hidden) {
                                        CertificatesService.dismiss_introduction();
                                    }
                                });
                            }

                            $scope.$on("$destroy", function() {
                                $CSSS.unregister(INTRODUCTION_BLOCK);
                            });
                        }
                    ]);

                    // viewName

                    app.config(["$routeProvider", "growlProvider",
                        function($routeProvider, growlProvider) {
                            growlProvider.globalPosition("top-right");

                            // Setup a route - copy this to add additional routes as necessary
                            $routeProvider.when("/create-advanced/:domain?", {
                                controller: "VirtualHostsController",
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/virtual_hosts.html.tt"),
                                resolve: {
                                    installed_hosts: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_installed_hosts();
                                        }
                                    ],
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ],
                                    domains: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_domains();
                                        }
                                    ],
                                    pending_certificates: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_pending_certificates();
                                        }
                                    ]
                                }
                            });

                            // Setup a route - copy this to add additional routes as necessary
                            $routeProvider.when("/create/:domain?", {
                                controller: "PurchaseSimpleController",
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/purchase_simple.html.tt"),
                                resolve: {
                                    installed_hosts: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_installed_hosts();
                                        }
                                    ],
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ],
                                    domains: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_domains();
                                        }
                                    ],
                                    pending_certificates: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_pending_certificates();
                                        }
                                    ]
                                }
                            });

                            // Setup a route - copy this to add additional routes as necessary
                            $routeProvider.when("/pending-certificates/", {
                                controller: "PendingCertificatesController",
                                reloadOnSearch: false,
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/pending_certificates.html.tt"),
                                resolve: {
                                    installed_hosts: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_installed_hosts();
                                        }
                                    ],
                                    pending_certificates: ["CertificatesService", "LocationService", "$location",
                                        function(CertificatesService, LocationService, $location) {
                                            var fetching = CertificatesService.fetch_pending_certificates();
                                            if (_.isFunction(fetching["finally"])) {
                                                return fetching.then(function() {
                                                    if (CertificatesService.get_pending_certificates().length) {
                                                        return true;
                                                    } else {
                                                        LocationService.go_to_last_create_route();
                                                        return false;
                                                    }
                                                });
                                            } else {
                                                if (CertificatesService.get_pending_certificates().length) {
                                                    return true;
                                                } else {
                                                    LocationService.go_to_last_create_route();
                                                    return false;
                                                }
                                            }

                                        }
                                    ],
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ]
                                }
                            });

                            $routeProvider.when("/purchase/:provider?/:step?/:everythingelse?", {
                                controller: "CheckoutController",
                                templateUrl: CJT.buildFullPath("security/tls_wizard/views/checkout.html.tt"),
                                resolve: {
                                    products: ["CertificatesService",
                                        function(CertificatesService) {
                                            return CertificatesService.fetch_products();
                                        }
                                    ]
                                }
                            });


                            // default route
                            $routeProvider.otherwise({
                                "redirectTo": "/pending-certificates"
                            });

                        }
                    ]);

                    // end of using views

                    BOOTSTRAP("#content", "App");

                });

            return app;
        };
    }
);


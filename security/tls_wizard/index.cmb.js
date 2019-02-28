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
                    remove_domain: function(domain) {
                        domain.selected = 0;
                        this.get_selected_domains();
                    },

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
        "cjt/decorators/growlDecorator"
    ],
    function(angular, _, LOCALE, cjt2Html, cjt2_parse, API, APIREQUEST) {
        "use strict";

        // Curious that JS doesn’t expose sprintf(). Anyway.
        // http://www.codigomanso.com/en/2010/07/simple-javascript-formatting-zero-padding/
        function _sprintf_02d(n) {
            return ("0" + n).slice(-2);
        }

        function productSupportsDnsDcv(p) {
            return p.x_supports_dns_dcv;
        }

        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        function CertificatesServiceFactory(VirtualHost, Certificate, $q, growl, growlMsg, $log) {
            var CertificatesService = {};
            var virtual_hosts = [];
            var all_domains = [];
            var selected_domains = [];
            var products = [];
            var orders = [];
            var pending_certificates = [];
            var installed_hosts = null;
            var purchasing_certs = [];
            var ssl_domains = {};
            var installed_hosts_map = {};
            var products_search_options;
            var wildcard_map = {};

            // A lookup of “www.” domains. We don’t display these in the
            // UI, but we want to know about them so we avoid trying to DCV them.
            var wwwDomainsLookup = {};

            var domain_search_options;
            var current_date = new Date();
            var introduction_dismissed = false;

            function api_error(which_api, error_msg_html) {
                var error = LOCALE.maketext("The “[_1]” [asis,API] failed due to the following error: [_2]", _.escape(which_api), error_msg_html);
                growl.error(error);
            }

            CertificatesService.add_new_certificate = function(cert) {
                purchasing_certs.push(cert);
            };

            CertificatesService.get_purchasing_certs = function() {
                return purchasing_certs;
            };

            CertificatesService.get_order_by_id = function(order_id) {
                for (var i = 0; i < orders.length; i++) {
                    if (orders[i].order_id === order_id) {
                        return orders[i];
                    }
                }
            };
            CertificatesService.add_order = function(order) {
                var existing_order = CertificatesService.get_order_by_id(order.order_id);
                if (existing_order) {

                    // update existing order
                    angular.extend(existing_order, order);
                } else {

                    // add orer
                    orders.push(order);
                }
            };

            CertificatesService.restore = function() {
                if (CertificatesService.get_virtual_hosts().length) {
                    return false;
                }
                var stored_settings = _get_stored_settings_json();
                if (!stored_settings) {
                    return false;
                }
                var storage = JSON.parse(stored_settings);
                angular.forEach(storage.virtual_hosts, function(vhost) {
                    virtual_hosts.push(new VirtualHost(vhost));
                });
                angular.forEach(storage.purchasing_certs, function(cert) {
                    CertificatesService.add_new_certificate(new Certificate(cert));
                });
                orders = storage.orders;
                return virtual_hosts.length === storage.virtual_hosts.length && orders.length === storage.orders.length;
            };

            CertificatesService.add_virtual_host = function(virtual_host, is_ssl) {
                var new_vhost = new VirtualHost({
                    display_name: virtual_host,
                    is_ssl: is_ssl
                });
                var vhost_id = virtual_hosts.length;
                virtual_hosts.push(new_vhost);
                return vhost_id;
            };

            CertificatesService.get_virtual_hosts = function() {
                return virtual_hosts;
            };

            CertificatesService.doesDomainMatchOneOf = function(domain, domains) {
                if (domains === null || domain === null) {
                    return false;
                }

                return domains.some(function(domain_1) {
                    var domain_2 = domain;
                    if (domain_1 === domain_2) {
                        return true;
                    }

                    var possible_wildcard;
                    var domain_to_match;

                    if (/^\*/.test(domain_1)) {
                        possible_wildcard = domain_1;
                        domain_to_match = domain_2;
                    } else if (/^\*/.test(domain_2)) {
                        possible_wildcard = domain_2;
                        domain_to_match = domain_1;
                    } else {
                        return false;
                    }

                    possible_wildcard = possible_wildcard.replace(/^\*\./, "");
                    domain_to_match = domain_to_match.replace(/^[^\.]+\./, "");

                    if (possible_wildcard === domain_to_match) {
                        return true;
                    }
                });
            };

            CertificatesService.add_raw_domain = function(raw_domain) {
                if (/^www\./.test(raw_domain.domain)) {
                    wwwDomainsLookup[ raw_domain.domain ] = true;
                    return;
                }

                raw_domain.virtual_host = raw_domain.vhost_name;

                raw_domain.order_by_name = raw_domain.domain;

                /* for consistency and ease of filtering */
                raw_domain.is_wildcard = raw_domain.domain.indexOf("*.") === 0;
                raw_domain.is_proxy = raw_domain.is_proxy.toString() === "1";
                raw_domain.stripped_domain = raw_domain.domain;
                CertificatesService.add_domain(raw_domain);

                // Adding this check here, but should probably check to make sure these weren't manually created (in a later version)
                var matches_autogenerated = raw_domain.domain.match(/^(mail|ipv6)\./);

                if (!raw_domain.is_wildcard && !raw_domain.is_proxy && !matches_autogenerated) {
                    CertificatesService.add_domain(angular.extend({}, raw_domain, {
                        domain: "*." + raw_domain.domain,
                        is_wildcard: true
                    }));
                }

            };

            CertificatesService.domain_covered_by_wildcard = function(domain) {
                return wildcard_map[domain];
            };

            CertificatesService.compare_wildcard_domain = function(wildcard_domain, compare_domain) {
                return wildcard_map[compare_domain] === wildcard_domain.domain;
            };

            /* map these for faster lookup */
            CertificatesService.build_wildcard_map = function() {
                wildcard_map = {};
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

                    domains.forEach(function(match_domain) {
                        if (domain.domain !== match_domain.domain && re.test(match_domain.domain)) {
                            wildcard_map[match_domain.domain] = domain;
                        }
                    });

                });
            };

            CertificatesService.get_domain_certificate_status = function(domain) {

                var ihost = CertificatesService.get_domain_certificate(domain.domain);

                if (ihost && ihost.certificate) {
                    var expiration_date = new Date(ihost.certificate.not_after * 1000);
                    var days_until_expire = (expiration_date - current_date) / 1000 / 60 / 60 / 24;
                    if (expiration_date < current_date) {
                        return "expired";
                    } else if (days_until_expire < 30 && days_until_expire > 0) {
                        return "expiring_soon";
                    } else {
                        return "active";
                    }
                }

                return "unsecured";
            };

            CertificatesService.add_domain = function(domain_obj) {
                var vhost_id = CertificatesService.get_virtual_host_by_display_name(domain_obj.virtual_host);
                if (vhost_id !== 0 && !vhost_id) {
                    vhost_id = CertificatesService.add_virtual_host(domain_obj.virtual_host, 1);
                }
                virtual_hosts[vhost_id].is_ssl = 1;

                /* prevent adding of duplicates */
                if (CertificatesService.get_domain_by_domain(domain_obj.domain)) {
                    return;
                }

                // assume installed hosts is there, we will ensure this later

                ssl_domains[domain_obj.domain] = null;


                // domain certificate finding

                var ihost = installed_hosts_map[domain_obj.virtual_host];

                if (ihost && ihost.certificate) {

                    // vhost has certificate, but does it cover this domain

                    angular.forEach(ihost.certificate.domains, function(domain) {
                        if (domain_obj.domain === domain) {
                            ssl_domains[domain_obj.domain] = ihost;
                            return;
                        }

                        var wildcard_domain = domain_obj.domain.replace(/^[^.]+\./, "*.");
                        if (wildcard_domain === domain) {
                            ssl_domains[domain_obj.domain] = ihost;
                        }
                    });

                }


                domain_obj.type = domain_obj.is_wildcard ? "wildcard_domain" : "main_domain";
                domain_obj.proxy_type = domain_obj.is_proxy ? "proxy_domain" : "main_domain";
                domain_obj.certificate_status = CertificatesService.get_domain_certificate_status(domain_obj);

                return virtual_hosts[vhost_id].add_domain(domain_obj);
            };


            CertificatesService.remove_virtual_host = function(display_name) {
                var index = CertificatesService.get_virtual_host_by_display_name(display_name);
                if (index) {
                    virtual_hosts[index].remove_all_domains();
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

            CertificatesService.get_virtual_host_by_display_name = function(display_name) {
                for (var i = 0; i < virtual_hosts.length; i++) {
                    if (virtual_hosts[i].display_name === "*") {

                        /* There can be only one if we requested an all-vhosts install */
                        return 0;
                    } else if (virtual_hosts[i].display_name === display_name) {
                        return i;
                    }
                }
            };

            // TODO: This code is duplicated all over and should
            // probably be de-duplicated.
            var _run_uapi = function(apiCall) {
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

                return _run_uapi(apiCall).then(
                    function(results) {
                        for (var d = 0; d < dnsDcvDomainObjs.length; d++) {
                            var domain = dnsDcvDomainObjs[d];

                            domain.resolving = false;

                            domain.dcvPassed.dns = cjt2_parse.parsePerlBoolean(results.data[d].succeeded);

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
                        api_error("DCV::check_domains_via_dns", error);
                    }
                );
            }

            CertificatesService.set_confirmed_status_for_ssl_certificates = function(provider, order) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                var order_item_ids = [];

                angular.forEach(order.certificates, function(item) {
                    order_item_ids.push(item.order_item_id);
                });

                apiCall.initialize("Market", "set_status_of_pending_queue_items");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("status", "confirmed");
                apiCall.addArgument("order_item_id", order_item_ids);

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
                    api_error("WebVHosts::list_ssl_capable_domains", error);
                });

                return deferred.promise;
            };

            CertificatesService.get_store_login_url = function(provider, escaped_url) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "get_login_url");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("url_after_login", escaped_url);

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

            function _get_stored_settings_json() {
                return localStorage.getItem("tls_wizard_data");
            }

            CertificatesService.store_settings = function(extras) {
                var storable_settings = CertificatesService.get_storable_settings(extras);
                localStorage.setItem("tls_wizard_data", storable_settings);
                var retrieved_data = _get_stored_settings_json();
                return retrieved_data === storable_settings;
            };

            CertificatesService.save = CertificatesService.store_settings;

            // Returns at least an empty object.
            CertificatesService.get_stored_extra_settings = function get_stored_extra_settings() {
                var settings = _get_stored_settings_json();
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
                var storage = _get_stored_settings_json();
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
                    virtual_hosts: virtual_hosts,

                    // Used in the “Simple” screen
                    // NB: Each one has a .toJSON() method defined.
                    purchasing_certs: CertificatesService.get_purchasing_certs(),
                });

                return JSON.stringify(storage);
            };

            CertificatesService.get_all_domains = function() {
                all_domains = [];
                angular.forEach(virtual_hosts, function(vhost) {
                    all_domains = all_domains.concat(vhost.get_domains());
                });
                return all_domains;
            };

            CertificatesService.get_all_selected_domains = function() {
                selected_domains = [];
                angular.forEach(virtual_hosts, function(vhost) {
                    selected_domains = selected_domains.concat(vhost.get_selected_domains());
                });
                return selected_domains;
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
                                product[attr] = cjt2_parse.parseNumber(product[attr]);
                            }
                        });

                        CertificatesService.add_raw_product(product);
                    });

                }, function(error) {
                    api_error("Market::get_all_products", error);
                });

                return deferred.promise;
            };

            CertificatesService._make_certificate_term_label = function(term_unit, term_value) {
                var unit_strings = {
                    "year": LOCALE.maketext("[quant,_1,Year,Years]", term_value),
                    "month": LOCALE.maketext("[quant,_1,Month,Months]", term_value),
                    "day": LOCALE.maketext("[quant,_1,Day,Days]", term_value)
                };
                return unit_strings[term_unit] || term_value + " " + term_unit;
            };

            CertificatesService._make_validation_type_label = function(validation_type) {
                var validation_type_labels = {
                    "dv": LOCALE.maketext("[output,abbr,DV,Domain Validated] Certificate"),
                    "ov": LOCALE.maketext("[output,abbr,OV,Organization Validated] Certificate"),
                    "ev": LOCALE.maketext("[output,abbr,EV,Extended Validation] Certificate")
                };
                return validation_type_labels[validation_type] || validation_type;
            };

            CertificatesService.add_raw_product = function(raw_product) {
                raw_product.id = raw_product.product_id;
                raw_product.provider = raw_product.provider_name;
                raw_product.provider_display_name = raw_product.provider_display_name || raw_product.provider;
                raw_product.price = Number(raw_product.x_price_per_domain);
                raw_product.wildcard_price = Number(raw_product.x_price_per_wildcard_domain);
                raw_product.wildcard_parent_domain_included = raw_product.x_wildcard_parent_domain_free && raw_product.x_wildcard_parent_domain_free.toString() === "1";
                raw_product.icon_mime_type = raw_product.icon_mime_type ? raw_product.icon_mime_type : "image/png";
                raw_product.is_wildcard = !isNaN(raw_product.wildcard_price) ? true : false;
                raw_product.x_certificate_term = raw_product.x_certificate_term || [1, "year"];
                raw_product.x_certificate_term_display_name = CertificatesService._make_certificate_term_label(raw_product.x_certificate_term[1], raw_product.x_certificate_term[0]);
                raw_product.x_certificate_term_key = raw_product.x_certificate_term.join("_");
                raw_product.x_validation_type_display_name = CertificatesService._make_validation_type_label(raw_product.x_validation_type);
                raw_product.validity_period = raw_product.x_certificate_term;
                raw_product.x_supports_dns_dcv = cjt2_parse.parsePerlBoolean(raw_product.x_supports_dns_dcv);
                products.push(raw_product);
            };

            CertificatesService.get_domain_search_options = function() {
                if (domain_search_options) {
                    return domain_search_options;
                }

                domain_search_options = {
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
                        label: LOCALE.maketext("Proxy Subdomain Types:"),
                        item_key: "proxy_type",
                        options: [{
                            "value": "proxy_domain",
                            "label": LOCALE.maketext("[asis,cPanel] Proxy Subdomains"),
                            "description": LOCALE.maketext("Only list proxy subdomains.")
                        }, {
                            "value": "main_domain",
                            "label": LOCALE.maketext("Other Domains"),
                            "description": LOCALE.maketext("Only list non-Proxy domains.")
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
                if (products_search_options) {
                    return products_search_options;
                }

                products_search_options = {
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
                    products_search_options.certTerms.options.push(item);
                });
                angular.forEach(providers, function(item) {
                    products_search_options.sslProvider.options.push(item);
                });
                angular.forEach(validationTypes, function(item) {
                    products_search_options.validationType.options.push(item);
                });

                for (var key in products_search_options) {
                    if (products_search_options.hasOwnProperty(key)) {
                        if (products_search_options[key].options.length <= 1) {
                            delete products_search_options[key];
                        }
                    }
                }

                return CertificatesService.get_product_search_options();
            };

            CertificatesService.get_product_by_id = function(provider_name, product_id) {
                for (var i = 0; i < products.length; i++) {
                    if (products[i].id === product_id && products[i].provider === provider_name) {
                        return products[i];
                    }
                }

                return;
            };

            var _ensure_domains_can_pass_dcv = function(domains, dcv_constraints) {
                var flat_domains = [];
                var dcv_domain_objs = [];

                angular.forEach(domains, function(domain) {
                    if (domain.resolved === -1) {
                        dcv_domain_objs.push(domain);
                        flat_domains.push(domain.domain);
                        domain.resolving = true;
                    }
                });

                if (flat_domains.length === 0) {
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
                        domain: flat_domains,
                        dcv_file_allowed_characters: JSON.stringify(dcv_constraints.dcv_file_allowed_characters),
                        dcv_file_random_character_count: dcv_constraints.dcv_file_random_character_count,
                        dcv_file_extension: dcv_constraints.dcv_file_extension,
                        dcv_file_relative_path: dcv_constraints.dcv_file_relative_path,
                        dcv_user_agent_string: dcv_constraints.dcv_user_agent_string,
                    }
                );

                var prodsThatCanDoDnsDcv = products.filter(productSupportsDnsDcv);

                // TODO: We should be smarter about redirection:
                // if the number of redirects is within every product’s
                // redirection limit, then we shouldn’t fall back to DNS DCV.
                var prodsThatForbidRedirects = products.filter(productForbidsRedirects);

                return _run_uapi(apiCall).then(function(results) {
                    var dnsDcvDomainObjs = [];

                    for (var d = 0; d < dcv_domain_objs.length; d++) {
                        var domain = dcv_domain_objs[d];

                        domain.resolution_failure_reason = results.data[d].failure_reason;
                        domain.redirects_count = cjt2_parse.parseNumber(results.data[d].redirects_count);

                        // Success with redirects likely means that even
                        // rebuilding .htaccess didn’t fix the issue,
                        // so the customer will need to investigate manually.
                        if (domain.redirects_count && !domain.resolution_failure_reason) {

                            if (prodsThatForbidRedirects.length) {
                                var message = LOCALE.maketext("“[_1]”’s [output,abbr,DCV,Domain Control Validation] check completed correctly, but the check required an [asis,HTTP] redirection. The system tried to exclude such redirections from this domain by editing the website document root’s “[_2]” file, but the redirection persists. You should investigate further.", _.escape(domain.domain), ".htaccess");

                                growl.warning(message);

                                // Only fail at this point if DNS DCV isn’t
                                // available.
                                if (!prodsThatCanDoDnsDcv.length && (prodsThatForbidRedirects.length === products.length)) {
                                    domain.resolution_failure_reason = LOCALE.maketext("This domain’s [output,abbr,DCV,Domain Control Validation] check completed correctly, but the check required [asis,HTTP] redirection. Because none of the available certificate products allow [asis,DNS]-based [asis,DCV] or [asis,HTTP] redirection for [asis,DCV], you cannot use this interface to purchase an [asis,SSL] certificate for this domain.");
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
                    api_error("DCV::check_domains_via_http", error);
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

            CertificatesService.get_provider_specific_dcv_constraints = function(provider_name) {

                var apiCall = (new APIREQUEST.Class()).initialize(
                    "Market",
                    "get_provider_specific_dcv_constraints", {
                        provider: provider_name
                    }
                );

                return _run_uapi(apiCall);
            };


            CertificatesService.ensure_domains_can_pass_dcv = function(domains, provider_name) {

                return CertificatesService.get_provider_specific_dcv_constraints(provider_name).then(function(results) {

                    return _ensure_domains_can_pass_dcv(domains, results.data);

                }, function(error) {
                    api_error("Market::get_provider_specific_dcv_constraints", error);
                });

            };

            CertificatesService.verify_login_token = function(provider, login_token, url_after_login) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "validate_login_token");
                apiCall.addArgument("login_token", login_token);
                apiCall.addArgument("url_after_login", url_after_login);
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

            CertificatesService.set_url_after_checkout = function(provider, access_token, order_id, url_after_checkout) {
                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "set_url_after_checkout");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("access_token", access_token);
                apiCall.addArgument("order_id", order_id);
                apiCall.addArgument("url_after_checkout", url_after_checkout);

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

            CertificatesService.fetch_valid_www_subject_names = function(domains, provider_name) {

                // This now requires that wwwDomainsLookup be populated.
                // We ensure that by calling fetch_domains().
                var domains_fetch = CertificatesService.fetch_domains();

                var callback = function() {
                    var www_domains = domains.filter(function(domain) {
                        return wwwDomainsLookup[ "www." + domain.domain ];
                    }).map(function(domain) {
                        return {
                            domain: "www." + domain.domain,
                            resolved: -1
                        };
                    });

                    return CertificatesService.ensure_domains_can_pass_dcv(www_domains, provider_name).then(function() {
                        return www_domains;
                    });
                };

                // NB: Promise.resolve() didn’t seem to work here;
                // the callback never was called. The below does work.

                if (domains_fetch.then) {
                    return domains_fetch.then(callback);
                }

                return callback();
            };

            // Returns a YYYY-MM-DD string
            //
            // AngularJS sets all date models as Date objects,
            // so we convert those to YYYY-MM-DD for the order.
            // It’s a bit hairy because we can’t use
            // .toISOString() since that date will be UTC, while
            // the numbers we want are the ones the user gave.
            function _date_to_yyyymmdd(the_date) {
                return [
                    the_date.getFullYear(),
                    _sprintf_02d(1 + the_date.getMonth()),
                    _sprintf_02d(the_date.getDate()),
                ].join("-");
            }

            var _request_certificates = function(provider, access_token, certificates, url_after_checkout, www_domains) {
                var www_domain_map = {};
                var failed_www_domains = [];
                www_domains.forEach(function(domain) {
                    www_domain_map[domain.domain] = domain.resolved === 1;
                    if (!www_domain_map[domain.domain]) {
                        failed_www_domains.push(domain.domain);
                    }
                });

                if (failed_www_domains.length) {
                    growl.warning(LOCALE.maketext("The following “www” [numerate,_1,domain,domains] did not resolve, so the following [numerate,_3,certificate,certificates] will not secure [numerate,_1,it,them]: [list_and_quoted,_2]", failed_www_domains.length, failed_www_domains, certificates.length));
                }

                var deferred = $q.defer();
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Market", "request_ssl_certificates");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("access_token", access_token);
                apiCall.addArgument("url_after_checkout", url_after_checkout);

                var json_certs = certificates.map(function(cert) {

                    var new_cert = {
                        product_id: cert.get_product().id,
                        subject_names: cert.get_subject_names(),
                        vhost_names: cert.get_virtual_hosts(),
                        price: cert.get_price(),
                        validity_period: cert.get_validity_period()
                    };

                    if (cert.get_product().x_identity_verification) {
                        var iden_ver = cert.get_identity_verification();

                        new_cert.identity_verification = {};
                        cert.get_product().x_identity_verification.forEach(function(idv) {
                            var k = idv.name;

                            // If the form didn’t give us any data for it,
                            // then don’t submit it.
                            if (!iden_ver[k]) {
                                return;
                            }

                            // “date” items come from AngularJS as Date objects,
                            // but they come from JSON as ISO 8601 strings.
                            if (idv.type === "date") {
                                var date_obj;

                                try {
                                    date_obj = new Date(iden_ver[k]);
                                } catch (e) {
                                    $log.warn("new Date() failed; ignoring", iden_ver[k], e);
                                }

                                if (date_obj) {
                                    new_cert.identity_verification[k] = _date_to_yyyymmdd(date_obj);
                                }
                            } else {
                                new_cert.identity_verification[k] = iden_ver[k];
                            }
                        });
                    }

                    var valid_www_domains = [];
                    new_cert.subject_names.forEach(function(subject_name) {
                        var domain = subject_name.name;

                        if (www_domain_map["www." + domain]) {
                            valid_www_domains.push( {
                                type: "dNSName",
                                name: "www." + domain,
                                dcv_method: subject_name.dcv_method,
                            } );
                        }
                    });

                    new_cert.subject_names = new_cert.subject_names.concat(valid_www_domains);

                    return JSON.stringify(new_cert);
                });

                apiCall.addArgument("certificate", json_certs);

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


            CertificatesService.request_certificates = function(provider, access_token, certificates, url_after_checkout) {

                /* build domains for www check */
                var all_domains = [];
                var cert_domains = [];

                certificates.forEach(function(certificate, cert_key) {

                    cert_domains[cert_key] = [];

                    certificate.get_domains().forEach(function(domain) {
                        if (domain.is_wildcard) {
                            return false;
                        }
                        all_domains.push(domain);
                        cert_domains[cert_key].push(domain);
                    });

                });

                /* no wwws, all wildcards or something */
                if (all_domains.length === 0) {
                    return _request_certificates(provider, access_token, certificates, url_after_checkout, all_domains);
                }

                /* www check */
                return CertificatesService.fetch_valid_www_subject_names(all_domains, provider).then(function(www_domains) {

                    return _request_certificates(provider, access_token, certificates, url_after_checkout, www_domains);

                });

            };

            CertificatesService.get_pending_certificates = function() {
                return pending_certificates;
            };

            var _assign_pending_certificates = function(new_pending) {
                pending_certificates = new_pending;
                pending_certificates.forEach(function(pcert) {

                    // Typecasts
                    pcert.order_id += "";
                    pcert.order_item_id += "";
                    pcert.product_id += "";
                });
            };

            CertificatesService.fetch_pending_certificates = function() {

                if (CPANEL.PAGE.pending_certificates) {
                    _assign_pending_certificates(CPANEL.PAGE.pending_certificates);

                    /* if exists on page load use it, but if view switching, we want to reload, so clear this variable */
                    CPANEL.PAGE.pending_certificates = null;
                    if (pending_certificates.length) {
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
                    _assign_pending_certificates(result.data);
                }, function(error) {
                    api_error("Market::pending_certificates", error);
                });

                return deferred.promise;
            };

            CertificatesService.add_raw_installed_host = function(ihost) {
                ihost.certificate.is_self_signed = parseInt(ihost.certificate.is_self_signed, 10) === 1;
                installed_hosts.push(ihost);
                installed_hosts_map[ihost.servername] = ihost;
            };

            CertificatesService.get_domain_certificate = function(domain) {
                return ssl_domains[domain];
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

            CertificatesService.get_virtual_host_certificate = function(virtual_host) {
                if ( installed_hosts ) {
                    for (var i = 0; i < installed_hosts.length; i++) {
                        if (installed_hosts[i].servername === virtual_host.display_name) {
                            return installed_hosts[i];
                        }
                    }
                }

                return installed_hosts ? installed_hosts[0] : undefined;
            };

            CertificatesService.fetch_installed_hosts = function() {
                if (installed_hosts) {
                    return true;
                }

                if (CPANEL.PAGE.installed_hosts) {
                    if (!CPANEL.PAGE.installed_hosts.length) {
                        return true; /* Defined, but no installed hosts */
                    }
                    installed_hosts = [];
                    installed_hosts_map = {};
                    ssl_domains = {};
                    angular.forEach(CPANEL.PAGE.installed_hosts, function(ihost) {
                        CertificatesService.add_raw_installed_host(ihost);
                    });
                    if (installed_hosts.length) {
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
                    installed_hosts = [];
                    installed_hosts_map = {};
                    ssl_domains = {};
                    angular.forEach(result.data, function(ihost) {
                        CertificatesService.add_raw_installed_host(ihost);
                    });
                }, function(error) {
                    api_error("SSL::installed_hosts", error);
                });

                return deferred.promise;
            };

            var _make_batch = function(calls) {
                var apiCall = new APIREQUEST.Class();

                apiCall.initialize("Batch", "strict");

                apiCall.addArgument("command", calls.map(JSON.stringify, JSON));

                return apiCall;
            };

            CertificatesService.install_certificate = function(cert, vhost_names) {
                var apiCall = _make_batch(vhost_names.map(function(vh) {
                    return [
                        "SSL",
                        "install_ssl", {
                            cert: cert,
                            domain: vh
                        }
                    ];
                }));

                return _run_uapi(apiCall);
            };

            CertificatesService.get_ssl_certificate_if_available = function(provider, order_item_id) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("Market", "get_ssl_certificate_if_available");
                apiCall.addArgument("provider", provider);
                apiCall.addArgument("order_item_id", order_item_id);

                return _run_uapi(apiCall);
            };

            CertificatesService.get_installed_ssl_for_domain = function(domain) {
                var apiCall = new APIREQUEST.Class();
                apiCall.initialize("SSL", "installed_host");
                apiCall.addArgument("domain", domain);

                return _run_uapi(apiCall);
            };

            CertificatesService.cancel_pending_ssl_certificate_and_poll = function(provider, order_item_id) {
                var apiCall = _make_batch([
                    [
                        "Market",
                        "cancel_pending_ssl_certificate", {
                            provider: provider,
                            order_item_id: order_item_id
                        }
                    ],
                    [
                        "Market",
                        "get_ssl_certificate_if_available", {
                            provider: provider,
                            order_item_id: order_item_id
                        }
                    ],
                ]);

                return _run_uapi(apiCall);
            };

            CertificatesService.cancel_pending_ssl_certificates = function(provider, order_item_ids) {
                var apiCall = _make_batch(order_item_ids.map(function(oiid) {
                    return [
                        "Market",
                        "cancel_pending_ssl_certificate", {
                            provider: provider,
                            order_item_id: oiid
                        }
                    ];
                }));

                return _run_uapi(apiCall);
            };

            CertificatesService.cancel_certificate = function(virtual_host, provider, order_item_id) {
                CertificatesService.cancel_pending_ssl_certificate(provider, order_item_id).then(function() {
                    angular.forEach(virtual_host.get_selected_domains(), function(domain) {
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
                virtual_hosts = [];
                all_domains = [];
                products = [];
                installed_hosts = null;
                purchasing_certs = [];
                ssl_domains = {};
                orders = [];
                wildcard_map = {};
            };

            CertificatesService.reset_purchasing_certificates = function() {
                purchasing_certs = [];
            };

            CertificatesService.dismiss_introduction = function() {
                introduction_dismissed = true;
            };

            CertificatesService.show_introduction_block = function() {
                return !introduction_dismissed && !growlMsg.getAllMessages().length;
            };

            return CertificatesService;
        }

        return app.factory("CertificatesService", ["VirtualHost", "Certificate", "$q", "growl", "growlMessages", "$log", CertificatesServiceFactory]);
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

        function VirtualHostsController($rootScope, $scope, $controller, $location, $filter, $timeout, $sce, $routeParams, $window, CertificatesService, IdVerDefaults, SpinnerAPI, growl, COUNTRIES, LocationService, SearchSettingsModel) {

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

            var identity_verification = {};
            $scope.identity_verification = identity_verification;

            var saved_idver = CertificatesService.get_stored_extra_settings().advanced_identity_verification;

            for (var vh = 0; vh < $scope.virtual_hosts.length; vh++) {
                var vh_name = $scope.virtual_hosts[vh].get_display_name();

                identity_verification[vh_name] = {};

                if (saved_idver && saved_idver[vh_name]) {
                    IdVerDefaults.restore_previous(identity_verification[vh_name], saved_idver[vh_name]);
                } else {
                    IdVerDefaults.set_defaults(identity_verification[vh_name]);
                }
            }

            // reset on visit to purchase certs
            angular.forEach($scope.virtual_hosts, function(virtual_host) {
                virtual_host.reset();

                /* don't show wildcards in this interface */
                virtual_host.show_wildcards = false;
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

            var default_search_values = {
                "certTerms": {
                    "1_year": true,
                    "2_year": false,
                    "3_year": false
                }
            };

            $scope.searchFilterOptions = new SearchSettingsModel(CertificatesService.get_product_search_options(), default_search_values);

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

            var build_steps = ["domains", "providers", "cert-info"];
            var qaFilter = $filter("qaSafeID");

            $scope.get_cart_certs_title = function() {
                return LOCALE.maketext("[quant,_1,Certificate,Certificates]", $scope.get_cart_items().length);
            };

            $scope.get_vhost_showing_text = function() {
                var vhosts = $filter("filter")($scope.get_virtual_hosts(), $scope.filterValue);
                return LOCALE.maketext("[output,strong,Showing] [numf,_1] of [quant,_2,website,websites]", vhosts.length, $scope.get_virtual_hosts().length);
            };

            $scope.get_domains_showing_text = function(virtual_host) {
                var num_start = 1 + virtual_host.display_meta.start;
                var num_limit = virtual_host.display_meta.limit;
                var num_of = virtual_host.get_domain_count(true);
                return LOCALE.maketext("[output,strong,Showing] [numf,_1] - [numf,_2] of [quant,_3,domain,domains].", num_start, num_limit, num_of);
            };

            $scope.deselect_unresolved_msg = function(virtual_host) {
                var unresolved_count = virtual_host.get_selected_domains().filter(function(domain) {
                    return domain.resolved === 0;
                }).length;
                return LOCALE.maketext("Deselect all unresolved domains ([numf,_1]).", unresolved_count);
            };

            $scope.go_to_pending = function(order_item_id) {
                if (order_item_id) {
                    $location.path("/pending-certificates/" + order_item_id);
                } else {
                    $location.path("/pending-certificates");
                }
            };

            $scope.pending_certificate = function(virtual_host) {
                var result = false;
                angular.forEach($scope.pending_certificates, function(pcert) {
                    angular.forEach(pcert.vhost_names, function(vhost_name) {
                        if (vhost_name === virtual_host.display_name) {
                            result = pcert.order_item_id;
                        }
                    });
                });
                return result;
            };

            $scope.get_certpanel_class = function(virtual_host) {
                if (!$scope.pending_certificate(virtual_host)) {
                    return "panel-primary";
                } else {
                    return "panel-default";
                }
            };

            $scope.view_pending_certificate = function(virtual_host) {
                var order_item_id = $scope.pending_certificate(virtual_host);
                $scope.go_to_pending(order_item_id);
            };

            $scope.get_currency_string = function(num, price_unit) {
                num += 0.001;
                var str = LOCALE.numf(num);
                str = "$" + str.substring(0, str.length - 1);
                if (price_unit) {
                    str += " " + price_unit;
                }
                return str;
            };

            $scope.get_virtual_hosts = function() {
                var virtual_hosts = $scope.virtual_hosts;
                if ($scope.filterValue) {
                    virtual_hosts = $filter("filter")(virtual_hosts, $scope.filterValue);
                }
                if ($scope.checkout_mode) {
                    virtual_hosts = $filter("filter")(virtual_hosts, {
                        added_to_cart: true
                    });
                }
                return virtual_hosts;
            };

            $scope.get_virtual_host_classes = function(virtual_host) {
                return {
                    "col-lg-4": $scope.virtual_hosts.length > 2,
                    "col-lg-6": $scope.virtual_hosts.length <= 2,
                    "panel-success": virtual_host.is_ssl
                };
            };

            $scope.get_step_panel_classes = function(virtual_host, current) {
                var classes = ["col-sm-12", "col-xs-12"];

                // add step type specific classes

                if ($scope.working_virtual_host === virtual_host.display_name) {
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
                angular.forEach($scope.get_cart_items(), function(virtual_host) {
                    price += virtual_host.get_price();
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

            $scope.get_step = function(virtual_host) {
                return virtual_host.get_step();
            };

            $scope.go_step = function(virtual_host, step) {
                if ($scope.can_step(virtual_host, step)) {
                    return virtual_host.go_step(step);
                }
            };

            $scope.focus_virtual_host = function() {

                // $scope.working_virtual_host = virtual_host.display_name;
            };

            $scope.check_selected_domains = function(virtual_host) {
                if ($scope.resolution_timeout) {
                    $timeout.cancel($scope.resolution_timeout);
                }
                if (virtual_host && virtual_host.added_to_cart) {
                    var domains = $filter("filter")(virtual_host.get_selected_domains(), function(domain) {
                        if (domain.resolved !== 1) {
                            return true;
                        }
                    });
                    if (domains.length) {
                        growl.warning(LOCALE.maketext("You have altered an item in your cart. The system has removed that item. After you make the necessary changes, add that item back to your cart."));
                        $scope.remove_from_cart(virtual_host);
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
                var provider_name = $scope.get_current_or_default_provider();
                return CertificatesService.ensure_domains_can_pass_dcv(domains, provider_name).finally(function() {
                    var to_focus_element;
                    angular.forEach(domains, function(domain) {
                        if (domain.resolved === 0 && domain.selected) {

                            /* checked domain doesn't resolve */
                            var vhost_index = CertificatesService.get_virtual_host_by_display_name(domain.vhost_name);
                            var vhost = $scope.virtual_hosts[vhost_index];
                            if (vhost && vhost.get_step() === "providers") {

                                /* if we are on the providers section, send them back to the domains section to see errors */
                                $scope.go_step(vhost, "domains");

                                /* set focus to top domain in domains list */
                                var element = $window.document.getElementById($scope.get_domain_id(domain));
                                if (element && !to_focus_element) {

                                    /* only focus first element */
                                    to_focus_element = element;
                                    $timeout(function() {
                                        to_focus_element.focus();
                                    });
                                }
                            }
                        }
                        SpinnerAPI.stop($scope.get_spinner_id(domain.domain));
                    });
                });
            };

            $scope.get_domain_id = function(domain_obj) {
                return qaFilter(domain_obj.vhost_name + "_" + domain_obj.domain);
            };

            $scope.check_product_match = function(product_a, product_b) {
                if (!product_a || !product_b) {
                    return false;
                }
                if (product_a.id === product_b.id && product_a.provider === product_b.provider) {
                    return true;
                }
            };

            $scope.can_step = function(virtual_host, step) {
                if (step === build_steps[0]) {
                    return true;
                } else if (step === build_steps[1]) {

                    // providers
                    /* can progress if domains are selected, after they are resolved they user is kicked back to domains if there is an error */
                    return virtual_host.get_selected_domains().length ? true : false;
                } else if (step === build_steps[2]) {

                    // cert-info
                    var product = virtual_host.get_product();
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

            $scope.get_product_by_id = function(provider_name, product_id) {
                return CertificatesService.get_product_by_id(provider_name, product_id);
            };

            $scope.can_next_step = function(virtual_host) {
                var current_step = virtual_host.get_step();
                var next_step;
                angular.forEach(build_steps, function(step, index) {
                    if (step === current_step) {
                        next_step = build_steps[index + 1];
                    }
                });

                return $scope.can_step(virtual_host, next_step);

            };

            $scope.next_step = function(virtual_host) {
                var current_step = virtual_host.get_step();
                var next_step;
                angular.forEach(build_steps, function(step, index) {
                    if (step === current_step) {
                        next_step = build_steps[index + 1];
                    }
                });

                if ($scope.can_step(virtual_host, next_step)) {
                    $scope.focus_virtual_host(virtual_host);
                    virtual_host.go_step(next_step);
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

            $scope.all_domains_resolved = function(virtual_host) {
                var domains = virtual_host.get_selected_domains();

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

            $scope.can_add_to_cart = function(virtual_host) {
                var product = virtual_host.get_product();
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

            $scope.add_to_cart = function(virtual_host) {
                if (!$scope.can_add_to_cart(virtual_host) || !$scope.all_domains_resolved(virtual_host)) {
                    return false;
                }
                virtual_host.added_to_cart = true;
                virtual_host.go_step("added-to-cart");

                virtual_host.set_identity_verification($scope.identity_verification[virtual_host.display_name]);

                $scope.working_virtual_host = null;
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

            $scope.get_virtual_host_certificate = function(virtual_host) {
                return CertificatesService.get_virtual_host_certificate(virtual_host);
            };

            $scope.build_csr_url = function(virtual_host) {
                var ihost = $scope.get_virtual_host_certificate(virtual_host);
                if (ihost && ihost.certificate) {
                    var url = "";
                    url += "../../ssl/install.html?id=";
                    url += encodeURIComponent(ihost.certificate.id);
                    return url;
                }
            };

            $scope.get_existing_certificate_name = function(virtual_host) {
                var ihost = $scope.get_virtual_host_certificate(virtual_host);

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

            $scope.get_domain_lock_classes = function(virtual_host) {
                var ihost = $scope.get_virtual_host_certificate(virtual_host);
                if (ihost && ihost.certificate) {
                    if (ihost.certificate.is_self_signed) {
                        return "grey-padlock";
                    } else {
                        return "green-padlock";
                    }
                }
            };

            $scope.remove_from_cart = function(virtual_host) {
                if ($rootScope.addToCartGrowl) {
                    $rootScope.addToCartGrowl.ttl = 0;
                    $rootScope.addToCartGrowl.destroy();
                    $rootScope.addToCartGrowl = null;
                }
                virtual_host.added_to_cart = false;
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
                    advanced_identity_verification: identity_verification,
                });

                if (!success) {
                    growl.error(LOCALE.maketext("Failed to save information to browser cache."));
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

        app.controller("VirtualHostsController", ["$rootScope", "$scope", "$controller", "$location", "$filter", "$timeout", "$sce", "$routeParams", "$window", "CertificatesService", "IdVerDefaults", "spinnerAPI", "growl", "CountriesService", "LocationService", "SearchSettingsModel", VirtualHostsController]);


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
        "cjt/directives/quickFiltersDirective",
        "cjt/decorators/growlDecorator"
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
            "growl",
            "CountriesService",
            "Certificate",
            "LocationService",
            "SearchSettingsModel",
            function($rootScope, $scope, $controller, $location, $filter, $timeout, $sce, $routeParams, $window, CertificatesService, IdVerDefaults, growl, COUNTRIES, Certificate, LocationService, SearchSettingsModel) {

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

                var saved_idver = CertificatesService.get_stored_extra_settings().simple_identity_verification;
                if (saved_idver) {
                    IdVerDefaults.restore_previous($scope.identity_verification, saved_idver);
                } else {
                    IdVerDefaults.set_defaults($scope.identity_verification);
                }

                // reset on visit to purchase certs
                angular.forEach($scope.virtual_hosts, function(virtual_host) {
                    virtual_host.reset();

                    /*  ensure wildcards are shown in this interface */
                    virtual_host.show_wildcards = true;
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

                var default_search_values = {
                    "certTerms": {
                        "1_year": true,
                        "2_year": false,
                        "3_year": false
                    }
                };

                $scope.searchFilterOptions = new SearchSettingsModel(CertificatesService.get_domain_search_options());
                $scope.productSearchFilterOptions = new SearchSettingsModel(CertificatesService.get_product_search_options(), default_search_values);

                $scope.displayProxySubdomains = true;

                $scope.filter_domains = function(domains) {

                    var filtered_domains = domains;

                    if ($scope.meta.filterValue) {
                        filtered_domains = $filter("filter")(filtered_domains, $scope.meta.filterValue);
                    }

                    filtered_domains = $scope.searchFilterOptions.filter(filtered_domains);

                    return filtered_domains;
                };

                $scope.filter_products = function(products) {

                    var filtered_products = products;

                    var selected_domains = $scope.selected_domains;
                    var wildcard_domains = $filter("filter")(selected_domains, {
                        is_wildcard: true
                    });

                    filtered_products = $filter("filter")(filtered_products, function(product) {
                        if (!product.wildcard_price && wildcard_domains.length) {
                            return;
                        } else if (!product.price && selected_domains.length - wildcard_domains.length > 0) {
                            return;
                        }
                        return true;
                    });

                    if ($scope.meta.productFilterValue) {
                        filtered_products = $filter("filter")(filtered_products, $scope.meta.productFilterValue);
                    }

                    filtered_products = $scope.productSearchFilterOptions.filter(filtered_products);

                    return filtered_products;
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

                $scope.select_domain = function(selected_domain) {
                    if (selected_domain.selected && selected_domain.is_wildcard) {

                        // select domains covered by this wildcard
                        var covered_domains = $filter("filter")($scope.domains, function(domain) {
                            return CertificatesService.compare_wildcard_domain(selected_domain, domain.domain);
                        });
                        $scope.toggle_values(covered_domains, "selected", true);
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
                        if (!ihost.certificate.is_self_signed) {
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
                    var order_item_id = $scope.pending_certificate(domain);
                    $scope.go_to_pending(order_item_id);
                };

                $scope.go_to_pending = function(order_item_id) {
                    if (order_item_id) {
                        $location.path("/pending-certificates/" + order_item_id);
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

                $scope.get_virtual_host_by_display_name = function(vhost_name) {
                    var vhost_index = CertificatesService.get_virtual_host_by_display_name(vhost_name);
                    return $scope.virtual_hosts[vhost_index];
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
                    var provider_name = $scope.get_current_or_default_provider();
                    return CertificatesService.ensure_domains_can_pass_dcv(domains, provider_name);
                };

                $scope.get_current_or_default_provider = function() {

                    var product_obj = $scope.get_product();

                    /* if it's set, use that */
                    if (product_obj) {
                        var product = $scope.get_product_by_id(product_obj.provider, product_obj.id);
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


                $scope.get_other_vhost_domains = function(match_domain) {
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
                        if (domain.domain === match_domain.domain) {
                            return false;
                        }
                        if (domain.virtual_host !== match_domain.virtual_host) {
                            return false;
                        }
                        return true;
                    });
                };

                $scope.get_selected_vhosts = function() {
                    var covered_domains = $scope.get_covered_domains();
                    var covered_selected_domains = _.filter( covered_domains, { selected: true } );
                    return _.uniq(covered_selected_domains.map(function(domain) {
                        return domain.virtual_host;
                    }));
                };

                function _domain_is_on_partial_vhost(domain) {
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
                    return $scope.domains.some(_domain_is_on_partial_vhost);
                };

                $scope.get_partial_vhost_domains = function() {
                    return $scope.domains.filter(_domain_is_on_partial_vhost);
                };

                $scope.get_undercovered_vhost_message = function(other_domains) {
                    var flat_domains = other_domains.map(function(domain) {
                        return domain.domain;
                    });
                    var msg = "";
                    msg += "<p>" + LOCALE.maketext("The certificate will secure some, but not all, of the domains on websites on which they exist.") + "</p>";
                    msg += "<p>" + LOCALE.maketext("If you choose to continue, the certificate will not secure the following [numerate,_1,domain,domains], and because a certificate will exist on their website, you may have to purchase a new certificate to secure all of these domains later. [list_and_quoted,_2]", flat_domains.length, flat_domains) + "</p>";
                    return msg;
                };

                $scope.add_partial_vhost_domains = function(domains) {
                    $scope.toggle_values(domains, "selected", true);
                    $scope.update_selected_domains();
                    $scope.check_selected_domains();

                    /* send them back to domains to watch for failures */
                    $scope.goto("domains");
                };

                $scope.get_other_domains_msg = function(domain, other_domains) {
                    var flat_domains = other_domains.map(function(domain) {
                        return domain.domain;
                    });
                    var msg = "";
                    msg += "<p>" + LOCALE.maketext("This certificate will not secure [quant,_2,other domain,other domains] on the same website as “[_1]”.", domain.domain, flat_domains.length) + "</p>";
                    msg += "<p>" + LOCALE.maketext("Because you cannot secure a single website with multiple certificates, in order to secure any unselected [numerate,_1,domain,domains] in the future, you would need to purchase a new certificate to secure all of these domains.", flat_domains.length) + "</p>";
                    msg += "<p>" + LOCALE.maketext("Would you like to secure the following additional [numerate,_2,domain,domains] with this certificate? [list_and_quoted,_1]", flat_domains, flat_domains.length) + "</p>";
                    return msg;
                };

                $scope.get_covered_domains = function() {
                    return $filter("filter")($scope.domains, function(domain) {
                        if (domain.selected || $scope.domain_covered_by_wildcard(domain)) {
                            return true;
                        }
                    });
                };

                $scope.get_other_wildcard_domains = function(match_domain) {
                    if (!match_domain.is_wildcard) {
                        return false;
                    }
                    return $filter("filter")($scope.domains, function(domain) {
                        if (domain.selected) {
                            return false;
                        }
                        if (domain.is_wildcard) {
                            return false;
                        }
                        if (domain.domain === match_domain.domain) {
                            return false;
                        }
                        if (CertificatesService.compare_wildcard_domain(match_domain, domain.domain) === false) {
                            return false;
                        }
                        return true;
                    });
                };

                function _is_failed_dcv_domain(domain) {
                    return domain.resolved !== 1;
                }

                $scope.has_failed_dcv_domains = function() {
                    return $scope.selected_domains.some(_is_failed_dcv_domain);
                };

                $scope.get_failed_dcv_domains = function() {
                    return $scope.selected_domains.filter(_is_failed_dcv_domain);
                };

                $scope.get_failed_dcv_message = function(failed_dcv_domains) {
                    var flat_domains = failed_dcv_domains.map(function(domain) {
                        return domain.domain;
                    });
                    var msg = "";
                    msg += "<p>" + LOCALE.maketext("The following [numerate,_2,domain,domains] failed [numerate,_2,its,their] [output,abbr,DCV,Domain Control Validation] check: [list_and_quoted,_1]", flat_domains, flat_domains.length) + "</p>";
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
                    var coverage_domain = CertificatesService.domain_covered_by_wildcard(domain.domain);
                    if (coverage_domain && coverage_domain.selected) {
                        return coverage_domain;
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

                $scope.get_currency_string = function(num, price_unit) {
                    num += 0.001;
                    var str = LOCALE.numf(num);
                    str = "$" + str.substring(0, str.length - 1);
                    if (price_unit) {
                        str += " " + price_unit;
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
                    growl.warning(LOCALE.maketext("You cannot check out until you resolve all errors (in red)."));
                };

                $scope.cant_products_msg = function() {
                    growl.warning(LOCALE.maketext("You need to select at least one domain before you can select a product."));
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
                    var product_obj = $scope.get_product_by_id(product.provider, product.id);
                    if (!product_obj) {
                        return "";
                    }
                    return product_obj.display_name;
                };

                $scope.get_product_by_id = function(provider_name, product_id) {
                    return CertificatesService.get_product_by_id(provider_name, product_id);
                };

                $scope.check_product_match = function(product_a) {
                    var product_b = $scope.get_product();

                    if (!product_a || !product_b) {
                        return false;
                    }
                    if (product_a.id === product_b.id && product_a.provider === product_b.provider) {
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
                    var price_string = $scope.get_currency_string($scope.calculate_product_price(product));
                    return "(" + LOCALE.maketext("[_1] total", price_string, product.price_unit) + ")";
                };

                var _calculate_product_price = function(product, nonwildcards, wildcards) {

                    // No product, possible during transition to other page.
                    if (!product) {
                        return;
                    }

                    var total_price = 0;

                    if (wildcards.length && product.wildcard_price) {
                        total_price += wildcards.length * product.wildcard_price;
                    }
                    if (nonwildcards.length && product.price) {
                        total_price += nonwildcards.length * product.price;
                    }

                    // product includes main domain free
                    if (product.wildcard_parent_domain_included) {

                        // adjust for main domains that are covered by wildcard domains
                        // subtract the price of the main domain for each wildcard domain

                        var nonwildcard_keys = {};
                        nonwildcards.forEach(function(domain) {
                            nonwildcard_keys[domain.domain] = domain;
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
                            var truly_stripped = domain.domain.replace(/^\*\./, "");

                            if (nonwildcard_keys[truly_stripped]) {
                                total_price -= product.price;
                            }
                        });
                    }

                    return total_price;
                };

                $scope.calculate_product_price = function(product) {
                    var selected_domains = $scope.selected_domains;

                    var wildcard_domains = $filter("filter")(selected_domains, {
                        is_wildcard: true
                    });

                    var non_wildcard_domains = $filter("filter")(selected_domains, {
                        is_wildcard: false
                    });

                    return _calculate_product_price(product, non_wildcard_domains, wildcard_domains);
                };


                $scope.set_product = function(product) {
                    $scope.current_certificate.set_product(product);
                };

                $scope.get_product = function() {
                    return $scope.current_certificate.get_product();
                };

                $scope.get_product_prices = function() {
                    var prices = [];
                    var selected_domains = $scope.selected_domains;
                    var wildcard_domains = selected_domains.filter(function(domain) {
                        if (domain.is_wildcard) {
                            return true;
                        }
                        return false;
                    });
                    var non_wildcard_domains = selected_domains.filter(function(domain) {
                        if (!domain.is_wildcard) {
                            return true;
                        }
                        return false;
                    });

                    $scope.filteredProductList.forEach(function(product) {
                        var price = _calculate_product_price(product, non_wildcard_domains, wildcard_domains);
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

                        var main_domain = CertificatesService.get_domain_by_domain(domain.stripped_domain);
                        if (!main_domain.selected) {
                            $scope.missing_base_domains.push(main_domain);
                        }

                    });

                    if ($scope.missing_base_domains.length) {
                        var flat_domains = $scope.missing_base_domains.map(function(domain) {
                            return domain.domain;
                        });
                        growl.info(LOCALE.maketext("Because wildcard certificates require their parent domains, the system added the following [numerate,_1,domain,domains] for you: [list_and_quoted,_2]", flat_domains.length, flat_domains));
                        $scope.select_baseless_wildcard_domains($scope.missing_base_domains);
                    }
                };

                $scope.select_baseless_wildcard_domains = function(missing_domains) {
                    $scope.toggle_values(missing_domains, "selected", true);
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

                    var total_price = $scope.calculate_product_price(product);
                    $scope.current_certificate.set_price(total_price);

                    return total_price;
                };

                $scope.get_cart_strings = function() {
                    return $scope.cart_price_strings;
                };

                $scope.update_cart_strings = function() {
                    var product = $scope.get_product();
                    var product_prices = $scope.get_product_prices();
                    var selected_domains = $scope.selected_domains;

                    var cart_price = {
                        min: 0,
                        max: 0
                    };
                    if (product && selected_domains.length) {
                        cart_price.min = $scope.get_currency_string($scope.get_cart_price(), "USD");
                    } else if (selected_domains.length) {

                        cart_price.min = $scope.get_currency_string($scope.get_min_price(), "USD");

                        if (product_prices.length > 1) {
                            cart_price.max = $scope.get_currency_string($scope.get_max_price(), "USD");
                        }

                    } else {

                        // If no other value, ensure that it is not empty so it does not jump when a domain is selected
                        $scope.cart_price_strings = false;
                    }
                    $scope.cart_price_strings = cart_price;
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
                        growl.error(LOCALE.maketext("Failed to save information to browser cache."));
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
                            var a_per = $scope.meta.filterValue.length / a.domain.length;
                            var b_per = $scope.meta.filterValue.length / b.domain.length;

                            return a_per < b_per ? -1 : 1;
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
                        var preselect_domains = $routeParams["domain"];
                        if (_.isString(preselect_domains)) {
                            preselect_domains = [preselect_domains];
                        }
                        angular.forEach(preselect_domains, function(domain) {
                            var dom_obj = CertificatesService.get_domain_by_domain(domain);
                            if (dom_obj) {
                                dom_obj.selected = true;
                            }
                        });
                    }

                    var product_search_options = CertificatesService.get_product_search_options();

                    var default_search_values = {
                        "certTerms": {
                            "1_year": true,
                            "2_year": false,
                            "3_year": false
                        }
                    };

                    if ($routeParams["certificate_type"]) {
                        var preselect_certificate_types = $routeParams["certificate_type"];
                        if (_.isString(preselect_certificate_types)) {
                            preselect_certificate_types = [preselect_certificate_types];
                        }

                        var validationType = {};

                        // Assume that if these aren't set in any products (since they are optional, after all) that it is 'all' -- CPANEL-12128.
                        if (typeof product_search_options.validationType === "undefined") {
                            validationType["all"] = true;
                        } else {
                            angular.forEach(product_search_options.validationType.options, function(option) {
                                validationType[option.value] = preselect_certificate_types.indexOf(option.value) !== -1;
                            });
                        }
                        default_search_values["validationType"] = validationType;

                    }

                    $scope.searchFilterOptions = new SearchSettingsModel(CertificatesService.get_domain_search_options());
                    $scope.productSearchFilterOptions = new SearchSettingsModel(CertificatesService.get_product_search_options(), default_search_values);

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
        "cjt/decorators/growlDecorator",
        "uiBootstrap",
    ],
    function(_, angular, $, LOCALE, QUERY) {
        "use strict";

        var app = angular.module("App");

        function CheckoutController($scope, $controller, $location, $filter, $routeParams, $window, $timeout, CertificatesService, spinnerAPI, growl, $q, $modal, $log, Certificate, LocationService) {

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
                var step_index = $scope.get_step_index(provider.name, step);
                var cols = Math.floor(12 / steps);
                var classes = ["col-xs-12", "col-sm-12", "col-md-" + cols, "col-lg-" + cols, "checkout-step"];
                if ($scope.current_step_index === step_index) {
                    classes.push("checkout-step-current");
                    if ("checkout_complete" === step) {
                        classes.push("checkout-step-completed");
                    }
                } else if ($scope.current_step_index > step_index) {
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

            $scope.get_steps = function(provider_name) {
                if (steps[provider_name]) {
                    return steps[provider_name];
                }
                return steps["default"];
            };

            $scope.get_current_step = function() {
                return $scope.steps[$scope.current_step_index];
            };

            $scope.get_step_index = function(provider_name, step) {
                for (var i = 0; i < $scope.steps.length; i++) {
                    if ($scope.steps[i].provider === provider_name && $scope.steps[i].step === step) {
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
                var bad_keys = [];
                var too_many_keys = [];
                angular.forEach(keys, function(key) {
                    var value = $scope.get_param(key);
                    if (!value) {
                        bad_keys.push(key);
                    } else if (value instanceof Array) {
                        too_many_keys.push(key);
                    }
                });

                if (bad_keys.length) {
                    growl.error(LOCALE.maketext("The following [numerate,_1,parameter is,parameters are] required but [numerate,_1,does,do] not appear in the [asis,URL]: [list_and_quoted,_2]", bad_keys.length, bad_keys));
                }

                if (too_many_keys.length) {
                    growl.error(LOCALE.maketext("The following [numerate,_1,parameter appears,parameters appear] more than once in the [asis,URL]: [list_and_quoted,_2]", too_many_keys.length, too_many_keys));
                }

                return bad_keys.length || too_many_keys.length ? false : true;
            };

            $scope.in_debug_mode = false;

            $scope.get_route_url = function() {
                var route_url = "";
                route_url += $location.absUrl().replace(/tls_wizard\/.+/, "tls_wizard/#/purchase");
                return route_url;
            };

            function _pem_to_base64(pem) {
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
            //  _q_all_with_err_index( [ prA, prB, prC ] )
            //
            // ...and “prB” fails with the string "hahaha", the
            // failure callback will receive [ 1, "hahaha" ].
            //
            // TODO: Consider making this a reusable component, along with
            // altered logic that, in the event of failure, will wait to see
            // if more of the promises fail and actually indicate what each
            // promise did.
            //
            function _q_all_with_err_index(promises_array) {
                if (!(promises_array instanceof Array)) {
                    throw "Only arrays here!";
                }

                return $q.all(promises_array.map(function(p, i) {
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

                var next_step = $scope.get_next_step();
                var order_id = $scope.get_param("order_id");
                var login_code = $scope.get_param("code");
                var order = CertificatesService.get_order_by_id(order_id);
                var order_status = $scope.get_param("order_status");
                var provider = $scope.get_provider_by_name(step.provider);
                var access_token = $scope.get_param("access_token");
                var ret_url;

                if (step.step === "login") {
                    ret_url = $scope.get_route_url() + $scope.get_step_url(step);
                    if (order) {
                        ret_url += "?order_id=" + order.order_id;
                    }
                    if (login_code) {

                        /* Back from Login, Verify It */
                        CertificatesService.verify_login_token(step.provider, login_code, ret_url).then(function(result) {
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
                        }, function(error_html) {
                            $scope.return_to_wizard();
                            growl.error(LOCALE.maketext("The system encountered an error as it attempted to verify the login token: [_1]", error_html) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                        });
                    } else {

                        /* There's no login code */
                        CertificatesService.get_store_login_url(step.provider, ret_url).then(function(result) {
                            $window.location.href = result.data;
                        }, function(error_html) {
                            $scope.return_to_wizard();
                            growl.error(LOCALE.maketext("The system encountered an error as it attempted to get the store login [output,abbr,URL,Uniform Resource Location]: [_1]", error_html) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                        });
                    }
                } else if (step.step === "send_cart_items") {

                    /* create order / build cart */
                    if (!$scope.require_params(["access_token"])) {
                        return;
                    }
                    ret_url = $scope.get_route_url() + $scope.get_step_url(next_step);
                    return CertificatesService.request_certificates(step.provider, access_token, provider.certificates).then(function(result) {
                        var order = result.data;
                        order.order_id = order.order_id.toString();

                        CertificatesService.add_order(order);
                        CertificatesService.save();

                        $scope.go_step(step.provider, "checkout", {
                            order_id: order.order_id,
                            access_token: access_token
                        });
                    }, function(error_html) {
                        $scope.return_to_wizard();
                        growl.error(LOCALE.maketext("The system encountered an error as it attempted to request the [asis,SSL] [numerate,_2,certificate,certificates]: [_1]", error_html, $scope.get_provider_by_name(step.provider).certificates.length) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                    });
                } else if (step.step === "checkout") {
                    if (!$scope.require_params(["order_id"])) {
                        return;
                    }
                    ret_url = $scope.get_route_url() + $scope.get_step_url(step);
                    if (order_status) {

                        /* are we back from checking out? */
                        $scope.go_step(step.provider, "payment_callback", {
                            order_id: order.order_id,
                            order_status: order_status
                        });
                    } else {
                        if (!$scope.require_params(["access_token"])) {
                            return;
                        }

                        /* no? let's update the checkout url and head to checkout */
                        CertificatesService.set_url_after_checkout(step.provider, access_token, order.order_id, ret_url).then(function() {
                            $window.location.href = order.checkout_url;
                        }, function(response) { // NB: the argument is *not* the error!
                            var is_other_user = response.data && response.data.error_type === "OrderNotFound";

                            if (is_other_user) {
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
                                growl.error(LOCALE.maketext("The system encountered an error as it attempted to set the [asis,URL] after checkout: [_1]", _.escape(response.error)) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                            }

                        });
                    }
                } else if (step.step === "payment_callback") {

                    /* post checkout processing */
                    CPANEL.PAGE.pending_certificates = null;
                    CPANEL.PAGE.installed_hosts = null;
                    if (order_status === "success") {
                        growl.success(LOCALE.maketext("You have successfully completed your certificate order (order ID “[_1]”). If you need help with this order, use the support [numerate,_2,link,links] below.", _.escape(order_id), order.certificates.length));

                        CertificatesService.set_confirmed_status_for_ssl_certificates(step.provider, order).then(function() {

                            // successful
                            $scope.go_step(step.provider, next_step.step);
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
                                var not_found = response.data.order_item_ids;

                                var msg = LOCALE.maketext("There are no pending certificates from “[_1]” with the following order item [numerate,_2,ID,IDs]: [join,~, ,_3]. The system will now verify that the [numerate,_2,certificate has,certificates have] been issued and installed.", _.escape(step.provider), not_found.length, not_found.map(_.escape.bind(_)));

                                growl.info(msg);

                                var certificates = provider.certificates;

                                not_found.forEach(function(oiid) {

                                    // Fetch the new SSL cert.
                                    var provider_promise = CertificatesService.get_ssl_certificate_if_available(step.provider, oiid);

                                    // There will only be one vhost
                                    // per certificate for now, but with
                                    // wildcard support that could change.
                                    certificates.forEach(function(cert) {

                                        cert.get_virtual_hosts().forEach(function(vhost_name) {
                                            var domain = cert.get_domains().filter(function(domain) {
                                                return domain.virtual_host === vhost_name;
                                            }).pop().domain;

                                            var big_p = _q_all_with_err_index([
                                                CertificatesService.get_installed_ssl_for_domain(),
                                                provider_promise
                                            ]);

                                            big_p.then(function yay(responses) {
                                                var installed_pem = responses[0].data.certificate.text;
                                                var installed_b64;

                                                if (installed_pem) {
                                                    installed_b64 = _pem_to_base64(installed_pem);
                                                }

                                                var provider_pem = responses[1].data.certificate_pem;
                                                var provider_b64;
                                                if (provider_pem) {
                                                    provider_b64 = _pem_to_base64(provider_pem);
                                                } else {
                                                    var status_code = responses[1].data.status_code;

                                                    // There is ambiguity over the spelling of “canceled”.
                                                    if (/OrderCancell?ed/.test(status_code)) {
                                                        growl.error(LOCALE.maketext("“[_1]” indicated that the order with [asis,ID] “[_2]” has been canceled.", _.escape(step.provider), _.escape(order_id)));
                                                    } else if (/OrderItemCancell?ed/.test(status_code)) {
                                                        growl.error(LOCALE.maketext("“[_1]” indicated that the certificate with order item [asis,ID] “[_2]” has been canceled.", _.escape(step.provider), _.escape(oiid)));
                                                    } else {
                                                        growl.error(LOCALE.maketext("“[_1]” has not issued a certificate for order item [asis,ID] “[_2]”. Contact them for further assistance.", _.escape(step.provider), _.escape(oiid)));
                                                    }

                                                    // Since there’s no new certificate,
                                                    // there’s nothing more we can do.
                                                    LocationService.go_to_last_create_route();
                                                    return;
                                                }

                                                if (provider_b64 === installed_b64) {

                                                    // This is the most optimal outcome:
                                                    // we confirmed that the new cert is
                                                    // installed, as the user wanted.

                                                    growl.success(LOCALE.maketext("The system confirmed that the certificate for the website “[_1]” is installed.", _.escape(vhost_name)));

                                                    // We still want to reset and have them
                                                    // re-evaluate the rest of the order
                                                    // since we had something “unexpected” happen.
                                                    // (...right??...?)
                                                    LocationService.go_to_last_create_route();
                                                } else {

                                                    // We’re here because there’s a new
                                                    // certificate, but it’s not installed.
                                                    // The user has asked for that installation,
                                                    // so let’s see if we can finish the job.

                                                    if (installed_b64) {
                                                        growl.info(LOCALE.maketext("“[_1]” has an [asis,SSL] certificate installed, but it is not the certificate that you just ordered (order item [asis,ID] “[_2]”). The system will now install this certificate.", _.escape(vhost_name), _.escape(oiid)));
                                                    } else {
                                                        var no_cert_msg;
                                                        no_cert_msg = LOCALE.maketext("You do not have an [asis,SSL] certificate installed for the website “[_1]”.", _.escape(vhost_name));

                                                        no_cert_msg += LOCALE.maketext("The system will now install the new certificate.");

                                                        growl.info(no_cert_msg);
                                                    }

                                                    CertificatesService.install_certificate(provider_pem, [domain]).then(
                                                        function yay() {
                                                            growl.success(LOCALE.maketext("The system installed the certificate onto the website “[_1]”.", _.escape(vhost_name)));
                                                        },
                                                        function nay(error_html) {
                                                            growl.error(LOCALE.maketext("The system failed to install the certificate onto the website “[_1]” because of the following error: [_2]", _.escape(vhost_name), error_html));
                                                        }
                                                    ).then(LocationService.go_to_last_create_route);
                                                }

                                            },
                                            function onerror(idx_and_response) {

                                                // We’re here because we failed either
                                                // to fetch the new cert or to query
                                                // the current SSL state.

                                                var promise_i = idx_and_response[0];
                                                var error_html = idx_and_response[1];

                                                if (promise_i === 0) {
                                                    growl.error(LOCALE.maketext("The system failed to locate the installed [asis,SSL] certificate for the website “[_1]” because of the following error: [_2]", _.escape(vhost_name), error_html));
                                                } else if (promise_i === 1) {
                                                    growl.error(LOCALE.maketext("The system failed to query “[_1]” for order item [asis,ID] “[_2]” ([_3]) because of the following error: [_4]", _.escape(step.provider), _.escape(oiid), _.escape(vhost_name), error_html));
                                                } else {

                                                    // should never happen
                                                    growl.error("Unknown index: " + promise_i);
                                                }

                                                LocationService.go_to_last_create_route();
                                            });
                                        });
                                    });
                                });
                            } else {
                                var error_html = response.error;
                                growl.error(LOCALE.maketext("The system failed to begin polling for [quant,_2,new certificate,new certificates] because of an error: [_1]", error_html, $scope.certificates_count) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                            }
                        });

                        // get info from local storage
                    } else {
                        if (order_status === "error") {
                            CertificatesService.reset();
                            CertificatesService.save();
                            $scope.return_to_wizard();
                            growl.error(LOCALE.maketext("The system encountered an error as it attempted to complete your transaction.") + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                        } else if (/^cancel?led$/.test(order_status)) { // cPStore gives two l’s
                            var order_item_ids = [];
                            angular.forEach(order.certificates, function(cert) {
                                order_item_ids.push(cert.order_item_id);
                            });
                            growl.warning(LOCALE.maketext("You seem to have canceled your transaction.") + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                            $location.url($location.path()); // clear out the params so we do not get a cancel on subsequent orders
                            CertificatesService.cancel_pending_ssl_certificates(step.provider, order_item_ids).then(function() {

                                /* need to clear old unused in page data to get a fresh load */
                                CertificatesService.reset();
                                CertificatesService.save();
                                $scope.return_to_wizard();
                            }, function(error_html) {
                                growl.error(LOCALE.maketext("The system encountered an error as it attempted to cancel your transaction: [_1]", error_html) + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                            });
                        }
                        return false;
                    }
                } else if (step.step === "checkout_complete") {

                    // go next step or to done page
                    if (!next_step) {
                        CertificatesService.reset();
                        CertificatesService.save();

                        // done
                        growl.success(LOCALE.maketext("The system has completed the [numerate,_1,purchase,purchases] and will begin to poll for your [numerate,_2,certificate,certificates].", $scope.providers.length, $scope.certificates_count));
                        $timeout($scope.go_to_pending, 1000);
                    }
                }
            };

            $scope.return_to_wizard = function() {
                var cur_url = $location.absUrl();

                // force reset for specific cases, use path redirect otherwise;
                // this allows us to not clear growl notifications if we don't have to.
                // could be replaced with replaceState if we ever get to IE11
                if ($scope.get_param("code")) {
                    var new_url = cur_url.replace(/([^#?]+\/).*/, "$1#" + LocationService.last_create_route());
                    $window.location.href = new_url;
                } else {
                    LocationService.go_to_last_create_route();
                }
            };

            $scope.check_step_success = function(step_index) {
                if (step_index < $scope.current_step_index) {
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

            $scope.go_to_pending = function(order_item_id) {
                if (order_item_id) {
                    $location.path("/pending-certificates/" + order_item_id);
                } else {
                    $location.path("/pending-certificates");
                }
            };

            $scope.pending_certificate = function(virtual_host) {
                var result = false;
                angular.forEach($scope.pending_certificates, function(pcert) {
                    angular.forEach(pcert.vhost_names, function(vhost_name) {
                        if (vhost_name === virtual_host.display_name) {
                            result = pcert.order_item_id;
                        }
                    });
                });
                return result;
            };

            $scope.view_pending_certificate = function(virtual_host) {
                var order_item_id = $scope.pending_certificate(virtual_host);
                $scope.go_to_pending(order_item_id);
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
                            return;
                        }
                        if (!CertificatesService.get_product_by_id(product.provider, product.id)) {
                            $log.warn("Unknown product!", product);
                            return;
                        }
                        return true;
                    }).forEach(function(virtual_host) {
                        var product = virtual_host.get_product();
                        var cert = new Certificate();
                        cert.set_product(product);
                        cert.set_price(virtual_host.get_price());
                        cert.set_domains(virtual_host.get_selected_domains());
                        cert.set_virtual_hosts([virtual_host.display_name]);

                        if (product.x_identity_verification) {
                            var id_ver = virtual_host.get_identity_verification();

                            // It’s ok if we don’t have the idver because
                            // that means we’re resuming a checkout, which
                            // means that the idver is already sent in, and
                            // the only reason we’re assembling cert/vhost/etc.
                            // is so that the controller can quantify the
                            // domains propertly in localization.
                            if (id_ver) {
                                cert.set_identity_verification(id_ver);
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

        app.controller("CheckoutController", ["$scope", "$controller", "$location", "$filter", "$routeParams", "$window", "$timeout", "CertificatesService", "spinnerAPI", "growl", "$q", "$uibModal", "$log", "Certificate", "LocationService", CheckoutController]);
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
        "cjt/directives/actionButtonDirective",
        "cjt/decorators/growlDecorator"
    ],
    function(_, angular, LOCALE) {
        "use strict";

        var app = angular.module("App");

        function PendingCertificatesController($scope, $location, $routeParams, $anchorScroll, $timeout, $window, CertificatesService, growl, LocationService, Certificate) {

            var provider_display_name = {};
            CPANEL.PAGE.products.forEach(function(p) {
                provider_display_name[p.provider] = p.provider_display_name;
            });

            $scope.show_introduction_block = CertificatesService.show_introduction_block;

            $scope.get_provider_display_name = function(provider) {
                return provider_display_name[provider] || provider;
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

            $scope.get_product_by_id = function(provider_name, product_id) {
                return CertificatesService.get_product_by_id(provider_name, product_id);
            };

            $scope.get_cert_title = function(cert) {
                var sorted_domains = cert.domains.sort(function(a, b) {
                    if (a.length === b.length) {
                        return 0;
                    }
                    return a.length > b.length ? 1 : -1;
                });

                if (sorted_domains.length === 1) {
                    return sorted_domains[0];
                } else {
                    return LOCALE.maketext("“[_1]” and [quant,_2,other domain,other domains]", sorted_domains[0], sorted_domains.length - 1);
                }

            };

            $scope.check_pending_queue = function() {
                return CertificatesService.process_ssl_pending_queue().then(function(result) {

                    // ----------------------------------------
                    // The intent here is to show at least one growl, always:
                    //
                    //  - growl (info) for each canceled cert
                    //
                    //  - growl (success) for each installed cert
                    //
                    //  - If we canceled nor installed any certificates,
                    //    growl (info) about no-op.
                    // ----------------------------------------

                    var installed = [];
                    var canceled_count = 0;

                    result.data.forEach(function(oi) {
                        if (oi.installed) {
                            installed.push(oi);
                        } else {
                            /* jshint indent: false */
                            switch (oi.last_status_code) {
                                case "OrderCanceled":
                                case "OrderItemCanceled":
                                    canceled_count++;

                                    var provider_display_name = $scope.get_provider_display_name(oi.provider);

                                    var domains = oi.domains;
                                    if (domains.length === 1) {
                                        growl.info(LOCALE.maketext("“[_1]” reports that the certificate for “[_2]” has been canceled.", _.escape(provider_display_name), _.escape(domains[0])));
                                    } else {
                                        growl.info(LOCALE.maketext("“[_1]” reports that the certificate for “[_2]” and [quant,_3,other domain,other domains] has been canceled.", _.escape(provider_display_name), _.escape(domains[0]), domains.length - 1));
                                    }

                                    break;
                            }
                            /* jshint indent: 4 */
                        }
                    });

                    if (installed.length) {
                        var vhosts = [];

                        angular.forEach(installed, function(order_item) {
                            vhosts = vhosts.concat(order_item.vhost_names);
                        });
                        growl.success(LOCALE.maketext("[numerate,_2,A certificate,Certificates] for the following [numerate,_2,website was,websites were] available, and the system has installed [numerate,_2,it,them]: [list_and_quoted,_1]", vhosts, installed.length));
                    } else if (!canceled_count) { // We mentioned canceled and installed certificates earlier.
                        growl.info(LOCALE.maketext("The system processed the pending certificate queue successfully, but [numerate,_1,your pending certificate was not,none of your pending certificates were] available.", result.data.length));
                    }

                    return CertificatesService.fetch_pending_certificates().then(function() {
                        $scope.pending_certificates = CertificatesService.get_pending_certificates();
                        if ($scope.pending_certificates.length === 0) {
                            growl.info(LOCALE.maketext("You have no more pending [asis,SSL] certificates.") + " " + LOCALE.maketext("You will now return to the beginning of the wizard."));
                            CertificatesService.reset();

                            /* clear page-loaded domains and installed hosts to ensure we show the latests when we redirect to the purchase wizard */
                            CPANEL.PAGE.installed_hosts = null;
                            CPANEL.PAGE.domains = null;
                            $scope.get_new_certs();
                        } else {
                            $scope.prepare_pending_certificates();
                        }
                    });
                }, growl.error.bind(growl));

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
                    var cert_pem = payload.certificate_pem;

                    var provider_html = _.escape($scope.get_provider_display_name(cert.provider));

                    if (cert_pem) {

                        // XXX Prompt to contact support?
                        // XXX use info rather than success?
                        growl.info(LOCALE.maketext("You have canceled this order, but “[_1]” already issued the certificate. The system will now install it. ([output,url,_2,Do you need help with this order?])", provider_html, cert.support_uri));
                        CertificatesService.install_certificate(
                            cert_pem,
                            cert.vhost_names
                        ).then(
                            function() {
                                growl.success(LOCALE.maketext("The system has installed the new [asis,SSL] certificate on to the [numerate,_1,website,websites] [list_and_quoted,_2].", cert.vhost_names.length, cert.vhost_names));
                            },
                            function(error_html) {
                                growl.error(LOCALE.maketext("The system failed to install the new [asis,SSL] certificate because of an error: [_1]", error_html));
                            }
                        );
                    } else if (payload.status_code === "RequiresApproval") {
                        growl.info(LOCALE.maketext("The system has canceled the request for this certificate; however, “[_1]” was already waiting on approval before processing your order. To ensure that this certificate order is canceled, you must [output,url,_2,contact support directly].", provider_html, cert.support_uri));
                    } else if (payload.status_code === "OrderCanceled") {
                        growl.info(LOCALE.maketext("This certificate’s order (ID “[_1]”) was already canceled directly via “[_2]”.", _.escape(cert.order_id), provider_html));
                    } else if (payload.status_code === "OrderItemCanceled") {
                        growl.info(LOCALE.maketext("This certificate (order item ID “[_1]”) was already canceled directly via “[_2]”.", _.escape(cert.order_item_id), provider_html));
                    } else {
                        growl.success(LOCALE.maketext("The system has canceled this certificate. Your credit card should not be charged for this order."));
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
                    }, function(error_html) {
                        growl.error(LOCALE.maketext("The system encountered an error as it attempted to refresh your pending certificates: [_1]", error_html));
                    });
                }, function(error_html) {
                    growl.error(LOCALE.maketext("The system encountered an error as it attempted to cancel your transaction: [_1]", error_html));
                });
            };

            $scope.get_displayed_domains = function(pcert) {
                var domains = pcert.domains;
                pcert.displayed_domains = [];
                pcert.display_meta.start = pcert.display_meta.items_per_page * (pcert.display_meta.current_page - 1);
                pcert.display_meta.limit = Math.min(domains.length, pcert.display_meta.start + pcert.display_meta.items_per_page);
                for (var i = pcert.display_meta.start; i < pcert.display_meta.limit; i++) {
                    pcert.displayed_domains.push(domains[i]);
                }
                return pcert.displayed_domains;
            };

            function _get_string_for_status_code(status_code, provider) {
                var str;

                if (status_code === "RequiresApproval") {
                    var provider_disp = $scope.get_provider_display_name(provider);
                    str = LOCALE.maketext("Waiting for “[_1]” to approve your order …", provider_disp);
                }

                return str;
            }

            $scope.get_cert_status = function(pending_certificate) {
                var status_code_str = _get_string_for_status_code(pending_certificate.last_status_code, pending_certificate.provider);

                if (status_code_str) {
                    return status_code_str;
                }

                var status = pending_certificate.status;
                if (status === "unconfirmed") {
                    return LOCALE.maketext("Pending Completion of Payment");
                } else if (status === "confirmed") {
                    return LOCALE.maketext("Payment Completed. Waiting for the provider to issue the certificate …");
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
                $location.path("/pending-certificates/" + cert.order_item_id);
                $scope.expanded_cert = cert.order_item_id;
                $anchorScroll($scope.expanded_cert);
            };

            $scope.collapse_cert = function() {
                $location.path("/pending-certificates");
                $scope.expanded_cert = null;
            };

            $scope.continue_purchase = function(pcert) {
                var domains = CertificatesService.get_all_domains();

                // Ensure no other purchasing certs exist
                CertificatesService.reset_purchasing_certificates();

                // rebuild purchasing certificate
                var cert = new Certificate();
                var cert_domains = [];
                var cert_product = CertificatesService.get_product_by_id(pcert.provider, pcert.product_id);
                var total_price = 0;

                cert.set_domains(cert_domains);
                cert.set_virtual_hosts(pcert.vhost_names);
                cert.set_product(cert_product);

                angular.forEach(pcert.domains, function(cert_domain) {
                    angular.forEach(domains, function(domain) {
                        if (domain.domain === cert_domain) {
                            cert_domains.push(domain);
                            total_price += domain.is_wildcard ? cert_product.wildcard_price : cert_product.price;
                        }
                    });
                });

                cert.set_price(total_price);

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
                var virtual_hosts = CertificatesService.get_virtual_hosts();

                angular.forEach($scope.pending_certificates, function(order_item) {

                    // build new order
                    orders[order_item.order_id] = orders[order_item.order_id] || {
                        access_token: "",
                        certificates: [],
                        order_id: order_item.order_id,
                        checkout_url: order_item.checkout_url
                    };
                    orders[order_item.order_id].certificates.push(order_item);

                    // re select the domains
                    angular.forEach(order_item.domains, function(cert_domain) {
                        angular.forEach(domains, function(domain) {
                            if (domain.domain === cert_domain) {
                                domain.selected = true;
                            }
                        });
                    });

                    // re select a product
                    angular.forEach(order_item.vhost_names, function(vhost_name) {
                        var vhost_id = CertificatesService.get_virtual_host_by_display_name(vhost_name);
                        var vhost = virtual_hosts[vhost_id];
                        var product = CertificatesService.get_product_by_id(
                            order_item.provider,
                            order_item.product_id
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

                if ($routeParams.orderitemid) {
                    $scope.expanded_cert = $routeParams.orderitemid;
                    $timeout(function() {
                        $anchorScroll($scope.expanded_cert);
                    }, 500);
                }
            };

            $scope.init();
        }

        app.controller("PendingCertificatesController", ["$scope", "$location", "$routeParams", "$anchorScroll", "$timeout", "$window", "CertificatesService", "growl", "LocationService", "Certificate", PendingCertificatesController]);

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
    ],
    function(angular, CJT, _) {
        "use strict";

        return function() {

            angular.module("App", ["ui.bootstrap", "angular-growl", "cjt2.cpanel"]);

            var app = require(
                [
                    "cjt/bootstrap",
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

                            // $locationProvider.html5Mode(true);
                            // $locationProvider.hashPrefix("!");

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
                            $routeProvider.when("/pending-certificates/:orderitemid?", {
                                controller: "PendingCertificatesController",
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


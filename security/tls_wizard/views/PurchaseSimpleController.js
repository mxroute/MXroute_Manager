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
    [
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

/*
# zone_editor/views/domain_selection.js              Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/* jshint -W100 */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "app/models/dynamic_table",
        "cjt/directives/actionButtonDirective",
        "cjt/decorators/paginationDecorator",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/filters/qaSafeIDFilter",
        "cjt/validator/ip-validators",
        "cjt/validator/domain-validators",
        "cjt/services/viewNavigationApi",
        "cjt/services/cpanel/nvDataService",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "app/directives/convert_to_full_record_name",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE, DynamicTable) {
        "use strict";

        var app = angular.module("cpanel.zoneEditor");

        var controller = app.controller(
            "ListDomainsController",
            [
                "$q",
                "$location",
                "$routeParams",
                "Domains",
                "Zones",
                "$uibModal",
                "viewNavigationApi",
                "Features",
                "defaultInfo",
                "nvDataService",
                "alertService",
                function(
                    $q,
                    $location,
                    $routeParams,
                    Domains,
                    Zones,
                    $uibModal,
                    viewNavigationApi,
                    Features,
                    defaultInfo,
                    nvDataService,
                    alertService) {

                    var list = this;

                    list.ui = {};
                    list.ui.is_loading = false;
                    list.domains = [];

                    list.Features = Features;

                    list.modal = {};
                    list.modal.instance = null;
                    list.modal.title = "";
                    list.modal.name_label = LOCALE.maketext("Name");
                    list.modal.cname_label = "CNAME";
                    list.modal.address_label = LOCALE.maketext("Address");
                    list.modal.exchanger_label = LOCALE.maketext("Destination");
                    list.modal.exchanger_placeholder = LOCALE.maketext("Fully qualified domain name");
                    list.modal.priority_label = LOCALE.maketext("Priority");
                    list.modal.priority_placeholder = LOCALE.maketext("Integer");
                    list.modal.create_a_record = LOCALE.maketext("Add an [asis,A] Record");
                    list.modal.create_cname_record = LOCALE.maketext("Add a [asis,CNAME] Record");
                    list.modal.create_mx_record = LOCALE.maketext("Add an [asis,MX] Record");
                    list.modal.cancel_label = LOCALE.maketext("Cancel");
                    list.modal.required_msg = LOCALE.maketext("This field is required.");

                    list.loading_error = false;
                    list.loading_error_message = "";

                    var table = new DynamicTable();
                    table.setSort("domain");

                    function searchFunction(item, searchText) {
                        return item.domain.indexOf(searchText) !== -1;
                    }
                    table.setFilterFunction(searchFunction);

                    list.meta = table.getMetadata();
                    list.filteredList = table.getList();
                    list.paginationMessage = table.paginationMessage;
                    list.meta.pageSize = defaultInfo.domains_per_page;
                    list.render = function() {
                        list.filteredList = table.populate();
                    };
                    list.sortList = function() {
                        list.render();
                    };
                    list.selectPage = function() {
                        list.render();
                    };
                    list.selectPageSize = function() {
                        list.render();
                        if (defaultInfo.domains_per_page !== list.meta.pageSize) {
                            nvDataService.setObject({ domains_per_page: list.meta.pageSize })
                                .then(function() {
                                    defaultInfo.domains_per_page = list.meta.pageSize;
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                });
                        }
                    };
                    list.searchList = function() {
                        list.render();
                    };

                    list.refresh = function() {
                        return load(true);
                    };

                    list.aRecordModalController = function($uibModalInstance, domain) {
                        var ar = this;
                        ar.domain = domain;
                        ar.modal_header = LOCALE.maketext("Add an [asis,A] Record for “[_1]”", domain);
                        ar.name_label = list.modal.name_label;
                        ar.address_label = list.modal.address_label;
                        ar.submit_label = list.modal.create_a_record;
                        ar.cancel_label = list.modal.cancel_label;
                        ar.required_msg = list.modal.required_msg;
                        ar.zone_name_placeholder = Zones.format_zone_name(domain, "example");
                        ar.resource = {
                            name: "",
                            address: "",
                            type: "A"
                        };
                        ar.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        ar.save = function() {
                            return Zones.add_record(ar.domain, ar.resource)
                                .then( function(results) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the following [asis,_1] record for “[_2]”: [_3]", "A", ar.domain, _.escape(ar.resource.name)),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close({ $value: ar.resource });
                                });
                        };
                    };

                    list.aRecordModalController.$inject = ["$uibModalInstance", "domain"];

                    list.cnameRecordModalController = function($uibModalInstance, domain) {
                        var cr = this;
                        cr.domain = domain;
                        cr.modal_header = LOCALE.maketext("Add a [asis,CNAME] Record for “[_1]”", domain);
                        cr.name_label = list.modal.name_label;
                        cr.cname_label = list.modal.cname_label;
                        cr.submit_label = list.modal.create_cname_record;
                        cr.cancel_label = list.modal.cancel_label;
                        cr.required_msg = list.modal.required_msg;
                        cr.zone_name_placeholder = Zones.format_zone_name(domain, "example");
                        cr.resource = {
                            name: "",
                            cname: "",
                            type: "CNAME"
                        };
                        cr.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        cr.save = function() {
                            return Zones.add_record(cr.domain, cr.resource)
                                .then( function(results) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the following [asis,_1] record for “[_2]”: [_3]", "CNAME", cr.domain, _.escape(cr.resource.name)),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close({ $value: cr.resource });
                                });
                        };
                    };

                    list.cnameRecordModalController.$inject = ["$uibModalInstance", "domain"];

                    list.mxRecordModalController = function($uibModalInstance, domain) {
                        var mxr = this;
                        mxr.domain = domain;
                        mxr.modal_header = LOCALE.maketext("Add an [asis,MX] Record for “[_1]”", domain);
                        mxr.name_label = list.modal.name_label;
                        mxr.exchanger_label = list.modal.exchanger_label;
                        mxr.exchanger_placeholder = list.modal.exchanger_placeholder;
                        mxr.priority_label = list.modal.priority_label;
                        mxr.priority_placeholder = list.modal.priority_placeholder;
                        mxr.submit_label = list.modal.create_mx_record;
                        mxr.cancel_label = list.modal.cancel_label;
                        mxr.required_msg = list.modal.required_msg;
                        mxr.resource = {
                            type: "MX",
                            exchanger: "",
                            priority: ""
                        };
                        mxr.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        mxr.save = function() {
                            return Zones.add_record(mxr.domain, mxr.resource)
                                .then( function(results) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully added the [asis,_1] record for “[_2]”.", "MX", mxr.domain),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "zoneEditor"
                                    });
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "zoneEditor"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close({ $value: mxr.resource });
                                });
                        };
                    };

                    list.mxRecordModalController.$inject = ["$uibModalInstance", "domain"];

                    list.create_a_record = function(domainObj) {
                        list.modal.instance = $uibModal.open({
                            templateUrl: "views/a_record_form.html",
                            controller: list.aRecordModalController,
                            controllerAs: "ar",
                            resolve: {
                                domain: function() {
                                    return domainObj.domain;
                                },
                            }
                        });
                    };

                    list.create_cname_record = function(domainObj) {
                        list.modal.instance = $uibModal.open({
                            templateUrl: "views/cname_record_form.html",
                            controller: list.cnameRecordModalController,
                            controllerAs: "cr",
                            resolve: {
                                domain: function() {
                                    return domainObj.domain;
                                }
                            }
                        });
                    };

                    list.create_mx_record = function(domainObj) {
                        list.modal.instance = $uibModal.open({
                            templateUrl: "views/mx_record_form.html",
                            controller: list.mxRecordModalController,
                            controllerAs: "mxr",
                            resolve: {
                                domain: function() {
                                    return domainObj.domain;
                                }
                            }
                        });
                    };

                    function load(force) {
                        if (force === void 0) {
                            force = false;
                        }

                        list.ui.is_loading = true;
                        return Domains.fetch(force)
                            .then(function(data) {
                                list.domains = data;
                                table.loadData(list.domains);
                                list.render();
                            })
                            .catch(function(err) {
                                list.loading_error = true;
                                list.loading_error_message = err;
                            })
                            .finally(function() {
                                list.ui.is_loading = false;
                            });
                    }

                    list.goToView = function(view, domain) {
                        viewNavigationApi.loadView("/" + view + "/" + domain);
                    };

                    list.init = function() {
                        load();
                    };

                    list.init();
                }
            ]);

        return controller;
    }
);

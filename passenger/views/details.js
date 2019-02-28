/*
# passenger/views/details.js                      Copyright(c) 2017 cPanel, Inc.
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
        "cjt/util/parse",
        "cjt/util/table",
        "app/directives/passenger_validators",
        "cjt/directives/toggleSwitchDirective",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/services/viewNavigationApi",
        "cjt/directives/validationContainerDirective",
        "cjt/directives/validationItemDirective",
        "cjt/validator/ip-validators",
        "cjt/validator/domain-validators",
        "cjt/validator/compare-validators",
        "cjt/validator/datatype-validators",
        "cjt/validator/path-validators",
        "cjt/validator/length-validators",
        "cjt/services/viewNavigationApi",
        "app/directives/table_row_form",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE, PARSE, Table) {

        var app = angular.module("cpanel.applicationManager");

        var controller = app.controller(
            "ConfigurationDetailsController",
            [
                "$scope",
                "$q",
                "$routeParams",
                "viewNavigationApi",
                "Apps",
                "Domains",
                "$uibModal",
                "defaultInfo",
                "alertService",
                function(
                    $scope,
                    $q,
                    $routeParams,
                    viewNavigationApi,
                    Apps,
                    Domains,
                    $uibModal,
                    defaultInfo,
                    alertService) {
                    var details = this;

                    details.is_loading = false;
                    details.domains = [];
                    details.user_home_dir = defaultInfo.homedir;
                    details.supports_env_vars = Apps.has_support_for_env_vars;
                    details.edit_mode = $routeParams.applname !== void 0;
                    details.editing_envar = false;
                    details.forceLoad = false;
                    details.isRTL = false;

                    var html = document.querySelector("html");
                    if (html) {
                        details.isRTL = html.getAttribute("dir") === "rtl";
                    }

                    details.get_page_title = function() {
                        if (details.edit_mode) {
                            return LOCALE.maketext("Edit");
                        } else {
                            return LOCALE.maketext("Register");
                        }
                    };

                    details.get_application_title = function() {
                        if (details.edit_mode) {
                            return LOCALE.maketext("Edit Application “[_1]”", $routeParams.applname);
                        } else {
                            return LOCALE.maketext("Register an Application");
                        }
                    };

                    var envarTable = new Table();

                    details.meta = envarTable.getMetadata();
                    details.filteredEnvars = envarTable.getList();
                    details.renderEnvars = function() {
                        details.filteredEnvars = envarTable.update();
                    };
                    details.sortList = function() {
                        details.renderEnvars();
                    };
                    details.selectPage = function() {
                        details.renderEnvars();
                    };
                    details.selectPageSize = function() {
                        details.renderEnvars();
                    };
                    details.searchList = function() {
                        details.renderEnvars();
                    };

                    details.goToView = function(view, forceLoad) {
                        viewNavigationApi.loadView(view, forceLoad ? { "forceLoad": 1 } : {} );
                    };

                    details.is_saving_disabled = function() {
                        return details.add_app.$pristine || details.add_app.$invalid ||  details.editing_envar;
                    };

                    details.save_application = function() {
                        if (details.edit_mode) {
                            return details.save_edited_application();
                        } else {
                            return details.save_new_application();
                        }
                    };

                    details.save_edited_application = function() {
                        return Apps.update_application(details.application, details.previous_name)
                            .then(function() {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("You successfully updated the application “[_1]”.", details.application.name),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "passenger"
                                });
                                details.goToView("manage");
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "passenger"
                                });
                            });
                    };

                    details.save_new_application = function() {
                        return Apps.add_application(details.application)
                            .then(function() {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("You successfully registered the application “[_1]”.", details.application.name),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "passenger"
                                });
                                details.goToView("manage", details.forceLoad);
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "passenger"
                                });
                            });
                    };

                    details.add_envar = function() {
                        envarTable.add({ "name": "", "value": "", "is_editing": true, "is_new": true });
                        details.renderEnvars();
                    };

                    details.close_envar_editor = function(envar) {
                        envar.is_editing = false;
                        details.editing_envar = false;

                        // check if the user cancelled a new item
                        if (envar.is_new) {
                            envarTable.remove(envar);
                            details.renderEnvars();
                        }
                    };

                    details.save_envar = function(envar, name, value) {
                        if (envar.is_new) {
                            delete envar.is_new;
                        } else {

                        // check for a rename
                            if (name !== envar.name) {
                                delete details.application.envvars[envar.name];
                            }
                        }

                        envar.name = name;
                        envar.value = value;
                        details.application.envvars[name] = value;
                        details.close_envar_editor(envar);
                        details.renderEnvars();
                    };

                    details.delete_envar = function(envar) {
                        envarTable.remove(envar);
                        delete details.application.envvars[envar.name];
                        details.renderEnvars();
                        details.add_app.$setDirty();
                    };

                    details.edit_envar = function(envar) {
                        envar.is_editing = true;
                        details.editing_envar = true;
                    };

                    details.init = function() {
                        if (details.edit_mode) {
                            details.is_loading = true;
                            Apps.get_application_by_name($routeParams.applname)
                                .then(function(data) {
                                    details.application = angular.copy(data);
                                    details.application = Apps.strip_homedir_from_path(details.application);
                                    var array_for_table = [];
                                    _.forOwn(details.application.envvars, function(envar_value, envar_key) {
                                        array_for_table.push({
                                            "name": envar_key,
                                            "value": envar_value,
                                            "is_editing": false
                                        });
                                    });
                                    envarTable.load(array_for_table);
                                    details.renderEnvars();
                                    details.previous_name = details.application.name;
                                    details.is_loading = false;
                                });
                        } else {
                            if (Apps.applications.length === 0) {
                                details.forceLoad = true;
                            }
                            details.application = Apps.get_default_application();
                        }

                        Domains.fetch()
                            .then(function(data) {
                                details.domains = data;
                            });

                        envarTable.setSort("name", "asc");
                    };

                    details.init();
                }
            ]);

        return controller;
    }
);

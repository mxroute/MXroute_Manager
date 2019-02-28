/*
# passenger/views/manage.js                       Copyright(c) 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/* eslint-disable camelcase */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/table",
        "cjt/util/parse",
        "cjt/directives/actionButtonDirective",
        "cjt/decorators/paginationDecorator",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/services/viewNavigationApi",
        "cjt/directives/quickFiltersDirective",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE, Table, PARSE) {

        var app = angular.module("cpanel.applicationManager");

        var controller = app.controller(
            "ManageApplicationsController",
            [
                "$scope",
                "$routeParams",
                "viewNavigationApi",
                "$uibModal",
                "Apps",
                "defaultInfo",
                "alertService",
                function(
                    $scope,
                    $routeParams,
                    viewNavigationApi,
                    $uibModal,
                    Apps,
                    defaultInfo,
                    alertService) {
                    var manage = this;

                    manage.is_loading = false;
                    manage.applications = [];
                    manage.loading_error = false;
                    manage.loading_error_message = "";
                    manage.user_home_dir = defaultInfo.homedir;
                    manage.change_in_progress = false;

                    var table = new Table();

                    function searchByName(item, searchText) {
                        return item.name.indexOf(searchText) !== -1;
                    }
                    function searchByType(item, type) {
                        return item.type === type;
                    }

                    table.setSearchFunction(searchByName);
                    table.setFilterOptionFunction(searchByType);

                    manage.meta = table.getMetadata();
                    manage.filteredList = table.getList();
                    manage.paginationMessage = table.paginationMessage;
                    manage.render = function() {
                        manage.filteredList = table.update();
                    };
                    manage.sortList = function() {
                        manage.render();
                    };
                    manage.selectPage = function() {
                        manage.render();
                    };
                    manage.selectPageSize = function() {
                        manage.render();
                    };
                    manage.searchList = function() {
                        manage.render();
                    };

                    manage.quota_warning = function() {
                        return LOCALE.maketext("You reached your account’s allotment of applications, [numf,_1].", Apps.get_maximum_number_of_apps());
                    };

                    manage.show_quota_warning = function() {
                        return Apps.exceeds_quota();
                    };

                    manage.configure_details = function(appl) {
                        if (appl === void 0) {
                            viewNavigationApi.loadView("/details");
                        } else {
                            viewNavigationApi.loadView("/details/" + appl.name);
                        }
                    };

                    manage.toggle_status = function(app) {
                        manage.change_in_progress = true;

                        return Apps.toggle_application_status(app)
                            .then(function(application_data) {
                                if (application_data.enabled) {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("The application, “[_1]”, is now enabled.", application_data.name),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "passenger"
                                    });
                                } else {
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("The application, “[_1]”, is now disabled.", application_data.name),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "passenger"
                                    });
                                }
                                app.enabled = PARSE.parsePerlBoolean(application_data.enabled);
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "passenger"
                                });
                            })
                            .finally(function() {
                                manage.change_in_progress = false;
                            });
                    };

                    function RemoveRecordModalController($uibModalInstance, appl_name) {
                        var ctrl = this;

                        ctrl.confirm_msg = LOCALE.maketext("Are you certain that you want to unregister the application “[_1]”?", appl_name);

                        ctrl.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        ctrl.confirm = function() {
                            return Apps.remove_application(appl_name)
                                .then(function() {
                                    table.setSort("name", "asc");
                                    _.remove(manage.applications, function(app) {
                                        return app.name === appl_name;
                                    });
                                    manage.render();
                                    alertService.add({
                                        type: "success",
                                        message: LOCALE.maketext("You successfully unregistered the application “[_1]”.", appl_name),
                                        closeable: true,
                                        replace: false,
                                        autoClose: 10000,
                                        group: "passenger"
                                    });
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "passenger"
                                    });
                                })
                                .finally(function() {
                                    $uibModalInstance.close();
                                });

                        };
                    }

                    RemoveRecordModalController.$inject = ["$uibModalInstance", "appl_name"];

                    manage.confirm_delete_record = function(applName) {
                        manage.change_in_progress = true;
                        var instance = $uibModal.open({
                            templateUrl: "confirm_delete.html",
                            controller: RemoveRecordModalController,
                            controllerAs: "ctrl",
                            resolve: {
                                appl_name: function() {
                                    return applName;
                                },
                            }
                        });
                        instance.result.finally(function() {
                            manage.change_in_progress = false;
                        });
                    };

                    manage.refresh = function() {
                        return load(true);
                    };

                    function load(force) {
                        if ($routeParams.hasOwnProperty("forceLoad") &&
                        $routeParams.forceLoad === 1) {
                            force = true;
                        } else if (force === void 0) {
                            force = false;
                        }

                        manage.is_loading = true;
                        return Apps.fetch(force)
                            .then(function(data) {
                                manage.applications = data;
                                table.setSort("name", "asc");
                                table.load(manage.applications);
                                manage.render();
                            })
                            .catch(function(error) {

                            // If we get an error at this point, we assume that the user
                            // should not be able to do anything on the page.
                                manage.loading_error = true;
                                manage.loading_error_message = error;
                            })
                            .finally(function() {
                                manage.is_loading = false;
                            });
                    }

                    manage.init = function() {
                        load();
                    };

                    manage.init();
                }
            ]);

        return controller;
    }
);

/*
# zone_editor/views/manage.js                        Copyright 2018 cPanel, Inc.
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
        "app/models/dmarc_record",
        "cjt/decorators/growlDecorator",
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
        "cjt/validator/compare-validators",
        "cjt/validator/datatype-validators",
        "cjt/services/viewNavigationApi",
        "cjt/services/cpanel/nvDataService",
        "cjt/directives/quickFiltersDirective",
        "app/directives/convert_to_full_record_name",
        "app/directives/dmarc_validators",
        "app/directives/caa_validators",
        "uiBootstrap"
    ],
    function(angular, _, LOCALE, DynamicTable, DMARCRecord) {

        var app = angular.module("cpanel.zoneEditor");

        var controller = app.controller(
            "ManageZoneRecordsController", [
                "$scope",
                "$routeParams",
                "growl",
                "Zones",
                "viewNavigationApi",
                "$uibModal",
                "Features",
                "defaultInfo",
                "nvDataService",
                function(
                    $scope,
                    $routeParams,
                    growl,
                    Zones,
                    viewNavigationApi,
                    $uibModal,
                    Features,
                    defaultInfo,
                    nvDataService) {
                    var manage = this;

                    manage.is_loading = false;
                    manage.zone_records = [];
                    manage.domain = $routeParams.domain;
                    manage.loading_error = false;
                    manage.loading_error_message = "";
                    manage.Features = Features;
                    manage.generated_domains = {};

                    var previous_name_entry, previous_ttl_entry;

                    manage.adding_record = false;
                    manage.editing_record = false;
                    manage.save_in_progress = false;
                    manage.record_being_edited = null;
                    manage.dmarc_optional_params_shown = false;

                    manage.new_record = {
                        name: "",
                        ttl: null,
                        class: "IN",
                        type: "A",
                        a_address: "",
                        aaaa_address: "",
                        address: "",
                        cname: "",
                        priority: null,
                        weight: null,
                        port: null,
                        target: "",
                        txtdata: "",
                        exchanger: "",
                        preference: null,
                        line: null,
                        flag: 0,
                        tag: "issue",
                        value: "",
                        _id: null
                    };

                    manage.dmarc_record = new DMARCRecord();
                    manage.raw_dmarc_active = false;
                    manage.editing_dmarc = false;

                    manage.updateDMARCRecordFromTXT = function() {
                        manage.dmarc_record.fromTXT(manage.new_record.txtdata);
                        manage.raw_dmarc_active = false;
                    };

                    manage.updateTXTFromDMARCRecord = function() {
                        manage.new_record.txtdata = manage.dmarc_record.toString();
                        manage.raw_dmarc_active = true;
                    };

                    if (Features.mx && !Features.simple && !Features.advanced) {
                        manage.new_record.type = "MX";
                        manage.new_record.name = manage.domain + ".";
                    }

                    manage.resetNewRecord = function() {
                        manage.new_record.type = "A";
                        manage.new_record.name = "";
                        manage.new_record.ttl = manage.default_ttl;
                        manage.new_record.class = "IN";
                        manage.new_record.a_address = "";
                        manage.new_record.aaaa_address = "";
                        manage.new_record.address = "";
                        manage.new_record.cname = "";
                        manage.new_record.priority = null;
                        manage.new_record.weight = null;
                        manage.new_record.port = null;
                        manage.new_record.target = "";
                        manage.new_record.txtdata = "";
                        manage.new_record.exchanger = "";
                        manage.new_record.preference = null;
                        manage.new_record.line = null;
                        manage.new_record.tag = "issue";
                        manage.new_record.flag = 0;
                        manage.new_record.value = "";
                        manage.new_record._id = null;
                        manage.add_zr_form.$setPristine(true);
                        previous_name_entry = null;

                        manage.dmarc_record = new DMARCRecord();
                        manage.editing_dmarc = false;
                        manage.dmarc_optional_params_shown = false;

                        if (Features.mx && !Features.simple && !Features.advanced) {
                            manage.new_record.type = "MX";
                            manage.new_record.name = manage.domain + ".";
                        }
                    };

                    var table = new DynamicTable();

                    function searchByName(item, searchText) {
                        return item.name.indexOf(searchText) !== -1;
                    }
                    function searchByType(item, type) {
                        return item.type === type;
                    }

                    table.setFilterFunction(searchByName);
                    table.setQuickFilterFunction(searchByType);
                    table.meta.pageSize = defaultInfo.zones_per_page;

                    manage.meta = table.getMetadata();
                    manage.filteredList = table.getList();
                    manage.paginationMessage = table.paginationMessage;
                    manage.render = function() {

                    // Close the form when we render the list
                        manage.close_add_record();
                        manage.filteredList = table.populate();
                    };
                    manage.sortList = function() {
                        manage.render();
                    };
                    manage.selectPage = function() {
                        manage.render();
                    };
                    manage.selectPageSize = function() {
                        manage.render();
                        if (defaultInfo.zones_per_page !== table.meta.pageSize) {
                            nvDataService.setObject(
                                {
                                    zones_per_page: table.meta.pageSize
                                })
                                .then(function() {
                                    defaultInfo.zones_per_page = table.meta.pageSize;
                                })
                                .catch(function(error) {
                                    growl.error(error);
                                });
                        }
                    };
                    manage.searchList = function() {
                        manage.render();
                    };

                    manage.dynamicPlaceholders = {
                        issue: LOCALE.maketext("Certificate Authority"),
                        iodef: LOCALE.maketext("Mail Address for Notifications")
                    };

                    manage.dynamicTooltips = {
                        issue: LOCALE.maketext("The certificate authority’s domain name."),
                        iodef: LOCALE.maketext("The location to which the certificate authority will report exceptions. Either a [asis,mailto] or standard [asis,URL].")
                    };

                    manage.valueTooltip = function() {
                        if (manage.new_record.tag === "iodef") {
                            return manage.dynamicTooltips.iodef;
                        }

                        return manage.dynamicTooltips.issue;
                    };

                    manage.valuePlaceholder = function() {
                        if (manage.new_record.tag === "iodef") {
                            return manage.dynamicPlaceholders.iodef;
                        }

                        return manage.dynamicPlaceholders.issue;
                    };

                    function RemoveRecordModalController($uibModalInstance, record) {
                        var ctrl = this;
                        ctrl.record = record;

                        ctrl.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        ctrl.confirm = function() {
                            return Zones.remove_zone_record(manage.domain, record)
                                .then(function() {
                                    if (record.type === "MX" && record.name === manage.domain + ".") {
                                        growl.success(LOCALE.maketext("You successfully deleted the [asis,_1] record.", record.type));
                                    } else {
                                        growl.success(LOCALE.maketext("You successfully deleted the [asis,_1] record: [_2]", record.type, _.escape(record.name)));
                                    }
                                    manage.refresh();
                                })
                                .catch(function(error) {
                                    growl.error(error);
                                })
                                .finally(function() {
                                    $uibModalInstance.close();
                                });
                        };
                    }

                    RemoveRecordModalController.$inject = ["$uibModalInstance", "record"];

                    function ResetZoneModalController($uibModalInstance) {
                        var ctrl = this;

                        ctrl.cancel = function() {
                            $uibModalInstance.dismiss("cancel");
                        };
                        ctrl.confirm = function() {
                            return Zones.reset_zone(manage.domain)
                                .then(function() {
                                    growl.success(LOCALE.maketext("You successfully reset the zone for “[_1]”.", manage.domain));
                                    manage.refresh();
                                })
                                .catch(function(error) {
                                    growl.error(error);
                                })
                                .finally(function() {
                                    $uibModalInstance.close();
                                });
                        };
                    }

                    ResetZoneModalController.$inject = ["$uibModalInstance"];

                    manage.open_add_record = function(recordType) {
                        if (!manage.adding_record) {
                            if (typeof recordType !== "undefined") {
                                manage.new_record.type = recordType;
                                if (manage.new_record.type === "DMARC") {
                                    manage.new_record.name = Zones.format_zone_name(manage.domain, "_dmarc.");
                                    manage.new_record.txtdata = manage.dmarc_record.toString();
                                    manage.new_record.type = "TXT";
                                    manage.editing_dmarc = true;
                                    manage.add_zr_form.$setDirty();
                                }
                            }
                            manage.adding_record = true;
                        }
                    };

                    manage.restore_default_editor_position = function() {

                    // move the add record form back to the first row in the table
                        var edit_form = document.getElementById("addRecordForm");
                        var loading_notice = document.getElementById("loadingNotice");
                        loading_notice.parentNode.insertBefore(edit_form, loading_notice);
                    };

                    manage.close_add_record = function() {
                        if (manage.editing_record && manage.new_record.line) {

                        // show the line formerly being edited
                            manage.record_being_edited = null;
                        }

                        // hide the editor
                        manage.adding_record = false;
                        manage.editing_record = false;
                        manage.editing_dmarc = false;
                        manage.restore_default_editor_position();
                        manage.resetNewRecord();
                    };

                    manage.save_edited_record = function() {
                        manage.save_in_progress = true;

                        // set the priority = preference if MX record
                        if (manage.new_record.type === "MX") {
                            manage.new_record.priority = manage.new_record.preference;
                        }

                        var update_candidate = manage.build_update_candidate(false);

                        return Zones.update_record(manage.domain, update_candidate)
                            .then(function() {
                                if (manage.new_record.type === "MX" && manage.new_record.name === manage.domain + ".") {
                                    growl.success(LOCALE.maketext("You successfully updated the [asis,_1] record for “[_2]”.", manage.new_record.type, manage.domain));
                                } else {
                                    growl.success(LOCALE.maketext("You successfully updated the following [asis,_1] record for “[_2]”: [_3]", manage.new_record.type, manage.domain, _.escape(manage.new_record.name)));
                                }


                                // updated the item in the list, if found
                                if (update_candidate.line !== null) {

                                // update the data store for the Dynamic Table
                                    table.items[update_candidate._id] = _.extend(table.items[update_candidate._id], update_candidate);

                                    // In case this item is currently displayed (likely), we need to update
                                    // that item in the currently displayed list. Usually, we just call populate
                                    // on the Dynamic Table to do this, however that would cause the list to be reloaded
                                    // which is not desirable in this case.
                                    for (var i = 0, len = manage.filteredList.length; i < len; i++) {
                                        if (manage.filteredList[i].line === update_candidate.line) {
                                            manage.filteredList[i] = _.extend(manage.filteredList[i], update_candidate);
                                            break;
                                        }
                                    }
                                }

                                manage.resetNewRecord();
                                manage.record_being_edited = null;
                                manage.restore_default_editor_position();
                                manage.editing_record = false;
                                manage.editing_dmarc = false;
                            })
                            .catch(function(error) {
                                growl.error(error);
                            })
                            .finally(function() {
                                manage.save_in_progress = false;
                            });
                    };

                    manage.confirm_add_record = function() {
                        manage.save_in_progress = true;

                        // set the priority = preference if MX record

                        var update_candidate = manage.build_update_candidate(true);

                        return Zones.add_record(manage.domain, update_candidate)
                            .then(function() {
                                if (manage.new_record.type === "MX" && manage.new_record.name === manage.domain + ".") {
                                    growl.success(LOCALE.maketext("You successfully added the [asis,_1] record for “[_2]”.", manage.new_record.type, manage.domain));
                                } else {
                                    growl.success(LOCALE.maketext("You successfully added the following [asis,_1] record for “[_2]”: [_3]", manage.new_record.type, manage.domain, _.escape(manage.new_record.name)));
                                }
                                manage.resetNewRecord();
                                manage.adding_record = false;
                                manage.refresh();
                            })
                            .catch(function(error) {
                                growl.error(error);
                            })
                            .finally(function() {
                                manage.save_in_progress = false;
                            });
                    };

                    manage.field_has_error = function(form, fieldName) {
                        return form && fieldName && form[fieldName].$invalid && form[fieldName].$dirty;
                    };

                    $scope.$watch("manage.new_record.type", function(newValue, oldValue) {
                        if (oldValue === newValue) {
                            return;
                        }

                        /*
                     * If the user changes to an MX record, we need to change the
                     * name to match the domain. We also store whatever was there previously
                     * to be used later.
                     */
                        if (newValue === "MX") {
                            previous_name_entry = manage.new_record.name;
                            previous_ttl_entry = manage.new_record.ttl;
                            if (!previous_name_entry) {
                                manage.new_record.name = manage.domain + ".";
                            }
                            return;
                        }

                        /*
                     * If the user changes to any other record, we set the name back to
                     * whatever was there previously. To avoid setting it to something
                     * weird, we unset our variable that stored the previous name value.
                     */
                        if (oldValue === "MX") {
                            manage.new_record.name = previous_name_entry;
                            manage.new_record.ttl = previous_ttl_entry;
                            previous_name_entry = null;
                            previous_ttl_entry = null;
                            return;
                        }
                    });

                    manage.build_update_candidate = function(isNewRecord) {
                        var update_candidate = {};

                        update_candidate.name = manage.new_record.name;
                        update_candidate.type = manage.new_record.type;
                        update_candidate.class = manage.new_record.class;
                        update_candidate.ttl = manage.new_record.ttl;
                        if (!isNewRecord) {
                            update_candidate.line = manage.new_record.line;
                            update_candidate._id = manage.new_record._id;
                        }

                        switch (manage.new_record.type) {
                            case "MX":
                                update_candidate.exchange = manage.new_record.exchanger;
                                update_candidate.exchanger = manage.new_record.exchanger;
                                update_candidate.preference = manage.new_record.preference;
                                update_candidate.priority = manage.new_record.preference;
                                break;
                            case "SRV":
                                update_candidate.weight = manage.new_record.weight;
                                update_candidate.port = manage.new_record.port;
                                update_candidate.priority = manage.new_record.priority;
                                update_candidate.target = manage.new_record.target;
                                break;
                            case "CAA":
                                update_candidate.tag = manage.new_record.tag;
                                update_candidate.flag = manage.new_record.flag;
                                update_candidate.value = manage.new_record.value;
                                break;
                            case "CNAME":
                                update_candidate.cname = manage.new_record.cname;
                                update_candidate.record = manage.new_record.cname;
                                break;
                            case "TXT":
                                if (manage.editing_dmarc && !manage.raw_dmarc_active) {
                                    manage.new_record.txtdata = manage.dmarc_record.toString();
                                }
                                update_candidate.txtdata = manage.new_record.txtdata;
                                update_candidate.record = manage.new_record.txtdata;
                                break;
                            case "A":
                                update_candidate.address = manage.new_record.a_address;
                                update_candidate.record = manage.new_record.a_address;
                                break;
                            case "AAAA":
                                update_candidate.address = manage.new_record.aaaa_address;
                                update_candidate.record = manage.new_record.aaaa_address;
                        }

                        return update_candidate;
                    };

                    manage.edit_record = function(zoneRecord) {
                        manage.adding_record = false;

                        // set up data structure for editing
                        manage.new_record.name = zoneRecord.name;
                        manage.new_record.type = zoneRecord.type;
                        manage.new_record.class = zoneRecord.class;
                        manage.new_record.ttl = zoneRecord.ttl;
                        manage.new_record.line = zoneRecord.line;
                        manage.new_record._id = zoneRecord._id;

                        switch (zoneRecord.type) {
                            case "MX":
                                manage.new_record.exchanger = zoneRecord.exchange;
                                manage.new_record.preference = zoneRecord.preference;
                                break;
                            case "SRV":
                                manage.new_record.weight = zoneRecord.weight;
                                manage.new_record.port = zoneRecord.port;
                                manage.new_record.priority = zoneRecord.priority;
                                manage.new_record.target = zoneRecord.target;
                                break;
                            case "CAA":
                                manage.new_record.tag = zoneRecord.tag;
                                manage.new_record.flag = zoneRecord.flag;
                                manage.new_record.value = zoneRecord.value;
                                break;
                            case "CNAME":
                                manage.new_record.cname = zoneRecord.cname;
                                break;
                            case "TXT":
                                manage.new_record.txtdata = zoneRecord.txtdata;
                                if (manage.editing_dmarc || manage.dmarc_record.isDMARC(manage.new_record.txtdata)) {
                                    manage.dmarc_record.fromTXT(manage.new_record.txtdata);
                                    manage.editing_dmarc = true;
                                    manage.add_zr_form.$setDirty();
                                }
                                break;
                            case "A":
                                manage.new_record.a_address = zoneRecord.address;
                                break;
                            case "AAAA":
                                manage.new_record.aaaa_address = zoneRecord.address;
                                break;
                        }

                        // move the form to the right position in the table
                        var edit_form = document.getElementById("addRecordForm");
                        var row_to_edit = document.getElementById("zone_rec_row_" + zoneRecord.line);
                        row_to_edit.parentNode.insertBefore(edit_form, row_to_edit);

                        manage.record_being_edited = zoneRecord.line;
                        manage.editing_record = true;
                    };

                    manage.confirm_delete_record = function(record) {
                        manage.close_add_record();
                        $uibModal.open({
                            templateUrl: "confirm_delete.html",
                            controller: RemoveRecordModalController,
                            controllerAs: "ctrl",
                            resolve: {
                                record: function() {
                                    return record;
                                },
                            }
                        });
                    };

                    manage.confirm_reset_zone = function() {

                    // we do not want the user to do a reset if they are editing/adding
                        if (manage.editing_record || manage.adding_record) {
                            return;
                        }

                        $uibModal.open({
                            templateUrl: "confirm_reset_zone.html",
                            controller: ResetZoneModalController,
                            controllerAs: "ctrl"
                        });
                    };

                    manage.refresh = function() {

                    // we do not want the user to refresh if they are editing/adding
                        if (manage.editing_record || manage.adding_record) {
                            return;
                        }

                        return load(true);
                    };

                    function load(force) {
                        if (force === void 0) {
                            force = false;
                        }

                        manage.is_loading = true;
                        return Zones.fetch(manage.domain, force)
                            .then(function(data) {
                                manage.zone_records = [];

                                for (var i = 0, len = data.length; i < len; i++) {
                                    if (data[i].type === "$TTL") {
                                        manage.default_ttl = data[i].ttl;
                                        continue;
                                    }

                                    // if the user does not have the advanced feature,
                                    // do not display records that are cpanel generated/controlled
                                    if (Features.simple &&
                                    !Features.advanced &&
                                    data[i].type !== "MX" &&
                                    manage.generated_domains[data[i].name]) {
                                        continue;
                                    }

                                    if (
                                        ((data[i].type === "A" || data[i].type === "CNAME") && manage.Features.simple) ||
                                    (data[i].type === "MX" && manage.Features.mx) ||
                                    (data[i].type !== "MX" && manage.Features.advanced)
                                    ) {
                                        manage.zone_records.push(data[i]);
                                    }
                                }

                                table.loadData(manage.zone_records);
                                manage.render();
                                manage.new_record.ttl = manage.default_ttl;
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

                    manage.goToView = function(view) {
                        viewNavigationApi.loadView(view);
                    };

                    manage.init = function() {
                        manage.is_loading = true;
                        return Zones.fetch_generated_domains(manage.domain, true)
                            .then(function(data) {
                                manage.generated_domains = data;
                                return load(true);
                            })
                            .catch(function(error) {
                                manage.loading_error = true;
                                manage.loading_error_message = error;
                            });
                    };

                    manage.init();
                }
            ]);

        return controller;
    }
);

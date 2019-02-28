/*
# base/webmail/paper_lantern/mail/manage_disk_usage/index.js
#                                                    Copyright 2018 cPanel, Inc.
#                                                           All rights reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, require: false */

/* eslint-disable camelcase*/

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/io/uapi-request",
        "cjt/io/batch-request",
        "cjt/io/uapi", // IMPORTANT: Load the driver so it’s ready
        "cjt/modules",
        "cjt/directives/formWaiting",
        "cjt/directives/searchDirective",
        "cjt/decorators/growlAPIReporter",
        "uiBootstrap",
        "cjt/services/APICatcher",
        "cjt/directives/toggleSortDirective",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular, _, LOCALE, APIREQUEST, BATCH) {
        "use strict";

        var PAGE = CPANEL.PAGE;

        // This page gracefully degrades if this global object does not exist.
        var Disk_Usage_Meter = window.Disk_Usage_Meter;

        var account = PAGE.account;

        var FETCH_TOTAL;
        if (account === PAGE.cpuser) {
            FETCH_TOTAL = new APIREQUEST.Class().initialize(
                "Email",
                "get_main_account_disk_usage_bytes"
            );
        } else {
            FETCH_TOTAL = new APIREQUEST.Class().initialize(
                "Email",
                "list_pops_with_disk",
                {
                    filter: [
                        [ "email", "eq", account ],
                    ],
                }
            );
        }

        function _get_reload_batch_calls(acct_name) {
            var fetch_statuses_req = new APIREQUEST.Class().initialize(
                "Mailboxes",
                "get_mailbox_status_list",
                {
                    account: acct_name,
                }
            );

            var batch_calls = [ fetch_statuses_req ];

            if (Disk_Usage_Meter && acct_name === PAGE.authuser) {
                batch_calls.push( FETCH_TOTAL );
            }

            return batch_calls;
        }

        var QUERY_PRESETS = {
            "30mib": "larger 30M",
            "seen": "seen",
            "all": "all",
        };

        return function() {

            require(
                [

                    // Application Modules
                    "cjt/bootstrap"
                ], function(BOOTSTRAP) {

                    var app = angular.module("App", [

                        // Use the dynamic CJT2 module name, since this code is shared between Webmail and cPanel
                        window.PAGE.CJT2_ANGULAR_MODULE_NAME,

                        "cjt2.decorators.growlAPIReporter",
                        "cjt2.directives.search",
                        "ui.bootstrap",
                        "angular-growl",
                        "localytics.directives",    // for “chosen”
                    ]);

                    app.controller("BaseController", [
                        "$scope",
                        "$location",
                        "$sce",
                        "APICatcher",
                        "growl",
                        function($scope, $location, $sce, api, growl) {
                            var mailbox_by_name;

                            function _set_mailbox_status(mbstatus) {
                                mailbox_by_name = {};

                                for (var m = 0; m < mbstatus.length; m++) {
                                    mailbox_by_name[ mbstatus[m].mailbox ] = mbstatus[m];

                                    mbstatus[m].display_name = ("" + mbstatus[m].mailbox).replace(/^INBOX\./, "");
                                    mbstatus[m].messages = parseInt(mbstatus[m].messages, 10);
                                    mbstatus[m].vsize = parseInt(mbstatus[m].vsize, 10);
                                    mbstatus[m].messages_numf = LOCALE.numf(mbstatus[m].messages);
                                    mbstatus[m].vsize_format_bytes = LOCALE.format_bytes(mbstatus[m].vsize);
                                }
                                $scope.mailbox_status = mbstatus;
                            }

                            _set_mailbox_status(CPANEL.PAGE.initial_mailbox_status);

                            var mbmeta = {};
                            mbmeta[account] = {};

                            // to_set is a response from a batch call whose first
                            // response is the mailbox status list and the second
                            // (optionally) is the total disk usage response.
                            function _handle_reload_response(to_set) {
                                _set_mailbox_status( to_set[0].parsedResponse.data );

                                if (to_set[1]) {
                                    var total_usage_data = to_set[1].parsedResponse.data;
                                    var total_usage;

                                    if (account === PAGE.cpuser) {
                                        total_usage = total_usage_data;
                                    } else {
                                        total_usage = total_usage_data[0]._diskused;
                                    }

                                    Disk_Usage_Meter.set(total_usage);
                                }
                            }

                            function _init() {
                                var deepLinkParams = $location.search();
                                $scope.search_filter = deepLinkParams["q"] && _.isString(deepLinkParams["q"]) ? deepLinkParams["q"] : "";
                            }

                            _init();

                            var ordered_pops = PAGE.pops.filter( function(p) {
                                return p !== PAGE.cpuser;
                            } );
                            if (ordered_pops.length < PAGE.pops.length) {
                                ordered_pops.push( PAGE.cpuser );
                            }

                            var options_html = [];
                            for (var p = 0; p < ordered_pops.length; p++) {
                                if ( ordered_pops[p] === account ) {
                                    if ( account === PAGE.cpuser ) {
                                        options_html.push(
                                            "<option selected value='" + _.escape(account) + "'>(" + LOCALE.maketext("Default Account") + ")</option>"
                                        );
                                    } else {
                                        options_html.push(
                                            "<option selected>" + _.escape(ordered_pops[p]) + "</option>"
                                        );
                                    }
                                } else if ( ordered_pops[p] === PAGE.cpuser ) {
                                    options_html.push(
                                        "<option value='" + _.escape(ordered_pops[p]) + "'>(" + LOCALE.maketext("Default Account") + ")</option>"
                                    );
                                } else {
                                    options_html.push(
                                        "<option>" + _.escape(ordered_pops[p]) + "</option>"
                                    );
                                }
                            }

                            _.assign(
                                $scope,
                                {
                                    LOCALE: LOCALE,

                                    mbmeta: mbmeta,

                                    show_account_selector: ordered_pops.length > 1,
                                    account_options_html: $sce.trustAsHtml( options_html.join("") ),
                                    pops: ordered_pops,

                                    "account": account,

                                    mbsort: {
                                        sortBy: "vsize",
                                        sortDirection: "desc"
                                    },

                                    toggle_expunge: function toggle_expunge(mbname) {
                                        this._toggle_action( "expunge", mbname );
                                    },

                                    _toggle_action: function _toggle_action(the_action, mbname) {
                                        if (this.mbmeta[$scope.account][mbname]) {
                                            if (this.mbmeta[$scope.account][mbname].action === the_action) {
                                                this.mbmeta[$scope.account][mbname].action = null;
                                                return;
                                            }
                                        } else {
                                            this.mbmeta[$scope.account][mbname] = {
                                                expunge_preset: "1y",
                                            };
                                        }

                                        this.mbmeta[$scope.account][mbname].action = the_action;
                                    },

                                    reload: function reload() {
                                        if (!this.mbmeta[$scope.account]) {
                                            this.mbmeta[$scope.account] = {};
                                        }

                                        var batch_calls =  _get_reload_batch_calls($scope.account);
                                        var batch = new BATCH.Class(batch_calls);

                                        $scope.reloading = true;

                                        var promise = api.promise(batch);

                                        promise.finally( function() {
                                            delete $scope.reloading;
                                        } );

                                        return promise.then( function(good_resp) {
                                            _handle_reload_response( good_resp.data );
                                        } );
                                    },

                                    expunge: function expunge(mbname) {
                                        var query;

                                        var expunge_preset = this.mbmeta[$scope.account][mbname].expunge_preset;

                                        switch (expunge_preset) {
                                            case "1y":

                                                // Dovecot doesn’t have a way to say “1 year”,
                                                // but thankfully JS makes it easy to figure
                                                // out the number of days equivalent.
                                                var now = new Date();
                                                var now_1yr = new Date(now);
                                                now_1yr.setFullYear( now.getFullYear() - 1 );

                                                // Rounding shouldn’t be needed, but just in case.
                                                var days = Math.round( (now - now_1yr) / 86400000 );
                                                query = "savedbefore _days".replace(/_/, days);
                                                break;

                                            case "custom":
                                                query = this.mbmeta[$scope.account][mbname].expunge_query;
                                                break;

                                            default:
                                                query = QUERY_PRESETS[expunge_preset];
                                        }

                                        if (!query) {
                                            throw ( "Unknown preset: " + expunge_preset);
                                        }

                                        var expunge_api = new APIREQUEST.Class().initialize(
                                            "Mailboxes",
                                            "expunge_messages_for_mailbox_guid",
                                            {
                                                account: $scope.account,
                                                mailbox_guid: mailbox_by_name[mbname].guid,
                                                query: query,
                                            }
                                        );

                                        var batch_calls =  _get_reload_batch_calls($scope.account);
                                        batch_calls.unshift(expunge_api);

                                        var batch = new BATCH.Class(batch_calls);

                                        var scope = this;

                                        return api.promise(batch).then( function(good_resp) {
                                            growl.success( LOCALE.maketext("The operation on “[_1]” succeeded.", _.escape(mailbox_by_name[mbname].display_name)) );

                                            scope.mbmeta[$scope.account][mbname].action = null;

                                            var to_set = good_resp.data.slice(1);

                                            _handle_reload_response( to_set );
                                        } );
                                    },
                                }
                            );
                        },
                    ]);

                    BOOTSTRAP("#ng_content", "App");
                });
        };
    }
);

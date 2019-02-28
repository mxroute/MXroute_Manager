/*
# share/apps/mailinglists/src/services/mailingListsService       Copyright(c) 2014 cPanel, Inc.
#                                                                All rights Reserved.
# copyright@cpanel.net                                           http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, YAHOO:false, angular:false */

/*
 * Creates a new MailingListItem
 * @class MailingListItem
 *
 * Used by MailingListService to store
 * each async loaded item
 *
 */
/* jshint -W100 */
function MailingListItem() {

    var _self = this;

    _self.defaultValues = {
        accesstype: "",
        advertised: 0,
        archive_private: 0,
        desthost: "",
        diskused: "",
        humandiskused: "00.00 KB",
        list: "",
        listadmin: "",
        listid: "",
        subscribe_policy: 0
    };
}

/*
 * @method create
 * Sets variables on the this object by merging
 * defaultValues and the rawData from the api
 *
 * benefits of this method are in the event that
 * if the rawData format ever changes, only this
 * bridge function will have to be altered.
 *
 * @param rawData {object} api generated response.data object
 */
MailingListItem.prototype.create = function(rawData) {
    angular.extend(this, this.defaultValues, rawData);
};

/*
 * @method getAttribute
 * Gets the attribute by the name (key)
 *
 * this is useful for the table because the columns
 * can be selected dynamically within an ngRepeat.
 *
 * @param key {string} name of attribute to fetch
 * @return attribute [key] {*}
 */
MailingListItem.prototype.getAttribute = function(key) {
    return this[key];
};

/*
 * @method formatListAdmin
 *
 * formats string to specified rows and columns
 *
 * @param settings {object} name of attribute to fetch
 * @param settings.maxItems {int} number of items / rows to display
 *        prepends "... and [N] more."
 * @param settings.maxCols {int} name of attribute to fetch
 * @param settings.separator {string} row separator
 * @return formatted string or html string based on settings
 */
MailingListItem.prototype.formatListAdmins = function(settings) {
    var input = this.getAttribute("listadmin");
    var defaultFormatSettings = {
        maxItems: input.length,
        maxCols: input.length,
        separator: "\n"
    };
    settings = angular.extend(defaultFormatSettings, settings);
    var admins = input.split(",");

    var excess;

    for (var i = 0; i < admins.length; i++) {
        var admin = admins[i].replace(/[\r\n]/gi, "").trim();
        if (admin.length > settings.maxCols) {
            admin = admin.substr(0, settings.maxCols - 3) + "…";
        }

        admins[i] = admin;

        if (i === settings.maxItems - 1 && i + 2 < admins.length) {
            excess = admins.length - settings.maxItems;
            admins.splice(i + 1); // empty out remaining items
            break;
        }
    }
    var out;

    if (excess) {
        out = LOCALE.maketext("[join,_1,_2][_1] … and [numf,_3] more", settings.separator, admins, excess);
    } else {
        out = admins.join(settings.separator);
    }

    return out;
};

/*
 * Creates a new MailingListService
 * @class MailingListService
 *
 * This serves as the model for the app
 * currently only retrieving the data
 * but also storing configurations for
 * that retreival
 *
 */
function MailingListService($rootScope, AlertService) {

    var _self = this;
    _self.lists = [];
    _self.loading = false;
    _self.alertService = AlertService;

    _self.page = 0;
    _self.pageSize = 10;
    _self.maxPages = 3;
    _self.totalResults = 0;
    _self.filterValue = "";
    _self.totalPages = 0;
    _self.errors = [];
    _self.request = null;

    _self.meta = {
        sort: {
            sortBy: "list",
            sortDirection: "asc",
            sortType: ""
        }
    };
    _self.meta.sort.sortString = "list";

    /*
     * @method addItem
     * factory function for creating and adding a new MailingListItem
     *
     * @param rawData {object} api generated response.data object
     */
    _self.addItem = function(rawData) {
        var item = new MailingListItem();
        item.create(rawData);
        _self.lists.push(item);
    };

    /*
     * @method handleLoadSuccess
     * success callback function for the api call below
     *
     * @param response {object} CPANEL.api response object
     */
    _self.handleLoadSuccess = function(response) {
        _self.lists = [];
        for (var i = 0; i < response.cpanel_data.length; i++) {
            _self.addItem(response.cpanel_data[i]);
        }
        var paginateData = response.cpanel_raw.metadata.paginate;
        if (typeof paginateData !== "undefined") {
            _self.totalPages = paginateData.total_pages;
            _self.totalResults = paginateData.total_results;
        }
        _self.loading = false;
        $rootScope.$apply();
    };

    /*
     * @method handleLoadError
     * error callback function for the api call below
     * currently just resets the "loading" param
     * and "$apply()s the empty list"
     * TODO: Add error messaging
     *
     * @param response {object} CPANEL.api response object
     */
    _self.handleLoadError = function(response) {
        _self.loading = false;
        _self.alertService.clear();
        angular.forEach(response.cpanel_messages, function(message) {
            _self.alertService.add({
                message: message.content,
                type: message.level
            });
        });
        $rootScope.$apply();
    };

    /*
     * @method selectPage
     * sets the current page and reloads the list
     *
     * @param page {number} number of the page to load
     */
    _self.selectPage = function() {
        _self.getLists();
    };

    /*
     * @method selectPageSize
     * sets number of items to pull per page
     * and reloads the list
     *
     * @param pageSize {number} number of items to display per page
     */
    _self.selectPageSize = function(pageSize) {

        _self.pageSize = pageSize;
        _self.getLists();
    };

    /*
     * @method dataSorted
     * on sorting of the data (from ToggleSortDirective)
     * rebuild the sortString and reload the list
     *
     * @param sortBy {string} key to sort by
     * @param sortDirection {string} [asc,desc] direction of the sort
     * @param sortType {string} [numeric, ...] how to handle the data being sorted
     */
    _self.dataSorted = function() {
        _self.meta.sort.sortString = _self.meta.sort.sortDirection === "asc" ? _self.meta.sort.sortBy : "!" + _self.meta.sort.sortBy;
        _self.getLists();
    };

    /*
     * @method getLists
     * reload lists from fresh api call
     * using stored parameters
     *
     */
    _self.getLists = function() {

        if (YAHOO.util.Connect.isCallInProgress(_self.request)) {
            YAHOO.util.Connect.abort(_self.request);
            _self.request = null;
        }

        _self.errors = [];

        var api_params = {
            module: "Email",
            version: "3",
            func: "list_lists",
            data: {
                domain: CPANEL.PAGE.domain
            },
            api_data: {
                sort: [],
                filter: []
            },
            callback: {
                success: _self.handleLoadSuccess,
                failure: _self.handleLoadError
            }
        };

        if (_self.meta.sort.sortBy === "humandiskused") {
            api_params.api_data.sort.push([(_self.meta.sort.sortDirection === "asc" ? "" : "!") + "diskused", "numeric"]);
        } else if (_self.meta.sort.sortString !== "") {
            api_params.api_data.sort.push(_self.meta.sort.sortString);
        }
        if (_self.filterValue !== "") {
            api_params.api_data.filter.push(["*", "contains", _self.filterValue]);
        }
        if (_self.pageSize !== -1) {
            api_params.api_data.paginate = {
                start: (_self.page - 1) * _self.pageSize,
                size: _self.pageSize
            };
        }

        _self.request = CPANEL.api(api_params);
        _self.loading = true;
    };

    if ("initData" in window.PAGE) {

        _self.totalResults = Number(window.PAGE.initData.totalResults) || 0;
        _self.totalPages = Number(window.PAGE.initData.totalPages) || 1;
        _self.pageSize = Number(window.PAGE.initData.resultsPerPage) || _self.pageSizes[0];

        for (var i = 0; i < window.PAGE.initData.lists.length; i++) {
            _self.addItem(window.PAGE.initData.lists[i]);
        }
    } else {
        _self.getLists();
    }

}

define(
    'app/services/mailingListsService',[

        // Libraries
        "angular",
        "cjt/util/locale",
        "cjt/services/alertService"
    ],
    function(angular) {

        // Fetch the current application
        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        MailingListService.$inject = ["$rootScope", "alertService"];
        app.service("mailingListsService", MailingListService);
    }
);

/*
# share/apps/mailinglists/src/views/mailingListsController    Copyright(c) 2014 cPanel, Inc.
#                                                             All rights Reserved.
# copyright@cpanel.net                                        http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    'app/controllers/mailingListsController',[
        "angular",
        "app/services/mailingListsService"
    ],
    function(angular) {

        // Fetch the current application
        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }

        /*
         * Creates a new MailingListsController
         * @class MailingListsController
         *
         * table view controller
         *
         */
        function MailingListsController($scope, MailingListService) {

            var _self = this;

            _self.model = MailingListService;

            _self.columnHeaders = [];

            /*
             * @method addColumn
             * builds column header object
             *
             * @param key {string} column key name (coorelates to api params)
             * @param name {string} Localized name used to label column
             */
            _self.addColumn = function(key, name) {
                _self.columnHeaders.push({
                    "key": key,
                    "name": name
                });
            };

            /*
             * @method getHeaders
             * get array of column headers
             *
             * @return {array} list of column objects {key:...,name:...}
             */
            _self.getHeaders = function() {
                return _self.columnHeaders;
            };

            /*
             * @method getLists
             * get array lists to display
             *
             * @return {array} list of MailingListItems
             */
            _self.getLists = function() {
                return _self.model.lists;
            };

            /*
             * add initial columns
             */
            _self.addColumn("list", LOCALE.maketext("List Name"));
            _self.addColumn("humandiskused", LOCALE.maketext("Usage"));
            _self.addColumn("accesstype", LOCALE.maketext("Access"));
            _self.addColumn("listadmin", LOCALE.maketext("Admin"));
            _self.addColumn("functions", LOCALE.maketext("Functions"));
        }

        MailingListsController.$inject = ["$scope", "mailingListsService"];
        app.controller("mailingListsController", MailingListsController);

    });

/*
# share/apps/mailinglists/src/views/mainController          Copyright(c) 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

/* TABLE ControllerCode */

define(
    'app/controllers/mainController',[
        "angular",
        "app/services/mailingListsService",
        "cjt/directives/alertList",
        "cjt/filters/qaSafeIDFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(angular) {


        // Fetch the current application
        var app;
        try {
            app = angular.module("App"); // For runtime
        } catch (e) {
            app = angular.module("App", []); // Fall-back for unit testing
        }


        /*
         * Creates a new MainController
         * @class MainController
         *
         * serves the purpose of the table controller
         * and handles the inital loading of the lists
         *
         */
        function MainController($scope, MailingListService, spinnerAPI) {

            var _self = this;

            _self.model = MailingListService;
            _self.spinner = spinnerAPI;

            $scope.totalItems = _self.model.totalResults;
            $scope.currentPage = _self.model.page;

            /*
             * watches the loading param on the MalingListService
             * and shows or hides the spinner accordingly
             */
            $scope.$watch(function() {
                return _self.model.loading;
            }, function() {
                if (_self.model.loading) {
                    _self.spinner.start();
                } else {
                    _self.spinner.stop();
                }
            });

            /*
             * @method startSearch
             * wrapper function to start the search based on filter
             *
             */
            _self.startSearch = function() {
                _self.model.page = 0;
                _self.model.getLists();
            };

            /*
             * @method clearSearch
             * clear the filterValue and reload lists
             *
             */
            _self.clearSearch = function() {
                _self.model.filterValue = "";
                _self.model.selectPage(0);
            };

            $scope.$watch(function() {
                return _self.model.pageSize;
            }, function(newValue, oldValue) {

                if (newValue !== oldValue) {
                    _self.model.getLists();
                }
            });

            $scope.$watch(function() {
                return _self.model.filterValue;
            }, function(newValue, oldValue) {
                if (newValue !== "") {
                    _self.startSearch();
                } else if (newValue !== oldValue) {
                    _self.clearSearch();
                }
            });

        }

        MainController.$inject = ["$scope", "mailingListsService", "spinnerAPI"];
        app.controller("mainController", MainController);

    });

/*
# mail/lists/lists.js                                Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

(function(window) {
    "use strict";

    var LOCALE = window.LOCALE,
        CPANEL = window.CPANEL,
        YAHOO = window.YAHOO,
        DOM = YAHOO.util.Dom,
        EVENT = YAHOO.util.Event,
        PAGE = window.CPANEL.PAGE;

    var Handlebars = window.Handlebars;

    var privacy_opts_maker;

    var record_by_email = {};

    if (PAGE.lists && PAGE.lists.length) {
        for (var l = PAGE.lists.length - 1; l >= 0; l--) {
            record_by_email[PAGE.lists[l].list] = PAGE.lists[l];
        }
    }

    // NOTE: Keep this in sync with Cpanel::Mailman!
    var PRIVATE_PRIVACY_OPTIONS = {
        advertised: false,
        archive_private: true,
        subscribe_policy: ["3", "2"]
    };

    /*
     * Submit handler that triggers when the "Proceed" button is pressed on "Edit Privacy Options" dialog
     *
     * @method privacy_opts_popup
     * @param {String} type The event type
     * @param {Array} args
     * @param {Object} obj The object returned on callback
     */

    function _privacy_opts_submit_handler(type, args, obj) {
        var dialog = obj.dialog;

        var params = CPANEL.dom.get_data_from_form(
            dialog.form, {
                include_unchecked_checkboxes: 0 // represents these as a "0"
            }
        );

        params.list = obj.list;

        CPANEL.api({
            version: 3,
            module: "Email",
            func: "set_list_privacy_options",
            data: params,

            callback: CPANEL.ajax.build_page_callback(function() {
                obj.onSuccess.call();
                dialog.destroy();
            }, {
                on_error: dialog.destroy.bind(dialog)
            })
        });
    }

    /* Sets the values in the "Edit Privacy Options" dialog based on existing object that should mirror Cpanel::Mailman
     *
     * @method _set_private_values_in_form
     */

    function _set_private_values_in_form() {
        /* jshint validthis: true */
        var clicked_el = this;

        var form = DOM.getAncestorByTagName(clicked_el, "form");
        var form_data = CPANEL.dom.get_data_from_form(form);

        for (var key in PRIVATE_PRIVACY_OPTIONS) {
            if (form[key].type === "checkbox") {
                form[key].checked = PRIVATE_PRIVACY_OPTIONS[key];
            } else {
                var acceptable = PRIVATE_PRIVACY_OPTIONS[key];
                if (!YAHOO.lang.isArray(acceptable)) {
                    acceptable = [acceptable];
                }

                if (acceptable.indexOf(form_data[key]) === -1) {
                    CPANEL.dom.set_form_el_value(form[key], acceptable[0]);
                }
            }
        }

        _update_access_type_text_in_form("private");
    }


    /*
     * Update the displayed access type in the access type dialog box.
     *
     * @method _update_access_type_text_in_form
     * @param {String} new_type The access type to translate and display.
     */

    function _update_access_type_text_in_form(new_type) {
        DOM.get("form_access_type").innerHTML = PAGE.translated_access_type[new_type];
    }


    /*
     * Re-evaluate and update the displayed access type in the access type dialog box.
     *
     * @method _reevaluate_access_type_in_form
     * @param {Event | null} evt The event that triggered this call. (unused)
     * @param {DOM} the_form The form DOM node to evaluate for public/private-setting.
     */

    function _reevaluate_access_type_in_form(evt, the_form) {
        var type = "private";
        var to_compare;

        var form_data = CPANEL.dom.get_data_from_form(the_form);

        for (var key in PRIVATE_PRIVACY_OPTIONS) {
            if (PRIVATE_PRIVACY_OPTIONS.hasOwnProperty(key)) {
                if (the_form[key].type === "checkbox") {
                    to_compare = !!form_data[key];
                } else {
                    to_compare = form_data[key];
                }

                var acceptable_for_private = PRIVATE_PRIVACY_OPTIONS[key];
                if (YAHOO.lang.isArray(acceptable_for_private)) {
                    if (acceptable_for_private.indexOf(to_compare) === -1) {
                        type = "public";
                    }
                } else if (to_compare !== acceptable_for_private) {
                    type = "public";
                }

                if (type === "public") {
                    break;
                }
            }
        }

        _update_access_type_text_in_form(type);
    }


    /*
     * Same as _reevaluate_access_type_in_form(), but with a slight delay
     * so that this can be used on reset() event listeners.
     *
     * @method _delayed_reevaluate_access_type_in_form
     * @param {Event | null} evt The event that triggered this call. (unused)
     * @param {DOM} the_form The form DOM node to evaluate for public/private-setting.
     */

    function _delayed_reevaluate_access_type_in_form(evt, the_form) {
        setTimeout(
            function() {
                _reevaluate_access_type_in_form(evt, the_form);
            },
            1
        );
    }

    /*
     * Show the popup of privacy options in the mailing list UI.
     *
     * @method privacy_opts_popup
     * @param {Object} list The list record.
     * @param {DOM} clicked_obj The DOM node that received the "click" that opens this popup.
     */

    function privacy_opts_popup(list, clicked_obj, successFunction) {

        if (!privacy_opts_maker) {
            privacy_opts_maker = Handlebars.compile(DOM.get("change_list_privacy_template").text.trim());
        }

        var dialog = new CPANEL.ajax.Common_Dialog(null, {
            close: true,
            show_status: true,
            status_html: LOCALE.maketext("Saving …")
        });

        dialog.setHeader(CPANEL.widgets.Dialog.applyDialogHeader(
            LOCALE.maketext("Edit Privacy Options: “[_1]”", list.list.html_encode())
        ));

        var list_record = list;
        var subscribe_policy = String(list_record.subscribe_policy);

        dialog.form.innerHTML = privacy_opts_maker({
            advertised: String(list_record.advertised) === "1",

            archive_private: String(list_record.archive_private) === "1",

            subscribe_policy_is_1: subscribe_policy === "1",
            subscribe_policy_is_2: subscribe_policy === "2",
            subscribe_policy_is_3: subscribe_policy === "3"
        });

        dialog.submitEvent.subscribe(
            _privacy_opts_submit_handler, {
                list: list.list.html_encode(),
                dialog: dialog,
                onSuccess: successFunction
            }
        );

        dialog.show_from_source(clicked_obj);

        _reevaluate_access_type_in_form(null, dialog.form);

        EVENT.on(dialog.form, "change", _reevaluate_access_type_in_form, dialog.form);
        EVENT.on(dialog.form, "reset", _delayed_reevaluate_access_type_in_form, dialog.form);

        var private_values_el = CPANEL.Y(dialog.form).one(".set-private-values");
        EVENT.on(private_values_el, "click", _set_private_values_in_form);
    }

    YAHOO.lang.augmentObject(window, {
        privacy_opts_popup: privacy_opts_popup
    });

    if (PAGE.notice) {
        PAGE.noticeHandle = new CPANEL.widgets.Page_Notice(PAGE.notice);
    }
}(window));

define(
    'app/lists',[
        "angular",
        "cjt/modules"
    ],
    function(angular) {
        "use strict";

        angular.module("App", ["ui.bootstrap", "cjt2.cpanel"]);

        /*
         * this looks funky, but these require that
         * angular be loaded before they can be loaded
         * so the nested requires become relevant
         */
        var app = require(
            [
                "cjt/directives/toggleSortDirective",
                "cjt/directives/spinnerDirective",
                "cjt/directives/searchDirective",
                "cjt/directives/pageSizeDirective",
                "app/services/mailingListsService",
                "app/controllers/mailingListsController",
                "app/controllers/mainController",
                "uiBootstrap"
            ],
            function() {

                var app = angular.module("App");

                /*
                 * filter used to escape emails and urls
                 * using native js escape
                 */
                app.filter("escape", function() {
                    return window.escape;
                });

                /* PrivacyWindowController */

                /*
                 * Creates a new PrivacyWindowController
                 * @class PrivacyWindowController
                 *
                 * serves as a controller to connect to the privacy window pop_up
                 *
                 */
                function PrivacyWindowController(mailingListsService) {
                    var _self = this;

                    /*
                     * @method closed
                     * callback on close of the popup
                     *
                     */
                    PrivacyWindowController.prototype.closed = function() {
                        mailingListsService.getLists();
                    };

                    /*
                     * @method open
                     * opens the popup
                     *
                     * @param list {object} lists item
                     * @param target {string} id of dom js target
                     *
                     */
                    PrivacyWindowController.prototype.open = function(list, target) {
                        window.privacy_opts_popup(list, target.currentTarget, _self.closed);
                    };
                }

                PrivacyWindowController.$inject = ["mailingListsService"];
                app.controller("PrivacyWindowController", PrivacyWindowController);

                /*
                 * because of the race condition with the dom loading and angular loading
                 * before the establishment of the app
                 * a manual initiation is required
                 * and the ng-app is left out of the dom
                 */
                app.init = function() {
                    var appContent = angular.element("#content");

                    if (appContent[0] !== null) {

                        // apply the app after requirejs loads everything
                        angular.bootstrap(appContent[0], ["App"]);
                    }

                    return app;
                };

                app.init();
            });

        return app;
    }
);


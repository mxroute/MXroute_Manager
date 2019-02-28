/*
# templates/mail/calenadars_and_contacts/views/configController.js
#                                                 Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false, PAGE: true */

define(
    [
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/filters/wrapFilter"
    ],
    function(angular, LOCALE) {

        // Retrieve the current application
        var app = angular.module("App");

        // Setup the controller
        var controller = app.controller(
            "configController", [
                "$scope",
                function(
                    $scope
                ) {

                    /**
                     * Initialize the view
                     *
                     * @private
                     * @method _initializeView
                     */
                    var _initializeView = function() {

                        // check for page data in the template if this is a first load
                        if (app.firstLoad.config && PAGE.config) {
                            app.firstLoad.config = false;
                            $scope.showInfoBlock = false;
                            $scope.config    = PAGE.config;
                            $scope.secureResources = _mergeArrays(PAGE.config.ssl.calendars, PAGE.config.ssl.contacts);
                            $scope.resources = _mergeArrays(PAGE.config.no_ssl.calendars, PAGE.config.no_ssl.contacts);
                        }
                    };

                    $scope.toggleInfoBlock = function() {
                        $scope.showInfoBlock = !$scope.showInfoBlock;
                    };

                    /**
                     * Merge the calendar array with the contacts array for use in the template.
                     * Adds a type property to each object so they can still be identified.
                     *
                     * @private
                     * @param  {Array} calendars   Array of calendar configuration objects
                     * @param  {Array} contacts    Array of contacts configuration objects
                     * @return {Array}             Merged/modified array
                     */
                    var _mergeArrays = function(calendars, contacts) {
                        calendars = calendars || [];
                        contacts  = contacts  || [];

                        calendars.forEach(function(calendar) {
                            calendar.type = LOCALE.maketext("Calendar");
                        });

                        contacts.forEach(function(addressBook) {
                            addressBook.type = LOCALE.maketext("Contacts");
                        });

                        return calendars.concat(contacts);
                    };

                    _initializeView();

                }
            ]
        );

        return controller;
    }
);

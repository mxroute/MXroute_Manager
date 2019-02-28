/*
 * multiphp_ini_editor/views/editorMode.js                Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, PAGE: true */
/* global ace: false */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "jquery",
        "ace",
        "uiBootstrap",
        "cjt/directives/alertList",
        "cjt/services/alertService",
        "cjt/decorators/growlDecorator",
        "app/services/configService",
    ],
    function(angular, _, LOCALE, $) {

        // Retrieve the current application
        var app = angular.module("App");

        var controller = app.controller(
            "editorMode",
            ["$scope", "$location", "$routeParams", "$timeout", "spinnerAPI", "alertService", "growl", "growlMessages", "configService",
                function($scope, $location, $routeParams, $timeout, spinnerAPI, alertService, growl, growlMessages, configService) {

                // Setup data structures for the view
                    var iniUserPaths = []; // This will contain all data about INI paths.
                    var alreadyInformed = false;
                    var infoGrowlHandle;
                    $scope.noIniPaths = true;
                    $scope.txtInFirstOption = LOCALE.maketext("[comment,used for highlight in select option]-- Not Available --[comment,used for highlight in select option]");
                    $scope.selectedIniPath = { type: "", name: "" };

                    // This is strip down version of 'iniUserPaths' which only contains
                    // type & name attributes to display in the dropdown.
                    $scope.iniPathNames = [];

                    $scope.processingEditor = false;
                    var editor;

                    $scope.loadContent = function() {

                    // Destroy all growls before attempting to submit something.
                        growlMessages.destroyAllMessages();

                        if ($scope.selectedIniPath.type) {
                            spinnerAPI.start("loadingSpinner");
                            var selectedIni = $scope.selectedIniPath;
                            editorInProcess(true);
                            alreadyInformed = false;
                            var pathInfo = getIniPathInfo($scope.selectedIniPath);

                            // construct the path to php.ini
                            if (pathInfo.type === "home") {
                                pathInfo.inifullpath = pathInfo.homedir + "/" + pathInfo.path;
                            } else if (pathInfo.type === "vhost") {
                                pathInfo.inifullpath = pathInfo.documentroot + "/" + pathInfo.path;
                            }
                            $scope.currentIniPathInfo = pathInfo;
                            return configService
                                .fetchContent(selectedIni.type, selectedIni.name)
                                .then(function(content) {
                                    if (content !== "undefined") {
                                        if (content === "") {
                                            growl.info(LOCALE.maketext("The [asis,INI] content does not exist. You may add new content."));
                                        }

                                        // Using jquery way of decoding the html content.
                                        // Tried to use '_' version of unescape method but it
                                        // did not decode encoded version of apostrophe (')
                                        // where the code is &#39;
                                        var htmlContent = $("<div/>").html(content).text();

                                        // Create Ace editor object if it's not yet created.
                                        if (typeof (editor) === "undefined") {
                                            editor = ace.edit("editor");

                                            // The below line is added to disable a
                                            // warning message as required by ace editor
                                            // script.
                                            editor.$blockScrolling = Infinity;
                                            editor.setShowPrintMargin(false);
                                        }

                                        // Bring the text area into focus and scroll to
                                        // the top of the INI document if a new one is loaded.
                                        editor.focus();
                                        editor.scrollToRow(0);

                                        // Set the editor color theme.
                                        editor.setTheme("ace/theme/chrome");

                                        var editSession = ace.createEditSession(htmlContent);
                                        editor.setSession(editSession);
                                        if (typeof (editSession) !== "undefined") {
                                            editSession.setMode("ace/mode/ini");
                                            editor.on("change", $scope.informUser);
                                        }
                                    }
                                }, function(error) {

                                // failure
                                    growl.error(error);
                                })
                                .then(function() {
                                    editorInProcess(false);
                                })
                                .finally(function() {
                                    spinnerAPI.stop("loadingSpinner");
                                });
                        }
                    };

                    $scope.informUser = function() {
                        if (!alreadyInformed) {
                            alreadyInformed = true;
                            growl.info(LOCALE.maketext("You must click “[_1]” to apply the new changes.", LOCALE.maketext("Save")),
                                {
                                    ttl: -1,
                                    onopen: function() {
                                        infoGrowlHandle = this;
                                    }
                                }
                            );
                        }
                    };

                    $scope.save = function() {

                    // Destroy all growls before attempting to submit something.
                        growlMessages.destroyAllMessages();
                        alreadyInformed = false;
                        if ( typeof infoGrowlHandle !== "undefined" ) {
                            infoGrowlHandle.destroy();
                        }
                        editorInProcess(true);
                        var changedContent = _.escape(editor.getSession().getValue());

                        return configService.saveIniContent(changedContent, $scope.selectedIniPath.type, $scope.selectedIniPath.name)
                            .then(
                                function(data) {
                                    if (typeof (data) !== "undefined") {
                                        growl.success(LOCALE.maketext("Successfully saved the changes."));
                                    }
                                }, function(error) {

                                // escape the error text to prevent XSS attacks.
                                    growl.error(_.escape(error));
                                })
                            .then(function() {
                                editorInProcess(false);
                            });
                    };

                    var editorInProcess = function(processing) {
                        if (typeof (editor) !== "undefined") {
                            editor.setReadOnly(processing);
                        }

                        $scope.processingEditor = processing;
                    };

                    var getIniPathInfo = function(shortPathInfo) {

                    // filter the required path info from iniUserPaths
                        var pathInfo = _.find(iniUserPaths, function(path) {

                        // There can be only one record of type 'home'
                            if (shortPathInfo.type === "home" && path.type === "home") {
                                return true;
                            } else if (shortPathInfo.type === "vhost" && shortPathInfo.name === path.vhost) {
                                return true;
                            }
                        });

                        return pathInfo;
                    };

                    var setIniPathDropdown = function(iniList) {

                    // iniList is sent to the function when the
                    // dropdown is bound the first time.
                        if (iniList.length > 0) {
                            iniUserPaths = iniList;
                            var mainDomainName;

                            // Map the object: { type, name } to the iniPathNames array, filtering out the home directory item
                            // and primary domain item. They will be added to the top of the list later.
                            _.each(iniList, function(iniPath) {
                                if (iniPath.type !== "home" && !iniPath.main_domain) {
                                    $scope.iniPathNames.push({ type: iniPath.type, name: iniPath.vhost });
                                } else if (iniPath.main_domain) {

                                // Save the Primary Domain name
                                    mainDomainName = iniPath.vhost;
                                }
                            });

                            // Sort the resultant $scope.iniPathNames
                            $scope.iniPathNames = _.sortBy($scope.iniPathNames, "name");

                            // Push the Home Directory & Primary Domain entries on top of the list.
                            $scope.iniPathNames.unshift({ type: "vhost", name: mainDomainName });
                            $scope.iniPathNames.unshift({ type: "home", name: "Home Directory" });
                        }

                        if ($scope.iniPathNames.length > 0) {
                            $scope.noIniPaths = false;
                            $scope.txtInFirstOption = LOCALE.maketext("[comment,used for highlight in select option]-- Select a location --[comment,used for highlight in select option]");
                        }
                    };

                    $scope.$on("$viewContentLoaded", function() {

                    // Destroy all growls before attempting to submit something.
                        growlMessages.destroyAllMessages();

                        var phpIniData = PAGE.php_ini_data;

                        if (!phpIniData.status && phpIniData.errors.length > 0) {

                        // Handle errors
                            var errors = phpIniData.errors;
                            errors.forEach(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    id: "alertMessages",
                                    replace: false,
                                    closeable: true
                                });
                            });
                            growl.error(LOCALE.maketext("Errors occurred while retrieving the [asis,PHP INI] locations."));
                        }

                        // Bind PHP INI Files specific to dropdown
                        setIniPathDropdown(phpIniData.data.paths);
                    });
                }
            ]);

        return controller;
    }
);

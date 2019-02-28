/*
 * multiphp_ini_editor/views/basicMode.js                Copyright(c) 2015 cPanel, Inc.
 *                                                                 All rights Reserved.
 * copyright@cpanel.net                                               http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false, PAGE: true */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/alertList",
        "cjt/directives/spinnerDirective",
        "cjt/decorators/growlDecorator",
        "cjt/services/alertService",
        "app/services/configService",
        "cjt/directives/actionButtonDirective"
    ],
    function(angular, _, LOCALE) {

        // Retrieve the current application
        var app = angular.module("App");

        var controller = app.controller(
            "basicMode",
            ["$scope", "$location", "configService", "$routeParams", "$timeout", "spinnerAPI", "alertService", "growl",
                function($scope, $location, configService, $routeParams, $timeout, spinnerAPI, alertService, growl) {

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

                    $scope.loadingDirectiveList = false;
                    $scope.showEmptyMessage = false;

                    $scope.knobLabel = "\u00a0";

                    var resetForm = function() {

                        // Reset the directive list to empty.
                        $scope.directiveList = [];
                        $scope.showEmptyMessage = false;
                    };

                    $scope.loadDirectives = function() {

                        // Destroy all growls before attempting to submit something.
                        alertService.clear();

                        if ($scope.selectedIniPath.type) {
                            spinnerAPI.start("loadingSpinner");
                            var selectedIni = $scope.selectedIniPath;
                            $scope.loadingDirectiveList = true;
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

                                // 'name' variable contains vhost value for all ini paths of type:'vhost'.
                                .fetchBasicList(selectedIni.type, selectedIni.name)
                                .then(function(data) {
                                    if (typeof (data.directives) !== "undefined" && data.directives.length > 0 ) {
                                        var directiveData = data.directives;

                                        // If the handler is not suPHP make sure to hide the directives
                                        // that can be edited only by the system.
                                        return configService.getHandlerForDomain(selectedIni.type, selectedIni.name)
                                            .then(function(data) {
                                                if (data.php_handler !== "suphp") {
                                                    directiveData = _.filter(directiveData, function(dir) {
                                                        return dir.php_ini_mode !== "PHP_INI_SYSTEM";
                                                    });
                                                }

                                                // Map the localized string for the directives' defaults
                                                // to show them with the directive values.
                                                $scope.directiveList = directiveData.map(function(item) {
                                                    item.toggleValue = ( item.value === "On" ) ? true : false;
                                                    var defaultPhpValue = item.default_value;
                                                    if ( typeof item.cpanel_default !== "undefined" && item.cpanel_default !== null ) {
                                                        defaultPhpValue = item.cpanel_default;
                                                    }
                                                    if ( item.type === "boolean" ) {
                                                        defaultPhpValue = item.default_value === "1" ?
                                                            LOCALE.maketext("Enabled") : LOCALE.maketext("Disabled");
                                                    }
                                                    item.default_text = LOCALE.maketext("[asis,PHP] Default: [output,class,_1,defaultValue]", defaultPhpValue);
                                                    return item;
                                                });
                                            }, function(error) {
                                                alertService.add({
                                                    type: "danger",
                                                    message: error,
                                                    closeable: true,
                                                    replace: false,
                                                    group: "multiphpIniEditor"
                                                });
                                            });
                                    }
                                }, function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        replace: false,
                                        group: "multiphpIniEditor"
                                    });
                                })
                                .then(function() {
                                    $scope.loadingDirectiveList = false;
                                    spinnerAPI.stop("loadingSpinner");
                                })
                                .finally(function() {
                                    spinnerAPI.stop("loadingSpinner");
                                    $scope.showEmptyMessage = $scope.selectedIniPath !== "" && $scope.directiveList.length <= 0;
                                }
                                );
                        } else {
                            resetForm();
                        }
                    };

                    var informUser = function() {
                        if (!alreadyInformed) {
                            alreadyInformed = true;

                            // TODO: Replace this info growl with alert service.
                            growl.info(LOCALE.maketext("You must click “[_1]” to apply the new changes.", LOCALE.maketext("Apply")),
                                {
                                    ttl: -1,
                                    onopen: function() {
                                        infoGrowlHandle = this;
                                    }
                                }
                            );
                        }
                    };

                    $scope.toggle_status = function(directive) {
                        if (directive.value === "On") {
                            directive.value = "Off";
                            directive.toggleValue = false;
                        } else {
                            directive.value = "On";
                            directive.toggleValue = true;
                        }
                        informUser();
                    };

                    $scope.directiveTextChange = function(directive) {
                        informUser();
                        var type = directive.type;
                        var text = directive.value || "";
                        var valid = true;
                        var valMsg = "";
                        if (type === "integer") {

                            // Do the integer thing.
                            var E_FLAG = "[~!]?\\s*E_(?:(?:(?:CORE_|COMPILE_|USER_)?(?:ERROR|WARNING))|(?:USER_)?(?:NOTICE|DEPRECATED)|PARSE|STRICT|RECOVERABLE_ERROR|ALL)";
                            var E_OPER = "[&|^]";
                            var intRegex = new RegExp("^\\s*" + E_FLAG + "(?:\\s*" + E_OPER + "\\s*" + E_FLAG + ")*$");
                            if (/^-?\d+[kmg]?$/i.test(text) || intRegex.test(text)) {
                                valid = true;
                            } else {
                                valid = false;
                                valMsg = LOCALE.maketext("You must provide either an integer value, a [output,url,_1,shorthand byte,target,blank,title,shorthand byte documentation], or a [output,url,_2,predefined constant,target,blank,title,predefined constant documentation].", "http://php.net/manual/en/faq.using.php#faq.using.shorthandbytes", "http://php.net/manual/en/errorfunc.constants.php");
                            }
                        } else if (type === "float") {
                            if (/^-?\d+(?:\.\d*)?$/.test(text)) {
                                valid = true;
                            } else {
                                valid = false;
                                valMsg = LOCALE.maketext("You must provide a valid float value.");
                            }
                        }
                        $scope.basicModeForm["txt" + directive.key].$setValidity("pattern", valid);
                        directive.validationMsg = valMsg;
                    };

                    $scope.disableApply = function() {
                        return ($scope.noIniPaths || !$scope.selectedIniPath.type || !$scope.basicModeForm.$valid);
                    };

                    $scope.requiredValidation = function(directive) {
                        return (directive.type !== "string" && directive.type !== "boolean");
                    };

                    $scope.applyPhpSettings = function() {

                        if ($scope.basicModeForm.$valid) {

                            // Destroy all growls before attempting to submit something.
                            alertService.clear();
                            alreadyInformed = false;
                            if ( typeof infoGrowlHandle !== "undefined" ) {
                                infoGrowlHandle.destroy();
                            }
                            return configService.applySettings($scope.selectedIniPath.type, $scope.selectedIniPath.name, $scope.directiveList)
                                .then(
                                    function(data) {
                                        if (data !== undefined) {
                                            alertService.add({
                                                type: "success",
                                                message: LOCALE.maketext("Successfully applied the settings."),
                                                closeable: true,
                                                replace: false,
                                                autoClose: 10000,
                                                group: "multiphpIniEditor"
                                            });
                                        }
                                    }, function(error) {

                                        // The error returned already is encoded in the backend response.
                                        // CJT2/uapi.js->find_messages() again applies escape() to the text.
                                        // This is causing issue EA-3862. Removing escape() in uapi.js may break any existing stuff.
                                        // So applying a hack here specific to this API.
                                        alertService.add({
                                            type: "danger",
                                            message: _.unescape(error),
                                            closeable: true,
                                            replace: false,
                                            group: "multiphpIniEditor"
                                        });
                                    });
                        }
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
                        alertService.clear();

                        var phpIniData = PAGE.php_ini_data;
                        $scope.localeIsRTL = PAGE.locale_is_RTL ? true : false;

                        if (!phpIniData.status && phpIniData.errors.length > 0) {

                            // Handle errors
                            var errors = phpIniData.errors;
                            errors.forEach(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    replace: false,
                                    closeable: true,
                                    group: "multiphpIniEditor"
                                });
                            });
                        } else {

                            // Bind PHP INI Files specific to dropdown
                            setIniPathDropdown(phpIniData.data.paths);
                        }
                    });
                }
            ]);

        return controller;
    }
);

/*
# file_and_directory_restoration/views/list.js
#                                                    Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/services/cpanel/nvDataService",
        "app/services/backupAPI",
        "app/services/backupTypeService",
        "uiBootstrap",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList"
    ],
    function(angular, _, LOCALE) {
        "use strict";

        // Retrieve the current application
        var app = angular.module("App");

        app.controller("restoreModalController", [
            "$scope",
            "backupTypeService",
            "$uibModalInstance",
            "fileExists",
            function(
                $scope,
                backupTypeService,
                $uibModalInstance,
                fileExists
            ) {
                $scope.fileExists = fileExists;
                $scope.itemType = backupTypeService.getBackupType();
                $scope.closeModal = function() {
                    $uibModalInstance.close();
                };

                $scope.runIt = function() {
                    $uibModalInstance.close(true);
                };
            }
        ]);

        // Setup the controller
        var controller = app.controller(
            "listController", [
                "$scope",
                "backupAPIService",
                "backupTypeService",
                "$uibModal",
                "nvDataService",
                "alertService",
                function(
                    $scope,
                    backupAPIService,
                    backupTypeService,
                    $uibModal,
                    nvDataService,
                    alertService
                ) {

                    /**
                     * Called when path changes
                     *
                     * @scope
                     * @method buildBreadcrumb
                     */
                    $scope.buildBreadcrumb = function() {
                        $scope.directoryBreadcrumb = [];

                        var directories = $scope.currentPath.split("/");
                        var parentFolder = "/";
                        for (var i = 0, length = directories.length; i < length - 1; i++) {
                            if (i === 0) {
                                $scope.directoryBreadcrumb.push({
                                    folder: parentFolder,
                                    path: parentFolder,
                                    displayPath: directories[i]
                                });
                            } else {
                                $scope.directoryBreadcrumb.push({
                                    folder: parentFolder,
                                    path: parentFolder + directories[i] + "/",
                                    displayPath: directories[i]
                                });
                                parentFolder = parentFolder + directories[i] + "/";
                            }
                        }
                    };

                    /**
                     * Conditionally change to the home directory. Prevents
                     * superfluous page reloads.
                     *
                     * @scope
                     * @method goHome
                     */
                    $scope.goHome = function() {
                        if ($scope.currentPath !== "/") {
                            $scope.changeDirectory("/");
                        }
                    };

                    /**
                     * Change to a different directory and get the list of files in that directory
                     *
                     * @scope
                     * @method changeDirectory
                     * @param  {String} path file system path user is directing to
                     */
                    $scope.changeDirectory = function(path) {
                        $scope.loadingData = true;
                        $scope.backupList = [];
                        var newPath;

                        if (!path) {
                            newPath = $scope.directoryBreadcrumb[$scope.directoryBreadcrumb.length - 2].path;
                        } else {
                            newPath = path;
                        }

                        // add necessary trailing slash to path string for proper API format
                        if (newPath.charAt(newPath.length - 1) !== "/") {
                            newPath = newPath + "/";
                        }

                        // add necessary leading slash for proper API format
                        if (newPath.charAt(0) !== "/") {
                            newPath = "/" + newPath;
                        }

                        // Calculate pagination parameters
                        $scope.meta.start = ($scope.meta.currentPage - 1) * $scope.meta.pageSize + 1;

                        // Reset pagination if going to a different path or changing page size larger than total items
                        if (newPath !== $scope.currentPath || $scope.meta.start > $scope.meta.totalItems) {
                            $scope.meta.currentPage = 1;
                            $scope.meta.start = 1;
                        }

                        // checks to see if directory user is navigating into exists on the disk
                        for (var i = 0, length = $scope.currentDirectoryContent.length; i < length; i++) {
                            if ($scope.currentDirectoryContent[i].fullPath === path) {
                                $scope.selectedItemExists = $scope.currentDirectoryContent[i].exists;
                                break;
                            }
                        }

                        // Call API to fetch the new directory info
                        backupAPIService.listDirectory(newPath, $scope.meta.currentPage, $scope.meta.pageSize)
                            .then(function(apiResult) {
                                $scope.currentPath = newPath;
                                $scope.buildBreadcrumb();
                                $scope.addPaths(apiResult.data);

                                // Update pagination
                                var pagination = apiResult.meta.paginate;
                                $scope.updatePagination(pagination);
                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "cpanel-restoration"
                                });
                            })
                            .finally(function() {
                                $scope.loadingData = false;
                            });
                    };

                    /**
                     * Update page size for pagination
                     *
                     * @scope
                     * @method changePageSize
                     */
                    $scope.changePageSize = function() {
                        nvDataService.setObject({
                            "file_restoration_page_size": $scope.meta.pageSize
                        });
                        $scope.changeDirectory($scope.currentPath);
                    };

                    /**
                     * Jump to specified page
                     *
                     * @param {Number} pageNumber - page number that user is going to
                     * @param {String} currentPath - current directory path
                     */
                    $scope.goToPage = function(pageNumber, currentPath) {
                        var pageExists = $scope.checkIfPageExists(pageNumber);

                        // when the page input is empty do not do anything
                        if (pageNumber === null || isNaN(pageNumber)) {
                            return;
                        } else {
                            if (pageExists) {
                                $scope.meta.currentPage = parseInt(pageNumber, 10);
                                $scope.changeDirectory(currentPath);
                            } else {
                                $scope.pageDoesNotExist = true;
                            }
                        }
                    };

                    /**
                     * Create pagination message
                     *
                     * @scope
                     */
                    $scope.setPaginationMessage = function(start, limit, totalItems) {

                        if (totalItems === 0) {
                            start = 0;
                            limit = 0;
                        }
                        $scope.paginationMessage = LOCALE.maketext("Displaying [numf,_1] to [numf,_2] out of [quant,_3,item,items]", start, limit, totalItems);
                    };

                    /**
                     * Update pagination values
                     *
                     * @scope
                     * @param {Object} pagination - object containing pagination values
                     */
                    $scope.updatePagination = function(pagination) {
                        $scope.meta.totalItems = parseInt(pagination.total_records);
                        $scope.meta.currentPage = parseInt(pagination.current_page);
                        $scope.meta.pageSize = parseInt(pagination.page_size);

                        if ($scope.meta.totalItems < $scope.meta.pageSize) {
                            $scope.meta.limit = $scope.meta.totalItems;
                        } else {
                            $scope.meta.limit = $scope.meta.currentPage * $scope.meta.pageSize;
                        }
                        $scope.setPaginationMessage($scope.meta.start, $scope.meta.limit, $scope.meta.totalItems);
                    };

                    /**
                     * Check if page number entered exists
                     *
                     * @scope
                     * @param {Number} pageNumber - page number entered by user
                     * @return {Boolean}
                     */
                    $scope.checkIfPageExists = function(pageNumber) {
                        if (pageNumber * $scope.meta.page_size > $scope.meta.total_records) {
                            return false;
                        } else {
                            return true;
                        }
                    };

                    /**
                     * Select an item, get the backup list of that item or change to that directory
                     *
                     * @scope
                     * @method selectItem
                     * @param  {Object} item file or directory user selects
                     */
                    $scope.selectItem = function(item) {
                        $scope.selectedItemName = item.parsedName;
                        if (item.type.indexOf("dir") !== -1) {
                            $scope.changeDirectory(item.fullPath);
                        } else {
                            $scope.selectedItemExists = item.exists;
                            $scope.loadingData = true;
                            backupAPIService.listBackups(item.fullPath)
                                .then(function(itemData) {
                                    $scope.backupList = itemData;
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error,
                                        closeable: true,
                                        group: "cpanel-restoration"
                                    });
                                })
                                .finally(function() {
                                    $scope.loadingData = false;
                                });
                        }
                    };

                    /**
                     * List all backups of directory user is currently in
                     *
                     * @scope
                     * @method getBackupListForDirectory
                     */
                    $scope.getBackupListForDirectory = function() {
                        $scope.selectedItemName = $scope.currentPath;
                        $scope.loadingData = true;
                        backupAPIService.listBackups($scope.currentPath)
                            .then(function(response) {
                                $scope.backupList = response;
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "cpanel-restoration"
                                });
                            })
                            .finally(function() {
                                $scope.loadingData = false;
                            });
                    };

                    /**
                     * Adds the full path to the data and the path to the parent directory
                     * as properties on the data object
                     * Also adds a parsed name and where regular space
                     * characters are replaced with a non breaking space
                     * @scope
                     * @method addPaths
                     * @param {Array} directories Array of data objects that need path properties added.
                     **/
                    $scope.addPaths = function(directories) {
                        $scope.currentDirectoryContent = [];
                        for (var i = 0, length = directories.length; i < length; i++) {
                            directories[i]["path"] = $scope.currentPath;
                            directories[i]["fullPath"] = $scope.currentPath + directories[i].name;
                            directories[i]["parsedName"] = directories[i].name.replace(/\s/g, "\u00A0");
                            $scope.currentDirectoryContent.push(directories[i]);
                        }
                        $scope.meta.totalItems = $scope.currentDirectoryContent.length;
                    };

                    /**
                     * Process requested backup version to restore a single file
                     *
                     * @scope
                     * @method restore
                     * @param {Object} backup selected to be processed
                     *   @param {string} fullpath The full path to the target file location
                     *   @param {string} backupPath The backup's path on the disk
                     **/
                    $scope.restore = function(backup) {
                        $scope.selectedFilePath = backup.path;
                        $scope.selectedBackupID = backup.backupID;
                        backupTypeService.setBackupType(backup.type);
                        var $uibModalInstance = $uibModal.open({
                            templateUrl: "restoreModalContent.tmpl",
                            controller: "restoreModalController",
                            resolve: {
                                fileExists: $scope.selectedItemExists
                            }
                        });

                        $uibModalInstance.result.then(function(proceedRestoration) {
                            if (proceedRestoration) {

                                // Run restoration
                                $scope.dataRestoring = true;
                                backupAPIService.restore($scope.selectedFilePath, $scope.selectedBackupID)
                                    .then(function(response) {
                                        if (response.success) {
                                            if (backup.type === "file" || backup.type === "symlink") {
                                                alertService.add({
                                                    type: "success",
                                                    message: LOCALE.maketext("The system successfully restored the “[_1]” backup file from the date “[_2]”.", _.escape($scope.selectedFilePath), _.escape($scope.selectedBackupID)),
                                                    autoClose: 10000,
                                                    group: "cpanel-restoration"
                                                });
                                            } else if (backup.type === "dir") {
                                                alertService.add({
                                                    type: "success",
                                                    message: LOCALE.maketext("The system successfully restored the “[_1]” backup directory from the date “[_2]”.", _.escape($scope.selectedFilePath), _.escape($scope.selectedBackupID)),
                                                    autoClose: 10000,
                                                    group: "cpanel-restoration"
                                                });
                                            } else {
                                                throw "DEVELOPER ERROR: invalid backup type";
                                            }
                                        }
                                    })
                                    .catch(function(error) {
                                        if (backup.type === "file" || backup.type === "symlink") {
                                            alertService.add({
                                                type: "danger",
                                                message: LOCALE.maketext("File restoration failure: [_1]", error),
                                                closeable: true,
                                                group: "cpanel-restoration"
                                            });
                                        } else if (backup.type === "dir") {
                                            alertService.add({
                                                type: "danger",
                                                message: LOCALE.maketext("Directory restoration failure: [_1]", error),
                                                closeable: true,
                                                group: "cpanel-restoration"
                                            });
                                        } else {
                                            throw "DEVELOPER ERROR: invalid backup type";
                                        }
                                    })
                                    .finally(function() {
                                        $scope.dataRestoring = false;
                                    });
                            }
                        });
                    };

                    /**
                     * Initializes data
                     * @scope
                     * @method init
                     **/
                    $scope.init = function() {

                        // Displays directory structure starting at /home/USERNAME
                        $scope.currentPath = "/";
                        $scope.initialDataLoaded = false;
                        $scope.currentDirectoryContent = [];
                        $scope.meta = {

                            // pager settings
                            showPager: true,
                            maxPages: 0,
                            totalItems: 0,
                            currentPage: 1,
                            pageSize: 10,
                            pageSizes: [10, 20, 50, 100],
                            start: 1,
                            limit: 10
                        };

                        // TODO: Move to a common control for pageSize management
                        nvDataService.get("file_restoration_page_size")
                            .then(function(pairs) {
                                $scope.meta.pageSize = pairs[0].value || 10;

                                backupAPIService.listDirectory("/", $scope.meta.start, $scope.meta.pageSize)
                                    .then(function(apiResult) {
                                        $scope.currentPath = "/";
                                        $scope.buildBreadcrumb();
                                        $scope.addPaths(apiResult.data);

                                        // Update pagination
                                        var pagination = apiResult.meta.paginate;
                                        $scope.updatePagination(pagination);
                                    }, function(error) {
                                        $scope.noMetadataError = error;
                                    })
                                    .finally(function() {
                                        $scope.initialDataLoaded = true;
                                    });
                            });
                    };

                    $scope.init();
                }
            ]
        );

        return controller;
    }
);

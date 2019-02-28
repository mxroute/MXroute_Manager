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
        "cjt/util/table",
        "cjt/util/locale",
        "cjt/util/parse",
        "cjt/decorators/paginationDecorator",
        "cjt/directives/actionButtonDirective",
        "cjt/validator/datatype-validators",
        "app/filters/fileSizeFilter",
        "app/services/backupAPI",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/services/cpanel/componentSettingSaverService",
    ],
    function(angular, _, Table, LOCALE, PARSE) {
        "use strict";

        // Retrieve the current application
        var app = angular.module("App");
        app.value("PAGE", PAGE);

        // Setup the controller
        var controller = app.controller(
            "listController", [
                "$scope",
                "$anchorScroll",
                "PAGE",
                "backupAPIService",
                "alertService",
                "componentSettingSaverService",
                function(
                    $scope,
                    $anchorScroll,
                    PAGE,
                    backupAPIService,
                    alertService,
                    componentSettingSaverService
                ) {

                    var directoryContentsTable = new Table();
                    directoryContentsTable.setSort("name", "asc");

                    var backupsTable = new Table();
                    backupsTable.setSort("backupDate,backupType,lastModifiedTime,fileSize", "desc");

                    $scope.setDirectoryContentsPage = function(updatePageSize) {
                        $scope.clearBackupList();
                        $scope.actions.loadingData = true;
                        if (updatePageSize) {
                            setPagination("pagination");
                        } else {
                            getDirectoryContents($scope.currentDirectory, $scope.directoryContentsMeta.pageNumber, $scope.directoryContentsMeta.pageSize);
                        }
                    };

                    $scope.navigateBreadcrumb = function(directoryPath) {
                        $scope.clearBackupList();
                        $scope.actions.loadingData = true;
                        var parsedPath = "/";
                        for (var i = 0, len = $scope.breadCrumb.length; i < len; i++) {
                            if (directoryPath === $scope.breadCrumb[i]) {
                                parsedPath = parsedPath + $scope.breadCrumb[i] + "/";
                                break;
                            } else {
                                parsedPath = parsedPath + $scope.breadCrumb[i] + "/";
                            }

                        }
                        $scope.currentDirectory = parsedPath;
                        var pageNumber = 1;
                        getDirectoryContents($scope.currentDirectory, pageNumber, $scope.directoryContentsMeta.pageSize);
                        buildBreadcrumb($scope.currentDirectory);
                    };

                    $scope.goToDirectory = function(directoryPath) {
                        $scope.actions.loadingData = true;
                        if (directoryPath === "/") {
                            $scope.breadcrumb = "";
                        }

                        // Remove backup list if navigating to a different directory
                        $scope.clearBackupList();

                        // Reset current page to beginning of list when navigating to new directory
                        if ($scope.currentDirectory !== directoryPath) {
                            $scope.directoryContentsMeta.pageNumber = 1;
                        }


                        $scope.currentDirectory = directoryPath;
                        var pathLength = $scope.currentDirectory.length;

                        if ($scope.currentDirectory.charAt(pathLength - 1) !== "/") {
                            $scope.currentDirectory = $scope.currentDirectory + "/";
                        }
                        getDirectoryContents($scope.currentDirectory, $scope.directoryContentsMeta.pageNumber, $scope.directoryContentsMeta.pageSize);
                        buildBreadcrumb($scope.currentDirectory);
                    };

                    $scope.toggleSelectedBackup = function(backupDate) {
                        if (backupDate === $scope.backupSelected) {
                            $scope.backupSelected = "";
                        } else {
                            $scope.backupSelected = backupDate;
                        }
                    };

                    $scope.listBackups = function(content) {

                        // when retrieving backup by directory browse, query_file_info API call
                        // does not need to check for item existing
                        var checkForExists = 0;
                        $scope.actions.loadingBackups = true;
                        return getBackupList(content.backupPath, checkForExists, content.exists);
                    };

                    $scope.toggleRestoreConfirmation = function(backup) {
                        if (backup) {
                            $scope.confirmSelected = backup.backupDate;
                            $scope.isConfirmingRestoration = true;
                        } else {
                            $scope.confirmSelected = "";
                            $scope.isConfirmingRestoration = false;
                        }

                    };

                    $scope.restoreSelectedBackup = function(backup) {
                        return restoreBackup(backup);
                    };

                    $scope.goToParentDirectory = function() {
                        $scope.actions.loadingData = true;
                        $scope.currentDirectory = buildParentDirectoryPath();
                        var pageNumber = 1;
                        getDirectoryContents($scope.currentDirectory, pageNumber, $scope.directoryContentsMeta.pageSize);
                        buildBreadcrumb($scope.currentDirectory);
                    };

                    $scope.findByPathInput = function(path) {

                        // when getting backups by path input we need the query_file_info API to return if that item
                        // exists locally
                        var exists = 1;
                        path = checkForSlashAtStart(path);
                        $scope.getBackupsError = "";
                        $scope.selectedContent = path;
                        return getBackupList(path, exists);
                    };

                    /**
                     * Jump to specified page
                     *
                     * @param {Number} pageNumber - page number that user is going to
                     * @param {String} currentPath - current directory path
                     */
                    $scope.goToPage = function(pageNumber, currentDirectory) {
                        var pageExists = checkIfPageExists(pageNumber);

                        // when the page input is empty do not do anything
                        if (pageNumber === null || isNaN(pageNumber)) {
                            return;
                        } else {
                            if (pageExists) {
                                getDirectoryContents(currentDirectory, pageNumber, $scope.directoryContentsMeta.pageSize);
                            } else {
                                $scope.pageDoesNotExist = true;
                            }
                        }
                    };

                    $scope.sortDirectoryContentsTable = function() {

                        // necessary because Table directive pagination is not handling total items
                        var totalItems = $scope.directoryContentsMeta.totalItems;

                        if ($scope.directoryContentsMeta.pageNumber >= 2) {
                            var tempPageNumber = $scope.directoryContentsMeta.pageNumber;
                            directoryContentsTable.meta.pageNumber = 1;
                            directoryContentsTable.update();
                            directoryContentsTable.meta.pageNumber = tempPageNumber;
                        } else {
                            directoryContentsTable.update();
                        }


                        $scope.directoryContentsMeta.totalItems = totalItems;
                        $scope.directoryContents = directoryContentsTable.getList();
                    };

                    $scope.sortBackupsTable = function() {
                        backupsTable.update();
                        $scope.backupList = backupsTable.getList();
                        $scope.backupsPaginationMessage = backupsTable.paginationMessage();
                    };

                    $scope.clearBackupList = function() {
                        $scope.isConfirmingRestoration = false;
                        $scope.getBackupsError = "";
                        $scope.isBackupSelected = false;
                        $scope.selectedContent = "";
                    };

                    $scope.checkForEmptyInput = function(pathInput) {
                        if (pathInput === "") {
                            $scope.isPathInputEmpty = true;
                        } else {
                            $scope.isPathInputEmpty = false;
                        }
                    };

                    $scope.getBackupsPanelClass = function(isPanelOpen) {
                        var panelClass = "panel panel-default";
                        if (isPanelOpen) {
                            panelClass = panelClass + " restorationPanel";
                        }
                        return panelClass;
                    };

                    $scope.getDirContentsPanelClass = function(isPanelOpen) {
                        var panelClass = "panel panel-default";
                        if (isPanelOpen) {
                            panelClass = panelClass + " restorationPanel";
                        }
                        return panelClass;
                    };

                    $scope.scrollToBackupList = function() {
                        $anchorScroll("viewContent");
                    };

                    function checkForSlashAtStart(path) {
                        if (path.indexOf("/") !== 0) {
                            path = "/" + path;
                        }
                        return path;
                    }

                    function getDirectoryContents(directoryPath, pageNumber, pageSize) {
                        clearDirectoryContentsTableData();

                        backupAPIService.listDirectoryContents(directoryPath, pageNumber, pageSize)
                            .then(function(directoryContents) {
                                var tempContents = buildBackupPaths(directoryContents.data);
                                loadDirectoryContentsTable(tempContents, directoryContents.meta.paginate);
                            })
                            .catch(function(error) {
                                $scope.noMetadataMessage = error;
                            })
                            .finally(function() {
                                $scope.actions.loadingUI = false;
                                $scope.actions.loadingData = false;
                                if ($scope.directoryContents.length === 0) {
                                    $scope.emptyDirectory = true;
                                } else {
                                    $scope.emptyDirectory = false;
                                }
                            });
                    }

                    function loadDirectoryContentsTable(directoryContents, pagination) {
                        directoryContentsTable.load(directoryContents);
                        createGoToPageNumbers(pagination);
                        updateDirectoryContentsTable(pagination);
                    }

                    function updateDirectoryContentsTable(pagination) {

                        // This is a hacky way of making sure that the table is updated properly
                        $scope.directoryContentsMeta.pageNumber = 1;

                        directoryContentsTable.update();

                        // Overwrite pagination created by table because API call was paginated
                        $scope.directoryContentsMeta.maxPages = parseInt(pagination.total_pages, 10);
                        $scope.directoryContentsMeta.totalItems = parseInt(pagination.total_records, 10);
                        $scope.directoryContentsMeta.start = parseInt(pagination.current_record, 10);
                        $scope.directoryContentsMeta.pageNumber = pagination.current_page;

                        if (($scope.directoryContentsMeta.start + $scope.directoryContentsMeta.pageSize) > $scope.directoryContentsMeta.totalItems) {
                            $scope.directoryContentsMeta.limit = $scope.directoryContentsMeta.totalItems;
                        } else {
                            $scope.directoryContentsMeta.limit = ($scope.directoryContentsMeta.start + $scope.directoryContentsMeta.pageSize) - 1;
                        }

                        $scope.directoryContents = directoryContentsTable.getList();
                        $scope.directoryContentsPaginationMessage = directoryContentsTable.paginationMessage();
                    }

                    function clearDirectoryContentsTableData() {
                        directoryContentsTable.items = [];
                        directoryContentsTable.filteredList = [];
                        directoryContentsTable.last_id = 0;
                    }

                    function buildBackupPaths(directoryContents) {
                        var addedPath = [];

                        directoryContents.forEach(function(content) {
                            if (!content.backupPath || !content.parentDir) {
                                if ($scope.currentDirectory === "/") {
                                    content["backupPath"] = "/" + content.name;
                                    content["parentDir"] = "/";
                                } else {
                                    content["backupPath"] = $scope.currentDirectory + content.name;
                                    content["parentDir"] = $scope.currentDirectory;
                                }
                            }
                            addedPath.push(content);
                        });
                        $scope.parentDirectory = $scope.currentDirectory;
                        return addedPath;
                    }

                    function buildBreadcrumb(content) {
                        var breadCrumbArray = content.split("/");
                        $scope.breadCrumb = breadCrumbArray.slice(1, breadCrumbArray.length - 1);
                    }

                    function buildParentDirectoryPath() {
                        var parentDirectoryPath = "/";
                        for (var i = 0, len = $scope.breadCrumb.length - 1; i < len; i++) {
                            parentDirectoryPath = parentDirectoryPath + $scope.breadCrumb[i] + "/";

                        }
                        return parentDirectoryPath;
                    }

                    function createBackupTable() {
                        backupsTable.update();
                        $scope.backupsMeta = backupsTable.getMetadata();
                        $scope.backupList = backupsTable.getList();
                        $scope.backupsPaginationMessage = backupsTable.paginationMessage();
                    }

                    function getBackupList(backupPath, shouldReturnExists, doesContentExist) {
                        $scope.clearBackupList();
                        return backupAPIService.listBackups(backupPath, shouldReturnExists)
                            .then(function(backupList) {
                                if (shouldReturnExists) {
                                    $scope.doesContentExist = PARSE.parsePerlBoolean(backupList[0].exists);
                                }
                                $anchorScroll("viewContent");
                                $scope.isContentTypeDirectory = backupList[0].type === "Directory" ? true : false;
                                $scope.isBackupSelected = true;
                                backupsTable.load(backupList);
                                createBackupTable();
                            })
                            .catch(function(error) {
                                $scope.getBackupsError = error;
                            })
                            .finally(function() {
                                if (!shouldReturnExists) {
                                    $scope.doesContentExist = doesContentExist;
                                }
                                $scope.selectedContent = backupPath;
                                $scope.actions.loadingBackups = false;
                            });
                    }

                    function getDirectoryContentsPagination(componentName) {
                        componentSettingSaverService.get(componentName)
                            .then(function(pagination) {
                                if (!pagination) {
                                    registerComponent(componentName);
                                } else {
                                    $scope.directoryContentsMeta.pageSize = pagination.pageSize;
                                    getDirectoryContents($scope.currentDirectory, $scope.directoryContentsMeta.pageNumber, $scope.directoryContentsMeta.pageSize);
                                }
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    group: "backup-restoration",
                                    closeable: true
                                });
                            });
                    }

                    function setPagination(componentName) {
                        componentSettingSaverService.set(componentName, {
                            pageSize: $scope.directoryContentsMeta.pageSize
                        })
                            .then(function(response) {
                                getDirectoryContents($scope.currentDirectory, $scope.directoryContentsMeta.pageNumber, $scope.directoryContentsMeta.pageSize);
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    group: "backup-restortion",
                                    closeable: true
                                });
                            });
                    }

                    function registerComponent(componentName) {
                        componentSettingSaverService.register(componentName)
                            .then(function(componentResponse) {
                                setPagination(componentName, true);
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    group: "backup-restoration",
                                    closeable: true
                                });
                            });

                    }

                    function restoreBackup(backup) {
                        $scope.actions.restoring = true;
                        return backupAPIService.restoreBackup(backup.path, backup.backupID)
                            .then(function(response) {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system successfully restored the “[_1]” backup file from the date “[_2]”.", _.escape(backup.path), _.escape(backup.backupDate)),
                                    autoClose: 10000,
                                    group: "backup-restoration"
                                });
                                $scope.clearBackupList();
                                $scope.goToDirectory($scope.currentDirectory);
                            })
                            .catch(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    group: "backup-restoration"
                                });
                            })
                            .finally(function() {
                                $scope.actions.restoring = false;
                                $scope.toggleRestoreConfirmation();
                            });
                    }

                    function checkIfPageExists(pageNumber) {
                        if (pageNumber * $scope.directoryContentsMeta.page_size > $scope.directoryContentsMeta.total_records) {
                            return false;
                        } else {
                            return true;
                        }
                    }

                    function createGoToPageNumbers(metadata) {
                        var goToPages = [];
                        var i = 1;
                        while (i <= metadata.total_pages) {
                            i.toString();
                            goToPages.push(i);
                            parseInt(i, 10);
                            i++;
                        }
                        $scope.goToPages = goToPages;
                    }

                    function init() {
                        var paginationComponent = "pagination";

                        // root dir representing /home/USER
                        $scope.userHomeDirDisplay = PAGE.homeDir + "/";
                        $scope.navigateMethod = "input";
                        $scope.dirContentsPanelOpen = true;
                        $scope.backupsPanelOpen = true;
                        $scope.currentDirectory = "/";
                        $scope.homeDir = "/";
                        $scope.noMetadataMessage = "";
                        $scope.isPathInputEmpty = true;

                        $scope.directoryContentsMeta = directoryContentsTable.getMetadata();
                        $scope.backupsMeta = backupsTable.getMetadata();
                        $scope.doesContentExistInfo = LOCALE.maketext("When you restore a backup, the system will overwrite existing files and restore deleted files.");
                        $scope.findByPathInfo = LOCALE.maketext("Enter the exact path to the file or directory that you wish to restore.");
                        $scope.actions = {
                            loadingUI: true,
                            loadingData: false,
                            loadingBackups: false
                        };
                        getDirectoryContentsPagination(paginationComponent);
                    }
                    init();
                }
            ]
        );

        return controller;
    }
);

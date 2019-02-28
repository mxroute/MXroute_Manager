/*
# version_control/views/listRepositoriesController.js      Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define, PAGE */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "cjt/util/table",
        "uiBootstrap",
        "cjt/filters/wrapFilter",
        "cjt/services/cpanel/nvDataService",
        "app/services/versionControlService",
        "app/services/sseAPIService",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective"
    ],
    function(angular, _, LOCALE, Table) {
        "use strict";

        var app = angular.module("cpanel.versionControl");
        app.value("PAGE", PAGE);

        var controller = app.controller(
            "ListRepositoriesController",
            ["$scope", "$window", "$location", "versionControlService", "sseAPIService", "PAGE", "nvDataService", "alertService", "$timeout",
                function($scope, $window, $location, versionControlService, sseAPIService, PAGE, nvDataService, alertService, $timeout) {

                    var repositories = this;
                    repositories.isLoading = false;
                    repositories.list = [];
                    repositories.cloningList = [];
                    var sseURL = PAGE.securityToken + "/sse/UserTasks";
                    var SSEObj;

                    // SSE events and config
                    var events = [ "task_processing", "task_complete", "task_failed" ];
                    var config = { json: true };

                    repositories.homeDirPath = PAGE.homeDir;
                    repositories.hasFilemanagerAccess = (PAGE.hasFileManagerAccess === "0") ? false : true;
                    repositories.hasShellAccess = (PAGE.hasShellAccess === "0") ? false : true;

                    var table = new Table();
                    table.setSort("name", "asc");

                    repositories.meta = table.getMetadata();
                    repositories.filteredList = table.getList();
                    repositories.paginationMessage = table.paginationMessage;
                    repositories.meta.pageSize = parseInt(PAGE.reposListPageSize, 10);

                    /**
                     * Search repository by name and path
                     * @method searchByNameOrFolder
                     * @param {Object} item Item in repositories list
                     * @param {String} searchText Text to search for
                     */
                    function searchByNameOrFolder(item, searchText) {
                        searchText = searchText.toLowerCase();
                        return item.name.toLowerCase().indexOf(searchText) !== -1 ||
                            item.repository_root.toLowerCase().indexOf(searchText) !== -1;
                    }

                    table.setSearchFunction(searchByNameOrFolder);

                    /**
                     * Render repository list
                     * @method render
                     */
                    repositories.render = function() {
                        repositories.filteredList = table.update();
                    };

                    /**
                     * Sort repository list
                     * @method sortList
                     */
                    repositories.sortList = function() {
                        repositories.render();
                    };

                    /**
                     * Select repository page
                     * @method selectPage
                     */
                    repositories.selectPage = function() {
                        repositories.render();
                    };

                    /**
                     * Selects page size
                     * @method selectPageSize
                     */
                    repositories.selectPageSize = function() {
                        repositories.render();

                        if (PAGE.reposListPageSize !== repositories.meta.pageSize) {
                            nvDataService.setObject({ repos_list_page_size: repositories.meta.pageSize })
                                .then(function() {
                                    PAGE.reposListPageSize = repositories.meta.pageSize;
                                })
                                .catch(function(error) {
                                    alertService.add({
                                        type: "danger",
                                        message: error.message,
                                        closeable: true,
                                        replace: false,
                                        group: "versionControl"
                                    });
                                });
                        }
                    };

                    /**
                     * Implements search for repository
                     * @method searchList
                     */
                    repositories.searchList = function() {
                        repositories.render();
                    };

                    /**
                     * Initialization of the List Repositories page.
                     * @method init
                     */
                    repositories.init = function() {
                        var pageErrors = PAGE.repoErrors;

                        if (pageErrors.length > 0) {

                            // Potential cache corruption, attempting to load via JS to display error messages.
                            pageErrors.forEach(function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "versionControl"
                                });
                            });
                        } else {

                            // Updates the list with the current API cache.
                            repositories.updateRepositoriesList(true);
                        }
                    };

                    /**
                     * Extend repository object to add few fields to manage state
                     * @method extendRepositoryObject
                     * @param {Object} repoObject repository
                     * @returns {Object} updated repository object
                     */
                    function extendRepositoryObject(repoObject) {
                        if (repoObject) {
                            repoObject.isExpanded = false;
                            repoObject.detailsLoading = false;
                            repoObject.delete_requested = false;
                            repoObject.cloneState = "";
                        }
                        return repoObject;
                    }

                    /**
                     * Resets clone state of repository
                     * @method clearCloning
                     * @param {Object} repoObject repository
                     * @returns {Object} updated repository object
                     */
                    function clearCloning(repoObject) {
                        if (repoObject) {
                            repoObject.cloneState = "";
                            repoObject.cloneInProgress = false;
                            delete repoObject.cloneTaskID;
                        }
                        return repoObject;
                    }

                    /**
                     * Calls the API to update the repositories list.
                     * @method updateRepositoriesList
                     * @param {Boolean} forceLoad Tells the method to pull the data from the API.
                     */
                    repositories.updateRepositoriesList = function(forceLoad) {
                        repositories.isLoading = true;

                        var attributeStr = (forceLoad) ? "name,tasks" : null;

                        return versionControlService.listRepositories(forceLoad, attributeStr)
                            .then(function(response) {

                                repositories.list = _.map(response, function(obj) {
                                    return extendRepositoryObject(obj);
                                });

                                for (var i = 0, len = repositories.list.length; i < len; i++) {
                                    if (repositories.list[i].cloneInProgress) {
                                        repositories.cloningList.push(
                                            repositories.list[i]
                                        );
                                    }
                                }

                                // Initiate SSE when atleast one repository is being cloned
                                if (repositories.cloningList && repositories.cloningList.length > 0) {
                                    sseAPIService.initialize();
                                }

                                table.load(repositories.list);
                                repositories.render();

                                repositories.isLoading = false;

                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: error.message,
                                    closeable: true,
                                    replace: false,
                                    group: "versionControl"
                                });

                                repositories.isLoading = false;
                            });
                    };

                    /**
                     * Handles task_processing.
                     *
                     * @method
                     * @param {sse:task_processing} event - Task processing event.
                     * @param {Object} data - Data
                     * @listens sse:task_processing
                     */
                    $scope.$on("sse:task_processing", function(event, data) {

                        var taskID = data.task_id;

                        var cloneItem = _.find(repositories.cloningList, function(o) {
                            return o.cloneTaskID === taskID;
                        });

                        if (cloneItem) {
                            var unfilteredIndex = _.indexOf(repositories.list, cloneItem);

                            if (unfilteredIndex !== -1) {
                                cloneItem.cloneState = "processing";
                                _.extend( repositories.list[unfilteredIndex], cloneItem );
                                $scope.$apply(repositories.render);
                            }
                        }

                    });

                    /**
                     * Handles task_complete.
                     *
                     * @method
                     * @param {sse:task_complete} event - Task complete event.
                     * @param {Object} data - Data
                     * @listens sse:task_complete
                     */
                    $scope.$on("sse:task_complete", function(event, data) {
                        var taskID = data.task_id;

                        var cloneItem = _.find(repositories.cloningList, function(o) {
                            return o.cloneTaskID === taskID;
                        });

                        if (cloneItem) {
                            var unfilteredIndex = _.indexOf(repositories.list, cloneItem);

                            if (unfilteredIndex !== -1) {
                                cloneItem.cloneState = "complete";
                                _.extend( repositories.list[unfilteredIndex], cloneItem );
                                $scope.$apply(repositories.render);

                                // removing object from clonning list because clone is complete
                                _.remove(repositories.cloningList, cloneItem);

                                if (repositories.cloningList.length === 0) {
                                    sseAPIService.close(SSEObj);
                                }

                                $timeout(function() {

                                    // Using timeout to visually display success on the row and later change it to a normal row.
                                    return versionControlService.getRepositoryInformation(cloneItem.repository_root, "name,tasks")
                                        .then(function(response) {
                                            var repoDetails = extendRepositoryObject(response);

                                            // updating the repository list with new information so that the row is active
                                            _.extend(repositories.list[unfilteredIndex], clearCloning(repoDetails));

                                            // Remove clone information message
                                            alertService.removeById(taskID, "versionControl");

                                            repositories.render();

                                        }, function(error) {

                                            // Remove clone information message
                                            alertService.removeById(taskID, "versionControl");

                                            // display error
                                            alertService.add({
                                                type: "danger",
                                                message: error.message,
                                                closeable: true,
                                                replace: false,
                                                group: "versionControl"
                                            });

                                        });
                                }, 5000);
                            }

                        }

                    });

                    /**
                     * Handles task_failed.
                     *
                     * @method
                     * @param {sse:task_failed} event - Task failed event.
                     * @param {Object} data - Data
                     * @listens sse:task_failed
                     */
                    $scope.$on("sse:task_failed", function(event, data) {

                        var taskID = data.task_id;

                        var cloneItem = _.find(repositories.cloningList, function(o) {
                            return o.cloneTaskID === taskID;
                        });

                        if (cloneItem) {
                            var unfilteredIndex = _.indexOf(repositories.list, cloneItem);

                            _.remove(repositories.cloningList, cloneItem);

                            if (repositories.cloningList.length === 0) {
                                sseAPIService.close(SSEObj);
                            }

                            if (unfilteredIndex !== -1) {
                                repositories.list.splice(unfilteredIndex, 1);
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("Error occurred while cloning repository “[_1]”.", cloneItem.name),
                                    closeable: true,
                                    replace: false,
                                    group: "versionControl"
                                });

                                $scope.$apply(repositories.render);
                            }
                        }
                    });

                    /**
                     * Handles ready.
                     *
                     * @method
                     * @param {sse:ready} event - Task ready event.
                     * @listens sse:ready
                     */
                    $scope.$on("sse:ready", function(event) {
                        SSEObj = sseAPIService.connect(sseURL, events, config);
                    });

                    /**
                     * Handles destory.
                     *
                     * @method
                     * @listens $destroy
                     */
                    $scope.$on("$destroy", function() {
                        if (SSEObj) {
                            sseAPIService.close(SSEObj);
                        }
                    });

                    /**
                     * Opens repository in gitWeb
                     * @method redirectToGitWeb
                     * @param {String} gitWebURL gitWebURL for the repository
                     * @param {String} repoName Repository name
                     */
                    repositories.redirectToGitWeb = function(gitWebURL, repoName) {

                        if (gitWebURL) {
                            $window.open(gitWebURL, repoName + "GitWeb");
                        } else {
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("Unable to find repository web url"),
                                closeable: true,
                                replace: false,
                                group: "versionControl"
                            });
                        }
                    };

                    /**
                     * Opens repository path in file manager
                     * @method redirectToFileManager
                     * @param {String} fileManagerURL file Manager url for the repository path
                     * @param {String} repoName Repository name
                     */
                    repositories.redirectToFileManager = function(fileManagerURL, repoName) {

                        if (fileManagerURL) {
                            $window.open(fileManagerURL, repoName + "FileManager");
                        } else {
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("Unable to redirect to File Manager interface"),
                                closeable: true,
                                replace: false,
                                group: "versionControl"
                            });
                        }
                    };

                    /**
                     * Copies the repo's clone link to you machine's clipboard
                     * @method cloneToClipboard
                     * @param {String} cloneUrl The URL to be used to clone repos.
                     */
                    repositories.cloneToClipboard = function(cloneUrl) {
                        try {
                            var result = versionControlService.cloneToClipboard(cloneUrl);
                            if (result) {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system successfully copied the “[_1]” clone [output,acronym,URL,Uniform Resource Locator] to the clipboard.", cloneUrl),
                                    closeable: true,
                                    replace: false,
                                    autoClose: 10000,
                                    group: "versionControl"
                                });
                            }
                        } catch (error) {
                            alertService.add({
                                type: "danger",
                                message: error,
                                closeable: true,
                                replace: false,
                                group: "versionControl"
                            });
                        }
                    };

                    /**
                     * Create Repository View
                     * @method createRepository
                     */
                    repositories.createRepository = function() {
                        alertService.clear("", "versionControl");
                        $location.path("/create");
                    };

                    /**
                     * Deletes a repository
                     * @method delete
                     * @param {String} repo The repository to delete.
                     * @return {Promise} Returns a promise from the VersionControlService.deleteRepository method for success/error handling when the user requests to delete a repository.
                     */
                    repositories.delete = function(repo) {
                        repo.removing = true;
                        var successMessage;
                        if (repositories.hasFilemanagerAccess) {
                            successMessage = LOCALE.maketext("The system successfully removed the “[_1]” repository from the list of [asis,cPanel]-managed repositories. You can use the [output,url,_2,File Manager,target,_3] interface to delete the repository contents.", repo.name, repo.fileManagerRedirectURL, "file-manager");
                        } else {
                            successMessage = LOCALE.maketext("The system successfully removed the “[_1]” repository from the list of [asis,cPanel]-managed repositories.", repo.name);
                        }
                        return versionControlService.deleteRepository(repo.repository_root)
                            .then(function() {
                                table.remove(repo);
                                repositories.render();
                                alertService.add({
                                    type: "success",
                                    message: successMessage,
                                    closeable: true,
                                    replace: false,
                                    autoClose: false,
                                    group: "versionControl"
                                });

                            }, function(error) {
                                alertService.add({
                                    type: "danger",
                                    message: LOCALE.maketext("The system could not remove the “[_1]” repository in the “[_2]” directory.", repo.name, repo.repository_root),
                                    closeable: true,
                                    replace: false,
                                    group: "versionControl"
                                });

                                repo.removing = false;
                                repo.delete_requested = false;
                            });
                    };

                    /**
                     * Delete repository confirmation message.
                     * @method deleteText
                     * @param {Object} repo The repository's data representation of the repository that should be deleted.
                     * @return {String} Returns a dynamic string as a message to the user, that cooresponds to the exact repository within the delete action-scope, to inform/ask the user if they are certain that they would like to permanatly delete a repository from their cPanel instance/account/system.
                     */
                    repositories.deleteText = function(repo) {
                        return LOCALE.maketext("Are you sure that you want to remove the “[_1]” repository from the list of [asis,cPanel]-managed repositories?", repo.name);
                    };

                    /**
                     * Redirects user to the version control manage page for a specified repo.
                     * @method manageRepository
                     * @param {String} repoPath Represents the repository_root of the repo object in the repo list.
                     */
                    repositories.manageRepository = function(repoPath) {
                        $location.path("/manage/" + encodeURIComponent(repoPath) + "/basic-info");
                    };

                    /**
                     * Get the repository index.
                     * @method getRepositoryIndex
                     * @param {String} repositoryRoot Repository root
                     * @return {Number} return the index
                     */
                    function getRepositoryIndex(repositoryRoot) {
                        return _.findIndex(repositories.filteredList, function(o) {
                            return o.repository_root === repositoryRoot;
                        });
                    }

                    /* Gets repository details
                     * @method repositories.getRepositoryDetails
                     * @param {Object} repo Repository
                     * @param {Boolean} expandState Current Expanded state
                     * @return {Promise} return promise
                     */
                    repositories.getRepositoryDetails = function(repo, expandState) {

                        repo.detailsLoading = true;
                        var index;

                        // When changing from collapse to expand
                        if (expandState) {

                            return versionControlService.getRepositoryInformation(repo.repository_root, "name,clone_urls,branch,last_update,source_repository")
                                .then(function(response) {
                                    index = getRepositoryIndex(repo.repository_root);
                                    if (index !== -1) {
                                        response.detailsLoading = false;
                                        response.isExpanded = true;

                                        // Retrieving back the state of delete
                                        response.delete_requested = repo.delete_requested;

                                        _.assign(repo, response);
                                    }

                                    // Use assign to update the source object in-place
                                    _.assign(repo, response);
                                }, function(error) {

                                    alertService.add({
                                        type: "danger",
                                        message: error.message,
                                        closeable: true,
                                        replace: false,
                                        group: "versionControl"
                                    });

                                });
                        } else {
                            repo.detailsLoading = false;
                            repo.isExpanded = false;
                        }

                    };

                    repositories.init();
                }
            ]
        );

        return controller;
    }
);

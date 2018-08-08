/*
# version_control/views/manageRepositoriesController.js      Copyright 2018 cPanel, Inc.
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
        "uiBootstrap",
        "app/services/versionControlService",
        "app/services/sseAPIService",
        "cjt/services/alertService",
        "cjt/directives/alert",
        "cjt/directives/alertList",
        "cjt/directives/actionButtonDirective",
        "jquery-chosen",
        "angular-chosen"
    ],
    function(angular, _, LOCALE) {
        "use strict";

        var app = angular.module("cpanel.versionControl");
        app.value("PAGE", PAGE);

        var controller = app.controller(
            "ManageRepositoriesController",
            ["$scope", "$window", "$location", "$timeout", "versionControlService", "sseAPIService", "PAGE", "$routeParams", "alertService",
                function($scope, $window, $location, $timeout, versionControlService, sseAPIService, PAGE, $routeParams, alertService) {

                    var repository = this;

                    // RTL check for chosen
                    repository.isRTL = false;
                    var html = document.querySelector("html");
                    if (html) {
                        repository.isRTL = html.getAttribute("dir") === "rtl";
                    }

                    // Page defaults
                    repository.isLoading = true;

                    repository.deployInProgress = false;
                    repository.deployState = "";
                    repository.deployedTaskInformation = null;
                    repository.deployCalloutType = "info";

                    // SSE events and config
                    var deploySSEURL = "";
                    var sseObj;
                    var events = [ "log_update", "task_complete", "task_failed" ];
                    var config = { json: true };

                    var tabs = [
                        "basic-info",
                        "deploy"
                    ];

                    var tabToSelect = 0;

                    // Get the variables from the URL
                    var requestedRepoPath = decodeURIComponent($routeParams.repoPath);
                    var tabName = decodeURIComponent($routeParams.tabname);

                    selectActiveTab(tabName);

                    /**
                     * Selects Active Tab
                     * @method selectActiveTab
                     * @param {String} tabName Tab Name
                     */
                    function selectActiveTab(tabName) {

                        // Selecting tab based on route parameter
                        if (tabName) {
                            tabToSelect = tabs.indexOf(tabName);
                            if ( tabToSelect !== -1) {
                                $scope.activeTabIndex = tabToSelect;
                            } else {
                                $location.path("/list/");
                            }
                        } else {
                            $location.path("/list/");
                        }
                    }

                    retrieveRepositoryInfo(requestedRepoPath);

                    /**
                    * Changes active tab
                    *
                    * @method changeActiveTab
                    * @param {String} name name of the tab.
                    */
                    $scope.changeActiveTab = function(name) {
                        var url = $location.url();
                        var lastPart = url.split( "/" ).pop().toLowerCase();

                        if (name) {
                            $scope.activeTabIndex = tabs.indexOf(name);

                            // lastpart other than name
                            if (lastPart !== name) {
                                $location.path("/manage/" + encodeURIComponent(requestedRepoPath) + "/" + name);
                            }
                        }
                    };

                    /**
                    * Checks to see if the user came from the VersionControl List View
                    *
                    * @method retrieveRepositoryInfo
                    * @param {String} requestedRepoPath Represents the path of the repository to be loaded on the page.
                    */
                    function retrieveRepositoryInfo(requestedRepoPath) {

                        return versionControlService.getRepositoryInformation(requestedRepoPath, "name,tasks,clone_urls,branch,last_update,source_repository,last_deployment,deployable")
                            .then(function(response) {
                                var repoInfo = response;

                                return versionControlService.getRepositoryInformation(requestedRepoPath, "available_branches")
                                    .then(function(response) {
                                        repoInfo.available_branches = response.available_branches;

                                        if (typeof repoInfo.available_branches === "undefined" || repoInfo.available_branches === null) {
                                            repository.unableToRetrieveAvailableBranches = true;
                                        } else {
                                            repository.unableToRetrieveAvailableBranches = repoInfo.available_branches.length === 0;
                                        }
                                    }, function(error) {
                                        repoInfo.available_branches = [];
                                        repository.unableToRetrieveAvailableBranches = true;

                                        alertService.add({
                                            type: "danger",
                                            message: LOCALE.maketext("The system cannot update information for the repository at ‘[_1]’ because it cannot access the remote repository.", repoInfo.repository_root),
                                            closeable: true,
                                            replace: false,
                                            group: "versionControl"
                                        });

                                    }).finally(function() {
                                        setFormData(repoInfo);
                                    });
                            }, function(error) {

                                alertService.add({
                                    type: "danger",
                                    message: error,
                                    closeable: true,
                                    replace: false,
                                    group: "versionControl"
                                });
                                $location.path("/list/");

                            })
                            .finally(function() {
                                repository.isLoading = false;
                            });
                    }

                    /**
                    * Set Manage Form Data
                    *
                    * @method setFormData
                    * @param {object} data Represents the single repository data object.
                    */
                    function setFormData(data) {
                        repository.name = data.name;
                        repository.repoPath = data.repository_root;
                        repository.cloneURL = data.clone_urls.read_write[0];

                        repository.branch = data.branch;
                        repository.checkedoutBranch = data.branch;

                        repository.hasActiveBranch = data.hasActiveBranch;

                        repository.hasHeadInformation = data.hasHeadInformation;
                        repository.lastUpdateSHA = data.lastUpdateSHA;
                        repository.lastUpdateDate = data.lastUpdateDate;
                        repository.commitMessage = data.commitMessage;
                        repository.author = data.author;

                        repository.branchList = data.available_branches;

                        repository.hasRemote = data.hasRemote;
                        repository.remoteInformation = data.source_repository;

                        repository.gitWebURL = data.gitWebURL;
                        repository.fileManagerRedirectURL = data.fileManagerRedirectURL;

                        repository.fullRepoPath = repository.repoPath;

                        repository.qaSafeSuffix = data.qaSafeSuffix;

                        repository.deployInProgress = data.deployInProgress;

                        repository.deployable = data.deployable;
                        repository.hasDeploymentInformation = data.hasDeploymentInformation;
                        repository.lastDeployedDate = data.lastDeployedDate;
                        repository.lastDeployedSHA = data.lastDeployedSHA;
                        repository.lastDeployedAuthor = data.lastDeployedAuthor;
                        repository.lastDeployedCommitDate = data.lastDeployedCommitDate;
                        repository.lastDeployedCommitMessage = data.lastDeployedCommitMessage;

                        repository.changesAvailableToDeploy = data.lastDeployedSHA !== data.lastUpdateSHA;

                        repository.deployTasks = getDeployTasks(data.tasks);

                        if (typeof sseObj === "undefined" && repository.deployInProgress) {
                            initializeSSE();
                        }
                    }

                    function getDeployTasks(tasks) {
                        var deployTasks =  _.map(tasks, function(task) {
                            if (task.action === "deploy") {
                                var timestampInfo = getDeployTimestamp(task.args.log_file);
                                return {
                                    task_id: task.task_id,
                                    log_file: task.args.log_file,
                                    sse_url: task.sse_url,
                                    timeStamp: timestampInfo,
                                    humanReadableDate: LOCALE.local_datetime(timestampInfo, "datetime_format_medium")
                                };
                            }
                        });

                        return _.sortBy(deployTasks, [function(o) {
                            return o.log_file;
                        }]);
                    }

                    /**
                     * @method getQueuedTaskString
                     * @param {Number} taskCount TaskCount
                     * @returns {String} Additional tasks display string
                     */
                    function getQueuedTaskString(taskCount) {
                        return LOCALE.maketext("[quant,_1,additional task,additional tasks] queued", taskCount);
                    }

                    /**
                     * Gets Deployment timestamp
                     * @method getDeployTimestamp
                     * @param {String} logFilePath LogFile path
                     * @returns {String} deployment timestamp
                     */
                    function getDeployTimestamp(logFilePath) {
                        var timeStamp;
                        if (logFilePath) {
                            var logFileName = logFilePath.split("/").pop();
                            timeStamp = logFileName.match(/\d+(\.\d+)/g);
                        }
                        return timeStamp[0];
                    }

                    /**
                     * Update Repository
                     * @method updateRepository
                     * @return {Promise} Returns a promise from the VersionControlService.updateRepository method for success/error handling when the user requests to update a repository.
                     */
                    repository.updateRepository = function() {

                        var branch = repository.branch === repository.checkedoutBranch ? "" : repository.branch;

                        return versionControlService.updateRepository(
                            repository.repoPath,
                            repository.name,
                            branch
                        ).then(function(response) {

                            alertService.add({
                                type: "success",
                                message: LOCALE.maketext("The system successfully updated the “[_1]” repository.", repository.name),
                                closeable: true,
                                replace: true,
                                autoClose: 10000,
                                group: "versionControl"
                            });

                            setFormData(response.data);

                        }, function(error) {
                            alertService.add({
                                type: "danger",
                                message: error,
                                closeable: true,
                                replace: false,
                                group: "versionControl"
                            });
                        });
                    };

                    /**
                     * Pull from remote repository
                     * @method pullFromRemote
                     * @return {Promise} Returns a promise from the VersionControlService.updateRepository method for success/error handling when the user requests to pull from remote repository.
                     */
                    repository.pullFromRemote = function() {

                        return versionControlService.updateFromRemote(
                            repository.repoPath,
                            repository.branch
                        ).then(function(response) {

                            var data = response.data;

                            if (repository.lastUpdateSHA === data.lastUpdateSHA) {
                                alertService.add({
                                    type: "info",
                                    message: LOCALE.maketext("The “[_1]” repository is up-to-date.", repository.name),
                                    closeable: true,
                                    replace: true,
                                    autoClose: 10000,
                                    group: "versionControl"
                                });
                            } else {
                                alertService.add({
                                    type: "success",
                                    message: LOCALE.maketext("The system successfully updated the “[_1]” repository.", repository.name),
                                    closeable: true,
                                    replace: true,
                                    autoClose: 10000,
                                    group: "versionControl"
                                });

                                repository.hasHeadInformation = data.hasHeadInformation;
                                repository.lastUpdateSHA = data.lastUpdateSHA;
                                repository.lastUpdateDate = data.lastUpdateDate;
                                repository.commitMessage = data.commitMessage;
                                repository.author = data.author;

                                repository.newCommits = true;

                                $timeout( function() {
                                    repository.newCommits = false;
                                }, 10000 );
                            }
                        }, function(error) {
                            alertService.add({
                                type: "danger",
                                message: error,
                                closeable: true,
                                replace: false,
                                group: "versionControl"
                            });
                        });
                    };

                    /**
                     * Reset deployment and sse flags
                     * @method resetSSEState
                     */
                    function resetSSEState() {
                        repository.deployState = "";
                        repository.deployCalloutType = "info";
                        repository.deployedTaskInformation = null;

                        sseObj = null;
                    }

                    /**
                     * Initialize SSE
                     * @method initializeSSE
                     */
                    function initializeSSE() {

                        repository.queuedDeployTasksCount = repository.deployTasks.length - 1;

                        if (repository.queuedDeployTasksCount) {
                            repository.queuedTaskString = getQueuedTaskString(repository.queuedDeployTasksCount);
                        }

                        repository.firstDeployTask = repository.deployTasks[0];
                        deploySSEURL = repository.firstDeployTask.sse_url;

                        repository.deployProgress = LOCALE.maketext("The deployment that you triggered on [_1] is in progress …", repository.firstDeployTask.humanReadableDate);
                        repository.deployComplete = LOCALE.maketext("The deployment that you triggered on [_1] is complete. Updating last deployment information …", repository.firstDeployTask.humanReadableDate);
                        repository.deployQueued =  LOCALE.maketext("The deployment that you triggered on [_1] is queued …", repository.firstDeployTask.humanReadableDate);
                        sseAPIService.initialize();
                    }

                    /**
                     * Handles ready.
                     *
                     * @method
                     * @param {sse:ready} event - ready event.
                     * @listens sse:ready
                     */
                    $scope.$on("sse:ready", function(event) {
                        deploySSEURL = PAGE.securityToken + deploySSEURL;
                        sseObj = sseAPIService.connect(deploySSEURL, events, config);
                    });

                    /**
                     * Handles destroy event.
                     *
                     * @method
                     * @listens $destroy
                     */
                    $scope.$on("$destroy", function() {
                        if (sseObj) {
                            sseAPIService.close(sseObj);
                        }
                    });

                    /**
                     * Handles log_update.
                     *
                     * @method
                     * @param {sse:log_update} event - Task log update event.
                     * @param {String} data - log data
                     * @listens sse:log_update
                     */
                    $scope.$on("sse:log_update", function(event, data) {
                        repository.deployState = "processing";
                        $scope.$apply();
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
                        var taskData = data;
                        sseAPIService.close(sseObj);
                        repository.deployCalloutType = "success";
                        repository.deployState = "complete";

                        $scope.$apply();

                        $timeout(function() {
                            return versionControlService.getRepositoryInformation(repository.repoPath, "last_deployment,tasks")
                                .then(function(data) {
                                    repository.lastDeployedDate = data.lastDeployedDate;
                                    repository.lastDeployedSHA = data.lastDeployedSHA;
                                    repository.lastDeployedAuthor = data.lastDeployedAuthor;
                                    repository.lastDeployedCommitDate = data.lastDeployedCommitDate;
                                    repository.lastDeployedCommitMessage = data.lastDeployedCommitMessage;

                                    repository.hasDeploymentInformation = true;

                                    repository.changesAvailableToDeploy = data.lastDeployedSHA !== repository.lastUpdateSHA;

                                    repository.deployTasks = getDeployTasks(data.tasks);

                                    resetSSEState();

                                    if (repository.deployTasks && repository.deployTasks.length > 0) {
                                        repository.deployInProgress = true;
                                        initializeSSE();
                                    } else {
                                        repository.deployInProgress = false;
                                    }

                                    repository.newDeployCommit = true;

                                    $timeout( function() {
                                        repository.newDeployCommit = false;
                                    }, 5000 );
                                }, function(error) {

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
                        sseAPIService.close(sseObj);
                        var deployedTaskInfo = repository.deployedTaskInformation;
                        var logFileInfo = getLogFileDetails(deployedTaskInfo.log_path);

                        alertService.add({
                            type: "danger",
                            message: LOCALE.maketext("Error occurred while deploying.") +
                                    " " +
                                    LOCALE.maketext("You can view the log file: [output,url,_1,_2,target,_3]", logFileInfo.fileManagerURL, logFileInfo.fileName, "_blank"),
                            closeable: true,
                            replace: false,
                            group: "versionControl"
                        });

                        $scope.$apply();

                        return versionControlService.getRepositoryInformation(repository.repoPath, "tasks")
                            .then(function(data) {
                                repository.deployTasks = getDeployTasks(data.tasks);

                                resetSSEState();

                                if (repository.deployTasks && repository.deployTasks.length > 0) {
                                    repository.deployInProgress = true;
                                    initializeSSE();
                                } else {
                                    repository.deployInProgress = false;
                                }

                            }, function(error) {

                            // display error
                                alertService.add({
                                    type: "danger",
                                    message: error.message,
                                    closeable: true,
                                    replace: false,
                                    group: "versionControl"
                                });
                            });
                    });

                    /**
                     * Get log file details
                     * @method getLogFileDetails
                     *
                     * @param {Object} logFilePath logfile path
                     * @return {Object} Log file details
                     */
                    function getLogFileDetails(logFilePath) {
                        var logFileInfo = {};

                        if (logFilePath) {

                            // construct the file manager url for log file
                            var fileName = logFilePath.split( "/" ).pop();
                            var dirPath = PAGE.homeDir + "/.cpanel/logs";
                            var fileManangerURL = PAGE.deprefix + "filemanager/showfile.html?file=" + encodeURIComponent(fileName) + "&dir=" + encodeURIComponent(dirPath);

                            logFileInfo.fileName = fileName;
                            logFileInfo.fileManagerURL =  fileManangerURL;
                        }

                        return logFileInfo;
                    }

                    /**
                     * Deploy repository
                     * @method deployRepository
                     * @return {Promise} Returns a promise from the VersionControlService.deployRepository method for success/error handling when the user requests to deploy their repository.
                     */
                    repository.deployRepository = function() {
                        return versionControlService.deployRepository(
                            repository.repoPath
                        ).then(function(response) {

                            return versionControlService.getRepositoryInformation(repository.repoPath, "tasks")
                                .then(function(data) {
                                    repository.deployTasks = getDeployTasks(data.tasks);

                                    if (repository.deployTasks && repository.deployTasks.length > 0) {
                                        repository.deployInProgress = true;
                                        initializeSSE();
                                    } else {
                                        repository.deployInProgress = false;
                                    }

                                }, function(error) {

                                    // display error
                                    alertService.add({
                                        type: "danger",
                                        message: error.message,
                                        closeable: true,
                                        replace: false,
                                        group: "versionControl"
                                    });
                                });
                        }, function(error) {
                            repository.deployInProgress = false;
                            alertService.add({
                                type: "danger",
                                message: error +
                                         " " +
                                         LOCALE.maketext("For more information, read our [output,url,_1,documentation,target,_2].", "https://go.cpanel.net/GitDeployment", "_blank"),
                                closeable: true,
                                replace: false,
                                group: "versionControl"
                            });
                        });
                    };


                    /**
                     * Back to List View
                     * @method backToListView
                     */
                    repository.backToListView = function() {
                        $location.path("/list");
                    };

                    /**
                     * Opens repository in gitWeb
                     * @method redirectToGitWeb
                     * @param {String} gitWebURL gitWebURL for the repository
                     * @param {String} repoName Repository name
                     */
                    repository.redirectToGitWeb = function(gitWebURL, repoName) {

                        if (gitWebURL) {
                            $window.open(gitWebURL, repoName + "GitWeb");
                        } else {
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system could not find the repository’s [asis,Gitweb] [output,acronym,URL,Universal Resource Locator]."),
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
                    repository.redirectToFileManager = function(fileManagerURL, repoName) {

                        if (fileManagerURL) {
                            $window.open(fileManagerURL, repoName + "FileManager");
                        } else {
                            alertService.add({
                                type: "danger",
                                message: LOCALE.maketext("The system could not redirect you to the File Manager interface."),
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
                    repository.cloneToClipboard = function(cloneUrl) {
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
                     *  Checks if there are available branches or not.
                     *  @method hasAvailableBranches
                     *  @return {Boolean} Returns if there are any branches in the branchList.
                     */
                    repository.hasAvailableBranches = function() {
                        if (typeof repository.branchList !== "undefined" && repository.branchList) {
                            return (repository.branchList.length !== 0);
                        }
                        return false;
                    };


                }
            ]
        );

        return controller;
    }
);

/*
* base/frontend/paper_lantern/jetbackup/controllers/queues.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global define: false, PAGE: false */

define(
    [
        "lodash",
        "angular",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/actionButtonDirective",
        "cjt/directives/loadingPanel",
        "cjt/directives/toggleSortDirective",
        "cjt/directives/searchDirective",
        "cjt/directives/pageSizeDirective",
        "cjt/filters/startFromFilter",
        "cjt/decorators/paginationDecorator"
    ],
    function(_, angular, LOCALE) {

        var app;
        try {
            app = angular.module("cpanel.jetbackup");
        }
        catch(e) {
            app = angular.module("cpanel.jetbackup", []);
        }

        app.controller("queues",
            ["$rootScope", "$scope", "$interval", "$timeout", "jetapi", "growl", "$window",
                function($rootScope, $scope, $interval, $timeout, jetapi, growl, $window) {

                    var COMPONENT_NAME = "QueueTable";
                    $scope.queues = [];
					$scope.loadingQueue = false;
					$scope.sortedList = {};

					$scope.meta = {
						// pager settings
						maxPages: 5,
						totalItems: $scope.queues.length,
						currentPage: 1,
						pageSize: 10,
						pageSizes: [10, 20, 50, 100, 500],
						start: 0,
						limit: 10
					};

					var statusInterval;

					$scope.checkStatus = function () {

						if(angular.isDefined(statusInterval)) return;

						var runCheckStatus = false;
						$scope.sortedList = {};

						for(var i in $scope.queues)
						{
							if($scope.queues[i].status < 100)
							{
								$scope.sortedList[$scope.queues[i]._id] = $scope.queues[i];
								runCheckStatus = true;
							}
						}

						if(!runCheckStatus) return;

						statusInterval = $interval(function() {

							var apiPromise = jetapi.listQueueItems();
							$scope.fetchPromise = apiPromise;

							apiPromise.then(
								function(response) {

									// We only want to actually process the response if it's the last request we sent
									if( $scope.fetchPromise !== apiPromise ) return;

									var data = response.data.queue;
									var queued = 0;

									for(var i in data) {
										var _id = data[i]._id;
										if($scope.sortedList[_id] === undefined) continue;
										for(var k in data[i]) $scope.sortedList[_id][k] = data[i][k];
										if(data[i].status < 100) queued++;
									}

									if(!queued)
									{
										$interval.cancel(statusInterval);
										statusInterval=undefined;
									}
								},
								function(error) {
									growl.error(error);
								}
							);
						}, 5000);
					};

					$scope.fetch = function() {

						$scope.loadingQueue = true;
						$scope.meta.mobileItemCountText = undefined;

						var container = angular.element("#QueueList");

						if( container && container[0] ) {
							container.css({ minHeight: $window.getComputedStyle(container[0]).height });
						}

						var apiParams = {
							"skip": ($scope.meta.currentPage - 1) * $scope.meta.pageSize,
							"limit": $scope.meta.pageSize
						};

						var apiPromise = jetapi.listQueueItems(apiParams);
						$scope.fetchPromise = apiPromise;

						apiPromise.then(
							function(response) {

								// We only want to actually process the response if it's the last request we sent
								if( $scope.fetchPromise !== apiPromise ) {
									return;
								}

								var data = response.data.queue;
								$scope.meta.totalItems = response.data.total;

								if ($scope.meta.totalItems > _.min($scope.meta.pageSizes)) {
									$scope.showPager = true;
									var start = ($scope.meta.currentPage - 1) * $scope.meta.pageSize;
									$scope.meta.start = start + 1;
									$scope.meta.limit = start + data.length;

								} else {
									// hide pager and pagination
									$scope.showPager = false;

									if (data.length === 0) {
										$scope.meta.start = 0;
									} else {
										// table statistics
										$scope.meta.start = 1;
									}

									$scope.meta.limit = data.length;
								}

								$scope.meta.mobileItemCountText = LOCALE.maketext("Displaying [_1] to [_2] out of [_3] records",
									$scope.meta.start, $scope.meta.limit, $scope.meta.totalItems
								);

								angular.element("#QueueList").css({ minHeight: "" });
								$scope.queues = data;
								$scope.loadingQueue = false;
								$scope.checkStatus();
							},
							function(error) {
								growl.error(error);
								$scope.loadingQueue = false;
							}
						);

					};

                    $timeout($scope.fetch);
                }]
        );

    }
);
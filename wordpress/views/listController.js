/*
 * wordpress/views/listController.js                  Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define(
    [
        "angular",
        "lodash",
        "cjt/util/locale",
        "uiBootstrap",
        "cjt/directives/disableAnimations",
        "cjt/directives/lastItem",
        "cjt/directives/pageSizeDirective",
        "cjt/directives/spinnerDirective",
        "app/directives/listSearchArea",
        "app/directives/listInstance",
        "app/services/instancesApi",
    ],
    function(angular, _, LOCALE) {

        // Retrieve the current application
        var app = angular.module("cpanel.wordpress");

        // Setup the controller
        var controller = app.controller(
            "listController", [
                "$scope",
                "$timeout",
                "$location",
                "growl",
                "instancesApi",
                "spinnerAPI",
                function(
                    $scope,
                    $timeout,
                    $location,
                    growl,
                    instancesApi,
                    spinnerAPI
                ) {

                    /**
                     * Initialize the scope variables
                     *
                     * @private
                     * @method _initializeScope
                     */
                    var _initializeScope = function() {
                        spinnerAPI.start("top-loading-spinner");

                        var allowedPageSizes = [10, 20, 50, 100];
                        var pageSize = _closestValidPageSize( allowedPageSizes, $location.search().page_size ) || 20;

                        $scope.list = {
                            original: undefined,
                            filtered: undefined,
                            invalidCount: 0,
                            nonFatalErrors: [],

                            needsFiltering: false,
                            needsPagination: false,

                            // This will also house the properties/values from initialMeta after the first filter is
                            // complete, but filling those values in now will cause Angular UI Bootstrap to reset them
                            // to defaults since they will be considered out of range. AUIB still binds to non-existent
                            // properties on this object and we will just update those values afterward.
                            meta: {
                                allowedSizes: allowedPageSizes,
                            },

                            initialMeta: {
                                pageNumber: $location.search().page_number || 1, // Angular UI Bootstrap will handle any values out of range
                                pageSize: pageSize,                              // TODO: Retrieve from NVData
                                filterValue: $location.search().filter_value,
                            },
                        };

                        $scope.ui = {
                            isRefreshing: true,
                            fetchHasFailed: false,
                        };

                        instancesApi.get().then(function(data) {
                            $scope.list.original = data.instances;
                            $scope.list.invalidCount = data.invalidCount;
                            $scope.list.nonFatalErrors = data.nonFatalErrors;
                        }).catch(function(error) {
                            _fetchError(error);
                        });

                    };

                    // Get the page bootstrapped.
                    _initializeScope();

                    /**
                     * Helper function to ensure that the pageSize provided by the query string matches
                     * an accepted value. If not, it will pick the closest, rounding down.
                     *
                     * @method _closestValidPageSize
                     * @private
                     */
                    function _closestValidPageSize(allowedPageSizes, targetSize) {
                        targetSize = parseInt(targetSize, 10);
                        if( isNaN(targetSize) ) {
                            return;
                        }

                        var index = _.sortedIndex(allowedPageSizes, targetSize);
                        if( index >= allowedPageSizes.length ) {
                            index = allowedPageSizes.length - 1;
                        }

                        return allowedPageSizes[ index ];
                    }

                    /**
                     * Select an instance and navigate to its management view.
                     *
                     * @method selectInstance
                     * @scope
                     * @param  {Instance} instance   The instance to be selected.
                     */
                    $scope.selectInstance = function(instance) {
                        $scope.loadView("/manage/" + window.encodeURIComponent(instance.id));
                    };

                    /**
                     * Updates the query string with the meta values that aren't saved in NVData.
                     * This will basically always include the page_number and page_size.
                     *
                     * @method _saveSearchQuery
                     * @private
                     */
                    function _saveSearchQuery() {

                        // Skip this if we haven't actually filtered and set the meta properties yet.
                        // This isn't strictly required, but no sense spending the effort.
                        if( $scope.list.initialMeta ) {
                            return;
                        }

                        // Set the query args, if any. Null values remove that parameter from the search query string.
                        $location.search({
                            page_number: $scope.list.meta.pageNumber || null,
                            filter_value: $scope.list.meta.filterValue || null,
                            page_size: $scope.list.meta.pageSize || null,
                        });
                    }

                    /**
                     * Filter the instances based on the filter settings and then update the UI with
                     * newly paginated results.
                     *
                     * @method filterInstances
                     * @scope
                     */
                    $scope.filterInstances = function() {
                        $scope.list.needsFiltering = true;
                        $scope.list.needsPagination = true;
                    };

                    /**
                     * Refresh the instances list from the server.
                     *
                     * @method refreshInstances
                     * @scope
                     */
                    $scope.refreshInstances = function() {
                        spinnerAPI.start("top-loading-spinner");
                        $scope.ui.isRefreshing = true;
                        $scope.ui.fetchHasFailed = false;

                        instancesApi.fetch().then(function(data) {
                            $scope.list.original = data.instances; // Triggers filters again
                            $scope.list.invalidCount = data.invalidCount;
                            $scope.list.nonFatalErrors = data.nonFatalErrors;
                        }).catch(function(error) {
                            _fetchError(error);
                        }).finally(function() {
                            $scope.ui.isRefreshing = false;
                        });
                    };

                    /**
                     * Issue a growl error and place an error message in the instance list area.
                     */
                    function _fetchError(error) {
                        if(error) {
                            growl.error( error );
                        }
                        else {
                            growl.error(
                                LOCALE.maketext("The system failed to retrieve the list of your [asis,WordPress] installations from the server.")
                            );
                        }

                        $scope.doneRendering();
                        $scope.ui.fetchHasFailed = true;
                    }

                    /**
                     * Generate the paginated list of instances and attach it to the view.
                     *
                     * @private
                     * @method _paginateAndFilter
                     * @param {Boolean} needsFiltering   If true, the original list will be filtered again before it's paginated.
                     */
                    function _paginateAndFilter(needsFiltering) {

                        if (!$scope.list.original) {
                            return;
                        }

                        spinnerAPI.start("top-loading-spinner");

                        // Run this in a separate cycle so the browser can actually start
                        // the spinner in the UI while the rest of this is processing.
                        $timeout(function() {

                            var filteredList = needsFiltering ?
                                _filterInstances() : $scope.list.filtered || _filterInstances();

                            if(!filteredList) {
                                return; // We're not ready to update the UI
                            }

                            var oldPagedList = $scope.list.paged;
                            var newPagedList = _getCurrentPage(filteredList, $scope.list.meta);

                            // Attach lists to the view
                            $scope.list.filtered = filteredList;
                            $scope.list.paged = newPagedList;

                            if(_listIsUnchanged(oldPagedList, newPagedList) || !newPagedList.length) {
                                $timeout(function() {
                                    $scope.doneRendering();
                                });
                            }

                            // Hide the initial loading panel if it's still showing
                            $scope.hideViewLoadingPanel();
                            $scope.ui.isRefreshing = false;

                        });
                    }

                    /**
                     * Get the subset of an array pertaining to the current page.
                     *
                     * @method  _getCurrentPage
                     * @private
                     * @param  {Array}  source     Array of items to be paged.
                     * @param  {Object} options    The pagination options.
                     * @param  {Number} options.pageNumber   The current page number.
                     * @param  {Number} options.pageSize     The size of the pages.
                     * @return {Array}             An array with just the current page's items.
                     */
                    function _getCurrentPage(source, options) {
                        var startIndex = options.pageSize * (options.pageNumber - 1);
                        var endIndex   = options.pageSize * options.pageNumber;

                        if (endIndex > source.length) {
                            endIndex = source.length;
                        }

                        return (source.length < options.pageSize) ?
                            source.slice():
                            source.slice(startIndex, endIndex);
                    }


                    /**
                     * Comparison to check if the oldList and newList are the same.
                     *
                     * @method  _listIsUnchanged
                     * @private
                     * @param  {Array} oldList List of objects from the previous filter or pagination.
                     * @param  {Array} newList List of objects from the current  filter or pagination.
                     * @return {Boolean}       true if the lists are equivalent, false otherwise.
                     */
                    function _listIsUnchanged(oldList, newList) {
                        if(!oldList || !newList || oldList.length !== newList.length) {
                            return false;
                        }

                        return oldList.every(function(oldInstance, index) {
                            var newInstance = newList[ index ];
                            return (newInstance === oldInstance) || _.isEqual(newInstance, oldInstance);
                        });
                    }

                    /**
                     * Filter instances based on the various filters.
                     *
                     * @method  _filterInstances
                     * @return {Array} List of instances that match the various filters.
                     *                 Returns undefined if the filters or data aren't ready yet.
                     */
                    function _filterInstances() {
                        if(!$scope.list.original) {
                            // We're not ready for filtering yet
                            return;
                        }

                        // Set the meta-data using the initialMeta if it's the first run
                        if($scope.list.initialMeta) {
                            angular.forEach($scope.list.initialMeta, function(val, key) {
                                $scope.list.meta[key] = val;
                            });
                            delete $scope.list.initialMeta;
                        }

                        var filteredList = $scope.list.original;

                        // Filter the search term first
                        filteredList = filteredList.filter( _filterByValue );

                        return filteredList;
                    }

                    /**
                     * Filter method to test if the instance should be filtered by a string value.
                     *
                     * @method _filterByValue
                     * @param  {Object} instance   The instance to be tested.
                     * @return {Boolean}           true if the instance should be included, false otherwise.
                     */
                    function _filterByValue(instance) {
                        if(!$scope.list.meta.filterValue) {
                            return true;
                        }

                        return [
                            "domain",
                            "full_path",
                        ].some(function(key) {
                            var propVal = instance[key];
                            if(propVal && propVal.toLocaleLowerCase().indexOf($scope.list.meta.filterValue) !== -1) {
                                return true;
                            }
                            return false;
                        });
                    }

                    /**
                     * Clears the search term when the Esc key is pressed.
                     *
                     * @method triggerClearSearch
                     * @scope
                     * @param {Event} event   The event object
                     */
                    $scope.triggerClearSearch = function(event) {
                        if (event.keyCode === 27) {
                            $scope.clearSearch();
                        }
                    };

                    /**
                     * Clears the search term.
                     *
                     * @method clearSearch
                     * @scope
                     */
                    $scope.clearSearch = function() {
                        $scope.list.meta.filterValue = "";
                        $scope.filterInstances();
                    };

                    /**
                     * Called when the last row is inserted to stop the loading spinner.
                     *
                     * @method doneRendering
                     * @scope
                     * @param [{Object}] user   Not required. Just for debugging
                     */
                    $scope.doneRendering = function(user) {
                        spinnerAPI.stop("top-loading-spinner");
                        $scope.hideViewLoadingPanel();
                        $scope.ui.isRefreshing = false;
                    };

                    $scope.$watchGroup(["list.meta.pageSize", "list.meta.pageNumber"], function(newVals) {

                        // If the pageSize is undefined, then this is the
                        // initial watch, so we can skip processing for now.
                        if(angular.isUndefined(newVals[0]) || $scope.list.initialMeta) {
                            return;
                        }

                        $scope.scrollTo("top");
                        _saveSearchQuery();
                        $scope.list.needsPagination = true;
                    });

                    $scope.$watch("list.meta.filterValue", function(newVal, oldVal) {
                        if(newVal !== oldVal) {
                            _saveSearchQuery();
                            $scope.list.needsFiltering = true;
                        }
                    });

                    $scope.$watchGroup(["list.needsFiltering", "list.needsPagination"], function(needs) {
                        var needsFiltering = needs[0];
                        var needsPagination = needs[1];

                        if(needsPagination || needsFiltering) {
                            _paginateAndFilter(needsFiltering);
                            $scope.list.needsFiltering = false;
                            $scope.list.needsPagination = false;
                        }
                    });

                    /**
                     * This is a basic watch using === for simplicity and watch performance, so you
                     * should never alter list.original in place. Always set it to a new array.
                     */
                    $scope.$watch("list.original", function(newVal, oldVal) {
                        if(!newVal) {
                            return;
                        }

                        $scope.filterInstances();

                        if($scope.list.invalidCount) {
                            growl.warning(
                                LOCALE.maketext("[_1] [asis,WordPress] [numerate,_1,installation is,installations are] not included due to data errors.", $scope.list.invalidCount)
                            );
                        }

                        $scope.list.nonFatalErrors.forEach(function(error) {
                            growl.warning(
                                LOCALE.maketext("The system could not display some of your [asis,WordPress] installations due to loading errors: [_1]", error)
                            );
                        });
                    });

                }
            ]
        );

        return controller;
    }
);

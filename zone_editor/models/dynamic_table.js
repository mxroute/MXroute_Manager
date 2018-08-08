/*
# models/dynamic_table.js                         Copyright(c) 2016 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define: false */

define(
    [
        "lodash",
        "cjt/util/locale",
    ],
    function(_, LOCALE) {

        /**
         * Creates a Dynamic Table object
         *
         * @class
         */
        function DynamicTable() {
            this.items = [];
            this.filteredList = this.items;
            this.selected = [];
            this.allDisplayedRowsSelected = false;
            this.filterFunction = void 0;
            this.quickFilterFunction = void 0;

            this.meta = {
                sortBy: "",
                sortDirection: "asc",
                maxPages: 0,
                totalItems: this.items.length,
                pageNumber: 1,
                pageSize: 10,
                pageSizes: [10, 20, 50, 100],
                start: 0,
                limit: 0,
                filterValue: "",
                quickFilterValue: ""
            };
        }

        /**
         * Set the filter function to be used for searching the table
         *
         * @method loadData
         * @param {Array} data - an array of objects representing the data to display
         */
        DynamicTable.prototype.loadData = function(data) {
            if (!_.isArray(data)) {
                throw "Developer Exception: loadData requires an array";
            }

            this.items = data;

            for (var i = 0, len = this.items.length; i < len; i++) {
                if (!_.isObject(this.items[i])) {
                    throw "Developer Exception: loadData requires an array of objects";
                }

                // add a unique id to each piece of data
                this.items[i]._id = i;

                // initialize the selected array with the ids of selected items
                if (this.items[i].selected) {
                    this.selected.push(this.items[i]._id);
                }
            }
        };

        /**
         * Set the filter function to be used for searching the table
         *
         * @method setFilterFunction
         * @param {Function} func - a function that can be used to search the data
         * @note The function passed to this function must
         * - return a boolean
         * - accept the following args: an item object and the search text
         */
        DynamicTable.prototype.setFilterFunction = function(func) {
            if (!_.isFunction(func)) {
                throw "Developer Error: setFilterFunction requires a function";
            }

            this.filterFunction = func;
        };

        /**
         * Set the quick filter function to be used with quick filters, which
         * are a predefined set of filter values
         *
         * @method setQuickFilterFunction
         * @param {Function} func - a function that can be used to filter data
         * @note The function passed to this function must
         * - return a boolean
         * - accept the following args: an item object and the search text
         */
        DynamicTable.prototype.setQuickFilterFunction = function(func) {
            if (!_.isFunction(func)) {
                throw "Developer Error: setQuickFilterFunction requires a function";
            }

            this.quickFilterFunction = func;
        };


        /**
         * Set the filter function to be used for searching the table
         *
         * @method setSort
         * @param {String} by - the field you want to sort on
         * @param {String} direction - the direction you want to sort, "asc" or "desc"
         */
        DynamicTable.prototype.setSort = function(by, direction) {
            if (!_.isUndefined(by)) {
                this.meta.sortBy = by;
            }

            if (!_.isUndefined(direction)) {
                this.meta.sortDirection = direction;
            }
        };

        /**
         * Get the table metadata
         *
         * @method getMetadata
         * @return {Object} The metadata for the table. We return a
         * reference here so that callers can update the object and
         * changes can easily be propagated.
         */
        DynamicTable.prototype.getMetadata = function() {
            return this.meta;
        };

        /**
         * Get the table data
         *
         * @method getList
         * @return {Array} The table data
         */
        DynamicTable.prototype.getList = function() {
            return this.filteredList;
        };

        /**
         * Get the table data that is selected
         *
         * @method getSelectedList
         * @return {Array} The table data that is selected
         */
        DynamicTable.prototype.getSelectedList = function() {
            return this.items.filter(function(item) {
                return item.selected;
            });
        };

        /**
         * Determine if all the filtered table rows are selected
         *
         * @method areAllDisplayedRowsSelected
         * @return {Boolean}
         */
        DynamicTable.prototype.areAllDisplayedRowsSelected = function() {
            return this.allDisplayedRowsSelected;
        };

        /**
         * Get the total selected rows in the table
         *
         * @method getTotalRowsSelected
         * @return {Number} total of selected rows in the table
         */
        DynamicTable.prototype.getTotalRowsSelected = function() {
            return this.selected.length;
        };

        /**
         * Select all items for a single page of data in the table
         *
         * @method selectAllDisplayed
         * @param {Boolean} toggle - determines whether to select or unselect all
         * displayed items
         */
        DynamicTable.prototype.selectAllDisplayed = function(toggle) {
            if (toggle) {

                // Select the rows if they were previously selected on this page.
                for (var i = 0, filteredLen = this.filteredList.length; i < filteredLen; i++) {
                    var item = this.filteredList[i];
                    item.selected = true;

                    // make sure this item is not already in the list
                    if (this.selected.indexOf(item._id) !== -1) {
                        continue;
                    }

                    this.selected.push(item._id);
                }
            } else {

                // Extract the unselected items and remove them from the selected collection.
                var unselected = this.filteredList.map(function(item) {
                    item.selected = false;
                    return item._id;
                });

                this.selected = _.difference(this.selected, unselected);
            }

            this.allDisplayedRowsSelected = toggle;
        };

        /**
         * Select an item on the current page.
         *
         * @method selectItem
         * @param {Object} item - the item that we want to mark as selected.
         * NOTE: the item must have the selected property set to true before
         * passing it to this function
         */
        DynamicTable.prototype.selectItem = function(item) {
            if (!_.isUndefined(item)) {
                if (item.selected) {

                    // make sure this item is not already in the list
                    if (this.selected.indexOf(item._id) !== -1) {
                        return;
                    }

                    this.selected.push(item._id);

                    // Sync 'Select All' checkbox status when a new selction/unselection is made.
                    this.allDisplayedRowsSelected = this.filteredList.every(function(thisitem) {
                        return thisitem.selected;
                    });
                } else {
                    this.selected = this.selected.filter(function(thisid) {
                        return thisid !== item._id;
                    });

                    // Unselect Select All checkbox.
                    this.allDisplayedRowsSelected = false;
                }
            }
        };

        /**
         * Clear all selections for all pages.
         *
         * @method clearAllSelections
         */
        DynamicTable.prototype.clearAllSelections = function() {
            this.selected = [];

            for (var i = 0, len = this.items.length; i < len; i++) {
                var item = this.items[i];
                item.selected = false;
            }

            this.allDisplayedRowsSelected = false;
        };

        /**
         * Clear the entire table.
         *
         * @method clear
         */
        DynamicTable.prototype.clear = function() {
            this.items = [];
            this.selected = [];
            this.allDisplayedRowsSelected = false;
            this.filteredList = this.populate();
        };

        /**
         * Populate the table with data accounting for filtering, sorting, and paging
         *
         * @method populate
         * @return {Array} the table data
         */
        DynamicTable.prototype.populate = function() {
            var filtered = [];
            var self = this;

            // filter list based on search text
            if (this.meta.filterValue !== null &&
                this.meta.filterValue !== void 0 &&
                this.meta.filterValue !== "" &&
                _.isFunction(this.filterFunction)) {
                filtered = this.items.filter(function(item) {
                    return self.filterFunction(item, self.meta.filterValue);
                });
            } else {
                filtered = this.items;
            }

            // filter list based on the quick filter
            if (this.meta.quickFilterValue !== null &&
                this.meta.quickFilterValue !== void 0 &&
                this.meta.quickFilterValue !== "" &&
                _.isFunction(this.quickFilterFunction)) {
                filtered = filtered.filter(function(item) {
                    return self.quickFilterFunction(item, self.meta.quickFilterValue);
                });
            }

            // sort the filtered list
            if (this.meta.sortDirection !== "" && this.meta.sortBy !== "") {
                filtered = _.orderBy(filtered, [this.meta.sortBy], [this.meta.sortDirection]);
            }

            // update the total items after search
            this.meta.totalItems = filtered.length;

            // filter list based on page size and pagination and handle the case
            // where the page size is "ALL" (-1)
            if (this.meta.totalItems > _.min(this.meta.pageSizes) ) {
                var start = (this.meta.pageNumber - 1) * this.meta.pageSize;
                var limit = this.meta.pageNumber * this.meta.pageSize;

                filtered = _.slice(filtered, start, limit);

                this.meta.start = start + 1;
                this.meta.limit = start + filtered.length;
            } else {
                if (filtered.length === 0) {
                    this.meta.start = 0;
                } else {
                    this.meta.start = 1;
                }

                this.meta.limit = filtered.length;
            }

            var countNonSelected = 0;
            for (var i = 0, filteredLen = filtered.length; i < filteredLen; i++) {
                var item = filtered[i];

                // Select the rows if they were previously selected on this page.
                if (this.selected.indexOf(item._id) !== -1) {
                    item.selected = true;
                } else {
                    item.selected = false;
                    countNonSelected++;
                }
            }

            this.filteredList = filtered;

            // Clear the 'Select All' checkbox if at least one row is not selected.
            this.allDisplayedRowsSelected = (filtered.length > 0) && (countNonSelected === 0);

            return filtered;
        };

        /**
         * Create a localized message for the table stats
         *
         * @method paginationMessage
         * @return {String}
         */
        DynamicTable.prototype.paginationMessage = function() {
            return LOCALE.maketext("Displaying [numf,_1] to [numf,_2] out of [quant,_3,item,items]", this.meta.start, this.meta.limit, this.meta.totalItems);
        };

        return DynamicTable;
    }
);

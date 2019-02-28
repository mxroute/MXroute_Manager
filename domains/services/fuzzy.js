/*
 * domains/services/fuzzy.js                           Copyright 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define, PAGE */

/** @namespace cpanel.domains.services.Fuzzy */

define(
    [],
    function() {

        "use strict";

        /**
         * Fuzzy search engine service based on the https://en.wikipedia.org/wiki/Levenshtein_distance
         *
         * @module Fuzzy
         *
         * @param  {Array} set [optional] set of searchables
         *
         * @example
         * var fuzzy = new Fuzzy();
         * fuzzy.loadSet(["apple", "orange", "banana"]);
         * var result = fuzzy.search("orage");
         *
         */

        var Fuzzy = function(set) {

            this._storedSet = set ? set : [];
            this._cache = {};
            this._cacheBySet = {};

            /**
             * Sort two objects by the distance value
             *
             * @method _distanceSort
             * @private
             *
             * @param  {Object} a object with a distance
             * @param  {Object} b object with a distance
             *
             * @return {Number} returns sort number from comparison
             *
             */
            this._distanceSort = function(a, b) {
                if (a.distance === b.distance) {
                    if (a.lengthDiff === b.lengthDiff) {
                        return 0;
                    }

                    return a.lengthDiff < b.lengthDiff ? -1 : 1;
                }

                return a.distance < b.distance ? -1 : 1;
            };

            /**
             * Cache some value in a nested object
             *
             * @method _setCache
             * @private
             *
             * @param  {Object} cache object to store on
             * @param  {String} itemA top level key to store on
             * @param  {String} itemB second level key to store on
             * @param  {*} value value to be stored in the cache
             *
             * @return {Object} return the stored value
             *
             */
            this._setCache = function _setCache(cache, itemA, itemB, value) {

                cache[itemA] = cache[itemA] ? cache[itemA] : {};

                return  cache[itemA][itemB] = value;

            };

            /**
             * Return the stored value from the cache
             *
             * @method _getCache
             * @private
             *
             * @param  {Array} cache cache to return from
             * @param  {String} itemA top level key to store on
             * @param  {String} itemB second level key to store on
             *
             * @return {*} return the stored value
             *
             */
            this._getCache = function _getCache(cache, itemA, itemB) {

                if (cache[itemA] && cache[itemA][itemB]) {
                    return cache[itemA][itemB];
                }

                return;
            };

            /**
             * Deep logic to compare two strings
             *
             * @method _searchStrings
             * @private
             *
             * @param  {String} haystack string to test pattern against
             * @param  {String} needle pattern to check
             *
             * @return {Object} comparison result object
             *
             */
            this._searchStrings = function _searchStrings(haystack, needle) {

                if (haystack === needle) {

                    return this._setCache(this._cache, haystack, needle, {
                        distance: 0,
                        substring: haystack,
                        pattern: needle,
                        match: haystack
                    });

                }

                var needleLength = needle.length;
                var haystackLength = haystack.length;

                var a = [], // current row
                    b = [], // previous row
                    pa = [], // from
                    pb = [],
                    s, i, j;
                for (i = 0; i <= needleLength; i++) {
                    s = b;
                    b = a;
                    a = s;
                    s = pb;
                    pb = pa;
                    pa = s;
                    for (j = 0; j <= haystackLength; j++) {
                        if (i && j) {
                            a[j] = a[j - 1] + 1;
                            pa[j] = pa[j - 1];

                            s = b[j - 1] + (haystack[j - 1] === needle[i - 1] ? 0 : 1);
                            if (a[j] > s) {
                                a[j] = s;
                                pa[j] = pb[j - 1];
                            }

                            if (a[j] > b[j] + 1) {
                                a[j] = b[j] + 1;
                                pa[j] = pb[j];
                            }
                        } else {
                            a[j] = i;
                            pa[j] = j;
                        }
                    }
                }

                s = 0;
                for (j = a.length - 1; j >= 1; j--) {
                    if (a[j] < a[s]) {
                        s = j;
                    }
                }

                var subMatch = haystack.slice(pa[s], s);

                return this._setCache(this._cache, haystack, needle, {
                    distance: a[s] + 1,
                    substring: subMatch,
                    lengthDiff: Math.abs(needleLength - haystackLength),
                    pattern: needle,
                    match: haystack
                });
            };

            /**
             * Search for a string within a set
             *
             * @method search
             *
             * @param  {String} item item to search for in a set
             * @param  {Array} set [optional] set of items to search
             *
             * @return {Array} array of matches ranked in ascending distance
             *
             */
            this.search = function _search(item, set) {

                if (set) {
                    this.loadSet(set);
                } else {
                    set = this.getSet();
                }

                var sString = set.join("");

                if (this._getCache(this._cacheBySet, sString, item)) {
                    return this._getCache(this._cacheBySet, sString, item);
                }

                var result = [];

                set.forEach(function(setItem, index) {
                    result[index] = this._searchStrings(setItem, item);
                }, this);

                result = result.sort(this._distanceSort);

                return this._setCache(this._cacheBySet, sString, item, result);

            };

            /**
             * Get the currently stored set
             *
             * @method getSet
             *
             * param jsdocparam maybe?
             *
             * @return {Array} returns the current set of searchables
             *
             */
            this.getSet = function _getSet() {
                return this._storedSet;
            };

            /**
             * Load a new set of searchables
             *
             * @method loadSet
             *
             * @param  {Array} set new set of searchables to store
             *
             */
            this.loadSet = function _loadSet(set) {
                this._storedSet = set;
            };
        };

        return Fuzzy;
    }
);

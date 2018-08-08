/*
 * eventSourceMock.js                                Copyright 2018 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global define: false */

define([
    "lodash"
], function(
        _
    ) {
    "use strict";

    var ReadyStateType = {
        created: 0,
        opened: 1,
        closed: 2
    };

    var defaultConfig = {
        withCredentials: false
    };

    var defaultEventSource;

    var sources = {};

    /**
     * Get the EventSourceMock for a given url
     *
     * @private
     * @param  {String} url
     * @return {EventSourceMock}
     */
    function _getSource(url) {
        var source = sources[url];
        if (!source) {
            throw "Attempted to use an EventSource that was not registered: " + url;
        }
        return source;
    }

    /**
     * Fire an event
     *
     * @private
     * @param  {EventSourceMock} source
     * @param  {String}          eventName Name of the event to fire.
     * @param  {EventMock}       event     Mock event object.
     */
    function _fireEvent(source, eventName, event) {
        var listeners = source.events[eventName];
        if (listeners) {
            listeners.forEach(function(listener) {
                if (typeof listener === "function") {
                    listener(event);
                }
            });
        }
    }

    return {
        install: function() {
            if (defaultEventSource) {
                throw "EventSource is already mocked.";
            }

            defaultEventSource = window.EventSource;

            /**
             * Mock EventSource. Mimics the internal behaviors of the EventSource without actually
             * making any network connections or relying on a backend.
             *
             * @example
             *
             *   define([
             *       "version_control/test/eventSourceMock",
             *   ], function(angular, EVENTS) {
             *       "use strict";
             *
             *       describe("", function() {
             *           var url = "some/end/point";
             *
             *           EVENTS.install(url);
             *
             *           var sse = new EventSource(url);
             *           expect(sse.readyState).toBe(0);
             *
             *           spyOn(sse.onopen).and.callThrough();
             *           spyOn(sse.onmessage).and.callThrough();
             *           spyOn(sse.onerror).and.callThrough();
             *
             *           EVENTS.emitOpen(url);
             *           expect(sse.onopen).toHaveBeenCalled();
             *           expect(sse.readyState).toBe(1);
             *
             *           EVENTS.emitMessage(url, "message");
             *           expect(sse.onmessage).toHaveBeenCalledWith("message");
             *
             *           EVENTS.emitError(url, "failed");
             *           expect(sse.onerror).toHaveBeenCalledWith("failed");
             *
             *           sse.close();
             *           expect(sse.readyState).toBe(2);
             *
             *           EVENTS.uninstall(url);
             *       });
             *   });
             *
             * @class EventSourceMock
             * @property {String} url
             * @property {Object} [config]
             * @property {Number} readyState
             * @property {Function} [onopen]
             * @property {Function} [onerror]
             * @property {Function} [onmessage]
             */

            /**
             * Constructor for the EventSourceMock
             *
             * @protected
             * @constructor
             * @param {String} url
             * @param {Object} config configuration thats passed to EventSource
             */
            window.EventSource = function EventSourceMock(url, config) {
                this.url = url;
                this.config = config || defaultConfig;
                this.readyState = ReadyStateType.created;
                this.onopen = null;
                this.onerror = null;
                this.onmessage = null;
                this.events = {};

                /**
                 * Add the event listener for a given event name.
                 *
                 * @class EventSourceMock
                 * @method addEventListener
                 * @param {String}   eventName
                 * @param {Function} listener
                 */
                this.addEventListener = function(eventName, listener) {
                    if (!this.events[eventName]) {
                        this.events[eventName] = [];
                    }
                    this.events[eventName].push(listener);
                };

                /**
                 * Remove the event listener for a given event name.
                 *
                 * @class EventSourceMock
                 * @method removeEventListener
                 * @param {String}   eventName
                 * @param {Function} listener
                 */
                this.removeEventListener = function(eventName, listener) {
                    if (!this.events[eventName]) {
                        throw "Attempted to remove an unregistered event listener: " + eventName;
                    }
                    _.remove(this.events[eventName], listener);
                };

                /**
                 * Close the connect;
                 *
                 * @class EventSourceMock
                 * @method close
                 */
                this.close = function() {
                    this.readyState = ReadyStateType.closed;
                };

                sources[url] = this;
                return this;
            };
        },

        /**
         * Use to trigger the error event for the EventSource
         *
         * @param {String} url   SSE url for the request
         * @param {String} error Error message for the request
         */
        emitError: function(url, error) {
            var source = _getSource(url);
            if (typeof source.onerror === "function") {
                source.onerror(error);
            }
        },

        /**
         * Use to trigger the open event for the EventSource
         *
         * @param  {String} url  SSE url for the request
         */
        emitOpen: function(url) {
            var source = _getSource(url);
            source.readyState = ReadyStateType.opened;
            if (typeof source.onopen === "function") {
                source.onopen();
            }
        },

        /**
         * Used by tests to trigger a message event.
         *
         * @param  {String} url  SSE url for the request
         * @param  {String} eventName Event message name
         * @param  {String} data Event message data
         */
        emitMessage: function(url, eventName, data) {
            var source = _getSource(url);
            var event = {
                type: eventName,
                data: data
            };

            if (typeof source.onmessage === "function") {
                source.onmessage(event);
            }

            _fireEvent(source, eventName, event);
        },

        /**
         * Uninstall the mock EventSource
         */
        uninstall: function() {
            if (!defaultEventSource) {
                throw "EventSource is not mocked.";
            }

            window.EventSource = defaultEventSource;
            defaultEventSource = null;
        },

        /**
         * Get the source so we can spy on methods on it.
         *
         * @param  {String} url
         * @return {EventSourceMock}
         */
        get: function(url) {
            return _getSource(url);
        }
    };
});

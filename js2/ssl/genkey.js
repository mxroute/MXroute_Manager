(function(window) {
    "use strict";

    var YAHOO = window.YAHOO;
    var EVENT = YAHOO.util.Event;
    var DOM = YAHOO.util.Dom;

    // Initialize the page javascript
    EVENT.onDOMReady(function() {

        // Setup the events
        EVENT.on("show-gen-details", "click", function(e) {
            EVENT.preventDefault(e);
            DOM.setStyle("details", "display", "block");
            return false;
        });

    });
}(window));

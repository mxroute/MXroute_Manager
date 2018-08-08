(function() {

    // Imports
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;

    /**
     * Initialize the page validation
     * @method initialize
     */
    var initialize = function() {

        // Set the focus to the delete action to make keyboard users life easier.
        var btnDelete = DOM.get("btnDelete");
        if (btnDelete) {
            setTimeout(function() {
                btnDelete.focus();
            }, 1);
        }
    };

    // Register startup events.
    YAHOO.util.Event.onDOMReady(initialize);

}());

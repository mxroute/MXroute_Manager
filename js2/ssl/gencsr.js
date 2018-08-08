(function() {

    // Imports
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;

    /**
     * Toggle the display property to alternatively show/hide the element
     * @method toggleDisplay
     * @param  {HTMLElement} el element to toggle
     */
    var toggleDisplay = function(el) {
        if (!el) {
            return;
        }

        if (DOM.getStyle(el, "display") === "none") {
            DOM.setStyle(el, "display", "block");
        } else {
            DOM.setStyle(el, "display", "none");
        }
    };

    /**
     * Initialize the page validation
     * @method initialize
     */
    var initialize = function() {

        // Setup the events on the page.
        var detailsEl = DOM.get("details");
        EVENT.on("gen_error_more", "click", function(e) {
            toggleDisplay(detailsEl);
        });

        // Set the focus to the CSR since they likely need to copy it.
        var encodedCSREl = DOM.get("encoded-csr");
        if (encodedCSREl) {
            encodedCSREl.focus();
        }
    };

    // Register startup events.
    YAHOO.util.Event.onDOMReady(initialize);

}());

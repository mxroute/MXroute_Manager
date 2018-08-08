(function() {
    var CPANEL = window.CPANEL,
        YAHOO = window.YAHOO,
        DOM = YAHOO.util.Dom,
        EVENT = YAHOO.util.Event,
        LOCALE = window.LOCALE;

    /**
     * Function which is the onClick event for the 'Synchronize Grants' button.
     *  Just fires the API1 Postgres::updateprivs call and handles response.
     * @method setSpinner
     */

    function sync_grants() {
        var grants_synced_txt = LOCALE.maketext("PostgreSQL grants have been synchronized.");
        var sync_grants_notices_id = DOM.get("sync_grants_notices_id");

        setSpinner();

        CPANEL.api({
            version: 1,
            module: "Postgres",
            func: "updateprivs",
            callback: {

                // API Success handler
                success: function(o) {
                    hide_spinner();

                    if (o.cpanel_status) {
                        new CPANEL.widgets.Dynamic_Page_Notice({
                            level: "success",
                            content: grants_synced_txt,
                            container: sync_grants_notices_id
                        }).show();
                    } else { // error
                        new CPANEL.widgets.Dynamic_Page_Notice({
                            level: "error",
                            content: o.cpanel_error,
                            container: sync_grants_notices_id
                        }).show();
                    }
                },

                // API Failure handler
                failure: function() {
                    hide_spinner();

                    new CPANEL.widgets.Dynamic_Page_Notice({
                        level: "error",
                        content: LOCALE.maketext("AJAX Error"),
                        container: sync_grants_notices_id
                    }).show();
                }
            }
        });
    }

    /* Copied from email_ui_control.js */
    /**
     * Function which shows the spinner and disables the button
     * @method setSpinner
     */
    var setSpinner = function() {
        var run_button = DOM.get("run-button");
        var spinner = DOM.get("spinner");
        var spinner_text = DOM.get("spinner-text");

        spinner.style.width = run_button.offsetWidth + "px";
        DOM.setStyle(spinner_text, "opacity", 0.2);
        spinner.style.display = "block";
        run_button.disabled = true;
    };

    /**
     * Function that hides the spinner and enables the button
     * @method setSpinner
     */
    var hide_spinner = function() {
        var run_button = DOM.get("run-button");
        var spinner = DOM.get("spinner");
        var spinner_text = DOM.get("spinner-text");

        spinner.style.display = "none";
        DOM.setStyle(spinner_text, "opacity", 1);
        run_button.disabled = false;
    };

    /* End Copied from email_ui_control.js */

    YAHOO.util.Event.onDOMReady(function() {
        EVENT.on("run-button", "click", function(e) {
            sync_grants();
            YAHOO.util.Event.preventDefault(e);
        });
    });
})();

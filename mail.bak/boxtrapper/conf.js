(function() {
    YAHOO.util.Event.onDOMReady(function() {
        var frmChangeConf = YAHOO.util.Dom.get("frmChangeConf");
        if (!frmChangeConf) {

            // The form is not available in this context so
            // don't go any further setting up the validation
            // or submit handler
            return;
        }

        // Setup the validator for the days to keep field
        var boxtrapper_days_to_keep_el = YAHOO.util.Dom.get("boxtrapper_daystokeep");
        var days_to_keep_validator = new CPANEL.validate.validator(LOCALE.maketext("The number of days that you wish to keep logs and messages in the queue."));
        days_to_keep_validator.add(boxtrapper_days_to_keep_el, function() {
            return CPANEL.validate.positive_integer(boxtrapper_days_to_keep_el.value);
        }, LOCALE.maketext("The number of days to keep logs must be a positive integer."));
        days_to_keep_validator.attach();

        // Setup the validator for the minimum spam score
        var boxtrapper_min_score_el = YAHOO.util.Dom.get("boxtrapper_minspamscore");
        var mim_score_validator = new CPANEL.validate.validator(LOCALE.maketext("Minimum [asis,Apache] [asis,SpamAssassin] Spam Score required to bypass [asis,BoxTrapper]:"));
        mim_score_validator.add(boxtrapper_min_score_el, function() {
            return (/^-?[0-9]+(\.[0-9]+)?$/).test(boxtrapper_min_score_el.value);
        }, LOCALE.maketext("The minimum spam score must be numeric."));
        mim_score_validator.attach();

        // Setup the submit check
        YAHOO.util.Event.on(
            "frmChangeConf", "submit", function(e) {

            // Collect up the errors if any
                var error_messages = [];
                if (!days_to_keep_validator.is_valid()) {
                    error_messages.push(days_to_keep_validator.error_messages());
                }
                if (!mim_score_validator.is_valid()) {
                    error_messages.push(mim_score_validator.error_messages());
                }

                // If there are errors, don't let the user continue
                if (error_messages.length) {
                    YAHOO.util.Event.preventDefault(e);
                }
            });
    });
})();

/* global $: false, PAGE: true */
/* exported toggleDisplay */

// collapse.tt
function toggleDisplay($dispEl, $linkEl, txtHide, txtShow, forceOpen) {
    if ($dispEl.is(":hidden") || forceOpen) {
        $dispEl.show();
        $linkEl.text(txtHide);
    } else {
        $dispEl.hide();
        $linkEl.text(txtShow);
    }
}

// install_section.tt
$(document).ready(function() {
    $("#cpaddonsform_install").submit(function() {
        $("#spinner-install").show();
        $("#btnSubmitInstall").attr("disabled", "disabled");
        $("#btnSubmitModeration").attr("disabled", "disabled");
    });
});

// install_section.tt - password setup
$(document).ready(function() {
    if (document.getElementById("password_strength") !== null) {
        var passwordValidator = CPANEL.password.setup("password", "password2", "password_strength", window.pwminstrength, "create_strong_password", "why_strong_passwords_link", "why_strong_passwords_text");
        CPANEL.validate.attach_to_form("submit", passwordValidator);
    }
});

// install_section.tt - validate the table prefix
$(document).ready(function() {
    var validCharacters = /[^a-zA-Z0-9]/;
    var validationContainer = $("#invalid-table-prefix-characters").closest(".validation-container");
    var submitButton = $("#btnSubmitInstall");

    function showHideWarning() {
        var inputVal = $(this).val();
        if ( validCharacters.test( inputVal ) ) {
            validationContainer.show();
            submitButton.prop("disabled", true);
        } else {
            validationContainer.hide();
            submitButton.prop("disabled", false);
        }
    }

    var input = $("#table_prefix");
    input.on("input", showHideWarning);
    showHideWarning.call( input );
});

// install_section.tt - show/hide the advanced configuration options
$(document).ready(function() {
    "use strict";
    function setupInstallSection() {

        var showTitle = LOCALE.maketext("Show Advanced Configuration");
        var hideTitle = LOCALE.maketext("Hide Advanced Configuration");
        var $btnAdvanced = $("#btnAdvanced");
        var $hidOneClick = $("input[name=oneclick]"); // Updates the oneclick variable on all the forms: install, uninstall, upgrade
        var $divAdvanced = $("#advanced");
        var $divOneClick = $("#oneclick");

        $("#cpaddonsform_uninstall").on("submit", function() {
            $("#btnUninstall").attr("disabled", "disabled");
            return true;
        });

        $("#cpaddonsform_upgrade").on("submit", function() {
            $("#btnUpgrade").attr("disabled", "disabled");
            return true;
        });

        // Return early if there is no related content.
        if ( !$divAdvanced.length || !$divOneClick.length ) {
            return;
        }

        /**
         * Adjust the form and focuses the correct element. Called
         * once the advance form is expanded and almost ready to use.
         *
         * @name finalizeAdvanced
         */
        function finalizeAdvanced() {
            $divOneClick
                .find("[name=subdomain]")
                .attr("disabled", "disabled");
            $divAdvanced
                .find("[name=subdomain]")
                .removeAttr("disabled");

            var $first = $("#cpaddonsform_install input[type=text]:first");
            var offset = $first.offset();
            $first.focus();
            $("html", "body").animate({
                scrollTop: offset.top,
                scrollLeft: offset.left,
            });
        }

        /**
         * Adjusts the form and focuses the first element. Called
         * once the oneclick form is expanded and almost ready to
         * use.
         *
         * @name  finalizeOneClick
         */
        function finalizeOneClick() {
            $divAdvanced
                .find("[name=subdomain]")
                .attr("disabled", "disabled");
            $divOneClick
                .find("[name=subdomain]")
                .removeAttr("disabled");

            $("#btnSubmitInstall").focus();
        }

        var isOneClickReturn = PAGE && typeof (PAGE.oneclick) !== "undefined" ? PAGE.oneclick : true;

        // Prepare #oneclick for overlap
        $divOneClick.css({
            position: "absolute",
            width: "100%"
        });

        // Get the height of the two containers for later reference
        var oneClickHeight = $divOneClick.height();
        var advancedHeight = $divAdvanced.height();

        // Setup the initial conditions
        if (isOneClickReturn) {
            $hidOneClick.val(1);
            $btnAdvanced.text(showTitle);

            // Prepare #oneclick for overlap
            $divOneClick.css({
                opacity: 1,
                visibility: "visible"
            });

            // Prepare #advanced for overlap
            $divAdvanced.css({
                height: oneClickHeight,
                opacity: 0,
                visibility: "hidden"
            });
            finalizeOneClick();

        } else {
            $hidOneClick.val(0);
            $btnAdvanced.text(hideTitle);

            /* If we got to this state (advanced) because of the lack of contact email, don't allow
            * the user to switch to the one-click installer, which will fail. */
            if (!PAGE.has_contactemail) {
                $btnAdvanced.hide();
            }

            // Prepare #oneclick for overlap
            $divOneClick.css({
                opacity: 0,
                visibility: "hidden"
            });

            // Prepare #advanced for overlap
            $divAdvanced.css({
                height: advancedHeight,
                opacity: 1,
                visibility: "visible"
            });

            finalizeAdvanced();
        }

        /**
         * Called to show the one click form.
         *
         * @name showOneClick
         * @param  {Function} callback Additional steps to get the UI ready.
         */
        function showOneClick(callback) {

            $divOneClick
                .css({
                    visibility: "visible",
                })
                .stop()
                .animate({
                    opacity: 1,
                }, {
                    queue: false,
                });

            $divAdvanced
                .stop()
                .animate({
                    height: oneClickHeight,
                    opacity: 0,
                }, {
                    queue: false,
                    done: function() {
                        $divAdvanced.css({
                            visibility: "hidden",
                        });

                        if (callback && typeof callback === "function") {
                            callback();
                        }
                    },
                });
        }

        /**
         * Called to show the advanced configuration form.
         *
         * @name showAdvanced
         * @param  {Function} callback Additional steps to get the UI ready.
         */
        function showAdvanced(callback) {

            $divOneClick
                .stop()
                .animate({
                    opacity: 0,
                }, {
                    queue: false,
                    done: function() {
                        $divOneClick.css({
                            visibility: "hidden",
                        });

                        if (callback && typeof callback === "function") {
                            callback();
                        }
                    },
                });

            $divAdvanced
                .css({
                    visibility: "visible",
                })
                .stop()
                .animate({
                    height: advancedHeight,
                    opacity: 1,
                }, {
                    queue: false,
                });
        }

        /**
         * Toggle the advanced configuration editor
         * visibility.
         *
         * @name toggleAdvancedConfiguration
         * @param  {Event} e
         */
        var toggleAdvancedConfiguration = function(e) {
            var showingOneClick = $hidOneClick.val() === "1" ? true : false; // jshint ignore:line
            if (showingOneClick) {
                $hidOneClick.val(0);
                $btnAdvanced.text(hideTitle);

                showAdvanced(finalizeAdvanced);

            } else {
                $hidOneClick.val(1);
                $btnAdvanced.text(showTitle);

                showOneClick(finalizeOneClick);
            }
        };

        $btnAdvanced.click(toggleAdvancedConfiguration);
    }

    // Workaround for Bootstrap using “display: none” instead of ”visibility: hidden” for tab-pane
    // This waits until the install tab is actually displayed before initializing it
    var $install = $("#install");

    if ( $install[0] ) {
        if ( !$install.hasClass("active") ) {

            var observer = new MutationObserver(function(mutations) {
                if ( $install.hasClass("active") ) {
                    setupInstallSection();
                    observer.disconnect();
                }
            });

            observer.observe($install[0], { attributes: true, attributeFilter: ["class"] });
        } else {
            setupInstallSection();
        }
    }

});

// action_upgrade.tt
$(document).ready(function() {
    $("#txtForce").bind("input propertychange", function() {
        var val = $("#txtForce").val();
        if (!val || val !== window.force_text) { // passed in template
            $("#btnForce").attr("disabled", "disabled");
        } else {
            $("#btnForce").removeAttr("disabled");
        }
    });

    $("#cpaddonsupform").submit(function() {
        $("#spinner-install").show();
        $("#btnForce").attr("disabled", "disabled");
    });
});

// verify_uninstall.tt
$(document).ready(function() {
    var clicked = false;
    $("#btnConfirmUninstall").click(function() {
        if (!clicked) {
            clicked = true;
            $(this).attr("disabled", "disabled");
            $("#spinner-uninstall").show();
            return true;
        }
        return false;
    });
});

// verify_upgrade.tt
$(document).ready(function() {
    var clicked = false;
    $("#btnConfirmUpgrade").click(function() {
        if (!clicked) {
            clicked = true;
            $(this).attr("disabled", "disabled");
            $("#spinner-upgrade").show();
            return true;
        }
        return false;
    });
});

// moderation_request_form.tt
$(document).ready(function() {
    $("#btnSubmitModerationRequest").click(function() {
        $("#spinner-submit").show();
    });

    // Focus and move the cursor to the end of the text.
    var text = $("#txtModerationRequest").val();
    $("#txtModerationRequest").focus().val("").val(text);
});

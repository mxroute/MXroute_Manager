/* eslint-disable camelcase */
/* global LEXICON: false, CONF: false */
var Rows_Data;
var Ancestry = {};
var Path_Data = {}; // index by path of Rows_Data
var TABLE_TEMPLATE = ""; // filled at DOMReady

var Expanding = {};
var Expanded_Rows = {};

var EXPANDER_IMG_TEMPLATE = document.getElementById("expander_img_template").text.trim();
var NONEXPANDER_IMG_TEMPLATE = document.getElementById("nonexpander_img_template").text.trim();
var DIRS_TABLE_ROW_TEMPLATE = document.getElementById("dirs_table_row_template").text.trim();
var DIRS_OTHER_OWNER_TABLE_ROW_TEMPLATE = document.getElementById("dirs_other_owner_table_row_template").text.trim();
var DIRS_UNTRAVERSIBLE_TABLE_ROW_TEMPLATE = document.getElementById("dirs_untraversible_table_row_template").text.trim();

var Utility_Fragment = document.createDocumentFragment();

// returns [path,html]

function build_row_html(dir_data, parent_str, show_deep) {
    var dir_name = dir_data.name;

    dir_data.contained_usage = parseInt(dir_data.contained_usage) || 0;

    var path = parent_str ? parent_str + "/" + dir_name : dir_name;

    var depth_match = path.match(/\//g);
    var depth = depth_match ? depth_match.length : 0;
    var path_html = path.html_encode();
    var has_descendents = !!dir_data.contents && dir_data.contents !== "0"; // JSON::Syck bug

    var indentation_html = "";
    for (var i = 0; i < depth; i++) {
        indentation_html += SPACER;
    }

    var expander_html;
    if (has_descendents) {
        expander_html = YAHOO.lang.substitute(EXPANDER_IMG_TEMPLATE, {
            path: path_html
        });
    } else {
        expander_html = NONEXPANDER_IMG_TEMPLATE;
    }

    var row_html;
    if (dir_data.traversible) {
        var child_usage = parseInt(dir_data.contained_usage) || 0;
        var child_usage_mib = (child_usage / 1048576).toFixed(2);
        var cur_template = (dir_data.owner === USER) ? DIRS_TABLE_ROW_TEMPLATE : DIRS_OTHER_OWNER_TABLE_ROW_TEMPLATE;

        row_html = YAHOO.lang.substitute(cur_template, {
            "dir_name": dir_name.html_encode(),
            "path": path_html,
            "path_uri": encodeURIComponent(path).html_encode(),
            "expander_html": expander_html,
            "indentation_html": indentation_html,
            "formatted_bytes": child_usage_mib,
            "raw_bytes": child_usage,
            "owner": dir_data.owner.html_encode()
        });
    } else {
        row_html = YAHOO.lang.substitute(DIRS_UNTRAVERSIBLE_TABLE_ROW_TEMPLATE, {
            "dir_name": dir_name.html_encode(),
            "path": path_html,
            "path_uri": encodeURIComponent(path).html_encode(),
            "expander_html": expander_html,
            "indentation_html": indentation_html,
            "owner": dir_data.owner.html_encode()
        });
    }

    if (depth && !show_deep) {
        row_html = row_html.replace(/<tr\s/i, "<tr style=\"display:none\" ");
    }
    Path_Data[path] = dir_data;
    return [path, row_html];
}

// returns [path,html] pairs

function build_dom_rows_html(data_rows, parent_dir, xform_sorter, show_deep) {
    data_rows.sort_by(xform_sorter);

    var prefix = (parent_dir === "") ? "" : parent_dir + "/";

    if (!(parent_dir in Ancestry)) {
        var new_ancestry = [];
        for (var d = 0; d < data_rows.length; d++) {
            new_ancestry.push(prefix + data_rows[d].name);
        }
        Ancestry[parent_dir] = new_ancestry;
    }

    var rows_html = [];
    for (var d = 0; d < data_rows.length; d++) {
        var cur_data = data_rows[d];
        if (cur_data.name !== ".") {
            rows_html.push(build_row_html(cur_data, parent_dir, show_deep));
            if (("contents" in cur_data) && (cur_data.contents instanceof Array)) {
                rows_html.push.apply(rows_html, build_dom_rows_html(cur_data.contents, prefix + cur_data.name, xform_sorter, show_deep));
            }
        }
    }
    return rows_html;
}

function build_dom_rows() {
    var rows_html_pairs = build_dom_rows_html.apply(this, arguments);
    var rows_length = rows_html_pairs.length;
    var paths = [];
    var rows_html = [];
    for (var r = 0; r < rows_length; r++) {
        var cur_pair = rows_html_pairs[r];
        paths.push(cur_pair.shift());
        rows_html.push(cur_pair.shift());
    }

    rows_html = rows_html.join("");
    var table_html = "<table>" + rows_html + "</table>";
    var utility_container = build_dom_rows.utility_container;
    utility_container.innerHTML = table_html;

    var _rows = utility_container.firstChild.rows;
    var rows = [];
    for (var r = 0; r < rows_length; r++) {
        var cur_row = _rows[r];
        Path_Data[paths[r]].dom_object = cur_row;
        rows[r] = cur_row;
    }

    return rows;
}

build_dom_rows.utility_container = document.createElement("div");


function du_callback(api_return) {

    var home_counted_usage = api_return[0].homedir;
    var other_subs_usage = 0;
    var total_homedir_usage = parseInt(home_counted_usage.contained_usage) || 0;
    var total_user_homedir_usage = parseInt(home_counted_usage.user_contained_usage) || 0;
    var quotaused = parseInt(api_return[0].quotaused) || 0;
    var file_usage_outside_homedir = quotaused && (quotaused - total_user_homedir_usage);
    var home_usage = total_homedir_usage; // we will subtract directory usage
    var graph_data = {};

    var contents = home_counted_usage.contents;
    var contents_length = contents.length;
    for (var c = 0; c < contents_length; c++) {
        var cur_node = contents[c];
        var cur_name = cur_node.name;
        var cur_contained_usage = parseInt(cur_node.contained_usage) || 0;

        if (cur_name in GRAPH_DIRS) {
            graph_data[cur_name] = cur_contained_usage;
        } else {
            other_subs_usage += (cur_contained_usage || 0);
        }

        home_usage -= (cur_contained_usage || 0);
    }

    var graph_labels = [" " + LANG.no_subdir];
    var graph_numbers = [home_usage];
    var graph_dirs_sorted = CPANEL.util.keys(GRAPH_DIRS).sort();
    var graph_dirs_length = graph_dirs_sorted.length;
    for (var d = 0; d < graph_dirs_length; d++) {
        var cur_dir = graph_dirs_sorted[d];
        if (cur_dir in graph_data) {
            graph_labels.push("/" + cur_dir);
            graph_numbers.push(graph_data[cur_dir]);
        }
    }
    graph_labels.push("/" + LANG.other_subs);
    graph_numbers.push(other_subs_usage);

    // piggyback these onto the others
    // track non-home labels so we can easily remove home directory <img> elements later
    var non_home_labels = ['<a title="' + LANG.see_mysql + '" href="../sql/index.html">MySQL</a>'];
    graph_numbers.push(parseInt(api_return[0].mysql) || 0);
    if (has_postgres) {
        non_home_labels.push('<a title="' + LANG.see_pgsql + '" href="../psql/index.html">PostgreSQL</a>');
        graph_numbers.push(parseInt(api_return[0].pgsql) || 0);
    }
    if (quotaused) {

        // this happens from time to time; the difference is always small
        if (file_usage_outside_homedir < 0) {
            if (("console" in window) && console.log) {
                console.log("Reported quota usage (" + quotaused + ") is less than counted user-owned home directory usage (" + total_user_homedir_usage + "). Setting “Other” graph figure to zero.");
            }
            graph_numbers.push(0);
        } else {
            graph_numbers.push(file_usage_outside_homedir);
        }
        non_home_labels.push(LANG.other);
    }
    graph_labels.push.apply(graph_labels, non_home_labels);


    var total_db_usage = (parseInt(api_return[0].mysql) || 0) + (has_postgres ? (parseInt(api_return[0].pgsql) || 0) : 0);
    var total_bytes = total_homedir_usage + total_db_usage;
    if (file_usage_outside_homedir > 0) {
        total_bytes += file_usage_outside_homedir;
    }
    var total_usage_mib = (total_bytes / 1048576).toFixed(2);

    var true_number = function(x) {
        return parseInt(x) || 0;
    };

    function mib(to_convert) {
        return YAHOO.util.Number.format((to_convert / 1048576), {
            thousandsSeparator: ",",
            decimalPlaces: 2
        });
    }

    var build = "";

    var known_template = DOM.get("table-row-template").text.trim();
    var known_template_with_note = DOM.get("table-row-template-with-note").text.trim();
    var unknown_template = DOM.get("table-row-unknown-template").text.trim();

    var build_divs = function(name_html, url, usage, note) {
        if (name.charAt(0) === ".") {
            return;
        }

        var target_url;
        if (url) {
            target_url = (url.charAt(0) === "/") ? CPANEL.security_token + url : CPANEL.security_token + "/frontend/" + window.thisTheme + "/filemanager/index.html?dirselect=homedir&dir=/" + encodeURIComponent(url);
            target_url = '<a href="' + target_url.html_encode() + '" target="_blank">' + name_html + "</a>";
        }

        var set_width = true_number((usage / max_usage) * 100);
        if (set_width && set_width < 3) {
            set_width = 3;
        }

        var template = (usage === null) ? unknown_template : (note ? known_template_with_note : known_template);

        build += YAHOO.lang.substitute(template, {
            "url": target_url || name_html,
            "width": set_width,
            "usage": mib(usage),
            "note": note
        });
    };


    var quotalimit = true_number(api_return[0].quotalimit);

    var contents = api_return[0].homedir.contents;
    var contents_length = contents.length;
    var mysql_usage = true_number(api_return[0].mysql);
    var pgsql_usage = true_number(api_return[0].pgsql);
    var mailman_usage = true_number(api_return[0].mailman);
    var mailarchives_usage = true_number(api_return[0].mailarchives);
    var mailaccounts_usage = true_number(api_return[0].mailaccounts);
    var quota_used = true_number(api_return[0].quotaused);
    var quota_limit = true_number(api_return[0].quotalimit);
    home_usage = true_number(api_return[0].homedir.contained_usage);
    var sub_dir_usage = 0;
    var hidden_sub_dir_usage = 0;
    var max_usage = Math.max(mysql_usage, pgsql_usage, mailman_usage);

    for (var i = 0; i < contents_length; i++) {
        var content = contents[i];
        var cur_usage = content.contained_usage;

        if (cur_usage !== null) {
            cur_usage = true_number(cur_usage);

            if (content.name.charAt(0) === ".") {
                hidden_sub_dir_usage += cur_usage;
            } else {
                sub_dir_usage += cur_usage;
                if (cur_usage > max_usage) {
                    max_usage = cur_usage;
                }
            }
        }
    }

    var home_outside_sub_usage = home_usage - sub_dir_usage - hidden_sub_dir_usage;
    if (home_outside_sub_usage > max_usage) {
        max_usage = home_outside_sub_usage;
    }

    if (hidden_sub_dir_usage > max_usage) {
        max_usage = hidden_sub_dir_usage;
    }

    // Start building the UI

    // Space consumed in the home directory outside folders
    build_divs(LEXICON.not_in_subdir, null, home_outside_sub_usage);

    // Space consumed in hidden sub directories
    build_divs(LEXICON.hidden_subdirs, null, hidden_sub_dir_usage);

    var isArchivingEnabled =
        CONF["system_has_email_archive"] === "1" &&
        CONF["user_has_email_archive"] === "1";

    for (var i = 0, l = contents_length; i < l; i++) { // eslint-disable-line no-redeclare
        var content = contents[i]; // eslint-disable-line no-redeclare
        if (content.name.charAt(0) !== ".") {
            if (content.name === "mail") {
                continue;
            } else {

                // Space consumed in other folders in the home area
                build_divs(content.name.html_encode() + "/", content.name, content.contained_usage);
            }
        }
    }

    // Space consumed by mysql, outside the home folder.
    build_divs("MySQL", "/frontend/" + window.thisTheme + "/sql/index.html", mysql_usage);
    if (has_postgres) {
        build_divs("PostgreSQL", "/frontend/" + window.thisTheme + "/psql/index.html", pgsql_usage);
    }

    // Space consumed by mailman (mailing lists), outside the home folder.
    // Don't show the mailman row if skipmailman in cpanel.config and if actual usage is zero
    if (!parseInt(api_return[0].skipmailman) || mailman_usage > 0) {
        build_divs(LEXICON.mailing_lists, "/frontend/" + window.thisTheme + "/mail/lists.html", mailman_usage);
    }

    // Space consumed by email archiving.
    // If enabled, activate the link.
    if (isArchivingEnabled) {
        build_divs(LEXICON.mailarchives, "/frontend/" + window.thisTheme + "/mail/archive.html", mailarchives_usage, LEXICON.mail_note);
    } else { // Othwise if there is data, show the row, but deactivate the link.
        if (mailarchives_usage > 0) {
            build_divs(LEXICON.mailarchives, null, mailarchives_usage, LEXICON.mail_note);
        }
    }

    var mailaccounts_html = LEXICON.mailaccounts;
    if (mailaccounts_usage > 0) {
        mailaccounts_html += '<span class="footnote">&dagger;</span>';
    }
    build_divs(mailaccounts_html, "/frontend/" + window.thisTheme + "/mail/pops/index.html", mailaccounts_usage, LEXICON.mail_note);

    // Space consumed on the quota, but not shown above.
    var other_usage = 0;
    if (quota_used) {
        other_usage = quota_used - true_number(api_return[0].homedir.user_contained_usage) - mailman_usage - mysql_usage - pgsql_usage;
        if (other_usage > 0) {
            build_divs(LEXICON.other_usage + '<span class="footnote">&Dagger;</span>', null, other_usage);
        } else {
            other_usage = 0;
        }
        if (quota_limit > 0) {
            if (quota_used >= quota_limit) {
                new CPANEL.widgets.Page_Notice({
                    content: LEXICON.over_quota,
                    level: "error"
                });
            } else if ((quota_used / quota_limit) > 0.9) {
                new CPANEL.widgets.Page_Notice({
                    content: LEXICON.warn_quota,
                    level: "warn"
                });
            }
        }
    }

    // Calculate and display the total
    var total_usage = home_usage + mysql_usage + pgsql_usage + mailman_usage + other_usage; // mail archives are contained in the HOMEDIR/mail so we do not add them here

    var total_html = DOM.get("total_disk_usage_template").text.trim();
    total_html = YAHOO.lang.substitute(total_html, {
        mib: mib(total_usage)
    });
    build += total_html;

    if (quotalimit > 0) {
        var quota_html = DOM.get("quota_usage_template").text.trim();
        quota_html = YAHOO.lang.substitute(quota_html, {
            limit: mib(quota_limit),
            used: mib(quota_used)
        });
        build += quota_html;
    }

    if (mailaccounts_usage > 0) {
        build += '<div class="other-usage-blurb"><span class="footnote">&dagger;</span>' + window.LANG.mailaccounts_usage_blurb + "</div>";
    }

    if (other_usage > 0) {
        build += '<div class="other-usage-blurb"><span class="footnote">&Dagger;</span>' + window.LANG.other_usage_blurb + "</div>";
    }

    document.getElementById("loading").innerHTML = "";
    document.getElementById("usage-table-body").innerHTML = build;


    // build home directory table
    var rows = build_dom_rows(home_counted_usage.contents, "", "name");
    var home_total_mib = (home_counted_usage.contained_usage / 1048576).toFixed(2);
    document.getElementById("table_container").innerHTML = TABLE_TEMPLATE;

    var container = document.createElement("div");
    var home_row_html = YAHOO.lang.substitute(DIRS_TABLE_ROW_TEMPLATE, {
        "dir_name": "<span class=\"" + HOME_GLYPH + "\">/</span>",
        "path": "/",
        "path_uri": "/",
        "expander_html": "",
        "indentation_html": "",
        "formatted_bytes": home_total_mib,
        "raw_bytes": home_counted_usage.contained_usage
    });
    container.innerHTML = "<table>" + home_row_html + "</table>";
    Utility_Fragment.appendChild(container.getElementsByTagName("tr")[0]);

    var rows_tbody = document.getElementById("directory_rows_tbody");
    var rows_count = rows.length;
    for (var r = 0; r < rows_count; r++) {
        Utility_Fragment.appendChild(rows[r]);
    }
    rows_tbody.appendChild(Utility_Fragment);

    DOM.get("sort_div").style.display = "";
    DOM.get("hidden_copy").style.display = "";

    Rows_Data = home_counted_usage.contents;
};


YAHOO.util.Event.onDOMReady(function() {
    TABLE_TEMPLATE = document.getElementById("dirs_table_template").text;
    cpanel_jsonapi2(du_callback, "DiskUsage", "fetchdiskusagewithextras");
});


var Sort_By_Name = true;

function flip_sort(by_name) {
    if (by_name && Sort_By_Name) {
        return false;
    }

    var order_to_use = by_name ? "name" : "!contained_usage";

    _sort_and_append_contents(Rows_Data, order_to_use, DOM.get("directory_rows_tbody"));

    Sort_By_Name = !Sort_By_Name;
};

function _sort_and_append_contents(data_nodes, order, dom_parent) {
    data_nodes.sort_by(order);

    for (var n = 0; n < data_nodes.length; n++) {
        var cur_node = data_nodes[n];

        if (!("dom_object" in cur_node)) {
            continue;
        }

        dom_parent.appendChild(cur_node.dom_object);

        if (("contents" in cur_node) && (cur_node.contents instanceof Array)) {
            _sort_and_append_contents(cur_node.contents, order, dom_parent);
        }
    }
}

function show_row(row_obj, final_callback) {
    var divs = row_obj.getElementsByTagName("div");
    var divs_count = divs.length;

    var animation_count = divs_count + 1; // the fader
    var finish_up;
    if (final_callback) {
        finish_up = function() {
            animation_count--;
            if (animation_count === 0) {
                final_callback.call(this);
            }
        };
    }

    var row_style = row_obj.style;

    for (var d = 0; d < divs_count; d++) {
        divs[d].style.display = "none";
    }
    row_style.display = "";
    for (var d = 0; d < divs_count; d++) {
        CPANEL.animate.slide_down(divs[d], finish_up);
    }
    row_style.opacity = 0;
    var fader = new YAHOO.util.Anim(row_obj, {
        opacity: {
            to: 1
        }
    }, 0.2);
    if (final_callback) {
        fader.onComplete.subscribe(finish_up);
    }
    fader.animate();
}

function hide_row(row_obj, final_callback) {
    var divs = row_obj.getElementsByTagName("div");
    var divs_count = divs.length;

    var animation_count = divs_count + 1; // the fader
    var hide_on_finish = function() {
        animation_count--;
        if (animation_count === 0) {
            row_obj.style.display = "none";
            if (final_callback) {
                final_callback.call(this);
            };
        }
    };

    for (var d = 0; d < divs_count; d++) {
        CPANEL.animate.slide_up(divs[d], hide_on_finish);
    }
    var fader = new YAHOO.util.Anim(row_obj, {
        opacity: {
            to: 0
        }
    }, 0.2);
    fader.onComplete.subscribe(hide_on_finish);
    fader.animate();
}

// arguments[1]: to_show
var toggle_children = function(parent_dir, to_show) {
    if (parent_dir in Expanding) {
        return;
    }

    var glyph = document.getElementById(parent_dir + "-icon");
    var spinner = document.getElementById(parent_dir + "-spin");

    var already_shown = (parent_dir in Expanded_Rows);
    if (to_show === undefined) {
        to_show = !already_shown;
    } else if (to_show === already_shown) {
        return;
    }

    if (to_show) {
        Expanded_Rows[parent_dir] = true;
    } else {
        delete Expanded_Rows[parent_dir];
    }

    var children = Ancestry[parent_dir];

    Expanding[parent_dir] = true;

    // if this data is already in memory...
    if (children) {
        var children_count = children.length;

        var rows_to_slide = children_count;

        for (var d = 0; d < children_count; d++) {
            var child_dir = children[d];
            var child_row = document.getElementById(child_dir + "-row");
            if (to_show) {
                show_row(child_row, function() {
                    rows_to_slide--;
                    if (rows_to_slide === 0) {
                        glyph.className = MINUS_GLYPH;
                        glyph.title = LANG.hide_children;
                        delete Expanding[parent_dir];
                    }
                });
            } else {
                hide_row(child_row, function() {
                    rows_to_slide--;
                    if (rows_to_slide === 0) {
                        glyph.className = PLUS_GLYPH;
                        glyph.title = LANG.see_children;
                        delete Expanding[parent_dir];
                    }
                });
                if ((child_dir in Ancestry) && Ancestry[child_dir].length > 0) {
                    toggle_children(child_dir, to_show);
                }
            }
        }
    } else { // if we have to load this from the server...
        glyph.hidden = true;
        spinner.hidden = false;

        var callback = function(api_data) {
            var contents = api_data[0].contents;
            var new_rows = build_dom_rows(contents, parent_dir, sort_order, false);
            var new_rows_length = new_rows.length;
            var animation_count = new_rows_length;

            for (var r = 0; r < new_rows_length; r++) {
                Utility_Fragment.appendChild(new_rows[r]);
            }
            tbody.insertBefore(Utility_Fragment, next_row);

            for (var r = 0; r < new_rows_length; r++) {
                var new_row = new_rows[r];
                show_row(new_row, function() {
                    animation_count--;
                    if (animation_count === 0) {
                        spinner.hidden = true;
                        glyph.className = MINUS_GLYPH;
                        glyph.title = LANG.hide_children;
                        glyph.hidden = false;
                        delete Expanding[parent_dir];
                    }
                });
            }

            Path_Data[parent_dir].contents = contents;
        };
        cpanel_jsonapi2(callback, "DiskUsage", "fetchdiskusage", "path", parent_dir);

        var sort_order = Sort_By_Name ? "name" : "!contained_usage";
        var parent_row = document.getElementById(parent_dir + "-row");
        var tbody = parent_row.parentNode;
        var next_row = parent_row.nextSibling;
    }
};

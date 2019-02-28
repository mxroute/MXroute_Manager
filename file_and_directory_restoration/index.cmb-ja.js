//~~GENERATED~~
//-------------------------------------------------------------
// Source:    /usr/local/cpanel/base/frontend/paper_lantern/file_and_directory_restoration/index.cmb.js
// Generated: /usr/local/cpanel/base/frontend/paper_lantern/file_and_directory_restoration/index.cmb-ja.js
// Module:    /paper_lantern/file_and_directory_restoration/index.cmb-ja
// Locale:    ja
// This file is generated by the cpanel localization system
// using the bin/_build_translated_js_hash_files.pl script.
//-------------------------------------------------------------
// !!! Do not hand edit this file !!!
//-------------------------------------------------------------
(function() {
    // The raw lexicon.
    var newLex = {"Compressed":"圧縮済み","Directory":"ディレクトリ","Enter the exact path to the file or directory that you wish to restore.":"Enter the exact path to the file or directory that you wish to restore.","File":"ファイル","Incremental":"増分","Symlink":"Symlink","The system successfully restored the “[_1]” backup file from the date “[_2]”.":"The system successfully restored the “[_1]” backup file from the date “[_2]”.","Uncompressed":"非圧縮","When you restore a backup, the system will overwrite existing files and restore deleted files.":"When you restore a backup, the system will overwrite existing files and restore deleted files."};

    if (!this.LEXICON) {
        this.LEXICON = {};
    }

    for(var item in newLex) {
        if(newLex.hasOwnProperty(item)) {
            var value = newLex[item];
            if (typeof(value) === "string" && value !== "") {
                // Only add it if there is a value.
                this.LEXICON[item] = value;
            }
        }
    }
})();
//~~END-GENERATED~~

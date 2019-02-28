/*
* base/frontend/paper_lantern/jetbackup/index.cmb-en.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

(function() {
	var newLex = {
		"Creation Date":"Creation Date",
		"Actions":"Actions",
		"No Backups Found":"No Backups Found",
		"Sort by [_1].":"Sort by [_1].",
		"Size":"Size",
		"Location":"Location",
		"Generate Download":"Generate Download",
		"Delete Download":"Delete Download",
		"Download":"Download",
		"Restore":"Restore",
		"Cancel":"Cancel",
		"Loading Backups":"Loading Backups",
		"Download in Progress":"Download in Progress",
		"Restore in Progress":"Restore in Progress",
		"Are you sure you want to restore from this backup?":"Are you sure you want to restore from this backup?",
		"Are you sure you want to delete this download?":"Are you sure you want to delete this download?",
		"Are you sure you want to download this backup?":"Are you sure you want to download this backup?",
		"Restore account from backup “[_1]”": "Restore account from backup “[_1]”",
		"Download backup “[_1]”":"Download backup “[_1]”",
		"Delete Download “[_1]”":"Delete Download “[_1]”",
		"Note that we are saving only the last “[_1]” downloads in our server. older downloads will be deleted. are you sure you want to download this backup?": "Note that we are saving only the last “[_1]” downloads in our server. older downloads will be deleted. are you sure you want to download this backup?",
		"Displaying [_1] to [_2] out of [_3] records":"Displaying [_1] to [_2] out of [_3] records",
		"Type":"Type"
	};

	if (!this.LEXICON) this.LEXICON = {};

	for(var item in newLex) {
		if(newLex.hasOwnProperty(item)) {
			var value = newLex[item];
			if (typeof(value) === "string" && value !== "") {
				this.LEXICON[item] = value;
			}
		}
	}
})();


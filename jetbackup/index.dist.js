/*
* base/frontend/paper_lantern/jetbackup/index.dist.js
*
* JetBackup @ package
* Created By Idan Ben-Ezra
*
* Copyrights @ JetApps
* https://www.jetapps.com
*
**/

/* global require: false */


require(
	[
		"frameworksBuild",
		"locale!cjtBuild",
		"locale!app/index.cmb"
	],
	function(){
		require(
			[
				"master/master",
				"app/index"
			],
			function(MASTER, APP){
				MASTER();
				APP();
			}
		);
	}
);


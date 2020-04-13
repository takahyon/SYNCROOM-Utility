$(function(){
	chrome.storage.sync.get(['ndb'], function (result) {
	    switch (result.ndb){
	        case true:
	            enable();
	            break;
	        case false:
	            disable();
	            break;
	        case undefined:
	            //enable();
	            break;
	    }
	});
	//   オープンソースでアップしまーす!
	function enable(){
		remove_locked();
	}
	function disable() {
		console.log("test")
		
	}
});

function remove_locked() {
	//DOM生成関数を上書き
	$("body").append($("<script>").text(jsonCheckFunc));
}



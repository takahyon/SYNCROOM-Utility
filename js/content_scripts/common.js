
var jsonCheckFunc = `function drawRooms(idx,start,hidechkfunc,userdata){
    var i;
    if (idx < 0 || idx > 1)
        return;

    for (i = start; i < nowRoom[idx]; i++) {
		var _tit;
		var _pnum;
		var _users;
		var _icon;
		var _txt;
		var _link;
		var _rid;
		var _pw;
		var _txtstyle = "fBlack";

		_tit = roomJson[idx][i].room_name;
		_pnum = roomJson[idx][i].num_members;
		_users = roomJson[idx][i].members.join(' / ');
		if (roomJson[idx][i].room_desc) {
			_icon =  '/common/img/roombox_icon_dummy.gif';
			_txt = roomJson[idx][i].room_desc;
		}else{
			_icon = '/common/img/roombox_icon_dummy.gif';
			_txt = 'ルームの説明がありません。';
			_txtstyle = "fGray";
		}
		_rid = roomJson[idx][i].index;
		_pw = roomJson[idx][i].need_passwd;
		
		var _bname = 'room_btn_off';
		var _url;
		var _oc,_oct ="";
		if(_pw){
			continue;
			_bname = 'room_btn_lock_off';
			_url = 'javascript:void(0)';
			_oc = 'onClick="checkPW(roomJson['+idx+'][' + i + '],' + realms[idx] +', 2);"';
			_oct = 'onClick="checkPW(roomJson['+idx+'][' + i + '],' + realms[idx] +', 3);"';
        }else{
			_url = 'javascript:void(0)';
			_oc = 'onClick="openND(roomJson[' + idx + '][' + i + '],' + realms[idx] +', 2);"';
			_oct = 'onClick="openND(roomJson['+idx+'][' + i + '],' + realms[idx] +', 3);"';
        }
		if(_pnum >= maxmembers[idx]) {
			continue;
			_bname = 'room_btn_kill';
			_oc = '';
		}
		if(_tit === testRoomTitle)  {
			if(hidechkfunc(userdata)) {
				$('#moreroom').hide();
				$('#containerRoom .noroom').hide();
			}
			if(nowRoom[idx] < roomNum[idx]) nowRoom[idx]++;
			testRoomFound[idx] = true;
			continue;
		}

		var tagelem = '<div class="tagarea">';
		var tags = getTagInfo(roomJson[idx][i]);
		var j;
		for (j = 0; j < tags.length; j++) {
            tagelem += '<div class="roomtag">'+escHTML(tags[j])+'</div>';
		}
		tagelem += '</div>';

		var trialelem = "";
		if (idx == 0) {
		    trialelem = '<div class="trialarea"><button class="trialbtn" type="button"' + _oct + '>仮入室</button></div>';

		}

		var listObj = 
		'<li class="roomItem">'+
		'<div class="detailsBox">'+
		'<p class="tit">' + escHTML(_tit) + '</p>'+
		'<div class="txtBox">'+
		'<p class="txt ' + _txtstyle /* escHTML対象外 */ + '">' + escHTML(_txt) + '</p>' + tagelem + trialelem +
		'</div>' + 
		'<p class="people">現在 ' + parseInt(_pnum,10) + '名</p>'+
		'<p class="user"><span>参加者：</span>' + escHTML(_users) + '</p>'+
		'</div>'+
		'<p class="btn"><a href="' + escHTML(_url) + '" ' + _oc /* escHTML対象外 */
			+ '><img src="img/' + escHTML(_bname) + '.jpg" alt="ルームに入る" width="194" height="60"></a></p>'+
		'</li>';
		
		$('#containerRoom ul').append(listObj);
	}
	show_all();
}
function show_all(){
	//消えるまでクリック
	while($('#moreroom').css("display") != "none"){
		$('#moreroom').click();
	}
}
`;
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



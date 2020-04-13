window.onload = function(){
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

    function enable(){
        show_all();
        remove_locked();
        ObserveStream();
     }
     function disable() {
         console.log("test")
     }
}
function show_all(){
    for (  var i = 0;  i < 10;  i++  ) {
        document.getElementById("moreroom").click();
       }
}

function remove_locked() {
    const base_url = "https://www.netduetto.net/room/img/"

    const room_kill = base_url + "room_btn_kill.jpg"
    const lock_room_on = base_url + "room_btn_lock_on.jpg"
    const lock_room_off = base_url + "room_btn_lock_off.jpg"
    
    var rawRoomItem = $(".roomItem")
    var roomItem = Array.from(rawRoomItem)
    
    roomItem.forEach(room => {
        var img_src = room.getElementsByClassName("btn")[0].getElementsByTagName("a")[0].getElementsByTagName("img")[0].src;
        this.console.log(img_src)
        if(img_src == room_kill||img_src == lock_room_on||img_src == lock_room_off){
            room.remove()
            this.console.log('removed:'+room.innerText)
        }
    });
}

function ObserveStream(){
    var observer = new MutationObserver(remove_locked);
    observer.observe(document.getElementsByClassName('roomBox')[0], {
        attributes: true,
        childList:  true
    });
    remove_locked();
} 
var observer = new MutationObserver(ObserveStream);
observer.observe(document.body, {
    attributes: true
});



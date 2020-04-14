//////////////////////////////////////////////////////////////////////////////////
// Constants
const PEOPLE_MAX = 5;
const EID_CHECKBOX_LOCKEDROOM = 'cbLockedRoom'
const EID_CHECKBOX_NO_VACANCY_ROOM = 'cbNoVacancyRoom'

//////////////////////////////////////////////////////////////////////////////////
// Convenience Functions
/**
 * ローカルストレージに値を保存する
 * @param {string} key 
 * @param {*} value 
 * @param {Function} func 
 */
function setLocalStorageObject(key, value, func) {
    let objToSet = {};
    objToSet[key] = value;
    chrome.storage.sync.set(objToSet, function(){
        console.log(`Set an object to the local storage: { ${key} : ${value} }`);
        func();
    });
}

/**
 * チェックボックスの状態が変更されたときのイベント
 */
function onChangedCheckboxStatus() {
    // Local Storage を更新してページをリロード
    const key = $(this).attr('id');
    const value = $(this).prop("checked");
    setLocalStorageObject(key, value, function () {
        chrome.tabs.getSelected(null, function (tab) {
            const code = 'window.location.reload();';
            chrome.tabs.executeScript(tab.id, { code: code });
        });
    });
}

/**
 * DOM を編集して部屋のリストを絞り込む
 * @param {Object} conditions
 */ 
let isFirstTime = true;
function filterRoomBox(conditions) {
    if (!$('#moreroom').length) { return; }
    let intervalId = setInterval(function () {

        // あらかじめすべての部屋分の DOM を生成しておく
        // 消えるまでクリック (1 [msec] 置き)
        if ($('#moreroom').css("display") != "none") {
            $('#moreroom').click();
            return;
        }

        clearInterval(intervalId);

        // Counter for debug
        let lockedRoomCount = 0;
        let noVacancyRoomCount = 0;

        $('.roomItem').each(function (index, element) {

            // lockedRoom - 鍵付き部屋をフィルター
            if (conditions[EID_CHECKBOX_LOCKEDROOM]) {
                const imgPath = $(element).find('img').prop('src');
                if (imgPath.match(/_lock/)) {
                    $(element).css('display', 'none');
                    lockedRoomCount++;
                    // return; カウント用にあえてリターンしない
                }
            }

            // noVacancyRoom - 満員部屋をフィルター
            if (conditions[EID_CHECKBOX_NO_VACANCY_ROOM]) {
                const peopleStr = $(element).find('p.people').text();
                const peopleNum = parseInt(peopleStr.replace(/[^0-9]/g, ''));
                if (peopleNum === PEOPLE_MAX) {
                    $(element).css('display', 'none');
                    noVacancyRoomCount++;
                    // return; カウント用にあえてリターンしない
                }
            }
        });

        if (isFirstTime) {
            console.log('RoomBox was filtered:');
            console.log('Locked Room: ' + !!conditions[EID_CHECKBOX_LOCKEDROOM] + ` (${lockedRoomCount} rooms)`);
            console.log('No Vacancy Room: ' + !!conditions[EID_CHECKBOX_NO_VACANCY_ROOM] + ` (${noVacancyRoomCount} rooms)`);
            isFirstTime = false;
        }

    }, 1);
}

//////////////////////////////////////////////////////////////////////////////////
// Initializer
$(function () {

    // 初期化対象チェックボックスの Element ID
    const targetElemIds = [
        EID_CHECKBOX_LOCKEDROOM,
        EID_CHECKBOX_NO_VACANCY_ROOM
    ];

    // 対応するフィルター条件
    let filterConditions = {};

    // Local Storage から直近の値を取得して View を更新
    chrome.storage.sync.get(targetElemIds, function (result) {
        console.log('Current local storage object is below:');
        console.log(result);

        targetElemIds.forEach(elemId => {

            // 対象の条件を false で初期化
            filterConditions[elemId] = false;

            // 直近の値が未設定なら初期値として true をセット
            let localStorageVal = result[elemId];
            if (localStorageVal === undefined) {
                localStorageVal = true;
                setLocalStorageObject(elemId, true);
            }

            // チェックボックスの見た目を Local Storage の値に合わせる
            $(`#${elemId}`).prop('checked', localStorageVal);

            // チェックボックスの状態が変わったときのイベントをバインド
            $(`#${elemId}`).change(onChangedCheckboxStatus);

            // フィルターすべき条件を整理する
            filterConditions[elemId] = localStorageVal;
        });

        // 実際に指定された条件で部屋のリストをフィルターする
        filterRoomBox(filterConditions);

        // 非同期更新用に 200 [sec] 毎にフィルターをかけなおすようにしておく
        setInterval(function () {
            targetElemIds.forEach(elemId => {
                filterRoomBox(filterConditions);
            });
        }, 200);
    });
});
//////////////////////////////////////////////////////////////////////////////////
// Constants and Global Variables
const PEOPLE_MAX = 5;
const EID_CHECKBOX_LOCKEDROOM = 'cbLockedRoom'
const EID_CHECKBOX_NO_VACANCY_ROOM = 'cbNoVacancyRoom'
const EID_TEXT_REGISTER = 'textRegister'
const EID_BUTTON_REGISTER = 'btnRegister'
const EID_LIST_TAG = 'listTag'
var LocalStorageCache = null;

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
    chrome.storage.sync.set(objToSet, function () {
        console.log(`Set an object to the local storage: { ${key} : ${value} }`);
        func();
    });
}

/**
 * ページをリロードする
 */
function reloadPage() {
    chrome.tabs.getSelected(null, function (tab) {
        const code = 'window.location.reload();';
        chrome.tabs.executeScript(tab.id, { code: code });
    });
}

/**
 * タグをリストに追加 (見た目だけ)
 * @param {String} tag 
 */
function addTagToList(tag) {
    $(`#${EID_LIST_TAG}`).append(`<li data-tag="${tag}" onclick>${tag}</ul>`);
}

/**
 * チェックボックスの状態が変更されたときのイベント
 */
function onChangedCheckboxStatus() {
    // Local Storage を更新してページをリロード
    const key = $(this).attr('id');
    const value = $(this).prop("checked");
    setLocalStorageObject(key, value, reloadPage);
}

/**
 * タグ登録ボタンがクリックされたときのイベント
 */
function onClickTagRegisterButton() {
    const inputElem = $(`#${EID_TEXT_REGISTER}`);
    const tag = inputElem.val();
    if (!tag) { return; }

    // テキストフィールドの中を空にする
    inputElem.val('');

    // ul 要素を追加（タグリスト）
    addTagToList(tag);

    // Local Storage にタグを保存
    let tagsArray = LocalStorageCache[EID_LIST_TAG];
    if (!tagsArray) { tagsArray = []; }
    if (tagsArray.indexOf(tag) === -1) {
        tagsArray.push(tag);
    }
    setLocalStorageObject(EID_LIST_TAG, tagsArray, reloadPage);
}

/**
 * 登録済みタグがクリックされたときのイベント
 */
function onClickRegiteredTag() {
    const tag = $(this).data('tag');
    if (!tag) { return; }

    // タグをリストから削除
    $(this).remove();

    // Local Storage からタグを削除
    let tagsArray = LocalStorageCache[EID_LIST_TAG];
    if (!tagsArray) { tagsArray = []; }
    const indexToRemove = tagsArray.indexOf(tag);
    if (indexToRemove !== -1) {
        tagsArray.splice(indexToRemove, 1);
    }
    setLocalStorageObject(EID_LIST_TAG, tagsArray, reloadPage);
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

        // for sorting
        let highPriorityRooms = [];

        $('.roomItem').each(function (index, element) {

            // lockedRoom - 鍵付き部屋をフィルター
            if (conditions[EID_CHECKBOX_LOCKEDROOM]) {
                const imgPath = $(element).find('img').prop('src');
                if (imgPath.match(/_lock/)) {
                    $(element).css('display', 'none');
                    return;
                }
            }

            // noVacancyRoom - 満員部屋をフィルター
            if (conditions[EID_CHECKBOX_NO_VACANCY_ROOM]) {
                const peopleStr = $(element).find('p.people').text();
                const peopleNum = parseInt(peopleStr.replace(/[^0-9]/g, ''));
                if (peopleNum === PEOPLE_MAX) {
                    $(element).css('display', 'none');
                    return;
                }
            }

            // listTag - 登録タグのついている部屋を上位に表示
            const listTagCondition = conditions[EID_LIST_TAG];
            if (listTagCondition) {
                if ($(element).data('sorted')) {
                    // 既にソートされた Room は何もしない
                } else {
                    // まだソートされていない Room
                    let containsAtLeastOne = false; // 該当タグが最低 1 つ含まれているか
                    const roomTagElems = $(element).find('.roomtag');
                    for (let i = 0; i < roomTagElems.length; i++) {
                        const roomTagElem = $(roomTagElems[i]);
                        const targetTag = roomTagElem.text();
                        listTagCondition.forEach(tag => {
                            if (targetTag.indexOf(tag) !== -1) {
                                containsAtLeastOne = true;
                                roomTagElem.css('border-color', '#ff1493');
                                return;
                            }
                        });
                    }
                    if (containsAtLeastOne) {
                        // ソート対称
                        highPriorityRooms.unshift(element)
                        $(element).data('sorted', 1);
                    } else {
                        // ソート非対称
                        $(element).data('sorted', 0);
                    }
                }
            }
        });

        const roomBox = $('#containerRoom > ul')[0];
        for (let i = 0; i < highPriorityRooms.length; i++) {
            // 先頭に移動
            $(roomBox).prepend(highPriorityRooms[i]);
        }

        if (isFirstTime) {
            console.log('RoomBox was filtered.');
            isFirstTime = false;
        }

    }, 1);
}

//////////////////////////////////////////////////////////////////////////////////
// Initializer
$(function () {

    // 対応するフィルター条件
    let filterConditions = {};

    // 初期化要素に関連した Local Storage のキー
    const storageKeys = [
        EID_CHECKBOX_LOCKEDROOM,
        EID_CHECKBOX_NO_VACANCY_ROOM,
        EID_LIST_TAG
    ];

    // Local Storage から直近の値を取得して View を更新
    chrome.storage.sync.get(storageKeys, function (result) {
        console.log('Current local storage object is below:');
        console.log(result);

        LocalStorageCache = result;

        // 各チェックボックスの初期化
        [EID_CHECKBOX_LOCKEDROOM, EID_CHECKBOX_NO_VACANCY_ROOM].forEach(elemId => {

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

        // タグリストの初期化
        const savedTagList = result[EID_LIST_TAG];
        filterConditions[EID_LIST_TAG] = [];
        if (savedTagList) {
            savedTagList.forEach(tag => { addTagToList(tag); });
            filterConditions[EID_LIST_TAG] = savedTagList;
        }

        // タグ登録ボタンのイベントをバインド 
        $(`#${EID_BUTTON_REGISTER}`).on('click', onClickTagRegisterButton);

        // ul 要素（タグリスト）のイベントをバインド
        $(document).on("click", `#${EID_LIST_TAG} li`, onClickRegiteredTag);

        // 実際に指定された条件で部屋のリストをフィルターする
        filterRoomBox(filterConditions);

        // 非同期更新用に 200 [sec] 毎にフィルターをかけなおすようにしておく
        setInterval(function () {
            filterRoomBox(filterConditions);
        }, 200);
    });
});
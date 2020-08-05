//////////////////////////////////////////////////////////////////////////////////
// Constants and Global Variables
const PEOPLE_MAX = 5;
const EID_CHECKBOX_LOCKEDROOM = 'cbLockedRoom'
const EID_CHECKBOX_NO_VACANCY_ROOM = 'cbNoVacancyRoom'
const EID_CHECKBOX_LEGACY_STYLE = 'cbLegacyStyle'
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
 * 説明文にカーソルが合ったときのイベント
 */
function onMouseOverDescription() {
    // マウスオーバーで全文表示
    $(this).attr('title', $(this).text());
}

/**
 * タグリストにカーソルが合ったときのイベント
 */
function onMouseOverGenre() {
    // マウスオーバーで全タグ表示
    const text = $(this).html()
        .replace(/\s\/\s/g, '0/0')
        .replace(/\s+/g, '')
        .replace(/<\/li><li>/g, ' / ')
        .replace('<li>', '')
        .replace('</li>', '')
        .replace(/0\/0/g, ' / ')
        .replace(/&amp;/g, '&');
    $(this).attr('title', text);
}

/**
 * DOM を編集して部屋のリストを絞り込む
 * @param {Object} conditions
 */
let canUpdate = true;
function filterRoomBox(conditions) {

    // 最適化のため同一フレーム内の呼び出しは無視
    if (!canUpdate) { return; }
    canUpdate = false;

    // lockedRoom - 鍵付き部屋をフィルター 仮
    let checked =  $("#cond-status-private").prop("checked");
    if (conditions[EID_CHECKBOX_LOCKEDROOM] && checked) {
        $("#cond-status-private").trigger("click");
    }

    // legacyStyle - NETDUETTO 風のリスト表示
    const lockIconClone = $('#icon-lock').clone();
    if (conditions[EID_CHECKBOX_LEGACY_STYLE]) {
        // CSS で補える範囲は CSS で済ませる
        $('body').addClass('legacyStyle');
    }

    // roomsInnerを一覧として
    const roomList = $("#macy-container .roomsInner")
    if (!roomList.length) { return; }

    roomList.each(function (index, element) {

        if ($(element).data('filtered')) {
            //////////////////////////////////////////////
            // 既にフィルターが適用された Room は何もしない
            return;
        }

        //////////////////////////////////////////////
        // legacyStyle - NETDUETTO 風のリスト表示
        // 参加者の表記を ND 時代に戻す
        if (conditions[EID_CHECKBOX_LEGACY_STYLE]) {
            const peopleElem = $(element).find('.people');
            const peopleElemText = peopleElem.text();
            const actualPeopleElemText = peopleElemText.replace(/[0-9]名▶/, '').replace(/(参加者：)/, '<strong>$1</strong>');
            peopleElem.html(actualPeopleElemText);

            // 右上の人数表記
            const peopleCountText = '現在 ' + peopleElemText.substr(4, 2);
            $(element).find('.roomsDetails').append('<div class="peopleCount">' + peopleCountText + '</div>');

            // 説明文をマウスオーバーで全文表示
            $(element).find('.description').mouseover(onMouseOverDescription);

            // タグをマウスオーバーで全文表示
            $(element).find('.genre').mouseover(onMouseOverGenre);

            const enterButtonElem = $(element).find('.roomIn a.enter');
            if ($(element).hasClass('lock')) {
                // ロックアイコンの追加
                enterButtonElem.prepend(
                    '<svg width="13" height="13" viewBox="0 0 20 22" style="margin: 0 15px 0 -10px">' +
                    lockIconClone.html() +
                    '</svg>'
                );
            } else {
                // 再生アイコン
                enterButtonElem.prepend(
                    '<svg width="11" height="11" style="margin: 0 15px 0 -10px">' +
                    '<path d="M0 0 L8 6 L0 11 Z"></path>' +
                    '</svg>'
                );
            }
        }

        //////////////////////////////////////////////
        // フィルター済みを記録する
        $(element).data('filtered', 1);
    });

    console.log('Filtered rooms at ' + (new Date()).getTime());
    setTimeout(function () { canUpdate = true; }, 1);
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
        EID_CHECKBOX_LEGACY_STYLE,
        EID_LIST_TAG
    ];

    // Local Storage から直近の値を取得して View を更新
    chrome.storage.sync.get(storageKeys, function (result) {
        console.log('Current local storage object is below:');
        console.log(result);

        LocalStorageCache = result;

        // 各チェックボックスの初期化
        [EID_CHECKBOX_LOCKEDROOM, EID_CHECKBOX_NO_VACANCY_ROOM, EID_CHECKBOX_LEGACY_STYLE].forEach(elemId => {

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

        // 非同期更新用に監視しつつフィルターを適用する
        filterRoomBox(filterConditions);
        $('body').on('DOMSubtreeModified', '#macy-container .roomsInner', function () {
            filterRoomBox(filterConditions);
        });
    });
});
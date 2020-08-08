//////////////////////////////////////////////////////////////////////////////////
// Constants and Global Variables
const PEOPLE_MAX = 5;
const EID_CHECKBOX_LOCKEDROOM = 'cbLockedRoom'
const EID_CHECKBOX_LEGACY_STYLE = 'cbLegacyStyle'

let LocalStorageCache = null;
let conditions = {};

// for Legacy Style
let lockIconClone = null;
let onMouseOverDescription = null;
let onMouseOverGenre = null;

//////////////////////////////////////////////////////////////////////////////////
// Convenience Functions

/**
 * Local Storage に値を保存する
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
 * チェックボックスの状態が変更されたときのイベント
 * Local Storage を更新してページをリロード
 * (popup 用, popup を廃止したら不要)
 */
function onChangedCheckboxStatus() {
    const key = $(this).attr('id');
    const value = $(this).prop("checked");
    setLocalStorageObject(key, value, function () {
        // リロードする
        chrome.tabs.getSelected(null, function (tab) {
            const code = 'window.location.reload();';
            chrome.tabs.executeScript(tab.id, { code: code });
        });
    });
}

/**
 * Local Storage の状態を見る前に、ウェブサイト側の DOM 上書き処理を行う
 */
function preInitDOM() {

    // 上書き用 CSS を適用
    $('body').addClass('extension');

    const onChangedCondition = function () {
        // Local Storage を更新してページをリロード
        const key = $(this).attr('id');
        const value = $(this).prop("checked");
        setLocalStorageObject(key, value, function () {
            location.reload();
        });
    }

    // 「レガシースタイル」ボタンの追加
    const newConditionItem = $(`
        <div class="conditionItem fz-14 fz-md-14 fw-700">
            <input id="${EID_CHECKBOX_LEGACY_STYLE}" name="${EID_CHECKBOX_LEGACY_STYLE}" type="checkbox">
            <label class="cond-checkbox" for="${EID_CHECKBOX_LEGACY_STYLE}" style="padding: 11px 15px;">
                レガシースタイル
            </label>
        </div>
    `);
    $('.conditionList .conditionItem').eq(0).after(newConditionItem);
    newConditionItem.ready(function() {
        $(`#${EID_CHECKBOX_LEGACY_STYLE}`).change(onChangedCondition);
    });

}

/**
 * Local Storage の状態にあわせて DOM を初期化する
 * @param {Object} conditions
 */
function initDOM(conditions) {

    // Locked Room - 鍵付き部屋をフィルター 仮
    let checked =  $("#cond-status-private").prop("checked");
    if (conditions[EID_CHECKBOX_LOCKEDROOM] && checked) {
        $("#cond-status-private").trigger("click");
    }

    // Legacy Style - NETDUETTO 風のリスト表示
    if (conditions[EID_CHECKBOX_LEGACY_STYLE]) {

        // CSS で補える範囲は CSS で済ませる
        $('body').addClass('legacyStyle');

        // ロックアイコンを取得 ( updateDOM で使用する )
        lockIconClone = $('#icon-lock').clone();

        // 各イベント関数を定義 ( updateDOM で使用する )
        onMouseOverDescription = function () {
            $(this).attr('title', $(this).text());
        };
        onMouseOverGenre = function () {
            const text = $(this).html()
                .replace(/\s\/\s/g, '0/0')
                .replace(/\s+/g, '')
                .replace(/<\/li><li>/g, ' / ')
                .replace('<li>', '')
                .replace('</li>', '')
                .replace(/0\/0/g, ' / ')
                .replace(/&amp;/g, '&');
            $(this).attr('title', text);
        };
    }

    // 初回の更新
    updateDOM(conditions);
}

/**
 * 非同期通信でリストが更新されるたびに DOM を編集する
 * @param {Object} conditions
 */
let canUpdate = true;
function updateDOM(conditions) {

    // 最適化のため同一フレーム内の呼び出しは無視
    if (!canUpdate) { return; }
    canUpdate = false;

    // roomsInner 毎に適用する処理
    const updateRoomsInner = function(index, element) {

        if ($(element).data('updated')) {
            //////////////////////////////////////////////
            // 既にフィルターが適用された Room は何もしない
            return;
        }

        //////////////////////////////////////////////
        // legacyStyle - NETDUETTO 風のリスト表示
        if (conditions[EID_CHECKBOX_LEGACY_STYLE]) {

            // 参加者の表記を ND 時代に戻す
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
        // アップデート済みを記録する
        $(element).data('updated', 1);
    }

    // for 接続テストルーム
    updateRoomsInner(0, $("#testroom-container .roomsInner"));

    // for メインリスト
    const roomList = $("#macy-container .roomsInner")
    if (roomList.length) {
        roomList.each(updateRoomsInner);
    }

    console.log('Updated DOM at ' + (new Date()).getTime());
    setTimeout(function () { canUpdate = true; }, 1);
}

//////////////////////////////////////////////////////////////////////////////////
// Initializer

$(function () {

    // ローカルストレージに依存しない DOM の初期化
    preInitDOM();

    // 初期化要素に関連した Local Storage のキー
    const storageKeys = [
        EID_CHECKBOX_LOCKEDROOM,
        EID_CHECKBOX_LEGACY_STYLE,
    ];

    // Local Storage から直近の値を取得して View を更新
    chrome.storage.sync.get(storageKeys, function (result) {
        console.log('Current local storage object is below:');
        console.log(result);

        LocalStorageCache = result;

        // 各チェックボックスの初期化
        [EID_CHECKBOX_LOCKEDROOM, EID_CHECKBOX_LEGACY_STYLE].forEach(elemId => {

            // 対象の条件を false で初期化
            conditions[elemId] = false;

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

            // 条件を整理する
            conditions[elemId] = localStorageVal;
        });

        // 実際に指定された条件で部屋のリストをフィルターする
        initDOM(conditions);

        // 非同期更新用に監視しつつフィルターを適用する
        $('body').on('DOMSubtreeModified', '.roomsInner', function () {
            updateDOM(conditions);
        });
    });
});
//////////////////////////////////////////////////////////////////////////////////
// Constants and Global Variables
const PEOPLE_MAX = 5;
const EID_CHECKBOX_LOCKEDROOM_PUBLIC = 'cond-status-public'
const EID_CHECKBOX_LOCKEDROOM_PRIVATE = 'cond-status-private'
const EID_CHECKBOX_NO_VACANCY = 'cbNoVacancy'
const EID_CHECKBOX_LEGACY_STYLE = 'cbLegacyStyle'
const EID_CHECKBOX_DISPLAY_TWEET = 'cbDisplayTweet'

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
        if (func) {
            func();
        }
    });
}

/**
 * Local Storage の状態を見る前に、DOM 上書き処理を行う
 */
function preInitDOM() {

    // 上書き用 CSS を適用
    $('body').addClass('extension');

    // 条件ボタンの追加
    const newConditionItem = $(`
        <div class="conditionItem addition fz-14 fz-md-14 fw-700">
            <input id="${EID_CHECKBOX_NO_VACANCY}" name="${EID_CHECKBOX_NO_VACANCY}" type="checkbox">
            <label class="cond-checkbox" for="${EID_CHECKBOX_NO_VACANCY}">
                満員
            </label>
        </div>
        <div class="conditionItem addition fz-14 fz-md-14 fw-700">
            <input id="${EID_CHECKBOX_LEGACY_STYLE}" name="${EID_CHECKBOX_LEGACY_STYLE}" type="checkbox">
            <label class="cond-checkbox" for="${EID_CHECKBOX_LEGACY_STYLE}">
                レガシースタイル
            </label>
        </div>
        <div class="conditionItem addition fz-14 fz-md-14 fw-700">
            <input id="${EID_CHECKBOX_DISPLAY_TWEET}" name="${EID_CHECKBOX_DISPLAY_TWEET}" type="checkbox">
            <label class="cond-checkbox" for="${EID_CHECKBOX_DISPLAY_TWEET}">
                公式ツイート
            </label>
        </div>
    `);
    $('.conditionItem').eq(0).after(newConditionItem);
    newConditionItem.ready(function () {
        [
            EID_CHECKBOX_NO_VACANCY,
            EID_CHECKBOX_LEGACY_STYLE, 
            EID_CHECKBOX_DISPLAY_TWEET
        ].forEach((elemId) => {
            // もし既に conditions が生成されていたら見た目を初期化
            if (conditions[elemId]) {
                $(`#${elemId}`).prop('checked', conditions[elemId]);
            }
            // クリックしたときのイベントをバインド
            $(`#${elemId}`).change(function () {
                // Local Storage を更新してページをリロード
                const key = $(this).attr('id');
                const value = $(this).prop("checked");
                setLocalStorageObject(key, value, function () {
                    location.reload();
                });
            });
        });
    });
}

/**
 * Local Storage の状態にあわせて、 DOM を初期化する
 * @param {Object} conditions
 */
function initDOM(conditions) {

    // No Vacancy - 満員部屋の表示
    if (conditions[EID_CHECKBOX_NO_VACANCY]) {

        // チェックボックスの見た目を更新
        $(`#${EID_CHECKBOX_NO_VACANCY}`).prop('checked', true);
    }

    // Legacy Style - NETDUETTO 風のリスト表示
    if (conditions[EID_CHECKBOX_LEGACY_STYLE]) {

        // CSS で補える範囲は CSS で済ませる
        $('body').addClass('legacyStyle');

        // ロックアイコンを取得 ( updateDOM で使用する )
        lockIconClone = $('#icon-lock').clone();

        // チェックボックスの見た目を更新
        $(`#${EID_CHECKBOX_LEGACY_STYLE}`).prop('checked', true);

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

    // Display Tweet - 公式ツイートの表示
    if (conditions[EID_CHECKBOX_DISPLAY_TWEET] === false) {

        $('.tweetList').css('display', 'none');
        $('.contentsBody').css('width', '100%');

        // HACK: 
        // オリジナルスタイルのリスト表示において、公式ツイートを非表示にすると横幅が拡張される分、
        // roomsInner の高さが小さくなるため、 roomsInner の縦間で不自然なマージンが残る。
        // ウィンドウをリサイズするか、フィルターを更新することで適切な位置を再計算する処理が走るため、
        // ここでは鍵無しボタンを 2 回クリックすることでそれを走らせる。
        $(`#${EID_CHECKBOX_LOCKEDROOM_PUBLIC}`).trigger("click");
        $(`#${EID_CHECKBOX_LOCKEDROOM_PUBLIC}`).trigger("click");
    }
    else
    {
        // チェックボックスの見た目を更新
        $(`#${EID_CHECKBOX_DISPLAY_TWEET}`).prop('checked', true);
    }

    // Locked Room - 鍵付き部屋をフィルター
    [EID_CHECKBOX_LOCKEDROOM_PUBLIC, EID_CHECKBOX_LOCKEDROOM_PRIVATE].forEach(elemId => {

        // MEMO: ボタンの初期状態は checked なので false の時にクリックさせる
        if (conditions[elemId] === false) { 
            $(`#${elemId}`).trigger("click");
        }

        // Display Tweet のレイアウト再計算 HACK のため、それよりも後にイベントをバインドする
        $(`#${elemId}`).change(function () {
            // Local Storage を更新するだけ
            const key = $(this).attr('id');
            const value = $(this).prop("checked");
            setLocalStorageObject(key, value);
        });
    });

    // 初回の更新
    updateDOM(conditions);
}

/**
 * 非同期通信でリストが更新されるたびに、 DOM を編集する
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

        const peopleElem = $(element).find('.people');
        const peopleElemText = peopleElem.text();
        const peopleCount = parseInt(peopleElemText.substr(4, 1));

        //////////////////////////////////////////////
        // noVacancy - 満員部屋
        if (conditions[EID_CHECKBOX_NO_VACANCY] === false) {
            if (peopleCount === PEOPLE_MAX) {
                $(element).css('display', 'none');
            }
        }

        //////////////////////////////////////////////
        // legacyStyle - NETDUETTO 風のリスト表示
        if (conditions[EID_CHECKBOX_LEGACY_STYLE]) {

            // 参加者の表記を ND 時代に戻す
            const actualPeopleElemText = peopleElemText.replace(/[0-9]名▶/, '').replace(/(参加者：)/, '<strong>$1</strong>');
            peopleElem.html(actualPeopleElemText);

            // 右上の人数表記
            const peopleCountText = `現在 ${peopleCount}名`;
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
    // 値は初期値
    let storageKeys = {};
    storageKeys[EID_CHECKBOX_LOCKEDROOM_PUBLIC] = true;
    storageKeys[EID_CHECKBOX_LOCKEDROOM_PRIVATE] = true;
    storageKeys[EID_CHECKBOX_NO_VACANCY] = true;
    storageKeys[EID_CHECKBOX_LEGACY_STYLE] = false;
    storageKeys[EID_CHECKBOX_DISPLAY_TWEET] = true;

    // Local Storage から直近の値を取得して View を更新
    chrome.storage.sync.get(Object.keys(storageKeys), function (result) {
        console.log('Current local storage object is below:');
        console.log(result);

        LocalStorageCache = result;

        // conditions に変換
        Object.keys(storageKeys).forEach(elemId => {

            // 対象の条件を false で初期化
            conditions[elemId] = false;

            // 直近の値が未設定なら初期値をセット
            let localStorageVal = result[elemId];
            if (localStorageVal === undefined) {
                localStorageVal = storageKeys[elemId];
                setLocalStorageObject(elemId, storageKeys[elemId]);
            }

            // 条件を整理する
            conditions[elemId] = localStorageVal;
        });

        // 指定された条件で DOM を変更する
        initDOM(conditions);

        // 非同期更新用に監視しつつフィルターを適用する
        $('body').on('DOMSubtreeModified', '.roomsInner', function () {
            updateDOM(conditions);
        });
    });
});
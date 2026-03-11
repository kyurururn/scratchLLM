import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import classNames from 'classnames';
import styles from './chat.css';
import sendIcon from './icon--send.svg';
import trashIcon from './icon--trash.svg';
import chatCloseIcon from './icon--chat-close.svg';
import {
    closeChat
} from '../../reducers/modals';
import {
    addMessage,
    clearHistory,
    setHasConsented,
    setIsLoading,
    setPendingRequestId
} from '../../reducers/chat-history';

import ScratchBlockRenderer from './scratch-block-renderer.jsx';
import ScratchTextCompiler from '../../lib/scratch-text-compiler';




const renderMessageContent = text => {
    // Split by code blocks formatted as ```scratch ... ```
    const parts = text.split(/(```scratch[\s\S]*?```)/g);
    return parts.map((part, index) => {
        if (part.startsWith('```scratch')) {
            // Remove the markers
            const code = part.replace(/^```scratch\n?|```$/g, '');
            return (<ScratchBlockRenderer
                key={index}
                code={code}
            />);
        }
        // Check for other code blocks (optional, but good for normal formatting)
        // For now, just render text as is but strictly scratch blocks are handled specially.
        return (
            <span
                key={index}
                style={{ whiteSpace: 'pre-wrap' }}
            >
                {part}
            </span>
        );
    });
};

// IMPORTANT: Set your Gemini API Key in a secure environment variable.
// Do not hardcode the key in this file.
// For example, in a Vite or Create React App project, you can use a .env file:
// VITE_GEMINI_API_KEY=YOUR_API_KEY_HERE
// Then, access it using `import.meta.env.VITE_GEMINI_API_KEY` or `process.env.REACT_APP_GEMINI_API_KEY`.
const API_URL = 'http://localhost:3001/api/llm';

/* eslint-disable max-len */
const SYSTEM_PROMPT = `
# Scratch 3.0 AI Programmer - Text Mode

You are an expert Scratch 3.0 programmer. Your goal is to generate functional Scratch projects based on user requests.

## RESPONSE FORMAT (STRICT)

*   **Tone & Style**: 中学生にわかりやすく、親しみやすい言葉遣い（丁寧語や少しフレンドリーな口調）で説明してください。専門用語はなるべく避け、わかりやすい例えを使ってください。
*   **Explanation & Code (Text)**: 説明文と \`\`\`scratch \`\`\` ブロックを使ったコードの提示は、完全に分ける必要はありません。必要に応じて、説明の途中に \`\`\`scratch \`\`\` ブロックを挟みながら、段階的にわかりやすく解説してあげてください。
*   **Code (JSON)**: 回答の一番最後に、**必ず** Standard Scratch 3.0 JSON を \`\`\`json \`\`\` ブロックで出力してください。その際、「### Code (JSON)」や「### JSON」などの見出しやヘッダーは**絶対に**出力しないでください。直接 \`\`\`json \`\`\` ブロックから始めてください。

**IMPORTANT**: You must output BOTH the text explanation (with scratch blocks) and the JSON.

## Example Response

ユーザー: 猫を動かして
AI:
猫を10歩動かすプログラムだよ。こんな風にブロックを組み合わせるんだ。

\`\`\`scratch
⚑ が押されたとき
(10) 歩動かす
\`\`\`

これで緑の旗を押すと、猫が右に少しだけ動くよ！

\`\`\`json
[SCRATCH-PROJECT-JSON]
{
  "targets": [
    {
      "isStage": false,
      "name": "Sprite1",
      "blocks": {
        "event_whenflagclicked": {
          "opcode": "event_whenflagclicked",
          "next": "motion_movesteps",
          "parent": null,
          "inputs": {},
          "fields": {},
          "topLevel": true,
          "x": 0,
          "y": 0
        },
        "motion_movesteps": {
          "opcode": "motion_movesteps",
          "next": null,
          "parent": "event_whenflagclicked",
          "inputs": {
            "STEPS": [1, [4, "10"]]
          },
          "fields": {}
        }
      },
      "variables": {},
      "lists": {},
      "costumes": [],
      "sounds": []
    }
  ],
  "meta": { "semver": "3.0.0", "vm": "0.2.0" }
}
\`\`\`

---

## Part 2: JSON Generation Rules (CRITICAL FOR BACKUP)

**WARNING: When generating JSON, DO NOT invent new Asset IDs (md5ext) for Costumes/Sounds. Use standard ones or leave costumes/sounds empty if unsure. The system is smarter at handling text-based blocks.**

**IMPORTANT: For Variable Dropdowns, you MUST use brackets with 'v': \`[variable name v]\`**
**WARNING: DO NOT generate a block "create variable". Variables are created automatically by using them.**
**WARNING: DO NOT generate a block "create list".**


### 1. Basic Structure
The JSON must follow this exact structure:
\`\`\`json
{
  "targets": [
    {
      "isStage": true,
      "name": "Stage",
      "variables": { "varId": ["my variable", 0] },
      "lists": {},
      "blocks": {}
    },
    {
      "isStage": false,
      "name": "Sprite1",
      "blocks": {
        // ... BLOCKS GO HERE ...
      },
      "variables": {},
      "costumes": [], // LEAVE EMPTY or use defaults
      "sounds": []    // LEAVE EMPTY or use defaults
    }
  ],
  "meta": { "semver": "3.0.0", "vm": "0.2.0" }
}
\`\`\`

### 2. JSON Validation Rules (CRITICAL)

*   **Distinguish between TYPE ID and VALUE**:
    *   **Rule 1**: The First Item (Type ID) must be a **Number (Unquoted)**.
    *   **Rule 2**: The Second Item (Value) must be a **String (Quoted)**.
    *   **CORRECT**: \`"STEPS": [1, [4, "10"]]\`  (Type ID 4 is Number, Value "10" is String)
    *   **WRONG**: \`"STEPS": [1, ["4", "10"]]\` (Type ID "4" is String -> ERROR)
    *   **WRONG**: \`"STEPS": [1, [4, 10]]\` (Value 10 is Number -> ERROR)
*   **Do not invent new OpCodes.** Only use the ones listed below.

### 3. Text Generation Rules (STRICT)

*   **EXACT MATCH**: You MUST use the **EXACT** Japanese text defined in the Block Dictionary.
*   **NO PARTICLES**: Do not add particles (e.g., do not change \`、\` to \`に、\` or \`を\` to \`は\`).
*   **NO PARAPHRASING**: Do not change word order. Copy the text exactly as shown in the dictionary.

### 4. COMPLETE Block Dictionary (Text -> JSON -> Explanation)

**Format:** \`[Japanese Text] : [Opcode & JSON Structure] : [Explanation]\`
**IMPORTANT: For C-blocks (if, repeat, forever), you MUST use the English word \`end\` to close the block in the Text format. DO NOT use "終わり".**

#### Motion (動き)
*   \`(10) 歩動かす\` : \`motion_movesteps (inputs: { STEPS: [1, [4, "10"]] })\` : Move N steps forward in the current direction.
*   \`右に (15) 度回す\` : \`motion_turnright (inputs: { DEGREES: [1, [4, "15"]] })\` : Turn right (clockwise) by N degrees.
*   \`左に (15) 度回す\` : \`motion_turnleft (inputs: { DEGREES: [1, [4, "15"]] })\` : Turn left (counter-clockwise) by N degrees.
*   \`(どこかの場所 v) へ行く\` : \`motion_goto (inputs: { TO: [1, "DISTINATION_ID"] })\` : Go to random position/mouse pointer. **(MUST define shadow block "DISTINATION_ID": \`{"opcode":"motion_goto_menu","fields":{"TO":["_random_",null]},"shadow":true}\`)**
*   \`x座標を (0)、y座標を (0) にする\` : \`motion_gotoxy (inputs: { X: [1, [4, "0"]], Y: [1, [4, "0"]] })\` : Teleport to specific X, Y coordinates.
*   \`(1) 秒で (どこかの場所 v) へ行く\` : \`motion_glideto (inputs: { SECS: [1, [4, "1"]], TO: [1, "DISTINATION_ID"] })\` : Glide to a position over time. **(MUST define shadow block "DISTINATION_ID": \`{"opcode":"motion_glideto_menu","fields":{"TO":["_random_",null]},"shadow":true}\`)**
*   \`(1) 秒でx座標を (0) に、y座標を (0) に変える\` : \`motion_glidesecstoxy (inputs: { SECS: [1, [4, "1"]], X: [1, [4, "0"]], Y: [1, [4, "0"]] })\` : Glide to X, Y coordinates over time.
*   \`(90) 度に向ける\` : \`motion_pointindirection (inputs: { DIRECTION: [1, [4, "90"]] })\` : Point in a specific direction (90=right, -90=left).
*   \`(マウスのポインター v) へ向ける\` : \`motion_pointtowards (inputs: { TOWARDS: [1, "TOWARDS_ID"] })\` : Turn to face mouse or sprite. **(MUST define shadow block "TOWARDS_ID": \`{"opcode":"motion_pointtowards_menu","fields":{"TOWARDS":["_mouse_",null]},"shadow":true}\`)**
*   \`x座標を (10) ずつ変える\` : \`motion_changexby (inputs: { DX: [1, [4, "10"]] })\` : Change X position by N.
*   \`x座標を (0) にする\` : \`motion_setx (inputs: { X: [1, [4, "0"]] })\` : Set X position to N.
*   \`y座標を (10) ずつ変える\` : \`motion_changeyby (inputs: { DY: [1, [4, "10"]] })\` : Change Y position by N.
*   \`y座標を (0) にする\` : \`motion_sety (inputs: { Y: [1, [4, "0"]] })\` : Set Y position to N.
*   \`もし端に着いたら、跳ね返る\` : \`motion_ifonedgebounce (inputs: {})\` : Bounce if touching the edge of the screen.
*   \`回転方法を [左右のみ v] にする\` : \`motion_setrotationstyle (fields: { STYLE: ["left-right", null] })\` : Set rotation style (left-right, don't rotate, all around).
*   \`(x座標)\` : \`motion_xposition (inputs: {})\` : (Reporter) Current X position.
*   \`(y座標)\` : \`motion_yposition (inputs: {})\` : (Reporter) Current Y position.
*   \`(向き)\` : \`motion_direction (inputs: {})\` : (Reporter) Current direction.

#### Looks (見た目)
*   \`[こんにちは!] と (2) 秒言う\` : \`looks_sayforsecs (inputs: { MESSAGE: [1, [10, "Hello!"]], SECS: [1, [4, "2"]] })\` : Say message for N seconds.
*   \`[こんにちは!] と言う\` : \`looks_say (inputs: { MESSAGE: [1, [10, "Hello!"]] })\` : Say message indefinitely.
*   \`[うーん...] と (2) 秒考える\` : \`looks_thinkforsecs (inputs: { MESSAGE: [1, [10, "Hmm..."]], SECS: [1, [4, "2"]] })\` : Think message for N seconds.
*   \`[うーん] と考える\` : \`looks_think (inputs: { MESSAGE: [1, [10, "Hmm..."]] })\` : Think message indefinitely.
*   \`コスチュームを (コスチューム1 v) にする\` : \`looks_switchcostumeto (inputs: { COSTUME: [1, "COSTUME_ID"] })\` : Switch costume. **(MUST define shadow block "COSTUME_ID": \`{"opcode":"looks_costume","fields":{"COSTUME":["costume1",null]},"shadow":true}\`)**
*   \`次のコスチュームにする\` : \`looks_nextcostume (inputs: {})\` : Switch to next costume.
*   \`背景を (背景1 v) にする\` : \`looks_switchbackdropto (inputs: { BACKDROP: [1, "BACKDROP_ID"] })\` : Switch backdrop. **(MUST define shadow block "BACKDROP_ID": \`{"opcode":"looks_backdrops","fields":{"BACKDROP":["backdrop1",null]},"shadow":true}\`)**
*   \`次の背景にする\` : \`looks_nextbackdrop (inputs: {})\` : Switch to next backdrop.
*   \`大きさを (10) ずつ変える\` : \`looks_changesizeby (inputs: { CHANGE: [1, [4, "10"]] })\` : Change size by N.
*   \`大きさを (100) %にする\` : \`looks_setsizeto (inputs: { SIZE: [1, [4, "100"]] })\` : Set size to N%.
*   \`[色 v] の効果を (25) ずつ変える\` : \`looks_changeeffectby (inputs: { CHANGE: [1, [4, "25"]] }, fields: { EFFECT: ["color", null] })\` : Change graphic effect.
*   \`[色 v] の効果を (0) にする\` : \`looks_seteffectto (inputs: { VALUE: [1, [4, "0"]] }, fields: { EFFECT: ["color", null] })\` : Set graphic effect.
*   \`画像効果をなくす\` : \`looks_cleargraphiceffects (inputs: {})\` : Clear all graphic effects.
*   \`表示する\` : \`looks_show (inputs: {})\` : Show sprite.
*   \`隠す\` : \`looks_hide (inputs: {})\` : Hide sprite.
*   \`[最前面 v] へ移動する\` : \`looks_gotofrontback (fields: { FRONT_BACK: ["front", null] })\` : Go to front/back layer.
*   \`(1) 層 [手前に出す v]\` : \`looks_goforwardbackwardlayers (inputs: { NUM: [1, [4, "1"]] }, fields: { FORWARD_BACKWARD: ["forward", null] })\` : Change layer order.
*   \`(コスチュームの [番号 v])\` : \`looks_costumenumbername (fields: { NUMBER_NAME: ["number", null] })\` : (Reporter) Costume number/name.
*   \`(背景の [番号 v])\` : \`looks_backdropnumbername (fields: { NUMBER_NAME: ["number", null] })\` : (Reporter) Backdrop number/name.
*   \`(大きさ)\` : \`looks_size (inputs: {})\` : (Reporter) Current size.

#### Sound (音)
*   \`終わるまで (Meow v) の音を鳴らす\` : \`sound_playuntildone (inputs: { SOUND_MENU: [1, "SOUND_ID"] })\` : Play sound until done. **(MUST define shadow block "SOUND_ID": \`{"opcode":"sound_sounds_menu","fields":{"SOUND_MENU":["Meow",null]},"shadow":true}\`)**
*   \`(Meow v) の音を鳴らす\` : \`sound_play (inputs: { SOUND_MENU: [1, "SOUND_ID"] })\` : Start playing sound. **(MUST define shadow block "SOUND_ID": \`{"opcode":"sound_sounds_menu","fields":{"SOUND_MENU":["Meow",null]},"shadow":true}\`)**
*   \`すべての音を止める\` : \`sound_stopallsounds (inputs: {})\` : Stop all sounds.
*   \`[ピッチ v] の効果を (10) ずつ変える\` : \`sound_changeeffectby (inputs: { VALUE: [1, [4, "10"]] }, fields: { EFFECT: ["pitch", null] })\` : Change sound effect.
*   \`[ピッチ v] の効果を (100) にする\` : \`sound_seteffectto (inputs: { VALUE: [1, [4, "100"]] }, fields: { EFFECT: ["pitch", null] })\` : Set sound effect.
*   \`音の効果をなくす\` : \`sound_cleareffects (inputs: {})\` : Clear sound effects.
*   \`音量を (-10) ずつ変える\` : \`sound_changevolumeby (inputs: { VOLUME: [1, [4, "-10"]] })\` : Change volume.
*   \`音量を (100) %にする\` : \`sound_setvolumeto (inputs: { VOLUME: [1, [4, "100"]] })\` : Set volume.
*   \`(音量)\` : \`sound_volume (inputs: {})\` : (Reporter) Current volume.

#### Events (イベント)
*   \`⚑ が押されたとき\` : \`event_whenflagclicked (topLevel: true)\` : Trigger on green flag.
*   \`[スペース v] キーが押されたとき\` : \`event_whenkeypressed (fields: { KEY_OPTION: ["space", null] }, topLevel: true)\` : Trigger on key press.
*   \`このスプライトが押されたとき\` : \`event_whenthisspriteclicked (topLevel: true)\` : Trigger on click.
*   \`背景が [背景1 v] になったとき\` : \`event_whenbackdropswitchesto (fields: { BACKDROP: ["backdrop1", null] }, topLevel: true)\` : Trigger on backdrop switch.
*   \`[音量 v] > (10) のとき\` : \`event_whengreaterthan (inputs: { VALUE: [1, [4, "10"]] }, fields: { WHENGREATERTHANMENU: ["LOUDNESS", null] }, topLevel: true)\` : Trigger when value > threshold.
*   \`[メッセージ1 v] を受け取ったとき\` : \`event_whenbroadcastreceived (fields: { BROADCAST_OPTION: ["message1", "b_id"] }, topLevel: true)\` : Trigger on broadcast.
*   \`(メッセージ1 v) を送る\` : \`event_broadcast (inputs: { BROADCAST_INPUT: [1, [11, "message1", "b_id"]] })\` : Send broadcast.
*   \`(メッセージ1 v) を送って待つ\` : \`event_broadcastandwait (inputs: { BROADCAST_INPUT: [1, [11, "message1", "b_id"]] })\` : Send broadcast and wait.

#### Control (制御)
*   \`(1) 秒待つ\` : \`control_wait (inputs: { DURATION: [1, [4, "1"]] })\` : Wait N seconds.
*   \`(10) 回繰り返す\` : \`control_repeat (inputs: { TIMES: [1, [4, "10"]], SUBSTACK: [2, "block_id"] })\` : Repeat N times.
*   \`ずっと\` : \`control_forever (inputs: { SUBSTACK: [2, "block_id"] })\` : Infinite loop.
*   \`もし < > なら\` : \`control_if (inputs: { CONDITION: [2, "boolean_block_id"], SUBSTACK: [2, "block_id"] })\` : If condition is true.
*   \`もし < > なら ... でなければ\` : \`control_if_else (inputs: { CONDITION: [2, "boolean_block_id"], SUBSTACK: [2, "if_block_id"], SUBSTACK2: [2, "else_block_id"] })\` : If/Else.
*   \`< > まで待つ\` : \`control_wait_until (inputs: { CONDITION: [2, "boolean_block_id"] })\` : Wait until condition is true.
*   \`< > まで繰り返す\` : \`control_repeat_until (inputs: { CONDITION: [2, "boolean_block_id"], SUBSTACK: [2, "block_id"] })\` : Repeat until condition is true.
*   \`[すべてを止める v]\` : \`control_stop (fields: { STOP_OPTION: ["all", null] })\` : Stop scripts.
*   \`クローンされたとき\` : \`control_start_as_clone (topLevel: true)\` : Trigger when cloned.
*   \`[自分自身 v] のクローンを作る\` : \`control_create_clone_of (inputs: { CLONE_OPTION: [1, "CLONE_ID"] })\` : Create clone. **(MUST define shadow block "CLONE_ID": \`{"opcode":"control_create_clone_of_menu","fields":{"CLONE_OPTION":["_myself_",null]},"shadow":true}\`)**
*   \`このクローンを削除する\` : \`control_delete_this_clone (inputs: {})\` : Delete this clone.

#### Sensing (調べる)
*   \`< (マウスのポインター v) に触れた >\` : \`sensing_touchingobject (inputs: { TOUCHINGOBJECTMENU: [1, "TOUCH_ID"] })\` : Touching object? **(MUST define shadow block "TOUCH_ID": \`{"opcode":"sensing_touchingobjectmenu","fields":{"TOUCHINGOBJECTMENU":["_mouse_",null]},"shadow":true}\`)**
*   \`< [#ff0000] に触れた >\` : \`sensing_touchingcolor (inputs: { COLOR: [1, [9, "#ff0000"]] })\` : Touching color?
*   \`< [#ff0000] 色が [#00ff00] 色に触れた >\` : \`sensing_coloristouchingcolor (inputs: { COLOR: [1, [9, "#ff0000"]], COLOR2: [1, [9, "#00ff00"]] })\` : Color touches color?
*   \`(マウスのポインター v) までの距離\` : \`sensing_distanceto (inputs: { DISTANCETOMENU: [1, "DIST_ID"] })\` : Distance to object. **(MUST define shadow block "DIST_ID": \`{"opcode":"sensing_distancetomenu","fields":{"DISTANCETOMENU":["_mouse_",null]},"shadow":true}\`)**
*   \`[What's your name?] と聞いて待つ\` : \`sensing_askandwait (inputs: { QUESTION: [1, [10, "What's your name?"]] })\` : Ask question.
*   \`(答え)\` : \`sensing_answer (inputs: {})\` : (Reporter) Answer.
*   \`< (スペース v) キーが押された >\` : \`sensing_keypressed (inputs: { KEY_OPTION: [1, "KEY_ID"] })\` : Key pressed? **(MUST define shadow block "KEY_ID": \`{"opcode":"sensing_keyoptions","fields":{"KEY_OPTION":["space",null]},"shadow":true}\`)**
*   \`< マウスが押された >\` : \`sensing_mousedown (inputs: {})\` : (Reporter) Mouse down?
*   \`(マウスのx座標)\` : \`sensing_mousex (inputs: {})\` : (Reporter) Mouse X.
*   \`(マウスのy座標)\` : \`sensing_mousey (inputs: {})\` : (Reporter) Mouse Y.
*   \`ドラッグ [できる v] ようにする\` : \`sensing_setdragmode (fields: { DRAG_MODE: ["draggable", null] })\` : Set drag mode.
*   \`(音量)\` : \`sensing_loudness (inputs: {})\` : (Reporter) Microphone loudness.
*   \`(タイマー)\` : \`sensing_timer (inputs: {})\` : (Reporter) Timer value.
*   \`タイマーをリセット\` : \`sensing_resettimer (inputs: {})\` : Reset timer.
*   \`(ステージ v) の [背景# v]\` : \`sensing_of (inputs: { OBJECT: [1, "OBJ_ID"] }, fields: { PROPERTY: ["x position", null] })\` : Property of object. **(MUST define shadow block "OBJ_ID": \`{"opcode":"sensing_of_object_menu","fields":{"OBJECT":["_stage_",null]},"shadow":true}\`)**
*   \`(現在の [年 v])\` : \`sensing_current (fields: { CURRENTMENU: ["YEAR", null] })\` : Current date/time.
*   \`(2000年からの日数)\` : \`sensing_dayssince2000 (inputs: {})\` : (Reporter) Days since 2000.
*   \`(ユーザー名)\` : \`sensing_username (inputs: {})\` : (Reporter) Username.

#### Operators (演算)
*   \`(() + ())\` : \`operator_add (inputs: { NUM1: [1, [4, ""]], NUM2: [1, [4, ""]] })\` : Add.
*   \`(() - ())\` : \`operator_subtract (inputs: { NUM1: [1, [4, ""]], NUM2: [1, [4, ""]] })\` : Subtract.
*   \`(() * ())\` : \`operator_multiply (inputs: { NUM1: [1, [4, ""]], NUM2: [1, [4, ""]] })\` : Multiply.
*   \`(() / ())\` : \`operator_divide (inputs: { NUM1: [1, [4, ""]], NUM2: [1, [4, ""]] })\` : Divide.
*   \`(() から () までの乱数)\` : \`operator_random (inputs: { FROM: [1, [4, "1"]], TO: [1, [4, "10"]] })\` : Random number.
*   \`< () > () >\` : \`operator_gt (inputs: { OPERAND1: [1, [10, ""]], OPERAND2: [1, [10, "50"]] })\` : Greater than.
*   \`< () < () >\` : \`operator_lt (inputs: { OPERAND1: [1, [10, ""]], OPERAND2: [1, [10, "50"]] })\` : Less than.
*   \`< () = () >\` : \`operator_equals (inputs: { OPERAND1: [1, [10, ""]], OPERAND2: [1, [10, "50"]] })\` : Equals.
*   \`< < > かつ < > >\` : \`operator_and (inputs: { OPERAND1: [2, "bool_id"], OPERAND2: [2, "bool_id"] })\` : Logical AND.
*   \`< < > または < > >\` : \`operator_or (inputs: { OPERAND1: [2, "bool_id"], OPERAND2: [2, "bool_id"] })\` : Logical OR.
*   \`< < > ではない >\` : \`operator_not (inputs: { OPERAND: [2, "bool_id"] })\` : Logical NOT.
*   \`([] と [])\` : \`operator_join (inputs: { STRING1: [1, [10, "apple "]], STRING2: [1, [10, "banana"]] })\` : Join strings.
*   \`([] の (1) 番目の文字)\` : \`operator_letter_of (inputs: { LETTER: [1, [4, "1"]], STRING: [1, [10, "apple"]] })\` : Character at index.
*   \`([] の長さ)\` : \`operator_length (inputs: { STRING: [1, [10, "apple"]] })\` : Length of string.
*   \`< [] に [] が含まれる >\` : \`operator_contains (inputs: { STRING1: [1, [10, "apple"]], STRING2: [1, [10, "a"]] })\` : String contains substring?
*   \`(() を () で割った余り)\` : \`operator_mod (inputs: { NUM1: [1, [4, ""]], NUM2: [1, [4, ""]] })\` : Modulo.
*   \`(() を四捨五入)\` : \`operator_round (inputs: { NUM: [1, [4, ""]] })\` : Round.
*   \`(() の [絶対値 v])\` : \`operator_mathop (inputs: { NUM: [1, [4, ""]] }, fields: { OPERATOR: ["abs", null] })\` : Math functions (abs, floor, etc.).

#### Variables (変数)
*   \`(my variable)\` : \`data_variable (fields: { VARIABLE: ["my variable", "var_id"] })\` : (Reporter) Value of variable.
*   \`[my variable v] を (0) にする\` : \`data_setvariableto (inputs: { VALUE: [1, [10, "0"]] }, fields: { VARIABLE: ["my variable", "var_id"] })\` : Set variable.
*   \`[my variable v] を (1) ずつ変える\` : \`data_changevariableby (inputs: { VALUE: [1, [4, "1"]] }, fields: { VARIABLE: ["my variable", "var_id"] })\` : Change variable.
*   \`変数 [my variable v] を表示する\` : \`data_showvariable (fields: { VARIABLE: ["my variable", "var_id"] })\` : Show variable monitor.
*   \`変数 [my variable v] を隠す\` : \`data_hidevariable (fields: { VARIABLE: ["my variable", "var_id"] })\` : Hide variable monitor.
`;

export class ChatComponent extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            inputValue: ''
        };
        this.textareaRef = React.createRef();
        this.handleSend = this.handleSend.bind(this);
        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleClearHistory = this.handleClearHistory.bind(this);
    }

    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    handleClearHistory() {
        this.props.onClearHistory();
    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.handleSend();
        }
    }

    handleInputChange(e) {
        const textarea = e.target;
        this.setState({ inputValue: textarea.value });

        // 高さを一度リセット
        textarea.style.height = '30px';

        // スクロール量を反映。ただし最小30px、最大300pxに制限
        const newHeight = Math.max(30, Math.min(textarea.scrollHeight, 150));
        textarea.style.height = `${newHeight}px`;
    }

    handleSend() {
        const { inputValue } = this.state;
        if (inputValue.trim() === '' || this.props.isLoading) return;

        const userMessage = { text: inputValue, sender: 'user' };
        this.props.onAddMessage(userMessage);

        this.setState({ inputValue: '' });
        this.props.onSetIsLoading(true);

        if (this.textareaRef.current) {
            this.textareaRef.current.style.height = '30px';
        }

        const projectJson = this.props.vm.toJSON();
        const prompt = `The user wants to modify the existing program.\nCurrent project state: \n${projectJson} \n\nUser prompt: "${inputValue}"`;

        const history = this.props.messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));

        fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // model: 'gpt-4o', // Delegate model selection to server
                userInput: inputValue,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'assistant', content: 'Ok, I understand.' },
                    ...history,
                    { role: 'user', content: prompt }
                ]
            })
        })
            .then(response => response.json())
            .then(data => {
                if (!this._isMounted) return;

                // ── AI機能が無効の場合 ──
                if (data.disabled) {
                    const botMessage = { text: '【お知らせ】AI機能は現在先生によって停止されています。', sender: 'bot' };
                    this.props.onAddMessage(botMessage);
                    this.props.onSetIsLoading(false);
                    return;
                }

                // ── 承認待ちの場合：SSEで結果を待つ ──
                if (data.pending && data.request_id) {
                    const requestId = data.request_id;
                    this.props.onSetPendingRequestId(requestId);

                    const evtSource = new EventSource(`${API_URL.replace('/api/llm', '')}/api/events/${requestId}`);

                    evtSource.addEventListener('approved', event => {
                        evtSource.close();
                        if (!this._isMounted) return;
                        this.props.onSetIsLoading(false);
                        this.props.onSetPendingRequestId(null);

                        const approvedData = JSON.parse(event.data);
                        const fullResponse = approvedData.response || '';

                        // 「承認待ち」メッセージを「承認済み」に置き換える処理（追記形式）
                        this._handleApprovedResponse(fullResponse);
                    });

                    evtSource.addEventListener('rejected', event => {
                        evtSource.close();
                        if (!this._isMounted) return;
                        this.props.onSetIsLoading(false);
                        this.props.onSetPendingRequestId(null);

                        const rejectedData = JSON.parse(event.data);
                        const reason = rejectedData.reason || '先生がこの回答の表示を許可しませんでした。';
                        const errorMsg = { text: `⚠️ ${reason}`, sender: 'bot' };
                        this.props.onAddMessage(errorMsg);
                    });

                    evtSource.onerror = () => {
                        evtSource.close();
                        if (!this._isMounted) return;
                        this.props.onSetIsLoading(false);
                        this.props.onSetPendingRequestId(null);
                        const errorMsg = { text: '⚠️ 先生との通信が切断されました。もう一度試してください。', sender: 'bot' };
                        this.props.onAddMessage(errorMsg);
                    };

                    return; // SSEで処理するのでここで終了
                }

                let fullResponse = 'Sorry, I could not get a response.';

                if (data.error === "This content is strictly prohibited." || data.error === "This content violates our safety policies.") {
                    fullResponse = "【警告】不適切な表現が含まれているため、AIは回答できません。";
                } else if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
                    fullResponse = data.choices[0].message.content;
                } else if (data && data.error) {
                    console.error('OpenAI API Error:', data.error);
                    fullResponse = `Error: ${data.error.message || data.error} `;
                }

                let explanation = fullResponse;
                let newProjectJson = null;

                // DIRECT JSON PRIORITY (User Request)
                const jsonMatch = fullResponse.match(/```json\s*(?:\[SCRATCH-PROJECT-JSON\])?\s*([\s\S]*?)```/);
                if (jsonMatch && jsonMatch[1]) {
                    try {
                        const jsonContent = jsonMatch[1].replace(/\/\/.*$/gm, '').trim();
                        newProjectJson = JSON.parse(jsonContent);

                        // SANITIZATION: Fix common AI errors (e.g. Type IDs as strings)
                        const sanitizeProjectJson = (project) => {
                            if (!project || !project.targets) return project;
                            project.targets.forEach(target => {
                                // Fix variable definitions (must be [name, value])
                                if (target.variables) {
                                    Object.keys(target.variables).forEach(key => {
                                        const val = target.variables[key];
                                        if (!Array.isArray(val)) {
                                            target.variables[key] = [key, typeof val === 'number' ? val : 0];
                                        } else if (val.length < 2) {
                                            target.variables[key] = [val[0] || key, 0];
                                        }
                                    });
                                }
                                // Fix list definitions (must be [name, array])
                                if (target.lists) {
                                    Object.keys(target.lists).forEach(key => {
                                        const val = target.lists[key];
                                        if (!Array.isArray(val)) {
                                            target.lists[key] = [key, []];
                                        } else if (val.length < 2 || !Array.isArray(val[1])) {
                                            target.lists[key] = [val[0] || key, []];
                                        }
                                    });
                                }
                                if (!target.blocks) return;
                                Object.values(target.blocks).forEach(block => {
                                    if (!block.inputs) return;
                                    Object.values(block.inputs).forEach(input => {
                                        // Input format: [shadow, [TYPE, VALUE]] or [1, [TYPE, VALUE]]
                                        // We are looking for the value array: [TYPE, VALUE]
                                        if (!Array.isArray(input)) return;

                                        // Iterate to find the value array (usually the last element if it's an array)
                                        input.forEach(item => {
                                            if (Array.isArray(item) && item.length >= 2) {
                                                // Check Type ID (item[0])
                                                // Valid Primitive Types: 4-10 (math/string), 11-13 (vars)
                                                const typeId = item[0];
                                                if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
                                                    const numType = parseInt(typeId, 10);
                                                    // Only convert if it looks like a primitive type ID
                                                    if (numType >= 4 && numType <= 13) {
                                                        item[0] = numType;
                                                        console.log(`Auto-Repaired JSON Type ID: "${typeId}" -> ${numType}`);
                                                    }
                                                }
                                            }
                                        });
                                    });
                                });
                            });
                            return project;
                        };

                        newProjectJson = sanitizeProjectJson(newProjectJson);

                        explanation = fullResponse.substring(0, jsonMatch.index).trim();
                        console.log("Loaded Project via Direct AI JSON");
                    } catch (e) {
                        console.error('Error parsing AI JSON:', e);
                        explanation = 'I tried to use the AI JSON, but it was invalid.';
                        newProjectJson = null;
                    }
                }

                if (explanation) {
                    explanation = explanation.replace('[SCRATCH-PROJECT-JSON]', '').trim();
                }

                const botMessage = { text: explanation, sender: 'bot' };
                this.props.onAddMessage(botMessage);

                if (newProjectJson) {
                    // SANITIZATION: Restore valid assets from original project
                    // The AI often hallucinates Asset IDs. We must replace them with valid ones.
                    try {
                        const originalProject = JSON.parse(projectJson); // Parse original string

                        if (newProjectJson.targets && originalProject.targets) {
                            newProjectJson.targets.forEach(newTarget => {
                                const originalTarget = originalProject.targets.find(t => t.name === newTarget.name && t.isStage === newTarget.isStage);
                                if (originalTarget) {
                                    // Restore Costumes and Sounds from original
                                    newTarget.costumes = originalTarget.costumes;
                                    newTarget.sounds = originalTarget.sounds;
                                } else {
                                    // New target created by AI? Needs at least one costume.
                                    // Use a minimal fallback if no costumes provided or if they assume fake MD5s.
                                    // Ideally we skip creating new sprites if we can't guarantee assets.
                                    // For now, let's just leave it (risky) or try to give it the default cat if empty.
                                    if (!newTarget.costumes || newTarget.costumes.length === 0) {
                                        newTarget.costumes = []; // Will fail validation if truly empty.
                                        // TODO: Add default blank costume?
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.error("Error restoring assets:", e);
                        // Fallback: If parsing original failed, we can't do much.
                    }

                    this.props.vm.loadProject(newProjectJson)
                        .then(() => {
                            if (!this._isMounted) return;
                            this.props.vm.refreshWorkspace();
                            this.props.onSetIsLoading(false);
                        })
                        .catch(e => {
                            if (!this._isMounted) return;
                            console.error('Error loading project:', e);
                            const errorMessage = { text: 'Failed to load the new project.', sender: 'bot' };
                            this.props.onAddMessage(errorMessage);
                            this.props.onSetIsLoading(false);
                        });
                } else {
                    if (!this._isMounted) return;
                    this.props.onSetIsLoading(false);
                }
            })
            .catch(error => {
                if (!this._isMounted) return;
                console.error('Error fetching from OpenAI API:', error);
                const botMessage = { text: 'An error occurred while contacting the AI.', sender: 'bot' };
                this.props.onAddMessage(botMessage);
                this.props.onSetIsLoading(false);
            });
    }

    // 管理者に承認されたレスポンスを処理するメソッド
    _handleApprovedResponse(fullResponse) {
        const projectJson = this.props.vm.toJSON();
        let explanation = fullResponse;
        let newProjectJson = null;

        const jsonMatch = fullResponse.match(/```json\s*(?:\[SCRATCH-PROJECT-JSON\])?\s*([\s\S]*?)```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const jsonContent = jsonMatch[1].replace(/\/\/.*$/gm, '').trim();
                newProjectJson = JSON.parse(jsonContent);

                const sanitizeProjectJson = project => {
                    if (!project || !project.targets) return project;
                    project.targets.forEach(target => {
                        // Fix variable definitions
                        if (target.variables) {
                            Object.keys(target.variables).forEach(key => {
                                const val = target.variables[key];
                                if (!Array.isArray(val)) {
                                    target.variables[key] = [key, typeof val === 'number' ? val : 0];
                                } else if (val.length < 2) {
                                    target.variables[key] = [val[0] || key, 0];
                                }
                            });
                        }
                        // Fix list definitions
                        if (target.lists) {
                            Object.keys(target.lists).forEach(key => {
                                const val = target.lists[key];
                                if (!Array.isArray(val)) {
                                    target.lists[key] = [key, []];
                                } else if (val.length < 2 || !Array.isArray(val[1])) {
                                    target.lists[key] = [val[0] || key, []];
                                }
                            });
                        }
                        if (!target.blocks) return;
                        Object.values(target.blocks).forEach(block => {
                            if (!block.inputs) return;
                            Object.values(block.inputs).forEach(input => {
                                if (!Array.isArray(input)) return;
                                input.forEach(item => {
                                    if (Array.isArray(item) && item.length >= 2) {
                                        const typeId = item[0];
                                        if (typeof typeId === 'string' && /^\d+$/.test(typeId)) {
                                            const numType = parseInt(typeId, 10);
                                            if (numType >= 4 && numType <= 13) {
                                                item[0] = numType;
                                            }
                                        }
                                    }
                                });
                            });
                        });
                    });
                    return project;
                };

                newProjectJson = sanitizeProjectJson(newProjectJson);
                explanation = fullResponse.substring(0, jsonMatch.index).trim();
            } catch (e) {
                console.error('Error parsing approved AI JSON:', e);
                newProjectJson = null;
            }
        }

        if (explanation) {
            explanation = explanation.replace('[SCRATCH-PROJECT-JSON]', '').trim();
        }

        const botMessage = { text: explanation, sender: 'bot' };
        this.props.onAddMessage(botMessage);

        if (newProjectJson) {
            try {
                const originalProject = JSON.parse(projectJson);
                if (newProjectJson.targets && originalProject.targets) {
                    newProjectJson.targets.forEach(newTarget => {
                        const originalTarget = originalProject.targets.find(
                            t => t.name === newTarget.name && t.isStage === newTarget.isStage
                        );
                        if (originalTarget) {
                            newTarget.costumes = originalTarget.costumes;
                            newTarget.sounds = originalTarget.sounds;
                        } else if (!newTarget.costumes || newTarget.costumes.length === 0) {
                            newTarget.costumes = [];
                        }
                    });
                }
            } catch (e) {
                console.error('Error restoring assets (approved):', e);
            }

            this.props.vm.loadProject(newProjectJson)
                .then(() => {
                    if (!this._isMounted) return;
                    this.props.vm.refreshWorkspace();
                })
                .catch(e => {
                    if (!this._isMounted) return;
                    console.error('Error loading approved project:', e);
                    this.props.onAddMessage({ text: 'プロジェクトの読み込みに失敗しました。', sender: 'bot' });
                });
        }
    }

    render() {
        const { inputValue } = this.state;
        const { messages, isLoading, hasConsented, pendingRequestId } = this.props;

        if (!hasConsented) {
            return (
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>{'保護者の方へ (To Parents)'}</div>
                    </div>
                    <div className={styles.body} style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#575E75' }}>
                        <p style={{ fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px' }}>
                            このAIチャット機能は、OpenAI社のサービスを利用しています。<br />
                            お子様が安全に利用できるよう対策を行っていますが、保護者の監督のもとでご利用ください。<br />
                            <br />
                            <strong>個人情報（名前、住所、電話番号など）は絶対に入力しないでください。</strong>
                        </p>
                        <button
                            className={styles.sendButton}
                            style={{ width: 'auto', padding: '10px 20px', borderRadius: '5px', color: 'white' }}
                            onClick={() => this.props.onSetHasConsented(true)}
                        >
                            {'同意して始める'}
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.container}>
                <div
                    className={styles.header}
                    onMouseDown={this.props.onDragHeader}
                    style={{ cursor: 'move' }}
                >
                    <button
                        className={styles.closeButton}
                        onClick={this.props.onClose}
                    >
                        <img
                            alt="Close Chat"
                            src={chatCloseIcon}
                            style={{ width: '24px', height: '24px' }}
                        />
                    </button>
                    <div className={styles.headerTitle}>{'AIアシスタント'}</div>
                    <button
                        className={styles.clearButton}
                        disabled={isLoading || messages.length === 0}
                        onClick={this.handleClearHistory}
                    >
                        <img
                            alt="Clear History"
                            src={trashIcon}
                            style={{ width: '20px', height: '20px' }}
                        />
                    </button>
                </div>
                <div className={styles.body}>
                    <div className={styles.messages}>
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={classNames(styles.message, styles[msg.sender])}
                            >
                                {renderMessageContent(msg.text)}
                            </div>
                        ))}
                        {isLoading && !pendingRequestId && <div className={styles.loading}>{'...'}</div>}
                    </div>
                    <div className={styles.inputContainer}>
                        <FormattedMessage
                            defaultMessage="メッセージを入力..."
                            description="Placeholder text for the chat input"
                            id="gui.chat.placeholder"
                        >
                            {placeholder => (
                                <textarea
                                    ref={this.textareaRef}
                                    className={styles.input}
                                    disabled={isLoading || !!pendingRequestId}
                                    type="text"
                                    placeholder={placeholder}
                                    value={inputValue}
                                    onChange={this.handleInputChange}
                                    onKeyDown={this.handleKeyPress}
                                />
                            )}
                        </FormattedMessage>
                        <button
                            className={styles.sendButton}
                            disabled={isLoading}
                            onClick={this.handleSend}
                        >
                            <img
                                alt="Send"
                                src={sendIcon}
                                style={{ width: '20px', height: '20px' }}
                            />
                        </button>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center', marginTop: '2.5px', marginBottom: '2.5px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 4px' }}>
                        <span>{'※AIはまちがえることがあります。'}</span>
                        <span>{'個人情報は入力しないでください。'}</span>
                    </div>
                </div>
            </div>
        );
    }
}

ChatComponent.propTypes = {
    hasConsented: PropTypes.bool,
    isLoading: PropTypes.bool,
    pendingRequestId: PropTypes.string,
    onSetHasConsented: PropTypes.func.isRequired,
    onSetIsLoading: PropTypes.func.isRequired,
    onSetPendingRequestId: PropTypes.func.isRequired,
    messages: PropTypes.arrayOf(PropTypes.shape({
        text: PropTypes.string,
        sender: PropTypes.string
    })),
    onAddMessage: PropTypes.func.isRequired,
    onClearHistory: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onDragHeader: PropTypes.func,
    vm: PropTypes.shape({
        shareBlocksToTarget: PropTypes.func,
        editingTarget: PropTypes.shape({
            id: PropTypes.string
        }),
        refreshWorkspace: PropTypes.func,
        toJSON: PropTypes.func, // Added for vm.toJSON
        loadProject: PropTypes.func // Added for vm.loadProject
    }).isRequired
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm,
    messages: state.scratchGui.chatHistory.messages,
    hasConsented: state.scratchGui.chatHistory.hasConsented,
    isLoading: state.scratchGui.chatHistory.isLoading,
    pendingRequestId: state.scratchGui.chatHistory.pendingRequestId
});

const mapDispatchToProps = (dispatch, ownProps) => ({
    onClose: ownProps.onClose || (() => dispatch(closeChat())),
    onAddMessage: message => dispatch(addMessage(message)),
    onClearHistory: () => dispatch(clearHistory()),
    onSetHasConsented: hasConsented => dispatch(setHasConsented(hasConsented)),
    onSetIsLoading: isLoading => dispatch(setIsLoading(isLoading)),
    onSetPendingRequestId: id => dispatch(setPendingRequestId(id))
});

export default connect(mapStateToProps, mapDispatchToProps)(ChatComponent);

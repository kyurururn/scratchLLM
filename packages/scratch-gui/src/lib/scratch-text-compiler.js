
import ja from 'scratchblocks/locales/ja.json';

/**
 * Compiler to convert Japanese ScratchBlocks text into Scratch Project JSON.
 */
class ScratchTextCompiler {
    constructor() {
        this.blockPatterns = [];
        this.initializePatterns();
    }

    /**
     * Parse the locale JSON to build regex patterns for each block.
     * Example: "MOTION_MOVESTEPS": "%1 歩動かす" -> /^(.+) 歩動かす$/
     */
    /**
     * Parse the locale JSON to build regex patterns for each block.
     * Example: "MOTION_MOVESTEPS": "%1 歩動かす" -> /^(.+) 歩動かす$/
     */
    initializePatterns() {
        // Known mappings from scratchblocks internal keys to VM opcodes
        this.opcodeMap = {
            'EVENT_WHENFLAGCLICKED': 'event_whenflagclicked',
            'MOTION_MOVESTEPS': 'motion_movesteps',
            'MOTION_TURNRIGHT': 'motion_turnright',
            'MOTION_TURNLEFT': 'motion_turnleft',
            'MOTION_POINTINDIRECTION': 'motion_pointindirection',
            'MOTION_POINTTOWARDS': 'motion_pointtowards',
            'MOTION_GOTO': 'motion_goto',
            'MOTION_GLIDETO': 'motion_glideto',
            'MOTION_GLIDESECSTOXY': 'motion_glidesecstoxy',
            'MOTION_CHANGEXBY': 'motion_changexby',
            'MOTION_SETX': 'motion_setx',
            'MOTION_CHANGEYBY': 'motion_changeyby',
            'MOTION_SETY': 'motion_sety',
            'MOTION_IFONEDGEBOUNCE': 'motion_ixonedgebounce',
            'MOTION_SETROTATIONSTYLE': 'motion_setrotationstyle',
            'LOOKS_SAYFORSECS': 'looks_sayforsecs',
            'LOOKS_SAY': 'looks_say',
            'LOOKS_THINKFORSECS': 'looks_thinkforsecs',
            'LOOKS_THINK': 'looks_think',
            'LOOKS_SWITCHCOSTUMETO': 'looks_switchcostumeto',
            'LOOKS_NEXTCOSTUME': 'looks_nextcostume',
            'LOOKS_SWITCHBACKDROPTO': 'looks_switchbackdropto',
            'LOOKS_NEXTBACKDROP': 'looks_nextbackdrop',
            'LOOKS_CHANGESIZEBY': 'looks_changesizeby',
            'LOOKS_SETSIZETO': 'looks_setsizeto',
            'LOOKS_CHANGEEFFECTBY': 'looks_changeeffectby',
            'LOOKS_SETEFFECTTO': 'looks_seteffectto',
            'LOOKS_CLEARGRAPHICEFFECTS': 'looks_cleargraphiceffects',
            'LOOKS_SHOW': 'looks_show',
            'LOOKS_HIDE': 'looks_hide',
            'LOOKS_GOTOFRONTBACK': 'looks_gotofrontback',
            'LOOKS_GOFORWARDBACKWARDLAYERS': 'looks_goforwardbackwardlayers',
            'SOUND_PLAYUNTILDONE': 'sound_playuntildone',
            'SOUND_PLAY': 'sound_play',
            'SOUND_STOPALLSOUNDS': 'sound_stopallsounds',
            'SOUND_CHANGEVOLUMEBY': 'sound_changevolumeby',
            'SOUND_SETVOLUMETO': 'sound_setvolumeto',
            'SOUND_CLEAREFFECTS': 'sound_cleareffects',
            'CONTROL_WAIT': 'control_wait',
            'CONTROL_REPEAT': 'control_repeat',
            'CONTROL_FOREVER': 'control_forever',
            'CONTROL_IF': 'control_if',
            'CONTROL_IF_ELSE': 'control_if_else',
            'CONTROL_WAITUNTIL': 'control_wait_until',
            'CONTROL_REPEATUNTIL': 'control_repeat_until',
            'CONTROL_STOP': 'control_stop',
            'CONTROL_STARTASCLONE': 'control_start_as_clone',
            'CONTROL_CREATECLONEOF': 'control_create_clone_of',
            'CONTROL_DELETETHISCLONE': 'control_delete_this_clone',
            'SENSING_TOUCHINGOBJECT': 'sensing_touchingobject',
            'SENSING_TOUCHINGCOLOR': 'sensing_touchingcolor',
            'SENSING_COLORISTOUCHINGCOLOR': 'sensing_coloristouchingcolor',
            'SENSING_DISTANCETO': 'sensing_distanceto',
            'SENSING_KEYPRESSED': 'sensing_keypressed',
            'SENSING_MOUSEDOWN': 'sensing_mousedown',
            'SENSING_MOUSEX': 'sensing_mousex',
            'SENSING_MOUSEY': 'sensing_mousey',
            'SENSING_SETDRAGMODE': 'sensing_setdragmode',
            'SENSING_LOUDNESS': 'sensing_loudness',
            'SENSING_TIMER': 'sensing_timer',
            'SENSING_RESETTIMER': 'sensing_resettimer',
            'SENSING_OF': 'sensing_of',
            'SENSING_CURRENT': 'sensing_current',
            'SENSING_DAYSSINCE2000': 'sensing_dayssince2000',
            'SENSING_USERNAME': 'sensing_username',
            'SENSING_ASKANDWAIT': 'sensing_askandwait',
            'SENSING_ANSWER': 'sensing_answer',
            'OPERATORS_ADD': 'operator_add',
            'OPERATORS_SUBTRACT': 'operator_subtract',
            'OPERATORS_MULTIPLY': 'operator_multiply',
            'OPERATORS_DIVIDE': 'operator_divide',
            'OPERATORS_RANDOM': 'operator_random',
            'OPERATORS_GT': 'operator_gt',
            'OPERATORS_LT': 'operator_lt',
            'OPERATORS_EQUALS': 'operator_equals',
            'OPERATORS_AND': 'operator_and',
            'OPERATORS_OR': 'operator_or',
            'OPERATORS_NOT': 'operator_not',
            'OPERATORS_JOIN': 'operator_join',
            'OPERATORS_LETTEROF': 'operator_letter_of',
            'OPERATORS_LENGTH': 'operator_length',
            'OPERATORS_CONTAINS': 'operator_contains',
            'OPERATORS_MOD': 'operator_mod',
            'OPERATORS_ROUND': 'operator_round',
            'OPERATORS_MATHOP': 'operator_mathop',
            'DATA_SETVARIABLETO': 'data_setvariableto',
            'DATA_CHANGEVARIABLEBY': 'data_changevariableby',
            'DATA_SHOWVARIABLE': 'data_showvariable',
            'DATA_HIDEVARIABLE': 'data_hidevariable',
            'PROCEDURES_DEFINITION': 'procedures_definition',
            // Reporters
            'SENSING_OF_XPOSITION': 'motion_xposition',
            'SENSING_OF_YPOSITION': 'motion_yposition',
            'SENSING_OF_DIRECTION': 'motion_direction',
            'SENSING_OF_SIZE': 'looks_size',
            'SOUND_VOLUME': 'sound_volume',
            'SENSING_LOUDNESS': 'sensing_loudness',
            'SENSING_TIMER': 'sensing_timer',
            'SENSING_ANSWER': 'sensing_answer',
            'SENSING_USERNAME': 'sensing_username',
            'SENSING_CURRENT': 'sensing_current',
            'SENSING_DAYSSINCE2000': 'sensing_dayssince2000'
        };

        // Aliases to handle variations
        this.aliases = ja.aliases || {};

        const allDefinitions = { ...ja };
        // Merge aliases into definitions map if they map to keys in ja
        Object.keys(this.aliases).forEach(alias => {
            const targetKey = this.aliases[alias];
            if (!allDefinitions[alias]) {
                allDefinitions[targetKey + '_ALIAS_' + alias] = alias; // Fake key to register pattern
            }
        });

        Object.keys(allDefinitions).forEach(key => {
            const pattern = allDefinitions[key];
            if (typeof pattern !== 'string') return;

            // Convert scratchblocks pattern (e.g. "%1 歩動かす") to Regex
            // Escape special regex chars
            let regexStr = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Allow optional whitespace for spaces in pattern
            regexStr = regexStr.replace(/ /g, '\\s*');

            // Matches %1, %2, etc. - Use lazy match
            regexStr = regexStr.replace(/%[0-9]+/g, '(.*?)');

            // Anchor to start/end of trimmed line
            regexStr = `^${regexStr}$`;

            this.blockPatterns.push({
                key: key,
                regex: new RegExp(regexStr),
                original: pattern
            });
        });

        // Add explicit alias patterns
        const manualAliases = {
            '⚑ が押されたとき': 'EVENT_WHENFLAGCLICKED',
            '⚑ がクリックされたとき': 'EVENT_WHENFLAGCLICKED',
            '(green flag) が押されたとき': 'EVENT_WHENFLAGCLICKED',
            '定義 %1': 'PROCEDURES_DEFINITION'
        };

        // Custom handling for 'My Blocks' / Definition
        this.blockPatterns.push({
            key: 'PROCEDURES_DEFINITION',
            regex: /^定義\s*(.*?)$/,
            original: '定義 %1'
        });

        // Merge manual aliases into this.aliases
        Object.assign(this.aliases, manualAliases);

        Object.keys(this.aliases).forEach(aliasPattern => {
            if (aliasPattern.includes('定義')) return; // handled above

            let regexStr = aliasPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regexStr = regexStr.replace(/ /g, '\\s*');
            regexStr = regexStr.replace(/%[0-9]+/g, '(.*?)');
            regexStr = `^${regexStr}$`;

            this.blockPatterns.push({
                key: this.aliases[aliasPattern], // Map directly to the target key
                regex: new RegExp(regexStr),
                original: aliasPattern
            });
        });

        // Add "End" definition for C-blocks
        this.blockPatterns.push({
            key: 'END',
            regex: /^エンド$/,
            original: 'end'
        });

        // Add "Else" definition
        this.blockPatterns.push({
            key: 'CONTROL_ELSE',
            regex: /^でなければ$/,
            original: 'else'
        });
    }

    getVmOpcode(key) {
        if (this.opcodeMap[key]) return this.opcodeMap[key];
        // Heuristic: motion_movesteps
        // Key is often MOTION_MOVESTEPS
        return key.toLowerCase();
    }

    uid() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Compile text to JSON
     * @param {string} text 
     */
    compile(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        const project = {
            targets: [{
                isStage: false,
                name: "Sprite1",
                variables: {},
                lists: {},
                broadcasts: {},
                blocks: {},
                currentCostume: 0,
                costumes: [],
                sounds: []
            }],
            meta: {
                semver: "3.0.0",
                vm: "0.2.0"
            },
            extensions: []
        };
        const blocks = project.targets[0].blocks;
        const variables = project.targets[0].variables;

        let parentStack = []; // Parsing stack for nesting
        let lastBlockId = null; // Previous block at current level

        // Helper to push a new block
        const addBlock = (opcode, inputs = {}, fields = {}, isHat = false, shadow = false) => {
            const id = this.uid();
            const block = {
                opcode: opcode,
                next: null,
                parent: null,
                inputs: inputs,
                fields: fields,
                shadow: shadow,
                topLevel: isHat
            };

            if (isHat) {
                block.x = 0;
                block.y = 0;
            } else {
                if (lastBlockId) {
                    // Link from previous block
                    blocks[lastBlockId].next = id;
                    block.parent = lastBlockId;
                } else if (parentStack.length > 0) {
                    // First block in a C-block substack
                    const parent = parentStack[parentStack.length - 1];
                    // parent.substackInputName needs to be set. 
                    // Usually SUBSTACK or SUBSTACK2 (for if-else)
                    const substackName = parent.nextInputName || "SUBSTACK";

                    // If input doesn't exist, create it
                    if (!blocks[parent.id].inputs[substackName]) {
                        blocks[parent.id].inputs[substackName] = [2, id];
                    }
                    block.parent = parent.id;

                    // Clear the nextInputName so subsequent blocks don't overwrite
                    if (parent.nextInputName) delete parent.nextInputName;
                }
            }

            blocks[id] = block;
            lastBlockId = id;
            return id;
        };

        for (let line of lines) {
            // Check for END
            if (line === 'エンド' || line === 'end') {
                if (parentStack.length > 0) {
                    const popped = parentStack.pop();
                    lastBlockId = popped.id; // Resume from parent
                    continue;
                }
            }
            // Check for ELSE
            if (line === 'でなければ' || line === 'else') {
                if (parentStack.length > 0) {
                    // Switch to the second substack of the current parent (If block)
                    const parent = parentStack[parentStack.length - 1];
                    // Typically 'control_if_else' uses 'SUBSTACK2'
                    parent.nextInputName = "SUBSTACK2";
                    lastBlockId = null; // Reset last block for new substack
                    continue;
                }
            }

            let match = null;
            let matchedKey = null;

            // Find matching block
            for (let p of this.blockPatterns) {
                const m = line.match(p.regex);
                if (m) {
                    match = m;
                    matchedKey = p.key;
                    break;
                }
            }

            if (!matchedKey) {
                // Try manual "raw" match for (10) 歩動かす style if standard failed?
                // But generally regex should catch it.
                // Check if line is just "end" or "else" case-insensitive?
                if (line.match(/^end|エンド$/i)) matchedKey = 'END';
                else if (line.match(/^else|でなければ$/i)) matchedKey = 'CONTROL_ELSE';
                else {
                    console.warn(`No match found for line: ${line}`);
                    continue;
                }
            }

            // Handle END
            if (matchedKey === 'END') {
                if (parentStack.length > 0) {
                    const popped = parentStack.pop();
                    lastBlockId = popped.id;
                    continue;
                }
                continue;
            }

            // Handle ELSE
            if (matchedKey === 'CONTROL_ELSE') {
                if (parentStack.length > 0) {
                    const parent = parentStack[parentStack.length - 1];
                    parent.nextInputName = "SUBSTACK2";
                    lastBlockId = null;
                    continue;
                }
                continue;
            }

            const opcode = this.getVmOpcode(matchedKey);
            const args = match ? match.slice(1) : [];

            // Determine Inputs/Fields based on Opcode (Heuristic or Table)
            // This is the tricky part: Mapping extracted "10" to "STEPS" or "DEGREES"
            // For now, we will use a generic "ARG0", "ARG1" approach if mapped, or simple mapping for common blocks

            const inputs = {};
            const fields = {};

            // Simple Argument Mapper
            const processArg = (val) => {
                val = val.trim();

                // Handle ( ) - Number, Reporter, or Variable
                if (val.startsWith('(') && val.endsWith(')')) {
                    const inner = val.slice(1, -1).trim();

                    // 1. Check if it's a number
                    if (!isNaN(inner) && inner !== '') {
                        return [1, [10, inner]]; // Number primitive
                    }

                    // 2. Check if it matches a known Reporter Block (e.g. "x座標")
                    let reporterMatch = null;
                    let reporterKey = null;
                    for (let p of this.blockPatterns) {
                        const m = inner.match(p.regex);
                        if (m) {
                            reporterMatch = m;
                            reporterKey = p.key;
                            break;
                        }
                    }

                    if (reporterMatch && reporterKey) {
                        // It's a reporter! Compile it recursively-ish
                        const reporterOpcode = this.getVmOpcode(reporterKey);
                        const reporterArgs = reporterMatch.slice(1);

                        // Recursively process args for the reporter? 
                        // For simplicity, assume reporters here are simple (no nested args) or handle basic cases
                        // Note: To support nested reporters properly, we need full recursion. 
                        // Current regex approach captures "inner" which might contain parens.
                        // Ideally we'd recursively `processArg` on capture groups.

                        const repInputs = {};
                        const repFields = {};

                        // Quick check for variable reporter?
                        // If reporterKey is 'DATA_SHOWVARIABLE' -> No, that's Stack.
                        // Reporters are usually SENSING, OPERATORS, DATA (val).

                        const repId = addBlock(reporterOpcode, repInputs, repFields, false, true); // shadow=true? No, standard block = false. 
                        // Actually standard inputs use [3, ID, [10, ""]] for blocks plugging into inputs
                        // But [2, ID] works too. Unshadowed.
                        // Let's return the Input array format.
                        return [3, repId, [10, ""]]; // Block covering empty number primitive
                    }

                    // 3. Assume it's a Variable
                    // Create variable if not exists (handled by addBlock/fields logic? No, explicit here)
                    const varName = inner;
                    const varId = 'var_' + varName;
                    variables[varId] = [varName, 0];

                    // Create data_variable block
                    // Opcode: data_variable ? No, looks like it's a reporter block usually.
                    // Actually, getting a variable value is usually done via `data_variable` block in VM?
                    // Let's check scratch-vm specs. `data_variable` is the opcode for the reporter.
                    // Arguments: FIELD "VARIABLE" referencing the var.

                    const varBlockId = this.uid();
                    blocks[varBlockId] = {
                        opcode: 'data_variable',
                        next: null,
                        parent: null,
                        inputs: {},
                        fields: { "VARIABLE": [varName, varId] },
                        shadow: false,
                        topLevel: false
                    };
                    return [3, varBlockId, [10, ""]];
                }

                // Handle [ ] - String or Menu
                if (val.startsWith('[') && val.endsWith(']')) {
                    const inner = val.slice(1, -1);
                    // Check for " v" suffix for dropdowns
                    // Logic: "option v" -> Field "option"
                    if (inner.endsWith(' v')) {
                        const fieldVal = inner.replace(' v', '');
                        return { type: 'field', value: fieldVal };
                    }
                    // Regular string
                    return [1, [10, inner]];
                }

                // Fallback (Raw text)
                if (!isNaN(val)) return [1, [10, val]];
                return [1, [10, val]];
            };

            // Mapping definitions for Input names
            let inputNames = [];
            let fieldNames = [];

            if (matchedKey === 'MOTION_MOVESTEPS') inputNames = ['STEPS'];
            if (matchedKey === 'MOTION_TURNRIGHT') inputNames = ['DEGREES'];
            if (matchedKey === 'MOTION_TURNLEFT') inputNames = ['DEGREES'];
            if (matchedKey === 'LOOKS_SAYFORSECS') inputNames = ['MESSAGE', 'SECS'];
            if (matchedKey === 'LOOKS_SAY') inputNames = ['MESSAGE'];
            if (matchedKey === 'EVENT_WHENFLAGCLICKED') { /* Hat */ }
            if (matchedKey === 'CONTROL_WAIT') inputNames = ['DURATION'];
            if (matchedKey === 'CONTROL_REPEAT') inputNames = ['TIMES'];

            // Assign args
            args.forEach((arg, i) => {
                const processed = processArg(arg);
                const inputName = inputNames[i] || `NUM${i + 1}`; // Fallback

                if (processed.type === 'field') {
                    // It's a field
                    let fieldName = inputName;
                    if (matchedKey.includes('VARIABLE')) fieldName = 'VARIABLE';
                    // Handle variable creation
                    if (fieldName === 'VARIABLE') {
                        const varName = processed.value;
                        const varId = 'var_' + varName;
                        variables[varId] = [varName, 0];
                        fields[fieldName] = [varName, varId];
                    } else {
                        fields[fieldName] = [processed.value, null];
                    }
                } else {
                    inputs[inputName] = processed;
                }
            });

            // Special handling for Hat blocks
            const isHat = opcode.startsWith('event_') || opcode === 'control_start_as_clone';

            // Special handling for C-blocks
            const isCBlock = opcode === 'control_forever' || opcode === 'control_repeat' || opcode === 'control_if' || opcode === 'control_if_else' || opcode === 'control_repeat_until';

            const newBlockId = addBlock(opcode, inputs, fields, isHat);

            if (isCBlock) {
                parentStack.push({ id: newBlockId, nextInputName: 'SUBSTACK' });
                lastBlockId = null; // Start of substack
            }
        }

        return project;
    }
}

export default new ScratchTextCompiler();

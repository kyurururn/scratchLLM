import {applyMiddleware, compose, combineReducers} from 'redux';
import alertsReducer, {alertsInitialState} from './alerts.js';
import assetDragReducer, {assetDragInitialState} from './asset-drag.js';
import cardsReducer, {cardsInitialState} from './cards.js';
import colorPickerReducer, {colorPickerInitialState} from './color-picker.js';
import connectionModalReducer, {connectionModalInitialState} from './connection-modal.js';
import customProceduresReducer, {customProceduresInitialState} from './custom-procedures.js';
import blockDragReducer, {blockDragInitialState} from './block-drag.js';
import editorTabReducer, {editorTabInitialState} from './editor-tab.js';
import hoveredTargetReducer, {hoveredTargetInitialState} from './hovered-target.js';
import menuReducer, {menuInitialState} from './menus.js';
import micIndicatorReducer, {micIndicatorInitialState} from './mic-indicator.js';
import modalReducer, {modalsInitialState} from './modals.js';
import modeReducer, {modeInitialState} from './mode.js';
import monitorReducer, {monitorsInitialState} from './monitors.js';
import monitorLayoutReducer, {monitorLayoutInitialState} from './monitor-layout.js';
import projectChangedReducer, {projectChangedInitialState} from './project-changed.js';
import projectStateReducer, {projectStateInitialState} from './project-state.js';
import projectTitleReducer, {projectTitleInitialState} from './project-title.js';
import fontsLoadedReducer, {fontsLoadedInitialState} from './fonts-loaded.js';
import restoreDeletionReducer, {restoreDeletionInitialState} from './restore-deletion.js';
import stageSizeReducer, {stageSizeInitialState} from './stage-size.js';
import targetReducer, {targetsInitialState} from './targets.js';
import themeReducer, {themeInitialState} from './theme.js';
import timeoutReducer, {timeoutInitialState} from './timeout.js';
import timeTravelReducer, {timeTravelInitialState} from './time-travel.js';
import toolboxReducer, {toolboxInitialState} from './toolbox.js';
import vmReducer, {vmInitialState} from './vm';
import vmStatusReducer, {vmStatusInitialState} from './vm-status.js';
import workspaceMetricsReducer, {workspaceMetricsInitialState} from './workspace-metrics.js';
import throttle from 'redux-throttle';

import decks from '../lib/libraries/decks/index.jsx';
import { GUIConfig } from '../gui-config.js';

const guiMiddleware = compose(applyMiddleware(throttle(300, {leading: true, trailing: true})));

const buildInitialState = (config: GUIConfig) => ({
    alerts: alertsInitialState,
    assetDrag: assetDragInitialState,
    blockDrag: blockDragInitialState,
    cards: cardsInitialState,
    colorPicker: colorPickerInitialState,
    config,
    connectionModal: connectionModalInitialState,
    customProcedures: customProceduresInitialState,
    editorTab: editorTabInitialState,
    mode: modeInitialState,
    hoveredTarget: hoveredTargetInitialState,
    stageSize: stageSizeInitialState,
    menus: menuInitialState,
    micIndicator: micIndicatorInitialState,
    modals: modalsInitialState,
    monitors: monitorsInitialState,
    monitorLayout: monitorLayoutInitialState,
    projectChanged: projectChangedInitialState,
    projectState: projectStateInitialState,
    projectTitle: projectTitleInitialState,
    fontsLoaded: fontsLoadedInitialState,
    restoreDeletion: restoreDeletionInitialState,
    targets: targetsInitialState,
    theme: themeInitialState,
    timeout: timeoutInitialState,
    timeTravel: timeTravelInitialState,
    toolbox: toolboxInitialState,
    vm: vmInitialState(config),
    vmStatus: vmStatusInitialState,
    workspaceMetrics: workspaceMetricsInitialState
});

const initPlayer = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            isFullScreen: currentState.mode.isFullScreen,
            isPlayerOnly: true,
            // When initializing in player mode, make sure to reset
            // hasEverEnteredEditorMode
            hasEverEnteredEditor: false
        }}
    );
};
const initFullScreen = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            isFullScreen: true,
            isPlayerOnly: currentState.mode.isPlayerOnly,
            hasEverEnteredEditor: currentState.mode.hasEverEnteredEditor
        }}
    );
};

const initEmbedded = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {mode: {
            showBranding: true,
            isFullScreen: true,
            isPlayerOnly: true,
            hasEverEnteredEditor: false
        }}
    );
};

const initTutorialCard = function (currentState, deckId) {
    return Object.assign(
        {},
        currentState,
        {
            cards: {
                visible: true,
                content: decks,
                activeDeckId: deckId,
                expanded: true,
                step: 0,
                x: 0,
                y: 0,
                dragging: false
            }
        }
    );
};

const initTelemetryModal = function (currentState) {
    return Object.assign(
        {},
        currentState,
        {
            modals: {
                telemetryModal: true // this key must match `MODAL_TELEMETRY` in modals.js
            }
        }
    );
};

const configReducer = function (state: GUIConfig, _action: unknown) {
    if (typeof state === 'undefined') return null;

    return state;
};

const guiReducer = combineReducers({
    alerts: alertsReducer,
    assetDrag: assetDragReducer,
    blockDrag: blockDragReducer,
    cards: cardsReducer,
    colorPicker: colorPickerReducer,
    connectionModal: connectionModalReducer,
    config: configReducer,
    customProcedures: customProceduresReducer,
    editorTab: editorTabReducer,
    mode: modeReducer,
    hoveredTarget: hoveredTargetReducer,
    stageSize: stageSizeReducer,
    menus: menuReducer,
    micIndicator: micIndicatorReducer,
    modals: modalReducer,
    monitors: monitorReducer,
    monitorLayout: monitorLayoutReducer,
    projectChanged: projectChangedReducer,
    projectState: projectStateReducer,
    projectTitle: projectTitleReducer,
    fontsLoaded: fontsLoadedReducer,
    restoreDeletion: restoreDeletionReducer,
    targets: targetReducer,
    theme: themeReducer,
    timeout: timeoutReducer,
    timeTravel: timeTravelReducer,
    toolbox: toolboxReducer,
    vm: vmReducer,
    vmStatus: vmStatusReducer,
    workspaceMetrics: workspaceMetricsReducer
});

export {
    guiReducer as default,
    buildInitialState,
    guiMiddleware,
    initEmbedded,
    initFullScreen,
    initPlayer,
    initTelemetryModal,
    initTutorialCard
};

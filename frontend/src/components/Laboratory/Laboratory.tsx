
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import SampleAnchor from "../Laboratory/SampleAnchor/SampleAnchor";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import Notification from "../Notification/Notification";
import ResetLabNode from "../Laboratory/ActionNodes/resetNode/ResetLabNode";
import DownloadNode from "../Laboratory/ActionNodes/downloadNode/DownloadNode";
import ManualNode from "../Laboratory/ActionNodes/manualNode/ManualNode";
import RecoveryMode from "../Laboratory/ActionNodes/recoveryNode/RecoveryNode";
import SaveSessionNode from "../Laboratory/ActionNodes/saveSessionNode/SaveSessionNode";
import ReentryObjNode from "../Laboratory/ActionNodes/reentryNode/ReentryObjNode";
import {useSelector, useDispatch} from "react-redux";
import {useState, useRef, useEffect} from "react";
import type {RootState, AppDispatch} from "../../store/store";
import type { LaboratoryMode } from "../../features/laboratory/LaboratoryMode";
import {
        clearLaboratory,
        clearNotification,
        loadFirstSample,
        loadSecondSample,
        startupCompleted,
        revealingStarted,
        resetProcessStarted,
        resetLabStarted,
        reentryObjOpened,
        reentryObjClosed,
        operationSelected,

    } from "../../features/laboratory/laboratorySlice";

import {
    activeLab,
    validateAndProcessReentry,
    resumeProcess,

    } from "../../features/laboratory/laboratoryThunks";

import styles from "./Laboratory.module.css";

import { saveSession } from "../../services/saveSession";

import  { downloadSession } from "../../services/downloadSession";

import SessionSavedMessage from "../MessageHandler/SessionSavedMessage";

import { createLabContext } from "./labContext";

import { startOperation, retryOperation } from "./labOpController";

import { registerLaboratoryEffects } from "./labEffectsController";

export default function Laboratory() {

    const dispatch = useDispatch<AppDispatch>();

    const {

        phase,

        operation,

        operationPhase,

        samples,

        resultImage,

        resultVisible,

        resultMetadata,

        notification,

        reentryObjVisible,

    } = useSelector(

        (state:RootState) => state.laboratory);

    const [firstFile, setFirstFile] = useState<File | null>(null);

    const [secondFile, setSecondFile] = useState<File | null >(null);

    const [sessionSaved, setSessionSaved] = useState(false);

    const [reentryPending, setReentryPending] = useState(false);

    const [mode, setMode] = useState<LaboratoryMode>("stateless");

    const labContext = createLabContext (
        operation,
        mode,
        firstFile,
        secondFile,
    );

    const handleAxisRevealEnd = async () => {

        try {

            await startOperation(
                    labContext,
                    dispatch
                );
        } catch(error) {

            console.error(
                "Failed to start processing:",
                error
            );

            }
        };

    const hiddenSamples = useRef(
    new Set<"left" | "right">()
    );

    const handleSampleHideComplete = (
    side: "left" | "right"
    ) => {

        hiddenSamples.current.add(side);

        if (
        hiddenSamples.current.has("left") &&
        hiddenSamples.current.has("right")
        ) {
        dispatch(revealingStarted());
        }

    };

    const handleFirstSample = (file:File | null) => {

        if (!file) return;

        setFirstFile(file);

        dispatch(loadFirstSample());
    };

    const handleSecondSample = (file: File | null) => {

        if (!file) return;

        hiddenSamples.current.clear();

        setSecondFile(file);

        dispatch(loadSecondSample());
    };

    const handleCoreClick = () => {

        if (notification?.type === "error") {

            handleResetComplete();

            return;
        }

        dispatch(activeLab());
    };

    const handleResetComplete = () => {

        setFirstFile(null);
        setSecondFile(null);

        dispatch(clearLaboratory());
        dispatch(clearNotification());

    };

    const handleSaveSession = async () => {

        if (operationPhase !== "offline") {

            return;

        }

        if (!labContext.firstFile || !labContext.secondFile ){
            return;
        }

        try {
            const {file, id} = await saveSession(
                labContext.firstFile,
                labContext.secondFile
            );

            downloadSession(file, id);
            setSessionSaved(true);

            console.log(
                ">>> Session generated:",
                file.size,
                "bytes"
            );

        } catch (error) {
                console.error(
                    ">>> Failed to save session:",
                    error
                );
            }
        };

    const handleReset = () => {

        setFirstFile(null);
        setSecondFile(null);

        if (operationPhase === "offline") {

            dispatch(resetProcessStarted());

        } else {

            setMode("stateless");
            setReentryPending(false);
            dispatch(resetLabStarted());
        }
    };

    const handleManualRetry = async () => {

        if (!labContext.firstFile || !labContext.secondFile) {
            return;
        }

        try {

            await retryOperation(
                labContext,
                dispatch
            );

        } catch (error) {

            console.error(
                "Failed to retry operation:",
                error
            );
        }
    };

   const handleReentry = async (file: File | null ) => {

        if (!file) return;

        console.log(">> REENTRY FILE:", file);

        try {

            const result = await dispatch(
                validateAndProcessReentry(file)
            )

            setFirstFile(result.firstFile);
            setSecondFile(result.secondFile);

            dispatch(operationSelected(result.operation));

            setMode("reentry");

            setReentryPending(true)

        } catch (error) {
                console.error(error);
            }
    };

    const view = {

    areSamplesVisible:
        phase === "activated" ||
        (
            phase === "synchronizing" &&
                (
                operationPhase !== "idle" &&
                operationPhase !== "accelerating"
            )
        ),

    isProcessing:
        phase === "processing",

        };

   useEffect(() => {

       return registerLaboratoryEffects(dispatch);

    }, [dispatch]);


    useEffect(() => {

    if (!firstFile || !secondFile) {
        return;
    }

    dispatch(startupCompleted());

    }, [firstFile, secondFile, dispatch]);


    useEffect(() => {

    let waitingForOpen = false;

    const handleKeyDown = (event: KeyboardEvent) => {

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "r"
        ) {
            event.preventDefault();

            waitingForOpen = true;

            return;
        }

        if (
            waitingForOpen &&
            event.key.toLowerCase() === "o"
        ) {
            event.preventDefault();

            waitingForOpen = false;

            dispatch(reentryObjOpened());
        }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
        window.removeEventListener("keydown", handleKeyDown);
        };

    }, []);

    useEffect(() => {

    if (!reentryPending) {
        return;
    }

    if (!labContext.firstFile || !labContext.secondFile) {
        return;
    }

    const runReentry = async () => {

        console.log(
            ">>> REENTRY EFFECT:",
            labContext
        );

        try {

            const result = await retryOperation(
                labContext,
                dispatch
            );

            if (result === "success") {

                setReentryPending(false);

                dispatch(reentryObjClosed());
            }

        } catch (error) {

            console.error(
                "Failed to execute reentry:",
                error
                );

            }

        };

        void runReentry();

        }, [
            reentryPending,
            labContext,
            dispatch,
        ]);

        return (

        <Layout phase={phase} operationPhase={operationPhase}>

            <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            operationPhase={operationPhase}
            onAxisRevealEnd={handleAxisRevealEnd}
            />

          <Core
          phase={phase}
          operationPhase={operationPhase}
          onResetComplete={handleResetComplete}
          onClick={handleCoreClick}
            />

        <SampleAnchor
            side="left"
            visible={view.areSamplesVisible}
            phase={phase}
            floating={!samples.firstLoaded && !view.isProcessing}
            onHideComplete={handleSampleHideComplete}
            >
            <SampleNode
            phase={phase}
            loaded={samples.firstLoaded}
            label="Sample 01"
            onFileSelected={handleFirstSample}
            />

        </SampleAnchor>

        <SampleAnchor
            side="right"
            visible={view.areSamplesVisible}
            phase={phase}
            floating={!samples.secondLoaded && !view.isProcessing}
            onHideComplete={handleSampleHideComplete}
            >
            <SampleNode
            phase={phase}
            loaded={samples.secondLoaded}
            label="Sample 02"
            onFileSelected={handleSecondSample}
            />

        </SampleAnchor>

        </Scene>

        <Notification
        phase={phase}
        notification={notification}
        operationPhase={operationPhase}
        visible={
            operationPhase === "reconnecting" ||
            operationPhase === "offline" ||
            notification?.type === "error" ||
            (
            notification?.type === "success" &&
            phase === "result" &&
            operationPhase === "completed" &&
            resultVisible
            )
        }

        />

        <ReactionPanel
        phase={phase}
        operationPhase={operationPhase}
        visible={phase === "result" &&
            operationPhase === "completed" &&
            resultVisible}
        resultUrl={resultImage}
        metadata={resultMetadata}
        />

        <ResetLabNode
            phase={phase}
            operationPhase={operationPhase}
            visible={
                phase !== "resettingLab" &&
                phase !== "resettingProcess" &&
                (
                    (phase === "result" &&
                    operationPhase === "completed" &&
                    resultVisible) ||
                    notification?.type === "error"
                    )
                }
                onClick={handleReset}
            />
        <DownloadNode
        phase={phase}
        operationPhase={operationPhase}
        visible={phase === "result" &&
            operationPhase === "completed" &&
            resultVisible}
        resultUrl={resultImage}
        />

        <SaveSessionNode
        phase={phase}
        operationPhase={operationPhase}
        visible={operationPhase === "offline"}
        onClick={handleSaveSession}
        />

        <ManualNode
        phase={phase}
        operationPhase={operationPhase}
        visible={operationPhase === "offline"}
        onClick={handleManualRetry}
        onResetComplete={handleResetComplete}
        />

        <RecoveryMode
        operationPhase={operationPhase}
        visible={operationPhase ==="reconnecting"}
        />

        {sessionSaved && (
           <SessionSavedMessage
                onReset={() => {
                    setSessionSaved(false);
                    handleReset();
                }}
                onContinue={() => setSessionSaved(false)}
        />

        )}

        <ReentryObjNode
            visible={reentryObjVisible}
            onFileSelected={handleReentry}
        />

    </section>

    </Layout>
  );
}

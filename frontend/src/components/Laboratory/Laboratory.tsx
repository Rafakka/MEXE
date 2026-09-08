
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
import {useSelector, useDispatch} from "react-redux";
import {useState, useRef, useEffect} from "react";
import type {RootState, AppDispatch} from "../../store/store";
import {
        clearLaboratory,
        clearNotification,
        loadFirstSample,
        loadSecondSample,
        startupCompleted,
        revealingStarted,
        resetProcessStarted,
        resetLabStarted,


    } from "../../features/laboratory/laboratorySlice";

import { registerProcess, unregisterProcess } from "../../resilience/processRegistry";

import { activeLab, startProcessing, manualRetry, performMerge,  } from "../../features/laboratory/laboratoryThunks";

import styles from "./Laboratory.module.css";

export default function Laboratory() {

    const dispatch = useDispatch<AppDispatch>();

    const {

        phase,

        operationPhase,

        samples,

        resultImage,

        resultVisible,

        resultMetadata,

        notification,

    } = useSelector(

        (state:RootState) => state.laboratory

    );

    const [firstFile, setFirstFile] = useState<File | null>(null);

    const [secondFile, setSecondFile] = useState<File | null >(null);

    const handleAxisRevealEnd = () => {

        if (!firstFile || !secondFile) {

            return;

        }

        dispatch(
            startProcessing(
                firstFile,
                secondFile
                )
            );
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

    const handleReset = () => {

        setFirstFile(null);
        setSecondFile(null);

        if (operationPhase === "offline") {
            dispatch(resetProcessStarted());
        } else {
            dispatch(resetLabStarted());
        }
    };

    const handleManualRetry = () => {

        if (!firstFile || !secondFile) {
            return;
        }

        dispatch(
            manualRetry()
        );
    };

    const view = {

    areSamplesVisible:
        phase === "activated",

    isProcessing:
        phase === "processing",

    };

    useEffect(() => {

    if (!firstFile || !secondFile) {
        return;
    }

    registerProcess("blend", async () => {

        await dispatch(
            performMerge(
                firstFile,
                secondFile
            )
        );

    });

    return () => {
        unregisterProcess("blend");
    };

    }, [firstFile, secondFile, dispatch]);

    useEffect(() => {

    if (!firstFile || !secondFile) {
        return;
    }

    dispatch(startupCompleted());

    }, [firstFile, secondFile, dispatch]);

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

    </section>

    </Layout>
  );
}

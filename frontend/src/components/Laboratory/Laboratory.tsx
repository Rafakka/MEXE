
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
import {useSelector, useDispatch} from "react-redux";
import {useState, useRef, useEffect} from "react";
import type {RootState, AppDispatch} from "../../store/store";
import {
        clearLaboratory,
        clearNotification,
        loadFirstSample,
        loadSecondSample,
        startupCompleted,
        revealingStarted

    } from "../../features/laboratory/laboratorySlice";

import { activeLab, startProcessing } from "../../features/laboratory/laboratoryThunks";

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


    const [isResetting, setIsResetting] = useState(false);

    const [firstFile, setFirstFile] = useState<File | null>(null);

    const [secondFile, setSecondFile] = useState<File | null >(null);

    const handleAxisRevealEnd = () => {

        console.log("AXIS REVEAL END");
        console.log("FIRST FILE:", firstFile?.name);
        console.log("SECOND FILE:", secondFile?.name);

        if (!firstFile || !secondFile) {

            console.log("BLOCKED: missing file");

            return;

        }

        console.log("STARTING PROCESSING");

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

        console.log("FIRST FILE SELECTED:", file.name);

        setFirstFile(file);

        dispatch(loadFirstSample());
    };

    const handleSecondSample = (file: File | null) => {

        if (!file) return;

        console.log("SECOND FILE SELECTED:", file.name);

        console.log("FIRST FILE BEFORE SECOND:", firstFile);

        hiddenSamples.current.clear();

        setSecondFile(file);

        dispatch(loadSecondSample());
    };

    const handleCoreClick = () => {

        dispatch(activeLab());
    };

    const handleReset = () => {

        setFirstFile(null);
        setSecondFile(null);

        setIsResetting(true);
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
          resetting={isResetting}
          onResetComplete={()=> {

              dispatch(clearLaboratory());
              dispatch(clearNotification());
              setIsResetting(false);
          }}
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
        visible={phase === "result" &&
            operationPhase === "completed" &&
            resultVisible}
        resetting={isResetting}
        />

        <ReactionPanel
        phase={phase}
        operationPhase={operationPhase}
        visible={phase === "result" &&
            operationPhase === "completed" &&
            resultVisible}
        resultUrl={resultImage}
        metadata={resultMetadata}
        resetting={isResetting}
        />

        <ResetLabNode
        phase={phase}
        operationPhase={operationPhase}
        visible={phase === "result" &&
            operationPhase === "completed" &&
            resultVisible}
        resetting={isResetting}
        onClick={handleReset}

        />

        <DownloadNode
        phase={phase}
        operationPhase={operationPhase}
        visible={phase === "result" &&
            operationPhase === "completed" &&
            resultVisible}
        resetting={isResetting}
        resultUrl={resultImage}
        />

    </section>

    </Layout>
  );
}

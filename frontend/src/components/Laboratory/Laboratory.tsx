
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
import {useState} from "react";
import type {RootState, AppDispatch} from "../../store/store";
import {
        clearLaboratory,
        clearNotification,
        loadFirstSample,
        loadSecondSample,

    } from "../../features/laboratory/laboratorySlice";

import { activeLab, tryStartExperiment } from "../../features/laboratory/laboratoryThunks";

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

    const handleFirstSample = (file:File | null) => {

        if (!file) return;

        dispatch(loadFirstSample(file));

        dispatch(tryStartExperiment());
    };

    const handleSecondSample = (file:File | null) => {
        if(!file) return;

        dispatch(loadSecondSample(file));

        dispatch(tryStartExperiment());
    };

    const handleCoreClick = () => {

        dispatch(activeLab());
    };

    const handleReset = () => {

        setIsResetting(true);
    };

    const view = {

    areSamplesVisible:
        phase === "activated" ||
        phase === "synchronizing",

    isProcessing:
        phase === "processing",

    };

        return (

        <Layout phase={phase} operationPhase={operationPhase}>

            <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            operationPhase={operationPhase}
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

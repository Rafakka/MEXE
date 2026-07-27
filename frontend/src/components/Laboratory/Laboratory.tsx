
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
import type {RootState, AppDispatch} from "../../store/store";
import {
        clearLaboratory,
        loadFirstSample,
        loadSecondSample,

    } from "../../features/laboratory/laboratorySlice";

import { runExperiment } from "../../features/laboratory/laboratoryThunks";

import styles from "./Laboratory.module.css";

export default function Laboratory() {

    const dispatch = useDispatch<AppDispatch>();

    const {

        phase,

        operationPhase,

        samples,

        mergeResult,

        resultVisible,

        notification,

    } = useSelector(

        (state:RootState) => state.laboratory

    );

    const handleFirstSample = (file:File) => {

        dispatch(loadFirstSample(file));
    };

    const handleSecondSample = (file:File) => {

        dispatch(loadSecondSample(file));
    };

    const handleCoreClick = () => {

        if (phase !== "idle") return;

        dispatch(runExperiment());
    };

    const handleReset = () => {

    dispatch(clearLaboratory());


    };

    const view = {

    areSamplesVisible:
        phase === "activated" ||
        phase === "synchronizing",

    isProcessing:
        phase === "processing",

    };
        return (

        <Layout phase={phase}>

            <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            phase={phase}
            operationPhase={operationPhase}
            />

          <Core
          phase={phase}
          operationPhase={operationPhase}
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
        notification={notification}
        />

        <ReactionPanel
        phase={phase}
        visible={resultVisible}
        result={mergeResult}
        />

        <ResetLabNode
        phase={phase}
        visible={resultVisible}
        onClick={handleReset}
        />

        <DownloadNode
        phase={phase}
        visible={resultVisible}
        onClick={() => {
        }}
        />

    </section>

    </Layout>
  );
}

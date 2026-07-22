
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import SampleAnchor from "../Laboratory/SampleAnchor/SampleAnchor";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import {useEffect} from "react";
import {mergeImages} from "../../services/merge/mergeImages";
import ResetLabNode from "../Laboratory/ActionNodes/resetNode/ResetLabNode";
import DownloadNode from "../Laboratory/ActionNodes/downloadNode/DownloadNode";
import {useSelector, useDispatch} from "react-redux";
import type {RootState, AppDispatch} from "../../store/store";
import {

        setPhase,
        clearLaboratory,
        setStartupFinished,
        setOperationPhase,
        setMergeResult,
        loadFirstSample,
        loadSecondSample,

    } from "../../features/laboratory/laboratorySlice";

import styles from "./Laboratory.module.css";

const STARTUP_DURATION = 2600;
const SYNCHRONIZING_DURATION = 2200;

export default function Laboratory() {

    const dispatch = useDispatch<AppDispatch>();

    const phase = useSelector(

    (state: RootState) => state.laboratory.phase

    );

    const startupFinished = useSelector(
    (state: RootState) => state.laboratory.startupFinished
    );

    const operationPhase = useSelector(
    (state: RootState) => state.laboratory.operationPhase
    );

    const samples = useSelector(
    (state: RootState) => state.laboratory.samples
    );

    const mergeResult = useSelector(
    (state: RootState) => state.laboratory.mergeResult
    );

    const isReadyToProcess =
        samples.firstLoaded && samples.secondLoaded;

    useEffect(() => {
        if (phase !== "activated") return;

        const timer = setTimeout(() => {

        dispatch(setStartupFinished(true));

        }, STARTUP_DURATION);

        return () => clearTimeout(timer);

        }, [phase]);

    useEffect(() => {

        if (

            phase !== "activated" ||

            !startupFinished ||

            !isReadyToProcess

        ) return;

        dispatch(setPhase("synchronizing"));

        }, [

            phase,

            startupFinished,

            isReadyToProcess,

        ]);

    useEffect(() => {

        if (phase !== "synchronizing") return;

        const timer = setTimeout(() => {

            dispatch(setPhase("processing"));

            dispatch(setOperationPhase("pending"));

        }, SYNCHRONIZING_DURATION);

        return () => clearTimeout(timer);

    }, [phase, dispatch]);


    useEffect(() => {

        if (phase === "idle") {

        dispatch(setStartupFinished(false));

        dispatch(setOperationPhase("idle"));

        dispatch(setMergeResult(null));

        }},

        [phase, dispatch]);

    useEffect(() => {

        if (operationPhase !== "pending") return;

        async function executeMerge(){

            try {

                dispatch(setOperationPhase("running"));
        /*
            await mergeImages(...)
        */
                const result = await mergeImages();

                console.log(result);

                dispatch(setMergeResult(result));

                dispatch(setOperationPhase("completed"));

            } catch {

                dispatch(setOperationPhase("failed"));
            }

        }

        executeMerge();

        }, [operationPhase]);


     useEffect(() => {

        if(operationPhase !== "completed") return;

        const timer = setTimeout(()=> {
        dispatch(setPhase("result"));
        }, 5000 );

        return ()=> clearTimeout(timer);

        }, [operationPhase]);

    useEffect(() => {

    if (phase !== "resetting") return;

    const timer = setTimeout(() => {

        dispatch(setPhase("resetting-actions"));

    },300);

    return () => clearTimeout(timer);

    }, [phase, dispatch]);


    useEffect(() => {

    if (phase !== "resetting-actions") return;

    const timer = setTimeout(() => {

        dispatch(setPhase("resetting-panel"));

    },350);

    return () => clearTimeout(timer);

    }, [phase]);


    useEffect(() => {

    if (phase !== "resetting-panel") return;

    const timer = setTimeout(() => {

        dispatch(setPhase("resetting-core"));

    },500);

    return () => clearTimeout(timer);

    }, [phase]);



    useEffect(() => {

    if (phase !== "resetting-core") return;

    const timer = setTimeout(() => {

        dispatch(clearLaboratory());

    },500);

    return () => clearTimeout(timer);

    }, [phase]);


    const samplesVisible = phase === "activated" || phase === "synchronizing";

    const actionsVisible = phase === "result";

    const panelVisible = phase === "result";

    const isProcessing = phase === "processing";

        return (

        <Layout phase={phase}>

            <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            phase={phase}
            />

          <Core
          phase={phase}
          ready={isReadyToProcess}

          onClick={()=>{
              if (phase === "idle") {
                  dispatch(setPhase("activated"));
              }
          }}
          />

        <SampleAnchor
            side="left"
            visible={samplesVisible}
            phase={phase}
            floating={!samples.firstLoaded && !isProcessing}
            >
            <SampleNode
            phase={phase}
            loaded={samples.firstLoaded}
            label="Sample 01"
            onClick={()=>{
                dispatch(loadFirstSample())
            }}
            />

        </SampleAnchor>

        <SampleAnchor
            side="right"
            visible={samplesVisible}
            phase={phase}
            floating={!samples.secondLoaded && !isProcessing}
            >
            <SampleNode
            phase={phase}
            loaded={samples.secondLoaded}
            label="Sample 02"
            onClick={()=>{
                dispatch(loadSecondSample())
                }}
            />

        </SampleAnchor>

        </Scene>

        <ReactionPanel
        phase={phase}
        visible={panelVisible}
        result={mergeResult}
        />

        <ResetLabNode
        phase={phase}
        visible={actionsVisible}
        onClick={() => {
            if (phase !== "result") return;
            dispatch(setPhase("resetting"));
            }}
        />

        <DownloadNode
        phase={phase}
        visible={actionsVisible}
        onClick={() => {
        }}
        />


    </section>

    </Layout>
  );
}

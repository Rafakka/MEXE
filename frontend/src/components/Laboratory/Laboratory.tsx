
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import SampleAnchor from "../Laboratory/SampleAnchor/SampleAnchor";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import Notification from "../Notification/Notification";
import {useEffect} from "react";
import {mexeApi} from "../../api/mexeApi";
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
        setResultVisible,
        setNotification,
        clearNotification,

    } from "../../features/laboratory/laboratorySlice";

import type {LaboratoryNotification} from "../../features/laboratory/laboratorySlice";

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

    const resultVisible = useSelector(
        (state:RootState) => state.laboratory.resultVisible
    );

    const handleFirstSample = (file:File) => {

        dispatch(loadFirstSample(file));
    }

    const handleSecondSample = (file:File) => {

        dispatch(loadSecondSample(file));
    }

    const notification = useSelector(
    (state: RootState) => state.laboratory.notification
    );

    useEffect(() => {

    console.log("notification:", notification);

    }, [notification]);

    const isReadyToProcess =
        samples.firstLoaded && samples.secondLoaded;

    useEffect(() => {

    console.log("phase:", phase);
    console.log("operationPhase:", operationPhase);
    console.log("samples:", samples);

    }, [phase, operationPhase, samples]);

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

                const {firstFile, secondFile } = samples;

                if(!firstFile || !secondFile){
                throw new Error("Samples not loaded");
                }


                dispatch(setOperationPhase("running"));

                const result = await mexeApi.blend(
                    firstFile,
                    secondFile
                );

                dispatch(setMergeResult(result));

                dispatch(setOperationPhase("completed"));

                dispatch(

                setNotification({

                type:"success",

                title:"Merge completed",

                message:"Image generated."

                })

            );

            } catch(error) {

                console.error(error);

            dispatch(

                setNotification({

                type:"error",

                title:"Merge Error",

                message:"Unable to merge images."

                })

            );

            dispatch(setOperationPhase("failed"));

            }

        }

        executeMerge();

        }, [
            operationPhase,

            samples.firstFile,

            samples.secondFile,

            dispatch

        ]);


     useEffect(() => {

        if(operationPhase !== "completed") return;

        dispatch(setPhase("result"));

        const timer = setTimeout(()=> {
        dispatch(setResultVisible(true));

        }, 5000 );

        return ()=> clearTimeout(timer);

        }, [operationPhase]);


    useEffect(() => {

    if (phase !== "resetting") return;

    const timer = setTimeout(() => {

        dispatch(clearLaboratory());

    },1000);

    return () => clearTimeout(timer);

    }, [phase, dispatch]);


    useEffect(() => {

    if ( operationPhase !== "completed" &&
    operationPhase !== "failed") return;

    const timer = setTimeout(() => {

    dispatch(setPhase("resetting"));

    }, 3000);

    return () => clearTimeout(timer);
    }, [operationPhase, dispatch]);


    const samplesVisible = phase === "activated" || phase === "synchronizing";

    const isProcessing = phase === "processing";

    function handleReset() {

        if (phase !== "result") return;


        dispatch(setResultVisible(false));
        dispatch(setPhase("resetting"));

        };

        return (

        <Layout phase={phase}>

            <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            phase={phase}
            />

          <Core
          phase={phase}
          onClick={()=>{

            if (phase !== "idle"){
                return;
            }

            dispatch(clearNotification());

            dispatch(setPhase("activated"));

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
            onFileSelected={handleFirstSample}
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

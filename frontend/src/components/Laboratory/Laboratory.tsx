
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import SampleAnchor from "../Laboratory/SampleAnchor/SampleAnchor";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import {useState, useEffect} from "react";
import type {LaboratoryPhase} from "../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../features/laboratory/operationPhase";
import type { SampleState} from "../../features/laboratory/sampleState";
import {mergeImages} from "../../services/merge/mergeImages";
import type {MergeResult} from "../../services/merge/types";

import styles from "./Laboratory.module.css";

const STARTUP_DURATION = 2600;
const SYNCHRONIZING_DURATION = 2200;

export default function Laboratory() {

    const [phase, setPhase] =
        useState<LaboratoryPhase>("idle");

    const [operationPhase, setOperationPhase ] =
        useState<OperationPhase>("idle");

    const [startupFinished, setStartupFinished] =
        useState(false);

    const [samples, setSamples] =
        useState<SampleState>({

            firstLoaded: false,
            secondLoaded: false
        });

    const [mergeResult, setMergeResult] =
    useState<MergeResult | null>(null);

    const isReadyToProcess =
        samples.firstLoaded && samples.secondLoaded;

    useEffect(() => {
        if (phase !== "activated") return;

        const timer = setTimeout(() => {

        setStartupFinished(true);

        }, STARTUP_DURATION);

        return () => clearTimeout(timer);

        }, [phase]);

    useEffect(() => {

        if (

            phase !== "activated" ||

            !startupFinished ||

            !isReadyToProcess

        ) return;

        setPhase("synchronizing");

        }, [

            phase,

            startupFinished,

            isReadyToProcess,

        ]);

    useEffect(() => {

        if (phase !== "synchronizing") return;

        const timer = setTimeout(() => {

            setPhase("processing");

            setOperationPhase("pending");

        }, SYNCHRONIZING_DURATION);

        return () => clearTimeout(timer);

    }, [phase]);


    useEffect(() => {

        if (phase === "idle") {

        setStartupFinished(false);

        setOperationPhase("idle");

        setMergeResult(null);

        }},

        [phase]);

    useEffect(() => {

        if (operationPhase !== "pending") return;

        async function executeMerge(){

            try {

                setOperationPhase("running");
        /*
            await mergeImages(...)
        */
                const result = await mergeImages();

                console.log(result);

                setMergeResult(result);

                setOperationPhase("completed");

            } catch {

                setOperationPhase("failed");
            }

        }

        executeMerge();

        }, [operationPhase]);


    useEffect(() => {

        if(operationPhase !== "completed") return;

        setPhase("result");

        },

        [operationPhase]);

    const samplesVisible = phase !== "idle";

    const isProcessing = phase === "processing";

        return (

        <Layout>

            <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            phase={phase}
            />

          <Core
          phase={phase}
          ready={isReadyToProcess}

          onClick={()=>{
              if (phase == "idle") {
                  setPhase("activated")
              }
          }}
          />

        <SampleAnchor
            side="left"
            visible={samplesVisible}
            processing={isProcessing}
            floating={!samples.firstLoaded && !isProcessing}
            >
            <SampleNode
            phase={phase}
            loaded={samples.firstLoaded}
            onClick={()=>{
                setSamples(previous => ({

                ...previous,

                firstLoaded:true

                    }));
                }}
            />

        </SampleAnchor>

        <SampleAnchor
            side="right"
            visible={samplesVisible}
            processing={isProcessing}
            floating={!samples.secondLoaded && !isProcessing}
            >
            <SampleNode
            phase={phase}
            loaded={samples.secondLoaded}
            onClick={()=>{
                   setSamples(previous => ({

                ...previous,

                secondLoaded:true

                    }));

                }}

            />

        </SampleAnchor>

        </Scene>

        <ReactionPanel
        phase={phase}
        result={mergeResult}
        />

    </section>

    </Layout>
  );
}

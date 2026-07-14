
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import SampleAnchor from "../Laboratory/SampleAnchor/SampleAnchor";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import {useState, useEffect} from "react";
import type {LaboratoryPhase} from "../../features/laboratory/laboratoryPhase";
import type { SampleState} from "../../features/laboratory/sampleState";

import styles from "./Laboratory.module.css";

export default function Laboratory() {

   const [phase, setPhase] =
    useState<LaboratoryPhase>("idle");

    const [samples, setSamples] =
    useState<SampleState>({

        firstLoaded: false,

        secondLoaded: false
 
    });

    const bothLoaded =
        samples.firstLoaded &&
        samples.secondLoaded
        useEffect(()=>{
            if(bothLoaded && phase === "activated") {
                setPhase("synchronizing");
            }
    }, [bothLoaded, phase]);
        useEffect(() => {

            if (phase !== "synchronizing") return;

            const timer = setTimeout(() => {

        setPhase("processing");

        }, 500);

    return () => clearTimeout(timer);

}, [phase]);

    const samplesVisible =
        phase !== "idle";

  return (
    <Layout>

      <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            phase={phase}
            />

          <Core
          phase={phase}

          ready={bothLoaded}

          onClick={()=>{
              if (phase == "idle") {
                  setPhase("activated")
              }
          }}
          />

        <SampleAnchor
            side="left"
            visible={samplesVisible}
            processing={phase==="processing"}
            floating={!samples.firstLoaded && phase !== "processing"}
            >
            <SampleNode
            phase={phase}
            loaded={samples.firstLoaded} 
            onClick={()=>
            setSamples({
                ...samples,
                firstLoaded:true
            })}
            />            
        </SampleAnchor>

        <SampleAnchor
            side="right"
            visible={samplesVisible}
            processing={phase==="processing"}
            floating={!samples.secondLoaded && phase !== "processing"}
            >
            <SampleNode
            phase={phase}
            loaded={samples.secondLoaded}
            onClick={()=>
            setSamples({
                ...samples,
                secondLoaded:true
            })}
            />
        </SampleAnchor>
        
        </Scene>

        <ReactionPanel
        phase={phase}
        />

    </section>

    </Layout>
  );
}

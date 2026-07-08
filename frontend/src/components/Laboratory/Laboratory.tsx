
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import {useState} from "react";
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

  return (
    <Layout>

      <section className={styles.laboratory}>

        <Scene>

          <ReactionField
            phase={phase}
            />

          <Core
          phase={phase}

          onClick={()=>{
              if (phase == "idle") {
                  setPhase("activated")
              }
          }}
          />

          <SampleNode
          side="left"
          phase={phase}
          samples={samples.firstLoaded}
          />

          <SampleNode
          side="right"
          phase={phase}
          samples={samples.secondLoaded}
          />

        </Scene>

        <ReactionPanel
        phase={phase}
        />

    </section>

    </Layout>
  );
}

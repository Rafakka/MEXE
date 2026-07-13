
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import SampleAnchor from "../Laboratory/SampleAnchor/SampleAnchor";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import {useState} from "react";
import type {LaboratoryPhase} from "../../features/laboratory/laboratoryPhase";
import type { SampleState} from "../../features/laboratory/sampleState";

import styles from "./Laboratory.module.css";

import sample01 from "../../../src/assets/mock/sample1.png";
import sample02 from "../../../src/assets/mock/sample2.png";


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

        <SampleAnchor
            side="left"
            visible={phase === "activated"}
            floating={!samples.firstLoaded}
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
            visible={phase === "activated"}  
            floating={!samples.secondLoaded}
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

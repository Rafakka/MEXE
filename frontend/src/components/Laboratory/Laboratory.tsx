
import Layout from "../Laboratory/Layout/Layout";
import Scene from "../Laboratory/Scene/Scene";
import Core from "../Laboratory/Core/Core";
import SampleNode from "../Laboratory/SampleNode/SampleNode";
import ReactionPanel from "../Laboratory/ReactionPanel/ReactionPanel";
import ReactionField from "../Laboratory/ReactionField/ReactionField";
import {useState} from "react";
import type {LaboratoryState} from "../../features/laboratory/laboratoryState";
import styles from "./Laboratory.module.css";


export default function Laboratory() {

    const[laboratoryState, setLaboratoryState ] = useState<LaboratoryState>("idle");

  return (
    <Layout>

      <section className={styles.laboratory}>

        <Scene>

          <ReactionField
          state={laboratoryState}
          />

          <Core
          state={laboratoryState}
          />

          <SampleNode
          side="left"
          state={laboratoryState}
          />

          <SampleNode
          side="right"
          state={laboratoryState}
          />

        </Scene>

        <ReactionPanel
        state={laboratoryState}
        />

    </section>

    </Layout>
  );
}

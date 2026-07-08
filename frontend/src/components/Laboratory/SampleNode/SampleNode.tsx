

import styles from "./SampleNode.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type SampleNodeProps = {

    side: "left" | "right";

    phase: LaboratoryPhase;

    loaded: boolean;
}


export default function SampleNode({side, phase, loaded}:SampleNodeProps){

    return(

        <div

    className={`

        ${styles.node}

        ${side == "left" ? styles.left: styles.right}

        ${phase === "activated" ? styles.visible : styles.hidden}

        ${loaded ? styles.loaded : styles.pending }

            `}

        />   
    
    )

}

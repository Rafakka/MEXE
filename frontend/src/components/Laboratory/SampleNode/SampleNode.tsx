

import styles from "./SampleNode.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type SampleNodeProps = {

    phase: LaboratoryPhase;

    loaded: boolean;

    onClick: () => void;
}


export default function SampleNode({phase, loaded, onClick}: SampleNodeProps){

    return(
    
    <div

    className={`
        ${styles.node}
        ${loaded ? styles.loaded : styles.pending}
        ${!loaded ? styles.waiting : ""}
    `}

    onClick={!loaded ? onClick : undefined}

    />     
    
    )

}

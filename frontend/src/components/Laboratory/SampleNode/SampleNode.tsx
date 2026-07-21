

import styles from "./SampleNode.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type SampleNodeProps = {
    phase: LaboratoryPhase;
    loaded: boolean;
    label: string;
    onClick: () => void;
}

export default function SampleNode({
    phase,
    loaded,
    label,
    onClick
}: SampleNodeProps){

    return(

        <div

            className={`
                ${styles.node}
                ${styles[phase]}
                ${loaded ? styles.loaded : styles.pending}
                ${!loaded ? styles.waiting : ""}
            `}

            onClick={!loaded ? onClick : undefined}

        >

            <span className={styles.tooltip}>
                {label}
            </span>

        </div>

    )

}



import styles from "./ReactionField.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type ReactionProps = {

    phase: LaboratoryPhase;
}

export default function ReactionField({

    phase

}: ReactionProps) {

    return (

        <div 
            className={`

                ${styles.field}
                ${phase==="processing" ? styles.processing: ""}
            `} 
        >

        <div className={styles.axisA} />

        <div className={styles.axisB} />

        </div>
    );
}

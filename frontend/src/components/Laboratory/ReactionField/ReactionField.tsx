

import styles from "./ReactionField.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type ReactionProps = {

    phase: LaboratoryPhase;
}

export default function ReactionField({

    phase

}: ReactionProps) {

    const phaseClass = styles[phase];

    return (

        <div
            className={`

                ${styles.field}
                ${phaseClass}
            `}
        >

            <div className={styles.rotorA}>

                <div className={styles.axisA} />

            </div>


            <div className={styles.rotorB}>

                <div className={styles.axisB} />

            </div>


        </div>
    );
}

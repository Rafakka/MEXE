

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
            <div className={styles.trailRotorA}>

                <div className={styles.trailA} />

            </div>

            <div className={styles.rotorA}>
                
                <div className={styles.axisA} />
            
            </div>

            <div className={styles.trailRotorB}>

                <div className={styles.trailB} />

            </div>

            <div className={styles.rotorB}>
                
                <div className={styles.axisB} />
            
            </div>
            
    
        </div>
    );
}

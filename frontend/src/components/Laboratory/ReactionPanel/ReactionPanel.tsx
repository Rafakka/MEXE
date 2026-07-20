

import styles from "./ReactionPanel.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type ReactionPanelProps = {
    phase: LaboratoryPhase;
};

export default function ReactionPanel({phase}:ReactionPanelProps){

    return(

        <section
            className={`
                ${styles.panel}
                ${styles[phase]}
            `}
        >

        <div className={styles.connector} />
        <div className={styles.surface}>
        <div className={styles.preview}>

        </div>

        <div className={styles.metadata}>

            <span>1024 x 7268</span>
            <span>Png</span>
            <span>RGB</span>
            <span>1.2 MB</span>
        </div>

    </div>

        </section>

    );

}

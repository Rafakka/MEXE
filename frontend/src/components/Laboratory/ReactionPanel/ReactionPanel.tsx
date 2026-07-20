

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

            Reaction Laboratory

        </section>

    );

}

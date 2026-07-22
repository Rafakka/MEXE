

import styles from "./ResetLabNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";

type ResetLabNodeProps = {
    phase: LaboratoryPhase;
    visible: boolean;
    onClick: () => void;
};

export default function ResetLabNode({
    phase,
    visible,
    onClick
}: ResetLabNodeProps) {

    return (

        <button
            type="button"
            className={`
                ${styles.node}
                ${visible ? styles.visible : styles.hidden}
                ${styles[phase]}

                `}
            onClick={onClick}
            aria-label="Reset Laboratory"

        >

        </button>

    );
}


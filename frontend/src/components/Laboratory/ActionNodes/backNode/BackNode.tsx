

import styles from "./BackNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";
import type { OperationPhase } from "../../../../features/laboratory/operationPhase";

type BackNodeProps = {
    phase: LaboratoryPhase;
    operationPhase: OperationPhase
    visible: boolean;
    onBack: () => void;
};

export default function BackNode({
    phase,
    visible,
    operationPhase,
    onBack
}: BackNodeProps) {

    return (

        <button
            type="button"
            className={`
                ${styles.node}
                ${styles.back}
                ${visible ? styles.visible : styles.hidden}
                ${styles[phase]}
                ${styles[operationPhase]}

                `}
            onClick={onBack}
            aria-label="Back"

        >

        </button>

    );
}




import styles from "./ResetLabNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";
import type { OperationPhase } from "../../../../features/laboratory/operationPhase";

type ResetLabNodeProps = {
    phase: LaboratoryPhase;
    operationPhase: OperationPhase
    visible: boolean;
    onClick: () => void;
    resetting: boolean;
};

export default function ResetLabNode({
    phase,
    visible,
    operationPhase,
    resetting,
    onClick
}: ResetLabNodeProps) {

    return (

        <button
            type="button"
            className={`
                ${styles.node}
                ${visible ? styles.visible : styles.hidden}
                ${resetting ? styles.resetting : ""}
                ${styles[phase]}
                ${styles[operationPhase]}

                `}
            onClick={onClick}
            aria-label="Reset Laboratory"

        >

        </button>

    );
}


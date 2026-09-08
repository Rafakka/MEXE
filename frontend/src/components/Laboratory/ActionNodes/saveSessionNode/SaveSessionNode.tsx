
import styles from "./SaveSessionNode.module.css";
import type {OperationPhase} from "../../../../features/laboratory/operationPhase";
import type {LaboratoryPhase} from "../../../../features/laboratory/laboratoryPhase";

type SaveSessionNodeProps = {
    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
    visible: boolean;
    onClick: () => void;

};

export default function SaveSessionNode({
    phase,
    visible,
    operationPhase,
    onClick,
}: SaveSessionNodeProps) {


    return (
        <button
            type="button"
            className={`
                ${styles.node}
                ${visible
                    ?styles.visible
                    :styles.hidden}
                ${styles[phase]}
                ${styles[operationPhase]}
            `}
            onClick={onClick}
            aria-label="Save Session For Reentry"

        >
        </button>
    );
}

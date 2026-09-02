import styles from "./ManualNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";
import type { OperationPhase } from "../../../../features/laboratory/operationPhase";

type ManualNodeProps = {
    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
    visible: boolean;
    onClick: () => void;
};

export default function ManualNode({
    phase,
    visible,
    operationPhase,
    onClick
}: ManualNodeProps) {

    return (
        <button
            type="button"
            className={`
                ${styles.node}
                ${visible ? styles.visible : styles.hidden}
                ${styles[phase]}
                ${styles[operationPhase]}
            `}
            onClick={onClick}
            aria-label="Manual Connection Retry"
        />
    );
}

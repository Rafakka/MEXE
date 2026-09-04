
import styles from "./RecoveryNode.module.css";
import type {OperationPhase} from "../../../../features/laboratory/operationPhase";

type RecoveryNodeProps = {
    operationPhase: OperationPhase;
    visible: boolean;
};

export default function RecoveryNode({
    visible
}: RecoveryNodeProps) {


    console.log("RECOVERY NODE", { visible });

    return (
        <div
            className={`${styles.node} ${
                visible ? styles.visible : styles.hidden
            }`}
            aria-hidden={!visible}
        >
            <span />
            <span />
            <span />
            <span />
            <span />
        </div>
    );
}

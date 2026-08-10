

import styles from "./DownloadNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../../features/laboratory/operationPhase";

type DownloadNodeProps = {
    phase: LaboratoryPhase,
    operationPhase: OperationPhase;
    visible: boolean,
    resetting: boolean,
    onClick: () => void;

};

export default function DownLoadNode({
    phase,
    operationPhase,
    visible,
    resetting,
    onClick
}: DownloadNodeProps) {

    return (

        <button
            type="button"
           className={`
                ${styles.node}
                ${visible ? styles.visible: styles.hidden,
                resetting ? styles.resetting: ""}
                ${styles[phase]}
                ${styles[operationPhase]}
        `}
            onClick={onClick}
            aria-label="Download File"
        >

        </button>

    );

}

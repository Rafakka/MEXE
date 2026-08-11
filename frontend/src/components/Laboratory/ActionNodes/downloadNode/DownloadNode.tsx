

import styles from "./DownloadNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../../features/laboratory/operationPhase";

type DownloadNodeProps = {
    phase: LaboratoryPhase,
    operationPhase: OperationPhase;
    visible: boolean,
    resetting: boolean,
    resultUrl: string | null;

};

export default function DownLoadNode({
    phase,
    operationPhase,
    visible,
    resetting,
    resultUrl,
}: DownloadNodeProps) {

    const handleDownload = () => {

    if (!resultUrl) return;

    const link = document.createElement("a");

    link.href = resultUrl;

    link.download = "mexe-result.png";

    link.click();

    };

    return (
        <button
        type="button"
           className={`
                ${styles.node}
                ${visible ? styles.visible: styles.hidden}
                ${resetting ? styles.resetting: ""}
                ${styles[phase]}
                ${styles[operationPhase]}
        `}
            onClick={handleDownload}
            aria-label="Download File"
        >

        </button>

    );

}

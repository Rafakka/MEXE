

import styles from "./DownloadNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";

type DownloadNodeProps = {
    phase: LaboratoryPhase,
    visible: boolean
};

export default function DownLoadNode({
    phase,
    visible
}: DownloadNodeProps) {

    return (

        <button
            type="button"
           className={`
                ${styles.node}
                ${visible ? styles.visible: styles.hidden}
                ${styles[phase]}
        `}
            aria-label="Download File"
        >

        </button>

    );

}

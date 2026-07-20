

import styles from "./DownloadNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";

type DownloadNodeProps = {
    phase: LaboratoryPhase;
    onClick: () => void;
};

export default function DownLoadNode({
    phase,
    onClick,
}: DownloadNodeProps) {

    return (

        <button
            type="button"
            className={`
                ${styles.node}
                ${styles[phase]}
            `}
            onClick={onClick}
            aria-label="Download File">
        </button>

    );

}

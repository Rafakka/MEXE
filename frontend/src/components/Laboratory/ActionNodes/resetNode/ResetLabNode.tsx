

import styles from "./ResetLabNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";

type ResetLabNodeProps = {
    phase: LaboratoryPhase;
    onClick: () => void;
};

export default function ResetLabNode({
    phase,
    onClick,
}: ResetLabNodeProps) {

    return (

        <button
            type="button"
            className={`
                ${styles.node}
                ${styles[phase]}
            `}
            onClick={onClick}
            aria-label="Reset Laboratory"
        >

        </button>

    );

}

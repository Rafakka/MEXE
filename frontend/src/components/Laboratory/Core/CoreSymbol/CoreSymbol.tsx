

import styles from "./CoreSymbol.module.css";
import type {LaboratoryPhase} from "../../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../../features/laboratory/operationPhase";

type CoreSymbolProps = {

    phase: LaboratoryPhase;

    hovered: boolean;

    operationPhase : OperationPhase;

};

export default function CoreSymbol({

    phase,

    hovered,

    operationPhase,

}: CoreSymbolProps ) {

   const active = [
    "activated",
    "synchronizing",
    "processing",
].includes(phase);

    return (

    console.log({ phase, operationPhase }),

        <svg

   className={`

    ${styles.symbol}

    ${styles[phase]}

    ${styles[operationPhase]}

    ${phase === "idle" && hovered ? styles.hover : ""}

    ${
        active && phase !== "activated"
            ? styles.activated
            : ""
    }

`}        viewBox="0 0 100 100"

        >

    <path

        className={styles.ring}

        d="

        M 34 20

        A 32 32 0 1 0 66 20

        "

        fill="none"

        stroke="currentColor"

        strokeWidth="3"

        strokeLinecap="round"

    />

 <path

        className={styles.ringOutline}

        d="

        M 34 20

        A 32 32 0 1 0 66 20

        "

        fill="none"

        stroke="currentColor"

        strokeWidth="3"

        strokeLinecap="round"

    />

        <line
            className={styles.stemOutline}

            x1="50"

            y1="22"

            x2="50"

            y2="48"

            stroke="currentColor"

            strokeWidth="3.5"

            strokeLinecap="round"

    />

        <line
            className={styles.stem}

            x1="50"

            y1="22"

            x2="50"

            y2="48"

            stroke="currentColor"

            strokeWidth="3.5"

            strokeLinecap="round"

        />

        </svg>

    );

}

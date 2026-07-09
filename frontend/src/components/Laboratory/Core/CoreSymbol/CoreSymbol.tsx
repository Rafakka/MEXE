

import styles from "./CoreSymbol.module.css";
import type {LaboratoryPhase} from "../../../../features/laboratory/laboratoryPhase";

type CoreSymbolProps = {

    phase: LaboratoryPhase;

    hovered: boolean;

};

export default function CoreSymbol({

    phase,

    hovered

}: CoreSymbolProps ) {

    return (

        <svg

        className={`
        ${styles.symbol}

        ${hovered ? styles.hover : ""}

        ${phase === "activated" ? styles.activated :"" }

        ${phase === "processing" ? styles.processing:"" }

        ${phase === "result" ? styles.result:""}

        `}

        viewBox="0 0 100 100"

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

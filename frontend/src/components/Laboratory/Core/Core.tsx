
import styles from "../Core/Core.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import CoreSymbol from "../Core/CoreSymbol/CoreSymbol";
import {useState} from "react";


type CoreProps = {
        phase: LaboratoryPhase;
        onClick: () => void;

    };

export default function Core( {phase, onClick }:CoreProps ) {

    const [hovered, setHovered] = useState(false);

    return (

    <div

    className={`
        ${styles.core}
        ${phase === "activated" ? styles.activated : ""}
        ${phase === "processing" ? styles.processing : ""}
        ${phase === "result" ? styles.result : ""}
        `}

        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}

    >

    <div className={styles.aura} />
    <div className={styles.halo} />
    <div className={styles.planet} />

    <CoreSymbol

        phase={phase}

        hovered={hovered}

    />
    </div>

  );
}

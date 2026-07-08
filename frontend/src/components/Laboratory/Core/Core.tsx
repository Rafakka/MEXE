
import styles from "../Core/Core.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase"

type CoreProps = {
        phase: LaboratoryPhase;
        onClick: () => void;
    };

export default function Core( {phase, onClick}:CoreProps ) { return (
    
    <div

    className={`
        ${styles.core}
        ${phase === "activated" ? styles.activated : ""}
        ${phase === "processing" ? styles.processing : ""}
        ${phase === "result" ? styles.result : ""}
        `}

        data-phase={phase}

        onClick={onClick}
    >
      <div className={styles.halo} />

      <div className={styles.planet} />

      <div className={styles.glow} />

    </div>

  );
}

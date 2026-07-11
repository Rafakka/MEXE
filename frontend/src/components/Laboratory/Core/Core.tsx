
import styles from "../Core/Core.module.css";
import effects from  "./CoreEffects.module.css";
import "./Animations/animations.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import CoreSymbol from "../Core/CoreSymbol/CoreSymbol";
import {useState, type CSSProperties } from "react";


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

    <div

      className={`
        ${effects.aura}
        ${phase === "activated"
          ? effects.auraActivated
          : ""}
      `}

    />

    <div className={effects.orbit}>

    <div className={effects.orbitRing}>

    <div className={effects.orbitArm} style={{ "--angle": "0deg" } as React.CSSProperties}>
      <span className={effects.orbitParticle} />
    </div>

    <div className={effects.orbitArm} style={{ "--angle": "55deg" } as React.CSSProperties}>
      <span className={effects.orbitParticle} />
    </div>

    <div className={effects.orbitArm} style={{ "--angle": "110deg" } as React.CSSProperties}>
      <span className={effects.orbitParticle} />
    </div>

    <div className={effects.orbitArm} style={{ "--angle": "175deg" } as React.CSSProperties}>
      <span className={effects.orbitParticle} />
    </div>

    <div className={effects.orbitArm} style={{ "--angle": "245deg" } as React.CSSProperties}>
      <span className={effects.orbitParticle} />
    </div>

    <div className={effects.orbitArm} style={{ "--angle": "315deg" } as React.CSSProperties}>
      <span className={effects.orbitParticle} />
    </div>

  </div>
</div>
    <div

      className={`
        ${effects.halo}
        ${phase === "activated"
          ? effects.haloActivated
          : ""}
      `}

    />

    <div className={styles.planet} />

    <CoreSymbol
      phase={phase}
      hovered={hovered}
    />

  </div>

);

}


import styles from "../Core/Core.module.css";
import type {LaboratoryState} from "../../../features/laboratory/laboratoryState";

type CoreProps = {
        state: LaboratoryState;
        onClick: () => void;
    };

export default function Core( {state, onClick}:CoreProps ) { return (
    <div className={styles.core}
         data-state={state}
         onClick={onClick}
    >
      <div className={styles.halo} />

      <div className={styles.planet} />

      <div className={styles.glow} />

    </div>

  );
}

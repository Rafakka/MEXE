
import styles from "../Core/Core.module.css";
import type {LaboratoryState} from "../../../features/laboratory/laboratoryState";

type CoreProps = {
        state: LaboratoryState;
    };

export default function Core( {state:_state}:CoreProps ) { return (
    <div className={styles.core}
         data-state={state}
    >

      <div className={styles.halo} />

      <div className={styles.planet} />

      <div className={styles.glow} />

    </div>
  );
} 

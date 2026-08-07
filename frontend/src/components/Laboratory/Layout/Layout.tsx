import styles from "./Layout.module.css";
import type { LaboratoryPhase } from "../../../features/laboratory/laboratoryPhase";
import type { OperationPhase } from "../../../features/laboratory/operationPhase";
import SpaceCanvas from "../SpaceCanvas/SpaceCanvas";

type LayoutProps = {
    phase: LaboratoryPhase;
    children: React.ReactNode;
    operationPhase: OperationPhase;
};

export default function Layout({ phase, operationPhase, children }: LayoutProps) {

    return (

        <div className={styles.wrapper}>

          <main className={`${styles.layout} ${styles[phase]}`}>

            <SpaceCanvas phase={phase} operationPhase={operationPhase} debug="star"/>

            <div className={styles.content}>

                {children}

            </div>

        </main>

        </div>

    );

}

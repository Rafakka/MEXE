

import styles from "./Layout.module.css";
import type { LaboratoryPhase } from "../../../features/laboratory/laboratoryPhase";

type LayoutProps = {
    phase: LaboratoryPhase;
    children: React.ReactNode;
};

export default function Layout({ phase, children }: LayoutProps) {

    return (

        <main
            className={`
                ${styles.layout}
                ${styles[phase]}
            `}
        >
            {children}
        </main>

    );

}



import styles from "./SampleAnchor.module.css";

import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type SampleAnchorProps = {
    side: "left" | "right";
    visible: boolean;
    floating:boolean;
    phase:LaboratoryPhase;
    children: React.ReactNode;
};

export default function SampleAnchor({
    side,
    visible,
    floating,
    phase,
    children,
}: SampleAnchorProps) {
    return (
        <div
           className={`
                ${styles.anchor}
                ${side === "left" ? styles.left : styles.right}
                ${visible ? styles.visible : styles.hidden}
                ${styles[phase]}
            ${
                phase !== "processing" &&
                floating &&
                side === "left"
                ? styles.floatingLeft
                : ""
            }
            ${
            phase !== "processing" &&
            floating &&
            side === "right"
            ? styles.floatingRight
            : ""
            }
        `}
    >
    {children}
        </div>
    );
}

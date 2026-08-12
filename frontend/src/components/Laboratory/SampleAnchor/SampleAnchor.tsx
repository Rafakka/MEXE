import styles from "./SampleAnchor.module.css";
import type { LaboratoryPhase } from "../../../features/laboratory/laboratoryPhase";

type SampleAnchorProps = {
    side: "left" | "right";
    visible: boolean;
    floating: boolean;
    phase: LaboratoryPhase;
    children: React.ReactNode;
    onHideComplete?:(side: "left" | "right") => void;
};

export default function SampleAnchor({
    side,
    visible,
    floating,
    phase,
    children,
    onHideComplete
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
            onTransitionEnd={(event) => {

            if (
                !visible &&
                event.propertyName === "opacity"
            ) {
                onHideComplete?.(side);
            }

        }}

        >
            {children}
        </div>
    );
}

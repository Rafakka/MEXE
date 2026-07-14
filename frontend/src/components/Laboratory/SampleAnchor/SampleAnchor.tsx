

import styles from "./SampleAnchor.module.css";

type SampleAnchorProps = {
    side: "left" | "right";
    visible: boolean;
    floating:boolean;
    processing:boolean;
    children: React.ReactNode;
};

export default function SampleAnchor({
    side,
    visible,
    floating,
    processing,
    children,
}: SampleAnchorProps) {
    return (
        <div
            className={`
                ${styles.anchor}
                ${side === "left" ? styles.left : styles.right}
                ${visible ? styles.visible : styles.hidden}
                ${ !processing && floating && side === "left"
                            ? styles.floatingLeft
                       : "" 
                }
                ${
                    !processing && floating && side === "right"
                            ? styles.floatingRight
                       : ""
                }
                ${
                    processing

                        ? styles.processing

                        : ""
                }
            `}
        >
            {children}
        </div>
    );
}

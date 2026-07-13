

import styles from "./SampleAnchor.module.css";

type SampleAnchorProps = {
    side: "left" | "right";
    visible: boolean;
    floating:boolean;
    children: React.ReactNode;
};

export default function SampleAnchor({
    side,
    visible,
    floating,
    children,
}: SampleAnchorProps) {
    return (
        <div
            className={`
                ${styles.anchor}
                ${side === "left" ? styles.left : styles.right}
                ${visible ? styles.visible : styles.hidden}
                ${
                    floating
                        ? side === "left"
                            ? styles.floatingLeft
                            : styles.floatingRight
                    : ""
                }
            `}
        >
            {children}
        </div>
    );
}

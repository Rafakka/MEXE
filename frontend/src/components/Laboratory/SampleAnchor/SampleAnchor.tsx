

import styles from "./SampleAnchor.module.css";

type SampleAnchorProps = {
    side: "left" | "right";
    visible: boolean;
    children: React.ReactNode;
};

export default function SampleAnchor({
    side,
    visible,
    children,
}: SampleAnchorProps) {
    return (
        <div
            className={`
                ${styles.anchor}
                ${side === "left" ? styles.left : styles.right}
                ${visible ? styles.visible : styles.hidden}
            `}
        >
            {children}
        </div>
    );
}

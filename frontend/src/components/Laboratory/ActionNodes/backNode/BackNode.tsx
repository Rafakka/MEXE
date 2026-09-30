

import styles from "./BackNode.module.css";

type BackNodeProps = {
    visible: boolean;
    hiding: boolean;
    onBack: () => void;
    onHideComplete: () => void;
};

export default function BackNode({
    visible,
    hiding,
    onBack,
    onHideComplete,
}: BackNodeProps) {

    return (

    <button
    type="button"
    className={`
        ${styles.node}
        ${styles.back}
        ${
        hiding
            ? styles.hiding
            : visible
                ? styles.visible
                : styles.hidden
        }
    `}
    onClick={onBack}
    onAnimationEnd={(event) => {
        if (
            hiding &&
            event.animationName === styles.nodeHide
        ) {
            onHideComplete();
        }
    }}
    aria-label="Go back"
    />

    );
}


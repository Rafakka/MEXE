

import styles from "./BackNode.module.css";

type BackNodeProps = {
    visible: boolean;
    hiding: boolean;
    locked: boolean;
    onBack: () => void;
    onHideComplete: () => void;
};

export default function BackNode({
    visible,
    hiding,
    onBack,
    onHideComplete,
    locked,
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
    onClick={() => {
            console.log(">>> BACK NODE ACTUAL CLICK");
            onBack();
        }}
    onAnimationEnd={(event) => {
            console.log(">>> BACK NODE ANIMATION END", {
                animationName: event.animationName,
                hiding,
                visible,
            });

        if (
            hiding &&
            event.animationName === styles.nodeHide
        ) {
            onHideComplete();
        }
    }}
    aria-label="Go back"
    disabled={locked}
    />

    );
}


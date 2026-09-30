
import styles from "./ReentryObjNode.module.css";

import { useRef } from "react";

type ReentryObjNodeProps = {
    hiding: boolean;
    visible: boolean;
    onFileSelected: (file: File | null) => void;
    onHideComplete: () => void;
};

export default function ReentryObjNode({
    visible,
    onFileSelected,
    hiding,
    onHideComplete,
}: ReentryObjNodeProps) {

    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {

        console.log(">>>CLICK ON Workflow REENTRY");

        if(inputRef.current) {
            inputRef.current.value = "";
            inputRef.current.click();
        }
    };

    return (
        <>
            <button
                type="button"
                className={`
                    ${styles.node}
                     ${
                        hiding
                            ? styles.hiding
                            : visible
                                ? styles.visible
                                : styles.hidden
                    }
                `}
                onClick={handleClick}
                onAnimationEnd={(event) => {
                    if (
                        hiding &&
                        event.animationName === styles.nodeHide
                        ) {
                            onHideComplete();
                        }
                }}
                aria-label="Input File For Workflow Reentry"
            >
            </button>

            <input
                ref={inputRef}
                type="file"
                accept=".mx"
                hidden
                onChange={(event) => {

                    const file =
                        event.target.files?.[0] ?? null;

                    onFileSelected(file);
                }}
            />
        </>
    );
}


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

    console.log(">>> REENTRY NODE RENDER", {
    visible,
    hiding,
    });

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
                onTransitionEnd={(event) => {
                console.log(">>> REENTRY TRANSITION END:", {
                    propertyName: event.propertyName,
                    hiding,
                    visible,
                    });

                if (hiding) {
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

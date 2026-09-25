
import styles from "./ReentryObjNode.module.css";

import { useRef } from "react";

type ReentryObjNodeProps = {
    visible: boolean;
    onFileSelected: (file: File | null) => void;
};

export default function ReentryObjNode({
    visible,
    onFileSelected,
}: ReentryObjNodeProps) {

    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {

        console.log(">>>CLICK ON Workflow REENTRY");

        inputRef.current?.click();
    };

    return (
        <>
            <button
                type="button"
                className={`
                    ${styles.node}
                    ${visible
                        ? styles.visible
                        : styles.hidden}
                `}
                onClick={handleClick}
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

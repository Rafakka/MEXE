

import styles from "./SampleNode.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import { useRef } from "react";

type SampleNodeProps = {
    phase: LaboratoryPhase;
    loaded: boolean;
    label: string;
    onFileSelected: (file:File) => void;
}

export default function SampleNode({
    phase,
    loaded,
    label,
    onFileSelected
}: SampleNodeProps){

console.log({
    phase,
    loaded,
    label
});

    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {

        if (loaded) return;

        inputRef.current?.click();

    }

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {

        const file = event.target.files?.[0];

        if (!file) return;

        onFileSelected(file);

        event.target.value = "";
    }


    return(

        <div

            className={`
                ${styles.node}
                ${styles[phase]}
                ${loaded ? styles.loaded : styles.pending}
                ${!loaded ? styles.waiting : ""}
            `}

            onClick={handleClick}

        >

        <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*"
            onChange={handleFileChange}
        />

            <span className={styles.tooltip}>
                {label}
            </span>

        </div>

    )

}

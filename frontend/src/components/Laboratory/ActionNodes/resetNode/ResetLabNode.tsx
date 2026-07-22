

import styles from "./ResetLabNode.module.css";
import type { LaboratoryPhase } from "../../../../features/laboratory/laboratoryPhase";
import {useDispatch} from "react-redux";
import type {AppDispatch} from "../../../../store/store";
import {clearLaboratory, setPhase} from "../../../../features/laboratory/laboratorySlice";

type ResetLabNodeProps = {
    phase: LaboratoryPhase;
    visible: boolean;
};

export default function ResetLabNode({
    phase,
    visible
}: ResetLabNodeProps) {

    const dispatch = useDispatch<AppDispatch>();

    function handleReset(){
        if(phase !="result") return;

        dispatch(setPhase("resetting"));
    }

    function handleAnimationEnd(){
        if(phase !== "resetting") return;

        dispatch(clearLaboratory());

    }

    return (

        <button
            type="button"
            className={`
                ${styles.node}
                ${visible ? styles.visible : styles.hidden}
                ${styles[phase]}

                `}
            onClick={handleReset}
            onAnimationEnd={handleAnimationEnd}
            aria-label="Reset Laboratory"

        >

        </button>

    );

}

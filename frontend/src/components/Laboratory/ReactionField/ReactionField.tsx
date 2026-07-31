

import styles from "./ReactionField.module.css";
import { useDispatch } from "react-redux";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../features/laboratory/operationPhase";
import {
    stabilizationStarted,
    resultDisplayed,
} from "../../../features/laboratory/laboratorySlice";

type ReactionProps = {

    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
}

export default function ReactionField({

    phase,

    operationPhase,

}: ReactionProps) {

    const dispatch = useDispatch();

   const handleAnimationEnd = (
    event: React.AnimationEvent<HTMLDivElement>
    ) => {

    const name = event.animationName;

    switch (phase) {

        case "processing": {

            if (operationPhase !== "completed") return;

            if (!name.includes("rotorAcceleration")) return;

            dispatch(stabilizationStarted());

            return;
        }

        case "stabilizing": {

            if (!name.includes("axisDisappear")) return;

            dispatch(resultDisplayed());

            return;
            }

        }

    };

    const phaseClass = styles[phase]

    const operationClass =
        operationPhase !== "idle"
            ? styles[operationPhase]
            : "";

    console.log({

    phase,

    operationPhase,

    phaseClass,

    operationClass

    });

    return (

        <div
            className={`

                ${styles.field}
                ${phaseClass}
                ${operationClass}

            `}
            onAnimationEnd={handleAnimationEnd}

        >

            <div className={styles.rotorA}>

                <div className={styles.axisA}/>

            </div>


            <div className={styles.rotorB}>

                <div className={styles.axisB} />

            </div>


        </div>
    );

}

